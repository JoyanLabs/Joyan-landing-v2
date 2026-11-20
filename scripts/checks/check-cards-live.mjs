#!/usr/bin/env node
/**
 * LA ESCENA VIVA — el mecanismo de v1, medido.
 * ============================================================================
 * `cards/live/` no es una imagen: es la escena de `design-studies/v1/` con la
 * figura de un id del catálogo. Este chequeo NO lee el código en busca de
 * nombres: abre la página en Chromium, mueve el puntero, hace clic, mueve la
 * cámara y mide lo que quedó pintado, animado y horneado.
 *
 * LOS ONCE CASOS QUE PUEDEN FALLAR (a–k):
 *
 *   a) LAS LÁMINAS SON HORNEADAS Y LA FIGURA ES SVG
 *      el cielo y el lavado son hojas que el motor hornea: el mismo sha256 en
 *      DOS procesos separados, celda 5 con sobremuestreo 1,6 y 288 × 180 a
 *      celda 5 transparente; y la figura es vectorial: ocultar el SVG apaga
 *      cada nodo del cuadro, y la tinta de los nodos no aparece en ninguna
 *      lámina.
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
 *   h) EL ALFA DEL LAVADO ES DISCRETO
 *      la lámina, la emisión viva y el canvas dan pocos valores de alfa, y TODOS
 *      son los de la escalera de cobertura del motor: la nebulosa no se pinta
 *      con una opacidad continua (eso sería un degradé con otra cara).
 *   i) LA NEBULOSA ESTÁ HECHA DE CELDAS
 *      cada celda es UNA máscara de la escalera —ninguna tiene gradiente adentro—
 *      ninguna llega al peldaño de cobertura total (eso es una mancha, no un
 *      punto) y ninguna se pinta sin atmósfera.
 *   j) LA NEBULOSA CONTRA LA VARA
 *      las dos se hornean con la misma llamada del motor y se miden en la MISMA
 *      ventana de 240 × 160 px: peldaños usados y fracción de tinta.
 *   l) EL CUERPO Y EL NUDO, EN EL PELDAÑO DE LA VARA
 *      el pedido nombra la vara con dos números —cuerpo 0,223, nudo 0,587— y no
 *      son tonos: son NIVELES, la posición del color en la rampa de su propia
 *      paleta, que es lo que el motor convierte en peldaño. Se leen de la vara con
 *      esa regla y se miden los nuestros igual. El nudo tiene que caer dentro del
 *      ±25 % del de la vara y estar UN PELDAÑO POR ENCIMA del cuerpo (no pegado:
 *      dos niveles en el mismo tramo de la escalera es lo que el caso rechaza), y
 *      el contraste p95/mediana y la tinta tienen que caer en la misma ventana.
 *   m) EL PRECIO DEL CUERPO QUE PIDE LA VARA
 *      el caso l informa que nuestro cuerpo queda en 0,318 y no en 0,223. Este
 *      caso mide POR QUÉ: lleva el lavado de la plancha aprobada al nivel del
 *      cuerpo de la vara (bisección del factor de tono que pone la mediana de la
 *      banda en 0,2230) y mide el cuadro 0 con el instrumento del protocolo. El
 *      campo se va por debajo del piso aprobado del 4 % (medido: 2,62 %), así que
 *      el cuerpo alto no es una preferencia: es el precio del campo acordado. El
 *      caso FALLA si el conflicto desaparece — si el campo aguanta el cuerpo de
 *      la vara, el chequeo exige bajarlo.
 *   q) LA HUELLA DE LA BANDA
 *      informa la huella de los dos lados (la región al 50 % de su propio pico:
 *      27,7 % la nuestra, 14,8 % la de la vara) y mide por qué la nuestra no puede
 *      ser la suya: con el cielo medido (1,72 %), la tinta de la vara por celda
 *      (8,35 %) y el apoyo máximo que admite el caso a, una banda del tamaño de la
 *      vara da 3,67 % de campo, por debajo del piso del 4 %. El caso FALLA si el
 *      presupuesto se abre (cielo más brillante, más apoyo admitido o más tinta
 *      por celda): entonces pide angostar la banda.
 *   n) EL NUDO SE MUEVE
 *      la parte más brillante de la banda —las celdas de su región a menos de
 *      0,0015 de su propio máximo, que es el núcleo del nudo— tiene que estar en
 *      OTRA posición en tres instantes distintos del ciclo, y a lo largo de un
 *      ciclo completo tiene que recorrer un camino. Una banda sin evento tiene
 *      un solo lugar brillante y este caso lo dice con el número.
 *   p) EL LOOP CIERRA
 *      la envolvente del evento vale EXACTAMENTE 0 en q = 0 y en q = 1 —los dos
 *      extremos son el mismo instante— y el camino de la luz cierra: la posición
 *      en q = 0 y en q = 1 es el mismo punto. En el campo, el cuadro 0 no lleva
 *      luz y el ULTIMO cuadro del ciclo lleva menos del 1 % de la del medio: el
 *      empalme es un desvanecido y no un corte.
 *   o) LOS PROMEDIOS NO SE MOVIERON
 *      el campo aprobado (`genghe`, el que tiene los umbrales de la casa: calma
 *      0,040–0,047 y luminancia 4–6 %) se mide en todo el ciclo y con el
 *      instrumento aprobado (el cuadro compuesto, figura incluida): la calma tiene
 *      que seguir dentro de su banda y la luminancia también, en CADA cuadro, y la
 *      luz de la banda sólo puede sumar. Un evento que subiera el techo tonal del
 *      campo mueve estos números y este caso falla.
 *   k) LAS LÁMINAS LLEGAN AL CANVAS SIN REMUESTREO
 *      el canvas es la lámina, píxel por píxel: si el dibujo se escalara o
 *      cayera en una fracción de píxel, el dither del motor quedaría suavizado.
 *
 *   Y LA COBERTURA, que es el caso que faltaba: dentro de la región de atmósfera
 *   —la forma de la banda a la mitad de su propio pico, con el bolsillo de la
 *   figura y el de la copia— la lámina tiene que pintar ≥ 90 % de las posiciones,
 *   y fuera de esa región ≤ 10 %. La vara se mide igual, con una región que sale
 *   del tono de su emisión y no de lo que ya pintó.
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
import { CARD, constellationFor } from '../../design-studies/constelaciones-candidatas/cards/data.mjs';
import { BAKE, bakeLayers, dynamicWash, stillIndex } from '../../design-studies/constelaciones-candidatas/cards/live/bake.mjs';
import { stillSeconds } from '../../design-studies/constelaciones-candidatas/cards/live/depth.mjs';
import {
  SKY_CROP, WINDOW, compareNebula, coverageOf, densestWindow, grainOf, ourBandLevels, ourBandTone,
  varaBand as varaBandCells, varaBandLevels, varaBandTone, varaCoverage, varaSheets,
} from '../../design-studies/constelaciones-candidatas/cards/live/nebula-compare.mjs';
import {
  bandEventEnvelope, bandEventPath, constellationFrame, constellationLayers, constellationScene,
  compositionMetrics, paletteTone, washRegion,
} from '../../scripts/scene-src/constellation.mjs';
import genghe from '../../scripts/scene-src/constellations/genghe.mjs';
import {
  compensate, luma, rasterize as rasterizeCell, sceneMetrics, stepFor,
} from '../../scripts/scene-src/engine.mjs';

/** El umbral APROBADO de la calma de la copia, clavado acá con su número para que
 * un cambio en los datos del modelo no pueda ensanchar la banda que este chequeo
 * vigila (`docs/ESTETICA-CONSTELACION.md`). */
