import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { validateFiles } from '../../utils/fileUtils';
import { MAX_FILE_SIZE, MAX_FILES_UPLOAD, SUPPORTED_INPUT_FORMATS } from '../../utils/constants';
import { ImageFormat } from '../../types';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFormats?: ImageFormat[];
  maxFileSize?: number;
  maxFiles?: number;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelected,
  acceptedFormats = SUPPORTED_INPUT_FORMATS,
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = MAX_FILES_UPLOAD,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = (files: File[]) => {
    setError(null);
    if (files.length === 0) return;

    const validationResult = validateFiles(files, {
      maxSize: maxFileSize,
      maxCount: maxFiles,
      allowedFormats: acceptedFormats,
    });

    if (!validationResult.valid) {
      setError(validationResult.errors[0]);
    }

    if (validationResult.validFiles.length > 0) {
      onFilesSelected(validationResult.validFiles);
    }
  };

  const handleBrowseClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload area"
        aria-disabled={disabled}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleBrowseClick();
        }}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out
          flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px]
          ${disabled
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
            : isDragging
              ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-lg'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 bg-white'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={acceptedFormats.map(f => f.toString()).join(',')}
          onChange={handleFileInput}
          disabled={disabled}
        />

        <div className={`
          p-4 rounded-full mb-4 transition-colors duration-200
          ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}
        `}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {isDragging ? 'Drop files here' : 'Drag & Drop files here'}
        </h3>

        <p className="text-sm text-gray-500 mb-4 max-w-xs">
          or click to browse from your computer
        </p>

        <div className="text-xs text-gray-400 space-y-1">
          <p>Supported: {acceptedFormats.map(f => f.toString().split('/')[1]?.toUpperCase()).join(', ')}</p>
          <p>Max size: {Math.round(maxFileSize / 1024 / 1024)}MB</p>
        </div>

        {error && (
          <div
            className="absolute bottom-4 left-0 right-0 mx-auto w-max max-w-[90%] bg-red-100 text-red-600 text-sm py-2 px-4 rounded-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
