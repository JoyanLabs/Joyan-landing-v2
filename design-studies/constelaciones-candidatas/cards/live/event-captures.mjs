#!/usr/bin/env node
/**
 * LAS CAPTURAS DEL NUDO — tres instantes del ciclo, y el recorte 2× al lado de la
 * vara.
 * ============================================================================
 * El nudo de la banda es un EVENTO que viaja: una sola captura no lo puede
 * mostrar. Este guion abre la escena viva tres veces con el reloj congelado en
 * tres cuadros distintos del ciclo (`?still=1&frame=<n>`, el parámetro de
 * `live.mjs`), captura el cuadro entero y recorta el nudo de los tres, a ×2 y con
 * vecino más cercano —el grano, no un degradé de escalado—, para poder mirarlos
 * uno al lado del otro y al lado de la banda de la vara.
 *
 * Escribe en `capturas/`:
 *   evento-cuadro-<n>.png        el cuadro de 1 440 × 900 de cada instante
 *   evento-instant-<n>.png       la ventana ANCHA de 480 × 320 px centrada en el nudo
 *   evento-nudo-2x-<n>.png       el recorte ×2 de 240 × 160 px centrado en el nudo
 *   evento-comparacion-2x.png    los tres nudos y, abajo, la banda de la vara
 *   nebulosa-2x-<id>.png         (regeneradas por `nebula-compare`)
 *   nebulosa-2x-vara.png
 *   nebulosa-comparacion-2x.png
 *
 * Uso, con el servidor del repo en 4403:
 *   timeout 90 node design-studies/constelaciones-candidatas/cards/live/event-captures.mjs [id]
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
import { CARD, constellationFor, firstCatalogueId } from '../data.mjs';
import { BAKE } from './bake.mjs';
import { figureTransform } from './depth.mjs';
import { constellationLayers, washRegion } from '../../../../scripts/scene-src/constellation.mjs';
import { compareNebula, WINDOW, ZOOM } from './nebula-compare.mjs';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const OUT = resolve(here, 'capturas');
const BASE = 'http://127.0.0.1:4403/design-studies/constelaciones-candidatas/cards/live/index.html';
/** Los tres instantes: el still de la pieza y dos tramos del recorrido, elegidos
 * porque el nudo está en tres lugares distintos en cada uno. */
const FRAMES = Object.freeze([50, 150, 270]);
/** La ventana ANCHA de cada instante, en px del cuadro: 480 × 320 px son 96 × 64
 * celdas de la banda, y el nudo (unos 35 de ancho) entra con su hombro al lado.
 * El recorte ×2 de 240 × 160 px se deja además, al lado del de la vara. */
const WIDE = Object.freeze({ width: 480, height: 320 });

/** La posición del nudo en un cuadro: el centroide de la región de la banda que
 * está a menos de 0,0015 de su máximo, que es lo que mide el caso n. */
export function knotAt(c, index, cols = BAKE.washGrid[0], rows = BAKE.washGrid[1]) {
  const region = washRegion(c, { cols, rows, share: 0.5 });
  const layers = constellationLayers(c, { cols, rows, index });
  let peak = 0;
  for (let at = 0; at < region.mask.length; at++) if (region.mask[at] && layers.wash[at] > peak) peak = layers.wash[at];
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let at = 0; at < region.mask.length; at++) {
    if (!region.mask[at] || layers.wash[at] < peak - 0.0015) continue;
    sx += at % cols;
    sy += Math.floor(at / cols);
    n += 1;
  }
  return { u: sx / n / cols, v: sy / n / rows, cells: n, peak };
}

