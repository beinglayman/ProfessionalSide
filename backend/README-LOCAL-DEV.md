# Local Development Setup

## Prerequisites

- Node.js 18+
- Docker

## Documentation

- [Testing Guidelines](./docs/TESTING.md) - Test isolation, cleanup patterns, debugging test pollution

## Quick Start

```bash
# 1. Start PostgreSQL (port 5433 to avoid conflicts)
docker compose up -d

# 2. Configure environment
cp .env.example .env
# Edit .env and set:
# DATABASE_URL=postgresql://inchronicle:inchronicle_dev@localhost:5433/inchronicle_dev

# 3. Install dependencies
npm install

# 4. Run database migrations
npx prisma migrate dev

# 5. Start the backend
npm run dev
```

## Database

PostgreSQL runs in Docker on **port 5433** (not default 5432) to avoid conflicts with any local Postgres installation.

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Stop and remove data
docker compose down -v
```

### Connection Details

| Setting | Value |
|---------|-------|
| Host | localhost |
| Port | 5433 |
| Database | inchronicle_dev |
| User | inchronicle |
| Password | inchronicle_dev |

## OAuth Provider Setup

The backend needs OAuth app credentials (Client ID + Secret) to let users connect their external tools. These are **per-environment, not per-user** — one OAuth app registration per provider serves all users. Each user authenticates through the frontend onboarding flow using these shared app credentials.

### Quick setup (guided CLI)

```bash
# Set up all providers interactively
npm run oauth-cli -- setup

# Set up a specific provider
npm run oauth-cli -- setup --provider github

# Check what's configured
npm run oauth-cli -- status

# Validate configuration (env keys, callbacks, encryption key)
npm run oauth-cli -- validate
```

### Manual setup

1. Copy the MCP template: `cp .env.mcp.template .env.mcp.reference` (for reference)
2. Create one OAuth app per provider at the provider console (URLs in `.env.mcp.template`)
3. Add the Client ID and Client Secret to your `.env`
4. Ensure `ENCRYPTION_KEY` is set (generate with `openssl rand -base64 32`)

### Provider quick reference

| Provider | Console | One app serves | Shared credentials? |
|---|---|---|---|
| GitHub | [github.com/settings/developers](https://github.com/settings/developers) | All GitHub users | No (separate app) |
| Atlassian | [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/) | All Jira + Confluence users | Yes, one app for both tools |
| Google | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) | All Drive + Calendar users | No (consent screen required first) |
| Microsoft | [portal.azure.com](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps) | All Outlook + Teams + OneDrive + OneNote users | Yes, one app for all four tools |

See `.env.mcp.template` for exact callback URLs and scopes per provider.

### Shared provider contract

All OAuth env key names, callback paths, and scopes are defined once in `src/services/mcp/oauth-provider-contract.ts`. This module is imported by the CLI, admin API, and the runtime OAuth service — so if env key names change, all three stay in sync at compile time.

---

## Career Stories Pipeline Testing

The career stories feature includes mock data endpoints for local testing:

```bash
# Seed mock data, run clustering, return results
curl -X POST http://localhost:3002/api/v1/career-stories/mock/full-pipeline \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Clear all career stories data
curl -X DELETE http://localhost:3002/api/v1/career-stories/mock/clear \
  -H "Authorization: Bearer YOUR_TOKEN"
```

These endpoints are disabled in production.

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run src/services/journal.service.test.ts

# Run integration tests
npx vitest run src/services/career-stories/unified-flow.integration.test.ts
```

**Important:** All tests must follow the [Testing Guidelines](./docs/TESTING.md):
- Use isolated test user IDs per suite
- Clean up with `prisma.$transaction()` for atomicity
- Verify database is clean after test runs

## Troubleshooting

### Prisma version mismatch

If you see errors about Prisma schema validation, ensure you're using the local Prisma:

```bash
./node_modules/.bin/prisma migrate dev
```

### Port 5433 in use

Check what's using it:

```bash
lsof -i :5433
```

### Database connection refused

Verify Postgres is running:

```bash
pg_isready -h localhost -p 5433
docker compose ps
```
