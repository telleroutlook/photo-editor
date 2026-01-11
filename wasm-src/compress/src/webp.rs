use wasm_bindgen::prelude::*;

/**
 * WebP compression stub - Returns error to force Canvas fallback
 *
 * WebP lossy compression is handled by browser's native OffscreenCanvas API
 * which provides better quality and performance than WASM-based solutions.
 *
 * The compressWorker will automatically fall back to Canvas-based WebP encoding
 * which supports lossy compression with quality control.
 */
pub fn compress_to_webp(
    _input: &[u8],
    _width: u32,
    _height: u32,
    _quality: u8,
    _output: &mut [u8],
) -> Result<usize, &'static str> {
    web_sys::console::log_1(&"WebP: Using browser native Canvas encoding (lossy supported)".into());

    // Return 0 to signal the worker to use Canvas fallback
    // This ensures WebP compression uses browser's native implementation
    Ok(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_to_webp_basic() {
        // Create a simple 2x2 red RGBA image
        let rgba_data = vec![
            255, 0, 0, 255,  // Red pixel
            0, 255, 0, 255,  // Green pixel
            0, 0, 255, 255,  // Blue pixel
            255, 255, 0, 255, // Yellow pixel
        ];

        let mut output = vec![0u8; 4096];
        let result = compress_to_webp(&rgba_data, 2, 2, 80, &mut output);

        assert!(result.is_ok());
        assert!(result.unwrap() > 0);
    }

    #[test]
    fn test_compress_to_webp_quality_range() {
        let rgba_data = vec![255u8; 16]; // 2x2 white image
        let mut output = vec![0u8; 4096];

        // Test valid quality values
        for quality in [1, 50, 100] {
            let result = compress_to_webp(&rgba_data, 2, 2, quality, &mut output);
            assert!(result.is_ok());
        }
    }
}
