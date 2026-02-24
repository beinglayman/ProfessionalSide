# InChronicle MCP Integration Audit

> Principal Ghost review. Calm assessment of what's connected, what's flowing, what's left on the table, and what it costs to pick it up.

---

## Executive Summary

InChronicle connects to **12 OAuth-based tools** across 5 provider ecosystems, plus **Azure OpenAI** for AI generation, **Razorpay** for billing, and **SMTP** for transactional email. The MCP layer is well-architected — AES-256 encrypted token storage, proactive refresh, memory-only sessions, audit logging. I've seen this pattern work at scale.

The integrations fetch **activity data** — the "what happened" layer. But most APIs expose significantly more data that would strengthen story generation: collaboration patterns, impact metrics, review quality, cross-tool relationships. This document maps every endpoint in use, what's available but untapped, and the permission cost of reaching for it.

---

## Integration Status Matrix

| # | Tool | Provider | Status | Endpoints Used | Data Quality | Notes |
|---|------|----------|--------|---------------|--------------|-------|
| 1 | GitHub | GitHub | Working | 15 | Strong | Most complete integration |
| 2 | Jira | Atlassian | Working | 9 | Strong | JQL-powered, changelog extraction |
| 3 | Confluence | Atlassian | Working | 8 | Good | v2 API, body content extraction |
| 4 | Slack | Slack | Working | 6 | Good | Search + history + threads |
| 5 | Figma | Figma | Working | 5 | Fair | Rate-limited to 5 projects, 10 files |
| 6 | Google Workspace | Google | Working | 3 | Fair | Drive + Calendar + Meet recordings |
| 7 | Outlook | Microsoft | Working | 3 | Fair | Calendar + emails only |
| 8 | Teams | Microsoft | Working | 6 | Good | Teams + channels + chats + messages |
| 9 | OneDrive | Microsoft | Working | 3 | Fair | Recent + shared + folders |
| 10 | OneNote | Microsoft | Working | 4 | Fair | Notebooks + sections + page content |
| 11 | Zoom | Zoom | Working | 4 | Good | Meetings + recordings (transcripts dormant) |
| 12 | Figma | Figma | Working | 5 | Fair | Components + comments extracted |

**Status legend:** Working = OAuth flow complete, data fetching operational, transformer pipeline active.

---

## Detailed Per-Integration Breakdown

### 1. GitHub

**OAuth Scopes:** `repo read:user`
**Default Date Range:** Last 24 hours
**Rate Limiting:** Capped at 10 repos, 50 detail fetches max

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET /user` | Authenticated user | id, login, name, email |
| `GET /repos/{owner}/{repo}/commits` | Commits in date range | sha, message, author, date, url, stats (additions/deletions/total), file count |
| `GET /repos/{owner}/{repo}/commits/{sha}` | Commit details | Full stats per commit |
| `GET /search/issues?q=is:pr author:@me` | Authored PRs | id, title, state, labels, draft, comments, additions/deletions, changed_files, commits, reviewers, body, head/base ref, reviews |
| `GET /search/issues?q=is:pr reviewed-by:@me` | Reviewed PRs | Same as above |
| `GET /search/issues?q=is:issue involves:@me` | Issues | number, title, state, assignee, reporter, labels, comments, body |
| `GET /user/repos` | User repositories | full_name, language, pushed_at, description, private, stars, forks |
| `GET /repos/{owner}/{repo}/releases` | Releases | tag_name, name, body, author, date, draft, prerelease |
| `GET /repos/{owner}/{repo}/actions/runs` | CI/CD workflow runs | name, status, conclusion, event, branch, run_number, dates |
| `GET /repos/{owner}/{repo}/deployments` | Deployments | environment, description, creator, state, dates |
| `GET /repos/{owner}/{repo}/deployments/{id}/statuses` | Deployment statuses | state per deployment |
| `GET /repos/{owner}/{repo}/pulls/{pr}/comments` | PR review comments | body, author, file path, date |
| `GET /repos/{owner}/{repo}/pulls/{pr}/reviews` | PR reviews | state (approved/changes_requested/commented) |
| `GET /user/starred` | Starred repos | full_name, description, language, stars, starred_at |

**Cross-tool note:** PR and issue bodies are explicitly extracted for cross-tool reference linking (e.g., "Closes AUTH-123" maps to Jira tickets).

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET /search/code` | Code search across repos | Find specific contributions by keyword | None (covered by `repo`) |
| `GET /repos/{owner}/{repo}/stats/contributors` | Contribution stats per contributor | Lines added/deleted over time, commit frequency — proves sustained impact | None |
| `GET /repos/{owner}/{repo}/stats/commit_activity` | Weekly commit activity | Activity patterns, intensity over sprints | None |
| `GET /repos/{owner}/{repo}/stats/code_frequency` | Weekly additions/deletions | Net code growth trend | None |
| `GET /repos/{owner}/{repo}/stats/participation` | Owner vs all commits per week | Shows personal contribution ratio | None |
| `GET /repos/{owner}/{repo}/traffic/views` | Repo traffic | How widely your work is used/viewed | `repo` (push access required) |
| `GET /repos/{owner}/{repo}/traffic/clones` | Clone counts | Adoption signal | `repo` (push access required) |
| `GET /repos/{owner}/{repo}/topics` | Repo topics/tags | Technology and domain classification | None |
| `GET /repos/{owner}/{repo}/languages` | Language breakdown (bytes) | Technical breadth evidence | None |
| `GET /repos/{owner}/{repo}/code-scanning/alerts` | Security findings | "Fixed N security vulnerabilities" narrative | `security_events` scope |
| `GET /repos/{owner}/{repo}/dependabot/alerts` | Dependency vulnerabilities | Supply chain security work | `security_events` scope |
| `GET /repos/{owner}/{repo}/commits/{sha}/comments` | Commit comments | Inline discussion on specific changes | None |
| `GET /repos/{owner}/{repo}/milestones` | Project milestones | Goal completion tracking | None |
| `GET /repos/{owner}/{repo}/projects` | Repo-level projects | Kanban/project management evidence | `read:project` scope |
| `GET /orgs/{org}/teams` | Org teams | Team membership and cross-team collaboration | `read:org` scope |
| `GET /repos/{owner}/{repo}/compare/{base}...{head}` | Diff between refs | Quantified delta for specific features | None |
| `GET /notifications` | User notifications | Activity signals, review requests, mentions | `notifications` scope |
| `GET /gists` | User gists | Knowledge sharing artifacts | None |

