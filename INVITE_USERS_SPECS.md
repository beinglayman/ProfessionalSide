# User Invitation Feature Specifications

## 1. Feature Overview

### Purpose
Allow registered users to invite non-registered users to join the InChronicle platform through the avatar menu in the header.

### User Story
**As a registered user**, I want to invite my colleagues, friends, or professional contacts who are not yet on InChronicle so that I can expand my network and collaborate with them on the platform.

---

## 2. User Interface Specifications

### 2.1 Avatar Menu Integration
- **Location**: Avatar dropdown menu in the main header
- **Menu Item**: "Invite Friends" or "Invite Users" 
- **Icon**: UserPlus or Send icon from Lucide
- **Position**: Below "Settings" and above "Sign Out"

### 2.2 Invitation Modal/Page
**Trigger**: Click on "Invite Users" menu item
**Layout**: Modal overlay or dedicated page (recommend modal for better UX)

#### Modal Structure:
```
┌─────────────────────────────────────┐
│  Invite Friends to InChronicle  [X] │
├─────────────────────────────────────┤
│                                     │
│  Help grow your professional        │
│  network by inviting colleagues     │
│  and friends to join InChronicle    │
│                                     │
│  ┌─ Bulk Email Invitation ────┐    │
│  │ Email addresses (one per    │    │
│  │ line or comma-separated):   │    │
│  │ ┌─────────────────────────┐ │    │
│  │ │ john@example.com        │ │    │
│  │ │ jane@company.com        │ │    │
│  │ │ bob@startup.io          │ │    │
│  │ └─────────────────────────┘ │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─ Personal Message (Optional) ─┐  │
│  │ ┌─────────────────────────────┐ │
│  │ │ Hey! I've been using        │ │
│  │ │ InChronicle to track my...  │ │
│  │ └─────────────────────────────┘ │
│  └─────────────────────────────────┘
│                                     │
│  ┌─ Quick Actions ─────────────────┐│
│  │ [📋 Copy Invite Link]           ││
│  │ [📱 Share via...]              ││
│  └─────────────────────────────────┘│
│                                     │
│           [Cancel] [Send Invites]   │
└─────────────────────────────────────┘
```

---

## 3. Functional Requirements

### 3.1 Core Features

#### 3.1.1 Email Invitation
- **Input Methods**:
  - Textarea for multiple email addresses
  - Support comma-separated or line-separated emails
  - Email validation on input
  - Duplicate detection and removal
  
- **Validation**:
  - Valid email format check
  - Maximum 50 invitations per batch
  - Check if email is already registered (show warning)
  - Rate limiting: Max 100 invitations per user per day

#### 3.1.2 Personal Message
- **Optional custom message** (max 500 characters)
- **Default message template** if no custom message provided
- **Preview functionality** before sending

#### 3.1.3 Invite Link Generation
- **Unique referral link** for each user
- **Format**: `https://inchronicle.com/invite/{referral_code}`
- **Copy to clipboard** functionality
- **Social sharing options** (WhatsApp, LinkedIn, Twitter, etc.)

### 3.2 Backend Requirements

#### 3.2.1 Database Schema
```sql
-- Invitations table
CREATE TABLE invitations (
  id VARCHAR PRIMARY KEY,
  inviter_id VARCHAR REFERENCES users(id),
  email VARCHAR NOT NULL,
  referral_code VARCHAR UNIQUE,
  personal_message TEXT,
  status ENUM('PENDING', 'ACCEPTED', 'EXPIRED') DEFAULT 'PENDING',
  sent_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP NULL,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User referrals table (for tracking successful referrals)
CREATE TABLE user_referrals (
  id VARCHAR PRIMARY KEY,
  referrer_id VARCHAR REFERENCES users(id),
  referred_user_id VARCHAR REFERENCES users(id),
  invitation_id VARCHAR REFERENCES invitations(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add referral tracking to users table
ALTER TABLE users ADD COLUMN referral_code VARCHAR UNIQUE;
ALTER TABLE users ADD COLUMN referred_by_id VARCHAR REFERENCES users(id);
```

#### 3.2.2 API Endpoints

```typescript
// Send email invitations
POST /api/invitations/send
Body: {
  emails: string[],
  personalMessage?: string
}
Response: {
  success: boolean,
  data: {
    sent: number,
    failed: string[], // emails that failed
    alreadyRegistered: string[]
  }
}

// Get user's referral link
GET /api/invitations/referral-link
Response: {
  success: boolean,
  data: {
    referralCode: string,
    link: string,
    totalInvitesSent: number,
    totalAccepted: number
  }
}

// Get invitation statistics
GET /api/invitations/stats
Response: {
  success: boolean,
  data: {
    totalSent: number,
    totalAccepted: number,
    pendingInvitations: number,
    todaysSent: number,
    dailyLimitRemaining: number
  }
}

// Accept invitation (during registration)
POST /api/invitations/accept/{referral_code}
Body: { newUserId: string }
```

---

## 4. Email Template Specification

