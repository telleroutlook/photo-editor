import React, { useState, useRef, useEffect } from 'react';
import { useImageStore } from '../store/imageStore';
import { RotateFlipControls } from '../components/rotate';
import { RotateAngle, MessageType } from '../types';
import { getCoreWorker } from '../utils/workerManager';

export const RotateFlipTool = () => {
  const { getSelectedImage } = useImageStore();
  const selectedImage = getSelectedImage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState<RotateAngle>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [lastOperation, setLastOperation] = useState<string | null>(null);

  if (!selectedImage) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-yellow-800 mb-2">⚠️ No Image Selected</h2>
        <p className="text-yellow-700">Please upload and select an image first.</p>
      </div>
    );
  }

  const handleRotateChange = async (angle: RotateAngle) => {
    setIsProcessing(true);
    setLastOperation(null);
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

      // Send to WASM worker for rotation
      const worker = getCoreWorker();
      const response = await worker.sendMessage({
        id: `${Date.now()}-rotate`,
        type: MessageType.ROTATE_IMAGE,
        payload: {
          imageData: imageData.data.buffer,
          width: selectedImage.width,
          height: selectedImage.height,
          angle,
        },
        timestamp: Date.now(),
      });

      if (!response.success) {
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
      if (resultCtx) {
        resultCtx.putImageData(rotatedImageData, 0, 0);
      }

      // Convert to blob and create URL
      resultCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setResultUrl(url);
          setRotation(angle);
        }
      }, 'image/png');

      setLastOperation(`Rotated ${angle}°`);
      console.log('✅ Rotation applied successfully', {
        angle,
        from: `${selectedImage.width}×${selectedImage.height}`,
        to: `${response.data.width}×${response.data.height}`,
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Rotation failed:', error);
      alert(`Rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlipHorizontal = async () => {
    setIsProcessing(true);
    setLastOperation(null);
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

      // Send to WASM worker for flipping (direction 0 = horizontal)
      const worker = getCoreWorker();
      const response = await worker.sendMessage({
        id: `${Date.now()}-flip`,
        type: MessageType.FLIP_IMAGE,
        payload: {
          imageData: imageData.data.buffer,
          width: selectedImage.width,
          height: selectedImage.height,
          direction: 0, // 0 = horizontal
        },
        timestamp: Date.now(),
      });

      if (!response.success) {
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
      if (resultCtx) {
        resultCtx.putImageData(flippedImageData, 0, 0);
      }

      // Convert to blob and create URL
      resultCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setResultUrl(url);
        }
      }, 'image/png');

      setLastOperation('Flipped horizontally');
      console.log('✅ Horizontal flip applied successfully', {
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Flip failed:', error);
      alert(`Flip failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlipVertical = async () => {
    setIsProcessing(true);
    setLastOperation(null);
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

      // Send to WASM worker for flipping (direction 1 = vertical)
      const worker = getCoreWorker();
      const response = await worker.sendMessage({
        id: `${Date.now()}-flip`,
        type: MessageType.FLIP_IMAGE,
        payload: {
          imageData: imageData.data.buffer,
          width: selectedImage.width,
          height: selectedImage.height,
          direction: 1, // 1 = vertical
        },
        timestamp: Date.now(),
      });

      if (!response.success) {
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
      if (resultCtx) {
        resultCtx.putImageData(flippedImageData, 0, 0);
      }

      // Convert to blob and create URL
      resultCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setResultUrl(url);
        }
      }, 'image/png');

      setLastOperation('Flipped vertically');
      console.log('✅ Vertical flip applied successfully', {
        processingTime: response.processingTime,
      });
    } catch (error) {
      console.error('❌ Flip failed:', error);
      alert(`Flip failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setRotation(0);
    setResultUrl(null);
    setLastOperation(null);
  };

  // Cleanup result URL on unmount
  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  return (
    <div className="space-y-6">
      {/* Hidden canvas for image data extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🔄 Rotate & Flip Tool</h2>
        <p className="text-gray-600">
          Image: {selectedImage.file.name} ({selectedImage.width} × {selectedImage.height} px)
        </p>
      </div>

      {/* Result Preview */}
      {resultUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Transformation Result</h3>
          <div className="flex items-center gap-4">
            <img src={resultUrl} alt="Transformed result" className="max-w-xs rounded-lg shadow" />
            <div className="text-sm text-green-700">
              <p>{lastOperation || 'Operation completed'}</p>
              <p>Size: {selectedImage.width} × {selectedImage.height} px</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <RotateFlipControls
        currentRotation={rotation}
        onRotateChange={handleRotateChange}
        onFlipHorizontal={handleFlipHorizontal}
        onFlipVertical={handleFlipVertical}
        onReset={handleReset}
        isProcessing={isProcessing}
      />
    </div>
  );
};
