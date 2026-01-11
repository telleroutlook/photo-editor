import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { plugin as mdPlugin } from 'vite-plugin-markdown'
// Note: You may need to install this package or remove if not used

// Custom plugin to handle TypeScript worker files
function tsWorkerPlugin() {
  return {
    name: 'ts-worker-loader',
    enforce: 'pre', // Run before Vite's built-in transforms
    async transform(code, id) {
      // Only process TypeScript files in workers directory
      if (!id.includes('/workers/') || !id.endsWith('.ts')) {
        return null
      }

      console.log(`[ts-worker-plugin] Processing: ${id}`)

      // Use Vite's built-in TypeScript compiler
      const ts = await import('typescript')

      try {
        const result = ts.transpileModule(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ESNext,
            esModuleInterop: true,
            skipLibCheck: true,
            allowSyntheticDefaultImports: true,
            removeComments: false,
            preserveConstEnums: true
          }
        })

        console.log(`[ts-worker-plugin] Successfully transpiled: ${id}`)
        return {
          code: result.outputText,
          map: null // Source maps can be added later if needed
        }
      } catch (error) {
        console.error('Failed to transform TypeScript worker:', id, error)
        return null
      }
    },
    async load(id) {
      // Handle worker imports with ?worker&url suffix
      if (id.includes('/workers/') && id.endsWith('.ts?worker&url')) {
        const sourceId = id.replace('?worker&url', '')
        console.log(`[ts-worker-plugin] Loading worker with ?worker&url: ${sourceId}`)

        // Read the source file
        const fs = await import('fs')
        const code = fs.readFileSync(sourceId, 'utf-8')

        // Transform TypeScript to JavaScript
        const ts = await import('typescript')
        const result = ts.transpileModule(code, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ESNext,
            esModuleInterop: true,
            skipLibCheck: true
          }
        })

        return {
          code: result.outputText
        }
      }
      return null
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsWorkerPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          // Force .js extension for worker files
          if (name.includes('Worker') && name.endsWith('.ts')) {
            return 'assets/[name]-[hash].js'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  },
  worker: {
    format: 'es' // Use ES module format for workers
  },
  optimizeDeps: {
    exclude: ['*.wasm']
  },
  assetsInclude: ['**/*.wasm']
})
