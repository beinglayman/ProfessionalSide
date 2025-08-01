import * as fs from 'fs';
import * as path from 'path';
import { EmailTemplateVariables } from '../types/email.types';

export class EmailTemplateService {
  private templatesPath: string;
  private templateCache: Map<string, { html: string; text: string; subject: string }>;

  constructor() {
    this.templatesPath = path.join(process.cwd(), 'src', 'templates', 'email');
    this.templateCache = new Map();
    this.ensureTemplatesDirectory();
  }

  /**
   * Render email template with variables
   */
  async renderTemplate(
    templateId: string, 
    variables: EmailTemplateVariables
  ): Promise<{ subject: string; html: string; text: string }> {
    try {
      // Load template from cache or file
      let template = this.templateCache.get(templateId);
      
      if (!template) {
        template = await this.loadTemplate(templateId);
        this.templateCache.set(templateId, template);
      }

      // Replace variables in templates
      const rendered = {
        subject: this.replaceVariables(template.subject, variables),
        html: this.replaceVariables(template.html, variables),
        text: this.replaceVariables(template.text, variables)
      };

      return rendered;
    } catch (error) {
      console.error('Error rendering email template:', templateId, error);
      // Return fallback template
      return this.getFallbackTemplate(variables);
    }
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Load template from file system
   */
  private async loadTemplate(templateId: string): Promise<{ html: string; text: string; subject: string }> {
    const templateDir = path.join(this.templatesPath, templateId);
    
    if (!fs.existsSync(templateDir)) {
      throw new Error(`Template directory not found: ${templateId}`);
    }

    const htmlPath = path.join(templateDir, 'html.hbs');
    const textPath = path.join(templateDir, 'text.hbs');
    const configPath = path.join(templateDir, 'config.json');

    // Load template files
    const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
    const text = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8') : '';
    
    // Load configuration
    let config = { subject: 'Notification from InChronicle' };
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    return {
      html,
      text,
      subject: config.subject
    };
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(template: string, variables: EmailTemplateVariables): string {
    let result = template;

    // Replace simple variables
    Object.entries(variables).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, String(value));
      }
    });

    // Handle conditional blocks
    result = this.handleConditionals(result, variables);

    // Handle loops
    result = this.handleLoops(result, variables);

    return result;
  }

  /**
   * Handle conditional template blocks
   */
  private handleConditionals(template: string, variables: EmailTemplateVariables): string {
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    
    return template.replace(conditionalRegex, (match, condition, content) => {
      const value = variables[condition];
      return (value && value !== '' && value !== 0) ? content : '';
    });
  }

  /**
   * Handle loop template blocks
   */
  private handleLoops(template: string, variables: EmailTemplateVariables): string {
    const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    
    return template.replace(loopRegex, (match, arrayName, itemTemplate) => {
      const array = variables[arrayName];
      
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        let renderedItem = itemTemplate;
        
        // Replace item properties
        if (typeof item === 'object') {
          Object.entries(item).forEach(([key, value]) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            renderedItem = renderedItem.replace(regex, String(value));
          });
        }

        // Replace special variables
        renderedItem = renderedItem.replace(/{{@index}}/g, String(index));
        renderedItem = renderedItem.replace(/{{@first}}/g, String(index === 0));
        renderedItem = renderedItem.replace(/{{@last}}/g, String(index === array.length - 1));

        return renderedItem;
      }).join('');
    });
  }

  /**
   * Get fallback template when primary template fails
   */
  private getFallbackTemplate(variables: EmailTemplateVariables): { subject: string; html: string; text: string } {
    const subject = 'Notification from InChronicle';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Hello ${variables.recipientName || 'there'}!</h2>
            <p>You have a new notification from InChronicle.</p>
            <p style="margin: 20px 0;">
              <a href="${variables.actionUrl || variables.websiteUrl}" 
                 style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                View Notification
              </a>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This email was sent to ${variables.recipientEmail}. 
              <a href="${variables.unsubscribeUrl}">Manage your notification preferences</a>
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Hello ${variables.recipientName || 'there'}!

You have a new notification from InChronicle.

View notification: ${variables.actionUrl || variables.websiteUrl}

---
This email was sent to ${variables.recipientEmail}.
Manage your notification preferences: ${variables.unsubscribeUrl}
    `;

    return { subject, html, text };
  }

  /**
   * Ensure templates directory exists and create default templates
   */
  private ensureTemplatesDirectory(): void {
    if (!fs.existsSync(this.templatesPath)) {
      fs.mkdirSync(this.templatesPath, { recursive: true });
    }

    // Create default templates if they don't exist
    this.createDefaultTemplates();
  }

  /**
   * Create default email templates
   */
  private createDefaultTemplates(): void {
    const templates = [
      'welcome',
      'password_reset',
      'journal_like',
      'journal_comment',
      'mention',
      'workspace_invite',
      'achievement',
      'system_notification',
      'daily_digest',
      'weekly_digest'
    ];

    templates.forEach(templateId => {
      const templateDir = path.join(this.templatesPath, templateId);
      
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
        this.createTemplateFiles(templateDir, templateId);
      }
    });
  }

  /**
   * Create template files for a specific template
   */
  private createTemplateFiles(templateDir: string, templateId: string): void {
    // Create config.json
    const config = {
      subject: this.getDefaultSubject(templateId)
    };
    fs.writeFileSync(path.join(templateDir, 'config.json'), JSON.stringify(config, null, 2));

    // Create HTML template
    const html = this.getDefaultHtmlTemplate(templateId);
    fs.writeFileSync(path.join(templateDir, 'html.hbs'), html);

    // Create text template
    const text = this.getDefaultTextTemplate(templateId);
    fs.writeFileSync(path.join(templateDir, 'text.hbs'), text);
  }

  /**
   * Get default subject for template
   */
  private getDefaultSubject(templateId: string): string {
    const subjects = {
      welcome: 'Welcome to InChronicle!',
      password_reset: 'Reset your InChronicle password',
      journal_like: '{{senderName}} liked your journal entry',
      journal_comment: '{{senderName}} commented on your journal entry',
      mention: 'You were mentioned in a journal entry',
      workspace_invite: 'You\'ve been invited to join {{workspaceName}}',
      achievement: 'Congratulations on your new achievement!',
      system_notification: 'Important update from InChronicle',
      daily_digest: 'Your daily InChronicle digest',
      weekly_digest: 'Your weekly InChronicle digest'
    };

    return subjects[templateId] || 'Notification from InChronicle';
  }

  /**
   * Get default HTML template
   */
  private getDefaultHtmlTemplate(templateId: string): string {
    const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { max-width: 150px; height: auto; }
    .content { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
    .unsubscribe { color: #999; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      {{#if logoUrl}}
      <img src="{{logoUrl}}" alt="{{companyName}}" class="logo">
      {{/if}}
    </div>
    <div class="content">
      ${this.getTemplateContent(templateId)}
    </div>
    <div class="footer">
      <p>This email was sent to {{recipientEmail}}</p>
      <p><a href="{{unsubscribeUrl}}" class="unsubscribe">Manage notification preferences</a></p>
      <p>&copy; {{companyName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    return baseTemplate;
  }

  /**
   * Get default text template
   */
  private getDefaultTextTemplate(templateId: string): string {
    return `
Hello {{recipientName}}!

${this.getTemplateTextContent(templateId)}

{{#if actionUrl}}
View: {{actionUrl}}
{{/if}}

---
This email was sent to {{recipientEmail}}.
Manage your notification preferences: {{unsubscribeUrl}}

{{companyName}}
    `.trim();
  }

  /**
   * Get template-specific content
   */
  private getTemplateContent(templateId: string): string {
    const content = {
      welcome: `
        <h1>Welcome to InChronicle, {{recipientName}}!</h1>
        <p>We're excited to have you join our professional journaling community.</p>
        <p>Get started by creating your first journal entry and connecting with colleagues.</p>
        <a href="{{actionUrl}}" class="button">Get Started</a>
      `,
      password_reset: `
        <h1>Reset Your Password</h1>
        <p>Hi {{recipientName}},</p>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <a href="{{actionUrl}}" class="button">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      journal_like: `
        <h1>{{senderName}} liked your journal entry</h1>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{senderName}}</strong> liked your journal entry "{{entryTitle}}".</p>
        <a href="{{actionUrl}}" class="button">View Entry</a>
      `,
      journal_comment: `
        <h1>New comment on your journal entry</h1>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{senderName}}</strong> commented on your journal entry "{{entryTitle}}":</p>
        <blockquote style="border-left: 3px solid #007bff; padding-left: 15px; margin: 20px 0; font-style: italic;">
          {{commentContent}}
        </blockquote>
        <a href="{{actionUrl}}" class="button">View Comment</a>
      `,
      workspace_invite: `
        <h1>You've been invited to join {{workspaceName}}</h1>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{senderName}}</strong> has invited you to join the <strong>{{workspaceName}}</strong> workspace.</p>
        <a href="{{actionUrl}}" class="button">Accept Invitation</a>
      `,
      achievement: `
        <h1>Congratulations on your achievement!</h1>
        <p>Hi {{recipientName}},</p>
        <p>You've earned a new achievement: <strong>{{achievementTitle}}</strong></p>
        <a href="{{actionUrl}}" class="button">View Achievement</a>
      `,
      daily_digest: `
        <h1>Your Daily Digest</h1>
        <p>Hi {{recipientName}},</p>
        <p>Here's what happened in your professional network today:</p>
        
        {{#if digestData.newLikes.count}}
        <h3>New Likes ({{digestData.newLikes.count}})</h3>
        {{#each digestData.newLikes.entries}}
        <p>• {{likerName}} liked "{{entryTitle}}"</p>
        {{/each}}
        {{/if}}
        
        {{#if digestData.newComments.count}}
        <h3>New Comments ({{digestData.newComments.count}})</h3>
        {{#each digestData.newComments.entries}}
        <p>• {{commenterName}} commented on "{{entryTitle}}"</p>
        {{/each}}
        {{/if}}
        
        <a href="{{actionUrl}}" class="button">View Dashboard</a>
      `
    };

    return content[templateId] || `
      <h1>Hello {{recipientName}}!</h1>
      <p>You have a new notification from InChronicle.</p>
      <a href="{{actionUrl}}" class="button">View Notification</a>
    `;
  }

  /**
   * Get template-specific text content
   */
  private getTemplateTextContent(templateId: string): string {
    const content = {
      welcome: 'Welcome to InChronicle! We\'re excited to have you join our professional journaling community.',
      password_reset: 'You requested to reset your password. Use the link below to create a new password.',
      journal_like: '{{senderName}} liked your journal entry "{{entryTitle}}".',
      journal_comment: '{{senderName}} commented on your journal entry "{{entryTitle}}": {{commentContent}}',
      workspace_invite: '{{senderName}} has invited you to join the {{workspaceName}} workspace.',
      achievement: 'Congratulations! You\'ve earned a new achievement: {{achievementTitle}}',
      daily_digest: 'Here\'s your daily digest of activity in your professional network.'
    };

    return content[templateId] || 'You have a new notification from InChronicle.';
  }
}