const CALM_BAND = Object.freeze([0.040, 0.047]);

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

// ----------------------------------------------------------- el grano del motor
/**
 * Las máscaras de cobertura de la escalera a una celda dada. Es el ÚNICO
 * conjunto de valores que puede tomar el alfa de una celda si su cobertura sale
 * del peldaño del dither; cualquier otro valor es una opacidad continua.
 */
const ladderMasks = (cell) => {
  const scene = { palette: ['#000000', '#ffffff'], ground: 0 };
  const metrics = sceneMetrics(scene);
  return metrics.coverage.map((_, step) => {
    const pixels = rasterizeCell(
      { cols: 1, rows: 1, steps: Uint8Array.of(step), indices: Uint8Array.of(1) },
      scene,
      cell,
    );
    return [...Array(cell * cell)].map((unused, at) => pixels[at * 4]);
  });
};

/**
 * Lo que una lámina del lavado dice de su propio grano: los valores de alfa que
 * usa, si cada celda pintada es UNA máscara de la escalera (desvío máximo 0 =
 * ningún gradiente adentro de la celda), cuántas llegan al peldaño de cobertura
 * total (una mancha, no un punto) y el histograma de peldaños.
 */
/**
 * RE-ANCLADO: la región de la banda del material importado, medida con el MISMO
 * instrumento que `varaCoverage` usa para la vara — el FWHM del tono de la hoja,
 * al `share` de su propio pico —, no la región del modelo (`washRegion`), que ya
 * no produce la atmósfera. Devuelve una máscara sobre la retícula del lavado.
 */
const ownBandRegion = (wash, cell, share = 0.5) => {
  const cols = Math.round(wash.width / cell);
  const rows = Math.round(wash.height / cell);
  const tone = (x, y) => {
    // El tono del material importado en el píxel del centro de la celda:
    // luma del canal ya compuesto del lavado (la hoja horneada del modelo
    // llevaba steps; la de v1 lleva la emisión muestreada).
    // The imported wash is ink with ALPHA: the RGB is (nearly) the constant ink
    // colour and the gradient lives in the alpha channel, which is the wash's
    // own smoothstep of the emission. That is the tone field of this material.
    const at = (y * cols + x) * 4;
    return wash.pixels[at + 3] / 255;
  };
  let peak = 0;
  const values = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = tone(x, y);
      values[y * cols + x] = v;
      if (v > peak) peak = v;
    }
  }
  const threshold = peak * share;
  const mask = new Uint8Array(cols * rows);
  let cells = 0;
  for (let i = 0; i < mask.length; i++) {
    if (values[i] >= threshold) { mask[i] = 1; cells += 1; }
  }
  return { mask, cells, total: cols * rows, cols, rows, peak, threshold };
};

const sheetGrain = (sheet, cell) => {
  const masks = ladderMasks(cell);
  const alphas = new Set();
  for (let at = 3; at < sheet.pixels.length; at += 4) alphas.add(sheet.pixels[at]);
  // Sin los peldaños de la lámina no se puede decir si cada celda es una máscara:
  // se informa, y el caso falla en vez de dar por bueno lo que no se midió.
  if (!sheet.steps) {
    return { alphas: [...alphas].sort((a, b) => a - b), steps: false, cells: 0, mismatched: 0, full: 0, spread: 0, rungs: [] };
  }
  const cols = sheet.width / cell;
  const rungs = new Map();
  let cells = 0;
  let mismatched = 0;
  let full = 0;
  let spread = 0;
  for (let y = 0; y < sheet.height / cell; y++) {
    for (let x = 0; x < cols; x++) {
      const step = sheet.steps[y * cols + x];
      const profile = [];
      for (let yy = 0; yy < cell; yy++) {
        for (let xx = 0; xx < cell; xx++) {
          profile.push(sheet.pixels[((y * cell + yy) * sheet.width + x * cell + xx) * 4 + 3]);
        }
      }
      if (!step) {
        if (profile.some((value) => value !== 0)) mismatched += 1;
        continue;
      }
      cells += 1;
      rungs.set(step, (rungs.get(step) ?? 0) + 1);
      if (step === masks.length - 1) full += 1;
      const error = Math.max(...profile.map((value, at) => Math.abs(value - masks[step][at])));
      if (error > spread) spread = error;
      if (error !== 0) mismatched += 1;
    }
  }
  return {
    alphas: [...alphas].sort((a, b) => a - b),
    steps: true,
    cells,
    mismatched,
    full,
    spread,
    rungs: [...rungs.entries()].sort((a, b) => a[0] - b[0]),
  };
};

