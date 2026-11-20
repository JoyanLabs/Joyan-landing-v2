#!/usr/bin/env node
/**
 * LA NEBULOSA CONTRA LA VARA — el grano de las dos, al mismo tamaño.
 * ============================================================================
 * La nebulosa de esta pieza y la de `design-studies/v1/` se hornean acá con la
 * MISMA llamada del motor (`material()` sobre 480 × 300 a celda 3, `transparent`)
 * y se componen como las compone cada escena, en el cuadro de 1 440 × 900. Del
 * resultado se recorta la misma ventana (240 × 160 px) alrededor de la masa de
 * cada nebulosa y se amplía ×2 con vecino más cercano: el grano, no el degradé
 * del escalado.
 *
 * Escribe tres PNG en `capturas/` y, en la última línea, un JSON con las dos
 * cifras que el pedido nombra: peldaños usados y fracción de tinta.
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
import { BAKE, bakeLayers } from './bake.mjs';

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

/** La nebulosa de v1, horneada como la hornea `v1.mjs` —su `bake()`—, sin blur
 * y sin foco: la lámina del cielo y la del lavado, más el ground de v1. */
export function varaSheets() {
  const ground = 'dark';
  const emission = EMISSIONS[ground];
  const dynamic = emissionPlanes(ground);
  const sky = varaMaterial(ground, Math.ceil(CARD.width * 1.6 / 5), Math.ceil(CARD.height * 1.6 / 5), 5,
    (x, y) => emission.baseTone((x / Math.ceil(CARD.width * 1.6 / 5) * 1.6 - 0.3) * 480,
      (y / Math.ceil(CARD.height * 1.6 / 5) * 1.6 - 0.3) * 300));
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
