/**
 * Mock WASM Background Removal Module
 * This is a placeholder for development and testing
 * TODO: Replace with actual compiled WASM from wasm-src/bgremove/
 */

let wasmModule = null;
let initialized = false;

async function init() {
  if (initialized) {
    return wasmModule;
  }

  wasmModule = {
    remove_solid_color: mockRemoveSolidColor,
    magic_wand_select: mockMagicWandSelect,
    grabcut_segment: mockGrabCutSegment,
  };

  initialized = true;
  console.warn('⚠️ Using MOCK WASM bgremove module. Replace with actual WASM for production.');
  return wasmModule;
}

function mockRemoveSolidColor(input, width, height, targetColor, tolerance, feather, output) {
  const outputLength = width * height * 4;
  
  for (let i = 0; i < outputLength; i += 4) {
    const r = input[i];
    const g = input[i + 1];
    const b = input[i + 2];

    const dr = r - targetColor[0];
    const dg = g - targetColor[1];
    const db = b - targetColor[2];

    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    output[i] = r;
    output[i + 1] = g;
    output[i + 2] = b;

    if (distance <= tolerance) {
      output[i + 3] = 0;
    } else {
      output[i + 3] = input[i + 3];
    }
  }

  return outputLength;
}

function mockMagicWandSelect(input, width, height, seedX, seedY, tolerance, connected, maskOutput) {
  const pixelCount = width * height;
  const seedIdx = (seedY * width + seedX) * 4;
  
  const seedR = input[seedIdx];
  const seedG = input[seedIdx + 1];
  const seedB = input[seedIdx + 2];

  if (connected) {
    // Connected flood fill
    const visited = new Uint8Array(pixelCount);
    const stack = [[seedX, seedY]];

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const idx = y * width + x;

      if (visited[idx]) continue;
      visited[idx] = 1;

      const pixelIdx = idx * 4;
      const r = input[pixelIdx];
      const g = input[pixelIdx + 1];
      const b = input[pixelIdx + 2];

      const dr = r - seedR;
      const dg = g - seedG;
      const db = b - seedB;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);

      if (distance <= tolerance) {
        maskOutput[idx] = 255;

        if (x > 0) stack.push([x - 1, y]);
        if (x < width - 1) stack.push([x + 1, y]);
        if (y > 0) stack.push([x, y - 1]);
        if (y < height - 1) stack.push([x, y + 1]);
      }
    }
  } else {
    // Global color selection
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = input[idx];
        const g = input[idx + 1];
        const b = input[idx + 2];

        const dr = r - seedR;
        const dg = g - seedG;
        const db = b - seedB;
        const distance = Math.sqrt(dr * dr + dg * dg + db * db);

        if (distance <= tolerance) {
          maskOutput[y * width + x] = 255;
        }
      }
    }
  }

  return pixelCount;
}

function mockGrabCutSegment(input, width, height, rectX, rectY, rectWidth, rectHeight, iterations, maskOutput) {
  const pixelCount = width * height;

  // Initialize mask: outside rect = background (0), inside = foreground (255)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const inRect = x >= rectX && x < rectX + rectWidth && y >= rectY && y < rectY + rectHeight;
      maskOutput[idx] = inRect ? 255 : 0;
    }
  }

  console.warn('⚠️ MOCK GrabCut: Simple rectangular mask. Replace with actual WASM for GMM-based segmentation.');
  return pixelCount;
}

export default init;
