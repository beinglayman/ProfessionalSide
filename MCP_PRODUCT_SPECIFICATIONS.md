# MCP (Multi-Channel Platform) Feature - Product Specifications

## Version 1.0 - October 2024

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Feature Overview](#feature-overview)
3. [User Journey](#user-journey)
4. [Tool Specifications](#tool-specifications)
5. [Data Processing & AI Organization](#data-processing--ai-organization)
6. [Privacy & Security](#privacy--security)
7. [Technical Architecture](#technical-architecture)
8. [Known Limitations](#known-limitations)
9. [Future Roadmap](#future-roadmap)

---

## Executive Summary

The Multi-Channel Platform (MCP) feature enables InChronicle users to seamlessly integrate their professional activities from multiple external platforms into their journal entries. By connecting tools like GitHub, Jira, Figma, Outlook, Teams, Confluence, and Slack, users can automatically fetch and organize their work activities, creating comprehensive professional journal entries that capture their complete work narrative.

### Key Value Propositions
- **Automated Activity Aggregation**: Eliminate manual data entry by automatically fetching work activities
- **Intelligent Organization**: AI-powered categorization and summarization of activities
- **Privacy-First Design**: Data fetched on-demand, stored temporarily in memory only
- **Professional Growth Tracking**: Automatic skill detection and professional achievement documentation

---

## Feature Overview

### Core Functionality
The MCP feature provides:
1. **OAuth 2.0 Integration** with 7 major professional platforms
2. **On-demand data fetching** within user-specified date ranges
3. **AI-powered activity organization** and categorization
4. **Automatic skill extraction** from activities
5. **Privacy-compliant temporary data storage** (30-minute memory-only sessions)

### Supported Platforms
| Platform | Type | Primary Use Case | Status |
|----------|------|------------------|--------|
| GitHub | Development | Code contributions, PRs, commits | ✅ Active |
| Jira | Project Management | Issues, projects, sprints | ⚠️ Partial (sprints blocked) |
| Figma | Design | Design files, components, comments | ❌ Pending approval |
| Outlook | Communication | Emails, calendar events | ✅ Active |
| Teams | Collaboration | Messages, channel activity | ✅ Active |
| Confluence | Documentation | Pages, spaces, content | ✅ Active |
| Slack | Communication | Messages, channels | ✅ Active |

---

## User Journey

### 1. Initial Setup (One-time per tool)
```mermaid
User → Settings → Integrations → Select Tool → OAuth Authorization → Connected
```

### 2. Creating Journal Entry with MCP
```mermaid
User → New Journal Entry → Select MCP Tools → Choose Date Range →
Fetch Activities → Review AI Organization → Select Activities →
Generate Entry → Edit/Publish
```

### Detailed Flow:
1. **Tool Selection**: User selects which connected tools to fetch from
2. **Date Range**: User specifies the activity period (default: last 7 days)
3. **Activity Fetching**: System fetches activities from selected tools (5-30 seconds)
4. **AI Processing**: Activities are categorized and organized by impact/type
5. **Review & Selection**: User reviews categorized activities and selects relevant ones
6. **Entry Generation**: AI generates journal entry with selected activities
7. **Final Edit**: User can edit the generated content before publishing

---

## Tool Specifications

### 1. GitHub
**Purpose**: Track code contributions and development activities

#### Data Fetched:
- **Commits**: Message, SHA, date, repository, files changed, additions/deletions
- **Pull Requests**: Title, state, created/merged dates, reviews, comments
- **Issues**: Title, state, labels, assignees, comments
- **Repositories**: Contribution activity, stars, forks

#### Data NOT Fetched:
- Private repository content (unless explicitly authorized)
- Code file contents (only metadata)
- Other users' private activities
- Security vulnerabilities or alerts
- Workflow/CI secrets

#### Filtering Logic:
- Date range: Activities within specified period
- User-specific: Only activities by authenticated user
- Repository access: Only repos user has access to

#### API Limits:
- Rate limit: 5,000 requests/hour (authenticated)
- Max items: 100 commits, 50 PRs, 50 issues per fetch

---

### 2. Jira
**Purpose**: Track project management activities and issue progression

#### Data Fetched:
- **Issues**: Key, summary, status, type (Story/Task/Bug), priority, assignee
- **Projects**: Name, key, type, lead
- **Sprints**: Name, state, start/end dates, goals (currently blocked)
- **Comments**: On issues within date range
- **Work logs**: Time tracking entries

#### Data NOT Fetched:
- Attachments content
- Detailed issue descriptions (only summary)
- Custom field data
- Sensitive project data
- Admin-only information

#### Filtering Logic:
- JQL Query: `updated >= "startDate" AND updated <= "endDate"`
- Max 50 issues per fetch
- Projects ordered by last update time
- Only active/future sprints (when working)

#### Current Issues:
- ❌ Sprints API returning 401 due to Atlassian OAuth bug
- ✅ Issues working via new `/search/jql` endpoint
- ✅ Projects fetching successfully

---

### 3. Figma
**Purpose**: Track design work and collaboration

#### Data Fetched:
- **Files**: Name, last modified, thumbnail, version
- **Components**: Name, description, containing file
- **Comments**: Message, author, timestamp
- **Projects**: Name, team association
- **Teams**: Name, member count

#### Data NOT Fetched:
- Actual design content/layers
- Private team data
- Billing information
- Admin settings
- Version history details

#### Filtering Logic:
- Files modified within date range
- Maximum 10 files detailed fetch
- First 3 teams, 5 projects
- Comments within date range only

#### Current Issues:
- ❌ Blocked: Requires Figma OAuth app approval for granular scopes
- Scopes needed: `file_content:read`, `file_metadata:read`, `file_comments:read`

---

### 4. Outlook
**Purpose**: Track email communication and calendar events

#### Data Fetched:
- **Emails**: Subject, sender, recipients, date, importance, categories
- **Calendar Events**: Title, start/end times, attendees, location, response status
- **Meeting Statistics**: Organized vs attended, acceptance rates

#### Data NOT Fetched:
- Email body content (privacy)
- Attachments
- Private calendar details
- Deleted items
- Drafts

#### Filtering Logic:
- Emails: Last 50 within date range
- Events: Within date range, max 50
- Separate organized vs attended events
- High importance items prioritized

---

### 5. Microsoft Teams
**Purpose**: Track team collaboration and communication

#### Data Fetched:
- **Teams**: Name, description, member count
- **Channels**: Name, description, team association
- **Messages**: User's own channel posts (using ChannelMessage.Edit scope)
- **Chats**: Recent chat messages
- **Meeting Activity**: Participation data

#### Data NOT Fetched:
- Other users' channel messages (privacy by design)
- Private chat full content
- Files/attachments
- Call recordings
- Guest user data

#### Filtering Logic:
- Only user's own channel contributions
- Messages within date range
- Max 10 teams, 20 channels
- Recent activity prioritized

#### Special Feature:
- Uses `ChannelMessage.Edit` scope to avoid admin consent requirement
- Filters to only user's own messages for privacy

---

### 6. Confluence
**Purpose**: Track documentation and knowledge sharing

#### Data Fetched:
- **Pages**: Title, space, last modified, version
- **Spaces**: Name, key, type, description
- **Comments**: On pages, author, timestamp
- **Contributions**: User's page edits/creates

#### Data NOT Fetched:
- Page full content (only metadata)
- Attachments
- Restricted space content
- Admin configurations
- Macros/plugins data

#### Filtering Logic:
- Pages modified within date range
- Max 30 pages per fetch
- User's contributions prioritized
- Public/accessible spaces only

---

### 7. Slack
**Purpose**: Track team communication and collaboration

#### Data Fetched:
- **Channels**: Name, purpose, member count
- **Messages**: User's posts in channels
- **Threads**: Participation in discussions
- **Reactions**: Emoji reactions given/received
- **Direct Messages**: Count only (not content)

#### Data NOT Fetched:
- Private channel content (unless member)
- Direct message content (privacy)
- Deleted messages
- Other users' private data
- Workspace admin data

#### Filtering Logic:
- Messages within date range
- Public channels user is member of
- Max 100 messages per fetch
- User's own contributions prioritized

---

## Data Processing & AI Organization

### Activity Categorization

The AI organizes fetched activities into meaningful categories:

#### 1. Primary Categories
- **Major Achievements**: High-impact completed work (shipped features, resolved critical bugs)
- **Collaborative Efforts**: Team interactions, reviews, discussions
- **Documentation**: Written content, knowledge sharing
- **Learning & Development**: New technologies, skills demonstrated
- **Communication**: Meetings, important discussions

#### 2. Impact Assessment
Activities are classified by impact level:
- **High Impact**: Completed features, critical fixes, major decisions
- **Medium Impact**: Regular tasks, documentation, reviews
- **Low Impact**: Routine communications, minor updates

#### 3. Skill Extraction
The AI automatically identifies skills from activities:

**Development Skills** (from GitHub):
- Languages used (JavaScript, Python, etc.)
- Frameworks (React, Node.js, etc.)
- Practices (Code Review, Testing, CI/CD)

**Project Management** (from Jira):
- Agile methodologies
- Issue tracking
- Sprint planning
- Stakeholder management

**Design Skills** (from Figma):
- UI/UX Design
- Component design
- Design systems
- Visual design

**Collaboration Skills** (from Teams/Slack):
- Team communication
- Remote collaboration
- Meeting facilitation
- Cross-functional coordination

### AI Organization Logic

#### What AI Considers:
1. **Temporal Relevance**: Recent activities weighted higher
2. **Completion Status**: Completed work prioritized over in-progress
3. **User Involvement**: Direct contributions vs. observations
4. **Collaborative Impact**: Activities involving multiple people
5. **Technical Complexity**: Complex problem-solving highlighted
6. **Business Value**: Customer/business impact considered

#### What AI Ignores:
1. **Routine Communications**: "Thanks", "OK", simple acknowledgments
2. **Automated Activities**: Bot messages, system notifications
3. **Duplicate Information**: Same activity from multiple sources
4. **Low-Value Updates**: Minor typo fixes, formatting changes
5. **Private/Sensitive Data**: Filtered at fetch level
6. **Incomplete Activities**: Draft items, cancelled meetings

### Content Generation

The AI generates journal entry content following this structure:

1. **Title Generation**:
   - Focuses on main achievement or theme
   - Examples: "Shipped Authentication Feature", "Resolved Critical Production Bug"

2. **Summary Creation**:
   - 2-3 sentences capturing the day's/week's main accomplishments
   - Highlights impact and collaboration

3. **Detailed Sections**:
   - Groups activities by category
   - Provides context and impact for each
   - Includes metrics where relevant

4. **Skills & Growth**:
   - Lists demonstrated skills
   - Notes learning opportunities
   - Identifies areas of improvement

---

## Privacy & Security

### Core Principles

1. **Data Minimization**
   - Only fetch required data
   - No persistent storage of external data
   - 30-minute memory-only sessions

2. **User Consent**
   - Explicit OAuth authorization required
   - Granular tool selection
   - Clear data usage explanation

3. **Encryption**
   - OAuth tokens encrypted at rest (AES-256)
   - HTTPS for all API communications
   - Secure state parameters for CSRF protection

4. **Access Control**
   - User can disconnect tools anytime
   - Tokens refreshed automatically
   - No sharing between users

5. **Compliance**
   - GDPR compliant data handling
   - No data retention beyond session
   - Full audit logging of access

### Data Lifecycle

```
Fetch Request → API Call → Memory Storage (30 min) → Auto-Deletion
                    ↓
              Journal Entry (only selected items preserved)
```

---

## Technical Architecture

### OAuth Configuration

Each tool requires:
- Client ID & Secret (environment variables)
- Redirect URI (webhook endpoints)
- Specific scopes (minimal required)

### API Integration

| Tool | API Version | Authentication |
|------|------------|----------------|
| GitHub | REST v3 + GraphQL v4 | OAuth 2.0 |
| Jira | REST v3 | OAuth 2.0 (3LO) |
| Figma | REST v1 | OAuth 2.0 |
| Outlook | Microsoft Graph v1.0 | OAuth 2.0 |
| Teams | Microsoft Graph v1.0 | OAuth 2.0 |
| Confluence | REST v1 | OAuth 2.0 (3LO) |
| Slack | Web API v2 | OAuth 2.0 |

### Performance Specifications

- **Fetch Time**: 5-30 seconds depending on data volume
- **Concurrent Fetches**: Up to 3 tools in parallel
- **Memory Usage**: Max 50MB per session
- **Token Refresh**: Automatic for expired tokens
- **Rate Limiting**: Respects each platform's limits

---

## Known Limitations

### Current Issues

1. **Figma Integration**
   - Status: Blocked pending OAuth app approval
   - Issue: Granular scopes require Figma review
   - Workaround: None - awaiting approval

2. **Jira Sprints**
   - Status: 401 Unauthorized error
   - Issue: Atlassian OAuth platform bug (confirmed July 2025)
   - Workaround: Issues and projects work; sprints data unavailable

3. **Date Range Limitations**
   - Some APIs limit historical data access
   - Default 7 days, max 30 days recommended

4. **API Rate Limits**
   - Each platform has different rate limits
   - Heavy users may hit limits during peak usage

### Platform Dependencies

- Requires active subscriptions/accounts for each tool
- Some features require specific plan levels (e.g., Jira Software for sprints)
- API availability subject to platform maintenance

---

## Future Roadmap

### Phase 2 (Q1 2025)
- [ ] Add GitLab support
- [ ] Add Notion integration
- [ ] Implement batch fetching for large datasets
- [ ] Add custom field mapping for Jira

### Phase 3 (Q2 2025)
- [ ] Machine learning for better activity categorization
- [ ] Predictive skill gap analysis
- [ ] Team activity comparison (with privacy controls)
- [ ] Export to performance review formats

### Phase 4 (Q3 2025)
- [ ] Add Asana integration
- [ ] Add Monday.com support
- [ ] Real-time activity streaming
- [ ] Advanced analytics dashboard

### Long-term Vision
- Become the central hub for professional activity tracking
- Enable AI-powered career coaching based on activity patterns
- Support 20+ professional tool integrations
- Provide industry benchmarking (anonymized)

---

## Appendix

### Error Handling

All integrations implement graceful failure:
- Connection errors: Clear user messaging
- Rate limits: Automatic retry with backoff
- Missing data: Partial results returned
- Invalid tokens: Automatic refresh attempt

### Support Resources

- OAuth Setup Guide: `MCP_OAUTH_SETUP_GUIDE.md`
- Acceptance Criteria: `MCP_ACCEPTANCE_CRITERIA.md`
- AI Logic Documentation: `MCP_AI_ORGANIZATION_LOGIC.md`
- Troubleshooting Guide: Contact support@inchronicle.com

---

*Document Version: 1.0*
*Last Updated: October 2024*
*Status: Production with limitations*