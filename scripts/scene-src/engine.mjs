/**
 * JOYAN DOT-SCENE ENGINE — our engine, our art.
 * ============================================================================
 * One engine, two outputs that must agree: the Node raster path (no browser,
 * no canvas) and the live browser canvas path call the same functions and, for
 * the same frame, must produce the same bytes. That is what makes a baked hero
 * still and a live hero canvas the same art rather than two lookalikes.
 *
 * THE VISUAL LANGUAGE, as code:
 *
 *   cells      square. One cell is one unit on both axes; `DELIVERY_CELL` is
 *              how many square pixels one cell occupies on screen and in the
 *              baked file.
 *   ramp       ` ·•●` — three dot sizes and no ink. Never ASCII glyph art: no
 *              font, no glyph, no per-character shading. A scene may not bring
 *              its own characters.
 *   coverage   the tone each dot actually covers, MEASURED from the raster mask
 *              (`sceneMetrics().coverage`), not assumed. The ramp's tone ladder
 *              is derived from it, so the curve that maps field luminance to a
 *              ramp step is the same curve that paints the dots.
 *   dither     ordered 4x4 Bayer. A level between two rungs is split spatially
 *              between those two neighbouring steps; it never jumps further.
 *   palette    one indexed palette per scene. The engine normalises the field
 *              against the scene's own palette range and then, per cell, picks
 *              the palette entry whose RENDERED tone — the colour times the dot
 *              coverage plus the ground showing through — is closest to what the
 *              field asked for. Dark ink on a dark ground is therefore not a
 *              rendering bug but a solved selection: a dark entry loses to a
 *              brighter one whenever the dot is too small to carry the tone.
 *   noise      hash noise: a pure function of (x, y, seed). No Math.random, no
 *              time, no accumulated state, so a frame is reproducible exactly.
 *
 * LINEAGE AND LICENCE. Three kinds of material live in this file, and the
 * checker fails if they stop being distinguishable:
 *
 *   PUBLISHED STANDARD MATERIAL, used as the published algorithm:
 *     - the canonical 4x4 ordered-dither matrix (Bayer, 1973);
 *     - the Rec.709 luma coefficients (ITU-R BT.709), used for BOTH the tone
 *       model and the chroma term of the palette selection, so one published
 *       convention governs both;
 *     - the quintic fade and bilinear blending used by the lattice noise
 *       (Perlin's improved noise, 2002).
 *   Nothing in this group is ours and nothing in this group was taken from
 *   `ascii.rest`; it is common practice that every implementation shares.
 *
 *   IDEAS LEARNED from `ascii.rest@0.4.0` (MIT, bas3line) and REIMPLEMENTED
 *   here without copying code: a dot ramp as a tone ladder with an ordered
 *   dither; per-cell colour compensation for how much ink a dot actually lays
 *   down; deterministic integer hash noise; a per-scene indexed palette with a
 *   declared ground. The library is the reference this unit was asked to compare
 *   against, and it keeps its own MIT notice in its installed package.
 *
 *   OURS: `mix32` (our constants, our lane order and our shift schedule — a
 *   rotate-multiply mix in the published MurmurHash3/SplitMix family, not their
 *   constants); `latticeNoise`/`layeredNoise` (a two-axis wrapping lattice with
 *   a per-octave seed stride and nested-lerp blending, which is NOT the
 *   library's one-period `noise(x, y, period)` shape); the coverage ladder
 *   derived from our measured mask; the rendered-tone error minimisation that
 *   chooses the palette entry; the dot masks; the scene, its palette and the
 *   bake path; and every check.
 *
 *   No line of this file is copied from `ascii.rest`, nothing is imported from
 *   it, and none of its mixing constants appear here (the checker asserts all
 *   three). MIT would permit reuse with notice; we did not reuse code, and we do
 *   not claim to have invented the published material above. What we
 *   deliberately did NOT adopt: the library's scene catalogue (weight), its
 *   per-scene colour literals as our art, and any vendored art. See
 *   `docs/MOTOR-ESCENAS.md` for the full adoption/rejection list.
 *
 * LIMITS (measured, stated, not hidden): the tone model is a display-space
 * luma, not colorimetric linear light; the dot mask is supersampled rather than
 * analytically anti-aliased; and the engine has no colour management.
 */

