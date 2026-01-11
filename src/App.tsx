import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useAppStore } from './store/appStore';
import { useImageStore } from './store/imageStore';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { FileList } from './components/upload/FileList';
import { UploadZone } from './components/upload/UploadZone';
import { PasteHandler } from './components/upload/PasteHandler';

// Canvas Views
import { PreviewCanvas } from './components/preview/PreviewCanvas';
// Lazy load CropCanvas to defer Fabric.js loading until needed
const CropCanvas = lazy(() => import('./components/crop/CropCanvas').then(module => ({ default: module.CropCanvas })));

// Tool Controls
import { CompressControls } from './components/compress/CompressControls';
import { ResizeControls } from './components/resize/ResizeControls';
import { RotateFlipControls } from './components/rotate/RotateFlipControls';
import { CropControls } from './components/crop/CropControls';
import { BgRemoveControls } from './components/bgremove/BgRemoveControls';

// Types and Hooks
import { CompressionFormat, ResizeQuality, RotateAngle, FlipDirection, MessageType, CropRect } from './types';
import type { JpegAdvancedParams, WebPAdvancedParams } from './types/wasm';
import { useCompressWorker } from './hooks/useCompressWorker';
import { fileToImageData } from './utils/imageUtils';
import { formatBytes } from './utils/constants';
import { getCoreWorker } from './utils/workerManager';

