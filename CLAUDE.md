# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Browser-based Photo Editing Tool** - A privacy-focused, client-side image processing application built with WebAssembly.

**Core Principles**:
- Zero backend costs (hosted on Cloudflare Pages)
- Privacy-first (images never leave the browser)
- No registration required
- Lightweight and fast (< 2s first paint)

**Current Status**:
- ✅ **UI Architecture Implemented** (2026-01-11) - Modern workspace layout with Holy Grail pattern
- ✅ **WASM Integration Complete** (2026-01-11) - All three modules compiled and functional
- ✅ **Deployment Configured** - Cloudflare Pages with automated deployment scripts
- ✅ **Background Removal Integrated** (2026-01-11) - UI and WASM fully connected
- ✅ **Batch Processing** - Backend ready, UI placeholder implemented
- 📚 **Documentation**: See `WASM-photo-design.md` for original specs, `UI_REDESIGN_COMPLETE.md` for recent UI changes

---

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React (modern icon library)
- **Utilities**: clsx + tailwind-merge (conditional styling)
- **State Management**: Zustand
- **Canvas Library**: Fabric.js (for cropping interactions)
- **Performance**: OffscreenCanvas for parallel processing

### WebAssembly Modules (Implemented)
All modules are compiled and integrated via Web Workers:

| Module | Actual Size | Load Timing | Purpose | Status |
|--------|------------|-------------|---------|--------|
| `core.wasm` | 55KB | On demand | Crop, rotate, flip, resize | ✅ Active |
| `compress.wasm` | 172KB | On demand | JPEG/WebP/PNG encoding | ✅ Active |
| `bgremove.wasm` | 29KB | On demand | Color removal, magic wand, GrabCut | ✅ Active |

**Total WASM size**: 256KB

### Deployment
- **Platform**: Cloudflare Pages (free tier)
- **Build**: Static SPA with lazy-loaded WASM bundles
- **Performance**: Brotli compression, CDN caching
- **Deployment**: Git integration + Wrangler CLI scripts

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

### Available Commands

```bash
# Development
npm run dev              # Start Vite dev server (http://localhost:5173)

# Build
npm run build            # TypeScript check + Vite build
npm run build:quick      # Vite build only (skip TypeScript check)
npm run preview          # Preview production build locally

# Deployment (requires CLOUDFLARE_ACCOUNT_ID)
npm run deploy           # Build and deploy to Cloudflare Pages
npm run deploy:prod      # Build and deploy to production (main branch)

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format code with Prettier
```

### WASM Development

WASM modules are written in Rust and compiled with wasm-pack:

```bash
# Compile core module
cd wasm-src/core
wasm-pack build --target web --out-dir ../../public/wasm/core

# Compile compress module
cd ../compress
wasm-pack build --target web --out-dir ../../public/wasm/compress

# Compile bgremove module
cd ../bgremove
wasm-pack build --target web --out-dir ../../public/wasm/bgremove
```

**Post-build**: Run `node scripts/fix-worker-files.js` to fix module paths.

---

## Architecture Principles

### Performance Optimization
- All WASM computations run in Web Workers (non-blocking UI)
- Preview uses downsampling (max 1280px), export uses original resolution
- Chunked processing for large images (>10MB) to avoid memory spikes
- Lazy-load WASM modules only when needed

### User Experience Design
- **Workspace Layout**: Holy Grail pattern - single-screen desktop experience (no scrolling)
  - Left sidebar (64px): Tool navigation palette
  - Center canvas (flexible): Image preview and editing area
  - Right sidebar (320px): Tool-specific controls and parameters
  - Bottom filmstrip (128px, optional): Batch file management
- **Smart defaults**: 80% quality, auto-center subject, 20% tolerance
- **Progressive complexity**: Show primary controls by default, advanced options collapsible
- **Instant feedback**: Tool switching, real-time parameter updates
- **Dark theme**: Professional zinc color palette (zinc-950/900/800) for photo editing

### Security & Privacy
- All processing happens client-side (no server upload)
- No user tracking or authentication required
- Security headers: X-Frame-Options, X-Content-Type-Options, CSP
- Optional: Cloudflare Turnstile for contact form abuse prevention

---

## File Structure (Actual)

