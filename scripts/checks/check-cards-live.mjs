#!/usr/bin/env node
/**
 * LA ESCENA VIVA — la profundidad, el foco y el paralaje, medidos.
 * ============================================================================
 * `cards/live/` no es una imagen: es una escena con ocho planos que se mueven.
 * Este chequeo NO busca nombres ni declaraciones en el código: abre la página
 * con Chromium, mueve el puntero, hace clic en un nodo y mide lo que quedó
 * pintado.
 *
 * LOS CINCO CASOS QUE PUEDEN FALLAR:
 *
 *   a) PROFUNDIDAD QUIETA   el mismo punto del modelo proyectado en dos planos
 *                           distintos tiene que desplazarse en píxeles (se mide
 *                           la proyección real de cada plano y se exige un
 *                           mínimo perceptible, 36 px entre vecinos).
 *   b) EL CLIC CAMBIA       la captura antes y después del clic en un nodo se
 *                           comparan píxel a píxel (fracción que cambia y
 *                           diferencia media). No alcanza con que el estado
 *                           diga «enfocado».
 *   c) EL DESENFOQUE EXISTE se aísla el plano que el foco manda al fondo, se
 *                           mide su nitidez (varianza del laplaciano) antes y
 *                           después, y se exige que BAJE.
 *   d) EL PARALAJE EXISTE   dos posiciones de puntero, el mismo instante, y la
 *                           transformación real de cada capa en el DOM: el
 *                           desplazamiento del cielo tiene que ser menor que el
 *                           del lavado y menor que el de la figura.
 *   e) REPRODUCIBLE         el primer cuadro, sin interacción, en dos procesos
 *                           separados: mismo sha256.
 *
 * Además: la escena se renderiza con `?id=Sge` sin tocar el código, el pulso
 * vive en los enlaces, y `prefers-reduced-motion` llega al MISMO estado final
 * sin animación.
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
const check = (name, ok, detail) => {
  lines.push(`${ok ? 'ok  ' : 'FALLA'}  ${name}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!ok) failures.push(name);
  return ok;
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const num = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : String(value));

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

const diffPixels = (a, b) => {
  const length = Math.min(a.data.length, b.data.length);
  let changed = 0;
  let total = 0;
  let peak = 0;
  let count = 0;
  // La fracción sobre TODO el cuadro incluye el ground negro (≈88 % del
  // encuadre), así que también se mide sobre los píxeles con tinta: es donde
  // una composición puede cambiar.
  let lit = 0;
  let litChanged = 0;
  for (let i = 0; i < length; i += a.channels) {
    const da = Math.abs(a.data[i] - b.data[i]);
    const db = Math.abs(a.data[i + 1] - b.data[i + 1]);
    const dc = Math.abs(a.data[i + 2] - b.data[i + 2]);
    const delta = Math.max(da, db, dc);
    if (delta > 6) changed += 1;
    total += delta;
    if (delta > peak) peak = delta;
    const lumBefore = 0.2126 * a.data[i] + 0.7152 * a.data[i + 1] + 0.0722 * a.data[i + 2];
    const lumAfter = 0.2126 * b.data[i] + 0.7152 * b.data[i + 1] + 0.0722 * b.data[i + 2];
    if (lumBefore > 12 || lumAfter > 12) {
      lit += 1;
      if (delta > 6) litChanged += 1;
    }
    count += 1;
  }
  return { changed: changed / count, litChanged: lit ? litChanged / lit : 0, mean: total / count, peak };
};

/** Varianza del laplaciano sobre la tinta (fondo negro fuera). */
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

const matrix = (transform) => {
  if (!transform || transform === 'none') return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const found = /matrix\(([^)]+)\)/.exec(transform);
  if (!found) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const [a, b, c, d, e, f] = found[1].split(',').map(Number);
  return { a, b, c, d, e, f };
};

