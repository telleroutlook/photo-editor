import React from 'react';
import { RotateAngle, FlipDirection } from '../../types';

interface RotateFlipControlsProps {
  currentRotation: RotateAngle;
  onRotateChange: (angle: RotateAngle) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onReset: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export const RotateFlipControls: React.FC<RotateFlipControlsProps> = ({
  currentRotation,
  onRotateChange,
  onFlipHorizontal,
  onFlipVertical,
  onReset,
  disabled = false,
  isProcessing = false,
}) => {
  const rotationOptions: { value: RotateAngle; label: string; icon: string }[] = [
    { value: 0, label: '0°', icon: '○' },
    { value: 90, label: '90°', icon: '↻' },
    { value: 180, label: '180°', icon: '◎' },
    { value: 270, label: '270°', icon: '↺' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Rotation Controls */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Rotate</h3>
        <div className="grid grid-cols-4 gap-2">
          {rotationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onRotateChange(option.value)}
              disabled={disabled || isProcessing}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                ${
                  currentRotation === option.value
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }
                ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-2xl mb-1">{option.icon}</span>
              <span className="text-xs font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Flip Controls */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Flip</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onFlipHorizontal}
            disabled={disabled || isProcessing}
            className="
              flex items-center justify-center gap-2 px-4 py-3
              bg-white border-2 border-gray-300 rounded-lg
              text-gray-700 font-medium
              hover:bg-gray-50 hover:border-gray-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
            <span>Flip Horizontal</span>
          </button>

          <button
            onClick={onFlipVertical}
            disabled={disabled || isProcessing}
            className="
              flex items-center justify-center gap-2 px-4 py-3
              bg-white border-2 border-gray-300 rounded-lg
              text-gray-700 font-medium
              hover:bg-gray-50 hover:border-gray-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 transform rotate-90"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
            <span>Flip Vertical</span>
          </button>
        </div>
      </div>

      {/* Info Message */}
      <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded border">
        <span className="font-medium">Current rotation:</span> {currentRotation}°
        {currentRotation !== 0 && (
          <span className="ml-2 text-blue-600">
            (Dimensions will swap at 90°/270°)
          </span>
        )}
      </div>

      {/* Reset Button */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          disabled={disabled || isProcessing}
          className="
            flex-1 px-4 py-2 text-sm font-medium text-gray-700
            bg-white border border-gray-300 rounded-md
            hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Reset All
        </button>
      </div>
    </div>
  );
};
