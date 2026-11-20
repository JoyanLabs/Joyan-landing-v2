/**
 * DE UN ID DEL CATÁLOGO A UNA CONSTELACIÓN QUE EL MODELO PUEDE PINTAR.
 * ============================================================================
 * La tarjeta no es un caso especial: `constellationFor(Ori)` y `constellationFor(Sge)`
 * recorren la misma función. No hay una entrada por constelación en este
 * archivo, y por eso agregar una cuarta no toca código: se pasa otro id.
 *
 * TRES FUENTES, NINGUNA REESCRITA.
 *   · `datos/catalogo-88.json` — las 88 figuras, J2000, d3-celestial (BSD-3):
 *     polilíneas [ra, dec] y los conteos declarados (`nodos`, `segmentos`).
 *   · `datos/nombres-88.mjs` — nombre latino (`la`) y glosa española (`fuente`)
 *     tomados del anexo de Wikipedia que cita a Comellas, 1987.
 *   · `scripts/scene-src/constellation.mjs` — el modelo de cinco capas. No se
 *     reimplementa: se le entrega el objeto que espera.
 *
 * QUÉ SE DERIVA Y CON QUÉ REGLA (nada inventado, todo reproducible):
 *   proyección  gnomónica sobre el centroide de las estrellas (la misma de
 *               `construir-figuras.mjs`): las rectas del cielo siguen rectas.
 *   nodos       una coordenada distinta = un nodo. Da exactamente los conteos
 *               que el catálogo declara para las 88 (767 nodos, 743 segmentos).
 *   segmentos   cada par consecutivo de cada polilínea, deduplicado. El
 *               catálogo y el dibujo coinciden o esto no se publica.
 *   planos      capa de dibujo, no una distancia: `i % 3` reparte los nodos en
 *               los tres planos del modelo. El catálogo no trae paralajes y no
 *               se inventan: la tarjeta no afirma qué estrella está más cerca.
 *   magnitud    peso derivado del grado del nodo (más segmentos, más cuerpo)
 *               más una sacudida determinista del `hashNoise` del motor.
 *   copy        el título de nodo es su designación RA/Dec, no un nombre de
 *               estrella inventado; `content.line` describe el trazo. Nada de
 *               esto se imprime en la tarjeta: la tarjeta imprime figura,
 *               abreviatura, nombre, glosa y conteos.
 *
 * PROCEDENCIA. Las 88 son constelaciones IAU: `provenance.official` es `true`.
 * El modelo exige `official: false` porque nació para asterismos del proyecto
 * (`genghe`, `alrumh`); esa única queja está declarada y filtrada en
 * `validateCard`, y `scripts/checks/check-cards.mjs` la fija. No se miente en
 * el dato para pasar un validador escrito para otro caso.
 */

import { hashNoise } from '../../../scripts/scene-src/engine.mjs';
import { validateConstellation } from '../../../scripts/scene-src/constellation.mjs';
import { NOMBRES } from '../datos/nombres-88.mjs';

// El catálogo se lee igual en Node y en el navegador: por `file:` con el
// sistema de archivos, por `http:` con `fetch`. Una sola fuente de verdad.
const CATALOGO_URL = new URL('../datos/catalogo-88.json', import.meta.url);
const CATALOGO = CATALOGO_URL.protocol === 'file:'
  ? JSON.parse((await import('node:fs')).readFileSync(CATALOGO_URL, 'utf8'))
  : await (await fetch(CATALOGO_URL)).json();

const NOMBRE_POR_ID = new Map(NOMBRES.map((entry) => [entry.id, entry]));
const CONSTELACION_POR_ID = new Map(CATALOGO.constelaciones.map((entry) => [entry.id, entry]));

/** La tarjeta: 1440 × 900 px, 3 px por celda, 480 × 300 celdas (cuadradas), la
 * escala de puntos de la vara a 1440. */
export const CARD = Object.freeze({
  width: 1440,
  height: 900,
  cell: 3,
  cols: 480,
  rows: 300,
  /** El instante congelado: 0,375 del ciclo (135 de 360 cuadros a 12 fps). */
  p: 0.375,
  frame: 135,
});

/** La ventana donde vive la figura, en fracciones de la tarjeta. A la izquierda
 * queda el bolsillo de la copia, como en `design-studies/v1/`. */
export const FIGURA = Object.freeze({ x0: 0.50, y0: 0.12, x1: 0.96, y1: 0.86 });

/** La paleta aprobada de la casa: siete tonos, suelo #020405, tinta #b4cabe. */
export const PALETA = Object.freeze({
  ground: '#020405',
  ink: '#b4cabe',
  stops: Object.freeze(['#020405', '#0a1418', '#16292f', '#254450', '#3f6873', '#7a9c9e', '#b4cabe']),
});

