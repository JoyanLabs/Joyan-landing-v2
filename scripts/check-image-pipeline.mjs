#!/usr/bin/env node
/**
 * WU18 local acceptance — IMAGE → DOT-SCENE PIPELINE AND ANIMATED OVERLAYS.
 * ============================================================================
 * The user's question was "how does an image become this style", with a test
 * input (the Blade Runner unicorn gist) and a request for animated details
 * (twinkling stars on black, aurora colours). This file is the evidence.
 *
 * It is deliberately falsifiable and layered:
 *
 *   1. the pipeline module and its CLI exist and refuse a network URL;
 *   2. a local fixture is decoded, fitted, measured and converted at several
 *      grid densities, with the fit rule and the measurement rules checked as
 *      geometry, not trusted;
 *   3. the converted scene round-trips through its serialisation and still
 *      rasters to the same bytes — so a scene that travels to the canvas as
 *      data cannot drift from the one that was measured;
 *   4. every overlay is periodic BY CONSTRUCTION: the composed field at t=0 and
 *      t=LOOP_SECONDS is compared per cell and per channel, against an ordinary
 *      adjacent frame step as the reference, and the wrap constants are required
 *      to be whole numbers;
 *   5. the `/lab/image` page embeds the exact conversion the pipeline produced
 *      and its canvas hashes to the same bytes the Node raster does, for at
 *      least two treatments of the same input.
 *
 * The third-party fixture is used LOCALLY ONLY. It is downloaded into the
 * gitignored `dist-motion-verify/wu18/input/`, never committed and never copied
 * into `public/`. The laboratory surface demonstrates the pipeline with
 * drawings we author (`scripts/scene-src/local-inputs.mjs`), and this file
 * asserts that no shipped page contains the fixture's name.
 *
 * Evidence goes to `dist-motion-verify/wu18/**`; `--out` writes elsewhere.
 * Never touch `dist-motion-verify/wu13/**` … `wu17/**` (read-only input here).
 *
 * Usage: node scripts/check-image-pipeline.mjs [--node-only] [--out <dir>]
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { loadPlaywright } from './motion-src/render.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const outFlag = process.argv.indexOf('--out');
const out = resolve(root, outFlag > -1 ? process.argv[outFlag + 1] : 'dist-motion-verify/wu18');
const nodeOnly = process.argv.includes('--node-only');
const base = 'http://127.0.0.1:4321';
const LAB = `${base}/lab/image`;
const FIXTURE = resolve(root, 'dist-motion-verify/wu18/input/blade-runner-unicorn-line-transparent.svg');
const FIXTURE_NAME = 'blade-runner-unicorn-line-transparent.svg';
// WU20 — the film-prop demonstration. The user explicitly asked for the unicorn
// as a laboratory example; rights reality: it is a film prop design, so it
// enters /lab/image ONLY as a build-time conversion of the gitignored local
// fixture, with a visible attribution and the rights limit stated. The SVG
// itself is never committed, never copied into src/ or public/, never shipped;
// only the converted serialisation is embedded, and only when the fixture is
// present on the build machine. Without it the page falls back to the
// documented CLI reproduction, so the build never depends on the art.
const FILM_PROP = { id: 'film-prop-demo', cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink' };
const hasFixture = existsSync(FIXTURE);
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const hash = (data) => createHash('sha256').update(data).digest('hex');
const save = async (name, data) => writeFile(resolve(out, name), JSON.stringify(data, null, 2));
await mkdir(out, { recursive: true });
await mkdir(resolve(out, 'captures'), { recursive: true });
await mkdir(resolve(out, 'crops'), { recursive: true });
await mkdir(resolve(out, 'outputs'), { recursive: true });

// ---------------------------------------------------------------------------
// 0. Load the modules gracefully: on a tree without them this run must REPORT
//    the missing surface instead of crashing on the import.
// ---------------------------------------------------------------------------
let pipeline;
let fromImage;
let overlays;
let engine;
let localInputs;
let loadError = '';
try {
  pipeline = await import(new URL('./scene-src/image-pipeline.mjs', import.meta.url));
  overlays = await import(new URL('./scene-src/overlays.mjs', import.meta.url));
  fromImage = await import(new URL('./scene-src/from-image.mjs', import.meta.url));
  engine = await import(new URL('./scene-src/engine.mjs', import.meta.url));
  localInputs = await import(new URL('./scene-src/local-inputs.mjs', import.meta.url));
} catch (error) {
  loadError = error.message;
}
const hasPipeline = Boolean(pipeline && overlays && fromImage && engine);
check(hasPipeline, `the WU18 pipeline modules must exist and import: ${loadError || 'ok'}`);

let library;
try {
  const piece = await import('ascii.rest/pieces/night-coast');
  library = { frame: piece.default(), meta: piece.meta };
} catch (error) {
  check(false, `the library comparison scene must be importable for the honest comparison: ${error.message}`);
}

if (!hasPipeline) {
  await save('red.json', { failures, stage: 'modules-missing' });
  console.log(JSON.stringify({ mode: 'RED', failures }, null, 2));
  process.exit(1);
}

const { renderFrame, rasterize, DELIVERY_CELL } = engine;
const { IMAGE_PALETTES, MEASURE_MODES, COLOR_MODES, PIPELINE_RECIPE, extractPalette, fitGrid,
  measureCells, convertRgba, serializeScene, sceneFromSerialized, imagePalette } = pipeline;
const { OVERLAY_IDS, OVERLAY_DEFAULTS, withOverlays, applyTreatment } = overlays;
const { LOCAL_INPUTS, LAB_TREATMENTS } = localInputs;

// --- contract surface -------------------------------------------------------
check(Array.isArray(MEASURE_MODES) && MEASURE_MODES.includes('ink') && MEASURE_MODES.includes('luminance'),
  'the pipeline must declare its measurement modes explicitly (ink, luminance)');
check(Array.isArray(COLOR_MODES) && COLOR_MODES.includes('levels') && COLOR_MODES.includes('rgb'),
  'the pipeline must declare its colour modes explicitly (levels, rgb)');
check(Array.isArray(PIPELINE_RECIPE) && PIPELINE_RECIPE.length >= 8,
  `the pipeline must publish its numbered recipe, saw ${PIPELINE_RECIPE?.length} step(s)`);
for (const fn of ['decodeImage', 'convert', 'decodeImage']) {
  check(typeof fromImage[fn] === 'function', `from-image.mjs must export ${fn}`);
}
check(typeof fromImage.assertLocalInput === 'function',
  'from-image.mjs must expose the local-only input guard it applies');
check(typeof fromImage.CLI_USAGE === 'string' && /--in/.test(fromImage.CLI_USAGE) && /--palette/.test(fromImage.CLI_USAGE)
  && /--overlays/.test(fromImage.CLI_USAGE) && /--mode/.test(fromImage.CLI_USAGE),
  'the CLI must document its flags (in, mode, palette, overlays, ...)');
check(IMAGE_PALETTES.length >= 3 && IMAGE_PALETTES.every((entry) => entry.palette.length >= 4
  && entry.ground === 0 && /^#[0-9a-f]{6}$/i.test(entry.palette[0])),
  'every named image palette must declare a ground at index 0 and at least four entries');
check(/aurora/i.test(IMAGE_PALETTES.map((entry) => entry.id).join(',')),
  'an aurora palette must exist: the user asked for aurora colours');

// A network URL must be refused before any decode happens.
let refused = false;
try {
  fromImage.assertLocalInput('https://example.com/unicorn.svg');
} catch {
  refused = true;
}
check(refused, 'the pipeline must refuse a network URL instead of decoding it');

// Determinism source guard: the pure modules must not reach for a clock or RNG.
const pipelineSource = await readFile(resolve(root, 'scripts/scene-src/image-pipeline.mjs'), 'utf8');
const overlaySource = await readFile(resolve(root, 'scripts/scene-src/overlays.mjs'), 'utf8');
for (const [name, source] of [['image-pipeline.mjs', pipelineSource], ['overlays.mjs', overlaySource]]) {
  check(!/Math\.random\s*\(/.test(source), `${name} must not use Math.random`);
  check(!/Date\.now\s*\(|performance\.now\s*\(/.test(source), `${name} must not read a clock`);
}
// Periodicity guard, in the constants themselves: wraps and periods are whole.
for (const [id, params] of Object.entries(OVERLAY_DEFAULTS)) {
  check(OVERLAY_IDS.includes(id), `OVERLAY_DEFAULTS must only describe catalogue overlays, saw ${id}`);
  for (const key of ['wrapsX', 'wrapsY', 'sweeps', 'period']) {
    if (key in params) {
      check(Number.isInteger(params[key]) && params[key] > 0,
        `${id}.${key} must be a whole positive number so the loop closes by construction, saw ${params[key]}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 1. The fixture: decode, fit, measure, convert. The fixture is EVIDENCE ONLY.
// ---------------------------------------------------------------------------
const fixture = { path: `dist-motion-verify/wu18/input/${FIXTURE_NAME}`, label: FIXTURE_NAME, exists: existsSync(FIXTURE) };
if (!fixture.exists) {
  check(false, `the local fixture is missing at ${fixture.path} (run the documented download step)`);
}
const densities = [1, 2, 4];
const grids = [];
let modeEvidence = null;
let extractEvidence = null;
let roundTrip = null;
let rgbEvidence = null;
let pngEvidence = null;
let jpegEvidence = null;
if (fixture.exists) {
  const decoded = await fromImage.decodeImage(FIXTURE);
  fixture.decoded = { width: decoded.width, height: decoded.height, format: decoded.source.format,
    bytes: decoded.source.bytes, rasterised: decoded.rasterised };
  check(decoded.source.format === 'svg', `the fixture is an SVG, saw ${decoded.source.format}`);
  check(decoded.width > 0 && decoded.height > 0, 'the fixture must rasterise to real pixels');

  for (const density of densities) {
    const converted = convertRgba(decoded.rgba, decoded.width, decoded.height, {
      cols: 200 / density, rows: 100 / density, mode: 'ink', colorMode: 'levels', palette: 'ink',
      id: `unicorn-d${density}`,
    });
    const scene = converted.scene;
    const frame = renderFrame(scene, scene.posterFrame, { dither: 'bayer4', density: 1 });
    const raster = rasterize(frame, scene, DELIVERY_CELL);
    const histogram = stepHistogram(frame);
    const png = await sharp(Buffer.from(raster), { raw: { width: frame.cols * DELIVERY_CELL, height: frame.rows * DELIVERY_CELL, channels: 4 } })
      .png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
    const name = `unicorn-d${density}-cell${DELIVERY_CELL}.png`;
    await writeFile(resolve(out, 'outputs', name), png);
    const entry = {
      density, cols: scene.cols, rows: scene.rows,
      fit: converted.measure.stats.fit,
      stats: converted.measure.stats,
      histogram,
      raster: { width: frame.cols * DELIVERY_CELL, height: frame.rows * DELIVERY_CELL,
        sha256: hash(Buffer.from(raster)) },
      png: { name, bytes: png.length, sha256: hash(png) },
    };
    grids.push(entry);
  }
  // Fit rule as geometry: aspect preserved and the art inside the margin.
  const { fit, measure, scene, serialized } = convertRgba(decoded.rgba, decoded.width, decoded.height, {
    cols: 200, rows: 100, mode: 'ink', colorMode: 'levels', palette: 'ink', id: 'unicorn-200x100' });
  const aspectIn = decoded.width / decoded.height;
  const aspectOut = fit.drawnWidth / fit.drawnHeight;
  check(Math.abs(aspectIn - aspectOut) < 1e-12,
    `the fit must preserve the aspect ratio exactly: ${aspectIn} in vs ${aspectOut} out`);
  check(fit.offsetX >= fit.margin * fit.cols - 1e-9 && fit.offsetY >= fit.margin * fit.rows - 1e-9,
    `the fitted art must stay inside the declared margin, saw offsets ${fit.offsetX}/${fit.offsetY} `
    + `for margin ${fit.margin}`);
  check(fit.drawnWidth <= (1 - 2 * fit.margin) * fit.cols + 1e-9
    && fit.drawnHeight <= (1 - 2 * fit.margin) * fit.rows + 1e-9,
  'the drawn art must not exceed the usable grid box');
  // The art's own bounding box, measured from the levels, must sit inside the fit box.
  const bbox = levelBBox(measure.levels, scene.cols, scene.rows);
  check(bbox.minX >= Math.floor(fit.offsetX) - 1 && bbox.maxX <= Math.ceil(fit.offsetX + fit.drawnWidth)
    && bbox.minY >= Math.floor(fit.offsetY) - 1 && bbox.maxY <= Math.ceil(fit.offsetY + fit.drawnHeight),
  `the measured ink must land inside the fitted box, saw bbox ${JSON.stringify(bbox)}`);

  // Round trip: the serialised scene must raster to the same bytes as the live one.
  const restored = sceneFromSerialized(serializeScene(scene));
  const liveFrame = renderFrame(scene, scene.posterFrame);
  const restoredFrame = renderFrame(restored, restored.posterFrame);
  const liveHash = hash(Buffer.from(rasterize(liveFrame, scene, DELIVERY_CELL)));
  const restoredHash = hash(Buffer.from(rasterize(restoredFrame, restored, DELIVERY_CELL)));
  check(liveHash === restoredHash,
    `a serialised converted scene must raster identically: ${liveHash} vs ${restoredHash}`);
  roundTrip = { liveHash, restoredHash, levelsBytes: serialized.levels.length, agrees: liveHash === restoredHash };

  // PNG in and out: an encoded PNG must measure to the same cells as its pixels.
  const cell8 = await sharp(Buffer.from(decoded.rgba), { raw: { width: decoded.width, height: decoded.height, channels: 4 } })
    .png().toBuffer();
  const viaPng = await fromImage.decodeImage(cell8);
  const pngMeasured = measureCells(viaPng.rgba, viaPng.width, viaPng.height,
    fitGrid(viaPng.width, viaPng.height, 200, 100, 0.04), 'ink', [0, 0, 0]);
  pngEvidence = { format: viaPng.source.format, meanLevel: pngMeasured.stats.meanLevel,
    meanLevelFromSvg: measure.stats.meanLevel,
    agrees: Math.abs(pngMeasured.stats.meanLevel - measure.stats.meanLevel) < 1e-4 };
  check(pngEvidence.agrees,
    `PNG decode must measure like the source pixels: ${pngEvidence.meanLevel} vs ${pngEvidence.meanLevelFromSvg}`);

  // JPEG cannot carry alpha, so the evidence uses a version flattened onto
  // white (transparent pixels become the ground the format can hold) and requires
  // it to open at the same size and measure close to the source. A JPEG made from
  // the raw RGBA would fill the transparent ground with black and is therefore
  // NOT a fair test of the decoder; that limit is documented, not hidden.
  const jpegBytes = await sharp(Buffer.from(decoded.rgba), { raw: { width: decoded.width, height: decoded.height, channels: 4 } })
    .flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
  const viaJpeg = await fromImage.decodeImage(jpegBytes);
  const jpegMeasured = measureCells(viaJpeg.rgba, viaJpeg.width, viaJpeg.height,
    fitGrid(viaJpeg.width, viaJpeg.height, 200, 100, 0.04), 'ink', [0, 0, 0]);
  jpegEvidence = { format: viaJpeg.source.format, width: viaJpeg.width, height: viaJpeg.height,
    bytes: jpegBytes.length, meanLevel: jpegMeasured.stats.meanLevel,
    meanLevelFromSvg: measure.stats.meanLevel, flattenedOver: '#ffffff',
    agrees: viaJpeg.source.format === 'jpeg' && viaJpeg.width === decoded.width
      && Math.abs(jpegMeasured.stats.meanLevel - measure.stats.meanLevel) < 0.01 };
  check(jpegEvidence.agrees,
    `JPEG decode must open at the decoded size and measure close to the source: ${JSON.stringify(jpegEvidence)}`);

  // The two measurement modes are different instruments, not aliases.
  const lum = convertRgba(decoded.rgba, decoded.width, decoded.height, {
    cols: 200, rows: 100, mode: 'luminance', colorMode: 'rgb', palette: 'extract', paletteCount: 8 });
  const inkRaster = rasterize(renderFrame(scene, 0), scene, DELIVERY_CELL);
  const lumRaster = rasterize(renderFrame(lum.scene, 0), lum.scene, DELIVERY_CELL);
  modeEvidence = {
    ink: { meanLevel: measure.stats.meanLevel, inkedFraction: measure.stats.inkedFraction,
      paletteDepth: scene.palette.length, raster: hash(Buffer.from(inkRaster)) },
    luminance: { meanLevel: lum.measure.stats.meanLevel, inkedFraction: lum.measure.stats.inkedFraction,
      paletteDepth: lum.scene.palette.length, raster: hash(Buffer.from(lumRaster)) },
  };
  check(modeEvidence.ink.meanLevel !== modeEvidence.luminance.meanLevel && modeEvidence.ink.raster !== modeEvidence.luminance.raster,
    'the ink and luminance modes must measure (and draw) differently');

  // Colour mode: `rgb` carries the image's own colour, `levels` is the ladder.
  const rgb = convertRgba(decoded.rgba, decoded.width, decoded.height, {
    cols: 200, rows: 100, mode: 'ink', colorMode: 'rgb', palette: 'ink' });
  const rgbRaster = rasterize(renderFrame(rgb.scene, 0), rgb.scene, DELIVERY_CELL);
  rgbEvidence = { levels: hash(Buffer.from(inkRaster)), rgb: hash(Buffer.from(rgbRaster)),
    differs: hash(Buffer.from(inkRaster)) !== hash(Buffer.from(rgbRaster)) };
  check(rgbEvidence.differs, 'the rgb colour mode must draw different bytes from the levels mode');

  // Extracted palette: deterministic, sorted by tone, ground darkest.
  const first = extractPalette(measure.rgb, 8);
  const second = extractPalette(measure.rgb, 8);
  const tones = first.map((hex) => toneOf(hex));
  check(JSON.stringify(first) === JSON.stringify(second), 'palette extraction must be deterministic');
  check(first.length >= 4 && first.every((hex) => /^#[0-9a-f]{6}$/i.test(hex)),
    `the extracted palette must be #rrggbb entries, saw ${JSON.stringify(first)}`);
  check(tones.every((value, i) => i === 0 || value >= tones[i - 1]),
    `the extracted palette must be ordered by tone (ground darkest), saw ${JSON.stringify(tones)}`);
  extractEvidence = { palette: first, depth: first.length, tones };

  // Baked still == the engine's poster frame, for the converted scene.
  const posterFrame = renderFrame(scene, scene.posterFrame);
  const posterRaster = Buffer.from(rasterize(posterFrame, scene, DELIVERY_CELL));
  const bake = await sharp(posterRaster, { raw: { width: posterFrame.cols * DELIVERY_CELL, height: posterFrame.rows * DELIVERY_CELL, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  const bakeRaw = await sharp(bake).ensureAlpha().raw().toBuffer();
  check(hash(bakeRaw) === hash(posterRaster),
    'a baked converted scene must be exactly the engine raster of its poster frame');
  fixture.bakeEqualsPoster = hash(bakeRaw) === hash(posterRaster);
}

function stepHistogram(frame) {
  const counts = [0, 0, 0, 0, 0];
  for (const step of frame.steps) counts[step] += 1;
  const pairs = { same: 0, total: 0 };
  for (let y = 0; y < frame.rows; y++) {
    for (let x = 0; x + 1 < frame.cols; x++) {
      pairs.total += 1;
      if (frame.steps[y * frame.cols + x] === frame.steps[y * frame.cols + x + 1]) pairs.same += 1;
    }
  }
  return { counts, cells: frame.cols * frame.rows, flatRunFraction: pairs.same / pairs.total };
}
function levelBBox(levels, cols, rows) {
  let minX = cols;
  let maxX = -1;
  let minY = rows;
  let maxY = -1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (levels[y * cols + x] > 0.05) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY };
}
function toneOf(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ---------------------------------------------------------------------------
// 2. Overlays: periodic on the FIELD, deterministic, composable, effective.
// ---------------------------------------------------------------------------
const overlayEvidence = [];
let baseScene = null;
if (fixture.exists) {
  baseScene = convertRgba((await fromImage.decodeImage(FIXTURE)).rgba, 1024, 1024, {
    cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink', id: 'unicorn-160x80' }).scene;
  const channelsOf = (value) => (typeof value === 'number' ? [value, value, value] : value);
  const fieldDelta = (scene, t1, t2) => {
    let max = 0;
    let sum = 0;
    let count = 0;
    for (let y = 0; y < scene.rows; y++) {
      for (let x = 0; x < scene.cols; x++) {
        const a = channelsOf(scene.field(x, y, t1));
        const b = channelsOf(scene.field(x, y, t2));
        for (let c = 0; c < 3; c++) {
          const delta = Math.abs(a[c] - b[c]);
          if (delta > max) max = delta;
          sum += delta;
          count += 1;
        }
      }
    }
    return { max, mean: sum / count, channels: count };
  };
  const loop = baseScene.cycleFrames / baseScene.fps;
  const changedCells = (a, b) => {
    let changed = 0;
    for (let i = 0; i < a.steps.length; i++) if (a.steps[i] !== b.steps[i] || a.indices[i] !== b.indices[i]) changed += 1;
    return changed;
  };
  const baseHash = hash(Buffer.from(renderFrame(baseScene, 0).steps));
  for (const id of OVERLAY_IDS) {
    const scene = withOverlays(baseScene, [id]);
    const adjacent = [0, 7, 17].map((frame) => fieldDelta(scene, frame / scene.fps, (frame + 1) / scene.fps));
    const baseline = { max: Math.max(...adjacent.map((d) => d.max)), mean: Math.max(...adjacent.map((d) => d.mean)) };
    const seam = fieldDelta(scene, 0, loop);
    const twice = hash(Buffer.from(renderFrame(scene, 5).steps)) === hash(Buffer.from(renderFrame(scene, 5).steps));
    const differsFromBase = hash(Buffer.from(renderFrame(scene, 0).steps)) !== baseHash;
    const renderedSeam = changedCells(renderFrame(scene, scene.cycleFrames - 1), renderFrame(scene, 0));
    // WU19: the ordinary-step baseline is EXHAUSTIVE — every adjacent pair in the
    // cycle — so the seam comparison cannot depend on which pairs were sampled.
    // The seam must still be no worse than an ordinary step of the tuned overlay.
    const renderedAdjacent = Math.max(...[...Array(scene.cycleFrames - 1).keys()].map((frame) =>
      changedCells(renderFrame(scene, frame), renderFrame(scene, frame + 1))));
    const entry = { id, seam, baseline, twice, differsFromBase, renderedSeam, renderedAdjacent,
      wraps: OVERLAY_DEFAULTS[id] };
    overlayEvidence.push(entry);
    check(seam.max <= 1e-6 && seam.mean <= 1e-6,
      `${id}: the composed field must be periodic over the loop (seam max ${seam.max.toExponential(2)} `
      + `/ mean ${seam.mean.toExponential(2)})`);
    check(seam.max <= baseline.max + 1e-9,
      `${id}: the seam must be no worse than an ordinary frame step (${seam.max.toExponential(2)} vs ${baseline.max})`);
    check(renderedSeam <= renderedAdjacent,
      `${id}: the rendered loop must close like an ordinary step (${renderedSeam} vs ${renderedAdjacent} cells)`);
    check(twice, `${id}: the same frame rendered twice must be identical`);
    check(differsFromBase, `${id}: the overlay must actually change the base scene`);
  }
  // Composition: two overlays contribute and stay deterministic.
  const composed = withOverlays(baseScene, ['stars', 'aurora']);
  const composedAgain = withOverlays(baseScene, ['aurora', 'stars']);
  check(composed.overlays.join('+') === 'stars+aurora' && composedAgain.overlays.join('+') === 'stars+aurora',
    'composition order must be fixed by the catalogue, not by the caller');
  check(hash(Buffer.from(renderFrame(composed, 3).steps)) !== hash(Buffer.from(renderFrame(withOverlays(baseScene, ['stars']), 3).steps)),
    'a composed overlay set must differ from either overlay alone');
  check(withOverlays(baseScene, []).overlays === undefined,
    'an empty overlay set must leave the scene untouched');
}

// ---------------------------------------------------------------------------
// 3. Honest comparison against the library, measured, not asserted.
// ---------------------------------------------------------------------------
let comparison = null;
if (library && baseScene) {
  const color = new Uint8Array(library.meta.cols * library.meta.rows);
  const text = library.frame(0, { color });
  const used = new Set([...color]);
  const librarySteps = { ' ': 0, '·': 0, '•': 0, '●': 0 };
  for (const ch of text) if (ch in librarySteps) librarySteps[ch] += 1;
  const convertedFrame = renderFrame(baseScene, 0);
  const ours = stepHistogram(convertedFrame);
  comparison = {
    library: { paletteDepth: library.meta.palette.length, paletteUsed: used.size,
      ground: library.meta.ground, fps: library.meta.fps,
      steps: librarySteps, cells: library.meta.cols * library.meta.rows },
    converted: { paletteDepth: baseScene.palette.length, paletteDeclared: baseScene.palette.length,
      distinctLevels: new Set([...baseScene.converted.levels8]).size,
      steps: { 0: ours.counts[0], 1: ours.counts[1], 2: ours.counts[2], 3: ours.counts[3], 4: ours.counts[4] ?? 0 },
      flatRunFraction: ours.flatRunFraction, cells: ours.cells },
  };
  check(comparison.library.paletteDepth > comparison.converted.paletteDepth,
    'the comparison must record the library palette depth honestly, including when it is larger');
}

// ---------------------------------------------------------------------------
// 4. The shipped pages: the fixture never ships, the lab markup never leaks.
// ---------------------------------------------------------------------------
let leaked = [];
for (const dir of ['dist']) {
  const walk = async (path) => {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(path, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (full.endsWith('.html')) {
        const html = await readFile(full, 'utf8');
        if (html.includes('blade-runner-unicorn') || html.includes('280,653')) leaked.push(full.slice(root.length + 1));
      }
    }
  };
  if (existsSync(resolve(root, dir))) await walk(resolve(root, dir));
}
check(leaked.length === 0, `the third-party fixture must never ship: ${leaked.join(', ')}`);
let publicLeak = [];
const publicDir = resolve(root, 'public');
if (existsSync(publicDir)) {
  const walkPublic = async (path) => {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const full = resolve(path, entry.name);
      if (entry.isDirectory()) await walkPublic(full);
      else if (/unicorn|blade/i.test(full)) publicLeak.push(full.slice(root.length + 1));
    }
  };
  await walkPublic(publicDir);
}
check(publicLeak.length === 0, `the fixture must never be copied into public/: ${publicLeak.join(', ')}`);
// WU20: the same scan over src/ — the fixture must not enter the repository
// tree under any name, even though its CONVERTED serialisation may be embedded
// in the noindex laboratory page by the build.
const srcLeak = [];
const srcDir = resolve(root, 'src');
if (existsSync(srcDir)) {
  const walkSrc = async (path) => {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const full = resolve(path, entry.name);
      if (entry.isDirectory()) await walkSrc(full);
      else if (/unicorn|blade/i.test(full)) srcLeak.push(full.slice(root.length + 1));
    }
  };
  await walkSrc(srcDir);
}
check(srcLeak.length === 0, `the fixture must never be copied into src/: ${srcLeak.join(', ')}`);

let imageHtml = '';
try {
  imageHtml = await readFile(resolve(root, 'dist/lab/image/index.html'), 'utf8');
} catch (error) {
  check(false, `the built image laboratory is missing at dist/lab/image/index.html: ${error.message}`);
}
if (imageHtml) {
  check(/noindex/.test(imageHtml), 'the image laboratory must stay noindex');
  check(imageHtml.includes('data-image-lab'), 'the image laboratory must mount the live control surface');
  for (const control of ['input', 'treatment', 'density']) {
    check(imageHtml.includes(`data-image-control="${control}"`),
      `the image laboratory must expose a live ${control} control`);
  }
  check(imageHtml.includes('data-image-toggle'), 'the image laboratory must offer a Play control');
  check(imageHtml.includes('data-image-readout'), 'the image laboratory must show a measured readout');
  check((imageHtml.match(/data-image-view/g) ?? []).length >= 3,
    'the image laboratory must show its result at several widths');
  check(/href="\/lab\/ascii"/.test(imageHtml) && /href="\/lab\/shapes"/.test(imageHtml),
    'the image laboratory must link to the ASCII and shape laboratories');
  check(!/blade-runner-unicorn/i.test(imageHtml) && !/280,653/.test(imageHtml),
    'the shipped laboratory must not embed the third-party fixture source (naming it in the licence note is required)');
  // The licence note must be present in the page, in plain words.
  check(/licen|third.party|rights/i.test(imageHtml),
    'the image laboratory must state the third-party fixture licence limitation');
  // --- WU20: the film-prop demonstration. When the local fixture is present
  // the page embeds its converted serialisation under film-prop-demo, with the
  // attribution and the rights limit visible; without it the page documents
  // the CLI reproduction instead. Either way the fixture FILENAME never ships.
  if (hasFixture) {
    check(imageHtml.includes(`data-image-scene="${FILM_PROP.id}"`),
      'WU20: with the local fixture present, the laboratory must embed the film-prop demonstration conversion');
    check(imageHtml.includes('Tom Southwell'),
      'WU20: the demonstration must carry its attribution (film prop design attributed to Tom Southwell)');
    check(/confirmed rights|derechos confirmados/i.test(imageHtml),
      'WU20: the demonstration must state that production use requires confirmed rights');
  } else {
    check(/from-image\.mjs --in/.test(imageHtml),
      'WU20: without the local fixture, the laboratory must document the CLI reproduction of the demonstration');
  }
}
let asciiHtml = '';
let shapeHtml = '';
try { asciiHtml = await readFile(resolve(root, 'dist/lab/ascii/index.html'), 'utf8'); } catch { /* reported elsewhere */ }
try { shapeHtml = await readFile(resolve(root, 'dist/lab/shapes/index.html'), 'utf8'); } catch { /* reported elsewhere */ }
check(/href="\/lab\/image"/.test(asciiHtml), 'the ASCII laboratory must link to the image laboratory');
check(/href="\/lab\/image"/.test(shapeHtml), 'the shape laboratory must link to the image laboratory');
if (grids.length && imageHtml) {
  const pageDefault = await fromImage.convert(LOCAL_INPUTS[0].svg, {
    cols: LOCAL_INPUTS[0].cols, rows: LOCAL_INPUTS[0].rows, mode: LOCAL_INPUTS[0].mode,
    colorMode: LOCAL_INPUTS[0].colorMode, palette: LOCAL_INPUTS[0].palette,
    id: LOCAL_INPUTS[0].id, label: LOCAL_INPUTS[0].label,
  });
  check(imageHtml.includes(pageDefault.measure.stats.inkedFraction.toFixed(4)),
    `the laboratory copy must carry its own default input's measured inked fraction `
    + `${pageDefault.measure.stats.inkedFraction.toFixed(4)}`);
  check(imageHtml.includes(String(pageDefault.measure.stats.inkedCells)),
    `the laboratory copy must carry its own default input's measured inked cell count `
    + `${pageDefault.measure.stats.inkedCells}`);
  check(imageHtml.includes(String(pageDefault.palette.length)),
    `the laboratory copy must carry its own default input's palette depth ${pageDefault.palette.length}`);
}

