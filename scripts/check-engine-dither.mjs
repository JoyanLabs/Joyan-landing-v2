#!/usr/bin/env node
/**
 * Engine capability test — the coarse 2x2 dither and the viewport density rule.
 *
 * Why this file exists: `bayer2` and `densityForViewport` were added to the
 * engine WITHOUT wiring them into any page, because the shape lab iterates
 * `DITHER_MODES` and a fifth mode would grow a page whose budget is pinned.
 * The risk of that decision is silent drift: the new mode could change the
 * thresholds of the existing ones, or the lab's list could grow by accident.
 * This test is the guard for exactly that.
 *
 * Pure Node, no browser, no sharp, no server.
 *
 * Usage: node scripts/check-engine-dither.mjs [--out <dir>]
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ALL_DITHER_MODES, DITHER_MODES, ditherThreshold, densityForViewport } from '../scripts/scene-src/engine.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const outFlag = process.argv.indexOf('--out');
const out = resolve(root, outFlag > -1 ? process.argv[outFlag + 1] : 'dist-motion-verify/engine-dither');
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

/* ---- bayer2: the new coarse mode ---- */
check('bayer2 has a 2x2 period', () => {
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 6; x++) {
      assert.equal(ditherThreshold('bayer2', x, y), ditherThreshold('bayer2', x % 2, y % 2));
    }
  }
});

check('bayer2 yields the four canonical quarters', () => {
  const values = [0, 1].flatMap((y) => [0, 1].map((x) => ditherThreshold('bayer2', x, y))).sort();
  assert.deepEqual(values, [0.125, 0.375, 0.625, 0.875]);
});

check('bayer2 stays strictly inside (0, 1)', () => {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const v = ditherThreshold('bayer2', x, y);
      assert.ok(v > 0 && v < 1, `threshold out of range: ${v}`);
    }
  }
});

/* ---- regression guards for the existing modes ---- */
check('bayer4 keeps its canonical first values', () => {
  // (value + 0.5) / 16 for the published 4x4 matrix order.
  assert.equal(ditherThreshold('bayer4', 0, 0), 0.03125);
  assert.equal(ditherThreshold('bayer4', 1, 0), 0.53125);
  assert.equal(ditherThreshold('bayer4', 0, 1), 0.78125);
  assert.equal(ditherThreshold('bayer4', 1, 1), 0.28125);
});

check('bayer4 and bayer8 have 16 and 64 distinct values', () => {
  const distinct = (mode, n) => new Set(
    Array.from({ length: n }, (_, i) => ditherThreshold(mode, i % (mode === 'bayer4' ? 4 : 8), Math.floor(i / (mode === 'bayer4' ? 4 : 8))))).size;
  assert.equal(distinct('bayer4', 16), 16);
  assert.equal(distinct('bayer8', 64), 64);
});

check("'none' is a flat 0.5 and unknown modes fall back to bayer4", () => {
  assert.equal(ditherThreshold('none', 3, 7), 0.5);
  assert.equal(ditherThreshold('not-a-mode', 1, 2), ditherThreshold('bayer4', 1, 2));
});

check('DITHER_MODES is unchanged (the lab iterates it)', () => {
  assert.deepEqual([...DITHER_MODES], ['bayer4', 'bayer8', 'blue', 'none']);
});

check('ALL_DITHER_MODES adds only bayer2', () => {
  assert.deepEqual([...ALL_DITHER_MODES], ['bayer2', 'bayer4', 'bayer8', 'blue', 'none']);
});

/* ---- density rule ---- */
check('density is 1.0 at 900 px and above', () => {
  assert.equal(densityForViewport(900), 1);
  assert.equal(densityForViewport(1440), 1);
  assert.equal(densityForViewport(2560), 1);
});

check('density is 1.5 at 390 px and below', () => {
  assert.equal(densityForViewport(390), 1.5);
  assert.equal(densityForViewport(320), 1.5);
});

check('density is monotonic and deterministic', () => {
  const widths = [320, 390, 480, 600, 768, 900, 1024, 1440, 1920];
  const scales = widths.map((w) => densityForViewport(w));
  for (let i = 1; i < scales.length; i++) {
    assert.ok(scales[i] <= scales[i - 1], `density rose with width at ${widths[i]}`);
  }
  assert.deepEqual(scales, widths.map((w) => densityForViewport(w)));
});

check('density rejects a non-positive width', () => {
  assert.throws(() => densityForViewport(0), RangeError);
  assert.throws(() => densityForViewport(Number.NaN), RangeError);
});

const failures = checks.filter((c) => !c.pass);
await mkdir(out, { recursive: true });
await writeFile(resolve(out, failures.length ? 'red.json' : 'green.json'), JSON.stringify({
  checks,
  measured: {
    bayer2: [0, 1].map((y) => [0, 1].map((x) => ditherThreshold('bayer2', x, y))),
    density: Object.fromEntries([320, 390, 600, 768, 900, 1440].map((w) => [w, densityForViewport(w)])),
  },
  limitations: [
    'Pure threshold and rule tests; no raster output and no browser render.',
    'bayer2 is not wired into any page yet: this proves the capability and that the existing modes did not move.',
  ],
}, null, 2) + '\n');
console.log(JSON.stringify({ mode: failures.length ? 'RED' : 'GREEN', total: checks.length, failed: failures.length }, null, 2));
process.exitCode = failures.length ? 1 : 0;
