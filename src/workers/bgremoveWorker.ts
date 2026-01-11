/**
 * Background Removal Web Worker
 * Handles background removal operations using WASM modules
 * Supports solid color removal, magic wand selection, and GrabCut segmentation
 */

import { MessageType, WorkerMessage, WorkerResponse, generateMessageId } from '../types';
import type { BgRemoveWasmApi } from '../types';

// Worker startup log
console.log('👋 [BgRemoveWorker] Worker script loaded');

// Worker state
let wasmModule: BgRemoveWasmApi | null = null;
let initialized = false;

// Global error handler
self.onerror = (event: string | Event) => {
  if (typeof event === 'string') {
    console.error('❌ [BgRemoveWorker] Global error:', event);
  } else if (event instanceof ErrorEvent) {
    console.error('❌ [BgRemoveWorker] Global error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      stack: event.error?.stack
    });
  } else {
    console.error('❌ [BgRemoveWorker] Unknown error:', event);
  }
  return false;
};

/**
 * Initialize WASM module
 */
async function initWasm(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    console.log('🔄 [BgRemoveWorker] Loading BgRemove WASM module...');

    // Import the WASM glue code from src/assets
    // Using relative path for proper Vite module resolution
    console.log('📦 [BgRemoveWorker] Import path:', '../assets/wasm/bgremove/photo_editor_bgremove.js');
    const loadedModule = await import('../assets/wasm/bgremove/photo_editor_bgremove.js');

    console.log('📚 [BgRemoveWorker] WASM JS file loaded, initializing...');

    // Initialize the WASM module (this loads the .wasm binary)
    await loadedModule.default();

    // Store the initialized module
    wasmModule = loadedModule as unknown as BgRemoveWasmApi;

    console.log('✅ [BgRemoveWorker] BgRemove WASM module loaded successfully');
    console.log('📦 [BgRemoveWorker] Module exports:', Object.keys(loadedModule));

    initialized = true;

    sendMessage({
      id: generateMessageId(),
      type: MessageType.INIT_WORKER,
      success: true,
      data: {
        message: 'BgRemove WASM module loaded successfully',
        moduleType: 'wasm',
        functions: Object.keys(wasmModule),
      },
      processingTime: 0,
    });
  } catch (error) {
    console.error('Failed to load BgRemove WASM module:', error);
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
 * Handle solid color removal operation
 */
async function handleRemoveSolidColor(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    const { imageData, width, height, targetColor, tolerance, feather } = message.payload;

    // Validate inputs
    if (!imageData || !width || !height || !targetColor) {
      throw new Error('Missing required parameters for solid color removal');
    }

    // Validate target color array
    if (!Array.isArray(targetColor) || targetColor.length !== 3) {
      throw new Error('Target color must be an array of 3 RGB values [r, g, b]');
    }

    // Validate tolerance
    if (tolerance !== undefined && (tolerance < 0 || tolerance > 255)) {
      throw new Error('Tolerance must be between 0 and 255');
    }

    // Validate feather
    if (feather !== undefined && (feather < 0 || feather > 50)) {
      throw new Error('Feather must be between 0 and 50');
    }

    // Convert ImageData to Uint8Array (RGBA format)
    const input = new Uint8Array(imageData);

    // Allocate output buffer (same size as input)
    const output = new Uint8Array(input.length);

    // Call WASM function
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    await wasmModule.remove_solid_color(
      input,
      width,
      height,
      targetColor as [number, number, number],
      tolerance ?? 30, // Default tolerance
      feather ?? 0,    // Default feather
      output
    );

    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.REMOVE_SOLID_COLOR,
      success: true,
      data: {
        imageData: output.buffer,
        width,
        height,
      },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.REMOVE_SOLID_COLOR,
      success: false,
      error: error instanceof Error ? error.message : 'Solid color removal failed',
      processingTime,
    });
  }
}

/**
 * Handle magic wand selection operation
 */
