/**
 * Typed WASM Module Instance Definitions
 * Provides type-safe wrappers for WASM modules to eliminate `any` types
 */

import type { CoreWasmApi, CompressWasmApi, BgRemoveWasmApi } from './wasm';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Union type for all loaded WASM modules
 */
export type WasmModuleInstance =
  | CoreWasmApi
  | CompressWasmApi
  | BgRemoveWasmApi;

/**
 * WASM module type enum
 */
export enum WasmModuleType {
  CORE = 'core',
  COMPRESS = 'compress',
  BGREMOVE = 'bgremove',
}

/**
 * Typed WASM module wrapper
 */
export interface TypedWasmModule<T extends WasmModuleInstance> {
  module: T | null;
  initialized: boolean;
  error: Error | null;
  type: WasmModuleType;
}

/**
 * WASM module loader configuration
 */
export interface WasmLoaderConfig {
  modulePath: string;
  type: WasmModuleType;
  useSharedArrayBuffer?: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a module is a CoreWasmApi
 */
export function isCoreWasmApi(module: WasmModuleInstance): module is CoreWasmApi {
  return 'crop_image' in module && 'rotate_image' in module;
}

/**
 * Check if a module is a CompressWasmApi
 */
export function isCompressWasmApi(module: WasmModuleInstance): module is CompressWasmApi {
  return 'compress_jpeg' in module && 'compress_webp' in module;
}

/**
 * Check if a module is a BgRemoveWasmApi
 */
export function isBgRemoveWasmApi(module: WasmModuleInstance): module is BgRemoveWasmApi {
  return 'remove_solid_color' in module && 'magic_wand_select' in module;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a typed WASM module wrapper
 */
export function createTypedWasmModule<T extends WasmModuleInstance>(
  type: WasmModuleType
): TypedWasmModule<T> {
  return {
    module: null,
    initialized: false,
    error: null,
    type,
  };
}

/**
 * Create a typed WASM module with an existing module instance
 */
export function createTypedWasmModuleFromInstance<T extends WasmModuleInstance>(
  instance: T,
  type: WasmModuleType
): TypedWasmModule<T> {
  return {
    module: instance,
    initialized: true,
    error: null,
    type,
  };
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * WASM module error
 */
export class WasmModuleError extends Error {
  constructor(
    message: string,
    public moduleType: WasmModuleType,
    public cause?: Error
  ) {
    super(message);
    this.name = 'WasmModuleError';
  }
}

/**
 * WASM initialization error
 */
export class WasmInitializationError extends WasmModuleError {
  constructor(
    moduleType: WasmModuleType,
    cause?: Error
  ) {
    super(
      `Failed to initialize WASM module: ${moduleType}`,
      moduleType,
      cause
    );
    this.name = 'WasmInitializationError';
  }
}

/**
 * WASM function execution error
 */
export class WasmExecutionError extends Error {
  constructor(
    message: string,
    public functionName: string,
    public moduleType: WasmModuleType,
    public cause?: Error
  ) {
    super(message);
    this.name = 'WasmExecutionError';
  }
}
