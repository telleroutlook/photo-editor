/**
 * Custom hook for background removal operations
 * Wraps the useWasmWorker hook with background removal functionality
 */

import { useCallback } from 'react';
import { useWasmWorker } from './useWasmWorker';
import { MessageType } from '../types';

interface RemoveSolidColorResult {
  imageData: ArrayBuffer;
  width: number;
  height: number;
}

interface MagicWandResult {
  mask: ArrayBuffer;
  width: number;
  height: number;
}

interface GrabCutResult {
  mask: ArrayBuffer;
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
  const { sendMessage, loading, error, initialized } = useWasmWorker({
    workerPath: new URL('../workers/bgremoveWorker.ts', import.meta.url).href,
    autoInit: true,
  });

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
        const response = await sendMessage({
          type: MessageType.REMOVE_SOLID_COLOR,
          payload: {
            imageData,
            width,
            height,
            targetColor,
            tolerance,
            feather,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Solid color removal failed');
        }

        return response.data as RemoveSolidColorResult;
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
        const response = await sendMessage({
          type: MessageType.MAGIC_WAND_SELECT,
          payload: {
            imageData,
            width,
            height,
            seedX,
            seedY,
            tolerance,
            connected,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Magic wand selection failed');
        }

        return response.data as MagicWandResult;
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
        const response = await sendMessage({
          type: MessageType.GRABCUT_SEGMENT,
          payload: {
            imageData,
            width,
            height,
            rectX,
            rectY,
            rectWidth,
            rectHeight,
            iterations,
          },
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || 'GrabCut segmentation failed');
        }

        return response.data as GrabCutResult;
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
