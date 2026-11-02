/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  toasts: ToastItem[];
  remove: (id: string) => void;
}

const TOAST_LIMIT = 5;
const TOAST_AUTO_DISMISS_MS = 4000;

let count = 0;
const genId = () => {
  count += 1;
  return `toast-${count}`;
};

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined
);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = genId();
    setToasts((prev) => {
      const next = [...prev, { id, type, message }];
      return next.slice(-TOAST_LIMIT);
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_AUTO_DISMISS_MS);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextType = { show, toasts, remove };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
