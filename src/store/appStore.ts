/**
 * Application global state store
 * Manages UI state, navigation, and WASM module loading status
 */

import { create } from 'zustand';

type Feature = 'upload' | 'crop' | 'rotate' | 'resize' | 'compress' | 'bgremove' | 'batch' | 'export';
type BgRemoveMethod = 'magicwand' | 'grabcut';

interface AppState {
  // UI State
  currentFeature: Feature;
  sidebarOpen: boolean;
  darkMode: boolean;

  // Background Removal State
  bgRemoveMethod: BgRemoveMethod;
  bgRemoveMagicWandActive: boolean;  // Activate magic wand selection on PreviewCanvas
  bgRemoveGrabCutActive: boolean;    // Activate grabcut rectangle drawing on PreviewCanvas
  bgRemoveGrabCutRect: { x: number; y: number; w: number; h: number } | null;
  bgRemoveSelectionMask: Uint8Array | null;  // Store selection mask for preview
  bgRemoveTolerance: number;  // Magic wand tolerance
  bgRemoveConnected: boolean;  // Magic wand connected mode
  bgRemoveIterations: number;  // GrabCut iterations
  bgRemovePreviewData: Uint8Array | null;
  bgRemovePreviewUrl: string | null;
  bgRemovePreviewWidth: number | null;  // Preview image width (scaled)
  bgRemovePreviewHeight: number | null;  // Preview image height (scaled)

  // WASM Module Loading Status
  wasmModulesLoaded: {
    core: boolean;
    compress: boolean;
    bgremove: boolean;
  };

  // Loading States
  isLoading: boolean;
  loadingMessage: string | null;

  // Error Handling
  globalError: Error | null;

  // Actions
  setCurrentFeature: (feature: Feature) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;

  // Background Removal Actions
  setBgRemoveMethod: (method: BgRemoveMethod) => void;
  setBgRemoveMagicWandActive: (active: boolean) => void;
  setBgRemoveGrabCutActive: (active: boolean) => void;
  setBgRemoveGrabCutRect: (rect: { x: number; y: number; w: number; h: number } | null) => void;
  setBgRemoveSelectionMask: (mask: Uint8Array | null) => void;
  setBgRemoveTolerance: (tolerance: number) => void;
  setBgRemoveConnected: (connected: boolean) => void;
  setBgRemoveIterations: (iterations: number) => void;
  setBgRemovePreviewData: (data: Uint8Array | null) => void;
  setBgRemovePreviewUrl: (url: string | null) => void;
  setBgRemovePreviewSize: (width: number | null, height: number | null) => void;

  // WASM Module Management
  setWasmModuleLoaded: (module: keyof AppState['wasmModulesLoaded']) => void;
  resetWasmModules: () => void;

  // Loading State Management
  setLoading: (loading: boolean, message?: string | null) => void;

  // Error Handling
  setGlobalError: (error: Error | null) => void;
  clearGlobalError: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentFeature: 'upload',
  sidebarOpen: true,
  darkMode: true, // Dark mode by default for photo editing

  // Background Removal State
  bgRemoveMethod: 'magicwand',
  bgRemoveMagicWandActive: false,
  bgRemoveGrabCutActive: false,
  bgRemoveGrabCutRect: null,
  bgRemoveSelectionMask: null,
  bgRemoveTolerance: 15,
  bgRemoveConnected: true,
  bgRemoveIterations: 5,
  bgRemovePreviewData: null,
  bgRemovePreviewUrl: null,
  bgRemovePreviewWidth: null,
  bgRemovePreviewHeight: null,

  wasmModulesLoaded: {
    core: false,
    compress: false,
    bgremove: false,
  },

  isLoading: false,
  loadingMessage: null,
  globalError: null,

  /**
   * Set the current active feature
   */
  setCurrentFeature: (feature: Feature) => {
    set({ currentFeature: feature });
  },

  /**
   * Toggle sidebar open/closed
   */
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  /**
   * Set sidebar state explicitly
   */
  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },

  /**
   * Toggle dark mode
   */
  toggleDarkMode: () => {
    set((state) => {
      const newDarkMode = !state.darkMode;
      // Apply dark mode class to document
      if (typeof document !== 'undefined') {
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return { darkMode: newDarkMode };
    });
  },

  /**
   * Set dark mode explicitly
   */
  setDarkMode: (dark: boolean) => {
    set(() => {
      // Apply dark mode class to document
      if (typeof document !== 'undefined') {
        if (dark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return { darkMode: dark };
    });
  },

  /**
   * Background Removal - Set method
   */
  setBgRemoveMethod: (method: BgRemoveMethod) => {
    set({ bgRemoveMethod: method });
  },

  /**
   * Background Removal - Set magic wand active state
   */
  setBgRemoveMagicWandActive: (active: boolean) => {
    set({ bgRemoveMagicWandActive: active });
  },

  /**
   * Background Removal - Set grabcut active state
   */
  setBgRemoveGrabCutActive: (active: boolean) => {
    set({ bgRemoveGrabCutActive: active });
  },

  /**
   * Background Removal - Set grabcut rectangle
   */
  setBgRemoveGrabCutRect: (rect: { x: number; y: number; w: number; h: number } | null) => {
    set({ bgRemoveGrabCutRect: rect });
  },

  /**
   * Background Removal - Set selection mask
   */
  setBgRemoveSelectionMask: (mask: Uint8Array | null) => {
    set({ bgRemoveSelectionMask: mask });
  },

  /**
   * Background Removal - Set tolerance
   */
  setBgRemoveTolerance: (tolerance: number) => {
    set({ bgRemoveTolerance: tolerance });
  },

  /**
   * Background Removal - Set connected mode
   */
  setBgRemoveConnected: (connected: boolean) => {
    set({ bgRemoveConnected: connected });
  },

  /**
   * Background Removal - Set iterations
   */
  setBgRemoveIterations: (iterations: number) => {
    set({ bgRemoveIterations: iterations });
  },

  /**
   * Background Removal - Set preview image data
   */
  setBgRemovePreviewData: (data: Uint8Array | null) => {
    set({ bgRemovePreviewData: data });
  },

  /**
   * Set the preview URL for background removal
   */
  setBgRemovePreviewUrl: (url: string | null) => {
    set({ bgRemovePreviewUrl: url });
  },

  /**
   * Set the preview dimensions for background removal
   */
  setBgRemovePreviewSize: (width: number | null, height: number | null) => {
    set({ bgRemovePreviewWidth: width, bgRemovePreviewHeight: height });
  },

  /**
   * Mark a WASM module as loaded
   */
  setWasmModuleLoaded: (module: keyof AppState['wasmModulesLoaded']) => {
    set((state) => ({
      wasmModulesLoaded: {
        ...state.wasmModulesLoaded,
        [module]: true,
      },
    }));
  },

  /**
   * Reset all WASM module loading status
   */
  resetWasmModules: () => {
    set({
      wasmModulesLoaded: {
        core: false,
        compress: false,
        bgremove: false,
      },
    });
  },

  /**
   * Set global loading state
   */
  setLoading: (loading: boolean, message: string | null = null) => {
    set({ isLoading: loading, loadingMessage: message });
  },

  /**
   * Set a global error
   */
  setGlobalError: (error: Error | null) => {
    set({ globalError: error });
  },

  /**
   * Clear global error
   */
  clearGlobalError: () => {
    set({ globalError: null });
  },
}));
