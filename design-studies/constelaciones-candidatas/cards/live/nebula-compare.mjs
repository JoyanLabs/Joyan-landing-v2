#!/usr/bin/env node
/**
 * LA NEBULOSA CONTRA LA VARA — el grano de las dos, al mismo tamaño.
 * ============================================================================
 * La nebulosa de esta pieza y la de `design-studies/v1/` se hornean acá con la
 * MISMA llamada del motor —`material()` transparente, celda 5— y se componen como
 * las compone cada escena, en el cuadro de 1 440 × 900. La nuestra sobre 288 × 180
 * (celda 5, la celda de la banda de v1); la de la vara es su cielo, que v1 hornea a
 * celda 5 y dibuja 1:1. Del resultado se recorta la misma ventana (240 × 160 px)
 * alrededor de la masa de cada nebulosa y se amplía ×2 con vecino más cercano: el
 * grano, no el degradé del escalado.
 *
 * Escribe tres PNG en `capturas/` y, en la última línea, un JSON con las cifras
 * que el pedido nombra: peldaños usados, fracción de tinta de cada lámina —alfa en
 * la nuestra, luma en la banda de v1, que es opaca— y la tinta RENDERIZADA de las
 * dos ventanas compuestas, que es la única comparable entre las dos.
 *
 * `varaBandTone` y `ourBandTone` agregan la distribución de TONO de cada banda
 * —mediana, p95, máximo y su contraste— y la tinta que cada peldaño pinta de
 * verdad celda por celda: el primer instrumento dice cuánto sube el pico, el
 * segundo cuánto cubre el punto, y los dos se comparan contra los de la vara.
 *
 *   izq  nuestra nebulosa (capa de lavado + cielo, sobre el ground de la tarjeta)
 *   der  la nebulosa de v1 (su cielo + su lavado, sobre el ground de v1)
 *
 * Uso, desde la raíz del repo:
 *   timeout 180 node design-studies/constelaciones-candidatas/cards/live/nebula-compare.mjs [id]
 *
 * v1 es de SÓLO LECTURA: se importa su `hero-field.mjs` y se llama como lo llama
 * `v1.mjs`; no se toca ni un archivo de la vara.
 */

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { EMISSIONS, HERO_BASES, emissionPlanes, material as varaMaterial } from '../../../v1/hero-field.mjs';
import { CARD, constellationFor, firstCatalogueId } from '../data.mjs';
import { constellationLayers, constellationScene, paletteTone, washRegion } from '../../../../scripts/scene-src/constellation.mjs';
import {
  compensate, hexToRgb, luma, rampLadder, sceneMetrics, stepFor, tone,
} from '../../../../scripts/scene-src/engine.mjs';
import { BAKE, bakeLayers, stillIndex } from './bake.mjs';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const OUT = resolve(here, 'capturas');
export const WINDOW = Object.freeze({ width: 240, height: 160 });
export const ZOOM = 2;
/** La ventana del cielo en el cuadro: el sobremuestreo 1,6 se dibuja 1:1 desde
 * ese desplazamiento (es el mismo de `live.mjs`, `paintSky`). */
export const SKY_CROP = [Math.round(CARD.width * 0.24), Math.round(CARD.height * 0.24)];

/** Una lámina RGBA como buffer de sharp. */
const image = (sheet) => sharp(Buffer.from(sheet.pixels.buffer, sheet.pixels.byteOffset, sheet.pixels.length), {
  raw: { width: sheet.width, height: sheet.height, channels: 4 },
});

/** El centro de la masa de tinta de una lámina, en píxeles de la lámina. */
const centroid = (sheet, channel = 3, floor = 1) => {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < sheet.width; x++) {
      if (sheet.pixels[(y * sheet.width + x) * 4 + channel] <= floor) continue;
      sx += x;
      sy += y;
      n += 1;
    }
  }
  return n ? [Math.round(sx / n), Math.round(sy / n)] : [0, 0];
};

/**
 * La ventana de 240 × 160 con más tinta de una lámina: el recorte se toma donde
 * la nebulosa es, no donde cae su centroide (un centroide incluye el fleco).
 */
