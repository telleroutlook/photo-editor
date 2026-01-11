/**
 * BatchExport.tsx - Batch Processing & Export Panel
 * Main interface for batch operations and ZIP export
 */

import { useState, useCallback } from 'react';
import { useImageStore } from '../../store/imageStore';
import { useBatchProcessor } from '../../hooks/useBatchProcessor';
import { FileSelection } from './FileSelection';
import { BatchProgress } from './BatchProgress';
import { exportAndDownloadZip } from '../../utils/zipUtils';
import type { BatchParams, ZipExportOptions } from '../../types/batch';

interface BatchExportProps {
  batchParams: BatchParams;
  onParamsChange?: (_params: BatchParams) => void;
}

export function BatchExport({ batchParams }: BatchExportProps) {
  const { images } = useImageStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zipFileName, setZipFileName] = useState('processed_images.zip');
  const [includeOriginal, setIncludeOriginal] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState(6);

  const { processing, status, results, processBatch, cancelBatch, error } = useBatchProcessor({
    onProgress: (status) => {
      console.log('Batch progress:', status);
    },
    onComplete: (results) => {
      console.log('Batch complete:', results);
    },
  });

  // Prepare tasks for batch processing
  const prepareTasks = useCallback(() => {
    return images
      .filter((img) => selectedIds.has(img.id) && img.data !== undefined)
      .map((image) => ({
        imageId: image.id,
        imageData: image.data!,
        width: image.width,
        height: image.height,
        fileName: image.fileName,
      }));
  }, [images, selectedIds]);

  // Handle batch processing
  const handleProcessBatch = useCallback(async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one image to process');
      return;
    }

    const tasks = prepareTasks();
    try {
      await processBatch(tasks, batchParams);
    } catch (err) {
      console.error('Batch processing failed:', err);
    }
  }, [selectedIds, prepareTasks, processBatch, batchParams]);

  // Handle ZIP export
  const handleExportZip = useCallback(async () => {
    if (results.length === 0) {
      alert('No processed images to export. Please run batch processing first.');
      return;
    }

    const exportData = results
      .filter((item) => item.status === 'completed' && item.result)
      .map((item) => {
        const result: {
          fileName: string;
          imageData: ArrayBuffer;
          originalFile?: { fileName: string; imageData: ArrayBuffer };
        } = {
          fileName: item.fileName,
          imageData: item.result!.imageData,
        };

        if (includeOriginal) {
          const originalImage = images.find((img) => img.id === item.imageId);
          const uint8Array = originalImage?.data;
          if (uint8Array) {
            // Create a new ArrayBuffer to avoid SharedArrayBuffer
            const arrayBuffer = new ArrayBuffer(uint8Array.length);
            new Uint8Array(arrayBuffer).set(uint8Array);
            result.originalFile = {
              fileName: `original_${item.fileName}`,
              imageData: arrayBuffer,
            };
          }
        }

        return result;
      });

    const options: ZipExportOptions = {
      zipFileName,
      compressionLevel,
      includeOriginal,
    };

    try {
      await exportAndDownloadZip(exportData, options);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [results, includeOriginal, zipFileName, compressionLevel, images]);

  // Can export?
  const canExport = results.length > 0 && results.some((r) => r.status === 'completed');
  const canProcess = selectedIds.size > 0 && !processing;
  const hasCompletedResults = status.total > 0 && status.completed > 0;

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <FileSelection
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        disabled={processing}
      />

      {/* Batch Operation Info */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Batch Operation: {batchParams.operation}
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                {selectedIds.size} image{selectedIds.size !== 1 ? 's' : ''} selected for processing
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {(processing || hasCompletedResults) && <BatchProgress status={status} items={results} />}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 dark:text-red-300">Error</h4>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Settings */}
      {hasCompletedResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Export Settings</h3>

          {/* ZIP Filename */}
          <div>
            <label htmlFor="zip-filename" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ZIP Filename
            </label>
            <input
              id="zip-filename"
              type="text"
              value={zipFileName}
              onChange={(e) => setZipFileName(e.target.value)}
              disabled={processing}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="processed_images.zip"
            />
          </div>

          {/* Include Originals Toggle */}
          <div className="flex items-center gap-2">
            <input
              id="include-original"
              type="checkbox"
              checked={includeOriginal}
              onChange={(e) => setIncludeOriginal(e.target.checked)}
              disabled={processing}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="include-original" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Include original images in ZIP
            </label>
          </div>

          {/* Compression Level */}
          <div>
            <label htmlFor="compression-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Compression Level: {compressionLevel}
            </label>
            <input
              id="compression-level"
              type="range"
              min="0"
              max="9"
              value={compressionLevel}
              onChange={(e) => setCompressionLevel(Number(e.target.value))}
              disabled={processing}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              0 = faster, 9 = smaller file size
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!processing && !hasCompletedResults && (
          <button
            onClick={handleProcessBatch}
            disabled={!canProcess}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Start Batch Processing ({selectedIds.size} images)
          </button>
        )}

        {processing && (
          <button
            onClick={cancelBatch}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Cancel Processing
          </button>
        )}

        {hasCompletedResults && !processing && (
          <button
            onClick={handleExportZip}
            disabled={!canExport}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Download ZIP ({status.completed} / {status.total})
          </button>
        )}

        {hasCompletedResults && !processing && (
          <button
            onClick={() => {
              setSelectedIds(new Set());
            }}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            New Batch
          </button>
        )}
      </div>
    </div>
  );
}
