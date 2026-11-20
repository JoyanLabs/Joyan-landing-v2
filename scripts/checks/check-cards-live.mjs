#!/usr/bin/env node
/**
 * LA ESCENA VIVA — el mecanismo de v1, medido.
 * ============================================================================
 * `cards/live/` no es una imagen: es la escena de `design-studies/v1/` con la
 * figura de un id del catálogo. Este chequeo NO lee el código en busca de
 * nombres: abre la página en Chromium, mueve el puntero, hace clic, mueve la
 * cámara y mide lo que quedó pintado, animado y horneado.
 *
 * LOS SIETE CASOS QUE PUEDEN FALLAR (a–g):
 *
 *   a) LAS LÁMINAS SON HORNEADAS Y LA FIGURA ES SVG
 *      el cielo y el lavado son hojas que el motor hornea: el mismo sha256 en
 *      DOS procesos separados, celda 5 con sobremuestreo 1,6 y celda 3
 *      transparente; y la figura es vectorial: ocultar el SVG apaga cada nodo
 *      del cuadro, y la tinta de los nodos no aparece en ninguna lámina.
 *   b) EL BLUR ES EL DE v1
 *      el plano `back` lleva 0,8 px por `filter` CSS vivo; el cielo enfocado
 *      está horneado (ningún `filter` vivo sobre el canvas del cielo) y su
 *      nitidez medida baja respecto de la lámina nítida.
 *   c) EL PUNTERO NO MUEVE NADA
 *      dos posiciones de puntero: MISMA geometría y mismas transformaciones de
 *      TODOS los planos (si el puntero moviera una capa, esto falla), y sólo
 *      cambia la clase y el radio del nodo bajo el cursor.
 *   d) EL CRUCE DE FOCO ES EL DE v1
 *      1 200 ms, 61 keyframes, curva p³(10−15p+6p²) en los valores, y las
 *      opacidades finales: `sky.focus-copy` 0,5 y lavado 0,94.
 *   e) ESCAPE Y VUELTA AUTOMÁTICA
 *      Escape vuelve de inmediato y la vuelta automática ocurre a los 7 000 ms
 *      (±tolerancia), medida con el reloj de la página.
 *   f) REDUCIDO
 *      sin rAF, sin emisión, sin transiciones: el still en el cuadro 100 de 720.
 *   g) EL CLIC CAMBIA LA COMPOSICIÓN
 *      diferencia de píxeles mínima al enfocar, y el plano lejano PIERDE
 *      nitidez (misma cámara, mismo nodo: sólo cambia su tratamiento).
 *
 * Uso, desde la raíz del repo:
 *   timeout 180 node scripts/checks/check-cards-live.mjs
 *
 * Exit 0 sólo si todo pasa; imprime cada número medido.
 */

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
import sharp from 'sharp';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const LIVE = 'design-studies/constelaciones-candidatas/cards/live';
const CARDS = 'design-studies/constelaciones-candidatas/cards';
const PRIMARY = 'Ori';
const FOURTH = 'Sge';

const lines = [];
const failures = [];
const check = (id, name, ok, detail) => {
  lines.push(`${ok ? 'ok  ' : 'FALLA'} ${id}  ${name}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!ok) failures.push(`${id} ${name}`);
  return ok;
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const num = (value, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : String(value));
const ease = (p) => p * p * p * (10 + p * (-15 + 6 * p));

// --------------------------------------------------------------- el servidor
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript',
  '.json': 'application/json', '.woff2': 'font/woff2',
};
const ALLOWED = [
  `${LIVE}/`,
  `${CARDS}/`,
  'design-studies/constelaciones-candidatas/datos/',
  'design-studies/v1/',
  'scripts/scene-src/',
];
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const file = resolve(ROOT, `.${pathname}`);
  const local = relative(ROOT, file).split('\\').join('/');
  if (!ALLOWED.some((prefix) => local.startsWith(prefix)) || !TYPES[extname(file)]) {
    response.writeHead(403).end();
    return;
  }
  try {
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}/${LIVE}/index.html`;

// ------------------------------------------------------------- píxeles
const raw = async (buffer) => {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
};
const lumaAt = (image, x, y, radius = 2) => {
  let sum = 0;
  let count = 0;
  for (let yy = Math.round(y) - radius; yy <= Math.round(y) + radius; yy++) {
    for (let xx = Math.round(x) - radius; xx <= Math.round(x) + radius; xx++) {
      if (xx < 0 || yy < 0 || xx >= image.width || yy >= image.height) continue;
      const at = (yy * image.width + xx) * image.channels;
      sum += 0.2126 * image.data[at] + 0.7152 * image.data[at + 1] + 0.0722 * image.data[at + 2];
      count += 1;
    }
  }
  return count ? sum / count : 0;
};

/**
 * Diferencia entre dos capturas, separada en «dentro» y «fuera» de una lista de
 * cajas (px). «Fuera» es lo que un cambio de estado NO puede tocar.
 */
const diffPixels = (a, b, boxes = []) => {
  const length = Math.min(a.data.length, b.data.length);
  let changed = 0;
  let total = 0;
  let peak = 0;
  let count = 0;
  let lit = 0;
  let litChanged = 0;
  let outside = 0;
  let outsideChanged = 0;
  let outsidePeak = 0;
  const inside = boxes.map(() => 0);
  for (let i = 0; i < length; i += a.channels) {
    const pixel = i / a.channels;
    const x = pixel % a.width;
    const y = Math.floor(pixel / a.width);
    const da = Math.abs(a.data[i] - b.data[i]);
    const db = Math.abs(a.data[i + 1] - b.data[i + 1]);
    const dc = Math.abs(a.data[i + 2] - b.data[i + 2]);
    const delta = Math.max(da, db, dc);
    if (delta > 6) changed += 1;
    total += delta;
    if (delta > peak) peak = delta;
    const la = 0.2126 * a.data[i] + 0.7152 * a.data[i + 1] + 0.0722 * a.data[i + 2];
    const lb = 0.2126 * b.data[i] + 0.7152 * b.data[i + 1] + 0.0722 * b.data[i + 2];
    if (la > 12 || lb > 12) {
      lit += 1;
      if (delta > 6) litChanged += 1;
    }
    const inBox = boxes.findIndex((box) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3]);
    if (inBox >= 0) {
      if (delta > 6) inside[inBox] += 1;
    } else {
      outside += 1;
      if (delta > 6) outsideChanged += 1;
      if (delta > outsidePeak) outsidePeak = delta;
    }
    count += 1;
  }
  return {
    changed: changed / count,
    litChanged: lit ? litChanged / lit : 0,
    mean: total / count,
    peak,
    outsideChanged: outside ? outsideChanged / outside : 0,
    outsidePeak,
    inside,
  };
};

/** Varianza del laplaciano sobre la tinta (el fondo negro no cuenta). */
const sharpness = (image) => {
  const { data, width, height, channels } = image;
  let sum = 0;
  let sum2 = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const at = (yy, xx) => {
        const i = (yy * width + xx) * channels;
        return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      };
      const centre = at(y, x);
      if (centre < 8) continue;
      const lap = 4 * centre - at(y - 1, x) - at(y + 1, x) - at(y, x - 1) - at(y, x + 1);
      sum += lap;
      sum2 += lap * lap;
      count += 1;
    }
  }
  const mean = count ? sum / count : 0;
  return { variance: count ? sum2 / count - mean * mean : 0, pixels: count };
};

