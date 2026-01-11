use wasm_bindgen::prelude::*;

mod jpeg;
mod webp;
mod png;
mod binary_search;

// Export compression result struct
#[wasm_bindgen]
pub struct CompressionResult {
    pub size: usize,
    pub quality: u8,
}

// Compression format enum
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum CompressionFormat {
    Jpeg,
    WebP,
    Png,
}

/**
 * Compress RGBA image data to JPEG format
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `quality` - JPEG quality (1-100)
 * * `output` - Output buffer (pre-allocated, same size as input)
 *
 * # Returns
 * Number of bytes written to output buffer
 */
#[wasm_bindgen]
pub fn compress_jpeg(
    input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    output: &mut [u8],
) -> usize {
    // Validate inputs
    if input.is_empty() || width == 0 || height == 0 {
        web_sys::console::log_1(&"Validation failed: empty input or zero dimensions".into());
        return 0;
    }

    let expected_size = (width * height * 4) as usize;
    if input.len() != expected_size {
        web_sys::console::log_2(&"Input size mismatch".into(),
            &format!("expected {}, got {}", expected_size, input.len()).into());
        return 0;
    }

    if quality < 1 || quality > 100 {
        web_sys::console::log_2(&"Quality out of range".into(), &quality.into());
        return 0;
    }

    if output.len() < input.len() {
        web_sys::console::log_2(&"Output buffer too small".into(),
            &format!("output: {}, input: {}", output.len(), input.len()).into());
        return 0;
    }

    web_sys::console::log_1(&"Calling JPEG compression...".into());

    // Call JPEG compression
    match jpeg::compress_to_jpeg(input, width, height, quality, output) {
        Ok(size) => {
            web_sys::console::log_2(&"JPEG compression success".into(), &size.into());
            size
        },
        Err(e) => {
            web_sys::console::log_2(&"JPEG compression error".into(), &e.into());
            0
        }
    }
}

/**
 * Compress RGBA image data to WebP format
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `quality` - WebP quality (1-100)
 * * `output` - Output buffer (pre-allocated, same size as input)
 *
 * # Returns
 * Number of bytes written to output buffer
 */
#[wasm_bindgen]
pub fn compress_webp(
    input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    output: &mut [u8],
) -> usize {
    // Validate inputs
    if input.is_empty() || width == 0 || height == 0 {
        web_sys::console::log_1(&"WebP compression: Validation failed - empty input or zero dimensions".into());
        return 0;
    }

    let expected_size = (width * height * 4) as usize;
    if input.len() != expected_size {
        web_sys::console::log_2(&"WebP compression: Input size mismatch".into(),
            &format!("expected {}, got {}", expected_size, input.len()).into());
        return 0;
    }

    if quality < 1 || quality > 100 {
        web_sys::console::log_2(&"WebP compression: Quality out of range".into(), &quality.into());
        return 0;
    }

    if output.len() < input.len() {
        web_sys::console::log_2(&"WebP compression: Output buffer too small".into(),
            &format!("output: {}, input: {}", output.len(), input.len()).into());
        return 0;
    }

    web_sys::console::log_1(&"Calling WebP compression...".into());

    // Call WebP compression
    match webp::compress_to_webp(input, width, height, quality, output) {
        Ok(size) => {
            web_sys::console::log_2(&"WebP compression success".into(), &size.into());
            size
        },
        Err(e) => {
            web_sys::console::log_2(&"WebP compression error".into(), &e.into());
            0
        }
    }
}

/**
 * Compress RGBA image data to PNG format
 *
 * Note: PNG is lossless compression. The quality parameter controls
 * compression level (Fast/Default/High/Best) for trade-off between size and speed.
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `quality` - PNG compression level hint (1-100, maps to compression type)
 * * `output` - Output buffer (pre-allocated, same size as input)
 *
 * # Returns
 * Number of bytes written to output buffer
 */
#[wasm_bindgen]
pub fn compress_png(
    input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    output: &mut [u8],
) -> usize {
    // Validate inputs
    if input.is_empty() || width == 0 || height == 0 {
        web_sys::console::log_1(&"PNG compression: Validation failed - empty input or zero dimensions".into());
        return 0;
    }

    let expected_size = (width * height * 4) as usize;
    if input.len() != expected_size {
        web_sys::console::log_2(&"PNG compression: Input size mismatch".into(),
            &format!("expected {}, got {}", expected_size, input.len()).into());
        return 0;
    }

    if quality < 1 || quality > 100 {
        web_sys::console::log_2(&"PNG compression: Quality out of range".into(), &quality.into());
        return 0;
    }

    if output.len() < input.len() {
        web_sys::console::log_2(&"PNG compression: Output buffer too small".into(),
            &format!("output: {}, input: {}", output.len(), input.len()).into());
        return 0;
    }

    web_sys::console::log_1(&"Calling PNG compression...".into());

    // Call PNG compression
    match png::compress_to_png(input, width, height, quality, output) {
        Ok(size) => {
            web_sys::console::log_2(&"PNG compression success".into(), &size.into());
            size
        },
        Err(e) => {
            web_sys::console::log_2(&"PNG compression error".into(), &e.into());
            0
        }
    }
}

/**
 * Compress image to target file size using binary search
 *
 * Uses binary search to find the optimal quality parameter that
 * produces a compressed image close to the target file size.
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `target_size` - Target file size in bytes
 * * `format` - Compression format (Jpeg, WebP, or Png)
 * * `output` - Output buffer (pre-allocated, same size as input)
 *
 * # Returns
 * CompressionResult containing actual size and quality used
 */
#[wasm_bindgen]
pub fn compress_to_size(
    input: &[u8],
    width: u32,
    height: u32,
    target_size: usize,
    format: CompressionFormat,
    output: &mut [u8],
) -> CompressionResult {
    // Validate inputs
    if input.is_empty() || width == 0 || height == 0 || target_size == 0 {
        return CompressionResult {
            size: 0,
            quality: 0,
        };
    }

    let expected_size = (width * height * 4) as usize;
    if input.len() != expected_size {
        return CompressionResult {
            size: 0,
            quality: 0,
        };
    }

    if output.len() < input.len() {
        return CompressionResult {
            size: 0,
            quality: 0,
        };
    }

    // Use binary search to find optimal quality
    binary_search::find_optimal_quality(input, width, height, target_size, format, output)
}
