import { WasmTestSimple } from './pages/WasmTestSimple';
import { CropTool } from './pages/CropTool';
import { RotateFlipTool } from './pages/RotateFlipTool';
import { ResizeTool } from './pages/ResizeTool';
import { CompressTool } from './pages/CompressTool';
import { UploadZone } from './components/upload';
import { FileList } from './components/upload';
import { PasteHandler } from './components/upload';
import { useImageStore } from './store/imageStore';

function App() {
  const { addImages } = useImageStore();

  const handleFilesSelected = async (files: File[]) => {
    console.log('📁 Files selected:', files.map(f => f.name));
    await addImages(files);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">📷 Photo Editor</h1>
          <p className="text-sm text-gray-500 mt-1">WebAssembly-based Image Processing</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* WASM Test */}
        <WasmTestSimple />

        {/* Upload Section */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Images</h2>
          <PasteHandler onFilesSelected={handleFilesSelected} />
          <UploadZone onFilesSelected={handleFilesSelected} />
          <div className="mt-4 text-sm text-gray-500">
            💡 Tip: You can also paste images from your clipboard (Ctrl+V)
          </div>
        </section>

        {/* File List */}
        <section>
          <FileList />
        </section>

        {/* Crop Tool */}
        <section>
          <CropTool />
        </section>

        {/* Rotate & Flip Tool */}
        <section>
          <RotateFlipTool />
        </section>

        {/* Resize Tool */}
        <section>
          <ResizeTool />
        </section>

        {/* Compression Tool */}
        <section>
          <CompressTool />
        </section>
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
          <p>Privacy-first: All processing happens in your browser. Images never leave your device.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