export const densestWindow = (sheet, channel = 3) => {
  const integral = new Float64Array((sheet.width + 1) * (sheet.height + 1));
  for (let y = 0; y < sheet.height; y++) {
    let row = 0;
    for (let x = 0; x < sheet.width; x++) {
      row += sheet.pixels[(y * sheet.width + x) * 4 + channel];
      integral[(y + 1) * (sheet.width + 1) + x + 1] = integral[y * (sheet.width + 1) + x + 1] + row;
    }
  }
  const sum = (left, top) => {
    const x0 = left;
    const y0 = top;
    const x1 = left + WINDOW.width;
    const y1 = top + WINDOW.height;
    const row = sheet.width + 1;
    return integral[y1 * row + x1] - integral[y0 * row + x1] - integral[y1 * row + x0] + integral[y0 * row + x0];
  };
  let best = { left: 0, top: 0, total: -1 };
  for (let top = 0; top + WINDOW.height <= sheet.height; top += 1) {
    for (let left = 0; left + WINDOW.width <= sheet.width; left += 1) {
      const total = sum(left, top);
      if (total > best.total) best = { left, top, total };
    }
  }
  return { left: best.left, top: best.top };
};

/** La ventana de 240 × 160 que contiene `centre`, sin salirse de la lámina. */
const windowAt = (centre, sheet) => ({
  left: Math.max(0, Math.min(sheet.width - WINDOW.width, centre[0] - Math.round(WINDOW.width / 2))),
  top: Math.max(0, Math.min(sheet.height - WINDOW.height, centre[1] - Math.round(WINDOW.height / 2))),
});

/**
 * Peldaños usados y fracción de tinta de una lámina dentro de una ventana.
 *
 * La tinta de una lámina TRANSPARENTE es su alfa (lo que el motor pone sobre el
 * fondo); la de una lámina OPACA —el cielo de v1— es cuánto sube su luma sobre el
 * ground de la propia lámina. Son las dos formas que el mecanismo usa; la cifra
 * se informa con la que corresponde y el modo se devuelve con ella.
 */
export function grainOf(sheet, cell, box) {
  const cols = sheet.width / cell;
  const rungs = new Set();
  let ink = 0;
  let cells = 0;
  let opaque = true;
  for (let i = 3; i < sheet.pixels.length; i += 4) if (sheet.pixels[i] !== 255) { opaque = false; break; }
  const luma = (at) => 0.2126 * sheet.pixels[at] + 0.7152 * sheet.pixels[at + 1] + 0.0722 * sheet.pixels[at + 2];
  let ground = 255;
  for (let y = box.top; y < box.top + WINDOW.height; y++) {
    for (let x = box.left; x < box.left + WINDOW.width; x++) {
      const at = (y * sheet.width + x) * 4;
      if (opaque) ground = Math.min(ground, luma(at));
      else ink += sheet.pixels[at + 3] / 255;
    }
  }
  if (opaque) {
    const span = Math.max(1, 255 - ground);
    for (let y = box.top; y < box.top + WINDOW.height; y++) {
      for (let x = box.left; x < box.left + WINDOW.width; x++) {
        ink += Math.max(0, luma((y * sheet.width + x) * 4) - ground) / span;
      }
    }
  }
  for (let y = Math.ceil(box.top / cell); y < Math.floor((box.top + WINDOW.height) / cell) + 1; y++) {
    for (let x = Math.ceil(box.left / cell); x < Math.floor((box.left + WINDOW.width) / cell) + 1; x++) {
      const step = sheet.steps?.[y * cols + x] ?? 0;
      if (!step) continue;
      rungs.add(step);
      cells += 1;
    }
  }
  return {
    mode: opaque ? 'luma' : 'alfa',
    rungs: [...rungs].sort((a, b) => a - b),
    ink: ink / (WINDOW.width * WINDOW.height),
    cells,
  };
}

