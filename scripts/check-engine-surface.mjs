#!/usr/bin/env node
/**
 * Engine surface test — the engine must not carry fields without a product consumer.
 *
 * Why this file exists: `minTone` and `groundMode` were added while bringing the
 * paper ground up. The consumer does that normalisation and that inversion
 * itself, already, from its own palette extremes; leaving a second copy inside
 * the engine created two truths and would have forced a second, noisy
 * re-measurement of the pinned landing chunks. WU108 reverts the engine side.
 *
 * The risk this file guards is silent reintroduction: either field could come
 * back inside a refactor and the landing would keep working, with the inversion
 * applied twice on the paper ground and nobody noticing until a diff of bytes.
 *
 * Pure Node, no browser, no sharp, no server.
 *
 * Usage: node scripts/check-engine-surface.mjs
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { renderFrame, sceneMetrics } from '../scripts/scene-src/engine.mjs';

const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ check: name, pass: true });
    console.log('PASS ' + name);
  } catch (error) {
    checks.push({ check: name, pass: false, error: String(error.message).slice(0, 300) });
    console.log('FAIL ' + name + ' :: ' + String(error.message).split('\n')[0]);
  }
}

// A deterministic dark-ground scene. Kept inside this file on purpose: a
// committed test must not read git history or a fixed commit to build its input.
const PALETTE = ['#0b1014', '#16323a', '#2a5b62', '#57a89e', '#d8efe8'];
const GROUND = 0;

function makeScene(id) {
  return {
    id,
    cols: 16,
    rows: 8,
    fps: 12,
    cycleFrames: 24,
    palette: PALETTE,
    ground: GROUND,
    // Normalised 0..1, the scale the engine works in: `hexToRgb` and `luma` are
    // both 0..1, so a 0..255 field would saturate every cell to the top rung.
    field(x, y, t) {
      const v = 0.5 + 0.5 * Math.sin(x * 0.35 + y * 0.2 + t * 1.7);
      return [v, v * 0.8 + 0.1, v * 0.7 + 0.2];
    },
  };
}

const digest = (frames) => createHash('sha256')
  .update(Buffer.concat(frames.map((frame) => Buffer.from(frame.steps))))
  .digest('hex');

/* ---- 1. the surface carries no product-less field ---- */

check('sceneMetrics does not expose minTone (WU108)', () => {
  const metrics = sceneMetrics(makeScene('surface-a'));
  assert.equal(
    Object.hasOwn(metrics, 'minTone'),
    false,
    'minTone came back into sceneMetrics: the consumer already computes it from its own palette',
  );
});

check('sceneMetrics still exposes the ground range the field is normalised against', () => {
  const metrics = sceneMetrics(makeScene('surface-b'));
  assert.equal(typeof metrics.groundTone, 'number', 'groundTone must stay in the surface');
  assert.equal(typeof metrics.maxTone, 'number', 'maxTone must stay in the surface');
  assert.ok(metrics.maxTone > metrics.groundTone, 'the dark palette must keep a readable range above the ground');
  assert.equal(metrics.groundIndex, GROUND, 'the ground index must still be reported');
});

/* ---- 2. groundMode is inert: the inversion belongs to the consumer ---- */

check("renderFrame ignores a groundMode option (WU108)", () => {
  const scene = makeScene('surface-c');
  for (const frame of [0, 7, 13]) {
    const plain = renderFrame(scene, frame);
    const asked = renderFrame(scene, frame, { groundMode: 'light' });
    assert.deepEqual(
      Array.from(asked.steps),
      Array.from(plain.steps),
      `frame ${frame}: groundMode changed the steps, so the engine still inverts on its own`,
    );
    assert.deepEqual(
      Array.from(asked.indices),
      Array.from(plain.indices),
      `frame ${frame}: groundMode changed the palette indices`,
    );
  }
});

/* ---- 3. the default path did not move ---- */
const GOLDEN_STEPS_DIGEST = '20b60d0779fd01b8f46169fed7de6c06a8b7dfa336ce3a637a1f8798b5578aab';

check('the default dark render is stable against its golden', () => {
  const scene = makeScene('surface-golden');
  const frames = [0, 6, 12].map((frame) => renderFrame(scene, frame));
  assert.equal(
    digest(frames),
    GOLDEN_STEPS_DIGEST,
    'the default render changed: reverting the engine side must leave the dark path byte-identical',
  );
});

/* ---- 4. the light-ground contract stays the caller's job ---- */

check('renderFrame is a dark-ground primitive: a light ground collapses by contract (WU108)', () => {
  // Cream first (the ground IS the lightest tone), ink last: the paper palette.
  const light = {
    id: 'surface-light',
    cols: 8,
    rows: 4,
    fps: 12,
    cycleFrames: 12,
    palette: ['#efe7d6', '#c9bda6', '#8a7f6e', '#4a4740', '#1a1a18'],
    ground: 0,
    field: () => [0.3, 0.3, 0.3],
  };
  const frame = renderFrame(light, 0);
  assert.ok(
    frame.steps.every((step) => step === 0),
    'a light-ground palette must collapse on step 0 inside renderFrame: the caller inverts and normalises, so the engine must not carry an inversion of its own',
  );
});

const red = checks.filter((entry) => !entry.pass);console.log('');
console.log(JSON.stringify({ mode: red.length ? 'RED' : 'GREEN', total: checks.length, failed: red.length }, null, 2));
process.exitCode = red.length ? 1 : 0;
