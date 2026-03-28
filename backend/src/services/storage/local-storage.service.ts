import fs from 'fs';
import path from 'path';
import { StorageService } from './storage.interface';

export class LocalStorageService implements StorageService {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.UPLOAD_VOLUME_PATH || process.env.UPLOAD_DIR || './uploads';
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    const filePath = path.resolve(this.baseDir, key);
    if (!filePath.startsWith(path.resolve(this.baseDir))) {
      throw new Error('Invalid storage key: path traversal detected');
    }
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
    const filePath = path.resolve(this.baseDir, key);
    if (!filePath.startsWith(path.resolve(this.baseDir))) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
