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

// ------------------------------------------------------------------ el espacio
/*
 * LA VENTANA Y EL CLIMA — la variante de fondo por espacio
 * (《docs/PROCESO-ESCENAS.md》, §Validación de la dirección, camino recomendado
 * paso 1: «la atmósfera importada acepta parámetros de encuadre sin reescribir
 * su receta»). Un ESPACIO son dos números y un color:
 *
 *   ventana  {x, y} en unidades del mundo (480 × 300). Desplaza de DÓNDE se
 *            muestrea la MISMA hoja: el cielo sigue siendo `baseTone` de la
 *            vara sobre el sobremuestreo 1,6 y el lavado sigue siendo la misma
 *            retícula 480 × 300 con la misma LUT; lo que cambia es la región de
 *            esa hoja que entra en el cuadro. La receta del material no se
 *            toca: no se añade una capa, no se cambia un umbral, no se reescribe
 *            una parada de la paleta.
 *   clima    un hex OSCURO que se mezcla con el ground. Es un tinte, no un color
 *            nuevo: entra por el ground de la viñeta y el de la página, a
 *            `CLIMA_MEZCLA`, y se mide (caso 3 de `check-escenas-variantes`).
 *
 * Los límites los fija la sangre que ya existe, no un número inventado:
 * `paintSky` recorta la hoja en `-width * .24` y el canvas del cielo es 112 %
 * del cuadro con `inset: -6 %`, así que el cuadro lee la hoja desde
 * `crop + bleed` y puede desplazarse hasta que ese recorte toque un borde.
 */

/** La sangre con la que v1 pinta su hoja del cielo (`-width * .24`, v1.mjs:140). */
export const SANGRE_HOJA = 0.24;
/** El canvas del cielo es 112 % del cuadro (`.sky { width/height: 112% }`). */
export const CUADRO_VIVO = 1.12;
/** Y está desplazado un 6 % (`inset: -6 %`), que es la sangre del canvas. */
export const SANGRE_CANVAS = 0.06;
/**
 * La ventana se mide en múltiplos de 4 CELDAS del lavado. No es un capricho de
 * retícula: el paso del bayer4 depende de `(x % 4, y % 4)`, así que un
 * desplazamiento que no sea entero de 4 pondría la lámina horneada y el cuadro
 * del worker de 12 Hz en fases distintas del dither, y el caso i de
 * `check-cards-live` las compara píxel a píxel.
 */
export const VENTANA_CELDAS = 4;
/** Lo que pesa el clima sobre el ground. Es un tinte: 14 % hacia el clima. */
export const CLIMA_MEZCLA = 0.14;

/**
 * La geometría del cuadro sobre la hoja sobremuestreada: el tamaño de la hoja,
 * el del canvas vivo, el recorte con el que el CUADRO lee la hoja y cuánto
 * puede desplazarse ese recorte sin salirse de ella. Es la aritmética de
 * `paintSky`, en un solo sitio para que la página, el registro de espacios y el
 * chequeo no puedan discrepar.
 */
export function skyFrame(width, height) {
  const cell = BAKE.skyCell;
  const sheet = [
    Math.ceil((width * BAKE.overscan) / cell) * cell,
    Math.ceil((height * BAKE.overscan) / cell) * cell,
  ];
  const canvas = [Math.round(width * CUADRO_VIVO), Math.round(height * CUADRO_VIVO)];
  const crop = [Math.round(width * SANGRE_HOJA), Math.round(height * SANGRE_HOJA)];
  const bleed = [Math.round(width * SANGRE_CANVAS), Math.round(height * SANGRE_CANVAS)];
  const recorte = Object.freeze({ left: crop[0] + bleed[0], top: crop[1] + bleed[1], width, height });
  // La holgura de un eje es el mínimo entre lo que sobra por el lado negativo
  // del recorte y lo que sobra por el positivo; en píxeles de la hoja. A
  // unidades del mundo se lleva con el paso real de la hoja (overscan × mundo
  // / ancho de la hoja), que es ~1/3 pero no es exactamente 1/3 porque el
  // número de celdas se redondea hacia arriba.
  const holgura = [
    Math.min(recorte.left, sheet[0] - recorte.left - width),
    Math.min(recorte.top, sheet[1] - recorte.top - height),
  ];
  const eje = (px, world, sheetPx) => Math.floor((px * BAKE.overscan * world) / sheetPx / VENTANA_CELDAS) * VENTANA_CELDAS;
  return Object.freeze({
    sheet: Object.freeze(sheet),
    canvas: Object.freeze(canvas),
    crop: Object.freeze(crop),
    bleed: Object.freeze(bleed),
    recorte,
    ventanaLimite: Object.freeze({
      x: eje(holgura[0], BAKE.grid[0], sheet[0]),
      y: eje(holgura[1], BAKE.grid[1], sheet[1]),
    }),
  });
}

