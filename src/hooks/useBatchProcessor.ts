/**
 * useBatchProcessor Hook
 * Wrapper for batch processing worker with React integration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { wrap, Remote } from 'comlink';
import type { BatchWorkerApi } from '../workers/batchWorker';
import type { BatchParams, BatchItemStatus, BatchStatus } from '../types/batch';

interface UseBatchProcessorOptions {
  maxConcurrent?: number;
  onProgress?: (status: BatchStatus) => void;
  onItemComplete?: (item: BatchItemStatus) => void;
  onComplete?: (results: BatchItemStatus[]) => void;
  onError?: (error: Error) => void;
}

interface UseBatchProcessorReturn {
  processing: boolean;
  status: BatchStatus;
  results: BatchItemStatus[];
  processBatch: (
    tasks: Array<{
      imageId: string;
      imageData: Uint8Array;
      width: number;
      height: number;
      fileName: string;
    }>,
    params: BatchParams
  ) => Promise<BatchItemStatus[]>;
  cancelBatch: () => void;
  error: Error | null;
}

export function useBatchProcessor(options: UseBatchProcessorOptions = {}): UseBatchProcessorReturn {
  const { maxConcurrent = 3, onProgress, onItemComplete, onComplete, onError } = options;

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [results, setResults] = useState<BatchItemStatus[]>([]);
  const [status, setStatus] = useState<BatchStatus>({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    pending: 0,
    progress: 0,
  });

  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<Remote<BatchWorkerApi> | null>(null);

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(new URL('../workers/batchWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    const api = wrap<BatchWorkerApi>(worker);
    apiRef.current = api as unknown as Remote<BatchWorkerApi>;

    // Initialize batch worker (call asynchronously)
    (api as any).init(maxConcurrent).catch((err: Error) => {
      console.error('Failed to initialize worker:', err);
    });

    // Cleanup worker on unmount
    return () => {
      worker.terminate();
    };
  }, [maxConcurrent]);

  // Process batch of images
  const processBatch = useCallback(
    async (
      tasks: Array<{
        imageId: string;
        imageData: Uint8Array;
        width: number;
        height: number;
        fileName: string;
      }>,
      params: BatchParams
    ): Promise<BatchItemStatus[]> => {
      if (!apiRef.current) {
        const err = new Error('Worker not initialized');
        setError(err);
        onError?.(err);
        throw err;
      }

      setProcessing(true);
      setError(null);
      setResults([]);

      const total = tasks.length;
      setStatus({
        total,
        completed: 0,
        failed: 0,
        processing: 0,
        pending: total,
        progress: 0,
      });

      try {
        const api = apiRef.current;
        if (!api) {
          throw new Error('Worker API not initialized');
        }

        const results = await (api as any).processBatch(tasks, params, (progress: any, completed: any, total: any) => {
          const newStatus: BatchStatus = {
            total,
            completed,
            failed: status.failed,
            processing: total - completed,
            pending: total - completed,
            progress,
          };
          setStatus(newStatus);
          onProgress?.(newStatus);
        });

        const finalStatus: BatchStatus = {
          total,
          completed: results.filter((r: any) => r.status === 'completed').length,
          failed: results.filter((r: any) => r.status === 'failed').length,
          processing: 0,
          pending: 0,
          progress: 100,
        };

        setStatus(finalStatus);
        setResults(results);
        onComplete?.(results);

        // Call onItemComplete for each result
        results.forEach((item: any) => {
          onItemComplete?.(item);
        });

        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Batch processing failed');
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setProcessing(false);
      }
    },
    [status.failed, onProgress, onItemComplete, onComplete, onError]
  );

  // Cancel batch processing
  const cancelBatch = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;

    try {
      await (api as any).cancelBatch();
      setProcessing(false);
      setStatus({
        total: 0,
        completed: 0,
        failed: 0,
        processing: 0,
        pending: 0,
        progress: 0,
      });
    } catch (err) {
      console.error('Error cancelling batch:', err);
    }
  }, []);

  return {
    processing,
    status,
    results,
    processBatch,
    cancelBatch,
    error,
  };
}
