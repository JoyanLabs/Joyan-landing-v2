/**
 * IMAGE → DOT-SCENE PIPELINE (WU18) — the pure core.
 * ============================================================================
 * The user's question was "how does an image become this style". The answer is
 * a short, measurable chain, and this module is that chain with the browser-safe
 * parts in ONE place so the Node bake and the live canvas cannot drift:
 *
 *   1. DECODE   raster bytes in memory (RGBA, straight alpha). The decode itself
 *               lives in `from-image.mjs` because it needs a rasteriser (the
 *               local `sharp`/librsvg); this module only ever sees pixels, so it
 *               runs unchanged in Node and in a browser.
 *   2. FIT      the image is CONTAINED inside the requested grid with a declared
 *               margin: `scale = min((1-2m)·cols/W, (1-2m)·rows/H)`, the art is
 *               centred, and its aspect ratio is preserved exactly (the same
 *               `scale` multiplies both axes, so W/H = drawnW/drawnH by algebra,
 *               not by rounding).
 *   3. MEASURE  one number per cell, with the mode CHOSEN, never guessed:
 *                 `ink`       a · (1 − luma) — how much ink a pixel lays down.
 *                             Transparent pixels carry no ink. Suits line art.
 *                 `luminance` the cell's own colour, alpha-composited over the
 *                             ground, measured as 1 − luma. Suits photographs.
 *               Each cell also keeps a representative colour, so a photograph's
 *               hue survives to the palette.
 *   4. MAP      the measured tone is NOT re-thresholded here. The scene emits a
 *               field whose luma is that measurement, and the engine's own
 *               `stepFor()` walks the MEASURED coverage ladder with the selected
 *               dither — the same ladder and dither the authored scene uses.
 *               Nothing in this file duplicates `engine.mjs` or `shapes.mjs`.
 *   5. COLOUR   either a named lab palette or a palette EXTRACTED from the image
 *               by deterministic median cut, with the ground declared as index 0.
 *               The engine's per-cell tone compensation then decides which entry
 *               each dot actually carries.
 *   6. EMIT     a plain scene object (`field`, `palette`, `ground`, geometry) the
 *               engine can render live and bake, plus a compact serialisation
 *               (`serializeScene`/`sceneFromSerialized`) so the SAME converted
 *               scene can travel to the laboratory page as data instead of as a
 *               second conversion. That is what keeps the Node raster and the
 *               live canvas byte-identical (the checker hashes both).
 *
 * THE FIT AND MEASURE RULES ARE STATEMENTS, NOT HABITS: `fitGrid().rule` and
 * `measureCells().rule` return the rule in words, and the checker asserts the
 * measured geometry against it. This file deliberately contains no `sharp`
 * import, so it can be imported by the browser runtime.
 *
 * Derived from no third-party code: the fit rule and both measurements are ours.
 * The measured coverage ladder, the dither and the palette compensation it maps
 * through belong to `engine.mjs`/`shapes.mjs` and are reused, not reimplemented.
 */
import { hexToRgb, luma } from './engine.mjs';

/** How a cell's tone is measured. Chosen explicitly with `--mode`. */
export const MEASURE_MODES = Object.freeze(['ink', 'luminance']);

/** How the scene's field is built: a scalar ladder, or the image's own colour. */
export const COLOR_MODES = Object.freeze(['levels', 'rgb']);

/** The fit rule, in words, as the module applies it. */
export const FIT_RULE =
  'contain + margin: scale = min((1 - 2·margin)·cols/W, (1 - 2·margin)·rows/H); the art is centred '
  + '(offset = (grid − drawn)/2 on each axis), so the aspect ratio W/H = drawnW/drawnH is preserved '
  + 'exactly and no drawn pixel falls outside the margin.';

/** The measurement rules, in words, one per mode. */
export const MEASURE_RULES = Object.freeze({
  ink: 'per cell, the area-weighted mean of α·(1 − luma): a pixel lays down ink in proportion to how '
    + 'opaque and how dark it is, so transparent pixels carry none. The cell colour is the ink colour '
    + 'it found, blended over the ground by that coverage.',
  luminance: 'per cell, the area-weighted mean of 1 − luma of the pixel alpha-composited over the '
    + 'ground, so a photograph keeps its own colour and its tone survives to the palette.',
});

/**
 * THE ANTI-MOIRÉ PREFILTER (WU19). The calibration target's fine diagonal hatch
 * aliased into a dominant dither block: detail finer than the cell lattice beats
 * against the sampling pitch instead of averaging into tone. The fix is to
 * low-pass the SOURCE to the lattice BEFORE the per-cell measurement, with a
 * support that follows the requested grid, so a high-frequency region converts
 * to its mean tone. Gaussian, σ = 0.75 × cell pitch, built as three box passes
 * of radius round(0.75·pitch) each (σ ≈ √3·boxσ, the standard box approximation),
 * premultiplied alpha so transparent art does not bleed colour, and unpremultiplied
 * afterwards. Deterministic, exact integer arithmetic on prefix sums, browser-safe.
 */
