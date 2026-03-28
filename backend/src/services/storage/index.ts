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

  if (provider !== 'local') {
    throw new Error(`Unknown STORAGE_PROVIDER: "${provider}". Valid values: "local", "r2"`);
  }

  instance = new LocalStorageService();
  return instance;
}
