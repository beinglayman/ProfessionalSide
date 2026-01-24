# InChronicle

Professional career chronicle and work documentation platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_URL` | Backend API URL | localhost:3002 (dev) |
| `E2E_BASE_URL` | Playwright target URL | localhost:5173 |
| `E2E_EMAIL` | Test account email | - |
| `E2E_PASSWORD` | Test account password | - |

### Local UI + Production API

For testing UI changes with real production data:

```bash
# .env.local
VITE_API_URL=https://ps-backend-1758551070.azurewebsites.net/api/v1
```

**Warning:** Changes affect real production data. Use a test account.

## Testing

### Unit Tests (Vitest)

```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage
```

### E2E / Screenshot Tests (Playwright)

See **[UX-TESTING-AUTOMATION.md](./UX-TESTING-AUTOMATION.md)** for complete guide.

```bash
# Configure target in .env.local
E2E_BASE_URL=https://inchronicle.com  # or http://localhost:5173

# Run tests
npm run test:e2e          # Run E2E tests
npm run screenshots       # Capture screenshots
```

## Documentation

| Document | Description |
|----------|-------------|
| [UX-TESTING-AUTOMATION.md](./UX-TESTING-AUTOMATION.md) | Playwright screenshot testing guide |
| [pr-docs/](./pr-docs/) | PR documentation and postmortems |
