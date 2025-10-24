# MCP Multi-Source Integration Plan

**Status:** PLANNED - Remaining 6 Integrations
**Last Updated:** 2025-10-10
**Estimated Duration:** 12-15 days

---

## Table of Contents
1. [Overview](#overview)
2. [Multi-Source Architecture](#multi-source-architecture)
3. [Tool-Specific Implementations](#tool-specific-implementations)
4. [Unified Components](#unified-components)
5. [Implementation Strategy](#implementation-strategy)
6. [Timeline](#timeline)

---

## Overview

### Remaining Tools
1. **Jira** - Task management, sprint activity
2. **Figma** - Design contributions, file edits
3. **Outlook** - Meeting notes, email summaries
4. **Confluence** - Documentation updates
5. **Slack** - Important messages, discussions
6. **Microsoft Teams** - Team collaboration, meetings

### Multi-Source Strategy
Instead of building 6 separate flows, create **unified components** that work with multiple MCP sources simultaneously, allowing users to:
- ✅ Import from multiple tools at once (GitHub + Jira + Figma)
- ✅ AI intelligently merges and organizes all sources
- ✅ Single consolidated view of all activity
- ✅ Automatic deduplication and correlation

---

## Multi-Source Architecture

### Core Principle: Tool-Agnostic Components

```
Step 1.5: Import from Tools
   ↓
User selects which tools to import from:
  [✓] GitHub
  [✓] Jira
  [ ] Figma
   ↓
Date range + consent (applies to all)
   ↓
Backend fetches from all selected tools IN PARALLEL
   ↓
AI Organizer merges and categorizes ALL sources
   ↓
Single unified result with cross-tool correlations
   ↓
Rest of flow identical to GitHub-only
```

### Key Benefits
1. **Unified UX**: One import experience for all tools
2. **Cross-Tool Intelligence**: AI correlates PRs with Jira tickets
3. **Reduced Complexity**: Shared components, not 6 separate flows
4. **Better Insights**: Complete picture of work across tools

---

## Tool-Specific Implementations

### 1. Jira Integration

#### OAuth Setup
```bash
# Environment Variables
JIRA_CLIENT_ID=<to be obtained>
JIRA_CLIENT_SECRET=<to be obtained>
JIRA_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/jira
JIRA_CLOUD_ID=<user's Jira cloud ID>
```

#### Data Structure
```typescript
interface JiraActivity {
  issues: Array<{
    key: string; // "PROJ-123"
    summary: string;
    description: string;
    status: string; // "Done", "In Progress"
    statusCategory: string; // "Done", "In Progress", "To Do"
    issueType: string; // "Bug", "Story", "Task"
    priority: string;
    assignee: string;
    reporter: string;
    created: string;
    updated: string;
    resolved: string | null;
    labels: string[];
    sprint: {
      name: string;
      state: string;
      startDate: string;
      endDate: string;
    } | null;
    storyPoints: number | null;
    url: string;
  }>;
  sprints: Array<{
    id: string;
    name: string;
    state: string;
    startDate: string;
    endDate: string;
    goal: string;
  }>;
  projects: Array<{
    key: string;
    name: string;
  }>;
}
```

#### AI Categorization Logic
```
- Issues with status "Done" → Achievements
- Bugs closed → Bug Fixes category
- Stories completed → Feature Development
- High story points → Highlight importance
- Sprint activity → Learning (teamwork, agile)
```

#### Backend Implementation
**File:** `backend/src/services/mcp/tools/jira.tool.ts`

```typescript
export class JiraTool {
  async fetchActivity(userId: string, dateRange: DateRange): Promise<MCPServiceResponse<JiraActivity>> {
    // 1. Get access token
    const accessToken = await this.oauthService.getAccessToken(userId, MCPToolType.JIRA);

    // 2. Fetch user's Jira cloud ID
    const cloudId = await this.getCloudId(accessToken);

    // 3. Fetch issues assigned to or reported by user
    const jql = `(assignee = currentUser() OR reporter = currentUser())
                 AND updated >= '${dateRange.start}'
                 AND updated <= '${dateRange.end}'
                 ORDER BY updated DESC`;

    const issues = await this.jiraApi.get(`/rest/api/3/search`, {
      params: { jql, maxResults: 100, fields: 'summary,status,issuetype,priority,assignee,created,updated,resolved,labels,sprint' }
    });

    // 4. Fetch sprint data
    const sprints = await this.getActiveSprintsForUser(accessToken, cloudId);

    // 5. Return structured data
    return {
      success: true,
      data: {
        issues: issues.data.issues.map(this.mapJiraIssue),
        sprints,
        projects: this.extractProjects(issues.data.issues)
      },
      sessionId: this.createSession(userId, data)
    };
  }
}
```

---

### 2. Figma Integration

#### OAuth Setup
```bash
FIGMA_CLIENT_ID=<to be obtained>
FIGMA_CLIENT_SECRET=<to be obtained>
FIGMA_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/figma
```

#### Data Structure
```typescript
interface FigmaActivity {
  files: Array<{
    key: string;
    name: string;
    thumbnail_url: string;
    last_modified: string;
    version: string;
    url: string;
  }>;
  components: Array<{
    key: string;
    name: string;
    description: string;
    file_key: string;
    created_at: string;
    updated_at: string;
    thumbnail_url: string;
  }>;
  comments: Array<{
    id: string;
    message: string;
    file_key: string;
    created_at: string;
    resolved_at: string | null;
  }>;
}
```

#### AI Categorization Logic
```
- New files created → Design Work
- Components created → Design Systems
- Comments given → Collaboration
- File updates → Iterations
```

---

### 3. Outlook Integration

#### OAuth Setup (Microsoft Graph)
```bash
MICROSOFT_CLIENT_ID=<to be obtained>
MICROSOFT_CLIENT_SECRET=<to be obtained>
MICROSOFT_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/outlook
MICROSOFT_TENANT_ID=common
```

#### Data Structure
```typescript
interface OutlookActivity {
  meetings: Array<{
    id: string;
    subject: string;
    start: string;
    end: string;
    attendees: string[];
    organizer: string;
    isOrganizer: boolean;
    location: string;
    notes: string;
  }>;
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    to: string[];
    receivedDateTime: string;
    importance: 'low' | 'normal' | 'high';
    hasAttachments: boolean;
    bodyPreview: string;
  }>;
}
```

#### AI Categorization Logic
```
- Meetings organized → Leadership
- Meeting notes → Collaboration
- High-importance emails → Key Communications
```

---

### 4. Confluence Integration

#### OAuth Setup (Atlassian)
```bash
# Uses same Atlassian OAuth as Jira
ATLASSIAN_CLIENT_ID=<shared with Jira>
ATLASSIAN_CLIENT_SECRET=<shared with Jira>
```

#### Data Structure
```typescript
interface ConfluenceActivity {
  pages: Array<{
    id: string;
    title: string;
    space: { name: string; key: string };
    version: number;
    created: string;
    updated: string;
    url: string;
    excerpt: string;
  }>;
  blogPosts: Array<{
    id: string;
    title: string;
    space: { name: string; key: string };
    created: string;
    updated: string;
    url: string;
  }>;
  comments: Array<{
    id: string;
    pageId: string;
    content: string;
    created: string;
  }>;
}
```

#### AI Categorization Logic
```
- Pages created → Documentation
- Blog posts → Knowledge Sharing
- Page updates → Continuous Improvement
```

---

### 5. Slack Integration

#### OAuth Setup
```bash
SLACK_CLIENT_ID=<to be obtained>
SLACK_CLIENT_SECRET=<to be obtained>
SLACK_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/slack
```

#### Data Structure
```typescript
interface SlackActivity {
  messages: Array<{
    ts: string;
    text: string;
    channel: string;
    channelName: string;
    reactions: Array<{ name: string; count: number }>;
    thread_ts: string | null;
    reply_count: number;
    permalink: string;
  }>;
  threads: Array<{
    ts: string;
    channelName: string;
    text: string;
    replyCount: number;
    participants: string[];
    permalink: string;
  }>;
  channels: Array<{
    id: string;
    name: string;
    purpose: string;
  }>;
}
```

#### AI Categorization Logic
```
- Messages with high reactions → Key Insights
- Thread leadership → Discussion Facilitation
- Active channels → Team Engagement
```

---

### 6. Microsoft Teams Integration

#### OAuth Setup (Microsoft Graph)
```bash
# Uses same Microsoft OAuth as Outlook
MICROSOFT_CLIENT_ID=<shared with Outlook>
MICROSOFT_CLIENT_SECRET=<shared with Outlook>
```

#### Data Structure
```typescript
interface TeamsActivity {
  teams: Array<{
    id: string;
    displayName: string;
    description: string;
  }>;
  channels: Array<{
    id: string;
    displayName: string;
    teamId: string;
  }>;
  chatMessages: Array<{
    id: string;
    chatId: string;
    content: string;
    createdDateTime: string;
    from: string;
  }>;
  channelMessages: Array<{
    id: string;
    channelId: string;
    teamName: string;
    channelName: string;
    content: string;
    createdDateTime: string;
    replyCount: number;
    importance: string;
  }>;
}
```

#### AI Categorization Logic
```
- Channel messages → Team Communication
- Direct chats → Collaboration
- High-importance messages → Key Discussions
```

---

## Unified Components

### 1. Multi-Source Selector

**File:** `src/components/mcp/MultiSourceSelector.tsx` (NEW)

```tsx
interface MultiSourceSelectorProps {
  availableTools: MCPTool[];
  selectedTools: MCPToolType[];
  onSelectionChange: (tools: MCPToolType[]) => void;
}

const MultiSourceSelector = ({ availableTools, selectedTools, onSelectionChange }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Import from:</h3>
      <div className="grid grid-cols-2 gap-2">
        {availableTools.map(tool => (
          <label
            key={tool.toolType}
            className={cn(
              "flex items-center space-x-2 p-3 border rounded cursor-pointer",
              selectedTools.includes(tool.toolType)
                ? "border-primary-500 bg-primary-50"
                : "border-gray-200",
              !tool.isConnected && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              type="checkbox"
              checked={selectedTools.includes(tool.toolType)}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectionChange([...selectedTools, tool.toolType]);
                } else {
                  onSelectionChange(selectedTools.filter(t => t !== tool.toolType));
                }
              }}
              disabled={!tool.isConnected}
            />
            <ToolIcon type={tool.toolType} className="w-5 h-5" />
            <div className="flex-1">
              <div className="text-sm font-medium">{tool.name}</div>
              {!tool.isConnected && (
                <div className="text-xs text-gray-500">Not connected</div>
              )}
            </div>
            {tool.isConnected && (
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
};
```

### 2. Unified AI Organizer Service

**File:** `backend/src/services/mcp/mcp-multi-source-organizer.service.ts` (NEW)

```typescript
export class MCPMultiSourceOrganizer {
  async organizeMultiSourceActivity(
    sources: Map<MCPToolType, any>
  ): Promise<OrganizedActivity> {

    // Build comprehensive activity summary
    const activitySummary = this.buildActivitySummary(sources);

    const prompt = `
You are organizing professional work activity from multiple sources for a journal entry.

Sources Connected: ${Array.from(sources.keys()).join(', ')}

Activity Summary:
${activitySummary}

Your task:
1. Identify cross-tool correlations:
   - GitHub PRs linked to Jira tickets
   - Slack discussions related to design files
   - Meeting notes connected to code changes

2. Categorize ALL activity into unified categories:
   - Achievements (completed work, milestones)
   - Learning (new skills, technologies)
   - Collaboration (meetings, discussions, reviews)
   - Documentation (confluence, comments, notes)
   - Problem Solving (bug fixes, issues)

3. For each category:
   - Merge related items from different sources
   - Rank by importance
   - Show source badges

4. Suggest:
   - Entry type (achievement/learning/reflection)
   - Title that captures work across all sources
   - Skills extracted from all tools
   - Top artifacts from each source

Return JSON with cross-tool correlations highlighted.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'Multi-source professional activity organizer' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const organized = JSON.parse(response.choices[0].message.content);

    // Add source metadata to each item
    return this.enrichWithSourceMetadata(organized, sources);
  }

  private buildActivitySummary(sources: Map<MCPToolType, any>): string {
    let summary = '';

    sources.forEach((data, toolType) => {
      switch (toolType) {
        case MCPToolType.GITHUB:
          summary += `\nGitHub: ${data.commits.length} commits, ${data.pullRequests.length} PRs, ${data.issues.length} issues\n`;
          data.pullRequests.slice(0, 5).forEach(pr => {
            summary += `  - PR: ${pr.title} [${pr.state}]\n`;
          });
          break;

        case MCPToolType.JIRA:
          summary += `\nJira: ${data.issues.length} issues\n`;
          data.issues.slice(0, 5).forEach(issue => {
            summary += `  - ${issue.key}: ${issue.summary} [${issue.status}]\n`;
          });
          break;

        // ... similar for other tools
      }
    });

    return summary;
  }
}
```

### 3. Unified Results Display

**File:** `src/components/mcp/MultiSourceResults.tsx` (NEW)

```tsx
interface MultiSourceResultsProps {
  organized: OrganizedActivity;
  sources: MCPToolType[];
  onApply: (selected: SelectedItems) => void;
}

const MultiSourceResults = ({ organized, sources, onApply }) => {
  return (
    <div className="space-y-4">
      {/* Source Badges */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Imported from:</span>
        {sources.map(source => (
          <Badge key={source} variant="secondary">
            <ToolIcon type={source} className="w-3 h-3 mr-1" />
            {getToolName(source)}
          </Badge>
        ))}
      </div>

      {/* AI Suggested Title */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900">AI Suggested Title</h4>
        <p className="text-lg font-semibold mt-1">{organized.suggestedTitle}</p>
        <p className="text-sm text-gray-600 mt-2">{organized.contextSummary}</p>
      </div>

      {/* Cross-Tool Correlations */}
      {organized.correlations?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">
            🔗 AI Detected Connections
          </h4>
          {organized.correlations.map(corr => (
            <div key={corr.id} className="text-sm text-yellow-800 flex items-start space-x-2 mb-2">
              <LinkIcon className="w-4 h-4 mt-0.5" />
              <div>
                <ToolIcon type={corr.source1.tool} className="w-4 h-4 inline mr-1" />
                {corr.source1.title}
                <span className="mx-2">↔</span>
                <ToolIcon type={corr.source2.tool} className="w-4 h-4 inline mr-1" />
                {corr.source2.title}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified Categories */}
      {organized.categories.map(category => (
        <div key={category.type} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold">{category.label}</h4>
              <p className="text-sm text-gray-600">{category.summary}</p>
            </div>
            <Badge>{category.suggestedEntryType}</Badge>
          </div>

          {/* Items from multiple sources */}
          <div className="space-y-2">
            {category.items.map(item => (
              <label
                key={item.id}
                className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={...}
                />
                <ToolIcon
                  type={item.source}
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" size="sm">
                      {getToolName(item.source)}
                    </Badge>
                    {item.importance === 'high' && (
                      <Badge variant="warning" size="sm">High Impact</Badge>
                    )}
                  </div>
                </div>
                <a href={item.url} target="_blank" className="text-blue-600">
                  <ExternalLinkIcon className="w-4 h-4" />
                </a>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Apply Button */}
      <Button onClick={() => onApply(getSelectedItems())} size="lg" className="w-full">
        Apply {getSelectedCount()} Selected Items
      </Button>
    </div>
  );
};
```

### 4. Modified Step 1.5 for Multi-Source

**File:** `src/components/new-entry/steps/Step1ImportMCP.tsx` (MODIFY from single-source)

```tsx
const Step1ImportMCP = ({ formData, setFormData, onSkip, onSmartSkip }) => {
  const [selectedTools, setSelectedTools] = useState<MCPToolType[]>([]);
  const [dateRange, setDateRange] = useState('last7days');
  const [consentGiven, setConsentGiven] = useState(false);
  const [organized, setOrganized] = useState(null);

  const { data: availableTools } = useMCPIntegrations();
  const { mutate: fetchMultiSource, isPending } = useMutation({
    mutationFn: (params) => api.post('/mcp/fetch-multi-source', params)
  });

  const handleFetch = () => {
    if (selectedTools.length === 0) {
      toast.error('Please select at least one tool to import from');
      return;
    }

    fetchMultiSource({
      toolTypes: selectedTools,
      dateRange: parseDateRange(dateRange),
      consentGiven
    }, {
      onSuccess: (data) => {
        setOrganized(data.organized);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Import from Your Tools</h2>
        <p className="text-sm text-gray-600">
          Select which tools to import activity from (optional)
        </p>
      </div>

      <Button
        variant="outline"
        onClick={onSkip}
        className="absolute top-4 right-4"
      >
        Skip This Step
      </Button>

      {/* Multi-Source Selector */}
      <MultiSourceSelector
        availableTools={availableTools?.integrations || []}
        selectedTools={selectedTools}
        onSelectionChange={setSelectedTools}
      />

      {/* Date Range */}
      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {/* Consent */}
      <ConsentCheckbox checked={consentGiven} onChange={setConsentGiven} />

      {/* Fetch Button */}
      <Button
        onClick={handleFetch}
        disabled={!consentGiven || selectedTools.length === 0 || isPending}
        className="w-full"
      >
        {isPending ? 'Fetching & Organizing...' : `Fetch from ${selectedTools.length} Tool(s)`}
      </Button>

      {/* Results */}
      {organized && (
        <MultiSourceResults
          organized={organized}
          sources={selectedTools}
          onApply={(selected) => {
            // Build mcpImportData with multi-source info
            const mcpData = {
              sources: selectedTools,
              // ... rest of data
            };
            setFormData({ ...formData, mcpImportData: mcpData });
            // Show smart skip option
          }}
        />
      )}
    </div>
  );
};
```

---

## Implementation Strategy

### Phase 1: Core Multi-Source Infrastructure (3 days)
1. Create `MCPMultiSourceOrganizer` service
2. Modify backend to accept multiple tool types
3. Create parallel fetching logic
4. Test with GitHub only (existing integration)

### Phase 2: OAuth Setup for All Tools (2 days)
1. Register OAuth apps for each tool
2. Configure redirect URIs
3. Set up environment variables in Azure
4. Test OAuth flow for each tool

### Phase 3: Tool-Specific Fetchers (6 days, 1 day per tool)

**Day 1-2: Jira + Confluence (shared OAuth)**
- Implement Jira tool
- Implement Confluence tool
- Test with Atlassian OAuth

**Day 3: Figma**
- Implement Figma tool
- Test with Figma OAuth

**Day 4-5: Outlook + Teams (shared OAuth)**
- Implement Outlook tool
- Implement Teams tool
- Test with Microsoft Graph API

**Day 6: Slack**
- Implement Slack tool
- Test with Slack OAuth

### Phase 4: Multi-Source UI Components (2 days)
1. Create `MultiSourceSelector`
2. Create `MultiSourceResults`
3. Modify Step 1.5 for multi-source
4. Update FormData types

### Phase 5: Testing & Refinement (2 days)
1. Test single-tool imports
2. Test multi-tool imports (GitHub + Jira, etc.)
3. Test cross-tool correlations
4. Performance optimization
5. Error handling

---

## Timeline

### Sprint 1: Infrastructure (3 days)
**Goal:** Multi-source architecture ready

- Day 1: Backend multi-source organizer
- Day 2: Parallel fetching, multi-source API
- Day 3: Testing with GitHub

### Sprint 2: OAuth & Jira/Confluence (3 days)
**Goal:** Jira & Confluence working

- Day 1: OAuth setup for Atlassian
- Day 2: Jira tool implementation
- Day 3: Confluence tool implementation

### Sprint 3: Figma & Slack (3 days)
**Goal:** Figma & Slack working

- Day 1: Figma OAuth + implementation
- Day 2: Slack OAuth + implementation
- Day 3: Testing both tools

### Sprint 4: Microsoft Tools (3 days)
**Goal:** Outlook & Teams working

- Day 1: Microsoft Graph OAuth setup
- Day 2: Outlook implementation
- Day 3: Teams implementation

### Sprint 5: Multi-Source UI & Testing (3 days)
**Goal:** Complete multi-source experience

- Day 1: Multi-source UI components
- Day 2: Integration testing (multi-tool combinations)
- Day 3: Refinement, error handling, docs

**Total: ~15 days (3 weeks)**

---

## File Changes Summary

### NEW Files (9)

**Backend (7):**
1. `backend/src/services/mcp/mcp-multi-source-organizer.service.ts`
2. `backend/src/services/mcp/tools/jira.tool.ts`
3. `backend/src/services/mcp/tools/figma.tool.ts`
4. `backend/src/services/mcp/tools/outlook.tool.ts`
5. `backend/src/services/mcp/tools/confluence.tool.ts`
6. `backend/src/services/mcp/tools/slack.tool.ts`
7. `backend/src/services/mcp/tools/teams.tool.ts`

**Frontend (2):**
8. `src/components/mcp/MultiSourceSelector.tsx`
9. `src/components/mcp/MultiSourceResults.tsx`

### MODIFIED Files (5)

**Backend (2):**
10. `backend/src/controllers/mcp.controller.ts` (add fetch-multi-source endpoint)
11. `backend/src/routes/mcp.routes.ts` (add new routes)

**Frontend (3):**
12. `src/components/new-entry/steps/Step1ImportMCP.tsx` (multi-source support)
13. `src/components/new-entry/types/newEntryTypes.ts` (multi-source types)
14. `src/components/settings/integrations-settings.tsx` (all tools)

**Total: 14 files (9 new, 5 modified)**

---

## API Specifications

### POST /api/v1/mcp/fetch-multi-source (NEW)

**Request:**
```json
{
  "toolTypes": ["github", "jira", "figma"],
  "dateRange": {
    "start": "2025-10-03T00:00:00Z",
    "end": "2025-10-10T23:59:59Z"
  },
  "consentGiven": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "ses_multi_abc123",
    "sources": ["github", "jira", "figma"],
    "organized": {
      "suggestedEntryType": "achievement",
      "suggestedTitle": "Full-Stack Feature Delivery: Design to Deploy",
      "contextSummary": "This week I completed a full-stack feature from design through deployment...",
      "extractedSkills": ["React", "TypeScript", "Figma", "Agile"],

      "correlations": [
        {
          "id": "corr-1",
          "type": "pr_to_jira",
          "source1": {
            "tool": "github",
            "id": "pr-123",
            "title": "Add user dashboard"
          },
          "source2": {
            "tool": "jira",
            "id": "PROJ-456",
            "title": "Implement user dashboard"
          },
          "confidence": 0.95
        }
      ],

      "categories": [
        {
          "type": "achievement",
          "label": "Major Achievements",
          "summary": "Completed full-stack features with design...",
          "items": [
            {
              "id": "item-1",
              "source": "github",
              "type": "pr",
              "title": "Add user dashboard",
              "description": "...",
              "url": "...",
              "importance": "high",
              "selected": true
            },
            {
              "id": "item-2",
              "source": "jira",
              "type": "issue",
              "title": "PROJ-456: Implement user dashboard",
              "description": "...",
              "url": "...",
              "importance": "high",
              "selected": true
            },
            {
              "id": "item-3",
              "source": "figma",
              "type": "file",
              "title": "Dashboard UI Design",
              "description": "...",
              "url": "...",
              "importance": "medium",
              "selected": true
            }
          ]
        }
      ],

      "artifacts": [
        { "type": "github_pr", "source": "github", /* ... */ },
        { "type": "jira_issue", "source": "jira", /* ... */ },
        { "type": "figma_file", "source": "figma", /* ... */ }
      ]
    }
  }
}
```

---

## OAuth Configuration Matrix

| Tool | OAuth Provider | Scopes Required | Shared With |
|------|---------------|-----------------|-------------|
| GitHub | GitHub | `repo`, `user` | - |
| Jira | Atlassian | `read:jira-work`, `read:jira-user` | Confluence |
| Confluence | Atlassian | `read:confluence-content.all` | Jira |
| Figma | Figma | `file:read` | - |
| Outlook | Microsoft | `Mail.Read`, `Calendars.Read` | Teams |
| Teams | Microsoft | `Chat.Read`, `ChannelMessage.Read.All` | Outlook |
| Slack | Slack | `channels:history`, `chat:write` | - |

**Environment Variables Needed:**
```bash
# Atlassian (Jira + Confluence)
ATLASSIAN_CLIENT_ID=...
ATLASSIAN_CLIENT_SECRET=...
ATLASSIAN_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/atlassian

# Figma
FIGMA_CLIENT_ID=...
FIGMA_CLIENT_SECRET=...
FIGMA_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/figma

# Microsoft (Outlook + Teams)
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/microsoft
MICROSOFT_TENANT_ID=common

# Slack
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/callback/slack
```

---

## Success Criteria

### Technical
- ✅ All 6 tools OAuth functional
- ✅ Multi-source fetch completes in <10 seconds
- ✅ AI correlations 80%+ accurate
- ✅ Zero data loss between steps

### User Experience
- ✅ Can select 2+ tools and get unified results
- ✅ Cross-tool correlations visible and useful
- ✅ Single import creates comprehensive entry
- ✅ All artifacts preserved from all sources

### Adoption
- ✅ 50% of users connect 2+ tools (60 days post-launch)
- ✅ Multi-source entries rated higher quality
- ✅ Time saved vs manual entry: 70%+

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize tools** (which 3 to implement first?)
3. **Set up OAuth apps** for prioritized tools
4. **Start Sprint 1** (multi-source infrastructure)

When ready to implement, reference both:
- `MCP_GITHUB_INTEGRATION_PLAN.md` (single-source foundation)
- `MCP_REMAINING_INTEGRATIONS_PLAN.md` (this document)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-10
