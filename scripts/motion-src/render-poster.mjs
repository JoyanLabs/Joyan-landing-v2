#!/usr/bin/env node
/**
 * LOCAL asset builder, deliberately absent from package.json and CI because
 * Playwright is not a dependency of this repository. A halftone needs the
 * scene's continuous tone, not the SVG generator's ink/bone threshold.
 *
 * Usage: MOTION_TOOLCHAIN=~/.cache/joyan-motion node scripts/motion-src/render-poster.mjs
 * The films' captureFrame owns resize and dot painting; only lossless palette
 * encoding belongs here. Never quantize away the gate's reserved amber.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadPlaywright, stageFonts, loadFilm, serve, setupPage, captureFrame } from './render.mjs';

const OUTPUT = fileURLToPath(new URL('../../public/assets/dither/hero-dither.png', import.meta.url));
const WIDTH = 1600;
const HEIGHT = 900;
// Pitch is measured after cover, not in source pixels. Cell 7 yields 6.56,
// 7.96 and 7.00 CSS px at 390x844, 768x1024 and 1440x900. WU5's actual
// 390x936 mobile hero box yields 7.28; copying the 1280 film's 6 would not.
const CELL = 7;
// This quiet support beat keeps every surface and the waiting gate visible.
const TIME = 7.8;
const MAX_BYTES = 80 * 1024;

async function main() {
  const { chromium } = await loadPlaywright();
  stageFonts();
  const film = await loadFilm('J1');
  const browser = await chromium.launch();
  let server;
  let raster;
  try {
    const served = await serve();
    server = served.server;
    const { page, seek } = await setupPage(browser, { port: served.port, filmId: 'J1', film });
    try {
      await seek(TIME);
      const buffer = await page.screenshot();
      raster = Buffer.from(await captureFrame(page, {
        buffers: [buffer.toString('base64')], n: 1, dither: true, cell: CELL,
        width: WIDTH, height: HEIGHT,
      }), 'base64');
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
    if (server) await new Promise((ok, fail) => server.close((error) => error ? fail(error) : ok()));
  }

  const { data, info } = await sharp(raster).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, WIDTH);
  assert.equal(info.height, HEIGHT);
  const colors = new Set();
  for (let i = 0; i < data.length; i += 3) colors.add(data.subarray(i, i + 3).toString('hex'));
  assert.ok(colors.size > 2 && colors.size <= 256, `expected a tone palette, got ${colors.size} colors`);
  const png = await sharp(data, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
    .png({ palette: true, colours: 256, quality: 100, dither: 0, effort: 10, compressionLevel: 9 })
    .toBuffer();
  // Palette encoding is a storage change, never a second colour/dither pass.
  const decoded = await sharp(png).removeAlpha().raw().toBuffer();
  assert.ok(decoded.equals(data), 'palette encoding changed captureFrame pixels');
  assert.ok(png.length <= MAX_BYTES, `poster is ${png.length} bytes; budget is ${MAX_BYTES}. Revisit explicitly, not by shrinking the cell.`);
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, png);
  console.log(`PASS hero-dither.png: ${png.length} bytes / ${MAX_BYTES}, ${WIDTH}x${HEIGHT}, ${colors.size} colors, J1 t=${TIME}s cell=${CELL}`);
  console.log(`sha256 ${createHash('sha256').update(png).digest('hex')}`);
}

await main();
