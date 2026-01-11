use image::{ImageBuffer, RgbaImage, DynamicImage, ImageEncoder, EncodableLayout};
use image::codecs::jpeg::JpegEncoder;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

/**
 * JPEG advanced compression parameters
 *
 * Note: The image crate's JpegEncoder has limited parameter support.
 * This structure provides a foundation for future enhancements with
 * more advanced JPEG encoders like jpeg-encoder.
 */
#[wasm_bindgen]
pub struct JpegAdvancedParams {
    pub optimize: bool,        // Optimize Huffman tables (smaller file, slower encoding)
    pub progressive: bool,     // Progressive JPEG (faster perceived loading)
}

impl Default for JpegAdvancedParams {
    fn default() -> Self {
        Self {
            optimize: true,
            progressive: false, // Default to non-progressive for compatibility
        }
    }
}

/**
 * Compress RGBA image data to JPEG format (basic)
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `quality` - JPEG quality (1-100)
 * * `output` - Output buffer for compressed JPEG data
 *
 * # Returns
 * Ok(number_of_bytes_written) on success
 * Err(error_message) on failure
 */
pub fn compress_to_jpeg(
    input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    output: &mut [u8],
) -> Result<usize, &'static str> {
    web_sys::console::log_1(&format!("compress_to_jpeg: {}x{}, quality={}", width, height, quality).into());

    // Create RGBA image from input buffer
    let rgba_image: RgbaImage =
        match ImageBuffer::from_raw(width, height, input.to_vec()) {
            Some(img) => {
                web_sys::console::log_1(&"ImageBuffer created successfully".into());
                img
            },
            None => {
                web_sys::console::log_1(&"Failed to create ImageBuffer".into());
                return Err("Failed to create image buffer from input data");
            }
        };

    let dynamic_image = DynamicImage::ImageRgba8(rgba_image);

    web_sys::console::log_1(&"Converting RGBA to RGB...".into());

    // Convert RGBA to RGB (JPEG doesn't support alpha channel)
    let rgb_image = dynamic_image.to_rgb8();

    web_sys::console::log_1(&"Creating JPEG encoder...".into());

    // Encode to JPEG with specified quality
    let mut buffer = Cursor::new(Vec::new());
    let encoder = JpegEncoder::new_with_quality(&mut buffer, quality.into());

    web_sys::console::log_1(&"Encoding image...".into());

    match encoder.write_image(
        rgb_image.as_bytes(),
        width,
        height,
        image::ExtendedColorType::Rgb8,
    ) {
        Ok(_) => {
            let jpeg_data = buffer.into_inner();
            web_sys::console::log_2(&"JPEG encoded successfully, size:".into(), &jpeg_data.len().into());

            // Copy to output buffer
            if jpeg_data.len() > output.len() {
                web_sys::console::log_2(&"Output buffer too small".into(),
                    &format!("needed {}, got {}", jpeg_data.len(), output.len()).into());
                return Err("Output buffer too small for compressed data");
            }

            output[..jpeg_data.len()].copy_from_slice(&jpeg_data);
            web_sys::console::log_2(&"Compression complete, copied".into(), &jpeg_data.len().into());
            Ok(jpeg_data.len())
        }
        Err(e) => {
            web_sys::console::log_1(&format!("JPEG encoding error: {:?}", e).into());
            Err("JPEG encoding failed")
        }
    }
}

/**
 * Compress RGBA image data to JPEG format (advanced)
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `quality` - JPEG quality (1-100)
 * * `params` - Advanced encoding parameters
 * * `output` - Output buffer for compressed JPEG data
 *
 * # Returns
 * Ok(number_of_bytes_written) on success
 * Err(error_message) on failure
 *
 * Note: Current implementation uses the image crate which has limited support
 * for advanced parameters. The params are logged for future enhancement.
 */
pub fn compress_to_jpeg_advanced(
    input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    params: &JpegAdvancedParams,
    output: &mut [u8],
) -> Result<usize, &'static str> {
    web_sys::console::log_1(&"compress_to_jpeg_advanced: called with params".into());
    web_sys::console::log_1(&format!("JPEG params - optimize: {}, progressive: {}",
        params.optimize, params.progressive).into());

    // For now, use basic compression (image crate doesn't expose advanced params)
    // Future enhancement: Switch to jpeg-encoder crate for more control
    let result = compress_to_jpeg(input, width, height, quality, output);

    // Log note about advanced parameter support
    if params.optimize || params.progressive {
        web_sys::console::log_1(&"Note: optimize and progressive parameters logged but not applied (limited by image crate)".into());
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_to_jpeg_basic() {
        // Create a simple 2x2 red RGBA image
        let rgba_data = vec![
            255, 0, 0, 255,  // Red pixel
            0, 255, 0, 255,  // Green pixel
            0, 0, 255, 255,  // Blue pixel
            255, 255, 0, 255, // Yellow pixel
        ];

        let mut output = vec![0u8; 4096];
        let result = compress_to_jpeg(&rgba_data, 2, 2, 80, &mut output);

        assert!(result.is_ok());
        assert!(result.unwrap() > 0);
    }

    #[test]
    fn test_compress_to_jpeg_quality_range() {
        let rgba_data = vec![255u8; 16]; // 2x2 white image
        let mut output = vec![0u8; 4096];

        // Test valid quality values
        for quality in [1, 50, 100] {
            let mut output = vec![0u8; 4096];
            let result = compress_to_jpeg(&rgba_data, 2, 2, quality, &mut output);
            assert!(result.is_ok());
        }
    }

    #[test]
    fn test_jpeg_advanced_params_default() {
        let params = JpegAdvancedParams::default();
        assert_eq!(params.optimize, true);
        assert_eq!(params.progressive, false);
    }
}
