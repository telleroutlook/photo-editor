/**
 * FileSelection.tsx - Batch File Selection Component
 * Allows users to select which images to include in batch processing
 */

import { useState } from 'react';
import { useImageStore } from '../../store/imageStore';
import type { FileSelection } from '../../types/batch';

interface FileSelectionProps {
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  disabled?: boolean;
}

export function FileSelection({ selectedIds, onSelectionChange, disabled = false }: FileSelectionProps) {
  const { images } = useImageStore();

  const handleToggleAll = () => {
    if (selectedIds.size === images.length) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all
      onSelectionChange(new Set(images.map((img) => img.id)));
    }
  };

  const handleToggleImage = (imageId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    onSelectionChange(newSelection);
  };

  const allSelected = images.length > 0 && selectedIds.size === images.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Select Images ({selectedIds.size} / {images.length})
          </h3>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = someSelected;
                }
              }}
              onChange={handleToggleAll}
              disabled={disabled || images.length === 0}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </label>
        </div>
      </div>

      {/* File Grid */}
      <div className="p-4">
        {images.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm">No images uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedIds.has(image.id)
                    ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && handleToggleImage(image.id)}
              >
                {/* Selection Checkbox Overlay */}
                <div className="absolute top-2 left-2 z-10">
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedIds.has(image.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white/80 dark:bg-gray-800/80 border-gray-400'
                    }`}
                  >
                    {selectedIds.has(image.id) && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Image Thumbnail */}
                <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                  <img
                    src={image.url}
                    alt={image.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* File Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white font-medium truncate">{image.fileName}</p>
                  <p className="text-xs text-gray-300">
                    {image.width} × {image.height}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {images.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {selectedIds.size === 0
                ? 'Select images to process'
                : `${selectedIds.size} image${selectedIds.size !== 1 ? 's' : ''} selected`}
            </span>
            {selectedIds.size > 0 && (
              <button
                onClick={() => onSelectionChange(new Set())}
                disabled={disabled}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
