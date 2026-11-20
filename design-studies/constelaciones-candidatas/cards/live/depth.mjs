/**
 * LA PROFUNDIDAD DE LA ESCENA VIVA — la pila de 8 planos, separada de verdad.
 * ============================================================================
 * La tarjeta quieta separaba los planos en Z, pero la separación era tan chica
 * (30 px entre `figura:far` y `figura:mid`, sin desenfoque ni escala visible)
 * que la lámina se leía como una imagen plana. Esta escena conserva la MISMA
 * pila de `isometric.mjs` (`STACK`: cielo, lavado, figura far/mid/near, viñeta
 * ya compuesta, núcleos far/mid/near) y le da una separación que se ve:
 *
 *   paso          90 px de Z entre planos vecinos de la figura
 *   deriva        0,80 px de pantalla por px de Z → 72 px entre vecinos
 *   perspectiva   1 000 px → `(P + z) / P` da 1,000 / 1,090 / 1,180 a la figura
 *   fondo         cielo z = −4 pasos (−360) y lavado −3 pasos (−270), por
 *                 detrás de la figura, atenuados y desenfocados
 *   foco          el plano del sujeto pesa 1 y no se desenfoca; el intermedio
 *                 se atenúa; el MÁS LEJANO desde el sujeto se desenfoca
 *                 (4,0 px). La escalera es la de v1 (`NODE_RATES`) y el
 *                 desenfoque usa el tratamiento `focus / middle / back` de la
 *                 vara, con el mismo desempate (el plano profundo es `back`).
 *
 * LA ESCALA ES COMPENSADA, no una afinidad inventada: `(P + z − zFondoFigura)/P`
 * con `zFondoFigura` = el plano `far` de la figura. Da 1,000 / 1,090 / 1,180:
 * lo lejano no se encoge de más y lo cercano crece lo que la fórmula dice. El
 * ancla es el bolsillo de la figura (`figurePocket`), medido por `live.mjs` y
 * pasado al horneado; el cielo y el lavado conservan la escala 1 porque son
 * medios de cuadro completo y su profundidad se lee en el desplazamiento, el
 * desenfoque y el paralaje.
 *
 * EL DESPLAZAMIENTO ES POR PLANO, NO POR NODO: los nodos de un plano comparten
 * pose, peso y desenfoque. El eje es axonométrico y el mismo de la tarjeta
 * (`ISO.axis`): un solo vector, así lo lejano sube a la izquierda.
 *
 * LA CÁMARA ES LA DE V1: al enfocar un nodo, el zoom es 1,28 y cada capa
 * responde con la tasa de su plano (`PARALLAX`: cielo 0,18 · lavado 0,52;
 * `NODE_RATES`: far 0,78 · mid 0,89 · near 1,00). El plano del sujeto responde
 * con la tasa 1, se afirma otro 3,5 % encima y los demás llegan menos: el
 * acercamiento mueve la composición, no sólo el tono. El paneo se recorta para
 * que ningún nodo, en ningún plano, salga del cuadro (la misma regla de
 * `destination()` de `v1.mjs`).
 */

import { CARD } from '../data.mjs';
import { ISO, STACK } from '../isometric.mjs';
import { NODE_RATES, PARALLAX } from '../../../v1/hero-field.mjs';