/** The only inked ramp. Index 0 is an empty cell. Dots, never ASCII art. */
export const RAMP = ' ·•●';

/** One cell is one square unit. The library's scenes use the same convention. */
export const CELL = 1;

/** How many square pixels one cell occupies in the canvas and the baked file. */
export const DELIVERY_CELL = 4;

/**
 * The authored coverage curve: how much of a cell each dot fills. The checker
 * requires these numbers to match the dot area the raster mask actually paints,
 * so the curve cannot drift away from the art.
 */
export const COVERAGE = Object.freeze([0, 0.24, 0.5, 0.79]);

/** Drawn radius of each dot, as a fraction of the cell's half width. */
export const STEP_RADIUS = Object.freeze([0, 0.55, 0.8, 1]);

/** Ordered 4x4 Bayer matrix in scan order. Thresholds are (v + 0.5) / 16. */
// Published standard material: the canonical 4x4 ordered-dither matrix
// (Bayer, 1973). It is the same matrix in every implementation; we use it as
// the published algorithm, not as something learned from the reference library.
const BAYER4 = Object.freeze([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);

/** Sub-samples per pixel axis when measuring a dot's area. */
const MASK_SAMPLES = 4;

/** Weights of the palette selection (see `compensate`). */
const TONE_WEIGHT = 1;
const CHROMA_WEIGHT = 1.4;

// Rec.709 luma coefficients (ITU-R BT.709). Published standard material, used
// for the tone model AND for the chroma distance, so both speak one convention.
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Display tone of an [r,g,b] triple in 0..1. One space for the whole engine:
 * the coverage curve, the palette and the field all speak this tone.
 * @param {number} r @param {number} g @param {number} b
 */
export const luma = (r, g, b) => LUMA_R * r + LUMA_G * g + LUMA_B * b;

/** @param {[number, number, number] | number[]} rgb */
export const tone = (rgb) => luma(rgb[0], rgb[1], rgb[2]);

/** `#rrggbb` as three channels in 0..1. @param {string} hex */
export function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

/**
 * MIX32 — our own 32-bit mixing function.
 *
 * Construction, stated exactly: three odd multipliers over three input lanes,
 * XORed together; a 17-bit fold multiplied again; a 13-bit left rotation; an
 * 11-bit fold multiplied again; and a final 16-bit fold. The rotate-multiply
 * shape belongs to the published MurmurHash3 / SplitMix family (public-domain
 * practice), but the constants below, the lane order and the shift schedule are
 * ours and are not the reference library's.
 */
const MIX_A = 0x2f1b3d5f;
const MIX_B = 0x6a4f9c17;
const MIX_C = 0x1d8e5b93;
const ROTATE = 13;

function mix32(a, b, c) {
  let h = Math.imul(a | 0, MIX_A) ^ Math.imul(b | 0, MIX_B) ^ Math.imul(c | 0, MIX_C);
  h = Math.imul(h ^ (h >>> 17), MIX_B);
  h = (h << ROTATE) | (h >>> (32 - ROTATE));
  h = Math.imul(h ^ (h >>> 11), MIX_C);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Deterministic hash noise in [0, 1). A pure function of the coordinates and
 * the seed: the same cell, step or seed gives the same number in Node and in
 * every browser, which is what lets a frame be reproduced byte for byte.
 * @param {number} x @param {number} y @param {number} seed
 */
export function hashNoise(x, y, seed) {
  return mix32(x, y, seed);
}

// ---------------------------------------------------------------------------
// Lattice noise. Ours: a two-axis WRAPPING lattice with a per-octave seed
// stride and nested-lerp blending. The published parts are the quintic fade and
// bilinear blending (Perlin, 2002); the wrap model, the seed stride and the
// driver below are not the reference library's shape.
// ---------------------------------------------------------------------------

/** No wrap on an axis: the lattice is infinite in that direction. */
const NO_WRAP = 0;

/** Published quintic fade (Perlin's improved noise, 2002). */
const fade = (f) => f * f * f * (f * (f * 6 - 15) + 10);

const lerp = (a, b, k) => a + (b - a) * k;

/** Lattice period normalisation: 0 stays infinite, anything else wraps. */
const wrapLattice = (value, period) => (period > 0 ? ((value % period) + period) % period : value);

/**
 * Value noise on an integer lattice, wrapping every `wrapX`/`wrapY` lattice
 * units (0 = that axis never repeats).
 *
 * The wrap is what makes a loop possible: an animated offset that is a whole
 * number of wraps at the end of the cycle lands on exactly the same lattice, so
 * the field is periodic by construction rather than by luck.
 * @param {number} x @param {number} y @param {number} seed
 * @param {number} wrapX @param {number} wrapY
 */
export function latticeNoise(x, y, seed, wrapX = NO_WRAP, wrapY = NO_WRAP) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const ux = fade(x - xi);
  const uy = fade(y - yi);
  const x0 = wrapLattice(xi, wrapX);
  const x1 = wrapX > 0 ? (x0 + 1) % wrapX : xi + 1;
  const y0 = wrapLattice(yi, wrapY);
  const y1 = wrapY > 0 ? (y0 + 1) % wrapY : yi + 1;
  const near = lerp(hashNoise(x0, y0, seed), hashNoise(x1, y0, seed), ux);
  const far = lerp(hashNoise(x0, y1, seed), hashNoise(x1, y1, seed), ux);
  return lerp(near, far, uy);
}

/** Two octaves is enough for cloud and rock at this grid. */
const LAYER_DEFAULTS = Object.freeze({ octaves: 2, wrapX: NO_WRAP, wrapY: NO_WRAP, lacunarity: 2, gain: 0.5 });
/** Each octave gets its own seed so the layers do not correlate. */
const OCTAVE_STRIDE = 0x9d;

/**
 * Layered value noise: a normalised weighted sum of `latticeNoise` octaves.
 * Each octave doubles the frequency and halves the amplitude by default, and
 * each octave carries its own wrap (scaled with its frequency) so the whole
 * stack stays periodic together.
 * @param {number} x @param {number} y @param {number} seed
 * @param {{octaves?: number, wrapX?: number, wrapY?: number, lacunarity?: number, gain?: number}} [options]
 */
export function layeredNoise(x, y, seed, options = LAYER_DEFAULTS) {
  const octaves = options.octaves ?? LAYER_DEFAULTS.octaves;
  const wrapX = options.wrapX ?? NO_WRAP;
  const wrapY = options.wrapY ?? NO_WRAP;
  const lacunarity = options.lacunarity ?? LAYER_DEFAULTS.lacunarity;
  const gain = options.gain ?? LAYER_DEFAULTS.gain;
  let frequency = 1;
  let amplitude = 1;
  let weighted = 0;
  let total = 0;
  for (let octave = 0; octave < octaves; octave++) {
    weighted += amplitude * latticeNoise(x * frequency, y * frequency, seed + octave * OCTAVE_STRIDE,
      wrapX * frequency, wrapY * frequency);
    total += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return weighted / total;
}

/**
 * The tone the ramp can actually reach, normalised to the largest dot. Built
 * from the MEASURED coverage, so the curve that decides where a ramp step begins
 * is the same curve the raster paints. `COVERAGE` above stays the authored
 * intent and is required to match this measurement.
 */
export function rampLadder() {
  const full = MEASURED_COVERAGE[3];
  return MEASURED_COVERAGE.map((coverage) => coverage / full);
}

/**
 * Ordered Bayer threshold for a cell, in [0, 1). Used as the dither position:
 * a level between two ladder rungs is spent spatially between them.
 * @param {number} x @param {number} y
 */
export function bayerThreshold(x, y) {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/**
 * The coverage curve mapping a field level to a ramp step. `level` is the
 * field's tone already normalised against the scene's palette range, 0..1.
 * @param {number} level @param {number} x @param {number} y
 */
export function stepFor(level, x, y) {
  const ladder = LADDER;
  let step = 0;
  while (step < ladder.length - 1 && level >= ladder[step + 1]) step += 1;
  if (step === ladder.length - 1) return step;
  const span = ladder[step + 1] - ladder[step];
  const position = span > 0 ? (level - ladder[step]) / span : 1;
  return position > bayerThreshold(x, y) ? step + 1 : step;
}
/** Dot area per step, measured from the masks at the delivery cell size. */
const MEASURED_COVERAGE = [0, measuredCoverage(1, DELIVERY_CELL), measuredCoverage(2, DELIVERY_CELL),
  measuredCoverage(3, DELIVERY_CELL)];
const LADDER = rampLadder();

/**
 * The per-cell coverage mask of one dot, supersampled. Computed once per
 * (step, cell) and shared by both output paths, so the Node raster and the live
 * canvas cannot drift apart.
 * @param {number} step @param {number} size
 */
export function discMask(step, size, samples = MASK_SAMPLES) {
  const mask = new Float64Array(size * size);
  const radius = STEP_RADIUS[step] * (size / 2);
  if (!(radius > 0)) return mask;
  const centre = size / 2;
  const per = samples * samples;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const dx = px + (sx + 0.5) / samples - centre;
          const dy = py + (sy + 0.5) / samples - centre;
          if (dx * dx + dy * dy <= radius * radius) hits += 1;
        }
      }
      mask[py * size + px] = hits / per;
    }
  }
  return mask;
}

