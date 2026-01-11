/**
 * BgRemoveControls.tsx - Background Removal Control Panel
 * Tabbed interface for selecting background removal method
 * All tools use main PreviewCanvas for interaction
 */

import { useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { useBgRemoveWorker } from '../../hooks/useBgRemoveWorker';
import { MagicWandSimple } from './MagicWandSimple';
import { GrabCutSimple } from './GrabCutSimple';

type BgRemoveMethod = 'magicwand' | 'grabcut';

interface BgRemoveControlsProps {
  imageData: Uint8Array;
  width: number;
  height: number;
  onRemoveComplete: (result: ArrayBuffer, width: number, height: number) => void;
}

export function BgRemoveControls({ imageData, width, height, onRemoveComplete }: BgRemoveControlsProps) {
  const { bgRemoveMethod, setBgRemoveMethod, bgRemovePreviewUrl } = useAppStore();
  const { magicWandSelect, grabCutSegment, loading, initialized } = useBgRemoveWorker();
  const [processing, setProcessing] = useState(false);

  // Handle Apply button for both tools
  const handleApply = useCallback(async () => {
    if (!initialized || processing) return;

    const {
      bgRemoveSelectionMask,
      bgRemoveMethod: method,
      bgRemoveTolerance: tolerance,
      bgRemoveConnected: connected,
      bgRemoveIterations: iterations,
    } = useAppStore.getState();

    if (!bgRemoveSelectionMask) {
      alert(`Please make a selection first using ${method === 'magicwand' ? 'Magic Wand' : 'GrabCut'}`);
      return;
    }

    setProcessing(true);
    try {
      let resultImageData: Uint8ClampedArray;

      if (method === 'magicwand') {
        // For Magic Wand, the mask indicates selected pixels (to be removed)
        resultImageData = new Uint8ClampedArray(imageData);
        for (let i = 0; i < bgRemoveSelectionMask.length; i++) {
          if (bgRemoveSelectionMask[i] > 128) {  // Selected pixel → make transparent
            const idx = i * 4;
            resultImageData[idx + 3] = 0;  // Set alpha to 0
          }
        }
      } else {
        // For GrabCut, mask < 128 means background (to be removed)
        resultImageData = new Uint8ClampedArray(imageData);
        for (let i = 0; i < bgRemoveSelectionMask.length; i++) {
          if (bgRemoveSelectionMask[i] < 128) {  // Background pixel → make transparent
            const idx = i * 4;
            resultImageData[idx + 3] = 0;  // Set alpha to 0
          }
        }
      }

      // Convert to regular ArrayBuffer (not SharedArrayBuffer)
      const arrayBuffer = new ArrayBuffer(resultImageData.byteLength);
      new Uint8Array(arrayBuffer).set(new Uint8Array(resultImageData.buffer));
      onRemoveComplete(arrayBuffer, width, height);

      // Clear selection after applying
      useAppStore.getState().setBgRemoveSelectionMask(null);
    } catch (error) {
      console.error('Error applying background removal:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  }, [imageData, width, height, onRemoveComplete, initialized, processing]);

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setBgRemoveMethod('magicwand')}
              title="Click to select similar colored areas"
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                bgRemoveMethod === 'magicwand'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🪄 Magic Wand
            </button>
            <button
              onClick={() => setBgRemoveMethod('grabcut')}
              title="Draw rectangle, AI separates foreground from background"
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                bgRemoveMethod === 'grabcut'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🤖 GrabCut
            </button>
          </nav>
        </div>
      </div>

      {/* Active Method Component */}
      <div>
        {bgRemoveMethod === 'magicwand' && (
          <MagicWandSimple onSelectionComplete={handleApply} />
        )}
        {bgRemoveMethod === 'grabcut' && (
          <GrabCutSimple onSelectionComplete={handleApply} />
        )}
      </div>

      {/* Preview Box */}
      {bgRemovePreviewUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-green-500/50 shadow-lg"
               style={{
                 backgroundImage: 'conic-gradient(#666 25%, #999 0 50%, #666 0 75%, #999 0)',
                 backgroundSize: '16px 16px'
               }}>
            <img
              src={bgRemovePreviewUrl}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Apply Button (Shared) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <button
          onClick={handleApply}
          disabled={!useAppStore.getState().bgRemoveSelectionMask || loading || processing || !initialized}
          className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {processing || loading ? 'Processing...' : '✅ Apply'}
        </button>
      </div>
    </div>
  );
}
