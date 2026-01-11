/**
 * Compress Web Worker
 * Handles compression operations using real WASM modules
 * Processes JPEG, WebP compression and target file size optimization
 */

import { MessageType, WorkerMessage, WorkerResponse } from '../types';
import type { CompressWasmApi } from '../types';

// ============================================================================
// State Management
// ============================================================================

let wasmModule: CompressWasmApi | null = null;
let initialized = false;

// ============================================================================
// WASM Module Loading
// ============================================================================

/**
 * Load real WASM module from compiled Rust code
 */
async function loadWasmModule(): Promise<CompressWasmApi> {
  try {
    console.log('🔄 Loading Compress WASM module...');

    // Dynamically import the compiled WASM module
    const wasmUrl = new URL('/wasm/compress/photo_editor_compress.js', import.meta.url);

    // Import and initialize WASM
    const wasmModule = await import(wasmUrl.href);

    // Initialize the WASM module (this loads the .wasm binary)
    await wasmModule.default();

    console.log('✅ Compress WASM module loaded successfully');
    console.log('📦 Module exports:', Object.keys(wasmModule));

    return wasmModule as CompressWasmApi;
  } catch (error) {
    console.error('❌ Failed to load Compress WASM module:', error);
    throw error;
  }
}

/**
 * Initialize WASM module
 */
async function initWasm(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    wasmModule = await loadWasmModule();
    initialized = true;

    sendMessage({
      id: generateId(),
      type: MessageType.INIT_WORKER,
      success: true,
      data: {
        message: 'Compress WASM module loaded successfully',
        moduleType: 'wasm',
        functions: Object.keys(wasmModule || {}),
      },
      processingTime: 0,
    });
  } catch (error) {
    console.error('Failed to initialize Compress WASM module:', error);
    sendMessage({
      id: generateId(),
      type: MessageType.INIT_WORKER,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: 0,
    });
  }
}

// ============================================================================
// Message Handlers
// ============================================================================

/**
 * Handle JPEG compression operation
 */
