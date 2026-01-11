/**
 * Custom hook for managing Web Worker lifecycle
 * Provides a clean interface for communicating with WASM workers
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { WorkerMessage, WorkerResponse, MessageType } from '../types';
import { generateMessageId } from '../types/worker';

interface UseWasmWorkerOptions {
  workerPath: string;
  onMessage?: (response: WorkerResponse) => void;
  onError?: (error: Error) => void;
  autoInit?: boolean;
}

interface UseWasmWorkerReturn {
  sendMessage: <TPayload = unknown, TResponse = unknown>(message: Omit<WorkerMessage<TPayload>, 'id' | 'timestamp'>) => Promise<WorkerResponse<TResponse>>;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
  terminate: () => void;
  restart: () => void;
}

/**
 * Hook for managing WASM worker communication
 */
export function useWasmWorker({
  workerPath,
  onMessage,
  onError,
  autoInit = true,
}: UseWasmWorkerOptions): UseWasmWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const initializingRef = useRef(false); // Guard against race conditions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Store callbacks in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  }, [onMessage, onError]);

  // Message handlers map (for promise-based communication)
  const messageHandlersRef = useRef<Map<string, (response: WorkerResponse<unknown>) => void>>(new Map());

  /**
   * Initialize worker
   */
  const initWorker = useCallback(() => {
    // Guard against race conditions - prevent multiple initializations
    if (workerRef.current || initializingRef.current) {
      return;
    }

    initializingRef.current = true;

    try {
      console.log('[useWasmWorker] Initializing worker with path:', workerPath);
      setLoading(true);
      setError(null);

      // Create worker instance
      const worker = new Worker(workerPath, { type: 'module' });
      console.log('[useWasmWorker] Worker created successfully');

      // Setup message handler
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;

        // Call message handler if exists (for promise-based requests)
        const handler = messageHandlersRef.current.get(response.id);
        if (handler) {
          handler(response);
          messageHandlersRef.current.delete(response.id);
        }

        // Call global onMessage callback using ref
        if (onMessageRef.current) {
          onMessageRef.current(response);
        }
      };

      // Setup error handler
      worker.onerror = (event: ErrorEvent) => {
        console.error('[useWasmWorker] Worker error:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
          stack: event.error?.stack
        });
        const workerError = new Error(event.message || 'Worker error');
        if (event.error) {
          workerError.stack = event.error.stack;
        }
        setError(workerError);
        setLoading(false);

        if (onErrorRef.current) {
          onErrorRef.current(workerError);
        }
      };

      workerRef.current = worker;

      // Initialize WASM module
      const initMessage: WorkerMessage = {
        id: generateMessageId(),
        type: MessageType.INIT_WORKER,
        payload: {},
        timestamp: Date.now(),
      };

      worker.postMessage(initMessage);
    } catch (err) {
      const initError = err instanceof Error ? err : new Error('Failed to initialize worker');
      setError(initError);
      setLoading(false);
      initializingRef.current = false;

      if (onErrorRef.current) {
        onErrorRef.current(initError);
      }
    }
  }, [workerPath]); // Only depend on workerPath, use refs for callbacks

  /**
   * Terminate worker
   */
  const terminate = useCallback(() => {
    if (workerRef.current) {
      const terminateMessage: WorkerMessage = {
        id: generateMessageId(),
        type: MessageType.TERMINATE_WORKER,
        payload: {},
        timestamp: Date.now(),
      };

      workerRef.current.postMessage(terminateMessage);
      workerRef.current.terminate();
      workerRef.current = null;
    }

    initializingRef.current = false;
    setInitialized(false);
    messageHandlersRef.current.clear();
  }, []);

  /**
   * Restart worker
   */
  const restart = useCallback(() => {
    terminate();
    // Small delay to ensure cleanup completes
    setTimeout(() => {
      initWorker();
    }, 10);
  }, [terminate, initWorker]);

  /**
   * Send message to worker
   */
  const sendMessage = useCallback(<TPayload = unknown, TResponse = unknown>(
    message: Omit<WorkerMessage<TPayload>, 'id' | 'timestamp'>
  ): Promise<WorkerResponse<TResponse>> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = generateMessageId();
      const fullMessage: WorkerMessage<TPayload> = {
        ...message,
        id,
        timestamp: Date.now(),
      };

      // Set timeout (30 seconds default)
      const timeoutId = setTimeout(() => {
        if (messageHandlersRef.current.has(id)) {
          messageHandlersRef.current.delete(id);
          reject(new Error('Worker response timeout'));
        }
      }, 30000);

      // Set up handler for this message
      messageHandlersRef.current.set(id, (response: WorkerResponse<unknown>) => {
        clearTimeout(timeoutId); // Clear timeout on successful response
        const typedResponse = response as WorkerResponse<TResponse>;
        if (typedResponse.success) {
          resolve(typedResponse);
        } else {
          reject(new Error(typedResponse.error || 'Operation failed'));
        }
      });

      // Send message to worker
      workerRef.current.postMessage(fullMessage);
    });
  }, []);

  // Auto-initialize on mount - use stable workerPath dependency only
  useEffect(() => {
    if (autoInit) {
      initWorker();
    }

    return () => {
      terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initWorker and terminate are stable refs, including them causes re-initialization loops
  }, [autoInit, workerPath]);

  return {
    sendMessage,
    loading,
    error,
    initialized,
    terminate,
    restart,
  };
}