/** La receta de capas aprobada, la de `genghe.mjs` (`docs/ESTETICA-CONSTELACION.md`). */
const CAPAS = Object.freeze({
  sky: {
    kind: 'dust',
    density: 0.048,
    seed: 20261105,
    veil: 1,
    keep: 0.85,
    structure: { pocket: 0.10, ring: 5, outer: 0.008, band: 11, noise: 0.95 },
    clusters: [{ x: 0.15, y: 0.74, r: 0.075, boost: 0.7 }, { x: 0.85, y: 0.18, r: 0.06, boost: 0.6 }],
  },
  wash: { kind: 'atmosphere', seed: 20261105, gain: 0.14, drift: 0.35 },
  figure: { planes: ['far', 'mid', 'near'], parts: ['figura'], haloReach: 32 },
  vignette: { start: 0.35, exponent: 1.92, strength: 0.227 },
  cores: { inner: 3.0, outer: 6.8 },
});

const DEG = Math.PI / 180;
const PLANOS = Object.freeze(['far', 'mid', 'near']);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const r4 = (n) => Math.round(n * 1e4) / 1e4;

/** Una coordenada distinta es un nodo. Cuatro decimales, como el dataset. */
const clave = ([ra, dec]) => `${ra.toFixed(4)},${dec.toFixed(4)}`;

/** Centroide en la esfera: media de vectores unitarios (cruza RA = ±180°). */
function centroide(puntos) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const [ra, dec] of puntos) {
    const a = ra * DEG;
    const d = dec * DEG;
    x += Math.cos(d) * Math.cos(a);
    y += Math.cos(d) * Math.sin(a);
    z += Math.sin(d);
  }
  return { ra0: Math.atan2(y, x) / DEG, dec0: Math.atan2(z, Math.hypot(x, y)) / DEG };
}

/** Gnomónica desde el centroide, en grados sobre el plano tangente. */
function proyectar(ra, dec, ra0, dec0) {
  let da = ra - ra0;
  da = ((((da + 180) % 360) + 360) % 360) - 180;
  const sd = Math.sin(dec * DEG);
  const cd = Math.cos(dec * DEG);
  const s0 = Math.sin(dec0 * DEG);
  const c0 = Math.cos(dec0 * DEG);
  const cosc = s0 * sd + c0 * cd * Math.cos(da * DEG);
  return {
    x: (cd * Math.sin(da * DEG) / cosc) / DEG,
    y: ((c0 * sd - s0 * cd * Math.cos(da * DEG)) / cosc) / DEG,
  };
}

/** Designación derivada de las coordenadas: no es un nombre propio inventado. */
function designacion(ra, dec) {
  const horas = ((ra % 360) + 360) % 360 / 15;
  const h = Math.floor(horas);
  const m = Math.floor((horas - h) * 60);
  const signo = dec < 0 ? '−' : '+';
  const d = Math.floor(Math.abs(dec));
  const mm = Math.round((Math.abs(dec) - d) * 60);
  return `RA ${h}h ${String(m).padStart(2, '0')}m · δ ${signo}${d}° ${String(mm).padStart(2, '0')}′`;
}

/**
 * El objeto de constelación del modelo, derivado del catálogo. `links` va vacío
 * a propósito: la capa de enlaces de la tarjeta es la de `v1`
 * (`link-behaviours.mjs`, 0,8 / 1,1 / 1,5 px), sobre el campo de puntos; el
 * modelo pinta cielo, lavado, halos, viñeta y núcleos.
 * @param {string} id abreviatura IAU (el campo `id` del catálogo)
 */
