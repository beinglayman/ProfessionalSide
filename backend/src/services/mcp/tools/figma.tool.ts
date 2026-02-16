import axios, { AxiosInstance } from 'axios';
import { MCPToolType, FigmaActivity, MCPServiceResponse } from '../../../types/mcp.types';
import { oauthService } from '../mcp-oauth.service';
import { MCPSessionService } from '../mcp-session.service';
import { MCPPrivacyService } from '../mcp-privacy.service';

/**
 * Figma MCP Tool - Fetches user activity from Figma
 *
 * PRIVACY FEATURES:
 * - Data fetched on-demand only
 * - No persistence to database
 * - Memory-only storage with auto-expiry
 * - User consent required
 */
export class FigmaTool {
  private sessionService: MCPSessionService;
  private privacyService: MCPPrivacyService;
  private figmaApi: AxiosInstance;

  constructor() {
    this.sessionService = MCPSessionService.getInstance();
    this.privacyService = new MCPPrivacyService();

    // Initialize Figma API client
    this.figmaApi = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        Accept: 'application/json'
      }
    });
  }

  /**
   * Fetch Figma activity for a user
   * @param userId User ID
   * @param dateRange Date range to fetch activity for
   * @returns Figma activity data (memory-only)
   */
  public async fetchActivity(
    userId: string,
    dateRange?: { start?: Date; end?: Date }
  ): Promise<MCPServiceResponse<FigmaActivity>> {
    try {
      // Get access token
      const accessToken = await oauthService.getAccessToken(userId, MCPToolType.FIGMA);
      if (!accessToken) {
        return {
          success: false,
          error: 'Figma not connected. Please connect your Figma account first.'
        };
      }

      // Set authorization header
      this.figmaApi.defaults.headers.common['X-Figma-Token'] = accessToken;

      // Calculate date range (default: last 7 days)
      const endDate = dateRange?.end || new Date();
      const startDate = dateRange?.start || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      console.log(`[Figma Tool] === Starting Figma fetch for user ${userId} ===`);
      console.log(`[Figma Tool] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Fetch different types of activity
      const [userInfo, teamProjects, recentFiles] = await Promise.all([
        this.fetchUserInfo(),
        this.fetchTeamProjects(),
        this.fetchRecentFiles()
      ]);

      console.log(`[Figma Tool] Fetched ${recentFiles.length} files from ${teamProjects.length} projects`);

      // For each file, fetch more details and filter by date
      const filesWithDetails = await this.fetchFileDetails(recentFiles, startDate, endDate);

      // Extract components and comments from files
      const components = this.extractComponents(filesWithDetails);
      const comments = await this.fetchRecentComments(filesWithDetails, startDate, endDate);

      console.log(`[Figma Tool] Extracted ${components.length} components from ${filesWithDetails.length} files`);
      console.log(`[Figma Tool] Fetched ${comments.length} comments from ${filesWithDetails.length} files`);

      // Compile activity data
      const activity: FigmaActivity = {
        files: filesWithDetails,
        components,
        comments
      };

      // Calculate total items
      const itemCount = filesWithDetails.length + components.length + comments.length;

      console.log(`[Figma Tool] === Summary ===`);
      console.log(`[Figma Tool] Files: ${filesWithDetails.length}`);
      console.log(`[Figma Tool] Components: ${components.length}`);
      console.log(`[Figma Tool] Comments: ${comments.length}`);
      console.log(`[Figma Tool] Total items: ${itemCount}`);

      // Store in memory-only session
      const sessionId = this.sessionService.createSession(
        userId,
        MCPToolType.FIGMA,
        activity,
        true
      );

      // Log fetch operation (no data stored)
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.FIGMA,
        itemCount,
        sessionId,
        true
      );

      console.log(`[Figma Tool] Fetched ${itemCount} items for user ${userId}`);

      return {
        success: true,
        data: activity,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
    } catch (error: any) {
      console.error('[Figma Tool] Error fetching activity:', error);

      // Log failed fetch
      await this.privacyService.logFetchOperation(
        userId,
        MCPToolType.FIGMA,
        0,
        '',
        false,
        error.message
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch Figma activity'
      };
    }
  }

  /**
   * Fetch user information
   */
  private async fetchUserInfo(): Promise<any> {
    try {
      const response = await this.figmaApi.get('/me');
      return response.data;
    } catch (error) {
      console.error('[Figma Tool] Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Fetch team projects
   */
  private async fetchTeamProjects(): Promise<any[]> {
    try {
      // First get the user's teams
      const meResponse = await this.figmaApi.get('/me');
      const teams = meResponse.data.teams || [];

      console.log(`[Figma Tool] Found ${teams.length} teams for user`);
      if (teams.length === 0) {
        console.log('[Figma Tool] WARNING: No teams found! Files must be in team projects, not Drafts.');
      }

      const projects: any[] = [];

      // For each team, get projects (limit to first 3 teams)
      for (const team of teams.slice(0, 3)) {
        try {
          console.log(`[Figma Tool] Fetching projects for team: ${team.name} (${team.id})`);
          const projectsResponse = await this.figmaApi.get(`/teams/${team.id}/projects`);
          const teamProjects = projectsResponse.data.projects || [];
          console.log(`[Figma Tool] Found ${teamProjects.length} projects in team ${team.name}`);

          projects.push(...teamProjects.map((project: any) => ({
            ...project,
            teamId: team.id,
            teamName: team.name
          })));
        } catch (error: any) {
          console.error(`[Figma Tool] Error fetching projects for team ${team.id}:`, {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
        }
      }

      console.log(`[Figma Tool] Total projects found: ${projects.length}`);
      return projects;
    } catch (error: any) {
      console.error('[Figma Tool] Error fetching team projects:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return [];
    }
  }

  /**
   * Fetch recent files from projects
   */
  private async fetchRecentFiles(): Promise<any[]> {
    try {
      const projects = await this.fetchTeamProjects();
      const files: any[] = [];

      console.log(`[Figma Tool] Fetching files from ${projects.length} projects`);

      // For each project, get files (limit to first 5 projects)
      for (const project of projects.slice(0, 5)) {
        try {
          console.log(`[Figma Tool] Fetching files from project: ${project.name} (${project.id})`);
          const filesResponse = await this.figmaApi.get(`/projects/${project.id}/files`);
          const projectFiles = filesResponse.data.files || [];
          console.log(`[Figma Tool] Found ${projectFiles.length} files in project ${project.name}`);

          files.push(...projectFiles.map((file: any) => ({
            ...file,
            projectId: project.id,
            projectName: project.name,
            teamName: project.teamName
          })));
        } catch (error: any) {
          console.error(`[Figma Tool] Error fetching files for project ${project.id}:`, {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
        }
      }

      console.log(`[Figma Tool] Total files found across all projects: ${files.length}`);
      return files;
    } catch (error: any) {
      console.error('[Figma Tool] Error fetching recent files:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return [];
    }
  }

  /**
   * Fetch detailed information for files
   */
  private async fetchFileDetails(files: any[], startDate: Date, endDate: Date): Promise<any[]> {
    const detailedFiles: any[] = [];

    console.log(`[Figma Tool] Fetching details for ${files.length} files (max 10)`);
    console.log(`[Figma Tool] Date filter: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Limit to 10 most recent files to avoid rate limiting
    for (const file of files.slice(0, 10)) {
      try {
        console.log(`[Figma Tool] Fetching details for file: ${file.name} (${file.key})`);
        // Get file metadata
        const fileResponse = await this.figmaApi.get(`/files/${file.key}`, {
          params: {
            depth: 1 // Only get top-level structure
          }
        });

        const fileData = fileResponse.data;
        const lastModified = new Date(fileData.lastModified || file.last_modified);
        const inDateRange = lastModified >= startDate && lastModified <= endDate;

        console.log(`[Figma Tool] File "${file.name}" - lastModified: ${lastModified.toISOString()}, inRange: ${inDateRange}`);

        // Only include files modified within date range
        if (inDateRange) {
          console.log(`[Figma Tool] ✓ Including file "${file.name}"`);
          detailedFiles.push({
            key: file.key,
            name: fileData.name || file.name,
            lastModified: lastModified.toISOString(),
            thumbnailUrl: fileData.thumbnailUrl || file.thumbnail_url,
            url: `https://www.figma.com/file/${file.key}`,
            projectName: file.projectName,
            teamName: file.teamName,
            version: fileData.version,
            components: fileData.components || {},
            styles: fileData.styles || {}
          });
        } else {
          console.log(`[Figma Tool] ✗ Excluding file "${file.name}" (outside date range)`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`[Figma Tool] Error fetching details for file ${file.key}:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
    }

    console.log(`[Figma Tool] Files after date filtering: ${detailedFiles.length}`);
    return detailedFiles;
  }

  /**
   * Extract components from files
   */
  private extractComponents(files: any[]): any[] {
    const components: any[] = [];

    files.forEach(file => {
      if (file.components) {
        Object.entries(file.components).forEach(([key, component]: [string, any]) => {
          components.push({
            key,
            name: component.name,
            description: component.description || '',
            fileName: file.name,
            fileKey: file.key
          });
        });
      }
    });

    return components;
  }

  /**
   * Fetch recent comments from files
   */
  private async fetchRecentComments(files: any[], startDate: Date, endDate: Date): Promise<any[]> {
    const allComments: any[] = [];

    // Limit to first 5 files to avoid rate limiting
    for (const file of files.slice(0, 5)) {
      try {
        const commentsResponse = await this.figmaApi.get(`/files/${file.key}/comments`);
        const comments = commentsResponse.data.comments || [];

        comments.forEach((comment: any) => {
          const createdAt = new Date(comment.created_at);
          if (createdAt >= startDate && createdAt <= endDate) {
            allComments.push({
              id: comment.id,
              message: comment.message,
              fileKey: file.key,
              fileName: file.name,
              createdAt: comment.created_at,
              user: comment.user?.handle || 'Unknown'
            });
          }
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Comments might not be available for all files
        continue;
      }
    }

    return allComments;
  }

  /**
   * Extract skills from Figma activity
   */
  public extractSkills(activity: FigmaActivity): string[] {
    const skills = new Set<string>();

    // Base design skills
    skills.add('UI Design');
    skills.add('UX Design');
    skills.add('Visual Design');
    skills.add('Figma');

    // Based on components
    if (activity.components.length > 0) {
      skills.add('Design Systems');
      skills.add('Component Design');
      skills.add('Design Patterns');
    }

    // Based on collaboration
    if (activity.comments.length > 0) {
      skills.add('Design Collaboration');
      skills.add('Design Review');
      skills.add('Feedback Integration');
    }

    // Based on file types
    activity.files.forEach(file => {
      if (file.name.toLowerCase().includes('mobile') || file.name.toLowerCase().includes('ios') || file.name.toLowerCase().includes('android')) {
        skills.add('Mobile Design');
      }
      if (file.name.toLowerCase().includes('web') || file.name.toLowerCase().includes('desktop')) {
        skills.add('Web Design');
      }
      if (file.name.toLowerCase().includes('prototype')) {
        skills.add('Prototyping');
      }
      if (file.name.toLowerCase().includes('wireframe')) {
        skills.add('Wireframing');
      }
    });

    return Array.from(skills);
  }

  /**
   * Extract collaborators from Figma activity
   */
  public extractCollaborators(activity: FigmaActivity): string[] {
    const collaborators = new Set<string>();

    // From comments
    activity.comments.forEach(comment => {
      if (comment.user) {
        collaborators.add(comment.user);
      }
    });

    // Team members are implied from team projects
    activity.files.forEach(file => {
      if (file.teamName) {
        // Could add team members if we had that data
      }
    });

    return Array.from(collaborators);
  }

  /**
   * Generate journal entry content from Figma activity
   */
  public generateJournalContent(activity: FigmaActivity): {
    title: string;
    description: string;
    artifacts: any[];
  } {
    const totalFiles = activity.files.length;
    const totalComponents = activity.components.length;
    const totalComments = activity.comments.length;

    // Generate title
    let title = 'Figma Design Activity';
    if (totalFiles > 0) {
      title = `Worked on ${totalFiles} design file${totalFiles > 1 ? 's' : ''}`;
    } else if (totalComponents > 0) {
      title = `Created ${totalComponents} design component${totalComponents > 1 ? 's' : ''}`;
    }

    // Generate description
    const descriptionParts: string[] = [];

    if (totalFiles > 0) {
      const projects = new Set(activity.files.map(f => f.projectName).filter(Boolean));
      descriptionParts.push(
        `Updated ${totalFiles} design file${totalFiles > 1 ? 's' : ''} across ${projects.size} project${projects.size > 1 ? 's' : ''}.`
      );

      if (projects.size > 0) {
        descriptionParts.push(`Projects: ${Array.from(projects).join(', ')}.`);
      }
    }

    if (totalComponents > 0) {
      descriptionParts.push(
        `Worked on ${totalComponents} component${totalComponents > 1 ? 's' : ''} in the design system.`
      );
    }

    if (totalComments > 0) {
      descriptionParts.push(
        `Participated in ${totalComments} design review${totalComments > 1 ? 's' : ''} and feedback discussion${totalComments > 1 ? 's' : ''}.`
      );
    }

    // Teams involved
    const teams = new Set(activity.files.map(f => f.teamName).filter(Boolean));
    if (teams.size > 0) {
      descriptionParts.push(`Teams involved: ${Array.from(teams).join(', ')}.`);
    }

    // Generate artifacts
    const artifacts: any[] = [];

    // Add files as artifacts
    activity.files.slice(0, 5).forEach(file => {
      artifacts.push({
        type: 'design',
        title: file.name,
        url: file.url,
        description: `Design file in ${file.projectName || 'project'}`,
        thumbnailUrl: file.thumbnailUrl,
        metadata: {
          lastModified: file.lastModified,
          version: file.version
        }
      });
    });

    // Add significant components
    activity.components.slice(0, 3).forEach(component => {
      artifacts.push({
        type: 'component',
        title: component.name,
        description: component.description || `Component in ${component.fileName}`,
        metadata: {
          fileKey: component.fileKey
        }
      });
    });

    return {
      title,
      description: descriptionParts.join(' '),
      artifacts
    };
  }
}