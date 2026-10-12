#!/usr/bin/env node
/**
 * WU17 local acceptance — SHAPE, RAMP AND DITHER STUDY.
 * =====================================================================
 * The user asked for the mask choice to be investigated properly, with a way to
 * test every option, instead of one favourite. This file is the evidence that
 * the catalog is real: for every mask it measures the coverage ladder the mask
 * actually lays down, proves the geometry the name claims, and — the invariant
 * that must survive every option — hashes the Node raster against the live
 * canvas for the same shape, dither and cell geometry.
 *
 * What it does NOT do: it does not rank the shapes. The aesthetic call is the
 * user's; the measurements only say what is comparable (both outputs draw the
 * same bytes) and what breaks down (at how many pixels per cell a mask stops
 * holding its ladder and stops being anti-aliased).
 *
 * Evidence goes to `dist-motion-verify/wu17/**`. `--out` writes elsewhere; the
 * WU13/WU14/WU15/WU16 trees are never touched.
 *
 * Usage: node scripts/check-shape-study.mjs [--node-only] [--out <dir>]
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { loadPlaywright } from './motion-src/render.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const outFlag = process.argv.indexOf('--out');
const out = resolve(root, outFlag > -1 ? process.argv[outFlag + 1] : 'dist-motion-verify/wu17');
const nodeOnly = process.argv.includes('--node-only');
const base = 'http://127.0.0.1:4321';
const LAB = `${base}/lab/shapes`;
const SCENE_ID = 'joyan-night-coast';
const BAKED_SOURCE = 'scripts/scene-src/baked/joyan-night-coast.png';
const COVERAGE_TOLERANCE = 0.001;
const SHAPE_IDS = ['disc', 'square', 'rounded', 'diamond', 'triangle', 'hexagon', 'ring', 'cross',
  'hatch', 'grain', 'glyph'];
const DITHER_IDS = ['bayer4', 'bayer8', 'blue', 'none'];
const GEOMETRY_IDS = ['square', 'char'];
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const hash = (data) => createHash('sha256').update(data).digest('hex');
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const save = async (name, data) => writeFile(resolve(out, name), JSON.stringify(data, null, 2));
await mkdir(out, { recursive: true });
await mkdir(resolve(out, 'captures'), { recursive: true });
await mkdir(resolve(out, 'crops'), { recursive: true });

const engine = await import(new URL('./scene-src/engine.mjs', import.meta.url));
const scenes = await import(new URL('./scene-src/scenes/index.mjs', import.meta.url));
const scene = scenes.SCENES[SCENE_ID];
const { COVERAGE, DELIVERY_CELL, renderFrame, rasterize, maskFor, maskSize, cellSizeFor,
  effectiveShape, ditherThreshold, maskDerivation, shapeCoverageCap } = engine;
// RED safety: on a tree without the WU17 catalog every catalog assertion below
// must REPORT a missing surface instead of crashing on it.
const hasCatalogApi = typeof maskFor === 'function' && typeof maskSize === 'function'
  && typeof cellSizeFor === 'function' && typeof effectiveShape === 'function'
  && typeof ditherThreshold === 'function' && typeof maskDerivation === 'function';
check(hasCatalogApi,
  'the engine must export maskFor, maskSize, cellSizeFor, effectiveShape, ditherThreshold and maskDerivation');
check(Array.isArray(engine.SHAPES) && SHAPE_IDS.every((id) => engine.SHAPES.includes(id)),
  `the engine must export the mask catalog SHAPES with every mask: ${SHAPE_IDS.join(', ')}`);
check(Array.isArray(engine.DITHER_MODES) && DITHER_IDS.every((id) => engine.DITHER_MODES.includes(id)),
  `the engine must export DITHER_MODES with every dither: ${DITHER_IDS.join(', ')}`);
check(Array.isArray(engine.CELL_GEOMETRIES) && GEOMETRY_IDS.every((id) => engine.CELL_GEOMETRIES.includes(id)),
  `the engine must export CELL_GEOMETRIES with every cell geometry: ${GEOMETRY_IDS.join(', ')}`);

/** Independent geometry metrics for one mask (computed here, not in the engine). */
function metrics(mask, w, h) {
  const at = (x, y) => mask[y * w + x];
  const cx = w / 2;
  const cy = h / 2;
  let total = 0;
  let outsideDisc = 0;
  let binary = 0;
  let above = 0;
  let below = 0;
  let transpose = 0;
  let rotate = 0;
  let diagonal = 0;
  let diagonalPairs = 0;
  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const value = at(x, y);
      total += value;
      if (value < 0.05 || value > 0.95) binary += 1;
      if (value > 0.5) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      if (y + 0.5 < cy) above += value;
      else below += value;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > cx * cx) outsideDisc += value;
      if (at(x, y) === at(y % w, x % h)) transpose += 1;
      if (at(x, y) === at(w - 1 - x, h - 1 - y)) rotate += 1;
      if (x + 1 < w && y + 1 < h) {
        diagonalPairs += 1;
        if (at(x, y) === at(x + 1, y + 1)) diagonal += 1;
      }
    }
  }
  const corner = Math.max(at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1));
  const edgeMid = mean([at((w / 2) | 0, 0), at((w / 2) | 0, h - 1), at(0, (h / 2) | 0), at(w - 1, (h / 2) | 0)]);
  // Separability: an axis-aligned rectangle (including a clipped one) is exactly
  // its own row x column product, so this is the strongest "the square is a
  // square" test available and it is 0.000 for the square alone.
  const rowMax = [];
  const colMax = [];
  for (let y = 0; y < h; y++) {
    let best = 0;
    for (let x = 0; x < w; x++) best = Math.max(best, at(x, y));
    rowMax.push(best);
  }
  for (let x = 0; x < w; x++) {
    let best = 0;
    for (let y = 0; y < h; y++) best = Math.max(best, at(x, y));
    colMax.push(best);
  }
  let separability = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      separability = Math.max(separability, Math.abs(at(x, y) - rowMax[y] * colMax[x]));
    }
  }
  const bbox = maxX >= minX && maxY >= minY ? (maxX - minX + 1) * (maxY - minY + 1) : 1;
  let firstRow = -1;
  for (let y = 0; y < h && firstRow < 0; y++) {
    for (let x = 0; x < w; x++) if (at(x, y) > 0.5) { firstRow = y; break; }
  }
  let firstRowRun = 0;
  if (firstRow >= 0) for (let x = 0; x < w; x++) if (at(x, firstRow) > 0.5) firstRowRun += 1;
  return {
    coverage: total / (w * h),
    cornerFill: corner,
    edgeMidFill: edgeMid,
    centreFill: at((w / 2) | 0, (h / 2) | 0),
    cornerRatio: edgeMid > 0 ? corner / edgeMid : 0,
    outsideDiscMass: total > 0 ? outsideDisc / total : 0,
    transposeSymmetry: transpose / (w * h),
    rotationSymmetry: rotate / (w * h),
    diagonalInvariance: diagonalPairs > 0 ? diagonal / diagonalPairs : 0,
    binaryFraction: binary / (w * h),
    massBelowOverAbove: above > 0 ? below / above : Infinity,
    topRowWidth: w > 0 ? firstRowRun / w : 0,
    centreRowFill: [...Array(w).keys()].filter((x) => at(x, (h / 2) | 0) > 0.5).length / w,
    centreColFill: [...Array(h).keys()].filter((y) => at((w / 2) | 0, y) > 0.5).length / h,
    bboxFill: total / bbox,
    separability,
    distinctCoverages: new Set([...mask]).size,
  };
}

