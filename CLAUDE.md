# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Browser-based Photo Editing Tool** - A privacy-focused, client-side image processing application built with WebAssembly.

**Core Principles**:
- Zero backend costs (hosted on Cloudflare Pages)
- Privacy-first (images never leave the browser)
- No registration required
- Lightweight and fast (< 2s first paint)

**Current Status**: Design phase - implementation has not started yet. See `WASM-photo-design.md` for complete specifications.

---

## Planned Tech Stack

### Frontend
- **Framework**: React
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Canvas Library**: Fabric.js (for cropping interactions)
- **Performance**: OffscreenCanvas for parallel processing

### WebAssembly Modules
The application will use lazy-loaded WASM modules split by function:

| Module | Size | Load Timing | Purpose |
|--------|------|-------------|---------|
| `core.wasm` | ~150KB | Initial load | Crop, rotate, flip, basic scaling |
| `compress.wasm` | ~200KB | On demand | High-quality JPEG/WebP encoding |
| `bgremove.wasm` | ~300KB | On demand | Color threshold, magic wand, GrabCut |

### Deployment
- **Platform**: Cloudflare Pages (free tier)
- **Build**: Static site with WASM bundles
- **Performance**: Brotli compression, CDN caching

---

## Core Features (by Phase)

### Phase 1: MVP
1. **Crop & Adjust**: Free-form cropping, aspect ratio presets, rotate/flip, EXIF correction
2. **Resize**: Smart mode (max dimension) or precise mode (width/height)
3. **Compression**: Quality slider or target file size, format conversion (WebP/JPEG/PNG)

### Phase 2: Differentiation
4. **Background Removal**: Three tiers (solid color, magic wand, semi-automatic GrabCut)
5. **Batch Processing**: Apply same operations to multiple images, ZIP download

### Phase 3+: Future
- Watermarks, filters, collage tools, HEIC conversion

---

## Development Workflow

**Note**: Implementation has not started. When beginning development:

1. **Initial Setup**
   ```bash
   # Create React + TypeScript project
   npm create vite@latest photo-editor -- --template react-ts
   cd photo-editor
   npm install

   # Install core dependencies
   npm install fabric zustand
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. **WASM Development**
   - WASM modules will be written in C/C++ or Rust
   - Compiled to WASM using Emscripten or wasm-pack
   - Loaded dynamically via Web Workers
   - Use SharedArrayBuffer for zero-copy transfers (requires COOP/COEP headers)

3. **Testing Strategy**
   - Unit tests for WASM functions
   - Integration tests for React components
   - Performance tests for large images (>10MB)

4. **Build Commands** (to be created)
   ```bash
   npm run dev          # Development server
   npm run build        # Production build
   npm run preview      # Preview production build
   npm run test         # Run tests
   ```

---

## Architecture Principles

### Performance Optimization
- All WASM computations run in Web Workers (non-blocking UI)
- Preview uses downsampling (max 1280px), export uses original resolution
- Chunked processing for large images (>10MB) to avoid memory spikes
- Lazy-load WASM modules only when needed

### User Experience Design
- **4-step workflow**: Upload → Function → Preview → Export
- **Smart defaults**: 80% quality, auto-center subject, 20% tolerance
- **Progressive complexity**: Show 1 primary control by default, hide advanced options
- **Instant feedback**: Update preview within 300ms of parameter changes
- **Undo support**: Ctrl+Z, reset buttons, before/after comparison

### Security & Privacy
- All processing happens client-side (no server upload)
- No user tracking or authentication required
- Security headers: X-Frame-Options, X-Content-Type-Options, CSP
- Optional: Cloudflare Turnstile for contact form abuse prevention

---

## File Structure (Planned)

```
photo-editor/
├── public/              # Static assets
│   └── wasm/           # Compiled WASM modules
├── src/
│   ├── components/     # React components
│   │   ├── upload/     # File upload (drag-drop, paste)
│   │   ├── crop/       # Cropping UI (Fabric.js)
│   │   ├── compress/   # Compression controls
│   │   └── preview/    # Before/after comparison
│   ├── workers/        # Web Workers for WASM
│   ├── store/          # Zustand state management
│   ├── utils/          # Helper functions
│   └── types.ts        # TypeScript definitions
├── wasm-src/           # WASM source code (C/C++ or Rust)
│   ├── core/           # Basic operations
│   ├── compress/       # Encoding algorithms
│   └── bgremove/       # Background removal
├── .headers            # Cloudflare Pages security headers
└── wrangler.toml       # Cloudflare configuration
```

---

## Development Priorities

### Week 1-2: Framework
- Set up React + Tailwind project
- Implement file upload (drag-drop, paste, multi-select)
- Basic preview and export flow

### Week 3-4: Core Features
- Cropping tool (Fabric.js)
- Resize + rotate/flip
- Integrate core.wasm module

### Week 5: Compression
- Quality slider
- Target file size mode
- Format conversion

### Week 6: Background Removal (Phase 1)
- Solid color removal
- Magic wand tool

### Week 7: Batch Processing
- Apply parameters to multiple images
- ZIP packaging and download

### Week 8: Optimization & Launch
- Lazy loading, caching
- Browser compatibility testing
- Deploy to Cloudflare Pages

---

## Browser Compatibility

**Requirements**:
- Modern browsers with WASM support
- SharedArrayBuffer support (requires secure context + COOP/COEP headers)
- OffscreenCanvas support for performance

**COOP/COEP Headers** (for SharedArrayBuffer):
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## Performance Targets

- **First Paint**: < 2 seconds
- **Processing Time**:
  - Crop/Resize: < 5s for 10MB image
  - Compression: < 10s for 10MB image
  - Background Removal: < 15s for simple scenarios
- **Success Rate**: > 98% processing success

---

## Reference Documentation

**Design Document**: `WASM-photo-design.md` contains complete specifications including:
- Detailed feature descriptions
- UI/UX design principles
- Technical architecture
- Competitive analysis
- Success metrics

When implementing features, reference this document for:
- User workflow requirements
- Technical constraints
- Performance expectations
- Phase prioritization

---

## Key Implementation Notes

1. **No Native Alerts**: Use custom UI for notifications
2. **Progressive Enhancement**: Core features work without JavaScript (basic fallback)
3. **Accessibility**: Keyboard navigation, ARIA labels, focus management
4. **Mobile Support**: Touch events for cropping canvas, responsive layout
5. **Error Handling**: Graceful degradation, clear error messages
6. **Testing**: Test with images up to 50MB, various formats (JPEG, PNG, WebP, HEIC)

---

## Collaboration Notes

- This is a greenfield project - establish patterns early
- Prefer simpler solutions over abstractions (YAGNI principle)
- Document any deviations from the design document
- Performance is critical - measure before optimizing
- Privacy is the main differentiator - never compromise on client-side processing