export const PREFILTER_RULE = 'gaussian matched to the cell pitch: three box passes of radius '
  + 'round(0.75·pitch) each (σ = 0.75·pitch), premultiplied alpha, applied before per-cell measurement '
  + 'so sub-lattice detail averages into tone instead of beating against the grid';

/** One separable box pass over straight-alpha RGBA, premultiplied, clamped edges. */
function boxPassRGBA(src, width, height, radius) {
  const tmp = new Float64Array(src.length);
  const out = new Float64Array(src.length);
  const line = (input, output, outer, inner, stride, innerStride) => {
    for (let o = 0; o < outer; o++) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;
      const window = 2 * radius + 1;
      for (let k = -radius; k <= radius; k++) {
        const i = Math.min(inner - 1, Math.max(0, k));
        const at = (o * stride + i * innerStride) * 4;
        sumR += input[at]; sumG += input[at + 1]; sumB += input[at + 2]; sumA += input[at + 3];
      }
      for (let i = 0; i < inner; i++) {
        const at = (o * stride + i * innerStride) * 4;
        output[at] = sumR / window; output[at + 1] = sumG / window; output[at + 2] = sumB / window; output[at + 3] = sumA / window;
        const addAt = (o * stride + Math.min(inner - 1, i + radius + 1) * innerStride) * 4;
        const subAt = (o * stride + Math.max(0, i - radius) * innerStride) * 4;
        sumR += input[addAt] - input[subAt];
        sumG += input[addAt + 1] - input[subAt + 1];
        sumB += input[addAt + 2] - input[subAt + 2];
        sumA += input[addAt + 3] - input[subAt + 3];
      }
    }
  };
  line(src, tmp, height, width, width, 1);
  line(tmp, out, width, height, 1, width);
  return out;
}

/**
 * The prefilter itself: straight-alpha RGBA in, straight-alpha RGBA out. The
 * `false` option reproduces the WU18 behaviour byte for byte, which is what
 * makes the before/after evidence honest rather than decorative.
 * @param {Uint8ClampedArray|Uint8Array|Buffer} rgba @param {number} width @param {number} height
 * @param {number} pitchPx source pixels per cell (1 / fit.scale)
 */
export function prefilterRgba(rgba, width, height, pitchPx) {
  if (!(pitchPx > 0)) return rgba;
  const radius = Math.max(1, Math.round(0.75 * pitchPx));
  const n = width * height;
  const pre = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) {
    const alpha = rgba[i * 4 + 3] / 255;
    pre[i * 4] = rgba[i * 4] * alpha;
    pre[i * 4 + 1] = rgba[i * 4 + 1] * alpha;
    pre[i * 4 + 2] = rgba[i * 4 + 2] * alpha;
    pre[i * 4 + 3] = rgba[i * 4 + 3];
  }
  let out = pre;
  for (let pass = 0; pass < 3; pass++) out = boxPassRGBA(out, width, height, radius);
  const res = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const alpha = out[i * 4 + 3] / 255;
    const inv = alpha > 1e-6 ? 1 / alpha : 0;
    res[i * 4] = out[i * 4] * inv;
    res[i * 4 + 1] = out[i * 4 + 1] * inv;
    res[i * 4 + 2] = out[i * 4 + 2] * inv;
    res[i * 4 + 3] = out[i * 4 + 3];
  }
  return res;
}

/**
 * AUTO-GAIN (WU19). Sparse line art measures light: the unicorn probe put 3.57%
 * of ink into cells whose 90th-percentile tone was 0.395, so almost everything
 * landed in the empty step and the drawing nearly vanished. The normalisation
 * lifts the measured tone so the drawing's own p90 reaches the ladder, without
 * touching art that is already dark or full-range.
 */
export const AUTO_GAIN_TARGET = 0.9;
export const AUTO_GAIN_MAX = 4.5;
// WU32 — the SPARSE gate: the gain applies only to sparse art (fewer than 25 %
// of the cells carrying ink). The documented rule was always
// "sparse-light-only", but the implementation gated on tone alone, so with the
// raised 0.9 target a full-range gradient (p90 0.78) gained +1.155. The gate
// makes the implementation match the rule: dense or full-range art (the
// gradient fixture, ~50 % inked) stays at gain 1; the sparse unicorn (~6 %
// inked) is lifted. Measured in docs/AUDITORIA-ESCENAS.md §WU32.
export const AUTO_GAIN_MAX_COVERAGE = 0.25;
export const AUTO_GAIN_RULE = 'per-image normalisation, SPARSE art only (inked coverage <= 0.25): '
  + 'gain = clamp(0.9 / p90, 1, 4.5) where p90 is the '
  + '90th percentile of the cells that carry ink (level > 0.05), so sparse light art reaches the ladder '
  + 'and dense, dark or full-range art stays at gain 1; the gain is recorded in the scene params and the serialisation';