async function handleMagicWandSelect(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    const { imageData, width, height, seedX, seedY, tolerance, connected } = message.payload;

    // Validate inputs
    if (!imageData || !width || !height || seedX === undefined || seedY === undefined) {
      throw new Error('Missing required parameters for magic wand selection');
    }

    // Validate seed position
    if (seedX < 0 || seedX >= width || seedY < 0 || seedY >= height) {
      throw new Error('Seed position is outside image bounds');
    }

    // Validate tolerance
    if (tolerance !== undefined && (tolerance < 0 || tolerance > 255)) {
      throw new Error('Tolerance must be between 0 and 255');
    }

    // Convert ImageData to Uint8Array (RGBA format)
    const input = new Uint8Array(imageData);

    // Allocate mask output buffer (1 byte per pixel)
    const pixelCount = width * height;
    const maskOutput = new Uint8Array(pixelCount);

    // Call WASM function
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    await wasmModule.magic_wand_select(
      input,
      width,
      height,
      seedX,
      seedY,
      tolerance ?? 30,  // Default tolerance
      connected ?? true, // Default: connected flood fill
      maskOutput
    );

    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.MAGIC_WAND_SELECT,
      success: true,
      data: {
        mask: maskOutput.buffer,
        width,
        height,
      },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.MAGIC_WAND_SELECT,
      success: false,
      error: error instanceof Error ? error.message : 'Magic wand selection failed',
      processingTime,
    });
  }
}

/**
 * Handle GrabCut segmentation operation
 */
async function handleGrabCutSegment(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    const {
      imageData,
      width,
      height,
      rectX,
      rectY,
      rectWidth,
      rectHeight,
      iterations
    } = message.payload;

    // Validate inputs
    if (
      !imageData ||
      !width ||
      !height ||
      rectX === undefined ||
      rectY === undefined ||
      rectWidth === undefined ||
      rectHeight === undefined
    ) {
      throw new Error('Missing required parameters for GrabCut segmentation');
    }

    // Validate rectangle bounds
    if (rectX < 0 || rectY < 0 || rectWidth <= 0 || rectHeight <= 0) {
      throw new Error('Invalid rectangle dimensions');
    }

    if (rectX + rectWidth > width || rectY + rectHeight > height) {
      throw new Error('Rectangle is outside image bounds');
    }

    // Validate iterations
    if (iterations !== undefined && (iterations < 1 || iterations > 5)) {
      throw new Error('Iterations must be between 1 and 5');
    }

    // Convert ImageData to Uint8Array (RGBA format)
    const input = new Uint8Array(imageData);

    // Allocate mask output buffer (1 byte per pixel)
    const pixelCount = width * height;
    const maskOutput = new Uint8Array(pixelCount);

    // Call WASM function
    if (!wasmModule) {
      throw new Error('WASM module not initialized');
    }

    await wasmModule.grabcut_segment(
      input,
      width,
      height,
      rectX,
      rectY,
      rectWidth,
      rectHeight,
      iterations ?? 5, // Default: 5 iterations
      maskOutput
    );

    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.GRABCUT_SEGMENT,
      success: true,
      data: {
        mask: maskOutput.buffer,
        width,
        height,
      },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    sendMessage({
      id: message.id,
      type: MessageType.GRABCUT_SEGMENT,
      success: false,
      error: error instanceof Error ? error.message : 'GrabCut segmentation failed',
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

    case MessageType.REMOVE_SOLID_COLOR:
      await handleRemoveSolidColor(message);
      break;

    case MessageType.MAGIC_WAND_SELECT:
      await handleMagicWandSelect(message);
      break;

    case MessageType.GRABCUT_SEGMENT:
      await handleGrabCutSegment(message);
      break;

    case MessageType.TERMINATE_WORKER:
      // Cleanup before terminating
      wasmModule = null;
      initialized = false;
      self.close();
      break;

    case MessageType.HEALTH_CHECK:
      sendMessage({
        id: message.id,
        type: MessageType.HEALTH_CHECK,
        success: true,
        data: {
          initialized,
          // Note: performance.memory is not available in web workers
          // memoryUsage: performance.memory,
        },
        processingTime: 0,
      });
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
