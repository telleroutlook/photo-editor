/**
 * Global keyboard shortcuts hook
 * Handles common keyboard shortcuts across the application
 */

import { useEffect, useCallback } from 'react';
import { useImageStore } from '../store/imageStore';
import { showInfoToast } from '../store/toastStore';

interface KeyboardShortcutsConfig {
  enableUndo?: boolean;
  enableRedo?: boolean;
  enableSave?: boolean;
  enableHelp?: boolean;
  onSave?: () => void;
}

/**
 * Global keyboard shortcuts
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Shift + Z / Ctrl/Cmd + Y: Redo
 * - Ctrl/Cmd + S: Save/Download
 * - Ctrl/Cmd + /: Show keyboard shortcuts help
 * - ESC: Clear selection (future use)
 */
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig = {}) {
  const {
    enableUndo = true,
    enableRedo = true,
    enableSave = true,
    enableHelp = true,
    onSave,
  } = config;

  const { getSelectedImage, undo, redo, canUndo, canRedo } = useImageStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Detect Mac OS using userAgent (more modern approach)
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      // Ignore shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const selectedImage = getSelectedImage();

      // Undo: Ctrl/Cmd + Z
      if (enableUndo && modifierKey && event.key === 'z' && !event.shiftKey) {
        if (selectedImage && canUndo(selectedImage.id)) {
          event.preventDefault();
          undo(selectedImage.id);
          showInfoToast('Undo', 'Operation undone');
        }
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z OR Ctrl/Cmd + Y
      if (
        enableRedo &&
        modifierKey &&
        ((event.key === 'z' && event.shiftKey) || event.key === 'y')
      ) {
        if (selectedImage && canRedo(selectedImage.id)) {
          event.preventDefault();
          redo(selectedImage.id);
          showInfoToast('Redo', 'Operation redone');
        }
        return;
      }

      // Save: Ctrl/Cmd + S
      if (enableSave && modifierKey && event.key === 's') {
        event.preventDefault();
        if (onSave) {
          onSave();
        } else if (selectedImage) {
          // Default save behavior: download current image
          const a = document.createElement('a');
          a.href = selectedImage.url;
          a.download = selectedImage.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showInfoToast('Downloaded', `Saved ${selectedImage.fileName}`);
        }
        return;
      }

      // Help: Ctrl/Cmd + /
      if (enableHelp && modifierKey && event.key === '/') {
        event.preventDefault();
        showKeyboardShortcutsHelp();
        return;
      }
    },
    [enableUndo, enableRedo, enableSave, enableHelp, onSave, getSelectedImage, undo, redo, canUndo, canRedo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Show keyboard shortcuts help in a toast
 */
function showKeyboardShortcutsHelp() {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    `${modKey} + Z: Undo`,
    `${modKey} + Shift + Z / ${modKey} + Y: Redo`,
    `${modKey} + S: Save/Download`,
    `${modKey} + /: Show this help`,
  ];

  showInfoToast('Keyboard Shortcuts', shortcuts.join('\n'));
}

/**
 * Hook for showing keyboard shortcuts help
 */
export function useShowKeyboardHelp() {
  return useCallback(() => {
    showKeyboardShortcutsHelp();
  }, []);
}