/** The p90 of the inked cells of a measurement. */
export function inkedPercentile(levels, fraction = 0.9) {
  const inked = [...levels].filter((value) => value > 0.05).sort((a, b) => a - b);
  return inked.length ? inked[Math.floor(fraction * (inked.length - 1))] : 1;
}

/**
 * Apply an auto-gain to a measurement: levels scale up (clamped), rgb colours
 * move away from the ground by the same factor so hue survives. Returns NEW
 * arrays; the input measurement is not mutated.
 */
export function applyAutoGain(measure, groundRgb, gain) {
  const levels = new Float32Array(measure.levels.length);
  for (let i = 0; i < levels.length; i++) levels[i] = Math.min(1, measure.levels[i] * gain);
  const rgb = new Uint8ClampedArray(measure.rgb.length);
  for (let i = 0; i < measure.rgb.length / 3; i++) {
    for (let c = 0; c < 3; c++) {
      const ground = groundRgb[c] * 255;
      rgb[i * 3 + c] = ground + (measure.rgb[i * 3 + c] - ground) * gain;
    }
  }
  return { levels, rgb };
}

/**
 * TONE CAP (WU22). Auto-gain lifts sparse art by stretching EVERY tone, so the
 * dense overlapping-line core of a drawing (the unicorn's mid-body) saturates:
 * at the hero's measured gain 3.235 (160 × 80; the audit recorded 2,944 at
 * 200 × 100) the core's cells pile up at the top rung and the body reads as a
 * white dotted blob. The cap is a soft knee on the GAINED level: below the knee
 * nothing changes, above it the level is compressed linearly toward the
 * ceiling, so the body keeps gradation — large dots at several rungs, not one
 * blown-out mass — while sparse areas keep their lifted tone. Measured on the
 * fixture this round: cells at the top rung inside the dense core fall from 66
 * to 35, and the inked p90 stays at 0.698 (sparse art still reaches the ladder).
 */
export const TONE_CAP_KNEE = 0.6;
// WU32 — the ceiling STAYS at 0.86: raising it to 0.92 was measured and
// rejected — it weakened the WU22 white-core guard below its own 25 % cut
// (122 -> 102 top-rung cells) for almost no legibility gain (the subject lift
// comes from the WU32 auto-gain target, not from the cap). Measured and
// recorded in docs/AUDITORIA-ESCENAS.md §WU32.
export const TONE_CAP_CEILING = 0.86;
export const TONE_CAP_RULE = 'soft-knee per-image tone cap: levels above the knee 0.6 are compressed '
  + 'linearly toward the ceiling 0.86 (applied to the gained level, so it only ever touches the top of '
  + 'the range), keeping the dense core at several rungs instead of one blown-out top rung; sparse '
  + 'areas below the knee are untouched; toneCap: none reproduces the uncapped conversion';

/**
 * Apply the tone cap to a gained measurement: levels above the knee compress
 * toward the ceiling, and each cell colour's distance from the ground scales by
 * the SAME per-cell factor as its level, so hue survives exactly as the gain
 * preserves it. Returns NEW arrays; the input measurement is not mutated.
 */
export function applyToneCap(measure, groundRgb, knee = TONE_CAP_KNEE, ceiling = TONE_CAP_CEILING) {
  const ratio = (ceiling - knee) / (1 - knee);
  const levels = new Float32Array(measure.levels.length);
  const factors = new Float32Array(measure.levels.length);
  for (let i = 0; i < levels.length; i++) {
    const value = measure.levels[i];
    if (value > knee) {
      const capped = knee + (value - knee) * ratio;
      levels[i] = Math.min(1, capped);
      factors[i] = value > 1e-6 ? levels[i] / value : 1;
    } else {
      levels[i] = value;
      factors[i] = 1;
    }
  }
  const rgb = new Uint8ClampedArray(measure.rgb.length);
  for (let i = 0; i < levels.length; i++) {
    const factor = factors[i];
    for (let c = 0; c < 3; c++) {
      const ground = groundRgb[c] * 255;
      rgb[i * 3 + c] = ground + (measure.rgb[i * 3 + c] - ground) * factor;
    }
  }
  return { levels, rgb };
}

