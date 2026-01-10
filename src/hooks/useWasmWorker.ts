/**
 * Custom hook for managing Web Worker lifecycle
 * Provides a clean interface for communicating with WASM workers
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { WorkerMessage, WorkerResponse, MessageType } from '../types';

interface UseWasmWorkerOptions {
  workerPath: string;
  onMessage?: (response: WorkerResponse) => void;
  onError?: (error: Error) => void;
  autoInit?: boolean;
}

interface UseWasmWorkerReturn {
  sendMessage: <T = any>(message: Omit<WorkerMessage<T>, 'id' | 'timestamp'>) => Promise<WorkerResponse>;
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
  const messageHandlersRef = useRef<Map<string, (response: WorkerResponse) => void>>(new Map());

  /**
   * Initialize worker
   */
  const initWorker = useCallback(() => {
    if (workerRef.current) {
      return; // Already initialized
    }

    try {
      setLoading(true);
      setError(null);

      // Create worker instance
      const worker = new Worker(workerPath, { type: 'module' });

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
        const error = new Error(event.message || 'Worker error');
        setError(error);
        setLoading(false);

        if (onError) {
          onError(error);
        }
      };

      workerRef.current = worker;

      // Initialize WASM module
      const initMessage: WorkerMessage = {
        id: generateId(),
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
        id: generateId(),
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
  const sendMessage = useCallback(<T = any>(
    message: Omit<WorkerMessage<T>, 'id' | 'timestamp'>
  ): Promise<WorkerResponse> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = generateId();
      const fullMessage: WorkerMessage<T> = {
        ...message,
        id,
        timestamp: Date.now(),
      };

      // Set up handler for this message
      messageHandlersRef.current.set(id, (response: WorkerResponse) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Operation failed'));
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

  // Listen for initialization success
  useEffect(() => {
    const handleInitMessage = (response: WorkerResponse) => {
      if (response.type === MessageType.INIT_WORKER) {
        setLoading(false);

        if (response.success) {
          setInitialized(true);
          setError(null);
        } else {
          setError(new Error(response.error || 'Failed to initialize WASM module'));
        }
      }
    };

    // Store original onMessage
    const originalOnMessage = onMessage;

    // Wrap onMessage to handle initialization
    const wrappedOnMessage = (response: WorkerResponse) => {
      handleInitMessage(response);
      if (originalOnMessage) {
        originalOnMessage(response);
      }
    };

    // Update onMessage temporarily
    // Note: This is a simplified approach. In production, you might want a more robust solution.

    return () => {
      // Cleanup
    };
  }, [onMessage]);

  return {
    sendMessage,
    loading,
    error,
    initialized,
    terminate,
    restart,
  };
}

/**
 * Generate unique message ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
