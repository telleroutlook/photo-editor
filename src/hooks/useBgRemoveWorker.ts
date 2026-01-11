/**
 * Custom hook for background removal operations
 * Manages Web Worker directly for WASM background removal
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { MessageType } from '../types';
import type {
  RemoveSolidColorPayload,
  MagicWandSelectPayload,
  WorkerMessage,
  WorkerResponse,
} from '../types';

interface RemoveSolidColorResult {
  imageData: Uint8Array;
  width: number;
  height: number;
}

interface MagicWandResult {
  mask: Uint8Array;
  width: number;
  height: number;
}

interface GrabCutResult {
  mask: Uint8Array;
  width: number;
  height: number;
}

interface UseBgRemoveWorkerReturn {
  removeSolidColor: (
    imageData: Uint8Array,
    width: number,
    height: number,
    targetColor: [number, number, number],
    tolerance?: number,
    feather?: number
  ) => Promise<RemoveSolidColorResult>;
  magicWandSelect: (
    imageData: Uint8Array,
    width: number,
    height: number,
    seedX: number,
    seedY: number,
    tolerance?: number,
    connected?: boolean
  ) => Promise<MagicWandResult>;
  grabCutSegment: (
    imageData: Uint8Array,
    width: number,
    height: number,
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number,
    iterations?: number
  ) => Promise<GrabCutResult>;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
}

/**
 * Hook for managing background removal operations via WASM worker
 */
export function useBgRemoveWorker(): UseBgRemoveWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  const messageHandlersRef = useRef<Map<string, (response: WorkerResponse) => void>>(new Map());

  // Initialize worker
  useEffect(() => {
    console.log('🔧 [useBgRemoveWorker] Initializing bgremove worker...');

    try {
      const worker = new Worker(new URL('../workers/bgremoveWorker.ts?worker&url', import.meta.url), {
        type: 'module',
      });

      // Setup message handler
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;

        // Call message handler if exists (for promise-based requests)
        const handler = messageHandlersRef.current.get(response.id);
        if (handler) {
          handler(response);
          messageHandlersRef.current.delete(response.id);
        }

        // Update initialized state
        if (response.type === MessageType.INIT_WORKER) {
          setInitialized(response.success);
          if (response.success) {
            console.log('✅ [useBgRemoveWorker] Worker initialized successfully');
          } else {
            console.error('❌ [useBgRemoveWorker] Worker initialization failed:', response.error);
            setError(new Error(response.error || 'Worker initialization failed'));
          }
          setLoading(false);
        }
      };

      // Setup error handler
      worker.onerror = (event: ErrorEvent) => {
        console.error('❌ [useBgRemoveWorker] Worker error:', {
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
      };

      workerRef.current = worker;

      // Initialize WASM module
      console.log('📤 [useBgRemoveWorker] Sending INIT_WORKER message...');
      setLoading(true);
      const initMessage: WorkerMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: MessageType.INIT_WORKER,
        payload: {},
        timestamp: Date.now(),
      };
      worker.postMessage(initMessage);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize worker');
      console.error('❌ [useBgRemoveWorker] Initialization error:', error);
      setError(error);
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        console.log('🧹 [useBgRemoveWorker] Terminating worker...');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

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

      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

  /**
   * Remove solid color background
   */
  const removeSolidColor = useCallback(
    async (
      imageData: Uint8Array,
      width: number,
      height: number,
      targetColor: [number, number, number],
      tolerance?: number,
      feather?: number
    ): Promise<RemoveSolidColorResult> => {
      try {
        const response = await sendMessage<RemoveSolidColorPayload, RemoveSolidColorResult>({
          type: MessageType.REMOVE_SOLID_COLOR,
          payload: {
            imageData,
            width,
            height,
            targetColor,
            tolerance: tolerance ?? 30,
            feather: feather ?? 0,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Solid color removal failed');
        }

        // Convert ArrayBuffer to Uint8Array
        return {
          imageData: new Uint8Array(response.data.imageData),
          width: response.data.width,
          height: response.data.height,
        };
      } catch (err) {
        throw err instanceof Error ? err : new Error('Solid color removal failed');
      }
    },
    [sendMessage]
  );

  /**
   * Magic wand selection (flood fill)
   */
  const magicWandSelect = useCallback(
    async (
      imageData: Uint8Array,
      width: number,
      height: number,
      seedX: number,
      seedY: number,
      tolerance?: number,
      connected?: boolean
    ): Promise<MagicWandResult> => {
      try {
        const response = await sendMessage<MagicWandSelectPayload, MagicWandResult>({
          type: MessageType.MAGIC_WAND_SELECT,
          payload: {
            imageData,
            width,
            height,
            seedX,
            seedY,
            tolerance: tolerance ?? 30,
            connected: connected ?? true,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Magic wand selection failed');
        }

        // Convert ArrayBuffer to Uint8Array
        return {
          mask: new Uint8Array(response.data.mask),
          width: response.data.width,
          height: response.data.height,
        };
      } catch (err) {
        throw err instanceof Error ? err : new Error('Magic wand selection failed');
      }
    },
    [sendMessage]
  );

  /**
   * GrabCut segmentation (semi-automatic)
   */
  const grabCutSegment = useCallback(
    async (
      imageData: Uint8Array,
      width: number,
      height: number,
      rectX: number,
      rectY: number,
      rectWidth: number,
      rectHeight: number,
      iterations?: number
    ): Promise<GrabCutResult> => {
      try {
        const response = await sendMessage<{ imageData: Uint8Array; width: number; height: number; rectX: number; rectY: number; rectWidth: number; rectHeight: number; iterations: number }, GrabCutResult>({
          type: MessageType.GRABCUT_SEGMENT,
          payload: {
            imageData,
            width,
            height,
            rectX,
            rectY,
            rectWidth,
            rectHeight,
            iterations: iterations ?? 5,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'GrabCut segmentation failed');
        }

        // Convert ArrayBuffer to Uint8Array
        return {
          mask: new Uint8Array(response.data.mask),
          width: response.data.width,
          height: response.data.height,
        };
      } catch (err) {
        throw err instanceof Error ? err : new Error('GrabCut segmentation failed');
      }
    },
    [sendMessage]
  );

  return {
    removeSolidColor,
    magicWandSelect,
    grabCutSegment,
    loading,
    error,
    initialized,
  };
}
