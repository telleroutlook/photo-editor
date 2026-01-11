/**
 * Custom hook for core image operations
 * Manages Web Worker directly for WASM core operations (crop, rotate, flip, resize)
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { MessageType, FlipDirection, ResizeQuality } from '../types';
import type { WorkerMessage, WorkerResponse, CropRect } from '../types';
import { generateMessageId } from '../types/worker';

interface CropResult {
  imageData: Uint8Array;
  width: number;
  height: number;
}

interface RotateResult {
  imageData: Uint8Array;
  width: number;
  height: number;
}

interface FlipResult {
  imageData: Uint8Array;
  width: number;
  height: number;
}

interface ResizeResult {
  imageData: Uint8Array;
  width: number;
  height: number;
}

export interface UseCoreWorkerReturn {
  cropImage: (
    imageData: Uint8Array,
    width: number,
    height: number,
    cropRect: CropRect
  ) => Promise<CropResult>;
  rotateImage: (imageData: Uint8Array, width: number, height: number, angle: number) => Promise<RotateResult>;
  flipImage: (
    imageData: Uint8Array,
    width: number,
    height: number,
    direction: FlipDirection
  ) => Promise<FlipResult>;
  resizeImage: (
    imageData: Uint8Array,
    width: number,
    height: number,
    newWidth: number,
    newHeight: number,
    quality: ResizeQuality
  ) => Promise<ResizeResult>;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
}

/**
 * Hook for managing core operations via WASM worker
 */
export function useCoreWorker(): UseCoreWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  const messageHandlersRef = useRef<Map<string, (response: WorkerResponse) => void>>(new Map());

  // Initialize worker
  useEffect(() => {
    console.log('🔧 [useCoreWorker] Initializing core worker...');

    try {
      const worker = new Worker(new URL('../workers/coreWorker.ts?worker&url', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const handler = messageHandlersRef.current.get(response.id);
        if (handler) {
          handler(response);
          messageHandlersRef.current.delete(response.id);
        }

        // Handle initialization response
        if (response.type === MessageType.INIT_WORKER && response.success) {
          console.log('✅ [useCoreWorker] Worker initialized successfully');
          setInitialized(true);
        }
      };

      worker.onerror = (error: ErrorEvent) => {
        console.error('❌ [useCoreWorker] Worker error:', error);
        setError(new Error(error.message || 'Worker error'));
        setLoading(false);
      };

      workerRef.current = worker;

      // Send init message
      console.log('📤 [useCoreWorker] Init message sent');
      const initMessage: WorkerMessage = {
        id: generateMessageId(),
        type: MessageType.INIT_WORKER,
        payload: {},
        timestamp: Date.now(),
      };
      worker.postMessage(initMessage);
    } catch (err) {
      console.error('❌ [useCoreWorker] Failed to create worker:', err);
      setError(err instanceof Error ? err : new Error('Failed to create worker'));
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        console.log('🧹 [useCoreWorker] Cleaning up worker');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Helper to send message and wait for response
  const sendMessage = useCallback(
    <T>(message: WorkerMessage): Promise<WorkerResponse<T>> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const timeout = setTimeout(() => {
          messageHandlersRef.current.delete(message.id);
          reject(new Error(`Worker message timeout: ${message.type}`));
        }, 30000); // 30 second timeout

        messageHandlersRef.current.set(message.id, (response: WorkerResponse) => {
          clearTimeout(timeout);
          if (response.success) {
            resolve(response as WorkerResponse<T>);
          } else {
            reject(new Error(response.error || 'Worker operation failed'));
          }
        });

        workerRef.current.postMessage(message);
      });
    },
    []
  );

  // Crop image
  const cropImage = useCallback(
    async (imageData: Uint8Array, width: number, height: number, cropRect: CropRect): Promise<CropResult> => {
      setLoading(true);
      setError(null);
      try {
        const response = await sendMessage<CropResult>({
          id: generateMessageId(),
          type: MessageType.CROP_IMAGE,
          payload: { imageData: imageData.buffer, width, height, cropRect },
          timestamp: Date.now(),
        });

        if (!response.data) {
          throw new Error('No data returned from crop operation');
        }

        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Crop operation failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [sendMessage]
  );

  // Rotate image
  const rotateImage = useCallback(
    async (imageData: Uint8Array, width: number, height: number, angle: number): Promise<RotateResult> => {
      setLoading(true);
      setError(null);
      try {
        const response = await sendMessage<RotateResult>({
          id: generateMessageId(),
          type: MessageType.ROTATE_IMAGE,
          payload: { imageData: imageData.buffer, width, height, angle },
          timestamp: Date.now(),
        });

        if (!response.data) {
          throw new Error('No data returned from rotate operation');
        }

        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Rotate operation failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [sendMessage]
  );

  // Flip image
  const flipImage = useCallback(
    async (
      imageData: Uint8Array,
      width: number,
      height: number,
      direction: FlipDirection
    ): Promise<FlipResult> => {
      setLoading(true);
      setError(null);
      try {
        const response = await sendMessage<FlipResult>({
          id: generateMessageId(),
          type: MessageType.FLIP_IMAGE,
          payload: { imageData: imageData.buffer, width, height, direction },
          timestamp: Date.now(),
        });

        if (!response.data) {
          throw new Error('No data returned from flip operation');
        }

        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Flip operation failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [sendMessage]
  );

  // Resize image
  const resizeImage = useCallback(
    async (
      imageData: Uint8Array,
      width: number,
      height: number,
      newWidth: number,
      newHeight: number,
      quality: ResizeQuality
    ): Promise<ResizeResult> => {
      setLoading(true);
      setError(null);
      try {
        const response = await sendMessage<ResizeResult>({
          id: generateMessageId(),
          type: MessageType.RESIZE_IMAGE,
          payload: { imageData: imageData.buffer, width, height, newWidth, newHeight, quality },
          timestamp: Date.now(),
        });

        if (!response.data) {
          throw new Error('No data returned from resize operation');
        }

        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Resize operation failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [sendMessage]
  );

  return {
    cropImage,
    rotateImage,
    flipImage,
    resizeImage,
    loading,
    error,
    initialized,
  };
}
