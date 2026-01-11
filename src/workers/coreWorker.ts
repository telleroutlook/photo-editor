/**
 * Core Web Worker
 * Handles communication between main thread and WASM modules
 * Processes crop, rotate, flip, and resize operations
 */

import { MessageType, WorkerMessage, WorkerResponse, generateMessageId } from '../types';
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
    const loadedModule = await import(/* @vite-ignore */ wasmUrl.href);

    // Initialize the WASM module
    await loadedModule.default();

    // Assign to global variable (NOT local variable to avoid shadowing)
    wasmModule = loadedModule as CoreWasmApi;

    console.log('✅ Core WASM module loaded successfully');
    console.log('📦 Module exports:', Object.keys(loadedModule));
    console.log('📦 CropRect class:', loadedModule.CropRect);

    initialized = true;

    sendMessage({
      id: generateMessageId(),
      type: MessageType.INIT_WORKER,
      success: true,
      data: {
        message: 'Core WASM module loaded successfully',
        moduleType: 'wasm',
        functions: Object.keys(loadedModule),
      },
      processingTime: 0,
    });
  } catch (error) {
    console.error('Failed to load Core WASM module:', error);
    sendMessage({
      id: generateMessageId(),
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

    // Convert ArrayBuffer to Uint8Array (RGBA format)
    const input = new Uint8Array(imageData);

    // Allocate output buffer
    const outputSize = cropRect.width * cropRect.height * 4; // RGBA
    const output = new Uint8Array(outputSize);

    // Call WASM function
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    // ✅ Create CropRect instance using WASM-exported class
    // After recompiling with constructor, this will work correctly
    const wasmCropRect = new (wasmModule as any).CropRect(
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height
    );

    try {
      void (await wasmModule.crop_image(
        input,
        width,
        height,
        wasmCropRect,  // Pass CropRect class instance
        output
      )); // Return value not currently used

      const processingTime = performance.now() - startTime;

      // Return Uint8Array (not ImageData) for proper serialization
      sendMessage({
        id: message.id,
        type: MessageType.CROP_IMAGE,
        success: true,
        data: { imageData: output, width: cropRect.width, height: cropRect.height },
        processingTime,
      });
    } finally {
      // Free WASM memory
      if (wasmCropRect && typeof wasmCropRect.free === 'function') {
        wasmCropRect.free();
      }
    }
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

    // Convert ArrayBuffer to Uint8Array
    const input = new Uint8Array(imageData);

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

    const processingTime = performance.now() - startTime;

    // Return Uint8Array (not ImageData) for proper serialization
    sendMessage({
      id: message.id,
      type: MessageType.ROTATE_IMAGE,
      success: true,
      data: { imageData: output, width: newWidth, height: newHeight },
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

    // Convert ArrayBuffer to Uint8Array
    const input = new Uint8Array(imageData);

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

    const processingTime = performance.now() - startTime;

    // Return Uint8Array (not ImageData) for proper serialization
    sendMessage({
      id: message.id,
      type: MessageType.FLIP_IMAGE,
      success: true,
      data: { imageData: output, width, height },
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

    // Convert ArrayBuffer to Uint8Array
    const input = new Uint8Array(imageData);

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

    const processingTime = performance.now() - startTime;

    // Return Uint8Array (not ImageData) for proper serialization
    sendMessage({
      id: message.id,
      type: MessageType.RESIZE_IMAGE,
      success: true,
      data: { imageData: output, width: newWidth, height: newHeight },
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
