/**
 * Application-wide constants
 */

import { AspectRatio, CompressionFormat, ImageFormat } from '../types';

// Re-export types for convenience
export type { AspectRatio, CompressionFormat, ImageFormat };

// ============================================================================
// Aspect Ratio Presets
// ============================================================================

/**
 * Aspect ratio presets for cropping
 */
export const ASPECT_RATIOS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  [AspectRatio.FREE]: { width: 0, height: 0, label: 'Free Form' },
  [AspectRatio.SQUARE_1_1]: { width: 1, height: 1, label: '1:1 Square' },
  [AspectRatio.LANDSCAPE_4_3]: { width: 4, height: 3, label: '4:3 Landscape' },
  [AspectRatio.LANDSCAPE_16_9]: { width: 16, height: 9, label: '16:9 Widescreen' },
  [AspectRatio.PORTRAIT_9_16]: { width: 9, height: 16, label: '9:16 Portrait' },
  [AspectRatio.PORTRAIT_2_3]: { width: 2, height: 3, label: '2:3 Portrait' },
  [AspectRatio.CUSTOM]: { width: 0, height: 0, label: 'Custom' },
};

// ============================================================================
// Image Format Support
// ============================================================================

/**
 * Supported input formats
 */
export const SUPPORTED_INPUT_FORMATS: ImageFormat[] = [
  ImageFormat.JPEG,
  ImageFormat.PNG,
  ImageFormat.WEBP,
  ImageFormat.HEIC,
  ImageFormat.GIF,
  ImageFormat.BMP,
];

/**
 * MIME type to ImageFormat mapping
 */
export const MIME_TYPE_TO_FORMAT: Record<string, ImageFormat> = {
  'image/jpeg': ImageFormat.JPEG,
  'image/png': ImageFormat.PNG,
  'image/webp': ImageFormat.WEBP,
  'image/heic': ImageFormat.HEIC,
  'image/gif': ImageFormat.GIF,
  'image/bmp': ImageFormat.BMP,
  'image/tiff': ImageFormat.TIFF,
};

/**
 * Supported output formats
 */
export const SUPPORTED_OUTPUT_FORMATS: CompressionFormat[] = [
  CompressionFormat.WebP, // Recommended (best compression)
  CompressionFormat.JPEG, // Widely supported
  CompressionFormat.PNG, // Lossless
];

/**
 * Default output format
 */
export const DEFAULT_OUTPUT_FORMAT = CompressionFormat.WebP;

// ============================================================================
// File Size Limits
// ============================================================================

/**
 * Maximum file size for upload (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Maximum file size for preview (10MB)
 * Files larger than this will be downsampled for preview
 */
export const MAX_PREVIEW_SIZE = 10 * 1024 * 1024;

/**
 * Chunk size for processing large images (>10MB)
 */
export const LARGE_IMAGE_CHUNK_SIZE = 4096;

/**
 * Threshold for considering an image as "large"
 */
export const LARGE_IMAGE_THRESHOLD = 10 * 1024 * 1024;

// ============================================================================
// Image Dimensions
// ============================================================================

/**
 * Maximum preview dimension (width or height)
 * Preview images are downsampled to fit within this limit
 */
export const MAX_PREVIEW_DIMENSION = 1280;

/**
 * Thumbnail dimensions
 */
export const THUMBNAIL_WIDTH = 200;
export const THUMBNAIL_HEIGHT = 200;

/**
 * Default resize options
 */
export const DEFAULT_RESIZE_OPTIONS = {
  maxWidth: 1920, // Full HD width
  maxHeight: 1080, // Full HD height
  maintainAspectRatio: true,
  quality: 'high' as const,
};

// ============================================================================
// Compression Defaults
// ============================================================================

/**
 * Default JPEG quality (80%)
 * Balances quality and file size
 */
export const DEFAULT_JPEG_QUALITY = 80;

/**
 * Default WebP quality (80%)
 */
export const DEFAULT_WEBP_QUALITY = 0.8;

/**
 * Quality range for compression
 */
export const QUALITY_RANGE = {
  min: 50, // Minimum acceptable quality
  max: 100, // Maximum quality
  default: 80, // Default quality
};

/**
 * Compression quality presets
 */