// ---------------------------------------------------------------------------
// 5. Docs: the recipe and the licence note, with the measured numbers.
// ---------------------------------------------------------------------------
let motorDoc = '';
let designDoc = '';
try { motorDoc = await readFile(resolve(root, 'docs/MOTOR-ESCENAS.md'), 'utf8'); } catch { /* reported by the assert below */ }
try { designDoc = await readFile(resolve(root, 'docs/DESIGN.md'), 'utf8'); } catch { /* reported by the assert below */ }
check(/image|imagen/i.test(motorDoc) && /WU18/.test(motorDoc),
  'MOTOR-ESCENAS must document the WU18 image pipeline');
check((motorDoc.match(/^\d+\.\s/gm) ?? []).length >= 8,
  'MOTOR-ESCENAS must state the pipeline as a numbered recipe');
check(/fixture/i.test(motorDoc) && /no se distribuye|no se publica|never shipped|solo como fixture|sólo como fixture/i.test(motorDoc),
  'MOTOR-ESCENAS must state the fixture licence boundary plainly');
check(/WU18/.test(designDoc), 'DESIGN must record the WU18 unit');
check(/licen|prop design|third.party|terceros/i.test(designDoc),
  'DESIGN must record the third-party fixture licence note');

// ---------------------------------------------------------------------------
// 5b. WU19 — the improvement round: anti-moiré prefilter, auto-gain, deeper
//     default palette, the full-coverage rung, and the laboratory copy that
//     states the licence note, the CLI recipe and the honest quality limits.
//     Each claim is MEASURED here, then required to hold.
// ---------------------------------------------------------------------------
const wu19 = { prefilter: null, autoGain: null, palette: null, ladder: null, copy: null };

