use image::{ImageBuffer, RgbaImage, DynamicImage, ImageEncoder};
use image::codecs::png::PngEncoder;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

/**
 * Compress RGBA image data to PNG format
 *
 * Note: PNG is lossless compression, so quality parameter is not used.
 * The compression level can be adjusted for trade-off between size and speed.
 *
 * # Arguments
 * * `input` - RGBA image data (4 bytes per pixel, row-major order)
 * * `width` - Image width in pixels
 * * `height` - Image height in pixels
 * * `quality` - PNG compression level (1-100, maps to Fast/High/Best compression)
 * * `output` - Output buffer for compressed PNG data
 *
 * # Returns
 * Ok(number_of_bytes_written) on success
 * Err(error_message) on failure
 */
pub fn compress_to_png(
    input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    output: &mut [u8],
) -> Result<usize, &'static str> {
    web_sys::console::log_1(&format!("compress_to_png: {}x{}, compression_hint={}", width, height, quality).into());

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

    web_sys::console::log_1(&"Creating PNG encoder...".into());

    // Encode to PNG with compression level based on quality
    let mut buffer = Cursor::new(Vec::new());

    // Map quality (1-100) to PNG compression level
    // PNG compression: Fast -> Default -> Best
    let compression_level = if quality < 50 {
        web_sys::console::log_1(&"Using Fast PNG compression".into());
        image::codecs::png::CompressionType::Fast
    } else if quality < 90 {
        web_sys::console::log_1(&"Using Default PNG compression".into());
        image::codecs::png::CompressionType::Default
    } else {
        web_sys::console::log_1(&"Using Best PNG compression".into());
        image::codecs::png::CompressionType::Best
    };

    // Use default filter type for best compatibility
    let filter_type = image::codecs::png::FilterType::default();

    let encoder = PngEncoder::new_with_quality(
        &mut buffer,
        compression_level,
        filter_type
    );

    web_sys::console::log_1(&"Encoding image...".into());

    match encoder.write_image(
        dynamic_image.as_bytes(),
        width,
        height,
        image::ExtendedColorType::Rgba8,  // PNG supports RGBA with transparency
    ) {
        Ok(_) => {
            let png_data = buffer.into_inner();
            web_sys::console::log_2(&"PNG encoded successfully, size:".into(), &png_data.len().into());

            // Copy to output buffer
            if png_data.len() > output.len() {
                web_sys::console::log_2(&"Output buffer too small".into(),
                    &format!("needed {}, got {}", png_data.len(), output.len()).into());
                return Err("Output buffer too small for compressed data");
            }

            output[..png_data.len()].copy_from_slice(&png_data);
            web_sys::console::log_2(&"Compression complete, copied".into(), &png_data.len().into());
            Ok(png_data.len())
        }
        Err(e) => {
            web_sys::console::log_1(&format!("PNG encoding error: {:?}", e).into());
            Err("PNG encoding failed")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compress_to_png_basic() {
        // Create a simple 2x2 red RGBA image
        let rgba_data = vec![
            255, 0, 0, 255,  // Red pixel
            0, 255, 0, 255,  // Green pixel
            0, 0, 255, 255,  // Blue pixel
            255, 255, 0, 255, // Yellow pixel
        ];

        let mut output = vec![0u8; 4096];
        let result = compress_to_png(&rgba_data, 2, 2, 80, &mut output);

        assert!(result.is_ok());
        assert!(result.unwrap() > 0);
    }

    #[test]
    fn test_compress_to_png_compression_levels() {
        let rgba_data = vec![255u8; 16]; // 2x2 white image
        let mut output = vec![0u8; 4096];

        // Test different compression levels
        for quality in [1, 50, 80, 100] {
            let result = compress_to_png(&rgba_data, 2, 2, quality, &mut output);
            assert!(result.is_ok());
        }
    }
}