/**
 * LA BANDA DE v1 COMO DATO — su atmósfera no está declarada como una capa
 * aparte: es el TONO de la emisión, el que `bake()` convierte en peldaño. Esta
 * función devuelve, en las celdas de la ventana visible, ese tono y el pico de
 * la banda, que es contra lo que se corta su región (al mismo corte que la
 * nuestra: la mitad de su propio pico). Una sola lectura para la cobertura y
 * para la distribución de tono, así las dos cifras hablan del mismo objeto.
 * @param {number} [share] el corte de la región, en fracción del pico
 */
export function varaBand(share = 0.5) {
  const ground = 'dark';
  const emission = EMISSIONS[ground];
  const cell = 5;
  const cols = Math.ceil(CARD.width * 1.6 / cell);
  const rows = Math.ceil(CARD.height * 1.6 / cell);
  const sample = (x, y) => emission.baseTone((x / cols * 1.6 - 0.3) * 480, (y / rows * 1.6 - 0.3) * 300);
  const sky = varaMaterial(ground, cols, rows, cell, sample);
  // La ventana visible del cuadro: el cielo se dibuja 1:1 desde el recorte del
  // sobremuestreo, así que sus píxeles visibles son los del marco.
  const left = Math.round(CARD.width * 0.24);
  const top = Math.round(CARD.height * 0.24);
  const right = Math.round(CARD.width * 1.24);
  const bottom = Math.round(CARD.height * 1.24);
  const cells = [];
  let peak = 0;
  for (let y = Math.ceil(top / cell); y < Math.floor(bottom / cell) + 1; y++) {
    for (let x = Math.ceil(left / cell); x < Math.floor(right / cell) + 1; x++) {
      if (y >= rows || x >= cols) continue;
      const value = sample(x, y);
      cells.push({ at: y * cols + x, value });
      if (value > peak) peak = value;
    }
  }
  return { cell, cols, rows, sky, cells, peak, share };
}

/**
 * CUÁNTO PINTA LA VARA SU PROPIA BANDA. La región se mide con ese tono, al mismo
 * corte que la nuestra —la mitad de su propio pico—, y la cobertura es la
 * fracción de esas posiciones que la lámina del cielo pinta (`steps > 0`). Así
 * las dos cifras hablan del mismo objeto: la banda de atmósfera, no el cuadro
 * entero.
 * @param {number} [share] el corte de la región, en fracción del pico
 */
export function varaCoverage(share = 0.5) {
  const { cell, sky, cells, peak } = varaBand(share);
  let inside = 0;
  let inked = 0;
  let outside = 0;
  let outed = 0;
  for (const { at, value } of cells) {
    const painted = sky.steps[at] > 0;
    if (value >= peak * share) {
      inside += 1;
      if (painted) inked += 1;
    } else {
      outside += 1;
      if (painted) outed += 1;
    }
  }
  return {
    cell,
    share,
    peak,
    inside: inside ? inked / inside : 0,
    outside: outside ? outed / outside : 0,
    cells: inside,
    outsideCells: outside,
  };
}

/**
 * LA DISTRIBUCIÓN DE UN TONO: mediana, p95, máximo y contraste (p95 / mediana).
 * Es la forma en que el pedido pide comparar la banda propia con la de la vara:
 * un número por cada lado, y el máximo como tope (no pasarse). El contraste se
 * informa como infinito si la mediana es 0: una banda que es toda agujero no
 * tiene contraste, no lo tiene perfecto.
 * @param {Iterable<number>} values
 */
export function toneStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return { count: 0, median: 0, p95: 0, max: 0, contrast: 0, mean: 0 };
  const at = (share) => sorted[Math.min(sorted.length - 1, Math.floor(share * (sorted.length - 1) + 0.5))];
  const median = at(0.5);
  const p95 = at(0.95);
  return {
    count: sorted.length,
    median,
    p95,
    max: sorted[sorted.length - 1],
    contrast: median > 0 ? p95 / median : Infinity,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
  };
}