/** A named lab palette for image-derived scenes. Ground is index 0 everywhere. */
export const IMAGE_PALETTES = Object.freeze([
  Object.freeze({ id: 'ink', label: 'bone ink on ink', ground: 0,
    palette: Object.freeze(['#0b0b0c', '#17171a', '#2c2c31', '#55555c', '#8f8f96', '#c8c8cd', '#f4f2ed']) }),
  Object.freeze({ id: 'paper', label: 'ink on paper', ground: 0,
    palette: Object.freeze(['#efe7d6', '#c9bda3', '#9b8c6f', '#6b5f49', '#3f3a30', '#1d1b17', '#0b0b0c']) }),
  Object.freeze({ id: 'aurora', label: 'aurora on ink', ground: 0,
    palette: Object.freeze(['#05070c', '#08202a', '#0b4a52', '#128c86', '#2fd6b4', '#7ef0cf',
      '#2b4bd6', '#6f7cf0', '#b23bd6', '#f0e9ff']) }),
  // WU22 — the PAGE palette: the site's own tokens (docs/DESIGN.md — Visual
  // Token System) with the aurora greens/violets adapted to them plus one
  // combining accent (a warm rose, bridging the amber and the violet). Ground
  // is ink-950, the highlight is bone-50, the accent is the reserved amber.
  // Swappable in ONE place: pages reference PAGE_PALETTE_ID, never a literal.
  Object.freeze({ id: 'joyan-page', label: 'the page — ink ground, plomo greys, bone ink, amber and rose accents (WU22 user note: the aurora greens/violets did not match the page, so they are gone)',
    ground: 0,
    palette: Object.freeze(['#0b0b0c', '#131318', '#1c1d26', '#2b2c3a', '#4a4b60', '#74758c',
      '#a3a4b8', '#ffb000', '#ff5d73', '#d9d7d2', '#f4f2ed', '#fffdf8']) }),
  // WU50 — the H1 "Marea mineral" palette: the chosen direction. Seven steps from
  // the ink ground up to the celadón light, with the system accent (#94CCBB) as
  // the second-to-last mark. Used by the new page and by the transition band;
  // `joyan-page` stays untouched for the page that is being replaced.
  Object.freeze({ id: 'joyan-marea', label: 'Marea mineral — ink ground, petroleum to celadón, accent #94CCBB',
    ground: 0,
    palette: Object.freeze(['#10191C', '#183039', '#244C5B', '#3E7F87', '#5AA3A4', '#94CCBB', '#D5E5CF']) }),
]);

/** The palette the public page uses; swappable in one place (WU22). */
export const PAGE_PALETTE_ID = 'joyan-page';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Look up one image palette by id; the first (ink) is the fallback. */
export function imagePalette(id) {
  return IMAGE_PALETTES.find((entry) => entry.id === id) ?? IMAGE_PALETTES[0];
}

/**
 * The contain-plus-margin fit. Returns the rule in words beside the numbers, so
 * a caller cannot apply a different rule and still claim this one.
 * @param {number} width source pixels @param {number} height source pixels
 * @param {number} cols grid columns @param {number} rows grid rows
 * @param {number} [margin] fraction of each axis reserved on both sides
 */
export function fitGrid(width, height, cols, rows, margin = 0.04) {
  if (!(width > 0) || !(height > 0)) throw new Error(`fitGrid needs positive source pixels, got ${width}x${height}`);
  if (!(cols > 0) || !(rows > 0)) throw new Error(`fitGrid needs a positive grid, got ${cols}x${rows}`);
  const usable = 1 - 2 * margin;
  const scale = Math.min((usable * cols) / width, (usable * rows) / height);
  const drawnWidth = width * scale;
  const drawnHeight = height * scale;
  return {
    cols, rows, width, height, margin, scale,
    drawnWidth, drawnHeight,
    offsetX: (cols - drawnWidth) / 2,
    offsetY: (rows - drawnHeight) / 2,
    rule: FIT_RULE,
  };
}

/** Quantise a Float64/Float32 level array to the bytes the scene and the wire use. */
export function quantizeLevels(levels) {
  const out = new Uint8Array(levels.length);
  for (let i = 0; i < levels.length; i++) out[i] = Math.round(clamp01(levels[i]) * 255);
  return out;
}

/**
 * Measure every cell of a fitted image.
 *
 * @param {Uint8ClampedArray|Uint8Array|Buffer} rgba straight-alpha RGBA, 4 bytes/px
 * @param {number} width @param {number} height
 * @param {ReturnType<typeof fitGrid>} fit
 * @param {'ink'|'luminance'} mode chosen explicitly
 * @param {[number, number, number]} groundRgb the ground, in 0..1, used to composite
 * @param {{prefilter?: 'pitch'|false}} [options] WU19: the anti-moiré prefilter
 *   ('pitch', the default) or false to reproduce the WU18 behaviour byte for byte
 * @returns {{cols, rows, levels: Float32Array, rgb: Uint8ClampedArray, mode: string,
 *   rule: string, stats: object}}
 */