/**
 * El espacio de quien no declara ninguno: el encuadre con el que la escena se
 * horneaba hasta hoy. No es un séptimo espacio del registro —es la ABSENCIA de
 * espacio, y está elegido para que una hoja sin espacio sea byte a byte la de
 * siempre.
 */
export const SIN_ESPACIO = Object.freeze({
  nombre: 'el encuadre de la vara',
  ventana: Object.freeze({ x: 0, y: 0 }),
  clima: null,
});

/** Los errores de una ventana, NOMBRADOS campo por campo. Devuelve la lista en
 * vez de lanzar: el registro quiere poder nombrar todo lo roto de un espacio de
 * una vez. `limite` es `{x, y}` en unidades del mundo (`skyFrame().ventanaLimite`). */
export function ventanaValida(ventana, limite) {
  if (!ventana || !Number.isFinite(ventana.x) || !Number.isFinite(ventana.y)) {
    return ['ventana: tiene que ser {x, y} numérico, en unidades del mundo (480 × 300)'];
  }
  const errores = [];
  for (const eje of ['x', 'y']) {
    const value = ventana[eje];
    if (!Number.isInteger(value)) {
      errores.push(`ventana.${eje}: ${value} no es entero; la ventana se mide en celdas del lavado`);
    } else if (Math.abs(value) > Math.abs(limite[eje])) {
      errores.push(`ventana.${eje}: ${value} se sale del overscan ${BAKE.overscan} — el recorte del cuadro `
        + `sólo puede desplazarse ±${limite[eje]} unidades del mundo dentro de la hoja`);
    } else if (value % VENTANA_CELDAS !== 0) {
      errores.push(`ventana.${eje}: ${value} no es múltiplo de ${VENTANA_CELDAS} celdas; la lámina horneada y la `
        + 'emisión viva caerían en fases distintas del bayer4');
    }
  }
  return errores;
}

/** La ventana validada o un error que dice el campo, el valor y la cota. */
export function ventanaDe(ventana, limite) {
  const errores = ventanaValida(ventana, limite);
  if (errores.length) throw new Error(errores.join(' | '));
  return { x: ventana.x, y: ventana.y };
}

/**
 * El ground del espacio: el del material mezclado con el clima. Con `clima: null`
 * devuelve EXACTAMENTE el ground de la vara, que es lo que hace que un espacio no
 * declarado sea la escena de siempre.
 * @returns {{clima:string|null, rgb:number[], tone:number, mezcla:number}}
 */
export function tinteDe(espacio = SIN_ESPACIO) {
  const clima = espacio?.clima ?? null;
  if (clima === null) {
    return { clima: null, rgb: [...VARA_GROUND_RGB], tone: VARA_GROUND_TONE, mezcla: 0 };
  }
  const rgb = hexToRgb(clima).map((value) => Math.round(value * 255));
  const tintado = VARA_GROUND_RGB.map((value, i) => Math.round(value * (1 - CLIMA_MEZCLA) + rgb[i] * CLIMA_MEZCLA));
  return { clima, rgb: tintado, tone: tone(tintado.map((value) => value / 255)), mezcla: CLIMA_MEZCLA };
}

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
function skySample(x, y, cols, rows, ventana) {
  return vara.baseTone(
    (x / cols * BAKE.overscan - 0.3) * WASH_WORLD[0] + ventana.x,
    (y / rows * BAKE.overscan - 0.3) * WASH_WORLD[1] + ventana.y,
  );
}

