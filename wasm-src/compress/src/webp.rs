use image::{ImageBuffer, RgbaImage, DynamicImage, ImageEncoder};
use image::codecs::webp::WebPEncoder;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

/**
 * Compress RGBA image data to WebP format
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `quality` - WebP quality (1-100)
 * * `output` - Output buffer for compressed WebP data
 *
 * # Returns
 * Ok(number_of_bytes_written) on success
 * Err(error_message) on failure
 */
pub fn compress_to_webp(
    input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    output: &mut [u8],
) -> Result<usize, &'static str> {
    web_sys::console::log_1(&format!("compress_to_webp: {}x{}, quality={}", width, height, quality).into());

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

    web_sys::console::log_1(&"Creating WebP encoder...".into());

    // Encode to WebP
    let mut buffer = Cursor::new(Vec::new());

    // Use lossless WebP encoding (image crate 0.25 only supports lossless)
    web_sys::console::log_1(&"Using lossless WebP encoding".into());
    let encoder = WebPEncoder::new_lossless(&mut buffer);

    web_sys::console::log_1(&"Encoding image...".into());

    match encoder.write_image(
        dynamic_image.as_bytes(),
        width,
        height,
        image::ExtendedColorType::Rgba8,  // WebP supports RGBA
    ) {
        Ok(_) => {
            let webp_data = buffer.into_inner();
            web_sys::console::log_2(&"WebP encoded successfully, size:".into(), &webp_data.len().into());

            // Copy to output buffer
            if webp_data.len() > output.len() {
                web_sys::console::log_2(&"Output buffer too small".into(),
                    &format!("needed {}, got {}", webp_data.len(), output.len()).into());
                return Err("Output buffer too small for compressed data");
            }

            output[..webp_data.len()].copy_from_slice(&webp_data);
            web_sys::console::log_2(&"Compression complete, copied".into(), &webp_data.len().into());
            Ok(webp_data.len())
        }
        Err(e) => {
            web_sys::console::log_1(&format!("WebP encoding error: {:?}", e).into());
            Err("WebP encoding failed")
        }
    }
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
