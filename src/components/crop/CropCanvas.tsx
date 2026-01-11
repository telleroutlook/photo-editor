import React, { useEffect, useRef, useState } from 'react';
import { Canvas, Rect, Image as FabricImage } from 'fabric';
import { CropRect } from '../../types';

interface CropCanvasProps {
  imageId: string;
  imageData: { url: string; width: number; height: number };
  onCropChange: (rect: CropRect) => void;
  initialCropRect?: CropRect;
  aspectRatio?: number; // 0 = free form
}

export const CropCanvas: React.FC<CropCanvasProps> = ({
  imageData,
  onCropChange,
  initialCropRect,
  aspectRatio = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const cropRectRef = useRef<Rect | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const lastCanvasSizeRef = useRef({ width: 0, height: 0 });

  const initialCropRectRef = useRef(initialCropRect);
  useEffect(() => {
    if (initialCropRect && (initialCropRect.width !== 0 || initialCropRect.height !== 0)) {
      initialCropRectRef.current = initialCropRect;
    }
  }, [initialCropRect]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const sizeChanged =
      lastCanvasSizeRef.current.width !== canvasSize.width ||
      lastCanvasSizeRef.current.height !== canvasSize.height;

    if (!sizeChanged) {
      return;
    }

    // Dispose existing canvas if any
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }

    const canvas = new Canvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: '#1f2937',
      selection: false,
    });

    fabricCanvasRef.current = canvas;
    lastCanvasSizeRef.current = { ...canvasSize };

    // Cleanup on unmount
    return () => {
      canvas.dispose();
    };
  }, [canvasSize]);

  // Calculate canvas size (responsive)
  useEffect(() => {
    const updateCanvasSize = () => {
      const containerWidth = Math.min(window.innerWidth - 32, 800); // 32px padding
      const scale = containerWidth / imageData.width;
      const width = containerWidth;
      const height = imageData.height * scale;

      // ✅ Only update if change is significant (more than 1px threshold)
      setCanvasSize((prev) => {
        if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
          return prev; // Avoid unnecessary updates
        }
        return { width, height };
      });
    };

    updateCanvasSize();

    // ✅ Use throttle to avoid frequent resize calls
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateCanvasSize, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [imageData.width, imageData.height]);

  const latestImageDataRef = useRef(imageData);
  const latestCanvasSizeRef = useRef(canvasSize);
  const latestOnCropChangeRef = useRef(onCropChange);

  useEffect(() => {
    latestImageDataRef.current = imageData;
    latestCanvasSizeRef.current = canvasSize;
    latestOnCropChangeRef.current = onCropChange;
  }, [imageData, canvasSize, onCropChange]);

  const updateCropRectRef = useRef<(() => void) | null>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCropRectRef = useRef<CropRect | null>(null);

  updateCropRectRef.current = () => {
    if (!cropRectRef.current) return;

    const rect = cropRectRef.current;
    const imageData = latestImageDataRef.current;
    const canvasSize = latestCanvasSizeRef.current;

    if (canvasSize.width === 0 || canvasSize.height === 0) {
      return;
    }

    const cropRect: CropRect = {
      x: Math.round((rect.left! * imageData.width) / canvasSize.width),
      y: Math.round((rect.top! * imageData.height) / canvasSize.height),
      width: Math.round(((rect.width! * rect.scaleX!) * imageData.width) / canvasSize.width),
      height: Math.round(((rect.height! * rect.scaleY!) * imageData.height) / canvasSize.height),
    };

    cropRect.x = Math.max(0, Math.min(cropRect.x, imageData.width - cropRect.width));
    cropRect.y = Math.max(0, Math.min(cropRect.y, imageData.height - cropRect.height));
    cropRect.width = Math.min(cropRect.width, imageData.width);
    cropRect.height = Math.min(cropRect.height, imageData.height);

    if (cropRect.width > 0 && cropRect.height > 0) {
      const lastRect = lastCropRectRef.current;

      if (!lastRect ||
          lastRect.x !== cropRect.x ||
          lastRect.y !== cropRect.y ||
          lastRect.width !== cropRect.width ||
          lastRect.height !== cropRect.height) {

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(() => {
          lastCropRectRef.current = cropRect;
          latestOnCropChangeRef.current(cropRect);
        }, 100);
      }
    }
  };

  // Load image onto canvas
  useEffect(() => {
    if (!fabricCanvasRef.current || canvasSize.width === 0) return;

    const canvas = fabricCanvasRef.current;

    if (!canvas.getElement || typeof canvas.clear !== 'function') {
      return;
    }

    if (imageLoaded && canvas.getObjects().length > 0) {
      const hasImage = canvas.getObjects().some(obj => obj.type === 'image');
      if (hasImage) {
        return;
      }
    }

    FabricImage.fromURL(imageData.url, {
      crossOrigin: 'anonymous',
    }).then((img) => {
      if (!img || !fabricCanvasRef.current) return;

      const currentCanvas = fabricCanvasRef.current;
      if (!currentCanvas.getElement || typeof currentCanvas.clear !== 'function') {
        return;
      }

      try {
        currentCanvas.clear();
        currentCanvas.backgroundColor = '#1f2937';
        currentCanvas.renderAll();
      } catch {
        return;
      }

      // Scale image to fit canvas
      const scale = canvasSize.width / (img.width || 1);
      img.scale(scale);
      img.set({
        left: canvasSize.width / 2,
        top: canvasSize.height / 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      currentCanvas.add(img);
      // Ensure image is at the bottom by re-adding it first
      const objs = currentCanvas.getObjects();
      if (objs.length > 1) {
        currentCanvas.remove(img);
        currentCanvas.add(img);
        img.selectable = false;
        img.evented = false;
      }

      // Create crop rectangle overlay
      const initialRect = initialCropRectRef.current;
      const rectWidth = initialRect?.width && initialRect.width > 0
        ? initialRect.width * scale
        : img.width! * scale * 0.8;
      const rectHeight = initialRect?.height && initialRect.height > 0
        ? initialRect.height * scale
        : img.height! * scale * 0.8;
      const rectLeft = initialRect?.x && initialRect.x > 0
        ? initialRect.x * scale
        : (canvasSize.width - rectWidth) / 2;
      const rectTop = initialRect?.y && initialRect.y > 0
        ? initialRect.y * scale
        : (canvasSize.height - rectHeight) / 2;

      const cropRect = new Rect({
        left: rectLeft,
        top: rectTop,
        width: rectWidth,
        height: rectHeight,
        fill: 'rgba(59, 130, 246, 0.1)',
        stroke: '#3b82f6',
        strokeWidth: 2,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        cornerSize: 12,
        transparentCorners: false,
        cornerStyle: 'circle',
        lockRotation: true,
      });

      cropRectRef.current = cropRect;
      currentCanvas.add(cropRect);
      currentCanvas.setActiveObject(cropRect);

      // Update parent with initial crop rect
      updateCropRectRef.current?.();

      setImageLoaded(true);
    }).catch(() => {
      // Image load failed silently
    });

    return () => {
      if (!fabricCanvasRef.current) return;

      try {
        fabricCanvasRef.current.getObjects().forEach((obj) => {
          if (obj.type === 'image') {
            obj.dispose?.();
          }
        });
      } catch {
        // Cleanup failed silently
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageData.url, canvasSize]);

  // Update crop rectangle when aspect ratio changes
  useEffect(() => {
    if (!cropRectRef.current || !fabricCanvasRef.current || !imageLoaded) return;

    const cropRect = cropRectRef.current;
    const canvas = fabricCanvasRef.current;

    if (aspectRatio > 0) {
      cropRect.set('lockAspectRatio', true);
      cropRect.set('aspectRatio', aspectRatio);

      const newHeight = cropRect.width! / aspectRatio;
      cropRect.set('height', newHeight);

      canvas.renderAll();
      updateCropRectRef.current?.();
    } else {
      cropRect.set('lockAspectRatio', false);
      cropRect.set('aspectRatio', undefined);
    }
  }, [aspectRatio, imageLoaded]);

  // Listen to crop rectangle modifications
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !cropRectRef.current || !imageLoaded) return;

    const handleObjectModified = () => {
      updateCropRectRef.current?.();
    };

    const handleObjectScaling = () => {
      updateCropRectRef.current?.();
    };

    const handleObjectMoving = () => {
      updateCropRectRef.current?.();
    };

    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('object:moving', handleObjectMoving);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:scaling', handleObjectScaling);
      canvas.off('object:moving', handleObjectMoving);
    };
  }, [imageLoaded]);

  return (
    <div className="w-full">
      <div className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <canvas ref={canvasRef} />
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
              <p className="text-sm">Loading image...</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center">
        Drag corners to resize • Drag center to move
      </div>
    </div>
  );
};
