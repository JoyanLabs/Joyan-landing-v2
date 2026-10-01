#!/usr/bin/env node
/**
 * The oracle. Checks the film before a human ever watches it.
 *
 * A motion video reads as a slideshow for two independent reasons, and both
 * are measurable:
 *
 *   1. RHYTHM  — uniform cadence. Every shot the same length feels like a
 *      template, however good each shot is on its own.
 *   2. CARRY   — beats that *replace* each other. At every boundary,
 *      something on screen must survive and visibly become the next beat.
 *      If nothing survives, it is a slide change, whatever the rhythm.
 *
 * This reads the rendered frames and reports a verdict. A rejected film is
 * not a near miss: it is a slideshow with good typography.
 *
 * Usage: node scripts/motion-src/probe.mjs --frames dist-motion/frames
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILM } from './film.mjs';

const HERE = resolve(fileURLToPath(new URL('.', import.meta.url)));
const REPO = resolve(HERE, '../..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const FRAMES = resolve(REPO, arg('frames', 'dist-motion/frames'));

/** Minimal PNG reader: enough for 8-bit RGBA/RGB, which is what we render. */
function readPng(path) {
  const buf = readFileSync(path);
  let p = 8, w = 0, h = 0, bitDepth = 8, colorType = 6;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported color type ${colorType}`);

  // Inflate (zlib) via the platform, since Node ships no raw inflate.
  const raw = inflate(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let ip = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[ip++];
    const row = raw.subarray(ip, ip + stride); ip += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prior ? prior[x] : 0;
      const c = prior && x >= channels ? prior[x - channels] : 0;
      const v = row[x];
      cur[x] = (filter === 0 ? v
        : filter === 1 ? v + a
        : filter === 2 ? v + b
        : filter === 3 ? v + ((a + b) >> 1)
        : filter === 4 ? v + paeth(a, b, c)
        : (() => { throw new Error(`bad filter ${filter}`); })()) & 0xff;
    }
  }
  return { w, h, channels, data: out };
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function inflate(buf) {
  // Node ships no raw inflate; zlib's is one line of Python and always
  // present. Done per frame, so keep the payload a single stdio write.
  const r = spawnSync(
    'python3',
    ['-c', 'import sys,zlib;sys.stdout.buffer.write(zlib.decompress(sys.stdin.buffer.read()))'],
    { input: buf, maxBuffer: 1 << 30 }
  );
  if (r.status !== 0) throw new Error(`inflate failed: ${r.stderr}`);
  return r.stdout;
}

// --- Frame metrics -------------------------------------------------------

const files = readdirSync(FRAMES).filter((f) => f.endsWith('.png')).sort();
if (files.length < 2) throw new Error(`no frames in ${FRAMES}`);

const STEP = 6; // sample every 6th pixel row-wise: enough signal, 1/36 the work
const sigs = files.map((f, i) => {
  const { w, h, channels, data } = readPng(join(FRAMES, f));
  const cols = 96, rows = 54; // normalized grid, independent of output size
  const grid = new Float32Array(cols * rows);
  const ink = [];
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const x0 = Math.floor((gx * w) / cols), x1 = Math.floor(((gx + 1) * w) / cols);
      const y0 = Math.floor((gy * h) / rows), y1 = Math.floor(((gy + 1) * h) / rows);
      let lum = 0, n = 0, lit = 0;
      for (let y = y0; y < y1; y += STEP) {
        for (let x = x0; x < x1; x += STEP) {
          const o = (y * w + x) * channels;
          const l = data[o] * 0.2126 + data[o + 1] * 0.7152 + data[o + 2] * 0.0722;
          lum += l; n++;
          if (l > 60) lit++;
        }
      }
      grid[gy * cols + gx] = lum / Math.max(1, n);
      ink.push(lit / Math.max(1, n));
    }
  }
  return { t: i / FILM.fps, grid, litFrac: ink.reduce((a, b) => a + b, 0) / ink.length };
});

const COLS = 96, ROWS = 54;
const diff = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

// --- 1. Stillness --------------------------------------------------------
// A film with no still stretch never lets a move land. Dead-still frames are
// the rests that give the fast parts their punch.
const energy = sigs.map((s, i) => (i === 0 ? 0 : diff(sigs[i - 1].grid, s.grid)));
const sorted = [...energy].sort((x, y) => x - y);
const median = sorted[Math.floor(sorted.length / 2)];
const STILL = median * 1.6;
const stillFrames = energy.filter((e) => e < STILL).length;
const stillPct = (stillFrames / energy.length) * 100;

// --- 2. Boundaries and carry --------------------------------------------
// Find where the film changes fastest, then ask: what survived across it?
// A boundary carries when the pixels that were on screen BEFORE are still
// on screen AFTER (overlap), rather than the frame having been replaced.
const peaks = [];
for (let i = 2; i < energy.length - 2; i++) {
  if (energy[i] > energy[i - 1] && energy[i] >= energy[i + 1] && energy[i] > STILL * 1.8) {
    peaks.push({ frame: i, t: sigs[i].t, e: energy[i] });
  }
}
// Merge peaks closer than 0.25s — one move, not two.
const bounds = [];
for (const p of peaks) {
  if (bounds.length && p.t - bounds[bounds.length - 1].t < 0.25) {
    if (p.e > bounds[bounds.length - 1].e) bounds[bounds.length - 1] = p;
  } else bounds.push(p);
}

function overlapAt(frame) {
  const a = sigs[Math.max(0, frame - 3)].grid;
  const b = sigs[Math.min(sigs.length - 1, frame + 3)].grid;
  let shared = 0, changed = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] > 60 && b[i] > 60) shared++;
    if (Math.abs(a[i] - b[i]) > 40) changed++;
  }
  const survived = shared / Math.max(1, a.reduce((n, v) => n + (v > 60 ? 1 : 0), 0));
  const churn = changed / a.length;
  return survived * (1 - Math.min(1, churn * 2.2));
}

const carries = bounds.map((b) => ({ ...b, carry: overlapAt(b.frame) }));
const carryScore = carries.length
  ? carries.reduce((s, c) => s + c.carry, 0) / carries.length
  : 0;

// --- 3. Cadence ----------------------------------------------------------
// The rhythm check that actually rejects films: if every shot is the same
// length, the film is a template no matter how good the frames are.
const durs = bounds.map((b, i) => b.t - (i === 0 ? 0 : bounds[i - 1].t)).filter((d) => d > 0.05);
const mean = durs.reduce((a, b) => a + b, 0) / Math.max(1, durs.length);
const cv = Math.sqrt(durs.reduce((s, d) => s + (d - mean) ** 2, 0) / Math.max(1, durs.length)) / Math.max(1, mean);
const beatDurs = FILM.beats.map((b) => +(b.t1 - b.t0).toFixed(2));
const beatRatio = Math.max(...beatDurs) / Math.min(...beatDurs);

// --- 4. Focus retention --------------------------------------------------
// A subject that leaves the frame loses the audience at the boundary.
// Frames the film declares as near-silent are exempt: a blinking caret on an
// empty frame is the design, not the subject walking out of shot.
const isQuiet = (t) => (FILM.quiet ?? []).some((q) => t >= q.t0 && t < q.t1);
// Beats where full-frame coverage is the intent (the dither field blooming).
const isHaze = (t) => FILM.beats.some((b) => b.key === 'field' && t >= b.t0 && t < b.t0 + (b.t1 - b.t0) * 0.75);

const mass = sigs.map((s, i) => {
  let cells = 0, peak = 0, minX = COLS, maxX = -1, minY = ROWS, maxY = -1;
  for (let gy = 0; gy < ROWS; gy++) for (let gx = 0; gx < COLS; gx++) {
    const v = s.grid[gy * COLS + gx];
    if (v <= 60) continue;
    cells++;
    peak = Math.max(peak, v);
    if (gx < minX) minX = gx;
    if (gx > maxX) maxX = gx;
    if (gy < minY) minY = gy;
    if (gy > maxY) maxY = gy;
  }
  const total = COLS * ROWS;
  return {
    empty: cells === 0,
    coverage: cells / total,
    focus: cells === 0 ? 0 : peak / (s.grid.reduce((a, v) => a + Math.max(0, v - 60), 0) / cells),
    insideFrame: maxX >= 0 && minX >= 0 && maxX < COLS && minY >= 0 && maxY < ROWS,
    i,
  };
});

const emptyFrames = mass.filter((m, i) => m.empty && !isQuiet(sigs[i].t)).length;
const outOfFrame = mass.filter((m) => !m.empty && !m.insideFrame).length;
// A film can fail focus retention by dissolving its subject into a full-frame
// haze with nothing to look at. That is a real defect, and it is the one a
// centroid-jump metric misses entirely.
const diffuse = mass.filter((m, i) => !m.empty && !isHaze(sigs[i].t) && m.coverage > 0.34).length;

// --- Verdict -------------------------------------------------------------
// --- 5. Loop seam -------------------------------------------------------
// A background video is watched hundreds of times. If the last frame does not
// equal the first, the viewer sees the join every single loop.
const first = sigs[0].grid;
const last = sigs[sigs.length - 1].grid;
let seam = 0;
for (let i = 0; i < first.length; i++) seam = Math.max(seam, Math.abs(first[i] - last[i]));
const seamPx = (() => {
  const w = FILM.width, h = FILM.height, step = 4;
  let n = 0;
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const gx = Math.floor((x / w) * COLS), gy = Math.floor((y / h) * ROWS);
    if (Math.abs(first[gy * COLS + gx] - last[gy * COLS + gx]) > 24) n++;
  }
  return n;
})();

const checks = [
  { name: 'cadence is varied (not uniform)', pass: beatRatio >= 4 && cv >= 0.35, value: `beat ratio ${beatRatio.toFixed(2)}x (want >= 4), CV ${cv.toFixed(2)}` },
  { name: 'there is real stillness', pass: stillPct >= 12, value: `${stillPct.toFixed(1)}% dead-still frames (want >= 12%)` },
  { name: 'beats carry into each other', pass: carryScore >= 0.45, value: `carry ${carryScore.toFixed(2)} across ${bounds.length} boundaries` },
  { name: 'subject keeps a focus', pass: emptyFrames === 0 && outOfFrame === 0 && diffuse === 0, value: `${emptyFrames} empty outside rests, ${outOfFrame} out of frame, ${diffuse} frames dissolved into haze` },
  { name: 'loop is seamless', pass: seam <= 12 && seamPx === 0, value: `max frame delta ${seam.toFixed(1)}/255, ${seamPx} mismatching cells` },
  { name: 'film covers its declared duration', pass: Math.abs(sigs.at(-1).t - (FILM.duration - 1 / FILM.fps)) < 0.05, value: `${sigs.length} frames / ${(sigs.length / FILM.fps).toFixed(2)}s` },
];

console.log(`\n  oracle — ${FILM.title} (${sigs.length} frames)\n`);
for (const c of checks) console.log(`  ${c.pass ? 'ok  ' : 'FAIL'} ${c.name.padEnd(34)} ${c.value}`);

console.log('\n  boundaries');
for (const c of carries) {
  console.log(`    ${c.t.toFixed(2).padStart(6)}s  carry ${c.carry.toFixed(2)}  ${'█'.repeat(Math.round(c.carry * 24))}`);
}
console.log(`\n  beat lengths: ${beatDurs.join(' / ')} s`);

const failed = checks.filter((c) => !c.pass);
const verdict = failed.length === 0 ? 'accepted' : 'rejected';
console.log(`\n  ${verdict}${failed.length ? ` — ${failed.map((f) => f.name).join('; ')}` : ''}   carry ${carryScore.toFixed(2)}\n`);
process.exit(failed.length === 0 ? 0 : 1);
