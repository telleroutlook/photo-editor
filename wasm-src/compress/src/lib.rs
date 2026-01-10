use wasm_bindgen::prelude::*;

mod jpeg;
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
        return 0;
    }

    let expected_size = (width * height * 4) as usize;
    if input.len() != expected_size {
        return 0;
    }

    if quality < 1 || quality > 100 {
        return 0;
    }

    if output.len() < input.len() {
        return 0;
    }

    // Call JPEG compression
    match jpeg::compress_to_jpeg(input, width, height, quality, output) {
        Ok(size) => size,
        Err(_) => 0,
    }
}

/**
 * Compress RGBA image data to WebP format
 *
 * Note: WebP encoding is not yet implemented in the image crate.
 * This function falls back to JPEG compression for now.
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
    // WebP not yet supported, fallback to JPEG
    compress_jpeg(input, width, height, quality, output)
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
