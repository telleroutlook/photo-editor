/**
 * Toast notification component
 * Displays toast notifications from the toastStore
 */

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, type Toast as ToastType, type ToastType as ToastVariant } from '../../store/toastStore';

interface ToastItemProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const TOAST_ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: 'bg-green-900/90 border-green-700 text-green-100',
  error: 'bg-red-900/90 border-red-700 text-red-100',
  warning: 'bg-amber-900/90 border-amber-700 text-amber-100',
  info: 'bg-blue-900/90 border-blue-700 text-blue-100',
};

const TOAST_ICON_STYLES: Record<ToastVariant, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
};

function ToastItem({ toast, onRemove }: ToastItemProps): React.ReactElement {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = TOAST_ICONS[toast.type];

  function handleClose(): void {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }

  useEffect(() => {
    if (!toast.persistent && toast.duration) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, toast.duration - 200);

      return () => clearTimeout(exitTimer);
    }
    return undefined;
  }, [toast.duration, toast.persistent]);

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm
        transition-all duration-200 ease-out min-w-[320px] max-w-[480px]
        ${TOAST_STYLES[toast.type]}
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${TOAST_ICON_STYLES[toast.type]}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-xs opacity-90 whitespace-pre-wrap">{toast.message}</p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer(): React.ReactElement {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) {
    return <></>;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