async function handleCompressJpeg(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    if (!initialized || !wasmModule) {
      throw new Error('WASM module not initialized. Call INIT_WORKER first.');
    }

    const { imageData, width, height, quality } = message.payload;

    // Validate inputs
    if (!imageData || !width || !height || quality === undefined) {
      throw new Error('Missing required parameters for JPEG compression');
    }

    // Validate quality range
    if (quality < 1 || quality > 100) {
      throw new Error('Quality must be between 1 and 100');
    }

    // Convert ImageData to Uint8Array (RGBA format)
    const input = new Uint8Array(imageData);

    // Allocate output buffer (start with same size)
    const output = new Uint8Array(input.length);

    // Call WASM function
    const compressedSize = await wasmModule.compress_jpeg(
      input,
      width,
      height,
      quality,
      output
    );

    // Trim output buffer to actual compressed size
    const compressedData = output.slice(0, compressedSize);

    const processingTime = performance.now() - startTime;

    console.log(`✅ JPEG compressed: ${input.length} → ${compressedSize} bytes (${quality}%)`);

    sendMessage({
      id: message.id,
      type: MessageType.COMPRESS_JPEG,
      success: true,
      data: {
        imageData: compressedData,
        size: compressedSize,
        format: 'image/jpeg',
        quality,
      },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    console.error('❌ JPEG compression failed:', error);

    sendMessage({
      id: message.id,
      type: MessageType.COMPRESS_JPEG,
      success: false,
      error: error instanceof Error ? error.message : 'JPEG compression failed',
      processingTime,
    });
  }
}

/**
 * Handle WebP compression operation
 */
async function handleCompressWebp(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    if (!initialized || !wasmModule) {
      throw new Error('WASM module not initialized. Call INIT_WORKER first.');
    }

    const { imageData, width, height, quality } = message.payload;

    // Validate inputs
    if (!imageData || !width || !height || quality === undefined) {
      throw new Error('Missing required parameters for WebP compression');
    }

    // Validate quality range
    if (quality < 1 || quality > 100) {
      throw new Error('Quality must be between 1 and 100');
    }

    // Convert ImageData to Uint8Array (RGBA format)
    const input = new Uint8Array(imageData);

    // Allocate output buffer
    const output = new Uint8Array(input.length);

    // Call WASM function
    const compressedSize = await wasmModule.compress_webp(
      input,
      width,
      height,
      quality,
      output
    );

    // Trim output buffer to actual compressed size
    const compressedData = output.slice(0, compressedSize);

    const processingTime = performance.now() - startTime;

    console.log(`✅ WebP compressed: ${input.length} → ${compressedSize} bytes (${quality}%)`);

    sendMessage({
      id: message.id,
      type: MessageType.COMPRESS_WEBP,
      success: true,
      data: {
        imageData: compressedData,
        size: compressedSize,
        format: 'image/webp',
        quality,
      },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    console.error('❌ WebP compression failed:', error);

    sendMessage({
      id: message.id,
      type: MessageType.COMPRESS_WEBP,
      success: false,
      error: error instanceof Error ? error.message : 'WebP compression failed',
      processingTime,
    });
  }
}

/**
 * Handle compress to target size operation
 * Uses binary search to find optimal quality for target file size
 */
async function handleCompressToSize(message: WorkerMessage<any>): Promise<void> {
  const startTime = performance.now();

  try {
    if (!initialized || !wasmModule) {
      throw new Error('WASM module not initialized. Call INIT_WORKER first.');
    }

    const { imageData, width, height, targetSize, format } = message.payload;

    // Validate inputs
    if (!imageData || !width || !height || !targetSize || !format) {
      throw new Error('Missing required parameters for compress to size');
    }

    // Validate target size
    if (targetSize <= 0) {
      throw new Error('Target size must be greater than 0');
    }

    // Convert ImageData to Uint8Array
    const input = new Uint8Array(imageData);

    // Allocate output buffer
    const output = new Uint8Array(input.length);

    // Map format string to WASM enum
    const formatMap: Record<string, any> = {
      jpeg: 0, // CompressionFormat::Jpeg
      webp: 1, // CompressionFormat::WebP
      png: 2,  // CompressionFormat::Png
    };

    const wasmFormat = formatMap[format] || 0;

    // Call WASM compress_to_size function
    const result = await wasmModule.compress_to_size(
      input,
      width,
      height,
      targetSize,
      wasmFormat,
      output
    );

    // Extract result from WASM
    const size = result.size;
    const quality = result.quality;

    // Trim output buffer to actual compressed size
    const compressedData = output.slice(0, size);

    // Determine MIME type
    const mimeType = format === 'jpeg' ? 'image/jpeg' :
                    format === 'png' ? 'image/png' : 'image/webp';

    const processingTime = performance.now() - startTime;

    console.log(`✅ Compressed to target: ${input.length} → ${size} bytes (target: ${targetSize}, quality: ${quality}%)`);

    sendMessage({
      id: message.id,
      type: MessageType.COMPRESS_TO_SIZE,
      success: true,
      data: {
        imageData: compressedData,
        size,
        format: mimeType,
        quality,
      },
      processingTime,
    });
  } catch (error) {
    const processingTime = performance.now() - startTime;

    console.error('❌ Compress to size failed:', error);

    sendMessage({
      id: message.id,
      type: MessageType.COMPRESS_TO_SIZE,
      success: false,
      error: error instanceof Error ? error.message : 'Compress to size failed',
      processingTime,
    });
  }
}

// ============================================================================
// Utilities
// ============================================================================

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

// ============================================================================
// Message Handler
// ============================================================================

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case MessageType.INIT_WORKER:
      await initWasm();
      break;

    case MessageType.COMPRESS_JPEG:
      await handleCompressJpeg(message);
      break;

    case MessageType.COMPRESS_WEBP:
      await handleCompressWebp(message);
      break;

    case MessageType.COMPRESS_TO_SIZE:
      await handleCompressToSize(message);
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
          moduleLoaded: !!wasmModule,
          availableFunctions: wasmModule ? Object.keys(wasmModule) : [],
          memoryUsage: (performance as any).memory,
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
