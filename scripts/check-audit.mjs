#!/usr/bin/env node
/**
 * WU19 local acceptance — THE AUDIT, MEASURED (docs/AUDITORIA-ESCENAS.md).
 * ============================================================================
 * The user asked for a complete audit with the measured models, one improvement
 * round, and then the single page. This file is the audit's falsifiable half:
 * every finding's number is RECOMPUTED here from the engine and the pipeline,
 * and the Spanish audit document is required to carry it, its evidence path, a
 * priority and its fixed-this-round status. A number the document invents (or
 * forgets) fails here, so the audit cannot drift from the code it audits.
 *
 * Findings, each with the metric this file recomputes:
 *
 *   palette-depth      the library's 30-entry palettes against our default
 *                      extraction depth and the named aurora palette
 *   ramp-coverage      the ladder: five rungs, the top at full coverage 1.0,
 *                      radii re-derived (the fifth is the half diagonal)
 *   aliasing-prefilter the calibration target's hatch region coefficient of
 *                      variation before/after the pitch-matched prefilter
 *   auto-gain-sparse   the sparse-input percentile and the recorded gain
 *   aurora-overlays    aurora blob size (connected cells) and subject contrast
 *                      delta on our own mark
 *   flat-texture       what a flat mid-tone area actually renders (steps and
 *                      flat-run fraction)
 *   pitch              the delivery cell and the grid the lab displays
 *
 * Evidence goes to `dist-motion-verify/wu19/audit/`. Usage:
 *   node scripts/check-audit.mjs [--out <dir>]
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const outFlag = process.argv.indexOf('--out');
const out = resolve(root, outFlag > -1 ? process.argv[outFlag + 1] : 'dist-motion-verify/wu19/audit');
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const save = async (name, data) => writeFile(resolve(out, name), JSON.stringify(data, null, 2));
await mkdir(out, { recursive: true });

// --- modules ---------------------------------------------------------------
let engine;
let pipeline;
let overlays;
let fromImage;
let localInputs;
let loadError = '';
try {
  engine = await import(new URL('./scene-src/engine.mjs', import.meta.url));
  pipeline = await import(new URL('./scene-src/image-pipeline.mjs', import.meta.url));
  overlays = await import(new URL('./scene-src/overlays.mjs', import.meta.url));
  fromImage = await import(new URL('./scene-src/from-image.mjs', import.meta.url));
  localInputs = await import(new URL('./scene-src/local-inputs.mjs', import.meta.url));
} catch (error) {
  loadError = error.message;
}
const ready = Boolean(engine && pipeline && overlays && fromImage && localInputs);
check(ready, `the engine modules must import for the audit to recompute its numbers: ${loadError || 'ok'}`);

let libraryDepth = null;
try {
  const piece = await import('ascii.rest/pieces/night-coast');
  const meta = piece.meta;
  libraryDepth = meta.palette.length;
} catch (error) {
  check(false, `the library comparison scene must import so the palette-depth finding is measured: ${error.message}`);
}

// --- the audit document ----------------------------------------------------
const DOC = 'docs/AUDITORIA-ESCENAS.md';
let auditDoc = '';
try {
  auditDoc = await readFile(resolve(root, DOC), 'utf8');
} catch (error) {
  check(false, `the Spanish audit document is missing at ${DOC}: ${error.message}`);
}
if (auditDoc) {
  check(/prioridad/i.test(auditDoc), 'the audit must state a priority per finding');
  check(/P1|P2|P3/.test(auditDoc), 'the audit priorities must use the P1/P2/P3 scale');
  check(/resuelto esta ronda|fixed this round/i.test(auditDoc),
    'the audit must mark what was fixed this round');
  check(/pendiente/i.test(auditDoc), 'the audit must list what remains, honestly');
  check(/página única|single page|pagina unica/i.test(auditDoc),
    'the audit must feed the single-page unit explicitly');
  check(/método|m[eé]todo|method/i.test(auditDoc), 'the audit must state its method');
  check(/dist-motion-verify\/wu19/.test(auditDoc),
    'every finding must name its evidence file under dist-motion-verify/wu19/');
}

/** Spanish or plain rendering of a number, so the doc's locale cannot break the match. */
const es = (value, digits = 4) => Number(value).toFixed(digits).replace('.', ',');
const en = (value, digits = 4) => Number(value).toFixed(digits);
const docHas = (value, digits = 4) => auditDoc.includes(es(value, digits)) || auditDoc.includes(en(value, digits));
const docHasPlain = (value) => auditDoc.includes(String(value));