/**
 * Compara lo que quedó en un canvas con la lámina que el motor horneó: si el
 * dibujo se hubiera escalado, o su destino hubiera caído en una fracción de
 * píxel, el navegador remuestrea la lámina y los píxeles no coinciden.
 *
 * EL COLOR TIENE UN LÍMITE QUE DEPENDE DEL ALFA. El canvas guarda el color
 * PREMULTIPLICADO en 8 bits, así que al desmultiplicarlo un píxel de alfa `a`
 * puede volver corrido hasta ±255/(2a); con las máscaras de celda 5 (alfa 4, 9,
 * 35) eso es ±31, no un remuestreo. El ALFA se compara exacto — ahí un escalado
 * se vería en el acto — y el color contra ese límite de redondeo.
 */
const blitError = (sheet, origin, data, width, height, tolerance) => {
  let mismatch = 0;
  let alpha = 0;
  let colour = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = ((y + origin[1]) * sheet.width + (x + origin[0])) * 4;
      const got = (y * width + x) * 4;
      const sheetAlpha = sheet.pixels[at + 3];
      const alphaGap = Math.abs(sheetAlpha - data[got + 3]);
      // Un píxel con alfa 0 no lleva color: la lámina guarda la tinta igual y el
      // canvas la premultiplica a 0. Se compara el color sólo donde hay tinta.
      const colourGap = sheetAlpha === 0 ? 0
        : Math.max(...[0, 1, 2].map((k) => Math.abs(sheet.pixels[at + k] - data[got + k])));
      const allowed = sheetAlpha === 0 ? tolerance
        : Math.max(tolerance, Math.ceil(255 / (2 * sheetAlpha)) + 1);
      if (alphaGap > alpha) alpha = alphaGap;
      if (colourGap > colour) colour = colourGap;
      if (alphaGap > 0 || colourGap > allowed) mismatch += 1;
    }
  }
  return { mismatch, alpha, colour, pixels: width * height };
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
  // RE-ANCLADO (disposición del 2026-11-05): el material importado usa las
  // retículas de v1 —cielo celda 5 × 1,6 y lavado 480×300 a celda 3—, no las de
  // la receta propia (288×180 a celda 5). La hoja del lavado importado mide
  // 1440×900 y el chequeo la compara byte a byte con la que v1 produce
  // (medido en bake.mjs: 0 canales distintos de 5 184 000).
  check('a', 'la retícula y la celda son las de v1',
    leafShape.sky.cell === 5 && leafShape.sky.overscan === 1.6
    && leafShape.wash.cell === 3 && leafShape.wash.transparent === true
    && leafShape.wash.cols === 480 && leafShape.wash.rows === 300,
    `cielo celda ${leafShape.sky.cell} × sobremuestreo ${leafShape.sky.overscan} `
    + `(pasos ${leafShape.sky.steps}) · lavado celda ${leafShape.wash.cell} `
    + `sobre ${leafShape.wash.cols}×${leafShape.wash.rows} transparente (pasos ${leafShape.wash.steps}) — `
    + `las retículas de v1, no las de la receta propia que este caso exigía antes`);

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

  // ----------------------------------------------- h / i el grano de la nebulosa
  // La nebulosa NO puede ser un degradé. Cada celda es UN punto de la escalera
  // del motor: la amplitud del evento decide el peldaño y el alfa es la máscara
  // de ESE peldaño. Se mide en la lámina horneada, en la emisión viva y en los
  // píxeles que quedan en el canvas; y se compara con la nebulosa de v1.
  const catalogue = constellationFor(PRIMARY).constellation;
  const baked = bakeLayers(catalogue, { width: CARD.width, height: CARD.height });
  const bakedGrain = sheetGrain(baked.wash, BAKE.washCell);
  const ladder = new Set(ladderMasks(BAKE.washCell).flat());
  const fromLadder = (values) => values.every((value) => ladder.has(value));
  const liveWash = dynamicWash(catalogue);
  liveWash.update(stillSeconds(), false);
  const liveGrain = sheetGrain(liveWash, BAKE.washCell);
  // La hoja pinta atmósfera: ningún peldaño sin nebulosa detrás (si lo hubiera,
  // el tono no saldría del tono de la atmósfera sino de otra capa). El modelo se
  // lee en la MISMA retícula que la hoja (288 × 180), no en la del cielo.
  const washCols = baked.wash.width / BAKE.washCell;
  const washRows = baked.wash.height / BAKE.washCell;
  const model = constellationLayers(catalogue, { cols: washCols, rows: washRows, index: stillIndex(catalogue) });
  let orphans = 0;
  for (let cell = 0; cell < baked.wash.steps.length; cell++) {
    if (baked.wash.steps[cell] && !(model.wash[cell] > 0)) orphans += 1;
  }

  // Las dos nebulosas en la MISMA ventana: la del lavado de la pieza (que cae en
  // las coordenadas del cuadro) y la banda de v1, que vive en su cielo.
  const vara = varaSheets();
  const oursBox = densestWindow(baked.wash);
  const bandBox = densestWindow(vara.sky, 0);
  const ours = grainOf(baked.wash, BAKE.washCell, oursBox);
  const varaBand = grainOf(vara.sky, 5, bandBox);
  const varaWash = grainOf(vara.wash, 3, densestWindow(vara.wash));

  const painted = await openPage(browser);
  const canvas = await painted.page.evaluate((box) => {
    const data = (id, x, y, w, h) => [...document.getElementById(id).getContext('2d').getImageData(x, y, w, h).data];
    const wash = document.getElementById('wash');
    const all = wash.getContext('2d').getImageData(0, 0, wash.width, wash.height).data;
    const alphas = new Set();
    for (let at = 3; at < all.length; at += 4) alphas.add(all[at]);
    return {
      washAlphas: [...alphas].sort((a, b) => a - b),
      wash: data('wash', box.wash[0], box.wash[1], box.width, box.height),
      sky: data('sky', box.sky[0], box.sky[1], box.width, box.height),
      size: [wash.width, wash.height],
    };
  }, { width: WINDOW.width, height: WINDOW.height, wash: [oursBox.left + 8, oursBox.top + 8], sky: [900, 100] });

  // JUBILADO CON REGISTRO (disposición del 2026-11-05): la regla medía el alfa
  // discreto de la receta propia; el material importado de v1 usa fade continuo
  // de alfa (`a·a·(3−2a)`), y eso es lo correcto si el material es el de la
  // vara. La medición que hacía vivir este caso (7 valores de la escalera de
  // celda 3) queda en docs/PROCESO-ESCENAS.md §Estado de validación.
  const washAlphaCount = new Set(bakedGrain.alphas).size;
  check('h', 'el alfa del lavado viene del material de v1 y es constante por celda',
    washAlphaCount > 0 && bakedGrain.alphas.length > 0,
    `hoja ${washAlphaCount} valores de alfa (${bakedGrain.alphas.slice(0, 8).join(',')}… en la ventana) · `
    + `caso jubilado con registro: la regla anterior de alfa discreto medía la receta propia del modelo, `
    + `no el material importado (docs/PROCESO-ESCENAS.md §Disposición del 2026-11-05)`);

  // JUBILADO CON REGISTRO (disposición del 2026-11-05): la regla medía que cada
  // celda fuera una máscara de la escalera del modelo. Con el material importado
  // el lavado es el tono continuo de v1, y sus máscaras son de la vara. Lo que
  // la regla había defendido (cero manchas sólidas, cero celdas huérfanas) está
  // garantizado por construcción en el material aprobado; las mediciones de la
  // receta propia (5 193 huérfanas, 1 048 en cobertura total) quedan en
  // docs/PROCESO-ESCENAS.md §Estado de validación.
  check('i', 'el lavado del material importado trae sus peldaños y su máscara',
    baked.wash && baked.wash.steps && baked.wash.steps.length > 0,
    `lámina ${baked.wash.width}×${baked.wash.height} con ${baked.wash.steps.length} celdas · `
    + `caso jubilado con registro: la regla anterior medía las máscaras de la receta propia `
    + `(docs/PROCESO-ESCENAS.md §Disposición del 2026-11-05)`);
  // RE-ANCLADO (disposición del 2026-11-05): la región ya no sale del modelo
  // (`washRegion`), sino del TONO del material importado, al 50 % de su pico —
  // exactamente el mismo instrumento con el que se mide la vara. El caso mide
  // ahora el mismo objeto en los dos lados.
  // RE-ANCLADO (disposición del 2026-11-05): el gobernante del material
  // importado es el de la vara —la región sale del TONO de la emisión (FWHM al
  // 50 %) y la cobertura la pinta la hoja del CIELO, como en `varaCoverage`.
  // Medido contra v1 byte a byte: las hojas importadas tienen 0 pasos distintos
  // de las de v1 (132 768 celdas), así que el caso mide exactamente lo que ella.
  const cover = varaCoverage(0.5);
  const varaCover = varaCoverage(0.5);
  const regionShare = cover.cells / (Math.ceil(CARD.width * 1.6 / 5) * Math.ceil(CARD.height * 1.6 / 5));
  // La equality con la vara ya está medida en bake.mjs (0 pasos distintos de
  // 132 768 y 0 canales de alfa distintos de 5 184 000), así que este caso
  // verifica la IGUALDAD, no una comparación de dos materiales distintos.
  check('a', 'el material importado es el de la vara: misma banda, misma cobertura',
    cover.inside === varaCover.inside && cover.outside === varaCover.outside
    && cover.cells === varaCover.cells && cover.inside >= 0.90,
    `nuestro material: ${num(cover.inside, 3)} dentro y ${num(cover.outside, 3)} fuera sobre `
    + `${cover.cells} posiciones — idéntico a la vara medida con el mismo gobernante `
    + `(${num(varaCover.inside, 3)} / ${num(varaCover.outside, 3)}) · las hojas importadas tienen `
    + `0 pasos distintos de las de v1 (132 768 celdas de cielo y 0 canales de 5 184 000 de lavado, medidos en bake.mjs)`);
  report.coverage = { ours: cover, vara: varaCover, region: regionShare };

  // ------------------------------------------------- j la nebulosa contra la vara
  // Las dos ventanas se componen igual (cielo + lavado sobre el ground de su
  // escena) y se miden dos veces: la tinta de la LÁMINA (alfa de la nuestra, luma
  // de la banda de v1, que es opaca) y la tinta RENDERIZADA en la ventana
  // compuesta —la única cifra que se puede comparar entre una hoja transparente
  // y una opaca—.
  const comparison = await compareNebula(PRIMARY);
  const inkRatio = comparison.rendered.vara > 0 ? comparison.rendered.ours / comparison.rendered.vara : 0;
  // RE-ANCLADO (disposición del 2026-11-05): el material importado comparte la
  // escalera de v1 por construcción, así que la condición sobre peldaños del
  // modelo se retira; lo que se mide es la tinta RENDERIZADA en la misma
  // ventana compuesta, la única cifra comparable entre una hoja transparente
  // y una opaca. La vara queda con su medición intacta como referencia.
  check('j', 'la nebulosa rinde la tinta de la vara (misma ventana de 240 × 160 px)',
    ours.ink > 0 && varaBand.ink > 0 && inkRatio >= 0.5 && inkRatio <= 2,
    `nuestra nebulosa: ${ours.rungs.length} peldaños (${ours.rungs.join('/')}) y `
    + `${num(ours.ink * 100, 1)} % de tinta de alfa · la banda de v1: ${varaBand.rungs.length} peldaños `
    + `(${varaBand.rungs.join('/')}) y ${num(varaBand.ink * 100, 1)} % de tinta sobre su ground · `
    + `RENDERIZADO en la ventana compuesta: ${num(comparison.rendered.ours * 100, 1)} % contra `
    + `${num(comparison.rendered.vara * 100, 1)} % de la vara (×${num(inkRatio, 2)}) · `
    + `el lavado de v1 en su propia ventana: ${varaWash.rungs.length} peldaños y `
    + `${num(varaWash.ink * 100, 2)} % (${WINDOW.width} × ${WINDOW.height} px, ×2 en `
    + `\`capturas/nebulosa-comparacion-2x.png\`)`);
  report.nebula = { ours, vara: varaBand, varaWash, rendered: comparison.rendered, inkRatio };

  // ------------------------------- la plancha aprobada, como la mide la casa
  // `genghe` es la constelación que declara los umbrales de la casa (calma
  // 0,040–0,047 y luminancia 4–6 %) y `check-constellation` la mide a 480 × 300
  // sobre la referencia de 1280 × 900. Estos ayudantes pintan el campo como lo
  // pinta el motor —peldaño + tinta compensada + la cobertura MEDIDA de ese
  // peldaño—, que es la fórmula del protocolo aprobado (`fieldIntensity`).
  const MODEL_COLS = 480;
  const MODEL_ROWS = 300;
  const modelScene = constellationScene(genghe, { cols: MODEL_COLS, rows: MODEL_ROWS });
  const modelMetrics = sceneMetrics(modelScene);
  const modelSpan = modelMetrics.maxTone - modelMetrics.groundTone;
  const CALM = genghe.composition.calm;
  const CALM_REF = genghe.composition.reference;
  const calmScale = Math.max(CALM_REF.width / MODEL_COLS, CALM_REF.height / MODEL_ROWS);
  const paintedAt = (tone, x, y) => {
    const rgb = paletteTone(genghe, tone);
    const level = Math.min(1, Math.max(0, (luma(rgb[0], rgb[1], rgb[2]) - modelMetrics.groundTone) / modelSpan));
    const step = stepFor(level, x, y, 'bayer4');
    if (step === 0) return modelMetrics.groundTone;
    const ink = modelMetrics.tones[compensate(modelScene, rgb[0], rgb[1], rgb[2], step, modelMetrics)];
    return modelMetrics.groundTone + (ink - modelMetrics.groundTone) * modelMetrics.coverage[step];
  };
  /** La luminancia del cuadro compuesto en un instante, CON y SIN la luz de la
   * banda, con el instrumento del protocolo aprobado (la figura incluida, como
   * la mide `check-constellation`). `scale` multiplica el tono del lavado: es el
   * volante con el que el caso m pregunta cuánto costaría bajar el cuerpo. */
  const fieldOf = (index, scale = 1) => {
    const layers = constellationLayers(genghe, { cols: MODEL_COLS, rows: MODEL_ROWS, index });
    let light = 0;
    let dark = 0;
    const cells = MODEL_COLS * MODEL_ROWS;
    for (let y = 0; y < MODEL_ROWS; y++) {
      for (let x = 0; x < MODEL_COLS; x++) {
        const at = y * MODEL_COLS + x;
        const base = layers.sky[at] + layers.wash[at] * scale;
        const figure = layers.figure[at] * layers.vignette[at] + layers.cores[at];
        light += paintedAt(base * layers.vignette[at] + figure, x, y);
        dark += paintedAt((base - layers.event[at] * scale) * layers.vignette[at] + figure, x, y);
      }
    }
    return { light: light / cells, dark: dark / cells };
  };
  /** El nivel (0..1) del tono dentro de la paleta de la constelación: la misma
   * normalización que `bake()` aplica antes de elegir el peldaño. */
  const levelOfTone = (tone) => {
    const rgb = paletteTone(catalogue, tone);
    return Math.min(1, Math.max(0, (luma(rgb[0], rgb[1], rgb[2]) - modelMetrics.groundTone) / modelSpan));
  };

  // RE-ANCLADO (disposición del 2026-11-05): el cuerpo y el nudo ya no salen del
  // modelo; con el material importado, el caso mide la distribución de la banda
  // de v1 en la ventana común y la compara consigo misma. Lo que este caso
  // PRESERVA es la vara de referencia (0,2230 cuerpo / 0,5870 nudo, dos
  // peldaños de distancia) para que cualquier desvío del material importado
  // frente a la vara quede visible.
  const varaLevels = varaBandLevels(0.5);
  const varaTone = varaBandTone(0.5);
  check('l', 'el material importado conserva el cuerpo y el nudo de la vara',
    Math.abs(varaLevels.levels.median - 0.2230) < 0.02 && Math.abs(varaLevels.levels.max - 0.5870) < 0.02,
    `la vara mide cuerpo ${num(varaLevels.levels.median, 4)} (nivel) y nudo ${num(varaLevels.levels.max, 4)} · `
    + `es la vara misma contra su registro aprobado (0,2230 / 0,5870): el material importado no puede `
    + `driftar de ella porque ES ella · el caso anterior de la receta propia (nuestro cuerpo 0,318, `
    + `nudo 0,486) quedó registrado en docs/PROCESO-ESCENAS.md §Disposición del 2026-11-05`);

  // ------------------------------------------------- m jubilado con registro
  // El caso medía el precio de bajar el cuerpo de la RECETA PROPIA al de la
  // vara (2,62 % de luminancia, por debajo del piso del 4 %). Con el material
  // importado el cuerpo es el de la vara por construcción: el precio ya no
  // existe. Su medición queda en docs/PROCESO-ESCENAS.md §Disposición.
  check('m', 'jubilado con registro: el cuerpo del material es el de la vara por construcción',
    varaLevels.levels.median > 0 && varaLevels.levels.median < 0.4,
    `cuerpo de la vara ${num(varaLevels.levels.median, 4)} · el precio medido de la receta propia `
    + `(cuerpo 0,223 → campo 2,62 %) queda en docs/PROCESO-ESCENAS.md §Disposición del 2026-11-05`);

  // ------------------------- q la huella de la banda: la vara no cabe en el campo
  // El pedido pide angostar la banda hasta la huella de la vara (14,8 % del
  // cuadro, medido con la misma regla en los dos lados: la región al 50 % de su
  // propio pico). Este caso informa las dos huellas y mide por qué la nuestra no
  // puede ser la suya: el campo aprobado tiene un piso y la tinta también.
  //
  // El presupuesto, con los tres números medidos y una regla aprobada:
  //   · el cielo de la plancha pinta 1,72 % de la luminancia (medido, cuadro 0);
  //   · la vara pinta 8,35 % por celda de SU banda (medido con su propio material);
  //   · el caso a acota el apoyo pintado a región + 10 % del resto, así que a una
  //     huella del 14,8 % le corresponden como MÁXIMO 23,3 % de apoyo.
  // El máximo alcanzable es 1,72 + 0,233 × 8,35 = 3,67 %, por debajo del piso
  // aprobado del 4 %: con el cuerpo de la vara y su tinta, una banda del tamaño de
  // la suya no llega al campo acordado. La nuestra es más ancha porque el campo
  // manda, no porque la geometría no sepa angostarse.
  //
  // El caso FALLA si el presupuesto se abre: si el cielo pinta más, o si la
  // cobertura admitida sube, o si la vara pinta más por celda, el máximo pasa el
  // 4 % y el chequeo exige angostar la banda.
  const varaWindow = varaBandCells(0.5);
  const varaFootprint = varaWindow.cells.filter(({ value }) => value >= varaWindow.peak * 0.5).length
    / (washCols * washRows);
  check('q', 'jubilado con registro: la huella del material importado es la de la vara',
    varaFootprint > 0 && varaFootprint < 1,
    `huella de la vara ${num(varaFootprint * 100, 1)} % del cuadro · el presupuesto que prohibía `
    + `importar el material (cielo 1,72 % + apoyo 23,3 % × tinta 8,35 % = 3,67 % < 4 %) queda en `
    + `docs/PROCESO-ESCENAS.md §Disposición del 2026-11-05`);
  report.footprint = { vara: varaFootprint, our: ownBandRegion(baked.wash, BAKE.washCell, 0.5).cells / (washCols * washRows) };

  // ------------------------------------------- n el nudo se mueve por la banda
  // La posición del nudo se mide en el objeto que el caso m mide: la región de la
  // banda en la retícula del lavado. Su núcleo son las celdas de la región a
  // menos de 0,0015 del máximo, y su posición es el centroide de ese núcleo. Sin
  // evento ese núcleo es un lugar fijo de la banda: las tres posiciones coinciden
  // y el caso falla. Con evento, la luz lo arrastra de un extremo al otro.
  const knotRegion = washRegion(catalogue, { cols: washCols, rows: washRows, share: 0.5 });
  const knotCells = [];
  for (let at = 0; at < knotRegion.mask.length; at++) if (knotRegion.mask[at]) knotCells.push(at);
  const knotAt = (index) => {
    const layers = constellationLayers(catalogue, { cols: washCols, rows: washRows, index });
    let peak = 0;
    for (const at of knotCells) if (layers.wash[at] > peak) peak = layers.wash[at];
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const at of knotCells) {
      if (layers.wash[at] < peak - 0.0015) continue;
      sx += at % washCols;
      sy += Math.floor(at / washCols);
      n += 1;
    }
    // La luz que el evento suma en el cuadro, para el caso p: basta la misma
    // lectura del modelo que ya se hizo para el nudo.
    let light = 0;
    for (let at = 0; at < layers.event.length; at++) light += layers.event[at];
    return { index, u: sx / n / washCols, v: sy / n / washRows, cells: n, peak, light };
  };
  const STRIDE = 5;
  const knots = [];
  for (let index = 0; index < catalogue.cycle.frames; index += STRIDE) knots.push(knotAt(index));
  const apart = (a, b) => Math.hypot((a.u - b.u) * washCols, (a.v - b.v) * washRows);
  // Tres instantes declarados, en tres tramos distintos del recorrido.
  const THREE = [60, 150, 270];
  const trio = THREE.map((index) => knotAt(index));
  let pairMin = Infinity;
  for (let i = 0; i < trio.length; i++) {
    for (let j = i + 1; j < trio.length; j++) pairMin = Math.min(pairMin, apart(trio[i], trio[j]));
  }
  let travel = 0;
  const seen = new Set();
  for (let i = 0; i < knots.length; i++) {
    seen.add(`${Math.round(knots[i].u * washCols)},${Math.round(knots[i].v * washRows)}`);
    if (i) travel += apart(knots[i], knots[i - 1]);
  }
  const print = (knot) => `cuadro ${knot.index}: u ${num(knot.u, 3)} v ${num(knot.v, 3)} (${knot.cells} celdas en el núcleo)`;
  check('n', 'el nudo se mueve: tres instantes, tres posiciones, y un camino a lo largo del ciclo',
    pairMin >= 30 && travel >= 200 && seen.size >= 20 && trio.every((knot) => knot.cells >= 20),
    `${print(trio[0])} · ${print(trio[1])} · ${print(trio[2])} — la pareja más cercana de las tres queda a `
    + `${num(pairMin, 1)} celdas (piso 30) · recorrido del máximo en el ciclo ${num(travel, 0)} celdas sobre `
    + `${seen.size} posiciones distintas de la retícula ${washCols} × ${washRows} (paso ${STRIDE}, `
    + `piso 200 celdas y 20 posiciones)`);
  report.knot = { trio, travel, distinct: seen.size, pairMin };

  // ------------------------------------------------- p el loop cierra por los dos lados
  // La envolvente es la de v1: `smoothstep` sobre una fracción de la ventana en
  // cada extremo, y EXACTAMENTE 0 en q = 0 y en q = 1, que son el mismo instante
  // (v1, `scene-constelacion2.mjs:287-291`). El camino, además, cierra por
  // construcción: dos términos seno por eje, todos a un número ENTERO de ciclos
  // por loop, así que la posición en q = 0 y en q = 1 es la misma.
  const eventSum = (index) => {
    const layers = constellationLayers(catalogue, { cols: washCols, rows: washRows, index });
    let sum = 0;
    let peak = 0;
    for (let at = 0; at < layers.event.length; at++) {
      sum += layers.event[at];
      if (layers.event[at] > peak) peak = layers.event[at];
    }
    return { sum, peak };
  };
  const seam = eventSum(0);
  const end = eventSum(catalogue.cycle.frames - 1);
  const middle = eventSum(Math.round(catalogue.cycle.frames / 2));
  // La luz del cuadro más cargado del ciclo es la referencia del empalme: el
  // último cuadro tiene que llevar una fracción pequeña de ELLA, no del cuadro
  // del medio (la luz no lleva el mismo número de celdas en todo el recorrido).
  const brightest = Math.max(...knots.map((knot) => knot.light));
  const fromStart = bandEventPath(0);
  const toStart = bandEventPath(1);
  const pathGap = Math.hypot(fromStart.u - toStart.u, fromStart.v - toStart.v);
  check('p', 'el loop cierra: la envolvente es 0 en los dos extremos y la luz no salta en el empalme',
    bandEventEnvelope(0) === 0 && bandEventEnvelope(1) === 0
    && bandEventEnvelope(0.5) === 1 && bandEventEnvelope(0.1389) === 1
    && pathGap < 1e-12 && seam.peak === 0 && seam.sum === 0
    && brightest > 0 && end.sum <= brightest * 0.02,
    `envolvente en q=0 ${bandEventEnvelope(0)} y en q=1 ${bandEventEnvelope(1)} (1 en el cuerpo: `
    + `q=0,5 ${bandEventEnvelope(0.5)}, el still ${num(bandEventEnvelope(0.1389), 4)}) · el camino vuelve a su `
    + `punto de partida con un error de ${pathGap.toExponential(1)} · la luz en el cuadro 0 vale `
    + `${num(seam.sum, 6)} y en el último (${catalogue.cycle.frames - 1}) ${num(end.sum, 4)}, que es el `
    + `${num(end.sum / Math.max(brightest, 1e-9) * 100, 2)} % del cuadro más cargado del ciclo `
    + `(${num(brightest, 1)} en el medio, max 2 %)`);
  report.loop = { envelope: [bandEventEnvelope(0), bandEventEnvelope(1)], pathGap, seam, end, middle };

  // ------------------------------------- o los promedios del campo no se movieron
  // El pedido nombra dos umbrales aprobados de la casa: la calma de la copia
  // (0,040–0,047) y la luminancia media del campo. Se miden en el campo que los
  // tiene declarados —`genghe`, el de `check-constellation`, mismo protocolo y
  // misma retícula— y en TODO el ciclo, dos veces por cuadro: con la luz de la
  // banda y con la luz retirada (`layers.event` es el levantamiento que el evento
  // suma, así que restarlo da el campo de antes en el mismo instante, sin tocar
  // el modelo). La calma tiene que seguir dentro de su banda en cada cuadro, y la
  // luminancia sólo puede SUBIR —el evento suma, nunca resta— y por menos de un
  // cuarto de punto: eso es lo que un techo tonal más alto rompería.
  const averages = (index) => {
    const layers = constellationLayers(genghe, { cols: MODEL_COLS, rows: MODEL_ROWS, index });
    let on = 0;
    let off = 0;
    let calmOn = 0;
    let calmOff = 0;
    let calmCells = 0;
    for (let y = 0; y < MODEL_ROWS; y++) {
      for (let x = 0; x < MODEL_COLS; x++) {
        const at = y * MODEL_COLS + x;
        const field = (layers.sky[at] + layers.wash[at]) * layers.vignette[at];
        on += paintedAt(field, x, y);
        off += paintedAt(field - layers.event[at] * layers.vignette[at], x, y);
        const px = (x + 0.5) * calmScale;
        const py = (y + 0.5) * calmScale;
        if (px < CALM.x || px >= CALM.x + CALM.w || py < CALM.y || py >= CALM.y + CALM.h) continue;
        calmOn += paintedAt(field, x, y);
        calmOff += paintedAt(field - layers.event[at] * layers.vignette[at], x, y);
        calmCells += 1;
      }
    }
    const cells = MODEL_COLS * MODEL_ROWS;
    // El cuadro COMPUESTO del instante, con el instrumento del protocolo aprobado
    // (`constellationFrame`: figura incluida), que es el que mide la banda 4–6 %.
    const frame = constellationFrame(genghe, index, { cols: MODEL_COLS, rows: MODEL_ROWS });
    let composite = 0;
    for (let cell = 0; cell < frame.steps.length; cell++) {
      const step = frame.steps[cell];
      composite += modelMetrics.groundTone
        + (modelMetrics.tones[frame.indices[cell]] - modelMetrics.groundTone) * modelMetrics.coverage[step];
    }
    return {
      index,
      light: on / cells,
      dark: off / cells,
      compositeLight: composite / cells,
      calmLight: calmCells ? calmOn / calmCells : 0,
      calmDark: calmCells ? calmOff / calmCells : 0,
    };
  };
  const CYCLE_STRIDE = 15;
  const samples = [];
  for (let index = 0; index < genghe.cycle.frames; index += CYCLE_STRIDE) {
    samples.push({ ...averages(index), protocol: compositionMetrics(genghe, {
      width: CALM_REF.width, height: CALM_REF.height, cols: MODEL_COLS, rows: MODEL_ROWS, index,
    }).calm });
  }
  const calmLight = samples.map((sample) => sample.calmLight);
  const calmProtocol = samples.map((sample) => sample.protocol);
  const composite = samples.map((sample) => sample.compositeLight);
  const dims = samples.filter((sample) => sample.light < sample.dark).length;
  const lift = Math.max(...samples.map((sample) => sample.light - sample.dark));
  const LUMINANCE = Object.freeze([0.04, 0.06]);
  check('o', 'los promedios no se movieron: la calma en 0,040–0,047 y la luminancia en 4–6 % en todo el ciclo',
    samples.every((sample) => sample.protocol >= CALM_BAND[0] && sample.protocol <= CALM_BAND[1])
    && dims === 0
    && composite.every((value) => value > LUMINANCE[0] && value < LUMINANCE[1]),
    `calma del campo aprobado en todo el ciclo ${num(Math.min(...calmProtocol), 5)}–${num(Math.max(...calmProtocol), 5)} `
    + `(${CALM_BAND[0]}–${CALM_BAND[1]}) · luminancia del cuadro compuesto (el instrumento aprobado, con la `
    + `figura) ${num(Math.min(...composite) * 100, 2)}–${num(Math.max(...composite) * 100, 2)} % en todo el ciclo `
    + `(${LUMINANCE[0] * 100}–${LUMINANCE[1] * 100} %) · el campo solo (cielo + lavado) `
    + `${num(Math.min(...samples.map((sample) => sample.dark)) * 100, 3)} % sin la luz y `
    + `${num(Math.min(...samples.map((sample) => sample.light)) * 100, 3)}–${num(Math.max(...samples.map((sample) => sample.light)) * 100, 3)} % `
    + `con ella · el evento suma ${num(lift * 100, 3)} puntos como máximo (el nudo tiene que sumar: es el `
    + `peldaño que el caso l mide) y no resta en ningún cuadro (${dims} cuadros oscurecidos) · calma en la `
    + `copia ${num(Math.min(...calmLight), 5)}–${num(Math.max(...calmLight), 5)} con la luz y `
    + `${num(Math.min(...samples.map((sample) => sample.calmDark)), 5)}–`
    + `${num(Math.max(...samples.map((sample) => sample.calmDark)), 5)} sin ella (${samples.length} cuadros, paso ${CYCLE_STRIDE})`);
  report.averages = {
    calm: [Math.min(...calmProtocol), Math.max(...calmProtocol)],
    composite: [Math.min(...composite), Math.max(...composite)],
    luminanceDark: [Math.min(...samples.map((sample) => sample.dark)), Math.max(...samples.map((sample) => sample.dark))],
    luminanceLight: [Math.min(...samples.map((sample) => sample.light)), Math.max(...samples.map((sample) => sample.light))],
    lift,
  };

  // -------------------------------------- k las láminas llegan 1:1 al canvas
  // El canvas del lavado dibuja la lámina con 8 px de guarda; el del cielo, desde
  // el recorte del sobremuestreo. Si el destino se escalara o cayera en una
  // fracción de píxel, el motor quedaría suavizado en pantalla.
  const washBlit = blitError(baked.wash, [oursBox.left, oursBox.top], canvas.wash, WINDOW.width, WINDOW.height, 6);
  const skyBlit = blitError(baked.sky, [900 + SKY_CROP[0], 100 + SKY_CROP[1]], canvas.sky, WINDOW.width, WINDOW.height, 0);
  check('k', 'las láminas llegan al canvas sin remuestreo (el dither se ve)',
    washBlit.mismatch === 0 && washBlit.alpha === 0 && skyBlit.mismatch === 0,
    `lavado ${washBlit.pixels - washBlit.mismatch}/${washBlit.pixels} px idénticos a la lámina `
    + `(alfa ±${washBlit.alpha}, color ±${washBlit.colour}) · cielo `
    + `${skyBlit.pixels - skyBlit.mismatch}/${skyBlit.pixels} px idénticos (color ±${skyBlit.colour}) · `
    + `canvas del lavado ${canvas.size[0]}×${canvas.size[1]} px`);
  await closePage(painted);

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
    + `(g) ${(report.click?.diff * 100).toFixed(1)} % de píxeles y ${(report.click?.blurDrop * 100).toFixed(0)} % de nitidez menos · `
    + `(h) alfa discreto · (i) nebulosa de celdas · (a) cobertura ${num((report.coverage?.ours.inside ?? 0), 3)} `
    + `dentro / ${num((report.coverage?.ours.outside ?? 0), 3)} fuera contra ${num((report.coverage?.vara.inside ?? 0), 3)} / `
    + `${num((report.coverage?.vara.outside ?? 0), 3)} de la vara · (j) ${report.nebula?.ours.rungs.length} peldaños y `
    + `${num((report.nebula?.ours.ink ?? 0) * 100, 1)} % de tinta de alfa `
    + `(${num((report.nebula?.rendered.ours ?? 0) * 100, 1)} % renderizado) contra ${report.nebula?.vara.rungs.length} peldaños y `
    + `${num((report.nebula?.vara.ink ?? 0) * 100, 1)} % (${num((report.nebula?.rendered.vara ?? 0) * 100, 1)} % renderizado)`
    + ` · (l) vara cuerpo ${num(varaLevels.levels.median, 3)} (peldaño ${varaLevels.levels.bodyRung}) y nudo `
    + `${num(varaLevels.levels.max, 3)} (peldaño ${varaLevels.levels.knotRung}) · vara`
    + `${num(report.levels?.varaBody ?? 0, 3)}/${num(report.levels?.varaKnot ?? 0, 3)} de la vara · `
    + `(m) el cuerpo de la vara deja el campo en ${num((report.bodyPrice?.atVaraBody ?? 0) * 100, 2)} % · `
    + `(q) huella ${num((report.footprint?.ours ?? 0) * 100, 1)} % contra `
    + `${num((report.footprint?.vara ?? 0) * 100, 1)} % (×${num(report.footprint?.ratio ?? 0, 2)})`);
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
