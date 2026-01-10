use wasm_bindgen::prelude::*;

mod crop;
mod resize;
mod rotate;
mod utils;

#[wasm_bindgen]
pub struct CropRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[wasm_bindgen]
pub enum RotateAngle {
    Degree0 = 0,
    Degree90 = 90,
    Degree180 = 180,
    Degree270 = 270,
}

#[wasm_bindgen]
pub enum FlipDirection {
    Horizontal,
    Vertical,
}

#[wasm_bindgen]
pub enum ResizeQuality {
    Fast = 0,
    High = 1,
}

#[wasm_bindgen]
pub fn crop_image(
    input: &[u8],
    width: u32,
    height: u32,
    crop_rect: &CropRect,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    crop::crop_image(input, width, height, crop_rect, output)
}

#[wasm_bindgen]
pub fn rotate_image(
    input: &[u8],
    width: u32,
    height: u32,
    angle: RotateAngle,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    rotate::rotate_image(input, width, height, angle, output)
}

#[wasm_bindgen]
pub fn flip_image(
    input: &[u8],
    width: u32,
    height: u32,
    direction: FlipDirection,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    rotate::flip_image(input, width, height, direction, output)
}

#[wasm_bindgen]
pub fn resize_image(
    input: &[u8],
    width: u32,
    height: u32,
    new_width: u32,
    new_height: u32,
    quality: ResizeQuality,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    resize::resize_image(input, width, height, new_width, new_height, quality, output)
}
