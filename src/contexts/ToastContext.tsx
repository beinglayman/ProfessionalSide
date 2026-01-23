import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Loader2, LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

// Toast type definitions
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
  /** Custom icon component (overrides default) */
  icon?: LucideIcon;
  /** Whether toast requires manual dismissal (ignores duration) */
  persistent?: boolean;
}

// Options for creating toasts
export interface ToastOptions {
  message?: string;
  duration?: number;
  action?: ToastAction;
  icon?: LucideIcon;
  persistent?: boolean;
}

// Toast helper type for passing to child components
export interface ToastActions {
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  /** Update an existing toast (useful for loading → success/error transitions) */
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
  success: (title: string, message?: string, options?: ToastOptions) => string;
  error: (title: string, message?: string, options?: ToastOptions) => string;
  info: (title: string, message?: string, options?: ToastOptions) => string;
  warning: (title: string, message?: string, options?: ToastOptions) => string;
  /** Show loading toast, returns functions to resolve/reject */
  loading: (title: string, message?: string) => {
    id: string;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
  };
  /** Wrap a promise with loading → success/error toasts */
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    }
  ) => Promise<T>;
  /** Return the toast object for passing to child components */
  toast: ToastActions;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  React.useEffect(() => {
    // Don't auto-dismiss persistent or loading toasts
    if (toast.persistent || toast.type === 'loading' || toast.duration === 0) {
      return;
    }
    const timer = setTimeout(handleRemove, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast.duration, toast.id, toast.persistent, toast.type]);

  const getIcon = () => {
    // Use custom icon if provided
    if (toast.icon) {
      const CustomIcon = toast.icon;
      return <CustomIcon className="h-5 w-5 text-gray-500" />;
    }

    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'loading':
        return 'bg-gray-50 border-gray-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div
      className={cn(
        "max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-300",
        getStyles(),
        isExiting ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900">{toast.title}</p>
            {toast.message && (
              <p className="mt-1 text-sm text-gray-500">{toast.message}</p>
            )}
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleRemove}
              className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = {
      id,
      duration: 5000,
      ...toastData,
    };
    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts(prev => prev.map(toast =>
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const success = useCallback((title: string, message?: string, options?: ToastOptions) => {
    return addToast({ type: 'success', title, message, ...options });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, options?: ToastOptions) => {
    return addToast({ type: 'error', title, message, ...options });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, options?: ToastOptions) => {
    return addToast({ type: 'info', title, message, ...options });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, options?: ToastOptions) => {
    return addToast({ type: 'warning', title, message, ...options });
  }, [addToast]);

  const loading = useCallback((title: string, message?: string) => {
    const id = addToast({ type: 'loading', title, message });
    return {
      id,
      success: (successTitle: string, successMessage?: string) => {
        updateToast(id, { type: 'success', title: successTitle, message: successMessage });
        // Auto-dismiss after success
        setTimeout(() => removeToast(id), 3000);
      },
      error: (errorTitle: string, errorMessage?: string) => {
        updateToast(id, { type: 'error', title: errorTitle, message: errorMessage });
        // Auto-dismiss after error
        setTimeout(() => removeToast(id), 5000);
      },
    };
  }, [addToast, updateToast, removeToast]);

  const promiseToast = useCallback(<T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    }
  ): Promise<T> => {
    const { id, success: resolveSuccess, error: resolveError } = loading(options.loading);

    return promise
      .then((data) => {
        const successMessage = typeof options.success === 'function'
          ? options.success(data)
          : options.success;
        resolveSuccess(successMessage);
        return data;
      })
      .catch((err) => {
        const errorMessage = typeof options.error === 'function'
          ? options.error(err)
          : options.error;
        resolveError(errorMessage);
        throw err;
      });
  }, [loading]);

  // Create toast object for passing to child components
  const toast: ToastActions = {
    success,
    error,
    info,
    warning,
  };

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    success,
    error,
    info,
    warning,
    loading,
    promise: promiseToast,
    toast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50">
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={removeToast}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}