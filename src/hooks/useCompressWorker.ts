/**
 * Custom hook for compression operations
 * Wraps the useWasmWorker hook with compression-specific functionality
 */

import { useCallback } from 'react';
import { useWasmWorker } from './useWasmWorker';
import { MessageType, CompressionFormat } from '../types';
import type {
  CompressJpegPayload,
  CompressWebpPayload,
  CompressToSizePayload,
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
  const { sendMessage, loading, error, initialized } = useWasmWorker({
    workerPath: new URL('../workers/compressWorker.ts', import.meta.url).href,
    autoInit: true,
  });

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

  return {
    compressJpeg,
    compressWebp,
    compressToSize,
    loading,
    error,
    initialized,
  };
}
