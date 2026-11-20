/**
 * EL CAMPO DE LA TARJETA, PINTADO POR EL MOTOR — con los planos separados en Z.
 * ============================================================================
 * Una función, sin DOM: recibe el objeto derivado de `data.mjs` y devuelve el
 * RGBA que el motor produce con `renderFrame` + `rasterize`. Corre igual en
 * Node y en el navegador porque el motor es puro (`docs/ESTETICA-CONSTELACION.md`
 * §Reusabilidad del motor), así que la tarjeta no tiene un segundo renderer.
 *
 * LAS CINCO CAPAS las compone `constellation.mjs` en su orden (cielo, lavado,
 * figura en tres planos, viñeta, núcleos). La etapa 3 las separa en profundidad:
 * `isometric.mjs` declara la pila y `buildField` la recorre DE ATRÁS HACIA
 * ADELANTE, una sola vez, aplicando a cada plano su pose (desplazamiento por
 * plano + escala compensada `(P + z) / P`) y su peso. El compuesto resultante
 * entra al motor una sola vez: el dither, la paleta y la máscara siguen siendo
 * los del motor y la tarjeta no tiene un segundo renderer.
 *
 * LOS NÚCLEOS VIAJAN CON SU PLANO. El modelo los suma después de la viñeta
 * («siempre encima de todo»), y por eso la pila los pinta después de la viñeta y
 * exentos de ella — pero a la altura de su plano (+0,18 pasos), porque un núcleo
 * que se queda en otra altura se separa de su estrella: es el defecto que la
 * vara corrigió en `design-studies/v1/hero-field.mjs` (WU150). Los tres planos
 * de núcleos se obtienen del propio modelo, construyendo un layout por plano con
 * sólo sus nodos, así las constantes del núcleo no se duplican acá.
 *
 * TIEMPOS. `timings` separa lo que cuesta cada etapa real del flujo —capas,
 * planos, dither/paleta, raster— porque la pregunta «¿88 serían viables?» se
 * contesta con números y no con una impresión. El layout del modelo se cachea
 * por objeto de constelación: el estado en reposo y el enfocado comparten las
 * láminas y sólo recomponen las poses.
 */

import {
  constellationLayers, figurePocket, paletteTone,
} from '../../../scripts/scene-src/constellation.mjs';
import { rasterize, renderFrame } from '../../../scripts/scene-src/engine.mjs';
import { CARD } from './data.mjs';
import {
  ISO, STACK, blurInto, coverageScale, depthAt, offsetFor, poseFor, projectPoint, samplePlane,
  sourceOf, treatmentFor,
} from './isometric.mjs';

const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** El centro en px del nodo: el modelo lo dibuja en el centro de su celda. */
export const nodePx = (node, cell = CARD.cell) => [
  (node.x * CARD.cols + 0.5) * cell,
  (node.y * CARD.rows + 0.5) * cell,
];

