import React, { useState, useCallback } from 'react';
import { useImageStore } from '../store/imageStore';
import { CompressControls } from '../components/compress';
import { CompressionFormat } from '../types';
import { formatBytes } from '../utils/constants';
import { useCompressWorker } from '../hooks/useCompressWorker';
import { fileToImageData } from '../utils/imageUtils';

export const CompressTool = () => {
  const { getSelectedImage } = useImageStore();
  const selectedImage = getSelectedImage();
  const [compressParams, setCompressParams] = useState<{
    format: CompressionFormat;
    quality: number;
    targetSize?: number;
  }>({
    format: CompressionFormat.WebP,
    quality: 80,
    targetSize: undefined,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize compression worker
  const { compressJpeg, compressWebp, compressPng, compressToSize, loading: wasmLoading, error: wasmError } = useCompressWorker();

  // ✅ All useCallbacks must be declared before any conditional returns (React Hooks rule)
  const handleCompressChange = useCallback((params: { format: CompressionFormat; quality: number; targetSize?: number }) => {
    setCompressParams(params);
  }, []);

  const handleApplyCompress = useCallback(async () => {
    if (!selectedImage) {
      alert('No image selected');
      return;
    }

    setIsProcessing(true);
    try {
      // Check if WASM module is initialized
      if (wasmError) {
        throw new Error(`WASM initialization failed: ${wasmError.message}`);
      }

      // Convert image to RGBA buffer
      const imageData = await fileToImageData(selectedImage.file);
      const rgbaBuffer = new Uint8Array(imageData.data);

      let result;
      const { format, quality, targetSize } = compressParams;

      // Route to appropriate compression function
      if (targetSize) {
        // Target size mode (binary search)
        result = await compressToSize(
          rgbaBuffer,
          selectedImage.width,
          selectedImage.height,
          targetSize,
          format
        );
      } else if (format === CompressionFormat.WebP) {
        // WebP compression
        result = await compressWebp(
          rgbaBuffer,
          selectedImage.width,
          selectedImage.height,
          quality
        );
      } else if (format === CompressionFormat.PNG) {
        // PNG compression
        result = await compressPng(
          rgbaBuffer,
          selectedImage.width,
          selectedImage.height,
          quality
        );
      } else {
        // JPEG compression
        result = await compressJpeg(
          rgbaBuffer,
          selectedImage.width,
          selectedImage.height,
          quality
        );
      }

      // Create new File from compressed data
      const mimeTypes = {
        [CompressionFormat.JPEG]: 'image/jpeg',
        [CompressionFormat.WebP]: 'image/webp',
        [CompressionFormat.PNG]: 'image/png',
      };
      const mimeType = mimeTypes[format];
      const extension = mimeType.split('/')[1];
      const originalName = selectedImage.file.name.replace(/\.[^/.]+$/, '');
      const newName = `${originalName}_compressed.${extension}`;

      // Convert Uint8Array to regular ArrayBuffer to avoid SharedArrayBuffer issues
      const buffer = new ArrayBuffer(result.imageData.length);
      new Uint8Array(buffer).set(result.imageData);
      const compressedFile = new File([buffer], newName, { type: mimeType });

      // Display success message
      const mode = targetSize ? 'Target Size' : 'Quality';
      const formatLabel = format === CompressionFormat.WebP ? 'WebP' : format === CompressionFormat.JPEG ? 'JPEG' : 'PNG';
      const savings = Math.round(((selectedImage.file.size - result.size) / selectedImage.file.size) * 100);

      let message = `✅ Compression complete!\n\n`;
      message += `Format: ${formatLabel}\n`;
      message += `Original: ${formatBytes(selectedImage.file.size)}\n`;
      message += `Compressed: ${formatBytes(result.size)}\n`;
      message += `Quality: ${result.quality}%\n`;
      message += `Space saved: ${savings}%\n`;
      message += `Mode: ${mode}`;

      if (targetSize) {
        message += `\nTarget: ${formatBytes(targetSize)}`;
      }

      alert(message);
    } catch (error) {
      console.error('Compression failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Compression failed: ${errorMessage}\n\nPlease try again or check the browser console for details.`);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, wasmError, compressParams, compressToSize, compressWebp, compressJpeg]);

  const handleReset = useCallback(() => {
    const defaultParams = {
      format: CompressionFormat.WebP,
      quality: 80,
      targetSize: undefined,
    };
    setCompressParams(defaultParams);
  }, []);

  // ✅ Early return after all hooks are declared
  if (!selectedImage) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-yellow-800 mb-2">⚠️ No Image Selected</h2>
        <p className="text-yellow-700">Please upload and select an image first.</p>
      </div>
    );
  }

  // Get original file size from File object
  const originalSize = selectedImage.file.size;

  // Detect original format from MIME type
  const originalFormat = selectedImage.file.type.split('/')[1].toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🗜️ Compression Tool</h2>
        <p className="text-gray-600">
          Image: {selectedImage.file.name} ({selectedImage.width} × {selectedImage.height} px)
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Original: {formatBytes(originalSize)} • {originalFormat}
        </p>

        {/* WASM Status Indicator */}
        {wasmLoading && (
          <div className="mt-3 flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading WASM compression module...
          </div>
        )}

        {wasmError && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            ⚠️ WASM module failed to load. Using mock compression for development.
          </div>
        )}
      </div>

      {/* Compress Controls */}
      <CompressControls
        originalSize={originalSize}
        originalFormat={originalFormat}
        onCompressChange={handleCompressChange}
        onApply={handleApplyCompress}
        onReset={handleReset}
        isProcessing={isProcessing}
      />
    </div>
  );
};