/** The mask value at the pixel containing a probe point, in cell units. */
function probeAt(mask, w, h, u, v) {
  const px = Math.min(w - 1, Math.max(0, Math.floor((u + 0.5) * w)));
  const py = Math.min(h - 1, Math.max(0, Math.floor((v + 0.5) * h)));
  return mask[py * w + px];
}

// ---------------------------------------------------------------------------
// 1. The catalog, in Node: every mask holds the measured ladder, and the ladder
//    is measured again at a small pitch, which is where a mask breaks down.
// ---------------------------------------------------------------------------
const catalog = [];
if (hasCatalogApi) {
for (const shape of SHAPE_IDS) {
  const rows = [];
  for (const cell of [8, 4, 2]) {
    const box = cellSizeFor('square', cell);
    for (let step = 1; step < 5; step++) {
      const mask = maskFor(shape, step, box.w, box.h, 'shape', 'square');
      const stats = metrics(mask, box.w, box.h);
      rows.push({ cell, step, ...stats, size: maskSize(shape, 'shape', 'square', step) });
      // A shape that cannot cover a whole cell (the ring's hole grows with it) is
      // allowed its stated cap at the WU19 full-coverage rung.
      const cap = typeof shapeCoverageCap === 'function' ? shapeCoverageCap(shape) : 1;
      const wanted = Math.min(COVERAGE[step], cap);
      check(Math.abs(stats.coverage - wanted) < COVERAGE_TOLERANCE,
        `${shape}: step ${step} at ${cell} px per cell covers ${stats.coverage.toFixed(4)} `
        + `against the ladder ${wanted}`);
    }
  }
  const derivation = maskDerivation(shape);
  check(typeof derivation === 'string' && derivation.length > 30,
    `${shape}: the derivation of its size from the ladder must be stated`);
  catalog.push({ shape, derivation, rows });
}
}
const at = (...args) => {
  if (!hasCatalogApi) return { coverage: 0, cornerRatio: 0, outsideDiscMass: 1, cornerFill: 1, edgeMidFill: 0,
    centreFill: 1, diagonalInvariance: 0, transposeSymmetry: 1, binaryFraction: 0, massBelowOverAbove: 1,
    topRowWidth: 0, centreRowFill: 0, centreColFill: 0, distinctCoverages: 0, rotationSymmetry: 1, size: 0,
    bboxFill: 0, separability: 0 };
  const [shape, cell, step] = args;
  return catalog.find((entry) => entry.shape === shape).rows.find((row) => row.cell === cell && row.step === step);
};
// Geometry proofs run on the legible reference (32 px per cell); the ladder is
// checked at 8, 4 and 2 px instead.
const proof = (shape, step, cell = 32) => (hasCatalogApi
  ? metrics(maskFor(shape, step, cell, cell, 'shape', 'square'), cell, cell)
  : { coverage: 0, cornerRatio: 0, outsideDiscMass: 1, cornerFill: 1, edgeMidFill: 0, centreFill: 1,
    diagonalInvariance: 0, transposeSymmetry: 1, binaryFraction: 0, massBelowOverAbove: 1, topRowWidth: 0,
    centreRowFill: 0, centreColFill: 0, distinctCoverages: 0, rotationSymmetry: 1, size: 0, bboxFill: 0,
    separability: 0 });
