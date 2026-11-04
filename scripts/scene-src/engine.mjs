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
 *   ADOPTED CODE, listed in `scripts/scene-src/adoption-ledger.json` with the
 *   source file it came from: the cell-sprite atlas in `rasterize` (build one
 *   finished cell per ramp step and ink once, then copy it per cell) is adapted
 *   from the glyph atlas in `ascii.rest/dist/mount.js`. The ledger records the
 *   adaptation and the upstream file, and the retained MIT notice lives in
 *   `scripts/scene-src/ascii.rest-LICENSE`. What we improved beyond the original:
 *   the sprite is keyed by (ramp step, palette ink) rather than (glyph, colour)
 *   and is never evicted, because the set is bounded by the palette; and the
 *   same sprite feeds the Node bake path and the live canvas, so the atlas
 *   cannot make the two outputs disagree. The checker fails if a ledger entry
 *   names code that is not there, or if library-derived material appears in the
 *   engine without a ledger entry.
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
 *   Nothing of the library is imported at runtime, and none of its mixing
 *   constants appear here (the checker asserts that too). We do not claim to
 *   have invented the published material above, and we credit the adopted
 *   material above. What we deliberately did NOT adopt: the library's scene
 *   catalogue (weight), its per-scene colour literals as our art, any vendored
 *   art, and its font glyphs — our dots are analytic discs, not characters, so
 *   they do not depend on a font being installed. See `docs/MOTOR-ESCENAS.md`
 *   for the full adoption/rejection list.
 *
 * WHY THE DOTS ARE ROUND. A dot is the exact area of an anti-aliased disc, not
 * a supersampled one and not a square: a level of coverage 0.81 is a disc of
 * radius 0.51 of a cell, so the largest step is the inscribed disc and every
 * step keeps a round rim (the four corner pixels of a cell stay much darker than
 * its four edge pixels). The WU15 mask was supersampled 4x4 at 4 px per cell,
 * and at that size the arithmetic over-covered the disc (measured 0.8125 where
 * the disc is 0.7854) and the smallest dot collapsed into a hard 2x2 square;
 * the supersampled disc and the nearest-neighbour display scale, not the shape
 * function, were what made the dots read as blocks.
 *
 * THE MASK IS NOW A CHOICE (WU17). The user's decision was that squares also
 * look good and there may be other shapes, so the engine no longer hard-codes
 * the disc. `maskFor(shape, step, w, h, ramp, geometry)` draws any mask from
 * `scripts/scene-src/shapes.mjs`, and `renderFrame`/`rasterize` take an options
 * object that selects the mask (shape), the ramp family, the dither mode and the
 * cell geometry. Every option keeps the one invariant this engine is built on:
 * the Node raster and the live canvas produce the same bytes for the same
 * frame. The DEFAULT options resolve to the WU16 disc on 1:1 cells with ordered
 * 4x4 Bayer dithering, so the scene, the bake and every recorded hash are
 * unchanged; the study options are laboratory-only and never reach a real page.
 *
 * LIMITS (measured, stated, not hidden): the tone model is a display-space
 * luma, not colorimetric linear light; the dot radius is derived from the
 * measured coverage ladder by bisection, so it is exact for this mask and not a
 * closed form; and the engine has no colour management.
 */

import {
  ALL_DITHER_MODES, BAYER2, BAYER4, CELL_GEOMETRIES, DITHER_MODES, LADDER as COVERAGE_LADDER, RAMP_MODES,
  SHAPES, buildMask, cellSizeFor, discAreaIn, ditherThreshold, effectiveShape, maskDerivation,
  shapeCoverageCap, solveSize,
} from './shapes.mjs';

// The WU17 catalogue is re-exported here as the engine's public surface: the
// laboratory, the checks and the docs read it from the engine, never from a
// second registry that could drift. WU19 adds `shapeCoverageCap` (the physical
// coverage maximum per shape, which the full-coverage rung needs).
export { SHAPES, DITHER_MODES, ALL_DITHER_MODES, BAYER2, RAMP_MODES, CELL_GEOMETRIES, cellSizeFor, ditherThreshold,
  effectiveShape, maskDerivation, shapeCoverageCap };

/**
 * Dot-density rule for the live scene: one scale, derived from the viewport.
 *
 * A field that reads at 1440 px turns into a faint grid at 390 px, because the
 * same radius covers far fewer device pixels of the same scene. The study
 * measured the fix at x1.50 radius on a 390 px viewport (same dot centres), so
 * this interpolates linearly from 1.0 at 900 px to 1.5 at 390 px and clamps
 * outside that range. Pure: no DOM, no globals, same input -> same output.
 */
export function densityForViewport(width) {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('densityForViewport needs a positive width');
  const scale = 1 + (900 - width) / 1020;
  return Math.min(1.5, Math.max(1, scale));
}

