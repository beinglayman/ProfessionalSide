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
