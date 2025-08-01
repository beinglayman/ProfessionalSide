# Invite Users Feature Specifications

## Overview
Add an "Invite Users" feature to the avatar dropdown menu in the header that allows authenticated users to invite non-registered individuals to join the InChronicle platform.

## Feature Location
- **Primary Access**: Avatar dropdown menu in the header (`src/components/layout/user-nav.tsx`)
- **Icon**: `UserPlus` from Lucide React (already imported in header.tsx)

## User Stories

### Primary User Story
**As a registered user**, I want to invite colleagues, friends, or professional contacts who are not yet on InChronicle, **so that** I can build my professional network and collaborate with them on the platform.

### Secondary User Stories
1. **As an inviter**, I want to send multiple invitations at once to save time
2. **As an inviter**, I want to track the status of my sent invitations
3. **As an inviter**, I want to personalize invitation messages to increase acceptance rates
4. **As an invitee**, I want to receive a clear, professional email invitation that explains the platform's value

## Functional Requirements

### 1. Menu Integration
- Add "Invite Users" menu item to the avatar dropdown
- Position between "Settings" and the separator above "Log out"
- Use `UserPlus` icon with consistent styling

### 2. Invitation Modal/Form
#### 2.1 Multi-Email Input
- **Email Input Field**: Support multiple email addresses
  - Input validation for email format
  - Duplicate email detection within the same invitation batch
  - Support for comma-separated, space-separated, or line-break-separated emails
  - Visual indication of valid/invalid emails
  - Maximum: 20 emails per batch invitation

#### 2.2 Personalization Options
- **Personal Message** (Optional, 500 character limit)
  - Pre-filled with default template
  - Editable text area for customization
  - Character counter display
  - Preview functionality

#### 2.3 Invitation Context
- **Workspace Association** (Optional)
  - Dropdown to select a workspace to invite users to
  - Default: "General Platform Invitation"
  - Show user's workspaces where they have invite permissions

#### 2.4 Sender Information Display
- Show inviter's name and title
- Option to include inviter's profile link in email

### 3. Email Template System
#### 3.1 Default Email Template
```
Subject: [Inviter Name] invited you to join InChronicle

Hi there,

[Inviter Name] ([Inviter Title] at [Inviter Company]) has invited you to join InChronicle, a professional platform for documenting achievements, building networks, and collaborating on projects.

[Personal Message - if provided]

InChronicle helps professionals:
• Document and showcase their work achievements
• Build meaningful professional networks
• Collaborate on projects and share knowledge
• Track career growth and development

Join [Inviter Name] on InChronicle:
[Invitation Link with unique token]

This invitation expires in 7 days.

Best regards,
The InChronicle Team
```

#### 3.2 Email Customization
- Professional branding consistent with platform design
- Responsive HTML email template
- Plain text fallback version
- Tracking pixels for open/click analytics

### 4. Invitation Management
#### 4.1 Invitation States
- **Pending**: Invitation sent, waiting for response
- **Accepted**: User registered using the invitation link
- **Expired**: Invitation passed 7-day expiry window
- **Resent**: Invitation was resent to the same email

#### 4.2 Invitation Tracking Dashboard
- Access via separate page (`/invitations`) or expand within settings
- Tabular view of sent invitations with:
  - Invitee email
  - Date sent
  - Status
  - Workspace (if applicable)
  - Actions (Resend, Cancel)

#### 4.3 Invitation Actions
- **Resend**: Send invitation again to same email (reset expiry)
- **Cancel**: Invalidate pending invitation
- **Bulk Actions**: Select multiple invitations for batch operations

### 5. Registration Flow Integration
#### 5.1 Invitation Token Handling
- Unique token per invitation stored in URL parameter
- Token validation on registration page
- Pre-fill registration form with:
  - Inviter information
  - Workspace association (if applicable)
  - Welcome message context

#### 5.2 Post-Registration Actions
- Automatic connection between inviter and invitee
- Workspace membership addition (if invitation was workspace-specific)
- Welcome notification to both parties
- Invitation status update to "Accepted"

## Technical Requirements