/**
 * The only inked ramp. Index 0 is an empty cell. Dots, never ASCII art. WU22
 * keeps the fifth mark: the largest dot is now the INSCRIBED DISC of a cell —
 * the whole-cell rung of WU19 read as a square, so the ladder tops out at π/4.
 */
export const RAMP = ' ·•●⬤';

/** One cell is one square unit. The library's scenes use the same convention. */
export const CELL = 1;

/**
 * How many square pixels one cell occupies in the canvas and the baked file.
 * 8 px per cell on a 200x100 grid is 1600x800: enough pixels for the largest
 * dot to keep a round rim at every size the laboratory displays, which 4 px per
 * cell was not (see the header).
 */
export const DELIVERY_CELL = 8;

/**
 * The dot ladder: how much of a cell each dot covers. WU22 caps the ladder at
 * the INSCRIBED DISC, coverage π/4 ≈ 0.7854: the WU19 fifth rung at 1.0 was the
 * circumscribed circle (radius 0.7071), which covers the whole cell and reads
 * as a square. The interior rungs are the WU19 measured rungs rescaled to the
 * new cap. The radii below are derived from them, not from an assumed fraction
 * of the cell, and the anti-aliased mask holds this ladder at every cell size.
 */
export const COVERAGE = COVERAGE_LADDER;

/**
 * Drawn radius of each dot, in CELL units, solved from `COVERAGE` so that the
 * exact area of the clipped disc equals the ladder. The result is
 * [0, 0.2421, 0.3480, 0.4507, 0.5000]: the top radius is exactly the half SIDE
 * of a cell — the inscribed disc — so a highlight tops out at a full round dot
 * and no painted cell is ever a full square (the WU19 half diagonal 0.7071 was
 * the circumscribed circle and DID cover the whole cell).
 */
export const DOT_RADIUS = Object.freeze(COVERAGE.map((coverage) => radiusForCoverage(coverage)));

/** Ordered 4x4 Bayer matrix in scan order. Thresholds are (v + 0.5) / 16. */
// Published standard material: the canonical 4x4 ordered-dither matrix
// (Bayer, 1973), built by the published recursive construction in shapes.mjs.
// WU17 also builds the 8x8 matrix and a blue-noise tile there, so every dither
// mode lives in one place.

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
  const full = MEASURED_COVERAGE[MEASURED_COVERAGE.length - 1];
  return MEASURED_COVERAGE.map((coverage) => coverage / full);
}

/** The size, in cell units, that makes a cell of `geometry` lay down `coverage`. */
export function maskSize(shape, ramp, geometry, step) {
  const resolved = effectiveShape(shape, ramp);
  // The disc on square cells is the exact-area mask from WU16, whose radius is
  // already derived from the ladder; every other mask solves its size by
  // bisection in `shapes.mjs`.
  if (resolved === 'disc' && geometry === 'square') return DOT_RADIUS[step] ?? 0;
  return solveSize(resolved, geometry, step);
}

/**
 * One finished cell mask of the selected shape, as a Float64Array of coverage
 * values in [0, 1]. The disc on square cells is the analytic WU16 mask (the same
 * bytes the bake and the live canvas have always produced); every other option
 * comes from the catalogue in `shapes.mjs`.
 * @param {string} shape @param {number} step @param {number} w @param {number} h
 * @param {string} [ramp] @param {string} [geometry]
 */
export function maskFor(shape, step, w, h, ramp = 'shape', geometry = 'square') {
  const resolved = effectiveShape(shape, ramp);
  if (resolved === 'disc' && geometry === 'square' && w === h) return discMask(step, w);
  return buildMask(shape, step, w, h, ramp, geometry);
}

/**
 * Ordered Bayer threshold for a cell, in [0, 1). Used as the dither position:
 * a level between two ladder rungs is spent spatially between them.
 * @param {number} x @param {number} y
 */
export function bayerThreshold(x, y) {
  return ditherThreshold('bayer4', x, y);
}

/**
 * The coverage curve mapping a field level to a ramp step. `level` is the
 * field's tone already normalised against the scene's palette range, 0..1.
 * `mode` selects the dither (WU17); the default is the ordered 4x4 Bayer matrix.
 * @param {number} level @param {number} x @param {number} y @param {string} [mode]
 */
export function stepFor(level, x, y, mode = 'bayer4') {
  const ladder = LADDER;
  let step = 0;
  while (step < ladder.length - 1 && level >= ladder[step + 1]) step += 1;
  if (step === ladder.length - 1) return step;
  const span = ladder[step + 1] - ladder[step];
  const position = span > 0 ? (level - ladder[step]) / span : 1;
  return position > ditherThreshold(mode, x, y) ? step + 1 : step;
}
/**
 * Dot geometry. A dot is a DISC, and each pixel's coverage is the exact area of
 * the disc inside that pixel — not a sample count and not an area-matched
 * square. The closed forms live in `shapes.mjs` (the same ones the catalogue's
 * disc and ring masks use), and the closed forms agree: a radius-2 disc in a
 * 4 px cell covers a corner pixel by 0.31515 and an edge pixel by 0.91315, so a
 * step of coverage 0.81 keeps a round rim.
 */

