#!/usr/bin/env node
/**
 * WU15 local acceptance — OUR dot-scene engine.
 * =====================================================================
 * The claim this file exists to test is narrow and falsifiable: the baked
 * still and the live canvas are the SAME art. Both are produced by one
 * engine, so for a given frame the Node raster path and the browser canvas
 * path must hash identically. Everything else here exists so that claim
 * cannot be satisfied by accident:
 *
 *   - the ramp is ` ·•●` only (dots, never ASCII glyph art),
 *   - cells are square (the ramp coverages are MEASURED from the raster mask),
 *   - one indexed palette per scene; every drawn pixel is a ground->palette
 *     blend, so no colour outside the scene's palette can appear,
 *   - deterministic hash noise, repeat runs identical,
 *   - reduced motion, offscreen/hidden pause and pagehide cleanup,
 *   - no external request, and no runtime JS reachable from a landing page.
 *
 * External Playwright, no project test dependency. Evidence goes to
 * `dist-motion-verify/wu15/**` and never into the WU13/WU14 trees.
 *
 * Usage: node scripts/check-scene-engine.mjs [--node-only] [--out <dir>]
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { loadPlaywright } from './motion-src/render.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const outFlag = process.argv.indexOf('--out');
const out = resolve(root, outFlag > -1 ? process.argv[outFlag + 1] : 'dist-motion-verify/wu15');
const captures = resolve(out, 'captures');
const nodeOnly = process.argv.includes('--node-only');
const base = 'http://127.0.0.1:4321';
const LAB = base + '/lab/ascii';
const SCENE_ID = 'joyan-night-coast';
const OWN = `[data-own-scene="${SCENE_ID}"]`;
// The bake output lives inside the engine's own directory (`scripts/scene-src`),
// the only surface this unit may add files to, and is served through the
// component's asset import. The shipped copy must be byte-identical to it.
const BAKED_SOURCE = 'scripts/scene-src/baked/joyan-night-coast.png';
const BAKED_URL = /_astro\/joyan-night-coast\.[A-Za-z0-9_-]+\.png/;
const failures = [];
const views = [];
const nodes = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const hash = (data) => createHash('sha256').update(data).digest('hex');
const json = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const save = async (name, data) => writeFile(resolve(out, name), JSON.stringify(data, null, 2));
const shot = (name) => resolve(captures, name);
await mkdir(out, { recursive: true });
await mkdir(captures, { recursive: true });

const enginePath = 'scripts/scene-src/engine.mjs';
const scenesPath = 'scripts/scene-src/scenes/index.mjs';
let engine;
let scenes;
try {
  engine = await import(new URL(`./scene-src/engine.mjs`, import.meta.url));
} catch (error) {
  failures.push(`engine module missing or unloadable (${enginePath}): ${error.message}`);
}
try {
  scenes = await import(new URL(`./scene-src/scenes/index.mjs`, import.meta.url));
} catch (error) {
  failures.push(`scene registry missing or unloadable (${scenesPath}): ${error.message}`);
}
// ---------------------------------------------------------------------------
// 0. Assertions that do not need the engine to load. On the pre-implementation
//    tree these are the load-bearing REDs: no comparison surface, no baked
//    still, no runtime source. They are checked before the early exit so a
//    missing engine cannot hide them.
// ---------------------------------------------------------------------------
const sourceOf = async (path) => {
  try { return await readFile(resolve(root, path), 'utf8'); }
  catch (error) { failures.push(`${path} missing: ${error.message}`); return ''; }
};
const runtimeSource = await sourceOf('src/lib/scene-runtime.ts');
if (runtimeSource) {
  check(/scripts\/scene-src\/engine\.mjs/.test(runtimeSource),
    'the runtime must import the same engine module the Node path uses');
  check(!/fillText|measureText|strokeText|ctx\.font/.test(runtimeSource),
    'the runtime must never draw glyphs, only the engine raster');
  check(/requestAnimationFrame/.test(runtimeSource) && /cancelAnimationFrame/.test(runtimeSource),
    'the runtime must own and cancel its animation frame');
  check(/prefers-reduced-motion/.test(runtimeSource), 'the runtime must honour prefers-reduced-motion');
  check(/visibilitychange/.test(runtimeSource) && /IntersectionObserver/.test(runtimeSource),
    'the runtime must pause in hidden tabs and offscreen');
  check(/pagehide/.test(runtimeSource), 'the runtime must clean up on pagehide');
}
const componentSource = await sourceOf('src/components/joyan/SceneCanvas.astro');
if (componentSource) {
  check(componentSource.split('\n').length <= 200, 'SceneCanvas.astro must stay under 200 lines');
  check(!/as any|<any>/.test(componentSource), 'SceneCanvas.astro must not use any');
  check(!/\sstyle=/.test(componentSource), 'SceneCanvas.astro must not author inline styles');
  check(/aria-hidden="true"/.test(componentSource), 'the decorative canvas must be aria-hidden');
}
if (runtimeSource) {
  check(/isScene/.test(runtimeSource),
    'the runtime must validate the scene registry shape instead of casting untyped JS');
  check(!/as Record</.test(runtimeSource) && !/as any/.test(runtimeSource),
    'the runtime must not cast untyped JS to a type');
}
// ---------------------------------------------------------------------------
// 0b. Provenance and the ADOPTION LEDGER. The licence boundary is explicit:
//     published standard material has to be named as such, ideas learned from
//     `ascii.rest` have to be described as ideas, and code ADAPTED from the
//     library (MIT, bas3line) has to be listed in
//     `scripts/scene-src/adoption-ledger.json` with the upstream file it came
//     from, with the MIT notice retained in this repository. The ledger is
//     asserted in BOTH directions: a listed entry must exist in the code, and
//     library-derived material found in the code must be listed. An unlisted
//     library constant therefore still fails, exactly as the previous "must
//     never appear" guard did.
// ---------------------------------------------------------------------------
const engineSource = await sourceOf(enginePath);
// Identifiers that can only come from a copy of the library: its mixing
// constants (the MurmurHash3 finals and the scene hash multipliers), its ordered
// dither offset, its nearest-colour LUT key and its hosted font. Finding one in
// the engine is not itself a failure — the failure is finding one that no ledger
// entry claims.
const LIBRARY_SIGNATURES = ['0x27d4eb2d', '0x165667b1', '0x85ebca6b', '0xc2b2ae35',
  '374761393', '668265263', '2246822519', '3266489917', '1274126177',
  '- 0.47', '31.99', 'ascii.rest/fonts', 'nightCoast'];
const unlistedSignatures = (source, listed) => LIBRARY_SIGNATURES
  .filter((signature) => source.includes(signature) && !listed.includes(signature));
const ledgerPath = 'scripts/scene-src/adoption-ledger.json';
let ledger;
try {
  ledger = JSON.parse(await readFile(resolve(root, ledgerPath), 'utf8'));
} catch (error) {
  check(false, `the adoption ledger must exist at ${ledgerPath}: ${error.message}`);
}
if (ledger && engineSource) {
  const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const listed = entries.flatMap((entry) => entry.constants ?? []);
  for (const signature of unlistedSignatures(engineSource, listed)) {
    check(false, `library-derived material in the engine is not in ${ledgerPath}: ${JSON.stringify(signature)}`);
  }
  // Direction 1 — a listed entry must exist in the code, and must name a real
  // upstream file.
  for (const entry of entries) {
    check(typeof entry.marker === 'string' && entry.marker.length > 20 && engineSource.includes(entry.marker),
      `ledger entry ${entry.id} claims code the engine does not contain (its marker is absent)`);
    check(typeof entry.adaptedFrom === 'string' && existsSync(resolve(root, entry.adaptedFrom)),
      `ledger entry ${entry.id} must name the upstream file it came from`);
    check(typeof entry.what === 'string' && entry.what.length > 20
      && Array.isArray(entry.improvedBeyond) && entry.improvedBeyond.length > 0,
    `ledger entry ${entry.id} must say what was adapted and what we improved beyond the original`);
  }
  // Direction 2 — the scan can fail. A guard that can never fail is decoration,
  // so the same predicate is run against a source that carries an unclaimed
  // library constant and against one that carries only ours.
  check(unlistedSignatures(`${engineSource}\nconst taken = 374761393;`, listed).includes('374761393'),
    'the unlisted-library-material scan must reject a library constant no ledger entry claims');
  check(unlistedSignatures('const ours = 0x2f1b3d5f;\nconst alsoOurs = - 0.5;', listed).length === 0,
    'the scan must not flag our own constants');
  // The notice has to be in THIS repository, not only in node_modules.
  const noticeText = ledger.library?.notice ? await sourceOf(ledger.library.notice) : '';
  check(/MIT License/.test(noticeText) && /Copyright \(c\) \d{4} bas3line/.test(noticeText),
    'the retained notice must carry the MIT text and the bas3line copyright line');
  check(/ascii\.rest/.test(noticeText),
    'the retained notice must name the package it came from');
  for (const key of ['name', 'version', 'author', 'license']) {
    check(Boolean(ledger.library?.[key]), `the ledger must record the library ${key}`);
  }
  check(ledger.library?.license === 'MIT' && ledger.library?.author === 'bas3line',
    'the ledger must record ascii.rest 0.4.0 as MIT/bas3line');
  check(Array.isArray(ledger.rejected) && ledger.rejected.length >= 1,
    'the ledger must record what we deliberately did not adopt');
}
if (engineSource) {
  check(!/from\s+['"]ascii\.rest|import\(\s*['"]ascii\.rest/.test(engineSource),
    'the engine must not import ascii.rest at runtime');
  check(/Bayer/.test(engineSource) && /1973/.test(engineSource),
    'the engine must state that the ordered-dither matrix is the published 1973 Bayer matrix');
  check(/Rec\.709/.test(engineSource),
    'the engine must name the published luma convention its tone and chroma weights use');
  check(/ascii\.rest/.test(engineSource) && /MIT/.test(engineSource) && /bas3line/.test(engineSource),
    'the engine must keep the explicit ascii.rest (MIT, bas3line) provenance note');
  check(/ours|our own/i.test(engineSource), 'the engine must state which parts are ours');
  check(/lattice/i.test(engineSource) && /octave/i.test(engineSource),
    'the noise construction must be documented as a wrapping lattice and its octaves');
  check(/adoption-ledger\.json/.test(engineSource) && /ascii\.rest-LICENSE/.test(engineSource),
    'the engine must point at the adoption ledger and the retained notice');
}
let labHtml = '';
try {
  labHtml = await readFile(resolve(root, 'dist/lab/ascii/index.html'), 'utf8');
} catch (error) {
  check(false, `built lab page missing: ${error.message}`);
}
if (labHtml) {
  check(labHtml.includes(`data-own-scene="${SCENE_ID}"`), 'the lab must mount our scene live');
  check(labHtml.includes('data-ascii-compare="night-coast"'),
    'the lab must mount the library night-coast beside our scene');
  check(BAKED_URL.test(labHtml), 'the lab must show the baked still of our scene');
  check(/200 × 100|200x100/.test(labHtml), 'the comparison must state the shared 200x100 grid');
  check(/MIT/.test(labHtml) && /bas3line/.test(labHtml), 'the lab must keep the library attribution');
}
for (const path of await walk(resolve(root, 'dist'))) {
  if (!path.endsWith('.html') || path.endsWith('lab/ascii/index.html')) continue;
  const source = await readFile(path, 'utf8');
  check(!source.includes('data-own-scene'), `our runtime markup reached ${path.slice(root.length + 1)}`);
  check(!source.includes('data-ascii-compare'), `the comparison markup reached ${path.slice(root.length + 1)}`);
  check(!BAKED_URL.test(source), `the baked still reached ${path.slice(root.length + 1)}`);
}
// Only the laboratory may reach the runtime. The page check is the real one:
// `dist` is what ships. The source check catches a page that would import it
// before anyone builds.
const landingImporters = [];
for (const path of await walk(resolve(root, 'src/pages'))) {
  if (path.includes(`${resolve(root, 'src/pages/lab')}`)) continue;
  if (!/\.(?:astro|ts|tsx|vue|js|mjs)$/.test(path)) continue;
  const source = await readFile(path, 'utf8');
  if (source.includes('scene-runtime') || source.includes('scene-src')) landingImporters.push(path.slice(root.length + 1));
}
check(landingImporters.length === 0,
  `no landing page may import the scene runtime: ${landingImporters.join(', ')}`);
const runtimeImporters = [];
for (const dir of ['src/components', 'src/layouts']) {
  for (const path of await walk(resolve(root, dir))) {
    if (!/\.(?:astro|ts|tsx|vue|js|mjs)$/.test(path)) continue;
    const source = await readFile(path, 'utf8');
    if (source.includes('scene-runtime') || source.includes('scene-src')) runtimeImporters.push(path.slice(root.length + 1));
  }
}
check(runtimeImporters.length === 1 && runtimeImporters[0] === 'src/components/joyan/SceneCanvas.astro',
  `only the lab's own SceneCanvas.astro may reference the scene runtime: ${runtimeImporters.join(', ')}`);
let bakedFile;
try {
  bakedFile = await readFile(resolve(root, BAKED_SOURCE));
} catch (error) {
  check(false, `baked still missing at ${BAKED_SOURCE}: ${error.message}`);
}
let shippedStill;
for (const path of await walk(resolve(root, 'dist/_astro'))) {
  if (path.endsWith('.png') && path.includes('joyan-night-coast')) shippedStill = path;
}
if (shippedStill && bakedFile) {
  const shipped = await readFile(shippedStill);
  check(hash(shipped) === hash(bakedFile),
    `the shipped still (${shippedStill.slice(root.length + 1)}) must be byte-identical to the bake output`);
  check(shipped.length === bakedFile.length, 'the shipped still must not be re-encoded');
} else if (!shippedStill) {
  check(false, 'the baked still was not emitted as its own file (check the assets inline limit / ?no-inline)');
}
// Only a missing engine can hide the rest of the run: every other failure above
// accumulates into the same report, so no assertion can hide behind another.
if (!engine || !scenes) {
  failures.push('engine-dependent checks not evaluated: engine or scene registry missing');
  console.log(JSON.stringify({ mode: 'RED', failures, nodes, views }, null, 2));
  await save('red.json', { failures, nodes, views });
  process.exit(1);
}

const scene = scenes.SCENES[SCENE_ID];
const { RAMP, CELL, COVERAGE, DELIVERY_CELL, DOT_RADIUS, renderFrame, frameChars, rasterize,
  discMask, stepFor, hashNoise, tone, hexToRgb, sceneMetrics } = engine;

// ---------------------------------------------------------------------------
// 1. Contract surface. Named exports exist, the ramp is dots only, and cells
//    are square by construction (one unit on both axes).
// ---------------------------------------------------------------------------
check(typeof renderFrame === 'function' && typeof rasterize === 'function'
  && typeof frameChars === 'function' && typeof sceneMetrics === 'function',
  'engine must export renderFrame, rasterize, frameChars and sceneMetrics');
check(RAMP === ' ·•●', `ramp must be exactly " ·•●", saw ${JSON.stringify(RAMP)}`);
for (const ch of RAMP) {
  check(ch === ' ' || '·•●'.includes(ch),
    `ramp must contain only dots and space, saw ${JSON.stringify(ch)}`);
}
check(!/[A-Za-z0-9]/.test(RAMP), 'ramp must never contain ASCII glyph art');
// Cheap deterministic controls: a predicate that can never fail would make the
// assertions above worthless.
assert.equal(RAMP.includes('A'), false);
assert.equal(' .:-=+*#%@'.split('').every((ch) => RAMP.includes(ch)), false);
check(stepFor(0, 0, 0) === 0 && stepFor(0, 1, 1) === 0, 'a zero level must stay on the ground');
check(stepFor(1, 3, 3) === 3, 'a full level must use the largest dot');
check(CELL === 1, `cell aspect unit must be 1 (square cells), saw ${CELL}`);
check(Number.isInteger(DELIVERY_CELL) && DELIVERY_CELL >= 8,
  `delivery cell size must be an integer >= 8 px per cell: below that the smallest dot is a `
  + `hard 2x2 block rather than an anti-aliased disc, saw ${DELIVERY_CELL}`);
check(COVERAGE.length === 4 && COVERAGE[0] === 0,
  'coverage curve must have one entry per ramp step and start at 0');
for (let s = 1; s < 4; s++) check(COVERAGE[s] > COVERAGE[s - 1], `coverage curve must increase at step ${s}`);

check(scene.cols === 200 && scene.rows === 100,
  `${SCENE_ID} must be authored on the library's 200x100 grid, saw ${scene.cols}x${scene.rows}`);
check(scene.fps === 12, `${SCENE_ID} must run at the lab's 12 fps ceiling, saw ${scene.fps}`);
check(Number.isInteger(scene.cycleFrames) && scene.cycleFrames > 0 && scene.cycleFrames % scene.fps === 0,
  'cycleFrames must be a whole number of seconds of frames so the loop is exact');
check(scene.posterFrame >= 0 && scene.posterFrame < scene.cycleFrames,
  'posterFrame must be inside the cycle');
check(Array.isArray(scene.palette) && scene.palette.length >= 4 && scene.palette.length <= 32,
  'one indexed palette per scene, 4..32 entries');
for (const entry of scene.palette) {
  check(/^#[0-9a-f]{6}$/i.test(entry), `palette entries must be #rrggbb, saw ${JSON.stringify(entry)}`);
}
check(Number.isInteger(scene.ground) && scene.ground >= 0 && scene.ground < scene.palette.length,
  'ground must be an index into the scene palette');
check(typeof scene.groundHex === 'string' && /^#[0-9a-f]{6}$/i.test(scene.groundHex),
  'the scene must state its ground colour as #rrggbb');
check(typeof scene.field === 'function', 'a scene must expose a readable field(x, y, t) function');
check(typeof scene.params === 'object' && scene.params !== null, 'a scene must document its parameters');
check(Object.keys(scene.params).length <= 8,
  `a scene must keep a small documented parameter set, saw ${Object.keys(scene.params).length}`);

// ---------------------------------------------------------------------------
// 2. The coverage curve is MEASURED, not asserted. The authored curve must
//    describe the dots the raster actually paints.
// ---------------------------------------------------------------------------
const metrics = sceneMetrics(scene);
check(metrics.coverage.length === 4, 'sceneMetrics must report the measured dot coverage per step');
for (let s = 1; s < 4; s++) {
  check(Math.abs(metrics.coverage[s] - COVERAGE[s]) < 0.002,
    `the ladder the mask paints must be the ladder the engine reports: step ${s} reports `
    + `${COVERAGE[s]} but the mask measures ${metrics.coverage[s].toFixed(4)}`);
}
check(metrics.ladder.length === 4 && metrics.ladder[3] === 1,
  'the tone ladder must be normalised to the largest dot');
for (let s = 1; s < 4; s++) {
  check(metrics.ladder[s] > metrics.ladder[s - 1], `tone ladder must increase at step ${s}`);
}
// Palette compensation: normalising the field against the scene's own palette
// range is what keeps a dark palette from collapsing onto step 0.
check(metrics.maxTone > metrics.groundTone + 0.2,
  'a scene palette must offer real contrast above its ground');
check(metrics.headroom.length === 4,
  'sceneMetrics must report the rendered tone each ramp step can carry');
for (let s = 1; s < 4; s++) {
  check(metrics.headroom[s] > metrics.groundTone,
    `step ${s} must render brighter than the dark ground, saw ${metrics.headroom[s]}`);
}

// ---------------------------------------------------------------------------
// 2b. The dot is a ROUND, anti-aliased DISC — asserted against an independent
//     reference, not against the engine's own arithmetic.
//
//     WU15 shipped a 4x4-supersampled mask at 4 px per cell. At that size the
//     arithmetic over-covered the disc, and the raster degenerated: the smallest
//     step came out a hard 2x2 square (four pixels at 0.9375 and nothing else,
//     measured at `dist-motion-verify/wu16/investigation/node-masks.json`) and the
//     largest step was 12 of 16 pixels at 0.938+ with its corner pixels at 0.375,
//     i.e. a block of side 0.90 for a coverage of 0.81. The RECORDED_LADDER below
//     is what that mask measured; the attribution of the dots is measured the
//     same way and the ladder is now held at every cell size.
//
//     The reference here is a plain 32x32 supersample written in this file: a
//     different method from the engine's exact-area arithmetic, so agreement is
//     evidence and not a tautology. The radius is re-derived here from the
//     recorded ladder by bisection over that reference, so `DOT_RADIUS` is
//     checked to be DERIVED from the measured coverage rather than an assumed
//     fraction of the cell.
// ---------------------------------------------------------------------------
const RECORDED_LADDER = [0, 0.2344, 0.4844, 0.8125];
const REFERENCE_SAMPLES = 32;
const referenceMask = (radiusInCells, size) => {
  const mask = new Float64Array(size * size);
  const radius = radiusInCells * size;
  const centre = size / 2;
  const per = REFERENCE_SAMPLES * REFERENCE_SAMPLES;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < REFERENCE_SAMPLES; sy++) {
        for (let sx = 0; sx < REFERENCE_SAMPLES; sx++) {
          const dx = px + (sx + 0.5) / REFERENCE_SAMPLES - centre;
          const dy = py + (sy + 0.5) / REFERENCE_SAMPLES - centre;
          if (dx * dx + dy * dy <= radius * radius) hits += 1;
        }
      }
      mask[py * size + px] = hits / per;
    }
  }
  return mask;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const referenceRadius = (coverage) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (mean(referenceMask(mid, 16)) < coverage) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};
const derivedRadius = RECORDED_LADDER.map((coverage) => (coverage > 0 ? referenceRadius(coverage) : 0));
const worstPixel = (mask, reference) => {
  let worst = 0;
  for (let i = 0; i < mask.length; i++) worst = Math.max(worst, Math.abs(mask[i] - reference[i]));
  return worst;
};
const shapeStats = (mask, size) => {
  const centre = size / 2;
  const corner = (mask[0] + mask[size - 1] + mask[(size - 1) * size] + mask[size * size - 1]) / 4;
  const edge = (mask[Math.floor(centre)] + mask[(size - 1) * size + Math.floor(centre)]
    + mask[Math.floor(centre) * size] + mask[Math.floor(centre) * size + size - 1]) / 4;
  let outside = 0;
  let total = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = mask[y * size + x];
      total += value;
      const dx = x + 0.5 - centre;
      const dy = y + 0.5 - centre;
      if (dx * dx + dy * dy > centre * centre) outside += value;
    }
  }
  return { coverage: total / (size * size), cornerFill: corner, edgeFill: edge,
    cornerOverEdge: edge > 0 ? corner / edge : 0, outsideDiscMass: total > 0 ? outside / total : 0,
    distinctValues: new Set([...mask]).size };
};
check(Array.isArray(DOT_RADIUS) && DOT_RADIUS.length === 4 && DOT_RADIUS[0] === 0,
  'the engine must export DOT_RADIUS, one radius in cell units per ramp step');
const dotEvidence = [];
for (let step = 1; step < 4; step++) {
  check(Array.isArray(DOT_RADIUS) && Math.abs(DOT_RADIUS[step] - derivedRadius[step]) < 0.003,
    `DOT_RADIUS[${step}] must be DERIVED from the measured coverage ${RECORDED_LADDER[step]} `
    + `(that coverage solved as a disc is about ${derivedRadius[step].toFixed(4)} of a cell, saw `
    + `${Array.isArray(DOT_RADIUS) ? DOT_RADIUS[step] : 'nothing'})`);
  check(Array.isArray(DOT_RADIUS) && DOT_RADIUS[step] > DOT_RADIUS[step - 1],
    `dot radii must increase with the ramp, step ${step}`);
}
check(Array.isArray(DOT_RADIUS) && DOT_RADIUS[3] >= 0.5 && DOT_RADIUS[3] <= 0.52,
  `the largest dot must be the inscribed disc of a cell or the measured ladder's equivalent `
  + `(0.5..0.52 of a cell), saw ${Array.isArray(DOT_RADIUS) ? DOT_RADIUS[3] : 'nothing'}`);
for (const cell of [4, 8, 16]) {
  for (let step = 1; step < 4; step++) {
    const mask = discMask(step, cell);
    const reference = referenceMask(derivedRadius[step], cell);
    const stats = shapeStats(mask, cell);
    dotEvidence.push({ cell, step, ...stats, worstPixelVsReference: worstPixel(mask, reference) });
    check(Math.abs(stats.coverage - RECORDED_LADDER[step]) < 0.002,
      `the ladder must hold at every cell size: step ${step} at ${cell} px per cell covers `
      + `${stats.coverage.toFixed(4)} of a cell against the recorded ${RECORDED_LADDER[step]}`);
    check(worstPixel(mask, reference) <= 0.004,
      `step ${step} at ${cell} px per cell must be the anti-aliased disc, not a block: its worst `
      + `pixel differs from an independent ${REFERENCE_SAMPLES}x${REFERENCE_SAMPLES}-sampled disc of the `
      + `same radius by ${worstPixel(mask, reference).toFixed(4)}`);
    check(stats.cornerOverEdge <= 1 && stats.outsideDiscMass <= 0.13,
      `step ${step} at ${cell} px per cell must keep a round rim, not a square edge: the corner `
      + `pixels fill ${(stats.cornerOverEdge * 100).toFixed(1)}% of the axis pixels and `
      + `${(stats.outsideDiscMass * 100).toFixed(1)}% of the ink sits in the corners outside the `
      + `inscribed disc (an area-matched square of the same coverage reaches 25%)`);
    check(stats.distinctValues >= 3,
      `step ${step} at ${cell} px per cell must be anti-aliased, saw only ${stats.distinctValues} `
      + `distinct pixel coverages — a hard-cornered block has two`);
    if (step === 3) {
      check(stats.cornerOverEdge < 0.6,
        `the largest dot at ${cell} px per cell must be round: its corners fill `
        + `${(stats.cornerOverEdge * 100).toFixed(1)}% of its axis pixels, a square would be 100%`);
    }
  }
}
// Negative controls for the two predicates above, so neither can pass by
// accident: an area-matched square of the SAME coverage, and the block the WU15
// raster actually produced at 4 px per cell.
const areaMatchedSquare = (coverage, size) => {
  const mask = new Float64Array(size * size);
  const side = Math.sqrt(coverage) * size;
  const lo = (size - side) / 2;
  const hi = lo + side;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cover = Math.max(0, Math.min(x + 1, hi) - Math.max(x, lo))
        * Math.max(0, Math.min(y + 1, hi) - Math.max(y, lo));
      mask[y * size + x] = cover;
    }
  }
  return mask;
};
const controlSquare = areaMatchedSquare(RECORDED_LADDER[3], 8);
check(Math.abs(mean(controlSquare) - RECORDED_LADDER[3]) < 0.002,
  'the negative control must be an area-matched square of the largest step coverage');
check(worstPixel(controlSquare, referenceMask(derivedRadius[3], 8)) > 0.004,
  'the disc-agreement assertion must reject an area-matched square of the same coverage');
const wu15Block = Float64Array.from([0, 0, 0, 0, 0, 0.9375, 0.9375, 0, 0, 0.9375, 0.9375, 0, 0, 0, 0, 0]);
check(Math.abs(mean(wu15Block) - RECORDED_LADDER[1]) < 0.002,
  'the WU15 block control must reproduce the coverage the WU15 smallest dot measured');
check(shapeStats(wu15Block, 4).distinctValues < 3,
  'the anti-aliasing bound must reject a hard 2x2 block (two distinct coverages)');
check(worstPixel(wu15Block, referenceMask(derivedRadius[1], 4)) > 0.004,
  'the disc-agreement assertion must reject the 2x2 block WU15 actually painted for its smallest step');

// The adopted cell-sprite atlas is an optimisation, not a second renderer: the
// frame it copies must be byte-identical to a straightforward per-pixel blend of
// the same masks.
const directRaster = (frame, size) => {
  const width = frame.cols * size;
  const height = frame.rows * size;
  const out = new Uint8ClampedArray(width * height * 4);
  const masks = [null, discMask(1, size), discMask(2, size), discMask(3, size)];
  const ground = metrics.colors[metrics.groundIndex];
  for (let y = 0; y < frame.rows; y++) {
    for (let x = 0; x < frame.cols; x++) {
      const index = y * frame.cols + x;
      const mask = masks[frame.steps[index]];
      const ink = metrics.colors[frame.indices[index]];
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const at = ((y * size + py) * width + (x * size + px)) * 4;
          const coverage = mask ? mask[py * size + px] : 0;
          out[at] = Math.round((ground[0] + (ink[0] - ground[0]) * coverage) * 255);
          out[at + 1] = Math.round((ground[1] + (ink[1] - ground[1]) * coverage) * 255);
          out[at + 2] = Math.round((ground[2] + (ink[2] - ground[2]) * coverage) * 255);
          out[at + 3] = 255;
        }
      }
    }
  }
  return out;
};
const spriteFrame = renderFrame(scene, scene.posterFrame);
check(hash(Buffer.from(rasterize(spriteFrame, scene, DELIVERY_CELL)))
  === hash(Buffer.from(directRaster(spriteFrame, DELIVERY_CELL))),
'the adopted cell-sprite atlas must reproduce a direct per-pixel blend byte for byte');

// ---------------------------------------------------------------------------
// 3. Ordered Bayer dithering and determinism.
// ---------------------------------------------------------------------------
// The coverage curve decides where the step boundaries are: a level sitting
// exactly on a rung must render that rung and nothing else, and a level halfway
// between two rungs must spend the 4x4 Bayer block evenly between them.
const bayerBlock = () => [...Array(16).keys()].map((i) => stepFor(0, i % 4, (i / 4) | 0));
for (let s = 0; s < 4; s++) {
  const at = [...Array(16).keys()].map((i) => stepFor(metrics.ladder[s], i % 4, (i / 4) | 0));
  check(new Set(at).size === 1 && at.every((v) => v === s),
    `a level exactly on ladder rung ${s} must render only step ${s}, saw ${JSON.stringify(at)}`);
}
for (let s = 0; s < 3; s++) {
  const mid = (metrics.ladder[s] + metrics.ladder[s + 1]) / 2;
  const at = [...Array(16).keys()].map((i) => stepFor(mid, i % 4, (i / 4) | 0));
  const low = at.filter((v) => v === s).length;
  check(new Set(at).size === 2 && low === 8,
    `a midpoint between rungs ${s} and ${s + 1} must dither 8/8 over the 4x4 Bayer block, saw ${JSON.stringify(at)}`);
}
for (const level of [0, 0.05, 0.2, 0.44, 0.63, 0.72, 0.95, 1]) {
  const at = [...Array(16).keys()].map((i) => stepFor(level, i % 4, (i / 4) | 0));
  check(Math.max(...at) - Math.min(...at) <= 1,
    `ordered dither must only mix adjacent steps at level ${level}, saw ${JSON.stringify(at)}`);
}
assert.equal(bayerBlock().length, 16);
check(hashNoise(7, 11, 3) === hashNoise(7, 11, 3) && hashNoise(7, 11, 3) !== hashNoise(7, 12, 3),
  'hash noise must be a pure function of coordinates and seed');
const noiseSpread = new Set([...Array(256).keys()].map((i) => hashNoise(i, 3, 1)));
check(noiseSpread.size >= 250, 'hash noise must actually spread across its range');
check(hashNoise(7, 11, 3) >= 0 && hashNoise(7, 11, 3) < 1, 'hash noise must stay inside [0,1)');

const frames = [0, 1, 42, 137, 359].map((index) => renderFrame(scene, index));
const repeat = frames.map((frame, i) => hash(Buffer.from(frame.indices)) === hash(Buffer.from(renderFrame(scene, [0, 1, 42, 137, 359][i]).indices)));
check(repeat.every(Boolean), 'repeat runs of the same frame must be identical');

// ---------------------------------------------------------------------------
// 3b. The loop must CLOSE, and that has to be tested on the field, not on the
//     frame index: `renderFrame(cycleFrames)` IS `renderFrame(0)` by construction
//     (the modulo), so comparing those two proves nothing. What is checked here
//     is the underlying field at t=0 against t=cycleFrames/fps, per channel, with
//     an ordinary adjacent frame step as the reference baseline.
// ---------------------------------------------------------------------------
const channelsOf = (value) => (typeof value === 'number' ? [value, value, value] : value);
const fieldDelta = (t1, t2) => {
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
const seconds = (frame) => frame / scene.fps;
const adjacent = [0, 17, 358].map((frame) => fieldDelta(seconds(frame), seconds(frame + 1)));
const baseline = { max: Math.max(...adjacent.map((delta) => delta.max)),
  mean: Math.max(...adjacent.map((delta) => delta.mean)) };
const seam = fieldDelta(0, seconds(scene.cycleFrames));
const SEAM_TOLERANCE = 1e-6;
const changedCells = (a, b) => {
  let changed = 0;
  for (let i = 0; i < a.steps.length; i++) {
    if (a.steps[i] !== b.steps[i] || a.indices[i] !== b.indices[i]) changed += 1;
  }
  return changed;
};
const renderedAdjacent = Math.max(...[0, 17, 358].map((frame) =>
  changedCells(renderFrame(scene, frame), renderFrame(scene, frame + 1))));
const renderedSeam = changedCells(renderFrame(scene, scene.cycleFrames - 1), renderFrame(scene, 0));
check(seam.max <= SEAM_TOLERANCE && seam.mean <= SEAM_TOLERANCE,
  `the field must be periodic over its cycle: t=0 vs t=${seconds(scene.cycleFrames)}s differs by max `
  + `${seam.max.toExponential(2)} / mean ${seam.mean.toExponential(2)}, over the ${SEAM_TOLERANCE} tolerance`);
check(seam.max <= baseline.max && seam.mean <= baseline.mean,
  `the field seam must be no worse than an ordinary frame step: seam max ${seam.max.toExponential(2)} `
  + `vs adjacent baseline max ${baseline.max.toFixed(4)} / mean ${baseline.mean.toFixed(5)}`);
check(renderedSeam <= renderedAdjacent,
  `the rendered loop must close like an ordinary step: ${renderedSeam} cells change at the seam vs `
  + `${renderedAdjacent} for an adjacent pair`);
const periodicity = { adjacent, baseline, seam, tolerance: SEAM_TOLERANCE, renderedAdjacent, renderedSeam };
// Secondary only: the frame index itself must still wrap at cycleFrames.
check(hash(Buffer.from(renderFrame(scene, 0).indices)) === hash(Buffer.from(renderFrame(scene, scene.cycleFrames).indices)),
  'the frame index must wrap at cycleFrames');
const advanced = [0, 1, 2, 3, 4].map((index) => hash(Buffer.from(renderFrame(scene, index).indices)));
check(new Set(advanced).size >= 4, 'consecutive frames must actually change');

// ---------------------------------------------------------------------------
// 4. Indices in bounds, dots only, and one indexed palette.
// ---------------------------------------------------------------------------
let inked = 0;
let maxIndex = 0;
for (const frame of frames) {
  check(frame.indices.length === scene.cols * scene.rows,
    'a frame must carry exactly cols*rows palette indices');
  check(frame.steps.length === scene.cols * scene.rows,
    'a frame must carry exactly cols*rows ramp steps');
  for (let i = 0; i < frame.indices.length; i++) {
    checkIndex(frame.indices[i], frame.steps[i]);
    if (frame.steps[i] > 0) inked += 1;
    maxIndex = Math.max(maxIndex, frame.indices[i]);
  }
  const text = frameChars(frame);
  check(text.replace(/\n/g, '').length === scene.cols * scene.rows,
    'frameChars must render one ramp character per cell');
  for (const ch of new Set(text.replace(/\n/g, ''))) {
    check(RAMP.includes(ch), `frameChars may only use the ramp, saw ${JSON.stringify(ch)}`);
  }
}
function checkIndex(index, step) {
  check(Number.isInteger(index) && index >= 0 && index < scene.palette.length,
    `frame palette index ${index} is out of the scene's palette bounds`);
  if (step === 0) check(index === scene.ground, 'a cell with no dot must show the ground, not ink');
}
check(inked > 0 && inked < scene.cols * scene.rows * frames.length,
  'the scene must mix inked and empty cells');

// ---------------------------------------------------------------------------
// 5. The Node raster path. One cell of art is one square unit; every drawn
//    pixel is a ground->palette blend, so nothing outside the palette appears.
// ---------------------------------------------------------------------------
const raster = rasterize(renderFrame(scene, scene.posterFrame), scene, DELIVERY_CELL);
const width = scene.cols * DELIVERY_CELL;
const height = scene.rows * DELIVERY_CELL;
check(raster.length === width * height * 4, 'the raster must cover the whole grid');
check(width / height === scene.cols / scene.rows && width / height === 2,
  `delivered frames must keep the 200x100 square-cell aspect, saw ${width}x${height}`);
const groundRgb = hexToRgb(scene.groundHex);
const paletteRgb = scene.palette.map(hexToRgb);
let offPalette = 0;
let painted = 0;
const colourSet = new Set();
for (let p = 0; p < width * height; p++) {
  const i = p * 4;
  check(raster[i + 3] === 255, 'the raster must be fully opaque');
  const px = [raster[i], raster[i + 1], raster[i + 2]];
  colourSet.add(px.join(','));
  if (px.some((v, c) => v !== groundRgb[c] * 255)) painted += 1;
  if (!onGroundToPalette(px)) offPalette += 1;
}
function onGroundToPalette(px) {
  for (const entry of paletteRgb) {
    // A pixel must be the ground blended toward exactly one palette entry. Each
    // channel allows an interval of blend factors within one 8-bit step of
    // rounding; the pixel is explained when all three intervals overlap, which
    // is the exact test rather than a tolerance on an averaged factor.
    let kLo = 0;
    let kHi = 1;
    for (let c = 0; c < 3; c++) {
      const base = groundRgb[c] * 255;
      const span = (entry[c] - groundRgb[c]) * 255;
      if (Math.abs(span) < 1e-9) {
        if (Math.abs(px[c] - base) > 1) {
          kLo = 1;
          kHi = 0;
          break;
        }
        continue;
      }
      const a = (px[c] - 1 - base) / span;
      const b = (px[c] + 1 - base) / span;
      kLo = Math.max(kLo, Math.min(a, b));
      kHi = Math.min(kHi, Math.max(a, b));
    }
    if (kLo <= kHi + 1e-9) return true;
  }
  return false;
}
check(offPalette === 0,
  `every drawn pixel must be a ground->palette blend; ${offPalette} pixel(s) are not`);
// Control: a colour that is not a ground->palette blend must be rejected.
assert.equal(onGroundToPalette([1, 2, 3]), false);
assert.equal(onGroundToPalette([255, 0, 255]), false);
assert.equal(onGroundToPalette([groundRgb[0] * 255, groundRgb[1] * 255, groundRgb[2] * 255]), true);
check(painted > width * height * 0.05 && painted < width * height * 0.95,
  'the poster frame must show both ground and ink');
check(colourSet.size <= scene.palette.length * (DELIVERY_CELL * DELIVERY_CELL + 1),
  `the raster must stay inside the palette's blend space, saw ${colourSet.size} colours`);

const rasterAgain = rasterize(renderFrame(scene, scene.posterFrame), scene, DELIVERY_CELL);
check(hash(Buffer.from(raster)) === hash(Buffer.from(rasterAgain)), 'the raster path must repeat identically');
const masks = [1, 2, 3].map((step) => discMask(step, DELIVERY_CELL));
check(masks.every((mask) => mask.length === DELIVERY_CELL * DELIVERY_CELL),
  'a dot mask must cover exactly one square cell');
for (let s = 1; s < 4; s++) {
  const measured = masks[s - 1].reduce((sum, v) => sum + v, 0) / masks[s - 1].length;
  check(Math.abs(measured - metrics.coverage[s]) < 0.03, 'measured coverage must match the engine report');
}

// ---------------------------------------------------------------------------
// 6. The baked still is the engine's own poster frame, pixel for pixel.
// ---------------------------------------------------------------------------
let bakedEvidence = { path: BAKED_SOURCE, exists: false };
if (bakedFile) {
  const meta = await sharp(bakedFile).metadata();
  const raw = await sharp(bakedFile).ensureAlpha().raw().toBuffer();
  const posterHash = hash(Buffer.from(raster));
  bakedEvidence = { path: BAKED_SOURCE, exists: true, bytes: bakedFile.length, sha256: hash(bakedFile),
    width: meta.width, height: meta.height, format: meta.format, palettePixels: meta.palette,
    pixelSha256: hash(raw), posterSha256: posterHash, equalsPosterFrame: hash(raw) === posterHash,
    shipped: shippedStill ? shippedStill.slice(root.length + 1) : null, maxBytes: 262144 };
  check(meta.width === width && meta.height === height,
    `the baked still must be ${width}x${height}, saw ${meta.width}x${meta.height}`);
  check(hash(raw) === posterHash,
    'the baked still must be exactly the engine raster of the poster frame');
  check(bakedFile.length <= 262144, `the baked still must stay small, saw ${bakedFile.length} B`);
}
await save('red-or-green.json', { failures, nodes, views, bakedEvidence, periodicity, dotEvidence, metrics: {
  coverage: metrics.coverage, ladder: metrics.ladder, headroom: metrics.headroom, colours: colourSet.size } });

if (nodeOnly) {
  console.log(JSON.stringify({ mode: failures.length ? 'RED' : 'GREEN', nodeOnly, failures, nodes, bakedEvidence, periodicity }, null, 2));
  await save(failures.length ? 'red.json' : 'green.json',
    { failures, nodes, views, bakedEvidence, metrics: { coverage: metrics.coverage, ladder: metrics.ladder } });
  process.exit(failures.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// 7. Comparison surface in a real browser, plus the live canvas equality.
// ---------------------------------------------------------------------------
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const nodeHash = (frame) => hash(Buffer.from(rasterize(renderFrame(scene, frame), scene, DELIVERY_CELL)));
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
  await page.addInitScript(() => {
    window.wu15Rafs = new Set();
    const raf = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const id = raf((time) => { window.wu15Rafs.delete(id); callback(time); });
      window.wu15Rafs.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => { window.wu15Rafs.delete(id); cancel(id); };
  });
  const response = await page.goto(LAB, { waitUntil: 'networkidle' });
  check(response.status() === 200, `lab HTTP ${response.status()}`);
  check(await page.locator('[data-ascii-compare="night-coast"]').count() === 1,
    'exactly one library comparison mount required');
  check(await page.locator(OWN).count() === 1, 'exactly one live mount of our scene required');
  check((labHtml.match(/data-own-scene="/g) ?? []).length === 1,
    'our scene must be mounted exactly once');
  check(await page.locator('img[data-compare-baked="joyan-night-coast"]').count() === 1,
    'one baked still required in the comparison');

  const live = await page.locator(OWN).evaluate(async (host) => {
    const canvas = host.querySelector('canvas');
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const digest = await crypto.subtle.digest('SHA-256', data);
    const box = canvas.getBoundingClientRect();
    return { frame: Number(host.dataset.sceneFrame), width: canvas.width, height: canvas.height,
      hash: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join(''),
      displayWidth: box.width, displayHeight: box.height };
  });
  const expected = nodeHash(live.frame);
  check(live.hash === expected,
    `Node raster and live canvas must agree on frame ${live.frame}: ${expected} != ${live.hash}`);
  check(live.width === width && live.height === height,
    `the live canvas must be ${width}x${height}, saw ${live.width}x${live.height}`);
  check(Math.abs(live.displayWidth / live.displayHeight - 2) < 0.08,
    `the displayed frame must stay 2:1, saw ${live.displayWidth}x${live.displayHeight}`);
  nodes.push({ live, expected, agree: live.hash === expected });

  // The canvas must be this engine's art and nothing else: every pixel is a
  // ground->palette blend (same rule the Node raster passed).
  const pixels = await page.locator(`${OWN} canvas`).evaluate((canvas) => {
    const ctx = canvas.getContext('2d');
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const set = new Set();
    let opaque = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 255) opaque += 1;
      else set.add(`a${data[i + 3]}`);
      set.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      if (set.size > 4096) break;
    }
    return { colours: [...set], sampled: width * height, opaque };
  });
  check(pixels.opaque === pixels.sampled, 'the live canvas must be fully opaque');
  const offLive = pixels.colours.filter((entry) => entry.startsWith('a')
    || !onGroundToPalette(entry.split(',').map(Number)));
  check(offLive.length === 0,
    `the live canvas must stay inside the palette blend space, saw ${JSON.stringify(offLive.slice(0, 4))}`);

  // 12 fps ceiling: the frame index must advance, and never faster than the cap.
  // The canvas starts offscreen on this long page, so it is scrolled into view
  // first: a paused offscreen canvas is the correct behaviour, not a failure.
  await page.locator(OWN).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const cadence = await page.locator(OWN).evaluate((host) => new Promise((done) => {
    let changes = 0;
    const observer = new MutationObserver(() => { changes += 1; });
    observer.observe(host, { attributes: true, attributeFilter: ['data-scene-frame'] });
    setTimeout(() => { observer.disconnect(); done({ changes, frame: Number(host.dataset.sceneFrame) }); }, 1500);
  }));
  check(cadence.changes >= 8 && cadence.changes <= 22,
    `12 fps ceiling violated: ${cadence.changes} frame updates in 1.5 s`);
  check(cadence.frame >= 0 && cadence.frame < scene.cycleFrames,
    'the runtime must report a frame inside the scene cycle');

  // A real pause: offscreen and hidden must freeze our canvas, and the observed
  // frame must still hash against the Node raster (a stale frame is not a bug).
  const frozen = async (label) => {
    const before = await readFrame(page);
    await page.waitForTimeout(600);
    const after = await readFrame(page);
    check(before.frame === after.frame && before.hash === after.hash,
      `${label}: our canvas must freeze, saw frames ${before.frame} then ${after.frame}`);
    return { label, before, after };
  };
  // Hidden first, while the canvas is still on screen and running.
  const rafVisible = await page.evaluate(() => window.wu15Rafs.size);
  check(rafVisible >= 1, `the live canvas must run an animation frame loop, saw ${rafVisible}`);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenFrozen = await frozen('hidden tab');
  const rafHidden = await page.evaluate(() => window.wu15Rafs.size);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(400);
  const offscreenBefore = await page.evaluate(() => window.wu15Rafs.size);
  await page.locator('h1').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const offscreenFrozen = await frozen('offscreen');
  const rafOffscreen = await page.evaluate(() => window.wu15Rafs.size);
  check(offscreenBefore >= 1, 'the canvas must be running again after the hidden tab returns');
  check(rafHidden < rafVisible && rafOffscreen < offscreenBefore,
    `our loop must stop when hidden/offscreen (${rafVisible} -> ${rafHidden}/${offscreenBefore} -> ${rafOffscreen})`);
  await page.locator(OWN).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const resumed = await readFrame(page);
  await page.waitForTimeout(400);
  const resumedLater = await readFrame(page);
  check(resumed.frame !== resumedLater.frame || resumed.frame === 0,
    'our canvas must resume when it returns on screen');
  check(await page.evaluate(() => window.wu15Rafs.size) <= rafVisible,
    'returning on screen must not duplicate RAF loops');
  views.push({ width: 1440, mode: 'normal', live, cadence, hiddenFrozen, offscreenFrozen, resumed, resumedLater,
    rafs: { visible: rafVisible, hidden: rafHidden, offscreenBefore, offscreen: rafOffscreen } });

  // Reduced motion must deliver a real, static, engine-drawn frame.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(500);
  const reduced = await readFrame(page);
  const reducedAgain = await readFrame(page);
  check(reduced.hash === reducedAgain.hash && reduced.frame === reducedAgain.frame,
    'reduced motion must render one static frame');
  check(reduced.frame === scene.posterFrame,
    `the reduced-motion frame must be the scene's poster frame ${scene.posterFrame}, saw ${reduced.frame}`);
  check(reduced.hash === nodeHash(scene.posterFrame),
    'the reduced-motion frame must be the engine raster of the poster frame');
  const reducedLabel = (await page.locator(`${OWN} button`).innerText()).trim();
  check(!/play/i.test(reducedLabel),
    `a disabled reduced-motion control must not offer playback, saw "${reducedLabel}"`);
  check(reducedLabel.length > 0, 'the reduced-motion control must still carry a truthful label');
  const libraryLabel = (await page.locator('[data-ascii-compare="night-coast"] button').innerText()).trim();
  check(!/play/i.test(libraryLabel),
    `the library pane's disabled reduced-motion control must not offer playback, saw "${libraryLabel}"`);
  check(await page.evaluate(() => window.wu15Rafs.size) <= rafVisible,
    'reduced motion must not leave extra RAF loops behind');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(400);
  await page.locator(OWN).screenshot({ path: shot('1440-compare-own.png') });
  await page.locator('[data-ascii-compare="night-coast"]').screenshot({ path: shot('1440-compare-library.png') });
  await page.locator('section[aria-labelledby="compare-title"]').screenshot({ path: shot('1440-compare.png') });
  check(external.length === 0, `no external request allowed, saw ${external.join(', ')}`);
  check(errors.length === 0, `browser errors: ${errors.join('; ')}`);

  // Cleanup: leaving the page must cancel our loop, proven in the pagehide
  // handler the runtime's own listener runs before.
  await page.locator(OWN).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const documentId = await page.evaluate(() => {
    window.wu15Id = crypto.randomUUID();
    window.addEventListener('pagehide', (event) => sessionStorage.setItem('wu15-pagehide', JSON.stringify({
      documentId: window.wu15Id, rafs: window.wu15Rafs.size, persisted: event.persisted,
    })));
    return window.wu15Id;
  });
  await page.locator('a[data-lab-return]').evaluate((el) => el.click());
  await page.waitForURL(base + '/');
  const cleanup = await page.evaluate(() => JSON.parse(sessionStorage.getItem('wu15-pagehide') ?? 'null'));
  check(Boolean(cleanup) && cleanup.documentId === documentId,
    'pagehide evidence missing for the lab document');
  check(Boolean(cleanup) && cleanup.rafs === 0, `pagehide must cancel the runtime RAFs, saw ${cleanup?.rafs}`);
  views.at(-1).cleanup = cleanup;
  await page.close();

  // Responsive inspection with real screenshots at the three accepted widths.
  for (const width of [390, 768, 1440]) {
    for (const mode of ['normal', 'reduce']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 },
        reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' });
      const view = await context.newPage();
      await view.goto(LAB, { waitUntil: 'networkidle' });
      await view.locator('section[aria-labelledby="compare-title"]').scrollIntoViewIfNeeded();
      await view.waitForTimeout(500);
      const geometry = await view.evaluate((selector) => {
        const section = document.querySelector(selector);
        const frames = [...section.querySelectorAll('[data-compare-frame], [data-compare-baked]')];
        return { documentWidth: document.documentElement.scrollWidth,
          boxes: frames.map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }) };
      }, 'section[aria-labelledby="compare-title"]');
      check(geometry.documentWidth === width, `${width}/${mode}: comparison causes horizontal overflow ${geometry.documentWidth}`);
      for (const [w, h] of geometry.boxes) {
        check(h > 0 && Math.abs(w / h - 2) < 0.08, `${width}/${mode}: comparison frame not 2:1 (${w}x${h})`);
      }
      await view.screenshot({ path: shot(`${width}-${mode}-compare-section.png`) });
      await view.screenshot({ path: shot(`${width}-${mode}-lab-full.png`), fullPage: true });
      views.push({ width, mode, geometry });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

async function readFrame(page) {
  return page.locator(OWN).evaluate(async (host) => {
    const canvas = host.querySelector('canvas');
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const digest = await crypto.subtle.digest('SHA-256', data);
    return { frame: Number(host.dataset.sceneFrame),
      hash: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('') };
  });
}
async function walk(dir) {
  const paths = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(path));
    else paths.push(path);
  }
  return paths;
}

await save(failures.length ? 'red.json' : 'green.json', { failures, nodes, views, bakedEvidence, periodicity, dotEvidence,
  metrics: { coverage: metrics.coverage, ladder: metrics.ladder, headroom: metrics.headroom } });
console.log(JSON.stringify({ mode: failures.length ? 'RED' : 'GREEN', failures, nodes: nodes.length, views: views.length }, null, 2));
process.exitCode = failures.length ? 1 : 0;