// --- measured findings -----------------------------------------------------
const findings = {};

if (ready) {
  const { convertRgba } = pipeline;
  const { renderFrame, stepFor, COVERAGE, DOT_RADIUS, DELIVERY_CELL, sceneMetrics, luma } = engine;
  const { withOverlays } = overlays;

  // 1. Ramp coverage: five rungs, the top at the INSCRIBED DISC (WU22), radii re-derived.
  findings.ramp = {
    rungs: COVERAGE.length, coverage: [...COVERAGE], radii: DOT_RADIUS.map((r) => Number(r.toFixed(4))),
    top: COVERAGE[COVERAGE.length - 1], fullLevelStep: stepFor(1, 0, 0),
  };
  check(COVERAGE.length === 5, `the ladder must have five rungs, saw ${COVERAGE.length}`);
  check(Math.abs(COVERAGE[4] - Math.PI / 4) < 1e-9,
    `the WU22 fifth rung must be the inscribed disc (coverage π/4 = ${(Math.PI / 4).toFixed(4)}), saw ${COVERAGE[4]}`);
  check(Math.abs(DOT_RADIUS[4] - 0.5) < 0.003,
    `the WU22 fifth radius must be the half side 0.5 (the inscribed disc, NOT the WU19 half diagonal), saw ${DOT_RADIUS[4]?.toFixed(4)}`);
  if (auditDoc) {
    check(docHas(COVERAGE[4]) || /0,7854|0\.7854/.test(auditDoc),
      'the audit must state the WU22 inscribed-disc cap (coverage π/4 ≈ 0.7854)');
    check(docHas(DOT_RADIUS[4]) || /0,5|0\.5/.test(auditDoc),
      `the audit must state the re-derived fifth radius ${es(DOT_RADIUS[4])}`);
  }

  // 2. Aliasing prefilter on the calibration target's hatch region.
  const target = localInputs.LOCAL_INPUTS.find((entry) => entry.id === 'test-target');
  const decodedTarget = await fromImage.decodeImage(target.svg);
  const hatch = (measure) => {
    const vals = [];
    for (let y = 40; y < 77; y++) for (let x = 80; x < 117; x++) vals.push(measure.levels[y * measure.cols + x]);
    const mean = vals.reduce((sum, value) => sum + value, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / vals.length);
    return { mean, cv: mean > 0 ? sd / mean : 0 };
  };
  const off = convertRgba(decodedTarget.rgba, decodedTarget.width, decodedTarget.height,
    { cols: target.cols, rows: target.rows, mode: 'ink', colorMode: 'levels', palette: 'ink',
      prefilter: false, autoGain: 'none', id: 'audit-hatch-off' });
  const on = convertRgba(decodedTarget.rgba, decodedTarget.width, decodedTarget.height,
    { cols: target.cols, rows: target.rows, mode: 'ink', colorMode: 'levels', palette: 'ink',
      id: 'audit-hatch-on' });
  const cvBefore = hatch(off.measure).cv;
  const cvAfter = hatch(on.measure).cv;
  findings.prefilter = { before: Number(cvBefore.toFixed(4)), after: Number(cvAfter.toFixed(4)),
    rule: on.measure.stats.prefilter };
  check(cvAfter < 0.55 && cvAfter < cvBefore,
    `the prefilter must reduce the hatch beat: cv ${cvAfter.toFixed(3)} after vs ${cvBefore.toFixed(3)} before`);
  if (auditDoc) {
    check(docHas(cvBefore), 'the audit must state the measured hatch cv BEFORE the prefilter');
    check(docHas(cvAfter), 'the audit must state the measured hatch cv AFTER the prefilter');
  }

  // 3. Auto-gain on our sparse mark.
  const mark = localInputs.LOCAL_INPUTS.find((entry) => entry.id === 'joyan-mark');
  const decodedMark = await fromImage.decodeImage(mark.svg);
  const markOn = convertRgba(decodedMark.rgba, decodedMark.width, decodedMark.height,
    { cols: mark.cols, rows: mark.rows, mode: 'ink', colorMode: 'levels', palette: 'ink', id: 'audit-gain' });
  const markStats = markOn.measure.stats;
  findings.autoGain = { gain: markOn.scene.params.gain, inkedFraction: Number(markStats.inkedFraction.toFixed(4)),
    rule: markStats.autoGain };
  check(markOn.scene.params.gain >= 1, 'the sparse mark must record a gain >= 1');
  if (auditDoc) {
    check(docHasPlain(markStats.inkedCells), 'the audit must state the mark measured inked cell count');
    check(docHas(markStats.inkedFraction), 'the audit must state the mark measured inked fraction');
  }

  // 4. Palette depth: library vs our default extraction and the named aurora palette.
  const gsize = 256;
  const gradientAudit = Buffer.alloc(gsize * gsize * 4);
  for (let y = 0; y < gsize; y++) {
    for (let x = 0; x < gsize; x++) {
      const at = (y * gsize + x) * 4;
      const value = Math.round(255 * ((x + y) / (2 * gsize - 2)));
      gradientAudit[at] = value; gradientAudit[at + 1] = value; gradientAudit[at + 2] = value; gradientAudit[at + 3] = 255;
    }
  }
  const deep = convertRgba(gradientAudit, gsize, gsize,
    { cols: 200, rows: 100, mode: 'luminance', colorMode: 'rgb', palette: 'extract', id: 'audit-palette' });
  const auroraPreset = pipeline.IMAGE_PALETTES.find((entry) => entry.id === 'aurora');
  findings.palette = { library: libraryDepth, defaultExtraction: deep.palette.length,
    auroraNamed: auroraPreset?.palette.length ?? null };
  check(deep.palette.length >= 12, `the default extraction depth must be >= 12, saw ${deep.palette.length}`);
  if (libraryDepth !== null && auditDoc) {
    check(docHasPlain(libraryDepth), `the audit must state the library palette depth ${libraryDepth}`);
    check(docHasPlain(deep.palette.length), 'the audit must state our default extraction depth');
  }

  // 5. Aurora overlays: wash extent, connected blob size and subject contrast
  //    on our own mark, at the 200x100 grid the treatment ships at.
  const auroraBase = (await fromImage.convert(mark.svg,
    { cols: 200, rows: 100, mode: 'ink', colorMode: 'levels', palette: 'aurora', id: 'audit-aurora' })).scene;
  const base = auroraBase;
  const composed = withOverlays(base, ['aurora', 'stars']);
  const toneOf = (value) => (typeof value === 'number' ? value : luma(value[0], value[1], value[2]));
  const cols = base.cols;
  const rows = base.rows;
  const fieldBase = [];
  const fieldComp = [];
  const delta = new Float64Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = y * cols + x;
      fieldBase[at] = toneOf(base.field(x, y, 0));
      fieldComp[at] = toneOf(composed.field(x, y, 0));
      delta[at] = Math.abs(fieldComp[at] - fieldBase[at]);
    }
  }
  // Subject contrast: subject cells (base > 0.4) against the mean ground tone in
  // a 7x7 neighbourhood, with and without the overlay.
  let contrastBaseSum = 0;
  let contrastCompSum = 0;
  let subjectCells = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (fieldBase[y * cols + x] <= 0.4) continue;
      let groundBase = 0;
      let groundComp = 0;
      let groundCells = 0;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          if (fieldBase[ny * cols + nx] <= 0.1) {
            groundBase += fieldBase[ny * cols + nx];
            groundComp += fieldComp[ny * cols + nx];
            groundCells += 1;
          }
        }
      }
      if (!groundCells) continue;
      contrastBaseSum += fieldBase[y * cols + x] - groundBase / groundCells;
      contrastCompSum += fieldComp[y * cols + x] - groundComp / groundCells;
      subjectCells += 1;
    }
  }
  const contrastBase = contrastBaseSum / Math.max(1, subjectCells);
  const contrastComp = contrastCompSum / Math.max(1, subjectCells);
  const contrastRetained = contrastComp / Math.max(1e-9, contrastBase);
  // Connected components (4-neighbourhood) of cells the overlay moves by > 0.12.
  const active = [...delta].map((value) => value > 0.12);
  const seen = new Uint8Array(cols * rows);
  const sizes = [];
  for (let i = 0; i < active.length; i++) {
    if (!active[i] || seen[i]) continue;
    let size = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const at = stack.pop();
      size += 1;
      const x = at % cols;
      const y = (at / cols) | 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = ny * cols + nx;
        if (active[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      }
    }
    sizes.push(size);
  }
  const maxBlob = sizes.length ? Math.max(...sizes) : 0;
  const activeFrac = sizes.reduce((sum, value) => sum + value, 0) / (cols * rows);
  findings.aurora = { cells: cols * rows, components: sizes.length,
    maxBlob, activeFrac: Number(activeFrac.toFixed(4)),
    contrastRetained: Number(contrastRetained.toFixed(4)) };
  check(activeFrac > 0, 'the aurora must actually move cells on our mark');
  // Tuned aurora (WU19): the WU18 constants produced one ~1200-cell connected
  // wash covering 28.9% of a 200x100 grid; the tuned ones must read far finer
  // while keeping the subject's local contrast.
  check(activeFrac < 0.15,
    `the tuned aurora must tint far fewer cells than the WU18 wash: ${activeFrac.toFixed(3)} of the grid shifted by > 0.12 (want < 0.15)`);
  check(maxBlob < 300,
    `the tuned aurora must not form the ~1200-cell WU18 wash: largest blob ${maxBlob} cells (want < 300)`);
  check(contrastRetained > 0.9,
    `the aurora must preserve the subject's local contrast: retained ${contrastRetained.toFixed(3)} (want > 0.9)`);
  if (auditDoc) {
    check(docHasPlain(maxBlob) || docHas(maxBlob, 0),
      'the audit must state the measured aurora largest blob size');
    check(docHas(activeFrac), 'the audit must state the measured aurora wash fraction');
    check(docHas(contrastRetained), 'the audit must state the measured subject contrast retained');
  }

  // 6. Flat-area texture: a flat mid-tone area and what it really renders.
  const size = 256;
  const flat = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    flat[i * 4] = 128; flat[i * 4 + 1] = 128; flat[i * 4 + 2] = 128; flat[i * 4 + 3] = 255;
  }
  const flatOn = convertRgba(flat, size, size, { cols: 160, rows: 80, mode: 'luminance',
    colorMode: 'levels', palette: 'ink', id: 'audit-flat' });
  const frame = renderFrame(flatOn.scene, 0);
  const counts = [0, 0, 0, 0, 0];
  for (const step of frame.steps) counts[step] += 1;
  let flatRun = 0;
  let runTotal = 0;
  for (let y = 0; y < frame.rows; y++) {
    for (let x = 0; x + 1 < frame.cols; x++) {
      runTotal += 1;
      if (frame.steps[y * frame.cols + x] === frame.steps[y * frame.cols + x + 1]) flatRun += 1;
    }
  }
  findings.flat = { stepsUsed: counts.map((count, step) => ({ step, fraction: Number((count / frame.steps.length).toFixed(4)) }))
      .filter((entry) => entry.fraction > 0),
    flatRunFraction: Number((flatRun / runTotal).toFixed(4)) };
  check(findings.flat.stepsUsed.length >= 2, 'a flat mid-tone must actually dither between rungs');
  if (auditDoc) {
    check(docHas(findings.flat.flatRunFraction), 'the audit must state the flat-area run fraction');
  }

  // 7. Pitch: the delivery cell and the grid.
  findings.pitch = { deliveryCell: DELIVERY_CELL, grid: '200x100', labGrid: '160x80' };
  check(DELIVERY_CELL === 8, `the delivery cell must stay 8 px, saw ${DELIVERY_CELL}`);
  if (auditDoc) check(auditDoc.includes('8 px'), 'the audit must state the 8 px delivery cell');

  // The five-run radii the docs must match.
  const metrics = sceneMetrics(base);
  findings.ladder = { coverage: metrics.coverage, ladder: metrics.ladder.map((v) => Number(v.toFixed(4))) };
}

await save('red.json', { failures });
await save(failures.length ? 'red.json' : 'green.json', { failures, findings, document: DOC,
  present: Boolean(auditDoc) });
console.log(JSON.stringify({ mode: failures.length ? 'RED' : 'GREEN', failures: failures.length,
  findings: Object.keys(findings) }, null, 2));
process.exitCode = failures.length ? 1 : 0;
