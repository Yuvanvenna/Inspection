import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'info':
        return <Info className="w-4 h-4 text-indigo-500 shrink-0" />;
      case 'success':
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
  };

  const getToastBg = (type: ToastType) => {
    switch (type) {
      case 'error':
        return 'border-rose-200 bg-white ring-2 ring-rose-100 text-slate-800';
      case 'info':
        return 'border-indigo-200 bg-white ring-2 ring-indigo-100 text-slate-800';
      case 'success':
      default:
        return 'border-emerald-200 bg-white ring-2 ring-emerald-100 text-slate-800';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 ${getToastBg(
              toast.type
            )}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {getToastIcon(toast.type)}
              <p className="text-xs font-semibold truncate">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
