# Real OAuth Onboarding E2E

This flow is for end-to-end onboarding tests with real provider accounts:
- GitHub
- Atlassian (Jira + Confluence)
- Google Workspace
- Microsoft (Outlook/Teams/OneDrive/OneNote)

## 1) Configure backend OAuth apps once

From `backend/`:

```bash
npm run oauth-cli -- validate
```

If any provider is missing, run:

```bash
npm run oauth-cli -- setup
```

Use `backend/.env.mcp.template` for callback URLs and scope details.

## 2) Prepare one dedicated real E2E user

Use a single test account for stable runs (not your personal account).

In the app, sign in as that user and connect tools from:
- `/settings/integrations`

Recommended minimum connected tools for onboarding:
- `github`
- `jira`
- `confluence`
- `google_workspace`
- `outlook`

## 3) Configure frontend E2E env

Add to `.env.local` (root):

```bash
# Optional backend override
# E2E_API_URL=http://localhost:3002/api/v1

E2E_REAL_OAUTH=true
E2E_REAL_EMAIL=your-real-e2e-user@example.com
E2E_REAL_PASSWORD=your-real-e2e-password
E2E_REQUIRED_TOOLS=github,jira,confluence,google_workspace,outlook
```

`E2E_REAL_EMAIL` / `E2E_REAL_PASSWORD` fall back to `E2E_EMAIL` / `E2E_PASSWORD` if omitted.

## 4) Verify readiness before running Playwright

```bash
npm run e2e:oauth:readiness
```

This check fails fast when a required integration is disconnected or token validation is not `valid`.

## 5) Run real onboarding suite

```bash
npm run test:e2e:onboarding:real
```

Headed mode:

```bash
npm run test:e2e:onboarding:real:headed
```

## Notes

- Existing `e2e/onboarding.spec.ts` focuses on general onboarding behavior and includes no-tool scenarios.
- Real-provider testing is isolated in `e2e/onboarding.real-oauth.spec.ts`.