export function measureCells(rgba, width, height, fit, mode, groundRgb = [0, 0, 0], options = {}) {
  if (!MEASURE_MODES.includes(mode)) throw new Error(`unknown measure mode: ${mode}`);
  const prefilter = options.prefilter === undefined ? 'pitch' : options.prefilter;
  const source = prefilter === false
    ? rgba
    : prefilterRgba(rgba, width, height, 1 / fit.scale);
  const { cols, rows, scale, offsetX, offsetY } = fit;
  const inv = 1 / scale;
  const levels = new Float32Array(cols * rows);
  const rgb = new Uint8ClampedArray(cols * rows * 3);
  let inked = 0;
  let minLevel = 1;
  let maxLevel = 0;
  for (let cy = 0; cy < rows; cy++) {
    const sy0 = (cy - offsetY) * inv;
    const sy1 = sy0 + inv;
    const iy0 = Math.max(0, Math.floor(sy0));
    const iy1 = Math.min(height, Math.ceil(sy1));
    for (let cx = 0; cx < cols; cx++) {
      const sx0 = (cx - offsetX) * inv;
      const sx1 = sx0 + inv;
      const ix0 = Math.max(0, Math.floor(sx0));
      const ix1 = Math.min(width, Math.ceil(sx1));
      let weight = 0;
      let tone = 0;
      let cr = 0;
      let cg = 0;
      let cb = 0;
      let colourWeight = 0;
      for (let py = iy0; py < iy1; py++) {
        const wy = Math.min(sy1, py + 1) - Math.max(sy0, py);
        if (wy <= 0) continue;
        for (let px = ix0; px < ix1; px++) {
          const wx = Math.min(sx1, px + 1) - Math.max(sx0, px);
          if (wx <= 0) continue;
          const w = wx * wy;
          const at = (py * width + px) * 4;
          const alpha = source[at + 3] / 255;
          const r = source[at] / 255;
          const g = source[at + 1] / 255;
          const b = source[at + 2] / 255;
          let dark;
          let rr;
          let gg;
          let bb;
          if (mode === 'ink') {
            dark = alpha * (1 - luma(r, g, b));
            if (dark > 0) {
              cr += r * dark * w;
              cg += g * dark * w;
              cb += b * dark * w;
              colourWeight += dark * w;
            }
          } else {
            rr = r * alpha + groundRgb[0] * (1 - alpha);
            gg = g * alpha + groundRgb[1] * (1 - alpha);
            bb = b * alpha + groundRgb[2] * (1 - alpha);
            dark = 1 - luma(rr, gg, bb);
            cr += rr * w;
            cg += gg * w;
            cb += bb * w;
            colourWeight += w;
          }
          tone += dark * w;
          weight += w;
        }
      }
      const cell = cy * cols + cx;
      const level = weight > 0 ? tone / weight : 0;
      levels[cell] = clamp01(level);
      if (level > 0.05) inked += 1;
      if (level < minLevel) minLevel = level;
      if (level > maxLevel) maxLevel = level;
      let outR = groundRgb[0];
      let outG = groundRgb[1];
      let outB = groundRgb[2];
      if (colourWeight > 0 && weight > 0) {
        if (mode === 'ink') {
          // The ink the cell found, laid over the ground by the coverage it
          // measured: an empty cell stays ground, a full cell is pure ink.
          const ir = cr / colourWeight;
          const ig = cg / colourWeight;
          const ib = cb / colourWeight;
          outR = groundRgb[0] + (ir - groundRgb[0]) * level;
          outG = groundRgb[1] + (ig - groundRgb[1]) * level;
          outB = groundRgb[2] + (ib - groundRgb[2]) * level;
        } else {
          outR = cr / colourWeight;
          outG = cg / colourWeight;
          outB = cb / colourWeight;
        }
      }
      rgb[cell * 3] = Math.round(clamp01(outR) * 255);
      rgb[cell * 3 + 1] = Math.round(clamp01(outG) * 255);
      rgb[cell * 3 + 2] = Math.round(clamp01(outB) * 255);
    }
  }
  const stats = {
    cols, rows, mode, cells: cols * rows, inkedCells: inked, inkedFraction: inked / (cols * rows),
    minLevel, maxLevel, meanLevel: levels.reduce((sum, value) => sum + value, 0) / levels.length,
    fit: { scale, offsetX, offsetY, drawnWidth: fit.drawnWidth, drawnHeight: fit.drawnHeight, margin: fit.margin },
    prefilter: prefilter === false ? 'none' : `pitch (source px per cell ${(1 / scale).toFixed(2)}): ${PREFILTER_RULE}`,
  };
  return { cols, rows, levels, rgb, mode, rule: MEASURE_RULES[mode], stats };
}

