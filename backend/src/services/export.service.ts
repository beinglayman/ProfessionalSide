import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-writer';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import {
  ExportRequest,
  ExportProgress,
  ExportData,
  UserProfileExport,
  JournalEntryExport,
  NetworkExport,
  AchievementExport,
  GoalExport,
  WorkspaceExport
} from '../types/export.types';

export class ExportService {
  private exportDirectory = path.join(process.cwd(), 'exports');

  constructor() {
    // Ensure export directory exists
    if (!fs.existsSync(this.exportDirectory)) {
      fs.mkdirSync(this.exportDirectory, { recursive: true });
    }
  }

  /**
   * Start export process
   */
  async startExport(userId: string, request: ExportRequest): Promise<ExportProgress> {
    const exportId = uuidv4();
    const fileName = this.generateFileName(exportId, request.type, request.format);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    const exportProgress: ExportProgress = {
      id: exportId,
      userId,
      type: request.type,
      format: request.format,
      status: 'pending',
      progress: 0,
      fileName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Start export process asynchronously
    this.processExport(exportProgress, request).catch(error => {
      console.error('Export process failed:', error);
      this.updateExportStatus(exportId, 'failed', 0, (error as any).message);
    });

    return exportProgress;
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string, userId: string): Promise<ExportProgress | null> {
    // In a real implementation, this would be stored in the database
    // For now, we'll check the file system
    const filePath = path.join(this.exportDirectory, `${exportId}.json`);
    
    if (fs.existsSync(filePath)) {
      try {
        const statusData = fs.readFileSync(filePath.replace('.json', '_status.json'), 'utf8');
        const status = JSON.parse(statusData) as ExportProgress;
        
        if (status.userId !== userId) {
          return null; // User doesn't have access to this export
        }
        
        return status;
      } catch (error) {
        console.error('Error reading export status:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Download export file
   */
  async downloadExport(exportId: string, userId: string): Promise<{ filePath: string; fileName: string; mimeType: string } | null> {
    const status = await this.getExportStatus(exportId, userId);
    
    if (!status || status.status !== 'completed' || !status.fileName) {
      return null;
    }

    const filePath = path.join(this.exportDirectory, status.fileName);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const mimeType = this.getMimeType(status.format);
    
    return {
      filePath,
      fileName: status.fileName,
      mimeType
    };
  }

  /**
   * Clean up expired exports
   */
  async cleanupExpiredExports(): Promise<void> {
    const files = fs.readdirSync(this.exportDirectory);
    const now = new Date();

    for (const file of files) {
      if (file.endsWith('_status.json')) {
        try {
          const statusPath = path.join(this.exportDirectory, file);
          const statusData = fs.readFileSync(statusPath, 'utf8');
          const status = JSON.parse(statusData) as ExportProgress;
          
          if (new Date(status.expiresAt) < now) {
            // Remove both status file and export file
            fs.unlinkSync(statusPath);
            if (status.fileName) {
              const exportPath = path.join(this.exportDirectory, status.fileName);
              if (fs.existsSync(exportPath)) {
                fs.unlinkSync(exportPath);
              }
            }
          }
        } catch (error) {
          console.error('Error cleaning up export file:', file, error);
        }
      }
    }
  }

  /**
   * Process export request
   */
  private async processExport(exportProgress: ExportProgress, request: ExportRequest): Promise<void> {
    try {
      await this.updateExportStatus(exportProgress.id, 'processing', 10);

      // Collect data based on export type
      const exportData = await this.collectExportData(exportProgress.userId, request);
      
      await this.updateExportStatus(exportProgress.id, 'processing', 60);

      // Generate file based on format
      const filePath = await this.generateExportFile(exportProgress, exportData, request.format);
      
      await this.updateExportStatus(exportProgress.id, 'processing', 90);

      // Get file size
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Update final status
      exportProgress.status = 'completed';
      exportProgress.progress = 100;
      exportProgress.fileUrl = `/api/v1/export/${exportProgress.id}/download`;
      exportProgress.fileSize = fileSize;
      exportProgress.updatedAt = new Date().toISOString();

      await this.saveExportStatus(exportProgress);

    } catch (error) {
      console.error('Export processing error:', error);
      await this.updateExportStatus(exportProgress.id, 'failed', exportProgress.progress, (error as any).message);
      throw error;
    }
  }

  /**
   * Collect data for export
   */
  private async collectExportData(userId: string, request: ExportRequest): Promise<ExportData> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const exportData: ExportData = {
      metadata: {
        exportId: uuidv4(),
        userId,
        userName: user.name,
        userEmail: user.email,
        exportType: request.type,
        exportFormat: request.format,
        exportedAt: new Date().toISOString(),
        dateRange: request.dateRange,
        totalItems: 0
      },
      data: {}
    };

    let totalItems = 0;

    // Collect data based on type
    if (request.type === 'all' || request.type === 'profile') {
      exportData.data.profile = await this.collectProfileData(userId);
      totalItems += 1;
    }

    if (request.type === 'all' || request.type === 'journal_entries') {
      exportData.data.journalEntries = await this.collectJournalData(userId, request);
      totalItems += exportData.data.journalEntries.length;
    }

    if (request.type === 'all' || request.type === 'network') {
      exportData.data.network = await this.collectNetworkData(userId);
      totalItems += exportData.data.network.connections.length;
    }

    if (request.type === 'all' || request.type === 'achievements') {
      exportData.data.achievements = await this.collectAchievementsData(userId);
      totalItems += exportData.data.achievements.length;
    }

    if (request.type === 'all' || request.type === 'goals') {
      exportData.data.goals = await this.collectGoalsData(userId, request);
      totalItems += exportData.data.goals.length;
    }

    if (request.type === 'all') {
      exportData.data.workspaces = await this.collectWorkspacesData(userId);
      totalItems += exportData.data.workspaces.length;
    }

    exportData.metadata.totalItems = totalItems;
    return exportData;
  }

  /**
   * Collect user profile data
   */
  private async collectProfileData(userId: string): Promise<UserProfileExport> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        skills: {
          include: {
            skill: true
          }
        },
        workExperiences: {
          orderBy: { startDate: 'desc' }
        },
        education: {
          orderBy: { startYear: 'desc' }
        },
        certifications: {
          orderBy: { issueDate: 'desc' }
        },
        languages: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title || undefined,
      company: user.company || undefined,
      location: user.location || undefined,
      bio: user.bio || undefined,
      avatar: user.avatar || undefined,
      joinedDate: user.createdAt.toISOString(),
      profileCompleteness: user.profile?.profileCompleteness || 0,
      skills: user.skills.map(us => ({
        name: us.skill.name,
        category: us.skill.category || '',
        level: us.level,
        endorsements: us.endorsements,
        yearsOfExp: us.yearsOfExp
      })),
      experience: user.workExperiences.length > 0 ? user.workExperiences : undefined,
      education: user.education.length > 0 ? user.education : undefined,
      certifications: user.certifications.length > 0 ? user.certifications : undefined,
      languages: user.languages.length > 0 ? user.languages : undefined
    };
  }

  /**
   * Collect journal entries data
   */
  private async collectJournalData(userId: string, request: ExportRequest): Promise<JournalEntryExport[]> {
    const whereClause: any = {
      authorId: userId
    };

    // Apply date range filter
    if (request.dateRange) {
      whereClause.createdAt = {
        gte: new Date(request.dateRange.from),
        lte: new Date(request.dateRange.to)
      };
    }

    // Apply filters
    if (request.filters) {
      if (request.filters.workspaceId) {
        whereClause.workspaceId = request.filters.workspaceId;
      }
      if (request.filters.category) {
        whereClause.category = request.filters.category;
      }
      if (request.filters.tags && request.filters.tags.length > 0) {
        whereClause.tags = { hasSome: request.filters.tags };
      }
      if (!request.filters.includePrivate) {
        whereClause.visibility = { not: 'private' };
      }
    }

    const entries = await prisma.journalEntry.findMany({
      where: whereClause,
      include: {
        workspace: {
          select: { id: true, name: true }
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        },
        artifacts: {
          select: {
            name: true,
            type: true,
            url: true
          }
        },
        outcomes: {
          select: {
            category: true,
            title: true,
            description: true,
            metrics: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            appreciates: true,
            analytics: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      content: entry.fullContent,
      category: entry.category || undefined,
      tags: entry.tags,
      skills: entry.skills,
      visibility: entry.visibility,
      isPublished: entry.isPublished,
      publishedAt: entry.publishedAt?.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      workspace: entry.workspace,
      collaborators: entry.collaborators.map(c => ({
        id: c.user.id,
        name: c.user.name,
        role: c.role
      })),
      artifacts: entry.artifacts,
      outcomes: entry.outcomes.map(o => ({
        category: o.category,
        title: o.title,
        description: o.description,
        metrics: o.metrics ? JSON.parse(o.metrics as string) : undefined
      })),
      analytics: {
        totalViews: entry._count.analytics,
        totalLikes: entry._count.likes,
        totalComments: entry._count.comments,
        totalAppreciates: entry._count.appreciates
      }
    }));
  }

  /**
   * Collect network data
   */
  private async collectNetworkData(userId: string): Promise<NetworkExport> {
    const connections = await prisma.networkConnection.findMany({
      where: {
        OR: [
          { senderId: userId, status: 'accepted' },
          { receiverId: userId, status: 'accepted' }
        ]
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, company: true, title: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, company: true, title: true }
        }
      }
    });

    const sentRequests = await prisma.networkConnection.findMany({
      where: { senderId: userId, status: { not: 'accepted' } },
      include: {
        receiver: {
          select: { id: true, name: true }
        }
      }
    });

    const receivedRequests = await prisma.networkConnection.findMany({
      where: { receiverId: userId, status: { not: 'accepted' } },
      include: {
        sender: {
          select: { id: true, name: true }
        }
      }
    });

    const connectionData = connections.map(conn => {
      const isConnectedUser = conn.senderId === userId ? conn.receiver : conn.sender;
      return {
        id: isConnectedUser.id,
        name: isConnectedUser.name,
        email: isConnectedUser.email,
        company: isConnectedUser.company || undefined,
        title: isConnectedUser.title || undefined,
        status: conn.status,
        tier: conn.tier,
        context: conn.context || undefined,
        connectedAt: conn.createdAt.toISOString(),
        sharedWorkspaces: conn.sharedWorkspaces
      };
    });

    const coreConnections = connectionData.filter(c => c.tier === 'core').length;
    const extendedConnections = connectionData.filter(c => c.tier === 'extended').length;

    return {
      connections: connectionData,
      sentRequests: sentRequests.map(req => ({
        id: req.receiver.id,
        name: req.receiver.name,
        sentAt: req.createdAt.toISOString(),
        status: req.status
      })),
      receivedRequests: receivedRequests.map(req => ({
        id: req.sender.id,
        name: req.sender.name,
        receivedAt: req.createdAt.toISOString(),
        status: req.status
      })),
      totalConnections: connectionData.length,
      coreConnections,
      extendedConnections
    };
  }

  /**
   * Collect achievements data
   */
  private async collectAchievementsData(userId: string): Promise<AchievementExport[]> {
    const achievements = await prisma.achievement.findMany({
      where: { userId },
      include: {
        attestations: {
          include: {
            attester: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { achievedAt: 'desc' }
    });

    return achievements.map(achievement => ({
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      impact: achievement.impact || undefined,
      skills: achievement.skills,
      status: achievement.status,
      achievedAt: achievement.achievedAt.toISOString(),
      attestations: achievement.attestations.map(att => ({
        attesterName: att.attester.name,
        comment: att.comment || undefined,
        attestedAt: att.attestedAt.toISOString()
      }))
    }));
  }

  /**
   * Collect goals data
   */
  private async collectGoalsData(userId: string, request: ExportRequest): Promise<GoalExport[]> {
    const whereClause: any = { userId };

    if (request.filters?.workspaceId) {
      whereClause.workspaceId = request.filters.workspaceId;
    }

    const goals = await prisma.goal.findMany({
      where: whereClause,
      include: {
        workspace: {
          select: { id: true, name: true }
        },
        milestones: {
          orderBy: { order: 'asc' }
        },
        journalLinks: {
          include: {
            journalEntry: {
              select: { id: true, title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return goals.map(goal => ({
      id: goal.id,
      title: goal.title,
      description: goal.description || undefined,
      targetDate: goal.targetDate?.toISOString(),
      completed: goal.completed,
      completedDate: goal.completedDate?.toISOString(),
      progress: goal.progress,
      category: goal.category || undefined,
      priority: goal.priority,
      visibility: goal.visibility,
      workspace: goal.workspace || undefined,
      milestones: goal.milestones.map(m => ({
        title: m.title,
        targetDate: m.targetDate?.toISOString(),
        completed: m.completed,
        completedDate: m.completedDate?.toISOString()
      })),
      linkedJournalEntries: goal.journalLinks.map(link => ({
        id: link.journalEntry.id,
        title: link.journalEntry.title,
        contributionType: link.contributionType,
        progressContribution: link.progressContribution
      })),
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString()
    }));
  }

  /**
   * Collect workspaces data
   */
  private async collectWorkspacesData(userId: string): Promise<WorkspaceExport[]> {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            organization: {
              select: { id: true, name: true }
            },
            _count: {
              select: {
                members: true,
                journalEntries: true
              }
            }
          }
        }
      }
    });

    return memberships.map(membership => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      description: membership.workspace.description || undefined,
      organization: membership.workspace.organization || undefined,
      role: membership.role,
      joinedAt: membership.joinedAt.toISOString(),
      isActive: membership.isActive,
      memberCount: membership.workspace._count.members,
      journalEntryCount: membership.workspace._count.journalEntries
    }));
  }

  /**
   * Generate export file
   */
  private async generateExportFile(exportProgress: ExportProgress, data: ExportData, format: string): Promise<string> {
    const filePath = path.join(this.exportDirectory, exportProgress.fileName!);

    switch (format) {
      case 'json':
        return this.generateJSONFile(filePath, data);
      case 'csv':
        return this.generateCSVFile(filePath, data);
      case 'pdf':
        return this.generatePDFFile(filePath, data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate JSON file
   */
  private async generateJSONFile(filePath: string, data: ExportData): Promise<string> {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf8');
    return filePath;
  }

  /**
   * Generate CSV file
   */
  private async generateCSVFile(filePath: string, data: ExportData): Promise<string> {
    // For CSV, we'll create separate files for each data type
    const basePath = filePath.replace('.csv', '');
    const files: string[] = [];

    if (data.data.journalEntries && data.data.journalEntries.length > 0) {
      const csvWriter = csv.createObjectCsvWriter({
        path: `${basePath}_journal_entries.csv`,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'title', title: 'Title' },
          { id: 'description', title: 'Description' },
          { id: 'category', title: 'Category' },
          { id: 'tags', title: 'Tags' },
          { id: 'visibility', title: 'Visibility' },
          { id: 'createdAt', title: 'Created At' },
          { id: 'workspace.name', title: 'Workspace' }
        ]
      });

      const csvData = data.data.journalEntries.map(entry => ({
        ...entry,
        tags: entry.tags.join(', '),
        'workspace.name': entry.workspace.name
      }));

      await csvWriter.writeRecords(csvData);
      files.push(`${basePath}_journal_entries.csv`);
    }

    if (data.data.achievements && data.data.achievements.length > 0) {
      const csvWriter = csv.createObjectCsvWriter({
        path: `${basePath}_achievements.csv`,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'title', title: 'Title' },
          { id: 'description', title: 'Description' },
          { id: 'skills', title: 'Skills' },
          { id: 'status', title: 'Status' },
          { id: 'achievedAt', title: 'Achieved At' }
        ]
      });

      const csvData = data.data.achievements.map(achievement => ({
        ...achievement,
        skills: achievement.skills.join(', ')
      }));

      await csvWriter.writeRecords(csvData);
      files.push(`${basePath}_achievements.csv`);
    }

    // If only one file was created, rename it to the original path
    if (files.length === 1) {
      fs.renameSync(files[0], filePath);
      return filePath;
    }

    // Return the first file path (or create a summary file)
    return files[0] || filePath;
  }

  /**
   * Generate PDF file
   */
  private async generatePDFFile(filePath: string, data: ExportData): Promise<string> {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Title page
    doc.fontSize(20).text('Data Export Report', 100, 100);
    doc.fontSize(12).text(`Generated for: ${data.metadata.userName}`, 100, 140);
    doc.text(`Export Date: ${new Date(data.metadata.exportedAt).toLocaleDateString()}`, 100, 160);
    doc.text(`Total Items: ${data.metadata.totalItems}`, 100, 180);

    // Profile section
    if (data.data.profile) {
      doc.addPage();
      doc.fontSize(16).text('Profile Information', 100, 100);
      doc.fontSize(12);
      doc.text(`Name: ${data.data.profile.name}`, 100, 130);
      doc.text(`Email: ${data.data.profile.email}`, 100, 150);
      if (data.data.profile.title) {
        doc.text(`Title: ${data.data.profile.title}`, 100, 170);
      }
      if (data.data.profile.company) {
        doc.text(`Company: ${data.data.profile.company}`, 100, 190);
      }
      if (data.data.profile.bio) {
        doc.text(`Bio: ${data.data.profile.bio}`, 100, 210, { width: 400 });
      }

      // Skills
      if (data.data.profile.skills.length > 0) {
        doc.text('Skills:', 100, 250);
        let yPos = 270;
        data.data.profile.skills.forEach(skill => {
          doc.text(`• ${skill.name} (${skill.level}) - ${skill.yearsOfExp} years`, 120, yPos);
          yPos += 20;
          if (yPos > 700) {
            doc.addPage();
            yPos = 100;
          }
        });
      }
    }

    // Journal entries section
    if (data.data.journalEntries && data.data.journalEntries.length > 0) {
      doc.addPage();
      doc.fontSize(16).text('Journal Entries', 100, 100);
      
      let yPos = 130;
      data.data.journalEntries.forEach(entry => {
        if (yPos > 650) {
          doc.addPage();
          yPos = 100;
        }
        
        doc.fontSize(14).text(entry.title, 100, yPos);
        yPos += 20;
        doc.fontSize(10).text(`Created: ${new Date(entry.createdAt).toLocaleDateString()}`, 100, yPos);
        yPos += 15;
        doc.fontSize(12).text(entry.description, 100, yPos, { width: 400 });
        yPos += Math.max(30, entry.description.length / 80 * 15);
        yPos += 20;
      });
    }

    // Goals section
    if (data.data.goals && data.data.goals.length > 0) {
      doc.addPage();
      doc.fontSize(16).text('Goals', 100, 100);
      
      let yPos = 130;
      data.data.goals.forEach(goal => {
        if (yPos > 650) {
          doc.addPage();
          yPos = 100;
        }
        
        doc.fontSize(14).text(goal.title, 100, yPos);
        yPos += 20;
        doc.fontSize(10).text(`Progress: ${goal.progress}% | Priority: ${goal.priority}`, 100, yPos);
        yPos += 15;
        if (goal.description) {
          doc.fontSize(12).text(goal.description, 100, yPos, { width: 400 });
          yPos += Math.max(30, goal.description.length / 80 * 15);
        }
        yPos += 20;
      });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Helper methods
   */
  private generateFileName(exportId: string, type: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `export_${type}_${timestamp}_${exportId.slice(0, 8)}.${format}`;
  }

  private getMimeType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  private async updateExportStatus(exportId: string, status: string, progress: number, error?: string): Promise<void> {
    const statusPath = path.join(this.exportDirectory, `${exportId}_status.json`);
    
    let existingStatus: ExportProgress;
    if (fs.existsSync(statusPath)) {
      const statusData = fs.readFileSync(statusPath, 'utf8');
      existingStatus = JSON.parse(statusData);
    } else {
      throw new Error('Export status file not found');
    }

    existingStatus.status = status as any;
    existingStatus.progress = progress;
    existingStatus.updatedAt = new Date().toISOString();
    if (error) {
      existingStatus.error = error;
    }

    await this.saveExportStatus(existingStatus);
  }

  private async saveExportStatus(status: ExportProgress): Promise<void> {
    const statusPath = path.join(this.exportDirectory, `${status.id}_status.json`);
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf8');
  }
}