/** Etiqueta en SVG, para que la comparación diga qué se está mirando. */
const label = (text, width, height) => Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`
  + '<style>text{font-family:ui-monospace,monospace;font-size:20px;fill:#cfe3dd}</style>'
  + `<text x="10" y="26">${text}</text></svg>`,
);

/** Un punto del mundo de la figura (u, v del modelo) en px de la página. */
const world = figureTransform(CARD.width, CARD.height);
const pagePoint = (u, v) => ({
  x: world.x + u * BAKE.grid[0] * world.scale,
  y: world.y + v * BAKE.grid[1] * world.scale,
});

const id = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : firstCatalogueId();
const catalogue = constellationFor(id).constellation;
await mkdir(OUT, { recursive: true });

// 1 · las láminas de la nebulosa contra la vara, regeneradas con el modelo de hoy
const comparison = await compareNebula(id);

// 2 · los tres instantes de la escena viva
const browser = await chromium.launch();
const shots = [];
try {
  const page = await browser.newPage({ viewport: { width: CARD.width, height: CARD.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  for (const frame of FRAMES) {
    await page.goto(`${BASE}?id=${encodeURIComponent(id)}&still=1&frame=${frame}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    // La emisión viva publica su propio cuadro: se espera a que sea el pedido.
    await page.waitForFunction((wanted) => window.__live.frameIndex === wanted, frame, { timeout: 30000 });
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    if (errors.length) throw new Error(`errores en la página: ${errors.join(' | ')}`);
    const png = await page.screenshot({ type: 'png', caret: 'hide' });
    const pngPath = resolve(OUT, `evento-cuadro-${frame}.png`);
    await writeFile(pngPath, png);
    const knot = knotAt(catalogue, frame);
    // El recorte ×2, centrado donde el caso n dice que está el nudo, en las
    // coordenadas de la PÁGINA: el modelo vive en el mundo de la figura (480 ×
    // 300 unidades escaladas por `figureTransform`), no en el cuadro entero.
    const at = pagePoint(knot.u, knot.v);
    const left = Math.max(0, Math.min(CARD.width - WINDOW.width, Math.round(at.x - WINDOW.width / 2)));
    const top = Math.max(0, Math.min(CARD.height - WINDOW.height, Math.round(at.y - WINDOW.height / 2)));
    const wide = await sharp(png)
      .extract({
        left: Math.max(0, Math.min(CARD.width - WIDE.width, Math.round(at.x - WIDE.width / 2))),
        top: Math.max(0, Math.min(CARD.height - WIDE.height, Math.round(at.y - WIDE.height / 2))),
        width: WIDE.width,
        height: WIDE.height,
      })
      .png()
      .toBuffer();
    await writeFile(resolve(OUT, `evento-instant-${frame}.png`), wide);
    const crop = await sharp(png)
      .extract({ left, top, width: WINDOW.width, height: WINDOW.height })
      .resize({ width: WINDOW.width * ZOOM, height: WINDOW.height * ZOOM, kernel: 'nearest' })
      .png()
      .toBuffer();
    await writeFile(resolve(OUT, `evento-nudo-2x-${frame}.png`), crop);
    shots.push({ frame, knot, at, crop, wide, png: pngPath });
  }
} finally {
  await browser.close();
}

// 3 · el tablero: los tres instantes con la banda alrededor, y abajo los dos
// recortes ×2 (el nuestro y el de la vara) a la MISMA ventana de 240 × 160 px.
const gap = 12;
const zoomW = WINDOW.width * ZOOM;
const zoomH = WINDOW.height * ZOOM;
const vara = await sharp(resolve(OUT, 'nebulosa-2x-vara.png')).toBuffer();
const tagged = async (buf, tag, w, h) => sharp(buf)
  .composite([{ input: label(tag, w, 34), left: 0, top: h - 34 }])
  .png()
  .toBuffer();
const panels = [];
for (const [index, shot] of shots.entries()) {
  const tag = `cuadro ${shot.frame} · u ${shot.knot.u.toFixed(2)} v ${shot.knot.v.toFixed(2)} · ${shot.knot.cells} celdas en el nudo`;
  panels.push({ input: await tagged(shot.wide, tag, WIDE.width, WIDE.height), left: index * (WIDE.width + gap), top: 0 });
}
panels.push({
  input: await tagged(shots[0].crop, `nuestro nudo ×2 · cuadro ${shots[0].frame}`, zoomW, zoomH),
  left: 0,
  top: WIDE.height + gap,
});
panels.push({
  input: await tagged(vara, 'la vara · su banda ×2', zoomW, zoomH),
  left: zoomW + gap,
  top: WIDE.height + gap,
});
const board = sharp({
  create: {
    width: WIDE.width * 3 + gap * 2,
    height: WIDE.height + gap + zoomH,
    channels: 4,
    background: '#1b2e2e',
  },
}).composite(panels);
await writeFile(resolve(OUT, 'evento-comparacion-2x.png'), await board.png().toBuffer());

process.stdout.write(`${JSON.stringify({
  id,
  frames: shots.map((shot) => ({ frame: shot.frame, knot: shot.knot, at: shot.at })),
  comparison: {
    ours: comparison.ours,
    vara: comparison.vara,
    rendered: comparison.rendered,
  },
  out: [
    ...shots.map((shot) => shot.png),
    ...shots.map((shot) => resolve(OUT, `evento-instant-${shot.frame}.png`)),
    ...shots.map((shot) => resolve(OUT, `evento-nudo-2x-${shot.frame}.png`)),
    resolve(OUT, 'evento-comparacion-2x.png'),
    ...comparison.out,
  ],
}, null, 1)}\n`);