/** Exact coverage of one `size` cell by a dot of radius `radius` (same units). */
function cellCoverage(size, radius) {
  return discAreaIn(-size / 2, size / 2, -size / 2, size / 2, radius) / (size * size);
}

/** The radius, in cell units, whose clipped disc covers `coverage` of a cell. */
function radiusForCoverage(coverage) {
  if (!(coverage > 0)) return 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (cellCoverage(1, mid) < coverage) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The per-cell coverage mask of one dot, analytically anti-aliased. Computed
 * once per (step, cell) and shared by both output paths, so the Node raster and
 * the live canvas cannot drift apart.
 * @param {number} step @param {number} size
 */
export function discMask(step, size) {
  const mask = new Float64Array(size * size);
  const radius = (DOT_RADIUS[step] ?? 0) * size;
  if (!(radius > 0)) return mask;
  const centre = size / 2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const area = discAreaIn(px - centre, px + 1 - centre, py - centre, py + 1 - centre, radius);
      mask[py * size + px] = area < 0 ? 0 : area > 1 ? 1 : area;
    }
  }
  return mask;
}

/** Dot area per step, MEASURED from the masks at the delivery cell size. */
const MEASURED_COVERAGE = COVERAGE.map((coverage, step) => (coverage > 0 && step > 0
  ? discMask(step, DELIVERY_CELL).reduce((sum, value) => sum + value, 0) / (DELIVERY_CELL * DELIVERY_CELL)
  : 0));
const LADDER = rampLadder();

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
 * same (scene, frame, options) always produces the same arrays, in Node and in
 * the browser alike.
 *
 * DARK-GROUND PRIMITIVE (WU108). The level is normalised against the scene's
 * GROUND tone, so this function is correct for a palette whose ground is its
 * darkest tone, and only for that. On a paper palette the ground IS the
 * lightest tone, the span collapses to zero and every cell lands on step 0; the
 * inversion and the normalisation across the palette's extremes belong to the
 * caller, once (see `design-studies/v1/v1.mjs` and the hybrid study). The engine
 * carries no `groundMode` and no `minTone` on purpose: two truths here applied
 * the inversion twice and would have forced a second re-measurement of the pin.
 * `scripts/check-engine-surface.mjs` pins both halves of that contract.
 *
 * OPTIONS (all optional; the defaults are the WU16 behaviour byte for byte):
 *   dither    'bayer4' | 'bayer8' | 'blue' | 'none'
 *   density   1 | 2 | 4 — sample the scene every k-th cell, so the same picture
 *             can be studied at 200x100, 100x50 and 50x25. Integer strides keep
 *             the field's own integer lattice, so a star stays a star.
 *   shape/ramp/geometry are carried for the caller's bookkeeping; they do not
 *             change the FIELD, only the mark `rasterize` paints. Keeping the
 *             steps independent of the mask is what makes the tone comparable
 *             between shapes.
 * @param {object} scene @param {number} frame
 * @param {{dither?: string, density?: number, shape?: string, ramp?: string, geometry?: string}} [options]
 */
