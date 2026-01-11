use wasm_bindgen::prelude::*;
use std::f32;

const GMM_COMPONENTS: usize = 5;
const MAX_ITERATIONS: u8 = 5;

/// GrabCut segmentation mask values
const GC_BACKGROUND: u8 = 0;    // Definitely background
const GC_FG: u8 = 1;            // Definitely foreground
const GC_PR_BGD: u8 = 2;        // Probably background
const GC_PR_FGD: u8 = 3;        // Probably foreground

/// GMM component for color distribution modeling
#[derive(Clone, Copy)]
struct GMMComponent {
    rgb: [f32; 3],      // Mean color (RGB)
    cov: [f32; 3],      // Diagonal covariance (R, G, B variances)
    weight: f32,        // Mixing weight
}

impl GMMComponent {
    fn new() -> Self {
        Self {
            rgb: [0.0; 3],
            cov: [1.0; 3],
            weight: 0.0,
        }
    }
}

/// Gaussian Mixture Model for foreground/background
struct GMM {
    components: [GMMComponent; GMM_COMPONENTS],
}

impl GMM {
    fn new() -> Self {
        Self {
            components: [GMMComponent::new(); GMM_COMPONENTS],
        }
    }

    /// Calculate probability density of a color under this GMM
    fn probability(&self, r: u8, g: u8, b: u8) -> f32 {
        let mut prob = 0.0;
        let rf = r as f32;
        let gf = g as f32;
        let bf = b as f32;

        for comp in &self.components {
            if comp.weight < 1e-10 {
                continue;
            }

            // Gaussian probability with diagonal covariance
            let dr = rf - comp.rgb[0];
            let dg = gf - comp.rgb[1];
            let db = bf - comp.rgb[2];

            // Avoid division by zero with small epsilon
            let var_r = comp.cov[0].max(1e-10);
            let var_g = comp.cov[1].max(1e-10);
            let var_b = comp.cov[2].max(1e-10);

            let exp_part = -0.5 * (dr * dr / var_r + dg * dg / var_g + db * db / var_b);
            let norm = (2.0 * f32::consts::PI).powi(3) * (var_r * var_g * var_b).sqrt();

            prob += comp.weight * exp_part.exp() / norm;
        }

        prob.max(1e-10)
    }

    /// Learn GMM parameters from color samples using k-means initialization
    fn learn(&mut self, samples: &[[u8; 3]], assign: &mut [usize]) {
        let n = samples.len();
        if n == 0 {
            return;
        }

        // Initialize with k-means
        self.kmeans_init(samples, assign);

        // EM algorithm: refine parameters
        for _ in 0..5 {
            // E-step: compute responsibilities
            let mut sum_weights = [0.0; GMM_COMPONENTS];
            let mut sum_rgb = [[0.0; 3]; GMM_COMPONENTS];
            let mut sum_cov = [[0.0; 3]; GMM_COMPONENTS];
            let mut counts = [0.0; GMM_COMPONENTS];

            for (sample, &comp_idx) in samples.iter().zip(assign.iter()) {
                let comp_idx = comp_idx.min(GMM_COMPONENTS - 1);
                let r = sample[0] as f32;
                let g = sample[1] as f32;
                let b = sample[2] as f32;

                sum_weights[comp_idx] += 1.0;
                sum_rgb[comp_idx][0] += r;
                sum_rgb[comp_idx][1] += g;
                sum_rgb[comp_idx][2] += b;
                counts[comp_idx] += 1.0;
            }

            // M-step: update parameters
            for k in 0..GMM_COMPONENTS {
                if counts[k] > 0.5 {
                    self.components[k].weight = counts[k] / n as f32;
                    self.components[k].rgb[0] = sum_rgb[k][0] / counts[k];
                    self.components[k].rgb[1] = sum_rgb[k][1] / counts[k];
                    self.components[k].rgb[2] = sum_rgb[k][2] / counts[k];

                    // Compute variance
                    let mut var_sum = [0.0; 3];
                    for (sample, &comp_idx) in samples.iter().zip(assign.iter()) {
                        if comp_idx == k {
                            for c in 0..3 {
                                let diff = sample[c] as f32 - self.components[k].rgb[c];
                                var_sum[c] += diff * diff;
                            }
                        }
                    }

                    for c in 0..3 {
                        self.components[k].cov[c] = (var_sum[c] / counts[k]).max(1.0);
                    }
                }
            }
        }
    }

