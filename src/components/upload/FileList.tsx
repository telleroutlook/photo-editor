import React from 'react';
import { useImageStore } from '../../store/imageStore';
import { formatFileSize } from '../../utils/fileUtils';

export const FileList: React.FC = () => {
  const { images, removeImage, selectedImageId, selectImage } = useImageStore();

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Uploaded Images ({images.length})
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            onClick={() => selectImage(image.id)}
            className={`
              group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200
              ${selectedImageId === image.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="truncate font-medium">{image.file.name}</p>
              <p className="opacity-80">{formatFileSize(image.size)} • {image.width}×{image.height}</p>
            </div>

            {selectedImageId === image.id && (
              <div className="absolute top-2 left-2 bg-blue-500 text-white p-1 rounded-full shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