/** Mean coverage of a dot mask: the curve, measured rather than asserted. */
function measuredCoverage(step, size) {
  const mask = discMask(step, size);
  let sum = 0;
  for (let i = 0; i < mask.length; i++) sum += mask[i];
  return sum / mask.length;
}

const METRICS = new WeakMap();

/**
 * Everything the engine derives from a scene's palette and dots. Cached per
 * scene object so the browser loop does not rebuild it per frame.
 *
 * - `coverage`  measured dot area per step
 * - `ladder`    the ramp's tone ladder derived from that coverage
 * - `headroom`  rendered tone each step can carry over the ground
 * - `groundTone`, `maxTone`  the palette's own range, which the field is
 *   normalised against so a dark palette does not collapse onto step 0
 * @param {object} scene
 */
export function sceneMetrics(scene) {
  const cached = METRICS.get(scene);
  if (cached) return cached;
  const colors = scene.palette.map(hexToRgb);
  const ground = colors[scene.ground];
  const tones = colors.map(tone);
  const groundTone = tones[scene.ground];
  const maxTone = Math.max(...tones);
  const coverage = MEASURED_COVERAGE;
  const ladder = LADDER;
  const headroom = coverage.map((value) => groundTone + (maxTone - groundTone) * value);
  const metrics = { colors, ground, tones, groundTone, maxTone, coverage, ladder, headroom };
  metrics.groundIndex = scene.ground;
  METRICS.set(scene, metrics);
  return metrics;
}

