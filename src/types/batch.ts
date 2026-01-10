/**
 * Batch Processing Types
 * For handling multiple image operations and ZIP export
 */

/**
 * Batch operation types
 */
export enum BatchOperation {
  CROP = 'crop',
  ROTATE = 'rotate',
  FLIP = 'flip',
  RESIZE = 'resize',
  COMPRESS = 'compress',
  REMOVE_BACKGROUND = 'remove_background',
}

/**
 * Batch operation parameters
 */
export interface BatchParams {
  operation: BatchOperation;
  params: {
    // Crop params
    cropRect?: { x: number; y: number; width: number; height: number };
    // Rotate params
    angle?: 0 | 90 | 180 | 270;
    // Flip params
    direction?: 'horizontal' | 'vertical';
    // Resize params
    width?: number;
    height?: number;
    maintainAspect?: boolean;
    // Compress params
    quality?: number;
    targetSize?: number;
    format?: 'jpeg' | 'webp' | 'png';
    // Background removal params
    method?: 'color' | 'magicwand' | 'grabcut';
    targetColor?: [number, number, number];
    tolerance?: number;
    feather?: number;
  };
}

/**
 * Batch processing status for a single image
 */
export interface BatchItemStatus {
  imageId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: {
    imageData: ArrayBuffer;
    width: number;
    height: number;
    size: number;
  };
}

/**
 * Overall batch processing status
 */
export interface BatchStatus {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  pending: number;
  progress: number; // 0-100
}

/**
 * Batch processing configuration
 */
export interface BatchConfig {
  maxConcurrent: number; // Max number of parallel processing jobs
  retryAttempts: number; // Number of retries for failed jobs
  onProgress?: (status: BatchStatus) => void;
  onComplete?: (results: BatchItemStatus[]) => void;
  onItemComplete?: (item: BatchItemStatus) => void;
  onError?: (error: Error, item: BatchItemStatus) => void;
}

/**
 * ZIP export options
 */
export interface ZipExportOptions {
  zipFileName?: string;
  compressionLevel?: number; // 0-9 (JSZip default: 6)
  includeOriginal?: boolean; // Include original images in ZIP
  comment?: string; // ZIP file comment
}

/**
 * File selection for batch processing
 */
export interface FileSelection {
  imageId: string;
  fileName: string;
  selected: boolean;
}
