# MCP AI Organization Logic - Detailed Documentation

## Version 1.0 - October 2024

## Table of Contents
1. [Overview](#overview)
2. [Categorization Logic](#categorization-logic)
3. [Impact Assessment Algorithm](#impact-assessment-algorithm)
4. [Skill Extraction Rules](#skill-extraction-rules)
5. [Content Generation Templates](#content-generation-templates)
6. [Filtering & Deduplication](#filtering--deduplication)
7. [Cross-Tool Correlation](#cross-tool-correlation)
8. [Edge Cases & Exceptions](#edge-cases--exceptions)

---

## Overview

The AI Organization Logic is responsible for transforming raw activity data from multiple tools into coherent, professionally written journal entries. This document details the exact rules, algorithms, and decision trees used by the AI.

### Core Principles

1. **Relevance Over Volume**: Quality matters more than quantity
2. **Context Preservation**: Maintain the story behind the activities
3. **Professional Tone**: Generate content suitable for career documentation
4. **Privacy First**: Never include sensitive or private information
5. **User Control**: AI suggests, user decides

---

## Categorization Logic

### Category Hierarchy

Activities are organized into a hierarchical structure:

```
Major Achievements (High Priority)
├── Completed Features
├── Critical Bug Fixes
├── Major Milestones
└── Significant Deliverables

Collaborative Efforts (Medium Priority)
├── Code Reviews
├── Team Discussions
├── Meeting Participation
└── Cross-team Coordination

Documentation (Medium Priority)
├── Technical Documentation
├── Process Documentation
├── Knowledge Sharing
└── Wiki/Confluence Updates

Learning & Development (Low-Medium Priority)
├── New Technologies Used
├── Skills Demonstrated
├── Training Completed
└── Research Activities

Communication (Low Priority)
├── Status Updates
├── General Discussions
├── Announcements
└── Routine Messages
```

### Categorization Rules

#### Rule 1: Major Achievements Detection

```javascript
IF (
  (activity.type === "PR" && activity.state === "merged" && activity.additions > 100) OR
  (activity.type === "Issue" && activity.labels.includes("critical") && activity.state === "closed") OR
  (activity.type === "Commit" && activity.message.matches(/^(feat|fix|release):/i)) OR
  (activity.type === "JiraIssue" && activity.issueType === "Story" && activity.status === "Done") OR
  (activity.type === "FigmaFile" && activity.components.length > 5)
)
THEN category = "Major Achievements"
```

#### Rule 2: Collaborative Efforts Detection

```javascript
IF (
  (activity.type === "PR" && activity.reviewComments > 0) OR
  (activity.type === "TeamsMessage" && activity.mentions.length > 0) OR
  (activity.type === "SlackMessage" && activity.thread_count > 3) OR
  (activity.type === "OutlookEvent" && activity.attendees.length > 2) OR
  (activity.type === "Comment" && activity.resolved === true)
)
THEN category = "Collaborative Efforts"
```

#### Rule 3: Documentation Detection

```javascript
IF (
  (activity.type === "ConfluencePage" && activity.action === "created") OR
  (activity.type === "GitCommit" && activity.files.some(f => f.includes("README"))) OR
  (activity.type === "JiraIssue" && activity.issueType === "Documentation") OR
  (activity.content.matches(/documentation|guide|tutorial|readme/i))
)
THEN category = "Documentation"
```

#### Rule 4: Learning Detection

```javascript
IF (
  (activity.filesChanged.some(f => isNewLanguage(f))) OR
  (activity.content.matches(/learned|research|experiment|poc|prototype/i)) OR
  (activity.type === "GitCommit" && activity.branch.includes("experiment")) OR
  (activity.labels.includes("research") || activity.labels.includes("learning"))
)
THEN category = "Learning & Development"
```

#### Rule 5: Default Communication

```javascript
IF (
  activity.notMatchedByOtherRules() AND
  (activity.type.includes("Message") || activity.type.includes("Email"))
)
THEN category = "Communication"
```

---

## Impact Assessment Algorithm

### Impact Scoring System

Each activity receives an impact score from 0-100 based on multiple factors:

```javascript
function calculateImpactScore(activity) {
  let score = 0;

  // Base scores by type
  const baseScores = {
    'PR_merged': 40,
    'Issue_closed': 35,
    'Feature_commit': 30,
    'Bug_fix': 35,
    'Documentation': 20,
    'Review': 25,
    'Meeting': 15,
    'Message': 5
  };

  score += baseScores[activity.type] || 10;

  // Modifiers
  if (activity.labels?.includes('critical')) score += 25;
  if (activity.labels?.includes('blocker')) score += 20;
  if (activity.mentions?.length > 5) score += 10;
  if (activity.filesChanged > 10) score += 15;
  if (activity.linesAdded > 500) score += 20;
  if (activity.reviewApprovals > 2) score += 10;
  if (activity.isPublic) score += 5;
  if (activity.crossTeam) score += 15;

  // Time decay (recent activities score higher)
  const daysAgo = getDaysSince(activity.date);
  score *= Math.max(0.5, 1 - (daysAgo * 0.02));

  return Math.min(100, Math.round(score));
}
```

### Impact Level Assignment

```javascript
function getImpactLevel(score) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}
```

### Impact Descriptors

| Impact Level | Score Range | Description | Examples |
|--------------|-------------|-------------|----------|
| **High** | 70-100 | Critical work affecting project success | Shipped features, critical fixes, major decisions |
| **Medium** | 40-69 | Important ongoing work | Regular development, reviews, documentation |
| **Low** | 0-39 | Routine activities | Status updates, minor fixes, discussions |

---

## Skill Extraction Rules

### Skill Detection Patterns

#### Technical Skills from Code

```javascript
const technicalSkillPatterns = {
  // Languages
  'JavaScript': /\.(js|jsx|ts|tsx)$/,
  'Python': /\.py$/,
  'Java': /\.java$/,
  'Go': /\.go$/,
  'Rust': /\.rs$/,
  'C++': /\.(cpp|cc|cxx)$/,

  // Frameworks
  'React': /(react|jsx|useState|useEffect)/i,
  'Node.js': /(node|express|npm|package\.json)/i,
  'Django': /(django|models\.py|views\.py)/i,
  'Spring': /(spring|@Controller|@Service)/i,

  // Databases
  'PostgreSQL': /(postgres|psql|pg_)/i,
  'MongoDB': /(mongo|mongoose|collection)/i,
  'Redis': /(redis|cache|pub[/-]?sub)/i,

  // DevOps
  'Docker': /(docker|dockerfile|container)/i,
  'Kubernetes': /(k8s|kubernetes|kubectl|pod)/i,
  'CI/CD': /(pipeline|jenkins|github[/-]?actions|ci[/-]?cd)/i,

  // Cloud
  'AWS': /(aws|s3|ec2|lambda|dynamodb)/i,
  'Azure': /(azure|microsoft\.cloud)/i,
  'GCP': /(google[/-]?cloud|gcp|firebase)/i
};
```

#### Soft Skills from Collaboration

```javascript
const softSkillIndicators = {
  'Leadership': [
    'organized meeting with',
    'led discussion',
    'decided',
    'approved',
    'assigned'
  ],

  'Mentoring': [
    'helped',
    'explained',
    'guided',
    'taught',
    'onboarded'
  ],

  'Communication': [
    'presented',
    'documented',
    'clarified',
    'summarized',
    'reported'
  ],

  'Problem Solving': [
    'fixed',
    'resolved',
    'debugged',
    'investigated',
    'root cause'
  ],

  'Project Management': [
    'planned',
    'scheduled',
    'prioritized',
    'tracked',
    'milestone'
  ]
};
```

### Skill Extraction Algorithm

```javascript
function extractSkills(activities) {
  const skills = new Map(); // skill -> confidence score

  activities.forEach(activity => {
    // Extract technical skills from files
    activity.files?.forEach(file => {
      Object.entries(technicalSkillPatterns).forEach(([skill, pattern]) => {
        if (pattern.test(file)) {
          skills.set(skill, (skills.get(skill) || 0) + 10);
        }
      });
    });

    // Extract soft skills from content
    const content = activity.content?.toLowerCase() || '';
    Object.entries(softSkillIndicators).forEach(([skill, indicators]) => {
      indicators.forEach(indicator => {
        if (content.includes(indicator)) {
          skills.set(skill, (skills.get(skill) || 0) + 5);
        }
      });
    });

    // Tool-specific skills
    const toolSkills = {
      'GitHub': ['Version Control', 'Git', 'Code Review'],
      'Jira': ['Agile', 'Scrum', 'Issue Tracking'],
      'Figma': ['UI Design', 'UX Design', 'Prototyping'],
      'Confluence': ['Documentation', 'Knowledge Management'],
      'Slack': ['Remote Collaboration', 'Team Communication'],
      'Teams': ['Virtual Meetings', 'Team Coordination'],
      'Outlook': ['Email Communication', 'Calendar Management']
    };

    if (toolSkills[activity.source]) {
      toolSkills[activity.source].forEach(skill => {
        skills.set(skill, (skills.get(skill) || 0) + 3);
      });
    }
  });

  // Return top skills by confidence
  return Array.from(skills.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill]) => skill);
}
```

---

## Content Generation Templates

### Title Generation

```javascript
function generateTitle(activities) {
  const templates = [
    // Achievement-focused
    "{action} {target} for {project}",
    "Completed {milestone} in {timeframe}",
    "Resolved {count} {type} Issues",

    // Collaboration-focused
    "Team Collaboration on {project}",
    "Cross-functional Work with {teams}",

    // Learning-focused
    "Exploring {technology} Implementation",
    "Deep Dive into {domain}"
  ];

  // Select template based on dominant category
  const dominantCategory = getDominantCategory(activities);
  const template = selectTemplate(dominantCategory);

  // Fill template with extracted entities
  return fillTemplate(template, extractEntities(activities));
}
```

### Summary Generation

```javascript
function generateSummary(activities) {
  const structure = {
    opening: generateOpeningSentence(activities),
    details: generateDetailSentence(activities),
    impact: generateImpactSentence(activities)
  };

  return `${structure.opening} ${structure.details} ${structure.impact}`;
}

function generateOpeningSentence(activities) {
  const highImpact = activities.filter(a => a.impact === 'High');

  if (highImpact.length > 0) {
    return `This period was marked by significant achievements including ${summarize(highImpact)}.`;
  } else {
    return `Focused on ${getDominantCategory(activities)} with steady progress across multiple initiatives.`;
  }
}
```

### Activity Description Templates

```javascript
const activityTemplates = {
  'PR_merged': "Merged pull request '{title}' after {reviewCount} reviews, adding {additions} lines across {filesChanged} files",
  'Issue_closed': "Resolved {issueType} '{title}' with priority {priority}, completing the {sprint} sprint goal",
  'Documentation': "Created comprehensive documentation for {topic}, improving team knowledge sharing",
  'Review': "Provided detailed review on {count} pull requests, ensuring code quality and best practices",
  'Meeting': "Participated in {meetingType} with {attendeeCount} stakeholders to {purpose}"
};
```

---

## Filtering & Deduplication

### Noise Filtering

Activities are filtered out if they match these patterns:

```javascript
const noisePatterns = [
  // Automated messages
  /^bot\s/i,
  /automated\s(test|build|deploy)/i,
  /\[skip\s+ci\]/i,

  // Low-value messages
  /^(ok|okay|thanks|ty|np|sure|yes|no|maybe)$/i,
  /^(👍|👎|✅|❌|🙏)$/,

  // System notifications
  /system\s+(notification|alert|update)/i,
  /scheduled\s+maintenance/i,

  // Trivial commits
  /^(fix\s+)?typo/i,
  /^format(ting)?/i,
  /^whitespace/i,
  /^minor\s+change/i
];

function isNoise(activity) {
  return noisePatterns.some(pattern =>
    pattern.test(activity.content || activity.message || '')
  );
}
```

### Duplicate Detection

```javascript
function findDuplicates(activities) {
  const duplicates = [];

  activities.forEach((a1, i) => {
    activities.slice(i + 1).forEach((a2, j) => {
      const similarity = calculateSimilarity(a1, a2);

      if (similarity > 0.85) {
        duplicates.push({
          indices: [i, i + j + 1],
          similarity,
          preferred: selectPreferred(a1, a2)
        });
      }
    });
  });

  return duplicates;
}

function calculateSimilarity(a1, a2) {
  let score = 0;

  // Same timestamp (within 5 minutes)
  if (Math.abs(a1.timestamp - a2.timestamp) < 300000) score += 0.3;

  // Similar content
  const contentSim = stringSimilarity(a1.content, a2.content);
  score += contentSim * 0.5;

  // Same entities
  if (a1.project === a2.project) score += 0.1;
  if (a1.author === a2.author) score += 0.1;

  return score;
}

function selectPreferred(a1, a2) {
  // Prefer more detailed version
  if (a1.content.length > a2.content.length * 1.5) return a1;
  if (a2.content.length > a1.content.length * 1.5) return a2;

  // Prefer primary source
  const sourcePriority = ['GitHub', 'Jira', 'Figma', 'Confluence', 'Teams', 'Slack', 'Outlook'];
  const p1 = sourcePriority.indexOf(a1.source);
  const p2 = sourcePriority.indexOf(a2.source);

  return p1 < p2 ? a1 : a2;
}
```

---

## Cross-Tool Correlation

### Activity Correlation

The AI identifies related activities across different tools:

```javascript
function correlateActivities(activities) {
  const correlations = [];

  // Pattern 1: PR merged (GitHub) + Issue closed (Jira)
  activities.filter(a => a.type === 'PR' && a.merged).forEach(pr => {
    const relatedIssue = activities.find(a =>
      a.type === 'JiraIssue' &&
      a.key === extractJiraKey(pr.title) &&
      Math.abs(a.timestamp - pr.timestamp) < 3600000 // Within 1 hour
    );

    if (relatedIssue) {
      correlations.push({
        activities: [pr, relatedIssue],
        type: 'feature_completion',
        confidence: 0.9
      });
    }
  });

  // Pattern 2: Design update (Figma) + Documentation (Confluence)
  activities.filter(a => a.source === 'Figma').forEach(design => {
    const relatedDocs = activities.filter(a =>
      a.source === 'Confluence' &&
      similarTitles(design.name, a.title) &&
      a.timestamp > design.timestamp &&
      a.timestamp < design.timestamp + 86400000 // Within 24 hours
    );

    relatedDocs.forEach(doc => {
      correlations.push({
        activities: [design, doc],
        type: 'design_documentation',
        confidence: 0.75
      });
    });
  });

  // Pattern 3: Meeting (Teams/Outlook) + Follow-up actions
  activities.filter(a => a.type === 'Meeting').forEach(meeting => {
    const followUps = activities.filter(a =>
      a.timestamp > meeting.timestamp &&
      a.timestamp < meeting.timestamp + 7200000 && // Within 2 hours
      (a.content?.includes('action item') ||
       a.content?.includes('follow up') ||
       a.labels?.includes('meeting-action'))
    );

    if (followUps.length > 0) {
      correlations.push({
        activities: [meeting, ...followUps],
        type: 'meeting_followup',
        confidence: 0.8
      });
    }
  });

  return correlations;
}
```

### Correlation Presentation

When correlated activities are found, they're presented as a unified story:

```javascript
function presentCorrelation(correlation) {
  const templates = {
    'feature_completion':
      "Completed feature development: {pr.title} (PR #{pr.number}) which resolved {issue.key}: {issue.summary}",

    'design_documentation':
      "Updated design '{design.name}' and documented changes in '{doc.title}'",

    'meeting_followup':
      "Attended {meeting.title} and created {followUps.length} action items for follow-up"
  };

  return fillTemplate(templates[correlation.type], correlation.activities);
}
```

---

## Edge Cases & Exceptions

### Handling Incomplete Data

```javascript
function handleIncompleteActivity(activity) {
  // Missing title
  if (!activity.title && activity.content) {
    activity.title = activity.content.substring(0, 50) + '...';
  }

  // Missing timestamp
  if (!activity.timestamp) {
    activity.timestamp = new Date(); // Use current time as fallback
    activity.estimated = true;
  }

  // Missing author
  if (!activity.author) {
    activity.author = 'Unknown';
    activity.confidence *= 0.8; // Reduce confidence
  }

  // Missing impact
  if (!activity.impact) {
    activity.impact = estimateImpact(activity);
  }

  return activity;
}
```

### Large Dataset Handling

```javascript
function handleLargeDataset(activities) {
  const MAX_ACTIVITIES = 500;

  if (activities.length > MAX_ACTIVITIES) {
    // Sort by impact score
    activities.sort((a, b) => b.impactScore - a.impactScore);

    // Take top activities
    const selected = activities.slice(0, MAX_ACTIVITIES);

    // Add summary of excluded
    selected.push({
      type: 'summary',
      content: `Plus ${activities.length - MAX_ACTIVITIES} additional lower-priority activities`,
      impact: 'Low'
    });

    return selected;
  }

  return activities;
}
```

### Error Recovery

```javascript
function processWithErrorHandling(activities) {
  const processed = [];
  const errors = [];

  activities.forEach(activity => {
    try {
      const result = processActivity(activity);
      processed.push(result);
    } catch (error) {
      errors.push({
        activity: activity.id || 'unknown',
        error: error.message,
        fallback: createFallbackActivity(activity)
      });

      // Add fallback to processed
      processed.push(errors[errors.length - 1].fallback);
    }
  });

  if (errors.length > 0) {
    console.warn(`Processing errors: ${errors.length} activities used fallback`);
  }

  return { processed, errors };
}
```

### Special Cases

#### Empty Results
```javascript
if (activities.length === 0) {
  return {
    title: "Planning and Preparation Day",
    summary: "Focused on planning and preparation with no tracked external activities.",
    suggestions: [
      "Consider adding manual journal entries for planning activities",
      "Check if all tools are properly connected",
      "Verify the selected date range includes your work period"
    ]
  };
}
```

#### Single Tool Results
```javascript
if (uniqueSources.length === 1) {
  return {
    title: `${uniqueSources[0]} Activity Summary`,
    summary: generateSingleToolSummary(activities, uniqueSources[0]),
    note: "Consider connecting more tools for a comprehensive view"
  };
}
```

#### Weekend/Holiday Detection
```javascript
if (isWeekend(dateRange) || isHoliday(dateRange)) {
  adjustExpectations({
    reduceMeetingWeight: true,
    increasePersonalProjectWeight: true,
    expectLowerVolume: true
  });
}
```

---

## AI Decision Priorities

When making decisions, the AI follows this priority order:

1. **User Safety & Privacy** - Never expose sensitive data
2. **Accuracy** - Correct information over impressive narratives
3. **Relevance** - User's actual work over system noise
4. **Completeness** - Include all significant activities
5. **Readability** - Clear, professional language
6. **Conciseness** - Brevity without losing context

---

## Continuous Learning Indicators

The AI tracks these metrics for improvement:

- User edits to generated content
- Activities frequently deselected
- Categories users manually change
- Skills users add/remove
- Time spent reviewing vs. accepting

These indicators help refine the organization logic over time.

---

*Document Version: 1.0*
*Last Updated: October 2024*
*AI Model: Claude 3*

---