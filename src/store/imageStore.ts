/**
 * Image data store
 * Manages uploaded images and their metadata
 */

import { create } from 'zustand';
import { ImageFile, ProcessedImage, AnyOperation } from '../types';

interface ImageState {
  // State
  images: ImageFile[];
  selectedImageId: string | null;
  processedImages: Map<string, ProcessedImage>;

  // Actions
  addImages: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  selectImage: (id: string) => void;
  clearAll: () => void;

  // Operation management
  addOperation: (imageId: string, operation: AnyOperation) => void;
  getOperations: (imageId: string) => AnyOperation[];
  clearOperations: (imageId: string) => void;

  // Processed images
  setProcessedImage: (imageId: string, processed: ProcessedImage) => void;
  getProcessedImage: (imageId: string) => ProcessedImage | undefined;

  // Helpers
  getImageById: (id: string) => ImageFile | undefined;
  getSelectedImage: () => ImageFile | undefined;
}

export const useImageStore = create<ImageState>((set, get) => ({
  // Initial state
  images: [],
  selectedImageId: null,
  processedImages: new Map(),

  /**
   * Add images to the store
   * Validates files and extracts metadata
   */
  addImages: async (files: File[]) => {
    const { images } = get();

    // Process each file
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        // Generate unique ID
        const id = generateId();

        // Create blob URL
        const url = URL.createObjectURL(file);

        // Extract image dimensions
        const dimensions = await getImageDimensions(file);

        return {
          id,
          file,
          url,
          width: dimensions.width,
          height: dimensions.height,
          size: file.size,
          format: getFormatFromFile(file),
        } as ImageFile;
      })
    );

    // Add to store
    set((state) => ({
      images: [...state.images, ...processedFiles],
      selectedImageId: processedFiles[0]?.id ?? state.selectedImageId,
    }));
  },

  /**
   * Remove an image from the store
   */
  removeImage: (id: string) => {
    set((state) => {
      const imageToRemove = state.images.find((img) => img.id === id);

      // Revoke object URL to free memory
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url);
      }

      // Remove from images array
      const images = state.images.filter((img) => img.id !== id);

      // Update selected image if needed
      let selectedImageId = state.selectedImageId;
      if (state.selectedImageId === id) {
        selectedImageId = images.length > 0 ? images[0].id : null;
      }

      // Remove from processed images
      const processedImages = new Map(state.processedImages);
      processedImages.delete(id);

      return { images, selectedImageId, processedImages };
    });
  },

  /**
   * Select an image
   */
  selectImage: (id: string) => {
    set({ selectedImageId: id });
  },

  /**
   * Clear all images
   */
  clearAll: () => {
    const { images } = get();

    // Revoke all object URLs
    images.forEach((img) => URL.revokeObjectURL(img.url));

    set({
      images: [],
      selectedImageId: null,
      processedImages: new Map(),
    });
  },

  /**
   * Add an operation to an image
   */
  addOperation: (imageId: string, operation: AnyOperation) => {
    // Operations are stored in ProcessedImage, not in ImageFile
    // This is a placeholder for future use
    console.log('Operation added:', imageId, operation);
  },

  /**
   * Get all operations for an image
   */
  getOperations: (imageId: string) => {
    const { processedImages } = get();
    const processed = processedImages.get(imageId);
    return (processed?.operations ?? []) as AnyOperation[];
  },

  /**
   * Clear operations for an image
   */
  clearOperations: (imageId: string) => {
    set((state) => {
      const processedImages = new Map(state.processedImages);
      const processed = processedImages.get(imageId);

      if (processed) {
        processed.operations = [];
        processedImages.set(imageId, processed);
      }

      return { processedImages };
    });
  },

  /**
   * Set a processed image
   */
  setProcessedImage: (imageId: string, processed: ProcessedImage) => {
    set((state) => {
      const processedImages = new Map(state.processedImages);
      processedImages.set(imageId, processed);
      return { processedImages };
    });
  },

  /**
   * Get a processed image
   */
  getProcessedImage: (imageId: string) => {
    return get().processedImages.get(imageId);
  },

  /**
   * Get an image by ID
   */
  getImageById: (id: string) => {
    return get().images.find((img) => img.id === id);
  },

  /**
   * Get the currently selected image
   */
  getSelectedImage: () => {
    const { images, selectedImageId } = get();
    return images.find((img) => img.id === selectedImageId);
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get image dimensions from a file
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Get image format from file
 */
function getFormatFromFile(file: File): string {
  const type = file.type;
  if (type.startsWith('image/')) {
    return type as string;
  }

  // Fallback: infer from extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension) {
    const formatMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      heic: 'image/heic',
    };
    return formatMap[extension] || 'image/jpeg';
  }

  return 'image/jpeg';
}
