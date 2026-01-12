/**
 * Global loading spinner component
 * Displays a full-screen loading overlay when processing operations
 */

import { useAppStore } from '../../store/appStore';
import { Loader2 } from 'lucide-react';

export function LoadingOverlay(): React.ReactElement | null {
  const { isLoading, loadingMessage, loadingProgress } = useAppStore();

  if (!isLoading) {
    return null;
  }

  const hasProgress = loadingProgress !== null && loadingProgress !== undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl min-w-[320px] max-w-md">
        {/* Spinning loader */}
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />

        {/* Loading message */}
        <div className="text-center w-full">
          <p className="text-lg font-semibold text-zinc-100">
            {loadingMessage || 'Processing...'}
          </p>
          <p className="text-sm text-zinc-400 mt-1">Please wait</p>
        </div>

        {/* Progress Bar (if available) */}
        {hasProgress ? (
          <div className="w-full">
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(loadingProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
                role="progressbar"
                aria-valuenow={loadingProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        ) : (
          /* Pulsing dots for indeterminate progress */
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}
