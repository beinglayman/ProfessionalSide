# Debug Console & Error Tracing

**Date:** 2026-01-23
**Branch:** `feat/debug-console-error-tracing`
**Status:** Ready for Review

---

## Summary

Adds a developer debug console accessible via `Cmd+E` that captures all errors and API request/response traces for AI-assisted debugging.

---

## Problem

When debugging issues like OAuth failures, we needed to:
1. Manually check browser console
2. Copy/paste error details
3. Reconstruct request/response flow

No structured way to capture and export debug context for AI analysis.

---

## Solution

### Debug Console (Cmd+E)

```
┌─────────────────────────────────────────────────────────────────┐
│  Debug Console                    [Errors] [Traces]    Cmd+E   │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [All ▾]  Search: [________________]  [Export] [Clear] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  10:30:05  [API:POST]  /auth/login - 401 Unauthorized          │
│  10:30:02  [OAuth:microsoft]  admin_consent_required           │
│  10:29:58  [console.error]  Network request failed             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Features

| Feature | Description |
|---------|-------------|
| **Errors Tab** | Captures console.error, console.warn, unhandled exceptions, promise rejections |
| **Traces Tab** | Captures all API requests with full request/response data |
| **Keyboard** | `Cmd+E` toggle, `Escape` close |
| **Export** | Download as JSON for AI debugging |
| **Limits** | Max 100 errors, 200 traces (oldest dropped) |
| **Simulate** | Test error capture with simulated frontend/API errors |

### Auto-Capture

All axios API calls are automatically traced:
- Request: method, url, headers (auth redacted), params, body
- Response: status, data
- Error: message, code, stack
- Context: current page, timestamp, duration

---

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/ErrorConsoleContext.tsx` | **New** - State management, global getters |
| `src/components/dev/ErrorConsole.tsx` | **New** - UI component |
| `src/components/dev/index.ts` | **New** - Exports |
| `src/lib/api.ts` | **Modified** - Axios interceptors for auto-tracing |
| `src/pages/mcp/callback.tsx` | **Modified** - OAuth error capture |
| `src/App.tsx` | **Modified** - Provider wrapping |

---

## Usage

### Automatic (all API calls)
```typescript
// Just use api instance - traces happen automatically
const response = await api.get('/users/me');
```

### Manual capture
```typescript
import { useErrorConsole } from '../contexts/ErrorConsoleContext';

const { captureError, captureOAuthError } = useErrorConsole();

// OAuth error
captureOAuthError('microsoft', 'admin_consent_required', 'Details...');

// Custom error
captureError({
  severity: 'error',
  source: 'MyComponent',
  message: 'Something failed',
  context: { userId: '123' },
});
```

### Export for AI debugging
1. Press `Cmd+E` to open console
2. Click "Export" button
3. Paste JSON into AI chat

---

## Testing

### Built-in Simulate Button

The debug console includes a "Simulate" dropdown to test error capture:

**Frontend Errors:**
- `console.error` - Triggers console.error with random message
- `console.warn` - Triggers console.warn with random message
- `Unhandled Exception` - Throws error in setTimeout
- `Promise Rejection` - Creates unhandled promise rejection

**API Errors:**
- `API 404` - Calls non-existent endpoint
- `API 500` - Calls endpoint that returns server error

Each simulation includes a random ID to avoid dedup issues.

### Manual Test Flow

1. Press `Cmd+E` to open console
2. Click "Simulate" → select error type
3. Verify error appears in Errors tab
4. For API errors, verify trace appears in Traces tab
5. Click "Export" and verify JSON is valid

---

## Screenshots

*(Add screenshots of debug console UI)*

---

## Checklist

- [x] Build passes
- [x] No TypeScript errors
- [ ] Manual testing of Cmd+E shortcut
- [ ] Manual testing of error capture
- [ ] Manual testing of trace capture
- [ ] Manual testing of export
