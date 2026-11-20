/**
 * LAS LÁMINAS HORNEADAS DE LA ESCENA VIVA — el mecanismo de v1.
 * ============================================================================
 * v1 no pinta el cielo en vivo: lo HORNEA una vez y después sólo compone. Esta
 * pieza hace exactamente lo mismo, con la paleta y la receta de la constelación
 * del catálogo y los mismos primitivos del motor (`stepFor`, `compensate`,
 * `rasterize`), nunca un segundo renderer.
 *
 *   CIELO      `material()` sobre una retícula de celda 5 y sobremuestreo 1,6
 *              (la de v1): cada celda es un `stepFor(level, x, y, 'bayer4')` y
 *              su tinta sale de `compensate`. Es una hoja opaca con su ground.
 *   LAVADO     otra hoja, ésta TRANSPARENTE, sobre la retícula del motor
 *              (480 × 300) a celda 3. La nebulosa está hecha de PUNTOS con la
 *              escalera del motor: la amplitud del evento decide el peldaño
 *              (`stepFor(level, x, y, 'bayer4')`, o sea el tamaño del punto y
 *              su densidad en el Bayer) y el alfa es la MÁSCARA de cobertura de
 *              ese peldaño, nada más. El `smoothstep` de v1 vive sobre la
 *              AMPLITUD del evento (`washAmplitude`), nunca sobre el alfa: una
 *              celda no se apaga con una opacidad continua, se apaga bajando de
 *              peldaño hasta el 0, que es un agujero. Es el grano de la vara.
 *   ENFOCADO   la misma hoja de lavado desaturada un 10 % hacia su luma, que es
 *              el `focusedWash` de v1. El cielo enfocado no se hornea acá: se
 *              hornea en `live.mjs` con `blur(6px)` + downsample ×2, porque
 *              necesita el canvas del navegador.
 *
 * LA FIGURA NO ENTRA EN NINGUNA HOJA. Los nodos y las aristas son SVG
 * vectorial; por eso las láminas llaman a `constellationLayers` y leen `sky`,
 * `wash` y `vignette`, y jamás `figure` ni `cores`. Un nodo pintado por el motor
 * sería un defecto, no un atajo.
 *
 * LA EMISIÓN (12 Hz) reusa el mismo `paletteTone` + `compensate` a través de
 * una LUT de 16 posiciones de Bayer × 2048 tonos — la de v1 —, así el worker no
 * vuelve a decidir color: sólo lee la capa de atmósfera del instante. El cielo
 * horneado no se recalcula nunca.
 */

import {
  compensate, hexToRgb, rasterize, sceneMetrics, stepFor, tone,
} from '../../../../scripts/scene-src/engine.mjs';
import {
  constellationLayers, constellationScene, paletteTone,
} from '../../../../scripts/scene-src/constellation.mjs';
import { CYCLE_SECONDS, FRAMES, STILL_FRAME, wrap01 } from './depth.mjs';

/** Los números del horneado, los de v1. */
export const BAKE = Object.freeze({
  /** La retícula del motor: 480 × 300 celdas = el mundo de 480 × 300 unidades. */
  grid: Object.freeze([480, 300]),
  /** El cielo: celda 5 y sobremuestreo 1,6, como v1 (461 × 288 celdas =
   * 2 305 × 1 440 px para un cuadro de 1 440 × 900). */
  skyCell: 5,
  overscan: 1.6,
  /** El lavado: la retícula del motor a celda 3 → 1 440 × 900 px. */
  washCell: 3,
  /** La desaturación del lavado enfocado, la de v1. */
  desaturate: 0.1,
  /** La viñeta se pinta a un cuarto del cuadro, como v1. */
  vignette: Object.freeze([360, 225]),
});

const SCENES = new WeakMap();

/** La escena del motor de una constelación, una sola vez por objeto: `sceneMetrics`
 * se cachea POR objeto, y dos escenas distintas pagarían la medición dos veces. */
function sceneOf(c) {
  let scene = SCENES.get(c);
  if (!scene) {
    scene = constellationScene(c);
    SCENES.set(c, scene);
  }
  return scene;
}

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);
const smoothstep = (p) => p * p * (3 - 2 * p);
/** La banda de amplitud del lavado: dónde arranca y hasta dónde sube la nube. */
const WASH_AMPLITUDE = Object.freeze({ floor: 0.30, ceiling: 0.78 });

