#!/usr/bin/env node
/**
 * CAPTURA — de un id a un PNG, con un navegador real y el motor real.
 * ============================================================================
 *   node design-studies/constelaciones-candidatas/cards/capture.mjs <id> \
 *     --out design-studies/constelaciones-candidatas/cards/capturas/<id>.png \
 *     [--focus <nodo>] [--reduced]
 *
 * `--base` apunta a `card.html` servido por HTTP (por omisión, el servidor de
 * la raíz del repo en 4403). No hay estado: la página no anima y la captura se
 * toma cuando `document.documentElement.dataset.ready === 'true'`, después de
 * `document.fonts.ready`. Dos procesos separados producen el mismo PNG.
 *
 * `--focus` captura el estado enfocado (el nodo n afirma su plano); `--reduced`
 * pide `prefers-reduced-motion: reduce`, que en una pieza sin animación tiene que
 * dar el mismo PNG: el estado final.
 *
 * Imprime una línea JSON con el resultado; los errores de página son fatales.
 */

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
import { CARD } from './data.mjs';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at > -1 ? argv[at + 1] : fallback;
};
const id = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
if (!id) {
  process.stderr.write('falta el id: node capture.mjs <id del catálogo> --out <archivo.png> [--base <url>]\n');
  process.exit(2);
}
const out = resolve(flag('out', resolve(here, 'capturas', `${id}.png`)));
const base = flag('base', 'http://127.0.0.1:4403/design-studies/constelaciones-candidatas/cards/card.html');
const focus = argv.includes('--focus') ? Number(flag('focus', null)) : null;
const reduced = argv.includes('--reduced');
if (focus !== null && !Number.isInteger(focus)) {
  process.stderr.write('--focus necesita el índice de un nodo del catálogo\n');
  process.exit(2);
}
const query = `id=${encodeURIComponent(id)}${focus === null ? '' : `&focus=${focus}`}`;

const started = Date.now();
const errors = [];
const browser = await chromium.launch();
let summary;
try {
  const page = await browser.newPage({
    viewport: { width: CARD.width, height: CARD.height }, deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));

  await page.goto(`${base}?${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60000 });
  const card = await page.evaluate(() => window.__card);
  const text = await page.evaluate(() => document.body.innerText);
  const shotStarted = Date.now();
  const png = await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' });
  const shotMs = Date.now() - shotStarted;
  if (errors.length) throw new Error(`errores en la página: ${errors.join(' | ')}`);

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, png);
  summary = {
    id,
    out,
    bytes: png.length,
    sha256: createHash('sha256').update(png).digest('hex'),
    width: CARD.width,
    height: CARD.height,
    state: card?.state ?? 'reposo',
    focus: card?.focusNode ?? null,
    reduced,
    wallMs: Date.now() - started,
    shotMs,
    text,
    card,
  };
} finally {
  await browser.close();
}

process.stdout.write(`${JSON.stringify(summary)}\n`);
