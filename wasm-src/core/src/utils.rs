use wasm_bindgen::prelude::*;

pub fn checked_len(width: u32, height: u32) -> Result<usize, JsValue> {
    let pixels = width
        .checked_mul(height)
        .ok_or_else(|| JsValue::from_str("Image dimensions overflow"))?;
    let len = pixels
        .checked_mul(4)
        .ok_or_else(|| JsValue::from_str("Image buffer length overflow"))?;
    Ok(len as usize)
}

pub fn validate_input(input: &[u8], width: u32, height: u32) -> Result<usize, JsValue> {
    let expected = checked_len(width, height)?;
    if input.len() != expected {
        return Err(JsValue::from_str("Input buffer length mismatch"));
    }
    Ok(expected)
}

pub fn validate_output(output: &mut [u8], expected: usize) -> Result<(), JsValue> {
    if output.len() < expected {
        return Err(JsValue::from_str("Output buffer too small"));
    }
    Ok(())
}

pub fn copy_into_output(output: &mut [u8], data: &[u8]) -> Result<usize, JsValue> {
    validate_output(output, data.len())?;
    output[..data.len()].copy_from_slice(data);
    Ok(data.len())
}

pub fn pixel_index(width: u32, x: u32, y: u32) -> usize {
    ((y * width + x) * 4) as usize
}
