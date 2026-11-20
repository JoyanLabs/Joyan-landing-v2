#!/usr/bin/env node
/**
 * CAPTURA DE LA ESCENA VIVA — un estado, un PNG, con el navegador real.
 * ============================================================================
 *   node design-studies/constelaciones-candidatas/cards/live/capture.mjs Ori \
 *     --state reposo|mitad|foco|puntero-a|puntero-b \
 *     --out design-studies/constelaciones-candidatas/cards/live/capturas/Ori-reposo.png \
 *     [--node 7] [--base http://127.0.0.1:4403/.../live/index.html]
 *
 * La página se abre con `?id=<id>&still=1`: el reloj queda congelado en el
 * instante de la pieza (cuadro 100 de 720), así que dos procesos separados
 * producen el mismo PNG y las mismas láminas.
 *
 *   reposo      el primer cuadro, sin interacción.
 *   mitad       el foco a mitad de la transición (cámara y opacidades en p=0,5).
 *   foco        el foco terminado.
 *   puntero-a   el puntero sobre un nodo: SÓLO se ilumina ese nodo.
 *   puntero-b   el puntero sobre otro nodo: idéntico salvo el nodo iluminado.
 *
 * Imprime una línea JSON con el resultado —incluidos los sha256 de las láminas
 * horneadas, que tienen que coincidir entre procesos—; un error de página es
 * fatal.
 */

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
import { CARD, constellationFor } from '../data.mjs';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at > -1 ? argv[at + 1] : fallback;
};
const id = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
if (!id) {
  process.stderr.write('falta el id: node capture.mjs <id del catálogo> --state <estado> --out <archivo.png>\n');
  process.exit(2);
}
const requested = flag('state', 'reposo');
// `transicion` es el nombre viejo de `mitad`; se acepta para no dejar capturas
// huérfanas con el estado anterior.
const state = requested === 'transicion' ? 'mitad' : requested;
const valid = ['reposo', 'mitad', 'foco', 'puntero-a', 'puntero-b'];
if (!valid.includes(state)) {
  process.stderr.write(`--state tiene que ser uno de: ${valid.join(', ')}\n`);
  process.exit(2);
}
const out = resolve(flag('out', resolve(here, 'capturas', `${id}-${state}.png`)));
const base = flag('base', 'http://127.0.0.1:4403/design-studies/constelaciones-candidatas/cards/live/index.html');
const nodeFlag = flag('node', null);

const data = constellationFor(id);
const counted = data.constellation.nodes.length;
const node = nodeFlag !== null
  ? Number(nodeFlag)
  : (data.constellation.nodes.findIndex((entry) => entry.plane === 'near') >= 0
    ? data.constellation.nodes.findIndex((entry) => entry.plane === 'near')
    : 0);
if (!Number.isInteger(node) || node < 0 || node >= counted) {
  process.stderr.write(`--node tiene que ser un índice de nodo (0..${counted - 1})\n`);
  process.exit(2);
}
// El segundo nodo del puntero sale del dato: otro plano, para que las dos
// capturas no puedan diferir en otra cosa que el nodo iluminado.
const second = (() => {
  const other = data.constellation.nodes.findIndex((entry) => entry.plane !== data.constellation.nodes[node].plane);
  return other >= 0 ? other : (node + 1) % counted;
})();

const started = Date.now();
const errors = [];
const browser = await chromium.launch();
let summary;
try {
  const page = await browser.newPage({
    viewport: { width: CARD.width, height: CARD.height },
    deviceScaleFactor: 1,
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));

  await page.goto(`${base}?id=${encodeURIComponent(id)}&still=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);

  if (state === 'foco') {
    await page.evaluate((index) => window.__live.seekFocus(index, 1), node);
  } else if (state === 'mitad') {
    await page.evaluate((index) => window.__live.seekFocus(index, 0.5), node);
  } else if (state === 'puntero-a' || state === 'puntero-b') {
    const target = state === 'puntero-a' ? node : second;
    const [x, y] = await page.evaluate((index) => window.__live.nodes[index].screen, target);
    await page.mouse.move(x, y);
  }
  await page.evaluate(() => new Promise((done) => {
    requestAnimationFrame(() => requestAnimationFrame(done));
  }));

  const live = await page.evaluate(async () => {
    const api = window.__live;
    return {
      state: api.state,
      focusNode: api.focusNode,
      focusPlane: api.focusPlane,
      hovered: api.hovered,
      settled: api.settled,
      reduced: api.reduced,
      still: api.still,
      clock: api.clock,
      stillFrame: api.stillFrame,
      treatment: api.treatment,
      backPlane: api.backPlane,
      leaves: api.leaves(),
      hashes: await api.hashLeaves(),
      planes: api.planes,
      transforms: api.transforms,
      geometry: api.geometry,
      timing: api.timing,
      links: api.links,
      nodes: api.nodes,
    };
  });
  const shotStarted = Date.now();
  const png = await page.screenshot({ type: 'png', caret: 'hide' });
  const shotMs = Date.now() - shotStarted;
  if (errors.length) throw new Error(`errores en la página: ${errors.join(' | ')}`);

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, png);
  summary = {
    id,
    state,
    requested,
    node,
    second,
    out,
    bytes: png.length,
    sha256: createHash('sha256').update(png).digest('hex'),
    width: CARD.width,
    height: CARD.height,
    wallMs: Date.now() - started,
    shotMs,
    live,
  };
} finally {
  await browser.close();
}

process.stdout.write(`${JSON.stringify(summary)}\n`);
