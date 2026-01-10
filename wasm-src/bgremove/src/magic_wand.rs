use wasm_bindgen::prelude::*;

pub fn magic_wand(
    input: &[u8],
    width: u32,
    height: u32,
    seed_x: u32,
    seed_y: u32,
    tolerance: u8,
    connected: bool,
    mask_output: &mut [u8],
) -> Result<usize, JsValue> {
    if input.is_empty() || width == 0 || height == 0 {
        return Err(JsValue::from_str("Invalid input dimensions"));
    }

    let expected_len = (width * height) as usize;
    if input.len() != (expected_len * 4) || mask_output.len() < expected_len {
        return Err(JsValue::from_str("Buffer length mismatch"));
    }

    if seed_x >= width || seed_y >= height {
        return Err(JsValue::from_str("Seed coordinates out of bounds"));
    }

    // Initialize mask to all zeros
    for i in 0..expected_len {
        mask_output[i] = 0;
    }

    // Get seed pixel color
    let seed_idx = ((seed_y * width + seed_x) * 4) as usize;
    let seed_r = input[seed_idx];
    let seed_g = input[seed_idx + 1];
    let seed_b = input[seed_idx + 2];

    if connected {
        // Connected flood fill
        flood_fill_connected(
            input,
            width,
            height,
            seed_x,
            seed_y,
            seed_r,
            seed_g,
            seed_b,
            tolerance,
            mask_output,
        );
    } else {
        // Global color selection (all pixels within tolerance)
        flood_fill_global(
            input,
            width,
            height,
            seed_r,
            seed_g,
            seed_b,
            tolerance,
            mask_output,
        );
    }

    Ok(expected_len)
}

fn flood_fill_connected(
    input: &[u8],
    width: u32,
    height: u32,
    seed_x: u32,
    seed_y: u32,
    seed_r: u8,
    seed_g: u8,
    seed_b: u8,
    tolerance: u8,
    mask: &mut [u8],
) {
    let mut stack = vec![(seed_x, seed_y)];
    let mut visited = vec![false; (width * height) as usize];

    while let Some((x, y)) = stack.pop() {
        let idx = (y * width + x) as usize;
        if visited[idx] {
            continue;
        }

        let pixel_idx = (idx * 4) as usize;
        let r = input[pixel_idx];
        let g = input[pixel_idx + 1];
        let b = input[pixel_idx + 2];

        if color_within_tolerance(r, g, b, seed_r, seed_g, seed_b, tolerance) {
            visited[idx] = true;
            mask[idx] = 255;

            // Add neighbors (4-connected)
            if x > 0 {
                stack.push((x - 1, y));
            }
            if x < width - 1 {
                stack.push((x + 1, y));
            }
            if y > 0 {
                stack.push((x, y - 1));
            }
            if y < height - 1 {
                stack.push((x, y + 1));
            }
        }
    }
}

fn flood_fill_global(
    input: &[u8],
    width: u32,
    height: u32,
    seed_r: u8,
    seed_g: u8,
    seed_b: u8,
    tolerance: u8,
    mask: &mut [u8],
) {
    for y in 0..height {
        for x in 0..width {
            let idx = ((y * width + x) * 4) as usize;
            let r = input[idx];
            let g = input[idx + 1];
            let b = input[idx + 2];

            if color_within_tolerance(r, g, b, seed_r, seed_g, seed_b, tolerance) {
                let mask_idx = (y * width + x) as usize;
                mask[mask_idx] = 255;
            }
        }
    }
}

fn color_within_tolerance(
    r: u8,
    g: u8,
    b: u8,
    target_r: u8,
    target_g: u8,
    target_b: u8,
    tolerance: u8,
) -> bool {
    let dr = (r as i16 - target_r as i16).abs();
    let dg = (g as i16 - target_g as i16).abs();
    let db = (b as i16 - target_b as i16).abs();

    // Use Euclidean distance
    let distance = ((dr * dr + dg * dg + db * db) as f32).sqrt();
    distance <= tolerance as f32
}
