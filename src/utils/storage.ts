// Safe localStorage utility with quota handling and size limits
export class SafeStorage {
  private static readonly MAX_SIZE = 4 * 1024 * 1024; // 4MB limit
  private static readonly WARNING_SIZE = 3 * 1024 * 1024; // 3MB warning
  
  static setItem(key: string, value: string): boolean {
    try {
      // Check if the value is too large
      const size = new Blob([value]).size;
      
      if (size > this.MAX_SIZE) {
        console.error(`Storage quota exceeded: Item size (${this.formatBytes(size)}) exceeds maximum (${this.formatBytes(this.MAX_SIZE)})`);
        return false;
      }
      
      // Check current storage usage
      const currentUsage = this.getStorageUsage();
      
      if (size > this.WARNING_SIZE) {
        console.warn(`Large storage operation: Item size (${this.formatBytes(size)}), Current usage: ${this.formatBytes(currentUsage)}`);
      }
      
      // Try to set the item
      localStorage.setItem(key, value);
      
      // Verify it was set
      const retrievedValue = localStorage.getItem(key);
      if (retrievedValue !== value) {
        console.error('Storage verification failed: Retrieved value does not match');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Storage operation failed:', error);
      
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded. Attempting cleanup...');
        this.cleanup();
        
        // Try one more time after cleanup
        try {
          localStorage.setItem(key, value);
          console.log('Storage successful after cleanup');
          return true;
        } catch (retryError) {
          console.error('Storage failed even after cleanup:', retryError);
          return false;
        }
      }
      
      return false;
    }
  }
  
  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Storage retrieval failed:', error);
      return null;
    }
  }
  
  static removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage removal failed:', error);
      return false;
    }
  }
  
  static clear(): boolean {
    try {
      localStorage.clear();
      console.log('LocalStorage cleared successfully');
      return true;
    } catch (error) {
      console.error('Storage clear failed:', error);
      return false;
    }
  }
  
  static getStorageUsage(): number {
    let total = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key);
          if (value) {
            total += new Blob([key + value]).size;
          }
        }
      }
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
    }
    return total;
  }
  
  static getStorageInfo(): { usage: number, available: number, keys: string[] } {
    const usage = this.getStorageUsage();
    const keys = Object.keys(localStorage);
    
    return {
      usage,
      available: this.MAX_SIZE - usage,
      keys
    };
  }
  
  static cleanup(): void {
    console.log('Starting storage cleanup...');
    
    // Get all keys and their sizes
    const items: Array<{ key: string, size: number, data: string }> = [];
    
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            items.push({ key, size, data: value });
          }
        }
      }
      
      // Sort by size (largest first)
      items.sort((a, b) => b.size - a.size);
      
      console.log('Storage items before cleanup:', items.map(item => ({
        key: item.key,
        size: this.formatBytes(item.size)
      })));
      
      // Remove old onboarding data and debug logs
      const keysToRemove = items
        .filter(item => 
          item.key.includes('onboarding') ||
          item.key.includes('debug') ||
          item.key.includes('log') ||
          item.size > 100 * 1024 // Remove items larger than 100KB
        )
        .map(item => item.key);
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`Removed storage item: ${key}`);
        } catch (error) {
          console.error(`Failed to remove storage item ${key}:`, error);
        }
      });
      
      const newUsage = this.getStorageUsage();
      console.log(`Storage cleanup complete. Usage reduced from ${this.formatBytes(items.reduce((sum, item) => sum + item.size, 0))} to ${this.formatBytes(newUsage)}`);
      
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }
  
  static emergencyCleanup(): void {
    console.warn('Performing emergency storage cleanup...');
    
    // Clear all non-essential storage
    const essentialKeys = ['inchronicle_access_token', 'user_preferences'];
    
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && !essentialKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      }
      console.log('Emergency cleanup complete');
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      // Last resort - clear everything
      try {
        localStorage.clear();
        console.log('Performed complete storage clear as last resort');
      } catch (clearError) {
        console.error('Complete storage clear failed:', clearError);
      }
    }
  }
  
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  static getStorageReport(): void {
    const info = this.getStorageInfo();
    
    console.group('📊 Storage Report');
    console.log(`Usage: ${this.formatBytes(info.usage)} / ${this.formatBytes(this.MAX_SIZE)}`);
    console.log(`Available: ${this.formatBytes(info.available)}`);
    console.log(`Keys: ${info.keys.length}`);
    
    if (info.usage > this.WARNING_SIZE) {
      console.warn('⚠️ Storage usage is high. Consider cleanup.');
    }
    
    // List all items with their sizes
    const items: Array<{ key: string, size: number }> = [];
    for (let key of info.keys) {
      const value = localStorage.getItem(key);
      if (value) {
        items.push({ key, size: new Blob([value]).size });
      }
    }
    
    items.sort((a, b) => b.size - a.size);
    console.table(items.map(item => ({
      Key: item.key,
      Size: this.formatBytes(item.size)
    })));
    
    console.groupEnd();
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).SafeStorage = SafeStorage;
}