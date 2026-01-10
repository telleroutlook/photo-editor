/**
 * GrabCutTool.tsx - GrabCut Segmentation Tool
 * Semi-automatic foreground segmentation using GMM + Graph Cut
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useBgRemoveWorker } from '../../hooks/useBgRemoveWorker';

interface GrabCutToolProps {
  imageData: Uint8Array;
  width: number;
  height: number;
  onRemoveComplete: (result: ArrayBuffer, width: number, height: number) => void;
}

export function GrabCutTool({ imageData, width, height, onRemoveComplete }: GrabCutToolProps) {
  const { grabCutSegment, loading, initialized } = useBgRemoveWorker();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [iterations, setIterations] = useState(5);
  const [segmentationMask, setSegmentationMask] = useState<Uint8Array | null>(null);

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

  // Draw rectangle overlay
  useEffect(() => {
    if (!rect && !startPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw original image
    const imgData = new ImageData(new Uint8ClampedArray(imageData), width, height);
    ctx.putImageData(imgData, 0, 0);

    // Draw rectangle
    if (rect) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
  }, [rect, startPoint, imageData, width, height]);

  // Handle mouse down
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    setStartPoint({ x, y });
    setIsDragging(true);
    setSegmentationMask(null);
  }, []);

  // Handle mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !startPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const newRect = {
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      w: Math.abs(x - startPoint.x),
      h: Math.abs(y - startPoint.y),
    };
    setRect(newRect);
  }, [isDragging, startPoint]);

  // Handle mouse up
  const handleMouseUp = useCallback(async () => {
    if (!isDragging || !rect) return;

    setIsDragging(false);
    setStartPoint(null);

    if (rect.w < 10 || rect.h < 10) {
      setRect(null);
      return;
    }

    // Run GrabCut segmentation
    if (!initialized) {
      alert('WASM module not initialized yet. Please wait...');
      return;
    }

    try {
      const result = await grabCutSegment(
        imageData,
        width,
        height,
        Math.floor(rect.x),
        Math.floor(rect.y),
        Math.floor(rect.w),
        Math.floor(rect.h),
        iterations
      );
      setSegmentationMask(new Uint8Array(result.mask));
    } catch (error) {
      console.error('GrabCut segmentation failed:', error);
      alert(`Segmentation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isDragging, rect, imageData, width, height, iterations, grabCutSegment, initialized]);

  // Draw segmentation mask overlay
  useEffect(() => {
    if (!segmentationMask || !rect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw original image
    const imgData = new ImageData(new Uint8ClampedArray(imageData), width, height);
    ctx.putImageData(imgData, 0, 0);

    // Draw mask overlay (foreground in green)
    const overlay = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < segmentationMask.length; i++) {
      if (segmentationMask[i] > 128) {
        const idx = i * 4;
        overlay.data[idx] = 0;       // R
        overlay.data[idx + 1] = 255; // G
        overlay.data[idx + 2] = 0;   // B
        overlay.data[idx + 3] = 100; // A
      }
    }
    ctx.putImageData(overlay, 0, 0);

    // Draw rectangle
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }, [segmentationMask, rect, imageData, width, height]);

  // Apply segmentation
  const handleApply = useCallback(() => {
    if (!segmentationMask) {
      alert('Please draw a rectangle around the subject first');
      return;
    }
    onRemoveComplete(segmentationMask.buffer, width, height);
    setSegmentationMask(null);
    setRect(null);
  }, [segmentationMask, width, height, onRemoveComplete]);

  // Reset
  const handleReset = useCallback(() => {
    setSegmentationMask(null);
    setRect(null);
    setStartPoint(null);
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
          Drag a rectangle around the foreground subject. The algorithm will segment the object from the background.
        </div>

        {/* Iterations Slider */}
        <div>
          <label htmlFor="iterations" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Iterations: {iterations}
          </label>
          <input
            id="iterations"
            type="range"
            min="1"
            max="5"
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            More iterations = better quality but slower
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            disabled={!segmentationMask || loading || !initialized}
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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded-lg cursor-crosshair"
          style={{ maxHeight: '600px' }}
        />
      </div>
    </div>
  );
}
