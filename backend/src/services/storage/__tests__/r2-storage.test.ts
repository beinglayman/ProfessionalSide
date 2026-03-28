import { describe, it, expect, vi, beforeEach } from 'vitest';
import { R2StorageService } from '../r2-storage.service';

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = vi.fn().mockResolvedValue({});
    },
    PutObjectCommand: class {
      constructor(public params: any) {}
    },
    DeleteObjectCommand: class {
      constructor(public params: any) {}
    },
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
