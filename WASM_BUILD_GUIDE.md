# WASM Build Guide

Complete guide for building WebAssembly modules for the Photo Editor project.

---

## Prerequisites

### 1. Install Rust Toolchain

**Linux/macOS:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Windows:**
- Download and run rustup-init.exe from https://rustup.rs/

**Verify Installation:**
```bash
rustc --version  # Should show rustc 1.70.0 or later
cargo --version  # Should show cargo 1.70.0 or later
```

### 2. Install wasm-pack

```bash
cargo install wasm-pack
```

**Verify Installation:**
```bash
wasm-pack --version  # Should show wasm-pack 0.11.0 or later
```

---

## Building WASM Modules

### Module 1: Core WASM (crop, rotate, flip, resize)

**Navigate to core module:**
```bash
cd wasm-src/core
```

**Build for web:**
```bash
wasm-pack build --target web --out-dir ../../public/wasm/core
```

**Expected Output:**
```
[INFO]: Checking for the WASM target...
[INFO]: Compiling to WASM...
[INFO]: Checking for Custom tools...
[INFO]: Installing wasm-bindgen...
[INFO]: Optimizing wasm binaries with wasm-opt...
[INFO]: Optional fields missing from Cargo.toml: 'edition', 'metadata'
Finished release [optimized] target(s) in XX.XXs
```

**Generated Files:**
```
public/wasm/core/
├── photo_editor_core_bg.wasm      # Main WASM binary (~150KB)
├── photo_editor_core_bg.wasm.d.ts # TypeScript bindings
├── photo_editor_core.js            # JavaScript loader
└── photo_editor_core.d.ts          # Package exports
```

**Verify Build:**
```bash
# Check WASM file size (should be < 150KB)
ls -lh ../../public/wasm/core/photo_editor_core_bg.wasm

# Check gzip size (should be < 100KB)
gzip -c ../../public/wasm/core/photo_editor_core_bg.wasm | wc -c
```

---

### Module 2: Compression WASM (quality, target size)

**Navigate to compression module:**
```bash
cd wasm-src/compress
```

**Build for web:**
```bash
wasm-pack build --target web --out-dir ../../public/wasm/compress
```

**Expected Output:**
Similar to core module build

**Generated Files:**
```
public/wasm/compress/
├── photo_editor_compress_bg.wasm      # WASM binary (~200KB)
├── photo_editor_compress_bg.wasm.d.ts # TypeScript bindings
├── photo_editor_compress.js            # JavaScript loader
└── photo_editor_compress.d.ts          # Package exports
```

---

### Module 3: Background Removal WASM

**Navigate to background removal module:**
```bash
cd wasm-src/bgremove
```

**Build for web:**
```bash
wasm-pack build --target web --out-dir ../../public/wasm/bgremove
```

**Expected Output:**
Similar to core module build

**Generated Files:**
```
public/wasm/bgremove/
├── photo_editor_bgremove_bg.wasm      # WASM binary (~300KB)
├── photo_editor_bgremove_bg.wasm.d.ts # TypeScript bindings
├── photo_editor_bgremove.js            # JavaScript loader
└── photo_editor_bgremove.d.ts          # Package exports
```

---

## Troubleshooting

### Error: "wasm-pack: command not found"

**Solution:** Install wasm-pack using cargo
```bash
cargo install wasm-pack
```

---

### Error: "error: linker `linker` not found"

**Linux Solution:**
```bash
sudo apt-get install build-essential
```

**macOS Solution:**
```bash
xcode-select --install
```

---

### Error: "failed to execute wasm-bindgen"

**Solution:** Update wasm-pack
```bash
cargo install wasm-pack --force
```

---

### Error: "WASM module too large"

**Cause:** Build is in debug mode

**Solution:** Ensure you're building in release mode (default with wasm-pack build)

**Check optimization settings in Cargo.toml:**
```toml
[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
```

---

### Error: "Cannot find module '/wasm/core.js'"

**Cause:** WASM files not in correct location

**Solution:** Ensure out-dir path is correct
```bash
# For core module
wasm-pack build --target web --out-dir ../../public/wasm/core

# Verify files exist
ls -la public/wasm/core/
```

---

### Error: "SharedArrayBuffer is not defined"

**Cause:** Browser requires COOP/COEP headers for SharedArrayBuffer

**Solution:** Ensure `.headers` file is configured in project root:
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

**Note:** On Cloudflare Pages, add these in the dashboard:
- Settings > Configuration > Headers > Create Header
- Apply to: `/*`
- Add COOP and COEP headers

---

## Testing WASM Modules

### 1. Unit Tests (Rust)

**Run tests for all modules:**
```bash
# Test core module
cd wasm-src/core
cargo test

# Test compression module
cd ../compress
cargo test

# Test bgremove module
cd ../bgremove
cargo test
```

