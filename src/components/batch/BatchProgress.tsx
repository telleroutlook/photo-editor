/**
 * BatchProgress.tsx - Batch Processing Progress Tracker
 * Visual progress display with per-image status indicators
 */

import type { BatchStatus, BatchItemStatus } from '../../types/batch';
import { formatBytes } from '../../utils/zipUtils';

interface BatchProgressProps {
  status: BatchStatus;
  items: BatchItemStatus[];
  showDetails?: boolean;
}

export function BatchProgress({ status, items, showDetails = true }: BatchProgressProps) {
  const { total, completed, failed, processing, progress } = status;

  // Calculate stats
  const totalSize = items.reduce((sum, item) => sum + (item.result?.size || 0), 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm space-y-4">
      {/* Overall Progress Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Processing Progress
          </h3>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {progress}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Counts */}
        <div className="flex items-center justify-between mt-3 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 dark:text-gray-400">
              {completed}/{total} completed
            </span>
            {failed > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {failed} failed
              </span>
            )}
            {processing > 0 && (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {processing} processing
              </span>
            )}
          </div>
          {totalSize > 0 && (
            <span className="text-gray-600 dark:text-gray-400">
              {formatBytes(totalSize)}
            </span>
          )}
        </div>
      </div>

      {/* Per-Image Status List */}
      {showDetails && items.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Image Details
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {items.map((item) => (
              <BatchProgressItem key={item.imageId} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Completion Summary */}
      {progress === 100 && total > 0 && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Batch processing complete! {completed} of {total} images succeeded
              {failed > 0 && ` (${failed} failed)`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface BatchProgressItemProps {
  item: BatchItemStatus;
}

function BatchProgressItem({ item }: BatchProgressItemProps) {
  const getStatusColor = (status: BatchItemStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'failed':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: BatchItemStatus['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className="px-4 py-2 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      {/* Status Icon */}
      <div className={`p-1.5 rounded-full ${getStatusColor(item.status)}`}>
        {getStatusIcon(item.status)}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.fileName}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="capitalize">{item.status}</span>
          {item.result && (
            <>
              <span>•</span>
              <span>{item.result.width} × {item.result.height}</span>
              <span>•</span>
              <span>{formatBytes(item.result.size)}</span>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {item.error && (
        <div className="flex-1 text-xs text-red-600 dark:text-red-400 truncate" title={item.error}>
          {item.error}
        </div>
      )}

      {/* Progress Bar for Processing Items */}
      {item.status === 'processing' && (
        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 animate-pulse"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
