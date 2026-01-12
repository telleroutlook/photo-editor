import { useState, useRef, useMemo, useCallback } from 'react';
import { useImageStore } from '../store/imageStore';
import { showErrorToast } from '../store/toastStore';
import { CropCanvas, CropControls } from '../components/crop';
import { CropRect, MessageType, OperationType } from '../types';
import { getCoreWorker } from '../utils/workerManager';

export const CropTool = () => {
  const { getSelectedImage, applyOperation } = useImageStore();
  const selectedImage = getSelectedImage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropRect, setCropRect] = useState<CropRect>({
    x: 0,
    y: 0,
    width: selectedImage?.width ?? 0,
    height: selectedImage?.height ?? 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug logging (must be after all state declarations)
  const cropToolRenderCountRef = useRef(0);
  cropToolRenderCountRef.current += 1;
  console.log(`🔄 CropTool render #${cropToolRenderCountRef.current}`, {
    cropRect,
  });

  // ✅ Store initial crop rect once and never change it
  const initialCropRectRef = useRef<CropRect>({
    x: 0,
    y: 0,
    width: selectedImage?.width ?? 0,
    height: selectedImage?.height ?? 0,
  });

  // ✅ Must be before any conditional returns (React Hooks rule)
  const handleCropChange = useCallback((rect: CropRect) => {
    console.log('📦 handleCropChange in CropTool:', rect);
    setCropRect(rect);
  }, []);

  // ✅ Memoize imageData to prevent unnecessary re-renders
  const imageData = useMemo(
    () => ({
      url: selectedImage?.url ?? '',
      width: selectedImage?.width ?? 0,
      height: selectedImage?.height ?? 0,
    }),
    [selectedImage?.url, selectedImage?.width, selectedImage?.height]
  );

  if (!selectedImage) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-yellow-800 mb-2">⚠️ No Image Selected</h2>
        <p className="text-yellow-700">Please upload and select an image first.</p>
      </div>
    );
  }

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
        imageData: Uint8Array;
        width: number;
        height: number;
      }>({
        id: `${Date.now()}-crop`,
        type: MessageType.CROP_IMAGE,
        payload: {
          // ✅ Pass Uint8ClampedArray directly (Worker will convert to Uint8Array)
          imageData: imageData.data as unknown as Uint8Array,
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
      // ✅ response.data.imageData is already a Uint8Array
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
      if (resultCtx) {
        resultCtx.putImageData(croppedImageData, 0, 0);
      }

      // Convert to blob and apply operation
      resultCanvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File(
            [blob],
            selectedImage.fileName.replace(/\.[^/.]+$/, '_cropped.png'),
            { type: 'image/png' }
          );

          applyOperation(selectedImage.id, newFile, {
            type: OperationType.CROP,
            params: cropRect,
            timestamp: Date.now()
          }, response.data!.width, response.data!.height);

          // Reset crop selection to full image (which is now the cropped result)
          setCropRect({ x: 0, y: 0, width: response.data!.width, height: response.data!.height });
        }
      }, 'image/png');

      console.log('✅ Crop applied successfully', {
        from: `${selectedImage.width}×${selectedImage.height}`,
        to: `${response.data.width}×${response.data.height}`,
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Crop failed:', error);
      showErrorToast('Crop Failed', error instanceof Error ? error.message : 'Unknown error');
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

      {/* Crop Canvas */}
      <CropCanvas
        imageId={selectedImage.id}
        imageData={imageData}
        onCropChange={handleCropChange}
        initialCropRect={initialCropRectRef.current}
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