    /// K-means++ initialization for better clustering
    fn kmeans_init(&mut self, samples: &[[u8; 3]], assign: &mut [usize]) {
        let n = samples.len();
        if n == 0 {
            return;
        }

        // Initialize centroids using k-means++
        let mut centroids = [[0.0; 3]; GMM_COMPONENTS];
        let mut used = vec![false; n];

        // Choose first centroid randomly
        centroids[0] = [samples[0][0] as f32, samples[0][1] as f32, samples[0][2] as f32];

        // Choose remaining centroids with probability proportional to distance
        for k in 1..GMM_COMPONENTS {
            let mut max_dist_idx = 0;
            let mut max_dist = 0.0;

            for i in 0..n {
                let mut min_dist = f32::MAX;
                for j in 0..k {
                    let dr = samples[i][0] as f32 - centroids[j][0];
                    let dg = samples[i][1] as f32 - centroids[j][1];
                    let db = samples[i][2] as f32 - centroids[j][2];
                    let dist = dr * dr + dg * dg + db * db;
                    min_dist = min_dist.min(dist);
                }

                // Choose furthest point from existing centroids (deterministic)
                if min_dist > max_dist {
                    max_dist = min_dist;
                    max_dist_idx = i;
                }
            }

            centroids[k] = [
                samples[max_dist_idx][0] as f32,
                samples[max_dist_idx][1] as f32,
                samples[max_dist_idx][2] as f32,
            ];
        }

        // Assign samples to nearest centroid
        for (i, sample) in samples.iter().enumerate() {
            let mut min_dist = f32::MAX;
            let mut best_k = 0;

            for k in 0..GMM_COMPONENTS {
                let dr = sample[0] as f32 - centroids[k][0];
                let dg = sample[1] as f32 - centroids[k][1];
                let db = sample[2] as f32 - centroids[k][2];
                let dist = dr * dr + dg * dg + db * db;

                if dist < min_dist {
                    min_dist = dist;
                    best_k = k;
                }
            }

            assign[i] = best_k;
        }

        // Initialize GMM components from centroids
        for k in 0..GMM_COMPONENTS {
            self.components[k].rgb = centroids[k];
            self.components[k].weight = 1.0 / GMM_COMPONENTS as f32;
        }
    }
}

/// Graph edge for maxflow
#[derive(Clone, Copy)]
struct Edge {
    to: usize,
    rev: usize,
    capacity: i32,
}

/// Dinic's maxflow algorithm implementation
struct Dinic {
    graph: Vec<Vec<Edge>>,
    level: Vec<i32>,
    iter: Vec<usize>,
    n: usize,
}

impl Dinic {
    fn new(n: usize) -> Self {
        Self {
            graph: vec![vec![]; n],
            level: vec![0; n],
            iter: vec![0; n],
            n,
        }
    }

    fn add_edge(&mut self, from: usize, to: usize, capacity: i32) {
        let forward = Edge {
            to,
            rev: self.graph[to].len(),
            capacity,
        };
        let backward = Edge {
            to: from,
            rev: self.graph[from].len(),
            capacity: 0,
        };
        self.graph[from].push(forward);
        self.graph[to].push(backward);
    }

    fn bfs(&mut self, s: usize, t: usize) -> bool {
        self.level.iter_mut().for_each(|l| *l = -1);
        let mut queue = std::collections::VecDeque::new();
        self.level[s] = 0;
        queue.push_back(s);

        while let Some(v) = queue.pop_front() {
            for e in &self.graph[v] {
                if e.capacity > 0 && self.level[e.to] < 0 {
                    self.level[e.to] = self.level[v] + 1;
                    if e.to == t {
                        return true;
                    }
                    queue.push_back(e.to);
                }
            }
        }

        self.level[t] != -1
    }