function App() {
  const { currentFeature, setDarkMode } = useAppStore();
  const { addImages, getSelectedImage } = useImageStore();

  const currentImage = getSelectedImage();

  // Initialize dark mode on mount
  useEffect(() => {
    setDarkMode(true);
  }, [setDarkMode]);

  // ============= COMPRESS TOOL STATE =============
  const [compressParams, setCompressParams] = useState<{
    format: CompressionFormat;
    quality: number;
    targetSize?: number;
    advancedParams?: JpegAdvancedParams | WebPAdvancedParams;
  }>({
    format: CompressionFormat.WebP,
    quality: 80,
    targetSize: undefined,
    advancedParams: undefined,
  });
  const [isCompressing, setIsCompressing] = useState(false);

  const { compressJpeg, compressWebp, compressPng, compressToSize, error: wasmError } = useCompressWorker();

  // ============= RESIZE TOOL STATE =============
  const [resizeParams, setResizeParams] = useState<{
    width: number;
    height: number;
    quality: ResizeQuality;
  }>({
    width: currentImage?.width || 0,
    height: currentImage?.height || 0,
    quality: ResizeQuality.High,
  });
  const [isResizing, setIsResizing] = useState(false);

  // ============= ROTATE/FLIP TOOL STATE =============
  const [rotation, setRotation] = useState<RotateAngle>(0);
  const [isRotating, setIsRotating] = useState(false);

  // ============= CROP TOOL STATE =============
  const [cropRect, setCropRect] = useState<CropRect>({
    x: 0,
    y: 0,
    width: currentImage?.width || 0,
    height: currentImage?.height || 0,
  });
  const [isCropping, setIsCropping] = useState(false);

  // ============= BGREMOVE TOOL STATE =============
  const [bgRemoveImageData, setBgRemoveImageData] = useState<Uint8Array | null>(null);

  // Update bgremove imageData when image changes
  useEffect(() => {
    if (currentImage) {
      fileToImageData(currentImage.file).then((imgData) => {
        setBgRemoveImageData(new Uint8Array(imgData.data));
      }).catch(err => {
        console.error('Failed to load image data for bgremove:', err);
      });
    }
  }, [currentImage]);

  // Update crop rect when image changes
  useEffect(() => {
    if (currentImage) {
      setCropRect({
        x: 0,
        y: 0,
        width: currentImage.width,
        height: currentImage.height,
      });
    }
  }, [currentImage]);

  // Update resize params when image changes
  useEffect(() => {
    if (currentImage) {
      setResizeParams({
        width: currentImage.width,
        height: currentImage.height,
        quality: ResizeQuality.High,
      });
    }
  }, [currentImage]);

  // ============= HELPER FUNCTIONS =============

  /**
   * Download processed image
   */
  const downloadImage = (blob: Blob, originalName: string, suffix: string, format: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${originalName.replace(/\.[^/.]+$/, '')}_${suffix}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ============= COMPRESS TOOL HANDLERS =============
  const handleCompressChange = useCallback((params: {
    format: CompressionFormat;
    quality: number;
    targetSize?: number;
    advancedParams?: JpegAdvancedParams | WebPAdvancedParams;
  }) => {
    setCompressParams(params);
  }, []);

  const handleApplyCompress = useCallback(async () => {
    if (!currentImage) {
      alert('No image selected');
      return;
    }

    setIsCompressing(true);
    try {
      if (wasmError) {
        throw new Error(`WASM initialization failed: ${wasmError.message}`);
      }

      const imageData = await fileToImageData(currentImage.file);
      const rgbaBuffer = new Uint8Array(imageData.data);

      let result;
      const { format, quality, targetSize } = compressParams;

      if (targetSize) {
        result = await compressToSize(
          rgbaBuffer,
          currentImage.width,
          currentImage.height,
          targetSize,
          format
        );
      } else if (format === CompressionFormat.WebP) {
        result = await compressWebp(
          rgbaBuffer,
          currentImage.width,
          currentImage.height,
          quality,
          compressParams.advancedParams as WebPAdvancedParams
        );
      } else if (format === CompressionFormat.PNG) {
        result = await compressPng(
          rgbaBuffer,
          currentImage.width,
          currentImage.height,
          quality
        );
      } else {
        result = await compressJpeg(
          rgbaBuffer,
          currentImage.width,
          currentImage.height,
          quality,
          compressParams.advancedParams as JpegAdvancedParams
        );
      }

      const mimeTypes = {
        [CompressionFormat.JPEG]: 'image/jpeg',
        [CompressionFormat.WebP]: 'image/webp',
        [CompressionFormat.PNG]: 'image/png',
      };
      const mimeType = mimeTypes[format];
      const extension = mimeType.split('/')[1];
      const originalName = currentImage.file.name.replace(/\.[^/.]+$/, '');
      const newName = `${originalName}_compressed.${extension}`;

      const buffer = new ArrayBuffer(result.imageData.length);
      new Uint8Array(buffer).set(result.imageData);

      // Download the compressed file
      downloadImage(new Blob([buffer], { type: mimeType }), currentImage.file.name, 'compressed', extension);

      const mode = targetSize ? 'Target Size' : 'Quality';
      const formatLabel = format === CompressionFormat.WebP ? 'WebP' : format === CompressionFormat.JPEG ? 'JPEG' : 'PNG';
      const savings = Math.round(((currentImage.file.size - result.size) / currentImage.file.size) * 100);

      let message = `✅ Compression complete!\n\n`;
      message += `Format: ${formatLabel}\n`;
      message += `Original: ${formatBytes(currentImage.file.size)}\n`;
      message += `Compressed: ${formatBytes(result.size)}\n`;
      message += `Quality: ${result.quality}%\n`;
      message += `Space saved: ${savings}%\n`;
      message += `Mode: ${mode}`;

      if (targetSize) {
        message += `\nTarget: ${formatBytes(targetSize)}`;
      }

      message += `\n\n📥 File downloaded: ${newName}`;

      alert(message);
    } catch (error) {
      console.error('Compression failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Compression failed: ${errorMessage}\n\nPlease try again or check the browser console for details.`);
    } finally {
      setIsCompressing(false);
    }
  }, [currentImage, wasmError, compressParams, compressToSize, compressWebp, compressJpeg, compressPng]);

  const handleResetCompress = useCallback(() => {
    setCompressParams({
      format: CompressionFormat.WebP,
      quality: 80,
      targetSize: undefined,
      advancedParams: undefined,
    });
  }, []);

  // ============= RESIZE TOOL HANDLERS =============
  const handleResizeChange = useCallback((params: { width: number; height: number; quality: ResizeQuality }) => {
    setResizeParams(params);
  }, []);

  const handleApplyResize = useCallback(async () => {
    if (!currentImage) return;

    setIsResizing(true);
    try {
      const { width: newWidth, height: newHeight, quality } = resizeParams;

      // Skip if dimensions are unchanged
      if (newWidth === currentImage.width && newHeight === currentImage.height) {
        alert('Image dimensions are unchanged. Please adjust the size first.');
        return;
      }

      // Convert image to RGBA buffer
      const imageData = await fileToImageData(currentImage.file);
      const rgbaBuffer = new Uint8Array(imageData.data);

      // Send to WASM worker for resizing
      const worker = getCoreWorker();
      const response = await worker.sendMessage<{
        imageData: Uint8Array;
        width: number;
        height: number;
      }>({
        id: `${Date.now()}-resize`,
        type: MessageType.RESIZE_IMAGE,
        payload: {
          imageData: rgbaBuffer.buffer,
          width: currentImage.width,
          height: currentImage.height,
          newWidth,
          newHeight,
          quality,
        },
        timestamp: Date.now(),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Resize operation failed');
      }

      // Convert result back to ImageData
      const resizedImageData = new ImageData(
        new Uint8ClampedArray(response.data.imageData),
        response.data.width,
        response.data.height
      );

      // Create result canvas and convert to blob
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = response.data.width;
      resultCanvas.height = response.data.height;
      const resultCtx = resultCanvas.getContext('2d');
      if (!resultCtx) {
        throw new Error('Failed to get canvas context');
      }
      resultCtx.putImageData(resizedImageData, 0, 0);

      // Convert to blob and download
      resultCanvas.toBlob((blob) => {
        if (blob) {
          downloadImage(blob, currentImage.file.name, 'resized', 'png');

          const scale = Math.round((newWidth / currentImage.width) * 100);
          const message = `✅ Resize complete!\n\n` +
            `Original: ${currentImage.width} × ${currentImage.height} px\n` +
            `Resized: ${newWidth} × ${newHeight} px\n` +
            `Scale: ${scale}%\n` +
            `Quality: ${quality === ResizeQuality.High ? 'High (Bicubic)' : 'Fast (Bilinear)'}\n` +
            `Processing time: ${response.processingTime}ms\n\n` +
            `📥 File downloaded`;

          alert(message);
        }
      }, 'image/png');

      console.log('✅ Resize applied successfully', {
        from: `${currentImage.width}×${currentImage.height}`,
        to: `${newWidth}×${newHeight}`,
        quality,
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Resize failed:', error);
      alert(`Resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsResizing(false);
    }
  }, [currentImage, resizeParams]);

  const handleResetResize = useCallback(() => {
    if (currentImage) {
      setResizeParams({
        width: currentImage.width,
        height: currentImage.height,
        quality: ResizeQuality.High,
      });
    }
  }, [currentImage]);

  // ============= ROTATE/FLIP TOOL HANDLERS =============
  const handleRotateChange = useCallback(async (angle: RotateAngle) => {
    if (!currentImage) return;

    setRotation(angle);
    setIsRotating(true);

    try {
      // Convert image to RGBA buffer
      const imageData = await fileToImageData(currentImage.file);
      const rgbaBuffer = new Uint8Array(imageData.data);

      // Send to WASM worker for rotation
      const worker = getCoreWorker();
      const response = await worker.sendMessage<{
        imageData: Uint8Array;
        width: number;
        height: number;
      }>({
        id: `${Date.now()}-rotate`,
        type: MessageType.ROTATE_IMAGE,
        payload: {
          imageData: rgbaBuffer.buffer,
          width: currentImage.width,
          height: currentImage.height,
          angle,
        },
        timestamp: Date.now(),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Rotation operation failed');
      }

      // Convert result back to ImageData
      const rotatedImageData = new ImageData(
        new Uint8ClampedArray(response.data.imageData),
        response.data.width,
        response.data.height
      );

      // Create result canvas and convert to blob
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = response.data.width;
      resultCanvas.height = response.data.height;
      const resultCtx = resultCanvas.getContext('2d');
      if (!resultCtx) {
        throw new Error('Failed to get canvas context');
      }
      resultCtx.putImageData(rotatedImageData, 0, 0);

      // Convert to blob and download
      resultCanvas.toBlob((blob) => {
        if (blob) {
          downloadImage(blob, currentImage.file.name, `rotated_${angle}deg`, 'png');

          const message = `✅ Rotation complete!\n\n` +
            `Angle: ${angle}°\n` +
            `Original: ${currentImage.width} × ${currentImage.height} px\n` +
            `Result: ${response.data!.width} × ${response.data!.height} px\n` +
            `Processing time: ${response.processingTime}ms\n\n` +
            `📥 File downloaded`;

          alert(message);
        }
      }, 'image/png');

      console.log('✅ Rotation applied successfully', {
        angle,
        from: `${currentImage.width}×${currentImage.height}`,
        to: `${response.data.width}×${response.data.height}`,
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Rotation failed:', error);
      alert(`Rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRotating(false);
    }
  }, [currentImage]);

  const handleFlipHorizontal = useCallback(async () => {
    if (!currentImage) return;

    setIsRotating(true);
    try {
      // Convert image to RGBA buffer
      const imageData = await fileToImageData(currentImage.file);
      const rgbaBuffer = new Uint8Array(imageData.data);

      // Send to WASM worker for flipping
      const worker = getCoreWorker();
      const response = await worker.sendMessage<{
        imageData: Uint8Array;
        width: number;
        height: number;
      }>({
        id: `${Date.now()}-flip`,
        type: MessageType.FLIP_IMAGE,
        payload: {
          imageData: rgbaBuffer.buffer,
          width: currentImage.width,
          height: currentImage.height,
          direction: FlipDirection.Horizontal,
        },
        timestamp: Date.now(),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Flip operation failed');
      }

      // Convert result back to ImageData
      const flippedImageData = new ImageData(
        new Uint8ClampedArray(response.data.imageData),
        response.data.width,
        response.data.height
      );

      // Create result canvas and convert to blob
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = response.data.width;
      resultCanvas.height = response.data.height;
      const resultCtx = resultCanvas.getContext('2d');
      if (!resultCtx) {
        throw new Error('Failed to get canvas context');
      }
      resultCtx.putImageData(flippedImageData, 0, 0);

      // Convert to blob and download
      resultCanvas.toBlob((blob) => {
        if (blob) {
          downloadImage(blob, currentImage.file.name, 'flipped_horizontal', 'png');

          const message = `✅ Horizontal flip complete!\n\n` +
            `Size: ${currentImage.width} × ${currentImage.height} px\n` +
            `Processing time: ${response.processingTime}ms\n\n` +
            `📥 File downloaded`;

          alert(message);
        }
      }, 'image/png');

      console.log('✅ Horizontal flip applied successfully', {
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Flip failed:', error);
      alert(`Flip failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRotating(false);
    }
  }, [currentImage]);

  const handleFlipVertical = useCallback(async () => {
    if (!currentImage) return;

    setIsRotating(true);
    try {
      // Convert image to RGBA buffer
      const imageData = await fileToImageData(currentImage.file);
      const rgbaBuffer = new Uint8Array(imageData.data);

      // Send to WASM worker for flipping
      const worker = getCoreWorker();
      const response = await worker.sendMessage<{
        imageData: Uint8Array;
        width: number;
        height: number;
      }>({
        id: `${Date.now()}-flip`,
        type: MessageType.FLIP_IMAGE,
        payload: {
          imageData: rgbaBuffer.buffer,
          width: currentImage.width,
          height: currentImage.height,
          direction: FlipDirection.Vertical,
        },
        timestamp: Date.now(),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Flip operation failed');
      }

      // Convert result back to ImageData
      const flippedImageData = new ImageData(
        new Uint8ClampedArray(response.data.imageData),
        response.data.width,
        response.data.height
      );

      // Create result canvas and convert to blob
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = response.data.width;
      resultCanvas.height = response.data.height;
      const resultCtx = resultCanvas.getContext('2d');
      if (!resultCtx) {
        throw new Error('Failed to get canvas context');
      }
      resultCtx.putImageData(flippedImageData, 0, 0);

      // Convert to blob and download
      resultCanvas.toBlob((blob) => {
        if (blob) {
          downloadImage(blob, currentImage.file.name, 'flipped_vertical', 'png');

          const message = `✅ Vertical flip complete!\n\n` +
            `Size: ${currentImage.width} × ${currentImage.height} px\n` +
            `Processing time: ${response.processingTime}ms\n\n` +
            `📥 File downloaded`;

          alert(message);
        }
      }, 'image/png');

      console.log('✅ Vertical flip applied successfully', {
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Flip failed:', error);
      alert(`Flip failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRotating(false);
    }
  }, [currentImage]);

  const handleResetRotate = useCallback(() => {
    setRotation(0);
  }, []);

  // ============= CROP TOOL HANDLERS =============
  const handleCropChange = useCallback((rect: CropRect) => {
    console.log('📦 handleCropChange:', rect);
    setCropRect(rect);
  }, []);

  const handleApplyCrop = useCallback(async () => {
    if (!currentImage) return;

    setIsCropping(true);
    try {
      // Convert image to RGBA buffer
      const imageData = await fileToImageData(currentImage.file);
      const rgbaBuffer = new Uint8Array(imageData.data);

      // Send to WASM worker for cropping
      const worker = getCoreWorker();
      const response = await worker.sendMessage<{
        imageData: Uint8Array;
        width: number;
        height: number;
      }>({
        id: `${Date.now()}-crop`,
        type: MessageType.CROP_IMAGE,
        payload: {
          imageData: rgbaBuffer.buffer,
          width: currentImage.width,
          height: currentImage.height,
          cropRect,
        },
        timestamp: Date.now(),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Crop operation failed');
      }

      // Convert result back to ImageData
      const croppedImageData = new ImageData(
        new Uint8ClampedArray(response.data.imageData),
        response.data.width,
        response.data.height
      );

      // Create result canvas and convert to blob
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = response.data.width;
      resultCanvas.height = response.data.height;
      const resultCtx = resultCanvas.getContext('2d');
      if (!resultCtx) {
        throw new Error('Failed to get canvas context');
      }
      resultCtx.putImageData(croppedImageData, 0, 0);

      // Convert to blob and download
      resultCanvas.toBlob((blob) => {
        if (blob) {
          downloadImage(blob, currentImage.file.name, 'cropped', 'png');

          const message = `✅ Crop complete!\n\n` +
            `Original: ${currentImage.width} × ${currentImage.height} px\n` +
            `Cropped: ${response.data!.width} × ${response.data!.height} px\n` +
            `Crop region: x=${cropRect.x}, y=${cropRect.y}, w=${cropRect.width}, h=${cropRect.height}\n` +
            `Processing time: ${response.processingTime}ms\n\n` +
            `📥 File downloaded`;

          alert(message);
        }
      }, 'image/png');

      console.log('✅ Crop applied successfully', {
        from: `${currentImage.width}×${currentImage.height}`,
        to: `${response.data.width}×${response.data.height}`,
        cropRect,
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Crop failed:', error);
      alert(`Crop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCropping(false);
    }
  }, [currentImage, cropRect]);

  const handleResetCrop = useCallback(() => {
    if (currentImage) {
      setCropRect({
        x: 0,
        y: 0,
        width: currentImage.width,
        height: currentImage.height,
      });
    }
  }, [currentImage]);

  // ============= BGREMOVE TOOL HANDLERS =============
  const handleBgRemoveComplete = useCallback(async (result: ArrayBuffer, width: number, height: number) => {
    if (!currentImage) return;

    try {
      // Convert result to ImageData
      const resultImageData = new ImageData(
        new Uint8ClampedArray(result),
        width,
        height
      );

      // Create result canvas and convert to blob
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = width;
      resultCanvas.height = height;
      const resultCtx = resultCanvas.getContext('2d');
      if (!resultCtx) {
        throw new Error('Failed to get canvas context');
      }
      resultCtx.putImageData(resultImageData, 0, 0);

      // Convert to blob and download
      resultCanvas.toBlob((blob) => {
        if (blob) {
          downloadImage(blob, currentImage.file.name, 'bgremoved', 'png');
          alert(`✅ Background removal complete!\n\n📥 File downloaded`);
        }
      }, 'image/png');

      console.log('✅ Background removal applied successfully');
    } catch (error) {
      console.error('❌ Background removal failed:', error);
      alert(`Background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentImage]);

  const handleFilesSelected = async (files: File[]) => {
    console.log('📁 Files selected:', files.map(f => f.name));
    await addImages(files);
  };

  // Render controls for the right sidebar based on current feature
  const renderControls = () => {
    switch (currentFeature) {
      case 'upload':
        return (
          <div className="space-y-4">
            <div className="text-sm text-zinc-400 mb-4">
              <p className="mb-2">Upload images to get started:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Drag & drop files onto the canvas</li>
                <li>Click the button below</li>
                <li>Paste from clipboard (Ctrl+V)</li>
              </ul>
            </div>
            <UploadZone onFilesSelected={handleFilesSelected} compact />
            <div className="mt-4 text-xs text-zinc-500 bg-zinc-800/50 p-3 rounded-lg border border-zinc-700">
              <p className="font-semibold mb-1">Privacy First</p>
              <p>All processing happens in your browser. Images never leave your device.</p>
            </div>
          </div>
        );

      case 'crop':
        return currentImage ? (
          <CropControls
            currentCrop={cropRect}
            imageSize={{ width: currentImage.width, height: currentImage.height }}
            onCropChange={handleCropChange}
            onApply={handleApplyCrop}
            onReset={handleResetCrop}
            isProcessing={isCropping}
          />
        ) : (
          <div className="text-sm text-zinc-400">
            <p>No image selected.</p>
            <p className="mt-2 text-xs">Upload an image or select from the filmstrip below.</p>
          </div>
        );

      case 'rotate':
        return currentImage ? (
          <RotateFlipControls
            currentRotation={rotation}
            onRotateChange={handleRotateChange}
            onFlipHorizontal={handleFlipHorizontal}
            onFlipVertical={handleFlipVertical}
            onReset={handleResetRotate}
            isProcessing={isRotating}
          />
        ) : (
          <div className="text-sm text-zinc-400">
            <p>No image selected.</p>
            <p className="mt-2 text-xs">Upload an image or select from the filmstrip below.</p>
          </div>
        );

      case 'resize':
        return currentImage ? (
          <ResizeControls
            currentSize={{ width: currentImage.width, height: currentImage.height }}
            onResizeChange={handleResizeChange}
            onApply={handleApplyResize}
            onReset={handleResetResize}
            isProcessing={isResizing}
          />
        ) : (
          <div className="text-sm text-zinc-400">
            <p>No image selected.</p>
            <p className="mt-2 text-xs">Upload an image or select from the filmstrip below.</p>
          </div>
        );

      case 'compress':
        return currentImage ? (
          <CompressControls
            originalSize={currentImage.file.size}
            originalFormat={currentImage.file.type.split('/')[1].toUpperCase()}
            onCompressChange={handleCompressChange}
            onApply={handleApplyCompress}
            onReset={handleResetCompress}
            isProcessing={isCompressing}
          />
        ) : (
          <div className="text-sm text-zinc-400">
            <p>No image selected.</p>
            <p className="mt-2 text-xs">Upload an image or select from the filmstrip below.</p>
          </div>
        );

      case 'bgremove':
        return currentImage && bgRemoveImageData ? (
          <BgRemoveControls
            imageData={bgRemoveImageData}
            width={currentImage.width}
            height={currentImage.height}
            onRemoveComplete={handleBgRemoveComplete}
          />
        ) : (
          <div className="text-sm text-zinc-400">
            <p>No image selected.</p>
            <p className="mt-2 text-xs">Upload an image or select from the filmstrip below.</p>
          </div>
        );

      case 'batch':
        return (
          <div className="space-y-4">
            <div className="text-sm text-zinc-400 mb-4">
              <p className="font-semibold text-zinc-300 mb-2">📦 Batch Processing</p>
              <p className="text-xs">Apply the same operation to multiple images at once:</p>
              <ul className="list-disc list-inside space-y-1 text-xs mt-2">
                <li>Select multiple images from the filmstrip</li>
                <li>Choose an operation (crop, resize, compress, etc.)</li>
                <li>Download all processed images as a ZIP file</li>
              </ul>
            </div>
            <div className="mt-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <p className="text-sm text-amber-200">
                ⚠️ <strong>Coming Soon</strong>
              </p>
              <p className="text-xs text-amber-300 mt-2">
                Batch processing UI is under development. The backend workers are ready!
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-zinc-400">
            Select a tool from the sidebar
          </div>
        );
    }
  };

  // Render canvas in the center based on current feature
  const renderCanvas = () => {
    // If no image is loaded, show the upload zone
    if (!currentImage) {
      return (
        <div className="flex flex-col items-center justify-center gap-6 w-full max-w-2xl">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-zinc-200 mb-2">Welcome to Photo Editor</h2>
            <p className="text-zinc-400">Get started by uploading an image</p>
          </div>
          <UploadZone onFilesSelected={handleFilesSelected} />
          <div className="text-xs text-zinc-500 text-center max-w-md">
            <p className="mb-2">💡 <strong>Privacy First:</strong> All processing happens in your browser</p>
            <p>Supported formats: JPEG, PNG, WebP, GIF • Max size: 50MB</p>
          </div>
        </div>
      );
    }

    // Memoize imageData for CropCanvas to prevent unnecessary re-renders
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const cropImageData = useMemo(
      () => ({
        url: currentImage.url,
        width: currentImage.width,
        height: currentImage.height,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [currentImage.url, currentImage.width, currentImage.height]
    );

    // Feature-specific canvas rendering
    switch (currentFeature) {
      case 'crop':
        // Use CropCanvas for interactive cropping (lazy loaded with Fabric.js)
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-zinc-400">Loading crop tool...</div>
            </div>
          }>
            <CropCanvas
              imageId={currentImage.id}
              imageData={cropImageData}
              initialCropRect={cropRect}
              onCropChange={handleCropChange}
            />
          </Suspense>
        );

      default:
        return <PreviewCanvas />;
    }
  };

  return (
    <>
      <PasteHandler onFilesSelected={handleFilesSelected} />
      <WorkspaceLayout
        propertiesPanel={renderControls()}
        bottomPanel={<FileList variant="filmstrip" />}
      >
        {renderCanvas()}
      </WorkspaceLayout>
    </>
  );
}

export default App;