/**
 * LA AMPLITUD DEL EVENTO. El modelo entrega la densidad de la nube (0..1, y no
 * un tono); el `smoothstep` de v1 vive acá. Con más amplitud la celda sube de
 * peldaño —punto más grande, y más denso en el Bayer— y con menos baja hasta el
 * 0, que es un agujero: la masa de la nube la lleva la escalera, no una
 * opacidad. Un `step` de cobertura nunca se modula con esto.
 *
 * LA NUBE VIVE EN UNA BANDA DE PELDAÑOS, no en todo el rango.
 *
 *   TECHO   el peldaño más alto de la escalera es el disco inscripto: cubre la
 *           celda ENTERA, así que una nube que llegue a él deja de ser puntos y
 *           se vuelve una mancha sólida —la «nube lisa» que la vara no tiene—.
 *   PISO    una celda CON atmósfera arranca en el peldaño de grano y sube desde
 *           ahí. Si no, la capa más tenue del modelo se apaga en tintas oscuras
 *           (el motor compensa la tinta del peldaño, y un tono muy bajo pide una
 *           tinta casi tan oscura como el ground) y la nube desaparece en vez de
 *           adelgazarse: la nebulosa pierde la masa que el desplazamiento
 *           aprobado sí tenía.
 *
 * Así el borde de la nube está donde los puntos SE ACABAN (densidad 0 → celda 0
 * → agujero), no donde se apagan, que es la regla del modelo de la atmósfera.
 * @param {number} density densidad de la nube en 0..1
 * @returns {number} amplitud del evento en 0..1
 */
export function washAmplitude(density) {
  if (!(density > 0)) return 0;
  const { floor, ceiling } = WASH_AMPLITUDE;
  return floor + (ceiling - floor) * smoothstep(clamp01(density));
}

/** El instante de la pieza en el ciclo propio de la constelación: el cuadro 100
 * del registro de v1, llevado al ciclo declarado por el modelo. */
export function stillIndex(c) {
  return Math.round((STILL_FRAME / FRAMES) * c.cycle.frames);
}

/** Lectura bilineal de una retícula de tonos (0..1), con clamp en los bordes. */
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
 * La hoja de puntos del motor. Es `material()` de v1/`hero-field.mjs`, con la
 * única diferencia de que el color de un tono lo decide la paleta de la
 * constelación (`paletteTone`) en vez de la emisión fija de v1. El peldaño, la
 * compensación y la máscara son los del motor.
 * @param {object} c la constelación del catálogo
 * @param {number} cols @param {number} rows @param {number} cell
 * @param {(x:number,y:number)=>number} sample tono 0..1 de la celda
 * @param {boolean} [transparent] alfa por cobertura en vez de ground opaco
 */
export function material(c, cols, rows, cell, sample, transparent = false) {
  const scene = sceneOf(c);
  const metrics = sceneMetrics(scene);
  const tones = c.palette.stops.map((hex) => tone(hexToRgb(hex)));
  const lo = Math.min(...tones);
  const span = Math.max(...tones) - lo;
  const steps = new Uint8Array(cols * rows);
  const indices = new Uint8Array(cols * rows);
  const histogram = new Array(c.palette.stops.length).fill(0);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = y * cols + x;
      const amount = sample(x, y);
      const color = paletteTone(c, amount);
      const level = (tone(color) - lo) / span;
      const step = stepFor(level, x, y, 'bayer4');
      steps[at] = step;
      indices[at] = step ? compensate(scene, ...color, step, metrics) : scene.ground;
      if (step) histogram[indices[at]]++;
    }
  }
  const frame = { cols, rows, steps, indices };
  const pixels = rasterize(frame, scene, cell);
  if (transparent) {
    const inks = c.palette.stops.map(hexToRgb);
    const masks = metrics.coverage.map((_, step) => rasterize(
      { cols: 1, rows: 1, steps: Uint8Array.of(step), indices: Uint8Array.of(1) },
      { palette: ['#000000', '#FFFFFF'], ground: 0 },
      cell,
    ));
    for (let y = 0; y < rows * cell; y++) {
      for (let x = 0; x < cols * cell; x++) {
        const at = Math.floor(y / cell) * cols + Math.floor(x / cell);
        const offset = (y * cols * cell + x) * 4;
        const mask = masks[steps[at]][((y % cell) * cell + x % cell) * 4];
        const ink = inks[indices[at]];
        for (let k = 0; k < 3; k++) pixels[offset + k] = Math.round(ink[k] * 255);
        // El alfa ES la máscara de cobertura del peldaño. No hay un segundo canal
        // de opacidad: si lo hubiera, la nube volvería a ser un degradé.
        pixels[offset + 3] = Math.round(mask);
      }
    }
  }
  return { pixels, width: cols * cell, height: rows * cell, histogram, palette: c.palette.stops, steps, indices };
}

