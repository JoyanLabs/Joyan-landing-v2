/**
 * Capturas de revisión: 1280 y 390. Requiere el servidor de la raíz del repo
 * en el puerto 4403 (`curl` primero; no se levanta nada acá).
 *
 *   node capturas.mjs
 */
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const SITIO = 'http://localhost:4403/design-studies/constelaciones-candidatas/';
const OUT = new URL('./captures/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const casos = [
  { file: 'candidatas-1280.png', width: 1280, height: 900 },
  { file: 'candidatas-390.png', width: 390, height: 844 },
];

const browser = await chromium.launch();
for (const c of casos) {
  const page = await browser.newPage({ viewport: { width: c.width, height: c.height }, deviceScaleFactor: 1 });
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto(SITIO, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.waitForSelector('.card .figura');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: OUT + c.file, fullPage: true });
  const medida = await page.evaluate(() => ({
    cards: document.querySelectorAll('.card').length,
    diagramas: document.querySelectorAll('.card .figura').length,
    html: document.documentElement.scrollHeight,
    hojear: [...document.querySelectorAll('.card .name')].map((n) => n.textContent.trim().split(' ')[0]),
  }));
  console.log(`${c.file} · ${c.width}px · ${JSON.stringify(medida)} · errores: ${errores.length ? errores.join(' | ') : 'ninguno'}`);
  await page.close();
}
await browser.close();
