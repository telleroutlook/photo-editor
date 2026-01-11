import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { useImageStore } from './store/imageStore';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { FileList } from './components/upload/FileList';
import { UploadZone } from './components/upload/UploadZone';
import { PasteHandler } from './components/upload/PasteHandler';

// Canvas Views
import { PreviewCanvas } from './components/preview/PreviewCanvas';

function App() {
  const { currentFeature, setDarkMode } = useAppStore();
  const { addImages, getSelectedImage } = useImageStore();

  const currentImage = getSelectedImage();

  // Initialize dark mode on mount
  useEffect(() => {
    setDarkMode(true);
  }, [setDarkMode]);

  const handleFilesSelected = async (files: File[]) => {
    console.log('📁 Files selected:', files.map(f => f.name));
    await addImages(files);
  };

  // Render controls for the right sidebar based on current feature
  const renderControls = () => {
    switch (currentFeature) {
      case 'upload':
        return (
          <div className="space-y-4">
            <div className="text-sm text-zinc-400 mb-4">
              <p className="mb-2">Upload images to get started:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Drag & drop files onto the canvas</li>
                <li>Click the button below</li>
                <li>Paste from clipboard (Ctrl+V)</li>
              </ul>
            </div>
            <UploadZone onFilesSelected={handleFilesSelected} compact />
            <div className="mt-4 text-xs text-zinc-500 bg-zinc-800/50 p-3 rounded-lg border border-zinc-700">
              <p className="font-semibold mb-1">Privacy First</p>
              <p>All processing happens in your browser. Images never leave your device.</p>
            </div>
          </div>
        );

      case 'crop':
        return currentImage ? (
          <div className="text-sm text-zinc-400">
            <p className="mb-2">Crop Tool</p>
            <p className="text-xs">Cropping controls will appear here.</p>
            <p className="text-xs mt-2 text-zinc-500">Component refactoring in progress...</p>
          </div>
        ) : (
          <div className="text-sm text-zinc-400">
            <p>No image selected.</p>
            <p className="mt-2 text-xs">Upload an image or select from the filmstrip below.</p>
          </div>
        );

      case 'rotate':
        return currentImage ? (
          <div className="text-sm text-zinc-400">
            <p className="mb-2">Rotate & Flip Tool</p>
            <p className="text-xs">Rotation controls will appear here.</p>
            <p className="text-xs mt-2 text-zinc-500">Component refactoring in progress...</p>
          </div>
        ) : (
          <div className="text-sm text-zinc-400">
            <p>No image selected.</p>
            <p className="mt-2 text-xs">Upload an image or select from the filmstrip below.</p>
          </div>
        );

      case 'resize':
        return currentImage ? (
          <div className="text-sm text-zinc-400">
            <p className="mb-2">Resize Tool</p>
            <p className="text-xs">Resize controls will appear here.</p>
            <p className="text-xs mt-2 text-zinc-500">Component refactoring in progress...</p>
          </div>
        ) : (
          <div className="text-sm text-zinc-400">
            <p>No image selected.</p>
            <p className="mt-2 text-xs">Upload an image or select from the filmstrip below.</p>
          </div>
        );

      case 'compress':
        return currentImage ? (
          <div className="text-sm text-zinc-400">
            <p className="mb-2">Compress Tool</p>
            <p className="text-xs">Compression controls will appear here.</p>
            <p className="text-xs mt-2 text-zinc-500">Component refactoring in progress...</p>
          </div>
        ) : (
          <div className="text-sm text-zinc-400">
            <p>No image selected.</p>
            <p className="mt-2 text-xs">Upload an image or select from the filmstrip below.</p>
          </div>
        );

      case 'bgremove':
        return (
          <div className="text-sm text-zinc-400">
            <p>Background removal coming soon!</p>
            <p className="mt-2 text-xs">This feature is currently in development.</p>
          </div>
        );

      default:
        return (
          <div className="text-sm text-zinc-400">
            Select a tool from the sidebar
          </div>
        );
    }
  };

  // Render canvas in the center based on current feature
  const renderCanvas = () => {
    // If no image is loaded, show the upload zone
    if (!currentImage) {
      return (
        <div className="flex flex-col items-center justify-center gap-6 w-full max-w-2xl">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-zinc-200 mb-2">Welcome to Photo Editor</h2>
            <p className="text-zinc-400">Get started by uploading an image</p>
          </div>
          <UploadZone onFilesSelected={handleFilesSelected} />
          <div className="text-xs text-zinc-500 text-center max-w-md">
            <p className="mb-2">💡 <strong>Privacy First:</strong> All processing happens in your browser</p>
            <p>Supported formats: JPEG, PNG, WebP, GIF • Max size: 50MB</p>
          </div>
        </div>
      );
    }

    // Feature-specific canvas rendering
    switch (currentFeature) {
      case 'crop':
        // Temporarily disabled while refactoring
        return <PreviewCanvas />;

      default:
        return <PreviewCanvas />;
    }
  };

  return (
    <>
      <PasteHandler onFilesSelected={handleFilesSelected} />
      <WorkspaceLayout
        propertiesPanel={renderControls()}
        bottomPanel={<FileList variant="filmstrip" />}
      >
        {renderCanvas()}
      </WorkspaceLayout>
    </>
  );
}

export default App;