/** Los números de la escena viva. Cada uno se mide en el chequeo. */
export const DEPTH = Object.freeze({
  /** Focal de la escala compensada `(P + z) / P`. */
  perspective: 1000,
  /** Separación en Z entre planos vecinos de la figura, en px. */
  step: 90,
  /** El fondo, por detrás del plano 0 de la figura. */
  skySteps: -4,
  washSteps: -3,
  figureSteps: Object.freeze({ far: -1, mid: 0, near: 1 }),
  /** Los núcleos viven justo delante de su figura, en pasos. */
  coreAdvance: 0.24,
  /** Eje axonométrico en pantalla, el mismo de la tarjeta. */
  axis: ISO.axis,
  /** px de pantalla por px de Z, en reposo. */
  drift: 0.8,
  /** Corrimiento de la figura para que el plano cercano, que crece un 18 %,
   * no saque su nodo más a la derecha del cuadro. Es composición, no física. */
  figureShiftPx: Object.freeze([-20, 0]),
  /** Zoom del foco, el de v1. */
  zoom: 1.28,
  /** Cuánto se agranda el plano del sujeto al afirmarse (encima de la cámara). */
  affirmScale: 1.035,
  /** Recorrido total del puntero en px para la capa de tasa 1. */
  pointerPx: 72,
  /** La transición de cámara, la de v1. */
  transitionMs: 1200,
  /**
   * Margen de las láminas: las capas de fondo se desplazan con el puntero y con
   * la cámara; la lámina se hornea 144 px más ancha y 90 px más alta para que
   * el cuadro nunca descubra un borde.
   */
  marginPx: Object.freeze([144, 90]),
  /** La grilla de horneado: 576 × 360 celdas de 3 px = 1728 × 1080 px. */
  cols: 576,
  rows: 360,
  /** Profundidad del plano `far` de la figura: el cero de la escala. */
  zFigureFar: -90,
});

const PLANE_ORDER = Object.freeze(['far', 'mid', 'near']);
const planeIndex = (name) => PLANE_ORDER.indexOf(name);

/** La Z de una entrada de la pila, en px, en reposo. */
export function entryZ(entry) {
  if (entry.layer === 'cielo') return DEPTH.skySteps * DEPTH.step;
  if (entry.layer === 'lavado') return DEPTH.washSteps * DEPTH.step;
  const advance = entry.layer === 'núcleos' ? DEPTH.coreAdvance : 0;
  return (DEPTH.figureSteps[entry.plane] + advance) * DEPTH.step;
}

/** La escala compensada de la pila, normalizada en el `far` de la figura. */
export function restScale(z) {
  return (DEPTH.perspective + z - DEPTH.zFigureFar) / DEPTH.perspective;
}

/** El cielo y el lavado son medios de cuadro completo: conservan la densidad de
 * la lámina del modelo (escala 1) y su profundidad se lee en el desplazamiento,
 * el desenfoque y el paralaje. La figura —la que tiene que leerse en tres
 * planos— sí lleva la escala compensada `(P + z) / P`. */
export function backgroundScale(entry) {
  return entry.layer === 'cielo' || entry.layer === 'lavado' ? 1 : restScale(entryZ(entry));
}

/** El desplazamiento de reposo de un plano, en px de pantalla. */
export function restOffsetPx(z) {
  return [DEPTH.axis[0] * DEPTH.drift * z, DEPTH.axis[1] * DEPTH.drift * z];
}

/** La tasa de paralaje de una capa: la de v1, sin inventar otra escalera. */
export function layerRate(entry) {
  if (entry.layer === 'cielo') return PARALLAX.sky;
  if (entry.layer === 'lavado') return PARALLAX.wash;
  return NODE_RATES[Math.max(0, planeIndex(entry.plane))];
}

/** El peso de reposo: lo lejano se atenúa, pero ningún plano se oculta. */
export function restWeight(entry) {
  if (entry.layer === 'cielo') return 0.42;
  if (entry.layer === 'lavado') return 0.52;
  return entry.plane === 'far' ? 0.50 : entry.plane === 'mid' ? 0.72 : 0.92;
}

/**
 * El desenfoque de reposo, en px. La profundidad de campo es la que hace que el
 * plano lejano se lea como fondo aun sin interactuar: 2,6 px en `far`, 1,1 en
 * `mid`, 0,45 en `near`; el cielo (0,5) y el lavado (0,35) todavía más blandos.
 */
export function restBlur(entry) {
  if (entry.layer === 'cielo') return 0.5;
  if (entry.layer === 'lavado') return 0.35;
  if (entry.plane === 'far') return 2.6;
  if (entry.plane === 'mid') return 1.1;
  return 0.45;
}

/**
 * El plano `back` de v1: el más lejano desde el sujeto; en un empate gana el
 * más profundo. Es el único que toma el desenfoque fuerte del foco.
 */
export function backPlane(focusPlane) {
  return PLANE_ORDER
    .filter((plane) => plane !== focusPlane)
    .sort((a, b) => Math.abs(planeIndex(b) - planeIndex(focusPlane))
      - Math.abs(planeIndex(a) - planeIndex(focusPlane))
      || planeIndex(a) - planeIndex(b))[0];
}

