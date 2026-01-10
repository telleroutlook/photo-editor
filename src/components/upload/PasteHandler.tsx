import React, { useEffect } from 'react';
import { validateFiles } from '../../utils/fileUtils';
import { MAX_FILE_SIZE, MAX_FILES_UPLOAD, SUPPORTED_INPUT_FORMATS } from '../../utils/constants';

interface PasteHandlerProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const PasteHandler: React.FC<PasteHandlerProps> = ({
  onFilesSelected,
  disabled = false,
}) => {
  useEffect(() => {
    if (disabled) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        const items = Array.from(e.clipboardData.items);
        const files: File[] = [];

        items.forEach((item) => {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              files.push(file);
            }
          }
        });

        if (files.length > 0) {
          e.preventDefault(); // Prevent default paste behavior

          const validationResult = validateFiles(files, {
            maxSize: MAX_FILE_SIZE,
            maxCount: MAX_FILES_UPLOAD,
            allowedFormats: SUPPORTED_INPUT_FORMATS,
          });

          if (validationResult.validFiles.length > 0) {
            onFilesSelected(validationResult.validFiles);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [onFilesSelected, disabled]);

  return null;
};
