/**
 * Image processing utility functions
 * Helper functions for image data manipulation and conversion
 */

import { ImageFormat } from '../types';

/**
 * Convert a File object to ImageData
 * Loads the image into a canvas and extracts the pixel data
 */
export async function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // Create canvas and draw image
        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image and extract ImageData
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        URL.revokeObjectURL(url);
        resolve(imageData);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Convert ImageData to a data URL (base64)
 */
export function imageDataToDataURL(imageData: ImageData, format: ImageFormat = ImageFormat.PNG): string {
  // Create canvas to hold the image data
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Put image data onto canvas
  ctx.putImageData(imageData, 0, 0);

  // Convert to blob and then to data URL
  // Note: OffscreenCanvas doesn't directly support toDataURL, so we use regular canvas
  const regularCanvas = document.createElement('canvas');
  regularCanvas.width = imageData.width;
  regularCanvas.height = imageData.height;
  const regularCtx = regularCanvas.getContext('2d');

  if (!regularCtx) {
    throw new Error('Failed to get 2D canvas context');
  }

  regularCtx.putImageData(imageData, 0, 0);
  return regularCanvas.toDataURL(format);
}

/**
 * Convert a data URL to a Blob
 */
export function dataURLtoBlob(dataURL: string): Blob {
  // Extract the base64 data from the data URL
  const arr = dataURL.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);

  if (!mimeMatch) {
    throw new Error('Invalid data URL format');
  }

  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Convert a Blob to a data URL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read blob'));
    };

    reader.readAsDataURL(blob);
  });
}

/**
 * Downsample an image to fit within maximum dimensions
 * Useful for creating preview images
 */
export async function downsampleImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // Create canvas with new dimensions
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.convertToBlob().then((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        }).catch((error) => {
          URL.revokeObjectURL(url);
          reject(error);
        });
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Create a thumbnail of an image
 */
export async function createThumbnail(
  file: File,
  width: number,
  height: number
): Promise<string> {
  const blob = await downsampleImage(file, width, height);
  return blobToDataURL(blob);
}

/**
 * Get image format from MIME type
 */
export function getFormatFromMime(mimeType: string): ImageFormat {
  const formatMap: Record<string, ImageFormat> = {
    'image/jpeg': ImageFormat.JPEG,
    'image/png': ImageFormat.PNG,
    'image/webp': ImageFormat.WEBP,
    'image/heic': ImageFormat.HEIC,
    'image/gif': ImageFormat.GIF,
    'image/bmp': ImageFormat.BMP,
    'image/tiff': ImageFormat.TIFF,
  };

  return formatMap[mimeType] ?? ImageFormat.JPEG;
}

/**
 * Check if a format supports transparency
 */
export function formatSupportsTransparency(format: ImageFormat): boolean {
  return [
    ImageFormat.PNG,
    ImageFormat.WEBP,
    ImageFormat.GIF,
  ].includes(format);
}

/**
 * Calculate the aspect ratio of an image
 */
export function calculateAspectRatio(width: number, height: number): number {
  if (height === 0) {
    return 0;
  }
  return width / height;
}

/**
 * Calculate dimensions for a target aspect ratio
 */
export function calculateDimensionsForAspectRatio(
  currentWidth: number,
  currentHeight: number,
  targetRatio: number
): { width: number; height: number } {
  const currentRatio = calculateAspectRatio(currentWidth, currentHeight);

  // If current ratio is less than target, fit by width
  if (currentRatio < targetRatio) {
    return {
      width: currentWidth,
      height: Math.floor(currentWidth / targetRatio),
    };
  }
  // Otherwise fit by height
  else {
    return {
      width: Math.floor(currentHeight * targetRatio),
      height: currentHeight,
    };
  }
}

/**
 * Check if an image needs EXIF rotation
 */
export function needsEXIFRotation(exifOrientation?: number): boolean {
  // EXIF orientations 3, 6, and 8 require rotation
  return exifOrientation === 3 || exifOrientation === 6 || exifOrientation === 8;
}

/**
 * Get rotation angle from EXIF orientation
 */
export function getRotationFromEXIF(exifOrientation: number): 0 | 90 | 180 | 270 {
  switch (exifOrientation) {
    case 3:
      return 180;
    case 6:
      return 90;
    case 8:
      return 270;
    default:
      return 0;
  }
}
