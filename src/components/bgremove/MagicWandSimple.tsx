/**
 * MagicWandSimple.tsx - Magic Wand Control Panel (No Canvas)
 * Uses main PreviewCanvas for interaction
 */

import { useAppStore } from '../../store/appStore';

interface MagicWandSimpleProps {
  onSelectionComplete: () => void;
}

export function MagicWandSimple({ onSelectionComplete }: MagicWandSimpleProps) {
  const {
    bgRemoveMagicWandActive,
    bgRemoveTolerance,
    bgRemoveConnected,
    bgRemoveSelectionMask,
    setBgRemoveMagicWandActive,
    setBgRemoveTolerance,
    setBgRemoveConnected,
  } = useAppStore();

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-4">
        {/* Start Selection Button */}
        <button
          onClick={() => setBgRemoveMagicWandActive(!bgRemoveMagicWandActive)}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
            bgRemoveMagicWandActive
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={bgRemoveMagicWandActive ? "Click to cancel selection" : "Click to start selecting background areas on the main image"}
        >
          {bgRemoveMagicWandActive ? '⏹ Cancel' : '🎯 Start Selection'}
        </button>

        {bgRemoveMagicWandActive && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 text-sm text-yellow-800 dark:text-yellow-200 text-center animate-pulse">
            Click on the center image to select background
          </div>
        )}

        {/* Tolerance Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="tolerance-mw" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tolerance
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">{bgRemoveTolerance}</span>
          </div>
          <input
            id="tolerance-mw"
            type="range"
            min="0"
            max="255"
            value={bgRemoveTolerance}
            onChange={(e) => setBgRemoveTolerance(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            title="Lower = more precise, Higher = more colors"
          />
        </div>

        {/* Connected Toggle */}
        <div className="flex items-center gap-3">
          <input
            id="connected"
            type="checkbox"
            checked={bgRemoveConnected}
            onChange={(e) => setBgRemoveConnected(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="connected" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Connected mode
          </label>
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
