/**
 * MagicWand.tsx - Magic Wand Selection Tool
 * Flood fill selection with tolerance control
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useBgRemoveWorker } from '../../hooks/useBgRemoveWorker';

interface MagicWandProps {
  imageData: Uint8Array;
  width: number;
  height: number;
  onRemoveComplete: (result: ArrayBuffer, width: number, height: number) => void;
}

export function MagicWand({ imageData, width, height, onRemoveComplete }: MagicWandProps) {
  const { magicWandSelect, loading, initialized } = useBgRemoveWorker();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seedPoint, setSeedPoint] = useState<{ x: number; y: number } | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [connected, setConnected] = useState(true);
  const [selectionMask, setSelectionMask] = useState<Uint8Array | null>(null);

  // Draw image on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const imgData = new ImageData(new Uint8ClampedArray(imageData), width, height);
    ctx.putImageData(imgData, 0, 0);
  }, [imageData, width, height]);

  // Handle canvas click to set seed point
  const handleCanvasClick = useCallback(async (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !initialized) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);

    setSeedPoint({ x, y });

    try {
      const result = await magicWandSelect(imageData, width, height, x, y, tolerance, connected);
      setSelectionMask(new Uint8Array(result.mask));
    } catch (error) {
      console.error('Magic wand selection failed:', error);
      alert(`Selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [imageData, width, height, tolerance, connected, magicWandSelect, initialized]);

  // Draw selection mask overlay
  useEffect(() => {
    if (!selectionMask || !seedPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw original image
    const imgData = new ImageData(new Uint8ClampedArray(imageData), width, height);
    ctx.putImageData(imgData, 0, 0);

    // Draw red overlay for selected pixels
    const overlay = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < selectionMask.length; i++) {
      if (selectionMask[i] > 128) {
        const idx = i * 4;
        overlay.data[idx] = 255;     // R
        overlay.data[idx + 1] = 0;   // G
        overlay.data[idx + 2] = 0;   // B
        overlay.data[idx + 3] = 128; // A (50% opacity)
      }
    }
    ctx.putImageData(overlay, 0, 0);
  }, [selectionMask, seedPoint, imageData, width, height]);

  // Apply background removal using selection
  const handleApply = useCallback(async () => {
    if (!selectionMask || !seedPoint || !initialized) {
      alert('Please select an area first by clicking on the image');
      return;
    }

    try {
      const result = await magicWandSelect(imageData, width, height, seedPoint.x, seedPoint.y, tolerance, connected);
      onRemoveComplete(result.mask, width, height);
      setSelectionMask(null);
      setSeedPoint(null);
    } catch (error) {
      alert(`Error removing background: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [imageData, width, height, seedPoint, tolerance, connected, magicWandSelect, onRemoveComplete, initialized, selectionMask]);

  // Reset selection
  const handleReset = useCallback(() => {
    setSelectionMask(null);
    setSeedPoint(null);
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
        {/* Instructions */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Click on the background area you want to select. Adjust tolerance to expand/shrink selection.
        </div>

        {/* Seed Point Display */}
        {seedPoint && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Seed Point:</span>
            <span className="text-gray-600 dark:text-gray-400">
              X: {seedPoint.x}, Y: {seedPoint.y}
            </span>
          </div>
        )}

        {/* Tolerance Slider */}
        <div>
          <label htmlFor="tolerance-mw" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tolerance: {tolerance}
          </label>
          <input
            id="tolerance-mw"
            type="range"
            min="0"
            max="255"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>

        {/* Connected Toggle */}
        <div className="flex items-center gap-2">
          <input
            id="connected"
            type="checkbox"
            checked={connected}
            onChange={(e) => setConnected(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="connected" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Connected (flood fill)
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            disabled={!selectionMask || loading || !initialized}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Remove Background'}
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
