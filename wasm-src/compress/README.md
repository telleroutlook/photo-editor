# WASM Compression Module - Build Instructions

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
cd wasm-src/compress

# Build for web target
wasm-pack build --target web --out-dir ../../public/wasm/compress

# Output files:
# - public/wasm/compress/photo_editor_compress.wasm
# - public/wasm/compress/photo_editor_compress.js
# - public/wasm/compress/photo_editor_compress_bg.wasm
```

## Optimization

The module is already configured for optimal size:

```toml
[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
panic = "abort"     # Smaller code
```

Expected size: < 200KB (gzip)

## Development vs Production

**Development**: The `public/wasm/compress/compress.js` file is a mock implementation for frontend development.

**Production**: Replace with actual WASM by running the build command above.

## Testing

After building, test the WASM module:

```bash
# Run Rust tests
cd wasm-src/compress
cargo test

# Build and check size
wasm-pack build --target web --out-dir ../../public/wasm/compress
ls -lh ../../public/wasm/compress/*.wasm
```

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
- Check that compress.js exports default init function
- Ensure Vite can serve .wasm files

## Integration

The module is automatically loaded by `src/workers/compressWorker.ts`:

```typescript
const init = await import('/wasm/compress/compress.js');
wasmModule = await init.default();
```

After building the actual WASM, the Worker will use the real implementation instead of the mock.
