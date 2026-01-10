import React, { useState, useEffect } from 'react';
import { CompressionFormat } from '../../types';
import { formatBytes } from '../../utils/constants';

interface CompressControlsProps {
  originalSize: number;
  originalFormat: string;
  onCompressChange: (params: { format: CompressionFormat; quality: number; targetSize?: number }) => void;
  onApply: () => void;
  onReset: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

type CompressMode = 'quality' | 'targetSize';

const FORMAT_OPTIONS = [
  { value: CompressionFormat.WebP, label: 'WebP', description: 'Best compression', recommended: true },
  { value: CompressionFormat.JPEG, label: 'JPEG', description: 'Widely supported', recommended: false },
  { value: CompressionFormat.PNG, label: 'PNG', description: 'Lossless', recommended: false },
];

const QUALITY_PRESETS = [
  { value: 50, label: 'Low', description: 'Small file' },
  { value: 70, label: 'Medium', description: 'Balanced' },
  { value: 80, label: 'High', description: 'Recommended' },
  { value: 95, label: 'Maximum', description: 'Best quality' },
];

const TARGET_SIZE_PRESETS = [
  { label: '500 KB', value: 500 * 1024 },
  { label: '1 MB', value: 1024 * 1024 },
  { label: '2 MB', value: 2 * 1024 * 1024 },
  { label: '5 MB', value: 5 * 1024 * 1024 },
];

export const CompressControls: React.FC<CompressControlsProps> = ({
  originalSize,
  originalFormat,
  onCompressChange,
  onApply,
  onReset,
  disabled = false,
  isProcessing = false,
}) => {
  const [mode, setMode] = useState<CompressMode>('quality');
  const [format, setFormat] = useState<CompressionFormat>(CompressionFormat.WebP);
  const [quality, setQuality] = useState(80);
  const [targetSize, setTargetSize] = useState(1024 * 1024); // 1 MB default
  const [customTargetSize, setCustomTargetSize] = useState('1');
  const [targetSizeUnit, setTargetSizeUnit] = useState<'MB' | 'KB'>('MB');

  useEffect(() => {
    if (mode === 'quality') {
      onCompressChange({ format, quality });
    } else {
      onCompressChange({ format, quality, targetSize });
    }
  }, [mode, format, quality, targetSize]);

  const handleFormatChange = (newFormat: CompressionFormat) => {
    setFormat(newFormat);
  };

  const handleQualityChange = (newQuality: number) => {
    setQuality(newQuality);
  };

  const handleTargetSizeChange = (value: number) => {
    setTargetSize(value);
    // Update custom input to match
    if (value >= 1024 * 1024) {
      setCustomTargetSize((value / (1024 * 1024)).toString());
      setTargetSizeUnit('MB');
    } else {
      setCustomTargetSize((value / 1024).toString());
      setTargetSizeUnit('KB');
    }
  };

  const handleCustomTargetSizeChange = (value: string) => {
    setCustomTargetSize(value);
    const numValue = parseFloat(value) || 0;
    const sizeInBytes = targetSizeUnit === 'MB' ? numValue * 1024 * 1024 : numValue * 1024;
    setTargetSize(sizeInBytes);
  };

  const handleUnitChange = (unit: 'MB' | 'KB') => {
    setTargetSizeUnit(unit);
    const numValue = parseFloat(customTargetSize) || 0;
    const sizeInBytes = unit === 'MB' ? numValue * 1024 * 1024 : numValue * 1024;
    setTargetSize(sizeInBytes);
  };

  const handleReset = () => {
    setMode('quality');
    setFormat(CompressionFormat.WebP);
    setQuality(80);
    setTargetSize(1024 * 1024);
    setCustomTargetSize('1');
    setTargetSizeUnit('MB');
    onReset();
  };

  // Estimate compressed size (rough approximation)
  const estimatedSize = mode === 'quality'
    ? Math.round(originalSize * (quality / 100))
    : targetSize;

  const isOriginalFormat = format === CompressionFormat.JPEG && originalFormat.toLowerCase() === 'jpeg';
  const isValidTargetSize = targetSize > 0 && targetSize < originalSize;
  const canApply = mode === 'quality' ? quality < 100 : isValidTargetSize;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Mode Selector */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Compression Mode</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('quality')}
            disabled={disabled || isProcessing}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-all
              ${
                mode === 'quality'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            🎚️ Quality Mode
          </button>
          <button
            onClick={() => setMode('targetSize')}
            disabled={disabled || isProcessing}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-all
              ${
                mode === 'targetSize'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            🎯 Target Size
          </button>
        </div>
      </div>

      {/* Format Selection */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Output Format</h3>
        <div className="grid grid-cols-3 gap-3">
          {FORMAT_OPTIONS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => handleFormatChange(fmt.value)}
              disabled={disabled || isProcessing}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all relative
                ${
                  format === fmt.value
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }
                ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {fmt.recommended && format !== fmt.value && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  Best
                </span>
              )}
              <span className="text-sm font-bold">{fmt.label}</span>
              <span className={`text-xs ${format === fmt.value ? 'text-blue-100' : 'text-gray-500'}`}>
                {fmt.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quality Mode: Quality Slider */}
      {mode === 'quality' && (
        <div className="space-y-4">
          {/* Quality Presets */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quality Presets</h3>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleQualityChange(preset.value)}
                  disabled={disabled || isProcessing}
                  className={`
                    flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all
                    ${
                      quality === preset.value
                        ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }
                    ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span className="text-xs font-bold">{preset.label}</span>
                  <span className={`text-xs ${quality === preset.value ? 'text-blue-100' : 'text-gray-500'}`}>
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Quality Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Custom Quality</label>
              <span className="text-sm font-bold text-blue-600">{quality}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => handleQualityChange(parseInt(e.target.value))}
              disabled={disabled || isProcessing}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Smallest file</span>
              <span>Best quality</span>
            </div>
          </div>
        </div>
      )}

      {/* Target Size Mode */}
      {mode === 'targetSize' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Target File Size</h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {TARGET_SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleTargetSizeChange(preset.value)}
                  disabled={disabled || isProcessing}
                  className={`
                    px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all
                    ${
                      targetSize === preset.value
                        ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }
                    ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Target Size Input */}
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                step="0.1"
                value={customTargetSize}
                onChange={(e) => handleCustomTargetSizeChange(e.target.value)}
                disabled={disabled || isProcessing}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Size"
              />
              <select
                value={targetSizeUnit}
                onChange={(e) => handleUnitChange(e.target.value as 'MB' | 'KB')}
                disabled={disabled || isProcessing}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
              >
                <option value="MB">MB</option>
                <option value="KB">KB</option>
              </select>
            </div>
            {!isValidTargetSize && targetSize > 0 && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Target size must be smaller than original size
              </p>
            )}
          </div>
        </div>
      )}

      {/* Size Comparison */}
      <div className="text-xs bg-gray-50 px-3 py-3 rounded border space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium text-gray-700">Original:</span>{' '}
            <span className="text-gray-600">{formatBytes(originalSize)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Estimated:</span>{' '}
            <span className="text-blue-600 font-medium">
              {formatBytes(estimatedSize)}
            </span>
          </div>
        </div>
        {mode === 'quality' && quality < 100 && (
          <div className="pt-2 border-t border-gray-200">
            <span className="font-medium text-gray-700">Savings:</span>{' '}
            <span className="text-green-600">
              {((1 - estimatedSize / originalSize) * 100).toFixed(1)}%
            </span>
          </div>
        )}
        {mode === 'targetSize' && isValidTargetSize && (
          <div className="pt-2 border-t border-gray-200">
            <span className="font-medium text-gray-700">Quality will be auto-adjusted</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          disabled={disabled || isProcessing}
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
          disabled={disabled || isProcessing || !canApply}
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
              Compressing...
            </span>
          ) : (
            'Apply Compression'
          )}
        </button>
      </div>
    </div>
  );
};
