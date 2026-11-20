/**
 * EL MODELO DE LA ESCENA VIVA — el de v1, con la figura del catálogo.
 * ============================================================================
 * Este módulo es PURO: no toca el DOM, no hornea y no importa el catálogo. Lo
 * comparten la página (`live.mjs`) y el worker de emisión (`emission.mjs`), así
 * que las dos mitades de la escena no pueden discrepar sobre qué es un plano,
 * qué tasa tiene o dónde cae la cámara.
 *
 * EL ORDEN DE v1, punto por punto (`design-studies/v1/hero-field.mjs`):
 *
 *   mundo       480 × 300 unidades. El cuadro de la tarjeta es 1440 × 900, o
 *               sea exactamente 3 px por unidad: el cielo horneado, la lámina
 *               del lavado y el `viewBox` de la figura comparten el mismo
 *               sistema de coordenadas y no hay una segunda escala.
 *   planos      far 0,78 · mid 0,89 · near 1,00 (`NODE_RATES`). El plano del
 *               sujeto responde entero a la cámara; los de atrás, menos.
 *   paralaje    cielo 0,18 · lavado 0,52 (`PARALLAX`). SÓLO lo usa la cámara de
 *               foco: en esta escena el puntero no mueve ninguna capa.
 *   cámara      zoom 1,28 sobre la mira «0,65 nodo + 0,35 centroide del grupo»,
 *               dividida por la tasa del plano del sujeto y recortada para que
 *               ningún nodo, en ningún plano, salga del marco. Es
 *               `cameraFor` + `destination` de v1.
 *   escalera    foco / medio / fondo por distancia al plano del sujeto; en un
 *               empate gana el plano más profundo (`focusTreatment` de v1).
 *   tiempo      el registro de v1: 720 cuadros a 60 fps = 12 s, y el instante
 *               de la pieza es el cuadro 100 (1,666… s).
 */

/** Los tres planos de la figura, en el orden de la pila. */
export const NODE_PLANES = Object.freeze(['far', 'mid', 'near']);
/** La respuesta de cada plano a la cámara, la de v1. */
export const NODE_RATES = Object.freeze([0.78, 0.89, 1]);
/** El paralaje de v1: sólo lo lee la cámara de foco, nunca el puntero. */
export const PARALLAX = Object.freeze({ sky: 0.18, wash: 0.52, figure: 1 });
/** La transición de foco, la de v1. */
export const TRANSITION_MS = 1200;
/** La vuelta automática a la vista completa, la de v1. */
export const RETURN_MS = 7000;
/** El registro de tiempo de v1: 720 cuadros a 60 fps. */
export const FRAMES = 720;
export const FPS = 60;
/** El instante de la pieza: el cuadro 100 de 720 (1,666… s). */
export const STILL_FRAME = 100;
/** Un ciclo del registro, en segundos. */
export const CYCLE_SECONDS = FRAMES / FPS;
/** El zoom del foco, el de v1. */
export const FOCUS_ZOOM = 1.28;
/** La emisión de reposo: 12 Hz. */
export const EMISSION_MS = 1000 / 12;

/** El instante de la pieza, en segundos: 100/60, el `STILL_SECONDS` de v1. */
export const stillSeconds = () => STILL_FRAME / FPS;

const TAU = Math.PI * 2;
const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** La curva de v1: p³(10 − 15p + 6p²). */
export const ease = (p) => p * p * p * (10 + p * (-15 + 6 * p));

/** Envuelve una posición en [0,1). */
export const wrap01 = (p) => {
  const wrapped = p % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
};

/** La fase de un nodo, la misma convención determinista que la de un enlace
 * (`linkPhase` de v1: el paso áureo), para que su halo respire sin azar. */
export const nodePhase = (index) => wrap01(index * 0.6180339887498949);

/**
 * El encuadre del mundo: escala isotrópica y centrado. Para la tarjeta
 * (1440 × 900) da escala 3 y desplazamiento 0, porque el mundo y el cuadro
 * tienen la misma proporción; la fórmula es la de v1 para que el mismo módulo
 * sirva en cualquier tamaño.
 */
export function figureTransform(width, height) {
  const scale = Math.min(width / 480, height / 300);
  return { scale, x: (width - scale * 480) / 2, y: (height - scale * 300) / 2 };
}

/** La cámara de un plano: la de la figura, atenuada por la tasa del plano. */
export function planeCamera(plane, camera) {
  const rate = rateOf(plane);
  return { x: camera.x * rate, y: camera.y * rate, zoom: 1 + (camera.zoom - 1) * rate };
}

/** La tasa de un plano por su nombre. */
export function rateOf(plane) {
  const at = NODE_PLANES.indexOf(plane);
  return at < 0 ? 1 : NODE_RATES[at];
}

/**
 * El grupo del foco: el nodo y sus vecinos por enlace. v1 usa sus anillos
 * (`RINGS`); el catálogo no trae anillos y trae enlaces, así que el grupo es el
 * «grupo de enlaces» que la escena ya nombra. El nodo entra en su propio grupo,
 * como en v1.
 * @param {number} index @param {number[][]} neighbours vecinos por nodo
 */
export function groupOf(index, neighbours) {
  const group = new Set();
  if (index < 0) return group;
  group.add(index);
  for (const other of neighbours[index] ?? []) group.add(other);
  return group;
}

