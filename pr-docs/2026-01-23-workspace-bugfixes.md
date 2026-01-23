# Workspace Creation & Filtering Bugfixes

**Date:** 2026-01-23
**Branch:** `bugfix/workspace-creation-and-filtering`
**Status:** Ready for Review

---

## Summary

Fixes two workspace-related bugs: personal workspace creation failing with 404 and phantom workspaces appearing in journal list dropdown.

---

## Bugs Fixed

### Bug 1: Personal Workspace Creation 404

**Symptom:**
```json
{
  "error": "Organization not found",
  "status": 404,
  "requestData": {"name":"test","organizationId":"org-techcorp"}
}
```

**Root Cause:**
Frontend hardcoded fallback to `'org-techcorp'` when no organization specified:
```typescript
// discovery.tsx - BEFORE
} else {
  organizationId = 'org-techcorp';  // ❌ Doesn't exist in production
}
```

**Fix:**
- Made `organizationId` optional in frontend TypeScript interface
- Made `organizationId` optional in backend Zod schema
- Backend now sets `isPersonal: true` when no organizationId provided

---

### Bug 2: Phantom Workspace 403

**Symptom:**
```json
{
  "error": "Access denied: Not a member of this workspace",
  "status": 403,
  "workspaceId": "cmkdls8cs00a811lhzeocjz5p"
}
```

User saw "Your Second Workspace" in dropdown when they only created 1 workspace.

**Root Cause:**
Workspace dropdown derived from journal entries instead of user memberships:
```typescript
// list.tsx - BEFORE
const workspaces = useMemo(() => {
  const uniqueWorkspaces = new Map();
  journals.forEach(journal => {  // ❌ Entries from old/invalid workspaces
    uniqueWorkspaces.set(journal.workspaceId, {...});
  });
  return Array.from(uniqueWorkspaces.values());
}, [journals]);
```

**Fix:**
```typescript
// list.tsx - AFTER
const { data: userWorkspaces } = useWorkspaces();  // ✅ Actual memberships

const workspaces = useMemo(() => {
  if (!userWorkspaces) return [];
  return userWorkspaces.map(ws => ({
    id: ws.id,
    name: ws.name,
    isPersonal: !ws.organization
  }));
}, [userWorkspaces]);
```

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/routes/workspace.routes.ts` | Optional organizationId in schema, conditional org check, isPersonal flag, logging |
| `src/hooks/useWorkspace.ts` | Optional organizationId in CreateWorkspaceData interface |
| `src/pages/journal/list.tsx` | Use useWorkspaces() for dropdown, add reset logic |
| `src/pages/workspaces/discovery.tsx` | Remove hardcoded org fallback, add error capture |
| `src/hooks/useWorkspace.test.ts` | **New** - 8 tests for workspace hooks |
| `src/pages/journal/list.test.tsx` | **New** - 12 tests for filtering logic |

---

## Code Changes

### Backend Schema (workspace.routes.ts)

```typescript
// BEFORE
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string()  // ❌ Required
});

// AFTER
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().optional()  // ✅ Optional
});
```

### Backend Logic (workspace.routes.ts)

```typescript
// BEFORE
const organization = await prisma.organization.findUnique({
  where: { id: validatedData.organizationId }
});
if (!organization) return sendError(res, 'Organization not found', 404);

// AFTER
if (validatedData.organizationId) {
  const organization = await prisma.organization.findUnique({
    where: { id: validatedData.organizationId }
  });
  if (!organization) return sendError(res, 'Organization not found', 404);
}

const workspace = await prisma.workspace.create({
  data: {
    name: validatedData.name,
    organizationId: validatedData.organizationId || null,
    isPersonal: !validatedData.organizationId,  // ✅ Auto-set
    // ...
  }
});
```

### Frontend Error Capture (discovery.tsx)

```typescript
} catch (error: any) {
  const { captureError } = getErrorConsole();
  captureError?.({
    source: 'WorkspaceDiscovery:createWorkspace',
    message: error?.response?.data?.error || error?.message,
    context: {
      workspaceName: newWorkspace.name,
      workspaceType: newWorkspace.type,
      organizationName: newWorkspace.organizationName || 'none (personal)',
      organizationId: organizationId || 'none',
      responseStatus: error?.response?.status,
      responseData: error?.response?.data,
    },
  });
}
```

---

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `useWorkspace.test.ts` | 8 | Fetch workspaces, create personal/org, validation errors, org not found |
| `list.test.tsx` | 12 | Transform logic, reset logic, edge cases |
| **Total** | **72** | +20 new tests (was 52) |

### Key Test Scenarios

```typescript
// Personal workspace (no org)
it('creates a personal workspace (no organizationId)', async () => {
  const createData: CreateWorkspaceData = {
    name: 'My New Workspace',
    // organizationId intentionally omitted
  };
  await result.current.mutateAsync(createData);
  expect(api.post).toHaveBeenCalledWith('/workspaces', createData);
});

// Phantom workspace reset
it('resets when selected workspace does not exist', () => {
  const workspaces = [{ id: 'ws-1' }, { id: 'ws-2' }];
  const result = shouldResetWorkspace('ws-phantom', workspaces, false, false);
  expect(result).toBe(true);  // Should reset to 'all'
});
```

---

## Testing Instructions

### Personal Workspace Creation
1. Navigate to `/workspaces/discovery`
2. Click "Create Workspace"
3. Enter name only (leave organization blank)
4. Click Create
5. **Expected:** Workspace created successfully with `isPersonal: true`

### Workspace Filtering
1. Navigate to `/journal`
2. Open workspace filter dropdown
3. **Expected:** Only shows workspaces user is actually a member of
4. If previously had phantom workspace, should auto-reset to "All Workspaces"

### Error Capture
1. Try to create workspace with invalid data
2. Press `Cmd+E` to open debug console
3. **Expected:** Error captured with full context (workspace name, type, response)

---

## Checklist

- [x] TypeScript compiles without errors
- [x] All 72 tests pass
- [x] Backend logging added
- [x] Frontend error capture enhanced
- [ ] Manual test: personal workspace creation
- [ ] Manual test: workspace dropdown filtering
- [ ] Manual test: error capture in debug console
