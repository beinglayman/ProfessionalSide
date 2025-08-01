// Startup utilities to handle app initialization and cleanup
import { SafeStorage } from './storage';

export class StartupManager {
  static init(): void {
    console.log('🚀 Starting application initialization...');
    
    // Check and clean storage immediately
    this.checkAndCleanStorage();
    
    // Add error handlers for uncaught storage errors
    this.addErrorHandlers();
    
    console.log('✅ Application initialization complete');
  }
  
  private static checkAndCleanStorage(): void {
    try {
      console.log('🔍 Checking storage status...');
      
      const storageInfo = SafeStorage.getStorageInfo();
      console.log(`📊 Storage usage: ${this.formatBytes(storageInfo.usage)} (${storageInfo.keys.length} keys)`);
      
      // If storage is over 3MB or has quota issues, clean immediately
      if (storageInfo.usage > 3 * 1024 * 1024) {
        console.warn('⚠️ Storage usage is high, performing cleanup...');
        SafeStorage.cleanup();
      }
      
      // Test storage functionality
      const testKey = 'startup_test';
      const testValue = 'test_data';
      
      if (!SafeStorage.setItem(testKey, testValue)) {
        console.error('❌ Storage test failed, performing emergency cleanup...');
        SafeStorage.emergencyCleanup();
      } else {
        SafeStorage.removeItem(testKey);
        console.log('✅ Storage test passed');
      }
      
    } catch (error) {
      console.error('❌ Storage check failed:', error);
      SafeStorage.emergencyCleanup();
    }
  }
  
  private static addErrorHandlers(): void {
    // Handle uncaught storage quota errors
    window.addEventListener('error', (event) => {
      if (event.error && event.error.name === 'QuotaExceededError') {
        console.error('🚨 Uncaught QuotaExceededError detected, performing emergency cleanup...');
        SafeStorage.emergencyCleanup();
        event.preventDefault();
      }
    });
    
    // Handle unhandled promise rejections related to storage
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.name === 'QuotaExceededError') {
        console.error('🚨 Unhandled storage quota rejection, performing emergency cleanup...');
        SafeStorage.emergencyCleanup();
        event.preventDefault();
      }
    });
  }
  
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Emergency reset function
  static emergencyReset(): void {
    console.warn('🚨 Performing emergency application reset...');
    
    try {
      // Clear all storage
      SafeStorage.clear();
      
      // Clear any stuck intervals/timeouts
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }
      
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('❌ Emergency reset failed:', error);
      // Force reload as last resort
      window.location.href = window.location.href;
    }
  }
}

// Make emergency reset available globally
if (typeof window !== 'undefined') {
  (window as any).emergencyReset = StartupManager.emergencyReset;
}