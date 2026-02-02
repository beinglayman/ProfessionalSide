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
