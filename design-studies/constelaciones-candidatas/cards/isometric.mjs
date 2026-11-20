/**
 * EL ISOMÉTRICO DE LA TARJETA — etapa 3 del proceso (`docs/PROCESO-ESCENAS.md`).
 * ============================================================================
 * Hasta la etapa 2 las cinco capas se fundían en un solo compuesto: había cielo,
 * lavado, figura y núcleos, pero todos a la misma altura. La vara
 * (`design-studies/v1/`) los separa en profundidad y por eso tiene cuerpo. Acá
 * cada capa recibe una **altura en Z** y el compuesto la recorre de atrás hacia
 * adelante, cada plano con su desplazamiento, su escala compensada y su peso.
 *
 * LA ESCALA ES LA FÓRMULA PEDIDA, no una afinidad inventada:
 *
 *     escala(z) = (perspectiva + z) / perspectiva
 *
 * A `perspectiva` de 6 000 px y pasos de 56 px la fórmula da una diferencia de
 * 3 % entre el plano más profundo y el más cercano: lo lejano **no se encoje de
 * más**, se encoje lo que la fórmula dice, y la separación la termina de leer el
 * desplazamiento. La pila se normaliza por su plano más profundo con el piso de
 * cobertura mínimo que hace que la lámina del cielo cubra el cuadro (lo mide
 * `coverageScale`), porque por debajo de 1 esa lámina dejaría un borde recto de
 * ground — el borde que las reglas de composición prohíben. La escala de un
 * plano respecto de otro sigue siendo exactamente la fórmula; se ancla la pila.
 *
 * EL DESPLAZAMENTO ES POR PLANO, NO POR NODO: los nodos de un plano comparten
 * altura, pose y peso (el check lo mide nodo por nodo). El eje es axonométrico:
 * un solo vector `axis`, así lo lejano sube a la izquierda y lo cercano baja a
 * la derecha, como una vista isométrica y no como un zoom cualquiera.
 *
 * LA VISTA ES UN ESTADO, no una animación. En reposo la pila está en su escalera
 * de profundidad; con un nodo enfocado la escalera se corre para que el plano
 * del sujeto quede a z = 0 + `affirm` (se afirma: crece un poco, sin desenfoque
 * y con peso pleno) y los demás planos se atenúan y se desenfocan según su
 * distancia a ese plano. Es el mecanismo de v1 (`data-treatment` focus / middle
 * / back) aplicado a la tarjeta, con los mismos números de lectura: el desenfoque
 * más fuerte es 0,9 px, y ningún plano se oculta (peso mínimo 0,62).
 *
 * EL ORDEN DE PINTADO ES LA PILA DECLARADA y va de atrás hacia adelante. La
 * viñeta cierra el cuadro entre la figura y los núcleos — como compone el modelo
 * (`constellation.mjs`: cores por encima de la viñeta, «siempre encima de
 * todo») — y cada grupo de núcleos también va de atrás hacia adelante. No hay
 * otra lista de orden en el flujo: `field.mjs` recorre `STACK` y nada más.
 */

import { CARD } from './data.mjs';

