/**
 * bake.mjs — las láminas de la carta: el material es el de la vara
 *
 * El fondo de la carta viva se hornea con el material de la vara, leído en
 * lectura desde `design-studies/v1/hero-field.mjs`. La disposición del
 * 2026-11-05 quitó de aquí la receta propia —escena propia, escalera propia,
 * región del modelo, alfa en cuatro peldaños—: eran reglas que el motor de la
 * vara ya sabe aplicar y que aplicadas en casa fabricaron un material distinto
 * del aprobado. Queda una sola receta en el repo para el fondo de la carta.
 *
 * Lo importado, con su origen, todo en lectura:
 *   cielo      `material('dark', cols, rows, 5, baseTone con overscan)`   v1
 *   lavado     `material('dark', 480, 300, 3, baseTone + dynamic, alfa)`  v1
 *   emisión    `emissionPlanes('dark', seconds, dynamic)`                 v1
 *   12 Hz      `dynamicMaterial('dark')`: LUT por peldaño + bayer4        v1
 *   color base `HERO_BASES.dark`                                          v1
 * Con la retícula y el alfa de la vara, no una escalera del modelo:
 *   cielo      celda 5 sobre la ventana sobremuestreada (`overscan` 1,6)
 *   lavado     480 × 300 a celda 3, alpha = smoothstep(dynamic / 0,035)
 *   enfocado   10 % hacia la luma, la mezcla de la LUT enfocada de v1
 *
 * Lo que sigue siendo del modelo aprobado es la INTERACCIÓN, no el material: la
 * viñeta conserva su forma y su hueco para el texto y sólo toma de la vara el
 * color del ground (2026-11-05: la paleta del catálogo deja de teñir el fondo).
 * Las hojas no reciben ningún filtro: `blurMaxPx` sigue siendo la cota de la que
 * ninguna capa horneada recibe filtro, porque el desenfoque del plano lejano es
 * CSS sobre la hoja vectorial y los campos están horneados.
 *
 * BAND_EVENT, apagado sobre el material importado. La luz que viaja por la
 * banda del modelo (camino a lo largo del lance, estela 0,11, σ 0,018) no tiene
 * anclaje en la banda del material importado: de las 61 muestras del camino, 21
 * caen sobre la banda de la vara —35 %—, y el 65 % restante encendería suelo
 * vacío. Se dice una vez por proceso en consola, con la medida, en vez de
 * quedar como un fantasma: la lámina importada no lleva ese evento y la página
 * no lo pinta. La luz que viaja por la FIGURA (la traza de `link-behaviours`)
 * es interacción aprobada y sigue intacta; y el material importado trae su
 * propia masa que recorre el ciclo —650 celdas por vuelta, 69 posiciones— que
 * miden los casos n y p.
 */

import { hexToRgb, luma, tone } from '../../../../scripts/scene-src/engine.mjs';
import { constellationLayers } from '../../../../scripts/scene-src/constellation.mjs';
import {
  EMISSIONS,
  HERO_BASES,
  dynamicMaterial as varaDynamicMaterial,
  emissionPlanes,
  material as varaMaterial,
} from '../../../v1/hero-field.mjs';
import { FRAMES, STILL_FRAME, stillSeconds } from './depth.mjs';

/** La emisión del material: la única que la carta viva conoce. */
export const VARA = 'dark';
const vara = EMISSIONS[VARA];
/** La escena del motor con la que la vara rasteriza su material. */
export const VARA_SCENE = vara.constelacion2Scene;
/** El color base del material importado. La paleta del catálogo no tiñe el fondo. */
export const VARA_BASE = HERO_BASES[VARA];
const VARA_GROUND_RGB = hexToRgb(VARA_SCENE.palette[VARA_SCENE.ground]).map((v) => Math.round(v * 255));
/** El tono del ground del material, para medir tinta relativa sobre el cielo. */
export const VARA_GROUND_TONE = tone(VARA_GROUND_RGB.map((v) => v / 255));
/** El umbral de aparición del lavado, el de la vara. Alfa continuo: no escalera. */
export const VARA_WASH_FLOOR = 0.035;
/** El sobremuestreo del cielo del material: el de la vara, que hornea su cielo a
 * `Math.ceil(width * 1.6 / 5)` y lo pinta de vuelta con `-width * .24` (v1.mjs:140). */