/**
 * La hoja del cielo del material, en un instante. El cielo de la vara no depende
 * del tiempo; se hornea una vez por proceso y por cuadro.
 *
 * La `ventana` no añade ninguna receta: desplaza de DÓNDE se lee `baseTone` de la
 * vara dentro del mismo sobremuestreo. Con `{x: 0, y: 0}` es la hoja de siempre,
 * byte a byte.
 */
export function skySheetAt(width, height, ventana = SIN_ESPACIO.ventana) {
  const cols = Math.ceil((width * BAKE.overscan) / BAKE.skyCell);
  const rows = Math.ceil((height * BAKE.overscan) / BAKE.skyCell);
  return varaMaterial(VARA, cols, rows, BAKE.skyCell, (x, y) => skySample(x, y, cols, rows, ventana));
}

/**
 * La hoja del lavado del material en un instante: `material` del motor de la
 * vara sobre 480 × 300 a celda 3, transparente. La muestra es el TONO que el
 * motor convierte en peldaño —el tono base más la emisión—, y el alfa es el
 * smoothstep continuo de la vara sobre la emisión: ninguna celda se decide en
 * una escalera, pero el peldaño de cada una lo siguen decidiendo el nivel, el
 * bayer4 y la máscara de cobertura.
 * Lo que la `ventana` desplaza es el PUNTO DE LECTURA de la misma retícula: la
 * celda (x, y) del lavado toma el tono y la emisión de la celda (x+dx, y+dy) del
 * campo de la vara. Fuera del campo no hay nada que pintar: alfa 0.
 *
 * @param {number} [seconds] el instante del ciclo
 * @param {Float32Array} [dynamic] la emisión ya calculada, para no calcularla dos veces
 * @param {{x:number, y:number}} [ventana] el desplazamiento de lectura, en celdas
 */
