export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
}

export interface EmailData {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  attachments?: EmailAttachment[];
  priority?: 'high' | 'normal' | 'low';
  category?: string;
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string; // Content-ID for inline attachments
}

export interface EmailJob {
  id: string;
  emailData: EmailData;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  scheduledAt?: Date;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailNotificationEvent {
  type: 'like' | 'comment' | 'mention' | 'workspace_invite' | 'achievement' | 'system' | 'digest';
  recipientId: string;
  senderId?: string;
  data: Record<string, any>;
  metadata?: {
    entityType?: 'journal_entry' | 'workspace' | 'user' | 'comment';
    entityId?: string;
    workspaceId?: string;
  };
}

export interface DigestEmailData {
  recipientId: string;
  period: 'daily' | 'weekly';
  data: {
    newLikes: {
      count: number;
      entries: Array<{
        entryTitle: string;
        likerName: string;
        createdAt: string;
      }>;
    };
    newComments: {
      count: number;
      entries: Array<{
        entryTitle: string;
        commenterName: string;
        comment: string;
        createdAt: string;
      }>;
    };
    newConnections: {
      count: number;
      connections: Array<{
        name: string;
        title?: string;
        company?: string;
        connectedAt: string;
      }>;
    };
    workspaceActivity: {
      count: number;
      activities: Array<{
        workspaceName: string;
        type: string;
        authorName: string;
        title: string;
        createdAt: string;
      }>;
    };
    achievements: {
      count: number;
      achievements: Array<{
        title: string;
        achievedAt: string;
      }>;
    };
  };
}

export interface EmailTemplateVariables {
  // User variables
  recipientName: string;
  recipientEmail: string;
  senderName?: string;
  
  // Action variables
  actionUrl?: string;
  unsubscribeUrl: string;
  
  // Content variables
  entryTitle?: string;
  entryDescription?: string;
  commentContent?: string;
  workspaceName?: string;
  achievementTitle?: string;
  
  // System variables
  companyName: string;
  supportEmail: string;
  websiteUrl: string;
  logoUrl?: string;
  
  // Custom data
  [key: string]: any;
}