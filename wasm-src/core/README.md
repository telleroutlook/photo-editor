# WASM Core Module - Build Instructions

## Prerequisites

Before building the WASM module, install the Rust toolchain and wasm-pack:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install wasm-pack
cargo install wasm-pack
```

## Building the WASM Module

From the project root:

```bash
cd wasm-src/core

# Build for web target
wasm-pack build --target web --out-dir ../../public/wasm/core

# Output files:
# - public/wasm/core/photo_editor_core.wasm
# - public/wasm/core/photo_editor_core.js
# - public/wasm/core/photo_editor_core_bg.wasm
```

## Optimization

The module is configured for optimal size:

```toml
[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
panic = "abort"     # Smaller code
```

Expected size: < 150KB (gzip)

## Module Functions

The core WASM module exports the following functions:

### `crop_image(input, width, height, cropRect, output) → size`
Crop an image to a rectangular region.

### `rotate_image(input, width, height, angle, output) → size`
Rotate image by 90°, 180°, or 270°.

### `flip_image(input, width, height, direction, output) → size`
Flip image horizontally or vertically.

### `resize_image(input, width, height, newWidth, newHeight, quality, output) → size`
Resize image with quality filter:
- Low: Nearest neighbor
- Medium: Bilinear
- High: Bicubic
- Maximum: Lanczos3

## Testing

After building, test the WASM module:

```bash
# Run Rust tests
cd wasm-src/core
cargo test

# Build and check size
wasm-pack build --target web --out-dir ../../public/wasm/core
ls -lh ../../public/wasm/core/*.wasm
```

## Development vs Production

**Development**: `public/wasm/core/core.js` is a mock implementation for frontend development.

**Production**: Replace with actual WASM by running the build command above.

## Troubleshooting

### Build fails with "image crate not found"
```bash
cargo update
cargo build
```

### WASM file too large
- Check that release profile is being used
- Verify `opt-level = "z"` in Cargo.toml
- Consider removing unused image format features

### Import errors in frontend
- Verify output directory matches import path
- Check that core.js exports default init function
- Ensure Vite can serve .wasm files

## Integration

The module is automatically loaded by `src/workers/coreWorker.ts`:

```typescript
const init = await import('/wasm/core/core.js');
wasmModule = await init.default();
```

After building the actual WASM, the Worker will use the real implementation instead of the mock.
