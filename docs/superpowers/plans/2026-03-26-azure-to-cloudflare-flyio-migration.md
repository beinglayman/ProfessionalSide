# Azure to Cloudflare Pages + Fly.io Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate InChronicle from Azure (App Service + ACR + Flexible PG + Azure Files) to Cloudflare Pages (frontend) + Fly.io (backend) + Neon (database) + Cloudflare R2 (file storage), while first fixing local DX pain points that are independent of the migration.

**Architecture:** Four phases executed sequentially. Phase 0 ships DX improvements with zero migration dependency. Phase 1 introduces a storage abstraction layer (prerequisite for R2). Phase 2 stands up the new infrastructure in parallel with Azure. Phase 3 performs the DNS cutover with Azure kept alive as rollback for 2 weeks.

**Tech Stack:** Cloudflare Pages (frontend hosting + edge SSR), Fly.io (Docker backend), Neon PostgreSQL Launch plan ($19/mo, 10 GiB), Cloudflare R2 (S3-compatible object storage), `@aws-sdk/client-s3` (storage SDK), `concurrently` (local dev orchestration), GitHub Actions (CI/CD)

**DNS Baseline (captured 2026-03-27):**
- Nameservers: `launch1.spaceship.net` / `launch2.spaceship.net` (Spaceship registrar — NOT Cloudflare)
- Email: Microsoft 365 (MX → `inchronicle-com.mail.protection.outlook.com`)
- TXT: SPF (`include:spf.protection.outlook.com`), DMARC (`p=reject`), MS verification, Google site verification
- A record: `20.119.0.51` (Azure App Service)
- No DKIM CNAME records found (selector1/selector2 don't resolve)
- Active OAuth: GitHub (OAuth App), Atlassian, Google, Microsoft. Figma/Slack/Zoom likely not configured in prod.
- **Razorpay webhook** at `POST /api/v1/billing/webhook` — must update URL in Razorpay dashboard at cutover

---

## File Structure

### Phase 0 — DX Fixes (new/modified)

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add `dev:all`, `dev:infra`, `dev:stop`, `dev:reset` scripts |
| `docker-compose.yml` (root) | Create | Root-level compose with PG (replaces `backend/docker-compose.yml` usage) |
| `vite.config.ts` | Modify | Fix `strictPort`, update Prisma Studio port comment |
| `backend/package.json` | Modify | Change Prisma Studio port to 5556 |
| `server.mjs` | Modify | Extract `BASE_URL` to env var |
| `.env.local.example` | Create | Minimal local-only env template (backend) |
| `manage-services.sh` | Modify | Fix frontend port reference (5173 → 5555) |

### Phase 1 — Storage Abstraction (new/modified)

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/src/services/storage/storage.interface.ts` | Create | `StorageService` interface |
| `backend/src/services/storage/local-storage.service.ts` | Create | Filesystem implementation (current behavior) |
| `backend/src/services/storage/r2-storage.service.ts` | Create | R2/S3 implementation via `@aws-sdk/client-s3` |
| `backend/src/services/storage/index.ts` | Create | Factory that returns correct impl based on env |
| `backend/src/controllers/user.controller.ts` | Modify | Use `StorageService` for avatar uploads |
| `backend/src/routes/workspace.routes.ts` | Modify | Use `StorageService` for workspace file uploads/deletes |
| ~~`backend/src/services/export.service.ts`~~ | — | Export service uses its own `exports/` dir for temp JSON, not uploads. No change needed. |
| `backend/src/app.ts` | Modify | Conditionally serve `/uploads` only in local mode |
| `backend/src/services/storage/__tests__/local-storage.test.ts` | Create | Unit tests for local storage |
| `backend/src/services/storage/__tests__/r2-storage.test.ts` | Create | Unit tests for R2 storage |
| `backend/src/services/storage/__tests__/factory.test.ts` | Create | Factory selection tests |

### Phase 2 — Migration Prep (new/modified)

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/fly.toml` | Create | Fly.io app config (lives in backend/, not root) |
| `backend/Dockerfile` | Modify | Ensure it works on Fly.io (no Azure-specific assumptions) |
| `backend/prisma/schema.prisma` | Modify | Add `directUrl` for Neon PgBouncer compatibility |
| `functions/p/[shortCode].ts` | Create | Cloudflare Pages Function — pragma link OG tags |
| `functions/[slug].ts` | Create | Cloudflare Pages Function — chronicle profile OG tags |
| `public/_routes.json` | Create | Exclude static assets from Pages Functions (saves quota) |
| `.github/workflows/deploy-fly.yml` | Create | Fly.io backend deploy workflow |
| `backend/src/app.ts` | Modify | Clean up CORS — remove hardcoded Azure URLs, use env-driven list |
| `backend/src/controllers/user.controller.ts` | Modify | Remove `azurewebsites.net` host detection in avatar URL construction |
| `src/lib/api.ts` | Modify | Remove hardcoded Azure fallback URL |
| `src/services/profile-api.service.ts` | Modify | Remove `azurewebsites.net` HTTP→HTTPS check |
| `src/utils/avatar.ts` | Modify | Remove `azurewebsites.net` HTTP→HTTPS check |
| `vite.config.ts` | Modify | Remove `.azurewebsites.net` from allowed hosts |

### Phase 3 — Cutover (config changes only, no new code)

| File | Action | Responsibility |
|------|--------|---------------|
| `.github/workflows/deploy-frontend.yml` | Delete or disable | Old Azure frontend deploy |
| `.github/workflows/deploy-backend.yml` | Delete or disable | Old Azure backend deploy |
| `infra/azure-provision.sh` | Keep (archive) | Reference for deprovisioning later |
| `verify-azure-deployment.sh` | Delete | Azure-specific health checks |

---

## Phase 0: Local DX Fixes

> **Dependency:** None. Ship this immediately on Azure. No migration required.

---

### Task 0.1: Root Docker Compose

**Files:**
- Create: `docker-compose.yml` (root)

- [ ] **Step 1: Create root docker-compose.yml**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    container_name: inchronicle-postgres
    ports:
      - "5434:5432"
    environment:
      POSTGRES_USER: inchronicle
      POSTGRES_PASSWORD: inchronicle_dev
      POSTGRES_DB: inchronicle_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U inchronicle -d inchronicle_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

This is identical to `backend/docker-compose.yml` but lives at root so `npm run dev:infra` works from project root. The old `backend/docker-compose.yml` should be deleted in Step 4 to avoid confusion about which one to use.

- [ ] **Step 2: Verify it starts**

Run: `docker compose up -d && docker compose ps`
Expected: postgres container running, healthy

- [ ] **Step 3: Verify backend can connect**

Run: `cd backend && npx prisma db pull --print 2>&1 | head -5`
Expected: Prints schema (confirms connection to localhost:5434)

- [ ] **Step 4: Remove old backend docker-compose and commit**

```bash
git rm backend/docker-compose.yml
git add docker-compose.yml
git commit -m "chore: move docker-compose to root for single-command dev infra"
```

---

### Task 0.2: Fix Port Conflicts + manage-services.sh

**Files:**
- Modify: `vite.config.ts:15` — change `strictPort: true` to `strictPort: false`
- Modify: `backend/package.json:18` — change Prisma Studio to port 5556
- Modify: `manage-services.sh:38,43` — fix frontend port reference

- [ ] **Step 1: Fix Vite strictPort**

In `vite.config.ts`, change line 15:
```
Old: strictPort: true, // Don't try other ports if 5555 is busy
New: strictPort: false,
```

- [ ] **Step 2: Fix Prisma Studio port**

In `backend/package.json`, change `db:studio` script:
```
Old: "db:studio": "prisma studio"
New: "db:studio": "prisma studio --port 5556"
```

- [ ] **Step 3: Fix manage-services.sh port references**

In `manage-services.sh`, update `get_service_port()`:
```bash
# Line 38: Change frontend port
Old: "frontend") echo "5173" ;;
New: "frontend") echo "5555" ;;

# Line 43: Change prisma-studio port
Old: "prisma-studio") echo "5555" ;;
New: "prisma-studio") echo "5556" ;;
```

Also update the help text at line 258:
```
Old: echo "  prisma-studio       Prisma database browser (port 5555)"
New: echo "  prisma-studio       Prisma database browser (port 5556)"
```

And line 256:
```
Old: echo "  frontend            React/Vite frontend (port 5173)"
New: echo "  frontend            React/Vite frontend (port 5555)"
```

- [ ] **Step 4: Verify no port conflict**

Run: `cd backend && npx prisma studio --port 5556 &` then in another check: `lsof -i :5556 | head -3`
Expected: Prisma Studio running on 5556, not conflicting with Vite's 5555.
Kill it after: `kill %1`

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts backend/package.json manage-services.sh
git commit -m "fix: resolve port 5555 conflict between Vite and Prisma Studio"
```

---

### Task 0.3: Add `dev:all` Script with concurrently

**Files:**
- Modify: `package.json` (root) — add dev scripts + concurrently dep

- [ ] **Step 1: Install concurrently**

Run: `npm install -D concurrently`

- [ ] **Step 2: Add dev scripts to root package.json**

Add these scripts to the `"scripts"` section in `package.json`:

```json
"dev:all": "docker compose up -d && concurrently -k -n fe,be -c blue,green \"npm run dev\" \"cd backend && npm run dev\"",
"dev:infra": "docker compose up -d",
"dev:stop": "docker compose down && npx concurrently -k \"\" 2>/dev/null; pkill -f 'vite|tsx.watch' 2>/dev/null || true",
"dev:reset": "docker compose down -v && docker compose up -d && sleep 3 && cd backend && npx prisma migrate reset --force && npm run db:seed-complete"
```

- [ ] **Step 3: Verify dev:infra**

Run: `npm run dev:infra`
Expected: Docker postgres starts (or confirms already running)

- [ ] **Step 4: Verify dev:all**

Run: `npm run dev:all`
Expected: See colored output — `[fe]` blue (Vite on 5555), `[be]` green (Express on 3002). Both start successfully. Ctrl+C kills both.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add dev:all single-command startup with concurrently"
```

---

### Task 0.4: Extract BASE_URL in server.mjs

**Files:**
- Modify: `server.mjs:41,82` — replace hardcoded `https://inchronicle.com`

- [ ] **Step 1: Add BASE_URL env var**

In `server.mjs`, add after line 13 (`const DIST = ...`):

```javascript
const BASE_URL = process.env.BASE_URL || 'https://inchronicle.com';
```

- [ ] **Step 2: Replace hardcoded URLs**

Line 41 — change:
```javascript
Old: const ogUrl = esc(`https://inchronicle.com/p/${req.params.shortCode}`);
New: const ogUrl = esc(`${BASE_URL}/p/${req.params.shortCode}`);
```

Line 82 — change:
```javascript
Old: const ogUrl = esc(`https://inchronicle.com/${user.profileUrl}`);
New: const ogUrl = esc(`${BASE_URL}/${user.profileUrl}`);
```

- [ ] **Step 3: Verify locally (partial — confirms server starts and uses BASE_URL)**

Note: Full OG tag verification requires a running backend with `VITE_API_URL` set (the server fetches story data to build OG tags). This step only confirms the server starts and the BASE_URL env var is read correctly. Full OG testing happens in Phase 2 with the parallel environment.

Run: `npm run build && BASE_URL=http://localhost:4173 node server.mjs &`
Then: `curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/`
Expected: `200` (SPA loads)
Kill: `kill %1`

- [ ] **Step 4: Commit**

```bash
git add server.mjs
git commit -m "fix: extract BASE_URL env var from hardcoded inchronicle.com in server.mjs"
```

---

### Task 0.5: Create .env.local.example

**Files:**
- Create: `backend/.env.local.example`

- [ ] **Step 1: Create minimal local env template**

```env
# InChronicle Backend — Local Development
# Copy to .env: cp .env.local.example .env

NODE_ENV=development
PORT=3002

# Database (matches root docker-compose.yml)
DATABASE_URL=postgresql://inchronicle:inchronicle_dev@localhost:5434/inchronicle_dev

# JWT (safe for local dev only — never use these in production)
JWT_SECRET=local-dev-jwt-secret-min-32-characters!!
JWT_REFRESH_SECRET=local-dev-refresh-secret-min-32-chars!!

# CORS
FRONTEND_URL=http://localhost:5555
CORS_ORIGINS=http://localhost:5555,http://localhost:5173

# File uploads (local filesystem)
UPLOAD_DIR=./uploads
UPLOAD_VOLUME_PATH=./uploads
MAX_FILE_SIZE=10485760

# Encryption key for OAuth tokens (32 chars, safe for local dev only)
ENCRYPTION_KEY=local-dev-encryption-key-32chars!!

# LLM — add your key to use AI features
ANTHROPIC_API_KEY=

# MCP — set to true + add OAuth credentials to test integrations
ENABLE_MCP=false
```

- [ ] **Step 2: Commit**

```bash
git add backend/.env.local.example
git commit -m "docs: add minimal .env.local.example for quick local setup"
```

---

## Phase 1: Storage Abstraction

> **Dependency:** Phase 0 complete (DX fixes shipped).
> **Goal:** Abstract file storage behind an interface so switching from filesystem to R2 is a config change, not a code change.
> **Approach:** Keep filesystem as the local dev default. R2 implementation exists but is only activated via env var in production.

---

### Task 1.1: Storage Interface + Local Implementation

**Files:**
- Create: `backend/src/services/storage/storage.interface.ts`
- Create: `backend/src/services/storage/local-storage.service.ts`
- Create: `backend/src/services/storage/__tests__/local-storage.test.ts`

- [ ] **Step 1: Write failing test for local storage**

Create `backend/src/services/storage/__tests__/local-storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LocalStorageService } from '../local-storage.service';

describe('LocalStorageService', () => {
  const testDir = path.join(__dirname, '__test_uploads__');
  let storage: LocalStorageService;

  beforeEach(() => {
    storage = new LocalStorageService(testDir);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('uploads a file and returns a relative URL', async () => {
    const buffer = Buffer.from('test content');
    const url = await storage.upload('avatars/test-file.png', buffer);
    expect(url).toBe('/uploads/avatars/test-file.png');
    const filePath = path.join(testDir, 'avatars', 'test-file.png');
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('test content');
  });

  it('creates subdirectories automatically', async () => {
    const buffer = Buffer.from('nested');
    await storage.upload('deep/nested/dir/file.txt', buffer);
    expect(fs.existsSync(path.join(testDir, 'deep/nested/dir/file.txt'))).toBe(true);
  });

  it('returns a public URL using getUrl', () => {
    const url = storage.getUrl('avatars/test.png');
    expect(url).toBe('/uploads/avatars/test.png');
  });

  it('deletes a file', async () => {
    const buffer = Buffer.from('to delete');
    await storage.upload('delete-me.txt', buffer);
    expect(fs.existsSync(path.join(testDir, 'delete-me.txt'))).toBe(true);
    await storage.delete('delete-me.txt');
    expect(fs.existsSync(path.join(testDir, 'delete-me.txt'))).toBe(false);
  });

  it('delete is a no-op for missing files', async () => {
    await expect(storage.delete('nonexistent.txt')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/storage/__tests__/local-storage.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create storage interface**

Create `backend/src/services/storage/storage.interface.ts`:

```typescript
export interface StorageService {
  /**
   * Upload a file. Returns the public URL for the stored file.
   * @param key - Storage key/path (e.g., 'avatars/avatar-123-1700000000.png')
   * @param buffer - File contents
   * @param contentType - MIME type (optional, used by cloud providers)
   */
  upload(key: string, buffer: Buffer, contentType?: string): Promise<string>;

  /**
   * Get the public URL for a stored file.
   * @param key - Storage key/path
   */
  getUrl(key: string): string;

  /**
   * Delete a stored file. No-op if file doesn't exist.
   * @param key - Storage key/path
   */
  delete(key: string): Promise<void>;
}
```

- [ ] **Step 4: Create local storage implementation**

Create `backend/src/services/storage/local-storage.service.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { StorageService } from './storage.interface';

export class LocalStorageService implements StorageService {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.UPLOAD_VOLUME_PATH || process.env.UPLOAD_DIR || './uploads';
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${key}`;
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/services/storage/__tests__/local-storage.test.ts`
Expected: 5 tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/storage/
git commit -m "feat: add StorageService interface + LocalStorageService implementation"
```

---

### Task 1.2: R2 Storage Implementation

**Files:**
- Create: `backend/src/services/storage/r2-storage.service.ts`
- Create: `backend/src/services/storage/__tests__/r2-storage.test.ts`

- [ ] **Step 1: Install S3 SDK**

Run: `cd backend && npm install @aws-sdk/client-s3`

- [ ] **Step 2: Write failing test for R2 storage (mocked S3 client)**

Create `backend/src/services/storage/__tests__/r2-storage.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { R2StorageService } from '../r2-storage.service';

// Mock the S3 client
vi.mock('@aws-sdk/client-s3', () => {
  const send = vi.fn().mockResolvedValue({});
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: vi.fn().mockImplementation((params) => ({ ...params, _type: 'put' })),
    DeleteObjectCommand: vi.fn().mockImplementation((params) => ({ ...params, _type: 'delete' })),
  };
});

describe('R2StorageService', () => {
  let storage: R2StorageService;

  beforeEach(() => {
    storage = new R2StorageService({
      accountId: 'test-account',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      bucket: 'test-bucket',
      publicUrl: 'https://cdn.inchronicle.com',
    });
  });

  it('upload returns the public URL', async () => {
    const url = await storage.upload('avatars/test.png', Buffer.from('test'), 'image/png');
    expect(url).toBe('https://cdn.inchronicle.com/avatars/test.png');
  });

  it('getUrl returns the public URL', () => {
    expect(storage.getUrl('avatars/test.png')).toBe('https://cdn.inchronicle.com/avatars/test.png');
  });

  it('delete sends DeleteObjectCommand', async () => {
    await expect(storage.delete('avatars/test.png')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/storage/__tests__/r2-storage.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Create R2 storage implementation**

Create `backend/src/services/storage/r2-storage.service.ts`:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from './storage.interface';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string; // e.g., 'https://cdn.inchronicle.com' or R2 public bucket URL
}

export class R2StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: R2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl.replace(/\/$/, '');
  }

  async upload(key: string, buffer: Buffer, contentType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return this.getUrl(key);
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/services/storage/__tests__/r2-storage.test.ts`
Expected: 3 tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/storage/r2-storage.service.ts backend/src/services/storage/__tests__/r2-storage.test.ts backend/package.json backend/package-lock.json
git commit -m "feat: add R2StorageService implementation with S3 SDK"
```

---

### Task 1.3: Storage Factory + Index

**Files:**
- Create: `backend/src/services/storage/index.ts`
- Create: `backend/src/services/storage/__tests__/factory.test.ts`

- [ ] **Step 1: Write failing test for factory**

Create `backend/src/services/storage/__tests__/factory.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('createStorageService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns LocalStorageService when STORAGE_PROVIDER is not set', async () => {
    delete process.env.STORAGE_PROVIDER;
    const { createStorageService } = await import('../index');
    const service = createStorageService();
    expect(service.constructor.name).toBe('LocalStorageService');
  });

  it('returns LocalStorageService when STORAGE_PROVIDER is "local"', async () => {
    process.env.STORAGE_PROVIDER = 'local';
    const { createStorageService } = await import('../index');
    const service = createStorageService();
    expect(service.constructor.name).toBe('LocalStorageService');
  });

  it('returns R2StorageService when STORAGE_PROVIDER is "r2"', async () => {
    process.env.STORAGE_PROVIDER = 'r2';
    process.env.R2_ACCOUNT_ID = 'test';
    process.env.R2_ACCESS_KEY_ID = 'test';
    process.env.R2_SECRET_ACCESS_KEY = 'test';
    process.env.R2_BUCKET = 'test';
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
    const { createStorageService } = await import('../index');
    const service = createStorageService();
    expect(service.constructor.name).toBe('R2StorageService');
  });

  it('throws if STORAGE_PROVIDER is "r2" but config is missing', async () => {
    process.env.STORAGE_PROVIDER = 'r2';
    delete process.env.R2_ACCOUNT_ID;
    const { createStorageService } = await import('../index');
    expect(() => createStorageService()).toThrow('R2 storage requires');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/storage/__tests__/factory.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create factory**

Create `backend/src/services/storage/index.ts`:

```typescript
import { StorageService } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { R2StorageService } from './r2-storage.service';

export type { StorageService } from './storage.interface';

// IMPORTANT: Call lazily at request time (inside route handlers), NOT at module
// load or top-level scope. The singleton caches the first result forever — if env
// vars aren't set yet when called, the wrong implementation gets locked in.
let instance: StorageService | null = null;

export function createStorageService(): StorageService {
  if (instance) return instance;

  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 'r2') {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      throw new Error('R2 storage requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL');
    }

    instance = new R2StorageService({ accountId, accessKeyId, secretAccessKey, bucket, publicUrl });
    return instance;
  }

  instance = new LocalStorageService();
  return instance;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/services/storage/__tests__/factory.test.ts`
Expected: 4 tests pass

- [ ] **Step 5: Run all storage tests together**

Run: `cd backend && npx vitest run src/services/storage/`
Expected: 12 tests pass (5 local + 3 r2 + 4 factory)

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/storage/index.ts backend/src/services/storage/__tests__/factory.test.ts
git commit -m "feat: add storage factory — selects local or R2 based on STORAGE_PROVIDER env"
```

---

### Task 1.4: Wire Storage into Avatar Uploads

**Files:**
- Modify: `backend/src/controllers/user.controller.ts` — use StorageService for avatar upload + URL construction

**Context:** Currently `user.controller.ts` uses multer's `diskStorage` to write files directly, then constructs the URL with Azure-specific host detection (line 297: `host.includes('azurewebsites.net')`). We need to:
1. Keep multer for parsing the multipart upload (it gives us the buffer)
2. Use `StorageService.upload()` to store the file
3. Use the URL returned by `StorageService` instead of constructing it manually

- [ ] **Step 1: Switch multer to memory storage**

In `backend/src/controllers/user.controller.ts`, replace the multer `diskStorage` config (lines 23-45) with memory storage:

```typescript
import { createStorageService } from '../services/storage';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});
```

- [ ] **Step 2: Update handleAvatarUpload to use StorageService**

Replace the avatar URL construction block (lines ~280-310) with:

```typescript
export const handleAvatarUpload = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    return void sendError(res, 'User not authenticated', 401);
  }

  if (!req.file) {
    return void sendError(res, 'No file uploaded', 400);
  }

  try {
    const storage = createStorageService();
    const ext = path.extname(req.file.originalname);
    const key = `avatars/avatar-${userId}-${Date.now()}${ext}`;

    const avatarUrl = await storage.upload(key, req.file.buffer, req.file.mimetype);

    await userService.updateProfile(userId, { avatar: avatarUrl });

    sendSuccess(res, { avatarUrl }, 'Avatar uploaded successfully');
  } catch (error: any) {
    throw error;
  }
});
```

Note: The old cleanup logic (`fs.unlinkSync(req.file.path)`) is no longer needed since memory storage doesn't write to disk. If `storage.upload()` fails, nothing was persisted.

- [ ] **Step 3: Verify avatar upload still works locally**

Run the backend: `cd backend && npm run dev`
Test: Use the app UI or curl to upload an avatar. Verify it appears at `/uploads/avatars/...`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/user.controller.ts
git commit -m "refactor: use StorageService for avatar uploads, remove Azure host detection"
```

---

### Task 1.5: Wire Storage into Workspace File Uploads

**Files:**
- Modify: `backend/src/routes/workspace.routes.ts` — use StorageService for upload + delete

**Context:** Workspace file upload (line ~1583) and delete (line ~1633) in `workspace.routes.ts` use multer disk storage and `fs.unlinkSync`. Same pattern as avatars — switch to memory storage + StorageService.

- [ ] **Step 1: Switch workspace multer to memory storage**

In `backend/src/routes/workspace.routes.ts`, replace the multer config (lines 54-76):

```typescript
import { createStorageService } from '../services/storage';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});
```

- [ ] **Step 2: Update upload handler to use StorageService**

In the upload route handler (line ~1583), replace file URL construction:

```typescript
// Inside the POST /:workspaceId/files handler
const storage = createStorageService();
const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
const key = `workspace/${workspaceId}/${req.file.fieldname}-${uniqueSuffix}${path.extname(req.file.originalname)}`;

const fileUrl = await storage.upload(key, req.file.buffer, req.file.mimetype);

const file = await prisma.workspaceFile.create({
  data: {
    name: path.basename(key),
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
    url: fileUrl,
    uploadedById: userId,
    workspaceId,
    description,
    category,
  },
  // ... include remains the same
});
```

- [ ] **Step 3: Update delete handler to use StorageService**

In the DELETE handler (line ~1633), replace filesystem deletion:

```typescript
// Replace the filesystem delete block (lines 1674-1681)
const storage = createStorageService();

// Extract key from stored URL
// For local: '/uploads/workspace/xyz/file.txt' → 'workspace/xyz/file.txt'
// For R2: 'https://cdn.../workspace/xyz/file.txt' → 'workspace/xyz/file.txt'
const key = file.url.replace(/^\/uploads\//, '').replace(/^https?:\/\/[^/]+\//, '');
await storage.delete(key);
```

- [ ] **Step 4: Verify workspace file upload/delete still works locally**

Run backend, upload a file to a workspace, then delete it. Verify both operations succeed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/workspace.routes.ts
git commit -m "refactor: use StorageService for workspace file uploads and deletes"
```

---

### Task 1.6: Update Static File Serving

**Files:**
- Modify: `backend/src/app.ts` — conditionally serve `/uploads` only when using local storage

**Context:** When using R2, files are served from a CDN URL (e.g., `https://cdn.inchronicle.com/...`). The Express static middleware for `/uploads` is only needed for local storage.

- [ ] **Step 1: Wrap /uploads static serving in local-only guard**

In `backend/src/app.ts`, wrap the `/uploads` static middleware (lines ~200-234):

```typescript
// Only serve /uploads statically when using local storage
if (!process.env.STORAGE_PROVIDER || process.env.STORAGE_PROVIDER === 'local') {
  app.use('/uploads', (req, res, next) => {
    // ... existing CORS middleware stays the same
    next();
  }, express.static(process.env.UPLOAD_VOLUME_PATH || path.join(__dirname, '../uploads')));
}
```

- [ ] **Step 2: Verify /uploads still serves files locally**

Run backend, verify an existing avatar URL still loads.

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.ts
git commit -m "refactor: conditionally serve /uploads static files only for local storage"
```

---

## Phase 2: Migration Prep (Parallel Environments)

> **Dependency:** Phase 1 complete (storage abstraction deployed to Azure, verified working).
> **Goal:** Stand up Fly.io + Cloudflare Pages + Neon in parallel with Azure. Verify everything works before touching DNS.

---

### Task 2.0: Add Prisma `directUrl` for Neon Compatibility

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Context:** Neon uses PgBouncer for connection pooling. Prisma migrations need a direct (non-pooled) connection because PgBouncer doesn't support advisory locks or DDL. Adding `directUrl` is backward-compatible — if `DIRECT_DATABASE_URL` is not set, Prisma falls back to `DATABASE_URL`.

- [ ] **Step 1: Add directUrl to schema.prisma**

In `backend/prisma/schema.prisma`, update the datasource block:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

- [ ] **Step 2: Regenerate Prisma client**

Run: `cd backend && npx prisma generate`

- [ ] **Step 3: Verify existing setup still works (no DIRECT_DATABASE_URL set)**

Run: `cd backend && npm run dev` — backend should start and connect to local PG as before.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add Prisma directUrl for Neon PgBouncer compatibility"
```

---

### Task 2.1: Provision Neon Database + Migrate Data

**Files:** None (external service setup + data migration)

- [ ] **Step 1: Create Neon project (Launch plan, $19/mo)**

Go to https://console.neon.tech → Create project:
- Name: `inchronicle`
- Region: **US East (Ohio)** (`us-east-2`) — closest to Fly.io `iad` (Virginia), ~10-15ms latency
- PostgreSQL version: 15
- Plan: **Launch ($19/mo)** — 10 GiB storage, 300 compute hours, configurable autosuspend

Note BOTH connection strings from the dashboard:
- **Pooled** (has `-pooler` in hostname): `postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/inchronicle?sslmode=require`
- **Direct** (no `-pooler`): `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require`

- [ ] **Step 2: Check Azure DB size + extensions**

```bash
psql "$AZURE_DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('inchronicle'));"
psql "$AZURE_DATABASE_URL" -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"
```

Expected: No custom extensions (confirmed by codebase search). Size should be well under 10 GiB.

- [ ] **Step 3: Run Prisma migrations against Neon (use DIRECT connection)**

```bash
cd backend
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
  npx prisma migrate deploy
```

Expected: All migrations apply successfully. Prisma uses `directUrl` for migrations automatically.

- [ ] **Step 4: Export data from Azure PostgreSQL**

```bash
pg_dump "postgresql://psadmin:PASSWORD@ps-postgres-server.postgres.database.azure.com:5432/inchronicle?sslmode=require" \
  --no-owner --no-acl -Fc \
  -f backup.dump
```

Using `-Fc` (custom format) for selective restore. Check size: `ls -lh backup.dump`

- [ ] **Step 5: Import data into Neon (use DIRECT connection)**

```bash
pg_restore --data-only --no-owner --no-acl \
  -d "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
  backup.dump
```

Sequences auto-reset correctly via `setval()` calls in the dump.

- [ ] **Step 6: Verify row counts match**

```bash
psql "$NEON_DIRECT_URL" -c "
  SELECT 'users' as tbl, count(*) FROM users UNION ALL
  SELECT 'career_stories', count(*) FROM career_stories UNION ALL
  SELECT 'journal_entries', count(*) FROM journal_entries UNION ALL
  SELECT 'workspace_members', count(*) FROM workspace_members;"
```

Compare with same query on Azure.

- [ ] **Step 7: Note — encrypted OAuth tokens**

All OAuth tokens in the `mcp_connections` table are encrypted with `ENCRYPTION_KEY`. As long as the same `ENCRYPTION_KEY` is used in the Fly.io environment, tokens will decrypt correctly. **Do not change or lose this key.**

---

### Task 2.2: Deploy Backend to Fly.io

**Files:**
- Create: `backend/fly.toml` (lives in backend dir, not root)

- [ ] **Step 1: Install Fly CLI**

Run: `brew install flyctl` (or `curl -L https://fly.io/install.sh | sh`)

- [ ] **Step 2: Create Fly app**

```bash
cd backend
fly launch --no-deploy --name inchronicle-api --region iad
```

Edit the generated `backend/fly.toml`:

```toml
app = 'inchronicle-api'
primary_region = 'iad'

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3002"
  STORAGE_PROVIDER = "r2"

[http_service]
  internal_port = 3002
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "connections"
    hard_limit = 250
    soft_limit = 200

  [[http_service.checks]]
    interval = "15s"
    timeout = "5s"
    grace_period = "30s"
    method = "GET"
    path = "/health"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

Key: 512MB memory (Node+Prisma+tsx OOMs on 256MB). Cost: ~$3-5/mo.

- [ ] **Step 3: Set secrets**

```bash
fly secrets set \
  DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/inchronicle?sslmode=require&connection_limit=10" \
  DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/inchronicle?sslmode=require" \
  JWT_SECRET="..." \
  JWT_REFRESH_SECRET="..." \
  ENCRYPTION_KEY="..." \
  ANTHROPIC_API_KEY="..." \
  OPENAI_API_KEY="..." \
  FRONTEND_URL="https://inchronicle.com" \
  CORS_ORIGINS="https://inchronicle.com,https://www.inchronicle.com" \
  BACKEND_URL="https://inchronicle-api.fly.dev" \
  R2_ACCOUNT_ID="..." \
  R2_ACCESS_KEY_ID="..." \
  R2_SECRET_ACCESS_KEY="..." \
  R2_BUCKET="inchronicle-uploads" \
  R2_PUBLIC_URL="https://uploads.inchronicle.com" \
  RAZORPAY_KEY_ID="..." \
  RAZORPAY_KEY_SECRET="..." \
  RAZORPAY_WEBHOOK_SECRET="..." \
  -a inchronicle-api
```

Note: Each `fly secrets set` restarts machines. Use `fly secrets import` for bulk: `cat .env.production | fly secrets import -a inchronicle-api`

- [ ] **Step 4: Deploy (remote build — no local Docker needed)**

```bash
cd backend
fly deploy --remote-only
```

Expected: Image builds remotely, deploys with rolling restart, health check passes.

- [ ] **Step 5: Verify health endpoint**

Run: `curl https://inchronicle-backend.fly.dev/health`
Expected: `{"status":"ok"}`

- [ ] **Step 6: Test API from local frontend**

Run locally: `VITE_API_URL=https://inchronicle-backend.fly.dev/api/v1 npm run dev`
Log in, verify data loads from Neon via Fly.io backend.

- [ ] **Step 7: Commit fly.toml**

```bash
git add fly.toml
git commit -m "chore: add fly.toml for Fly.io backend deployment"
```

---

### Task 2.3: Create Cloudflare R2 Bucket

**Files:** None (external service setup)

- [ ] **Step 1: Create R2 bucket**

In Cloudflare dashboard → R2 → Create bucket: `inchronicle-uploads`

- [ ] **Step 2: Create R2 API token**

R2 → Manage R2 API Tokens → Create token with Object Read & Write on `inchronicle-uploads`.
Note: Account ID, Access Key ID, Secret Access Key.

- [ ] **Step 3: Enable public access (or set up custom domain)**

Option A: Enable R2 public bucket access → get URL like `pub-xxx.r2.dev`
Option B: Custom domain → add CNAME `uploads.inchronicle.com` → R2 bucket (preferred)

- [ ] **Step 4: Test upload from Fly.io backend**

Upload an avatar via the Fly.io-hosted backend. Verify the file appears in R2 and the returned URL works.

---

### Task 2.4: Rewrite server.mjs as Cloudflare Pages Functions

**Files:**
- Create: `functions/p/[shortCode].ts` — pragma link OG tags
- Create: `functions/[slug].ts` — chronicle profile OG tags
- Create: `public/_routes.json` — exclude static assets from Functions

**Context:** Pages Functions use file-based routing (not Express). Use `HTMLRewriter` (streaming HTML parser built into Workers) instead of string `.replace()`. The Workers runtime is NOT Node.js — no `fs`, no `process.env`, no `express`.

- [ ] **Step 1: Create `_routes.json` to protect Function quota**

Create `public/_routes.json` (Vite copies `public/` contents into `dist/`):

```json
{
  "version": 1,
  "include": ["/p/*", "/*"],
  "exclude": [
    "/assets/*", "/favicon.ico", "/robots.txt", "/manifest.json",
    "/*.js", "/*.css", "/*.svg", "/*.png", "/*.jpg", "/*.ico"
  ]
}
```

Without this, every static asset request (JS, CSS, images) burns your free 100k/day Function quota.

- [ ] **Step 2: Create pragma link Function**

Create `functions/p/[shortCode].ts`:

```typescript
interface Env {
  ASSETS: Fetcher;
  API_ORIGIN: string; // Bare origin: 'https://api.inchronicle.com' — NO /api/v1 suffix
  BASE_URL: string;
}

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, env, request } = context;
  const shortCode = params.shortCode as string;

  if (!/^[a-hjkmnp-z2-9]{8}$/.test(shortCode)) {
    return env.ASSETS.fetch(request);
  }

  try {
    const apiRes = await fetch(`${env.API_ORIGIN}/api/v1/pragma/resolve/${shortCode}`);
    if (!apiRes.ok) return env.ASSETS.fetch(request);

    const body = await apiRes.json() as any;
    if (!body.success || !body.data) return env.ASSETS.fetch(request);

    const { content, author } = body.data;
    const firstSection = Object.values(content.sections || {})[0] as any;
    const desc = (firstSection?.summary || '').slice(0, 160);
    const baseUrl = env.BASE_URL || 'https://inchronicle.com';

    const ogTags = `
      <title>${esc(content.title)} | inchronicle</title>
      <meta property="og:title" content="${esc(`${content.title} — ${author.name}`)}" />
      <meta property="og:description" content="${esc(desc)}" />
      <meta property="og:url" content="${esc(`${baseUrl}/p/${shortCode}`)}" />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary" />
      <meta name="robots" content="noindex, nofollow">`;

    const assetRes = await env.ASSETS.fetch(new Request(new URL('/', request.url)));

    return new HTMLRewriter()
      .on('head', { element(el) { el.append(ogTags, { html: true }); } })
      .transform(new Response(assetRes.body, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=300',
          'Referrer-Policy': 'no-referrer',
        },
      }));
  } catch {
    return env.ASSETS.fetch(request);
  }
};
```

- [ ] **Step 3: Create chronicle profile Function**

Create `functions/[slug].ts` — same pattern but fetching from `/api/v1/users/chronicle/${slug}` and injecting profile OG tags + `window.__CHRONICLE_DATA__` script. Guard with slug regex: `/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/`

- [ ] **Step 4: Add wrangler for local Function testing**

```bash
npm install -D wrangler @cloudflare/workers-types
```

Test locally: `npm run build && npx wrangler pages dev dist`

- [ ] **Step 5: Commit**

```bash
git add functions/ public/_routes.json
git commit -m "feat: add Cloudflare Pages Functions for OG tag SSR (replaces server.mjs)"
```

---

### Task 2.5: Connect Cloudflare Pages to Repo

**Files:** None (Cloudflare dashboard setup)

- [ ] **Step 1: Create Pages project**

Cloudflare dashboard → Pages → Connect to Git → Select `beinglayman/ProfessionalSide` → main branch.

Build settings:
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `VITE_API_URL=https://inchronicle-backend.fly.dev/api/v1`, `NODE_VERSION=18`

- [ ] **Step 2: Add Pages environment variables**

In Pages settings → Environment variables:
- `API_ORIGIN` = `https://inchronicle-backend.fly.dev` (bare origin — Pages Function appends `/api/v1/...` paths)
- `BASE_URL` = `https://inchronicle.com`

- [ ] **Step 3: Trigger test deploy**

Push any change or trigger manual deploy. Verify:
- Static assets load on `*.pages.dev` preview URL
- OG tags work: `curl -s https://xxx.pages.dev/p/TESTCODE | grep og:url`
- SPA routing works: navigate to `/dashboard`, page loads

- [ ] **Step 4: Verify PR preview deploys**

Create a test branch, push it. Confirm Cloudflare Pages creates a preview URL automatically.

---

### Task 2.6: Clean Up Hardcoded Azure References

**Files:**
- Modify: `backend/src/app.ts` — clean CORS lists
- Modify: `backend/src/controllers/user.controller.ts` — remove Azure host detection
- Modify: `src/lib/api.ts` — remove Azure fallback URL
- Modify: `src/services/profile-api.service.ts` — remove Azure HTTP→HTTPS check
- Modify: `src/utils/avatar.ts` — remove Azure HTTP→HTTPS check
- Modify: `vite.config.ts` — remove `.azurewebsites.net` from allowed hosts

- [ ] **Step 1: Clean CORS in backend/src/app.ts**

Replace the three hardcoded CORS origin lists (lines ~91-100, ~203-209, ~239-244) with env-driven config:

Main CORS (lines 91-100):
```typescript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5555',
].filter(Boolean) as string[];

// Parse CORS_ORIGINS for additional allowed origins
if (process.env.CORS_ORIGINS) {
  allowedOrigins.push(...process.env.CORS_ORIGINS.split(',').map(s => s.trim()));
}
```

Remove the `azurewebsites.net` regex and all `ps-frontend-1758551070.azurewebsites.net` references.

Apply the same cleanup to the `/uploads` and `/screenshots` CORS blocks — replace hardcoded Azure origins with the same pattern using `process.env.FRONTEND_URL` and `process.env.CORS_ORIGINS`.

- [ ] **Step 2: Remove Azure host detection in avatar URL**

In `backend/src/controllers/user.controller.ts`, the old `handleAvatarUpload` with Azure host detection was already replaced in Task 1.4. Verify the old code is gone — search for `azurewebsites.net` in the file, confirm zero matches.

- [x] **Step 3: Clean frontend API fallback** — PARTIALLY DONE (incident 2026-03-28)

`src/lib/api.ts` — Azure URL removed from inline ternary, extracted to `AZURE_BACKEND_URL` constant. However, `api.inchronicle.com` exclusion was temporarily RESTORED after production incident (GitHub secret `VITE_API_URL` = `https://api.inchronicle.com` without `/api/v1` suffix caused all API calls to 404).

**Remaining cleanup deferred to Phase 3 Task 3.1 Step 5** — fix the secret, remove the exclusion, switch to positive validation.

- [ ] **Step 4: Remove Azure checks in frontend utils**

In `src/services/profile-api.service.ts` line 36, remove:
```typescript
// Remove this Azure-specific check
if (avatarUrl.includes('azurewebsites.net')) {
  avatarUrl = avatarUrl.replace('http://', 'https://');
}
```

In `src/utils/avatar.ts` line 43, remove:
```typescript
// Remove this Azure-specific check
if (normalized.includes('azurewebsites.net')) {
  normalized = normalized.replace('http://', 'https://');
}
```

Both are unnecessary — Fly.io and R2 enforce HTTPS at the infrastructure level.

- [ ] **Step 5: Remove Azure from vite.config.ts allowed hosts**

In `vite.config.ts` line 29:
```typescript
Old: allowedHosts: ['localhost', '.azurewebsites.net', 'inchronicle.com', '.inchronicle.com'],
New: allowedHosts: ['localhost', 'inchronicle.com', '.inchronicle.com'],
```

- [ ] **Step 6: Verify no Azure references remain in app code**

Run: `grep -r "azurewebsites" backend/src/ src/ --include="*.ts" --include="*.tsx" --include="*.mjs"`
Expected: Zero results (infra scripts and docs may still have references, that's fine).

- [ ] **Step 7: Commit**

```bash
git add backend/src/app.ts src/lib/api.ts src/services/profile-api.service.ts src/utils/avatar.ts vite.config.ts
git commit -m "refactor: remove hardcoded Azure URLs, use env-driven CORS and API config"
```

---

### Task 2.7: Update OAuth Redirect URIs

**Files:** None (external provider dashboards)

**Context:** OAuth redirect URIs are constructed from `BACKEND_URL` env var (see `oauth-provider-contract.ts`). Active providers: GitHub, Atlassian, Google, Microsoft. Figma/Slack/Zoom likely not configured — check prod env vars and skip if not set.

**Execution order matters — Microsoft needs 24hrs to propagate.**

- [ ] **Step 1: Microsoft (24hrs before cutover) — 5 URIs**

Portal: `portal.azure.com` → App registrations → InChronicle MCP → Authentication → Add URI

Add all 5 alongside existing Azure URIs (supports 256 max):
```
https://api.inchronicle.com/api/v1/mcp/callback/outlook
https://api.inchronicle.com/api/v1/mcp/callback/teams
https://api.inchronicle.com/api/v1/mcp/callback/onedrive
https://api.inchronicle.com/api/v1/mcp/callback/onenote
https://api.inchronicle.com/api/v1/mcp/callback/microsoft
```

Strict exact-match, case-sensitive, HTTPS required. Propagation: up to 24hrs.

- [ ] **Step 2: Google (24hrs before cutover) — 1 URI**

Console: `console.cloud.google.com` → APIs & Services → Credentials → OAuth client → Authorized redirect URIs → ADD URI

```
https://api.inchronicle.com/api/v1/mcp/callback/google_workspace
```

Propagation: 5min to a few hours. Exact match required.

- [ ] **Step 3: Atlassian (same day) — 3 URIs**

Dashboard: `developer.atlassian.com` → My Apps → Authorization → OAuth 2.0 (3LO) → Add callback URLs

```
https://api.inchronicle.com/api/v1/mcp/callback/jira
https://api.inchronicle.com/api/v1/mcp/callback/confluence
https://api.inchronicle.com/api/v1/mcp/callback/atlassian
```

Instant propagation. Supports multiple URIs.

- [ ] **Step 4: GitHub (at cutover) — DUAL APP STRATEGY**

**GitHub OAuth Apps support only ONE callback URL.** Create a second app:

1. `github.com` → Settings → Developer settings → OAuth Apps → New OAuth App
2. Name: "InChronicle (Production)"
3. Callback URL: `https://api.inchronicle.com/api/v1/mcp/callback/github`
4. Note the new Client ID and Client Secret
5. Update Fly.io secrets with new credentials:
   ```bash
   fly secrets set GITHUB_CLIENT_ID="new-id" GITHUB_CLIENT_SECRET="new-secret" -a inchronicle-api
   ```
6. Keep old app alive for Azure rollback. Delete after 2 weeks.

- [ ] **Step 5: Razorpay webhook URL (at cutover)**

Dashboard: Razorpay Dashboard → Settings → Webhooks → Edit

Update webhook URL from Azure backend to:
```
https://api.inchronicle.com/api/v1/billing/webhook
```

Keep the same `RAZORPAY_WEBHOOK_SECRET` — signature verification uses the secret, not the URL.

- [ ] **Step 6: Test OAuth flows**

From local frontend pointed at Fly.io: `VITE_API_URL=https://inchronicle-api.fly.dev/api/v1 npm run dev`

Test: Login → Integrations → Connect GitHub → Verify redirect completes → Activities sync.
Then test Microsoft (strictest validation).

---

### Task 2.8: Create Fly.io Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy-fly.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/deploy-fly.yml`:

```yaml
name: Deploy Backend (Fly.io)

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'backend/fly.toml'
      - '.github/workflows/deploy-fly.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        working-directory: backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Verify deployment
        run: |
          sleep 10
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://inchronicle-api.fly.dev/health)
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed with status $STATUS"
            exit 1
          fi
          echo "Health check passed"
```

- [ ] **Step 2: Add FLY_API_TOKEN to GitHub Secrets**

Generate: `fly tokens create deploy -x 999999h -a inchronicle-api`
Add to GitHub → Settings → Secrets → `FLY_API_TOKEN`

- [ ] **Step 3: Test workflow**

Push a trivial backend change to main. Verify the workflow runs and deploys successfully.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-fly.yml
git commit -m "ci: add Fly.io backend deploy workflow"
```

---

## Phase 3: Cutover

> **Dependency:** Phase 2 complete. Both environments running in parallel. OAuth tested.
> **Goal:** Point DNS to new infrastructure. Keep Azure alive for 2-week rollback window.
> **Timing:** Nameserver migration 1 week before traffic cutover. Traffic cutover on a weekend.

---

### Task 3.0: Migrate Nameservers to Cloudflare (1 WEEK before cutover)

**Files:** None (registrar + Cloudflare dashboard)

**Context:** DNS is currently on Spaceship registrar (`launch1.spaceship.net`). We move nameservers to Cloudflare first, keep all records pointing to Azure, verify email + site work through Cloudflare proxy. This separates the risky NS change from the traffic cutover.

- [ ] **Step 1: Add site to Cloudflare**

`dash.cloudflare.com` → Add a site → `inchronicle.com` → Free plan → Cloudflare scans existing records.

- [ ] **Step 2: Verify ALL imported records match this baseline**

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | @ | `20.119.0.51` | Proxied |
| CNAME | www | `ps-frontend-1758551070.azurewebsites.net` | Proxied |
| MX | @ | `0 inchronicle-com.mail.protection.outlook.com` | N/A |
| TXT | @ | `v=spf1 include:spf.protection.outlook.com -all` | N/A |
| TXT | @ | `MS=ms35993909` | N/A |
| TXT | @ | `google-site-verification=3za1lTumkEnO9oXLPuPdqM4v1loEemGXPpA0jdJErWA` | N/A |
| TXT | _dmarc | `v=DMARC1; p=reject; rua=mailto:dmarc@inchronicle.com` | N/A |

**Critical:** If any TXT records are missing or split incorrectly, add them manually before proceeding.

- [ ] **Step 3: Change nameservers at Spaceship registrar**

Replace existing NS with Cloudflare's assigned pair (e.g., `ada.ns.cloudflare.com`, `ben.ns.cloudflare.com`).

Propagation: 2-24 hours (90% within 4-6 hours).

- [ ] **Step 4: Verify site + email after propagation**

```bash
dig inchronicle.com NS +short          # should show cloudflare nameservers
dig inchronicle.com A +short           # should still show 20.119.0.51
dig inchronicle.com MX +short          # should show outlook.com
curl -sI https://inchronicle.com       # should work, look for cf-ray header
```

Send a test email to an `@inchronicle.com` address to verify email delivery.

- [ ] **Step 5: Wait 3-5 days for stability**

Site should work identically through Cloudflare proxy → Azure. No user-visible change.

---

### Task 3.1: DNS Cutover (Traffic Switch)

**Files:** None (DNS configuration)

- [ ] **Step 0: Final data sync + upload migration (do immediately before cutover)**

Re-run the data export/import to capture any data written since Task 2.1:

```bash
# 1. Put Azure app into maintenance mode (optional — or just accept a few minutes of data loss)
# 2. Fresh pg_dump from Azure → pg_restore into Neon (same as Task 2.1 Steps 3-5)
# 3. Copy existing uploads from Azure Files to R2:
#    - Download from Azure: az storage file download-batch -d ./azure-uploads -s uploads --account-name psstorage1758551070
#    - Upload to R2: aws s3 sync ./azure-uploads s3://inchronicle-uploads --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
# 4. Update avatar URLs in Neon database:
psql "$NEON_DATABASE_URL" -c "
  UPDATE user_profiles
  SET avatar = REPLACE(avatar, 'https://ps-backend-1758551070.azurewebsites.net/uploads/', 'https://uploads.inchronicle.com/')
  WHERE avatar LIKE '%azurewebsites.net%';
"
# 5. Same for workspace_files:
psql "$NEON_DATABASE_URL" -c "
  UPDATE workspace_files
  SET url = REPLACE(url, '/uploads/', 'https://uploads.inchronicle.com/')
  WHERE url LIKE '/uploads/%';
"
```

- [ ] **Step 1: Move DNS to Cloudflare (if not already)**

Nameservers should already be on Cloudflare (done in Task 3.0). If not, do Task 3.0 first and wait a week.

- [ ] **Step 1b: Lower TTL on `api` CNAME to 60s (if creating it now)**

This only matters for DNS-only (grey cloud) records. Proxied records switch instantly.

- [ ] **Step 2: Point frontend to Cloudflare Pages**

Pages dashboard → Custom domains → `inchronicle.com` and `www.inchronicle.com`.
Cloudflare auto-creates CNAME records (flattened at apex). SSL is instant via Universal SSL.

Set up www → non-www redirect: Dashboard → Rules → Redirect Rules:
- When: Hostname equals `www.inchronicle.com`
- Then: Dynamic redirect → `concat("https://inchronicle.com", http.request.uri.path)` → 301

- [ ] **Step 3: Set up backend DNS**

In Cloudflare DNS, add:

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | api | `inchronicle-api.fly.dev` | DNS only (grey cloud) |

Start with DNS-only so Fly.io handles TLS via Let's Encrypt directly. Simpler.

```bash
fly certs add api.inchronicle.com -a inchronicle-api
fly secrets set BACKEND_URL="https://api.inchronicle.com" -a inchronicle-api
```

- [ ] **Step 4: Set up R2 custom domain**

R2 dashboard → bucket → Settings → Custom Domains → `uploads.inchronicle.com`.
Cloudflare auto-creates the CNAME record (proxied).

```bash
fly secrets set R2_PUBLIC_URL="https://uploads.inchronicle.com" -a inchronicle-api
```

- [ ] **Step 5: Fix GitHub secret + update Cloudflare Pages env vars + clean up api.ts guard**

**CRITICAL (incident 2026-03-28):** `secrets.VITE_API_URL` is currently `https://api.inchronicle.com` (MISSING `/api/v1` suffix). The code in `src/lib/api.ts` has a temporary exclusion that rejects this value. At cutover, THREE things must happen together:

1. **Fix GitHub secret:** Change `VITE_API_URL` to `https://api.inchronicle.com/api/v1` (add `/api/v1` suffix)
2. **Update Cloudflare Pages env vars:**
   - `VITE_API_URL` = `https://api.inchronicle.com/api/v1`
   - `API_ORIGIN` = `https://api.inchronicle.com` (bare origin for Pages Function)
   - `BASE_URL` = `https://inchronicle.com`
3. **Remove temporary guard in `src/lib/api.ts`:**
   - Remove `!envApiUrl.includes('api.inchronicle.com')` from `isValidUrl`
   - Remove `AZURE_BACKEND_URL` constant
   - Simplify to: `export const API_BASE_URL = isValidUrl ? envApiUrl : 'http://localhost:3002/api/v1';`
   - Replace negative-list validation with positive: `envApiUrl && envApiUrl.includes('/api/')`
   - Update regression test `src/lib/__tests__/api-base-url.test.ts` to expect `api.inchronicle.com` to PASS (not be rejected)

Trigger redeploy on both Cloudflare Pages and GitHub Actions (for Azure during rollback window).

- [ ] **Step 6: Update CORS and FRONTEND_URL on Fly.io**

```bash
fly secrets set \
  FRONTEND_URL="https://inchronicle.com" \
  CORS_ORIGINS="https://inchronicle.com,https://www.inchronicle.com" \
  -a inchronicle-api
```

- [ ] **Step 6b: Update Razorpay webhook URL**

Razorpay Dashboard → Settings → Webhooks → Edit webhook URL to:
`https://api.inchronicle.com/api/v1/billing/webhook`

- [ ] **Step 7: Smoke test everything**

Verify:
- [ ] Homepage loads at `https://inchronicle.com`
- [ ] Login works
- [ ] API calls succeed (check network tab)
- [ ] Avatar upload works (file goes to R2, URL from `uploads.inchronicle.com`)
- [ ] OG tags work: `curl -s https://inchronicle.com/p/VALIDCODE | grep og:`
- [ ] One OAuth flow works end-to-end (connect GitHub)

---

### Task 3.2: Disable Azure Deploys (Keep Infrastructure Running)

**Files:**
- Modify: `.github/workflows/deploy-frontend.yml` — disable trigger
- Modify: `.github/workflows/deploy-backend.yml` — disable trigger

- [ ] **Step 1: Disable Azure workflows**

Add to both workflow files at the top:

```yaml
# DEPRECATED: Migrated to Cloudflare Pages + Fly.io (2026-03-xx)
# Keeping for reference during 2-week rollback window
name: "[DISABLED] Deploy Frontend (Azure)"
on: workflow_dispatch  # Manual only, no auto-trigger
```

Remove the `push` trigger from both.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-frontend.yml .github/workflows/deploy-backend.yml
git commit -m "ci: disable Azure deploy workflows — migrated to Cloudflare + Fly.io"
```

---

### Task 3.3: Decommission Azure (After 2-Week Soak)

> **Do this 2 weeks after Task 3.1, only after confirming no issues.**

**Files:**
- Delete: `.github/workflows/deploy-frontend.yml`
- Delete: `.github/workflows/deploy-backend.yml`
- Delete: `verify-azure-deployment.sh`
- Keep (archive): `infra/azure-provision.sh` — useful as reference

- [ ] **Step 1: Verify no traffic hitting Azure**

Check Azure App Service metrics — confirm zero requests for at least 7 days.

- [ ] **Step 2: Remove old OAuth redirect URIs**

Remove Azure callback URLs from all 7 OAuth provider dashboards (GitHub, Atlassian, Google, Microsoft, Figma, Slack, Zoom).

- [ ] **Step 3: Delete Azure resources**

```bash
az group delete --name ps-prod-rg --yes --no-wait
```

This deletes: App Service Plan, both Web Apps, ACR, PostgreSQL Flexible Server, Storage Account.

- [ ] **Step 4: Clean up repo**

```bash
git rm .github/workflows/deploy-frontend.yml .github/workflows/deploy-backend.yml verify-azure-deployment.sh
git commit -m "chore: remove Azure deployment artifacts after successful migration"
```

- [ ] **Step 5: Remove Azure OpenAI references from backend**

Remove from `backend/.env.example`:
```
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_DEPLOYMENT=
```

Remove Azure OpenAI fallback from the model selector service (if still configured as a provider). Anthropic + OpenAI are sufficient.

- [ ] **Step 6: Update documentation**

Update `README.md` deploy instructions to reference Cloudflare Pages and Fly.io instead of Azure.
Update `backend/.env.example` to include R2 env vars and remove Azure-specific ones.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: complete Azure decommission — all infra now on Cloudflare + Fly.io + Neon"
```
