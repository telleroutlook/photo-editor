/**
 * Image-related type definitions
 */

// Import types from wasm.ts
import { ResizeQuality, FlipDirection, CompressionFormat } from './wasm';

// Re-export for convenience
export { ResizeQuality, FlipDirection, CompressionFormat };

/**
 * Represents a single image file and its metadata
 */
export interface ImageFile {
  id: string;
  file: File;
  url: string; // Blob URL or data URL
  width: number;
  height: number;
  size: number; // File size in bytes
  format: ImageFormat;
  exif?: EXIFData;
  data?: Uint8Array; // Raw image data (lazy-loaded when needed)
  fileName: string; // Original file name
}

/**
 * Supported image formats
 */
export enum ImageFormat {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  HEIC = 'image/heic',
  GIF = 'image/gif',
  BMP = 'image/bmp',
  TIFF = 'image/tiff',
}

/**
 * EXIF metadata
 */
export interface EXIFData {
  orientation?: number; // 1-8
  datetime?: string;
  make?: string;
  model?: string;
  gps?: GPSData;
}

/**
 * GPS coordinates from EXIF
 */
export interface GPSData {
  latitude: number;
  longitude: number;
  altitude?: number;
}

/**
 * Processed image result
 */
export interface ProcessedImage extends ImageFile {
  processedUrl: string;
  processedBlob: Blob;
  operations: Operation[];
  metadata: ProcessingMetadata;
}

/**
 * Processing metadata
 */
export interface ProcessingMetadata {
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  processingTime: number; // milliseconds
  timestamp: number;
}

/**
 * Image operation type
 */
export enum OperationType {
  CROP = 'crop',
  RESIZE = 'resize',
  ROTATE = 'rotate',
  FLIP = 'flip',
  COMPRESS = 'compress',
  CONVERT_FORMAT = 'convert_format',
  REMOVE_BACKGROUND = 'remove_background',
}

/**
 * Base operation interface
 */
export interface Operation {
  type: OperationType;
  timestamp: number;
}

/**
 * Crop operation parameters
 */
export interface CropOperation extends Operation {
  type: OperationType.CROP;
  params: CropParams;
}

export interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: AspectRatio;
}

/**
 * Aspect ratio preset
 */
export enum AspectRatio {
  FREE = 'free',
  SQUARE_1_1 = '1:1',
  LANDSCAPE_4_3 = '4:3',
  LANDSCAPE_16_9 = '16:9',
  PORTRAIT_9_16 = '9:16',
  PORTRAIT_2_3 = '2:3',
  CUSTOM = 'custom',
}

/**
 * Resize operation parameters
 */
export interface ResizeOperation extends Operation {
  type: OperationType.RESIZE;
  params: ResizeParams;
}

export interface ResizeParams {
  mode: 'smart' | 'precise';
  maxWidth?: number;
  maxHeight?: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  quality: ResizeQuality;
}

/**
 * Rotate operation parameters
 */
export interface RotateOperation extends Operation {
  type: OperationType.ROTATE;
  params: RotateParams;
}

export interface RotateParams {
  angle: 0 | 90 | 180 | 270;
  autoFixEXIF: boolean;
}

/**
 * Flip operation parameters
 */
export interface FlipOperation extends Operation {
  type: OperationType.FLIP;
  params: FlipParams;
}

export interface FlipParams {
  direction: FlipDirection;
}

/**
 * Compression operation parameters
 */
export interface CompressOperation extends Operation {
  type: OperationType.COMPRESS;
  params: CompressParams;
}

export interface CompressParams {
  mode: 'quality' | 'target_size';
  quality?: number; // 1-100
  targetSize?: number; // Target file size in bytes
  format: CompressionFormat;
}

/**
 * Format conversion operation parameters
 */
export interface ConvertFormatOperation extends Operation {
  type: OperationType.CONVERT_FORMAT;
  params: ConvertFormatParams;
}

export interface ConvertFormatParams {
  targetFormat: CompressionFormat;
  quality?: number; // For lossy formats
}

/**
 * Background removal operation parameters
 */
export interface RemoveBackgroundOperation extends Operation {
  type: OperationType.REMOVE_BACKGROUND;
  params: RemoveBackgroundParams;
}

export interface RemoveBackgroundParams {
  method: 'solid_color' | 'magic_wand' | 'grabcut';
  solidColor?: {
    targetColor: [number, number, number]; // RGB
    tolerance: number; // 0-100
    feather: number; // 0-10px
  };
  magicWand?: {
    seedX: number;
    seedY: number;
    tolerance: number;
    connected: boolean;
  };
  grabCut?: {
    foregroundMask: Uint8Array;
    backgroundMask: Uint8Array;
    iterations: number;
  };
}

/**
 * Union type for all operations
 */
export type AnyOperation =
  | CropOperation
  | ResizeOperation
  | RotateOperation
  | FlipOperation
  | CompressOperation
  | ConvertFormatOperation
  | RemoveBackgroundOperation;

/**
 * Processing queue item
 */
export interface ProcessingQueueItem {
  imageId: string;
  operations: AnyOperation[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: ProcessedImage;
}

/**
 * Batch processing options
 */
export interface BatchProcessingOptions {
  maxConcurrency: number; // Maximum parallel processing (default: 3)
  retryFailed: boolean; // Retry failed items (default: false)
  retryAttempts: number; // Number of retry attempts (default: 1)
  onProgress?: (current: number, total: number) => void;
  onComplete?: (results: ProcessedImage[]) => void;
  onError?: (error: Error, imageId: string) => void;
}

