/**
 * Batch Processing Worker
 * Handles concurrent processing of multiple images with queue management
 */

import { expose } from 'comlink';
import type { BatchParams, BatchItemStatus } from '../types/batch';

/**
 * Batch task item for queue processing
 */
interface BatchTask {
  imageId: string;
  imageData: Uint8Array;
  width: number;
  height: number;
  fileName: string;
}

/**
 * Queue item structure
 */
interface QueueItem {
  id: string;
  task: BatchTask;
}

/**
 * Crop operation parameters
 */
interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Rotate operation parameters
 */
interface RotateParams {
  angle: 0 | 90 | 180 | 270;
}

/**
 * Flip operation parameters
 */
interface FlipParams {
  direction: 'horizontal' | 'vertical';
}

/**
 * Resize operation parameters
 */
interface ResizeParams {
  width: number;
  height: number;
  quality: 'fast' | 'high';
}

/**
 * Compress operation parameters
 */
interface CompressParams {
  format: 'jpeg' | 'webp' | 'png';
  quality: number;
}

/**
 * Background remove operation parameters
 */
interface BgRemoveParams {
  method: 'color' | 'magicwand' | 'grabcut';
  tolerance?: number;
}

// Worker state with proper typing
const state = {
  initialized: false,
  processing: false,
  queue: [] as QueueItem[],
  activeJobs: new Map<string, Promise<BatchItemStatus>>(),
  maxConcurrent: 3, // Max 3 parallel jobs
  completedJobs: 0,
  failedJobs: 0,
};

/**
 * Initialize batch worker
 */
async function init(maxConcurrent: number = 3): Promise<void> {
  state.maxConcurrent = maxConcurrent;
  state.initialized = true;
  console.log(`[BatchWorker] Initialized with maxConcurrent=${maxConcurrent}`);
}

/**
 * Process single image with batch parameters
 */
