#!/usr/bin/env node
/**
 * LOCAL gate, deliberately not part of pnpm check or CI: Playwright is not a
 * dependency of this repository by design. Use the renderer's isolated toolchain.
 *
 * Canvas pixels are the sharper target for raster scenes: what the scene paints,
 * before the renderer's dither and resample. SVG films need both serialized
 * markup (the purity contract) and painted pixels (the severity). Decode the
 * browser screenshot losslessly so PNG encoder details cannot affect severity.
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
      const prior = expected?.get(time);
      if (expected && (!prior || actual.markup !== prior.markup || actual.raster !== prior.raster)) {
        const severity = actual.raster !== prior?.raster ? 'visible' : 'markup-only';
        throw new Error(`${label} diverged at t=${time}: ${severity}; ` +
          `expected markup=${prior?.markup ?? 'n/a'} raster=${prior?.raster}, ` +
          `got markup=${actual.markup ?? 'n/a'} raster=${actual.raster}`);
      }
      if (label === 'forward') {
        first.set(time, actual);
        report(`  t=${time} markup-sha256=${actual.markup ?? 'n/a'} raster-sha256=${actual.raster}`);
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
  for (const kind of ['markup-only', 'visible', 'raster-only']) {
    let state = 0;
    try {
      await compareOrders([0, 1, 2], async (time) => {
        const inherited = digest(`${time}:${++state}`);
        return {
          markup: kind === 'raster-only' ? digest(`${time}`) : inherited,
          raster: kind === 'markup-only' ? digest(`${time}`) : inherited,
        };
      });
    } catch (error) {
      const severity = kind === 'markup-only' ? kind : 'visible';
      if (!error.message.startsWith(`reverse diverged at t=2: ${severity};`)) throw error;
      console.log(`  negative control (${kind}): expected FAIL — ${error.message}`);
      continue;
    }
    throw new Error(`negative control (${kind}) unexpectedly passed at t=2`);
  }
}

async function paintedHash(page, film) {
  const isCanvas = film.mode === 'canvas';
  const markup = isCanvas ? null : digest(await page.evaluate(() =>
    new XMLSerializer().serializeToString(document.querySelector('svg'))));
  // Capture the browser's actual paint, including fonts, camera and background;
  // drawing the serialized SVG as an image would test a different paint path.
  const screenshot = isCanvas ? null : (await page.screenshot({ type: 'png' })).toString('base64');
  const painted = await page.evaluate(async (image) => {
    let canvas = document.querySelector('canvas');
    if (image !== null) {
      const img = new Image();
      await new Promise((ok, fail) => {
        img.onload = ok;
        img.onerror = () => fail(new Error('cannot decode painted screenshot'));
        img.src = `data:image/png;base64,${image}`;
      });
      canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
    }
    const pixels = canvas.getContext('2d', { willReadFrequently: true })
      .getImageData(0, 0, canvas.width, canvas.height).data;
    // Transfer raw RGBA losslessly, without hashing an encoder's PNG output.
    let binary = '';
    for (let i = 0; i < pixels.length; i += 8192) {
      binary += String.fromCharCode(...pixels.subarray(i, i + 8192));
    }
    return btoa(binary);
  }, screenshot);
  return { markup, raster: digest(Buffer.from(painted, 'base64')) };
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
        console.log(`  ${filmId} page ${load} (${film.mode === 'canvas' ? 'canvas pixels' : 'serialized SVG + painted RGBA'})`);
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
