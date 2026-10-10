#!/usr/bin/env node
/**
 * Browser-free, sole final OG writer (ADR-1). A local render-og.mjs capture
 * commits OG1's lossless continuous-tone input; this command never needs a
 * browser and never rewrites the independent hero poster.
 *
 * Pipeline: og-tone.png → pure ditherImageData (cell16) → unchanged JOYAN
 * wordmark mask (alpha>=128 → exact bone-50) → lossless palette PNG.
 * No normalization, binary threshold, secondary dither or palette snapping.
 * DITHER_BUDGET_SCALE changes only the exit gate, never output pixels.
 */
import assert from 'node:assert/strict';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ditherImageData } from './motion-src/dither.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BONE = [244, 242, 237];
const BUDGET_SCALE = Number(process.env.DITHER_BUDGET_SCALE ?? '1');
const WIDTH = 1200;
const HEIGHT = 628;
// 8px pitch at a 600px preview; 5.33px at400. Chosen after native/social inspection.
const CELL = 16;
const MAX_BYTES = 100 * 1024;
const OUT = join(ROOT, 'public/assets/brand/og-default.png');
const formatBytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const { data, info } = await sharp(join(ROOT, 'scripts/dither-src/og-tone.png'))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
assert.equal(info.width, WIDTH, 'tone input width');
assert.equal(info.height, HEIGHT, 'tone input height');
assert.equal(info.channels, 4);
const pixels = ditherImageData(new Uint8ClampedArray(data), WIDTH, HEIGHT, { cell: CELL });
const rgb = Buffer.alloc(WIDTH * HEIGHT * 3);
// Preserve exactly the former sharp/librsvg rasterization and alpha boundary.
const overlay = await sharp(join(ROOT, 'scripts/dither-src/wordmark.svg'))
  .resize(WIDTH, HEIGHT, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
const colors = new Set();
for (let i = 0; i < WIDTH * HEIGHT; i++) {
  for (let ch = 0; ch < 3; ch++) rgb[i * 3 + ch] = overlay[i * 4 + 3] >= 128 ? BONE[ch] : pixels[i * 4 + ch];
  colors.add(rgb.subarray(i * 3, i * 3 + 3).toString('hex'));
}
assert.ok(colors.size > 2 && colors.size <= 256, `expected a lossless tone palette, got ${colors.size}`);
const png = await sharp(rgb, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
  .png({ palette: true, colours: 256, quality: 100, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
assert.deepEqual(await sharp(png).removeAlpha().raw().toBuffer(), rgb, 'palette encoding changed OG pixels');
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, png);
const { size } = await stat(OUT);
const withinBudget = size <= MAX_BYTES * BUDGET_SCALE;
console.log(`${withinBudget ? 'PASS' : 'FAIL'} og-default.png: ${formatBytes(size)} / ${formatBytes(MAX_BYTES)} (${WIDTH}x${HEIGHT}), ${colors.size} colors, cell=${CELL}`);
console.log(`\nGenerated 1 asset(s) — ${withinBudget ? 'all within budget' : 'AT LEAST ONE OVER BUDGET'}`);
process.exit(withinBudget ? 0 : 1);