**Principal Ghost take:** The contributor stats endpoints (`/stats/contributors`, `/stats/participation`) are free — no extra scope — and they're the single best signal for proving "I built this." I've seen too many career narratives that claim ownership without quantitative backing. These endpoints close that gap. The language breakdown endpoint also gives you technology diversity evidence for free. Pick these up first.

The security scanning endpoints (`code-scanning/alerts`, `dependabot/alerts`) need `security_events` scope — that's a new permission prompt for users. Worth it if the product targets security-conscious engineers, but it's a narrow audience. I'd deprioritize unless user research says otherwise.

---

### 2. Jira

**OAuth Scopes:** `read:jira-work read:jira-user read:board-scope:jira-software read:sprint:jira-software read:me offline_access`
**Default Date Range:** Last 7 days
**Shared OAuth:** Same Atlassian credentials as Confluence

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET /oauth/token/accessible-resources` | Cloud IDs / sites | id, url, name, scopes |
| `GET /rest/api/3/myself` | Current user | accountId, displayName, email |
| `GET /rest/api/3/search/jql` | Issues by JQL | key, summary, status, assignee, reporter, priority, type, project, dates, time tracking, description (ADF), comments total, labels, issue links |
| `GET /rest/api/3/project/search` | Projects | key, name, type, lead |
| `GET /rest/agile/1.0/board` | Scrum boards | id, name, type |
| `GET /rest/agile/1.0/board/{id}/sprint` | Sprints per board | id, name, state, dates, goal |
| `GET /rest/api/3/issue/{key}/changelog` | Issue changelog | field, fromString, toString, author, timestamp (filtered to status/assignee/priority/Sprint/Fix Version) |
| `GET /rest/api/3/issue/{key}/worklog` | Worklogs | timeSpentSeconds, started, author, comment (ADF) |
| `GET /rest/api/3/project/{key}/versions` | Releases / fix versions | id, name, description, released, releaseDate |

**Note:** POST `/rest/api/3/search` was deprecated Oct 2024 (returns 410 Gone). Code already migrated to GET `/rest/api/3/search/jql`.

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET /rest/api/3/issue/{key}/watchers` | Issue watchers | Stakeholder breadth — who cares about your work | None (covered by existing scopes) |
| `GET /rest/api/3/issue/{key}/comment` | Full comment bodies | Discussion depth, decision-making context | None |
| `GET /rest/agile/1.0/board/{id}/sprint/{id}/issue` | Issues in specific sprint | Sprint-scoped achievement context | `read:sprint:jira-software` (already granted) |
| `GET /rest/agile/1.0/sprint/{id}/report` | Sprint report | Velocity, committed vs completed — proves delivery consistency | `read:sprint:jira-software` (already granted) |
| `GET /rest/api/3/issue/{key}/remotelink` | Remote links | Cross-tool traceability (Confluence pages, GitHub PRs linked to tickets) | None |
| `GET /rest/agile/1.0/board/{id}/configuration` | Board configuration | Column mapping, workflow states | None |
| `GET /rest/api/3/issue/{key}/transitions` | Available transitions | Workflow complexity evidence | None |
| `GET /rest/api/3/field` | All custom fields | Understand what metadata exists (story points, epic link, etc.) | None |
| `GET /rest/api/3/search/jql` with `fixVersion` filter | Issues by release | Release-scoped contributions | None |
| `GET /rest/agile/1.0/epic/{id}/issue` | Issues in an epic | Epic-level narrative grouping | `read:epic:jira-software` scope |
| `GET /rest/api/3/dashboard` | User dashboards | Personalized views — signals what the user tracks | None |
| `GET /rest/api/3/issue/{key}/attachment` | Attachments metadata | Design docs, screenshots linked to issues | None |
| `GET /rest/api/3/component/{id}` | Project components | Area-of-ownership mapping | None |