let pitch = [];
if (hasCatalogApi) {
check(proof('square', 4).separability <= 0.02 && proof('square', 4).outsideDiscMass >= 0.05,
  'square: a square must be its own row x column product and keep mass outside the inscribed disc');
check(proof('disc', 4).outsideDiscMass <= 0.05 && proof('disc', 4).separability >= 0.2,
  'disc: no corner mass outside the inscribed disc, and not a separable block');
check(proof('ring', 4).centreFill <= 0.05 && proof('ring', 4).edgeMidFill >= 0.5,
  'ring: a hole must be visible at the centre of the largest step');
check(proof('triangle', 4).massBelowOverAbove >= 1.4,
  'triangle: the mass must be asymmetric above and below the centre');
check(proof('diamond', 1).topRowWidth <= 0.12 && proof('diamond', 1).bboxFill <= 0.65,
  'diamond: the axes are inked, the diagonals are empty and the bounding box is half full');
check(proof('hexagon', 1).bboxFill >= 0.7 && proof('hexagon', 1).bboxFill <= 0.9
  && proof('hexagon', 1).separability >= 0.2,
'hexagon: a pointy top, empty corners and a bounding box fuller than a diamond, emptier than a square');
check(probeAt(maskFor('cross', 1, 32, 32, 'shape', 'square'), 32, 32, 0, 0) > 0.5
  && probeAt(maskFor('cross', 1, 32, 32, 'shape', 'square'), 32, 32, 0.25, 0.25) <= 0.05
  && probeAt(maskFor('cross', 1, 32, 32, 'shape', 'square'), 32, 32, 0, 0.22) > 0.5,
'cross: two bars through the centre, empty quadrants and inked arm tips (tip probe at 0.22: the WU22 step-1 arm solves to 0.2634 of a cell)');
check(proof('hatch', 3).diagonalInvariance >= 0.9, 'hatch: neighbouring pixels along one diagonal keep the same coverage');
check(proof('grain', 1).transposeSymmetry <= 0.8 && proof('grain', 1).rotationSymmetry <= 0.8
  && proof('grain', 1).binaryFraction >= 0.9,
'grain: coverage without a shape');
check(proof('rounded', 3).separability >= 0.2 && proof('rounded', 1).bboxFill >= 0.85,
  'rounded: a square whose corners are cut');
check(proof('glyph', 1).binaryFraction >= 0.9 && proof('glyph', 1).separability >= 0.2,
  'glyph: a hard bitmap glyph, not an anti-aliased disc');
pitch = [8, 4, 2].map((cell) => {
  const distinct = hasCatalogApi ? SHAPE_IDS.map((shape) => at(shape, cell, 1).distinctCoverages) : [0, 0];
  return { cell, minDistinctCoverages: Math.min(...distinct), maxDistinctCoverages: Math.max(...distinct),
    shapesAtTwoLevels: hasCatalogApi ? SHAPE_IDS.filter((shape) => at(shape, cell, 1).distinctCoverages <= 2) : [] };
});
}

// ---------------------------------------------------------------------------
// 2. Node raster hashes per shape, dither and geometry: the bytes the live
//    canvas must reproduce. Memoised so the browser section compares every
//    combination it visits against the same Node bytes.
// ---------------------------------------------------------------------------
const V = { shape: 'disc', ramp: 'shape', dither: 'bayer4', geometry: 'square' };
const poster = scene.posterFrame;
const nodeCache = new Map();
function nodeOf(shape, dither, geometry, cell = DELIVERY_CELL, density = 1) {
  const key = `${shape}|${dither}|${geometry}|${cell}|${density}`;
  const cached = nodeCache.get(key);
  if (cached) return cached;
  const options = { ...V, shape, dither, geometry, density };
  const box = hasCatalogApi ? cellSizeFor(geometry, cell) : { w: cell, h: cell };
  const frame = renderFrame(scene, poster, hasCatalogApi ? options : V);
  const raster = hasCatalogApi
    ? rasterize(frame, scene, cell, undefined, options)
    : rasterize(frame, scene, cell);
  const entry = { key, shape, dither, geometry, cell, density, hash: hash(Buffer.from(raster)),
    width: frame.cols * box.w, height: frame.rows * box.h, frame: frame.frame, bytes: raster.length };
  nodeCache.set(key, entry);
  return entry;
}
if (hasCatalogApi) {
for (const shape of SHAPE_IDS) {
  nodeOf(shape, 'bayer4', 'square');
  nodeOf(shape, 'none', 'square');
  nodeOf(shape, 'bayer4', 'char');
}
for (const dither of DITHER_IDS) {
  nodeOf('disc', dither, 'square');
  nodeOf('disc', dither, 'char');
}
const charKey = `disc|bayer4|char|${DELIVERY_CELL}|1`;
check(nodeHashesOf(charKey).height === scene.rows * DELIVERY_CELL * 2,
  'the 1:2 cell geometry must deliver a taller raster');
check(nodeHashesOf(charKey).hash !== nodeHashesOf(`disc|bayer4|square|${DELIVERY_CELL}|1`).hash,
  'the 1:2 cell geometry must change the raster against 1:1');
}
function nodeHashesOf(key) { return nodeCache.get(key); }
const nodeHashes = Object.fromEntries([...nodeCache].map(([key, entry]) => [key, entry]));
check(hasCatalogApi && DITHER_IDS.every((dither) => nodeHashes[`disc|${dither}|square|${DELIVERY_CELL}|1`]?.hash),
  'every dither mode must have Node bytes recorded for comparison');
check(hasCatalogApi && new Set(['bayer4', 'bayer8', 'blue'].map((dither) => nodeHashes[`disc|${dither}|square|${DELIVERY_CELL}|1`].hash)).size === 3,
  'the ordered, 8x8 and blue-noise dithers must draw different bytes');

