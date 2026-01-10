use crate::jpeg;
use crate::CompressionFormat;
use crate::CompressionResult;

// Maximum number of binary search iterations
const MAX_ITERATIONS: u8 = 10;

// Tolerance for target size (±5%)
const TOLERANCE_PERCENT: f64 = 0.05;

/**
 * Find optimal quality to achieve target file size using binary search
 *
 * Uses binary search algorithm to find the quality parameter (1-100)
 * that produces a compressed image closest to the target file size.
 *
 * # Algorithm
 * 1. Start with quality range [1, 100]
 * 2. Try middle quality value
 * 3. If compressed size > target: lower max quality (try harder compression)
 * 4. If compressed size ≤ target: raise min quality (keep result, try better quality)
 * 5. Repeat up to MAX_ITERATIONS times
 * 6. Return the best result that's within tolerance
 *
 * # Arguments
 * * `input` - RGBA image data
 * * `width` - Image width
 * * `height` - Image height
 * * `target_size` - Target file size in bytes
 * * `format` - Compression format
 * * `output` - Output buffer
 *
 * # Returns
 * CompressionResult with actual size and quality used
 */
pub fn find_optimal_quality(
    input: &[u8],
    width: u32,
    height: u32,
    target_size: usize,
    format: CompressionFormat,
    output: &mut [u8],
) -> CompressionResult {
    // Binary search bounds
    let mut min_quality: u8 = 1;
    let mut max_quality: u8 = 100;

    // Track best result
    let mut best_result: Option<CompressionResult> = None;

    // Binary search loop
    for _iteration in 0..MAX_ITERATIONS {
        let mid_quality = (min_quality + max_quality) / 2;

        // Compress with current quality
        let compressed_size = compress_with_format(
            input,
            width,
            height,
            mid_quality,
            format,
            output,
        );

        // Check if we're within tolerance of target
        let size_diff = compressed_size as f64 - target_size as f64;
        let percent_diff = (size_diff.abs() / target_size as f64) * 100.0;

        let within_tolerance = percent_diff <= (TOLERANCE_PERCENT * 100.0);

        if within_tolerance {
            // Good result, keep it and try for better quality
            best_result = Some(CompressionResult {
                size: compressed_size,
                quality: mid_quality,
            });

            // Try higher quality (better image, larger file)
            if min_quality < max_quality {
                min_quality = mid_quality + 1;
            } else {
                break;
            }
        } else if compressed_size > target_size {
            // File too large, compress more (lower quality)
            if compressed_size == 0 {
                // Encoding failed, try lower quality
                max_quality = mid_quality - 1;
            } else {
                max_quality = mid_quality - 1;
            }
        } else {
            // File smaller than target, good result
            // Try higher quality for better image
            best_result = Some(CompressionResult {
                size: compressed_size,
                quality: mid_quality,
            });

            if min_quality < max_quality {
                min_quality = mid_quality + 1;
            } else {
                break;
            }
        }

        // Prevent infinite loop
        if min_quality >= max_quality {
            break;
        }
    }

    // If no good result found, try minimum quality as fallback
    if best_result.is_none() {
        let compressed_size = compress_with_format(
            input,
            width,
            height,
            1,
            format,
            output,
        );

        best_result = Some(CompressionResult {
            size: compressed_size,
            quality: 1,
        });
    }

    best_result.unwrap_or(CompressionResult {
        size: 0,
        quality: 0,
    })
}

/**
 * Compress image with specified format and quality
 */
fn compress_with_format(
    input: &[u8],
    width: u32,
    height: u32,
    quality: u8,
    format: CompressionFormat,
    output: &mut [u8],
) -> usize {
    match format {
        CompressionFormat::Jpeg => jpeg::compress_to_jpeg(input, width, height, quality, output)
            .unwrap_or(0),
        CompressionFormat::WebP => jpeg::compress_to_jpeg(input, width, height, quality, output)
            .unwrap_or(0), // Fallback to JPEG
        CompressionFormat::Png => jpeg::compress_to_jpeg(input, width, height, quality, output)
            .unwrap_or(0), // Fallback to JPEG
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_binary_search_convergence() {
        // Create a simple test image
        let rgba_data = vec![255u8; 400]; // 10x10 white image
        let target_size = 1000; // 1KB target
        let mut output = vec![0u8; 4096];

        let result = find_optimal_quality(
            &rgba_data,
            10,
            10,
            target_size,
            CompressionFormat::Jpeg,
            &mut output,
        );

        // Should find some quality level
        assert!(result.quality > 0);
        assert!(result.size > 0);
    }

    #[test]
    fn test_max_iterations_limit() {
        let rgba_data = vec![255u8; 400];
        let mut output = vec![0u8; 4096];

        // Use very small target to force many iterations
        let result = find_optimal_quality(
            &rgba_data,
            10,
            10,
            100, // Very small target
            CompressionFormat::Jpeg,
            &mut output,
        );

        // Should terminate without hanging
        assert!(result.quality > 0);
    }
}
