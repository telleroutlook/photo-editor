use wasm_bindgen::prelude::*;

/**
 * WebP advanced compression parameters
 *
 * Note: These parameters are currently logged but not fully utilized in WASM.
 * The actual WebP encoding uses browser's Canvas API (OffscreenCanvas) as fallback.
 * This interface is maintained for future implementation with WASM-compatible encoders.
 */
#[wasm_bindgen]
pub struct WebPAdvancedParams {
    pub method: u8,           // 0-6, compression method (0=fastest, 6=slowest best)
    pub filter_strength: u8,  // 0-100, filter strength
    pub filter_sharpness: u8, // 0-100, filter sharpness
    pub sns_strength: u8,     // 0-100, spatial noise shielding
}

impl Default for WebPAdvancedParams {
    fn default() -> Self {
        Self {
            method: 4,
            filter_strength: 60,
            filter_sharpness: 0,
            sns_strength: 50,
        }
    }
}

/**
 * Compress RGBA image data to WebP format (basic)
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `quality` - WebP quality (1-100)
 * * `output` - Output buffer for compressed WebP data
 *
 * # Returns
 * Ok(0) to trigger Canvas fallback in worker
 *
 * Note: Pure Rust WebP encoders require libwebp-sys (needs clang compiler)
 * For WASM compatibility, we return 0 to trigger OffscreenCanvas fallback
 */
pub fn compress_to_webp(
    _input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    _output: &mut [u8],
) -> Result<usize, &'static str> {
    web_sys::console::log_1(&format!(
        "compress_to_webp: {}x{}, quality={} - using Canvas fallback",
        width, height, quality
    ).into());

    // Return 0 to signal worker to use Canvas fallback
    // The compressWorker.ts will use OffscreenCanvas for actual WebP encoding
    Ok(0)
}

/**
 * Compress RGBA image data to WebP format (advanced)
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `quality` - WebP quality (1-100)
 * * `params` - Advanced encoding parameters
 * * `output` - Output buffer for compressed WebP data
 *
 * # Returns
 * Ok(0) to trigger Canvas fallback in worker
 *
 * Note: Logs advanced parameters for debugging, but uses Canvas fallback.
 * Future: Implement with WASM-compatible WebP encoder that supports these params.
 */
pub fn compress_to_webp_advanced(
    _input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    params: &WebPAdvancedParams,
    _output: &mut [u8],
) -> Result<usize, &'static str> {
    web_sys::console::log_1(&format!(
        "compress_to_webp_advanced: {}x{}, quality={} - params logged, using Canvas fallback",
        width, height, quality
    ).into());

    // Log advanced parameters for debugging
    web_sys::console::log_1(&format!(
        "WebP params - method: {}, filter_strength: {}, filter_sharpness: {}, sns_strength: {}",
        params.method, params.filter_strength, params.filter_sharpness, params.sns_strength
    ).into());

    // Return 0 to signal worker to use Canvas fallback
    // The compressWorker.ts will use OffscreenCanvas for actual WebP encoding
    Ok(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_to_webp_triggers_fallback() {
        let rgba_data = vec![255u8; 16]; // 2x2 white image
        let mut output = vec![0u8; 4096];
        let result = compress_to_webp(&rgba_data, 2, 2, 80, &mut output);

        // Should return Ok(0) to trigger Canvas fallback
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[test]
    fn test_compress_to_webp_advanced_triggers_fallback() {
        let rgba_data = vec![255u8; 16];
        let mut output = vec![0u8; 4096];
        let params = WebPAdvancedParams::default();

        let result = compress_to_webp_advanced(&rgba_data, 2, 2, 80, &params, &mut output);

        // Should return Ok(0) to trigger Canvas fallback
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[test]
    fn test_webp_advanced_params_default() {
        let params = WebPAdvancedParams::default();
        assert_eq!(params.method, 4);
        assert_eq!(params.filter_strength, 60);
        assert_eq!(params.filter_sharpness, 0);
        assert_eq!(params.sns_strength, 50);
    }
}

