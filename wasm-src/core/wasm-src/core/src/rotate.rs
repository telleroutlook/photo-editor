use wasm_bindgen::prelude::*;

use crate::{utils, FlipDirection, RotateAngle};

pub fn rotate_image(
    input: &[u8],
    width: u32,
    height: u32,
    angle: RotateAngle,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    utils::validate_input(input, width, height)?;

    let out_len = utils::checked_len(width, height)?;
    utils::validate_output(output, out_len)?;

    match angle {
        RotateAngle::Degree0 => {
            output[..out_len].copy_from_slice(input);
            Ok(out_len)
        }
        RotateAngle::Degree180 => {
            for y in 0..height {
                for x in 0..width {
                    let src = utils::pixel_index(width, x, y);
                    let dst_x = width - 1 - x;
                    let dst_y = height - 1 - y;
                    let dst = utils::pixel_index(width, dst_x, dst_y);
                    output[dst..dst + 4].copy_from_slice(&input[src..src + 4]);
                }
            }
            Ok(out_len)
        }
        RotateAngle::Degree90 => {
            let out_w = height;
            for y in 0..height {
                for x in 0..width {
                    let src = utils::pixel_index(width, x, y);
                    let dst_x = height - 1 - y;
                    let dst_y = x;
                    let dst = utils::pixel_index(out_w, dst_x, dst_y);
                    output[dst..dst + 4].copy_from_slice(&input[src..src + 4]);
                }
            }
            Ok(out_len)
        }
        RotateAngle::Degree270 => {
            let out_w = height;
            for y in 0..height {
                for x in 0..width {
                    let src = utils::pixel_index(width, x, y);
                    let dst_x = y;
                    let dst_y = width - 1 - x;
                    let dst = utils::pixel_index(out_w, dst_x, dst_y);
                    output[dst..dst + 4].copy_from_slice(&input[src..src + 4]);
                }
            }
            Ok(out_len)
        }
    }
}

pub fn flip_image(
    input: &[u8],
    width: u32,
    height: u32,
    direction: FlipDirection,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    utils::validate_input(input, width, height)?;

    let out_len = utils::checked_len(width, height)?;
    utils::validate_output(output, out_len)?;

    for y in 0..height {
        for x in 0..width {
            let src = utils::pixel_index(width, x, y);
            let (dst_x, dst_y) = match direction {
                FlipDirection::Horizontal => (width - 1 - x, y),
                FlipDirection::Vertical => (x, height - 1 - y),
            };
            let dst = utils::pixel_index(width, dst_x, dst_y);
            output[dst..dst + 4].copy_from_slice(&input[src..src + 4]);
        }
    }

    Ok(out_len)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rotates_90() {
        let input = vec![
            1, 0, 0, 255, 2, 0, 0, 255,
            3, 0, 0, 255, 4, 0, 0, 255,
        ];
        let mut output = vec![0u8; 16];
        rotate_image(&input, 2, 2, RotateAngle::Degree90, &mut output).unwrap();
        let expected = vec![
            3, 0, 0, 255, 1, 0, 0, 255,
            4, 0, 0, 255, 2, 0, 0, 255,
        ];
        assert_eq!(output, expected);
    }

    #[test]
    fn flips_horizontal() {
        let input = vec![
            1, 0, 0, 255, 2, 0, 0, 255,
            3, 0, 0, 255, 4, 0, 0, 255,
        ];
        let mut output = vec![0u8; 16];
        flip_image(&input, 2, 2, FlipDirection::Horizontal, &mut output).unwrap();
        let expected = vec![
            2, 0, 0, 255, 1, 0, 0, 255,
            4, 0, 0, 255, 3, 0, 0, 255,
        ];
        assert_eq!(output, expected);
    }
}