/** Los números del isométrico. Uno por decisión, medidos en el check. */
export const ISO = Object.freeze({
  /** Focal en px: `(P + z) / P` es la escala compensada de la etapa 3. */
  perspective: 6000,
  /** Separación entre planos vecinos, en px de Z. */
  step: 56,
  /** Profundidad del cielo y del lavado, en pasos, por detrás del plano 0. */
  skySteps: -1.8,
  washSteps: -1.2,
  /** La figura en tres planos, de atrás hacia adelante. */
  figureSteps: Object.freeze({ far: -1, mid: 0, near: 1 }),
  /** Los núcleos van justo delante de su plano: el resplandor es del nodo. */
  coreAdvance: 0.18,
  /** Cuánto se adelanta (en pasos) el plano del sujeto al enfocar: afirmarse. */
  affirm: 0.25,
  /** Eje axonométrico en pantalla (x, y), hacia el espectador. */
  axis: Object.freeze([0.5, 0.86]),
  /** px de pantalla por px de Z, antes del paralaje de cada capa. */
  drift: 0.55,
  /** PARALAJE, las tasas de la vara: el cielo responde 0,18, el lavado 0,52 y la
   * figura 1,00. El cielo se mueve poco — está lejos — y la figura lleva todo el
   * desplazamiento: es lo que hace legible la separación entre sus tres planos
   * (61 px entre el lejano y el cercano) sin encoger el cuadro. */
  parallax: Object.freeze({ cielo: 0.18, lavado: 0.52, figura: 1, 'núcleos': 1 }),
  /** z de referencia del desplazamiento: el plano 0 de la pantalla (figura:mid). */
  offsetReference: 0,
  /** Margen del piso de escala: la pila se normaliza por la cobertura mínima que
   * piden las láminas de cuadro completo (cielo y lavado), estado por estado. */
  coverMargin: 0.005,
  /** Reposo: lo lejano se atenúa con la profundidad y la nube queda fuera de
   * foco — el polvo se lee como fondo, no como otra figura. */
  rest: Object.freeze({
    /** Peso por profundidad: lo lejano se atenúa (1 − 0,03 por paso, piso 0,84).
     * Es suave a propósito: con una escalera de puntos, atenuar el tono no baja
     * la opacidad — baja el peldaño, y un paso de más apaga la estrella. La
     * atenuación fuerte de la pieza vive en la escalera del foco (0,62). */
    behindPerStep: 0.03,
    floor: 0.84,
    /** Profundidad de campo del reposo. Se desenfoca la NUBE (el lavado, 0,6 px):
     * una nube fuera de foco es una nube blanda. El cielo se queda casi nítido
     * (0,15 px): su material es polvo escaso, y desenfocar un TONO escaso no lo
     * suaviza, lo apaga. Juntas, la nube desenfocada y la pila atenuada cuestan
     * ~10 % de la luz media del cuadro (7,9 → 7,1 sobre 255). La figura no se desenfoca en
     * reposo: el desenfoque de tono convierte un halo en una mancha sin
     * peldaños, y la trama de puntos es el material de la tarjeta. En FOCO sí se
     * va el fondo (cielo 0,9), como en la vara. */
    blur: Object.freeze({ cielo: 0.15, lavado: 0.6 }),
  }),
  /** Enfocado: la escalera de v1, con la afirmación en primer plano. El peso
   * nunca llega a cero (0,62 es el mínimo: ningún plano se oculta). El
   * desenfoque toca la atmósfera —el fondo se va (0,9 / 0,5 px), como en la
   * vara— y nunca la figura: ahí la afirmación y la atenuación son peso, no
   * borrón, porque el borrón de tono se come los peldaños del halo. */
  focus: Object.freeze({
    subject: 1,
    next: 0.84,
    far: 0.62,
    cielo: 0.72,
    lavado: 0.8,
    blur: Object.freeze({ cielo: 0.9, lavado: 0.5 }),
    /** La cámara de v1, aplicada a la tarjeta: al enfocar, la pieza se acerca y
     * se corre para afirmar el sujeto, y el plano del sujeto responde con la
     * tasa 1 mientras los demás responden menos (`NODE_RATES` de la vara:
     * 1,00 / 0,89 / 0,78). El cielo y el lavado conservan sus tasas 0,18 / 0,52,
     * así el fondo casi no se mueve: es el fondo. */
    zoom: 1.09,
    pan: Object.freeze([-50, 12]),
    rates: Object.freeze({ subject: 1, next: 0.89, far: 0.78 }),
  }),
});

/**
 * Un plano de la pila: de dónde sale su tono y a qué altura vive.
 *
 * `sampling` es cómo se remuestrea la lámina del modelo con la pose. El cielo y
 * el lavado son una RETÍCULA DE ESTRELLAS (celdas sueltas con su tono): se
 * remuestrean al vecino más cercano, porque interpolar una estrella la reparte
 * entre cuatro celdas, el motor no encuentra un peldaño y la apaga — medido:
 * la interpolación bilineal de la atmósfera cuesta un 19 % de la luz del cuadro.
 * La figura y los núcleos son un CAMPO CONTINUO (halos con gradiente): se
 * remuestrean bilineales, que es lo que mantiene el degradado sin escalones.
 */