**Expected Output:**
```
running X tests
test test::crop_image_test ... ok
test test::rotate_image_test ... ok
...
test result: ok. X passed; 0 failed
```

---

### 2. Integration Tests (JavaScript)

**Start development server:**
```bash
npm run dev
```

**Open browser console:**
```javascript
// Check if WASM loads
import init from '/wasm/core.js';
const wasm = await init();
console.log('WASM loaded:', wasm);
```

---

### 3. Performance Benchmarks

**Test with sample images:**
```javascript
// In browser console
const startTime = performance.now();
// Run WASM operation
const endTime = performance.now();
console.log(`Processing time: ${endTime - startTime}ms`);
```

**Target Metrics:**
- Core operations (crop, rotate, flip): < 1s for 10MB image
- Resize: < 5s for 10MB image
- Compression: < 10s for 10MB image

---

## Production Build

### 1. Build All WASM Modules

```bash
# Core module
cd wasm-src/core
wasm-pack build --target web --out-dir ../../public/wasm/core

# Compression module
cd ../compress
wasm-pack build --target web --out-dir ../../public/wasm/compress

# Background removal module
cd ../bgremove
wasm-pack build --target web --out-dir ../../public/wasm/bgremove
```

---

### 2. Build React Application

```bash
cd ../../
npm run build
```

**Expected Output:**
```
vite v5.4.21 building for production...
✓ 1234 modules transformed.
dist/index.html                   0.48 kB
dist/assets/index-abc123.css      12.34 kB
dist/assets/index-def456.js      456.78 kB
```

---

### 3. Preview Production Build

```bash
npm run preview
```

**Visit:** http://localhost:4173/

---

## Optimization Tips

### 1. Reduce WASM Size

**Use wasm-opt (part of binaryen):**
```bash
# Install binaryen
sudo apt-get install binaryen  # Linux
brew install binaryen           # macOS

# Optimize WASM
wasm-opt -Oz -o output.wasm input.wasm
```

---

### 2. Enable Streaming Compilation

**In your JavaScript code:**
```javascript
// Enable streaming for faster load
const response = await fetch('/wasm/core/photo_editor_core_bg.wasm');
const buffer = await WebAssembly.compileStreaming(response);
const instance = await WebAssembly.instantiate(buffer);
```

---

### 3. Lazy Load WASM Modules

**Only load when needed:**
```typescript
// Load compression module only when user clicks compress button
async function loadCompressModule() {
  if (!compressModule) {
    const init = await import('/wasm/compress/photo_editor_compress.js');
    compressModule = await init.default();
  }
  return compressModule;
}
```

---

## Deployment (Cloudflare Pages)

### 1. Deploy Application

```bash
npm run deploy
```

**Or use Wrangler directly:**
```bash
npx wrangler pages deploy dist
```

---

### 2. Configure COOP/COEP Headers

**Create `public/_headers` file:**
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

**Or configure in Cloudflare Dashboard:**
1. Go to Pages > Your Project > Settings
2. Click "Configuration" > "Headers"
3. Create header rule for `/*`
4. Add COOP and COEP headers

---

### 3. Verify Deployment

**Check your deployed site:**
```bash
curl -I https://your-project.pages.dev
```

**Look for headers:**
```
cross-origin-opener-policy: same-origin
cross-origin-embedder-policy: require-corp
```

---

## Maintenance

### Update Dependencies

**Update Rust dependencies:**
```bash
cd wasm-src/core
cargo update
```

**Update wasm-pack:**
```bash
cargo install wasm-pack --force
```

---

### Clean Build Artifacts

**Remove generated WASM files:**
```bash
rm -rf public/wasm/*/pkg
rm -rf wasm-src/*/target
```

**Rebuild all modules:**
```bash
cd wasm-src/core && wasm-pack build --target web --out-dir ../../public/wasm/core
cd ../compress && wasm-pack build --target web --out-dir ../../public/wasm/compress
cd ../bgremove && wasm-pack build --target web --out-dir ../../public/wasm/bgremove
```

---

## Checklist

Before committing changes:

- [ ] All WASM modules compiled successfully
- [ ] WASM file sizes within target (core < 150KB, compress < 200KB, bgremove < 300KB)
- [ ] TypeScript bindings generated correctly
- [ ] Unit tests pass (`cargo test`)
- [ ] Integration tests pass in browser
- [ ] Development server runs without errors
- [ ] Production build successful
- [ ] Performance benchmarks met

---

## Quick Reference

| Module | Size Target | Build Command |
|--------|-------------|---------------|
| Core | ~150KB | `wasm-pack build --target web --out-dir ../../public/wasm/core` |
| Compress | ~200KB | `wasm-pack build --target web --out-dir ../../public/wasm/compress` |
| BgRemove | ~300KB | `wasm-pack build --target web --out-dir ../../public/wasm/bgremove` |

---

**Last Updated:** 2025-01-10
**Status:** Ready for Building