export function renderFrame(scene, frame, options = {}) {
  const dither = options.dither ?? 'bayer4';
  const density = Math.max(1, Math.round(options.density ?? 1));
  const cols = Math.max(1, Math.round(scene.cols / density));
  const rows = Math.max(1, Math.round(scene.rows / density));
  const metrics = sceneMetrics(scene);
  const index = ((Math.floor(frame) % scene.cycleFrames) + scene.cycleFrames) % scene.cycleFrames;
  const time = index / scene.fps;
  const span = Math.max(1e-6, metrics.maxTone - metrics.groundTone);
  const total = cols * rows;
  const steps = new Uint8Array(total);
  const indices = new Uint8Array(total);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const got = scene.field(x * density, y * density, time);
      const r = typeof got === 'number' ? got : got[0];
      const g = typeof got === 'number' ? got : got[1];
      const b = typeof got === 'number' ? got : got[2];
      const level = clamp01((luma(r, g, b) - metrics.groundTone) / span);
      const step = stepFor(level, x, y, dither);
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
 * Cell sprites, keyed by ramp step and palette ink.
 *
 * ADOPTED from `ascii.rest` (MIT, bas3line): `ascii.rest/dist/mount.js` draws
 * each (character, colour) pair once into an atlas and copies it into its cell —
 * "on a phone a scene's 20,000 copies a frame were most of its time". We do the
 * same for a finished CELL instead of a glyph: one cell's pixels are blended once
 * per (ramp step, ink), then copied per cell. See
 * `scripts/scene-src/adoption-ledger.json` (entry `cell-sprite-atlas`) and the
 * retained notice in `scripts/scene-src/ascii.rest-LICENSE`. Improved beyond the
 * original: the key is our ramp step and palette ink, the set is bounded by the
 * palette so nothing is ever evicted or re-rendered, and the same sprite serves
 * the Node bake and the live canvas, so an optimised blit can never make those
 * two outputs disagree.
 */
const SPRITES = new WeakMap();

/**
 * The sprite atlas of one scene at one cell size and one mask. The mask is part
 * of the key (WU17) because the same scene can now be drawn as a disc, a square,
 * a ring and so on: each mask keeps its own set of sprites, so switching options
 * never reuses another shape's cell.
 */
function spriteAtlas(scene, cell, maskKey) {
  const cached = SPRITES.get(scene);
  const atlas = cached && cached.cell === cell ? cached : { cell, masks: new Map() };
  SPRITES.set(scene, atlas);
  let entry = atlas.masks.get(maskKey);
  if (!entry) {
    entry = { sprites: new Map(), masks: null };
    atlas.masks.set(maskKey, entry);
  }
  return entry;
}

/** One finished cell as RGBA: ground blended toward one palette ink. */
function cellSprite(sprites, metrics, cell, mask, step, inkIndex) {
  const ink = metrics.colors[inkIndex];
  const ground = metrics.colors[metrics.groundIndex];
  // A palette is at most 32 entries (the checker enforces that), so one byte of
  // ink index per step cannot collide.
  const key = step * 256 + inkIndex;
  const cached = sprites.get(key);
  if (cached) return cached;
  const sprite = new Uint8ClampedArray(cell.w * cell.h * 4);
  for (let i = 0; i < cell.w * cell.h; i++) {
    const coverage = mask ? mask[i] : 0;
    sprite[i * 4] = Math.round((ground[0] + (ink[0] - ground[0]) * coverage) * 255);
    sprite[i * 4 + 1] = Math.round((ground[1] + (ink[1] - ground[1]) * coverage) * 255);
    sprite[i * 4 + 2] = Math.round((ground[2] + (ink[2] - ground[2]) * coverage) * 255);
    sprite[i * 4 + 3] = 255;
  }
  sprites.set(key, sprite);
  return sprite;
}

/**
 * Paint a frame to RGBA at `cell` pixels per cell. Every pixel is a blend
 * between the ground and one palette entry, which is why the baked file and the
 * live canvas can be compared byte for byte. `into` may carry a buffer to fill
 * (the runtime reuses one per canvas instead of allocating a megabyte a frame).
 *
 * OPTIONS (all optional; the defaults are the WU16 behaviour byte for byte):
 *   shape, ramp, geometry — which mask to paint and in which cell geometry.
 * @param {{cols: number, rows: number, steps: Uint8Array, indices: Uint8Array}} frame
 * @param {object} scene @param {number} cell @param {Uint8ClampedArray} [into]
 * @param {{shape?: string, ramp?: string, geometry?: string}} [options]
 */
export function rasterize(frame, scene, cell = DELIVERY_CELL, into, options = {}) {
  const metrics = sceneMetrics(scene);
  const shape = options.shape ?? 'disc';
  const ramp = options.ramp ?? 'shape';
  const geometry = options.geometry ?? 'square';
  const box = cellSizeFor(geometry, cell);
  const maskKey = `${effectiveShape(shape, ramp)}|${ramp}|${geometry}`;
  const sprites = spriteAtlas(scene, cell, maskKey);
  if (!sprites.masks) {
    // The masks are solved once per (scene, cell, mask) and then reused: the
    // solved size is the expensive part, the sprites are the cheap part.
    sprites.masks = [null];
    for (let step = 1; step < COVERAGE.length; step++) {
      sprites.masks.push(maskFor(shape, step, box.w, box.h, ramp, geometry));
    }
  }
  const masks = sprites.masks;
  const width = frame.cols * box.w;
  const height = frame.rows * box.h;
  const out = into && into.length === width * height * 4 ? into : new Uint8ClampedArray(width * height * 4);
  const rowBytes = box.w * 4;
  for (let y = 0; y < frame.rows; y++) {
    for (let x = 0; x < frame.cols; x++) {
      const cellIndex = y * frame.cols + x;
      const step = frame.steps[cellIndex];
      const sprite = cellSprite(sprites.sprites, metrics, box, masks[step], step, frame.indices[cellIndex]);
      const at = ((y * box.h) * width + x * box.w) * 4;
      for (let py = 0; py < box.h; py++) {
        out.set(sprite.subarray(py * rowBytes, py * rowBytes + rowBytes), at + py * width * 4);
      }
    }
  }
  return out;
}
