#!/usr/bin/env node
/**
 * LOCAL gate, deliberately not part of pnpm check or CI: Playwright is not a
 * dependency of this repository by design. Use the renderer's isolated toolchain.
 *
 * Canvas pixels are the sharper target for raster scenes: what the scene paints,
 * before the renderer's dither and resample. For SVG films, serialize the SVG so
 * inherited DOM state cannot hide behind a screenshot or encoding tolerance.
 */
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadFilm, loadPlaywright, serve, setupPage, stageFonts } from './render.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');

// Both the real page and the negative control go through this comparison. A
// second implementation for the control would prove nothing about this gate.
export async function compareOrders(times, seekAndHash, baseline, report = () => {}) {
  const first = new Map();
  const pass = async (label, order, expected) => {
    for (const time of order) {
      const actual = await seekAndHash(time);
      if (expected && actual !== expected.get(time)) {
        throw new Error(`${label} diverged at t=${time}: expected ${expected.get(time)}, got ${actual}`);
      }
      if (label === 'forward') {
        first.set(time, actual);
        report(`  t=${time} sha256=${actual}`);
      }
    }
  };
  await pass('forward', times, baseline);
  await pass('reverse', [...times].reverse(), first);
  await pass('forward-again', times, first);
  return first;
}

async function negativeControl() {
  // Inline closure control only: proves the comparator catches inherited state,
  // not that a deliberately broken scene can traverse the composition pipeline.
  let state = 0;
  try {
    await compareOrders([0, 1, 2], async (time) => digest(`${time}:${++state}`));
  } catch (error) {
    if (!error.message.startsWith('reverse diverged at t=2:')) throw error;
    console.log(`  negative control: expected FAIL — ${error.message}`);
    return;
  }
  throw new Error('negative control unexpectedly passed at t=2');
}

async function paintedHash(page, film) {
  const painted = await page.evaluate((mode) => {
    if (mode === 'canvas') {
      const canvas = document.querySelector('canvas');
      const pixels = canvas.getContext('2d', { willReadFrequently: true })
        .getImageData(0, 0, canvas.width, canvas.height).data;
      // Transfer raw RGBA losslessly, without hashing an encoder's PNG output.
      let binary = '';
      for (let i = 0; i < pixels.length; i += 8192) {
        binary += String.fromCharCode(...pixels.subarray(i, i + 8192));
      }
      return btoa(binary);
    }
    return new XMLSerializer().serializeToString(document.querySelector('svg'));
  }, film.mode);
  return digest(film.mode === 'canvas' ? Buffer.from(painted, 'base64') : painted);
}

export async function main(argv = process.argv.slice(2)) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : argv[i + 1];
  };
  const filmId = arg('film', 'J1');
  const film = await loadFilm(filmId);
  const supplied = arg('times', null);
  // Sample beat boundaries and the actual last frame, not duration itself.
  const times = supplied === null
    ? [0, 3, 6, 9, 9.75, 12, film.duration - 1 / film.fps]
    : supplied?.split(',').map(Number);
  if (!times?.length || times.some((t) => !Number.isFinite(t) || t < 0 || t > film.duration)
      || (supplied !== null && supplied.split(',').some((t) => !t.trim()))
      || new Set(times).size !== times.length) {
    throw new Error('--times must be comma-separated, unique finite times within the film duration');
  }
  await negativeControl();
  stageFonts();
  const { chromium } = await loadPlaywright();
  const { server, port } = await serve();
  let browser;
  try {
    browser = await chromium.launch();
    let baseline;
    for (let load = 1; load <= 2; load++) {
      const { page, seek } = await setupPage(browser, { port, filmId, film });
      try {
        console.log(`  ${filmId} page ${load} (${film.mode === 'canvas' ? 'canvas pixels' : 'serialized SVG'})`);
        const hashes = await compareOrders(times, async (time) => {
          await seek(time);
          return paintedHash(page, film);
        }, baseline, load === 1 ? console.log : undefined);
        baseline ??= hashes;
        console.log(`  PASS page ${load}: forward / reverse / forward-again${load === 2 ? ' / fresh-load' : ''}`);
      } finally {
        await page.close();
      }
    }
    console.log(`PASS ${filmId} determinism`);
  } finally {
    await browser?.close();
    await new Promise((ok, fail) => server.close((error) => error ? fail(error) : ok()));
  }
}

// Node 22 has no import.meta.main; realpath also recognizes a symlinked entry.
if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  await main().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}