/**
 * La cámara del foco: zoom 1,28 sobre la mira 0,65 nodo + 0,35 centroide del
 * grupo. Es `cameraFor` de v1; los números de la mira se leen igual.
 * @param {number} index @param {{world:number[]}[]} nodes @param {Set<number>} group
 */
export function cameraFor(index, nodes, group, width, height) {
  if (index < 0) return { x: 0, y: 0, zoom: 1 };
  const f = figureTransform(width, height);
  const point = nodes[index].world;
  const members = [...group];
  const centre = members.reduce(
    (sum, i) => sum.map((value, axis) => value + nodes[i].world[axis] / members.length),
    [0, 0],
  );
  const aim = point.map((value, axis) => value * 0.65 + centre[axis] * 0.35);
  return {
    x: width * (width <= 620 ? 0.56 : 0.75) - (f.x + aim[0] * f.scale) * FOCUS_ZOOM,
    y: height * (width <= 620 ? 0.74 : 0.52) - (f.y + aim[1] * f.scale) * FOCUS_ZOOM,
    zoom: FOCUS_ZOOM,
  };
}

/**
 * El destino de la cámara para un nodo, en el registro de la capa que responde
 * entera (figura, tasa 1). Se divide la cámara por la tasa del plano del sujeto
 * y se recorta para que NINGÚN nodo de NINGÚN plano salga del marco: la cámara
 * puede afirmar un nodo, no llevarse los otros planos fuera de cuadro. Es
 * `destination()` de v1.
 */
export function destination(index, nodes, group, width, height) {
  const target = cameraFor(index, nodes, group, width, height);
  if (index < 0) return target;
  const f = figureTransform(width, height);
  const rate = rateOf(nodes[index].plane);
  const result = {
    x: target.x / rate,
    y: target.y / rate,
    zoom: 1 + (target.zoom - 1) / rate,
  };
  // El marco, con 20 px de margen. v1 deja 100 px arriba y abajo porque su
  // página tiene una barra: acá no hay barra y las figuras del catálogo son más
  // altas que la de v1, así que esa cota haría el recorte imposible (lo > hi) y
  // `destination` caería en su respaldo de centrar, que sí deja planos fuera.
  // La regla que se conserva es la de v1: NINGÚN nodo de NINGÚN plano sale del
  // marco.
  const bounds = [[20, width - 20], [20, height - 20]];
  for (const [axis, key] of ['x', 'y'].entries()) {
    const origin = axis ? f.y : f.x;
    let lo = -Infinity;
    let hi = Infinity;
    nodes.forEach((node) => {
      const r = rateOf(node.plane);
      const z = 1 + (result.zoom - 1) * r;
      const projected = (origin + node.world[axis] * f.scale) * z;
      lo = Math.max(lo, (bounds[axis][0] - projected) / r);
      hi = Math.min(hi, (bounds[axis][1] - projected) / r);
    });
    result[key] = lo <= hi ? Math.max(lo, Math.min(hi, result[key])) : (lo + hi) / 2;
  }
  return result;
}

/**
 * La escalera de planos por distancia al plano del sujeto: el sujeto `focus`,
 * el plano MÁS LEJANO `back` (el único que toma el desenfoque de 0,8 px) y el
 * restante `middle`. Con dos planos restantes en un empate gana el más
 * profundo, como en v1; por eso el desenfoque nunca cae en el plano cercano.
 * @returns {Record<string,'focus'|'middle'|'back'>}
 */
export function treatmentsFor(focusPlane) {
  const order = NODE_PLANES.map((name, index) => ({ name, index }));
  const at = NODE_PLANES.indexOf(focusPlane);
  const ladder = order
    .filter((entry) => entry.name !== focusPlane)
    .sort((a, b) => Math.abs(b.index - at) - Math.abs(a.index - at) || a.index - b.index);
  const treatments = {};
  for (const entry of order) {
    treatments[entry.name] = entry.name === focusPlane ? 'focus'
      : entry.name === ladder[0].name ? 'back' : 'middle';
  }
  return treatments;
}

/** El plano que toma el desenfoque: el más lejano del sujeto. */
export const backPlaneOf = (focusPlane) => Object.entries(treatmentsFor(focusPlane))
  .find(([, treatment]) => treatment === 'back')[0];

/** El cuadrado de impacto de 26 CSS px, en unidades del mundo. Es el mismo
 * blanco de v1: `13 / f.scale` de medio lado, o sea 26 px de lado en pantalla. */
export function regionFor(index, nodes, f) {
  const [x, y] = nodes[index].world;
  const r = 13 / f.scale;
  return `M${x - r} ${y - r}h${2 * r}v${2 * r}h${-2 * r}Z`;
}

/**
 * La arista que recorre la señal: la primera del nodo enfocado y, sin nada
 * enfocado, la última de la figura. Es la regla de v1 (`traceEdge`) sin su
 * índice fijo 48, que nombraba una arista de SU figura: el catálogo tiene otra
 * cantidad de enlaces y el mismo número no existe.
 * @param {{from:number,to:number}[]} links @param {number} active
 */
export function traceEdgeOf(links, active) {
  if (!links.length) return -1;
  if (active < 0) return links.length - 1;
  const at = links.findIndex((link) => link.from === active || link.to === active);
  return at < 0 ? 0 : at;
}

/** El brillo de un nodo para su halo: una respiración por nodo con su fase. */
export function glowFor(index, seconds) {
  const p = wrap01(seconds / CYCLE_SECONDS + nodePhase(index));
  const brightness = clamp01(0.5 - 0.5 * Math.cos(TAU * p));
  return { brightness };
}
