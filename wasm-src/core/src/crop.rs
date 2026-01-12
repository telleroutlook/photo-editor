use wasm_bindgen::prelude::*;

use crate::{utils, CropRect};

pub fn crop_image(
    input: &[u8],
    width: u32,
    height: u32,
    crop_rect: &CropRect,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    utils::validate_input(input, width, height)?;

    let x2 = crop_rect
        .x
        .checked_add(crop_rect.width)
        .ok_or_else(|| JsValue::from_str("Crop width overflow"))?;
    let y2 = crop_rect
        .y
        .checked_add(crop_rect.height)
        .ok_or_else(|| JsValue::from_str("Crop height overflow"))?;

    if x2 > width || y2 > height {
        return Err(JsValue::from_str("Crop rectangle out of bounds"));
    }

    let out_len = utils::checked_len(crop_rect.width, crop_rect.height)?;
    utils::validate_output(output, out_len)?;

    if crop_rect.width == 0 || crop_rect.height == 0 {
        return Ok(0);
    }

    // ✅ Add explicit bounds checking to prevent panics
    for row in 0..crop_rect.height {
        let src_y = crop_rect.y + row;
        let src_x = crop_rect.x;
        let src_idx = utils::pixel_index(width, src_x, src_y);
        let row_bytes = (crop_rect.width * 4) as usize;
        let dst_idx = (row * crop_rect.width * 4) as usize;

        // Check bounds BEFORE slicing to prevent panic
        if src_idx + row_bytes > input.len() {
            return Err(JsValue::from_str(&format!(
                "Source slice out of bounds: row={}, src_idx={}, row_bytes={}, input.len()={}",
                row, src_idx, row_bytes, input.len()
            )));
        }
        if dst_idx + row_bytes > output.len() {
            return Err(JsValue::from_str(&format!(
                "Destination slice out of bounds: row={}, dst_idx={}, row_bytes={}, output.len()={}",
                row, dst_idx, row_bytes, output.len()
            )));
        }

        output[dst_idx..dst_idx + row_bytes]
            .copy_from_slice(&input[src_idx..src_idx + row_bytes]);
    }

    Ok(out_len)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crops_center_pixel() {
        let input = vec![
            10, 0, 0, 255, 20, 0, 0, 255,
            30, 0, 0, 255, 40, 0, 0, 255,
        ];
        let crop = CropRect {
            x: 1,
            y: 0,
            width: 1,
            height: 1,
        };
        let mut output = vec![0u8; 4];
        let written = crop_image(&input, 2, 2, &crop, &mut output).unwrap();
        assert_eq!(written, 4);
        assert_eq!(output, vec![20, 0, 0, 255]);
    }
}
