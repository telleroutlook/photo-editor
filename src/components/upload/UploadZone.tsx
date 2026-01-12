import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { validateFiles } from '../../utils/fileUtils';
import { showErrorToast, showWarningToast, showSuccessToast } from '../../store/toastStore';
import { MAX_FILE_SIZE, MAX_FILES_UPLOAD, SUPPORTED_INPUT_FORMATS } from '../../utils/constants';
import { ImageFormat } from '../../types';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFormats?: ImageFormat[];
  maxFileSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  compact?: boolean; // Compact mode for sidebar
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelected,
  acceptedFormats = SUPPORTED_INPUT_FORMATS,
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = MAX_FILES_UPLOAD,
  disabled = false,
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
    if (disabled || isProcessing) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsProcessing(true);

    try {
      // Validate files
      const validationResult = validateFiles(files, {
        maxSize: maxFileSize,
        maxCount: maxFiles,
        allowedFormats: acceptedFormats,
      });

      // Show errors with Toast
      if (!validationResult.valid && validationResult.errors.length > 0) {
        validationResult.errors.forEach(error => {
          showErrorToast('Upload Failed', error);
        });
      }

      // Show warnings for partially valid files
      if (validationResult.validFiles.length > 0 && validationResult.errors.length > 0) {
        showWarningToast(
          'Some Files Skipped',
          `${validationResult.validFiles.length} of ${files.length} files uploaded successfully`
        );
      }

      // Process valid files
      if (validationResult.validFiles.length > 0) {
        onFilesSelected(validationResult.validFiles);

        // Success feedback
        if (validationResult.errors.length === 0) {
          const count = validationResult.validFiles.length;
          showSuccessToast(
            'Upload Successful',
            `${count} ${count === 1 ? 'file' : 'files'} uploaded successfully`
          );
        }
      }
    } catch (error) {
      showErrorToast('Upload Error', error instanceof Error ? error.message : 'Failed to process files');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBrowseClick = () => {
    if (disabled || isProcessing) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled || isProcessing ? -1 : 0}
        aria-label="Upload area"
        aria-disabled={disabled || isProcessing}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleBrowseClick();
        }}
        className={`
          relative border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out
          flex flex-col items-center justify-center text-center
          ${compact ? 'p-4 min-h-[120px]' : 'p-8 min-h-[240px]'}
          ${disabled || isProcessing
            ? 'bg-zinc-900 border-zinc-700 cursor-not-allowed opacity-60'
            : isDragging
              ? 'border-blue-500 bg-blue-950/50 scale-[1.02] shadow-xl shadow-blue-900/20 cursor-copy'
              : 'border-zinc-700 hover:border-blue-500 hover:bg-zinc-900/50 bg-zinc-900/30 cursor-pointer'
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
          disabled={disabled || isProcessing}
        />

        {/* Upload Icon */}
        <div className={`
          p-3 rounded-full mb-3 transition-all duration-200
          ${compact ? '' : 'p-4 mb-4'}
          ${isProcessing
            ? 'bg-blue-900/50 text-blue-400 animate-pulse'
            : isDragging
              ? 'bg-blue-900/50 text-blue-400 scale-110'
              : 'bg-zinc-800 text-zinc-500'
          }
        `}>
          {isProcessing ? (
            <CheckCircle className={compact ? 'h-6 w-6' : 'h-10 w-10'} />
          ) : (
            <Upload className={compact ? 'h-6 w-6' : 'h-10 w-10'} />
          )}
        </div>

        {/* Upload Title */}
        <h3 className={`font-semibold transition-colors ${compact ? 'text-sm mb-1' : 'text-lg mb-2'} ${
          isDragging ? 'text-blue-400' : 'text-zinc-300'
        }`}>
          {isProcessing
            ? 'Processing...'
            : isDragging
              ? 'Drop files here'
              : compact
                ? 'Upload Files'
                : 'Drag & Drop files here'
          }
        </h3>

        {/* Upload Description */}
        {!compact && (
          <p className={`text-sm mb-4 max-w-xs transition-colors ${
            isDragging ? 'text-blue-300' : 'text-zinc-400'
          }`}>
            {isProcessing
              ? 'Validating your files...'
              : 'or click to browse from your computer'
            }
          </p>
        )}

        {/* File Restrictions */}
        <div className={`space-y-1 ${compact ? 'text-[10px]' : 'text-xs'} ${
          isDragging ? 'text-blue-300' : 'text-zinc-500'
        }`}>
          {!compact && (
            <>
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Supported: {acceptedFormats.map(f => f.toString().split('/')[1]?.toUpperCase()).join(', ')}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Max size: {Math.round(maxFileSize / 1024 / 1024)}MB per file</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Upload up to {maxFiles} files at once</span>
              </div>
            </>
          )}
          {compact && <p className="text-zinc-600">Click or drag files</p>}
        </div>
      </div>
    </div>
  );
};