**Principal Ghost take:** Sprint reports are the single most valuable addition here. They're already covered by granted scopes — no new permissions needed. Velocity data, commitment vs delivery ratio — I've seen these numbers make or break promotion packets. The remote links endpoint is equally important: it's the glue that connects "Jira ticket X" to "GitHub PR Y" and "Confluence page Z." That cross-tool graph is where stories become evidence instead of assertions.

The epic endpoint needs `read:epic:jira-software` — a new scope. Worth requesting because epics are the natural boundary for "I led this initiative" stories. Without epic context, you're aggregating tickets manually.

---

### 3. Confluence

**OAuth Scopes:** `read:page:confluence read:blogpost:confluence read:space:confluence read:comment:confluence read:user:confluence read:me offline_access`
**Default Date Range:** Last 30 days
**Shared OAuth:** Same Atlassian credentials as Jira

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET /oauth/token/accessible-resources` | Cloud IDs / sites | id, url, name, scopes |
| `GET https://api.atlassian.com/me` | Current user (Identity API) | account_id, name, email |
| `GET /wiki/rest/api/user?accountId=` | Resolve display name | displayName, publicName |
| `GET /wiki/api/v2/spaces` | User spaces | key, name, type, description, homepageId |
| `GET /wiki/api/v2/pages` | Pages (filtered by date/user) | id, title, dates, author, space, version, webui link, body (storage format), labels |
| `GET /wiki/api/v2/blogposts` | Blog posts (filtered) | Same fields as pages |
| `GET /wiki/api/v2/pages/{id}/footer-comments` | Page-level comments | id, date, author, body |
| `GET /wiki/api/v2/pages/{id}/inline-comments` | Inline comments | Same as footer comments |

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET /wiki/api/v2/pages/{id}/versions` | Page version history | Edit frequency, authorship depth — "I iterated on this 14 times" | None (covered by `read:page:confluence`) |
| `GET /wiki/api/v2/pages/{id}/attachments` | Page attachments | Diagrams, design docs, architecture images linked to pages | `read:attachment:confluence` scope |
| `GET /wiki/api/v2/pages/{id}/properties` | Content properties | Custom metadata, macros used, structured data | None |
| `GET /wiki/api/v2/pages/{id}/labels` | Page labels | Categorization, topic classification | None (already partially extracted in page response) |
| `GET /wiki/rest/api/search` | Content search (CQL) | Find pages by keyword across all spaces | `search:confluence` scope |
| `GET /wiki/rest/api/analytics/content/{id}/views` | Page view analytics | Impact evidence: "This doc was viewed 340 times" | `read:analytics:confluence` scope (may require Confluence Premium) |
| `GET /wiki/api/v2/pages/{id}/children` | Child pages | Document structure, hierarchy depth | None |
| `GET /wiki/api/v2/content/{id}/restriction` | Page restrictions | Who has access — signals sensitivity/importance of the work | None |
| `GET /wiki/rest/api/content/{id}/history` | Content history | Contributors list, version count | None |
| `GET /wiki/api/v2/tasks` | Tasks within pages | Action items created, assigned, completed | `read:task:confluence` scope |

**Principal Ghost take:** Page analytics is the prize here — but it requires `read:analytics:confluence` and likely Confluence Premium/Data Center. I've seen orgs where the most-viewed engineering docs are the ones that prove influence. If your users are at companies with Premium, this is high-signal data.

Version history is free and high-value. The number of edits on a design doc tells a story about iteration depth and thoroughness. Page children tell you about document hierarchy — someone who authors a 5-page design spec tree is doing different work than someone who edits one page.

---

### 4. Slack

**OAuth Scopes:** `channels:read channels:history users:read chat:write`
**Default Date Range:** Variable (per search query)
**Rate Limiting:** 200ms delay between API calls

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET users.identity` | User identity | id, name, email |
| `GET conversations.list` | Channels (member of) | id, name, is_private, topic, purpose, num_members |
| `GET auth.test` | Authenticated user ID | user_id |
| `GET search.messages` | Messages from user | ts, text, channel name/id, permalink, reactions |
| `GET conversations.history` | Channel history | Messages within time range |
| `GET conversations.replies` | Thread replies | thread_ts, reply_count, reply_users_count, latest_reply, text |

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET reactions.list` | Reactions given/received | Social proof: "This message got 15 reactions" | `reactions:read` scope |
| `GET files.list` | Files shared by user | Knowledge sharing artifacts, presentations shared | `files:read` scope |
| `GET pins.list` | Pinned messages | Important contributions that others pinned | `pins:read` scope |
| `GET bookmarks.list` | Channel bookmarks | Resources curated by user | `bookmarks:read` scope |
| `GET users.profile.get` | Detailed user profile | Title, status, custom fields | `users.profile:read` scope |
| `GET conversations.history` (DMs) | Direct messages | 1:1 collaboration evidence | `im:history` scope |
| `GET conversations.history` (Group DMs) | Group DM messages | Small group coordination | `mpim:history` scope |
| `GET team.info` | Workspace info | Organization context | `team:read` scope |
| `GET usergroups.list` | User groups | Membership in special groups (on-call, leads, etc.) | `usergroups:read` scope |
| `GET conversations.members` | Channel member lists | Collaboration breadth per channel | `channels:read` (already granted) |
| `GET admin.analytics.getFile` | Workspace analytics | Message counts, active days, reactions given/received | Enterprise Grid + admin scope |

**Principal Ghost take:** The `reactions:read` scope is the lowest-cost, highest-signal addition. Reactions are the Slack equivalent of "peer validation." If someone's technical explanation consistently gets 8+ reactions, that's evidence of communication skill and domain expertise. `files:read` is similarly high-value — shared docs, presentations, and diagrams prove knowledge sharing behavior.

I'd avoid `im:history` and `mpim:history`. DMs feel private. Users will hesitate to grant that access, and the consent story is tricky. I've seen products lose trust by overreaching into private messages.

---

### 5. Figma

**OAuth Scopes:** `file_content:read file_metadata:read file_comments:read`
**Rate Limiting:** 100ms delay; limited to 3 teams, 5 projects, 10 files, 5 files for comments

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET /v1/me` | User info | All response fields |
| `GET /v1/teams/{id}/projects` | Team projects | All fields + teamId, teamName |
| `GET /v1/projects/{id}/files` | Project files | name, key, last_modified, thumbnail_url, version |
| `GET /v1/files/{key}` (depth=1) | File details | components (name, description), styles |
| `GET /v1/files/{key}/comments` | File comments | id, message, created_at, user.handle |

