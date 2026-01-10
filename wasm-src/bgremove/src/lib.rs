use wasm_bindgen::prelude::*;

mod color_threshold;
mod magic_wand;
mod grabcut;

#[wasm_bindgen]
pub fn remove_solid_color(
    input: &[u8],
    width: u32,
    height: u32,
    target_color: &[u8],
    tolerance: u8,
    feather: u8,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    if target_color.len() != 3 {
        return Err(JsValue::from_str("target_color must have exactly 3 elements (R, G, B)"));
    }
    let color = [target_color[0], target_color[1], target_color[2]];
    color_threshold::remove_color(input, width, height, color, tolerance, feather, output)
}

#[wasm_bindgen]
pub fn magic_wand_select(
    input: &[u8],
    width: u32,
    height: u32,
    seed_x: u32,
    seed_y: u32,
    tolerance: u8,
    connected: bool,
    mask_output: &mut [u8],
) -> Result<usize, JsValue> {
    magic_wand::magic_wand(input, width, height, seed_x, seed_y, tolerance, connected, mask_output)
}

#[wasm_bindgen]
pub fn grabcut_segment(
    input: &[u8],
    width: u32,
    height: u32,
    rect_x: u32,
    rect_y: u32,
    rect_width: u32,
    rect_height: u32,
    iterations: u8,
    mask_output: &mut [u8],
) -> Result<usize, JsValue> {
    grabcut::grabcut_segment(input, width, height, rect_x, rect_y, rect_width, rect_height, iterations, mask_output)
}
