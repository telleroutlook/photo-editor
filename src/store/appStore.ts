/**
 * Application global state store
 * Manages UI state, navigation, and WASM module loading status
 */

import { create } from 'zustand';

type Feature = 'upload' | 'crop' | 'rotate' | 'resize' | 'compress' | 'bgremove' | 'batch' | 'export';

interface AppState {
  // UI State
  currentFeature: Feature;
  sidebarOpen: boolean;
  darkMode: boolean;

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
