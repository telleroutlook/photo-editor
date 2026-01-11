/**
 * WASM Error Handler
 * Provides comprehensive error handling for WASM module operations
 */

import type { WorkerResponse } from '../types';
import { WasmModuleType } from '../types';

// ============================================================================
// Error Context Types
// ============================================================================

export interface WasmErrorContext {
  operation: string;
  imageSize: number;
  memoryUsage?: number;
  workerType: 'core' | 'compress' | 'bgremove';
  wasmModuleType: WasmModuleType;
}

export interface WasmProcessingMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  imageSize: number;
  success: boolean;
  error?: string;
  duration: number;
}

// ============================================================================
// Error Handler Class
// ============================================================================

export class WasmErrorHandler {
  private static metrics: WasmProcessingMetrics[] = [];
  private static readonly MAX_METRICS = 100;

  /**
   * Handle WASM errors with proper fallback and user-friendly messages
   */
  static handleError(
    error: unknown,
    context: WasmErrorContext
  ): WorkerResponse {
    const errorMessage = this.extractErrorMessage(error);
    const userFriendlyMessage = this.getUserFriendlyMessage(error, context);

    // Log detailed error for debugging
    console.error('WASM Error:', {
      context,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Record metrics
    this.recordErrorMetric(context.operation, context.imageSize, errorMessage);

    // Return user-friendly error response
    return {
      id: this.generateId(),
      success: false,
      error: userFriendlyMessage,
      processingTime: 0,
    };
  }

  /**
   * Extract error message from various error types
   */
  private static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }

    return 'Unknown error occurred';
  }

  /**
   * Generate user-friendly error messages
   */
  private static getUserFriendlyMessage(
    error: unknown,
    _context: WasmErrorContext
  ): string {
    const errorMessage = this.extractErrorMessage(error);

    // Out of memory errors
    if (errorMessage.includes('out of memory') ||
        errorMessage.includes('memory') ||
        errorMessage.includes('allocation')) {
      return `Not enough memory to process this image. Try reducing image size or closing other browser tabs.`;
    }

    // Module not initialized errors
    if (errorMessage.includes('not initialized') ||
        errorMessage.includes('not loaded') ||
        errorMessage.includes('module')) {
      return `Processing module not loaded. Please refresh the page and try again.`;
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return `Processing took too long. The image might be too large. Try a smaller image.`;
    }

    // Invalid data errors
    if (errorMessage.includes('invalid') ||
        errorMessage.includes('corrupt') ||
        errorMessage.includes('format')) {
      return `The image file appears to be invalid or corrupted. Please try another image.`;
    }

    // Default generic message
    return `Processing failed: ${errorMessage}. Please try again or contact support if the problem persists.`;
  }

  /**
   * Check if WASM is supported in the current browser
   */
  static isWasmSupported(): boolean {
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  }

  /**
   * Check if SharedArrayBuffer is available
   */
  static isSharedArrayBufferSupported(): boolean {
    // Check if SharedArrayBuffer is defined
    if (typeof SharedArrayBuffer === 'undefined') {
      return false;
    }

    // Check if we're in a secure context (HTTPS or localhost)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return false;
    }

    return true;
  }

  /**
   * Check if cross-origin isolation is enabled (required for SharedArrayBuffer)
   */
  static isCrossOriginIsolated(): boolean {
    return typeof crossOriginIsolated === 'boolean' ? crossOriginIsolated : false;
  }

  /**
   * Get current memory usage estimate
   */
  static getMemoryUsage(): { used: number; limit: number; percentage: number } {
    // @ts-ignore - performance.memory is non-standard but available in Chrome/Edge
    if (performance.memory) {
      // @ts-ignore
      const used = performance.memory.usedJSHeapSize;
      // @ts-ignore
      const limit = performance.memory.jsHeapSizeLimit;
      return {
        used,
        limit,
        percentage: (used / limit) * 100,
      };
    }
    // Default estimate
    return {
      used: 0,
      limit: 512 * 1024 * 1024, // 512MB default
      percentage: 0,
    };
  }

  /**
   * Check if memory is running low
   */
  static isMemoryLow(threshold: number = 80): boolean {
    const { percentage } = this.getMemoryUsage();
    return percentage > threshold;
  }

  /**
   * Record error metrics
   */
  private static recordErrorMetric(
    operation: string,
    imageSize: number,
    error: string
  ): void {
    const metric: WasmProcessingMetrics = {
      operation,
      startTime: Date.now(),
      endTime: Date.now(),
      imageSize,
      success: false,
      error,
      duration: 0,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Get error rate for a specific operation
   */
  static getErrorRate(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;

    const errors = operationMetrics.filter(m => !m.success).length;
    return (errors / operationMetrics.length) * 100;
  }

  /**
   * Get all metrics
   */
  static getAllMetrics(): WasmProcessingMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Generate unique error ID
   */
  private static generateId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Validate image data before processing
   */
  static validateImageData(data: Uint8Array, width: number, height: number): {
    valid: boolean;
    error?: string;
  } {
    // Check if data exists
    if (!data || data.length === 0) {
      return { valid: false, error: 'Image data is empty' };
    }

    // Check dimensions
    if (width <= 0 || height <= 0) {
      return { valid: false, error: 'Invalid image dimensions' };
    }

    // Check data size (4 bytes per pixel for RGBA)
    const expectedSize = width * height * 4;
    if (data.length < expectedSize) {
      return {
        valid: false,
        error: `Image data is incomplete. Expected ${expectedSize} bytes, got ${data.length}`,
      };
    }

    // Check if image is too large (prevent OOM)
    const maxDimension = 16384; // 16K pixels
    if (width > maxDimension || height > maxDimension) {
      return {
        valid: false,
        error: `Image too large. Maximum dimension is ${maxDimension} pixels`,
      };
    }

    // Check total pixel count
    const maxPixels = 67108864; // 256M pixels (1GB at 4 bytes per pixel)
    const totalPixels = width * height;
    if (totalPixels > maxPixels) {
      return {
        valid: false,
        error: `Image has too many pixels. Maximum is ${maxPixels}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate file size before processing
   */
  static validateFileSize(size: number, maxSize: number = 100 * 1024 * 1024): {
    valid: boolean;
    error?: string;
  } {
    if (size <= 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    return { valid: true };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Wrap a WASM operation with error handling
 */
export function withWasmErrorHandling<T>(
  operation: string,
  context: Omit<WasmErrorContext, 'operation'>,
  fn: () => Promise<T>
): Promise<T> {
  return fn().catch((error) => {
    const errorContext: WasmErrorContext = {
      ...context,
      operation,
    };

    const response = WasmErrorHandler.handleError(error, errorContext);
    throw new Error(response.error);
  });
}

/**
 * Check browser compatibility before starting WASM operations
 */
export function checkWasmCompatibility(): {
  supported: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!WasmErrorHandler.isWasmSupported()) {
    errors.push('WebAssembly is not supported in this browser');
  }

  if (!WasmErrorHandler.isSharedArrayBufferSupported()) {
    errors.push('SharedArrayBuffer is not available. Performance may be reduced.');
  }

  if (!WasmErrorHandler.isCrossOriginIsolated()) {
    errors.push('Cross-origin isolation is not enabled. Some features may not work.');
  }

  return {
    supported: errors.length === 0 || errors.every(e => e.includes('SharedArrayBuffer')),
    errors,
  };
}
