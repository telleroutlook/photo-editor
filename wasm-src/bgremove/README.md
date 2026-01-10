# WASM Background Removal Module - Build Instructions

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
cd wasm-src/bgremove

# Build for web target
wasm-pack build --target web --out-dir ../../public/wasm/bgremove

# Output files:
# - public/wasm/bgremove/bgremove.wasm
# - public/wasm/bgremove/bgremove.js
# - public/wasm/bgremove/bgremove_bg.wasm
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

Expected size: < 300KB (gzip)

## Module Functions

The bgremove WASM module exports the following functions:

### `remove_solid_color(input, width, height, targetColor, tolerance, feather, output) → size`
Remove solid color background with tolerance-based matching and optional feathering.

### `magic_wand_select(input, width, height, seedX, seedY, tolerance, connected, maskOutput) → size`
Flood fill selection starting from seed pixel:
- If connected=true: 4-connected flood fill
- If connected=false: Global color selection

## Development vs Production

**Development**: `public/wasm/bgremove.js` is a mock implementation for frontend development.

**Production**: Replace with actual WASM by running the build command above.

## Integration

The module is automatically loaded by `src/workers/bgremoveWorker.ts`:

```typescript
const init = await import('/wasm/bgremove.js');
wasmModule = await init.default();
```

After building the actual WASM, the Worker will use the real implementation instead of the mock.
