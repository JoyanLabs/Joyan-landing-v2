/**
 * LA TRAZA — escena procedural por capas (receta 2B de skills/joyan-escenas).
 * ============================================================================
 * Inventario aprobado: «el registro: qué autorizó qué». Una cadena de nodos
 * donde UNA sola ruta se enciende nodo a nodo, con un único acento encendido
 * sobre un campo apagado; el resto del campo queda en sombra. Uso final:
 * ilustración de sección. Sin assets externos: campo procedural por capas.
 *
 * CONTRATO ESPACIAL (skill §2B):
 *   - `field(x, y, time)` recibe CELDAS ENTERAS en [0, cols-1] / [0, rows-1].
 *     No hay píxeles aquí: la retícula la pone el motor.
 *   - El escalar que devuelve vive en el ESPACIO TONAL del motor, no en 0..1
 *     libre: `tone = groundTone + ink * (maxTone - groundTone)`, con `ink` 0..1
 *     relativo a la paleta de la escena. `groundTone`/`maxTone` salen de
 *     `sceneMetrics(scene)`, que es la MISMA fuente que usa `renderFrame` para
 *     normalizar; así el campo y el motor no pueden divergir.
 *
 * CONTRATO DE SUELO (WU108): el motor es primitiva de suelo OSCURO. `ground: 0`
 * es el índice del tono más oscuro de la paleta; si el suelo no fuese el más
 * oscuro, la normalización colapsaría a paso 0 por diseño.
 *
 * ANIMACIÓN (skill §3): todo término animado es 2π-periódico en `t/T` y el
 * adaptador del motor da `time = index / fps` con `index` módulo `cycleFrames`,
 * así que el período es `T = cycleFrames / fps` (360/30 = 12.0 s). El evento
 * raro (el acento) lleva envolvente explícita subida → sostén → bajada que vale
 * CERO en los dos extremos del loop; la cadena usa `sweep = (1 - cos 2πp)/2`,
 * que también vale cero en p=0 y p=1. Por eso el loop cierra sin salto.
 */
import {
  hexToRgb, luma, layeredNoise, renderFrame, rasterize, sceneMetrics,
} from '../../../../scripts/scene-src/engine.mjs';

/** La relación de aspecto y la política móvil del boceto, que la entrega hereda. */
export const ASPECT_RATIO = '2:1';
export const MOBILE_POLICY = 'escala proporcional al ancho del contenedor, sin recorte ni reencuadre';

export const COLS = 200;
export const ROWS = 100;
export const FPS = 30;
export const CYCLE_FRAMES = 360;
/** Período del loop en segundos (skill §3: T = cycleFrames / fps). */
export const T = CYCLE_FRAMES / FPS;

/** Paleta de la escena: oscura, con el suelo en el índice 0 (el más oscuro). */
export const PALETTE = Object.freeze([
  '#05080A', '#0A1114', '#12212A', '#1C3742', '#2A5460',
  '#3F7680', '#5C9A9C', '#8BC0B4', '#C4E2D2', '#F2FBF3',
]);

/**
 * Los nueve nodos de la cadena, en CELDAS (boceto `sketch.svg` / 8 px por celda).
 * Se dibujan una sola vez: son la composición aprobada.
 */
export const NODES = Object.freeze([
  [18, 72], [38, 71], [59, 67], [79, 60], [100, 51],
  [120, 41], [141, 34], [161, 31], [182, 30],
]);

/** El nodo que el evento enciende: el que la traza acaba de autorizar. */
export const ACCENT_NODE = 5;

/** Frame del póster: la mitad del loop, donde el acento está en su sostén. */
export const POSTER_FRAME = CYCLE_FRAMES / 2;

// ------------------------------------------------------------------ animación

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (v) => {
  const u = clamp01(v);
  return u * u * (3 - 2 * u);
};

/**
 * El recorrido: sube 0 → 1 → 0 con una sola armónica, así que es 2π-periódico y
 * vale CERO en p=0 y p=1 (los dos extremos del loop).
 * @param {number} p fase normalizada 0..1 del ciclo
 */
export function sweepAt(p) {
  return 0.5 - 0.5 * Math.cos(TAU * p);
}