**Known limitation:** Files must be in team projects — Drafts are not accessible (logged as WARNING).

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET /v1/files/{key}/versions` | File version history | Iteration count, design evolution over time | None (covered by `file_content:read`) |
| `GET /v1/files/{key}/images` | Exported images of nodes | Visual artifacts for story illustration | None |
| `GET /v1/teams/{id}/members` | Team member list | Collaboration evidence, team size context | None |
| `GET /v1/files/{key}/component_sets` | Component set details | Design system contribution evidence | None |
| `GET /v1/files/{key}/styles` | File style definitions | Design system governance evidence | None |
| `GET /v1/files/{key}` (full depth) | Complete file tree | All layers, frames, components — full design audit | None (but heavy payload — use with care) |
| `GET /v1/activity_logs` | Org activity logs | Design activity audit trail | Enterprise plan + `org:read` scope |
| Webhooks API | Real-time file change events | Live activity tracking | `webhooks:write` scope |
| `GET /v1/files/{key}/dev_resources` | Dev handoff resources | Engineering-design collaboration evidence | `file_dev_resources:read` scope |

**Principal Ghost take:** File version history is the free win here. A design file with 47 versions tells a very different story than one with 3. No extra scope needed. Dev resources (`file_dev_resources:read`) is interesting for engineering-design collaboration stories but it's a narrow scope addition. I'd pick it up only if the user base skews toward design-adjacent engineers.

The aggressive rate limits (3 teams, 5 projects, 10 files) concern me. At a company with 20+ Figma projects, you're sampling less than a quarter of the work. Consider making the limits configurable or adding a "deep scan" mode.

---

### 6. Google Workspace

**OAuth Scopes:** `userinfo.email userinfo.profile drive.readonly calendar.readonly`
**Default Date Range:** Variable per API

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| Google Drive `files.list()` | Drive files | id, name, mimeType, webViewLink, icons, thumbnails, dates, size, starred, owners, lastModifyingUser, shared |
| Google Calendar `events.list()` | Calendar events | All event fields |
| Google Drive `files.list()` (video filter) | Meet recordings | id, name, mimeType, webViewLink, createdTime, duration, size |

#### Additional Data Available (Not Currently Fetched)

| API / Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| Gmail API `messages.list()` | Email messages | Communication patterns, thread counts, response times | `gmail.readonly` scope |
| Google Tasks API | Task lists and tasks | Personal task management evidence | `tasks.readonly` scope |
| Google Chat API | Chat spaces and messages | Team communication (if org uses Google Chat) | `chat.messages.readonly` scope |
| Drive `files.list()` with `q: "mimeType='application/vnd.google-apps.form'"` | Google Forms | Surveys created, feedback tools | None (covered by `drive.readonly`) |
| Drive `revisions.list()` | File revision history | Edit frequency and collaboration depth | None |
| Drive `comments.list()` | File comments | Feedback/review discussion on docs | None |
| Drive `permissions.list()` | File sharing permissions | Collaboration breadth per document | None |
| People API `people.connections.list()` | Contacts | Professional network context | `contacts.readonly` scope |
| Google Docs API `documents.get()` | Full document content | Content analysis, authorship | `documents.readonly` scope |
| Google Sheets API `spreadsheets.get()` | Spreadsheet structure + data | Data analysis work evidence | `spreadsheets.readonly` scope |

**Principal Ghost take:** Drive revisions and comments are free — already covered by `drive.readonly`. These are the same pattern as Confluence page versions: iteration depth as evidence. The Gmail API is a heavy scope ask (`gmail.readonly` is broad) but unlocks communication volume and pattern analysis. I'd gate it behind explicit user opt-in with very clear privacy messaging. I've seen products stumble when email access isn't handled with visible care.

Google Forms is a hidden gem — covered by existing scopes. If a user created surveys, feedback forms, or retro templates, that's leadership/process evidence that costs zero additional permissions.

---

### 7. Microsoft Outlook

**OAuth Scopes:** `User.Read Mail.Read Calendars.Read offline_access`
**Default Date Range:** Last 7 days

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET /v1.0/me` | User info | id, displayName, mail, userPrincipalName |
| `GET /v1.0/me/calendarview` | Calendar meetings | id, subject, start/end, attendees, isOrganizer, importance, bodyPreview |
| `GET /v1.0/me/messages` | Emails | id, subject, sender, receivedDateTime, hasAttachments, importance, bodyPreview |

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET /v1.0/me/messages/{id}/attachments` | Email attachments metadata | Documents shared via email | None (covered by `Mail.Read`) |
| `GET /v1.0/me/mailFolders` | Email folder structure | Organization patterns | None |
| `GET /v1.0/me/todo/lists` | To Do task lists | Task management evidence | `Tasks.Read` scope |
| `GET /v1.0/me/todo/lists/{id}/tasks` | Individual tasks | Completed tasks, planning evidence | `Tasks.Read` scope |
| `GET /v1.0/me/contacts` | Contacts | Professional network context | `Contacts.Read` scope |
| `GET /v1.0/me/events` (recurring) | Recurring meetings | Standing meetings = sustained collaboration | None |
| `GET /v1.0/me/calendarGroups` | Calendar groups | Meeting categorization | None |
| `GET /v1.0/me/messages?$filter=importance eq 'high'` | High-importance emails | Priority communication signals | None |
| `GET /v1.0/me/inferenceClassification` | Focused inbox rules | What the user considers important | `MailboxSettings.Read` scope |

---

### 8. Microsoft Teams

**OAuth Scopes:** `User.Read Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Edit Chat.Read Chat.ReadBasic offline_access`
**Note:** `ChannelMessage.Edit` permission restricts to user's own messages only

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET /v1.0/me` | User info | id, displayName, mail, userPrincipalName |
| `GET /v1.0/me/joinedTeams` | Joined teams | id, displayName, description |
| `GET /v1.0/teams/{id}/channels` | Channels per team | id, displayName, description, membershipType, teamId, teamName |
| `GET /v1.0/chats` | User chats | id, topic, chatType, dates |
| `GET /v1.0/chats/{id}/messages` | Chat messages | id, date, author, content, importance, type |
| `GET /v1.0/teams/{teamId}/channels/{channelId}/messages` | Channel messages | id, date, author (multiple fallback fields), content, importance, type, replies |

