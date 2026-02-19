# E2E Account Setup Runbook

Step-by-step guide for setting up E2E testing with real OAuth providers.

**Workflow:** Create email → Register in app → Register OAuth apps at each provider → Configure `.env` → Connect integrations → Sync → Run tests → Teardown.

---

## A. Create a Throwaway Email

Use a Gmail `+` alias or a dedicated test email:

```
inchronicle-e2e-local@gmail.com       # local dev
inchronicle-e2e-staging@gmail.com     # staging
```

Gmail `+` aliases work too: `yourname+inchronicle-e2e@gmail.com`

> The email must be a real inbox — some OAuth providers send verification emails.

---

## B. Sign Up for the App

### Option 1: CLI (recommended)

```bash
# Set credentials in .env.local first:
# E2E_REAL_EMAIL=inchronicle-e2e-local@gmail.com
# E2E_REAL_PASSWORD=<strong-password>

npm run e2e:setup
```

### Option 2: API

```bash
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"inchronicle-e2e-local@gmail.com","password":"<password>","name":"E2E Test User"}'
```

### Option 3: Registration UI

Navigate to `http://localhost:5555/register` and fill in the form.

Verify login works before proceeding.

---

## C. Register OAuth Apps at Each Provider

All scopes and callback paths below come from `backend/src/services/mcp/oauth-provider-contract.ts` (single source of truth).

Replace `<BACKEND_URL>` with your backend URL (e.g., `http://localhost:3002`).

### GitHub

| | |
|---|---|
| **Dev Console** | https://github.com/settings/applications/new |
| **Scopes** | `repo read:user` |
| **Callback URL** | `<BACKEND_URL>/api/v1/mcp/callback/github` |

Steps:
1. Go to GitHub > Settings > Developer settings > OAuth Apps > New OAuth App
2. Set **Homepage URL** to `http://localhost:3002`
3. Set **Authorization callback URL** to `http://localhost:3002/api/v1/mcp/callback/github`
4. Click "Register application"
5. Copy the **Client ID**
6. Generate a **Client Secret** and copy it

### Atlassian (Jira + Confluence)

| | |
|---|---|
| **Dev Console** | https://developer.atlassian.com/console/myapps/ |
| **Scopes** | `read:jira-work read:jira-user read:board-scope:jira-software read:sprint:jira-software read:me offline_access` |
| **Callback URLs** | `<BACKEND_URL>/api/v1/mcp/callback/jira` |
| | `<BACKEND_URL>/api/v1/mcp/callback/confluence` |
| | `<BACKEND_URL>/api/v1/mcp/callback/atlassian` |

Steps:
1. Go to Atlassian Developer Console > Create > OAuth 2.0 integration
2. Name it (e.g., "InChronicle E2E")
3. Under **Authorization** > Add **OAuth 2.0 (3LO)** > Add all three callback URLs above
4. Under **Permissions**, add:
   - Jira API: `read:jira-work`, `read:jira-user`, `read:board-scope:jira-software`, `read:sprint:jira-software`
   - User identity API: `read:me`
5. Copy **Client ID** and **Secret** from the Settings page

> One Atlassian app covers both Jira and Confluence.

### Google Workspace (Drive + Calendar)

| | |
|---|---|
| **Consent Screen** | https://console.cloud.google.com/apis/credentials/consent |
| **Credentials** | https://console.cloud.google.com/apis/credentials |
| **Scopes** | `userinfo.email userinfo.profile drive.readonly calendar.readonly` |
| **Callback URL** | `<BACKEND_URL>/api/v1/mcp/callback/google_workspace` |

Steps:
1. Create a new Google Cloud project (or use an existing one)
2. Go to **APIs & Services > OAuth consent screen**
   - User type: External (or Internal for Workspace orgs)
   - Add test users: your E2E email address
3. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**
   - Application type: Web application
   - Add `http://localhost:3002/api/v1/mcp/callback/google_workspace` as an Authorized redirect URI
4. Copy **Client ID** and **Client Secret**

Full scopes requested:
```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/calendar.readonly
```