/** Desatura un 10 % hacia la luma, como el `focusedWash` de v1. */
function desaturated(sheet) {
  const pixels = sheet.pixels.slice();
  for (let i = 0; i < pixels.length; i += 4) {
    const luma = pixels[i] * 0.213 + pixels[i + 1] * 0.715 + pixels[i + 2] * 0.072;
    for (let k = 0; k < 3; k++) pixels[i + k] = Math.round(pixels[i + k] * (1 - BAKE.desaturate) + luma * BAKE.desaturate);
  }
  return { ...sheet, pixels };
}

/**
 * Hornea las tres hojas de la escena —cielo, lavado y lavado enfocado— más la
 * viñeta. Es `bake()` de v1, con la retícula del modelo como fuente de tono.
 * @param {object} c la constelación del catálogo
 * @param {{width:number, height:number}} frame el cuadro de la pieza
 */
export function bakeLayers(c, { width, height }) {
  const [cols, rows] = BAKE.grid;
  const layers = constellationLayers(c, { cols, rows, index: stillIndex(c) });
  const skyGrid = layers.sky;
  const washGrid = layers.wash;
  // El cielo: celda 5 sobre la ventana sobremuestreada de v1, muestreada del
  // tono del modelo con bilineal (la retícula mide 3 px por celda y la hoja, 5).
  const skyCols = Math.ceil((width * BAKE.overscan) / BAKE.skyCell);
  const skyRows = Math.ceil((height * BAKE.overscan) / BAKE.skyCell);
  const sky = material(c, skyCols, skyRows, BAKE.skyCell, (x, y) => {
    // Muestreo por vecino: el tono del cielo del modelo es un campo POR CELDA
    // (polvo discreto, no una función analítica como el de v1). Interpolar
    // repartiría cada mota entre sus vecinas y convertiría un cielo de motas
    // en una alfombra pareja: el defecto que el proceso prohíbe.
    const gx = Math.min(cols - 1, Math.max(0, Math.round((x / skyCols * BAKE.overscan - 0.3) * cols)));
    const gy = Math.min(rows - 1, Math.max(0, Math.round((y / skyRows * BAKE.overscan - 0.3) * rows)));
    return skyGrid[gy * cols + gx];
  });
  // El lavado: la MISMA `material()` del motor sobre la retícula 480 × 300 a
  // celda 3, transparente. La muestra es la AMPLITUD de la nebulosa —el tono que
  // el motor convierte en peldaño—, y el alfa sale de la máscara de ese peldaño.
  // El tono del cielo no entra acá: donde el modelo no tiene atmósfera la celda
  // baja a 0 y la hoja queda agujereada, en vez de sembrar polvo en otro plano.
  const wash = material(
    c, cols, rows, BAKE.washCell,
    (x, y) => washAmplitude(washGrid[y * cols + x]),
    true,
  );
  return { sky, wash, focusedWash: desaturated(wash), vignette: bakeVignette(c, layers.vignette, cols, rows) };
}

/** La viñeta de v1: el color del ground y el alfa de la capa del modelo. */
function bakeVignette(c, grid, cols, rows) {
  const [w, h] = BAKE.vignette;
  const ground = hexToRgb(c.palette.ground).map((value) => Math.round(value * 255));
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const at = (y * w + x) * 4;
      const value = toneAt(grid, (x / w) * cols, (y / h) * rows, cols, rows);
      pixels.set(ground, at);
      pixels[at + 3] = Math.round(clamp01(1 - value) * 255);
    }
  }
  return { width: w, height: h, pixels };
}