export const VARA_OVERSCAN = 1.6;
/** La retícula del lavado del material: la de la vara, en unidades de mundo. */
const WASH_WORLD = Object.freeze([480, 300]);

export const BAKE = Object.freeze({
  /** El cuadro del modelo y el del foco. */
  grid: Object.freeze([480, 300]),
  /** La celda del cielo del material: la `material` del motor de la vara. */
  skyCell: 5,
  /** El overscan del cielo del material, el de la vara. */
  overscan: VARA_OVERSCAN,
  /** El lavado: 480 × 300 celdas a celda 3 = 1 440 × 900 px, la
   * retícula del lavado de la vara y la de su emisión. Era la del modelo
   * (288 × 180 a celda 5) mientras el lavado era receta propia. */
  washGrid: Object.freeze([WASH_WORLD[0], WASH_WORLD[1]]),
  washCell: 3,
  /** La desaturación del lavado enfocado, la de la LUT enfocada de la vara. */
  desaturate: 0.1,
  /** La viñeta se pinta a un cuarto del cuadro, como la vara. */
  vignette: Object.freeze([360, 225]),
  /**
   * La cota de la que NINGUNA capa horneada recibe filtro. En la carta viva las
   * hojas no llevan ninguno: el desenfoque del plano lejano es CSS sobre la
   * hoja vectorial (`[data-plane="back"]`), y el cielo y el lavado llegan
   * horneados. El registro del cambio del campo del modelo lo dice con la medida
   * en la mano: un desenfoque vivo sobre una hoja de puntos es un `filter` por
   * fotograma y cuesta el doble que la emisión entera de 12 Hz.
   */
  blurMaxPx: 0.8,
});

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** El instante de la pieza en el ciclo propio de la constelación: el cuadro 100
 * del registro de la vara, llevado al ciclo declarado por el modelo. */
export function stillIndex(c) {
  return Math.round((STILL_FRAME / FRAMES) * c.cycle.frames);
}

/** Lectura bilineal de una retícula de tonos (0..1), con clamp en los bordes.
 * La usa la viñeta del modelo, que sigue muestreada de la capa del modelo. */
