/**
 * ZIP Utilities
 * Export multiple images as ZIP archive using JSZip
 */

import JSZip from 'jszip';
import type { ZipExportOptions } from '../types/batch';

/**
 * Convert ArrayBuffer to Blob
 */
export function arrayBufferToBlob(buffer: ArrayBuffer, mimeType: string): Blob {
  return new Blob([buffer], { type: mimeType });
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/**
 * Export processed images as ZIP archive
 */
export async function exportAsZip(
  files: Array<{
    fileName: string;
    imageData: ArrayBuffer;
    originalFile?: { fileName: string; imageData: ArrayBuffer };
  }>,
  options: ZipExportOptions = {}
): Promise<Blob> {
  const {
    compressionLevel = 6,
    includeOriginal = false,
  } = options;

  // Create new ZIP archive
  const zip = new JSZip();

  // Add processed images to ZIP
  files.forEach((file, _index) => {
    const mimeType = getMimeTypeFromFileName(file.fileName);
    const blob = arrayBufferToBlob(file.imageData, mimeType);

    zip.file(file.fileName, blob);

    // Optionally include original image
    if (includeOriginal && file.originalFile) {
      const originalMimeType = getMimeTypeFromFileName(file.originalFile.fileName);
      const originalBlob = arrayBufferToBlob(file.originalFile.imageData, originalMimeType);
      zip.file(`original_${file.originalFile.fileName}`, originalBlob);
    }
  });

  // Add comment if provided (Note: JSZip doesn't have a comment property in the main API)
  // Comment can be added as a separate file in the ZIP if needed
  // if (comment) {
  //   zip.file('README.txt', comment);
  // }

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: compressionLevel },
  });

  return zipBlob;
}

/**
 * Download ZIP file to user's computer
 */
export function downloadZip(zipBlob: Blob, fileName?: string): void {
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'processed_images.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download ZIP in one step
 */
export async function exportAndDownloadZip(
  files: Array<{
    fileName: string;
    imageData: ArrayBuffer;
    originalFile?: { fileName: string; imageData: ArrayBuffer };
  }>,
  options: ZipExportOptions = {}
): Promise<void> {
  const zipBlob = await exportAsZip(files, options);
  downloadZip(zipBlob, options.zipFileName);
}

/**
 * Calculate total size of processed images
 */
export function calculateTotalSize(files: ArrayBuffer[]): number {
  return files.reduce((total, buffer) => total + buffer.byteLength, 0);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Estimate ZIP file size (rough estimate: ZIP overhead + ~5% compression)
 */
export function estimateZipSize(totalImageDataSize: number): number {
  const zipOverhead = 1024; // ~1KB for ZIP structure
  const estimatedCompressedSize = totalImageDataSize * 0.95; // Assume 5% compression
  return zipOverhead + estimatedCompressedSize;
}