### 4.1 Invitation Email Design
```html
<!DOCTYPE html>
<html>
<head>
  <title>You're invited to join InChronicle</title>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0;">You're Invited!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">
        Join InChronicle and start your professional journey
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px; background: white;">
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        Hi there!
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        <strong>{{inviter_name}}</strong> has invited you to join InChronicle, 
        the professional platform for tracking achievements, building networks, 
        and advancing your career.
      </p>

      <!-- Personal Message (if provided) -->
      {{#if personal_message}}
      <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
        <p style="margin: 0; color: #555; font-style: italic;">
          "{{personal_message}}"
        </p>
        <p style="margin: 10px 0 0 0; color: #777; font-size: 14px;">
          - {{inviter_name}}
        </p>
      </div>
      {{/if}}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="{{registration_link}}" 
           style="display: inline-block; background: #667eea; color: white; 
                  padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                  font-weight: bold; font-size: 16px;">
          Join InChronicle
        </a>
      </div>

      <!-- Features Preview -->
      <div style="margin: 40px 0;">
        <h3 style="color: #333; margin-bottom: 20px;">What you'll get:</h3>
        <ul style="color: #555; line-height: 1.8;">
          <li>✨ Track and showcase your professional achievements</li>
          <li>🤝 Build meaningful professional connections</li>
          <li>📊 Monitor your career progress with insights</li>
          <li>🏢 Collaborate in workspaces with your team</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
      <p style="margin: 0; font-size: 14px;">
        This invitation will expire in 30 days.
      </p>
      <p style="margin: 10px 0 0 0; font-size: 12px;">
        If you don't want to receive these emails, you can 
        <a href="{{unsubscribe_link}}" style="color: #667eea;">unsubscribe here</a>.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## 5. User Experience Flow

### 5.1 Invitation Flow
1. **User clicks "Invite Users"** in avatar menu
2. **Modal opens** with invitation form
3. **User enters email addresses** and optional message
4. **User clicks "Send Invites"**
5. **System validates** emails and checks limits
6. **Confirmation shown** with success/failure counts
7. **Emails sent** to valid addresses
8. **Modal closes** or shows invitation stats

### 5.2 Registration Flow (Invitee)
1. **Invitee receives email** with invitation
2. **Clicks "Join InChronicle"** button
3. **Redirected to registration** with referral code pre-filled
4. **Completes registration** process
5. **System tracks** successful referral
6. **Inviter receives notification** of successful invitation

---

## 6. Technical Implementation

### 6.1 Frontend Components

#### 6.1.1 Avatar Menu Update
```typescript
// Add to avatar menu items
{
  icon: <UserPlus className="h-4 w-4" />,
  label: "Invite Users",
  onClick: () => setShowInviteModal(true)
}
```

#### 6.1.2 Invitation Modal Component
```typescript
interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InvitationForm {
  emails: string[];
  personalMessage: string;
}
```

### 6.2 Backend Services

#### 6.2.1 Invitation Service
```typescript
class InvitationService {
  async sendInvitations(inviterId: string, emails: string[], message?: string)
  async generateReferralLink(userId: string): Promise<string>
  async validateInvitationLimit(userId: string): Promise<boolean>
  async trackReferralAcceptance(referralCode: string, newUserId: string)
  async getInvitationStats(userId: string)
}
```

#### 6.2.2 Email Service Enhancement
```typescript
async sendInvitationEmail(
  inviterName: string,
  inviteeEmail: string,
  referralCode: string,
  personalMessage?: string
)
```

---

## 7. Security & Privacy Considerations

### 7.1 Security Measures
- **Rate limiting**: 100 invitations per user per day
- **Email validation**: Prevent invalid/malicious emails
- **Referral code expiration**: 30 days validity
- **Spam prevention**: Monitor for abuse patterns
- **GDPR compliance**: Clear data usage and opt-out options

### 7.2 Privacy Features
- **No email storage**: Only store hashed versions for tracking
- **Unsubscribe links**: Easy opt-out from future invitations
- **Data retention**: Auto-delete expired invitations after 90 days

---

## 8. Analytics & Tracking

### 8.1 Metrics to Track
- **Invitation conversion rate**: Invitations sent vs registrations
- **Most effective inviters**: Users with highest conversion rates
- **Popular invitation methods**: Email vs link sharing
- **Time to acceptance**: How long between invite and registration
- **Feature adoption**: How many users use the invite feature

### 8.2 Admin Dashboard
- **Invitation statistics** overview
- **Top referrers** leaderboard
- **Abuse monitoring** and controls
- **Email delivery** status and bounce handling

---

## 9. Success Metrics

### 9.1 Primary KPIs
- **User acquisition**: % of new users from referrals
- **Feature adoption**: % of users who send invitations
- **Conversion rate**: Invitations → Registrations (target: >15%)
- **Network growth**: Average connections per referred user

### 9.2 User Satisfaction
- **Ease of use**: Invitation process completion rate
- **User feedback**: Surveys on invitation experience
- **Feature usage**: Repeat usage of invitation feature

---

## 10. Future Enhancements

### 10.1 Phase 2 Features
- **Bulk import** from contacts/CSV files
- **Integration** with LinkedIn, Google Contacts
- **Gamification**: Referral rewards and badges
- **Advanced analytics**: Referral network visualization

### 10.2 Potential Integrations
- **CRM systems**: Salesforce, HubSpot integration
- **Social platforms**: One-click sharing to social media
- **Email clients**: Outlook/Gmail plugin for easy invitations
- **QR codes**: For in-person invitation sharing

---

## 11. Implementation Timeline

### Phase 1 (Week 1-2): Core Features
- [ ] UI components (avatar menu, modal)
- [ ] Backend API endpoints
- [ ] Database schema
- [ ] Email template design

### Phase 2 (Week 3): Enhanced Features
- [ ] Referral link generation
- [ ] Invitation statistics
- [ ] Email validation and limits
- [ ] Testing and bug fixes

### Phase 3 (Week 4): Polish & Launch
- [ ] Security review
- [ ] Performance optimization  
- [ ] Analytics implementation
- [ ] Documentation and training

---

This comprehensive specification covers all aspects of the user invitation feature, from UI/UX design to backend implementation, security considerations, and future enhancements. The feature will help grow the user base organically while providing a seamless experience for both inviters and invitees.