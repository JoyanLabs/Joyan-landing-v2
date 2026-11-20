/**
 * HORNEA LA PILA VIVA — cada plano, su propia lámina con transparencia.
 * ============================================================================
 * La tarjeta quieta compone las ocho capas en un solo RGBA opaco. Una escena
 * viva no puede: si el cielo, el lavado y los tres planos de la figura están
 * fundidos en un píxel, no hay nada que mover a velocidades distintas cuando
 * el puntero se mueve, ni nada que desenfocar cuando un nodo se enfoca.
 *
 * Esta pieza hornea CADA plano de `REST_STACK` en su propia lámina:
 *
 *   · la lámina es más grande que el cuadro (1 728 × 1 080 para un cuadro de
 *     1 440 × 900) para que el paralaje y la cámara no descubran un borde;
 *   · el desplazamiento y la escala de reposo del plano se aplican al
 *     muestrear la lámina del modelo (`planeSheets`, las mismas de la tarjeta);
 *   · el cielo y el lavado se muestrean con WRAP: son medios de cuadro completo
 *     y el wrap les permite encogerse (`(P+z)/P` < 1) sin dejar un borde recto
 *     de ground — el defecto que las reglas de composición prohíben. La figura
 *     y los núcleos no se envuelven: son contenido local y fuera de la lámina
 *     valen 0;
 *   · la viñeta multiplica a los planos del marco, nunca a los núcleos (van
 *     después, como en el modelo);
 *   · el motor decide peldaño y paleta (`renderFrame`), y la lámina se vuelve
 *     RGBA TRANSPARENTE con la MISMA máscara medida del motor: alfa = cobertura
 *     del punto, RGB = la tinta que el motor eligió para esa celda. No hay un
 *     segundo renderer ni una máscara inventada.
 *
 * El horneado es determinista: misma entrada, mismas láminas, mismos bytes.
 */

import { paletteTone } from '../../../../scripts/scene-src/constellation.mjs';
import { hexToRgb, rasterize, renderFrame } from '../../../../scripts/scene-src/engine.mjs';
import { CARD } from '../data.mjs';
import { planeSheets } from '../field.mjs';
import { DEPTH, REST_STACK } from './depth.mjs';

/** La grilla de horneado y el margen, en celdas y en px. */
export const BAKE = Object.freeze({
  cell: CARD.cell,
  width: DEPTH.cols * CARD.cell,
  height: DEPTH.rows * CARD.cell,
  marginX: DEPTH.marginPx[0],
  marginY: DEPTH.marginPx[1],
  marginCellsX: DEPTH.marginPx[0] / CARD.cell,
  marginCellsY: DEPTH.marginPx[1] / CARD.cell,
});

/** El blanco/negro que mide la cobertura de cada peldaño, una vez por celda. */
const MASK_SCENE = Object.freeze({
  id: 'mascara',
  cols: 1,
  rows: 1,
  palette: Object.freeze(['#000000', '#FFFFFF']),
  ground: 0,
});

/** Las máscaras de cobertura por peldaño para la celda de la pieza. */
let MASKS = null;
function masksFor(cell) {
  if (MASKS && MASKS.cell === cell) return MASKS.masks;
  const masks = [];
  for (let step = 0; step <= 9; step++) {
    masks.push(rasterize(
      { cols: 1, rows: 1, steps: Uint8Array.of(step), indices: Uint8Array.of(step ? 1 : 0) },
      MASK_SCENE,
      cell,
    ));
  }
  MASKS = { cell, masks };
  return masks;
}

/** Envuelve un índice de celda en [0, size). */
const wrap = (value, size) => ((value % size) + size) % size;

/** Bilineal sin wrap: fuera de la lámina vale 0, no se inventa tinta. */
function fieldAt(source, sx, sy, cols, rows) {
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const tx = sx - x0;
  const ty = sy - y0;
  const inX0 = x0 >= 0 && x0 < cols;
  const inX1 = x0 + 1 >= 0 && x0 + 1 < cols;
  const inY0 = y0 >= 0 && y0 < rows;
  const inY1 = y0 + 1 >= 0 && y0 + 1 < rows;
  let value = 0;
  if (inY0) {
    if (inX0) value += source[y0 * cols + x0] * (1 - tx) * (1 - ty);
    if (inX1) value += source[y0 * cols + x0 + 1] * tx * (1 - ty);
  }
  if (inY1) {
    if (inX0) value += source[(y0 + 1) * cols + x0] * (1 - tx) * ty;
    if (inX1) value += source[(y0 + 1) * cols + x0 + 1] * tx * ty;
  }
  return value;
}

