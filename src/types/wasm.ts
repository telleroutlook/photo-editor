/**
 * WebAssembly module interface definitions
 */

/**
 * Crop rectangle for image cropping
 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Rotation angle enum
 */
export enum RotateAngle {
  Degree0 = 0,
  Degree90 = 90,
  Degree180 = 180,
  Degree270 = 270,
}

/**
 * Flip direction enum
 */
export enum FlipDirection {
  Horizontal = 0,
  Vertical = 1,
}

/**
 * Resize quality enum
 */
export enum ResizeQuality {
  Fast = 0, // Bilinear interpolation
  High = 1, // Bicubic interpolation
}

/**
 * Compression format enum
 */
export enum CompressionFormat {
  JPEG = 'jpeg',
  WebP = 'webp',
  PNG = 'png',
}

// ============================================================================
// CORE WASM Module Interface (~150KB)
// Functions: crop, rotate, flip, resize
// ============================================================================

/**
 * Core WASM module API
 * Provides basic image manipulation functions
 */
export interface CoreWasmApi {
  /**
   * Crop image to specified rectangle
   * @param input - Input image data (RGBA format, 4 bytes per pixel)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param cropRect - Crop rectangle {x, y, width, height}
   * @param output - Output buffer (must be pre-allocated)
   * @returns Number of bytes written to output
   */
  crop_image: (
    input: Uint8Array,
    width: number,
    height: number,
    cropRect: CropRect,
    output: Uint8Array
  ) => Promise<number>;

  /**
   * Rotate image by specified angle
   * @param input - Input image data (RGBA format)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param angle - Rotation angle (0, 90, 180, 270)
   * @param output - Output buffer (must be pre-allocated)
   * @returns Number of bytes written to output
   */
  rotate_image: (
    input: Uint8Array,
    width: number,
    height: number,
    angle: RotateAngle,
    output: Uint8Array
  ) => Promise<number>;

  /**
   * Flip image horizontally or vertically
   * @param input - Input image data (RGBA format)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param direction - Flip direction (0=horizontal, 1=vertical)
   * @param output - Output buffer (must be pre-allocated)
   * @returns Number of bytes written to output
   */
  flip_image: (
    input: Uint8Array,
    width: number,
    height: number,
    direction: FlipDirection,
    output: Uint8Array
  ) => Promise<number>;

  /**
   * Resize image to new dimensions
   * @param input - Input image data (RGBA format)
   * @param width - Original width in pixels
   * @param height - Original height in pixels
   * @param newWidth - Target width in pixels
   * @param newHeight - Target height in pixels
   * @param quality - Resize quality (0=fast/bilinear, 1=high/bicubic)
   * @param output - Output buffer (must be pre-allocated)
   * @returns Number of bytes written to output
   */
  resize_image: (
    input: Uint8Array,
    width: number,
    height: number,
    newWidth: number,
    newHeight: number,
    quality: ResizeQuality,
    output: Uint8Array
  ) => Promise<number>;
}

// ============================================================================
// COMPRESS WASM Module Interface (~200KB)
// Functions: JPEG compression, WebP compression, target size optimization
// ============================================================================

/**
 * Compress WASM module API
 * Provides high-quality image compression functions
 */
export interface CompressWasmApi {
  /**
   * Compress image as JPEG
   * @param input - Input image data (RGBA format)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param quality - JPEG quality (1-100)
   * @param output - Output buffer for JPEG data
   * @returns Number of bytes written to output
   */
  compress_jpeg: (
    input: Uint8Array,
    width: number,
    height: number,
    quality: number,
    output: Uint8Array
  ) => Promise<number>;

  /**
   * Compress image as WebP
   * @param input - Input image data (RGBA format)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param quality - WebP quality (0.0-1.0)
   * @param output - Output buffer for WebP data
   * @returns Number of bytes written to output
   */
  compress_webp: (
    input: Uint8Array,
    width: number,
    height: number,
    quality: number,
    output: Uint8Array
  ) => Promise<number>;

  /**
   * Compress image to target file size using binary search
   * @param input - Input image data (RGBA format)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param targetSize - Target file size in bytes
   * @param format - Compression format (JPEG/WebP)
   * @param output - Output buffer for compressed data
   * @returns Object with actual size and quality used
   */
  compress_to_size: (
    input: Uint8Array,
    width: number,
    height: number,
    targetSize: number,
    format: CompressionFormat,
    output: Uint8Array
  ) => Promise<{ size: number; quality: number }>;
}

