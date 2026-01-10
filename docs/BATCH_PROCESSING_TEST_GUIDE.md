# Batch Processing - End-to-End Testing Guide

This document provides comprehensive testing procedures for the Week 7 batch processing functionality.

## Test Environment Setup

### Prerequisites
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build WASM modules (if available)
cd wasm-src/core && wasm-pack build --target web --out-dir ../../public/wasm/core
cd ../compress && wasm-pack build --target web --out-dir ../../public/wasm/compress
cd ../..
```

### Browser Requirements
- Modern browser with WASM support (Chrome 90+, Firefox 88+, Safari 14+)
- SharedArrayBuffer support (requires secure context + COOP/COEP headers)
- Open DevTools for monitoring

## Test Scenarios

### Scenario 1: Basic Batch Crop

**Preconditions:**
1. Navigate to http://localhost:5173
2. Upload at least 3 test images (different formats: JPEG, PNG, WebP)
3. Navigate to batch processing feature

**Steps:**
1. **Select Images**
   - Click individual images to select (should show blue border + checkmark)
   - Verify "Select Images (X / Y)" counter updates
   - Click "Select All" checkbox - all images should be selected
   - Click "Deselect All" - all selections should clear
   - Select 2 images manually

2. **Configure Batch Operation**
   - Set operation type to "crop"
   - Configure crop rectangle (e.g., center 80% of image)
   - Verify batch operation info shows "2 images selected for processing"

3. **Start Batch Processing**
   - Click "Start Batch Processing (2 images)" button
   - **Expected:**
     - Button changes to "Cancel Processing"
     - Progress bar appears with 0%
     - Status shows "0/2 completed"

4. **Monitor Progress**
   - **Expected during processing:**
     - Progress bar updates incrementally (0% → 50% → 100%)
     - Status updates: "1 processing", then "1 completed"
     - Per-image list shows processing spinner
     - Processing items show animated progress indicator

5. **Completion**
   - **Expected when complete:**
     - Progress bar shows 100%
     - Green completion message: "Batch processing complete! 2 of 2 images succeeded"
     - Export settings panel appears
     - "Download ZIP (2 / 2)" button enabled

**Success Criteria:**
- ✅ All images processed successfully
- ✅ Progress tracking accurate
- ✅ No errors in console
- ✅ Export button enabled

### Scenario 2: Batch Compression with Target Size

**Preconditions:**
- Upload 5 images (mix of large files > 5MB)

**Steps:**
1. Select all 5 images
2. Set operation to "compress"
3. Configure compression parameters:
   - Quality: 80
   - Target size: 500KB per image
   - Format: JPEG
4. Start processing
5. Monitor progress (may take 10-30 seconds for large files)

**Expected:**
- Binary search algorithm converges for each image
- Each image individually compressed to ≤500KB
- Final results show compressed file sizes
- Progress bar updates smoothly

**Verify:**
- ✅ All compressed files ≤ 500KB
- ✅ Image quality acceptable (visual inspection)
- ✅ Processing time < 60s total

### Scenario 3: Batch Resize

**Preconditions:**
- Upload images of varying dimensions

**Steps:**
1. Select 3 images (e.g., 1920×1080, 1280×720, 800×600)
2. Set operation to "resize"
3. Configure resize parameters:
   - Mode: "Smart mode (max dimension)"
   - Max dimension: 1920px
4. Start processing

**Expected:**
- 1920×1080 → unchanged (already at max)
- 1280×720 → scaled up to 1920×1080 (maintains aspect ratio)
- 800×600 → scaled up to 1920×1440

**Verify:**
- ✅ Output dimensions correct
- ✅ Aspect ratios preserved
- ✅ Image quality acceptable

### Scenario 4: Error Handling

**Test A: Invalid Operation**
1. Select images
2. Start processing with invalid parameters
3. **Expected:** Error message displayed, processing halted

**Test B: Cancellation**
1. Start processing 5+ images
2. Click "Cancel Processing" during operation
3. **Expected:**
   - Current job completes
   - Remaining jobs cancelled
   - Status reset to 0/0
   - Can start new batch

**Test C: Memory Stress Test**
1. Upload 10 images (5MB+ each)
2. Select all
3. Start batch processing
4. **Expected:**
   - Concurrency limited to 3 parallel jobs
   - No browser crash
   - Memory usage stable (< 2GB)
   - All images processed successfully

### Scenario 5: ZIP Export

**Preconditions:**
- Complete batch processing successfully

**Test A: Basic Export**
1. Use default settings:
   - ZIP filename: "processed_images.zip"
   - Compression level: 6
   - Include original: unchecked
2. Click "Download ZIP"
3. **Expected:**
   - ZIP file downloads
   - Contains only processed images
   - File size reasonable

**Test B: Export with Originals**
1. Check "Include original images in ZIP"
2. Adjust compression level to 9 (maximum)
3. Click "Download ZIP"
4. **Expected:**
   - ZIP contains both processed and original files
   - Originals prefixed with "original_"
   - File size larger than Test A

**Test C: Custom Filename**
1. Set ZIP filename to "my_batch_export_2025-01-10.zip"
2. Download ZIP
3. **Expected:** Downloaded file matches custom name

**Verify ZIP Contents:**
```bash
# Unzip and verify
unzip -l processed_images.zip

