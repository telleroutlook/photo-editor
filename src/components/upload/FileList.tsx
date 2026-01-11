import React, { useEffect, useRef } from 'react';
import { useImageStore } from '../../store/imageStore';
import { useAppStore } from '../../store/appStore';
import { formatFileSize } from '../../utils/fileUtils';
import { X, Check } from 'lucide-react';

interface FileListProps {
  variant?: 'default' | 'filmstrip';
}

export const FileList: React.FC<FileListProps> = ({ variant = 'default' }) => {
  const { images, removeImage, selectedImageId, selectImage } = useImageStore();
  const {
    currentFeature,
    bgRemovePreviewUrl,
    bgRemovePreviewData,
    bgRemovePreviewWidth,
    bgRemovePreviewHeight,
    setBgRemovePreviewUrl
  } = useAppStore();

  const previewUrlRef = useRef<string | null>(null);

  // Clear preview when switching tools or images
  useEffect(() => {
    if (currentFeature !== 'bgremove') {
      // Revoke and clear URL when leaving bgremove mode
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setBgRemovePreviewUrl(null);
    }
  }, [currentFeature, selectedImageId, setBgRemovePreviewUrl]);

  // Generate preview URL when preview data changes
  useEffect(() => {
    if (bgRemovePreviewData && bgRemovePreviewWidth && bgRemovePreviewHeight) {
      console.log('🎨 [FileList] Generating preview URL from data:', {
        dataSize: bgRemovePreviewData.length,
        previewWidth: bgRemovePreviewWidth,
        previewHeight: bgRemovePreviewHeight,
        hasExistingUrl: !!previewUrlRef.current
      });

      // Revoke old URL if exists
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      // Create canvas to generate proper PNG
      const canvas = document.createElement('canvas');
      canvas.width = bgRemovePreviewWidth;
      canvas.height = bgRemovePreviewHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('❌ [FileList] Failed to get canvas context');
        return;
      }

      // Put image data on canvas
      const imageData = new ImageData(
        new Uint8ClampedArray(bgRemovePreviewData),
        bgRemovePreviewWidth,
        bgRemovePreviewHeight
      );
      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to blob and generate URL
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('❌ [FileList] Failed to create blob');
          return;
        }

        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setBgRemovePreviewUrl(url);

        console.log('✅ [FileList] Preview URL generated:', url, {
          blobSize: blob.size,
          blobType: blob.type
        });
      }, 'image/png');
    }

    // Cleanup on unmount
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [bgRemovePreviewData, bgRemovePreviewWidth, bgRemovePreviewHeight, setBgRemovePreviewUrl]);

  console.log('📊 [FileList] Render state:', {
    variant,
    currentFeature,
    selectedImageId,
    bgRemovePreviewUrl: bgRemovePreviewUrl ? 'URL exists' : null,
    imageCount: images.length
  });

  if (images.length === 0) {
    return null;
  }

  // Filmstrip variant - horizontal scrolling for workspace layout
  if (variant === 'filmstrip') {
    return (
      <div className="h-full w-full flex items-center px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="flex gap-3 py-3">
          {images.map((image) => {
            // Use preview URL if bgremove is active, image is selected, and preview exists
            const displayUrl = (currentFeature === 'bgremove' && selectedImageId === image.id && bgRemovePreviewUrl)
              ? bgRemovePreviewUrl
              : image.url;

            if (currentFeature === 'bgremove' && selectedImageId === image.id) {
              console.log('🖼️ [FileList] Selected image in bgremove mode:', {
                imageId: image.id,
                hasPreviewUrl: !!bgRemovePreviewUrl,
                usingPreviewUrl: displayUrl === bgRemovePreviewUrl
              });
            }

            return (
              <div
                key={image.id}
                onClick={() => selectImage(image.id)}
                className={`
                  group relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200
                  ${selectedImageId === image.id
                    ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-900/50'
                    : 'border-zinc-700 hover:border-zinc-600'}
                  ${currentFeature === 'bgremove' && selectedImageId === image.id && bgRemovePreviewUrl
                    ? 'ring-4 ring-green-500/30'
                    : ''}
                `}
                style={
                  currentFeature === 'bgremove' && selectedImageId === image.id && bgRemovePreviewUrl
                    ? {
                        backgroundImage: 'conic-gradient(#666 25%, #999 0 50%, #666 0 75%, #999 0)',
                        backgroundSize: '12px 12px'
                      }
                    : undefined
                }
              >
                <img
                  src={displayUrl}
                  alt={image.file.name}
                  className="w-full h-full object-cover"
                  onLoad={(e) => {
                    if (currentFeature === 'bgremove' && selectedImageId === image.id && bgRemovePreviewUrl) {
                      console.log('✅ [FileList] Preview image loaded successfully:', {
                        url: displayUrl,
                        displayWidth: e.currentTarget.naturalWidth,
                        displayHeight: e.currentTarget.naturalHeight,
                        usingPreview: displayUrl === bgRemovePreviewUrl
                      });

                      // Verify transparency by reading center pixel
                      const canvas = document.createElement('canvas');
                      canvas.width = e.currentTarget.naturalWidth;
                      canvas.height = e.currentTarget.naturalHeight;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(e.currentTarget, 0, 0);
                        const centerPixel = ctx.getImageData(
                          Math.floor(e.currentTarget.naturalWidth / 2),
                          Math.floor(e.currentTarget.naturalHeight / 2),
                          1, 1
                        ).data;
                        console.log('🔍 [FileList] Center pixel RGBA:', centerPixel, 'Alpha =', centerPixel[3]);
                      }
                    }
                  }}
                  onError={(e) => {
                    console.error('❌ [FileList] Failed to load preview image:', {
                      url: displayUrl,
                      error: e
                    });
                  }}
                />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Remove this image?')) {
                    removeImage(image.id);
                  }
                }}
                className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 focus:opacity-100"
                aria-label="Remove image"
              >
                <X size={12} strokeWidth={3} />
              </button>

              {/* Selected indicator */}
              {selectedImageId === image.id && (
                <div className="absolute top-1 left-1 bg-blue-500 text-white p-1 rounded-full shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}

              {/* Filename on hover */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/90 to-transparent">
                <p className="truncate font-medium leading-tight">{image.file.name}</p>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default variant - grid layout
  return (
    <div className="w-full mt-6">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Uploaded Images ({images.length})
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            onClick={() => selectImage(image.id)}
            className={`
              group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200
              ${selectedImageId === image.id
                ? 'border-blue-500 ring-2 ring-blue-500/50'
                : 'border-zinc-700 hover:border-zinc-600'}
            `}
          >
            <img
              src={image.url}
              alt={image.file.name}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to remove this image?')) {
                  removeImage(image.id);
                }
              }}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 focus:opacity-100"
              aria-label="Remove image"
            >
              <X size={16} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="truncate font-medium">{image.file.name}</p>
              <p className="opacity-80">{formatFileSize(image.size)} • {image.width}×{image.height}</p>
            </div>

            {selectedImageId === image.id && (
              <div className="absolute top-2 left-2 bg-blue-500 text-white p-1 rounded-full shadow-sm">
                <Check size={14} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