/**
 * Deterministic median-cut palette extraction. No randomness, no iteration
 * budget: the box with the widest channel range is split at its median until
 * `count` boxes exist, then each box is averaged. The result is sorted by tone
 * so index 0 is the darkest entry — the ground the scene declares.
 * @param {Uint8ClampedArray} rgb cell colours, 3 bytes each
 * @param {number} [count] how many entries to extract
 */
export function extractPalette(rgb, count = 8) {
  const pixels = [];
  const total = rgb.length / 3;
  const stride = Math.max(1, Math.floor(total / 4096));
  for (let i = 0; i < total; i += stride) {
    pixels.push([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]);
  }
  if (pixels.length === 0) return ['#0b0b0c', '#f4f2ed'];
  let boxes = [pixels];
  while (boxes.length < count) {
    let best = -1;
    let bestRange = 0;
    let bestChannel = 0;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue;
      for (let c = 0; c < 3; c++) {
        let lo = 255;
        let hi = 0;
        for (const pixel of box) {
          if (pixel[c] < lo) lo = pixel[c];
          if (pixel[c] > hi) hi = pixel[c];
        }
        if (hi - lo > bestRange) {
          bestRange = hi - lo;
          best = i;
          bestChannel = c;
        }
      }
    }
    if (best < 0 || bestRange === 0) break;
    const box = boxes[best];
    box.sort((a, b) => a[bestChannel] - b[bestChannel]);
    const mid = box.length >> 1;
    boxes = [...boxes.slice(0, best), box.slice(0, mid), box.slice(mid), ...boxes.slice(best + 1)];
  }
  const averages = boxes.filter((box) => box.length > 0).map((box) => {
    const sum = [0, 0, 0];
    for (const pixel of box) {
      sum[0] += pixel[0];
      sum[1] += pixel[1];
      sum[2] += pixel[2];
    }
    return sum.map((value) => Math.round(value / box.length));
  });
  averages.sort((a, b) => luma(a[0] / 255, a[1] / 255, a[2] / 255) - luma(b[0] / 255, b[1] / 255, b[2] / 255));
  const hex = (value) => value.toString(16).padStart(2, '0');
  const unique = [...new Set(averages.map((entry) => `#${entry.map(hex).join('')}`))];
  return unique.length >= 4 ? unique : [...unique, '#f4f2ed'];
}

/** The loop constants of a converted scene. Every overlay assumes these. */
export const LOOP_SECONDS = 30;
export const SCENE_FPS = 12;

/**
 * Build a scene object from a measurement. The field returns the cell's colour
 * (rgb mode) or the quantised level as a grey (levels mode), so the ENGINE owns
 * the ladder, the dither and the palette compensation.
 */
export function sceneFromMeasurement(measure, options = {}) {
  const cols = measure.cols;
  const rows = measure.rows;
  const levels8 = quantizeLevels(measure.levels);
  const colorMode = options.colorMode ?? 'levels';
  if (!COLOR_MODES.includes(colorMode)) throw new Error(`unknown color mode: ${colorMode}`);
  const preset = options.palettePreset ?? null;
  const palette = preset ? [...preset.palette] : [...(options.palette ?? IMAGE_PALETTES[0].palette)];
  const ground = preset ? preset.ground : options.ground ?? 0;
  const gain = options.gain ?? 1;
  const params = {
    measure: measure.mode,
    colorMode,
    palette: options.paletteId ?? (preset ? preset.id : 'extract'),
    margin: measure.stats.fit.margin,
    grid: `${cols}×${rows}`,
    gain,
    prefilter: measure.stats.prefilter,
    ...(options.paramsExtra ?? {}),
  };
  const rgb = measure.rgb;
  const readCell = (x, y) => {
    const cx = x < 0 ? 0 : x >= cols ? cols - 1 : Math.floor(x);
    const cy = y < 0 ? 0 : y >= rows ? rows - 1 : Math.floor(y);
    return cy * cols + cx;
  };
  const field = colorMode === 'rgb'
    ? (x, y) => {
      const cell = readCell(x, y);
      return [rgb[cell * 3] / 255, rgb[cell * 3 + 1] / 255, rgb[cell * 3 + 2] / 255];
    }
    : (x, y) => {
      const value = levels8[readCell(x, y)] / 255;
      return [value, value, value];
    };
  return {
    id: options.id ?? 'image-scene',
    label: options.label ?? 'a local image converted to the dot scene',
    cols, rows,
    fps: options.fps ?? SCENE_FPS,
    cycleFrames: options.cycleFrames ?? LOOP_SECONDS * (options.fps ?? SCENE_FPS),
    posterFrame: options.posterFrame ?? 0,
    palette, ground,
    groundHex: palette[ground],
    params,
    field,
    converted: {
      measure,
      colorMode,
      levels8,
      rgb,
      paletteSource: options.paletteId ?? (preset ? preset.id : 'extract'),
    },
  };
}