export function constellationFor(id) {
  const entrada = CONSTELACION_POR_ID.get(id);
  const nombre = NOMBRE_POR_ID.get(id);
  if (!entrada) throw new Error(`"${id}" no está en datos/catalogo-88.json`);
  if (!nombre) throw new Error(`"${id}" no está en datos/nombres-88.mjs`);

  // 1 · nodos únicos, en orden de aparición, con su grado (segmentos que lo tocan).
  const indice = new Map();
  const crudos = [];
  for (const linea of entrada.lineas) {
    for (const punto of linea) {
      const k = clave(punto);
      if (!indice.has(k)) {
        indice.set(k, crudos.length);
        crudos.push({ ra: punto[0], dec: punto[1], grado: 0, trazo: 0 });
      }
    }
  }
  // 2 · segmentos: cada par consecutivo, deduplicado; el grado se cuenta una vez.
  const pares = new Map();
  entrada.lineas.forEach((linea, trazo) => {
    for (let i = 0; i < linea.length; i++) {
      const a = indice.get(clave(linea[i]));
      crudos[a].trazo = Math.min(crudos[a].trazo, trazo);
      if (i + 1 >= linea.length) continue;
      const b = indice.get(clave(linea[i + 1]));
      if (a === b) continue;
      const llave = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (pares.has(llave)) continue;
      pares.set(llave, [a, b]);
      crudos[a].grado += 1;
      crudos[b].grado += 1;
    }
  });

  // 3 · proyección y encuadre: escala isotrópica, dentro de la ventana de figura.
  const { ra0, dec0 } = centroide(crudos.map((p) => [p.ra, p.dec]));
  const planos = crudos.map((p) => ({ ...p, ...proyectar(p.ra, p.dec, ra0, dec0) }));
  const xs = planos.map((p) => p.x);
  const ys = planos.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const ancho = (FIGURA.x1 - FIGURA.x0) * 0.94;
  const alto = (FIGURA.y1 - FIGURA.y0) * 0.94;
  const MIN_SPAN = 2; // grados: una figura más chica que esto no se amplía sin límite
  const escala = Math.min(ancho / Math.max(maxX - minX, MIN_SPAN), alto / Math.max(maxY - minY, MIN_SPAN));
  const cx = (FIGURA.x0 + FIGURA.x1) / 2;
  const cy = (FIGURA.y0 + FIGURA.y1) / 2;
  const centroX = (minX + maxX) / 2;
  const centroY = (minY + maxY) / 2;

  const gradoMax = Math.max(1, ...crudos.map((p) => p.grado));
  const semilla = Number(entrada.rank) || 1;
  const nodos = planos.map((p, i) => {
    // magnitud: el peso del nodo en la red, no una magnitud fotométrica.
    const magnitud = r4(clamp01(0.72 + 0.22 * (p.grado / gradoMax) + 0.06 * hashNoise(i, semilla, 5)));
    return {
      id: `${id.toLowerCase()}-${i + 1}`,
      // norte arriba, este a la izquierda: la convención de carta celeste.
      x: r4(clamp01(cx - (p.x - centroX) * escala)),
      y: r4(clamp01(cy - (p.y - centroY) * escala)),
      plane: PLANOS[i % PLANOS.length],
      magnitude: magnitud,
      content: {
        title: designacion(p.ra, p.dec),
        line: `Nodo del trazo ${p.trazo + 1}, plano ${PLANOS[i % PLANOS.length]}.`,
        partOf: 'figura',
        provisional: true,
      },
    };
  });

  const enlaces = [...pares.values()].map(([a, b], index) => ({
    index,
    from: nodos[a].id,
    to: nodos[b].id,
    // El plano del enlace es el más lejano de sus dos extremos, la regla del
    // modelo: un trazo entre un nodo cercano y uno lejano se lee al peso lejano.
    plane: PLANOS[Math.min(PLANOS.indexOf(nodos[a].plane), PLANOS.indexOf(nodos[b].plane))],
    a,
    b,
  }));

  const constelacion = {
    id,
    name: nombre.la,
    meaning: nombre.fuente,
    provenance: {
      culture: 'IAU',
      source: 'd3-celestial · data/constellations.lines.json (Olaf Frohn) · BSD-3-Clause',
      official: true,
      notes: 'Constelación IAU de las 88. Las líneas son convención de carta: la IAU fija límites y '
        + 'abreviaturas, no figuras. Coordenadas J2000 del dataset.',
    },
    // Identifica el estudio, no un producto: no hay nombre de marca que publicar.
    project: { id: 'catalogo-88', label: 'catálogo-88', publish: false },
    cycle: { fps: 12, frames: 360 },
    stage: { cols: CARD.cols, rows: CARD.rows },
    palette: { ground: PALETA.ground, stops: [...PALETA.stops] },
    layers: {
      sky: CAPAS.sky,
      wash: CAPAS.wash,
      figure: { ...CAPAS.figure, parts: ['figura'] },
      vignette: CAPAS.vignette,
      cores: CAPAS.cores,
    },
    nodes: nodos,
    links: [],
    composition: {
      reference: { width: CARD.width, height: CARD.height },
      // El bloque de copia de la tarjeta, el mismo rectángulo que pinta el HTML.
      calm: { x: 72, y: 104, w: 392, h: 180 },
    },
    camera: { home: { x: cx, y: cy, scale: 1.1 }, focus: {}, travel: {} },
  };

  return {
    id,
    abbr: id,
    name: nombre.la,
    meaning: nombre.fuente,
    alt: nombre.alt ?? [],
    counts: { nodes: nodos.length, segments: enlaces.length },
    declared: { nodes: entrada.nodos, segments: entrada.segmentos },
    constellation: constelacion,
    links: enlaces,
    degrees: crudos.map((p) => p.grado),
    rank: entrada.rank,
  };
}

/**
 * La única queja conocida del validador del modelo, fijada como texto exacto.
 * El modelo nació para asterismos del proyecto y exige `official: false`; las
 * 88 del catálogo son constelaciones IAU. Se filtra esa regla, no otras.
 */
export const EXPECTED_DEVIATION = 'provenance.official must be false for an asterism: it is not an IAU constellation';

/**
 * Validación de la tarjeta: todo lo que el modelo exige, menos la regla de
 * procedencia que no aplica a una constelación IAU.
 * @param {object} c
 * @returns {string[]}
 */
export function validateCard(c) {
  return validateConstellation(c).filter((error) => error !== EXPECTED_DEVIATION);
}

/**
 * El primer id del catálogo, para que la escena tenga una portada sin que el
 * código conozca ninguna constelación concreta. Si se reordena el catálogo, la
 * portada cambia con él: el flujo sigue sin saber ningún id.
 */
export function firstCatalogueId() {
  const first = CONSTELACION_POR_ID.keys().next();
  if (!first.done) return first.value;
  throw new Error('el catálogo está vacío');
}
