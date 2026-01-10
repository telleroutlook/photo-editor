use wasm_bindgen::prelude::*;

use image::imageops::FilterType;
use image::RgbaImage;

use crate::{utils, ResizeQuality};

pub fn resize_image(
    input: &[u8],
    width: u32,
    height: u32,
    new_width: u32,
    new_height: u32,
    quality: ResizeQuality,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    utils::validate_input(input, width, height)?;
    if new_width == 0 || new_height == 0 {
        return Err(JsValue::from_str("New dimensions must be > 0"));
    }

    let out_len = utils::checked_len(new_width, new_height)?;
    utils::validate_output(output, out_len)?;

    let src = RgbaImage::from_raw(width, height, input.to_vec())
        .ok_or_else(|| JsValue::from_str("Failed to build source image"))?;

    let filter = match quality {
        ResizeQuality::Low => FilterType::Nearest,
        ResizeQuality::Medium => FilterType::Triangle,
        ResizeQuality::High => FilterType::CatmullRom,
        ResizeQuality::Maximum => FilterType::Lanczos3,
    };

    let resized = image::imageops::resize(&src, new_width, new_height, filter);
    let data = resized.into_raw();

    utils::copy_into_output(output, &data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resizes_nearest() {
        let input = vec![
            1, 0, 0, 255, 2, 0, 0, 255,
            3, 0, 0, 255, 4, 0, 0, 255,
        ];
        let mut output = vec![0u8; 4];
        let written = resize_image(
            &input,
            2,
            2,
            1,
            1,
            ResizeQuality::Low,
            &mut output,
        )
        .unwrap();
        assert_eq!(written, 4);
        assert!(output[0] == 1 || output[0] == 2 || output[0] == 3 || output[0] == 4);
    }

    #[test]
    fn resizes_high_length() {
        let input = vec![
            1, 0, 0, 255, 2, 0, 0, 255,
            3, 0, 0, 255, 4, 0, 0, 255,
        ];
        let mut output = vec![0u8; 16];
        let written = resize_image(
            &input,
            2,
            2,
            2,
            2,
            ResizeQuality::High,
            &mut output,
        )
        .unwrap();
        assert_eq!(written, 16);
    }
}
