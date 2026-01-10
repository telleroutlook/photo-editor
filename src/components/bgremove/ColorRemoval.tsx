/**
 * ColorRemoval.tsx - Solid Color Background Removal
 * Allows users to select a target color and remove it from the image
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useBgRemoveWorker } from '../../hooks/useBgRemoveWorker';

interface ColorRemovalProps {
  imageData: Uint8Array;
  width: number;
  height: number;
  onRemoveComplete: (result: ArrayBuffer, width: number, height: number) => void;
}

export function ColorRemoval({ imageData, width, height, onRemoveComplete }: ColorRemovalProps) {
  const { removeSolidColor, loading, initialized } = useBgRemoveWorker();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [targetColor, setTargetColor] = useState<[number, number, number]>([255, 255, 255]);
  const [tolerance, setTolerance] = useState(30);
  const [feather, setFeather] = useState(0);
  const [previewImage, setPreviewImage] = useState<ImageData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Draw image on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Create ImageData from RGBA buffer
    const imgData = new ImageData(new Uint8ClampedArray(imageData), width, height);
    ctx.putImageData(imgData, 0, 0);
  }, [imageData, width, height]);

  // Handle canvas click to pick color
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setTargetColor([pixel[0], pixel[1], pixel[2]]);
  }, []);

  // Apply color removal
  const handleApply = useCallback(async () => {
    if (!initialized) {
      alert('WASM module not initialized yet. Please wait...');
      return;
    }

    try {
      const result = await removeSolidColor(imageData, width, height, targetColor, tolerance, feather);
      onRemoveComplete(result.imageData, result.width, result.height);
      setShowPreview(false);
    } catch (error) {
      alert(`Error removing background: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [imageData, width, height, targetColor, tolerance, feather, removeSolidColor, onRemoveComplete, initialized]);

  // Preview color removal
  const handlePreview = useCallback(async () => {
    if (!initialized) return;

    try {
      const result = await removeSolidColor(imageData, width, height, targetColor, tolerance, feather);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgData = new ImageData(new Uint8ClampedArray(result.imageData), width, height);
      ctx.putImageData(imgData, 0, 0);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
    }
  }, [imageData, width, height, targetColor, tolerance, feather, removeSolidColor, initialized]);

  // Reset to original image
  const handleReset = useCallback(() => {
    setShowPreview(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = new ImageData(new Uint8ClampedArray(imageData), width, height);
    ctx.putImageData(imgData, 0, 0);
  }, [imageData, width, height]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-4">
        {/* Target Color Display */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Target Color:
          </label>
          <div
            className="w-12 h-12 rounded border-2 border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: `rgb(${targetColor.join(',')})` }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            R: {targetColor[0]}, G: {targetColor[1]}, B: {targetColor[2]}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            Click on image to pick color
          </span>
        </div>

        {/* Tolerance Slider */}
        <div>
          <label htmlFor="tolerance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tolerance: {tolerance}
          </label>
          <input
            id="tolerance"
            type="range"
            min="0"
            max="255"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>

        {/* Feather Slider */}
        <div>
          <label htmlFor="feather" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Edge Smoothing: {feather}px
          </label>
          <input
            id="feather"
            type="range"
            min="0"
            max="50"
            value={feather}
            onChange={(e) => setFeather(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={loading || !initialized}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Preview'}
          </button>
          <button
            onClick={handleApply}
            disabled={loading || !initialized}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Apply'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Reset
          </button>
        </div>

        {!initialized && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Initializing WASM module...
          </p>
        )}
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded-lg cursor-crosshair"
          style={{ maxHeight: '600px' }}
        />
      </div>
    </div>
  );
}
