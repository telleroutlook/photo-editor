/**
 * BgRemoveControls.tsx - Background Removal Control Panel
 * Tabbed interface for selecting background removal method
 */

import { useState } from 'react';
import { ColorRemoval } from './ColorRemoval';
import { MagicWand } from './MagicWand';
import { GrabCutTool } from './GrabCutTool';

type BgRemoveMethod = 'color' | 'magicwand' | 'grabcut';

interface BgRemoveControlsProps {
  imageData: Uint8Array;
  width: number;
  height: number;
  onRemoveComplete: (result: ArrayBuffer, width: number, height: number) => void;
}

export function BgRemoveControls({ imageData, width, height, onRemoveComplete }: BgRemoveControlsProps) {
  const [activeMethod, setActiveMethod] = useState<BgRemoveMethod>('color');

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveMethod('color')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeMethod === 'color'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Color Removal
            </button>
            <button
              onClick={() => setActiveMethod('magicwand')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeMethod === 'magicwand'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Magic Wand
            </button>
            <button
              onClick={() => setActiveMethod('grabcut')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeMethod === 'grabcut'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              GrabCut
            </button>
          </nav>
        </div>

        {/* Method Description */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {activeMethod === 'color' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Color Removal:</strong> Best for solid color backgrounds (green screens, white walls).
              Click on the background color to select it, then adjust tolerance.
            </p>
          )}
          {activeMethod === 'magicwand' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Magic Wand:</strong> Select areas by clicking. Use connected mode for contiguous regions
              or global mode to select all similar colors. Good for simple backgrounds.
            </p>
          )}
          {activeMethod === 'grabcut' && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>GrabCut:</strong> Advanced AI-based segmentation. Draw a rectangle around the subject
              and the algorithm will separate foreground from background. Best for complex scenes.
            </p>
          )}
        </div>
      </div>

      {/* Active Method Component */}
      <div>
        {activeMethod === 'color' && (
          <ColorRemoval imageData={imageData} width={width} height={height} onRemoveComplete={onRemoveComplete} />
        )}
        {activeMethod === 'magicwand' && (
          <MagicWand imageData={imageData} width={width} height={height} onRemoveComplete={onRemoveComplete} />
        )}
        {activeMethod === 'grabcut' && (
          <GrabCutTool imageData={imageData} width={width} height={height} onRemoveComplete={onRemoveComplete} />
        )}
      </div>
    </div>
  );
}