### 1. Database Schema

#### 1.1 Invitations Table
```sql
CREATE TABLE invitations (
    id UUID PRIMARY KEY,
    inviter_id UUID NOT NULL REFERENCES users(id),
    invitee_email VARCHAR(255) NOT NULL,
    workspace_id UUID REFERENCES workspaces(id),
    personal_message TEXT,
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    accepted_by_user_id UUID REFERENCES users(id)
);

CREATE INDEX idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX idx_invitations_token ON invitations(invitation_token);
CREATE INDEX idx_invitations_email_status ON invitations(invitee_email, status);
```

### 2. API Endpoints

#### 2.1 Send Invitations
```typescript
POST /api/v1/invitations
Authorization: Bearer {token}
Content-Type: application/json

{
  "emails": ["user1@example.com", "user2@example.com"],
  "workspaceId": "uuid-optional",
  "personalMessage": "string-optional-500-chars"
}

Response:
{
  "success": true,
  "data": {
    "sent": number,
    "failed": [
      {
        "email": "string",
        "reason": "string"
      }
    ]
  }
}
```

#### 2.2 Get User's Invitations
```typescript
GET /api/v1/invitations/my
Authorization: Bearer {token}
Query Parameters:
  - status: pending|accepted|expired|cancelled
  - page: number
  - limit: number

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "inviteeEmail": "string",
      "workspaceName": "string|null",
      "personalMessage": "string",
      "status": "string",
      "createdAt": "timestamp",
      "expiresAt": "timestamp",
      "acceptedAt": "timestamp|null"
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

#### 2.3 Validate Invitation Token
```typescript
GET /api/v1/invitations/validate/{token}

Response:
{
  "success": true,
  "data": {
    "isValid": boolean,
    "inviterName": "string",
    "inviterTitle": "string",
    "workspaceName": "string|null",
    "personalMessage": "string",
    "expiresAt": "timestamp"
  }
}
```

#### 2.4 Resend Invitation
```typescript
POST /api/v1/invitations/{id}/resend
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "newExpiresAt": "timestamp"
  }
}
```

### 3. Email Service Integration
- **Provider**: SendGrid/AWS SES/Mailgun (configurable)
- **Template Engine**: Handlebars/Mustache for dynamic content
- **Queue System**: Redis/Bull for email job processing
- **Analytics**: Track email opens, clicks, and conversion rates

### 4. Frontend Components

#### 4.1 InviteUsersModal Component
```typescript
interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
}

// Features:
// - Multi-email input with validation
// - Personal message textarea
// - Workspace selection dropdown
// - Send button with loading state
// - Success/error feedback
```

#### 4.2 InvitationsList Component
```typescript
interface InvitationsListProps {
  invitations: Invitation[];
  onResend: (id: string) => void;
  onCancel: (id: string) => void;
  isLoading: boolean;
}

