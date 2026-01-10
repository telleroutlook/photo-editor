import React, { useState } from 'react';
import { useImageStore } from '../store/imageStore';
import { ResizeControls } from '../components/resize';
import { ResizeQuality } from '../types';

export const ResizeTool = () => {
  const { getSelectedImage } = useImageStore();
  const selectedImage = getSelectedImage();
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
      // TODO: Integrate with WASM resize_image function
      console.log('Applying resize:', resizeParams);

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const { width, height, quality } = resizeParams;
      const scale = (width / selectedImage.width) * 100;
      const qualityLabel = quality === ResizeQuality.High ? 'High (Bicubic)' : 'Fast (Bilinear)';

      alert(
        `Resized to ${width} × ${height} px!\n` +
        `Scale: ${scale.toFixed(1)}%\n` +
        `Quality: ${qualityLabel}\n` +
        '(WASM integration pending)'
      );
    } catch (error) {
      console.error('Resize failed:', error);
      alert('Resize failed. Please try again.');
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📐 Resize Tool</h2>
        <p className="text-gray-600">
          Image: {selectedImage.file.name} ({selectedImage.width} × {selectedImage.height} px)
        </p>
      </div>

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