/** Luminancia en espacio de pantalla, la misma convención del motor. */
const lumaOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function statsOf(tone, steps, c) {
  const n = tone.length;
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
      const value = tone[at];
      total += value;
      seen.add(steps[at]);
      if (steps[at] > 0) lit += 1;
      const u = (x + 0.5) / CARD.cols;
      const v = (y + 0.5) / CARD.rows;
      const r2 = ((u - pocket.cx) / pocket.rx) ** 2 + ((v - pocket.cy) / pocket.ry) ** 2;
      if (r2 <= 1) { pocketSum += value; pocketCount += 1; }
      const px = u * width;
      const py = v * height;
      if (px >= calm.x && px < calm.x + calm.w && py >= calm.y && py < calm.y + calm.h) {
        calmSum += value;
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
 * Las láminas del modelo, una por plano, copiadas para que el refresh del
 * layout no las reescriba debajo. Se construyen una vez por constelación: el
 * compuesto de reposo y el enfocado comparten estas láminas.
 */
const SHEETS = new WeakMap();
function sheetsFor(c) {
  const cached = SHEETS.get(c);
  if (cached) return cached;
  const grid = { cols: CARD.cols, rows: CARD.rows, index: CARD.frame };
  const base = constellationLayers(c, grid);
  const sheet = (source) => Float32Array.from(source);
  const figura = {};
  const nucleos = {};
  for (const plane of c.layers.figure.planes) {
    figura[plane] = sheet(base.figureByPlane[plane]);
    // Los núcleos de un plano se piden al modelo con un layout que sólo tiene
    // esos nodos: mismas constantes, mismo cálculo, cero duplicación.
    const nodes = c.nodes.filter((node) => node.plane === plane);
    if (!nodes.length) {
      nucleos[plane] = new Float32Array(CARD.cols * CARD.rows);
      continue;
    }
    const subset = { ...c, nodes, links: [] };
    nucleos[plane] = sheet(constellationLayers(subset, grid).cores);
  }
  const layers = {
    cielo: sheet(base.sky),
    lavado: sheet(base.wash),
    figura,
    nucleos,
    vignette: sheet(base.vignette),
  };
  SHEETS.set(c, layers);
  return layers;
}

/** La lámina de un plano de la pila. */
function sourceFor(entry, layers) {
  if (entry.layer === 'cielo') return layers.cielo;
  if (entry.layer === 'lavado') return layers.lavado;
  if (entry.layer === 'figura') return layers.figura[entry.plane];
  return layers.nucleos[entry.plane];
}

/**
 * El campo completo de una tarjeta, en reposo o con un nodo enfocado.
 * @param {object} data lo que devuelve `cardData(id)` en `data.mjs`
 * @param {{cell?: number, frame?: number, focus?: number|null}} [options]
 *   `focus` es el índice del nodo enfocado (el de `data.constellation.nodes`);
 *   su plano es el que se afirma.
 */
export function buildField(data, options = {}) {
  const cell = options.cell ?? CARD.cell;
  const frameIndex = options.frame ?? CARD.frame;
  const { constellation } = data;
  const cols = CARD.cols;
  const rows = CARD.rows;

  const focus = options.focus ?? null;
  const focusNode = focus === null ? null : Number(focus);
  if (focusNode !== null && (!Number.isInteger(focusNode) || focusNode < 0 || focusNode >= constellation.nodes.length)) {
    throw new RangeError(`focus tiene que ser un índice de nodo (0..${constellation.nodes.length - 1}), no ${focus}`);
  }
  const focusPlane = focusNode === null ? null : constellation.nodes[focusNode].plane;
  const state = focusNode === null ? 'reposo' : 'enfocado';

  const t0 = clock();
  const layers = sheetsFor(constellation);
  const t1 = clock();

  // ---- la pila, de atrás hacia adelante, en el orden declarado ------------
  const depths = STACK.map((entry) => depthAt(entry, focusPlane));
  const zFloor = Math.min(...depths);
  const pocket = figurePocket(constellation);
  const anchor = [pocket.cx * cols, pocket.cy * rows];
  const anchorPx = [anchor[0] * cell, anchor[1] * cell];
  // El piso de escala: la cobertura mínima que piden las láminas que llenan el
  // cuadro (cielo y lavado). Se mide por estado — desplazamiento y cámara
  // incluidos — no se escribe a mano.
  const cover = Math.max(1, ...STACK.filter((entry) => entry.layer === 'cielo' || entry.layer === 'lavado')
    .map((entry) => {
      const z = depths[STACK.indexOf(entry)];
      const { offsetCells, rate } = offsetFor(entry, z, focusPlane, cell);
      const camera = focusPlane ? 1 + (ISO.focus.zoom - 1) * rate : 1;
      return coverageScale(offsetCells, anchor, cols, rows) / camera;
    })) + ISO.coverMargin;
  const tone = new Float32Array(cols * rows);
  const planes = [];
  STACK.forEach((entry, index) => {
    const z = depths[index];
    const pose = poseFor(entry, z, zFloor, focusPlane, cell, cover);
    const treatment = treatmentFor(entry, focusPlane);
    const sampled = samplePlane(sourceFor(entry, layers), { ...pose, sampling: entry.sampling }, { anchor, cols, rows });
    blurInto(sampled, cols, rows, treatment.blurPx, cell);
    // La viñeta cierra el cuadro: multiplica los planos del marco, nunca los
    // núcleos (van después, como en el modelo). La suma es lineal en el tono,
    // así que el orden se ve en la pila y no en un promedio.
    let ink = 0;
    for (let at = 0; at < tone.length; at++) {
      const weighted = sampled[at] * treatment.weight;
      ink += weighted;
      tone[at] += entry.afterVignette ? weighted : weighted * layers.vignette[at];
    }
    planes.push({
      key: entry.key,
      layer: entry.layer,
      plane: entry.plane,
      afterVignette: entry.afterVignette,
      treatment: treatment.treatment,
      z,
      ladder: pose.ladder,
      rate: pose.rate,
      scale: pose.scale,
      offsetPx: pose.offsetPx,
      offsetCells: pose.offsetCells,
      weight: treatment.weight,
      blurPx: treatment.blurPx,
      ink,
    });
  });
  const t2 = clock();

  // ---- la tinta: el motor decide peldaños, paleta y máscara ---------------
  const scene = {
    id: constellation.id,
    label: constellation.name,
    cols,
    rows,
    fps: constellation.cycle.fps,
    cycleFrames: constellation.cycle.frames,
    palette: constellation.palette.stops,
    ground: 0,
    groundHex: constellation.palette.ground,
    field(x, y) {
      return paletteTone(constellation, tone[y * cols + x]);
    },
  };
  const frame = renderFrame(scene, frameIndex, { dither: 'bayer4' });
  const t3 = clock();
  const rgba = rasterize(frame, scene, cell);
  const t4 = clock();

  const stats = statsOf(tone, frame.steps, constellation);

  const rgbaLuma = new Float32Array(cols * rows);
  for (let i = 0; i < rgbaLuma.length; i++) {
    rgbaLuma[i] = lumaOf(rgba[i * 4] / 255, rgba[i * 4 + 1] / 255, rgba[i * 4 + 2] / 255);
  }

  // ---- los nodos: la pose de SU PLANO, nunca una por nodo ----------------
  const modelPx = constellation.nodes.map((node) => nodePx(node, cell));
  const planeOf = (name) => planes.find((entry) => entry.layer === 'figura' && entry.plane === name);
  const screenOf = (point, planeName) => projectPoint(point, planeOf(planeName), anchorPx);
  const nodesPx = constellation.nodes.map((node, index) => screenOf(modelPx[index], node.plane));

  return {
    id: data.id,
    state,
    focusNode,
    focusPlane,
    rgba,
    width: cols * cell,
    height: rows * cell,
    cell,
    cols,
    rows,
    frame: frameIndex,
    p: frameIndex / constellation.cycle.frames,
    nodes: constellation.nodes,
    modelPx,
    nodesPx,
    screenOf,
    sourceOf: (x, y, entry) => sourceOf(x, y, entry, anchor),
    poseOf: planeOf,
    zOf: (name) => depths[STACK.findIndex((candidate) => candidate.layer === 'figura' && candidate.plane === name)],
    zFloor,
    cover,
    planes,
    tone,
    steps: frame.steps,
    stats,
    rgbaLuma,
    timings: {
      sheets: t1 - t0,
      planes: t2 - t1,
      dither: t3 - t2,
      raster: t4 - t3,
      field: t4 - t0,
    },
  };
}