/**
 * Palette compensation. The dot chosen for a cell only lays down `coverage[step]`
 * of ink, so the ink itself has to make up the difference. This picks the
 * palette entry whose RENDERED tone is closest to what the field asked for while
 * still looking as much like the field's colour as the ink allows: a small dot
 * is pushed toward a brighter entry, a large dot toward a dimmer one, and a
 * colour no palette entry can reach is approximated in tone first.
 * @param {object} scene @param {number} r @param {number} g @param {number} b
 * @param {number} step
 */
export function compensate(scene, r, g, b, step, metrics = sceneMetrics(scene)) {
  const coverage = metrics.coverage[step];
  const targetTone = luma(r, g, b);
  const wanted = metrics.groundTone + (targetTone - metrics.groundTone) * coverage;
  let best = scene.ground;
  let bestScore = Infinity;
  for (let i = 0; i < metrics.colors.length; i++) {
    const entry = metrics.colors[i];
    const rendered = metrics.groundTone + (metrics.tones[i] - metrics.groundTone) * coverage;
    const toneError = Math.abs(rendered - wanted);
    const dr = (entry[0] - r) * coverage;
    const dg = (entry[1] - g) * coverage;
    const db = (entry[2] - b) * coverage;
    // Chroma distance weighted by the published Rec.709 coefficients, the same
    // convention the tone model uses.
    const chromaError = Math.sqrt(LUMA_R * dr * dr + LUMA_G * dg * dg + LUMA_B * db * db);
    const score = toneError * TONE_WEIGHT + chromaError * CHROMA_WEIGHT;
    if (score < bestScore - 1e-12) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/**
 * Render one frame of a scene into palette indices and ramp steps. Pure: the
 * same (scene, frame) pair always produces the same arrays, in Node and in the
 * browser alike.
 * @param {object} scene @param {number} frame
 */
export function renderFrame(scene, frame) {
  const { cols, rows, cycleFrames } = scene;
  const metrics = sceneMetrics(scene);
  const index = ((Math.floor(frame) % cycleFrames) + cycleFrames) % cycleFrames;
  const time = index / scene.fps;
  const span = Math.max(1e-6, metrics.maxTone - metrics.groundTone);
  const total = cols * rows;
  const steps = new Uint8Array(total);
  const indices = new Uint8Array(total);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const got = scene.field(x, y, time);
      const r = typeof got === 'number' ? got : got[0];
      const g = typeof got === 'number' ? got : got[1];
      const b = typeof got === 'number' ? got : got[2];
      const level = clamp01((luma(r, g, b) - metrics.groundTone) / span);
      const step = stepFor(level, x, y);
      const cell = y * cols + x;
      steps[cell] = step;
      indices[cell] = step === 0 ? scene.ground : compensate(scene, r, g, b, step, metrics);
    }
  }
  return { scene: scene.id, frame: index, time, cols, rows, steps, indices };
}