// Ramp switchability: each ramp draws different bytes and resolves to the mask
// its name promises.
let rampHashes = {};
if (hasCatalogApi) {
for (const ramp of ['shape', 'block', 'glyph']) {
  const options = { ...V, ramp };
  const raster = rasterize(renderFrame(scene, poster, options), scene, DELIVERY_CELL, undefined, options);
  rampHashes[ramp] = { hash: hash(Buffer.from(raster)), shape: effectiveShape('diamond', ramp) };
}
check(new Set(Object.values(rampHashes).map((entry) => entry.hash)).size === 3,
  `every ramp must draw different bytes, saw ${JSON.stringify(rampHashes)}`);
check(rampHashes.block.shape === 'square', 'the block ramp must draw hard squares');
check(rampHashes.glyph.shape === 'glyph', 'the glyph ramp must draw the adopted glyph atlas');
}
// Tone resolution: the distinct pixel coverages each option actually offers in
// one delivered cell — the honest limit of the tone a mask can carry.
const toneResolution = hasCatalogApi ? [...SHAPE_IDS, 'ramp:block', 'ramp:glyph'].map((label) => {
  const ramp = label.startsWith('ramp:') ? label.slice(5) : 'shape';
  const shape = label.startsWith('ramp:') ? effectiveShape('disc', ramp) : label;
  const box = cellSizeFor('square', 8);
  return { label, ramp, shape, perStep: [1, 2, 3, 4].map((step) =>
    new Set([...maskFor(shape, step, box.w, box.h, ramp, 'square')]).size) };
}) : [];
const ditherLevels = hasCatalogApi ? DITHER_IDS.map((mode) => {
  const values = [...Array(256).keys()].map((i) => ditherThreshold(mode, i % 16, (i / 16) | 0));
  return { mode, levels: new Set(values).size, min: Math.min(...values), max: Math.max(...values) };
}) : [];

// ---------------------------------------------------------------------------
// 2b. RAMP REALITY, MEASURED. The hard `block` ramp snaps every pixel to 0 or 1,
//     so it does NOT hold the ladder: its cell mean is whatever whole pixels can
//     reach at that pitch. The bitmap `glyph` ramp is the one whose footprints are
//     15, 31 and 52 of 64 cells, and it holds the ladder at every pitch. Both are
//     measured here, and the measured numbers are then required to appear in the
//     docs, so a documented claim cannot drift from the raster.
// ---------------------------------------------------------------------------
const maskMean = (mask) => mask.reduce((sum, value) => sum + value, 0) / mask.length;
const blockRamp = {};
const glyphRamp = {};
for (const cell of [8, 4, 2, 16, 32]) {
  const read = (ramp) => [1, 2, 3, 4].map((step) => maskMean(maskFor('disc', step, cell, cell, ramp, 'square')));
  blockRamp[cell] = read('block');
  glyphRamp[cell] = read('glyph');
}
const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;
check(blockRamp[8].every((value, index) => near(value, [0.25, 0.25, 0.5625, 0.9375][index]))
  && blockRamp[4].every((value, index) => near(value, [0.25, 0.25, 0.75, 1][index])),
`the hard block ramp quantises to whole pixels: measured ${JSON.stringify(blockRamp[8])} at 8 px per cell and ${JSON.stringify(blockRamp[4])} at 4 px per cell (WU22 ladder: the smaller step-2 block quantises to the same 0.25 as step 1 at 8 px)`);
check(blockRamp[8].some((value, index) => Math.abs(value - COVERAGE[index + 1]) > 0.01),
  'the block ramp must not be described as holding the ladder: it snaps to whole pixels');
for (const cell of [8, 4, 2, 16, 32]) {
  check(glyphRamp[cell].every((value, index) => Math.abs(value - COVERAGE[index + 1]) < 0.001),
    `the glyph table must hold the ladder at ${cell} px per cell, saw ${JSON.stringify(glyphRamp[cell])}`);
}
// The documented numbers must equal the measured ones. This is the guard that
// makes the docs impossible to leave stale: the values checked below are not
// literals, they are the metrics computed above, rendered as the docs render them.
const motorDoc = await readFile(resolve(root, 'docs/MOTOR-ESCENAS.md'), 'utf8');
const designDoc = await readFile(resolve(root, 'docs/DESIGN.md'), 'utf8');
// WU18 added the third laboratory route; the three must link to each other and
// the image route must be real. On a tree without it this reports, not crashes.
let imageLabHtml = '';
try {
  imageLabHtml = await readFile(resolve(root, 'dist/lab/image/index.html'), 'utf8');
} catch (error) {
  check(false, `the WU18 image laboratory is missing at dist/lab/image/index.html: ${error.message}`);
}
if (imageLabHtml) {
  check(/href="\/lab\/ascii"/.test(imageLabHtml) && /href="\/lab\/shapes"/.test(imageLabHtml),
    'the image laboratory must link to the ASCII and shape laboratories');
  check(imageLabHtml.includes('data-image-lab') && imageLabHtml.includes('data-image-control="treatment"'),
    'the image laboratory must mount the converted-input surface with its treatment control');
}
const shapesLabHtml = await readFile(resolve(root, 'dist/lab/shapes/index.html'), 'utf8');
check(/href="\/lab\/image"/.test(shapesLabHtml),
  'the shape laboratory must link to the image laboratory');