**Fallback pattern:** Teams tool falls back to Outlook token if Teams token isn't available.

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET /v1.0/teams/{id}/members` | Team members | Team size, membership evidence | `TeamMember.Read.All` scope |
| `GET /v1.0/me/presence` | User presence status | Activity patterns | `Presence.Read` scope |
| `GET /v1.0/teams/{id}/channels/{id}/tabs` | Channel tabs | Tools/resources pinned — shows what matters to the team | `TeamsTab.Read.All` scope |
| `GET /v1.0/me/onlineMeetings` | Online meetings | Meeting metadata, organizer evidence | `OnlineMeetings.Read` scope |
| `GET /v1.0/me/onlineMeetings/{id}/transcripts` | Meeting transcripts | Discussion content, decision context | `OnlineMeetingTranscript.Read.All` scope |
| `GET /v1.0/me/onlineMeetings/{id}/attendanceReports` | Attendance reports | Meeting participation evidence | `OnlineMeetingArtifact.Read.All` scope |
| `GET /v1.0/teams/{id}/channels/{id}/messages/{id}/replies` | Message replies (paginated) | Discussion depth per topic | None (may already be partial in current fetch) |

**Principal Ghost take:** Meeting transcripts are the highest-value addition across the entire Microsoft ecosystem — but `OnlineMeetingTranscript.Read.All` is a sensitive permission. Users will rightly pause before granting it. Consider it a "power user" toggle, not a default. Attendance reports are less sensitive and prove meeting leadership.

---

### 9. OneDrive

**OAuth Scopes:** `User.Read Files.Read offline_access`
**Default Date Range:** Last 30 days

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET /v1.0/me/drive/recent` | Recent files | id, name, webUrl, fileType, size, dates, lastModifiedBy, parentPath |
| `GET /v1.0/me/drive/sharedWithMe` | Shared files | id, name, webUrl, fileType, date, sharedBy, scope |
| `GET /v1.0/me/drive/root/children` | Root-level active folders | id, name, webUrl, childCount, lastModifiedDateTime |

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET /v1.0/me/drive/items/{id}/versions` | File version history | Iteration depth per document | None |
| `GET /v1.0/me/drive/items/{id}/permissions` | File permissions | Collaboration breadth | None |
| `GET /v1.0/me/drive/search(q='...')` | File search | Find work by keyword | None |
| `GET /v1.0/me/drive/items/{id}/thumbnails` | File thumbnails | Visual previews | None |
| `GET /v1.0/me/drive/root/delta` | Change tracking (delta) | All changes since last sync — incremental updates | None |
| `GET /v1.0/sites` | SharePoint sites | Team site content and collaboration | `Sites.Read.All` scope (**requires admin consent**) |

**Note:** SharePoint integration is explicitly disabled in current code due to admin consent requirement.

---

### 10. OneNote

**OAuth Scopes:** `User.Read Notes.Read offline_access`
**Rate Limiting:** Page content limited to 10 pages

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET /v1.0/me/onenote/notebooks` | Notebooks | id, displayName, dates, isDefault, links |
| `GET /v1.0/me/onenote/sections` | Recent sections | id, displayName, dates, links, parentNotebook |
| `GET /v1.0/me/onenote/pages` | Recent pages | id, title, dates, contentUrl, links, parentSection, parentNotebook |
| `GET /v1.0/me/onenote/pages/{id}/content` | Page HTML content | Full HTML body (stripped of scripts/styles) |