/** Extremos del recorrido en unidades de nodo: en los dos extremos, todo apagado. */
const HEAD_MIN = -0.8;
const HEAD_MAX = 9.6;

/**
 * Envolvente explícita del evento raro: subida → sostén → bajada, y CERO en los
 * dos extremos de su ventana (smoothstep(0) = 0), así que vale cero también en
 * los dos extremos del loop porque la ventana es interior.
 * @param {number} q progreso 0..1 dentro de la ventana del evento
 */
export function eventEnvelope(q) {
  if (!(q > 0 && q < 1)) return 0;
  const edge = Math.min(1, Math.min(q, 1 - q) / 0.30);
  return edge * edge * (3 - 2 * edge);
}

/** La ventana del acento, como FASES NORMALIZADAS del ciclo (no segundos). */
export const EVENT_WINDOW = Object.freeze([0.42, 0.58]);

/**
 * El estado animado del frame en una sola estructura. `head` está en unidades de
 * nodo (nodo k en la posición k) y `accent` es la envolvente del evento ya
 * evaluada en la fase que corresponde a `p`.
 * @param {number} p fase normalizada 0..1
 */
export function lightState(p) {
  const head = HEAD_MIN + sweepAt(p) * (HEAD_MAX - HEAD_MIN);
  const q = (p - EVENT_WINDOW[0]) / (EVENT_WINDOW[1] - EVENT_WINDOW[0]);
  return { head, accent: eventEnvelope(q) };
}

// --------------------------------------------------------- capas estáticas (tablas)
// La geometría de la cadena NO cambia con el tiempo: sólo cambia cuánto de ella
// está encendida. Se mide una vez por celda y el frame sólo evalúa la animación.
// Con las distancias inline (8 segmentos + 9 nodos por celda y por frame) medido:
// +12,42 ms sobre un campo plano, o sea el frame completo en ~24 ms, por encima
// del presupuesto de 16,67 ms. Con tablas, `renderFrame` cuesta 4,40 ms y el
// frame entero 12,48 ms (mediana, ver RESULTADO.md).

const LINK_SIGMA = 0.70;
const NODE_SIGMA = 1.90;
const ACCENT_SIGMA = 4.60;
const NO_NODE = 255;

function buildTables() {
  const total = COLS * ROWS;
  const linkW = new Float32Array(total);
  const linkS = new Float32Array(total);
  const nodeW = new Float32Array(total);
  const nodeK = new Uint8Array(total).fill(NO_NODE);
  const accentW = new Float32Array(total);
  const [ax, ay] = NODES[ACCENT_NODE];
  const linkFall = 2 * LINK_SIGMA * LINK_SIGMA;
  const nodeFall = 2 * NODE_SIGMA * NODE_SIGMA;
  const accentFall = 2 * ACCENT_SIGMA * ACCENT_SIGMA;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      let bestLink = 0;
      let bestS = 0;
      for (let k = 0; k < NODES.length - 1; k++) {
        const [x0, y0] = NODES[k];
        const [x1, y1] = NODES[k + 1];
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len2 = dx * dx + dy * dy;
        const t = clamp01(((x - x0) * dx + (y - y0) * dy) / len2);
        const px = x0 + dx * t;
        const py = y0 + dy * t;
        const d2 = (x - px) * (x - px) + (y - py) * (y - py);
        const w = Math.exp(-d2 / linkFall);
        if (w > bestLink) {
          bestLink = w;
          bestS = k + t;
        }
      }
      linkW[i] = bestLink;
      linkS[i] = bestS;
      let bestNode = 0;
      let bestK = NO_NODE;
      for (let k = 0; k < NODES.length; k++) {
        const d2 = (x - NODES[k][0]) * (x - NODES[k][0]) + (y - NODES[k][1]) * (y - NODES[k][1]);
        const w = Math.exp(-d2 / nodeFall);
        if (w > bestNode) {
          bestNode = w;
          bestK = k;
        }
      }
      nodeW[i] = bestNode;
      nodeK[i] = bestK;
      const da = (x - ax) * (x - ax) + (y - ay) * (y - ay);
      accentW[i] = Math.exp(-da / accentFall);
    }
  }
  return { linkW, linkS, nodeW, nodeK, accentW };
}

