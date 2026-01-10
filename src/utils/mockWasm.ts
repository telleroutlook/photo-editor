/**
 * Mock WASM module implementation
 * Allows frontend development without actual WASM modules
 * Simulates WASM operations with JavaScript implementations
 */

import { CoreWasmApi, CropRect, RotateAngle, FlipDirection, ResizeQuality } from '../types';

/**
 * Create mock CoreWasmApi
 * Simulates image operations with JavaScript implementations
 */
export function createMockCoreWasm(): CoreWasmApi {
  return {
    crop_image: mockCropImage,
    rotate_image: mockRotateImage,
    flip_image: mockFlipImage,
    resize_image: mockResizeImage,
  };
}

/**
 * Mock crop implementation
 */
async function mockCropImage(
  input: Uint8Array,
  width: number,
  height: number,
  cropRect: CropRect,
  output: Uint8Array
): Promise<number> {
  // Validate inputs
  if (
    cropRect.x + cropRect.width > width ||
    cropRect.y + cropRect.height > height
  ) {
    throw new Error('Crop rectangle exceeds image bounds');
  }

  // Copy pixels from input to output
  let outputIndex = 0;
  for (let y = cropRect.y; y < cropRect.y + cropRect.height; y++) {
    for (let x = cropRect.x; x < cropRect.x + cropRect.width; x++) {
      const inputIndex = (y * width + x) * 4;

      // Copy RGBA values
      output[outputIndex++] = input[inputIndex];
      output[outputIndex++] = input[inputIndex + 1];
      output[outputIndex++] = input[inputIndex + 2];
      output[outputIndex++] = input[inputIndex + 3];
    }
  }

  return Promise.resolve(cropRect.width * cropRect.height * 4);
}

/**
 * Mock rotate implementation
 */
async function mockRotateImage(
  input: Uint8Array,
  width: number,
  height: number,
  angle: RotateAngle,
  output: Uint8Array
): Promise<number> {
  switch (angle) {
    case 0:
      // No rotation
      output.set(input);
      return Promise.resolve(width * height * 4);

    case 90:
      return Promise.resolve(rotate90(input, width, height, output));

    case 180:
      return Promise.resolve(rotate180(input, width, height, output));

    case 270:
      return Promise.resolve(rotate270(input, width, height, output));

    default:
      throw new Error(`Invalid rotation angle: ${angle}`);
  }
}

/**
 * Rotate 90 degrees clockwise
 */
function rotate90(
  input: Uint8Array,
  width: number,
  height: number,
  output: Uint8Array
): number {
  let outputIndex = 0;

  for (let x = 0; x < width; x++) {
    for (let y = height - 1; y >= 0; y--) {
      const inputIndex = (y * width + x) * 4;

      output[outputIndex++] = input[inputIndex];
      output[outputIndex++] = input[inputIndex + 1];
      output[outputIndex++] = input[inputIndex + 2];
      output[outputIndex++] = input[inputIndex + 3];
    }
  }

  return width * height * 4;
}

/**
 * Rotate 180 degrees
 */
function rotate180(
  input: Uint8Array,
  width: number,
  height: number,
  output: Uint8Array
): number {
  let outputIndex = 0;

  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const inputIndex = (y * width + x) * 4;

      output[outputIndex++] = input[inputIndex];
      output[outputIndex++] = input[inputIndex + 1];
      output[outputIndex++] = input[inputIndex + 2];
      output[outputIndex++] = input[inputIndex + 3];
    }
  }

  return width * height * 4;
}

/**
 * Rotate 270 degrees clockwise (90 degrees counter-clockwise)
 */
function rotate270(
  input: Uint8Array,
  width: number,
  height: number,
  output: Uint8Array
): number {
  let outputIndex = 0;

  for (let x = width - 1; x >= 0; x--) {
    for (let y = 0; y < height; y++) {
      const inputIndex = (y * width + x) * 4;

      output[outputIndex++] = input[inputIndex];
      output[outputIndex++] = input[inputIndex + 1];
      output[outputIndex++] = input[inputIndex + 2];
      output[outputIndex++] = input[inputIndex + 3];
    }
  }

  return width * height * 4;
}

/**
 * Mock flip implementation
 */
