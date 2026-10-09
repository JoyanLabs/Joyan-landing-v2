#!/usr/bin/env node
/**
 * LOCAL decision evidence, not an asset builder. Delivery pixels matter only
 * after the browser's cover transform; guessed column widths test no real page.
 * Nothing here changes the renderer's defaults or writes committed assets.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as renderer from './render.mjs';

const OUT = resolve('dist-motion-verify/wu5');
const CELLS = [4, 6, 8, 12, 16, 20];
const VIEWPORTS = [[390, 844], [768, 1024], [1440, 900]];
const TIME = 7.8;
const HERO = { width: 1280, height: 720 };
const SECTION = { width: 960, height: 540 };

export function coverScale(source, box) {
  return Math.max(box.width / source.width, box.height / source.height);
}

async function measure(browser) {
  const dev = spawn('pnpm', ['dev'], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  let error;
  dev.on('error', (e) => { error = e; });
  dev.stdout.on('data', (b) => { log += b; });
  dev.stderr.on('data', (b) => { log += b; });
  const rows = [];
  const page = await browser.newPage();
  try {
    for (let tries = 0; ; tries++) {
      if (error) throw error;
      // A parent's dev server is useful evidence, not a process to replace.
      if (log.includes('localhost:4321')) break;
      if (dev.exitCode !== null || tries === 120) throw new Error(`pnpm dev did not start:\n${log}`);
      await new Promise((ok) => setTimeout(ok, 500));
    }
    // Remote analytics/fonts are irrelevant to local geometry and need not be
    // fetched; the landing's own fonts must settle before reading its boxes.
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
        ? route.continue() : route.abort();
    });
    for (const [width, height] of VIEWPORTS) {
      await page.setViewportSize({ width, height });
      await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      rows.push(await page.evaluate(({ width, height }) => {
        const boxes = [...document.querySelectorAll('video[data-hero-film]')].map((video) => {
          const rect = video.getBoundingClientRect();
          const style = getComputedStyle(video);
          return {
            section: video.closest('section').id,
            width: rect.width, height: rect.height,
            figureWidth: video.closest('figure').getBoundingClientRect().width,
            sourceWidth: Number(video.getAttribute('width')),
            sourceHeight: Number(video.getAttribute('height')),
            fit: style.objectFit, position: style.objectPosition,
          };
        });
        return { viewport: { width, height }, boxes };
      }, { width, height }));
    }
    return rows;
  } finally {
    await page.close();
    writeFileSync(resolve(OUT, 'dev.log'), log);
    if (dev.pid && dev.exitCode === null) {
      try {
        process.kill(-dev.pid, 'SIGTERM');
      } catch (e) {
        if (e.code !== 'ESRCH') throw e;
      }
      if (dev.exitCode === null) await new Promise((ok) => dev.once('exit', ok));
    }
  }
}

function arithmetic(measurements) {
  const rows = [];
  for (const { viewport, boxes } of measurements) {
    for (const measured of boxes) {
      // The hero video's own rect is taller than the viewport (390x936 at a
      // 390x844 window), and `object-cover` scales against THAT box, not the
      // window. Substituting the viewport under-reports the pitch by ~10%:
      // scale 1.17 instead of the real 1.30.
      const box = measured;
      assert.equal(box.fit, 'cover');
      const source = box.section === 'top' ? HERO : SECTION;
      assert.equal(box.sourceWidth, source.width);
      assert.equal(box.sourceHeight, source.height);
      const scale = coverScale(source, box);
      rows.push({
        presentation: `${box.section}-${viewport.width}`, width: box.width, height: box.height,
        source: `${source.width}x${source.height}`, scale,
        pitches: Object.fromEntries(CELLS.map((cell) => [cell, cell * scale])),
      });
    }
  }
  console.table(rows.map(({ pitches, ...row }) => ({ ...row, ...pitches })));
  return rows;
}

async function simulate(browser, png, box, path) {
  const page = await browser.newPage({
    viewport: { width: Math.ceil(box.width), height: Math.ceil(box.height) },
    deviceScaleFactor: 1,
  });
  try {
    // Let Chromium do the same fractional cover transform and object-position
    // as the live video. An ffmpeg resampler would introduce another dot filter.
    await page.setContent('<html><body><img></body></html>');
    await page.evaluate(async ({ image, box }) => {
      document.body.style.margin = '0';
      document.body.style.background = '#0B0B0C';
      const img = document.querySelector('img');
      Object.assign(img.style, {
        display: 'block', width: `${box.width}px`, height: `${box.height}px`,
        objectFit: box.fit, objectPosition: box.position,
      });
      img.src = `data:image/png;base64,${image}`;
      await img.decode();
    }, { image: png.toString('base64'), box });
    await page.screenshot({ path });
  } finally {
    await page.close();
  }
}

async function stills(browser, measurements) {
  assert.equal(typeof renderer.captureFrame, 'function', 'the real capture helper must be exported');
  renderer.stageFonts();
  const film = await renderer.loadFilm('J1');
  const { server, port } = await renderer.serve();
  const sizes = [];
  const paths = [];
  try {
    const { page, seek } = await renderer.setupPage(browser, { port, filmId: 'J1', film });
    try {
      for (const cell of CELLS) {
        const row = { cell };
        for (const [surface, source] of [['hero', HERO], ['section', SECTION]]) {
          await seek(TIME);
          const buffer = await page.screenshot();
          const png = Buffer.from(await renderer.captureFrame(page, {
            buffers: [buffer.toString('base64')], n: 1, dither: true, cell,
            width: source.width, height: source.height,
          }), 'base64');
          const original = resolve(OUT, `${cell}-${surface}-source.png`);
          writeFileSync(original, png);
          paths.push(original);
          row[`${surface}PngBytes`] = statSync(original).size;
          const crop = resolve(OUT, `${cell}-${surface === 'hero' ? '' : 'section-'}1to1.png`);
          const result = spawnSync('ffmpeg', [
            '-v', 'error', '-y', '-i', original, '-vf',
            surface === 'hero' ? 'crop=480:360:440:180' : 'crop=480:360:260:90',
            '-frames:v', '1', crop,
          ], { encoding: 'utf8' });
          if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
          paths.push(crop);
          for (const { viewport, boxes } of measurements) {
            const measured = boxes.find((b) => b.section === (surface === 'hero' ? 'top' : 'agents'));
            // Same correction as in arithmetic(): the painted scale comes from
            // the video's measured box, never from the viewport.
            const box = measured;
            const path = resolve(OUT, `${cell}-${surface}-${viewport.width}.png`);
            await simulate(browser, png, box, path);
            paths.push(path);
            if (surface === 'section') {
              const magi = boxes.find((b) => b.section === 'magi');
              if (magi.width !== box.width || magi.height !== box.height) {
                const path = resolve(OUT, `${cell}-section-magi-${viewport.width}.png`);
                await simulate(browser, png, magi, path);
                paths.push(path);
              }
            } else if (measured.height !== box.height) {
              const path = resolve(OUT, `${cell}-hero-live-${viewport.width}.png`);
              await simulate(browser, png, measured, path);
              paths.push(path);
            }
          }
        }
        sizes.push(row);
      }
    } finally {
      await page.close();
    }
  } finally {
    await new Promise((ok, fail) => server.close((e) => e ? fail(e) : ok()));
  }
  console.table(sizes);
  writeFileSync(resolve(OUT, 'stills.json'), JSON.stringify({ time: TIME, blur: 1, sizes, paths }, null, 2));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { chromium } = await renderer.loadPlaywright();
  const browser = await chromium.launch();
  try {
    // Reuse the recorded live measurement so every decision image refers to
    // the arithmetic printed before any scene capture, not a second layout.
    const path = resolve(OUT, 'measurement.json');
    const measurements = process.argv.includes('--measure-only')
      ? await measure(browser) : JSON.parse(readFileSync(path, 'utf8')).measurements;
    const rows = arithmetic(measurements);
    if (process.argv.includes('--measure-only')) {
      writeFileSync(path, JSON.stringify({ measurements, rows }, null, 2));
    } else {
      await stills(browser, measurements);
    }
  } finally {
    await browser.close();
  }
}
await main();
