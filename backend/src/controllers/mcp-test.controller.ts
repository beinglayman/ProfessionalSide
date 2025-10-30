import { Request, Response } from 'express';
import { sendSuccess, asyncHandler } from '../utils/response.utils';

/**
 * MCP Test Data Controller
 * Provides realistic mock data for testing the MCP workflow end-to-end
 * without requiring real OAuth connections or API calls to external services
 */

/**
 * Generate test activities for all MCP tools
 * Returns realistic mock data matching the expected format
 */
export const getTestActivities = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { toolTypes, dateRange } = req.body;

  // Parse date range or use defaults (yesterday)
  const end = dateRange?.end ? new Date(dateRange.end) : new Date();
  const start = dateRange?.start ? new Date(dateRange.start) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const results: any[] = [];

  // Generate mock data for each requested tool
  for (const toolType of toolTypes || ['github', 'jira', 'figma', 'outlook', 'confluence', 'slack', 'teams', 'onedrive', 'onenote', 'sharepoint']) {
    switch (toolType) {
      case 'github':
        results.push({
          source: 'github',
          tool: 'GitHub',
          success: true,
          data: {
            commits: [
              {
                id: 'c1',
                sha: '7f9a8b2',
                message: 'Fix authentication bug in user login flow',
                repo: 'inchronicle/backend',
                timestamp: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                additions: 45,
                deletions: 12,
                files: ['src/auth/login.ts', 'src/middleware/auth.middleware.ts']
              },
              {
                id: 'c2',
                sha: '4d3e9f1',
                message: 'Add user profile validation',
                repo: 'inchronicle/backend',
                timestamp: new Date(start.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                additions: 78,
                deletions: 5,
                files: ['src/validators/profile.validator.ts', 'src/types/profile.types.ts']
              },
              {
                id: 'c3',
                sha: '1a2b3c4',
                message: 'Optimize database queries for journal entries',
                repo: 'inchronicle/backend',
                timestamp: new Date(start.getTime() + 8 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                additions: 34,
                deletions: 89,
                files: ['src/services/journal.service.ts', 'src/repositories/journal.repository.ts']
              }
            ],
            pullRequests: [
              {
                id: 'pr1',
                number: 234,
                title: 'Implement MCP side panel UI',
                repo: 'inchronicle/frontend',
                state: 'open',
                created: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
                updated: new Date(start.getTime() + 6 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                reviewers: ['teammate1', 'teammate2'],
                additions: 456,
                deletions: 123,
                comments: 5
              }
            ],
            issues: [
              {
                id: 'i1',
                number: 89,
                title: 'Add dark mode support',
                repo: 'inchronicle/frontend',
                state: 'open',
                created: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString(),
                updated: new Date(start.getTime() + 7 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                assignees: ['You'],
                comments: 3
              }
            ]
          }
        });
        break;

      case 'jira':
        results.push({
          source: 'jira',
          tool: 'Jira',
          success: true,
          data: {
            issues: [
              {
                id: 'INP-234',
                key: 'INP-234',
                summary: 'Implement user authentication flow',
                status: 'Done',
                type: 'Story',
                priority: 'High',
                created: new Date(start.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                updated: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
                resolved: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
                assignee: 'You',
                reporter: 'Product Manager',
                storyPoints: 8,
                sprint: 'Sprint 23'
              },
              {
                id: 'INP-235',
                key: 'INP-235',
                summary: 'Fix profile page loading issue',
                status: 'Done',
                type: 'Bug',
                priority: 'Critical',
                created: new Date(start.getTime() + 1 * 60 * 60 * 1000).toISOString(),
                updated: new Date(start.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                resolved: new Date(start.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                assignee: 'You',
                reporter: 'QA Engineer',
                storyPoints: 3,
                sprint: 'Sprint 23'
              },
              {
                id: 'INP-236',
                key: 'INP-236',
                summary: 'Optimize API response times',
                status: 'In Progress',
                type: 'Task',
                priority: 'Medium',
                created: new Date(start.getTime() + 6 * 60 * 60 * 1000).toISOString(),
                updated: new Date(start.getTime() + 9 * 60 * 60 * 1000).toISOString(),
                assignee: 'You',
                reporter: 'Tech Lead',
                storyPoints: 5,
                sprint: 'Sprint 23'
              }
            ]
          }
        });
        break;

      case 'figma':
        results.push({
          source: 'figma',
          tool: 'Figma',
          success: true,
          data: {
            files: [
              {
                id: 'f1',
                name: 'MCP Workflow Designs',
                lastModified: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
                thumbnailUrl: null,
                version: '2.5',
                contributors: ['You', 'Designer1'],
                comments: 7
              },
              {
                id: 'f2',
                name: 'Profile Page Redesign',
                lastModified: new Date(start.getTime() + 7 * 60 * 60 * 1000).toISOString(),
                thumbnailUrl: null,
                version: '1.8',
                contributors: ['You'],
                comments: 12
              }
            ],
            comments: [
              {
                id: 'fc1',
                file: 'MCP Workflow Designs',
                text: 'Updated the side panel layout to match Material Design guidelines',
                created: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                resolved: false
              },
              {
                id: 'fc2',
                file: 'Profile Page Redesign',
                text: 'Changed color scheme to improve accessibility contrast ratios',
                created: new Date(start.getTime() + 7 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                resolved: false
              }
            ]
          }
        });
        break;

      case 'outlook':
        results.push({
          source: 'outlook',
          tool: 'Outlook',
          success: true,
          data: {
            meetings: [
              {
                id: 'm1',
                subject: 'Sprint Planning - Sprint 24',
                start: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
                end: new Date(start.getTime() + 3.5 * 60 * 60 * 1000).toISOString(),
                organizer: 'Scrum Master',
                attendees: ['You', 'Team Member 1', 'Team Member 2', 'Product Owner'],
                location: 'Conference Room A / Teams',
                notes: 'Discussed upcoming features: MCP integration enhancements, profile page improvements'
              },
              {
                id: 'm2',
                subject: '1:1 with Manager',
                start: new Date(start.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                end: new Date(start.getTime() + 5.5 * 60 * 60 * 1000).toISOString(),
                organizer: 'Engineering Manager',
                attendees: ['You', 'Engineering Manager'],
                location: 'Virtual - Teams',
                notes: 'Career development discussion, feedback on recent work on authentication system'
              },
              {
                id: 'm3',
                subject: 'Design Review: Side Panel UI',
                start: new Date(start.getTime() + 8 * 60 * 60 * 1000).toISOString(),
                end: new Date(start.getTime() + 9 * 60 * 60 * 1000).toISOString(),
                organizer: 'You',
                attendees: ['You', 'UX Designer', 'Frontend Lead', 'Product Manager'],
                location: 'Teams Meeting',
                notes: 'Reviewed new side panel design, approved implementation approach'
              }
            ],
            emails: [
              {
                id: 'e1',
                subject: 'Re: API Performance Improvements',
                from: 'Tech Lead',
                to: ['You', 'Backend Team'],
                sent: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString(),
                preview: 'Great work on optimizing the query performance. Response times improved by 40%...'
              }
            ]
          }
        });
        break;

      case 'confluence':
        results.push({
          source: 'confluence',
          tool: 'Confluence',
          success: true,
          data: {
            pages: [
              {
                id: 'cp1',
                title: 'MCP Integration Architecture',
                space: 'Engineering',
                created: new Date(start.getTime() + 1 * 60 * 60 * 1000).toISOString(),
                updated: new Date(start.getTime() + 6 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                version: 3,
                contributors: ['You', 'Tech Lead'],
                comments: 5
              },
              {
                id: 'cp2',
                title: 'Authentication System Documentation',
                space: 'Engineering',
                created: new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                updated: new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                version: 5,
                contributors: ['You', 'Security Engineer'],
                comments: 8
              }
            ],
            comments: [
              {
                id: 'cc1',
                page: 'MCP Integration Architecture',
                text: 'Updated with latest OAuth flow diagrams',
                created: new Date(start.getTime() + 6 * 60 * 60 * 1000).toISOString(),
                author: 'You'
              }
            ]
          }
        });
        break;

      case 'slack':
        results.push({
          source: 'slack',
          tool: 'Slack',
          success: true,
          data: {
            messages: [
              {
                id: 'sm1',
                channel: '#engineering',
                text: 'Just deployed the new MCP side panel UI to staging. Would appreciate feedback!',
                timestamp: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString(),
                user: 'You',
                reactions: ['👍', '🚀', '✅'],
                reactionCount: 8,
                threadReplies: 3
              },
              {
                id: 'sm2',
                channel: '#product-updates',
                text: 'Authentication system is now live with improved security features',
                timestamp: new Date(start.getTime() + 7 * 60 * 60 * 1000).toISOString(),
                user: 'You',
                reactions: ['🎉', '👏'],
                reactionCount: 12,
                threadReplies: 5
              }
            ],
            reactions: [
              {
                message: 'Design proposal for Q1',
                emoji: '👍',
                timestamp: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString()
              }
            ]
          }
        });
        break;

      case 'teams':
        results.push({
          source: 'teams',
          tool: 'Microsoft Teams',
          success: true,
          data: {
            messages: [
              {
                id: 'tm1',
                channel: 'Engineering Team',
                text: 'Completed the PR for MCP integration. Ready for review!',
                timestamp: new Date(start.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                user: 'You',
                reactions: ['👍', '❤️'],
                reactionCount: 5,
                mentions: ['@Frontend Lead', '@Backend Lead']
              },
              {
                id: 'tm2',
                channel: 'Product Planning',
                text: 'Updated the roadmap with MCP v2 features based on user feedback',
                timestamp: new Date(start.getTime() + 9 * 60 * 60 * 1000).toISOString(),
                user: 'You',
                reactions: ['🚀'],
                reactionCount: 7,
                mentions: ['@Product Manager']
              }
            ],
            calls: [
              {
                id: 'tc1',
                title: 'Daily Standup',
                start: new Date(start.getTime() + 1 * 60 * 60 * 1000).toISOString(),
                duration: 15,
                participants: ['You', 'Team Member 1', 'Team Member 2', 'Scrum Master']
              }
            ]
          }
        });
        break;

      case 'onedrive':
        results.push({
          source: 'onedrive',
          tool: 'OneDrive',
          success: true,
          data: {
            recentFiles: 8,
            sharedFiles: 3,
            foldersAccessed: ['Projects', 'Documentation', 'Design Assets'],
            highlights: [
              'Created Q4 Planning Document',
              'Updated Architecture Diagrams',
              'Shared Team Resources folder with 5 teammates'
            ]
          }
        });
        break;

      case 'onenote':
        results.push({
          source: 'onenote',
          tool: 'OneNote',
          success: true,
          data: {
            notebooks: 3,
            pagesCreated: 5,
            pagesUpdated: 7,
            highlights: [
              'Created meeting notes for Sprint Planning',
              'Updated Technical Design document',
              'Added research notes on new technologies'
            ]
          }
        });
        break;

      case 'sharepoint':
        results.push({
          source: 'sharepoint',
          tool: 'SharePoint',
          success: true,
          data: {
            sitesAccessed: 4,
            filesModified: 6,
            listsUpdated: 2,
            highlights: [
              'Updated project status on Team Site',
              'Modified design specifications',
              'Updated sprint backlog list'
            ]
          }
        });
        break;
    }
  }

  sendSuccess(res, {
    results,
    testMode: true,
    message: 'Test data generated successfully. This is mock data for testing purposes.'
  });
});
