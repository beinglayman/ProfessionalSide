# Email Notifications Setup for Railway

## Environment Variables Required

Add these environment variables to your Railway backend service:

### Email Service Configuration
```bash
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_NAME=InChronicle
FROM_EMAIL=your-email@gmail.com
SUPPORT_EMAIL=support@inchronicle.com
```

### Frontend URLs (for email links)
```bash
FRONTEND_URL=https://your-frontend-domain.railway.app
```

## Gmail Setup Instructions

### 1. Generate App Password for Gmail
1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security > App Passwords
4. Generate a new app password for "Mail"
5. Use this password as `SMTP_PASS`

### 2. Alternative SMTP Providers

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-smtp-username
SMTP_PASS=your-mailgun-smtp-password
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key
SMTP_PASS=your-aws-secret-key
```

## Railway Configuration Steps

1. **Set Environment Variables**:
   ```bash
   # In Railway dashboard, go to your backend service
   # Add all the above environment variables
   ```

2. **Enable Email Notifications in User Preferences**:
   - Users must enable email notifications in their settings
   - By default, `emailNotifications` is set to `false`

3. **Test Email Configuration**:
   ```bash
   # Test endpoint (requires admin access)
   GET /api/v1/email/test-config
   
   # Send test email
   POST /api/v1/email/test
   {
     "to": "test@example.com",
     "subject": "Test Email",
     "message": "This is a test email"
   }
   ```

## Email Notification Types

The following notifications will trigger emails:

1. **Journal Likes**: When someone likes your journal entry
2. **Comments**: When someone comments on your entry
3. **Mentions**: When you're mentioned in a journal entry
4. **Workspace Invites**: When you're invited to a workspace
5. **Achievements**: When you unlock achievements or complete goals
6. **System Notifications**: Platform updates and announcements

## Email Templates

Email templates are located in `backend/src/templates/email/`:
- `welcome/` - New user welcome email
- `journal_like/` - Journal entry liked notification
- `journal_comment/` - New comment notification
- `mention/` - Mention notification
- `workspace_invite/` - Workspace invitation
- `achievement/` - Achievement unlocked
- `system_notification/` - System announcements
- `daily_digest/` - Daily activity summary
- `weekly_digest/` - Weekly activity summary

## Features

### Quiet Hours
- Users can set quiet hours to prevent emails during specific times
- Emails are queued and sent after quiet hours end

### Digest Emails
- Daily/Weekly summary emails
- Users can choose frequency in preferences
- Only sent if there's activity to report

### Email Queue
- All emails are queued for reliable delivery
- Automatic retry with exponential backoff
- Failed emails are logged for debugging

## User Settings

Users can control email notifications in `/settings`:
- Enable/disable email notifications
- Choose specific notification types
- Set digest frequency (none/daily/weekly)
- Configure quiet hours

## Testing in Development

1. **Set local environment variables** in `.env`
2. **Enable email**: `EMAIL_ENABLED=true`
3. **Test configuration**: `GET /api/v1/email/test-config`
4. **Send test email**: `POST /api/v1/email/test`
5. **Create notification**: Use any journal/comment/like action

## Troubleshooting

### Common Issues:
1. **SMTP Authentication Failed**: Check email/password
2. **Emails not sending**: Verify `EMAIL_ENABLED=true`
3. **Users not receiving emails**: Check their notification preferences
4. **Gmail blocking**: Use app password, not regular password

### Debug Logs:
- Check Railway logs for email service messages
- Look for `📧 Queued email notification` logs
- Check `🔔 Backend connection failed` for SMTP issues