const settle = (page, frames = 2) => page.evaluate((n) => new Promise((done) => {
  let left = n;
  const step = () => { left -= 1; if (left <= 0) done(); else requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), frames);

const pageErrors = [];
async function openPage(browser, { id = PRIMARY, reduced = false, still = true } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(`${id}: ${error}`));
  page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(`${id}: ${message.text()}`); });
  page.on('requestfailed', (request) => pageErrors.push(`${id}: ${request.url()} ${request.failure()?.errorText}`));
  await page.goto(`${BASE}?id=${encodeURIComponent(id)}${still ? '&still=1' : ''}${reduced ? '&reduced=1' : ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60000 });
  return { page, context };
}
const closePage = (handle) => handle.context.close();

const nearNode = (page) => page.evaluate(() => {
  const at = window.__live.nodes.findIndex((node) => node.plane === 'near');
  return at >= 0 ? at : 0;
});
const farNode = (page, avoid) => page.evaluate((skip) => {
  const at = window.__live.nodes.findIndex((node) => node.plane === 'far' && node.index !== skip);
  return at >= 0 ? at : (skip + 1) % window.__live.nodes.length;
}, avoid);
const nodeScreen = (page, index) => page.evaluate((i) => window.__live.nodes[i].screen, index);
const isolate = (page, { planes = [], hide = [] } = {}) => page.evaluate((options) => {
  const nothing = ['#sky', '.sky.focus-copy', '#wash', '#vignette', '.copy', '.series', '.credit', '.hint', '.utility', '#lines'];
  for (const selector of [...nothing, ...options.hide]) {
    for (const el of document.querySelectorAll(selector)) el.style.visibility = 'hidden';
  }
  for (const group of document.querySelectorAll('[data-node-plane]')) {
    group.style.visibility = options.planes.includes(group.dataset.nodePlane) ? 'visible' : 'hidden';
  }
}, { planes, hide });

const scratch = await mkdtemp(resolve(tmpdir(), 'check-cards-live-'));
const report = {};
let browser;

try {
  browser = await chromium.launch();

  // ------------------------------------------------------------------ caso a
  // Dos PROCESOS separados hornean la misma escena sin interacción: las hojas
  // del motor tienen que dar el mismo sha256. Después se comprueba que la
  // figura no está en ninguna hoja: es SVG.
  const capture = (out) => new Promise((done) => {
    const child = spawn(process.execPath, [
      resolve(ROOT, LIVE, 'capture.mjs'), PRIMARY,
      '--state', 'reposo', '--out', out, '--base', BASE,
    ], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill('SIGKILL'), 90000);
    child.on('close', (code) => {
      clearTimeout(timer);
      let summary = null;
      try { summary = JSON.parse(stdout.trim().split('\n').pop()); } catch { /* se informa */ }
      done({ code, summary, stderr: stderr.trim().slice(0, 400) });
    });
  });
  const runA = await capture(resolve(scratch, 'a.png'));
  const runB = await capture(resolve(scratch, 'b.png'));
  const leavesA = runA.summary?.live?.hashes;
  const leavesB = runB.summary?.live?.hashes;
  const leafKeys = ['sky', 'wash', 'focusedWash', 'vignette'];
  const leavesSame = Boolean(leavesA && leavesB)
    && leafKeys.every((key) => leavesA[key] === leavesB[key]);
  const shotA = runA.summary ? await readFile(resolve(scratch, 'a.png')) : null;
  const shotB = runB.summary ? await readFile(resolve(scratch, 'b.png')) : null;
  const sameShot = Boolean(shotA && shotB) && sha(shotA) === sha(shotB);
  check('a', 'el cielo y el lavado son hojas horneadas (mismo hash en dos procesos)',
    leavesSame && sameShot && runA.code === 0 && runB.code === 0,
    leavesSame
      ? `cielo ${leavesA.sky.slice(0, 16)}… · lavado ${leavesA.wash.slice(0, 16)}… · `
        + `enfocado ${leavesA.focusedWash.slice(0, 12)}… · cuadro ${shotA ? sha(shotA).slice(0, 12) : 'sin PNG'}… `
        + `(${num(runA.summary.wallMs / 1000)} s + ${num(runB.summary.wallMs / 1000)} s)`
      : `las láminas no coinciden: ${runA.stderr || runB.stderr || 'sin salida'}`);
  report.leaves = leavesA;

  const shape = await openPage(browser);
  const leavesInfo = await shape.page.evaluate(() => {
    const api = window.__live;
    return {
      leaves: api.leaves(),
      nodes: api.nodes,
      counts: api.counts,
      figures: {
        cores: document.querySelectorAll('#nodes circle.core').length,
        targets: document.querySelectorAll('#nodes [data-node][role="button"][tabindex="0"]').length,
        gradients: document.querySelectorAll('#nodes #node-glow').length,
      },
      geometry: api.geometry,
      timing: api.timing,
    };
  });
  const leafShape = leavesInfo.leaves;
  check('a', 'la retícula y la celda son las de v1',
    leafShape.sky.cell === 5 && leafShape.sky.overscan === 1.6
    && leafShape.wash.cell === 3 && leafShape.wash.transparent === true
    && leafShape.wash.cols === 480 && leafShape.wash.rows === 300,
    `cielo celda ${leafShape.sky.cell} × sobremuestreo ${leafShape.sky.overscan} `
    + `(pasos ${leafShape.sky.steps}) · lavado celda ${leafShape.wash.cell} `
    + `sobre ${leafShape.wash.cols}×${leafShape.wash.rows} transparente (pasos ${leafShape.wash.steps})`);

  // La figura es SVG: se toma una captura, se oculta el SVG de los nodos y se
  // mide cuánto se apaga CADA nodo en el cuadro. Si alguien horneara la figura,
  // ocultar el SVG no apagaría nada.
  const points = leavesInfo.nodes.map((node) => node.screen);
  const visibleShot = await raw(await shape.page.screenshot());
  await shape.page.evaluate(() => { document.getElementById('nodes').style.visibility = 'hidden'; });
  await settle(shape.page, 2);
  const hiddenShot = await raw(await shape.page.screenshot());
  await shape.page.evaluate(() => { document.getElementById('nodes').style.visibility = ''; });
  const drops = points.map(([x, y]) => lumaAt(visibleShot, x, y) - lumaAt(hiddenShot, x, y));
  const minDrop = Math.min(...drops);
  check('a', 'la figura es SVG (no hay nodos pintados por el motor)',
    leavesInfo.figures.cores === leavesInfo.counts.nodes
    && leavesInfo.figures.targets === leavesInfo.counts.nodes
    && leafShape.ink.inSky === 0 && leafShape.ink.inWash === 0
    && drops.every((drop) => drop > 20),
    `${leavesInfo.figures.cores} núcleos SVG / ${leavesInfo.counts.nodes} nodos · `
    + `${leavesInfo.figures.targets} blancos role=button tabindex=0 · tinta ${leafShape.ink.hex} en las `
    + `láminas: ${leafShape.ink.inSky} px en el cielo, ${leafShape.ink.inWash} px en el lavado · `
    + `ocultar el SVG apaga los ${drops.filter((d) => d > 20).length}/${drops.length} nodos `
    + `(baja mínima ${num(minDrop, 1)})`);
  report.figure = { cores: leavesInfo.figures.cores, minDrop };

  // ------------------------------------------------------------------ caso b
  // El plano `back` toma el desenfoque por `filter` CSS vivo; el cielo enfocado
  // está horneado: no hay `filter` sobre su canvas, y su nitidez medida baja.
  const blurPage = await openPage(browser);
  const focusIndex = await nearNode(blurPage.page);
  await blurPage.page.evaluate((index) => window.__live.activate(index), focusIndex);
  await blurPage.page.waitForFunction(() => window.__live.settled === true, null, { timeout: 8000 });
  const opticsState = await blurPage.page.evaluate(() => {
    const api = window.__live;
    const read = (selector) => {
      const el = document.querySelector(selector);
      const style = getComputedStyle(el);
      return { filter: style.filter, imageRendering: style.imageRendering };
    };
    const sky = document.getElementById('sky');
    const focusCopy = document.querySelector('.sky.focus-copy');
    const sample = (canvas, half = false) => {
      const ctx = canvas.getContext('2d');
      const x = half ? 450 : 900;
      const y = half ? 150 : 300;
      const w = half ? 200 : 400;
      const h = half ? 150 : 300;
      const data = ctx.getImageData(x, y, w, h).data;
      let sum = 0;
      let sum2 = 0;
      let count = 0;
      const at = (xx, yy) => {
        const i = (yy * w + xx) * 4;
        return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      };
      for (let yy = 1; yy < h - 1; yy++) {
        for (let xx = 1; xx < w - 1; xx++) {
          const centre = at(xx, yy);
          if (centre < 8) continue;
          const lap = 4 * centre - at(xx - 1, yy) - at(xx + 1, yy) - at(xx, yy - 1) - at(xx, yy + 1);
          sum += lap;
          sum2 += lap * lap;
          count += 1;
        }
      }
      let sink = 0;
      for (let i = 0; i < data.length; i += 4) sink += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const mean = count ? sum / count : 0;
      return { variance: count ? sum2 / count - mean * mean : 0, pixels: count, mean: sink / (w * h) };
    };
    return {
      planes: api.planes,
      backPlane: api.backPlane,
      sky: { ...read('#sky'), width: sky.width, height: sky.height },
      skyFocus: { ...read('.sky.focus-copy'), width: focusCopy.width, height: focusCopy.height },
      skyCamera: read('.sky-camera'),
      washCamera: read('.wash-camera'),
      sharp: { sky: sample(sky), focus: sample(focusCopy, true) },
      canvasFilters: [...document.querySelectorAll('canvas')].map((el) => getComputedStyle(el).filter),
    };
  });
  const backName = opticsState.backPlane;
  const backFilter = opticsState.planes[backName]?.filter ?? '';
  const focusRatio = opticsState.sharp.sky.variance
    ? opticsState.sharp.focus.variance / opticsState.sharp.sky.variance : 1;
  check('b', 'el blur del plano lejano es 0,8 px por filter CSS',
    backName === 'far' && /blur\(0\.8px\)/.test(backFilter) && /saturate\(0\.42\)/.test(backFilter)
    && /blur\(0px\)/.test(opticsState.planes.mid.filter) && /blur\(0px\)/.test(opticsState.planes.near.filter),
    `plano ${backName}: filter ${backFilter} · medio ${opticsState.planes.mid.filter} · `
    + `sujeto ${opticsState.planes.near.filter}`);
  check('b', 'el cielo enfocado está horneado (sin filter vivo en su canvas)',
    opticsState.sky.filter === 'none' && opticsState.skyFocus.filter === 'none'
    && opticsState.skyCamera.filter === 'none' && opticsState.washCamera.filter === 'none'
    && opticsState.canvasFilters.every((filter) => filter === 'none')
    && opticsState.skyFocus.width === Math.ceil(opticsState.sky.width / 2)
    && opticsState.skyFocus.height === Math.ceil(opticsState.sky.height / 2)
    && opticsState.sharp.focus.mean > 2 && opticsState.sharp.sky.mean > 2
    && focusRatio < 0.75,
    `filters ${opticsState.canvasFilters.join(' / ')} · copia ${opticsState.skyFocus.width}×${opticsState.skyFocus.height} `
    + `= ½ de ${opticsState.sky.width}×${opticsState.sky.height} · nitidez horneada `
    + `${num(opticsState.sharp.sky.variance, 2)} → ${num(opticsState.sharp.focus.variance, 2)} `
    + `(${((1 - focusRatio) * 100).toFixed(0)} % menos)`);
  report.blur = { backFilter, focusRatio };
  await closePage(blurPage);

  // ------------------------------------------------------------------ caso c
  // Dos posiciones de puntero. La geometría y las transformaciones de TODOS los
  // planos tienen que ser idénticas: si el puntero moviera una capa, esto falla.
  const pointerPage = await openPage(browser);
  const pointerA = focusIndex;
  const pointerB = await farNode(pointerPage.page, pointerA);
  const snapshot = () => pointerPage.page.evaluate(() => ({
    transforms: window.__live.transforms,
    planes: window.__live.planes,
    hovered: window.__live.hovered,
    nodes: window.__live.nodes,
    state: window.__live.state,
  }));
  const atRest = await snapshot();
  const [ax, ay] = await nodeScreen(pointerPage.page, pointerA);
  await pointerPage.page.mouse.move(ax, ay);
  await settle(pointerPage.page, 2);
  const atA = await snapshot();
  const shotPointerA = await raw(await pointerPage.page.screenshot());
  const [bx, by] = await nodeScreen(pointerPage.page, pointerB);
  await pointerPage.page.mouse.move(bx, by);
  await settle(pointerPage.page, 2);
  const atB = await snapshot();
  const shotPointerB = await raw(await pointerPage.page.screenshot());
  const sameGeometry = JSON.stringify(atA.transforms) === JSON.stringify(atB.transforms)
    && JSON.stringify(atRest.transforms) === JSON.stringify(atA.transforms)
    && JSON.stringify(atA.planes) === JSON.stringify(atB.planes);
  const box = (x, y) => [x - 30, y - 30, x + 30, y + 30];
  const pointerDiff = diffPixels(shotPointerA, shotPointerB, [box(ax, ay), box(bx, by)]);
  const coreA = atRest.nodes[pointerA].coreR;
  const coreB = atRest.nodes[pointerB].coreR;
  check('c', 'el puntero no mueve ninguna capa',
    sameGeometry && atA.hovered === pointerA && atB.hovered === pointerB
    && atA.nodes[pointerA].lit === true && atB.nodes[pointerA].lit === false
    && atB.nodes[pointerB].lit === true
    && Math.abs(atA.nodes[pointerA].coreR - coreA * 1.65) < 1e-6
    && Math.abs(atB.nodes[pointerB].coreR - coreB * 1.65) < 1e-6
    && pointerDiff.outsideChanged <= 0.0005 && pointerDiff.outsidePeak <= 8
    && pointerDiff.inside[0] > 0 && pointerDiff.inside[1] > 0,
    `transformaciones idénticas en las tres posiciones (${sameGeometry ? 'sí' : 'NO'}) · `
    + `sólo cambia el nodo iluminado: ${pointerA} (radio ${num(coreA)} → ${num(atA.nodes[pointerA].coreR)} px) `
    + `y ${pointerB} (${num(coreB)} → ${num(atB.nodes[pointerB].coreR)} px) · fuera de los dos nodos `
    + `${(pointerDiff.outsideChanged * 100).toFixed(4)} % de píxeles (pico ${num(pointerDiff.outsidePeak, 0)}) · `
    + `dentro ${pointerDiff.inside[0] + pointerDiff.inside[1]} px`);
  report.pointer = { sameGeometry, outside: pointerDiff.outsideChanged, peak: pointerDiff.outsidePeak };
  await closePage(pointerPage);

  // ------------------------------------------------------------------ caso d
  const opticsPage = await openPage(browser);
  const optics = await opticsPage.page.evaluate((index) => {
    window.__live.activate(index);
    return {
      animations: window.__live.optics(),
      geometry: window.__live.geometry,
    };
  }, focusIndex);
  await opticsPage.page.waitForFunction(() => window.__live.settled === true, null, { timeout: 8000 });
  const settledOptics = await opticsPage.page.evaluate(() => {
    const read = (selector) => getComputedStyle(document.querySelector(selector)).opacity;
    return {
      skyFocus: read('.sky.focus-copy'),
      wash: read('#wash'),
      state: window.__live.state,
    };
  });
  const byRole = (role) => optics.animations.find((animation) => animation.role === role);
  const skyOpacity = byRole('cielo-foco');
  const washOpacity = byRole('lavado');
  const skyCamera = byRole('camara-cielo');
  const washCamera = byRole('camara-lavado');
  const expectedOffsets = (frame) => Array.from({ length: 61 }, (_, k) => k / 60)
    .every((offset, k) => Math.abs(offset - (frame.offsets[k] ?? -1)) < 1e-9);
  const curveError = (frame, from, to) => Math.max(...frame.opacities.map((value, k) => Math.abs(
    value - (from + (to - from) * ease(frame.offsets[k])),
  )));
  const transformNumbers = (value) => (value ?? '').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)?.map(Number) ?? [];
  const cameraCurveError = (frame) => {
    const numbers = frame.transforms.map(transformNumbers);
    const end = numbers.at(-1);
    return Math.max(...numbers.map((value, k) => Math.max(
      Math.abs(value[0] - end[0] * ease(frame.offsets[k])),
      Math.abs(value[1] - end[1] * ease(frame.offsets[k])),
      Math.abs(value[2] - (1 + (end[2] - 1) * ease(frame.offsets[k]))),
    )));
  };
  const keyframesOk = [skyOpacity, washOpacity, skyCamera, washCamera]
    .every((frame) => frame && frame.keyframes === 61 && expectedOffsets(frame));
  const durationsOk = [skyOpacity, washOpacity, skyCamera, washCamera]
    .every((frame) => frame && frame.duration === 1200);
  const focusOpacityError = Math.max(
    curveError(skyOpacity, 0, 0.5),
    curveError(washOpacity, 1, 0.94),
  );
  const cameraError = Math.max(cameraCurveError(skyCamera), cameraCurveError(washCamera));
  check('d', 'la transición de foco es de 1 200 ms con 61 keyframes y la curva de v1',
    keyframesOk && durationsOk && focusOpacityError < 2e-3 && cameraError < 0.2
    && skyOpacity.opacities.at(-1) === 0.5 && washOpacity.opacities.at(-1) === 0.94
    && settledOptics.skyFocus === '0.5' && settledOptics.wash === '0.94',
    `${optics.animations.length} animaciones · duraciones ${[...new Set(optics.animations.map((a) => a.duration))].join('/')} ms · `
    + `keyframes ${[...new Set(optics.animations.map((a) => a.keyframes))].join('/')} · `
    + `error de curva ${focusOpacityError.toExponential(2)} (opacidad) y ${num(cameraError, 3)} px (cámara) · `
    + `finales cielo ${skyOpacity.opacities.at(-1)} y lavado ${washOpacity.opacities.at(-1)} `
    + `(medidos ${settledOptics.skyFocus} / ${settledOptics.wash})`);
  report.optics = { focusOpacityError, cameraError };
  await closePage(opticsPage);

  // ------------------------------------------------------------------ caso e
  const returnPage = await openPage(browser, { still: false });
  const returnIndex = await nearNode(returnPage.page);
  const [rx, ry] = await nodeScreen(returnPage.page, returnIndex);
  await returnPage.page.mouse.move(rx, ry);
  await returnPage.page.mouse.click(rx, ry);
  await returnPage.page.waitForFunction(() => window.__live.state === 'enfocado', null, { timeout: 8000 });
  const hit = await returnPage.page.evaluate((index) => {
    const box = document.querySelector(`#nodes [data-node="${index}"]`).getBoundingClientRect();
    return { width: box.width, height: box.height, resetHidden: document.querySelector('.field-reset').hidden };
  }, returnIndex);
  await returnPage.page.waitForFunction(() => window.__live.state === 'reposo', null, { timeout: 12000 });
  const autoReturn = await returnPage.page.evaluate(() => ({
    after: window.__live.returnAfter,
    returnMs: window.__live.returnMs,
    resetHidden: document.querySelector('.field-reset').hidden,
    settle: window.__live.settled,
  }));
  // Escape: se vuelve a enfocar, y un Escape real devuelve sin esperar los 7 s.
  const [rx2, ry2] = await nodeScreen(returnPage.page, returnIndex);
  await returnPage.page.mouse.move(rx2, ry2);
  await returnPage.page.mouse.click(rx2, ry2);
  await returnPage.page.waitForFunction(() => window.__live.state === 'enfocado', null, { timeout: 8000 });
  const escapeStarted = Date.now();
  await returnPage.page.keyboard.press('Escape');
  // Escape devuelve el ESTADO de inmediato; la cámara tarda sus 1 200 ms en
  // llegar, que es la transición de v1. Se mide el estado, no el viaje.
  await returnPage.page.waitForFunction(() => window.__live.state === 'reposo', null, { timeout: 4000 });
  const escapeMs = Date.now() - escapeStarted;
  check('e', 'Escape vuelve y la vuelta automática ocurre a los 7 000 ms',
    Math.abs(autoReturn.after - autoReturn.returnMs) <= 700 && autoReturn.returnMs === 7000
    && autoReturn.resetHidden === true && hit.resetHidden === false
    && Math.abs(hit.width - 26) < 0.6 && Math.abs(hit.height - 26) < 0.6
    && escapeMs < 400,
    `vuelta automática ${num(autoReturn.after, 0)} ms (declara ${autoReturn.returnMs}) · `
    + `Escape ${escapeMs} ms · blanco del nodo ${num(hit.width)} × ${num(hit.height)} CSS px · `
    + `reset ${hit.resetHidden ? 'oculto' : 'visible'} al enfocar y ${autoReturn.resetHidden ? 'oculto' : 'visible'} al volver`);
  report.return = { after: autoReturn.after, escapeMs };

  // Pausa/reanudar y Tab: el resto de la interacción de v1. Se mide sobre la
  // misma página viva.
  const pauseStart = await returnPage.page.evaluate(() => ({
    paused: window.__live.paused, running: window.__live.running, text: document.querySelector('.field-pause').textContent,
  }));
  await returnPage.page.click('.field-pause');
  const paused = await returnPage.page.evaluate(() => ({
    paused: window.__live.paused, running: window.__live.running, text: document.querySelector('.field-pause').textContent,
  }));
  await returnPage.page.click('.field-pause');
  const resumed = await returnPage.page.evaluate(() => ({
    paused: window.__live.paused, running: window.__live.running, text: document.querySelector('.field-pause').textContent,
  }));
  await returnPage.page.evaluate(() => document.activeElement?.blur());
  let tabbed = null;
  for (let step = 0; step < 4 && !tabbed; step++) {
    await returnPage.page.keyboard.press('Tab');
    tabbed = await returnPage.page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.matches?.('[data-node]')) return null;
      const index = Number(el.dataset.node);
      return {
        index,
        role: el.getAttribute('role'),
        tabindex: el.getAttribute('tabindex'),
        hovered: window.__live.hovered,
        lit: window.__live.nodes[index].lit,
      };
    });
  }
  check('·', 'pausa/reanudar y Tab resaltan el campo',
    pauseStart.paused === false && pauseStart.running === true
    && paused.paused === true && paused.running === false && paused.text === 'Reanudar campo'
    && resumed.paused === false && resumed.running === true && resumed.text === 'Pausar campo'
    && tabbed !== null && tabbed.role === 'button' && tabbed.tabindex === '0'
    && tabbed.hovered === tabbed.index && tabbed.lit === true,
    `pausa: ${pauseStart.text} → ${paused.text} (rAF ${paused.running ? 'sigue' : 'detenido'}) → `
    + `${resumed.text} · Tab enfoca el nodo ${tabbed?.index} (role=${tabbed?.role} tabindex=${tabbed?.tabindex}) `
    + `y lo ilumina: hovered ${tabbed?.hovered}`);
  await closePage(returnPage);

  // ------------------------------------------------------------------ caso f
  const reducedPage = await openPage(browser, { reduced: true });
  const reducedAtLoad = await reducedPage.page.evaluate(() => {
    const api = window.__live;
    return {
      reduced: api.reduced,
      running: api.running,
      stillFrame: api.stillFrame,
      clock: api.clock,
      emission: api.emission,
      animations: document.getAnimations().length,
      transitions: getComputedStyle(document.querySelector('[data-node-plane="far"]')).transitionDuration,
    };
  });
  const reducedFocus = await reducedPage.page.evaluate(async () => {
    const api = window.__live;
    const index = api.nodes.findIndex((node) => node.plane === 'near');
    api.activate(index);
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    return {
      state: api.state,
      settled: api.settled,
      running: api.running,
      animations: api.optics().map((animation) => ({ duration: animation.duration, keyframes: animation.keyframes })),
      allAnimations: document.getAnimations().map((animation) => animation.effect.getTiming().duration),
      skyFocus: getComputedStyle(document.querySelector('.sky.focus-copy')).opacity,
      wash: getComputedStyle(document.getElementById('wash')).opacity,
      transitions: getComputedStyle(document.querySelector('[data-node-plane="far"]')).transitionDuration,
      inkTransitions: getComputedStyle(document.querySelector('[data-node-plane="far"] circle.core')).transitionDuration,
      emission: api.emission,
      frameIndex: api.frameIndex,
      clock: api.clock,
    };
  });
  const stillMs = (100 / 60) * 1000;
  check('f', 'reducido: sin animación y con el still del cuadro 100',
    reducedAtLoad.reduced === true && reducedAtLoad.running === false
    && reducedAtLoad.stillFrame.frame === 100 && reducedAtLoad.stillFrame.frames === 720
    && Math.abs(reducedAtLoad.clock - stillMs) < 0.01
    && reducedAtLoad.emission.started === false && reducedAtLoad.animations === 0
    && reducedFocus.animations.every((animation) => animation.duration === 0)
    && reducedFocus.allAnimations.every((duration) => duration === 0)
    && reducedFocus.skyFocus === '0.5' && reducedFocus.wash === '0.94'
    && reducedFocus.transitions === '0s' && reducedFocus.inkTransitions === '0s'
    && reducedFocus.settled === true && reducedFocus.running === false
    && reducedFocus.emission.started === false
    && Math.abs(reducedFocus.clock - stillMs) < 0.01,
    `cuadro ${reducedAtLoad.stillFrame.frame}/${reducedAtLoad.stillFrame.frames} a ${num(reducedAtLoad.clock, 0)} ms `
    + `(${num(stillMs, 0)} ms) · sin rAF ni emisión · ${reducedFocus.animations.length} animaciones de duración 0 · `
    + `opacidades ${reducedFocus.skyFocus} / ${reducedFocus.wash} · transición de planos ${reducedFocus.transitions}`);
  report.reduced = { changes: reducedFocus.animations.length };
  await closePage(reducedPage);

  // ------------------------------------------------------------------ caso g
  const clickPage = await openPage(browser);
  const clickIndex = await nearNode(clickPage.page);
  const restShot = await raw(await clickPage.page.screenshot());
  const [cx, cy] = await nodeScreen(clickPage.page, clickIndex);
  await clickPage.page.mouse.move(cx, cy);
  await clickPage.page.mouse.click(cx, cy);
  await clickPage.page.waitForFunction(() => window.__live.settled === true && window.__live.state === 'enfocado', null, { timeout: 8000 });
  const focusShot = await raw(await clickPage.page.screenshot());
  const clickDiff = diffPixels(restShot, focusShot);
  const focusInfo = await clickPage.page.evaluate(() => ({
    state: window.__live.state,
    node: window.__live.focusNode,
    plane: window.__live.focusPlane,
    back: window.__live.backPlane,
    treatment: window.__live.treatment,
    planes: window.__live.planes,
  }));
  check('g', 'el clic cambia la composición',
    focusInfo.state === 'enfocado' && focusInfo.node === clickIndex
    && clickDiff.changed >= 0.10 && clickDiff.litChanged >= 0.55
    && clickDiff.mean >= 3 && clickDiff.peak >= 40,
    `nodo ${focusInfo.node} (${focusInfo.plane}) · ${(clickDiff.changed * 100).toFixed(1)} % del cuadro y `
    + `${(clickDiff.litChanged * 100).toFixed(1)} % de la tinta cambian · media ${num(clickDiff.mean)} · `
    + `pico ${num(clickDiff.peak, 0)}`);

  // El plano lejano pierde nitidez. Se aísla ese plano —misma cámara, mismo
  // sujeto— y se mide dos veces: con su tratamiento (`back`, 0,8 px) y con el
  // tratamiento base (0 px). Si no hubiera desenfoque, las dos medidas serían
  // iguales.
  await isolate(clickPage.page, { planes: [focusInfo.back] });
  await settle(clickPage.page, 2);
  const backShot = await raw(await clickPage.page.screenshot());
  const backState = await clickPage.page.evaluate((plane) => window.__live.planes[plane], focusInfo.back);
  await clickPage.page.evaluate((plane) => {
    document.querySelector(`[data-node-plane="${plane}"]`).dataset.treatment = 'base';
  }, focusInfo.back);
  await settle(clickPage.page, 2);
  const baseShot = await raw(await clickPage.page.screenshot());
  const backShared = sharpness(backShot);
  const baseShared = sharpness(baseShot);
  const blurDrop = baseShared.variance > 0 ? 1 - backShared.variance / baseShared.variance : 0;
  check('g', 'el plano lejano pierde nitidez',
    focusInfo.back === 'far' && /blur\(0\.8px\)/.test(backState.filter)
    && backShared.pixels > 200 && baseShared.pixels > 200 && blurDrop >= 0.10,
    `plano ${focusInfo.back} (${backState.treatment}): filter ${backState.filter} · nitidez `
    + `${num(baseShared.variance, 2)} (base) → ${num(backShared.variance, 2)} (fondo) · `
    + `baja ${(blurDrop * 100).toFixed(0)} %`);
  report.click = { diff: clickDiff.changed, blurDrop };
  await closePage(clickPage);

  // ------------------------------------------------------------- apoyo
  // La emisión de reposo: 12 Hz declarados (83,3 ms) en un worker, y la cámara
  // quieta. Se mide sobre la escena viva (sin `still`): la emisión avanza y la
  // transformación de la figura NO cambia sola.
  const emissionPage = await openPage(browser, { still: false });
  const emissionStart = await emissionPage.page.evaluate(() => ({
    frames: window.__live.emission.frames,
    clock: window.__live.clock,
    camera: window.__live.transforms.figure.transform,
  }));
  await emissionPage.page.waitForTimeout(3000);
  const emissionEnd = await emissionPage.page.evaluate(() => ({
    frames: window.__live.emission.frames,
    clock: window.__live.clock,
    camera: window.__live.transforms.figure.transform,
    emission: window.__live.emission,
  }));
  const elapsed = (emissionEnd.clock - emissionStart.clock) / 1000;
  const emissionRate = elapsed > 0 ? (emissionEnd.frames - emissionStart.frames) / elapsed : 0;
  check('·', 'reposo: emisión a 12 Hz sin recalcular el cielo, y la cámara no deriva',
    emissionEnd.emission.requestMs === 1000 / 12
    && emissionEnd.emission.worker === true && emissionEnd.emission.started === true
    && emissionRate >= 8 && emissionRate <= 12.5
    && emissionEnd.camera === emissionStart.camera
    && emissionEnd.emission.cost < 60,
    `intervalo declarado ${num(emissionEnd.emission.requestMs)} ms · medido `
    + `${emissionEnd.frames - emissionStart.frames} cuadros en ${num(elapsed, 1)} s = `
    + `${num(emissionRate, 1)} Hz (coste ${num(emissionEnd.emission.cost, 1)} ms) · `
    + `cámara ${emissionEnd.camera} (idéntica en 3 s: ${emissionEnd.camera === emissionStart.camera ? 'sí' : 'NO'})`);
  await closePage(emissionPage);

  check('·', 'sin errores de página', pageErrors.length === 0,
    pageErrors.length ? pageErrors.slice(0, 3).join(' | ') : 'ni excepciones, ni peticiones fallidas');

  const fourth = await openPage(browser, { id: FOURTH });
  const fourthInfo = await fourth.page.evaluate(() => ({
    id: window.__live.id,
    counts: window.__live.counts,
    declared: window.__live.declared,
    nodes: window.__live.nodes.length,
    cores: document.querySelectorAll('#nodes circle.core').length,
  }));
  check('·', 'otro id, la misma escena', fourthInfo.id === FOURTH
    && fourthInfo.counts.nodes === fourthInfo.declared.nodes
    && fourthInfo.counts.segments === fourthInfo.declared.segments
    && fourthInfo.cores === fourthInfo.nodes,
  `${FOURTH}: ${fourthInfo.counts.nodes} nodos · ${fourthInfo.counts.segments} segmentos · `
  + `${fourthInfo.cores} núcleos SVG`);
  await closePage(fourth);
  await closePage(shape);

  lines.push('');
  lines.push(`MEDIDO  (a) hojas ${report.leaves?.sky?.slice(0, 12)}… · figura ${report.figure?.cores} núcleos SVG `
    + `(baja mínima ${num(report.figure?.minDrop, 1)}) · (b) ${report.blur?.backFilter} · nitidez `
    + `${((1 - (report.blur?.focusRatio ?? 1)) * 100).toFixed(0)} % menos en el cielo enfocado · `
    + `(c) ${(report.pointer?.outside * 100).toFixed(4)} % fuera de los nodos · `
    + `(d) error de curva ${report.optics?.focusOpacityError.toExponential(2)} · `
    + `(e) ${num(report.return?.after, 0)} ms / Escape ${report.return?.escapeMs} ms · `
    + `(g) ${(report.click?.diff * 100).toFixed(1)} % de píxeles y ${(report.click?.blurDrop * 100).toFixed(0)} % de nitidez menos`);
} catch (error) {
  check('·', 'la escena completa', false, String(error?.stack ?? error).split('\n').slice(0, 4).join(' · ').slice(0, 800));
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
  await rm(scratch, { recursive: true, force: true });
}

process.stdout.write(`${lines.join('\n')}\n\n`);
if (failures.length) {
  process.stdout.write(`FALLAN ${failures.length}: ${failures.join(' | ')}\n`);
  process.exit(1);
}
process.stdout.write(`TODO GREEN — ${lines.filter((line) => line.startsWith('ok  ')).length} casos\n`);
