/**
 * PreviewCanvas - Generic image preview component
 * Used for most tools (resize, compress, rotate, etc.)
 * Displays the currently selected image in the workspace
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useImageStore } from '../../store/imageStore';
import { useAppStore } from '../../store/appStore';
import { useBgRemoveWorker } from '../../hooks/useBgRemoveWorker';
import { Image as ImageIcon, Pipette, MousePointer2 } from 'lucide-react';

interface PreviewCanvasProps {
  className?: string;
  showInfo?: boolean; // Show image dimensions and file size
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  className = '',
  showInfo = true
}) => {
  const { getSelectedImage } = useImageStore();
  const {
    currentFeature,
    bgRemoveMagicWandActive,
    bgRemoveGrabCutActive,
    bgRemoveTolerance,
    bgRemoveConnected,
    bgRemoveIterations,
    bgRemoveGrabCutRect,
    setBgRemoveGrabCutRect,
    setBgRemoveSelectionMask,
    setBgRemovePreviewData,
    setBgRemovePreviewSize,
  } = useAppStore();

  const { magicWandSelect, grabCutSegment, loading: bgRemoveLoading } = useBgRemoveWorker();
  const currentImage = getSelectedImage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [grabCutDrawing, setGrabCutDrawing] = useState(false);
  const [grabCutStart, setGrabCutStart] = useState<{ x: number; y: number } | null>(null);

  // Check if bgremove tool is active and in interaction mode
  const isBgRemoveActive = currentFeature === 'bgremove' && (bgRemoveMagicWandActive || bgRemoveGrabCutActive);

  useEffect(() => {
    if (!currentImage || !canvasRef.current || !overlayCanvasRef.current) {
      setImageLoaded(false);
      return;
    }

    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!ctx || !overlayCtx) return;

    const img = new Image();
    img.onload = () => {
      // Calculate display size while maintaining aspect ratio
      const maxWidth = 1200;
      const maxHeight = 800;

      let displayWidth = img.width;
      let displayHeight = img.height;

      if (displayWidth > maxWidth || displayHeight > maxHeight) {
        const ratio = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
        displayWidth *= ratio;
        displayHeight *= ratio;
      }

      // Setup main canvas
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Setup overlay canvas (same size as main canvas)
      overlayCanvas.width = displayWidth;
      overlayCanvas.height = displayHeight;
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      setImageLoaded(true);
    };

    img.src = currentImage.url;
  }, [currentImage]);

  // Draw GrabCut rectangle overlay
  const drawGrabCutRect = useCallback((rect: { x: number; y: number; w: number; h: number }) => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    const overlayCtx = overlayCanvas.getContext('2d');
    if (!overlayCtx) return;

    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw rectangle border
    overlayCtx.strokeStyle = '#3B82F6';
    overlayCtx.lineWidth = 3;
    overlayCtx.setLineDash([5, 5]);
    overlayCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    // Draw semi-transparent fill
    overlayCtx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    overlayCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }, []);

  // Handle Magic Wand click
  const handleMagicWandClick = useCallback(async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bgRemoveMagicWandActive || bgRemoveLoading) return;

    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);

    console.log('🪄 [PreviewCanvas] Magic Wand click:', { x, y, tolerance: bgRemoveTolerance, connected: bgRemoveConnected });

    // Get image data from canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      // Call Magic Wand WASM function (convert Uint8ClampedArray to Uint8Array)
      const result = await magicWandSelect(
        new Uint8Array(imageData.data),
        canvas.width,
        canvas.height,
        x,
        y,
        bgRemoveTolerance,
        bgRemoveConnected
      );

      console.log('✅ [PreviewCanvas] Magic Wand selection complete:', {
        selectedPixels: Array.from(result.mask).filter(v => v > 128).length,
        totalPixels: result.mask.length
      });

      // Store selection mask in store
      setBgRemoveSelectionMask(result.mask);

      // Generate preview with transparency
      const previewData = new Uint8ClampedArray(imageData.data);
      for (let i = 0; i < result.mask.length; i++) {
        if (result.mask[i] > 128) {  // Selected pixel → make transparent
          const idx = i * 4;
          previewData[idx + 3] = 0;  // Set alpha to 0
        }
      }
      setBgRemovePreviewData(new Uint8Array(previewData));
      setBgRemovePreviewSize(canvas.width, canvas.height);
    } catch (error) {
      console.error('❌ [PreviewCanvas] Magic Wand error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [bgRemoveMagicWandActive, bgRemoveLoading, currentImage, bgRemoveTolerance, bgRemoveConnected, magicWandSelect, setBgRemoveSelectionMask, setBgRemovePreviewData]);

  // Handle GrabCut mouse down (start drawing rectangle)
  const handleGrabCutMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bgRemoveGrabCutActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    setGrabCutStart({ x, y });
    setGrabCutDrawing(true);
    setBgRemoveGrabCutRect(null);  // Clear previous rectangle

    console.log('🤖 [PreviewCanvas] GrabCut started at:', { x, y });
  }, [bgRemoveGrabCutActive, setBgRemoveGrabCutRect]);

  // Handle GrabCut mouse move (update rectangle)
  const handleGrabCutMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!grabCutDrawing || !grabCutStart || !bgRemoveGrabCutActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentX = (event.clientX - rect.left) * scaleX;
    const currentY = (event.clientY - rect.top) * scaleY;

    const rectData = {
      x: Math.min(grabCutStart.x, currentX),
      y: Math.min(grabCutStart.y, currentY),
      w: Math.abs(currentX - grabCutStart.x),
      h: Math.abs(currentY - grabCutStart.y),
    };

    setBgRemoveGrabCutRect(rectData);
    drawGrabCutRect(rectData);
  }, [grabCutDrawing, grabCutStart, bgRemoveGrabCutActive, setBgRemoveGrabCutRect, drawGrabCutRect]);

  // Handle GrabCut mouse up (finish drawing and process)
  const handleGrabCutMouseUp = useCallback(async () => {
    if (!grabCutDrawing || !bgRemoveGrabCutRect || !currentImage) {
      setGrabCutDrawing(false);
      setGrabCutStart(null);
      return;
    }

    console.log('🤖 [PreviewCanvas] GrabCut rectangle complete:', bgRemoveGrabCutRect);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      // Call GrabCut WASM function (convert Uint8ClampedArray to Uint8Array)
      const result = await grabCutSegment(
        new Uint8Array(imageData.data),
        canvas.width,
        canvas.height,
        bgRemoveGrabCutRect.x,
        bgRemoveGrabCutRect.y,
        bgRemoveGrabCutRect.w,
        bgRemoveGrabCutRect.h,
        bgRemoveIterations
      );

      console.log('✅ [PreviewCanvas] GrabCut segmentation complete');

      // Store selection mask in store
      setBgRemoveSelectionMask(result.mask);

      // Generate preview with transparency
      const previewData = new Uint8ClampedArray(imageData.data);
      for (let i = 0; i < result.mask.length; i++) {
        if (result.mask[i] < 128) {  // Background pixel → make transparent
          const idx = i * 4;
          previewData[idx + 3] = 0;  // Set alpha to 0
        }
      }
      setBgRemovePreviewData(new Uint8Array(previewData));
      setBgRemovePreviewSize(canvas.width, canvas.height);

      // Clear overlay
      const overlayCanvas = overlayCanvasRef.current;
      if (overlayCanvas) {
        const overlayCtx = overlayCanvas.getContext('2d');
        if (overlayCtx) {
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
      }
    } catch (error) {
      console.error('❌ [PreviewCanvas] GrabCut error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGrabCutDrawing(false);
      setGrabCutStart(null);
    }
  }, [grabCutDrawing, bgRemoveGrabCutRect, currentImage, bgRemoveIterations, grabCutSegment, setBgRemoveSelectionMask, setBgRemovePreviewData]);

  // Unified canvas click handler
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (bgRemoveMagicWandActive) {
      handleMagicWandClick(event);
    }
  }, [bgRemoveMagicWandActive, handleMagicWandClick]);

  // Empty state
  if (!currentImage) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 text-zinc-500 ${className}`}>
        <div className="p-6 rounded-full bg-zinc-900/50 border border-zinc-800">
          <ImageIcon size={48} strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-zinc-400">No image selected</p>
          <p className="text-sm mt-1">Upload an image or select from the filmstrip below</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* BgRemove interaction indicator */}
      {isBgRemoveActive && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 animate-pulse">
          {bgRemoveMagicWandActive && (
            <>
              <MousePointer2 size={16} />
              <span>Click anywhere on the image to select background area</span>
            </>
          )}
          {bgRemoveGrabCutActive && (
            <>
              <MousePointer2 size={16} />
              <span>Drag on the image to draw a rectangle around the subject</span>
            </>
          )}
        </div>
      )}

      {/* Canvas container with overlay */}
      <div className="relative inline-block">
        {/* Main image canvas */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleGrabCutMouseDown}
          onMouseMove={handleGrabCutMouseMove}
          onMouseUp={handleGrabCutMouseUp}
          onMouseLeave={handleGrabCutMouseUp}
          className={`max-w-full max-h-full shadow-2xl rounded-lg border transition-all ${
            isBgRemoveActive
              ? 'border-blue-500 border-4 cursor-crosshair shadow-blue-900/50'
              : 'border-zinc-800'
          }`}
        />

        {/* Overlay canvas for GrabCut rectangle drawing */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Image Info */}
      {showInfo && imageLoaded && (
        <div className="flex gap-4 text-xs text-zinc-500 bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800">
          <span>{currentImage.fileName}</span>
          <span>•</span>
          <span>{currentImage.width} × {currentImage.height} px</span>
          <span>•</span>
          <span>{(currentImage.file.size / 1024).toFixed(1)} KB</span>
        </div>
      )}
    </div>
  );
};
