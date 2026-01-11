/**
 * PreviewCanvas - Generic image preview component
 * Used for most tools (resize, compress, rotate, etc.)
 * Displays the currently selected image in the workspace
 */

import React, { useEffect, useRef, useState } from 'react';
import { useImageStore } from '../../store/imageStore';
import { Image as ImageIcon } from 'lucide-react';

interface PreviewCanvasProps {
  className?: string;
  showInfo?: boolean; // Show image dimensions and file size
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  className = '',
  showInfo = true
}) => {
  const { getSelectedImage } = useImageStore();
  const currentImage = getSelectedImage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!currentImage || !canvasRef.current) {
      setImageLoaded(false);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      setImageLoaded(true);
    };

    img.src = currentImage.url;
  }, [currentImage]);

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
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full shadow-2xl rounded-lg border border-zinc-800"
      />

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
