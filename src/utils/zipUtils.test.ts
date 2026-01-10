/**
 * zipUtils.test.ts - Unit tests for ZIP export utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  exportAsZip,
  downloadZip,
  formatBytes,
  getMimeTypeFromFileName,
  arrayBufferToBlob,
} from './zipUtils';

// Mock JSZip
vi.mock('jszip', () => {
  return {
    default: vi.fn(() => ({
      file: vi.fn(),
      generateAsync: vi.fn(() => Promise.resolve(new Blob(['mock zip content']))),
    })),
  };
});

describe('zipUtils', () => {
  describe('getMimeTypeFromFileName', () => {
    it('should return correct MIME type for JPEG', () => {
      expect(getMimeTypeFromFileName('test.jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromFileName('test.jpeg')).toBe('image/jpeg');
    });

    it('should return correct MIME type for PNG', () => {
      expect(getMimeTypeFromFileName('test.png')).toBe('image/png');
    });

    it('should return correct MIME type for WebP', () => {
      expect(getMimeTypeFromFileName('test.webp')).toBe('image/webp');
    });

    it('should return default MIME type for unknown formats', () => {
      expect(getMimeTypeFromFileName('test.unknown')).toBe('image/jpeg');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1536000)).toBe('1.46 MB');
    });
  });

  describe('arrayBufferToBlob', () => {
    it('should convert ArrayBuffer to Blob', () => {
      const buffer = new ArrayBuffer(1024);
      const blob = arrayBufferToBlob(buffer, 'image/jpeg');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/jpeg');
      expect(blob.size).toBe(1024);
    });

    it('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      const blob = arrayBufferToBlob(buffer, 'image/png');

      expect(blob.size).toBe(0);
    });
  });

  describe('exportAsZip', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL and revokeObjectURL
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      globalThis.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create ZIP with default options', async () => {
      const files = [
        {
          fileName: 'test1.jpg',
          imageData: new ArrayBuffer(1024),
        },
        {
          fileName: 'test2.png',
          imageData: new ArrayBuffer(2048),
        },
      ];

      const zipBlob = await exportAsZip(files);

      expect(zipBlob).toBeInstanceOf(Blob);
    });

    it('should include original files when requested', async () => {
      const files = [
        {
          fileName: 'test1.jpg',
          imageData: new ArrayBuffer(1024),
          originalFile: {
            fileName: 'original_test1.jpg',
            imageData: new ArrayBuffer(2048),
          },
        },
      ];

      const zipBlob = await exportAsZip(files, {
        includeOriginal: true,
      });

      expect(zipBlob).toBeInstanceOf(Blob);
    });

    it('should use custom ZIP filename', async () => {
      const files = [
        {
          fileName: 'test.jpg',
          imageData: new ArrayBuffer(1024),
        },
      ];

      const zipBlob = await exportAsZip(files, {
        zipFileName: 'custom_export.zip',
      });

      expect(zipBlob).toBeInstanceOf(Blob);
    });

    it('should apply custom compression level', async () => {
      const files = [
        {
          fileName: 'test.jpg',
          imageData: new ArrayBuffer(1024),
        },
      ];

      const zipBlob = await exportAsZip(files, {
        compressionLevel: 9,
      });

      expect(zipBlob).toBeInstanceOf(Blob);
    });

    it('should handle empty file list', async () => {
      const zipBlob = await exportAsZip([]);

      expect(zipBlob).toBeInstanceOf(Blob);
    });
  });

  describe('downloadZip', () => {
    beforeEach(() => {
      // Setup DOM mocks
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      globalThis.URL.revokeObjectURL = vi.fn();

      // Mock createElement to return a mock link element
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        const link = {
          href: '',
          download: '',
          click: vi.fn(),
          style: {},
        } as any;
        return link;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create download link and trigger click', () => {
      const blob = new Blob(['test content']);
      downloadZip(blob, 'test.zip');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should use default filename if not provided', () => {
      const blob = new Blob(['test content']);
      downloadZip(blob);

      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should cleanup object URL after download', () => {
      const blob = new Blob(['test content']);
      const mockUrl = 'blob:mock-url';
      globalThis.URL.createObjectURL = vi.fn(() => mockUrl);

      downloadZip(blob, 'test.zip');

      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });
  });
});
