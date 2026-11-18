import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { RAMP, frameChars, rasterize, renderFrame } from '../../../../scripts/scene-src/engine.mjs';
import { scene, CELL } from './scene.mjs';

// Study choices, NOT additional thresholds claimed to come from skill 1.1.
const PINNED = [0, 1, 90, 180, 270, 360, 450, 540, 630, 719];
const BUDGET_MS = 16.67;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const here = new URL('.', import.meta.url);
const save = (name, value) => writeFileSync(new URL(name, here), JSON.stringify(value, null, 2) + '\n');

if (process.argv.includes('--sample')) {
  // No durations, dates or process IDs in the independent deterministic output.
  const frames = PINNED.map((index) => {
    const frame = renderFrame(scene, index);
    return { index, chars: frameChars(frame), rgbaSHA256: digest(rasterize(frame, scene, CELL)) };
  });
  process.stdout.write(JSON.stringify({ pinned: PINNED, frames }) + '\n');
} else {
  const report = { node: process.version, budgetMs: BUDGET_MS, failures: [] };
  const probe = () => {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--sample'], {
      encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    });
    assert.equal(child.status, 0, child.stderr);
    return child.stdout;
  };
  const a = probe();
  const b = probe();
  writeFileSync(new URL('sample-a.json', here), a);
  writeFileSync(new URL('sample-b.json', here), b);
  assert.equal(a, b, 'Independent runs must be byte-identical');
  report.determinism = { status: 'PASS', processes: 2, pinned: PINNED,
    bytes: Buffer.byteLength(a), sha256: digest(a) };

  // Examine EVERY integer frame, not only the pinned determinism frames.
  let worst = { frame: 0, maxCells: 0, fraction: 0 };
  let occupied = 0;
  for (let index = 0; index < scene.cycleFrames; index++) {
    const frame = renderFrame(scene, index);
    let maxCells = 0;
    for (const step of frame.steps) if (step === RAMP.length - 1) maxCells++;
    if (index === 0) occupied = frame.steps.filter((step) => step > 0).length;
    const fraction = maxCells / frame.steps.length;
    if (fraction > worst.fraction) worst = { frame: index, maxCells, fraction };
  }
  report.saturation = { status: worst.fraction < 0.05 ? 'PASS' : 'FAIL',
    sampledFrames: scene.cycleFrames, totalCells: scene.cols * scene.rows,
    occupiedAtZero: occupied, ...worst };
  if (!(worst.fraction < 0.05)) report.failures.push('saturation must be < 5%');
  assert(occupied > 0, 'An empty scene must not pass vacuously');
  const overloaded = renderFrame({ ...scene, field: () => 1 }, 0);
  const overloadedFraction = overloaded.steps.filter((step) => step === RAMP.length - 1).length
    / overloaded.steps.length;
  assert.equal(overloadedFraction, 1, 'Negative control must register 100% saturation');
  assert(overloadedFraction >= 0.05, 'The negative control must violate the skill threshold');
  assert.notEqual(frameChars(renderFrame(scene, 0)), frameChars(renderFrame(scene, 180)),
    'Different phases must not pass by accidentally benchmarking a still');
  report.controls = { overloadedSaturation: overloadedFraction, differentPhasesDiffer: true };

  // Test the actual time field at t and t + T, NOT adapter frame modulo alone.
  const T = scene.cycleFrames / scene.fps;
  let maxPeriodError = 0;
  let maxBoundaryChange = 0;
  let maxMotion = 0;
  for (let y = 0; y < scene.rows; y += 3) {
    for (let x = 0; x < scene.cols; x += 3) {
      for (const t of [0, 0.2, 3.7, 11.4, T - 0.01]) {
        maxPeriodError = Math.max(maxPeriodError, Math.abs(scene.field(x, y, t) - scene.field(x, y, t + T)));
      }
      maxBoundaryChange = Math.max(maxBoundaryChange,
        Math.abs(scene.field(x, y, T - 0.001) - scene.field(x, y, 0)));
      maxMotion = Math.max(maxMotion, Math.abs(scene.field(x, y, 0) - scene.field(x, y, T / 4)));
    }
  }
  assert(maxPeriodError < 1e-10, 'The field must be periodic in seconds');
  assert(maxBoundaryChange < 0.002, 'The continuous loop must approach its boundary');
  assert(maxMotion > 0.001, 'This must be a dynamic scene, not an inert benchmark');
  report.animation = { T, maxPeriodError, maxBoundaryChange, maxMotion,
    note: 'study-specific safeguards; not thresholds defined in skill §4' };

  let into;
  const draw = (index) => {
    const frame = renderFrame(scene, index);
    into = rasterize(frame, scene, CELL, into);
  };
  const coldStart = performance.now();
  draw(0);
  const coldMs = performance.now() - coldStart;
  for (let index = 0; index < 60; index++) draw(index);
  const samples = [];
  for (let index = 0; index < 240; index++) {
    const start = performance.now();
    draw((index * 3) % scene.cycleFrames);
    samples.push(performance.now() - start);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.ceil(sorted.length * p) - 1];
  const stats = { samples: samples.length, coldMs, medianMs: percentile(0.5), p90Ms: percentile(0.9),
    meanMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    p95Ms: percentile(0.95), worstMs: sorted.at(-1) };
  report.cost = { status: stats.medianMs <= BUDGET_MS && stats.p90Ms <= BUDGET_MS ? 'PASS' : 'FAIL',
    scope: `renderFrame + rasterize; cell=${CELL}; 60 warmup frames; 240 measured dynamic frames`, ...stats };
  if (report.cost.status === 'FAIL') report.failures.push('Node median and p90 must be <= 16.67 ms');
  save('node-results.json', report);
  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.failures.length, 0, report.failures.join('; '));
}
