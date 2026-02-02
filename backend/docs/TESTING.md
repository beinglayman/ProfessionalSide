# Testing Guidelines

This document establishes testing standards for the InChronicle backend. Following these guidelines from day one prevents test pollution, flaky tests, and leftover data issues.

## Core Principles

### 1. Test Isolation

Each test suite MUST be fully isolated:

```typescript
// ✅ GOOD: Isolated test user per suite
const TEST_USER_ID = 'test-user-my-feature';
const TEST_WORKSPACE_ID = 'test-workspace-my-feature';

// ❌ BAD: Using shared/real user IDs
const TEST_USER_ID = userId; // from another test
```

### 2. Transactional Cleanup

Always clean up in transactions to ensure atomicity:

```typescript
// ✅ GOOD: Transactional cleanup
async function cleanupTestData(): Promise<void> {
  await prisma.$transaction([
    prisma.careerStory.deleteMany({ where: { userId: TEST_USER_ID } }),
    prisma.journalEntry.deleteMany({ where: { authorId: TEST_USER_ID } }),
    prisma.demoToolActivity.deleteMany({ where: { userId: TEST_USER_ID } }),
  ]);
}

// ❌ BAD: Sequential deletes (can leave partial state)
await prisma.careerStory.deleteMany({ where: { userId: TEST_USER_ID } });
await prisma.journalEntry.deleteMany({ where: { authorId: TEST_USER_ID } });
```

### 3. Setup/Teardown Pattern

Use `beforeAll`, `afterAll`, `beforeEach`, `afterEach` appropriately:

```typescript
describe('MyFeature', () => {
  const TEST_USER_ID = 'test-user-my-feature';

  // Setup: Create fixtures ONCE before all tests
  beforeAll(async () => {
    await ensureTestUser(TEST_USER_ID);
    await ensureTestWorkspace(TEST_USER_ID);
  });

  // Cleanup: Remove ALL test data after suite completes
  afterAll(async () => {
    await cleanupTestData(TEST_USER_ID);
    await prisma.$disconnect();
  });

  // Per-test cleanup if tests modify shared state
  afterEach(async () => {
    await prisma.someTable.deleteMany({ where: { userId: TEST_USER_ID } });
  });
});
```

### 4. Helper Functions

Extract reusable test data factories:

```typescript
// ✅ GOOD: Helper functions with clear contracts
const makeEntry = (title: string, sourceMode: 'demo' | 'production') => ({
  authorId: TEST_USER_ID,
  workspaceId: testWorkspaceId,
  title,
  description: 'Test entry',
  fullContent: 'Test content',
  sourceMode,
});

const makeActivity = (source: string, sourceId: string, title: string) => ({
  userId: TEST_USER_ID,
  source,
  sourceId,
  title,
  timestamp: new Date(),
});
```

## Test Categories

### Unit Tests

Location: `*.test.ts` alongside source files

- Test pure functions in isolation
- Mock external dependencies
- Fast execution (< 100ms per test)

```bash
npm run test:unit
```

### Integration Tests

Location: `*.integration.test.ts`

- Test service interactions with real database
- Use isolated test users
- Always include cleanup

```bash
npm run test:integration
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run src/services/journal.service.test.ts

# Run with pattern matching
npx vitest run --testNamePattern="clearAllBySourceMode"

# Watch mode for development
npx vitest watch
```

## Debugging Test Pollution

If tests fail due to leftover data:

```bash
# Check for orphaned test data
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const activities = await prisma.demoToolActivity.groupBy({
    by: ['userId'],
    _count: { id: true },
  });
  console.log('DemoToolActivity by userId:', activities);
  await prisma.\$disconnect();
}
check();
"
```

Clean up manually if needed:

```bash
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function cleanup() {
  const testUserIds = [
    'test-user-unified-flow',
    'test-user-response-shape',
    'test-user-clear-demo-data',
  ];
  for (const userId of testUserIds) {
    await prisma.\$transaction([
      prisma.careerStory.deleteMany({ where: { userId } }),
      prisma.journalEntry.deleteMany({ where: { authorId: userId } }),
      prisma.demoToolActivity.deleteMany({ where: { userId } }),
    ]);
  }
  console.log('Cleanup complete');
  await prisma.\$disconnect();
}
cleanup();
"
```

## Checklist for New Tests

Before merging, verify:

- [ ] Test uses isolated user ID (e.g., `test-user-{feature-name}`)
- [ ] `afterAll` or `afterEach` cleans up all created data
- [ ] Cleanup uses `prisma.$transaction()` for atomicity
- [ ] Test doesn't depend on data from other test suites
- [ ] Running the test twice produces the same result
- [ ] Database is clean after test run (`DemoToolActivity count: 0`)

## Common Patterns

### Testing Demo Mode Operations

```typescript
describe('clearAllBySourceMode', () => {
  const demoService = new JournalService(true);  // isDemoMode=true
  const prodService = new JournalService(false); // isDemoMode=false

  it('only works in demo mode', async () => {
    await expect(
      prodService.clearAllBySourceMode(userId)
    ).rejects.toThrow('can only be called in demo mode');
  });

  it('deletes demo data atomically', async () => {
    // Setup
    await createTestData();

    // Execute
    const result = await demoService.clearAllBySourceMode(userId);

    // Verify
    expect(result.deletedEntries).toBe(expectedCount);
    const remaining = await prisma.demoToolActivity.count({ where: { userId } });
    expect(remaining).toBe(0);
  });
});
```

### Testing User Isolation

```typescript
it('only affects specified user', async () => {
  const OTHER_USER_ID = 'test-user-other';

  // Create data for both users
  await createDataFor(TEST_USER_ID);
  await createDataFor(OTHER_USER_ID);

  // Delete only TEST_USER_ID's data
  await service.clearData(TEST_USER_ID);

  // Verify other user's data is untouched
  const otherData = await prisma.table.count({ where: { userId: OTHER_USER_ID } });
  expect(otherData).toBeGreaterThan(0);

  // Cleanup other user
  await cleanupFor(OTHER_USER_ID);
});
```

## History

This document was created after discovering test pollution issues where integration tests left behind 41 `DemoToolActivity` records that affected other test suites. The fix involved:

1. Making deletion operations transactional
2. Adding proper `beforeAll`/`afterAll` cleanup hooks
3. Using isolated test user IDs per test suite

See commits:
- `fix(journal): make demo data deletion transactional`
- `test(journal): improve test isolation and add clearAllBySourceMode tests`