/**
 * The frame as ramp characters, one per cell. Used by the checks (and by any
 * future text consumer); the paint paths never draw glyphs.
 * @param {{cols: number, rows: number, steps: Uint8Array}} frame
 */
export function frameChars(frame) {
  const lines = [];
  for (let y = 0; y < frame.rows; y++) {
    let line = '';
    for (let x = 0; x < frame.cols; x++) line += RAMP[frame.steps[y * frame.cols + x]];
    lines.push(line);
  }
  return lines.join('\n');
}

/**
 * Paint a frame to RGBA at `cell` pixels per cell. Every pixel is a blend
 * between the ground and one palette entry, which is why the baked file and the
 * live canvas can be compared byte for byte.
 * @param {{cols: number, rows: number, steps: Uint8Array, indices: Uint8Array}} frame
 * @param {object} scene @param {number} cell
 */
export function rasterize(frame, scene, cell = DELIVERY_CELL) {
  const metrics = sceneMetrics(scene);
  const masks = [null, discMask(1, cell), discMask(2, cell), discMask(3, cell)];
  const width = frame.cols * cell;
  const height = frame.rows * cell;
  const out = new Uint8ClampedArray(width * height * 4);
  const ground = metrics.colors[metrics.groundIndex];
  for (let y = 0; y < frame.rows; y++) {
    for (let x = 0; x < frame.cols; x++) {
      const cellIndex = y * frame.cols + x;
      const mask = masks[frame.steps[cellIndex]];
      const ink = metrics.colors[frame.indices[cellIndex]];
      for (let py = 0; py < cell; py++) {
        for (let px = 0; px < cell; px++) {
          const at = ((y * cell + py) * width + (x * cell + px)) * 4;
          const coverage = mask ? mask[py * cell + px] : 0;
          out[at] = Math.round((ground[0] + (ink[0] - ground[0]) * coverage) * 255);
          out[at + 1] = Math.round((ground[1] + (ink[1] - ground[1]) * coverage) * 255);
          out[at + 2] = Math.round((ground[2] + (ink[2] - ground[2]) * coverage) * 255);
          out[at + 3] = 255;
        }
      }
    }
  }
  return out;
}