const spanish = (value, digits = 4) => value.toFixed(digits).replace('.', ',');
const geometryProofs = hasCatalogApi ? {
  pitch: 32,
  roundedBboxFillStep3: proof('rounded', 3).bboxFill,
  roundedBboxFillStep1: proof('rounded', 1).bboxFill,
  triangleTransposeStep3: proof('triangle', 3).transposeSymmetry,
  triangleTransposeStep3At64: metrics(maskFor('triangle', 3, 64, 64, 'shape', 'square'), 64, 64).transposeSymmetry,
  hatchDiagonalStep3: proof('hatch', 3).diagonalInvariance,
  hatchDiagonalStep3At16: metrics(maskFor('hatch', 3, 16, 16, 'shape', 'square'), 16, 16).diagonalInvariance,
  hatchDiagonalStep3At64: metrics(maskFor('hatch', 3, 64, 64, 'shape', 'square'), 64, 64).diagonalInvariance,
  hexagonLabel: maskDerivation('hexagon'),
} : { pitch: 32 };
check(hasCatalogApi && motorDoc.includes(spanish(geometryProofs.roundedBboxFillStep3)),
`MOTOR 12.2 must state the measured rounded bounding-box fill ${spanish(geometryProofs.roundedBboxFillStep3)} (32 px per cell, step 3)`);
check(hasCatalogApi && motorDoc.includes(spanish(geometryProofs.triangleTransposeStep3)),
`MOTOR 12.2 must state the measured triangle transpose symmetry ${spanish(geometryProofs.triangleTransposeStep3)} (32 px per cell, step 3)`);
check(hasCatalogApi && motorDoc.includes(spanish(geometryProofs.hatchDiagonalStep3)),
`MOTOR 12.2 must state the measured hatch diagonal invariance ${spanish(geometryProofs.hatchDiagonalStep3)} (32 px per cell, step 3)`);
check(!motorDoc.includes('0,938'),
  'MOTOR 12.2 must not carry the old rounded bounding-box fill 0,938 (0,9244 at step 3, 0,9376 at step 1)');
check(blockRamp[8].every((value) => motorDoc.includes(spanish(value))),
  `MOTOR 12.3 must carry the measured hard-block means ${JSON.stringify(blockRamp[8])}`);
check(/32 px por celda/.test(motorDoc),
  'MOTOR 12.2 must state the pitch its geometry metrics were measured at');
check(/puntiagudo|vértice arriba/i.test(motorDoc) && !/techo plano/i.test(motorDoc),
  'MOTOR 12.2 must call the hexagon pointy-top, not flat-top');
check(hasCatalogApi && /pointy/i.test(maskDerivation('hexagon')) && !/flat-top/i.test(maskDerivation('hexagon')),
`the engine's hexagon derivation must say pointy-top, saw ${hasCatalogApi ? JSON.stringify(maskDerivation('hexagon')) : 'nothing'}`);
check(!/flat-top/i.test(designDoc), 'DESIGN must not call the hexagon flat-top');
check(designDoc.includes(geometryProofs.hatchDiagonalStep3.toFixed(4)),
`DESIGN must state the measured hatch diagonal invariance ${geometryProofs.hatchDiagonalStep3.toFixed(4)} at 32 px per cell`);
check(designDoc.includes(blockRamp[8][1].toFixed(4)),
`DESIGN must state the measured hard-block mean ${blockRamp[8][1].toFixed(4)} at 8 px per cell`);

// ---------------------------------------------------------------------------
// 3. The baked still is still the engine's poster frame, pixel for pixel.
// ---------------------------------------------------------------------------
let bakedEvidence = { path: BAKED_SOURCE, exists: false };
try {
  const baked = await readFile(resolve(root, BAKED_SOURCE));
  const meta = await sharp(baked).metadata();
  const raw = await sharp(baked).ensureAlpha().raw().toBuffer();
  const current = nodeOf('disc', 'bayer4', 'square');
  check(meta.width === scene.cols * DELIVERY_CELL && meta.height === scene.rows * DELIVERY_CELL,
    `the baked still must stay ${scene.cols * DELIVERY_CELL}x${scene.rows * DELIVERY_CELL}`);
  check(hash(raw) === current.hash,
    'the baked still must still be exactly the engine raster of the poster frame');
  bakedEvidence = { path: BAKED_SOURCE, exists: true, bytes: baked.length, sha256: hash(baked),
    width: meta.width, height: meta.height, equalsPosterFrame: hash(raw) === current.hash };
} catch (error) {
  check(false, `the baked still is missing or unreadable: ${error.message}`);
}

await save('node.json', { failures, catalog, pitch, nodeHashes, rampHashes, toneResolution, ditherLevels,
  bakedEvidence, coverageTolerance: COVERAGE_TOLERANCE, blockRamp, glyphRamp, geometryProofs });

// Zoom crops of the engine's own bytes, so the shapes can be judged by eye.
const cropOf = async (shape, cell, name) => {
  const box = cellSizeFor('square', cell);
  const options = { ...V, shape };
  const frame = renderFrame(scene, poster, options);
  const raster = rasterize(frame, scene, cell, undefined, options);
  const cellsWide = 16;
  const cellsHigh = 12;
  const left = ((frame.cols - cellsWide) / 2) | 0;
  const top = ((frame.rows - cellsHigh) / 2) | 0;
  await sharp(Buffer.from(raster), { raw: { width: frame.cols * box.w, height: frame.rows * box.h, channels: 4 } })
    .extract({ left: left * box.w, top: top * box.h, width: cellsWide * box.w, height: cellsHigh * box.h })
    .resize(cellsWide * box.w * 4, cellsHigh * box.h * 4, { kernel: 'nearest' })
    .png()
    .toFile(resolve(out, 'crops', name));
};
for (const shape of SHAPE_IDS) {
  if (!hasCatalogApi) break;
  await cropOf(shape, 8, `node-${shape}-cell8.png`);
  await cropOf(shape, 4, `node-${shape}-cell4.png`);
}

