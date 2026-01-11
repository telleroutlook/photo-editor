/**
 * Core Web Worker
 * Handles communication between main thread and WASM modules
 * Processes crop, rotate, flip, and resize operations
 */

import { MessageType, WorkerMessage, WorkerResponse } from '../types';
import type { CoreWasmApi } from '../types';

// Worker state
let wasmModule: CoreWasmApi | null = null;
let initialized = false;

/**
 * Initialize WASM module
 */
async function initWasm(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    console.log('🔄 Loading Core WASM module...');

    // Dynamically import the compiled WASM module
    const wasmUrl = new URL('/wasm/core/photo_editor_core.js', import.meta.url);
    const wasmModule = await import(wasmUrl.href);

    // Initialize the WASM module
    await wasmModule.default();

    console.log('✅ Core WASM module loaded successfully');
    console.log('📦 Module exports:', Object.keys(wasmModule));

    initialized = true;

    sendMessage({
      id: generateId(),
      type: MessageType.INIT_WORKER,
      success: true,
      data: {
        message: 'Core WASM module loaded successfully',
        moduleType: 'wasm',
        functions: Object.keys(wasmModule),
      },
      processingTime: 0,
    });
  } catch (error) {
    console.error('❌ Failed to load Core WASM module:', error);
    sendMessage({
      id: generateId(),
      type: MessageType.INIT_WORKER,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: 0,
    });
  }
}

/**
 * Handle crop image operation
 */
async function handleCropImage(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    const { imageData, width, height, cropRect } = message.payload;

    // Validate inputs
    if (!imageData || !width || !height || !cropRect) {
      throw new Error('Missing required parameters for crop');
    }

    // Convert ImageData to Uint8Array (RGBA format)
    const input = new Uint8Array(imageData.data);

    // Allocate output buffer
    const outputSize = cropRect.width * cropRect.height * 4; // RGBA
    const output = new Uint8Array(outputSize);

    // Call WASM function
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    const bytesWritten = await wasmModule.crop_image(
      input,
      width,
      height,
      cropRect,
      output
    );

    // Create new ImageData from output
    const newImageData = new ImageData(
      new Uint8ClampedArray(output),
      cropRect.width,
      cropRect.height
    );

    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.CROP_IMAGE,
      success: true,
      data: { imageData: newImageData, width: cropRect.width, height: cropRect.height },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.CROP_IMAGE,
      success: false,
      error: error instanceof Error ? error.message : 'Crop operation failed',
      processingTime,
    });
  }
}

/**
 * Handle rotate image operation
 */
async function handleRotateImage(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    const { imageData, width, height, angle } = message.payload;

    // Validate inputs
    if (!imageData || !width || !height || angle === undefined) {
      throw new Error('Missing required parameters for rotate');
    }

    // Convert ImageData to Uint8Array
    const input = new Uint8Array(imageData.data);

    // Calculate new dimensions after rotation
    let newWidth = width;
    let newHeight = height;

    if (angle === 90 || angle === 270) {
      newWidth = height;
      newHeight = width;
    }

    // Allocate output buffer
    const outputSize = newWidth * newHeight * 4;
    const output = new Uint8Array(outputSize);

    // Call WASM function
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    await wasmModule.rotate_image(
      input,
      width,
      height,
      angle,
      output
    );

    // Create new ImageData
    const newImageData = new ImageData(
      new Uint8ClampedArray(output),
      newWidth,
      newHeight
    );

    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.ROTATE_IMAGE,
      success: true,
      data: { imageData: newImageData, width: newWidth, height: newHeight },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.ROTATE_IMAGE,
      success: false,
      error: error instanceof Error ? error.message : 'Rotate operation failed',
      processingTime,
    });
  }
}

/**
 * Handle flip image operation
 */
async function handleFlipImage(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    const { imageData, width, height, direction } = message.payload;

    // Validate inputs
    if (!imageData || !width || !height || !direction) {
      throw new Error('Missing required parameters for flip');
    }

    // Convert ImageData to Uint8Array
    const input = new Uint8Array(imageData.data);

    // Allocate output buffer
    const outputSize = width * height * 4;
    const output = new Uint8Array(outputSize);

    // Call WASM function
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    await wasmModule.flip_image(
      input,
      width,
      height,
      direction,
      output
    );

    // Create new ImageData
    const newImageData = new ImageData(
      new Uint8ClampedArray(output),
      width,
      height
    );

    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.FLIP_IMAGE,
      success: true,
      data: { imageData: newImageData, width, height },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.FLIP_IMAGE,
      success: false,
      error: error instanceof Error ? error.message : 'Flip operation failed',
      processingTime,
    });
  }
}

/**
 * Handle resize image operation
 */
async function handleResizeImage(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    const { imageData, width, height, newWidth, newHeight, quality } = message.payload;

    // Validate inputs
    if (!imageData || !width || !height || !newWidth || !newHeight || !quality) {
      throw new Error('Missing required parameters for resize');
    }

    // Convert ImageData to Uint8Array
    const input = new Uint8Array(imageData.data);

    // Allocate output buffer
    const outputSize = newWidth * newHeight * 4;
    const output = new Uint8Array(outputSize);

    // Call WASM function
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    await wasmModule.resize_image(
      input,
      width,
      height,
      newWidth,
      newHeight,
      quality,
      output
    );

    // Create new ImageData
    const newImageData = new ImageData(
      new Uint8ClampedArray(output),
      newWidth,
      newHeight
    );

    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.RESIZE_IMAGE,
      success: true,
      data: { imageData: newImageData, width: newWidth, height: newHeight },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.RESIZE_IMAGE,
      success: false,
      error: error instanceof Error ? error.message : 'Resize operation failed',
      processingTime,
    });
  }
}

/**
 * Send message back to main thread
 */
function sendMessage(response: WorkerResponse): void {
  self.postMessage(response);
}

/**
 * Generate unique message ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case MessageType.INIT_WORKER:
      await initWasm();
      break;

    case MessageType.CROP_IMAGE:
      await handleCropImage(message);
      break;

    case MessageType.ROTATE_IMAGE:
      await handleRotateImage(message);
      break;

    case MessageType.FLIP_IMAGE:
      await handleFlipImage(message);
      break;

    case MessageType.RESIZE_IMAGE:
      await handleResizeImage(message);
      break;

    case MessageType.TERMINATE_WORKER:
      // Cleanup before terminating
      wasmModule = null;
      initialized = false;
      self.close();
      break;

    default:
      sendMessage({
        id: message.id,
        type: message.type,
        success: false,
        error: `Unknown message type: ${message.type}`,
        processingTime: 0,
      });
  }
};

// Export for TypeScript
export {};
