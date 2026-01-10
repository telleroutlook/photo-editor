import React, { useState, useEffect } from 'react';
import { ResizeQuality } from '../../types';

interface ResizeControlsProps {
  currentSize: { width: number; height: number };
  onResizeChange: (params: { width: number; height: number; quality: ResizeQuality }) => void;
  onApply: () => void;
  onReset: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

type ResizeMode = 'smart' | 'precise';

interface SmartPreset {
  label: string;
  width: number;
  height: number;
  description: string;
}

const SMART_PRESETS: SmartPreset[] = [
  { label: '4K', width: 3840, height: 2160, description: 'Ultra HD' },
  { label: '1080p', width: 1920, height: 1080, description: 'Full HD' },
  { label: '720p', width: 1280, height: 720, description: 'HD' },
  { label: '800px', width: 800, height: 600, description: 'Web/Email' },
  { label: 'Thumbnail', width: 200, height: 200, description: 'Thumbnail' },
];

const QUALITY_OPTIONS = [
  { value: ResizeQuality.Fast, label: 'Fast', description: 'Bilinear (quick)' },
  { value: ResizeQuality.High, label: 'High', description: 'Bicubic (best)' },
];

export const ResizeControls: React.FC<ResizeControlsProps> = ({
  currentSize,
  onResizeChange,
  onApply,
  onReset,
  disabled = false,
  isProcessing = false,
}) => {
  const [mode, setMode] = useState<ResizeMode>('smart');
  const [width, setWidth] = useState(currentSize.width);
  const [height, setHeight] = useState(currentSize.height);
  const [quality, setQuality] = useState<ResizeQuality>(ResizeQuality.High);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const aspectRatio = currentSize.width / currentSize.height;

  useEffect(() => {
    setWidth(currentSize.width);
    setHeight(currentSize.height);
  }, [currentSize]);

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    if (lockAspectRatio) {
      const newHeight = Math.round(newWidth / aspectRatio);
      setHeight(newHeight);
    }
    onResizeChange({ width: newWidth, height: lockAspectRatio ? Math.round(newWidth / aspectRatio) : height, quality });
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    if (lockAspectRatio) {
      const newWidth = Math.round(newHeight * aspectRatio);
      setWidth(newWidth);
    }
    onResizeChange({ width: lockAspectRatio ? Math.round(newHeight * aspectRatio) : width, height: newHeight, quality });
  };

  const handlePresetClick = (preset: SmartPreset) => {
    const scaledHeight = Math.round(preset.width / aspectRatio);
    setWidth(preset.width);
    setHeight(scaledHeight);
    onResizeChange({ width: preset.width, height: scaledHeight, quality });
  };

  const handleQualityChange = (newQuality: ResizeQuality) => {
    setQuality(newQuality);
    onResizeChange({ width, height, quality: newQuality });
  };

  const handleReset = () => {
    setWidth(currentSize.width);
    setHeight(currentSize.height);
    setQuality(ResizeQuality.High);
    onReset();
  };

  const isOriginalSize = width === currentSize.width && height === currentSize.height;
  const isValidSize = width > 0 && height > 0 && width <= 8192 && height <= 8192;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Mode Selector */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Resize Mode</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('smart')}
            disabled={disabled || isProcessing}
            className={
              'flex-1 px-4 py-2 rounded-lg font-medium transition-all ' +
              (mode === 'smart'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ) + ' ' +
              ((disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')
            }
          >
            🎯 Smart Presets
          </button>
          <button
            onClick={() => setMode('precise')}
            disabled={disabled || isProcessing}
            className={
              'flex-1 px-4 py-2 rounded-lg font-medium transition-all ' +
              (mode === 'precise'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ) + ' ' +
              ((disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')
            }
          >
            📏 Precise Mode
          </button>
        </div>
      </div>

      {/* Smart Mode: Preset Buttons */}
      {mode === 'smart' && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Presets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SMART_PRESETS.map((preset) => {
              const isActive = width === preset.width;
              const isDisabled = disabled || isProcessing;

              let buttonClasses = 'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ';
              if (isActive) {
                buttonClasses += 'bg-blue-500 text-white border-blue-500 shadow-md ';
              } else {
                buttonClasses += 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 ';
              }
              if (isDisabled) {
                buttonClasses += 'opacity-50 cursor-not-allowed';
              } else {
                buttonClasses += 'cursor-pointer';
              }

              return (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  disabled={disabled || isProcessing}
                  className={buttonClasses}
                >
                  <span className="text-lg font-bold">{preset.label}</span>
                  <span className="text-xs opacity-75">{preset.description}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Presets maintain aspect ratio based on original image
          </p>
        </div>
      )}

      {/* Precise Mode: Manual Input */}
      {mode === 'precise' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dimensions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Width (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => handleWidthChange(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="8192"
                  disabled={disabled || isProcessing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Height (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => handleHeightChange(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="8192"
                  disabled={disabled || isProcessing || lockAspectRatio}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Aspect Ratio Lock */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="aspectRatio"
                checked={lockAspectRatio}
                onChange={(e) => setLockAspectRatio(e.target.checked)}
                disabled={disabled || isProcessing}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <label htmlFor="aspectRatio" className="text-sm font-medium text-gray-700">
                Lock aspect ratio ({currentSize.width}:{currentSize.height})
              </label>
            </div>
            <span className="text-xs text-gray-500">
              Ratio: {aspectRatio.toFixed(3)}
            </span>
          </div>
        </div>
      )}

      {/* Quality Selection */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Resize Quality</h3>
        <div className="grid grid-cols-2 gap-3">
          {QUALITY_OPTIONS.map((option) => {
            const isActive = quality === option.value;
            const isDisabled = disabled || isProcessing;

            let buttonClasses = 'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ';
            if (isActive) {
              buttonClasses += 'bg-blue-500 text-white border-blue-500 shadow-md';
            } else {
              buttonClasses += 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400';
            }
            if (isDisabled) {
              buttonClasses += ' opacity-50 cursor-not-allowed';
            } else {
              buttonClasses += ' cursor-pointer';
            }

            return (
              <button
                key={option.value}
                onClick={() => handleQualityChange(option.value)}
                disabled={disabled || isProcessing}
                className={buttonClasses}
              >
                <span className="text-sm font-bold">{option.label}</span>
                <span className={'text-xs ' + (isActive ? 'text-blue-100' : 'text-gray-500')}>
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Comparison */}
      <div className="text-xs bg-gray-50 px-3 py-2 rounded border">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium text-gray-700">Original:</span>{' '}
            <span className="text-gray-600">{currentSize.width} × {currentSize.height} px</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Target:</span>{' '}
            <span className={isOriginalSize ? 'text-gray-600' : 'text-blue-600 font-medium'}>
              {width} × {height} px
            </span>
          </div>
        </div>
        {!isOriginalSize && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <span className="font-medium text-gray-700">Scale:</span>{' '}
            <span className="text-blue-600">
              {((width / currentSize.width) * 100).toFixed(1)}%
            </span>
            {width < currentSize.width && (
              <span className="ml-2 text-green-600">(↓ Smaller)</span>
            )}
            {width > currentSize.width && (
              <span className="ml-2 text-orange-600">(↑ Larger)</span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          disabled={disabled || isProcessing || isOriginalSize}
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
          disabled={disabled || isProcessing || isOriginalSize || !isValidSize}
          className="
            flex-1 px-4 py-2 text-sm font-medium text-white
            bg-blue-500 rounded-md
            hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            'Apply Resize'
          )}
        </button>
      </div>
    </div>
  );
};