/** Vecino más cercano con wrap: la retícula de estrellas no se interpola. */
function pointAt(source, sx, sy, cols, rows) {
  return source[wrap(Math.round(sy), rows) * cols + wrap(Math.round(sx), cols)];
}

/**
 * La lámina de un plano: su tono muestreado en la grilla grande, con la viñeta
 * ya multiplicada (salvo núcleos) y el motor convertido a RGBA con alfa.
 * @param {object} entry una entrada de `REST_STACK`
 * @param {object} layers las láminas de `planeSheets`
 * @param {object} c la constelación (paleta y receta)
 */
function bakePlane(entry, layers, c, anchor) {
  const cols = DEPTH.cols;
  const rows = DEPTH.rows;
  const cell = BAKE.cell;
  const source = entry.layer === 'cielo' ? layers.cielo
    : entry.layer === 'lavado' ? layers.lavado
      : entry.layer === 'figura' ? layers.figura[entry.plane]
        : layers.nucleos[entry.plane];
  const vignette = layers.vignette;
  const [ox, oy] = [entry.offsetPx[0] / cell, entry.offsetPx[1] / cell];
  const inv = 1 / entry.scale;
  const wrapSource = entry.layer === 'cielo' || entry.layer === 'lavado';
  const pointSampling = entry.sampling === 'point';
  const tone = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    // La celda del cuadro que cae bajo esta celda de la lámina grande.
    const frameY = y - BAKE.marginCellsY;
    const sy = anchor[1] + (frameY + 0.5 - oy - anchor[1]) * inv - 0.5;
    const vy = Math.min(CARD.rows - 1, Math.max(0, Math.round(frameY)));
    for (let x = 0; x < cols; x++) {
      const frameX = x - BAKE.marginCellsX;
      const sx = anchor[0] + (frameX + 0.5 - ox - anchor[0]) * inv - 0.5;
      const value = wrapSource
        ? (pointSampling ? pointAt(source, sx, sy, CARD.cols, CARD.rows)
          : fieldAt(source, wrap(sx, CARD.cols), wrap(sy, CARD.rows), CARD.cols, CARD.rows))
        : (pointSampling ? 0 : fieldAt(source, sx, sy, CARD.cols, CARD.rows));
      if (!entry.afterVignette) {
        const vx = Math.min(CARD.cols - 1, Math.max(0, Math.round(frameX)));
        tone[y * cols + x] = value * vignette[vy * CARD.cols + vx];
      } else {
        tone[y * cols + x] = value;
      }
    }
  }

  const scene = {
    id: `${c.id}:${entry.key}`,
    cols,
    rows,
    palette: c.palette.stops,
    ground: 0,
    field(x, y) {
      return paletteTone(c, tone[y * cols + x]);
    },
  };
  const frame = renderFrame(scene, CARD.frame, { dither: 'bayer4' });
  return { ...transparent(frame, scene, cell), frame };
}

/**
 * El frame del motor como RGBA transparente: alfa = cobertura medida del
 * peldaño, RGB = la tinta que el motor eligió para la celda. Las celdas de
 * peldaño 0 no escriben nada.
 */
export function transparent(frame, scene, cell = BAKE.cell) {
  const cols = frame.cols;
  const rows = frame.rows;
  const width = cols * cell;
  const height = rows * cell;
  const masks = masksFor(cell);
  const inks = scene.palette.map((hex) => hexToRgb(hex).map((value) => Math.round(value * 255)));
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = y * cols + x;
      const step = frame.steps[at];
      if (!step) continue;
      const mask = masks[step];
      const ink = inks[frame.indices[at]] ?? inks[Math.min(step, inks.length - 1)];
      for (let py = 0; py < cell; py++) {
        for (let px = 0; px < cell; px++) {
          const coverage = mask[((py * cell) + px) * 4];
          if (!coverage) continue;
          const out = (((y * cell) + py) * width + (x * cell) + px) * 4;
          rgba[out] = ink[0];
          rgba[out + 1] = ink[1];
          rgba[out + 2] = ink[2];
          rgba[out + 3] = coverage;
        }
      }
    }
  }
  return { width, height, rgba };
}

/**
 * Hornea la pila entera: una lámina por plano, en el orden de `REST_STACK`.
 * @param {object} constellation el objeto de constelación de `data.mjs`
 */
export function bakeStack(constellation, anchor) {
  const layers = planeSheets(constellation);
  return REST_STACK.map((entry) => ({ entry, ...bakePlane(entry, layers, constellation, anchor) }));
}
