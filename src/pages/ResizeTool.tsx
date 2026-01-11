import React, { useState, useRef, useEffect } from 'react';
import { useImageStore } from '../store/imageStore';
import { ResizeControls } from '../components/resize';
import { ResizeQuality, MessageType } from '../types';
import { getCoreWorker } from '../utils/workerManager';

export const ResizeTool = () => {
  const { getSelectedImage } = useImageStore();
  const selectedImage = getSelectedImage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resizeParams, setResizeParams] = useState<{
    width: number;
    height: number;
    quality: ResizeQuality;
  }>({
    width: selectedImage?.width ?? 0,
    height: selectedImage?.height ?? 0,
    quality: ResizeQuality.High,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Cleanup result URL on unmount
  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  if (!selectedImage) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-yellow-800 mb-2">⚠️ No Image Selected</h2>
        <p className="text-yellow-700">Please upload and select an image first.</p>
      </div>
    );
  }

  const handleResizeChange = (params: { width: number; height: number; quality: ResizeQuality }) => {
    setResizeParams(params);
  };

  const handleApplyResize = async () => {
    setIsProcessing(true);
    try {
      // Get image data from canvas
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas not available');
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw image to canvas and get ImageData
      canvas.width = selectedImage.width;
      canvas.height = selectedImage.height;
      const img = new Image();
      img.src = selectedImage.url;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, selectedImage.width, selectedImage.height);

      // Map ResizeQuality to WASM quality parameter (0=fast, 1=high)
      const wasmQuality = resizeParams.quality === ResizeQuality.High ? 1 : 0;

      // Send to WASM worker for resizing
      const worker = getCoreWorker();
      const response = await worker.sendMessage<{
        imageData: ImageData;
        width: number;
        height: number;
      }>({
        id: `${Date.now()}-resize`,
        type: MessageType.RESIZE_IMAGE,
        payload: {
          imageData: imageData.data.buffer,
          width: selectedImage.width,
          height: selectedImage.height,
          newWidth: resizeParams.width,
          newHeight: resizeParams.height,
          quality: wasmQuality,
        },
        timestamp: Date.now(),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Resize operation failed');
      }

      // Convert result back to ImageData
      const resizedImageData = new ImageData(
        new Uint8ClampedArray(response.data.imageData.data),
        response.data.width,
        response.data.height
      );

      // Create result canvas and convert to blob
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = response.data.width;
      resultCanvas.height = response.data.height;
      const resultCtx = resultCanvas.getContext('2d');
      if (resultCtx) {
        resultCtx.putImageData(resizedImageData, 0, 0);
      }

      // Convert to blob and create URL
      resultCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setResultUrl(url);
        }
      }, 'image/png');

      const scale = (resizeParams.width / selectedImage.width) * 100;
      console.log('✅ Resize applied successfully', {
        from: `${selectedImage.width}×${selectedImage.height}`,
        to: `${response.data.width}×${response.data.height}`,
        scale: `${scale.toFixed(1)}%`,
        quality: resizeParams.quality,
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Resize failed:', error);
      alert(`Resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    const originalSize = {
      width: selectedImage.width,
      height: selectedImage.height,
      quality: ResizeQuality.High,
    };
    setResizeParams(originalSize);
    setResultUrl(null);
  };

  return (
    <div className="space-y-6">
      {/* Hidden canvas for image data extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📐 Resize Tool</h2>
        <p className="text-gray-600">
          Image: {selectedImage.file.name} ({selectedImage.width} × {selectedImage.height} px)
        </p>
      </div>

      {/* Result Preview */}
      {resultUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Resize Result</h3>
          <div className="flex items-center gap-4">
            <img src={resultUrl} alt="Resized result" className="max-w-xs rounded-lg shadow" />
            <div className="text-sm text-green-700">
              <p>New size: {resizeParams.width} × {resizeParams.height} px</p>
              <p>Scale: {((resizeParams.width / selectedImage.width) * 100).toFixed(1)}%</p>
              <p>Quality: {resizeParams.quality === ResizeQuality.High ? 'High (Bicubic)' : 'Fast (Bilinear)'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resize Controls */}
      <ResizeControls
        currentSize={{
          width: selectedImage.width,
          height: selectedImage.height,
        }}
        onResizeChange={handleResizeChange}
        onApply={handleApplyResize}
        onReset={handleReset}
        isProcessing={isProcessing}
      />
    </div>
  );
};