    fn dfs(&mut self, v: usize, t: usize, f: i32) -> i32 {
        if v == t {
            return f;
        }

        while self.iter[v] < self.graph[v].len() {
            let e = self.graph[v][self.iter[v]];
            if e.capacity > 0 && self.level[v] < self.level[e.to] {
                let d = self.dfs(e.to, t, f.min(e.capacity));
                if d > 0 {
                    self.graph[v][self.iter[v]].capacity -= d;
                    self.graph[e.to][e.rev].capacity += d;
                    return d;
                }
            }
            self.iter[v] += 1;
        }

        0
    }

    fn max_flow(&mut self, s: usize, t: usize) -> i32 {
        let mut flow = 0;
        while self.bfs(s, t) {
            self.iter.iter_mut().for_each(|i| *i = 0);
            loop {
                let f = self.dfs(s, t, i32::MAX);
                if f == 0 {
                    break;
                }
                flow += f;
            }
        }
        flow
    }
}

/// GrabCut segmentation algorithm
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
    // Validation
    if input.is_empty() || width == 0 || height == 0 {
        return Err(JsValue::from_str("Invalid input dimensions"));
    }

    let expected_len = (width * height) as usize;
    if input.len() != expected_len * 4 || mask_output.len() < expected_len {
        return Err(JsValue::from_str("Buffer length mismatch"));
    }

    let pixel_count = (width * height) as usize;

    // Initialize mask: outside rect = background, inside = probably foreground
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) as usize;
            let in_rect = x >= rect_x
                && x < rect_x + rect_width
                && y >= rect_y
                && y < rect_y + rect_height;

            mask_output[idx] = if in_rect { GC_PR_FGD } else { GC_BACKGROUND };
        }
    }

    // Initialize GMMs with k-means on background/foreground colors
    let mut bgd_gmm = GMM::new();
    let mut fgd_gmm = GMM::new();

    // Collect initial samples
    let mut bgd_samples = Vec::new();
    let mut fgd_samples = Vec::new();
    let mut bgd_assign = Vec::new();
    let mut fgd_assign = Vec::new();

    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) as usize;
            let pixel_idx = idx * 4;

            let r = input[pixel_idx];
            let g = input[pixel_idx + 1];
            let b = input[pixel_idx + 2];

            if mask_output[idx] == GC_BACKGROUND || mask_output[idx] == GC_PR_BGD {
                bgd_samples.push([r, g, b]);
                bgd_assign.push(0);
            } else {
                fgd_samples.push([r, g, b]);
                fgd_assign.push(0);
            }
        }
    }

    bgd_gmm.learn(&bgd_samples, &mut bgd_assign);
    fgd_gmm.learn(&fgd_samples, &mut fgd_assign);

    // Iterative refinement
    let max_iter = iterations.min(MAX_ITERATIONS).max(1);

    for _iter in 0..max_iter {
        // Assign GMM components to pixels
        for y in 0..height {
            for x in 0..width {
                let idx = (y * width + x) as usize;
                let pixel_idx = idx * 4;

                let r = input[pixel_idx];
                let g = input[pixel_idx + 1];
                let b = input[pixel_idx + 2];

                // Skip definitely background pixels outside rect
                if mask_output[idx] == GC_BACKGROUND {
                    continue;
                }

                let bgd_prob = bgd_gmm.probability(r, g, b);
                let fgd_prob = fgd_gmm.probability(r, g, b);

                // Update mask based on probability ratio
                if mask_output[idx] == GC_PR_BGD || mask_output[idx] == GC_PR_FGD {
                    if fgd_prob > bgd_prob * 2.0 {
                        mask_output[idx] = GC_PR_FGD;
                    } else if bgd_prob > fgd_prob * 2.0 {
                        mask_output[idx] = GC_PR_BGD;
                    }
                }
            }
        }

        // Re-learn GMM parameters
        bgd_samples.clear();
        fgd_samples.clear();
        bgd_assign.clear();
        fgd_assign.clear();

        for y in 0..height {
            for x in 0..width {
                let idx = (y * width + x) as usize;
                let pixel_idx = idx * 4;

                let r = input[pixel_idx];
                let g = input[pixel_idx + 1];
                let b = input[pixel_idx + 2];

                if mask_output[idx] == GC_BACKGROUND || mask_output[idx] == GC_PR_BGD {
                    bgd_samples.push([r, g, b]);
                    bgd_assign.push(0);
                } else {
                    fgd_samples.push([r, g, b]);
                    fgd_assign.push(0);
                }
            }
        }

        bgd_gmm.learn(&bgd_samples, &mut bgd_assign);
        fgd_gmm.learn(&fgd_samples, &mut fgd_assign);
    }

    // Build graph and run maxflow
    let num_pixels = pixel_count;
    let source = num_pixels;
    let sink = num_pixels + 1;
    let mut dinic = Dinic::new(num_pixels + 2);

    // Add t-links (terminal edges)
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) as usize;
            let pixel_idx = idx * 4;

            let r = input[pixel_idx];
            let g = input[pixel_idx + 1];
            let b = input[pixel_idx + 2];

            let bgd_prob = -(bgd_gmm.probability(r, g, b).ln() + 1e-10);
            let fgd_prob = -(fgd_gmm.probability(r, g, b).ln() + 1e-10);

            let k = 50.0; // Edge capacity scaling factor

            match mask_output[idx] {
                GC_BACKGROUND => {
                    dinic.add_edge(source, idx, (k * fgd_prob) as i32);
                }
                GC_FG => {
                    dinic.add_edge(idx, sink, (k * bgd_prob) as i32);
                }
                GC_PR_BGD => {
                    dinic.add_edge(source, idx, (k * fgd_prob) as i32);
                    dinic.add_edge(idx, sink, (k * bgd_prob) as i32);
                }
                GC_PR_FGD => {
                    dinic.add_edge(source, idx, (k * fgd_prob) as i32);
                    dinic.add_edge(idx, sink, (k * bgd_prob) as i32);
                }
                _ => {}
            }
        }
    }

    // Add n-links (neighbor edges) for smoothness
    let beta = 0.5; // Smoothness parameter
    for y in 0..height {
        for x in 0..width {
            let idx = (y * width + x) as usize;

            // Right neighbor
            if x + 1 < width {
                let right_idx = (y * width + x + 1) as usize;
                let pixel_idx = idx * 4;
                let right_pixel_idx = right_idx * 4;

                let dist = color_distance(
                    input[pixel_idx],
                    input[pixel_idx + 1],
                    input[pixel_idx + 2],
                    input[right_pixel_idx],
                    input[right_pixel_idx + 1],
                    input[right_pixel_idx + 2],
                );

                let capacity = (50.0 * (-beta * dist).exp()) as i32;
                dinic.add_edge(idx, right_idx, capacity);
                dinic.add_edge(right_idx, idx, capacity);
            }

            // Bottom neighbor
            if y + 1 < height {
                let bottom_idx = ((y + 1) * width + x) as usize;
                let pixel_idx = idx * 4;
                let bottom_pixel_idx = bottom_idx * 4;

                let dist = color_distance(
                    input[pixel_idx],
                    input[pixel_idx + 1],
                    input[pixel_idx + 2],
                    input[bottom_pixel_idx],
                    input[bottom_pixel_idx + 1],
                    input[bottom_pixel_idx + 2],
                );

                let capacity = (50.0 * (-beta * dist).exp()) as i32;
                dinic.add_edge(idx, bottom_idx, capacity);
                dinic.add_edge(bottom_idx, idx, capacity);
            }
        }
    }

    // Run maxflow and determine segmentation
    dinic.max_flow(source, sink);

    // Update mask based on which side of cut pixels fall
    for idx in 0..num_pixels {
        if dinic.level[idx] >= 0 && dinic.level[idx] < dinic.level[sink] {
            mask_output[idx] = 255; // Foreground
        } else {
            mask_output[idx] = 0; // Background
        }
    }

    Ok(pixel_count)
}

/// Calculate Euclidean color distance
fn color_distance(r1: u8, g1: u8, b1: u8, r2: u8, g2: u8, b2: u8) -> f32 {
    let dr = r1 as f32 - r2 as f32;
    let dg = g1 as f32 - g2 as f32;
    let db = b1 as f32 - b2 as f32;
    (dr * dr + dg * dg + db * db).sqrt()
}