export const COMPRESSION_PRESETS = {
  low: { quality: 50, label: 'Low Quality (Small File)' },
  medium: { quality: 70, label: 'Medium Quality' },
  high: { quality: 80, label: 'High Quality (Recommended)' },
  maximum: { quality: 95, label: 'Maximum Quality' },
};

// ============================================================================
// Background Removal Defaults
// ============================================================================

/**
 * Default color tolerance for solid color removal (0-100)
 */
export const DEFAULT_COLOR_TOLERANCE = 20;

/**
 * Default feather radius for edge softening (0-10px)
 */
export const DEFAULT_FEATHER_RADIUS = 2;

/**
 * Tolerance range for color removal
 */
export const TOLERANCE_RANGE = {
  min: 0,
  max: 100,
  default: 20,
};

/**
 * Feather radius range
 */
export const FEATHER_RANGE = {
  min: 0,
  max: 10,
  default: 2,
};

/**
 * GrabCut default iterations
 */
export const DEFAULT_GRABCUT_ITERATIONS = 5;

/**
 * GrabCut iterations range
 */
export const GRABCUT_ITERATIONS_RANGE = {
  min: 1,
  max: 10,
  default: 5,
};

// ============================================================================
// Performance & Processing
// ============================================================================

/**
 * Maximum concurrent processing tasks
 * Limited to prevent memory overflow
 */
export const MAX_CONCURRENT_TASKS = 3;

/**
 * Worker timeout (30 seconds)
 */
export const WORKER_TIMEOUT = 30000;

/**
 * Debounce delay for preview updates (milliseconds)
 */
export const PREVIEW_DEBOUNCE_DELAY = 300;

/**
 * Maximum memory usage per worker (512MB)
 */
export const MAX_WORKER_MEMORY = 512 * 1024 * 1024;

/**
 * Worker cleanup interval (30 seconds)
 */
export const WORKER_CLEANUP_INTERVAL = 30000;

// ============================================================================
// UI Defaults
// ============================================================================

/**
 * Maximum number of files that can be uploaded at once
 */
export const MAX_FILES_UPLOAD = 10;

/**
 * Maximum number of files for batch processing
 */
export const MAX_BATCH_FILES = 50;

/**
 * Default zoom level for image preview
 */
export const DEFAULT_ZOOM_LEVEL = 1.0;

/**
 * Zoom levels for image preview
 */
export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0];

/**
 * Minimum zoom level
 */
export const MIN_ZOOM_LEVEL = 0.1;

/**
 * Maximum zoom level
 */
export const MAX_ZOOM_LEVEL = 10.0;

// ============================================================================
// WASM Module Settings
// ============================================================================

/**
 * WASM module file sizes (uncompressed)
 */
export const WASM_MODULE_SIZES = {
  core: 150 * 1024, // ~150KB
  compress: 200 * 1024, // ~200KB
  bgremove: 300 * 1024, // ~300KB
  total: 650 * 1024, // ~650KB total
};

/**
 * WASM module URLs
 */
export const WASM_MODULE_URLS = {
  core: '/wasm/core.wasm',
  compress: '/wasm/compress.wasm',
  bgremove: '/wasm/bgremove.wasm',
};

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: (maxSize: number) =>
    `File size exceeds maximum allowed size of ${formatBytes(maxSize)}`,
  INVALID_FORMAT: (allowedFormats: string[]) =>
    `Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`,
  WASM_LOAD_FAILED: 'Failed to load WASM module. Please refresh the page.',
  WORKER_TIMEOUT: 'Processing timeout. Please try again.',
  OUT_OF_MEMORY: 'Out of memory. Please try a smaller image or close other tabs.',
  BROWSER_NOT_SUPPORTED: 'Your browser is not supported. Please use a modern browser.',
  SHARED_ARRAY_BUFFER_NOT_SUPPORTED:
    'SharedArrayBuffer is not supported. Performance may be degraded.',
  PROCESSING_FAILED: 'Image processing failed. Please try again.',
  BATCH_PARTIAL_FAILURE: 'Some images failed to process.',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format dimensions to string
 */
export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height}`;
}

/**
 * Calculate aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Get aspect ratio label
 */
export function getAspectRatioLabel(ratio: AspectRatio): string {
  return ASPECT_RATIOS[ratio]?.label || 'Unknown';
}