### Microsoft (Outlook, Teams, OneDrive, OneNote)

| | |
|---|---|
| **Dev Console** | https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps |
| **Scopes** | `User.Read Mail.Read Calendars.Read offline_access` |
| **Callback URLs** | `<BACKEND_URL>/api/v1/mcp/callback/outlook` |
| | `<BACKEND_URL>/api/v1/mcp/callback/teams` |
| | `<BACKEND_URL>/api/v1/mcp/callback/onedrive` |
| | `<BACKEND_URL>/api/v1/mcp/callback/onenote` |

Steps:
1. Go to Azure Portal > Microsoft Entra ID > App registrations > New registration
2. Name: "InChronicle E2E"
3. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
4. Redirect URI (Web): add all four callback URLs above
5. Under **Certificates & secrets** > New client secret > copy the **Value** (not the Secret ID)
6. Copy the **Application (client) ID** from the Overview page
7. Optionally set `MICROSOFT_TENANT_ID` (defaults to `common` for multi-tenant)

> One Azure app registration covers Outlook, Teams, OneDrive, and OneNote.

---

## D. Configure `.env` and Validate

Add the client IDs and secrets to `backend/.env`:

```env
# GitHub
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Atlassian (Jira + Confluence)
ATLASSIAN_CLIENT_ID=...
ATLASSIAN_CLIENT_SECRET=...

# Google Workspace
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Microsoft (Outlook, Teams, OneDrive, OneNote)
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
# MICROSOFT_TENANT_ID=common  # optional, defaults to common
```

Add E2E credentials to root `.env.local`:

```env
E2E_REAL_EMAIL=inchronicle-e2e-local@gmail.com
E2E_REAL_PASSWORD=<password>
E2E_REAL_OAUTH=true
# E2E_API_URL=http://localhost:3002/api/v1  # optional, this is the default
# E2E_REQUIRED_TOOLS=github,jira,confluence,google_workspace,outlook  # optional
```

Validate OAuth configuration (run from `backend/`):

```bash
cd backend && npm run oauth-cli -- validate
```

---

## E. Connect Integrations in the App

1. Start the backend and frontend (`npm run dev` in both)
2. Login as the E2E user
3. Navigate to `/settings/integrations`
4. Connect each tool (GitHub, Jira, Confluence, Google Workspace, Outlook)
5. Run the readiness check:

```bash
npm run e2e:oauth:readiness
```

All tools should report as connected and valid.

---

## F. Seed Test Data and Sync

1. Navigate to the Timeline page
2. Click the Sync button to trigger activity sync
3. Verify activities appear from each connected tool

---

## G. Run E2E Tests

```bash
# Readiness check (fast, no browser)
npm run e2e:oauth:readiness

# Real OAuth onboarding test
npm run test:e2e:onboarding:real

# With headed browser (for debugging)
npm run test:e2e:onboarding:real:headed
```

---

## H. Teardown

### Option 1: CLI (headless/CI)

```bash
npm run e2e:teardown
```

This logs in, wipes MCP integrations, and hard-deletes the user. The email becomes reusable for re-registration.

### Option 2: Debug Console (in-app)

1. Open the app and login as the E2E user
2. Press `Cmd+E` to open the Debug Console
3. Click the **E2E** tab
4. **Reset Session** — logs out, clears all local state
5. **Delete User** — hard-deletes the user and all data (requires typing "DELETE" to confirm)

### Full Lifecycle

```bash
npm run e2e:setup                        # Create user
# ... connect integrations in UI ...
npm run e2e:oauth:readiness              # Verify connections
npm run test:e2e:onboarding:real         # Run tests
npm run e2e:teardown                     # Clean up
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `User already exists` on setup | Run `npm run e2e:teardown` first |
| Hard-delete returns 403 | Only works when `NODE_ENV !== 'production'` |
| OAuth readiness check fails | Reconnect the failing tool at `/settings/integrations` |
| Google consent screen blocks | Add the E2E email as a test user in the Google Cloud console |
| Microsoft admin consent required | Use a personal Microsoft account, or get admin consent for your org |