/**
 * EL NIVEL DE UN TONO — el instrumento con el que el pedido nombra el cuerpo y el
 * nudo de la vara (cuerpo 0,223, nudo 0,587). Es la posición del color en el
 * rango de SU PROPIA paleta, que es exactamente lo que el motor convierte en
 * peldaño (`level`, el número que entra a `stepFor`), y por eso es el único
 * número que se puede comparar entre dos paletas distintas: el tono crudo de la
 * vara y el nuestro viven en rampas distintas (su ground tiene luma 0,0395 y el
 * nuestro 0,0143), así que el mismo TONO pinta casi el doble de luz en una que
 * en la otra; el mismo NIVEL ocupa el mismo lugar en la rampa y elige el mismo
 * tipo de punto.
 *
 * `rung` es el peldaño que ese nivel ocupa en la escalera de cobertura del motor
 * (el tramo entre dos rungs consecutivos), que es lo que "un peldaño por encima"
 * quiere decir: 0 es el punto más chico y 3 el más grande antes de la cobertura
 * total.
 * @param {Iterable<number>} values
 */
export function levelStats(values) {
  const ladder = rampLadder();
  const rungOf = (level) => {
    let rung = 0;
    for (let i = 0; i < ladder.length; i++) if (level >= ladder[i]) rung = i;
    return rung;
  };
  const stats = toneStats(values);
  return {
    ...stats,
    bodyRung: rungOf(stats.median),
    knotRung: rungOf(stats.max),
    rungGap: rungOf(stats.max) - rungOf(stats.median),
  };
}

/** El nivel de un tono en la paleta de una escena: (luma − ground) / span, la
 * normalización que `material()` y el motor aplican antes de elegir peldaño. */
function levelIn(groundLuma, span, rgb) {
  const level = span > 0 ? (luma(rgb[0], rgb[1], rgb[2]) - groundLuma) / span : 0;
  return level < 0 ? 0 : level > 1 ? 1 : level;
}

/**
 * EL CUERPO Y EL NUDO DE LA VARA, en niveles. La vara no declara un cuerpo ni un
 * nudo: se leen de la distribución de su propia banda —el cuerpo es la mediana y
 * el nudo el máximo—, medidos en la región al 50 % de su pico, que es la misma
 * regla que se le aplica a la nuestra.
 * @param {number} [share] el corte de la región, en fracción del pico
 */
export function varaBandLevels(share = 0.5) {
  const { sky, cells, peak } = varaBand(share);
  const emission = EMISSIONS.dark;
  const scene = emission.constelacion2Scene;
  const metrics = sceneMetrics(scene);
  const tones = scene.palette.map((hex) => tone(hexToRgb(hex)));
  const groundLuma = Math.min(...tones);
  const span = Math.max(...tones) - groundLuma;
  const levels = [];
  const painted = [];
  for (const { at, value } of cells) {
    if (value < peak * share) continue;
    const color = emission.toneColor(value);
    const level = levelIn(groundLuma, span, color);
    levels.push(level);
    // Lo que esa celda PINTA: el peldaño que la lámina de v1 eligió, con la tinta
    // que el motor compensó para él. Es la luminancia por celda de su banda, y es
    // con la que el caso q mide el presupuesto del campo.
    const step = sky.steps[at];
    const ink = step === 0 ? metrics.groundIndex
      : compensate(scene, color[0], color[1], color[2], step, metrics);
    painted.push(metrics.groundTone + (metrics.tones[ink] - metrics.groundTone) * metrics.coverage[step]);
  }
  return {
    share,
    peak,
    levels: levelStats(levels),
    painted: toneStats(painted),
    inkPerCell: painted.reduce((sum, value) => sum + value, 0) / Math.max(1, painted.length),
  };
}

/**
 * EL CUERPO Y EL NUDO DE NUESTRA BANDA, en niveles: la misma lectura que
 * `varaBandLevels`, sobre el tono del lavado en la región del modelo y con la
 * paleta de la constelación.
 * @param {object} c la constelación
 * @param {{cols?: number, rows?: number, share?: number, index?: number}} [options]
 */
