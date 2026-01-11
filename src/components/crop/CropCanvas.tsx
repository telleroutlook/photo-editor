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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const cropRectRef = useRef<Rect | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: '#1f2937',
      selection: false,
    });

    fabricCanvasRef.current = canvas;

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

  // Update crop rect callback (must be defined before useEffects that use it)
  const updateCropRect = useCallback(() => {
    if (!cropRectRef.current) return;

    const rect = cropRectRef.current;

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

    onCropChange(cropRect);
  }, [cropRectRef, canvasSize, imageData, onCropChange]);

  // Load image onto canvas
  useEffect(() => {
    if (!fabricCanvasRef.current || canvasSize.width === 0) return;

    const canvas = fabricCanvasRef.current;

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
      const rectWidth = initialCropRect?.width ?? img.width! * scale * 0.8;
      const rectHeight = initialCropRect?.height ?? img.height! * scale * 0.8;
      const rectLeft = initialCropRect?.x ?? (canvasSize.width - rectWidth) / 2;
      const rectTop = initialCropRect?.y ?? (canvasSize.height - rectHeight) / 2;

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
      updateCropRect();

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
  }, [imageData.url, canvasSize, initialCropRect, updateCropRect]);

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
      updateCropRect();
    } else {
      // Free form
      cropRect.set('lockAspectRatio', false);
      cropRect.set('aspectRatio', undefined);
    }
  }, [aspectRatio, imageLoaded, updateCropRect]);

  // Listen to crop rectangle modifications
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !cropRectRef.current) return;

    const handleObjectModified = () => {
      updateCropRect();
    };

    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:scaling', handleObjectModified);
    canvas.on('object:moving', handleObjectModified);

    return () => {
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:scaling', handleObjectModified);
      canvas.off('object:moving', handleObjectModified);
    };
  }, [imageData, updateCropRect]);

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