async function mockFlipImage(
  input: Uint8Array,
  width: number,
  height: number,
  direction: FlipDirection,
  output: Uint8Array
): Promise<number> {
  if (direction === FlipDirection.Horizontal) {
    return Promise.resolve(flipHorizontal(input, width, height, output));
  } else {
    return Promise.resolve(flipVertical(input, width, height, output));
  }
}

/**
 * Flip horizontally (mirror left-right)
 */
function flipHorizontal(
  input: Uint8Array,
  width: number,
  height: number,
  output: Uint8Array
): number {
  let outputIndex = 0;

  for (let y = 0; y < height; y++) {
    for (let x = width - 1; x >= 0; x--) {
      const inputIndex = (y * width + x) * 4;

      output[outputIndex++] = input[inputIndex];
      output[outputIndex++] = input[inputIndex + 1];
      output[outputIndex++] = input[inputIndex + 2];
      output[outputIndex++] = input[inputIndex + 3];
    }
  }

  return width * height * 4;
}

/**
 * Flip vertically (mirror top-bottom)
 */
function flipVertical(
  input: Uint8Array,
  width: number,
  height: number,
  output: Uint8Array
): number {
  let outputIndex = 0;

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const inputIndex = (y * width + x) * 4;

      output[outputIndex++] = input[inputIndex];
      output[outputIndex++] = input[inputIndex + 1];
      output[outputIndex++] = input[inputIndex + 2];
      output[outputIndex++] = input[inputIndex + 3];
    }
  }

  return width * height * 4;
}

/**
 * Mock resize implementation
 */
async function mockResizeImage(
  input: Uint8Array,
  width: number,
  height: number,
  newWidth: number,
  newHeight: number,
  quality: ResizeQuality,
  output: Uint8Array
): Promise<number> {
  switch (quality) {
    case ResizeQuality.Fast:
      // Fast = bilinear interpolation
      return Promise.resolve(resizeBilinear(input, width, height, newWidth, newHeight, output));

    case ResizeQuality.High:
      // High = bicubic interpolation (simplified to bilinear for mock)
      return Promise.resolve(resizeBilinear(input, width, height, newWidth, newHeight, output));

    default:
      throw new Error(`Invalid resize quality: ${quality}`);
  }
}

/**
 * Nearest neighbor interpolation (fast, low quality)
 */
function resizeNearestNeighbor(
  input: Uint8Array,
  width: number,
  height: number,
  newWidth: number,
  newHeight: number,
  output: Uint8Array
): number {
  const xRatio = width / newWidth;
  const yRatio = height / newHeight;

  let outputIndex = 0;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      const inputIndex = (srcY * width + srcX) * 4;

      output[outputIndex++] = input[inputIndex];
      output[outputIndex++] = input[inputIndex + 1];
      output[outputIndex++] = input[inputIndex + 2];
      output[outputIndex++] = input[inputIndex + 3];
    }
  }

  return newWidth * newHeight * 4;
}

/**
 * Bilinear interpolation (medium quality)
 */
function resizeBilinear(
  input: Uint8Array,
  width: number,
  height: number,
  newWidth: number,
  newHeight: number,
  output: Uint8Array
): number {
  const xRatio = width / newWidth;
  const yRatio = height / newHeight;

  let outputIndex = 0;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;

      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      const x2 = Math.min(x1 + 1, width - 1);
      const y2 = Math.min(y1 + 1, height - 1);

      // Bilinear interpolation for each channel
      for (let c = 0; c < 4; c++) {
        const topLeft = input[(y1 * width + x1) * 4 + c];
        const topRight = input[(y1 * width + x2) * 4 + c];
        const bottomLeft = input[(y2 * width + x1) * 4 + c];
        const bottomRight = input[(y2 * width + x2) * 4 + c];

        const xWeight = srcX - x1;
        const yWeight = srcY - y1;

        const top = topLeft * (1 - xWeight) + topRight * xWeight;
        const bottom = bottomLeft * (1 - xWeight) + bottomRight * xWeight;

        output[outputIndex++] = Math.round(top * (1 - yWeight) + bottom * yWeight);
      }
    }
  }

  return newWidth * newHeight * 4;
}

/**
 * Initialize mock WASM module (simulates async loading)
 */
export async function initMockWasm(): Promise<CoreWasmApi> {
  // Simulate loading delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return createMockCoreWasm();
}
