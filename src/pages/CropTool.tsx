import React, { useState } from 'react';
import { useImageStore } from '../store/imageStore';
import { CropCanvas, CropControls } from '../components/crop';
import { CropRect } from '../types';

export const CropTool = () => {
  const { getSelectedImage } = useImageStore();
  const selectedImage = getSelectedImage();
  const [cropRect, setCropRect] = useState<CropRect>({
    x: 0,
    y: 0,
    width: selectedImage?.width ?? 0,
    height: selectedImage?.height ?? 0,
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

  const handleCropChange = (rect: CropRect) => {
    setCropRect(rect);
  };

  const handleApplyCrop = async () => {
    setIsProcessing(true);
    try {
      // TODO: Integrate with WASM crop_image function
      console.log('Applying crop:', cropRect);

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert('Crop applied! (WASM integration pending)');
    } catch (error) {
      console.error('Crop failed:', error);
      alert('Crop failed. Please try again.');
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