// ============================================================================
// BGREMOVE WASM Module Interface (~300KB)
// Functions: Solid color removal, Magic Wand, GrabCut
// ============================================================================

/**
 * BgRemove WASM module API
 * Provides background removal algorithms
 */
export interface BgRemoveWasmApi {
  /**
   * Remove solid color background
   * @param input - Input image data (RGBA format)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param targetColor - Target RGB color [R, G, B]
   * @param tolerance - Color tolerance (0-100)
   * @param feather - Edge feather radius (0-10px)
   * @param output - Output buffer (must be pre-allocated)
   * @returns Number of bytes written to output
   */
  remove_solid_color: (
    input: Uint8Array,
    width: number,
    height: number,
    targetColor: [number, number, number],
    tolerance: number,
    feather: number,
    output: Uint8Array
  ) => Promise<number>;

  /**
   * Magic wand selection (flood fill)
   * @param input - Input image data (RGBA format)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param seedX - Seed point X coordinate
   * @param seedY - Seed point Y coordinate
   * @param tolerance - Color tolerance (0-100)
   * @param connected - Only select connected region
   * @param maskOutput - Output mask buffer (1 byte per pixel)
   * @returns Number of bytes written to mask
   */
  magic_wand_select: (
    input: Uint8Array,
    width: number,
    height: number,
    seedX: number,
    seedY: number,
    tolerance: number,
    connected: boolean,
    maskOutput: Uint8Array
  ) => Promise<number>;

  /**
   * GrabCut semi-automatic segmentation
   * @param input - Input image data (RGBA format)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param rectX - Initial bounding rectangle X coordinate
   * @param rectY - Initial bounding rectangle Y coordinate
   * @param rectWidth - Initial bounding rectangle width
   * @param rectHeight - Initial bounding rectangle height
   * @param iterations - Number of iterations (default: 5)
   * @param maskOutput - Output mask buffer (1 byte per pixel)
   * @returns Number of bytes written to mask output
   */
  grabcut_segment: (
    input: Uint8Array,
    width: number,
    height: number,
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number,
    iterations: number,
    maskOutput: Uint8Array
  ) => Promise<number>;
}

// ============================================================================
// WASM Module Loading
// ============================================================================

/**
 * WASM module loader interface
 */
export interface WasmModuleLoader<T> {
  init(): Promise<T>;
  cleanup(): void;
  isLoaded(): boolean;
}

/**
 * Mock WASM implementation for development
 * Used when actual WASM modules are not yet available
 */
export interface MockWasmModule {
  crop_image: CoreWasmApi['crop_image'];
  rotate_image: CoreWasmApi['rotate_image'];
  flip_image: CoreWasmApi['flip_image'];
  resize_image: CoreWasmApi['resize_image'];
}

/**
 * Create a mock WASM implementation for testing
 */
export function createMockWasmModule(): MockWasmModule {
  return {
    crop_image: async (
      input: Uint8Array,
      width: number,
      height: number,
      cropRect: CropRect,
      output: Uint8Array
    ): Promise<number> => {
      // Mock implementation - just copy data
      const cropSize = cropRect.width * cropRect.height * 4;
      output.set(input.slice(0, cropSize));
      return cropSize;
    },

    rotate_image: async (
      input: Uint8Array,
      width: number,
      height: number,
      angle: RotateAngle,
      output: Uint8Array
    ): Promise<number> => {
      // Mock implementation
      output.set(input);
      return input.length;
    },

    flip_image: async (
      input: Uint8Array,
      width: number,
      height: number,
      direction: FlipDirection,
      output: Uint8Array
    ): Promise<number> => {
      // Mock implementation
      output.set(input);
      return input.length;
    },

    resize_image: async (
      input: Uint8Array,
      width: number,
      height: number,
      newWidth: number,
      newHeight: number,
      quality: ResizeQuality,
      output: Uint8Array
    ): Promise<number> => {
      // Mock implementation
      const newSize = newWidth * newHeight * 4;
      output.set(input.slice(0, newSize));
      return newSize;
    },
  };
}
