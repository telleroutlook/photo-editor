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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Message handlers map (for promise-based communication)
  const messageHandlersRef = useRef<Map<string, (response: WorkerResponse<unknown>) => void>>(new Map());

  /**
   * Initialize worker
   */
  const initWorker = useCallback(() => {
    if (workerRef.current) {
      return; // Already initialized
    }

    try {
      console.log('🔧 [useWasmWorker] Initializing worker with path:', workerPath);
      setLoading(true);
      setError(null);

      // Create worker instance
      const worker = new Worker(workerPath, { type: 'module' });
      console.log('✅ [useWasmWorker] Worker created successfully');

      // Setup message handler
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;

        // Call message handler if exists (for promise-based requests)
        const handler = messageHandlersRef.current.get(response.id);
        if (handler) {
          handler(response);
          messageHandlersRef.current.delete(response.id);
        }

        // Call global onMessage callback
        if (onMessage) {
          onMessage(response);
        }
      };

      // Setup error handler
      worker.onerror = (event: ErrorEvent) => {
        console.error('❌ [useWasmWorker] Worker error:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
          stack: event.error?.stack
        });
        const error = new Error(event.message || 'Worker error');
        if (event.error) {
          error.stack = event.error.stack;
        }
        setError(error);
        setLoading(false);

        if (onError) {
          onError(error);
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
      const error = err instanceof Error ? err : new Error('Failed to initialize worker');
      setError(error);
      setLoading(false);

      if (onError) {
        onError(error);
      }
    }
  }, [workerPath, onMessage, onError]);

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

    setInitialized(false);
    messageHandlersRef.current.clear();
  }, []);

  /**
   * Restart worker
   */
  const restart = useCallback(() => {
    terminate();
    initWorker();
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

      // Set up handler for this message
      messageHandlersRef.current.set(id, (response: WorkerResponse<unknown>) => {
        const typedResponse = response as WorkerResponse<TResponse>;
        if (typedResponse.success) {
          resolve(typedResponse);
        } else {
          reject(new Error(typedResponse.error || 'Operation failed'));
        }
      });

      // Send message to worker
      workerRef.current.postMessage(fullMessage);

      // Set timeout (30 seconds default)
      setTimeout(() => {
        if (messageHandlersRef.current.has(id)) {
          messageHandlersRef.current.delete(id);
          reject(new Error('Worker response timeout'));
        }
      }, 30000);
    });
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInit) {
      initWorker();
    }

    return () => {
      terminate();
    };
  }, [autoInit, initWorker, terminate]);

  return {
    sendMessage,
    loading,
    error,
    initialized,
    terminate,
    restart,
  };
}
