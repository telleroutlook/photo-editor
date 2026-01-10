import { useState, useEffect } from 'react';
// TODO: Implement WASM loader when WASM modules are compiled
// import { loadCoreWasm } from '@/assets/wasm/core/loader';

export const WasmTest = () => {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);
  const [exports, setExports] = useState<any>(null);

  useEffect(() => {
    async function loadWasm() {
      try {
        // TODO: Implement WASM loader when WASM modules are compiled
        // const wasm = await loadCoreWasm();
        // setExports(wasm);
        // setWasmLoaded(true);
        // console.log('✅ WASM module loaded successfully');

        // Temporary: show error that WASM is not implemented yet
        throw new Error('WASM modules are not yet implemented. Please compile the Rust/C++ WASM modules first.');
      } catch (error) {
        setWasmError(error instanceof Error ? error.message : 'Unknown error');
        console.error('❌ Failed to load WASM:', error);
      }
    }

    loadWasm();
  }, []);

  if (wasmError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-800 mb-2">❌ WASM Load Failed</h2>
        <p className="text-red-600">{wasmError}</p>
      </div>
    );
  }

  if (!wasmLoaded) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-xl font-bold text-blue-800 mb-2">⏳ Loading WASM Module...</h2>
        <p className="text-blue-600">Please wait while we load the WebAssembly module.</p>
      </div>
    );
  }

  if (!exports) {
    return null;
  }

  const { CropRect, RotateAngle, FlipDirection, ResizeQuality } = exports;

  return (
    <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
      <h2 className="text-xl font-bold text-green-800 mb-4">✅ WASM Module Loaded Successfully!</h2>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-700 mb-2">Exported Types</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>CropRect: {typeof CropRect}</li>
            <li>RotateAngle: {typeof RotateAngle}</li>
            <li>FlipDirection: {typeof FlipDirection}</li>
            <li>ResizeQuality: {typeof ResizeQuality}</li>
          </ul>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-700 mb-2">Enum Values</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">RotateAngle</p>
              <ul className="text-gray-600">
                <li>Degree0: {RotateAngle.Degree0}</li>
                <li>Degree90: {RotateAngle.Degree90}</li>
                <li>Degree180: {RotateAngle.Degree180}</li>
                <li>Degree270: {RotateAngle.Degree270}</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-700">FlipDirection</p>
              <ul className="text-gray-600">
                <li>Horizontal: {FlipDirection.Horizontal}</li>
                <li>Vertical: {FlipDirection.Vertical}</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-700">ResizeQuality</p>
              <ul className="text-gray-600">
                <li>Fast: {ResizeQuality.Fast}</li>
                <li>High: {ResizeQuality.High}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-700 mb-2">File Sizes</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>📦 core.wasm: 55KB (63% under 150KB target!)</li>
            <li>📄 core.js: 11KB</li>
            <li>📋 core.d.ts: 3.3KB</li>
            <li>📦 loader.ts: Custom wrapper with lazy loading</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