async function processImage(
  imageId: string,
  imageData: Uint8Array,
  width: number,
  height: number,
  batchParams: BatchParams
): Promise<BatchItemStatus> {
  const startTime = performance.now();

  try {
    let result: ArrayBuffer;
    let resultWidth = width;
    let resultHeight = height;

    // Route to appropriate processing function based on operation
    switch (batchParams.operation) {
      case 'crop': {
        // Extract crop params with validation
        const { cropRect } = batchParams.params;
        if (!cropRect) {
          throw new Error('Crop operation requires cropRect parameter');
        }
        result = await processCrop(imageData, width, height, cropRect);
        break;
      }

      case 'rotate': {
        // Extract rotate params with validation
        const angle = batchParams.params.angle ?? 0;
        result = await processRotate(imageData, width, height, { angle });
        // Rotation may change dimensions
        if (angle === 90 || angle === 270) {
          resultWidth = height;
          resultHeight = width;
        }
        break;
      }

      case 'flip': {
        // Extract flip params with validation
        const direction = batchParams.params.direction ?? 'horizontal';
        result = await processFlip(imageData, width, height, { direction });
        break;
      }

      case 'resize': {
        // Extract resize params with validation
        const resizeWidth = batchParams.params.width;
        const resizeHeight = batchParams.params.height;
        if (!resizeWidth || !resizeHeight) {
          throw new Error('Resize operation requires width and height parameters');
        }
        const resizeResult = await processResize(imageData, width, height, {
          width: resizeWidth,
          height: resizeHeight,
          quality: 'high',
        });
        result = resizeResult.imageData;
        resultWidth = resizeResult.width;
        resultHeight = resizeResult.height;
        break;
      }

      case 'compress': {
        // Extract compress params with validation
        const format = batchParams.params.format ?? 'webp';
        const quality = batchParams.params.quality ?? 80;
        const compressResult = await processCompress(imageData, width, height, { format, quality });
        result = compressResult;
        break;
      }

      case 'remove_background': {
        // Extract bgremove params with validation
        const method = batchParams.params.method ?? 'color';
        const tolerance = batchParams.params.tolerance;
        const bgRemoveResult = await processBgRemove(imageData, width, height, { method, tolerance });
        result = bgRemoveResult;
        break;
      }

      default:
        throw new Error(`Unknown operation: ${batchParams.operation}`);
    }

    void (performance.now() - startTime); // Processing time calculated but not currently used

    return {
      imageId,
      fileName: `image_${imageId}`, // Will be provided by caller
      status: 'completed',
      progress: 100,
      result: {
        imageData: result,
        width: resultWidth,
        height: resultHeight,
        size: result.byteLength,
      },
    };
  } catch (error) {
    console.error(`[BatchWorker] Error processing image ${imageId}:`, error);
    return {
      imageId,
      fileName: `image_${imageId}`,
      status: 'failed',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process multiple images with concurrency control
 */
async function processBatch(
  tasks: Array<{
    imageId: string;
    imageData: Uint8Array;
    width: number;
    height: number;
    fileName: string;
  }>,
  batchParams: BatchParams,
  onProgress?: (progress: number, completed: number, total: number) => void
): Promise<BatchItemStatus[]> {
  if (!state.initialized) {
    await init();
  }

  state.processing = true;
  state.completedJobs = 0;
  state.failedJobs = 0;
  state.queue = tasks.map((task) => ({ id: task.imageId, task }));
  state.activeJobs.clear();

  const results: BatchItemStatus[] = [];
  const total = tasks.length;

  console.log(`[BatchWorker] Starting batch processing: ${total} images, maxConcurrent=${state.maxConcurrent}`);

  // Process queue with concurrency control
  await processQueue(onProgress, total, batchParams, results);

  state.processing = false;

  console.log(`[BatchWorker] Batch complete: ${state.completedJobs} succeeded, ${state.failedJobs} failed`);

  return results;
}

/**
 * Process queue with concurrency control
 */
async function processQueue(
  onProgress: ((progress: number, completed: number, total: number) => void) | undefined,
  total: number,
  batchParams: BatchParams,
  results: BatchItemStatus[]
): Promise<void> {
  // Helper to update progress
  const updateProgress = () => {
    if (onProgress) {
      const completed = state.completedJobs + state.failedJobs;
      const progress = Math.round((completed / total) * 100);
      onProgress(progress, completed, total);
    }
  };

  // Process next job in queue
  const processNext = async (): Promise<void> => {
    // If queue is empty or we've reached concurrency limit, wait
    if (state.queue.length === 0 || state.activeJobs.size >= state.maxConcurrent) {
      return;
    }

    // Get next task from queue
    const { id, task } = state.queue.shift()!;
    const job = processImage(task.imageId, task.imageData, task.width, task.height, batchParams);

    // Add to active jobs
    state.activeJobs.set(id, job);

    // Wait for job completion
    try {
      const result = await job;
      results.push({ ...result, fileName: task.fileName });

      if (result.status === 'completed') {
        state.completedJobs++;
      } else {
        state.failedJobs++;
      }

      updateProgress();
    } finally {
      // Remove from active jobs
      state.activeJobs.delete(id);

      // Process next job
      await processNext();
    }
  };

  // Start initial batch of jobs
  const initialJobs = Math.min(state.maxConcurrent, state.queue.length);
  const workers = Array(initialJobs).fill(null).map(() => processNext());

  // Wait for all jobs to complete
  await Promise.all(workers);

  // If there are still active jobs (shouldn't happen), wait for them
  while (state.activeJobs.size > 0) {
    await Promise.all(Array.from(state.activeJobs.values()));
  }
}

/**
 * Cancel batch processing
 */
function cancelBatch(): void {
  console.log('[BatchWorker] Cancelling batch processing');
  state.queue = [];
  state.activeJobs.clear();
  state.processing = false;
}

/**
 * Get current processing status
 */
function getStatus(): {
  processing: boolean;
  queueLength: number;
  activeJobs: number;
  completed: number;
  failed: number;
} {
  return {
    processing: state.processing,
    queueLength: state.queue.length,
    activeJobs: state.activeJobs.size,
    completed: state.completedJobs,
    failed: state.failedJobs,
  };
}

// Stub functions for actual processing (will be implemented with dedicated workers)
async function processCrop(_imageData: Uint8Array, _width: number, _height: number, _params: CropParams): Promise<ArrayBuffer> {
  // TODO: Call core worker
  throw new Error('Not implemented - will integrate with core worker');
}

async function processRotate(_imageData: Uint8Array, _width: number, _height: number, _params: RotateParams): Promise<ArrayBuffer> {
  // TODO: Call core worker
  throw new Error('Not implemented - will integrate with core worker');
}

async function processFlip(_imageData: Uint8Array, _width: number, _height: number, _params: FlipParams): Promise<ArrayBuffer> {
  // TODO: Call core worker
  throw new Error('Not implemented - will integrate with core worker');
}

async function processResize(
  _imageData: Uint8Array,
  _width: number,
  _height: number,
  _params: ResizeParams
): Promise<{ imageData: ArrayBuffer; width: number; height: number }> {
  // TODO: Call core worker
  throw new Error('Not implemented - will integrate with core worker');
}

async function processCompress(_imageData: Uint8Array, _width: number, _height: number, _params: CompressParams): Promise<ArrayBuffer> {
  // TODO: Call compress worker
  throw new Error('Not implemented - will integrate with compress worker');
}

async function processBgRemove(_imageData: Uint8Array, _width: number, _height: number, _params: BgRemoveParams): Promise<ArrayBuffer> {
  // TODO: Call bgremove worker
  throw new Error('Not implemented - will integrate with bgremove worker');
}

// Expose functions using Comlink
const workerApi = {
  init,
  processBatch,
  cancelBatch,
  getStatus,
};

expose(workerApi);

// Export explicit type for Comlink
export type BatchWorkerApi = typeof workerApi;
