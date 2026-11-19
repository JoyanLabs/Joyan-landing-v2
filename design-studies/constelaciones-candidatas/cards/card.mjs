/**
 * MONTA LA TARJETA. Un id entra; una tarjeta determinista sale.
 * ============================================================================
 * 1 · `data.mjs` deriva la constelación del catálogo (nodos, segmentos, planos,
 *     encuadre). No hay nada por constelación: `?id=Sge` es una tarjeta más.
 * 2 · `field.mjs` pinta las cinco capas con el motor y devuelve el RGBA.
 * 3 · esta página lo pone en el canvas y dibuja la capa de enlaces de `v1`
 *     (`link-behaviours.mjs`, 0,8 / 1,1 / 1,5 px) congelada en `CARD.p`.
 * 4 · el texto sale del dato, no del HTML.
 *
 * Nada anima: no hay bucle de rAF, ni reloj, ni `Math.random`. Dos procesos
 * separados producen el mismo PNG (`scripts/checks/check-cards.mjs`).
 */

import { CARD, constellationFor, validateCard } from './data.mjs';
import { buildField } from './field.mjs';
import { linkPhase, linkStyle, traceWindow } from '../../v1/link-behaviours.mjs';

const id = new URLSearchParams(location.search).get('id');
if (!id) throw new Error('falta ?id=<abreviatura del catálogo> en la URL de la tarjeta');

const data = constellationFor(id);
const errors = validateCard(data.constellation);
if (errors.length) throw new Error(`"${id}" no valida: ${errors.join(' | ')}`);

// Una desviación declarada y medida: el catálogo y el dibujo tienen que decir
// los mismos números o la tarjeta no se publica.
if (data.counts.nodes !== data.declared.nodes || data.counts.segments !== data.declared.segments) {
  throw new Error(`"${id}": el catálogo declara ${data.declared.nodes}/${data.declared.segments} `
    + `y la figura derivada mide ${data.counts.nodes}/${data.counts.segments}`);
}

const field = buildField(data);

// El tamaño de la tarjeta sale de `CARD`, no de un número repetido en el CSS.
const root = document.documentElement.style;
root.setProperty('--card-w', `${CARD.width}px`);
root.setProperty('--card-h', `${CARD.height}px`);
document.getElementById('links').setAttribute('viewBox', `0 0 ${CARD.width} ${CARD.height}`);

const canvas = document.getElementById('field');
canvas.width = field.width;
canvas.height = field.height;
const ctx = canvas.getContext('2d');
const image = ctx.createImageData(field.width, field.height);
image.data.set(field.rgba);
ctx.putImageData(image, 0, 0);

// --------------------------------------------------------------- los enlaces
// CON NADA ENFOCADO Y SIN SEÑAL EN VIAJE. La tarjeta es un still: el `trace` de
// la vara dibuja el enlace mientras la señal lo recorre, y congelarlo a mitad de
// camino deja un trazo cortado que se lee como un error. Se apaga la señal
// (`edge: -1`), no la conducta: el peso por plano es `depth` y el cometa de
// ambiente es `pulse`, ambos congelados en el instante de la tarjeta. Todo sale
// de `linkStyle`, no de una copia local.
const edge = -1;
const segment = (link) => {
  const [ax, ay] = field.nodesPx[link.a];
  const [bx, by] = field.nodesPx[link.b];
  return { ax, ay, bx, by };
};

const f3 = (n) => n.toFixed(3);
const line = (x1, y1, x2, y2, width, opacity) => `<line x1="${f3(x1)}" y1="${f3(y1)}" `
  + `x2="${f3(x2)}" y2="${f3(y2)}" stroke-width="${f3(width)}" `
  + `stroke-opacity="${f3(opacity)}"/>`;

const strokes = [];
const comets = [];
const behaviours = {};
const linksStarted = performance.now();
for (const link of data.links) {
  const style = linkStyle(
    { index: link.index, plane: link.plane, phase: linkPhase(link.index), inGroup: false },
    CARD.p,
    { active: false, edge },
  );
  behaviours[style.behaviour] = (behaviours[style.behaviour] ?? 0) + 1;
  const { ax, ay, bx, by } = segment(link);
  const at = (k) => [ax + (bx - ax) * k, ay + (by - ay) * k];
  // El trazo base es sólido en el peso del plano; un `trace` sólo llega hasta
  // donde la señal lo dibujó, y la señal es la misma ventana de la vara.
  if (style.opacity > 0) {
    const [tx, ty] = style.drawn < 1 ? at(style.drawn) : [bx, by];
    strokes.push(line(ax, ay, tx, ty, style.width, style.opacity));
  }
  // El cometa: las colas largas y tenues primero y la cabeza corta al final, así
  // la cabeza queda encima. Son segmentos del enlace, no un guion desplazado.
  if (!style.pulse) continue;
  for (let k = style.pulse.copies.length - 1; k >= 0; k--) {
    const copy = style.pulse.copies[k];
    if (copy.opacity <= 0 || copy.to <= copy.from) continue;
    const [x1, y1] = at(copy.from);
    const [x2, y2] = at(copy.to);
    comets.push(line(x1, y1, x2, y2, copy.width, copy.opacity));
  }
}

document.getElementById('links').innerHTML = strokes.join('') + comets.join('');
const linksMs = performance.now() - linksStarted;

// ------------------------------------------------------------------- el dato
document.getElementById('abbr').textContent = data.abbr;
document.getElementById('name').textContent = data.name;
document.getElementById('meaning').textContent = data.meaning;
document.getElementById('counts').textContent =
  `${data.counts.nodes} nodos · ${data.counts.segments} segmentos`;
document.title = `${data.name} · ${data.abbr}`;

// Lo que el chequeo lee en vez de adivinar: tiempos, capas, conductas.
window.__card = {
  id,
  abbr: data.abbr,
  name: data.name,
  meaning: data.meaning,
  counts: data.counts,
  declared: data.declared,
  frame: field.frame,
  p: field.p,
  timings: { ...field.timings, links: linksMs },
  stats: field.stats,
  links: { total: data.links.length, behaviours, edge, trace: traceWindow(CARD.p) },
  nodesPx: field.nodesPx,
};

// Dos cuadros: uno para que el canvas esté compuesto, otro para que las fuentes
// hayan entrado. Recién ahí la página se declara lista para la captura.
await document.fonts.ready;
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.documentElement.dataset.ready = 'true';
}));