const settle = (page, frames = 2) => page.evaluate((n) => new Promise((done) => {
  let left = n;
  const step = () => { left -= 1; if (left <= 0) done(); else requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), frames);

const pageErrors = [];
async function openPage(browser, { id = PRIMARY, reduced = false, query = '' } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(`${id}: ${error}`));
  page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(`${id}: ${message.text()}`); });
  page.on('requestfailed', (request) => pageErrors.push(`${id}: ${request.url()} ${request.failure()?.errorText}`));
  await page.goto(`${BASE}?id=${encodeURIComponent(id)}&still=1${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60000 });
  return { page, context };
}

async function closePage(handle) {
  await handle.context.close();
}

/**
 * El puntero mueve las capas, así que el nodo se corre mientras el mouse se
 * acerca: se itera hasta que el cursor cae sobre la posición proyectada del
 * nodo (la aplicación es contractiva, 0,05 por paso). Después el clic es un
 * clic real sobre el círculo de impacto del SVG.
 */
async function aimAtNode(page, index) {
  let point = await page.evaluate((i) => window.__live.nodes[i].screen, index);
  for (let step = 0; step < 5; step++) {
    await page.mouse.move(point[0], point[1]);
    await settle(page, 1);
    point = await page.evaluate((i) => window.__live.nodes[i].screen, index);
  }
  return point;
}

const scratch = await mkdtemp(resolve(tmpdir(), 'check-cards-live-'));
const report = { depth: null, focus: null, blur: null, parallax: null, repro: null };
let browser;

try {
  browser = await chromium.launch();

  // ------------------------------------------------------------ 1 · forma
  const hero = await openPage(browser);
  const form = await hero.page.evaluate(() => {
    const api = window.__live;
    return {
      id: api.id,
      state: api.state,
      counts: api.counts,
      declared: api.declared,
      stack: api.stack,
      links: api.links,
      timing: api.timing,
      depth: api.depth,
    };
  });
  const frame = await hero.page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }));
  check('forma', frame.width === 1440 && frame.height === 900,
    `${frame.width}×${frame.height} · ${form.stack.length} planos · ${form.links.total} enlaces `
    + `(${form.links.pulses} copias de pulso) · horneado ${num(form.timing.bakeMs)} ms`);
  check('el dato', form.counts.nodes === form.declared.nodes && form.counts.segments === form.declared.segments,
    `${form.counts.nodes} nodos · ${form.counts.segments} segmentos (el catálogo declara lo mismo)`);
  const pulses = await hero.page.evaluate(() => {
    const lines = [...document.querySelectorAll('#links line.pulse')];
    return {
      total: lines.length,
      visible: lines.filter((line) => Number(line.getAttribute('opacity')) > 0.01).length,
    };
  });
  check('los enlaces llevan pulso', pulses.visible >= 4,
    `${pulses.visible}/${pulses.total} copias de cometa visibles en el instante congelado de la pieza`);

  const halos = await hero.page.evaluate(() => [...document.querySelectorAll('#nodes [data-node-plane]')].map((group) => ({
    plane: group.dataset.nodePlane,
    nodes: group.querySelectorAll('.node').length,
    minGlow: Math.min(...[...group.querySelectorAll('[data-node-glow]')].map((circle) => Number(circle.getAttribute('r')))),
  })));
  check('cada nodo tiene su halo en su plano',
    halos.length === 3 && halos.reduce((sum, group) => sum + group.nodes, 0) === form.counts.nodes
    && halos.every((group) => group.nodes > 0 && group.minGlow > 4),
    halos.map((group) => `${group.plane} ${group.nodes} nodos · halo mínimo ${num(group.minGlow)} px`).join(' · '));

  check('la pila de ocho planos', form.stack.length === 8
    && form.stack.filter((entry) => entry.layer === 'cielo').length === 1
    && form.stack.filter((entry) => entry.layer === 'lavado').length === 1
    && form.stack.filter((entry) => entry.layer === 'figura').length === 3
    && form.stack.filter((entry) => entry.layer === 'núcleos').length === 3,
  form.stack.map((entry) => `${entry.key} z${num(entry.z, 0)}`).join(' · '));

  // ------------------------------------------- 2 · (a) profundidad quieta
  // El mismo punto del modelo, proyectado en los tres planos de la figura. La
  // pose de cada plano es la que se horneó: el chequeo mide la proyección, no
  // lee una constante del código.
  const depthMeasure = await hero.page.evaluate(() => {
    const api = window.__live;
    const nodes = api.nodes;
    const planes = ['far', 'mid', 'near'];
    const projections = nodes.map((_, index) => Object.fromEntries(
      planes.map((plane) => [plane, api.project(index, plane)]),
    ));
    const distances = projections.map((projected, index) => ({
      index,
      plane: nodes[index].plane,
      farMid: Math.hypot(projected.far[0] - projected.mid[0], projected.far[1] - projected.mid[1]),
      midNear: Math.hypot(projected.mid[0] - projected.near[0], projected.mid[1] - projected.near[1]),
      farNear: Math.hypot(projected.far[0] - projected.near[0], projected.far[1] - projected.near[1]),
      far: projected.far,
      mid: projected.mid,
      near: projected.near,
    }));
    // La tinta del nodo en SU plano: el alfa del canvas horneado bajo la
    // proyección. Comprueba que el desplazamiento medido es el de algo pintado.
    const ink = nodes.map((node, index) => {
      const point = api.project(index, node.plane);
      const canvas = document.querySelector(`canvas[data-plane="figura:${node.plane}"]`);
      const ctx = canvas.getContext('2d');
      const x = Math.round(point[0] + 144);
      const y = Math.round(point[1] + 90);
      const data = ctx.getImageData(x - 12, y - 12, 25, 25).data;
      let alpha = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > alpha) alpha = data[i];
      return { index, plane: node.plane, point, alpha };
    });
    const inside = nodes.every((node) => {
      const [x, y] = node.rest;
      return x >= 0 && x <= 1440 && y >= 0 && y <= 900;
    });
    return { distances, ink, inside, scales: api.stack.filter((entry) => entry.layer === 'figura') };
  });
  const widest = depthMeasure.distances.reduce((best, entry) => (entry.farNear > best.farNear ? entry : best));
  const adjacentMin = Math.min(...depthMeasure.distances.flatMap((entry) => [entry.farMid, entry.midNear]));
  const adjacentMax = Math.max(...depthMeasure.distances.flatMap((entry) => [entry.farMid, entry.midNear]));
  check('(a) profundidad quieta: el mismo punto se desplaza entre planos',
    adjacentMin >= 36 && widest.farNear >= 72,
    `vecinos ${num(adjacentMin)}–${num(adjacentMax)} px · far→near ${num(widest.farNear)} px `
    + `(nodo ${widest.index}, ${widest.plane}) · far/mid/near `
    + `[${widest.far.map((v) => num(v, 0)).join(', ')}] / [${widest.mid.map((v) => num(v, 0)).join(', ')}] / `
    + `[${widest.near.map((v) => num(v, 0)).join(', ')}]`);
  const inkOk = depthMeasure.ink.every((entry) => entry.alpha > 0);
  check('(a) un punto proyectado es tinta pintada, no una fórmula',
    inkOk, `${depthMeasure.ink.filter((entry) => entry.alpha > 0).length}/${depthMeasure.ink.length} nodos `
    + `con tinta en su plano (alfa mínimo ${Math.min(...depthMeasure.ink.map((entry) => entry.alpha))})`);
  check('(a) todos los nodos dentro del cuadro en reposo', depthMeasure.inside,
    `${depthMeasure.distances.length} nodos · escala de la figura `
    + depthMeasure.scales.map((entry) => `${entry.plane} ${num(entry.scale, 4)}`).join(' / '));
  report.depth = {
    adjacentMin, adjacentMax, farNear: widest.farNear, node: widest.index,
    scales: depthMeasure.scales.map((entry) => ({ plane: entry.plane, scale: entry.scale })),
  };

  // ------------------------------------- 3 · (b) el clic cambia la composición
  // Se usa el clic REAL sobre el nodo (el círculo de impacto del SVG), no una
  // llamada al estado. La captura de reposo se toma con el puntero en el centro
  // para que el paralaje sea cero y el cambio venga del foco.
  const beforeShot = await hero.page.screenshot();
  const clickTarget = await hero.page.evaluate(() => {
    const api = window.__live;
    const index = api.nodes.findIndex((node) => node.plane === 'near');
    return { index, screen: api.nodes[index].screen, plane: api.nodes[index].plane };
  });
  const aim = await aimAtNode(hero.page, clickTarget.index);
  await hero.page.mouse.click(aim[0], aim[1]);
  await hero.page.waitForFunction(() => window.__live.settled === true && window.__live.state === 'enfocado', null, { timeout: 8000 });
  await hero.page.mouse.move(720, 450);
  await settle(hero.page, 2);
  const focusedInfo = await hero.page.evaluate(() => ({
    state: window.__live.state,
    node: window.__live.focusNode,
    plane: window.__live.focusPlane,
    treatment: window.__live.treatment,
    stack: window.__live.stack,
    current: window.__live.current,
  }));
  const afterShot = await hero.page.screenshot();
  const beforePixels = await raw(beforeShot);
  const afterPixels = await raw(afterShot);
  const focusDiff = diffPixels(beforePixels, afterPixels);
  check('(b) el clic cambia la composición',
    focusedInfo.state === 'enfocado' && focusedInfo.node === clickTarget.index
    && focusDiff.changed >= 0.10 && focusDiff.litChanged >= 0.60
    && focusDiff.mean >= 3 && focusDiff.peak >= 40,
    `nodo ${focusedInfo.node} (${focusedInfo.plane}) · ${(focusDiff.changed * 100).toFixed(1)} % del cuadro `
    + `y ${(focusDiff.litChanged * 100).toFixed(1)} % de la tinta cambian · media ${num(focusDiff.mean)} `
    + `· pico ${num(focusDiff.peak, 0)}`);
  const treatmentOk = focusedInfo.plane === 'near'
    && focusedInfo.treatment['figura:near'] === 'foco'
    && focusedInfo.treatment['figura:far'] === 'fondo'
    && focusedInfo.treatment['figura:mid'] === 'vecino';
  check('(b) el sujeto se afirma y el más lejano va al fondo', treatmentOk,
    `near foco · mid vecino · far fondo · pesos `
    + focusedInfo.stack.filter((entry) => entry.layer === 'figura')
      .map((entry) => `${entry.plane} ${num(focusedInfo.current.weights[entry.key], 2)} `
        + `· desfoque ${num(focusedInfo.current.blurs[entry.key], 1)} px`).join(' / '));
  report.focus = { node: focusedInfo.node, plane: focusedInfo.plane, ...focusDiff };

  // ------------------------------------------------ 4 · (c) el desenfoque
  // El plano que el foco manda al fondo es el `far` (el sujeto vive en `near`).
  // Se aísla esa lámina —una medición, no la pieza que se captura— y se mide su
  // nitidez antes y después del foco, con la misma escala de la cámara.
  const isolate = (page, keys) => page.evaluate((targets) => {
    for (const el of document.querySelectorAll('.plane')) {
      el.style.visibility = targets.includes(el.dataset.plane) ? 'visible' : 'hidden';
    }
    for (const el of document.querySelectorAll('#links, #nodes, .copy, .series, .credit, .hint')) {
      el.style.visibility = 'hidden';
    }
  }, keys);
  const restore = (page) => page.evaluate(() => {
    for (const el of document.querySelectorAll('.plane, #links, #nodes, .copy, .series, .credit, .hint')) {
      el.style.visibility = '';
    }
  });
  const restPage = await openPage(browser);
  await isolate(restPage.page, ['figura:far', 'núcleos:far']);
  await settle(restPage.page, 2);
  const farRestShot = await restPage.page.screenshot();
  await restore(restPage.page);
  const farRest = sharpness(await raw(farRestShot));
  const farRestState = await restPage.page.evaluate(() => ({
    blur: window.__live.current.blurs['figura:far'],
    weight: window.__live.current.weights['figura:far'],
  }));
  await closePage(restPage);

  await isolate(hero.page, ['figura:far', 'núcleos:far']);
  await settle(hero.page, 2);
  const farFocusShot = await hero.page.screenshot();
  await restore(hero.page);
  const farFocus = sharpness(await raw(farFocusShot));
  const farFocusState = await hero.page.evaluate(() => ({
    blur: window.__live.current.blurs['figura:far'],
    weight: window.__live.current.weights['figura:far'],
  }));
  const blurDrop = farRest.variance > 0 ? 1 - farFocus.variance / farRest.variance : 0;
  check('(c) el plano más lejano se desenfoca',
    farRest.pixels > 500 && farFocus.pixels > 500 && blurDrop >= 0.20,
    `nitidez (varianza del laplaciano) ${num(farRest.variance, 2)} → ${num(farFocus.variance, 2)} `
    + `· baja ${(blurDrop * 100).toFixed(0)} % · desenfoque ${num(farRestState.blur)} → ${num(farFocusState.blur)} px `
    + `· peso ${num(farRestState.weight, 2)} → ${num(farFocusState.weight, 2)}`);
  report.blur = {
    rest: farRest.variance, focus: farFocus.variance, drop: blurDrop,
    blurRest: farRestState.blur, blurFocus: farFocusState.blur,
  };
  await closePage(hero);

  // --------------------------------------------------- 5 · (d) el paralaje
  // Dos posiciones de puntero en el MISMO instante (`still=1` congela el pulso)
  // y la matriz que el navegador aplicó a cada capa. La escalera tiene que ser
  // cielo < lavado < figura.
  const parallaxPage = await openPage(browser);
  const moveTo = (page, x, y) => page.mouse.move(1440 * x, 900 * y);
  await moveTo(parallaxPage.page, 0.28, 0.30);
  await settle(parallaxPage.page, 3);
  const layersA = await parallaxPage.page.evaluate(() => window.__live.domTransforms());
  const shotA = await parallaxPage.page.screenshot();
  await moveTo(parallaxPage.page, 0.72, 0.72);
  await settle(parallaxPage.page, 3);
  const layersB = await parallaxPage.page.evaluate(() => window.__live.domTransforms());
  const shotB = await parallaxPage.page.screenshot();
  const move = (key) => {
    const a = matrix(layersA[key]?.transform);
    const b = matrix(layersB[key]?.transform);
    return Math.hypot(b.e - a.e, b.f - a.f);
  };
  const skyMove = move('cielo');
  const washMove = move('lavado');
  const figureMove = move('figura:near');
  const parallaxDiff = diffPixels(await raw(shotA), await raw(shotB));
  check('(d) el paralaje existe y va de lejos a cerca',
    skyMove > 2 && skyMove < washMove && washMove < figureMove
    && parallaxDiff.changed >= 0.01,
    `cielo ${num(skyMove)} px < lavado ${num(washMove)} px < figura ${num(figureMove)} px `
    + `· tasas ${num(skyMove / figureMove, 2)} / ${num(washMove / figureMove, 2)} / 1,00 `
    + `· ${(parallaxDiff.changed * 100).toFixed(1)} % de píxeles cambian`);
  report.parallax = { sky: skyMove, wash: washMove, figure: figureMove, changed: parallaxDiff.changed };
  await closePage(parallaxPage);

  // ------------------------------------------------ 6 · (e) reproducible
  // Dos PROCESOS separados, mismo primer cuadro sin interacción: mismo sha256.
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
  const runA = await capture(resolve(scratch, 'repro-a.png'));
  const runB = await capture(resolve(scratch, 'repro-b.png'));
  const bytesA = runA.summary ? await readFile(resolve(scratch, 'repro-a.png')) : null;
  const bytesB = runB.summary ? await readFile(resolve(scratch, 'repro-b.png')) : null;
  const hashA = bytesA ? sha(bytesA) : null;
  const hashB = bytesB ? sha(bytesB) : null;
  check('(e) primer cuadro reproducible en dos procesos',
    runA.code === 0 && runB.code === 0 && hashA !== null && hashA === hashB,
    hashA ? `${hashA.slice(0, 32)}… = ${hashB.slice(0, 32)}… · ${bytesA.length} B · `
      + `${num(runA.summary.wallMs / 1000)} s + ${num(runB.summary.wallMs / 1000)} s`
      : `falló la captura: ${runA.stderr || runB.stderr || 'sin salida'}`);
  report.repro = { hash: hashA, bytes: bytesA?.length ?? 0 };

  // ------------------------------------- 7 · reduced motion = estado final
  // Sin animación, el clic aplica el estado final. Se compara con el enfocado
  // normal (mismo nodo, puntero al centro, pulso congelado): mismo PNG.
  const reduced = await openPage(browser, { reduced: true, query: '&reduced=1' });
  const reducedTarget = await reduced.page.evaluate(() => {
    const api = window.__live;
    const index = api.nodes.findIndex((node) => node.plane === 'near');
    return { index, screen: api.nodes[index].screen };
  });
  const reducedAim = await aimAtNode(reduced.page, reducedTarget.index);
  await reduced.page.mouse.click(reducedAim[0], reducedAim[1]);
  await reduced.page.mouse.move(720, 450);
  await settle(reduced.page, 2);
  // El puntero, en reduced motion, no mueve ninguna capa: se comparan las
  // matrices antes y después de llevarlo a un extremo.
  const reducedBefore = await reduced.page.evaluate(() => window.__live.domTransforms());
  await reduced.page.mouse.move(120, 120);
  await settle(reduced.page, 3);
  const reducedAfter = await reduced.page.evaluate(() => window.__live.domTransforms());
  const pointerStill = Object.keys(reducedBefore).every((key) => {
    const a = matrix(reducedBefore[key].transform);
    const b = matrix(reducedAfter[key].transform);
    return Math.abs(a.e - b.e) < 0.01 && Math.abs(a.f - b.f) < 0.01;
  });
  const reducedInfo = await reduced.page.evaluate(() => ({
    reduced: window.__live.reduced,
    settled: window.__live.settled,
    state: window.__live.state,
    node: window.__live.focusNode,
  }));
  const reducedShot = await reduced.page.screenshot();
  const reducedDiff = diffPixels(await raw(reducedShot), afterPixels);
  check('reduced motion: el estado final sin animación',
    reducedInfo.reduced && reducedInfo.settled && reducedInfo.state === 'enfocado'
    && reducedInfo.node === reducedTarget.index && pointerStill
    && reducedDiff.changed <= 0.001 && reducedDiff.peak <= 2,
    `mismo nodo ${reducedInfo.node} · ${(reducedDiff.changed * 100).toFixed(3)} % de píxeles distintos `
    + `· pico ${num(reducedDiff.peak, 0)} · puntero inmóvil (${pointerStill ? 'sí' : 'no'})`);
  await closePage(reduced);

  // ------------------------------- 8 · la transición es interrumpible
  // Un Escape a mitad de la transición vuelve a la vista completa, con la
  // cámara en reposo, sin esperar a que termine el acercamiento.
  const interrupt = await openPage(browser);
  const interruptTarget = await interrupt.page.evaluate(() => {
    const api = window.__live;
    const index = api.nodes.findIndex((node) => node.plane === 'near');
    return { index };
  });
  const interruptAim = await aimAtNode(interrupt.page, interruptTarget.index);
  await interrupt.page.mouse.click(interruptAim[0], interruptAim[1]);
  await interrupt.page.waitForFunction(() => window.__live.mix > 0.35 && window.__live.settled === false, null, { timeout: 8000 });
  const midFocus = await interrupt.page.evaluate(() => ({ mix: window.__live.mix, plane: window.__live.focusPlane }));
  await interrupt.page.keyboard.press('Escape');
  await interrupt.page.waitForFunction(() => window.__live.settled === true && window.__live.state === 'reposo', null, { timeout: 8000 });
  await interrupt.page.mouse.move(720, 450);
  await settle(interrupt.page, 2);
  const interrupted = await interrupt.page.evaluate(() => ({
    state: window.__live.state,
    mix: window.__live.mix,
    layers: window.__live.layers,
  }));
  const rest = Object.values(interrupted.layers).every((layer) => Math.abs(layer.tx) < 0.01 && Math.abs(layer.ty) < 0.01 && Math.abs(layer.scale - 1) < 1e-6);
  check('la transición es interrumpible',
    interrupted.state === 'reposo' && interrupted.mix === 0 && rest,
    `Escape en mix ${num(midFocus.mix, 2)} (${midFocus.plane}) → reposo con la cámara en cero`);
  await closePage(interrupt);

  // ------------------------------ 9 · agregar una constelación no pide código
  const fourth = await openPage(browser, { id: FOURTH });
  const fourthInfo = await fourth.page.evaluate(() => ({
    id: window.__live.id,
    counts: window.__live.counts,
    declared: window.__live.declared,
    nodes: window.__live.nodes.length,
    planes: window.__live.stack.length,
  }));
  check('otro id, la misma escena', fourthInfo.id === FOURTH
    && fourthInfo.counts.nodes === fourthInfo.declared.nodes
    && fourthInfo.counts.segments === fourthInfo.declared.segments
    && fourthInfo.nodes > 0 && fourthInfo.planes === 8,
  `${FOURTH}: ${fourthInfo.counts.nodes} nodos · ${fourthInfo.counts.segments} segmentos · `
  + `${fourthInfo.planes} planos`);
  await closePage(fourth);

  const stripComments = (text) => text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const flowFiles = ['live.mjs', 'depth.mjs', 'bake.mjs', 'index.html', 'live.css'];
  const source = stripComments((await Promise.all(flowFiles.map((file) => readFile(resolve(ROOT, LIVE, file), 'utf8')))).join('\n'));
  const hardcoded = [PRIMARY, FOURTH, 'Lyr', 'Cru', 'Orion', 'Lyra', 'Crux', 'Sagitta']
    .filter((token) => new RegExp(`['"]${token}['"]`).test(source));
  check('el flujo no conoce ningún id', hardcoded.length === 0,
    `${FOURTH} se renderizó con la misma página${hardcoded.length ? `; literales: ${hardcoded.join(', ')}` : ''}`);

  // Los tres píxeles que quedan abiertos: la escena se pintó con el motor real.
  check('el motor es el de la casa', form.timing.bakeSize[0] === 1728 && form.timing.bakeSize[1] === 1080,
    `láminas de ${form.timing.bakeSize[0]}×${form.timing.bakeSize[1]} (margen ${form.timing.margin.join('/')} px) `
    + `· ${num(form.timing.bakeMs)} ms para ${form.stack.length} planos`);

  check('sin errores de página', pageErrors.length === 0,
    pageErrors.length ? pageErrors.slice(0, 3).join(' | ') : 'ni excepciones, ni peticiones fallidas');

  lines.push('');
  lines.push(`PROFUNDIDAD  paso ${num(form.depth.step, 0)} px Z · deriva ${num(form.depth.drift, 2)} · `
    + `perspectiva ${num(form.depth.perspective, 0)} px · zoom ${num(form.depth.zoom, 2)} · `
    + `eje ${form.depth.axis.map((v) => num(v, 2)).join(' / ')}`);
  lines.push(`NÚMEROS  (a) ${num(report.depth.adjacentMin)}–${num(report.depth.adjacentMax)} px entre vecinos, `
    + `${num(report.depth.farNear)} px far→near · (b) ${(report.focus.changed * 100).toFixed(1)} % de píxeles · `
    + `(c) nitidez ${num(report.blur.rest, 2)} → ${num(report.blur.focus, 2)} (${(report.blur.drop * 100).toFixed(0)} % menos) · `
    + `(d) ${num(report.parallax.sky)} / ${num(report.parallax.wash)} / ${num(report.parallax.figure)} px · `
    + `(e) ${report.repro.hash?.slice(0, 20)}…`);
} catch (error) {
  check('la escena completa', false, String(error?.stack ?? error).split('\n').slice(0, 4).join(' · ').slice(0, 800));
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
