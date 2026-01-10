/**
 * File validation and utility functions
 * Helper functions for file handling and validation
 */

import { ImageFormat } from '../types';
import { MAX_FILE_SIZE, ERROR_MESSAGES, SUPPORTED_INPUT_FORMATS } from './constants';

/**
 * Validation result interface
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file for upload
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedFormats?: ImageFormat[];
  } = {}
): FileValidationResult {
  const { maxSize = MAX_FILE_SIZE, allowedFormats = SUPPORTED_INPUT_FORMATS } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: ERROR_MESSAGES.FILE_TOO_LARGE(maxSize),
    };
  }

  // Check file format
  const format = getFormatFromFile(file);
  if (!allowedFormats.includes(format)) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_FORMAT(
        allowedFormats.map((f: ImageFormat) => f.toString())
      ),
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  options: {
    maxSize?: number;
    maxCount?: number;
    allowedFormats?: ImageFormat[];
  } = {}
): { valid: boolean; errors: string[]; validFiles: File[] }
{
  const {
    maxSize = MAX_FILE_SIZE,
    maxCount = 10,
    allowedFormats = SUPPORTED_INPUT_FORMATS,
  } = options;

  const errors: string[] = [];
  const validFiles: File[] = [];

  // Check file count
  if (files.length > maxCount) {
    errors.push(`Maximum ${maxCount} files allowed`);
    return { valid: false, errors, validFiles };
  }

  // Validate each file
  files.forEach((file, index) => {
    const result = validateFile(file, { maxSize, allowedFormats });

    if (result.valid) {
      validFiles.push(file);
    } else {
      errors.push(`File ${index + 1} (${file.name}): ${result.error}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    validFiles,
  };
}

/**
 * Get image format from file
 */
export function getFormatFromFile(file: File): ImageFormat {
  // Try to get format from MIME type first
  if (file.type.startsWith('image/')) {
    const format = file.type as ImageFormat;
    if (SUPPORTED_INPUT_FORMATS.includes(format)) {
      return format;
    }
  }

  // Fallback: infer from file extension
  const extension = getFileExtension(file.name);
  if (extension) {
    const formatMap: Record<string, ImageFormat> = {
      jpg: ImageFormat.JPEG,
      jpeg: ImageFormat.JPEG,
      png: ImageFormat.PNG,
      webp: ImageFormat.WEBP,
      gif: ImageFormat.GIF,
      bmp: ImageFormat.BMP,
      tiff: ImageFormat.TIFF,
      tif: ImageFormat.TIFF,
      heic: ImageFormat.HEIC,
    };

    return formatMap[extension.toLowerCase()] ?? ImageFormat.JPEG;
  }

  // Default fallback
  return ImageFormat.JPEG;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string | null {
  const parts = filename.split('.');
  if (parts.length < 2) {
    return null;
  }
  return parts.pop() ?? null;
}

/**
 * Generate a unique ID for a file
 */
export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get file name without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return filename;
  }
  return filename.substring(0, lastDotIndex);
}

/**
 * Generate a safe filename for download
 * Removes special characters and adds extension
 */
export function generateSafeFilename(
  originalName: string,
  suffix?: string,
  newExtension?: string
): string {
  // Get base name without extension
  const baseName = getFileNameWithoutExtension(originalName);

  // Remove special characters (keep only alphanumeric, spaces, hyphens, underscores)
  const cleanName = baseName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();

  // Add suffix if provided
  const nameWithSuffix = suffix ? `${cleanName}-${suffix}` : cleanName;

  // Get extension
  const extension = newExtension || getFileExtension(originalName) || 'jpg';

  return `${nameWithSuffix}.${extension}`;
}

/**
 * Check if files are valid images
 */
export function areImageFiles(files: File[]): boolean {
  return files.every((file) => file.type.startsWith('image/'));
}

/**
 * Filter files to only include images
 */
export function filterImageFiles(files: File[]): File[] {
  return files.filter((file) => file.type.startsWith('image/'));
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read file as array buffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read file as data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Check if a file is a HEIC image
 */
export function isHeicFile(file: File): boolean {
  const format = getFormatFromFile(file);
  return format === ImageFormat.HEIC;
}

/**
 * Check if file size is considered large
 */
export function isLargeFile(file: File, threshold = 10 * 1024 * 1024): boolean {
  return file.size > threshold;
}

/**
 * Get file category for display purposes
 */
export function getFileCategory(file: File): string {
  if (!file.type.startsWith('image/')) {
    return 'Unknown';
  }

  const format = getFormatFromFile(file);
  const categoryMap: Record<ImageFormat, string> = {
    [ImageFormat.JPEG]: 'JPEG Image',
    [ImageFormat.PNG]: 'PNG Image',
    [ImageFormat.WEBP]: 'WebP Image',
    [ImageFormat.HEIC]: 'HEIC Image',
    [ImageFormat.GIF]: 'GIF Image',
    [ImageFormat.BMP]: 'BMP Image',
    [ImageFormat.TIFF]: 'TIFF Image',
  };

  return categoryMap[format] || 'Image';
}
