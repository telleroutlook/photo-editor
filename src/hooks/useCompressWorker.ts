/**
 * Custom hook for compression operations
 * Manages Web Worker directly for WASM compression
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { MessageType, CompressionFormat } from '../types';
import type {
  CompressJpegPayload,
  CompressWebpPayload,
  CompressToSizePayload,
  WorkerMessage,
  WorkerResponse,
} from '../types';

interface CompressResult {
  imageData: Uint8Array;
  size: number;
  format: string;
  quality?: number;
}

interface UseCompressWorkerReturn {
  compressJpeg: (imageData: Uint8Array, width: number, height: number, quality: number) => Promise<CompressResult>;
  compressWebp: (imageData: Uint8Array, width: number, height: number, quality: number) => Promise<CompressResult>;
  compressPng: (imageData: Uint8Array, width: number, height: number, quality: number) => Promise<CompressResult>;
  compressToSize: (
    imageData: Uint8Array,
    width: number,
    height: number,
    targetSize: number,
    format: CompressionFormat
  ) => Promise<CompressResult & { quality: number }>;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
}

/**
 * Hook for managing compression operations via WASM worker
 */
export function useCompressWorker(): UseCompressWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  const messageHandlersRef = useRef<Map<string, (response: WorkerResponse) => void>>(new Map());

  // Initialize worker
  useEffect(() => {
    console.log('🔧 [useCompressWorker] Initializing compress worker...');

    try {
      const worker = new Worker(new URL('../workers/compressWorker.ts?worker&url', import.meta.url), {
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
        if (response.type === MessageType.INIT_WORKER) {
          setLoading(false);
          if (response.success) {
            console.log('✅ [useCompressWorker] Worker initialized successfully');
            setInitialized(true);
            setError(null);
          } else {
            console.error('❌ [useCompressWorker] Worker initialization failed:', response.error);
            setError(new Error(response.error || 'Failed to initialize WASM module'));
          }
        }
      };

      worker.onerror = (event: ErrorEvent) => {
        console.error('❌ [useCompressWorker] Worker error:', event.message);
        setError(new Error(event.message || 'Worker error'));
        setLoading(false);
      };

      workerRef.current = worker;

      // Initialize WASM module
      const initMessage: WorkerMessage = {
        id: `init-${Date.now()}`,
        type: MessageType.INIT_WORKER,
        payload: {},
        timestamp: Date.now(),
      };

      worker.postMessage(initMessage);
      console.log('📤 [useCompressWorker] Init message sent');
    } catch (err) {
      console.error('❌ [useCompressWorker] Failed to create worker:', err);
      setError(err instanceof Error ? err : new Error('Failed to create worker'));
      setLoading(false);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  /**
   * Send message to worker
   */
  const sendMessage = useCallback(<T = unknown>(
    message: Omit<WorkerMessage<T>, 'id' | 'timestamp'>
  ): Promise<WorkerResponse<T>> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const fullMessage: WorkerMessage<T> = {
        ...message,
        id,
        timestamp: Date.now(),
      };

      messageHandlersRef.current.set(id, (response: WorkerResponse) => {
        if (response.success) {
          resolve(response as WorkerResponse<T>);
        } else {
          reject(new Error(response.error || 'Operation failed'));
        }
      });

      workerRef.current.postMessage(fullMessage);

      setTimeout(() => {
        if (messageHandlersRef.current.has(id)) {
          messageHandlersRef.current.delete(id);
          reject(new Error('Worker response timeout'));
        }
      }, 30000);
    });
  }, []);

  /**
   * Compress image to JPEG format
   */
  const compressJpeg = useCallback(
    async (imageData: Uint8Array, width: number, height: number, quality: number): Promise<CompressResult> => {
      try {
        const response = await sendMessage<any>({
          type: MessageType.COMPRESS_JPEG,
          payload: {
            imageData,
            width,
            height,
            quality,
          } as CompressJpegPayload,
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'JPEG compression failed');
        }

        return {
          imageData: response.data.imageData,
          size: response.data.size,
          format: response.data.format,
          quality: response.data.quality,
        };
      } catch (err) {
        throw err instanceof Error ? err : new Error('JPEG compression failed');
      }
    },
    [sendMessage]
  );

  /**
   * Compress image to WebP format
   */
  const compressWebp = useCallback(
    async (imageData: Uint8Array, width: number, height: number, quality: number): Promise<CompressResult> => {
      try {
        const response = await sendMessage<any>({
          type: MessageType.COMPRESS_WEBP,
          payload: {
            imageData,
            width,
            height,
            quality,
          } as CompressWebpPayload,
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'WebP compression failed');
        }

        return {
          imageData: response.data.imageData,
          size: response.data.size,
          format: response.data.format,
          quality: response.data.quality,
        };
      } catch (err) {
        throw err instanceof Error ? err : new Error('WebP compression failed');
      }
    },
    [sendMessage]
  );

  /**
   * Compress image to target file size
   * Uses binary search to find optimal quality parameter
   */
  const compressToSize = useCallback(
    async (
      imageData: Uint8Array,
      width: number,
      height: number,
      targetSize: number,
      format: CompressionFormat
    ): Promise<CompressResult & { quality: number }> => {
      try {
        const response = await sendMessage<any>({
          type: MessageType.COMPRESS_TO_SIZE,
          payload: {
            imageData,
            width,
            height,
            targetSize,
            format,
          } as CompressToSizePayload,
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Compress to size failed');
        }

        return {
          imageData: response.data.imageData,
          size: response.data.size,
          format: response.data.format,
          quality: response.data.quality,
        };
      } catch (err) {
        throw err instanceof Error ? err : new Error('Compress to size failed');
      }
    },
    [sendMessage]
  );

  /**
   * Compress image to PNG format
   */
  const compressPng = useCallback(
    async (imageData: Uint8Array, width: number, height: number, quality: number): Promise<CompressResult> => {
      try {
        const response = await sendMessage<any>({
          type: MessageType.COMPRESS_PNG,
          payload: {
            imageData,
            width,
            height,
            quality,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'PNG compression failed');
        }

        return {
          imageData: response.data.imageData,
          size: response.data.size,
          format: response.data.format,
          quality: response.data.quality,
        };
      } catch (err) {
        throw err instanceof Error ? err : new Error('PNG compression failed');
      }
    },
    [sendMessage]
  );

  return {
    compressJpeg,
    compressWebp,
    compressPng,
    compressToSize,
    loading,
    error,
    initialized,
  };
}
