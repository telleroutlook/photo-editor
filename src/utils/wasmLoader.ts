/**
 * WASM Module Loader Utilities
 * Handles loading and initialization of compiled WASM modules from Rust
 */

import { CoreWasmApi, CompressWasmApi, BgRemoveWasmApi } from '../types';

// ============================================================================
// Types
// ============================================================================

interface WasmLoadResult<T> {
  module: T;
  cleanup: () => void;
}

// ============================================================================
// Core WASM Module Loader
// ============================================================================

/**
 * Load Core WASM module (crop, rotate, flip, resize)
 * Module size: ~55KB
 *
 * Loads the compiled WASM module from public/wasm/core/
 */
export async function loadCoreWasm(): Promise<WasmLoadResult<CoreWasmApi>> {
  try {
    console.log('🔄 Loading Core WASM module...');

    // Dynamically import the compiled WASM module
    const wasmUrl = new URL('/wasm/core/photo_editor_core.js', import.meta.url);
    const wasmModule = await import(wasmUrl.href);

    // Initialize the WASM module
    await wasmModule.default();

    console.log('✅ Core WASM module loaded successfully');
    console.log('📦 Module exports:', Object.keys(wasmModule));

    // Return the module and cleanup function
    return {
      module: wasmModule as CoreWasmApi,
      cleanup: () => {
        console.log('🧹 Core WASM module cleaned up');
      },
    };
  } catch (error) {
    console.error('❌ Failed to load Core WASM module:', error);
    throw new Error(`Core WASM module loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Compress WASM Module Loader
// ============================================================================

/**
 * Load Compress WASM module (JPEG, WebP compression)
 * Module size: ~38KB
 *
 * Loads the compiled WASM module from public/wasm/compress/
 */
export async function loadCompressWasm(): Promise<WasmLoadResult<CompressWasmApi>> {
  try {
    console.log('🔄 Loading Compress WASM module...');

    // Dynamically import the compiled WASM module
    const wasmUrl = new URL('/wasm/compress/photo_editor_compress.js', import.meta.url);
    const wasmModule = await import(wasmUrl.href);

    // Initialize the WASM module
    await wasmModule.default();

    console.log('✅ Compress WASM module loaded successfully');
    console.log('📦 Module exports:', Object.keys(wasmModule));

    // Return the module and cleanup function
    return {
      module: wasmModule as CompressWasmApi,
      cleanup: () => {
        console.log('🧹 Compress WASM module cleaned up');
      },
    };
  } catch (error) {
    console.error('❌ Failed to load Compress WASM module:', error);
    throw new Error(`Compress WASM module loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// BgRemove WASM Module Loader
// ============================================================================

/**
 * Load BgRemove WASM module (solid color, magic wand, GrabCut)
 * Module size: ~38KB
 *
 * Loads the compiled WASM module from public/wasm/bgremove/
 */
export async function loadBgRemoveWasm(): Promise<WasmLoadResult<BgRemoveWasmApi>> {
  try {
    console.log('🔄 Loading BgRemove WASM module...');

    // Dynamically import the compiled WASM module
    const wasmUrl = new URL('/wasm/bgremove/photo_editor_compress.js', import.meta.url);
    const wasmModule = await import(wasmUrl.href);

    // Initialize the WASM module
    await wasmModule.default();

    console.log('✅ BgRemove WASM module loaded successfully');
    console.log('📦 Module exports:', Object.keys(wasmModule));

    // Return the module and cleanup function
    return {
      module: wasmModule as BgRemoveWasmApi,
      cleanup: () => {
        console.log('🧹 BgRemove WASM module cleaned up');
      },
    };
  } catch (error) {
    console.error('❌ Failed to load BgRemove WASM module:', error);
    throw new Error(`BgRemove WASM module loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Lazy Loading Helper
// ============================================================================

/**
 * Create a lazy-loading wrapper for WASM modules
 * Loads the module only when first used
 */
export function createLazyWasmLoader<T>(
  loader: () => Promise<WasmLoadResult<T>>
): { get: () => Promise<T>; cleanup: () => void } {
  let cachedResult: WasmLoadResult<T> | null = null;
  let loadPromise: Promise<WasmLoadResult<T>> | null = null;

  return {
    get: async (): Promise<T> => {
      // Return cached module if available
      if (cachedResult) {
        return cachedResult.module;
      }

      // Return existing promise if loading is in progress
      if (loadPromise) {
        const result = await loadPromise;
        return result.module;
      }

      // Start loading
      loadPromise = loader();

      try {
        const result = await loadPromise;
        cachedResult = result;
        loadPromise = null;
        return result.module;
      } catch (error) {
        loadPromise = null;
        throw error;
      }
    },

    cleanup: () => {
      if (cachedResult) {
        cachedResult.cleanup();
        cachedResult = null;
      }
    },
  };
}

// ============================================================================
// Module Health Check
// ============================================================================

/**
 * Check if a WASM module is responsive
 */
export async function healthCheck<T extends Record<string, any>>(
  module: T,
  functionName: keyof T
): Promise<boolean> {
  try {
    const fn = module[functionName];
    if (typeof fn !== 'function') {
      return false;
    }

    // Module is loaded and function exists
    return true;
  } catch (error) {
    console.error(`Health check failed for ${String(functionName)}:`, error);
    return false;
  }
}

// ============================================================================
// Preloading Strategy
// ============================================================================

/**
 * Preload all WASM modules in parallel
 * Useful for improving perceived performance
 */
export async function preloadAllWasmModules(): Promise<{
  core: CoreWasmApi | null;
  compress: CompressWasmApi | null;
  bgremove: BgRemoveWasmApi | null;
}> {
  const results = {
    core: null as CoreWasmApi | null,
    compress: null as CompressWasmApi | null,
    bgremove: null as BgRemoveWasmApi | null,
  };

  try {
    // Load all modules in parallel
    const [coreResult, compressResult, bgremoveResult] = await Promise.allSettled([
      loadCoreWasm(),
      loadCompressWasm(),
      loadBgRemoveWasm(),
    ]);

    // Handle results
    if (coreResult.status === 'fulfilled') {
      results.core = coreResult.value.module;
    }

    if (compressResult.status === 'fulfilled') {
      results.compress = compressResult.value.module;
    }

    if (bgremoveResult.status === 'fulfilled') {
      results.bgremove = bgremoveResult.value.module;
    }

    console.log('📦 WASM modules preloaded:', {
      core: !!results.core,
      compress: !!results.compress,
      bgremove: !!results.bgremove,
    });

    return results;
  } catch (error) {
    console.error('❌ Error preloading WASM modules:', error);
    return results;
  }
}