export function washSheetAt(seconds = stillSeconds(), dynamic = varaField(seconds), ventana = SIN_ESPACIO.ventana) {
  const [cols, rows] = BAKE.washGrid;
  const emision = (x, y) => {
    const sx = x + ventana.x;
    const sy = y + ventana.y;
    if (sx < 0 || sy < 0 || sx >= cols || sy >= rows) return 0;
    return dynamic[sy * cols + sx];
  };
  return varaMaterial(
    VARA, cols, rows, BAKE.washCell,
    (x, y) => vara.baseTone(x + ventana.x, y + ventana.y) + emision(x, y),
    true,
    (x, y) => {
      const a = Math.min(1, emision(x, y) / VARA_WASH_FLOOR);
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
 * @param {{width:number, height:number, espacio?:object}} frame el cuadro de la
 *   pieza y, si lo hay, el ESPACIO: su ventana desplaza el encuadre del cielo y
 *   del lavado; su clima tiñe el ground. Sin espacio es la escena de siempre.
 */
export function bakeLayers(c, { width, height, espacio = SIN_ESPACIO } = {}) {
  const [cols, rows] = BAKE.grid;
  const frame = skyFrame(width, height);
  const ventana = ventanaDe(espacio?.ventana ?? SIN_ESPACIO.ventana, frame.ventanaLimite);
  const tinte = tinteDe(espacio);
  const layers = constellationLayers(c, { cols, rows, index: stillIndex(c) });
  const seconds = stillSeconds();
  const sky = skySheetAt(width, height, ventana);
  const wash = washSheetAt(seconds, undefined, ventana);
  return {
    sky: { ...sky, transparent: false, base: VARA_GROUND_RGB, ground: VARA_GROUND_TONE },
    wash: { ...wash, transparent: true, base: VARA_GROUND_RGB, ground: VARA_GROUND_TONE },
    focusedWash: { ...desaturated(wash), transparent: true, base: VARA_GROUND_RGB, ground: VARA_GROUND_TONE },
    vignette: bakeVignette(layers.vignette, cols, rows, tinte.rgb),
    /** El ground que se pinta en este espacio: el del material teñido por el
     * clima. `base`/`ground` de las hojas siguen siendo la referencia del
     * material, que es lo que miden `sheetStats` y el runner. */
    tinte,
    espacio: {
      nombre: espacio?.nombre ?? SIN_ESPACIO.nombre,
      ventana: { ...ventana },
      clima: tinte.clima,
      mezcla: tinte.mezcla,
      limite: { ...frame.ventanaLimite },
    },
  };
}

/** La viñeta del modelo aprobado —su forma y su hueco para el texto— con el
 * color del ground del espacio: el de la capa base de la vara teñido por el
 * clima (`tinteDe`), como la hace ella. Sin clima es el ground del material. */
function bakeVignette(grid, cols, rows, ground = VARA_GROUND_RGB) {
  const [w, h] = BAKE.vignette;
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const at = (y * w + x) * 4;
      const value = toneAt(grid, (x / w) * cols, (y / h) * rows, cols, rows);
      pixels.set(ground, at);
      pixels[at + 3] = Math.round(clamp01(1 - value) * 255);
    }
  }
  return { pixels, width: w, height: h };
}

/**
 * Desplaza una hoja de `dynamicMaterial` ENTERA DE CELDAS, conservando el
 * relleno cuadrado de cada celda y dejando ceros donde el campo no llega. Es la
 * misma lectura `(x+dx, y+dy)` que hace `washSheetAt`, aplicada al cuadro del
 * worker: así la lámina horneada y la emisión de 12 Hz del mismo espacio son el
 * mismo material desplazado igual, y no dos implementaciones que puedan discrepar.
 */
function desplazarHoja(source, target, cols, rows, cell, dx, dy) {
  const block = cell * 4; // una celda, en bytes
  const rowBytes = cols * block;
  const x0 = Math.max(0, -dx);
  const x1 = Math.min(cols, cols - dx);
  target.fill(0);
  if (x1 <= x0) return target;
  for (let y = 0; y < rows; y++) {
    const sy = y + dy;
    if (sy < 0 || sy >= rows) continue;
    const from = sy * rowBytes;
    target.set(source.subarray(from + (x0 + dx) * block, from + (x1 + dx) * block), y * rowBytes + x0 * block);
  }
  return target;
}

/**
 * El material dinámico de la emisión de 12 Hz: la `dynamicMaterial` de la vara,
 * que es una LUT por peldaño (16 máscaras bayer4 × 2 048 niveles, más su copia
 * desaturada para el foco) y la máscara de cobertura del peldaño en el alfa. La
 * retícula es la del lavado; no es un parámetro: es la retícula de la vara.
 * Con `ventana` desplaza el cuadro que produce la LUT, celda a celda, por la
 * MISMA regla con la que `washSheetAt` hornea el lavado del espacio: el worker no
 * reimplementa el desplazamiento, lo recibe.
 *
 * @param {object} [_constellation] se ignora: el fondo no sale del catálogo
 * @param {{cols?:number, rows?:number, cell?:number, ventana?:{x:number,y:number}}} [options]
 *   la retícula pedida (por defecto, la de la vara) y la ventana del espacio
 */
export function dynamicWash(_constellation, options = {}) {
  const { ventana = SIN_ESPACIO.ventana, ...reticula } = options;
  const grid = { cols: BAKE.washGrid[0], rows: BAKE.washGrid[1], cell: BAKE.washCell, ...reticula };
  if (grid.cols !== WASH_WORLD[0] || grid.rows !== WASH_WORLD[1] || grid.cell !== BAKE.washCell) {
    throw new Error(
      `dynamicWash: la retícula del lavado es la de la vara (${WASH_WORLD[0]} × ${WASH_WORLD[1]} a celda ${BAKE.washCell}), no ${grid.cols} × ${grid.rows} a celda ${grid.cell}`,
    );
  }
  const [cols, rows] = WASH_WORLD;
  const errores = ventanaValida(ventana, { x: cols, y: rows });
  if (errores.length) throw new Error(`dynamicWash: ${errores.join(' | ')}`);
  const field = varaDynamicMaterial(VARA);
  const desplazada = ventana.x === 0 && ventana.y === 0 ? null : new Uint8ClampedArray(field.pixels.length);
  return {
    pixels: desplazada ?? field.pixels,
    width: field.width,
    height: field.height,
    cols,
    rows,
    cell: BAKE.washCell,
    ventana: { ...ventana },
    /** Alimenta la LUT con la emisión del instante. `focused` usa la copia
     * desaturada de la vara, que es el 10 % hacia la luma aprobado. */
    update(seconds, focused = false) {
      field.update(seconds, focused);
      if (desplazada) desplazarHoja(field.pixels, desplazada, cols, rows, BAKE.washCell, ventana.x, ventana.y);
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