# Expected output:
# Archive: processed_images.zip
# Length    Date    Time    Name
# -------- ----    ----    ----
#  102400 01-10-25 12:00   test1.jpg
#  204800 01-10-25 12:00   test2.png
#  153600 01-10-25 12:00   test3.jpg
# --------                   -------
#  460800                   3 files
```

### Scenario 6: Multiple Batch Operations

**Preconditions:**
- Upload 10 images

**Steps:**
1. **Batch 1: Crop**
   - Select all 10 images
   - Crop to 80% center
   - Process and verify results

2. **Batch 2: Compress Results**
   - Keep same selection
   - Compress to quality 70
   - Process and verify

3. **Batch 3: Resize**
   - Resize to max 1280px
   - Process and verify

4. **Final Export**
   - Export all with originals included
   - Verify ZIP contains all iterations

**Expected:**
- ✅ Sequential operations work correctly
- ✅ Results accumulate properly
- ✅ Memory usage remains stable
- ✅ No performance degradation

## Performance Benchmarks

### Target Metrics
| Operation | Image Size | Count | Target Time | Memory |
|-----------|-----------|-------|------------|--------|
| Crop | 5MB | 5 | < 10s | < 500MB |
| Resize | 5MB | 5 | < 15s | < 750MB |
| Compress | 5MB | 5 | < 30s | < 1GB |
| ZIP Export | N/A | 20 | < 5s | < 200MB |

### Measurement Tools
```javascript
// Browser console
performance.now()

// Memory usage (Chrome)
performance.memory.usedJSHeapSize

// Network timing (DevTools Network tab)
```

## Regression Testing Checklist

### Before Each Test
- [ ] Clear browser cache
- [ ] Reset application state (refresh page)
- [ ] Close unnecessary tabs
- [ ] Open DevTools console

### During Testing
- [ ] Monitor console for errors
- [ ] Check memory usage in DevTools
- [ ] Verify network requests (no unexpected calls)
- [ ] Test responsive design (mobile viewport)

### After Each Test
- [ ] Document any issues found
- [ ] Capture screenshots of UI states
- [ ] Record performance metrics
- [ ] Clean up test files

## Known Limitations

1. **WASM Dependencies**
   - Tests assume WASM modules are compiled
   - Mock WASM may be needed for unit tests
   - Integration tests require real WASM

2. **Browser Compatibility**
   - SharedArrayBuffer requires HTTPS + COOP/COEP headers
   - Fallback to postMessage mode if not available
   - Safari has stricter memory limits

3. **File Size Limits**
   - Recommended: < 50MB per image
   - Maximum tested: 100MB (may timeout)
   - ZIP export: < 2GB total archive size

## Troubleshooting

### Issue: Worker Not Loading
**Symptoms:** Console error "Failed to load worker"

**Solutions:**
1. Check worker file path in import
2. Verify Vite dev server running
3. Clear browser cache
4. Check for CORS errors

### Issue: Out of Memory
**Symptoms:** Browser crash or tab freeze

**Solutions:**
1. Reduce concurrent jobs (maxConcurrent: 1)
2. Process smaller batches (3-5 images)
3. Close other browser tabs
4. Use smaller test images

### Issue: ZIP Download Fails
**Symptoms:** Click download, nothing happens

**Solutions:**
1. Check JSZip is installed
2. Verify browser supports Blob API
3. Check for popup blocker
4. Inspect console for JSZip errors

### Issue: Progress Bar Stuck
**Symptoms:** Progress bar stops updating

**Solutions:**
1. Check if worker crashed (console errors)
2. Verify onProgress callback working
3. Try cancelling and restarting
4. Reload page and retry

## Test Data Requirements

### Sample Images
| Image | Size | Format | Dimensions |
|-------|------|--------|------------|
| small.jpg | 500KB | JPEG | 800×600 |
| medium.png | 2MB | PNG | 1920×1080 |
| large.webp | 8MB | WebP | 3840×2160 |
| huge.jpg | 20MB | JPEG | 7680×4320 |
| transparent.png | 1MB | PNG | 1280×720 (with alpha) |

### Test Cases Coverage
- ✅ Multiple formats (JPEG, PNG, WebP)
- ✅ Various dimensions (800×600 to 4K)
- ✅ Different file sizes (500KB to 20MB)
- ✅ Transparent PNGs (alpha channel)
- ✅ Large batch (10+ images)
- ✅ Mixed selection (partial selection)

## Sign-off Criteria

All tests must pass:
- [ ] All 6 scenarios completed successfully
- [ ] Performance benchmarks met
- [ ] No console errors
- [ ] ZIP export verified for each test
- [ ] Mobile responsive design tested
- [ ] Accessibility verified (keyboard navigation)

## Test Report Template

```
Date: [YYYY-MM-DD]
Tester: [Name]
Browser: [Chrome 121.0 / Firefox 122.0 / Safari 17.2]
OS: [Windows 11 / macOS 14 / Ubuntu 22.04]

Scenario Results:
- Scenario 1 (Basic Crop): ✅ PASS / ❌ FAIL
- Scenario 2 (Compression): ✅ PASS / ❌ FAIL
- Scenario 3 (Resize): ✅ PASS / ❌ FAIL
- Scenario 4 (Error Handling): ✅ PASS / ❌ FAIL
- Scenario 5 (ZIP Export): ✅ PASS / ❌ FAIL
- Scenario 6 (Multiple Batches): ✅ PASS / ❌ FAIL

Performance Metrics:
- Crop (5 images): [X]s, [X]MB memory
- Compress (5 images): [X]s, [X]MB memory
- Resize (5 images): [X]s, [X]MB memory
- ZIP Export (20 images): [X]s

Issues Found:
[List any bugs or unexpected behavior]

Overall Status: ✅ PASS / ❌ FAIL
```

---

**Last Updated:** 2025-01-10
**Week:** 7 (Batch Processing & ZIP Export)
**Status:** Ready for Testing
