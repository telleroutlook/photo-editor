/**
 * Web Worker message protocol definitions
 */

import type { CropRect, RotateAngle, FlipDirection, ResizeQuality } from './wasm';
import type { CompressionFormat } from './image';
import type { JpegAdvancedParams, WebPAdvancedParams } from './wasm';

// ============================================================================
// Message Type Definitions
// ============================================================================

/**
 * Worker message type enum
 */
export enum MessageType {
  // Core module messages
  CROP_IMAGE = 'CROP_IMAGE',
  ROTATE_IMAGE = 'ROTATE_IMAGE',
  FLIP_IMAGE = 'FLIP_IMAGE',
  RESIZE_IMAGE = 'RESIZE_IMAGE',

  // Compress module messages
  COMPRESS_JPEG = 'COMPRESS_JPEG',
  COMPRESS_WEBP = 'COMPRESS_WEBP',
  COMPRESS_PNG = 'COMPRESS_PNG',
  COMPRESS_TO_SIZE = 'COMPRESS_TO_SIZE',

  // BgRemove module messages
  REMOVE_SOLID_COLOR = 'REMOVE_SOLID_COLOR',
  MAGIC_WAND_SELECT = 'MAGIC_WAND_SELECT',
  GRABCUT_SEGMENT = 'GRABCUT_SEGMENT',

  // Control messages
  INIT_WORKER = 'INIT_WORKER',
  TERMINATE_WORKER = 'TERMINATE_WORKER',
  HEALTH_CHECK = 'HEALTH_CHECK',
}

// ============================================================================
// Base Message Interfaces
// ============================================================================

/**
 * Base worker message interface
 */
export interface WorkerMessage<T = unknown> {
  id: string;
  type: MessageType;
  payload: T;
  timestamp: number;
}

/**
 * Base worker response interface
 */
export interface WorkerResponse<T = unknown> {
  id: string;
  type?: MessageType; // Optional: helps identify response type
  success: boolean;
  data?: T;
  error?: string;
  processingTime: number;
}

// ============================================================================
// Payload Type Definitions
// ============================================================================

/**
 * Crop image payload
 */
export interface CropImagePayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  cropRect: CropRect;
}

/**
 * Rotate image payload
 */
export interface RotateImagePayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  angle: RotateAngle;
}

/**
 * Flip image payload
 */
export interface FlipImagePayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  direction: FlipDirection;
}

/**
 * Resize image payload
 */
export interface ResizeImagePayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  newWidth: number;
  newHeight: number;
  quality: ResizeQuality;
}

/**
 * Compress JPEG payload
 */
export interface CompressJpegPayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  quality: number;
  advancedParams?: JpegAdvancedParams;
}

/**
 * Compress WebP payload
 */
export interface CompressWebpPayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  quality: number;
  advancedParams?: WebPAdvancedParams;
}

/**
 * Compress to target size payload
 */
export interface CompressToSizePayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  targetSize: number;
  format: CompressionFormat;
}

/**
 * Remove solid color background payload
 */
export interface RemoveSolidColorPayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  targetColor: [number, number, number];
  tolerance: number;
  feather: number;
}

/**
 * Magic wand selection payload
 */
export interface MagicWandSelectPayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  seedX: number;
  seedY: number;
  tolerance: number;
  connected: boolean;
}

/**
 * GrabCut segmentation payload
 */
export interface GrabCutSegmentPayload {
  imageData: Uint8Array;
  width: number;
  height: number;
  foregroundMask: Uint8Array;
  backgroundMask: Uint8Array;
  iterations: number;
}

/**
 * Initialize worker payload
 */
export interface InitWorkerPayload {
  wasmModuleUrl: string;
  useSharedArrayBuffer: boolean;
}

/**
 * Worker response data types
 */
export interface CropImageData {
  imageData: Uint8Array;
  width: number;
  height: number;
}

export interface CompressedImageData {
  imageData: Uint8Array;
  size: number;
  format: string;
  quality?: number;
}

export interface MaskData {
  mask: Uint8Array;
  width: number;
  height: number;
}

// ============================================================================
// Message Factory Functions
// ============================================================================

/**
 * Create a worker message with auto-generated ID and timestamp
 */
export function createWorkerMessage<T>(
  type: MessageType,
  payload: T
): WorkerMessage<T> {
  return {
    id: generateMessageId(),
    type,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Create a worker response
 */
export function createWorkerResponse<T>(
  id: string,
  success: boolean,
  data?: T,
  error?: string,
  processingTime?: number
): WorkerResponse<T> {
  return {
    id,
    success,
    data,
    error,
    processingTime: processingTime ?? 0,
  };
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Worker State
// ============================================================================

/**
 * Worker initialization state
 */
export enum WorkerState {
  UNINITIALIZED = 'uninitialized',
  LOADING = 'loading',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  TERMINATED = 'terminated',
}

/**
 * Worker health status
 */
export interface WorkerHealth {
  state: WorkerState;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
  lastActivity: number;
  processedCount: number;
  errorCount: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if message is a specific type
 */
export function isMessageType<T>(
  message: WorkerMessage,
  type: MessageType
): message is WorkerMessage<T> {
  return message.type === type;
}

/**
 * Check if response is successful
 */
export function isSuccessfulResponse<T>(
  response: WorkerResponse<T>
): response is WorkerResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Check if response is an error
 */
export function isErrorResponse(
  response: WorkerResponse
): response is WorkerResponse & { success: false; error: string } {
  return response.success === false && response.error !== undefined;
}

// ============================================================================
// Worker Configuration
// ============================================================================

/**
 * Worker configuration options
 */
export interface WorkerConfig {
  wasmModulePath: string;
  useSharedArrayBuffer: boolean;
  timeout?: number; // Request timeout in milliseconds
  maxMemory?: number; // Maximum memory usage in bytes
  enableMemoryMonitoring?: boolean;
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

/**
 * Default worker configuration
 */
export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  wasmModulePath: '/wasm',
  useSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  timeout: 30000, // 30 seconds
  maxMemory: 512 * 1024 * 1024, // 512MB
  enableMemoryMonitoring: true,
  cleanupInterval: 30000, // 30 seconds
};
