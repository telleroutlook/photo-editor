import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  console.log(`🔄 CropCanvas render #${renderCountRef.current}`, {
    imageDataChanged: imageData.url,
    aspectRatio,
    initialCropRect,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const cropRectRef = useRef<Rect | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const lastCanvasSizeRef = useRef({ width: 0, height: 0 }); // Track last canvas size

  // ✅ Store initialCropRect in a ref to avoid re-triggering image load
  const initialCropRectRef = useRef(initialCropRect);
  useEffect(() => {
    if (initialCropRect && (initialCropRect.width !== 0 || initialCropRect.height !== 0)) {
      initialCropRectRef.current = initialCropRect;
    }
  }, [initialCropRect]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // ✅ Guard: Only recreate canvas if size actually changed
    const sizeChanged =
      lastCanvasSizeRef.current.width !== canvasSize.width ||
      lastCanvasSizeRef.current.height !== canvasSize.height;

    if (!sizeChanged) {
      console.log('📏 Canvas size unchanged, skipping recreation');
      return;
    }

    console.log('🎨 Creating new canvas with size:', canvasSize);

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
  }, [canvasSize.width, canvasSize.height]);

  // Calculate canvas size (responsive)
  useEffect(() => {
    const updateCanvasSize = () => {
      const containerWidth = Math.min(window.innerWidth - 32, 800); // 32px padding
      const scale = containerWidth / imageData.width;
      const width = containerWidth;
      const height = imageData.height * scale;

      setCanvasSize({ width, height });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [imageData.width, imageData.height]);

  // ✅ Use refs to store latest values and avoid dependency chains
  const latestImageDataRef = useRef(imageData);
  const latestCanvasSizeRef = useRef(canvasSize);
  const latestOnCropChangeRef = useRef(onCropChange);

  useEffect(() => {
    latestImageDataRef.current = imageData;
    latestCanvasSizeRef.current = canvasSize;
    latestOnCropChangeRef.current = onCropChange;
  }, [imageData, canvasSize, onCropChange]);

  // ✅ Store updateCropRect in a ref to break the dependency cycle
  const updateCropRectRef = useRef<(() => void) | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCropRectRef = useRef<CropRect | null>(null);

  // Define the function using ref values (no dependencies needed)
  updateCropRectRef.current = () => {
    if (!cropRectRef.current) return;

    const rect = cropRectRef.current;
    const imageData = latestImageDataRef.current;
    const canvasSize = latestCanvasSizeRef.current;

    // ✅ Guard against division by zero
    if (canvasSize.width === 0 || canvasSize.height === 0) {
      console.warn('⚠️ Canvas size is zero, skipping crop rect update');
      return;
    }

    // Convert canvas coordinates back to image coordinates
    const cropRect: CropRect = {
      x: Math.round((rect.left! * imageData.width) / canvasSize.width),
      y: Math.round((rect.top! * imageData.height) / canvasSize.height),
      width: Math.round((rect.width! * imageData.width) / canvasSize.width),
      height: Math.round((rect.height! * imageData.height) / canvasSize.height),
    };

    // Clamp values to image bounds
    cropRect.x = Math.max(0, Math.min(cropRect.x, imageData.width - cropRect.width));
    cropRect.y = Math.max(0, Math.min(cropRect.y, imageData.height - cropRect.height));
    cropRect.width = Math.min(cropRect.width, imageData.width);
    cropRect.height = Math.min(cropRect.height, imageData.height);

    // ✅ Only call onCropChange if values are valid AND changed
    if (cropRect.width > 0 && cropRect.height > 0) {
      const lastRect = lastCropRectRef.current;

      // Check if values actually changed (avoid unnecessary updates)
      if (!lastRect ||
          lastRect.x !== cropRect.x ||
          lastRect.y !== cropRect.y ||
          lastRect.width !== cropRect.width ||
          lastRect.height !== cropRect.height) {

        // Clear existing timeout
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        // Debounce the update (100ms)
        updateTimeoutRef.current = setTimeout(() => {
          console.log('🎯 updateCropRect called:', cropRect);
          lastCropRectRef.current = cropRect;
          latestOnCropChangeRef.current(cropRect);
        }, 100);
      }
    } else {
      console.warn('⚠️ Invalid crop rect (zero width/height), skipping:', cropRect);
    }
  };

  // Log when updateCropRect ref is updated
  useEffect(() => {
    console.log('✅ updateCropRect ref updated');
  }, [imageData, canvasSize, onCropChange]);

  // Load image onto canvas
  useEffect(() => {
    if (!fabricCanvasRef.current || canvasSize.width === 0) return;

    const canvas = fabricCanvasRef.current;

    // ✅ Guard: Prevent reloading if image is already loaded and size hasn't changed
    if (imageLoaded && canvas.getObjects().length > 0) {
      const hasImage = canvas.getObjects().some(obj => obj.type === 'image');
      if (hasImage) {
        console.log('🖼️ Image already loaded, skipping reload');
        return;
      }
    }

    console.log('🖼️ Loading image:', imageData.url);

    FabricImage.fromURL(imageData.url, {
      crossOrigin: 'anonymous',
    }).then((img) => {
      if (!img) return;

      // Clear existing objects and set background color
      canvas.clear();
      canvas.backgroundColor = '#1f2937';
      canvas.renderAll();

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

      canvas.add(img);
      // Ensure image is at the bottom by re-adding it first
      const objs = canvas.getObjects();
      if (objs.length > 1) {
        canvas.remove(img);
        canvas.add(img);
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
      canvas.add(cropRect);
      canvas.setActiveObject(cropRect);

      // Update parent with initial crop rect
      updateCropRectRef.current?.();

      setImageLoaded(true);
    }).catch((err) => {
      console.error('Failed to load image:', err);
    });

    return () => {
      // Cleanup image objects
      canvas.getObjects().forEach((obj) => {
        if (obj.type === 'image') {
          obj.dispose?.();
        }
      });
    };
  }, [imageData.url, canvasSize]);  // ✅ Removed initialCropRect from dependencies

  // Update crop rectangle when aspect ratio changes
  useEffect(() => {
    if (!cropRectRef.current || !fabricCanvasRef.current || !imageLoaded) return;

    const cropRect = cropRectRef.current;
    const canvas = fabricCanvasRef.current;

    if (aspectRatio > 0) {
      // Lock aspect ratio
      cropRect.set('lockAspectRatio', true);
      cropRect.set('aspectRatio', aspectRatio);

      // Adjust height to match aspect ratio
      const newHeight = cropRect.width! / aspectRatio;
      cropRect.set('height', newHeight);

      canvas.renderAll();
      updateCropRectRef.current?.();
    } else {
      // Free form
      cropRect.set('lockAspectRatio', false);
      cropRect.set('aspectRatio', undefined);
    }
  }, [aspectRatio, imageLoaded]);  // ✅ Removed updateCropRect from dependencies

  // Listen to crop rectangle modifications
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !cropRectRef.current) return;

    console.log('🔧 Setting up Fabric.js event listeners');

    const handleObjectModified = () => {
      console.log('⚡ Fabric.js event triggered: object:modified');
      updateCropRectRef.current?.();
    };

    const handleObjectScaling = () => {
      console.log('⚡ Fabric.js event triggered: object:scaling');
      updateCropRectRef.current?.();
    };

    const handleObjectMoving = () => {
      console.log('⚡ Fabric.js event triggered: object:moving');
      updateCropRectRef.current?.();
    };

    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('object:moving', handleObjectMoving);

    return () => {
      console.log('🔧 Cleaning up Fabric.js event listeners');
      // Clear timeout on cleanup
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:scaling', handleObjectScaling);
      canvas.off('object:moving', handleObjectMoving);
    };
  }, []);  // ✅ Empty dependency array - only runs once!

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
