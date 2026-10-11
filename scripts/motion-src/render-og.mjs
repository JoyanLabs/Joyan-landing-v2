#!/usr/bin/env node
/** Local-only tone builder: no package/CI hook or final OG writes.
 * Usage: node scripts/motion-src/render-og.mjs
 * Existing isolated Playwright toolchain required. The committed lossless
 * tone input lets pnpm generate:dither stay browser-free and reproducible.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { loadPlaywright, stageFonts, loadFilm, serve, setupPage, captureFrame } from './render.mjs';

const output = new URL('../dither-src/og-tone.png', import.meta.url);
const TIME = 0;
const film = await loadFilm('OG1');
const { chromium } = await loadPlaywright();
stageFonts();
const browser = await chromium.launch();
const { server, port } = await serve();
let raster;
try {
  async function capture(page, seek, t) {
    await seek(t);
    const buffer = await page.screenshot();
    return Buffer.from(await captureFrame(page, {
      buffers: [buffer.toString('base64')], n: 1, dither: false,
      width: film.width, height: film.height,
    }), 'base64');
  }
  const first = await setupPage(browser, { port, filmId: 'OG1', film });
  try {
    raster = await capture(first.page, first.seek, TIME);
    assert.deepEqual(await capture(first.page, first.seek, 0.75), raster, 'static seek changed pixels');
    assert.deepEqual(await capture(first.page, first.seek, TIME), raster, 'repeat seek changed pixels');
  } finally { await first.page.close(); }
  const fresh = await setupPage(browser, { port, filmId: 'OG1', film });
  try {
    assert.deepEqual(await capture(fresh.page, fresh.seek, TIME), raster, 'fresh page changed pixels');
  } finally { await fresh.page.close(); }
} finally {
  await browser.close();
  await new Promise((ok, fail) => server.close((error) => error ? fail(error) : ok()));
}
const { data, info } = await sharp(raster).removeAlpha().raw().toBuffer({ resolveWithObject: true });
assert.equal(info.width, 1200);
assert.equal(info.height, 628);
const png = await sharp(data, { raw: { width: 1200, height: 628, channels: 3 } })
  .png({ compressionLevel: 9 }).toBuffer();
assert.deepEqual(await sharp(png).raw().toBuffer(), data, 'tone encoding changed pixels');
await writeFile(output, png);
console.log(`PASS OG1 static/repeat/fresh-load, tone input ${png.length} bytes, 1200x628`);
console.log(`sha256 ${createHash('sha256').update(png).digest('hex')}`);
