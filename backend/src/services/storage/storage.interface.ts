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