const TABLES = buildTables();

// ------------------------------------------------------------------- la escena

/** Tinta por capa, en fracción 0..1 del rango tonal de la paleta. */
const GHOST_BASE = 0.035;
const GHOST_GAIN = 0.085;
const LINK_SHADOW = 0.17;
const LINK_LIT = 0.50;
const NODE_SHADOW = 0.24;
const NODE_LIT = 0.52;
const ACCENT_GAIN = 0.85;
/** Una vuelta entera del enrejado por ciclo: el desplazamiento es periódico exacto. */
const GHOST_WRAP_X = 10;
const GHOST_WRAP_Y = 5;
const GHOST_SEED = 0x5eed;
// El objeto de opciones se reutiliza: crear uno por celda son 20.000 objetos por
// frame. (Medido: el cambio es pequeño, dentro del ruido; la higiene se queda.)
const GHOST_NOISE = Object.freeze({ octaves: 2, wrapX: GHOST_WRAP_X, wrapY: GHOST_WRAP_Y });

const scene = {
  id: 'la-traza',
  label: 'La traza',
  cols: COLS,
  rows: ROWS,
  fps: FPS,
  cycleFrames: CYCLE_FRAMES,
  palette: PALETTE,
  ground: 0,
  posterFrame: POSTER_FRAME,
  field: null,
};

// `sceneMetrics` es la fuente del rango tonal: la MISMA que normaliza el motor.
const METRICS = sceneMetrics(scene);
const GROUND_TONE = METRICS.groundTone;
const SPAN = METRICS.maxTone - METRICS.groundTone;

// El estado animado se deriva una vez por frame, no una vez por celda. Sigue
// siendo función pura de `time`: mismo `time`, mismo estado.
let cachedTime = Number.NaN;
let cachedState = null;
function stateAt(time) {
  if (time === cachedTime) return cachedState;
  const p = ((time / T) % 1 + 1) % 1;
  cachedTime = time;
  cachedState = lightState(p);
  return cachedState;
}

/**
 * La capa: tinta por celda en el espacio tonal del motor.
 * @param {number} x celda entera @param {number} y celda entera @param {number} time segundos
 */
function field(x, y, time) {
  const state = stateAt(time);
  const i = y * COLS + x;
  // El desplazamiento del enrejado avanza UNA vuelta completa por ciclo, así que
  // t=0 y t=T caen en el mismo punto del látice: el loop cierra por construcción.
  const p = ((time / T) % 1 + 1) % 1;
  const off = GHOST_WRAP_X * p;
  const ghost = GHOST_BASE + GHOST_GAIN * layeredNoise(x + off, y, GHOST_SEED, GHOST_NOISE);
  const litLink = smoothstep(state.head - TABLES.linkS[i]);
  const litNode = smoothstep(state.head - TABLES.nodeK[i]);
  const ink = ghost
    + TABLES.linkW[i] * (LINK_SHADOW + LINK_LIT * litLink)
    + TABLES.nodeW[i] * (NODE_SHADOW + NODE_LIT * litNode)
    + TABLES.accentW[i] * state.accent * ACCENT_GAIN;
  return GROUND_TONE + clamp01(ink) * SPAN;
}

scene.field = field;

export default scene;

/** El frame del póster, ya renderizado por el motor (una sola verdad). */
export function posterFrame() {
  return renderFrame(scene, POSTER_FRAME);
}

/**
 * La receta del póster de §2B: `renderFrame` → `rasterize` del MISMO motor.
 * @param {number} [cell] píxeles por celda
 * @param {Uint8ClampedArray} [into] buffer reutilizable
 */
export function posterRgba(cell = 8, into) {
  const frame = posterFrame();
  const rgba = rasterize(frame, scene, cell, into);
  return { frame, rgba, width: frame.cols * cell, height: frame.rows * cell };
}

/** Huella estable de un frame: lo que el chequeo de determinismo compara. */
export { scene, luma as engineLuma, hexToRgb as engineHexToRgb };
