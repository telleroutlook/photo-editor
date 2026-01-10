import { useState } from 'react';

/**
 * Simple WASM Module Test Page
 * Tests loading and calling WASM functions directly
 */
export const WasmTestSimple = () => {
  const [status, setStatus] = useState<{
    core: 'idle' | 'loading' | 'success' | 'error';
    compress: 'idle' | 'loading' | 'success' | 'error';
    bgremove: 'idle' | 'loading' | 'success' | 'error';
  }>({
    core: 'idle',
    compress: 'idle',
    bgremove: 'idle',
  });

  const [results, setResults] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadModule = async (module: 'core' | 'compress' | 'bgremove') => {
    setStatus((prev) => ({ ...prev, [module]: 'loading' }));

    try {
      console.log(`🔄 Loading ${module} WASM module...`);

      const wasmUrl = `/wasm/${module}/${module === 'bgremove' ? 'photo_editor_compress' : `photo_editor_${module}`}.js`;
      const wasmModule = await import(wasmUrl);

      console.log(`✅ ${module} WASM module loaded:`, Object.keys(wasmModule));

      setResults((prev) => ({
        ...prev,
        [module]: {
          functions: Object.keys(wasmModule),
          loaded: true,
        },
      }));

      setStatus((prev) => ({ ...prev, [module]: 'success' }));
    } catch (error) {
      console.error(`❌ Failed to load ${module} WASM:`, error);
      setResults((prev) => ({
        ...prev,
        [module]: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
      setStatus((prev) => ({ ...prev, [module]: 'error' }));
    }
  };

  const testCompressFunction = async () => {
    setTestResult('Testing...');

    try {
      // Load compress module
      const wasmUrl = '/wasm/compress/photo_editor_compress.js';
      const wasmModule = await import(wasmUrl);

      // Initialize WASM
      await wasmModule.default();

      // Test JPEG compression
      const width = 2;
      const height = 2;
      const input = new Uint8Array([
        255, 0, 0, 255,  // Red pixel
        0, 255, 0, 255,  // Green pixel
        0, 0, 255, 255,  // Blue pixel
        255, 255, 0, 255, // Yellow pixel
      ]);

      const output = new Uint8Array(input.length);

      const compressedSize = wasmModule.compress_jpeg(input, width, height, 80, output);

      setTestResult(`✅ Success! Compressed ${input.length} bytes → ${compressedSize} bytes`);

      console.log('Compressed data:', output.slice(0, compressedSize));
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Test failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">🧪 WASM Module Integration Test</h1>

        {/* Module Loading Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Module Loading</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Core Module */}
            <div className={`p-4 rounded-lg border-2 ${
              status.core === 'success' ? 'border-green-500 bg-green-50' :
              status.core === 'error' ? 'border-red-500 bg-red-50' :
              status.core === 'loading' ? 'border-blue-500 bg-blue-50' :
              'border-gray-300'
            }`}>
              <h3 className="font-semibold text-gray-700 mb-2">Core Module</h3>
              <p className="text-sm text-gray-600 mb-2">crop, rotate, flip, resize</p>
              <p className="text-sm text-gray-600 mb-3">Expected: ~55KB</p>
              <button
                onClick={() => loadModule('core')}
                disabled={status.core === 'loading'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {status.core === 'loading' ? 'Loading...' : 'Load Core'}
              </button>
              {results.core && (
                <div className="mt-3 text-xs">
                  {results.core.error ? (
                    <p className="text-red-600">{results.core.error}</p>
                  ) : (
                    <p className="text-green-600">✅ {results.core.functions?.length} functions</p>
                  )}
                </div>
              )}
            </div>

            {/* Compress Module */}
            <div className={`p-4 rounded-lg border-2 ${
              status.compress === 'success' ? 'border-green-500 bg-green-50' :
              status.compress === 'error' ? 'border-red-500 bg-red-50' :
              status.compress === 'loading' ? 'border-blue-500 bg-blue-50' :
              'border-gray-300'
            }`}>
              <h3 className="font-semibold text-gray-700 mb-2">Compress Module</h3>
              <p className="text-sm text-gray-600 mb-2">JPEG, WebP compression</p>
              <p className="text-sm text-gray-600 mb-3">Expected: ~38KB</p>
              <button
                onClick={() => loadModule('compress')}
                disabled={status.compress === 'loading'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {status.compress === 'loading' ? 'Loading...' : 'Load Compress'}
              </button>
              {results.compress && (
                <div className="mt-3 text-xs">
                  {results.compress.error ? (
                    <p className="text-red-600">{results.compress.error}</p>
                  ) : (
                    <p className="text-green-600">✅ {results.compress.functions?.length} functions</p>
                  )}
                </div>
              )}
            </div>

            {/* BgRemove Module */}
            <div className={`p-4 rounded-lg border-2 ${
              status.bgremove === 'success' ? 'border-green-500 bg-green-50' :
              status.bgremove === 'error' ? 'border-red-500 bg-red-50' :
              status.bgremove === 'loading' ? 'border-blue-500 bg-blue-50' :
              'border-gray-300'
            }`}>
              <h3 className="font-semibold text-gray-700 mb-2">BgRemove Module</h3>
              <p className="text-sm text-gray-600 mb-2">Solid color, magic wand, GrabCut</p>
              <p className="text-sm text-gray-600 mb-3">Expected: ~38KB</p>
              <button
                onClick={() => loadModule('bgremove')}
                disabled={status.bgremove === 'loading'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {status.bgremove === 'loading' ? 'Loading...' : 'Load BgRemove'}
              </button>
              {results.bgremove && (
                <div className="mt-3 text-xs">
                  {results.bgremove.error ? (
                    <p className="text-red-600">{results.bgremove.error}</p>
                  ) : (
                    <p className="text-green-600">✅ {results.bgremove.functions?.length} functions</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Load All Button */}
          <button
            onClick={() => {
              loadModule('core');
              loadModule('compress');
              loadModule('bgremove');
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            🚀 Load All Modules
          </button>
        </div>

        {/* Function Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Function Test</h2>
          <p className="text-gray-600 mb-4">
            Test compressing a 2x2 red-green-blue-yellow image to JPEG format
          </p>
          <button
            onClick={testCompressFunction}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
          >
            🧪 Run Compression Test
          </button>
          {testResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              testResult.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {testResult}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Module Details</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Core Module:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/wasm/core/photo_editor_core.js</code></p>
            <p><strong>Compress Module:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/wasm/compress/photo_editor_compress.js</code></p>
            <p><strong>BgRemove Module:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/wasm/bgremove/photo_editor_compress.js</code></p>
          </div>

          {Object.keys(results).length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Loaded Functions</h3>
              <div className="space-y-2">
                {Object.entries(results).map(([module, data]: [string, any]) => (
                  <div key={module} className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-700 capitalize">{module}</p>
                    {data.functions && (
                      <ul className="text-xs text-gray-600 mt-1 grid grid-cols-2 gap-1">
                        {data.functions.map((fn: string) => (
                          <li key={fn} className="font-mono">{fn}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
