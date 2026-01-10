use wasm_bindgen::prelude::*;

pub fn remove_color(
    input: &[u8],
    width: u32,
    height: u32,
    target_color: [u8; 3],
    tolerance: u8,
    feather: u8,
    output: &mut [u8],
) -> Result<usize, JsValue> {
    if input.is_empty() || width == 0 || height == 0 {
        return Err(JsValue::from_str("Invalid input dimensions"));
    }

    let expected_len = (width * height * 4) as usize;
    if input.len() != expected_len || output.len() < expected_len {
        return Err(JsValue::from_str("Buffer length mismatch"));
    }

    // Copy input to output first
    output[..expected_len].copy_from_slice(input);

    // Process each pixel
    for y in 0..height {
        for x in 0..width {
            let idx = ((y * width + x) * 4) as usize;
            let r = input[idx];
            let g = input[idx + 1];
            let b = input[idx + 2];

            // Calculate color distance
            let dr = (r as i16 - target_color[0] as i16).abs();
            let dg = (g as i16 - target_color[1] as i16).abs();
            let db = (b as i16 - target_color[2] as i16).abs();

            // Check if within tolerance (using Euclidean distance approximation)
            let distance = ((dr * dr + dg * dg + db * db) as f32).sqrt();
            if distance <= tolerance as f32 {
                // Make pixel transparent
                output[idx + 3] = 0;
            }
        }
    }

    // Apply feathering (simple edge smoothing)
    if feather > 0 {
        apply_feathering(output, width, height, feather);
    }

    Ok(expected_len)
}

fn apply_feathering(data: &mut [u8], width: u32, height: u32, feather: u8) {
    let feather = feather.min(50) as u32; // Cap feather radius

    for y in 0..height {
        for x in 0..width {
            let idx = ((y * width + x) * 4) as usize;
            
            // Only feather transparent pixels near opaque ones
            if data[idx + 3] == 0 {
                let mut opaque_neighbors = 0u32;
                let radius = feather.min(5); // Small radius for efficiency

                // Check neighbors
                for dy in -(radius as i32)..=(radius as i32) {
                    for dx in -(radius as i32)..=(radius as i32) {
                        if dx == 0 && dy == 0 {
                            continue;
                        }

                        let nx = x as i32 + dx;
                        let ny = y as i32 + dy;

                        if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                            let nidx = ((ny as u32 * width + nx as u32) * 4) as usize;
                            if data[nidx + 3] > 0 {
                                opaque_neighbors += 1;
                            }
                        }
                    }
                }

                // Apply partial transparency based on neighbor count
                if opaque_neighbors > 0 {
                    let alpha = ((opaque_neighbors as f32 / ((2 * radius + 1).pow(2) as f32)) * 255.0) as u8;
                    data[idx + 3] = alpha.min(255);
                }
            }
        }
    }
}
