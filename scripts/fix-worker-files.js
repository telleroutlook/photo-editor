/**
 * Post-build script to fix TypeScript Worker files
 * Converts .ts files to .js and removes TypeScript syntax
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');

console.log('🔧 Fixing TypeScript Worker files...');

// Find all .ts files in dist/assets
const assetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.log('No assets directory found');
  process.exit(0);
}

const files = fs.readdirSync(assetsDir);
const workerFiles = files.filter(file => file.includes('Worker'));

if (workerFiles.length === 0) {
  console.log('No Worker files found');
  process.exit(0);
}

console.log(`Found ${workerFiles.length} TypeScript Worker files`);

// Process each Worker file
workerFiles.forEach(file => {
  const filePath = path.join(assetsDir, file);

  console.log(`Checking: ${file}`);

  try {
    // Read file
    const code = fs.readFileSync(filePath, 'utf-8');

    // Check if it contains TypeScript syntax
    const hasTS = code.includes('import type') ||
                  code.includes(': Promise<') ||
                  code.includes(': CompressWasmApi') ||
                  /:\s*\w+\s*\|/.test(code);

    if (!hasTS) {
      console.log(`  ✓ Already clean JavaScript`);
      return;
    }

    console.log(`  ⚠️  Found TypeScript syntax, cleaning...`);

    // Remove TypeScript-specific syntax using more comprehensive regex
    let jsCode = code
      // Remove type imports
      .replace(/import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*\n?/g, '')
      // Remove type assertions (as Type)
      .replace(/\s+as\s+\w+/g, '')
      // Remove parameter type annotations
      .replace(/\(([^)]*)\):\s*Promise<\w+>/g, '($1)')
      .replace(/\(([^)]*)\):\s*\w+<[^>]+>/g, '($1)')
      .replace(/\(([^)]*)\):\s*\w+(\[\])?/g, '($1)')
      // Remove variable type annotations
      .replace(/let\s+(\w+)\s*:\s*[^=;=]+/g, 'let $1')
      .replace(/const\s+(\w+)\s*:\s*[^=;=]+/g, 'const $1')
      .replace(/:\s*\w+\s*\|/g, '|')
      // Remove function return types
      .replace(/function\s+(\w+)\([^)]*\)\s*:\s*\w+/g, 'function $1()')
      .replace(/async\s+function\s+(\w+)\([^)]*\)\s*:\s*\w+/g, 'async function $1()')
      // Clean up any resulting double spaces or odd spacing
      .replace(/  +/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Fix semicolons after removing type assertions
      .replace(/;\s*;/g, ';');

    // Write back
    fs.writeFileSync(filePath, jsCode, 'utf-8');

    console.log(`  ✅ Cleaned TypeScript syntax`);
  } catch (error) {
    console.error(`  ❌ Error processing ${file}:`, error.message);
  }
});

console.log('✨ Done! TypeScript Worker files have been fixed.');
