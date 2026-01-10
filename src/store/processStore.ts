/**
 * Processing parameters store
 * Manages parameters for image processing operations (crop, resize, compress, etc.)
 */

import { create } from 'zustand';
import {
  CropParams,
  ResizeParams,
  RotateParams,
  CompressParams,
  RemoveBackgroundParams,
  AspectRatio,
  ResizeQuality,
  CompressionFormat,
  FlipDirection,
} from '../types';

interface ProcessState {
  // Crop parameters
  cropParams: CropParams | null;

  // Resize parameters
  resizeParams: ResizeParams | null;

  // Rotate parameters
  rotateParams: RotateParams | null;

  // Compress parameters
  compressParams: CompressParams | null;

  // Background removal parameters
  bgRemoveParams: RemoveBackgroundParams | null;

  // Actions - Crop
  setCropParams: (params: CropParams | null) => void;
  resetCropParams: () => void;

  // Actions - Resize
  setResizeParams: (params: ResizeParams | null) => void;
  resetResizeParams: () => void;

  // Actions - Rotate
  setRotateParams: (params: RotateParams | null) => void;
  resetRotateParams: () => void;

  // Actions - Compress
  setCompressParams: (params: CompressParams | null) => void;
  resetCompressParams: () => void;

  // Actions - Background Removal
  setBgRemoveParams: (params: RemoveBackgroundParams | null) => void;
  resetBgRemoveParams: () => void;

  // Reset all
  resetAllParams: () => void;
}

export const useProcessStore = create<ProcessState>((set) => ({
  // Initial state - all parameters null (not set)
  cropParams: null,
  resizeParams: null,
  rotateParams: null,
  compressParams: null,
  bgRemoveParams: null,

  /**
   * Set crop parameters
   */
  setCropParams: (params: CropParams | null) => {
    set({ cropParams: params });
  },

  /**
   * Reset crop parameters to default
   */
  resetCropParams: () => {
    set({
      cropParams: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        aspectRatio: AspectRatio.FREE,
      },
    });
  },

  /**
   * Set resize parameters
   */
  setResizeParams: (params: ResizeParams | null) => {
    set({ resizeParams: params });
  },

  /**
   * Reset resize parameters to default smart mode
   */
  resetResizeParams: () => {
    set({
      resizeParams: {
        mode: 'smart',
        maxWidth: 1920,
        maxHeight: 1080,
        maintainAspectRatio: true,
        quality: ResizeQuality.High,
      },
    });
  },

  /**
   * Set rotate parameters
   */
  setRotateParams: (params: RotateParams | null) => {
    set({ rotateParams: params });
  },

  /**
   * Reset rotate parameters to default
   */
  resetRotateParams: () => {
    set({
      rotateParams: {
        angle: 0,
        autoFixEXIF: true,
      },
    });
  },

  /**
   * Set compress parameters
   */
  setCompressParams: (params: CompressParams | null) => {
    set({ compressParams: params });
  },

  /**
   * Reset compress parameters to default quality mode
   */
  resetCompressParams: () => {
    set({
      compressParams: {
        mode: 'quality',
        quality: 80,
        format: CompressionFormat.WebP,
      },
    });
  },

  /**
   * Set background removal parameters
   */
  setBgRemoveParams: (params: RemoveBackgroundParams | null) => {
    set({ bgRemoveParams: params });
  },

  /**
   * Reset background removal parameters to default solid color mode
   */
  resetBgRemoveParams: () => {
    set({
      bgRemoveParams: {
        method: 'solid_color',
        solidColor: {
          targetColor: [255, 255, 255], // White background
          tolerance: 20,
          feather: 2,
        },
      },
    });
  },

  /**
   * Reset all processing parameters to their defaults
   */
  resetAllParams: () => {
    set({
      cropParams: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        aspectRatio: AspectRatio.FREE,
      },
      resizeParams: {
        mode: 'smart',
        maxWidth: 1920,
        maxHeight: 1080,
        maintainAspectRatio: true,
        quality: ResizeQuality.High,
      },
      rotateParams: {
        angle: 0,
        autoFixEXIF: true,
      },
      compressParams: {
        mode: 'quality',
        quality: 80,
        format: CompressionFormat.WebP,
      },
      bgRemoveParams: {
        method: 'solid_color',
        solidColor: {
          targetColor: [255, 255, 255],
          tolerance: 20,
          feather: 2,
        },
      },
    });
  },
}));
