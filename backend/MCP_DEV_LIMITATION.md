# MCP Development Limitation

## Issue
The MCP (Model Context Protocol) routes cannot be loaded in development mode due to a tsx hot-reload incompatibility with ES6 module exports.

## Symptoms
When MCP routes are enabled in development mode with `tsx watch`, the server crashes with:
```
Error: Route.get() requires a callback function but got a [object Undefined]
```

## Root Cause
The `tsx` tool (used for TypeScript hot-reloading in development) has known issues with ES6 export/import patterns used in the MCP controller. When tsx attempts to hot-reload the `mcp.routes.ts` file, it cannot properly resolve the exported controller functions from `mcp.controller.ts`.

## Solution
MCP routes are **conditionally loaded** based on the environment:

### Development Mode (Default)
- MCP routes are **disabled** by default
- Backend starts successfully without MCP functionality
- Console shows:
  ```
  ⚠️  MCP routes disabled in development (tsx hot-reload limitation)
     To enable MCP in development: set ENABLE_MCP=true
     For testing MCP: use production build (npm run build && npm start)
  ```

### Production Mode
- MCP routes are **enabled** automatically
- Full MCP functionality available
- Uses compiled JavaScript (no tsx hot-reload)

### Force Enable in Development
Set environment variable to bypass the check:
```bash
export ENABLE_MCP=true
npm run dev
```

**Warning**: Enabling MCP in development mode will cause the server to crash on any hot-reload of MCP files.

## Testing MCP Functionality

### Option 1: Production Build (Recommended)
```bash
cd backend
npm run build
npm start
```

### Option 2: Force Enable (Use with Caution)
```bash
cd backend
ENABLE_MCP=true npm run dev
# Do not edit MCP files while server is running
```

### Option 3: Railway Production Environment
Test directly in the deployed Railway environment where MCP works normally.

## Implementation Details

The conditional loading is implemented in `backend/src/app.ts`:

```typescript
// MCP routes - conditionally loaded based on environment to avoid tsx hot-reload issues
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_MCP === 'true') {
  // Dynamic import to avoid module loading errors in development
  import('./routes/mcp.routes').then((mcpModule) => {
    const mcpRoutes = mcpModule.default;
    app.use('/api/v1/mcp', mcpRoutes);
    console.log('✅ MCP routes enabled (production mode)');
  }).catch((error) => {
    console.error('❌ Failed to load MCP routes:', error.message);
  });
} else {
  console.log('⚠️  MCP routes disabled in development (tsx hot-reload limitation)');
  console.log('   To enable MCP in development: set ENABLE_MCP=true');
  console.log('   For testing MCP: use production build (npm run build && npm start)');
}
```

## Files Affected
- `/backend/src/app.ts` - Conditional route loading
- `/backend/src/routes/mcp.routes.ts` - MCP route definitions
- `/backend/src/controllers/mcp.controller.ts` - MCP controller functions

## Status
- ✅ Backend starts successfully in development mode (MCP disabled)
- ✅ Backend starts successfully in production mode (MCP enabled)
- ✅ Clear console messages indicate MCP status
- ✅ Documented limitation and workarounds

## Future Considerations
Possible future solutions (not implemented):
1. Switch from `tsx` to a different TypeScript hot-reload tool
2. Convert MCP routes to CommonJS (attempted, failed)
3. Create mock MCP endpoints for development testing
4. Separate MCP into standalone microservice

For now, the conditional loading approach is the most pragmatic solution.
