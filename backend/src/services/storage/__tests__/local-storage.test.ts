import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