// Features:
// - Sortable table with status filters
// - Action buttons (Resend, Cancel)
// - Bulk selection and actions
// - Pagination
```

## Security Requirements

### 1. Rate Limiting
- **Per User**: Maximum 50 invitations per day
- **Per Email**: Maximum 3 invitations per email address per month
- **Per IP**: Maximum 100 invitation requests per hour

### 2. Input Validation
- Email format validation
- Personal message length validation
- HTML sanitization for personal messages
- CSRF protection on all invitation endpoints

### 3. Token Security
- Cryptographically secure random tokens (32+ characters)
- Single-use tokens (invalidated after registration)
- 7-day expiration window
- No sensitive data in tokens (use UUID references)

### 4. Access Control
- Users can only send invitations for workspaces where they have invite permissions
- Users can only view/manage their own sent invitations
- Workspace-specific invitation limits based on user role

## UI/UX Requirements

### 1. User Interface Design
- **Modal Size**: Medium (600px wide)
- **Color Scheme**: Consistent with platform purple theme (#5D259F)
- **Typography**: Platform consistent fonts and sizes
- **Spacing**: Follow platform 8px grid system

### 2. User Experience Flow
1. User clicks avatar → dropdown opens
2. User clicks "Invite Users" → modal opens
3. User enters emails and optional message
4. User clicks "Send Invitations" → loading state
5. Success feedback → modal auto-closes after 2 seconds
6. User can view invitation status in settings/invitations page

### 3. Responsive Design
- **Desktop**: Full modal functionality
- **Tablet**: Adapted modal with scrollable content
- **Mobile**: Full-screen modal with optimized touch inputs

### 4. Accessibility
- **ARIA Labels**: All interactive elements properly labeled
- **Keyboard Navigation**: Full modal keyboard accessibility
- **Screen Reader**: Proper heading hierarchy and descriptions
- **Color Contrast**: WCAG AA compliance for all text

## Success Metrics

### 1. Engagement Metrics
- **Invitations Sent**: Track total invitations sent per user/timeframe
- **Invitation Acceptance Rate**: % of invitations that result in registration
- **Time to Accept**: Average time between invitation sent and registration
- **Feature Usage**: % of users who use the invite feature

### 2. Growth Metrics
- **User Acquisition**: New users acquired through invitations
- **Network Growth**: Average network size increase per invitation feature user
- **Retention**: Retention rate of users acquired through invitations vs. organic

### 3. Quality Metrics
- **Email Deliverability**: % of invitation emails successfully delivered
- **Bounce Rate**: % of invitation emails that bounce
- **Spam Reports**: Number of invitation emails marked as spam

## Implementation Phases

### Phase 1: Core Functionality (Week 1-2)
- Basic invitation modal in avatar dropdown
- Single email invitation with default template
- Database schema and basic API endpoints
- Email service integration

### Phase 2: Enhanced Features (Week 3)
- Multi-email support
- Personal message customization
- Workspace association
- Basic invitation tracking

### Phase 3: Management & Analytics (Week 4)
- Invitation management dashboard
- Resend/cancel functionality
- Email analytics integration
- Rate limiting implementation

### Phase 4: Polish & Optimization (Week 5)
- UI/UX refinements
- Performance optimization
- Comprehensive testing
- Documentation completion

## Testing Requirements

### 1. Unit Tests
- Email validation functions
- Token generation and validation
- API endpoint functionality
- React component behavior

### 2. Integration Tests
- End-to-end invitation flow
- Email delivery testing
- Database transaction testing
- Authentication and authorization

### 3. User Acceptance Tests
- Invitation sending flow
- Registration with invitation token
- Cross-browser compatibility
- Mobile responsiveness

## Risk Mitigation

### 1. Spam Prevention
- **Email Reputation**: Monitor sender reputation scores
- **Unsubscribe Links**: Include in all invitation emails
- **Complaint Handling**: Process spam complaints and adjust limits
- **IP Warmup**: Gradual increase in email volume for new domains

### 2. Performance Considerations
- **Email Queue**: Asynchronous email processing to prevent UI blocking
- **Database Indexing**: Proper indexes for invitation queries
- **Caching**: Cache workspace lists and user permissions
- **Rate Limiting**: Prevent abuse and system overload

### 3. Privacy Compliance
- **GDPR Compliance**: Clear consent for email communication
- **Data Retention**: Automatic cleanup of expired invitations
- **Opt-out Mechanism**: Honor unsubscribe requests
- **Data Processing**: Document email processing and storage

## Future Enhancements

### 1. Advanced Features
- **Bulk Import**: CSV upload for mass invitations
- **Social Integration**: Invite via LinkedIn, Twitter, etc.
- **Invitation Templates**: Pre-defined message templates
- **Smart Suggestions**: AI-powered contact suggestions

### 2. Analytics & Insights
- **Invitation Performance**: Detailed analytics dashboard
- **A/B Testing**: Test different email templates and timing
- **Predictive Analytics**: Predict invitation acceptance likelihood
- **ROI Tracking**: Measure business impact of invited users

### 3. Integration Opportunities
- **Calendar Integration**: Schedule invitation reminders
- **CRM Integration**: Sync with external CRM systems
- **Event-Based Invitations**: Invite based on specific platform actions
- **Referral Programs**: Gamify the invitation process with rewards