```
photo-editor/
├── public/
│   ├── wasm/              # Compiled WASM modules
│   │   ├── core/          # Core operations (55KB)
│   │   ├── compress/      # Compression (172KB)
│   │   └── bgremove/      # Background removal (29KB)
│   └── fonts/             # Local font files (privacy-first)
├── src/
│   ├── components/
│   │   ├── upload/        # File upload, FileList, UploadZone
│   │   ├── crop/          # CropCanvas, CropControls (Fabric.js)
│   │   ├── compress/      # CompressControls
│   │   ├── rotate/        # RotateFlipControls
│   │   ├── resize/        # ResizeControls
│   │   ├── bgremove/      # BgRemoveControls, ColorRemoval, MagicWand, GrabCutTool
│   │   ├── batch/         # BatchProgress, BatchExport, FileSelection
│   │   ├── preview/       # PreviewCanvas (generic preview)
│   │   └── common/        # PasteHandler, shared components
│   ├── layouts/           # WorkspaceLayout (Holy Grail pattern)
│   ├── pages/             # CropTool, CompressTool, RotateFlipTool, ResizeTool
│   ├── workers/           # Web Workers for WASM
│   │   ├── coreWorker.ts
│   │   ├── compressWorker.ts
│   │   ├── bgremoveWorker.ts
│   │   └── batchWorker.ts
│   ├── store/             # Zustand state management
│   │   ├── appStore.ts    # Global app state
│   │   └── imageStore.ts  # Image management
│   ├── hooks/             # React hooks (useCompressWorker, useBgRemoveWorker, etc.)
│   ├── utils/             # Helper functions, WASM loader
│   ├── types/             # TypeScript definitions
│   │   ├── wasm.ts        # WASM interfaces
│   │   ├── worker.ts      # Worker message types
│   │   └── batch.ts       # Batch processing types
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── wasm-src/              # Rust WASM source code
│   ├── core/              # src/lib.rs, crop.rs, rotate.rs, resize.rs
│   ├── compress/          # src/lib.rs, jpeg.rs, webp.rs, png.rs
│   └── bgremove/          # src/lib.rs, color_threshold.rs, magic_wand.rs, grabcut.rs
├── scripts/
│   └── fix-worker-files.js # Post-build WASM path fixer
├── docs/                  # Documentation
│   ├── DEPLOYMENT.md
│   ├── WASM_INTEGRATION_COMPLETE.md
│   ├── UI_REDESIGN_COMPLETE.md
│   └── BATCH_PROCESSING_TEST_GUIDE.md
├── wrangler.toml          # Cloudflare Pages config
├── package.json           # Dependencies + deployment scripts
└── vite.config.ts         # Vite configuration
```

---

## Development Progress & Priorities

### ✅ Completed (2026-01-11)

**Infrastructure**:
- ✅ React + Vite + TypeScript setup
- ✅ Tailwind CSS + dark theme
- ✅ File upload (drag-drop, paste, multi-select)
- ✅ WorkspaceLayout with Holy Grail pattern
- ✅ Zustand state management (appStore + imageStore)

**WASM Integration**:
- ✅ All three WASM modules compiled (core/compress/bgremove)
- ✅ Web Workers setup for non-blocking processing
- ✅ Module lazy loading system

**UI Components**:
- ✅ Left sidebar tool navigation
- ✅ Right sidebar properties panel
- ✅ Bottom filmstrip for batch files
- ✅ PreviewCanvas for generic image display
- ✅ UploadZone with compact mode
- ✅ FileList with filmstrip variant

**Tools**:
- ✅ Crop tool (CropCanvas with Fabric.js)
- ✅ Rotate/Flip tool
- ✅ Resize tool
- ✅ Compress tool (JPEG/WebP/PNG)
- ✅ Background Removal tool (Color removal, Magic Wand, GrabCut)

**Deployment**:
- ✅ Cloudflare Pages configuration
- ✅ Deployment scripts in package.json
- ✅ Production environment live at https://1326d85c.photo-editor-2tz.pages.dev

### 🚧 In Progress

**Batch Processing UI**:
- ✅ Backend workers implemented
- 🚧 UI integration (placeholder currently shown)

### 📋 Upcoming

**Enhancements**:
- Before/after comparison slider
- Export optimization
- Image caching strategy
- Memory management for large files
- Browser compatibility testing

**Phase 3 Features**:
- Watermarks
- Filters
- Collage tools
- HEIC conversion

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

- **Project Status**: Active development - UI architecture established, tool integration ongoing
- **Code Style**: TypeScript strict mode, Tailwind utilities, component-based architecture
- **State Management**: Zustand stores for global state (appStore) and image management (imageStore)
- **Component Patterns**:
  - Layout components in `src/layouts/`
  - Feature pages in `src/pages/`
  - Reusable UI components in `src/components/`
  - Web Workers for heavy computations
- **Performance is critical**: All WASM operations run in Workers, preview uses downsampling
- **Privacy is the main differentiator**: Never compromise on client-side processing
- **Document changes**: Update relevant .md files when making architectural changes
