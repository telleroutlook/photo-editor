/**
 * GrabCutSimple.tsx - GrabCut Control Panel (No Canvas)
 * Uses main PreviewCanvas for rectangle drawing
 */

import { useAppStore } from '../../store/appStore';

interface GrabCutSimpleProps {
  onSelectionComplete: () => void;
}

export function GrabCutSimple({ onSelectionComplete }: GrabCutSimpleProps) {
  const {
    bgRemoveGrabCutActive,
    bgRemoveGrabCutRect,
    bgRemoveIterations,
    bgRemoveSelectionMask,
    setBgRemoveGrabCutActive,
    setBgRemoveIterations,
  } = useAppStore();

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-4">
        {/* Start Drawing Button */}
        <button
          onClick={() => {
            setBgRemoveGrabCutActive(!bgRemoveGrabCutActive);
          }}
          title={bgRemoveGrabCutActive
            ? "Click to cancel rectangle drawing"
            : "Draw a rectangle around the subject on the main image, AI will separate foreground from background"}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
            bgRemoveGrabCutActive
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {bgRemoveGrabCutActive ? '⏹ Cancel' : '📐 Start Selection'}
        </button>

        {bgRemoveGrabCutActive && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 text-sm text-yellow-800 dark:text-yellow-200 text-center animate-pulse">
            Drag on the center image to draw rectangle around subject
          </div>
        )}

        {/* Rectangle Status */}
        {bgRemoveGrabCutRect && !bgRemoveSelectionMask && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2 text-sm text-purple-800 dark:text-purple-200 text-center">
            Processing AI segmentation...
          </div>
        )}

        {/* Iterations Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="iterations-gc" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Iterations
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">{bgRemoveIterations}</span>
          </div>
          <input
            id="iterations-gc"
            type="range"
            min="1"
            max="5"
            value={bgRemoveIterations}
            onChange={(e) => setBgRemoveIterations(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            title="Higher = better quality but slower"
          />
        </div>

        {/* Selection Status */}
        {bgRemoveSelectionMask && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 text-center">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ Selection complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
