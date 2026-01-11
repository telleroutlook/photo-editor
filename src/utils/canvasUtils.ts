/**
 * Canvas utility functions for image processing
 */

/**
 * Convert ImageData to a Blob with the specified format
 * @param imageData The ImageData to convert
 * @param format The MIME type of the output image (default: 'image/png')
 * @returns Promise resolving to a Blob
 */
export function imageDataToBlob(
  imageData: ImageData,
  format: 'image/jpeg' | 'image/webp' | 'image/png' = 'image/png'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      format
    );
  });
}

/**
 * Convert Uint8Array (RGBA) to ImageData
 * @param data The RGBA pixel data
 * @param width Image width
 * @param height Image height
 * @returns ImageData object
 */
export function rgbaToImageData(data: Uint8Array, width: number, height: number): ImageData {
  return new ImageData(new Uint8ClampedArray(data), width, height);
}

/**
 * Convert Uint8Array (RGBA) to a Blob with the specified format
 * Combines rgbaToImageData and imageDataToBlob for convenience
 * @param data The RGBA pixel data
 * @param width Image width
 * @param height Image height
 * @param format The MIME type of the output image (default: 'image/png')
 * @returns Promise resolving to a Blob
 */
export async function rgbaToBlob(
  data: Uint8Array,
  width: number,
  height: number,
  format: 'image/jpeg' | 'image/webp' | 'image/png' = 'image/png'
): Promise<Blob> {
  const imageData = rgbaToImageData(data, width, height);
  return imageDataToBlob(imageData, format);
}

/**
 * Download a blob as a file
 * @param blob The blob to download
 * @param filename The name of the downloaded file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
