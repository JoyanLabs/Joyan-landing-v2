#!/usr/bin/env node
/**
 * Captures of `design-studies/constelaciones/` at 1280 and 390.
 *
 * Usage (server already up on :4403 from the repository root):
 *   timeout 90 node design-studies/constelaciones/capture.mjs
 *
 * Two kinds of plate, because they prove different things:
 *
 *   live    the page running its own loop for a couple of seconds, so the frame
 *           proves the animation really runs (a still cannot).
 *   still   `?frame=<n>` (and `?active=<node>`), rendered deterministically, so
 *           the plates a reviewer compares are the same image every time.
 *
 * Any console error, page error or failed request fails the run: this page is
 * the review surface, and a silently broken import would still look dark.
 */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';

const OUT = fileURLToPath(new URL('./captures/', import.meta.url));
const BASE = 'http://127.0.0.1:4403/design-studies/constelaciones/';
const FRAME = 40;
const plates = [
  { name: 'genghe-1280', width: 1280, height: 800, query: `?frame=${FRAME}` },
  { name: 'genghe-1280-foco', width: 1280, height: 800, query: `?frame=${FRAME}&active=genghe-i` },
  { name: 'genghe-390', width: 390, height: 844, query: `?frame=${FRAME}` },
  { name: 'genghe-390-foco', width: 390, height: 844, query: `?frame=${FRAME}&active=genghe-i` },
  { name: 'vivo-1280', width: 1280, height: 800, query: '?vivo=1', settle: 2400 },
  { name: 'vivo-390', width: 390, height: 844, query: '?vivo=1', settle: 2400 },
];

const problems = [];
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const plate of plates) {
  const page = await browser.newPage({
    viewport: { width: plate.width, height: plate.height },
    deviceScaleFactor: 1,
  });
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${plate.name} console:${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`${plate.name} pageerror: ${error}`));
  page.on('requestfailed', (request) => problems.push(`${plate.name} requestfailed: ${request.url()}`));
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`${plate.name} http ${response.status()}: ${response.url()}`);
  });

  await page.goto(`${BASE}${plate.query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 15000 });
  await page.waitForTimeout(plate.settle ?? 320);
  const file = resolve(OUT, `${plate.name}.png`);
  await page.screenshot({ path: file });
  const stats = await page.evaluate(() => {
    const sky = document.querySelector('[data-sky]');
    const ctx = sky.getContext('2d');
    const { data } = ctx.getImageData(0, 0, sky.width, sky.height);
    let sum = 0;
    let max = 0;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) {
      const tone = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      sum += tone;
      if (tone > max) max = tone;
      if (tone > 0.02) lit += 1;
    }
    const cells = data.length / 4;
    return {
      mean: sum / cells,
      max,
      lit: lit / cells,
      sky: `${sky.width}x${sky.height}`,
      applied: getComputedStyle(sky).width,
      nodes: document.querySelectorAll('.node').length,
    };
  });
  console.log(`${plate.name.padEnd(20)} ${plate.width}x${plate.height} `
    + `mean ${(stats.mean * 100).toFixed(2)} % · peak ${(stats.max * 100).toFixed(0)} % · `
    + `lit ${(stats.lit * 100).toFixed(1)} % · ${stats.sky} cells · ${stats.nodes} node buttons`);
  await page.close();
}
await browser.close();

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`\n${plates.length} plates written to design-studies/constelaciones/captures/ with no console errors.`);
}