if (nodeOnly) {
  console.log(JSON.stringify({ mode: failures.length ? 'RED' : 'GREEN', nodeOnly, failures, pitch }, null, 2));
  await save(failures.length ? 'red.json' : 'green.json', { failures, catalog, pitch, nodeHashes, bakedEvidence,
    blockRamp, glyphRamp, geometryProofs });
  process.exit(failures.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// 4. The live surface: the same bytes on a canvas, per shape, per dither and per
//    cell geometry. The fixed board is what makes every shape comparable without
//    clicking, so it is also the honest place to prove the equality.
// ---------------------------------------------------------------------------
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const live = [];
const frames = [];
const motion = [];
const displayPitchRows = [];
const canvasDumps = [];
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
  check(response.status() === 200, `shape laboratory HTTP ${response.status()}`);
  check(await page.locator('[data-shape-lab]').count() === 1, 'exactly one shape laboratory mount required');
  check(await page.locator('[data-shape-board-row="overview"] [data-shape-board-item]').count() === SHAPE_IDS.length,
    `the fixed overview board must show all ${SHAPE_IDS.length} shapes at once`);
  const hexagonCaption = (await page.locator('[data-shape-board-row="overview"] [data-shape-for="hexagon"] figcaption').innerText()).trim();
  check(/pointy/i.test(hexagonCaption) && !/flat-top/i.test(hexagonCaption),
    `the board must label the hexagon pointy-top, saw "${hexagonCaption}"`);
  check((await page.locator('[data-shape-lab] canvas[data-shape-view]').count()) >= 3,
    'the laboratory must show its result at several widths');

  const hashCanvas = (selector) => page.locator(selector).evaluate(async (canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const digest = await crypto.subtle.digest('SHA-256', data);
    return { hash: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join(''),
      width: canvas.width, height: canvas.height };
  });
  const setControl = async (name, value) => {
    await page.selectOption(`[data-shape-lab] [data-shape-control="${name}"]`, value);
    await page.waitForTimeout(200);
  };
  const compareBoard = async (shape, dither, geometry) => {
    const measured = await hashCanvas(`[data-shape-board-row="overview"] [data-shape-for="${shape}"] canvas`);
    const expected = nodeOf(shape, dither, geometry, 4);
    // The board always draws the shape ramp at 4 px per cell; the dither and the
    // cell geometry are the live controls, so the comparison is exact and complete.
    check(measured.hash === expected.hash,
      `${expected.key}: Node raster and live canvas must agree (${expected.hash} != ${measured.hash})`);
    check(measured.width === expected.width && measured.height === expected.height,
      `${expected.key}: the live canvas must be ${expected.width}x${expected.height}, saw ${measured.width}x${measured.height}`);
    live.push({ ...expected, ...measured, expected: expected.hash, agrees: measured.hash === expected.hash });
  };

  for (const [dither, geometry, shapes] of [
    ['bayer4', 'square', SHAPE_IDS],
    ['none', 'square', SHAPE_IDS],
    ['bayer4', 'char', SHAPE_IDS],
    ['bayer8', 'square', ['disc']],
    ['blue', 'square', ['disc']],
  ]) {
    await setControl('dither', dither);
    await setControl('geometry', geometry);
    for (const shape of shapes) await compareBoard(shape, dither, geometry);
  }
  await setControl('dither', 'bayer4');
  await setControl('geometry', 'square');
  await setControl('shape', 'disc');
  // The view panes deliver at 8 px per cell: the same equality at the delivery
  // pitch, and once at the 1:2 cell geometry.
  for (const [dither, geometry, shapes] of [['bayer4', 'square', ['disc', 'hexagon']],
    ['blue', 'char', ['ring']]]) {
    await setControl('dither', dither);
    await setControl('geometry', geometry);
    for (const shape of shapes) {
      await setControl('shape', shape);
      const measured = await page.locator('[data-shape-lab] canvas[data-shape-view][data-shape-cell="8"]').first()
        .evaluate(async (canvas) => {
          const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
          const digest = await crypto.subtle.digest('SHA-256', data);
          return { hash: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join(''),
            width: canvas.width, height: canvas.height };
        });
      const expected = nodeOf(shape, dither, geometry, DELIVERY_CELL);
      check(measured.hash === expected.hash,
        `${expected.key}: the view pane must agree with the Node raster (${expected.hash} != ${measured.hash})`);
      live.push({ ...expected, ...measured, expected: expected.hash, agrees: measured.hash === expected.hash });
    }
  }
  await setControl('dither', 'bayer4');
  await setControl('geometry', 'square');
  await setControl('shape', 'disc');
  // The live board must be deterministic: re-reading the same canvas twice.
  const first = await hashCanvas('[data-shape-board-row="overview"] [data-shape-for="disc"] canvas');
  const second = await hashCanvas('[data-shape-board-row="overview"] [data-shape-for="disc"] canvas');
  check(first.hash === second.hash, 'the live board canvas must repeat identically');

  // The 1x LEGIBILITY ROW. The overview board shows 200 cells across a pane of
  // roughly 230 CSS px, i.e. about 1.1 CSS px per cell, where the shapes cannot be
  // judged; the pixel-scale row draws the same frame on 50 x 25 cells at 8 px per
  // cell and shows it at a fixed 160 px, so one cell is about 3.2 CSS px at 1x.
  // The row must exist, must be judgeable, and must agree with Node byte for byte.
  const legibility = await page.evaluate(() => [...document.querySelectorAll('[data-shape-board-row="pixel"] canvas')]
    .map((canvas) => {
      const box = canvas.getBoundingClientRect();
      const density = Number(canvas.dataset.shapeDensity ?? 1);
      const cells = 200 / density;
      return { density, cells, cssPerCell: box.width / cells, backingPerCell: canvas.width / cells };
    }));
  // The on-screen pitch of all three surfaces, so the copy can say what a 1x
  // viewer actually sees instead of what the backing store holds.
  const displayPitch = await page.evaluate(() => {
    const measure = (selector) => {
      const canvas = document.querySelector(selector);
      if (!canvas) return null;
      const density = Number(canvas.dataset.shapeDensity ?? 1);
      const cells = 200 / density;
      return { density, cells, cssPerCell: canvas.getBoundingClientRect().width / cells,
        backingPerCell: canvas.width / cells };
    };
    return {
      overview: measure('[data-shape-board-row="overview"] canvas'),
      pixel: measure('[data-shape-board-row="pixel"] canvas'),
      view: measure('[data-shape-lab] canvas[data-shape-view]'),
    };
  });
  check(displayPitch.overview !== null && displayPitch.overview.cssPerCell < 2,
    `the overview board must be reported as a texture overview (about 1 CSS px per cell), saw ${JSON.stringify(displayPitch.overview)}`);
  check(displayPitch.pixel !== null && displayPitch.pixel.cssPerCell >= 3,
    `the 1x row must be judgeable (at least 3 CSS px per cell), saw ${JSON.stringify(displayPitch.pixel)}`);
  displayPitchRows.push(displayPitch);
  // The copy must carry the measured on-screen pitches, so the page cannot claim a
  // legibility nobody measured.
  const shapePageHtml = await readFile(resolve(root, 'dist/lab/shapes/index.html'), 'utf8');
  const asWritten = (value) => String(Math.round(value * 100) / 100);
  check(shapePageHtml.includes(asWritten(displayPitch.overview.cssPerCell)),
    `the study copy must state the measured overview pitch ${asWritten(displayPitch.overview.cssPerCell)} CSS px per cell`);
  check(shapePageHtml.includes(asWritten(displayPitch.pixel.cssPerCell)),
    `the study copy must state the measured 1x pitch ${asWritten(displayPitch.pixel.cssPerCell)} CSS px per cell`);
  check(legibility.length === SHAPE_IDS.length,
    `the 1x legibility row must draw every shape, saw ${legibility.length}`);
  check(legibility.every((pane) => pane.cssPerCell >= 3),
    `every 1x pane must show at least 3 CSS px per cell, saw ${JSON.stringify(legibility.map((pane) => Number(pane.cssPerCell.toFixed(2))))}`);
  // Only compare and dump when the row exists: on a tree without it the RED run
  // must report the missing row and keep going, not time out on a missing locator.
  if (legibility.length === SHAPE_IDS.length) {
    for (const shape of SHAPE_IDS) {
      const measured = await hashCanvas(`[data-shape-board-row="pixel"] [data-shape-for="${shape}"] canvas`);
      const expected = nodeOf(shape, 'bayer4', 'square', DELIVERY_CELL, 4);
      check(measured.hash === expected.hash,
        `${expected.key}: the 1x pane must agree with the Node raster (${expected.hash} != ${measured.hash})`);
      live.push({ ...expected, ...measured, expected: expected.hash, agrees: measured.hash === expected.hash });
    }
    await page.locator('[data-shape-board-row="pixel"]').screenshot({ path: resolve(out, 'captures/1440-pixel-row.png') });
    for (const shape of ['disc', 'square', 'ring', 'triangle']) {
      const dataUrl = await page.locator(`[data-shape-board-row="pixel"] [data-shape-for="${shape}"] canvas`)
        .evaluate((canvas) => canvas.toDataURL('image/png'));
      const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
      await writeFile(resolve(out, 'crops', `pixel-${shape}.png`), buffer);
      canvasDumps.push({ label: `pixel-${shape}`, bytes: buffer.length, sha256: hash(buffer) });
    }
  }

  await page.locator('[data-shape-lab]').screenshot({ path: resolve(out, 'captures/1440-panel.png') });
  await page.locator('section[data-shape-board]').screenshot({ path: resolve(out, 'captures/1440-board.png') });  await page.screenshot({ path: resolve(out, 'captures/1440-full.png'), fullPage: true });
  check(external.length === 0, `no external request allowed, saw ${external.join(', ')}`);
  check(errors.length === 0, `browser errors: ${errors.join('; ')}`);

  // Real canvas bytes, so the equality is also visible: one dump per pitch and a
  // couple of shapes from the live board.
  for (const [label, selector] of [
    ['view-cell8', '[data-shape-lab] canvas[data-shape-view][data-shape-cell="8"]'],
    ['view-cell4', '[data-shape-lab] canvas[data-shape-view][data-shape-cell="4"]'],
    ['board-disc', '[data-shape-board-row="overview"] [data-shape-for="disc"] canvas'],
    ['board-square', '[data-shape-board-row="overview"] [data-shape-for="square"] canvas'],
    ['board-triangle', '[data-shape-board-row="overview"] [data-shape-for="triangle"] canvas'],
  ]) {
    const dataUrl = await page.locator(selector).first().evaluate((canvas) => canvas.toDataURL('image/png'));
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    await writeFile(resolve(out, 'crops', `canvas-${label}.png`), buffer);
    canvasDumps.push({ label, bytes: buffer.length, sha256: hash(buffer) });
  }

  // Bounded frame-time sample per shape and per dither mode. Method: the lab
  // exposes a lab-only probe that runs N engine renders + rasterisations +
  // putImageData with the CURRENT controls; the masks are already cached, so the
  // sample measures the per-frame path and not the one-time mask construction.
  // Chromium only, one host, 20 iterations: a comparable sample, not a
  // generalisation, and not a statement about any other browser or machine.
  const probe = async (label) => {
    const sample = await page.evaluate(async () => {
      if (typeof window.__joyanShapeProbe !== 'function') return null;
      return window.__joyanShapeProbe(20);
    });
    if (!sample) { check(false, `the laboratory must expose the bounded frame-time probe: ${label}`); return; }
    frames.push({ label, ...sample });
  };
  for (const shape of SHAPE_IDS) {
    await setControl('shape', shape);
    await probe(`shape:${shape}`);
  }
  // The sample is a bounded observation, not an ordering: the medians of the
  // options must stay inside a plausible band, and the spread across the eleven
  // shapes is reported rather than turned into a claim about which mask is
  // cheaper. Run-to-run variance on one host swallows the differences.
  const shapeMedians = frames.filter((sample) => sample.label.startsWith('shape:'))
    .map((sample) => sample.median);
  check(shapeMedians.length === SHAPE_IDS.length && shapeMedians.every((value) => value > 5 && value < 60),
    `every shape's median frame time must be a plausible bounded sample, saw ${JSON.stringify(shapeMedians)}`);
  check(Math.max(...shapeMedians) - Math.min(...shapeMedians) <= 5,
    `the shape medians must not be reported as an ordering: spread ${(Math.max(...shapeMedians) - Math.min(...shapeMedians)).toFixed(2)} ms`);
  await setControl('shape', 'disc');
  for (const dither of DITHER_IDS) {
    await setControl('dither', dither);
    await probe(`dither:${dither}`);
  }
  await setControl('dither', 'bayer4');
  for (const geometry of GEOMETRY_IDS) {
    await setControl('geometry', geometry);
    await probe(`geometry:${geometry}`);
  }
  await setControl('geometry', 'square');
  await probe('baseline');

  // NORMAL MOTION: the study must be a STILL on load, animate only after Play,
  // and stop again on Pause. The rest of this run emulates reduced motion, so
  // this needs its own context (this is the guard the RED run was missing: the
  // study used to animate on load while the docs and the page said it did not).
  const normalContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const normal = await normalContext.newPage();
  await normal.goto(LAB, { waitUntil: 'networkidle' });
  const readIndex = () => normal.locator('[data-shape-lab]').evaluate((host) => Number(host.dataset.shapeFrame));
  const initialIndex = await readIndex();
  await normal.waitForTimeout(900);
  const stillIndex = await readIndex();
  check(initialIndex === scene.posterFrame && stillIndex === initialIndex,
    `normal motion: the study must load as a still at the poster frame ${scene.posterFrame}, saw ${initialIndex} then ${stillIndex}`);
  const stillLabel = (await normal.locator('[data-shape-toggle]').innerText()).trim();
  const stillStatus = (await normal.locator('[data-shape-status]').innerText()).trim();
  check(/play/i.test(stillLabel) && !/pause/i.test(stillLabel),
    `normal motion: the still study's control must offer Play, saw "${stillLabel}"`);
  check(!/playing/i.test(stillStatus),
    `normal motion: the still study must not claim to be playing, saw "${stillStatus}"`);
  await normal.locator('[data-shape-lab] canvas[data-shape-view]').first().scrollIntoViewIfNeeded();
  await normal.waitForTimeout(250);
  await normal.locator('[data-shape-toggle]').click();
  await normal.waitForTimeout(1200);
  const playingIndex = await readIndex();
  const playingLabel = (await normal.locator('[data-shape-toggle]').innerText()).trim();
  const playingStatus = (await normal.locator('[data-shape-status]').innerText()).trim();
  check(playingIndex !== stillIndex,
    `normal motion: Play must animate the view panes (${stillIndex} -> ${playingIndex})`);
  check(/pause/i.test(playingLabel),
    `normal motion: while playing the control must offer Pause, saw "${playingLabel}"`);
  check(/playing/i.test(playingStatus),
    `normal motion: while playing the status must say so, saw "${playingStatus}"`);
  await normal.locator('[data-shape-toggle]').click();
  await normal.waitForTimeout(300);
  const pausedIndex = await readIndex();
  await normal.waitForTimeout(800);
  const pausedLater = await readIndex();
  check(pausedIndex === pausedLater,
    `normal motion: Pause must stop the panes (${pausedIndex} -> ${pausedLater})`);
  const pausedLabel = (await normal.locator('[data-shape-toggle]').innerText()).trim();
  check(/play/i.test(pausedLabel) && !/pause/i.test(pausedLabel),
    `normal motion: while paused the control must offer Play, saw "${pausedLabel}"`);
  check(await normal.evaluate(() => typeof window.__joyanShapeProbe === 'function'),
    'the lab probe must be installed on the normal-motion page too');
  await normal.screenshot({ path: resolve(out, 'captures/1440-normal-full.png'), fullPage: true });
  motion.push({ initialIndex, stillIndex, playingIndex, pausedIndex, pausedLater, stillLabel, playingLabel,
    pausedLabel, stillStatus, playingStatus });
  await normal.close();
  await normalContext.close();

  // Responsive inspection with real screenshots at the accepted widths.
  for (const width of [390, 1440, 2560]) {
    const view = await browser.newPage({ viewport: { width, height: 1200 }, reducedMotion: 'reduce' });
    await view.goto(LAB, { waitUntil: 'networkidle' });
    await view.waitForTimeout(300);
    const box = await view.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      views: [...document.querySelectorAll('[data-shape-lab] canvas[data-shape-view]')]
        .map((el) => { const box = el.getBoundingClientRect(); return [Math.round(box.width), Math.round(box.height)]; }),
    }));
    check(box.documentWidth === width,
      `${width}: the shape laboratory must not cause horizontal overflow (${box.documentWidth})`);
    await view.screenshot({ path: resolve(out, 'captures', `${width}-full.png`), fullPage: true });
    await view.locator('[data-shape-board]').screenshot({ path: resolve(out, 'captures', `${width}-board.png`) });
    await view.close();
  }
  await page.close();
  await context.close();
} finally {
  await browser.close();
}

await save(failures.length ? 'red.json' : 'green.json', { failures, catalog, pitch, nodeHashes, rampHashes,
  toneResolution, ditherLevels, bakedEvidence, live, frames, motion, canvasDumps, blockRamp, glyphRamp,
  geometryProofs, displayPitch: displayPitchRows, coverageTolerance: COVERAGE_TOLERANCE });
console.log(JSON.stringify({ mode: failures.length ? 'RED' : 'GREEN', failures: failures.length,
  live: live.length, frames: frames.length }, null, 2));
process.exitCode = failures.length ? 1 : 0;
