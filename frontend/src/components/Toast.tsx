import React, { useContext } from 'react';
import { ToastContext, type ToastItem } from './ToastContext';

export const ToastList = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return null;
  }
  const { toasts, remove } = context;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast: ToastItem) => (
        <div
          key={toast.id}
          className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg border text-sm flex items-start gap-3 min-w-[300px] ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className={`flex-shrink-0 ${toast.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {toast.type === 'success' ? '✓' : '✕'}
          </div>
          <p className="font-medium">{toast.message}</p>
          <button
            onClick={() => remove(toast.id)}
            className="ml-auto text-gray-400 hover:text-gray-600"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
