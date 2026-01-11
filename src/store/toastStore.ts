/**
 * Toast notification store
 * Provides custom UI notifications to replace native alert()
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateToastId();
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove non-persistent toasts
    if (!newToast.persistent && newToast.duration) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },
}));

// Helper functions for common toast patterns
export function showSuccessToast(title: string, message?: string): string {
  return useToastStore.getState().addToast({
    type: 'success',
    title,
    message,
    duration: 5000,
  });
}

export function showErrorToast(title: string, message?: string): string {
  return useToastStore.getState().addToast({
    type: 'error',
    title,
    message,
    duration: 8000,
  });
}

export function showWarningToast(title: string, message?: string): string {
  return useToastStore.getState().addToast({
    type: 'warning',
    title,
    message,
    duration: 6000,
  });
}

export function showInfoToast(title: string, message?: string): string {
  return useToastStore.getState().addToast({
    type: 'info',
    title,
    message,
    duration: 4000,
  });
}