**Known limitation:** Graph API doesn't expose page count per section.

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET /v1.0/me/onenote/sectionGroups` | Section groups | Organizational structure of notes | None |
| `GET /v1.0/me/onenote/pages/{id}/content` (images) | Embedded images | Visual artifacts (diagrams, sketches) | None |
| `POST /v1.0/me/onenote/pages/{id}/preview` | Page preview | Quick summary without full content | None |

---

### 11. Zoom

**OAuth Scopes:** `meeting:read:meeting meeting:read:list_meetings meeting:read:list_upcoming_meetings meeting:read:list_past_instances cloud_recording:read:list_user_recordings cloud_recording:read:list_recording_files cloud_recording:read:meeting_transcript cloud_recording:read:recording user:read:user`

#### Data Currently Fetched

| Endpoint | Data | Fields |
|----------|------|--------|
| `GET /v2/users/me` | User info | All response fields |
| `GET /v2/users/me/meetings` (type=previous_meetings) | Past meetings | id, uuid, topic, type, start_time, duration, timezone, host, participants_count, join_url |
| `GET /v2/users/me/meetings` (type=upcoming) | Upcoming meetings | Same + agenda |
| `GET /v2/users/me/recordings` | Cloud recordings | id, meetingId, dates, duration, total_size, share_url, topic, recording_files (id, type, format, size, urls) |

**Dormant feature:** `fetchTranscript()` method exists as private method but is not called in main flow. Comment: "Implement on-demand if needed to avoid rate limiting."

#### Additional Data Available (Not Currently Fetched)

| API Endpoint | Data Available | Value for Stories | Extra Scope Needed |
|-------------|---------------|-------------------|-------------------|
| `GET /v2/meetings/{id}/recordings/transcript` | Meeting transcript | Full text of what was discussed — already scoped! | None (**already granted**: `cloud_recording:read:meeting_transcript`) |
| `GET /v2/report/meetings/{id}/participants` | Meeting participants | Who attended, duration per participant | `report:read:list_meeting_participants` scope |
| `GET /v2/meetings/{id}/polls` | Meeting polls | Interactive meeting evidence | `meeting:read:list_polls` scope |
| `GET /v2/meetings/{id}/registrants` | Meeting registrants | Event organization evidence | `meeting:read:list_registrants` scope |
| `GET /v2/report/meetings/{id}` | Meeting report | Detailed meeting analytics | `report:read:meeting` scope |
| `GET /v2/report/users/{userId}/meetings` | User meeting report | Meeting frequency and duration patterns | `report:read:user` scope |
| `GET /v2/chat/users/me/messages` | Zoom Chat messages | In-platform messaging | `chat_message:read` scope |
| `GET /v2/phone/users/{userId}/call_logs` | Phone call logs | Call activity (Zoom Phone users) | `phone:read:list_call_logs` scope |

**Principal Ghost take:** The transcript endpoint is already scoped and the code is already written — it's just not wired up. This is the easiest win in the entire audit. Activate `fetchTranscript()`, call it for recordings that have transcripts. Meeting transcripts paired with Jira ticket references can auto-generate rich context for "what was decided and why." I've seen this exact pattern turn shallow stories into compelling narratives.

Meeting participants data needs a new scope but proves collaboration breadth: "Led a meeting with 14 attendees from 3 teams." Worth the ask.

---

## Non-OAuth Integrations

### 12. Azure OpenAI

| Aspect | Details |
|--------|---------|
| **Status** | Working |
| **Env Vars** | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_DEPLOYMENT` |
| **Model** | GPT-4 deployment |
| **Used By** | AI entry generator, multi-source organizer, content sanitizer, career story LLM polisher, skills benchmarker |