/**
 * La emisión de la atmósfera a 12 Hz, sin tocar el cielo horneado. Es
 * `dynamicMaterial()` de v1: una LUT de 16 posiciones de Bayer × 2048 tonos
 * —peldaño + tinta compensada— y, por cuadro, sólo la capa de lavado del
 * instante. La cobertura sigue saliendo del PELDAÑO que elige la LUT (el mismo
 * `stepFor` del horneado) y el alfa de la máscara: la emisión viva tiene el
 * mismo grano que la hoja, no un degradé.
 *
 * `update` REUSA los buffers: el worker pide un cuadro cada 83,3 ms y no puede
 * estar reservando 5 MB por vez.
 * @param {object} c la constelación del catálogo
 * @param {{cols?:number, rows?:number, cell?:number}} [options]
 */
export function dynamicWash(c, options = {}) {
  const cols = options.cols ?? BAKE.grid[0];
  const rows = options.rows ?? BAKE.grid[1];
  const cell = options.cell ?? BAKE.washCell;
  const scene = sceneOf(c);
  const metrics = sceneMetrics(scene);
  const tones = c.palette.stops.map((hex) => tone(hexToRgb(hex)));
  const lo = Math.min(...tones);
  const span = Math.max(...tones) - lo;
  const inks = c.palette.stops.map((hex) => hexToRgb(hex).map((value) => Math.round(value * 255)));
  const masks = metrics.coverage.map((_, step) => rasterize(
    { cols: 1, rows: 1, steps: Uint8Array.of(step), indices: Uint8Array.of(1) },
    { palette: ['#000000', '#FFFFFF'], ground: 0 },
    cell,
  ));
  const levels = 2048;
  const lut = new Uint8Array(16 * levels * 4);
  for (let b = 0; b < 16; b++) {
    for (let t = 0; t < levels; t++) {
      const color = paletteTone(c, t / (levels - 1));
      const level = (tone(color) - lo) / span;
      const step = stepFor(level, b % 4, Math.floor(b / 4), 'bayer4');
      const ink = inks[step ? compensate(scene, ...color, step, metrics) : scene.ground];
      lut.set([...ink, step], (b * levels + t) * 4);
    }
  }
  const focusedLut = lut.slice();
  for (let i = 0; i < lut.length; i += 4) {
    const luma = focusedLut[i] * 0.213 + focusedLut[i + 1] * 0.715 + focusedLut[i + 2] * 0.072;
    for (let k = 0; k < 3; k++) focusedLut[i + k] = Math.round(focusedLut[i + k] * (1 - BAKE.desaturate) + luma * BAKE.desaturate);
  }
  const pixels = new Uint8ClampedArray(cols * cell * rows * cell * 4);
  // El peldaño de cada celda, para que un chequeo pueda medir la escalera que
  // usó la emisión sin adivinarla desde los píxeles.
  const steps = new Uint8Array(cols * rows);
  return {
    pixels,
    steps,
    width: cols * cell,
    height: rows * cell,
    update(seconds, focused = false) {
      const colors = focused ? focusedLut : lut;
      const index = Math.round(wrap01(seconds / CYCLE_SECONDS) * c.cycle.frames);
      const layers = constellationLayers(c, { cols, rows, index });
      pixels.fill(0);
      steps.fill(0);
      for (let at = 0; at < layers.wash.length; at++) {
        const amount = layers.wash[at];
        if (amount <= 0) continue;
        const x = at % cols;
        const y = Math.floor(at / cols);
        // El tono es la AMPLITUD del evento; el peldaño lo elige la LUT con esa
        // posición de Bayer, exactamente como `stepFor` en el horneado.
        const t = Math.min(levels - 1, Math.max(0, Math.round(washAmplitude(amount) * (levels - 1))));
        const k = (((y % 4) * 4 + x % 4) * levels + t) * 4;
        steps[at] = colors[k + 3];
        const mask = masks[steps[at]];
        for (let yy = 0; yy < cell; yy++) {
          for (let xx = 0; xx < cell; xx++) {
            const p = ((y * cell + yy) * cols * cell + x * cell + xx) * 4;
            pixels[p] = colors[k];
            pixels[p + 1] = colors[k + 1];
            pixels[p + 2] = colors[k + 2];
            pixels[p + 3] = mask[(yy * cell + xx) * 4];
          }
        }
      }
      return this;
    },
  };
}
