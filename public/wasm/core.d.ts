/* tslint:disable */
/* eslint-disable */

export class CropRect {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum FlipDirection {
  Horizontal = 0,
  Vertical = 1,
}

export enum ResizeQuality {
  Low = 0,
  Medium = 1,
  High = 2,
  Maximum = 3,
}

export enum RotateAngle {
  Degree0 = 0,
  Degree90 = 90,
  Degree180 = 180,
  Degree270 = 270,
}

export function crop_image(input: Uint8Array, width: number, height: number, crop_rect: CropRect, output: Uint8Array): number;

export function flip_image(input: Uint8Array, width: number, height: number, direction: FlipDirection, output: Uint8Array): number;

export function resize_image(input: Uint8Array, width: number, height: number, new_width: number, new_height: number, quality: ResizeQuality, output: Uint8Array): number;

export function rotate_image(input: Uint8Array, width: number, height: number, angle: RotateAngle, output: Uint8Array): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_croprect_free: (a: number, b: number) => void;
  readonly __wbg_get_croprect_height: (a: number) => number;
  readonly __wbg_get_croprect_width: (a: number) => number;
  readonly __wbg_get_croprect_x: (a: number) => number;
  readonly __wbg_get_croprect_y: (a: number) => number;
  readonly __wbg_set_croprect_height: (a: number, b: number) => void;
  readonly __wbg_set_croprect_width: (a: number, b: number) => void;
  readonly __wbg_set_croprect_x: (a: number, b: number) => void;
  readonly __wbg_set_croprect_y: (a: number, b: number) => void;
  readonly crop_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: any) => [number, number, number];
  readonly flip_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: any) => [number, number, number];
  readonly resize_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: any) => [number, number, number];
  readonly rotate_image: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: any) => [number, number, number];
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
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