const plane = (key, layer, name, steps, afterVignette = false, sampling = 'field') => Object.freeze({
  key,
  /** La capa del modelo que aporta el tono: cielo, lavado, figura o núcleos. */
  layer,
  /** El plano de la figura (`far` / `mid` / `near`), o `null` para cielo/lavado. */
  plane: name,
  /** Profundidad en pasos, relativa al plano 0 de la pantalla. */
  steps,
  /** Profundidad en px, la que usa la fórmula. */
  z: steps * ISO.step,
  /** Los núcleos se pintan después de la viñeta: nunca se atenúan por ella. */
  afterVignette,
  /** `point` (retícula de estrellas) o `field` (campo continuo). */
  sampling,
});

/**
 * LA PILA DECLARADA, de atrás hacia adelante. Es la única lista de orden del
 * flujo: `field.mjs` la recorre entera, en este orden, y no reordena nada.
 * Los cinco planos del cuadro primero, la viñeta (que no es un plano: es el
 * cierre del marco) y después los tres planos de núcleos.
 */
export const STACK = Object.freeze([
  plane('cielo', 'cielo', null, ISO.skySteps, false, 'point'),
  plane('lavado', 'lavado', null, ISO.washSteps, false, 'point'),
  plane('figura:far', 'figura', 'far', ISO.figureSteps.far),
  plane('figura:mid', 'figura', 'mid', ISO.figureSteps.mid),
  plane('figura:near', 'figura', 'near', ISO.figureSteps.near),
  plane('núcleos:far', 'núcleos', 'far', ISO.figureSteps.far + ISO.coreAdvance, true),
  plane('núcleos:mid', 'núcleos', 'mid', ISO.figureSteps.mid + ISO.coreAdvance, true),
  plane('núcleos:near', 'núcleos', 'near', ISO.figureSteps.near + ISO.coreAdvance, true),
]);

/** La escala compensada de la etapa 3: `(perspectiva + z) / perspectiva`. */
export function planeScale(z) {
  return (ISO.perspective + z) / ISO.perspective;
}

/**
 * La escala mínima que hace que una lámina de cuadro completo cubra el marco:
 * las cuatro esquinas invertidas tienen que caer dentro de la grilla. Sin este
 * piso, un plano escalado por debajo de 1 abriría un borde recto de ground —
 * exactamente el seam que las reglas de composición prohíben.
 * @param {number[]} offsetCells desplazamiento de la pose, en celdas
 * @param {number[]} anchor centro de la figura, en celdas
 * @param {number} cols @param {number} rows
 */
export function coverageScale(offsetCells, anchor, cols, rows) {
  const axis = (o, a, size) => Math.max((a + o) / a, (size - o - a) / (size - a));
  return Math.max(axis(offsetCells[0], anchor[0], cols), axis(offsetCells[1], anchor[1], rows));
}

/** La profundidad de un plano en el estado dado, en px. */
export function depthAt(entry, focusPlane = null) {
  if (!focusPlane) return entry.z;
  const shift = -ISO.figureSteps[focusPlane] * ISO.step;
  const affirm = entry.plane === focusPlane ? ISO.affirm * ISO.step : 0;
  return entry.z + shift + affirm;
}

/**
 * La pose de un plano: escala compensada normalizada por el plano más profundo
 * del estado, y desplazamiento sobre el eje axonométrico con el paralaje de la
 * capa (cielo 0,18 · lavado 0,52 · figura 1,00).
 * @param {number} z @param {number} zFloor el z del plano más profundo del estado
 * @param {string} layer la capa, para su tasa de paralaje
 * @param {number} [cell] px por celda, para devolver el desplazamiento en px
 */
export function poseFor(entry, z, zFloor, focusPlane = null, cell = CARD.cell, cover = 1) {
  const ladder = cover * planeScale(z - zFloor);
  const { rate, offsetPx, offsetCells } = offsetFor(entry, z, focusPlane, cell);
  return {
    ladder,
    rate,
    camera: focusPlane ? 1 + (ISO.focus.zoom - 1) * rate : 1,
    scale: focusPlane ? ladder * (1 + (ISO.focus.zoom - 1) * rate) : ladder,
    offsetPx,
    offsetCells,
  };
}