### 13. Razorpay

| Aspect | Details |
|--------|---------|
| **Status** | Working |
| **Env Vars** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| **Features** | Subscription management, one-time credit topups, webhook-verified payments |

### 14. SMTP (Email)

| Aspect | Details |
|--------|---------|
| **Status** | Working |
| **Env Vars** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` |
| **Package** | nodemailer |
| **Features** | Transactional emails, HTML templates, queue system, attachments |

### 15. PostgreSQL

| Aspect | Details |
|--------|---------|
| **Status** | Working |
| **Env Var** | `DATABASE_URL` |
| **ORM** | Prisma |

---

## Priority Recommendations

Ordered by value-to-effort ratio:

### Tier 1: Free Wins (No New Permissions)

| # | Integration | What to Add | Why |
|---|-------------|------------|-----|
| 1 | **Zoom** | Activate dormant `fetchTranscript()` | Code exists, scope granted, not wired up |
| 2 | **GitHub** | `/stats/contributors` + `/stats/participation` | Quantified contribution evidence, zero scope cost |
| 3 | **GitHub** | `/repos/{repo}/languages` | Technology breadth evidence |
| 4 | **Jira** | Sprint reports via agile API | Velocity data, commitment vs delivery — scope already granted |
| 5 | **Jira** | `/issue/{key}/remotelink` | Cross-tool link graph (Jira ↔ GitHub ↔ Confluence) |
| 6 | **Confluence** | Page version history | Iteration depth evidence |
| 7 | **Google** | Drive `revisions.list()` + `comments.list()` | Document iteration and review patterns |
| 8 | **OneDrive** | File versions + delta API | Change tracking and iteration depth |
| 9 | **Figma** | File version history | Design iteration evidence |

### Tier 2: High Value, New Scope Required

| # | Integration | What to Add | New Scope | User Impact |
|---|-------------|------------|-----------|-------------|
| 1 | **Slack** | Reactions | `reactions:read` | Low friction — reactions are social, not private |
| 2 | **Slack** | Files shared | `files:read` | Low friction — files are work artifacts |
| 3 | **Jira** | Epic-scoped issues | `read:epic:jira-software` | Low friction — standard Jira scope |
| 4 | **Outlook/Teams** | To Do tasks | `Tasks.Read` | Low friction — task lists are productivity data |
| 5 | **Teams** | Meeting attendance reports | `OnlineMeetingArtifact.Read.All` | Medium friction — meeting metadata |
| 6 | **GitHub** | Organization teams | `read:org` | Medium friction — org-level access |

### Tier 3: High Value, Sensitive Permissions

| # | Integration | What to Add | New Scope | Concern |
|---|-------------|------------|-----------|---------|
| 1 | **Google** | Gmail messages | `gmail.readonly` | High sensitivity — email is personal |
| 2 | **Teams** | Meeting transcripts | `OnlineMeetingTranscript.Read.All` | High sensitivity — spoken words |
| 3 | **GitHub** | Security alerts | `security_events` | Medium sensitivity — exposes vulnerability data |
| 4 | **OneDrive** | SharePoint sites | `Sites.Read.All` | Requires admin consent — deployment blocker |
| 5 | **Slack** | DM history | `im:history` | High sensitivity — private conversations |

---

## Cross-Tool Correlation Opportunities

The most valuable untapped pattern is **cross-tool linking**. The code already extracts bodies from GitHub PRs/issues for Jira ticket references. Expanding this:

| Source | Target | Link Signal | Currently Implemented |
|--------|--------|-------------|----------------------|
| GitHub PR body | Jira ticket key | "Closes AUTH-123" | Yes (body extracted) |
| GitHub issue body | Jira ticket key | "Related to PERF-456" | Yes (body extracted) |
| Jira remote links | GitHub PRs | Jira ↔ GitHub explicit links | **No** — add `/issue/{key}/remotelink` |
| Jira remote links | Confluence pages | Jira ↔ Confluence explicit links | **No** — same endpoint |
| Confluence page body | Jira ticket key | Inline ticket references in docs | Partially (body content extracted, matching not done) |
| Slack messages | Jira ticket key | Ticket discussions in channels | Partially (message text extracted, matching not done) |
| Zoom meeting topic | Jira epic/sprint | Meeting-to-sprint alignment | **No** — topic text matching |

---

## Security & Privacy Notes

The MCP architecture handles sensitive integration data well:

- **Tokens:** AES-256-CBC encrypted at rest, proactive refresh with 5-minute buffer
- **Sessions:** Memory-only with 30-minute TTL — no external data persisted
- **Audit:** All integration actions logged in `MCPAuditLog` table
- **CSRF:** OAuth state parameter validated on all callbacks
- **Grouped flows:** Atlassian (Jira + Confluence) and Microsoft (Outlook + Teams + OneDrive + OneNote) share single OAuth grants, reducing permission prompts

**When adding new scopes:** Each additional scope appears in the OAuth consent screen. Group related scopes in a single re-authorization flow rather than prompting users multiple times. Consider a "basic" vs "enhanced" integration mode where users opt into deeper access.

---

*Document generated by Principal Ghost review — February 2026*