export function ourBandLevels(c, options = {}) {
  const cols = options.cols ?? c.stage.cols;
  const rows = options.rows ?? c.stage.rows;
  const share = options.share ?? 0.5;
  const region = washRegion(c, { cols, rows, share });
  const wash = constellationLayers(c, { cols, rows, index: options.index ?? stillIndex(c) }).wash;
  const scene = constellationScene(c, { cols, rows });
  const metrics = sceneMetrics(scene);
  const groundLuma = metrics.groundTone;
  const span = metrics.maxTone - metrics.groundTone;
  const levels = [];
  for (let at = 0; at < region.mask.length; at++) {
    if (region.mask[at]) levels.push(levelIn(groundLuma, span, paletteTone(c, wash[at])));
  }
  return { share, cells: region.cells, levels: levelStats(levels) };
}

/** La cobertura del peldaño, medida en la escena de cada lado: es la tinta que
 * el motor efectivamente pone, no la que la escalera promete. */
const coverageLadder = (scene) => sceneMetrics(scene).coverage;

/**
 * EL TONO Y LA TINTA DE LA BANDA DE LA VARA, en su propia región.
 *
 * `tono` es la posición en la rampa de la emisión —lo que `bake()` convierte en
 * peldaño—; `tinta` es lo que esa posición PINTA, la cobertura del peldaño que
 * el motor eligió para esa celda. Son dos instrumentos del mismo material y los
 * dos se comparan contra los de nuestra banda: el primero dice cuánto sube el
 * pico, el segundo cuánto cubre el punto.
 * @param {number} [share] el corte de la región, en fracción del pico
 */
export function varaBandTone(share = 0.5) {
  const { sky, cells, peak } = varaBand(share);
  const ink = coverageLadder(EMISSIONS.dark.constelacion2Scene);
  const tone = [];
  const painted = [];
  const rungs = new Map();
  for (const { at, value } of cells) {
    if (value < peak * share) continue;
    tone.push(value);
    painted.push(ink[sky.steps[at]]);
    rungs.set(sky.steps[at], (rungs.get(sky.steps[at]) ?? 0) + 1);
  }
  return {
    share,
    peak,
    tone: toneStats(tone),
    ink: toneStats(painted),
    rungs: [...rungs.entries()].sort((a, b) => a[0] - b[0]).map(([step, many]) => [step, many / tone.length]),
  };
}

/**
 * EL TONO Y LA TINTA DE NUESTRA BANDA, en la región del modelo (`washRegion`, la
 * misma que mide la cobertura): el tono del lavado y la cobertura del peldaño
 * que la lámina horneada eligió para esa celda.
 * @param {object} sheet la lámina del lavado (con `steps`)
 * @param {number} cell los px por celda de esa lámina
 * @param {object} options `{constellation, cols, rows, share}`: el modelo y la región
 */
export function ourBandTone(sheet, cell, options = {}) {
  const c = options.constellation;
  const cols = options.cols ?? sheet.width / cell;
  const rows = options.rows ?? sheet.height / cell;
  const share = options.share ?? 0.5;
  const region = washRegion(c, { cols, rows, share });
  const wash = constellationLayers(c, { cols, rows, index: stillIndex(c) }).wash;
  const ink = coverageLadder(constellationScene(c, { cols, rows }));
  const tone = [];
  const painted = [];
  const mix = new Map();
  for (let at = 0; at < region.mask.length; at++) {
    if (!region.mask[at]) continue;
    tone.push(wash[at]);
    painted.push(ink[sheet.steps[at]]);
    mix.set(sheet.steps[at], (mix.get(sheet.steps[at]) ?? 0) + 1);
  }
  return {
    share,
    cells: region.cells,
    tone: toneStats(tone),
    ink: toneStats(painted),
    rungs: [...mix.entries()].sort((a, b) => a[0] - b[0]).map(([step, many]) => [step, many / Math.max(1, tone.length)]),
  };
}

/**
 * La cobertura de una lámina sobre una región: la fracción de posiciones de la
 * región que tienen peldaño (están pintadas) y la de las que no.
 * @param {object} sheet la lámina del motor (con sus `steps`)
 * @param {number} cell los px por celda
 * @param {Uint8Array} mask la región, una posición por celda
 */
