/**
 * WorkspaceLayout - Holy Grail single-screen layout
 * Inspired by Photoshop but more user-friendly
 *
 * Layout structure:
 * - Top: Minimal header (12px height)
 * - Left: Tool navigation sidebar (64px width, icon-only)
 * - Center: Main canvas area (flexible)
 * - Right: Properties panel (320px width, context-aware controls)
 * - Bottom: Optional filmstrip for batch files
 */

import React from 'react';
import { useAppStore } from '../store/appStore';
import { useImageStore } from '../store/imageStore';
import {
  Crop,
  RotateCcw,
  Maximize2,
  FileOutput,
  Upload,
  Eraser,
  Layers,
  Moon,
  Sun,
  Undo,
  Redo,
  Download
} from 'lucide-react';

interface WorkspaceLayoutProps {
  children: React.ReactNode; // The Canvas
  propertiesPanel: React.ReactNode; // The Right Sidebar content
  bottomPanel?: React.ReactNode; // The File List (optional)
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  propertiesPanel,
  bottomPanel
}) => {
  const { currentFeature, setCurrentFeature, darkMode, toggleDarkMode } = useAppStore();
  const { getSelectedImage, undo, redo, canUndo, canRedo } = useImageStore();
  const selectedImage = getSelectedImage();

  const navItems = [
    { id: 'upload', icon: Upload, label: 'Upload' },
    { id: 'crop', icon: Crop, label: 'Crop' },
    { id: 'rotate', icon: RotateCcw, label: 'Rotate' },
    { id: 'resize', icon: Maximize2, label: 'Resize' },
    { id: 'compress', icon: FileOutput, label: 'Compress' },
    { id: 'bgremove', icon: Eraser, label: 'Remove BG' },
    { id: 'batch', icon: Layers, label: 'Batch' },
  ];

  const handleUndo = () => selectedImage && undo(selectedImage.id);
  const handleRedo = () => selectedImage && redo(selectedImage.id);
  const handleDownload = () => {
    if (!selectedImage) return;
    const a = document.createElement('a');
    a.href = selectedImage.url;
    a.download = selectedImage.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasUndo = selectedImage ? canUndo(selectedImage.id) : false;
  const hasRedo = selectedImage ? canRedo(selectedImage.id) : false;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Header - Minimal */}
      <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl">📷</span>
          <span className="font-bold text-sm tracking-wide">PHOTO EDITOR</span>
          <span className="text-xs text-zinc-500 hidden sm:inline">Privacy-first • Client-side Processing</span>
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={!hasUndo}
            className={`p-1.5 rounded transition-colors ${hasUndo ? 'hover:bg-zinc-700 text-zinc-200' : 'text-zinc-700 cursor-not-allowed'}`}
            title="Undo"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!hasRedo}
            className={`p-1.5 rounded transition-colors ${hasRedo ? 'hover:bg-zinc-700 text-zinc-200' : 'text-zinc-700 cursor-not-allowed'}`}
            title="Redo"
          >
            <Redo size={16} />
          </button>
          <div className="w-px h-4 bg-zinc-700 mx-2" />
          <button
            onClick={handleDownload}
            disabled={!selectedImage}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${selectedImage ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
          >
            <Download size={14} />
            Download
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Navigation */}
        <nav className="w-16 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-900 gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentFeature(item.id as 'upload' | 'crop' | 'rotate' | 'resize' | 'compress' | 'bgremove' | 'batch')}
              className={`p-3 rounded-xl transition-all group relative ${
                currentFeature === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
              title={item.label}
            >
              <item.icon size={20} />

              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* CENTER - Canvas Area */}
        <main className="flex-1 bg-zinc-950 relative overflow-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8 relative">
            {/* Subtle grid pattern background */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* Main Canvas Content */}
            <div className="relative z-10 max-w-full max-h-full">
              {children}
            </div>
          </div>

          {/* BOTTOM - Filmstrip (if provided) */}
          {bottomPanel && (
            <div className="h-32 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
              {bottomPanel}
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR - Properties */}
        <aside className="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">
              {currentFeature === 'bgremove' ? 'Background Removal' :
               currentFeature === 'batch' ? 'Batch Processing' :
               currentFeature}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
            {propertiesPanel}
          </div>
        </aside>
      </div>
    </div>
  );
};