/**
 * The whole pure conversion: pixels in, `{ scene, measure, fit, serialized }` out.
 * `palette` is a named `IMAGE_PALETTES` id or the literal `extract`.
 */
export const DEFAULT_EXTRACT_COUNT = 16;

/**
 * The whole pure conversion: pixels in, `{ scene, measure, fit, serialized }` out.
 * `palette` is a named `IMAGE_PALETTES` id or the literal `extract`.
 *
 * WU19 options: `prefilter` ('pitch' by default — the anti-moiré prefilter;
 * `false` reproduces WU18) and `autoGain` ('auto' by default — the per-image
 * normalisation; 'none' leaves the raw measurement). The gain is recorded in
 * the scene params and therefore in the serialisation.
 */
export function convertRgba(rgba, width, height, options = {}) {
  const cols = options.cols ?? 200;
  const rows = options.rows ?? 100;
  const mode = options.mode ?? 'ink';
  const colorMode = options.colorMode ?? 'levels';
  const margin = options.margin ?? 0.04;
  const fit = fitGrid(width, height, cols, rows, margin);
  const paletteId = options.palette ?? 'ink';
  const preset = paletteId === 'extract' ? null : imagePalette(paletteId);
  const groundRgb = preset ? hexToRgb(preset.palette[preset.ground]) : [0, 0, 0];
  const measure = measureCells(rgba, width, height, fit, mode, groundRgb, { prefilter: options.prefilter });
  // Auto-gain (WU19): the normalisation is measured from the PREFILTERED levels,
  // so it also compensates the softening the prefilter applies to sparse art.
  const autoGain = options.autoGain === undefined ? 'auto' : options.autoGain;
  if (autoGain !== 'auto' && autoGain !== 'none') throw new Error(`unknown autoGain: ${autoGain}`);
  // TONE CAP (WU22): the soft knee that keeps a dense overlapping-line core
  // from saturating into one blown-out top rung. 'none' reproduces the uncapped
  // conversion, which is what makes the before/after evidence honest.
  const toneCap = options.toneCap === undefined ? 'auto' : options.toneCap;
  if (toneCap !== 'auto' && toneCap !== 'none') throw new Error(`unknown toneCap: ${toneCap}`);
  const p90 = inkedPercentile(measure.levels);
  const inkedCount = measure.levels.reduce((sum, value) => sum + (value > 0.05 ? 1 : 0), 0);
  const inkedFraction = inkedCount / Math.max(1, measure.levels.length);
  const gain = autoGain === 'none' ? 1
    : inkedFraction > AUTO_GAIN_MAX_COVERAGE ? 1
      : Math.min(AUTO_GAIN_MAX, Math.max(1, AUTO_GAIN_TARGET / Math.max(1e-6, p90)));
  const stats = { ...measure.stats, gain, autoGain: AUTO_GAIN_RULE,
    toneCap: toneCap === 'none' ? 'none' : TONE_CAP_RULE };
  const measured = { ...measure, stats };
  let sceneMeasure = measured;
  if (gain > 1) {
    const lifted = applyAutoGain(measure, groundRgb, gain);
    sceneMeasure = { ...measured, levels: lifted.levels, rgb: lifted.rgb };
  }
  if (toneCap === 'auto') {
    const capped = applyToneCap(sceneMeasure, groundRgb);
    sceneMeasure = { ...sceneMeasure, levels: capped.levels, rgb: capped.rgb };
  }
  let sceneInput;
  if (preset) {
    sceneInput = { palettePreset: preset, paletteId: preset.id };
  } else {
    const palette = extractPalette(measure.rgb, options.paletteCount ?? DEFAULT_EXTRACT_COUNT);
    sceneInput = { palette, ground: 0, paletteId: `extract:${palette.length}` };
  }
  const scene = sceneFromMeasurement(sceneMeasure, {
    ...sceneInput, colorMode, id: options.id ?? 'image-scene', label: options.label,
    fps: options.fps, cycleFrames: options.cycleFrames, posterFrame: options.posterFrame,
    gain,
    paramsExtra: { toneCap: toneCap === 'none' ? 'none' : `auto (knee ${TONE_CAP_KNEE}, ceiling ${TONE_CAP_CEILING})` },
  });
  return { scene, measure: measured, fit, serialized: serializeScene(scene), palette: scene.palette };
}