/** El tratamiento de foco de una entrada: `foco`, `vecino` o `fondo`. */
export function focusTreatment(entry, focusPlane) {
  if (entry.layer === 'cielo') {
    return { treatment: 'fondo', weight: 0.42, blurPx: 2.0 };
  }
  if (entry.layer === 'lavado') {
    return { treatment: 'fondo', weight: 0.55, blurPx: 1.4 };
  }
  if (entry.plane === focusPlane) {
    return { treatment: 'foco', weight: 1, blurPx: 0 };
  }
  if (entry.plane === backPlane(focusPlane)) {
    return { treatment: 'fondo', weight: 0.55, blurPx: 4.0 };
  }
  return { treatment: 'vecino', weight: 0.82, blurPx: 1.1 };
}

/**
 * El destino de la cámara para un nodo: el sujeto va al 64 % del ancho y al
 * 44 % del alto; el paneo se acota a ±20 % / ±28 % del cuadro. A diferencia de
 * `destination()` de v1, NO exige que todos los nodos queden dentro: la figura
 * ocupa casi todo el alto y ese recorte anulaba el acercamiento (medido). Un
 * foco recorta los bordes; `Escape` vuelve a la vista completa.
 * @param {number} index índice del nodo, o −1 para la vista completa
 * @param {Array<{plane: string, q: number[]}>} restNodes los nodos en reposo
 * @param {number} width @param {number} height
 */
export function cameraTarget(index, restNodes, width = CARD.width, height = CARD.height) {
  if (index < 0) return { zoom: 1, pan: [0, 0] };
  const zoom = DEPTH.zoom;
  const centre = [width / 2, height / 2];
  const node = restNodes[index];
  // El sujeto va al 64 % del ancho y al 44 % del alto. El paneo se RECORTA a un
  // cuarto del cuadro: la figura ocupa casi todo el alto, así que exigir que
  // todos los nodos queden dentro anularía el acercamiento (medido: el nodo no
  // se movía y el foco se leía como un cambio de peso, no de cámara). Un foco
  // recorta los bordes del encuadre; `Escape` vuelve a la vista completa.
  const aim = [width * 0.64, height * 0.44];
  const limit = [width * 0.20, height * 0.28];
  const pan = [
    aim[0] - centre[0] - (node.q[0] - centre[0]) * zoom,
    aim[1] - centre[1] - (node.q[1] - centre[1]) * zoom,
  ].map((value, axis) => Math.max(-limit[axis], Math.min(limit[axis], value)));
  return { zoom, pan };
}

/** La pose de una capa en pantalla: escala, desplazamiento y la tasa que usó. */
export function layerTransform(rate, camera, pointer = [0, 0], affirm = 0) {
  const base = 1 + (camera.zoom - 1) * rate;
  const scale = base * (1 + (DEPTH.affirmScale - 1) * affirm);
  return {
    rate,
    scale,
    tx: camera.pan[0] * rate + pointer[0] * rate,
    ty: camera.pan[1] * rate + pointer[1] * rate,
  };
}

/** Un punto del cuadro bajo una pose de capa: `C + (q − C)·escala + t`. */
export function applyTransform(point, pose, width = CARD.width, height = CARD.height) {
  const centre = [width / 2, height / 2];
  return [
    centre[0] + (point[0] - centre[0]) * pose.scale + pose.tx,
    centre[1] + (point[1] - centre[1]) * pose.scale + pose.ty,
  ];
}

/** La pila con su Z, su escala y su desplazamiento de reposo. */
export const REST_STACK = Object.freeze(STACK.map((entry) => {
  const z = entryZ(entry);
  const base = restOffsetPx(z);
  const shift = entry.layer === 'figura' || entry.layer === 'núcleos' ? DEPTH.figureShiftPx : [0, 0];
  return Object.freeze({
    ...entry,
    z,
    scale: backgroundScale(entry),
    offsetPx: [base[0] + shift[0], base[1] + shift[1]],
    weight: restWeight(entry),
    blurPx: restBlur(entry),
    rate: layerRate(entry),
  });
}));
