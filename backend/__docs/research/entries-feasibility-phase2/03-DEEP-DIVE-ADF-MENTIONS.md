# Deep Dive: Atlassian Document Format (ADF) Mentions

## TL;DR

Jira and Confluence store rich text in ADF JSON format. @mentions are NOT text - they're structured `mention` nodes with user IDs. Parsing ADF nodes is deterministic and reliable.

---

## What It Is

Atlassian Document Format (ADF) is a JSON schema for rich content. Used in:
- Jira issue descriptions
- Jira comments
- Confluence page bodies
- Confluence inline comments

### Basic ADF Structure

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hey " },
        {
          "type": "mention",
          "attrs": {
            "id": "5b10ac8d82e05b22cc7d4ef5",
            "text": "@John Smith",
            "accessLevel": "CONTAINER"
          }
        },
        { "type": "text", "text": " can you review this?" }
      ]
    }
  ]
}
```

---

## Why It Matters

**Without ADF parsing**: Regex on rendered text might find "@John Smith" but:
- No user ID (can't reliably match to Atlassian account)
- False positives from email addresses
- Misses mentions in complex formatting

**With ADF parsing**:
- Get exact `accountId` for mentioned user
- 100% accurate (no false positives)
- Works regardless of display name changes

---

## How It Works

### Extracting Mentions from ADF

```typescript
interface ADFMention {
  userId: string;      // Atlassian account ID
  displayName: string; // @-prefixed name
}

function extractMentionsFromADF(adf: object): ADFMention[] {
  const mentions: ADFMention[] = [];

  function traverse(node: any) {
    if (!node) return;

    if (node.type === 'mention' && node.attrs?.id) {
      mentions.push({
        userId: node.attrs.id,
        displayName: node.attrs.text || `@${node.attrs.id}`,
      });
    }

    if (Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  traverse(adf);
  return mentions;
}
```

### Getting ADF from Jira API

**Issue description:**
```
GET /rest/api/3/issue/{issueKey}?fields=description
```

Response:
```json
{
  "fields": {
    "description": {
      "type": "doc",
      "version": 1,
      "content": [...]
    }
  }
}
```

**Comments:**
```
GET /rest/api/3/issue/{issueKey}/comment?expand=renderedBody
```

Response includes `body` in ADF format.

### Getting ADF from Confluence API

**Page body:**
```
GET /wiki/api/v2/pages/{pageId}?body-format=atlas_doc_format
```

Response:
```json
{
  "body": {
    "atlas_doc_format": {
      "value": "{...ADF JSON...}",
      "representation": "atlas_doc_format"
    }
  }
}
```

---

## When to Use / Not Use

| Use When | Don't Use When |
|----------|----------------|
| Extracting @mentions from Jira descriptions | Plain text search for ticket keys (use regex) |
| Finding who was mentioned in Confluence pages | Getting page metadata (use v2 API directly) |
| Building participation graph | Counting comments (use API counts) |

---

## Gotchas

| Gotcha | Symptom | Fix |
|--------|---------|-----|
| ADF returned as string | JSON inside `value` field needs double-parse | `JSON.parse(body.atlas_doc_format.value)` |
| Legacy content not ADF | Older Jira Server content may be wiki markup | Check `version` field, handle gracefully |
| Nested mentions | Mentions inside tables, panels, expands | Recursive traversal covers all cases |
| `text` field missing | Some mention nodes omit display name | Fallback to user ID lookup |

---

## Implementation Checklist

- [ ] Create `adf-parser.ts` utility in pipeline
- [ ] Add `extractMentions(adf: object): ADFMention[]`
- [ ] Add unit tests with real ADF samples from Jira
- [ ] Integrate with RefExtractor for Jira/Confluence activities
- [ ] Handle legacy non-ADF content gracefully

---

## Code: Full ADF Mention Extractor

```typescript
// src/services/career-stories/pipeline/adf-parser.ts

export interface ADFMention {
  userId: string;
  displayName: string;
  accessLevel?: string;
}

export interface ADFLink {
  href: string;
  title?: string;
}

/**
 * Extract all @mentions from Atlassian Document Format content
 */
export function extractMentionsFromADF(adf: unknown): ADFMention[] {
  const mentions: ADFMention[] = [];

  if (!adf || typeof adf !== 'object') {
    return mentions;
  }

  // Handle string ADF (Confluence returns it stringified)
  let doc = adf;
  if (typeof adf === 'string') {
    try {
      doc = JSON.parse(adf);
    } catch {
      return mentions; // Not valid JSON, skip
    }
  }

  function traverse(node: any) {
    if (!node || typeof node !== 'object') return;

    // Found a mention node
    if (node.type === 'mention' && node.attrs?.id) {
      mentions.push({
        userId: node.attrs.id,
        displayName: node.attrs.text || `@user:${node.attrs.id}`,
        accessLevel: node.attrs.accessLevel,
      });
    }

    // Recurse into content array
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }

    // Handle table cells, list items, etc.
    if (Array.isArray(node.cells)) {
      for (const cell of node.cells) {
        traverse(cell);
      }
    }
  }

  traverse(doc);
  return mentions;
}

/**
 * Extract all links from ADF content
 * Useful for finding cross-tool references embedded as links
 */
export function extractLinksFromADF(adf: unknown): ADFLink[] {
  const links: ADFLink[] = [];

  if (!adf || typeof adf !== 'object') {
    return links;
  }

  let doc = adf;
  if (typeof adf === 'string') {
    try {
      doc = JSON.parse(adf);
    } catch {
      return links;
    }
  }

  function traverse(node: any) {
    if (!node || typeof node !== 'object') return;

    // Check for link marks on text nodes
    if (node.marks && Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        if (mark.type === 'link' && mark.attrs?.href) {
          links.push({
            href: mark.attrs.href,
            title: mark.attrs.title,
          });
        }
      }
    }

    // Check for inlineCard (Jira/Confluence smart links)
    if (node.type === 'inlineCard' && node.attrs?.url) {
      links.push({
        href: node.attrs.url,
      });
    }

    // Recurse
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }

  traverse(doc);
  return links;
}
```

---

## Sources

- [Atlassian Document Format (ADF) Reference](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)
- [Jira REST API v3 - Get Issue](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get)
- [Confluence REST API v2 - Get Page](https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/)