/** base64 of a byte array, in Node and in a browser, without a dependency. */
function toBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(text) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(text, 'base64'));
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * The compact, deterministic serialisation of a converted scene. Only what the
 * runtime needs, and only bytes the pipeline already quantised, so decoding
 * cannot drift from what was measured.
 */
export function serializeScene(scene) {
  const encoded = scene.converted;
  const payload = {
    id: scene.id,
    label: scene.label,
    cols: scene.cols,
    rows: scene.rows,
    fps: scene.fps,
    cycleFrames: scene.cycleFrames,
    posterFrame: scene.posterFrame,
    palette: [...scene.palette],
    ground: scene.ground,
    groundHex: scene.groundHex,
    colorMode: encoded.colorMode,
    paletteSource: encoded.paletteSource,
    params: { ...scene.params },
    levels: toBase64(encoded.levels8),
  };
  if (encoded.colorMode === 'rgb') payload.rgb = toBase64(encoded.rgb);
  return payload;
}

/**
 * ROLL (WU22) — place the subject horizontally inside the grid by wrapping the
 * columns of an ALREADY-SERIALIZED scene. The page composes the unicorn to the
 * centre-right so the top-left stays dark for the copy; the roll is part of the
 * build-time recipe, so the Node bake, the checker and the live canvas all draw
 * the SAME placed scene (the runtime receives the rolled payload verbatim).
 * Pure: returns a NEW payload; the input is not mutated.
 */
export function rollSerializedScene(payload, shift) {
  const cols = payload.cols;
  const rows = payload.rows;
  if (!Number.isInteger(shift) || shift === 0 || cols < 2) return payload;
  const roll = (bytes) => {
    const out = new Uint8Array(bytes.length);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        out[y * cols + ((x + shift) % cols + cols) % cols] = bytes[y * cols + x];
      }
    }
    return out;
  };
  const levels = roll(fromBase64(payload.levels));
  const next = { ...payload, levels: toBase64(levels) };
  if (payload.rgb) next.rgb = toBase64(roll(fromBase64(payload.rgb)));
  return next;
}

/** Rebuild a scene from `serializeScene` output. Pure: the runtime uses this. */
export function sceneFromSerialized(payload) {
  const cols = payload.cols;
  const rows = payload.rows;
  const levels8 = fromBase64(payload.levels);
  const rgb = payload.rgb ? fromBase64(payload.rgb) : null;
  const readCell = (x, y) => {
    const cx = x < 0 ? 0 : x >= cols ? cols - 1 : Math.floor(x);
    const cy = y < 0 ? 0 : y >= rows ? rows - 1 : Math.floor(y);
    return cy * cols + cx;
  };
  const field = payload.colorMode === 'rgb' && rgb
    ? (x, y) => {
      const cell = readCell(x, y);
      return [rgb[cell * 3] / 255, rgb[cell * 3 + 1] / 255, rgb[cell * 3 + 2] / 255];
    }
    : (x, y) => {
      const value = levels8[readCell(x, y)] / 255;
      return [value, value, value];
    };
  return {
    id: payload.id,
    label: payload.label,
    cols, rows,
    fps: payload.fps,
    cycleFrames: payload.cycleFrames,
    posterFrame: payload.posterFrame,
    palette: [...payload.palette],
    ground: payload.ground,
    groundHex: payload.groundHex,
    params: { ...(payload.params ?? {}) },
    field,
    converted: { colorMode: payload.colorMode, levels8, rgb, paletteSource: payload.paletteSource },
  };
}

/** The whole image→scene recipe, numbered, as the docs and the CLI both print it. */
export const PIPELINE_RECIPE = Object.freeze([
  'decode: rasterise the input to straight-alpha RGBA (SVG via sharp/librsvg, PNG/JPEG raw); no network URL is ever accepted',
  'fit: contain inside the grid with a 4% margin; scale = min((1-2m)·cols/W, (1-2m)·rows/H); centred; aspect exact',
  'measure: per cell, area-weighted ink (α·(1-luma)) for line art, or luminance (1-luma of the composited cell) for photographs',
  'map: hand the measurement to the engine as field luma; engine.stepFor() walks the MEASURED coverage ladder with the selected dither',
  'colour: a named palette from IMAGE_PALETTES, or a median-cut extraction from the image; ground is index 0 and declared',
  'emit: a scene object (field/palette/ground/geometry) that renderFrame and rasterize accept live and in the bake',
  'serialise: serializeScene()/sceneFromSerialized() carry the quantised measurement so the canvas draws the same conversion',
  'overlay: composable overlays (stars, aurora, grain, glimmer) are periodic by construction and wrap the scene field',
]);
