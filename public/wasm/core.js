/**
 * Mock WASM Core Module
 * This is a placeholder for development and testing
 * TODO: Replace with actual compiled WASM from wasm-src/core/
 */

let wasmModule = null;
let initialized = false;

/**
 * Initialize the WASM module
 */
async function init() {
  if (initialized) {
    return wasmModule;
  }

  // In production, this would load the actual .wasm file
  // For now, we create a mock module
  wasmModule = {
    crop_image: mockCropImage,
    rotate_image: mockRotateImage,
    flip_image: mockFlipImage,
    resize_image: mockResizeImage,
  };

  initialized = true;
  console.warn('⚠️ Using MOCK WASM core module. Replace with actual WASM for production.');
  return wasmModule;
}

/**
 * Mock crop image function
 */
function mockCropImage(input, width, height, cropRect, output) {
  const { x, y, width: cropWidth, height: cropHeight } = cropRect;

  // Validate bounds
  if (x + cropWidth > width || y + cropHeight > height) {
    return 0;
  }

  // Copy cropped region row by row
  let outputIdx = 0;
  for (let row = 0; row < cropHeight; row++) {
    const srcY = y + row;
    const srcStart = (srcY * width + x) * 4;
    const rowBytes = cropWidth * 4;

    for (let i = 0; i < rowBytes; i++) {
      output[outputIdx++] = input[srcStart + i];
    }
  }

  return outputIdx;
}

/**
 * Mock rotate image function (90° increments only)
 */
function mockRotateImage(input, width, height, angle, output) {
  const angleMap = { 0: 0, 90: 1, 180: 2, 270: 3 };
  const rotation = angleMap[angle] || 0;

  switch (rotation) {
    case 0: // No rotation
      for (let i = 0; i < input.length; i++) {
        output[i] = input[i];
      }
      break;

    case 1: // 90° clockwise
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y * width + x) * 4;
          const dstX = height - 1 - y;
          const dstY = x;
          const dstIdx = (dstY * height + dstX) * 4;

          for (let c = 0; c < 4; c++) {
            output[dstIdx + c] = input[srcIdx + c];
          }
        }
      }
      break;

    case 2: // 180°
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y * width + x) * 4;
          const dstX = width - 1 - x;
          const dstY = height - 1 - y;
          const dstIdx = (dstY * width + dstX) * 4;

          for (let c = 0; c < 4; c++) {
            output[dstIdx + c] = input[srcIdx + c];
          }
        }
      }
      break;

    case 3: // 270° clockwise (90° counter-clockwise)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y * width + x) * 4;
          const dstX = y;
          const dstY = width - 1 - x;
          const dstIdx = (dstY * height + dstX) * 4;

          for (let c = 0; c < 4; c++) {
            output[dstIdx + c] = input[srcIdx + c];
          }
        }
      }
      break;
  }

  return input.length;
}

/**
 * Mock flip image function
 */
function mockFlipImage(input, width, height, direction, output) {
  const isHorizontal = direction === 0; // 0 = Horizontal, 1 = Vertical

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstX = isHorizontal ? width - 1 - x : x;
      const dstY = isHorizontal ? y : height - 1 - y;
      const dstIdx = (dstY * width + dstX) * 4;

      for (let c = 0; c < 4; c++) {
        output[dstIdx + c] = input[srcIdx + c];
      }
    }
  }

  return input.length;
}

/**
 * Mock resize image function
 * Uses simple nearest-neighbor interpolation
 */
function mockResizeImage(input, width, height, newWidth, newHeight, quality, output) {
  const xScale = width / newWidth;
  const yScale = height / newHeight;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor(x * xScale);
      const srcY = Math.floor(y * yScale);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        output[dstIdx + c] = input[srcIdx + c];
      }
    }
  }

  return newWidth * newHeight * 4;
}

export default init;
