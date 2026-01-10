import React, { useState, useEffect } from 'react';
import { CropRect, AspectRatio } from '../../types';
import { ASPECT_RATIOS } from '../../utils/constants';

interface CropControlsProps {
  currentCrop: CropRect;
  imageSize: { width: number; height: number };
  onCropChange: (rect: CropRect) => void;
  onApply: () => void;
  onReset: () => void;
  isProcessing?: boolean;
}

export const CropControls: React.FC<CropControlsProps> = ({
  currentCrop,
  imageSize,
  onCropChange,
  onApply,
  onReset,
  isProcessing = false,
}) => {
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(AspectRatio.FREE);
  const [manualCrop, setManualCrop] = useState<CropRect>(currentCrop);

  // Update manual crop when currentCrop changes externally
  useEffect(() => {
    setManualCrop(currentCrop);
  }, [currentCrop]);

  const handleRatioChange = (ratio: AspectRatio) => {
    setSelectedRatio(ratio);

    if (ratio === AspectRatio.FREE) {
      // Free form - don't change dimensions
      return;
    }

    const ratioData = ASPECT_RATIOS[ratio];
    const aspectRatio = ratioData.width / ratioData.height;

    // Calculate new dimensions maintaining the selected aspect ratio
    let newWidth = currentCrop.width;
    let newHeight = Math.round(newWidth / aspectRatio);

    // If height exceeds image bounds, adjust based on height
    if (currentCrop.y + newHeight > imageSize.height) {
      newHeight = imageSize.height - currentCrop.y;
      newWidth = Math.round(newHeight * aspectRatio);
    }

    // If width exceeds image bounds, adjust
    if (currentCrop.x + newWidth > imageSize.width) {
      newWidth = imageSize.width - currentCrop.x;
      newHeight = Math.round(newWidth / aspectRatio);
    }

    const newCrop: CropRect = {
      ...currentCrop,
      width: newWidth,
      height: newHeight,
    };

    onCropChange(newCrop);
  };

  const handleManualChange = (field: keyof CropRect, value: number) => {
    const newValue = Math.max(0, value);
    const updatedCrop = { ...manualCrop, [field]: newValue };

    // Validate bounds
    if (field === 'x') {
      updatedCrop.x = Math.min(newValue, imageSize.width - updatedCrop.width);
    } else if (field === 'y') {
      updatedCrop.y = Math.min(newValue, imageSize.height - updatedCrop.height);
    } else if (field === 'width') {
      updatedCrop.width = Math.min(newValue, imageSize.width - updatedCrop.x);
    } else if (field === 'height') {
      updatedCrop.height = Math.min(newValue, imageSize.height - updatedCrop.y);
    }

    setManualCrop(updatedCrop);

    // Auto-switch to free form when manually editing
    if (selectedRatio !== AspectRatio.FREE) {
      setSelectedRatio(AspectRatio.FREE);
    }
  };

  const handleApplyManual = () => {
    onCropChange(manualCrop);
  };

  const handleReset = () => {
    const resetCrop: CropRect = {
      x: 0,
      y: 0,
      width: imageSize.width,
      height: imageSize.height,
    };

    setSelectedRatio(AspectRatio.FREE);
    onCropChange(resetCrop);
    onReset();
  };

  return (
    <div className="space-y-4 bg-white rounded-lg shadow p-4">
      {/* Aspect Ratio Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Object.entries(ASPECT_RATIOS).map(([key, data]) => (
            <button
              key={key}
              onClick={() => handleRatioChange(key as AspectRatio)}
              disabled={isProcessing}
              className={`
                px-3 py-2 text-sm rounded-md border transition-colors
                ${
                  selectedRatio === key
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {data.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Position Input */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            X Position
          </label>
          <input
            type="number"
            min="0"
            max={imageSize.width - manualCrop.width}
            value={manualCrop.x}
            onChange={(e) => handleManualChange('x', parseInt(e.target.value) || 0)}
            disabled={isProcessing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Y Position
          </label>
          <input
            type="number"
            min="0"
            max={imageSize.height - manualCrop.height}
            value={manualCrop.y}
            onChange={(e) => handleManualChange('y', parseInt(e.target.value) || 0)}
            disabled={isProcessing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Manual Size Input */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Width (px)
          </label>
          <input
            type="number"
            min="1"
            max={imageSize.width - manualCrop.x}
            value={manualCrop.width}
            onChange={(e) => handleManualChange('width', parseInt(e.target.value) || 1)}
            onBlur={handleApplyManual}
            disabled={isProcessing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Height (px)
          </label>
          <input
            type="number"
            min="1"
            max={imageSize.height - manualCrop.y}
            value={manualCrop.height}
            onChange={(e) => handleManualChange('height', parseInt(e.target.value) || 1)}
            onBlur={handleApplyManual}
            disabled={isProcessing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Crop Dimensions Info */}
      <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">
        Original: {imageSize.width} × {imageSize.height} px → Crop:{' '}
        {currentCrop.width} × {currentCrop.height} px
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          disabled={isProcessing}
          className="
            flex-1 px-4 py-2 text-sm font-medium text-gray-700
            bg-white border border-gray-300 rounded-md
            hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Reset
        </button>
        <button
          onClick={onApply}
          disabled={isProcessing}
          className="
            flex-1 px-4 py-2 text-sm font-medium text-white
            bg-blue-500 rounded-md
            hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            flex items-center justify-center gap-2
          "
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Apply Crop
            </>
          )}
        </button>
      </div>
    </div>
  );
};
