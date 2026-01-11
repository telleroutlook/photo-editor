import React, { useState, useRef, useEffect } from 'react';
import { useImageStore } from '../store/imageStore';
import { CropCanvas, CropControls } from '../components/crop';
import { CropRect, MessageType } from '../types';
import { getCoreWorker } from '../utils/workerManager';

export const CropTool = () => {
  const { getSelectedImage } = useImageStore();
  const selectedImage = getSelectedImage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropRect, setCropRect] = useState<CropRect>({
    x: 0,
    y: 0,
    width: selectedImage?.width ?? 0,
    height: selectedImage?.height ?? 0,
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

  const handleCropChange = (rect: CropRect) => {
    setCropRect(rect);
  };

  const handleApplyCrop = async () => {
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

      // Send to WASM worker for cropping
      const worker = getCoreWorker();
      const response = await worker.sendMessage<{
        imageData: ImageData;
        width: number;
        height: number;
      }>({
        id: `${Date.now()}-crop`,
        type: MessageType.CROP_IMAGE,
        payload: {
          imageData: imageData.data.buffer,
          width: selectedImage.width,
          height: selectedImage.height,
          cropRect,
        },
        timestamp: Date.now(),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Crop operation failed');
      }

      // Convert result back to ImageData
      const croppedImageData = new ImageData(
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
        resultCtx.putImageData(croppedImageData, 0, 0);
      }

      // Convert to blob and create URL
      resultCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setResultUrl(url);
        }
      }, 'image/png');

      console.log('✅ Crop applied successfully', {
        from: `${selectedImage.width}×${selectedImage.height}`,
        to: `${response.data.width}×${response.data.height}`,
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Crop failed:', error);
      alert(`Crop failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    const fullImageCrop: CropRect = {
      x: 0,
      y: 0,
      width: selectedImage.width,
      height: selectedImage.height,
    };
    setCropRect(fullImageCrop);
    setResultUrl(null);
  };

  return (
    <div className="space-y-6">
      {/* Hidden canvas for image data extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">✂️ Crop Tool</h2>
        <p className="text-gray-600">
          Image: {selectedImage.file.name} ({selectedImage.width} × {selectedImage.height} px)
        </p>
      </div>

      {/* Result Preview */}
      {resultUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Crop Result</h3>
          <div className="flex items-center gap-4">
            <img src={resultUrl} alt="Cropped result" className="max-w-xs rounded-lg shadow" />
            <div className="text-sm text-green-700">
              <p>New size: {cropRect.width} × {cropRect.height} px</p>
              <p>Position: ({cropRect.x}, {cropRect.y})</p>
            </div>
          </div>
        </div>
      )}

      {/* Crop Canvas */}
      <CropCanvas
        imageId={selectedImage.id}
        imageData={{
          url: selectedImage.url,
          width: selectedImage.width,
          height: selectedImage.height,
        }}
        onCropChange={handleCropChange}
        initialCropRect={cropRect}
      />

      {/* Crop Controls */}
      <CropControls
        currentCrop={cropRect}
        imageSize={{
          width: selectedImage.width,
          height: selectedImage.height,
        }}
        onCropChange={handleCropChange}
        onApply={handleApplyCrop}
        onReset={handleReset}
        isProcessing={isProcessing}
      />
    </div>
  );
};