export function coverageOf(sheet, cell, mask) {
  let inside = 0;
  let inked = 0;
  let outside = 0;
  let outed = 0;
  for (let at = 0; at < mask.length; at++) {
    const painted = sheet.steps[at] > 0;
    if (mask[at]) {
      inside += 1;
      if (painted) inked += 1;
    } else {
      outside += 1;
      if (painted) outed += 1;
    }
  }
  return {
    inside: inside ? inked / inside : 0,
    outside: outside ? outed / outside : 0,
    cells: inside,
    outsideCells: outside,
  };
}

/** La nebulosa de v1, horneada como la hornea `v1.mjs` —su `bake()`—, sin blur
 * y sin foco: la lámina del cielo y la del lavado, más el ground de v1. */
export function varaSheets() {
  const ground = 'dark';
  const emission = EMISSIONS[ground];
  const dynamic = emissionPlanes(ground);
  const cell = 5;
  const cols = Math.ceil(CARD.width * 1.6 / cell);
  const rows = Math.ceil(CARD.height * 1.6 / cell);
  const sky = varaMaterial(ground, cols, rows, cell,
    (x, y) => emission.baseTone((x / cols * 1.6 - 0.3) * 480, (y / rows * 1.6 - 0.3) * 300));
  const wash = varaMaterial(ground, 480, 300, 3, (x, y) => emission.baseTone(x, y) + dynamic[y * 480 + x], true,
    (x, y) => {
      const a = Math.min(1, dynamic[y * 480 + x] / 0.035);
      return a * a * (3 - 2 * a);
    });
  return { sky, wash, ground: HERO_BASES[ground] };
}

/**
 * Compone cielo + lavado en el cuadro y devuelve la ventana ampliada ×2.
 * El cielo se dibuja 1:1 desde su desplazamiento de sobremuestreo; el lavado
 * entra con su guarda. `washScale` es la escala con la que cada escena dibuja la
 * lámina del lavado (nuestra pieza, 3 px por unidad; v1, `f.scale`).
 */
async function compose({ sky, wash, ground, skyCrop, washOffset, washScale }, box) {
  const size = { width: Math.round(480 * washScale), height: Math.round(300 * washScale) };
  // El cielo se dibuja 1:1 desde su desplazamiento de sobremuestreo; el lavado,
  // con la escala de la escena y su guarda. Las dos ventanas son la misma ventana
  // del cuadro, en las coordenadas de cada lámina.
  const skyInput = await image(sky)
    .extract({ left: box.left + skyCrop[0], top: box.top + skyCrop[1], ...WINDOW })
    .png()
    .toBuffer();
  const layers = [{ input: skyInput, left: 0, top: 0 }];
  if (size.width !== wash.width) {
    // El navegador escala la lámina del lavado, no la recorta: se escala primero
    // y se recorta después, o el recorte caería en las coordenadas equivocadas.
    const resized = await image(wash).resize({ width: size.width, height: size.height, kernel: 'cubic' }).png().toBuffer();
    const { width: sheetW, height: sheetH } = await sharp(resized).metadata();
    const sx = Math.round(box.left - washOffset[0]);
    const sy = Math.round(box.top - washOffset[1]);
    const left = Math.max(0, sx);
    const top = Math.max(0, sy);
    const width = Math.min(WINDOW.width - (left - sx), sheetW - left);
    const height = Math.min(WINDOW.height - (top - sy), sheetH - top);
    if (width > 0 && height > 0) {
      layers.push({
        input: await sharp(resized).extract({ left, top, width, height }).png().toBuffer(),
        left: left - sx,
        top: top - sy,
      });
    }
  } else {
    layers.push({
      input: await image(wash)
        .extract({ left: box.left - washOffset[0], top: box.top - washOffset[1], ...WINDOW })
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    });
  }
  const composed = await sharp({ create: { width: WINDOW.width, height: WINDOW.height, channels: 4, background: ground } })
    .composite(layers)
    .png()
    .toBuffer();
  return sharp(composed)
    .resize({ width: WINDOW.width * ZOOM, height: WINDOW.height * ZOOM, kernel: 'nearest' })
    .png()
    .toBuffer();
}

