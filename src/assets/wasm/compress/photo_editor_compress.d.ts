/* tslint:disable */
/* eslint-disable */

export enum CompressionFormat {
  Jpeg = 0,
  WebP = 1,
  Png = 2,
}

export class CompressionResult {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  size: number;
  quality: number;
}

/**
 *
 * * Compress RGBA image data to JPEG format
 * *
 * * # Arguments
 * * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * * `width` - Image width in pixels
 * * * `height` - Image height in pixels
 * * * `quality` - JPEG quality (1-100)
 * * * `output` - Output buffer (pre-allocated, same size as input)
 * *
 * * # Returns
 * * Number of bytes written to output buffer
 * 
 */
export function compress_jpeg(input: Uint8Array, width: number, height: number, quality: number, output: Uint8Array): number;

/**
 *
 * * Compress image to target file size using binary search
 * *
 * * Uses binary search to find the optimal quality parameter that
 * * produces a compressed image close to the target file size.
 * *
 * * # Arguments
 * * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * * `width` - Image width in pixels
 * * * `height` - Image height in pixels
 * * * `target_size` - Target file size in bytes
 * * * `format` - Compression format (Jpeg, WebP, or Png)
 * * * `output` - Output buffer (pre-allocated, same size as input)
 * *
 * * # Returns
 * * CompressionResult containing actual size and quality used
 * 
 */
export function compress_to_size(input: Uint8Array, width: number, height: number, target_size: number, format: CompressionFormat, output: Uint8Array): CompressionResult;

/**
 *
 * * Compress RGBA image data to WebP format
 * *
 * * Note: WebP encoding is not yet implemented in the image crate.
 * * This function falls back to JPEG compression for now.
 * *
 * * # Arguments
 * * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * * `width` - Image width in pixels
 * * * `height` - Image height in pixels
 * * * `quality` - WebP quality (1-100)
 * * * `output` - Output buffer (pre-allocated, same size as input)
 * *
 * * # Returns
 * * Number of bytes written to output buffer
 * 
 */
export function compress_webp(input: Uint8Array, width: number, height: number, quality: number, output: Uint8Array): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_compressionresult_free: (a: number, b: number) => void;
  readonly __wbg_get_compressionresult_quality: (a: number) => number;
  readonly __wbg_get_compressionresult_size: (a: number) => number;
  readonly __wbg_set_compressionresult_quality: (a: number, b: number) => void;
  readonly __wbg_set_compressionresult_size: (a: number, b: number) => void;
  readonly compress_jpeg: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: any) => number;
  readonly compress_to_size: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: any) => number;
  readonly compress_webp: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: any) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
