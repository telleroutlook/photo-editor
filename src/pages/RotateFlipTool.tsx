import React, { useState } from 'react';
import { useImageStore } from '../store/imageStore';
import { RotateFlipControls } from '../components/rotate';
import { RotateAngle } from '../types';

export const RotateFlipTool = () => {
  const { getSelectedImage } = useImageStore();
  const selectedImage = getSelectedImage();
  const [rotation, setRotation] = useState<RotateAngle>(0);
  const [isProcessing, setIsProcessing] = useState(false);

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
    try {
      // TODO: Integrate with WASM rotate_image function
      console.log('Rotating image to:', angle);
      setRotation(angle);

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (angle !== 0) {
        alert(`Rotated ${angle}°! (WASM integration pending)`);
      }
    } catch (error) {
      console.error('Rotation failed:', error);
      alert('Rotation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlipHorizontal = async () => {
    setIsProcessing(true);
    try {
      // TODO: Integrate with WASM flip_image function
      console.log('Flipping horizontally');
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert('Flipped horizontally! (WASM integration pending)');
    } catch (error) {
      console.error('Flip failed:', error);
      alert('Flip failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlipVertical = async () => {
    setIsProcessing(true);
    try {
      // TODO: Integrate with WASM flip_image function
      console.log('Flipping vertically');
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert('Flipped vertically! (WASM integration pending)');
    } catch (error) {
      console.error('Flip failed:', error);
      alert('Flip failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setRotation(0);
    alert('Reset to original orientation');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🔄 Rotate & Flip Tool</h2>
        <p className="text-gray-600">
          Image: {selectedImage.file.name} ({selectedImage.width} × {selectedImage.height} px)
        </p>
      </div>

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
