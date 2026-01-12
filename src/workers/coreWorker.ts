/**
 * Core Web Worker
 * Handles communication between main thread and WASM modules
 * Processes crop, rotate, flip, and resize operations
 */

import {
  MessageType,
  WorkerMessage,
  WorkerResponse,
  generateMessageId,
  CropImagePayload,
  RotateImagePayload,
  FlipImagePayload,
  ResizeImagePayload,
} from '../types';
import type { CoreWasmApi } from '../types';

// Worker state
let wasmModule: CoreWasmApi | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize WASM module
 */
async function initWasm(): Promise<void> {
  if (initialized) {
    return;
  }

  // ✅ If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  // ✅ Create initialization promise
  initPromise = (async () => {
    try {
      console.log('🔄 [Worker] Loading Core WASM module...');

      // Dynamically import the compiled WASM module
      const wasmUrl = new URL('/wasm/core/photo_editor_core.js', import.meta.url);
      const loadedModule = await import(/* @vite-ignore */ wasmUrl.href);

      // Initialize the WASM module
      await loadedModule.default();

      // Assign to global variable (NOT local variable to avoid shadowing)
      wasmModule = loadedModule as CoreWasmApi;

      console.log('✅ [Worker] Core WASM module loaded successfully');
      console.log('📦 [Worker] Module exports:', Object.keys(loadedModule));
      console.log('📦 [Worker] CropRect class:', loadedModule.CropRect);

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
      console.error('❌ [Worker] Failed to load Core WASM module:', error);
      sendMessage({
        id: generateMessageId(),
        type: MessageType.INIT_WORKER,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: 0,
      });
      throw error;
    } finally {
      // ✅ Clear promise after completion (success or failure)
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Handle crop image operation
 */
async function handleCropImage(message: WorkerMessage<CropImagePayload>): Promise<void> {
  const startTime = performance.now();

  try {
    // ✅ Wait for WASM initialization to complete
    await initWasm();

    // ✅ Double-check initialization state
    if (!initialized || !wasmModule) {
      throw new Error('WASM module not initialized. Please wait for initialization to complete.');
    }

    const { imageData, width, height, cropRect } = message.payload;

    // Validate inputs with detailed error messages
    if (!imageData) {
      throw new Error('Missing imageData parameter');
    }
    if (!width || typeof width !== 'number') {
      throw new Error(`Invalid width parameter: ${width}`);
    }
    if (!height || typeof height !== 'number') {
      throw new Error(`Invalid height parameter: ${height}`);
    }
    if (!cropRect) {
      throw new Error('Missing cropRect parameter');
    }

    // Validate cropRect dimensions
    const { x, y, width: cropWidth, height: cropHeight } = cropRect;
    if (typeof x !== 'number' || typeof y !== 'number' ||
        typeof cropWidth !== 'number' || typeof cropHeight !== 'number') {
      throw new Error(`Invalid cropRect: {x: ${x}, y: ${y}, width: ${cropWidth}, height: ${cropHeight}}`);
    }

    if (cropWidth <= 0 || cropHeight <= 0) {
      throw new Error(`Crop dimensions must be positive: width=${cropWidth}, height=${cropHeight}`);
    }

    if (x >= width || y >= height) {
      throw new Error(`Crop position out of bounds: x=${x} (max ${width - 1}), y=${y} (max ${height - 1})`);
    }

    if (x + cropWidth > width || y + cropHeight > height) {
      throw new Error(`Crop extends beyond image: ${x}+${cropWidth} > ${width} or ${y}+${cropHeight} > ${height}`);
    }

    // Convert ArrayBuffer to Uint8Array (RGBA format)
    // ✅ Create a fresh copy to avoid any ArrayBuffer reference issues
    const tempInput = new Uint8Array(imageData);
    const input = new Uint8Array(tempInput.length);
    input.set(tempInput);

    // Allocate output buffer
    // ✅ Create a fresh buffer to ensure it's properly allocated
    const outputSize = cropWidth * cropHeight * 4; // RGBA
    const output = new Uint8Array(outputSize);
    // Zero-initialize to ensure clean memory
    output.fill(0);

    // Call WASM function
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    // Create CropRect instance using WASM-exported class (type-safe)
    const wasmCropRect = new wasmModule.CropRect(
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height
    );

    try {
      console.log('🔧 [Worker] Calling crop_image WASM function...');

      // ✅ Call WASM function and properly handle Result return type
      const result = await wasmModule.crop_image(
        input,
        Number(width),
        Number(height),
        wasmCropRect,  // Pass CropRect class instance
        output
      );

      console.log('✅ [Worker] crop_image completed successfully, result:', result);

      const processingTime = performance.now() - startTime;

      // Return Uint8Array (not ImageData) for proper serialization
      sendMessage({
        id: message.id,
        type: MessageType.CROP_IMAGE,
        success: true,
        data: { imageData: output, width: cropWidth, height: cropHeight },
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
async function handleRotateImage(message: WorkerMessage<RotateImagePayload>): Promise<void> {
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
async function handleFlipImage(message: WorkerMessage<FlipImagePayload>): Promise<void> {
  const startTime = performance.now();

  try {
    const { imageData, width, height, direction } = message.payload;

    // Validate inputs - use explicit undefined check since direction can be 0 (Horizontal)
    if (!imageData || !width || !height || direction === undefined) {
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
async function handleResizeImage(message: WorkerMessage<ResizeImagePayload>): Promise<void> {
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
self.onmessage = async (event: MessageEvent<WorkerMessage<unknown>>) => {
  const message = event.data;

  switch (message.type) {
    case MessageType.INIT_WORKER:
      await initWasm();
      break;

    case MessageType.CROP_IMAGE:
      await handleCropImage(message as WorkerMessage<CropImagePayload>);
      break;

    case MessageType.ROTATE_IMAGE:
      await handleRotateImage(message as WorkerMessage<RotateImagePayload>);
      break;

    case MessageType.FLIP_IMAGE:
      await handleFlipImage(message as WorkerMessage<FlipImagePayload>);
      break;

    case MessageType.RESIZE_IMAGE:
      await handleResizeImage(message as WorkerMessage<ResizeImagePayload>);
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