/**
 * El desplazamiento de un plano en pantalla: la deriva sobre el eje con el
 * paralaje de su capa, más la cámara del foco (la misma tasa). Es una sola
 * función para la pose y para el piso de cobertura, así el borde no puede
 * aparecer por medir dos veces con números distintos.
 * @param {object} entry @param {number} z @param {string|null} focusPlane @param {number} [cell]
 */
export function offsetFor(entry, z, focusPlane = null, cell = CARD.cell) {
  const rate = cameraRate(entry, focusPlane);
  const travel = ISO.drift * (ISO.parallax[entry.layer] ?? 1) * (z - ISO.offsetReference * ISO.step);
  const camera = focusPlane ? [ISO.focus.pan[0] * rate, ISO.focus.pan[1] * rate] : [0, 0];
  const offsetPx = [ISO.axis[0] * travel + camera[0], ISO.axis[1] * travel + camera[1]];
  return { rate, offsetPx, offsetCells: [offsetPx[0] / cell, offsetPx[1] / cell] };
}

/**
 * Cuánto responde cada plano a la cámara del foco. El cielo y el lavado
 * conservan las tasas de paralaje de la vara (0,18 / 0,52): el fondo casi no se
 * mueve. Los planos de la figura toman la tasa de su distancia al sujeto, con
 * los `NODE_RATES` de v1 (1,00 / 0,89 / 0,78): el sujeto se afirma.
 * @param {object} entry la entrada de `STACK`
 * @param {string|null} focusPlane
 */
export function cameraRate(entry, focusPlane) {
  if (!focusPlane) return 0;
  if (entry.layer === 'cielo') return ISO.parallax.cielo;
  if (entry.layer === 'lavado') return ISO.parallax.lavado;
  const distance = Math.abs(entry.z - ISO.figureSteps[focusPlane] * ISO.step) / ISO.step;
  if (distance <= 1e-9) return ISO.focus.rates.subject;
  if (distance <= 1 + 1e-9) return ISO.focus.rates.next;
  return ISO.focus.rates.far;
}

/**
 * El peso y el desenfoque de un plano. Sin nodo enfocado, lo lejano se atenúa
 * con su profundidad. Con un nodo enfocado, la escalera de v1 se mide por la
 * distancia (absoluta) al plano del sujeto: el sujeto afirma (peso 1, sin
 * desenfoque), el vecino se atenúa suave y los demás toman el desenfoque.
 * @param {object} entry la entrada de `STACK`
 * @param {string|null} focusPlane
 */
export function treatmentFor(entry, focusPlane = null) {
  if (!focusPlane) {
    const behind = Math.max(0, -entry.z / ISO.step);
    return {
      treatment: 'ambiente',
      weight: Math.max(ISO.rest.floor, 1 - ISO.rest.behindPerStep * behind),
      blurPx: ISO.rest.blur[entry.layer] ?? 0,
    };
  }
  // La atmósfera tiene su peso propio en foco: es el fondo, y el fondo cede.
  if (entry.layer === 'cielo') return { treatment: 'fondo', weight: ISO.focus.cielo, blurPx: ISO.focus.blur.cielo };
  if (entry.layer === 'lavado') return { treatment: 'fondo', weight: ISO.focus.lavado, blurPx: ISO.focus.blur.lavado };
  const distance = Math.abs(entry.z - ISO.figureSteps[focusPlane] * ISO.step) / ISO.step;
  if (distance <= 1e-9) return { treatment: 'foco', weight: ISO.focus.subject, blurPx: 0 };
  if (distance <= 1 + 1e-9) return { treatment: 'vecino', weight: ISO.focus.next, blurPx: 0 };
  return { treatment: 'fondo', weight: ISO.focus.far, blurPx: 0 };
}

/**
 * La celda de la lámina que alimenta un punto del cuadro. Es la inversa de la
 * pose: `fuente = ancla + (punto − desplazamiento − ancla) / escala`. El check
 * la usa para probar que el cielo y el lavado cubren las cuatro esquinas.
 * @param {number} x en celdas @param {number} y en celdas
 * @param {{scale: number, offsetCells: number[]}} pose
 * @param {[number, number]} anchor en celdas
 */
export function sourceOf(x, y, pose, anchor) {
  return [
    anchor[0] + (x - pose.offsetCells[0] - anchor[0]) / pose.scale,
    anchor[1] + (y - pose.offsetCells[1] - anchor[1]) / pose.scale,
  ];
}