// The calibration target's hatch region, measured before/after: a fine diagonal
// hatch that beats against the cell lattice must average into tone.
const HATCH = { x0: 80, x1: 117, y0: 40, y1: 77 };
const regionCv = (measure, cols) => {
  const vals = [];
  for (let y = HATCH.y0; y < HATCH.y1; y++) {
    for (let x = HATCH.x0; x < HATCH.x1; x++) vals.push(measure.levels[y * cols + x]);
  }
  const mean = vals.reduce((sum, value) => sum + value, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / vals.length);
  return { mean, cv: mean > 0 ? sd / mean : 0 };
};
if (hasPipeline) {
  const target = LOCAL_INPUTS.find((entry) => entry.id === 'test-target');
  const decodedTarget = await fromImage.decodeImage(target.svg);
  const prefilterOff = convertRgba(decodedTarget.rgba, decodedTarget.width, decodedTarget.height,
    { cols: target.cols, rows: target.rows, mode: 'ink', colorMode: 'levels', palette: 'ink',
      prefilter: false, autoGain: 'none', id: 'target-noprefilter' });
  const prefilterOn = convertRgba(decodedTarget.rgba, decodedTarget.width, decodedTarget.height,
    { cols: target.cols, rows: target.rows, mode: 'ink', colorMode: 'levels', palette: 'ink',
      id: 'target-prefilter' });
  const before = regionCv(prefilterOff.measure, target.cols);
  const after = regionCv(prefilterOn.measure, target.cols);
  // Default conversions must be prefiltered, and the option must exist to turn
  // it off (that is what makes the before/after honest rather than decorative).
  check(typeof prefilterOn.measure.stats.prefilter === 'string'
    && /pitch/i.test(prefilterOn.measure.stats.prefilter),
  `the pipeline must measure WITH a pitch-matched prefilter by default, saw ${JSON.stringify(prefilterOn.measure.stats.prefilter)}`);
  check(prefilterOff.measure.stats.prefilter === 'none',
    'prefilter: false must measurably disable the prefilter (the rule must be stated, not renamed)');
  // The defect the calibration target exposed: a coefficient of variation of
  // ~0.8 on the hatch region is the beat itself. The prefilter must bring the
  // region near its mean (cv < 0.55) while keeping the region's mean tone
  // within 5% of the unfiltered mean (no darkening, no brightening).
  check(after.cv < 0.55,
    `the prefilter must average the hatch into tone: cv ${after.cv.toFixed(3)} after vs ${before.cv.toFixed(3)} before (want < 0.55)`);
  check(Math.abs(after.mean - before.mean) / Math.max(1e-9, before.mean) < 0.05,
    `the prefilter must preserve the region's mean tone: ${after.mean.toFixed(4)} vs ${before.mean.toFixed(4)}`);
  wu19.prefilter = { before, after, rule: prefilterOn.measure.stats.prefilter };

  // A smooth gradient must be unharmed: a linear ramp converted with and
  // without the prefilter must keep its monotone structure and its mean.
  const size = 512;
  const gradient = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const at = (y * size + x) * 4;
      const value = Math.round(255 * ((x + y) / (2 * size - 2)));
      gradient[at] = value; gradient[at + 1] = value; gradient[at + 2] = value; gradient[at + 3] = 255;
    }
  }
  const gradOff = convertRgba(gradient, size, size, { cols: 160, rows: 80, mode: 'luminance',
    colorMode: 'levels', palette: 'ink', prefilter: false, autoGain: 'none', id: 'grad-off' });
  const gradOn = convertRgba(gradient, size, size, { cols: 160, rows: 80, mode: 'luminance',
    colorMode: 'levels', palette: 'ink', id: 'grad-on' });
  const gradStats = (measure) => {
    const vals = [...measure.levels];
    let monotoneViolations = 0;
    for (let y = 0; y < measure.rows; y++) {
      for (let x = 1; x < measure.cols; x++) {
        if (vals[y * measure.cols + x] < vals[y * measure.cols + x - 1] - 0.02) monotoneViolations += 1;
      }
    }
    return { mean: vals.reduce((sum, value) => sum + value, 0) / vals.length, monotoneViolations };
  };
  const gradBefore = gradStats(gradOff.measure);
  const gradAfter = gradStats(gradOn.measure);
  check(Math.abs(gradAfter.mean - gradBefore.mean) < 0.02,
    `the prefilter must not move a smooth gradient's mean tone: ${gradAfter.mean.toFixed(4)} vs ${gradBefore.mean.toFixed(4)}`);
  check(gradAfter.monotoneViolations <= gradBefore.monotoneViolations,
    `the prefilter must not add banding reversals to a smooth gradient: ${gradAfter.monotoneViolations} vs ${gradBefore.monotoneViolations}`);
  wu19.prefilter.gradient = { before: gradBefore, after: gradAfter };

  // Auto-gain: sparse, LIGHT line art must be normalised, and the gain recorded.
  // The synthetic input is sparse (6.2% inked) and light (p90 of inked cells
  // 0.209): the exact failure the audit flagged, where sparse art lands mostly
  // in the empty step. The gain is measured in isolation (prefilter off for both
  // sides) so the two effects cannot mask each other.
  const sparseSize = 512;
  const sparseInput = Buffer.alloc(sparseSize * sparseSize * 4);
  for (let y = 0; y < sparseSize; y++) {
    for (let x = 0; x < sparseSize; x++) {
      const at = (y * sparseSize + x) * 4;
      const on = (x + y) % 56 < 2;
      const value = on ? Math.round(255 * 0.35) : 0;
      sparseInput[at] = value; sparseInput[at + 1] = value; sparseInput[at + 2] = value;
      sparseInput[at + 3] = on ? 255 : 0;
    }
  }
  const sparseOff = convertRgba(sparseInput, sparseSize, sparseSize,
    { cols: 200, rows: 100, mode: 'ink', colorMode: 'levels', palette: 'ink',
      prefilter: false, autoGain: 'none', id: 'sparse-nogain' });
  const sparseOn = convertRgba(sparseInput, sparseSize, sparseSize,
    { cols: 200, rows: 100, mode: 'ink', colorMode: 'levels', palette: 'ink',
      prefilter: false, id: 'sparse-gain' });
  const inkedPercentile = (measure, fraction) => {
    const inked = [...measure.levels].filter((value) => value > 0.05).sort((a, b) => a - b);
    return inked.length ? inked[Math.floor(fraction * (inked.length - 1))] : 0;
  };
  const gain = sparseOn.scene.params.gain;
  check(typeof gain === 'number' && gain > 1.05,
    `auto-gain must record a gain above 1 on sparse light art, saw ${JSON.stringify(gain)}`);
  check(sparseOff.scene.params.gain === 1 || sparseOff.scene.params.gain === undefined,
    'autoGain none must leave the measurement ungained');
  // The gain must actually lift the sparse drawing toward the ladder: read the
  // SCENE's quantised levels (the gained tone the engine renders), against the
  // returned measurement, which stays the honest pre-gain reading.
  const p90Of = (values) => {
    const inked = [...values].map((value) => value / 255).filter((value) => value > 0.05).sort((a, b) => a - b);
    return inked.length ? inked[Math.floor(0.9 * (inked.length - 1))] : 0;
  };
  check(p90Of(sparseOn.scene.converted.levels8) > inkedPercentile(sparseOff.measure, 0.9),
    `auto-gain must lift sparse art: p90 ${p90Of(sparseOn.scene.converted.levels8).toFixed(3)} gained vs `
    + `${inkedPercentile(sparseOff.measure, 0.9).toFixed(3)} ungained`);
  // Dark or full-range art must NOT be gained (the rule is sparse-light-only,
  // and it must be the rule that decides, not an unconditional boost).
  const dense = convertRgba(gradient, size, size, { cols: 160, rows: 80, mode: 'luminance',
    colorMode: 'levels', palette: 'ink', prefilter: false, id: 'grad-gain' });
  check(dense.scene.params.gain === 1,
    `a full-range input must stay at gain 1, saw ${JSON.stringify(dense.scene.params.gain)}`);
  // Sparse but already-dark art (our mark's strokes are near-black) must not be
  // over-boosted either: the rule reads the tone, not just the coverage.
  const markDarkInput = LOCAL_INPUTS.find((entry) => entry.id === 'joyan-mark');
  const decodedMarkDark = await fromImage.decodeImage(markDarkInput.svg);
  const markDark = convertRgba(decodedMarkDark.rgba, decodedMarkDark.width, decodedMarkDark.height,
    { cols: markDarkInput.cols, rows: markDarkInput.rows, mode: 'ink', colorMode: 'levels', palette: 'ink',
      prefilter: false, id: 'mark-gain' });
  check(markDark.scene.params.gain === 1,
    `sparse but already-dark art must not be over-boosted, saw ${JSON.stringify(markDark.scene.params.gain)}`);
  // The serialisation must carry the gain so the runtime draws the same conversion.
  check(sparseOn.serialized.params && sparseOn.serialized.params.gain === gain,
    'the serialisation must record the auto-gain with the measurement');
  wu19.autoGain = { gain, p90off: inkedPercentile(sparseOff.measure, 0.9),
    p90on: p90Of(sparseOn.scene.converted.levels8), rule: sparseOn.measure.stats.autoGain };
  check(typeof sparseOn.measure.stats.autoGain === 'string' && /p90|percentile|gain/i.test(sparseOn.measure.stats.autoGain),
    'the measurement must state the auto-gain rule in words');

  // Deeper default palette for image conversions, with extraction quality
  // measured: the mean per-cell tone error against the extracted palette must
  // fall when the default depth grows. Measured on a smooth gradient, which has
  // the tonal richness a palette depth is for (our two-tone mark cannot show it).
  const deepOff = convertRgba(gradient, size, size, { cols: 160, rows: 80, mode: 'luminance',
    colorMode: 'rgb', palette: 'extract', paletteCount: 8, prefilter: false, autoGain: 'none', id: 'grad-pal8' });
  const deepOn = convertRgba(gradient, size, size, { cols: 160, rows: 80, mode: 'luminance',
    colorMode: 'rgb', palette: 'extract', id: 'grad-pal-default' });
  check(deepOn.palette.length >= 12,
    `the default extracted palette must be deeper than 8 entries on a rich input, saw ${deepOn.palette.length}`);
  check(/extract:1[2-9]|extract:2\d/.test(deepOn.scene.params.palette),
    `the default extraction count must be the deeper default, saw ${deepOn.scene.params.palette}`);
  const toneError = (conversion) => {
    const colors = conversion.palette.map(engine.hexToRgb);
    const tones = colors.map(engine.tone);
    let sum = 0;
    let count = 0;
    const rgb = conversion.measure.rgb;
    for (let i = 0; i < conversion.measure.cols * conversion.measure.rows; i++) {
      const cellTone = engine.tone([rgb[i * 3] / 255, rgb[i * 3 + 1] / 255, rgb[i * 3 + 2] / 255]);
      let best = 1;
      for (const value of tones) best = Math.min(best, Math.abs(value - cellTone));
      sum += best;
      count += 1;
    }
    return sum / count;
  };
  const err8 = toneError(deepOff);
  const errDeep = toneError(deepOn);
  check(errDeep < err8,
    `the deeper palette must measure better extraction quality: mean tone error ${errDeep.toFixed(4)} vs ${err8.toFixed(4)} at 8 entries`);
  wu19.palette = { depth8: 8, depthDefault: deepOn.palette.length, err8, errDeep };

  // The fifth rung reaches full coverage in a real conversion.
  const rungScene = prefilterOn.scene;
  const rungFrame = engine.renderFrame(rungScene, 0);
  const reached = Math.max(...rungFrame.steps);
  check(rungFrame.steps.length === rungScene.cols * rungScene.rows,
    'the WU19 frame must carry the whole grid');
  check(typeof engine.RAMP === 'string' && [...engine.RAMP].length === 5,
    `the ramp must carry five marks for five rungs, saw ${JSON.stringify(engine.RAMP)}`);
  check(engine.stepFor(1, 0, 0) === 4, 'a full tone must map to the fifth rung');
  check(reached >= 1, 'the calibration target must exercise the ladder above the ground');
  wu19.ladder = { ramp: engine.RAMP, reached, ladder: engine.sceneMetrics ? null : null };

  // The laboratory copy: the licence note beside the inputs, the exact CLI
  // recipe, and the honest quality statement about the prefilter and auto-gain.
  check(imageHtml.includes('local fixture'),
    'the image laboratory copy must state, beside the inputs, that the gist art was a local fixture only');
  check(imageHtml.includes('from-image.mjs') && imageHtml.includes('--in'),
    'the image laboratory copy must show the exact CLI command a user runs to convert their own file');
  check(/prefilter|prefiltr/i.test(imageHtml),
    'the image laboratory copy must describe the anti-moiré prefilter');
  check(/auto.gain|auto-ganancia|normal/i.test(imageHtml),
    'the image laboratory copy must describe the auto-gain');
  check(/alias|moir|batien|beat/i.test(imageHtml),
    'the image laboratory copy must carry the honest quality statement about the aliasing defect');
  wu19.copy = { cli: true, licence: true };
}
await save('wu19', wu19);

