/**
 * EL CAMPO DE LA TARJETA, PINTADO POR EL MOTOR.
 * ============================================================================
 * Una función, sin DOM: recibe el objeto derivado de `data.mjs` y devuelve el
 * RGBA que el motor produce con `renderFrame` + `rasterize`. Corre igual en
 * Node y en el navegador porque el motor es puro (`docs/ESTETICA-CONSTELACION.md`
 * §Reusabilidad del motor), así que la tarjeta no tiene un segundo renderer.
 *
 * LAS CINCO CAPAS las compone `constellation.mjs` en su orden, y una pasada en
 * frío las construye todas:
 *   1 cielo de puntos · 2 lavado/atmósfera · 3 figura (halos por nodo, en su
 *   plano) · 4 viñeta · 5 núcleos, encima de todo.
 * Los enlaces NO están acá: son la capa SVG de `v1` (`link-behaviours.mjs`,
 * 0,8 / 1,1 / 1,5 px), dibujada sobre el campo de puntos, exactamente como en
 * la vara. El modelo recibe `links: []` para no pintar dos veces la misma red.
 *
 * TIEMPOS. `timings` separa lo que cuesta cada etapa real del flujo —capas,
 * dither/paleta, raster— porque la pregunta «¿88 serían viables?» se contesta
 * con números y no con una impresión.
 */

import {
  constellationLayers, constellationScene, figurePocket,
} from '../../../scripts/scene-src/constellation.mjs';
import { renderFrame, rasterize } from '../../../scripts/scene-src/engine.mjs';
import { CARD } from './data.mjs';

const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** El centro en px del nodo: el modelo lo dibuja en el centro de su celda. */
export const nodePx = (node, cell = CARD.cell) => [
  (node.x * CARD.cols + 0.5) * cell,
  (node.y * CARD.rows + 0.5) * cell,
];

/** Luminancia en espacio de pantalla, la misma convención del motor. */
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function statsOf(composite, steps, c) {
  const n = composite.length;
  const pocket = figurePocket(c);
  const calm = c.composition.calm;
  const { width, height } = CARD;
  let total = 0;
  let pocketSum = 0;
  let pocketCount = 0;
  let calmSum = 0;
  let calmCount = 0;
  let lit = 0;
  const seen = new Set();
  for (let y = 0; y < CARD.rows; y++) {
    for (let x = 0; x < CARD.cols; x++) {
      const at = y * CARD.cols + x;
      const tone = composite[at];
      total += tone;
      seen.add(steps[at]);
      if (steps[at] > 0) lit += 1;
      const u = (x + 0.5) / CARD.cols;
      const v = (y + 0.5) / CARD.rows;
      const r2 = ((u - pocket.cx) / pocket.rx) ** 2 + ((v - pocket.cy) / pocket.ry) ** 2;
      if (r2 <= 1) { pocketSum += tone; pocketCount += 1; }
      const px = u * width;
      const py = v * height;
      if (px >= calm.x && px < calm.x + calm.w && py >= calm.y && py < calm.y + calm.h) {
        calmSum += tone;
        calmCount += 1;
      }
    }
  }
  return {
    distinctSteps: seen.size,
    litShare: lit / n,
    meanTone: total / n,
    figureTone: pocketCount ? pocketSum / pocketCount : 0,
    calmTone: calmCount ? calmSum / calmCount : 0,
  };
}

/**
 * El campo completo de una tarjeta.
 * @param {object} data lo que devuelve `cardData(id)` en `data.mjs`
 * @param {{cell?: number, frame?: number}} [options]
 */
export function buildField(data, options = {}) {
  const cell = options.cell ?? CARD.cell;
  const frameIndex = options.frame ?? CARD.frame;
  const { constellation } = data;

  const t0 = clock();
  const scene = constellationScene(constellation, { cols: CARD.cols, rows: CARD.rows });
  // Una pasada en frío: construye cielo, lavado, viñeta, núcleos y las tablas
  // de halos. Se pide explícitamente para poder medirla aparte del dither.
  const layers = constellationLayers(constellation, { cols: CARD.cols, rows: CARD.rows, index: frameIndex });
  const t1 = clock();

  const frame = renderFrame(scene, frameIndex, { dither: 'bayer4' });
  const t2 = clock();

  const rgba = rasterize(frame, scene, cell);
  const t3 = clock();

  // `constellationLayers` devuelve vistas del layout: se miden y se copian AHORA.
  const composite = Float32Array.from(layers.composite);
  const stats = statsOf(composite, frame.steps, constellation);

  const rgbaLuma = new Float32Array(CARD.cols * CARD.rows);
  for (let i = 0; i < rgbaLuma.length; i++) {
    rgbaLuma[i] = luma(rgba[i * 4] / 255, rgba[i * 4 + 1] / 255, rgba[i * 4 + 2] / 255);
  }

  return {
    id: data.id,
    rgba,
    width: CARD.cols * cell,
    height: CARD.rows * cell,
    cell,
    frame: frameIndex,
    p: frameIndex / constellation.cycle.frames,
    nodesPx: constellation.nodes.map((node) => nodePx(node, cell)),
    steps: frame.steps,
    stats,
    rgbaLuma,
    timings: {
      layers: t1 - t0,
      dither: t2 - t1,
      raster: t3 - t2,
      field: t3 - t0,
    },
  };
}