/**
 * El tono de un plano, muestreado a través de su pose. `sampling: 'point'` toma
 * la celda más cercana (retícula de estrellas: no se inventa un tono intermedio
 * que apague la estrella); cualquier otro valor interpola bilineal (campo
 * continuo: halos sin escalones). Fuera de la lámina vale 0 — no hay tinta
 * inventada en los bordes. Determinista: misma pose, misma lámina, mismos bytes.
 * @param {Float32Array} source el tono del plano en la grilla del modelo
 * @param {{scale: number, offsetCells: number[], sampling?: string}} pose
 * @param {{anchor: number[], cols: number, rows: number}} layout
 */
export function samplePlane(source, pose, layout) {
  const { anchor, cols, rows } = layout;
  const [ox, oy] = pose.offsetCells;
  const inv = 1 / pose.scale;
  const out = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    // índice fraccional de celda: la celda i vale `source[i]` y su centro es i.
    const fy = anchor[1] + (y + 0.5 - oy - anchor[1]) * inv - 0.5;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    const inY0 = y0 >= 0 && y0 < rows;
    const inY1 = y0 + 1 >= 0 && y0 + 1 < rows;
    const row0 = inY0 ? y0 * cols : -1;
    const row1 = inY1 ? (y0 + 1) * cols : -1;
    for (let x = 0; x < cols; x++) {
      const fx = anchor[0] + (x + 0.5 - ox - anchor[0]) * inv - 0.5;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const at = y * cols + x;
      const inX0 = x0 >= 0 && x0 < cols;
      const inX1 = x0 + 1 >= 0 && x0 + 1 < cols;
      let value = 0;
      if (pose.sampling === 'point') {
        const ix = Math.round(fx);
        const iy = Math.round(fy);
        value = ix >= 0 && ix < cols && iy >= 0 && iy < rows ? source[iy * cols + ix] : 0;
      } else {
        if (inY0) {
          if (inX0) value += source[row0 + x0] * (1 - tx) * (1 - ty);
          if (inX1) value += source[row0 + x0 + 1] * tx * (1 - ty);
        }
        if (inY1) {
          if (inX0) value += source[row1 + x0] * (1 - tx) * ty;
          if (inX1) value += source[row1 + x0 + 1] * tx * ty;
        }
      }
      out[at] = value;
    }
  }
  return out;
}

/**
 * Desenfoca un tono en su sitio (dos pasadas separables de tres tomas). El
 * desenfoque vive en el tono y no en la tinta: el motor vuelve a decidir el
 * peldaño después, así que un plano fuera de foco se lee como menos tinta y
 * tintas más blandas, no como puntos borrosos de otro tamaño.
 * @param {Float32Array} tone @param {number} cols @param {number} rows
 * @param {number} blurPx @param {number} [cell]
 */
export function blurInto(tone, cols, rows, blurPx, cell = CARD.cell) {
  const sigma = blurPx / cell;
  if (!(sigma > 0.02)) return tone;
  const w = Math.min(0.22, 0.34 * sigma);
  const span = 1 - 2 * w;
  const source = Float32Array.from(tone);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = y * cols + x;
      const left = x > 0 ? source[at - 1] : source[at];
      const right = x + 1 < cols ? source[at + 1] : source[at];
      tone[at] = w * left + span * source[at] + w * right;
    }
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = y * cols + x;
      const up = y > 0 ? tone[at - cols] : tone[at];
      const down = y + 1 < rows ? tone[at + cols] : tone[at];
      tone[at] = w * up + span * tone[at] + w * down;
    }
  }
  return tone;
}

/**
 * El punto del cuadro donde cae un punto del modelo, con la pose de su plano.
 * @param {[number, number]} point px del modelo
 * @param {{scale: number, offsetPx: number[]}} pose
 * @param {[number, number]} anchorPx
 */
export function projectPoint(point, pose, anchorPx) {
  return [
    anchorPx[0] + (point[0] - anchorPx[0]) * pose.scale + pose.offsetPx[0],
    anchorPx[1] + (point[1] - anchorPx[1]) * pose.scale + pose.offsetPx[1],
  ];
}