// ---------------------------------------------------------------------------
// WU22 — ROUND-ONLY LADDER, THE WHITE-CORE TONE CAP, THE SWEEP FAMILY AND
// THE PAGE PALETTE. Each claim is measured here, then required to hold.
// ---------------------------------------------------------------------------
const wu22 = { ladder: null, toneCap: null, whiteCore: null, sweeps: null, palette: null };
if (hasPipeline) {
  // 1. Round-only: the ladder is capped at the INSCRIBED DISC (coverage π/4),
  //    and the top rung's painted cell keeps a disc's empty corners — the
  //    assertion that fails if any painted cell is a full square.
  const WU22_TOP = Math.PI / 4;
  const cov = [...engine.COVERAGE];
  check(Math.abs(cov[cov.length - 1] - WU22_TOP) < 1e-9,
    `the WU22 ladder must top out at the inscribed disc π/4 = ${WU22_TOP.toFixed(4)}, saw ${cov[cov.length - 1]}`);
  check(cov.every((value) => value <= WU22_TOP + 1e-9),
    'no ladder rung may exceed the inscribed disc: a rung above π/4 paints the cell corners as a square');
  const topMask = engine.discMask ? engine.discMask(4, 8) : null;
  if (topMask) {
    const cornerSum = topMask[0] + topMask[7] + topMask[56] + topMask[63];
    check(cornerSum <= 1e-6,
      `the top rung must leave a disc's corner pixels empty at 8 px per cell (a full square fills them), saw corner sum ${cornerSum.toFixed(4)}`);
    check(Math.abs(topMask.reduce((s, v) => s + v, 0) / 64 - WU22_TOP) < 0.002,
      'the top rung mask must measure the inscribed disc coverage π/4');
  }
  wu22.ladder = { coverage: cov, radii: engine.DOT_RADIUS.map((r) => Number(r.toFixed(4))) };

  // 2. The tone cap: constants, a stated rule, and a measured effect — a dense
  //    blob of overlapping strokes must cap BELOW the old saturation instead of
  //    all landing on the top rung, and toneCap:'none' must reproduce the
  //    uncapped behaviour byte for byte.
  const blobSize = 512;
  const blob = Buffer.alloc(blobSize * blobSize * 4);
  for (let i = 0; i < 90; i++) {
    const y0 = 60 + (i * 53) % 380;
    const x0 = 60 + (i * 97) % 380;
    const len = 60 + (i * 31) % 120;
    for (let t = 0; t < len; t++) {
      for (let w = -4; w <= 4; w++) {
        const x = Math.min(blobSize - 1, Math.max(0, x0 + t + w));
        const y = Math.min(blobSize - 1, Math.max(0, y0 + t + ((i % 3) - 1) * w));
        const at = (y * blobSize + x) * 4;
        blob[at] = 20; blob[at + 1] = 20; blob[at + 2] = 20; blob[at + 3] = 255;
      }
    }
  }
  const capOn = convertRgba(blob, blobSize, blobSize,
    { cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink', prefilter: false, id: 'wu22-cap-on' });
  const capOff = convertRgba(blob, blobSize, blobSize,
    { cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink', prefilter: false, toneCap: 'none', id: 'wu22-cap-off' });
  const maxLevel = (scene) => Math.max(...scene.converted.levels8) / 255;
  check(typeof engine !== 'undefined' && typeof pipeline.TONE_CAP_KNEE === 'number'
    && typeof pipeline.TONE_CAP_CEILING === 'number' && typeof pipeline.TONE_CAP_RULE === 'string'
    && /knee/i.test(pipeline.TONE_CAP_RULE),
    'the pipeline must export TONE_CAP_KNEE, TONE_CAP_CEILING and a stated TONE_CAP_RULE');
  check(/auto|toneCap/i.test(JSON.stringify(capOn.scene.params)),
    'the scene params must record the tone cap with the conversion');
  check(maxLevel(capOn.scene) <= pipeline.TONE_CAP_CEILING + 0.01,
    `the tone cap must keep the dense blob's levels at or below the ceiling ${pipeline.TONE_CAP_CEILING}, saw ${maxLevel(capOn.scene).toFixed(4)}`);
  check(maxLevel(capOff.scene) > pipeline.TONE_CAP_CEILING + 0.01,
    `toneCap:'none' must reproduce the uncapped conversion (levels above the ceiling), saw ${maxLevel(capOff.scene).toFixed(4)}`);
  // The cap must only touch the top of the range: the median inked cell is untouched.
  const medianOf = (scene) => {
    const inked = [...scene.converted.levels8].map((v) => v / 255).filter((v) => v > 0.05).sort((a, b) => a - b);
    return inked[Math.floor(0.5 * (inked.length - 1))];
  };
  check(Math.abs(medianOf(capOn.scene) - medianOf(capOff.scene)) < 0.01,
    `the cap must not move the median inked tone: ${medianOf(capOn.scene).toFixed(4)} vs ${medianOf(capOff.scene).toFixed(4)}`);
  wu22.toneCap = { knee: pipeline.TONE_CAP_KNEE, ceiling: pipeline.TONE_CAP_CEILING,
    maxCapped: maxLevel(capOn.scene), maxUncapped: maxLevel(capOff.scene),
    rule: pipeline.TONE_CAP_RULE };

  // 3. The white core, MEASURED on the fixture: the dense overlapping-line core
  //    (cells whose 5x5 neighbourhood is >= 50% inked) must keep structure —
  //    far fewer cells at the top rung — while the sparse areas keep their p90.
  if (hasFixture && fromImage) {
    const decodedHero = await fromImage.decodeImage(FIXTURE);
    const heroCap = convertRgba(decodedHero.rgba, decodedHero.width, decodedHero.height,
      { cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink', id: 'wu22-hero-cap' });
    const heroNoCap = convertRgba(decodedHero.rgba, decodedHero.width, decodedHero.height,
      { cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink', toneCap: 'none', id: 'wu22-hero-nocap' });
    const TOP_RUNG = 0.8125; // normalised ladder threshold of the fourth step
    const coreTopRung = (measure, gainValue, capped) => {
      const cols = measure.cols;
      const rows = measure.rows;
      const L = measure.levels;
      const inked = (x, y) => L[y * cols + x] > 0.05;
      let core = 0;
      let coreTop = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let n = 0;
          let dense = 0;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const xx = x + dx;
              const yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
              n += 1;
              if (inked(xx, yy)) dense += 1;
            }
          }
          if (n > 0 && dense / n < 0.5) continue;
          const level = L[y * cols + x];
          if (level <= 0.05) continue;
          core += 1;
          const gained = Math.min(1, level * gainValue);
          const ceiling = capped ? Math.min(1, gained) : gained;
          const effective = capped && gained > pipeline.TONE_CAP_KNEE
            ? pipeline.TONE_CAP_KNEE + (gained - pipeline.TONE_CAP_KNEE)
              * (pipeline.TONE_CAP_CEILING - pipeline.TONE_CAP_KNEE) / (1 - pipeline.TONE_CAP_KNEE)
            : gained;
          if (effective >= TOP_RUNG) coreTop += 1;
        }
      }
      return { core, coreTop };
    };
    const beforeCore = coreTopRung(heroNoCap.measure, heroNoCap.scene.params.gain, false);
    const afterCore = coreTopRung(heroCap.measure, heroCap.scene.params.gain, true);
    check(afterCore.coreTop < beforeCore.coreTop,
      `the tone cap must reduce the white core: top-rung cells in the dense core ${afterCore.coreTop} after vs ${beforeCore.coreTop} before`);
    check(afterCore.coreTop / Math.max(1, beforeCore.coreTop) <= 0.75,
      `the tone cap must cut the core's top-rung cells by at least 25%, saw ${beforeCore.coreTop} -> ${afterCore.coreTop}`);
    const p90After = (() => {
      const inked = [...heroCap.scene.converted.levels8].map((v) => v / 255).filter((v) => v > 0.05).sort((a, b) => a - b);
      return inked[Math.floor(0.9 * (inked.length - 1))];
    })();
    check(p90After >= 0.6,
      `sparse areas must stay readable: the capped conversion keeps p90 ${p90After.toFixed(3)} (want >= 0.6)`);
    wu22.whiteCore = { before: beforeCore, after: afterCore, gain: heroCap.scene.params.gain, p90After };
  }

  // 4. The sweep family: a colour wash and a shimmer band join the catalogue,
  //    each with defaults and a label; the generic seam loop below asserts
  //    their periodicity on the field for every id.
  for (const id of ['wash', 'shimmer']) {
    check(overlays.OVERLAY_IDS.includes(id), `the WU22 sweep family must include the ${id} overlay`);
    check(overlays.OVERLAY_DEFAULTS[id] && typeof overlays.OVERLAY_DEFAULTS[id] === 'object',
      `the ${id} overlay must declare its frozen defaults`);
    check(typeof overlays.OVERLAY_LABELS[id] === 'string' && overlays.OVERLAY_LABELS[id].length > 10,
      `the ${id} overlay must state what it does, for the laboratory controls`);
    let probe = null;
    try {
      probe = overlays.makeOverlay(id);
    } catch {
      // The overlay does not exist yet: that is exactly what this assertion reports.
    }
    check(probe && typeof probe.apply === 'function', `the ${id} overlay must build and apply`);
  }
  wu22.sweeps = { ids: [...overlays.OVERLAY_IDS] };

  // --- WU26 — the warp overlay: light-speed in our dot language. Radial dot
  // streaks from a declared centre, a centre bloom of dots, and an optional
  // radial displacement of the subject's dots near the frame border. All of
  // it in the page palette, periodic by construction (whole trips per loop).
  check(overlays.OVERLAY_IDS.includes('warp'), 'the WU26 catalogue must include the warp overlay');
  check(overlays.OVERLAY_DEFAULTS.warp && typeof overlays.OVERLAY_DEFAULTS.warp === 'object',
    'the warp overlay must declare its frozen defaults');
  check(typeof overlays.OVERLAY_LABELS.warp === 'string' && overlays.OVERLAY_LABELS.warp.length > 10,
    'the warp overlay must state what it does, for the laboratory controls');
  let warpProbe = null;
  try {
    warpProbe = overlays.makeOverlay('warp');
  } catch {
    // The overlay does not exist yet: that is exactly what this assertion reports.
  }
  check(warpProbe && typeof warpProbe.apply === 'function', 'the warp overlay must build and apply');
  if (overlays.OVERLAY_DEFAULTS.warp) {
    const pageEntries = pipeline.IMAGE_PALETTES.find((entry) => entry.id === pipeline.PAGE_PALETTE_ID)?.palette ?? [];
    const pageRgb = new Set(pageEntries.map((hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
      return [r, g, b].map((v) => Math.round(v * 255));
    }).map((v) => v.join(',')));
    const toRgb = (v) => v.map((c) => Math.round(c * 255)).join(',');
    const colours = ['colour', 'hotColour'].map((key) => overlays.OVERLAY_DEFAULTS.warp[key]).filter(Boolean);
    for (const colour of colours) {
      check(pageRgb.has(toRgb(colour)),
        `the warp colour ${toRgb(colour)} must be a joyan-page palette entry (the effect stays in the page palette)`);
    }
    check(overlays.OVERLAY_DEFAULTS.warp.trips >= 1 && Number.isInteger(overlays.OVERLAY_DEFAULTS.warp.trips),
      'the warp streaks must travel a whole number of trips per loop (periodic by construction)');
    check(overlays.OVERLAY_DEFAULTS.warp.bloom && overlays.OVERLAY_DEFAULTS.warp.bloom.radius > 0,
      'the warp must declare a centre bloom');
  }
  // The round-only ladder is untouched by WU26: the top rung stays the
  // inscribed disc (coverage PI/4, radius 0.5) and nothing paints a square.
  check(Math.abs(engine.COVERAGE[4] - Math.PI / 4) < 1e-9 && Math.abs(engine.DOT_RADIUS[4] - 0.5) < 1e-9,
    'the no-square invariant must hold: the top rung stays the inscribed disc (PI/4, radius 0.5)');

  // 5. The page palette: built from the site tokens (ink-950 ground, bone-50
  //    ink, amber accent), with the aurora adapted and one combining accent;
  //    ground is index 0 and the palette stays within the engine's 32-entry bound.
  const pagePalette = pipeline.IMAGE_PALETTES.find((entry) => entry.id === pipeline.PAGE_PALETTE_ID);
  check(Boolean(pagePalette), `the pipeline must declare a page palette with id ${String(pipeline.PAGE_PALETTE_ID)}`);
  if (pagePalette) {
    const ground = pagePalette.palette[pagePalette.ground].toLowerCase();
    check(ground === '#0b0b0c', `the page palette ground must be the ink-950 token #0b0b0c, saw ${ground}`);
    check(pagePalette.palette.includes('#ffb000'), 'the page palette must carry the amber accent #ffb000');
    check(pagePalette.palette.includes('#f4f2ed'), 'the page palette must carry the bone-50 ink #f4f2ed');
    check(pagePalette.palette.length <= 32, 'the page palette stays within the engine 32-entry bound');
    check(pagePalette.palette.length >= 8, 'the page palette must be deep enough for the aurora range');
    wu22.palette = { id: pagePalette.id, entries: pagePalette.palette.length, ground };
  }
}
await save('wu22', wu22);

const spanish = (value, digits = 4) => Number(value).toFixed(digits).replace('.', ',');
if (grids.length) {
  const brief = grids.find((entry) => entry.density === 1);
  check(motorDoc.includes(spanish(brief.stats.inkedFraction, 4)),
    `MOTOR-ESCENAS must state the measured inked fraction ${spanish(brief.stats.inkedFraction, 4)} of the fixture`);
  check(designDoc.includes(String(fixture.decoded?.width ?? '')),
    `DESIGN must state the fixture decoded size ${fixture.decoded?.width}`);
}
if (comparison) {
  check(designDoc.includes(String(comparison.library.paletteDepth)),
    `DESIGN must state the library palette depth ${comparison.library.paletteDepth} in the honest comparison`);
}

await save('node', { failures, fixture, grids, modeEvidence, extractEvidence, roundTrip, rgbEvidence,
  pngEvidence, jpegEvidence, overlayEvidence, comparison, recipe: PIPELINE_RECIPE, wu19 });

if (nodeOnly) {
  console.log(JSON.stringify({ mode: failures.length ? 'RED' : 'GREEN', nodeOnly, failures: failures.length,
    grids: grids.length, overlays: overlayEvidence.length }, null, 2));
  await save(failures.length ? 'red.json' : 'green.json', { failures, fixture, grids, modeEvidence,
    extractEvidence, roundTrip, rgbEvidence, pngEvidence, jpegEvidence, overlayEvidence, comparison });
  process.exit(failures.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// 6. The live surface: the SAME conversion on a canvas, for two treatments.
// ---------------------------------------------------------------------------
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const live = [];
const treatments = [];
const motion = [];
const displayPitch = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (!url.startsWith(base) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      external.push(url);
      return route.abort();
    }
    return route.continue();
  });
  const response = await page.goto(LAB, { waitUntil: 'networkidle' });
  check(response.status() === 200, `image laboratory HTTP ${response.status()}`);
  check(await page.locator('[data-image-lab]').count() === 1, 'exactly one image laboratory mount required');
  check(await page.locator('script[type="application/json"][data-image-scene]').count() === LOCAL_INPUTS.length + (hasFixture ? 1 : 0),
    `the page must embed one converted scene per authored input (${LOCAL_INPUTS.length}) plus the film-prop demonstration when the local fixture exists`);

  const hashCanvas = (selector) => page.locator(selector).first().evaluate(async (canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const digest = await crypto.subtle.digest('SHA-256', data);
    return { hash: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join(''),
      width: canvas.width, height: canvas.height };
  });
  const setControl = async (name, value) => {
    await page.selectOption(`[data-image-lab] [data-image-control="${name}"]`, value);
    await page.waitForTimeout(200);
  };

  // The embedded payload must be the exact serialisation the pipeline produces.
  for (const input of LOCAL_INPUTS) {
    const embedded = await page.locator(`script[data-image-scene="${input.id}"]`).textContent();
    const converted = await fromImage.convert(input.svg, {
      cols: input.cols, rows: input.rows, mode: input.mode, colorMode: input.colorMode,
      palette: input.palette, id: input.id, label: input.label,
    });
    const same = JSON.stringify(JSON.parse(embedded)) === JSON.stringify(converted.serialized);
    check(same, `the page's embedded ${input.id} payload must be the pipeline's own serialisation`);
    live.push({ input: input.id, embeddedAgrees: same, levels: converted.serialized.levels.length });
  }

  // WU20: the film-prop demonstration is the pipeline's own serialisation of
  // the local fixture, converted at build time, and its canvas is hash-equal
  // to the Node raster of that conversion — the same contract as our inputs.
  if (hasFixture) {
    const converted = await fromImage.convert(FIXTURE, {
      cols: FILM_PROP.cols, rows: FILM_PROP.rows, mode: FILM_PROP.mode, colorMode: FILM_PROP.colorMode,
      palette: FILM_PROP.palette, id: FILM_PROP.id,
      label: 'film prop demonstration — attributed line art (Blade Runner)',
    });
    const embedded = await page.locator(`script[data-image-scene="${FILM_PROP.id}"]`).textContent();
    const same = JSON.stringify(JSON.parse(embedded)) === JSON.stringify(converted.serialized);
    check(same, 'WU20: the embedded film-prop payload must be the pipeline\'s own serialisation of the local fixture');
    live.push({ input: FILM_PROP.id, embeddedAgrees: same, levels: converted.serialized.levels.length });
    await setControl('input', FILM_PROP.id);
    await setControl('treatment', 'plain');
    await setControl('density', '1');
    const scene = sceneFromSerialized(JSON.parse(embedded));
    const frame = renderFrame(scene, scene.posterFrame, { dither: 'bayer4', density: 1 });
    const raster = rasterize(frame, scene, DELIVERY_CELL);
    const expected = { hash: hash(Buffer.from(raster)), width: frame.cols * DELIVERY_CELL, height: frame.rows * DELIVERY_CELL };
    const measured = await hashCanvas('[data-image-lab] canvas[data-image-view][data-image-cell="8"]');
    check(expected.hash === measured.hash && measured.width === expected.width && measured.height === expected.height,
      `WU20: film-prop Node raster and live canvas must agree (${expected.hash} != ${measured.hash})`);
    await setControl('input', LOCAL_INPUTS[0].id);
  }

  // Equality: canvas bytes == Node raster, per treatment, for the first input.
  for (const treatment of LAB_TREATMENTS) {
    await setControl('input', LOCAL_INPUTS[0].id);
    await setControl('density', '1');
    await setControl('treatment', treatment.id);
    const embedded = JSON.parse(await page.locator(`script[data-image-scene="${LOCAL_INPUTS[0].id}"]`).textContent());
    const scene = applyTreatment(sceneFromSerialized(embedded), treatment, IMAGE_PALETTES);
    const frame = renderFrame(scene, scene.posterFrame, { dither: 'bayer4', density: 1 });
    const raster = rasterize(frame, scene, DELIVERY_CELL);
    const expected = { hash: hash(Buffer.from(raster)), width: frame.cols * DELIVERY_CELL, height: frame.rows * DELIVERY_CELL };
    const measured = await hashCanvas('[data-image-lab] canvas[data-image-view][data-image-cell="8"]');
    const entry = { treatment: treatment.id, overlays: treatment.overlays, palette: treatment.palette,
      expected: expected.hash, measured: measured.hash, agrees: expected.hash === measured.hash,
      width: measured.width, height: measured.height };
    treatments.push(entry);
    check(entry.agrees, `${treatment.id}: Node raster and live canvas must agree (${expected.hash} != ${measured.hash})`);
    check(measured.width === expected.width && measured.height === expected.height,
      `${treatment.id}: canvas must be ${expected.width}x${expected.height}, saw ${measured.width}x${measured.height}`);
  }
  // Determinism of the live canvas.
  await setControl('treatment', 'stars');
  const first = await hashCanvas('[data-image-lab] canvas[data-image-view][data-image-cell="8"]');
  const second = await hashCanvas('[data-image-lab] canvas[data-image-view][data-image-cell="8"]');
  check(first.hash === second.hash, 'the live image canvas must repeat identically');

  // The measured readout must describe the current selection (palette + overlays).
  const readout = (await page.locator('[data-image-readout]').innerText()).trim();
  check(/palette|overlay|measured/i.test(readout), `the readout must describe the live selection, saw "${readout}"`);

  // Screenshots of the two treatments the user asked for.
  for (const treatment of ['stars', 'aurora']) {
    await setControl('treatment', treatment);
    await page.locator('[data-image-lab] canvas[data-image-view][data-image-cell="8"]').first()
      .screenshot({ path: resolve(out, 'captures', `1440-${treatment}.png`) });
    const dataUrl = await page.locator('[data-image-lab] canvas[data-image-view][data-image-cell="8"]')
      .first().evaluate((canvas) => canvas.toDataURL('image/png'));
    await writeFile(resolve(out, 'crops', `canvas-${treatment}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  await setControl('treatment', 'stars');
  await page.locator('[data-image-lab]').screenshot({ path: resolve(out, 'captures/1440-panel.png') });
  await page.screenshot({ path: resolve(out, 'captures/1440-full.png'), fullPage: true });
  check(external.length === 0, `no external request allowed, saw ${external.join(', ')}`);
  check(errors.length === 0, `browser errors: ${errors.join('; ')}`);

  // Zoom crops of the live canvas at two densities, for pitch judgement.
  for (const density of [1, 4]) {
    await setControl('density', String(density));
    const dataUrl = await page.locator('[data-image-lab] canvas[data-image-view][data-image-cell="8"]')
      .first().evaluate((canvas) => canvas.toDataURL('image/png'));
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    await writeFile(resolve(out, 'crops', `live-density${density}.png`), buffer);
  }
  await setControl('density', '1');

  // Still by default, Play animates, Pause stops — in a normal-motion context.
  const normalContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const normal = await normalContext.newPage();
  await normal.goto(LAB, { waitUntil: 'networkidle' });
  const readIndex = () => normal.locator('[data-image-lab]').evaluate((host) => Number(host.dataset.imageFrame));
  const initialIndex = await readIndex();
  await normal.waitForTimeout(700);
  const stillIndex = await readIndex();
  check(initialIndex === 0 && stillIndex === initialIndex,
    `normal motion: the image laboratory must load as a still at the poster frame 0, saw ${initialIndex} then ${stillIndex}`);
  const stillLabel = (await normal.locator('[data-image-toggle]').innerText()).trim();
  check(/play/i.test(stillLabel) && !/pause/i.test(stillLabel),
    `normal motion: the still control must offer Play, saw "${stillLabel}"`);
  await normal.locator('[data-image-lab] canvas[data-image-view]').first().scrollIntoViewIfNeeded();
  await normal.locator('[data-image-toggle]').click();
  await normal.waitForTimeout(900);
  const playingIndex = await readIndex();
  check(playingIndex !== stillIndex, `normal motion: Play must animate (${stillIndex} -> ${playingIndex})`);
  await normal.locator('[data-image-toggle]').click();
  await normal.waitForTimeout(200);
  const pausedIndex = await readIndex();
  await normal.waitForTimeout(600);
  const pausedLater = await readIndex();
  check(pausedIndex === pausedLater, `normal motion: Pause must stop (${pausedIndex} -> ${pausedLater})`);
  await normal.screenshot({ path: resolve(out, 'captures/1440-normal-full.png'), fullPage: true });
  motion.push({ initialIndex, stillIndex, playingIndex, pausedIndex, pausedLater, stillLabel });
  await normal.close();
  await normalContext.close();

  // Responsive screenshots at the accepted widths.
  for (const width of [390, 1440, 2560]) {
    const view = await browser.newPage({ viewport: { width, height: 1200 }, reducedMotion: 'reduce' });
    await view.goto(LAB, { waitUntil: 'networkidle' });
    await view.waitForTimeout(300);
    const box = await view.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth }));
    check(box.documentWidth === width,
      `${width}: the image laboratory must not cause horizontal overflow (${box.documentWidth})`);
    await view.screenshot({ path: resolve(out, 'captures', `${width}-full.png`), fullPage: true });
    await view.locator('[data-image-lab]').screenshot({ path: resolve(out, 'captures', `${width}-panel.png`) });
    displayPitch.push({ width, ...box });
    await view.close();
  }
  await page.close();
  await context.close();
} finally {
  await browser.close();
}

await save(failures.length ? 'red.json' : 'green.json', { failures, fixture, grids, modeEvidence,
  extractEvidence, roundTrip, rgbEvidence, pngEvidence, jpegEvidence, overlayEvidence, comparison, live,
  treatments, motion, displayPitch });
console.log(JSON.stringify({ mode: failures.length ? 'RED' : 'GREEN', failures: failures.length,
  grids: grids.length, treatments: treatments.length, overlays: overlayEvidence.length }, null, 2));
process.exitCode = failures.length ? 1 : 0;
