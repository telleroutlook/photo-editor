use image::{ImageBuffer, RgbaImage, DynamicImage, ImageEncoder};
use image::codecs::jpeg::JpegEncoder;
use std::io::Cursor;

/**
 * Compress RGBA image data to JPEG format
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
    // Create RGBA image from input buffer
    let rgba_image: RgbaImage =
        match ImageBuffer::from_raw(width, height, input.to_vec()) {
            Some(img) => img,
            None => return Err("Failed to create image buffer from input data"),
        };

    let dynamic_image = DynamicImage::ImageRgba8(rgba_image);

    // Encode to JPEG with specified quality
    let mut buffer = Cursor::new(Vec::new());
    let encoder = JpegEncoder::new_with_quality(&mut buffer, quality.into());

    match encoder.write_image(
        dynamic_image.as_bytes(),
        width,
        height,
        image::ExtendedColorType::Rgba8,
    ) {
        Ok(_) => {
            let jpeg_data = buffer.into_inner();

            // Copy to output buffer
            if jpeg_data.len() > output.len() {
                return Err("Output buffer too small for compressed data");
            }

            output[..jpeg_data.len()].copy_from_slice(&jpeg_data);
            Ok(jpeg_data.len())
        }
        Err(_) => Err("JPEG encoding failed"),
    }
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
            let result = compress_to_jpeg(&rgba_data, 2, 2, quality, &mut output);
            assert!(result.is_ok());
        }
    }
}