/**
 * La tinta RENDERIZADA de una ventana compuesta: cuánto sube la luma media sobre
 * el ground de la ventana, en fracción del recorrido. Es la cifra COMPARABLE
 * entre nuestra hoja transparente (que se mide por alfa) y la banda de v1 (que
 * es opaca y se mide por luma): las dos ventanas se componen igual —cielo +
 * lavado sobre el ground de su escena— y se mide lo que se ve.
 */
const renderedInk = async (png) => {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const luma = (at) => 0.2126 * data[at] + 0.7152 * data[at + 1] + 0.0722 * data[at + 2];
  let ground = 255;
  let sum = 0;
  for (let at = 0; at < data.length; at += info.channels) {
    const value = luma(at);
    if (value < ground) ground = value;
    sum += value;
  }
  return (sum / (info.width * info.height) - ground) / Math.max(1, 255 - ground);
};

/**
 * La comparación completa: hornea las dos nebulosas, escribe los recortes ×2 en
 * `capturas/` y devuelve las cifras del pedido —peldaños y fracción de tinta—
 * para la nuestra y para la vara.
 * @param {string} [id] id del catálogo
 */
export async function compareNebula(id = firstCatalogueId()) {
  const catalogue = constellationFor(id).constellation;
  const leaves = bakeLayers(catalogue, { width: CARD.width, height: CARD.height });
  const vara = varaSheets();
  const frame = { width: CARD.width, height: CARD.height };
  // Nuestra nebulosa vive en la lámina del lavado (sus coordenadas son las del
  // cuadro); la de v1, en su cielo, que está sobremuestreado y se pasa a
  // coordenadas del cuadro. Cada ventana se toma donde la masa es, no en el
  // centroide: el centroide incluye el fleco.
  const oursBox = densestWindow(leaves.wash);
  const bandBox = densestWindow(vara.sky, 0);
  const varaBox = { left: bandBox.left - SKY_CROP[0], top: bandBox.top - SKY_CROP[1] };
  const oursWindow = await compose({
    sky: leaves.sky,
    wash: leaves.wash,
    ground: catalogue.palette.ground,
    skyCrop: SKY_CROP,
    washOffset: [0, 0],
    washScale: CARD.cell,
  }, oursBox);
  const varaWindow = await compose({
    sky: vara.sky,
    wash: vara.wash,
    ground: vara.ground,
    skyCrop: SKY_CROP,
    washOffset: [8, 8],
    washScale: 2.4,
  }, varaBox);
  await writeFile(resolve(OUT, `nebulosa-2x-${id}.png`), oursWindow);
  await writeFile(resolve(OUT, 'nebulosa-2x-vara.png'), varaWindow);
  await writeFile(resolve(OUT, `nebulosa-comparacion-2x.png`), await sharp({
    create: { width: WINDOW.width * ZOOM * 2 + 12, height: WINDOW.height * ZOOM, channels: 4, background: '#1b2e2e' },
  }).composite([
    { input: oursWindow, left: 0, top: 0 },
    { input: varaWindow, left: WINDOW.width * ZOOM + 12, top: 0 },
  ]).png().toBuffer());
  return {
    id,
    window: { ...WINDOW, zoom: ZOOM },
    ours: { box: oursBox, ...grainOf(leaves.wash, BAKE.washCell, oursBox) },
    vara: {
      box: varaBox,
      band: grainOf(vara.sky, 5, bandBox),
      wash: grainOf(vara.wash, 3, densestWindow(vara.wash)),
    },
    rendered: { ours: await renderedInk(oursWindow), vara: await renderedInk(varaWindow) },
    out: [
      resolve(OUT, `nebulosa-2x-${id}.png`),
      resolve(OUT, 'nebulosa-2x-vara.png'),
      resolve(OUT, 'nebulosa-comparacion-2x.png'),
    ],
  };
}

// El módulo se puede importar (el chequeo mide con `grainOf` y `varaSheets`); el
// script sólo escribe los PNG cuando se lo llama como programa.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const id = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : firstCatalogueId();
  process.stdout.write(`${JSON.stringify(await compareNebula(id))}\n`);
}
