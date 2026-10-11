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

/** A named lab palette for image-derived scenes. Ground is index 0 everywhere. */
export const IMAGE_PALETTES = Object.freeze([
  Object.freeze({ id: 'ink', label: 'bone ink on ink', ground: 0,
    palette: Object.freeze(['#0b0b0c', '#17171a', '#2c2c31', '#55555c', '#8f8f96', '#c8c8cd', '#f4f2ed']) }),
  Object.freeze({ id: 'paper', label: 'ink on paper', ground: 0,
    palette: Object.freeze(['#efe7d6', '#c9bda3', '#9b8c6f', '#6b5f49', '#3f3a30', '#1d1b17', '#0b0b0c']) }),
  Object.freeze({ id: 'aurora', label: 'aurora on ink', ground: 0,
    palette: Object.freeze(['#05070c', '#08202a', '#0b4a52', '#128c86', '#2fd6b4', '#7ef0cf',
      '#2b4bd6', '#6f7cf0', '#b23bd6', '#f0e9ff']) }),
]);

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
 * @returns {{cols, rows, levels: Float32Array, rgb: Uint8ClampedArray, mode: string,
 *   rule: string, stats: object}}
 */
export function measureCells(rgba, width, height, fit, mode, groundRgb = [0, 0, 0]) {
  if (!MEASURE_MODES.includes(mode)) throw new Error(`unknown measure mode: ${mode}`);
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
          const alpha = rgba[at + 3] / 255;
          const r = rgba[at] / 255;
          const g = rgba[at + 1] / 255;
          const b = rgba[at + 2] / 255;
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
    params: {
      measure: measure.mode,
      colorMode,
      palette: options.paletteId ?? (preset ? preset.id : 'extract'),
      margin: measure.stats.fit.margin,
      grid: `${cols}×${rows}`,
    },
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
  const measure = measureCells(rgba, width, height, fit, mode, groundRgb);
  let sceneInput;
  if (preset) {
    sceneInput = { palettePreset: preset, paletteId: preset.id };
  } else {
    const palette = extractPalette(measure.rgb, options.paletteCount ?? 8);
    sceneInput = { palette, ground: 0, paletteId: `extract:${palette.length}` };
  }
  const scene = sceneFromMeasurement(measure, {
    ...sceneInput, colorMode, id: options.id ?? 'image-scene', label: options.label,
    fps: options.fps, cycleFrames: options.cycleFrames, posterFrame: options.posterFrame,
  });
  return { scene, measure, fit, serialized: serializeScene(scene), palette: scene.palette };
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