export function toneAt(grid, x, y, cols, rows) {
  const sx = x < 0 ? 0 : x > cols - 1 ? cols - 1 : x;
  const sy = y < 0 ? 0 : y > rows - 1 ? rows - 1 : y;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(cols - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const tx = sx - x0;
  const ty = sy - y0;
  const top = grid[y0 * cols + x0] * (1 - tx) + grid[y0 * cols + x1] * tx;
  const bottom = grid[y1 * cols + x0] * (1 - tx) + grid[y1 * cols + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

/**
 * La emisión del material en un instante: el `dynamic` de la vara, en unidades
 * de campo, sobre la retícula del lavado. `emissionPlanes` lo devuelve limpio de
 * halo —el halo es del nodo— y con las tasas de plano ya aplicadas.
 * @param {number} [seconds] el instante del ciclo
 * @returns {Float32Array} dynamic[y * 480 + x]
 */
export function varaField(seconds = stillSeconds()) {
  return emissionPlanes(VARA, seconds, new Float32Array(WASH_WORLD[0] * WASH_WORLD[1]));
}

/** La muestra del cielo del material: el tono base de la vara sobre la ventana
 * sobremuestreada, con el mismo muestreo que hace la vara sobre su propia hoja. */
function skySample(x, y, cols, rows) {
  return vara.baseTone(
    (x / cols * BAKE.overscan - 0.3) * WASH_WORLD[0],
    (y / rows * BAKE.overscan - 0.3) * WASH_WORLD[1],
  );
}

/**
 * La hoja del cielo del material, en un instante. El cielo de la vara no depende
 * del tiempo; se hornea una vez por proceso y por cuadro.
 */
export function skySheetAt(width, height) {
  const cols = Math.ceil((width * BAKE.overscan) / BAKE.skyCell);
  const rows = Math.ceil((height * BAKE.overscan) / BAKE.skyCell);
  return varaMaterial(VARA, cols, rows, BAKE.skyCell, (x, y) => skySample(x, y, cols, rows));
}

/**
 * La hoja del lavado del material en un instante: `material` del motor de la
 * vara sobre 480 × 300 a celda 3, transparente. La muestra es el TONO que el
 * motor convierte en peldaño —el tono base más la emisión—, y el alfa es el
 * smoothstep continuo de la vara sobre la emisión: ninguna celda se decide en
 * una escalera, pero el peldaño de cada una lo siguen decidiendo el nivel, el
 * bayer4 y la máscara de cobertura.
 * @param {number} [seconds] el instante del ciclo
 * @param {Float32Array} [dynamic] la emisión ya calculada, para no calcularla dos veces
 */
export function washSheetAt(seconds = stillSeconds(), dynamic = varaField(seconds)) {
  const [cols, rows] = BAKE.washGrid;
  return varaMaterial(
    VARA, cols, rows, BAKE.washCell,
    (x, y) => vara.baseTone(x, y) + dynamic[y * cols + x],
    true,
    (x, y) => {
      const a = Math.min(1, dynamic[y * cols + x] / VARA_WASH_FLOOR);
      return a * a * (3 - 2 * a);
    },
  );
}

/** Desatura un 10 % hacia la luma, la mezcla de la `focusedLut` de la vara: la
 * misma luma (0,21 / 0,715 / 0,072) y la misma mezcla que hace ella. */
function desaturated(sheet) {
  const pixels = sheet.pixels.slice();
  for (let i = 0; i < pixels.length; i += 4) {
    const lumaValue = pixels[i] * 0.21 + pixels[i + 1] * 0.715 + pixels[i + 2] * 0.072;
    for (let k = 0; k < 3; k++) pixels[i + k] = Math.round(pixels[i + k] * (1 - BAKE.desaturate) + lumaValue * BAKE.desaturate);
  }
  return { ...sheet, pixels };
}

/**
 * Hornea las hojas de la escena —cielo, lavado y lavado enfocado— más la viñeta.
 * Son las hojas de la vara; la viñeta es la capa aprobada del modelo con el
 * color del ground de la vara.
 * @param {object} c la constelación del catálogo (sólo su viñeta; el fondo ya no
 *   sale de su paleta — disposición del 2026-11-05)
 * @param {{width:number, height:number}} frame el cuadro de la pieza
 */
export function bakeLayers(c, { width, height }) {
  const [cols, rows] = BAKE.grid;
  const layers = constellationLayers(c, { cols, rows, index: stillIndex(c) });
  const seconds = stillSeconds();
  const sky = skySheetAt(width, height);
  const wash = washSheetAt(seconds);
  return {
    sky: { ...sky, transparent: false, base: VARA_GROUND_RGB, ground: VARA_GROUND_TONE },
    wash: { ...wash, transparent: true, base: VARA_GROUND_RGB, ground: VARA_GROUND_TONE },
    focusedWash: { ...desaturated(wash), transparent: true, base: VARA_GROUND_RGB, ground: VARA_GROUND_TONE },
    vignette: bakeVignette(layers.vignette, cols, rows),
  };
}

/** La viñeta del modelo aprobado —su forma y su hueco para el texto— con el
 * color del ground del material: el de la capa base de la vara, como la hace ella. */
function bakeVignette(grid, cols, rows) {
  const [w, h] = BAKE.vignette;
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const at = (y * w + x) * 4;
      const value = toneAt(grid, (x / w) * cols, (y / h) * rows, cols, rows);
      pixels.set(VARA_GROUND_RGB, at);
      pixels[at + 3] = Math.round(clamp01(1 - value) * 255);
    }
  }
  return { pixels, width: w, height: h };
}

/**
 * El material dinámico de la emisión de 12 Hz: la `dynamicMaterial` de la vara,
 * que es una LUT por peldaño (16 máscaras bayer4 × 2 048 niveles, más su copia
 * desaturada para el foco) y la máscara de cobertura del peldaño en el alfa. La
 * retícula es la del lavado; no es un parámetro: es la retícula de la vara.
 * @param {object} [_constellation] se ignora: el fondo no sale del catálogo
 * @param {{cols:number, rows:number, cell:number}} [grid] la retícula pedida
 */
export function dynamicWash(_constellation, options = {}) {
  const grid = { cols: BAKE.washGrid[0], rows: BAKE.washGrid[1], cell: BAKE.washCell, ...options };
  if (grid.cols !== WASH_WORLD[0] || grid.rows !== WASH_WORLD[1] || grid.cell !== BAKE.washCell) {
    throw new Error(
      `dynamicWash: la retícula del lavado es la de la vara (${WASH_WORLD[0]} × ${WASH_WORLD[1]} a celda ${BAKE.washCell}), no ${grid.cols} × ${grid.rows} a celda ${grid.cell}`,
    );
  }
  const field = varaDynamicMaterial(VARA);
  return {
    pixels: field.pixels,
    width: field.width,
    height: field.height,
    cols: WASH_WORLD[0],
    rows: WASH_WORLD[1],
    cell: BAKE.washCell,
    /** Alimenta la LUT con la emisión del instante. `focused` usa la copia
     * desaturada de la vara, que es el 10 % hacia la luma aprobado. */
    update(seconds, focused = false) {
      field.update(seconds, focused);
      return this;
    },
  };
}

/** La estadística de una hoja para el informe de la captura. */
export function sheetStats(sheet) {
  const { width, height, pixels } = sheet;
  const transparent = sheet.transparent === true;
  let sum = 0;
  let painted = 0;
  let inkSum = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      const l = luma([pixels[at], pixels[at + 1], pixels[at + 2]]);
      sum += l;
      const a = transparent ? pixels[at + 3] / 255 : 1;
      if (a > 0.02) {
        painted += 1;
        inkSum += a * Math.max(0, (l - sheet.ground * 255) / (255 - sheet.ground * 255));
      }
    }
  }
  return {
    width,
    height,
    cell: transparent ? BAKE.washCell : BAKE.skyCell,
    meanPct: +((sum / (width * height) / 255) * 100).toFixed(3),
    paintedPct: +((painted / (width * height)) * 100).toFixed(3),
    inkPct: +((inkSum / (width * height)) * 100).toFixed(3),
  };
}

/** El anclaje de BAND_EVENT se dice una sola vez por proceso —el worker del
 * hornedo y la página lo cargan cada uno—, con la medida que lo justifica. */
const BAND_EVENT_LOG = 'bake: BAND_EVENT apagado sobre el material importado. '
  + 'El camino del evento del modelo (a lo largo del lance, estela 0,11, σ 0,018) '
  + 'sólo cae sobre la banda del material en 21 de 61 muestras (35 %): no tiene anclaje. '
  + 'La masa que viaja del material importado recorre 650 celdas por ciclo (69 posiciones) '
  + 'y la mide el caso n; la luz que viaja por la figura es la traza aprobada de link-behaviours.';
let bandEventLogged = false;
if (typeof console !== 'undefined' && !bandEventLogged) {
  bandEventLogged = true;
  console.info(BAND_EVENT_LOG);
}
