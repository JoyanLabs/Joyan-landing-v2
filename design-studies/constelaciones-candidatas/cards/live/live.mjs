/**
 * LA ESCENA VIVA — el mecanismo de v1, con la figura del catálogo.
 * ============================================================================
 * No es una imagen: es la escena de `design-studies/v1/` aplicada a un id del
 * catálogo. La entrada es la misma de la tarjeta (`?id=Ori`), pero las capas se
 * hornean por separado y la escena las compone, las enfoca y las deja respirar
 * con el mecanismo de la vara, punto por punto:
 *
 *   CAPAS      el CIELO y el LAVADO son hojas horneadas por el motor (`bake.mjs`:
 *              celda 5 con sobremuestreo 1,6 y 288 × 180 a celda 5
 *              transparente). La nebulosa está hecha de puntos con la escalera
 *              del motor: el tono de la atmósfera elige el peldaño y su alfa es
 *              la máscara de ese peldaño, sin opacidad continua. Las dos hojas
 *              llegan al canvas 1:1 y en un desplazamiento entero: el dither no
 *              se remuestrea. La FIGURA es SVG vectorial —nodos + aristas— en
 *              `viewBox` 0 0 480 300; el motor no pinta ni un nodo.
 *   BLUR       el cielo enfocado está HORNEADO (blur 6 px + downsample ×2, una
 *              sola vez por rebuild); el lavado va sin blur; los planos de nodos
 *              llevan `filter` CSS vivo con la escalera de v1 (foco 0 px ·
 *              medio 0 px · fondo 0,8 px, tono 1 / 0,6 / 0,42, tinta 1 / 0,96 /
 *              0,9). El cruce de foco es de OPACIDADES por WAAPI: 61 keyframes
 *              en 1 200 ms con la curva p³(10−15p+6p²); `sky.focus-copy` va de
 *              0 a 0,5 y el lavado de 1 a 0,94.
 *   PUNTERO    NO hay paralaje por puntero. El `pointermove` sólo hace `hover()`:
 *              clase `node-lit` y radio del core. Nada de mover planos, cámara ni
 *              geometría con el mouse: en v1 el paralaje es de la CÁMARA.
 *   INTERACCIÓN clic en un cuadrado de 26 CSS px, Enter/Space en los nodos
 *              `role=button tabindex=0`, Tab resalta, `Escape` vuelve, botón de
 *              reset, pausa/reanudar y vuelta automática a los 7 000 ms.
 *   FOCO       escalera de planos por distancia, `node-selected` a escala 1,12,
 *              cámara zoom 1,28 con mira 0,65 nodo + 0,35 centroide del grupo,
 *              dividida por la tasa del plano y recortada para que ningún plano
 *              salga del marco; enlaces con `focusMix`.
 *   REPOSO     emisión a 12 Hz (83,3 ms) por worker con `OffscreenCanvas` sobre
 *              la capa de atmósfera; el cielo horneado no se recalcula. La
 *              cámara no deriva sola: sólo se mueve al enfocar.
 *   REDUCIDO   sin rAF, sin worker, sin transiciones: el estado final aplicado
 *              de una vez y el still en el cuadro 100 de 720.
 *   ESTÁTICO   `?still=1` congela el reloj en el instante de la pieza (cuadro
 *              100): dos procesos separados producen el mismo PNG.
 *
 * `window.__live` expone lo que el chequeo MIDE —láminas y sus hashes, matrices,
 * filtros, keyframes, fase y estado— en vez de pedirle que crea en esta prosa.
 */

import { CARD, constellationFor, firstCatalogueId, validateCard } from '../data.mjs';
import { BAKE, bakeLayers } from './bake.mjs';
import {
  CYCLE_SECONDS, EMISSION_MS, FOCUS_ZOOM, FRAMES, NODE_PLANES, NODE_RATES, PARALLAX, RETURN_MS,
  STILL_FRAME, TRANSITION_MS, backPlaneOf, destination, ease, figureTransform, glowFor,
  groupOf, planeCamera, regionFor, stillSeconds, traceEdgeOf, treatmentsFor, wrap01,
} from './depth.mjs';
import {
  LINK_CYCLE_MS, PULSE, cyclePosition, linkPhase, linkStyle, traceWindow,
} from '../../../v1/link-behaviours.mjs';

const NS = 'http://www.w3.org/2000/svg';
const params = new URLSearchParams(location.search);
const DEFAULT_ID = firstCatalogueId();
const requested = params.get('id');
let id = requested || DEFAULT_ID;
let notice = null;
let data;
try {
  data = constellationFor(id);
} catch (cause) {
  if (id === DEFAULT_ID) throw cause;
  id = DEFAULT_ID;
  notice = `No hay constelación «${requested}» en el catálogo; se muestra ${id}.`;
  data = constellationFor(id);
}
if (notice) {
  const n = document.createElement('p');
  n.className = 'live-notice';
  n.textContent = notice;
  document.body.appendChild(n);
}
const errors = validateCard(data.constellation);
if (errors.length) throw new Error(`"${id}" no valida: ${errors.join(' | ')}`);
if (data.counts.nodes !== data.declared.nodes || data.counts.segments !== data.declared.segments) {
  throw new Error(`"${id}": el catálogo declara ${data.declared.nodes}/${data.declared.segments} `
    + `y la figura derivada mide ${data.counts.nodes}/${data.counts.segments}`);
}

const focusParam = params.get('focus');
const initialFocus = focusParam === null ? -1 : Number(focusParam);
if (initialFocus !== -1 && (!Number.isInteger(initialFocus) || initialFocus < 0 || initialFocus >= data.constellation.nodes.length)) {
  throw new Error(`focus tiene que ser un índice de nodo (0..${data.constellation.nodes.length - 1}): ${focusParam}`);
}
const still = params.get('still') === '1';
const reducedFlag = params.get('reduced') === '1';
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedFlag || motion.matches;

// ------------------------------------------------------------------- el mundo
const width = CARD.width;
const height = CARD.height;
const WORLD = BAKE.grid;
let f = figureTransform(width, height);
/** La tinta de los nodos: NO es ninguna parada de la paleta, así que una lámina
 * horneada no puede contenerla por accidente. Es lo que deja medir «cero nodos
 * pintados por el motor». */
const INK = '#E7F2EC';
const INK_RGB = [0xe7, 0xf2, 0xec];
/** El instante de la pieza, en el registro de v1. */
const clockStart = (STILL_FRAME / FRAMES) * LINK_CYCLE_MS;
const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);
const lerp = (a, b, t) => a + (b - a) * t;
const f2 = (value) => value.toFixed(2);
const f3 = (value) => value.toFixed(3);

const nodes = data.constellation.nodes.map((node, index) => ({
  index,
  plane: node.plane,
  magnitude: node.magnitude,
  world: [node.x * WORLD[0], node.y * WORLD[1]],
  // El cuerpo del nodo sale del dato, con la alternancia 1,4 / 1,7 de v1.
  baseCore: node.magnitude >= 0.85 ? 1.7 : 1.4,
  big: node.magnitude >= 0.85,
}));
const neighbours = nodes.map(() => new Set());
data.links.forEach((link) => {
  neighbours[link.a].add(link.b);
  neighbours[link.b].add(link.a);
});
const links = data.links.map((link, index) => ({
  index, from: link.a, to: link.b, plane: link.plane, phase: linkPhase(index),
  inGroup: false,
}));
const groupFor = (index) => groupOf(index, neighbours.map((set) => [...set]));

// ------------------------------------------------------------------ el horneado
const bakeStarted = performance.now();
const leaves = bakeLayers(data.constellation, { width, height });
const bakeMs = performance.now() - bakeStarted;

const sheet = (source) => {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext('2d').putImageData(new ImageData(source.pixels, source.width, source.height), 0, 0);
  return canvas;
};
const skySheet = sheet(leaves.sky);
const washSheet = sheet(leaves.wash);
const focusedSheet = sheet(leaves.focusedWash);

// ------------------------------------------------------------------- el DOM
const stage = document.getElementById('stage');
const skyCamera = document.querySelector('.sky-camera');
const washCamera = document.querySelector('.wash-camera');
const skyCanvas = document.getElementById('sky');
const washCanvas = document.getElementById('wash');
const vignetteCanvas = document.getElementById('vignette');
const linesSvg = document.getElementById('lines');
const nodesSvg = document.getElementById('nodes');
const copy = document.querySelector('.copy');
const hint = document.getElementById('hint');
const status = document.getElementById('status');
const resetButton = document.querySelector('.field-reset');
const pauseButton = document.querySelector('.field-pause');

const skyCtx = skyCanvas.getContext('2d', { alpha: false });
/**
 * El cielo enfocado es una SEGUNDA lámina, horneada una vez: copia del canvas
 * del cielo con `blur(6px)` a resolución completa y después downsample ×2, para
 * que el foco no aliase. No es un `filter` vivo sobre el cielo.
 */
function focusCopy(el) {
  const copyCanvas = document.createElement('canvas');
  copyCanvas.className = `${el.className} focus-copy`;
  copyCanvas.setAttribute('aria-hidden', 'true');
  el.after(copyCanvas);
  return copyCanvas;
}
const skyFocus = focusCopy(skyCanvas);
const skyFocusCtx = skyFocus.getContext('2d', { alpha: false, willReadFrequently: true });
const washCtx = washCanvas.getContext('2d');
const vignetteCtx = vignetteCanvas.getContext('2d');

// La figura: enlaces y pulsos en una capa, nodos en otra. Las dos reciben la
// cámara de la figura; cada plano de nodos compensa después su propia tasa.
const figure = document.createElementNS(NS, 'g');
figure.setAttribute('data-figure-camera', '');
linesSvg.append(figure);
const near = nodesSvg.querySelector('[data-core-camera]');
const nodePlaneEls = new Map([...nodesSvg.querySelectorAll('[data-node-plane]')]
  .map((el) => [el.dataset.nodePlane, el]));

const circle = (cx, cy, r, className) => {
  const node = document.createElementNS(NS, 'circle');
  node.setAttribute('cx', f3(cx));
  node.setAttribute('cy', f3(cy));
  node.setAttribute('r', f3(r));
  node.setAttribute('class', className);
  return node;
};

// Los nodos: cada uno con su halo, su núcleo y su anillo, DENTRO del plano de su
// plano de dibujo, más el cuadrado de impacto de 26 px como hermano.
const nodeEls = nodes.map((node) => {
  const star = document.createElementNS(NS, 'g');
  star.dataset.star = String(node.index);
  const glow = circle(node.world[0], node.world[1], node.big ? 9.28 : 8, 'glow');
  glow.setAttribute('opacity', '0');
  const core = circle(node.world[0], node.world[1], node.baseCore, 'core');
  const ring = circle(node.world[0], node.world[1], 2, 'ring');
  star.append(glow, core, ring);
  nodePlaneEls.get(node.plane).append(star);
  return { star, core, ring, glow, baseCore: node.baseCore };
});

const targets = nodes.map((node) => {
  const target = document.createElementNS(NS, 'path');
  for (const [name, value] of Object.entries({
    role: 'button', tabindex: '0', 'data-node': node.index, 'aria-pressed': 'false',
    'aria-label': `Acercarse al nodo ${node.index + 1} y sus enlaces`,
  })) target.setAttribute(name, value);
  target.dataset.depth = node.plane;
  target.addEventListener('click', (event) => activate(nearest(event, node.index)));
  target.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(node.index); }
  });
  target.addEventListener('pointermove', (event) => hover(nearest(event, node.index)));
  target.addEventListener('pointerenter', (event) => hover(nearest(event, node.index)));
  target.addEventListener('pointerleave', () => hover(-1));
  target.addEventListener('focus', () => hover(node.index));
  target.addEventListener('blur', () => hover(-1));
  nodePlaneEls.get(node.plane).append(target);
  return target;
});

// Los enlaces: uno por arista, con su respaldo oscuro, su cometa y el punto de
// la señal. La conducta de cada trazo es la de `link-behaviours.mjs`.
const backLayer = document.createElementNS(NS, 'g');
backLayer.setAttribute('class', 'link-underlay');
const inkLayer = document.createElementNS(NS, 'g');
inkLayer.setAttribute('class', 'links');
inkLayer.id = 'constellation-links';
const pulseLayer = document.createElementNS(NS, 'g');
pulseLayer.setAttribute('class', 'pulses');
const signal = document.createElementNS(NS, 'circle');
signal.setAttribute('class', 'signal');
signal.setAttribute('r', '1.7');
signal.setAttribute('opacity', '0');
figure.append(backLayer, inkLayer, pulseLayer, signal);

const linkBack = [];
const linkInk = [];
const linkCache = links.map(() => ({ ink: {}, back: {} }));
const pulsePaths = links.map(() => []);
const pulseCache = links.map(() => PULSE.copies.map(() => ({})));
links.forEach((link, index) => {
  const back = document.createElementNS(NS, 'path');
  const ink = document.createElementNS(NS, 'path');
  back.setAttribute('class', 'link-back');
  ink.setAttribute('class', 'link');
  for (const path of [back, ink]) { path.setAttribute('d', ''); path.setAttribute('fill', 'none'); }
  backLayer.append(back);
  inkLayer.append(ink);
  linkBack.push(back);
  linkInk.push(ink);
  for (let k = PULSE.copies.length - 1; k >= 0; k--) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('class', 'pulse');
    path.setAttribute('d', '');
    path.setAttribute('opacity', '0');
    pulseLayer.append(path);
    pulsePaths[index][k] = path;
  }
});

// ------------------------------------------------------------------- el dato
document.getElementById('abbr').textContent = data.abbr;
document.getElementById('name').textContent = data.name;
document.getElementById('meaning').textContent = data.meaning;
document.getElementById('counts').textContent = `${data.counts.nodes} nodos · ${data.counts.segments} segmentos`;
document.title = `${data.name} · escena viva`;

// ------------------------------------------------------------------ el estado
let camera = { x: 0, y: 0, zoom: 1 };
let transition = null;
let raf = 0;
let active = -1;
let returnLeft = 0;
let hidden = false;
let paused = false;
let ready = false;
let hovered = -1;
let lastTime = null;
let clock = clockStart;
let lastEmission = 0;
let animations = [];
let related = new Set();
let generation = 0;
let settled = true;
let focusedAt = 0;
let returnedAt = 0;
let worker = null;
let busy = false;
let emissionStarted = false;
let emissionFrames = 0;
let emissionCost = 0;
let emissionArrival = 0;
let emissionInterval = 0;
let emissionRequestAt = 0;
let emissionPaint = 0;
let emissionLatency = 0;
let emissionRequests = 0;

const treatmentOf = (index) => (index < 0 ? null : treatmentsFor(nodes[index].plane));

function light(index, on) {
  nodeEls[index].star.classList.toggle('node-lit', on);
  nodeEls[index].core.setAttribute('r', String(nodeEls[index].baseCore * (on ? 1.65 : 1)));
}

function hover(index) {
  if (hovered >= 0) light(hovered, hovered === active);
  hovered = index;
  if (index >= 0) light(index, true);
}

/** Una cámara de capa: la de la figura, atenuada por la tasa de la capa. */
const layerCamera = (rate, c = camera) => ({ x: c.x * rate, y: c.y * rate, zoom: 1 + (c.zoom - 1) * rate });

/** Un nodo en el espacio del grupo de la figura: sirve para dibujar enlaces, que
 * cruzan planos. Es `localPoint` de v1. */
function localPoint(index) {
  const [x, y] = nodes[index].world;
  const c = planeCamera(nodes[index].plane, camera);
  return [
    (x * c.zoom + (c.x + (c.zoom - 1) * f.x) / f.scale - camera.x / f.scale - (camera.zoom - 1) * f.x / f.scale) / camera.zoom,
    (y * c.zoom + (c.y + (c.zoom - 1) * f.y) / f.scale - camera.y / f.scale - (camera.zoom - 1) * f.y / f.scale) / camera.zoom,
  ];
}

/** El nodo más cercano al puntero entre los cuadrados de impacto. */
function nearest(event, fallback) {
  if (!event.detail && event.type === 'click') return fallback;
  let best = fallback;
  let distance = Infinity;
  nodes.forEach((node, index) => {
    const matrix = nodePlaneEls.get(node.plane).getScreenCTM();
    const point = new DOMPoint(node.world[0], node.world[1]).matrixTransform(matrix);
    const d = (event.clientX - point.x) ** 2 + (event.clientY - point.y) ** 2;
    if (d < distance) { distance = d; best = index; }
  });
  return best;
}

function paintSky() {
  const sw = Math.round(width * 1.12);
  const sh = Math.round(height * 1.12);
  skyCanvas.width = sw;
  skyCanvas.height = sh;
  skyFocus.width = Math.ceil(sw / 2);
  skyFocus.height = Math.ceil(sh / 2);
  // LA LÁMINA LLEGA 1:1 Y EN UN DESPLAZAMIENTO ENTERO. Con un destino fraccionario
  // —o con el ancho del sobremuestreo redondeado a otro entero— el navegador
  // remuestrea los 1 440 × 900 px de la hoja y el dither del motor queda
  // suavizado: los puntos pierden su peldaño y el cielo lee como un degradé. Se
  // recorta el sobremuestreo que no se usa conservando la escala de la lámina.
  const cropX = Math.round(width * 0.24);
  const cropY = Math.round(height * 0.24);
  skyCtx.drawImage(skySheet, -cropX, -cropY);
  // Desenfoque a resolución completa ANTES del downsample: sin él, el kernel
  // fraccionario aliase y el foco se ve en bloques. El scratch no se compone.
  const blurred = document.createElement('canvas');
  blurred.width = skySheet.width;
  blurred.height = skySheet.height;
  const c = blurred.getContext('2d');
  c.filter = 'blur(6px)';
  c.drawImage(skySheet, 0, 0);
  skyFocusCtx.drawImage(blurred, cropX, cropY, sw, sh, 0, 0, skyFocus.width, skyFocus.height);
  // Fuerza el raster diferido de Canvas 2D dentro de la medición del horneado.
  skyFocusCtx.getImageData(0, 0, 1, 1);
}

function paintWash(source = active < 0 ? washSheet : focusedSheet) {
  // Una subida, un dibujo. Sin intermedios del tamaño del cuadro ni blur vivo.
  washCtx.clearRect(0, 0, washCanvas.width, washCanvas.height);
  washCtx.drawImage(source, 8, 8, WORLD[0] * f.scale, WORLD[1] * f.scale);
}

/** El cometa: el sub-segmento del enlace, en fracciones 0..1, como en v1. */
function pulsePath(link, from, to) {
  const [ax, ay] = localPoint(link.from);
  const [bx, by] = localPoint(link.to);
  return `M${f2(ax + (bx - ax) * from)} ${f2(ay + (by - ay) * from)}`
    + `L${f2(ax + (bx - ax) * to)} ${f2(ay + (by - ay) * to)}`;
}

function setLink(el, cache, name, value) {
  if (cache[name] === value) return;
  cache[name] = value;
  el.setAttribute(name, value);
}

/** El peso del grupo: se abre sobre la transición de cámara, no de golpe. */
function focusMix() {
  return active < 0 || !transition ? 1 : ease(Math.min(1, transition.elapsed / TRANSITION_MS));
}

function paintLinks(p = cyclePosition(clock)) {
  const state = { active: active >= 0, edge: traceEdgeOf(links, active), focusMix: focusMix() };
  links.forEach((link, index) => {
    link.inGroup = related.has(link.from) || related.has(link.to);
    const style = linkStyle(link, p, state);
    const ink = linkInk[index];
    const back = linkBack[index];
    const dash = style.dash ? `${style.dash[0].toFixed(4)} ${style.dash[1].toFixed(4)}` : 'none';
    const offset = style.offset.toFixed(4);
    const opacity = style.opacity.toFixed(4);
    setLink(ink, linkCache[index].ink, 'opacity', opacity);
    setLink(ink, linkCache[index].ink, 'stroke-width', style.width.toFixed(3));
    setLink(back, linkCache[index].back, 'opacity', opacity);
    for (const [el, cache] of [[ink, linkCache[index].ink], [back, linkCache[index].back]]) {
      setLink(el, cache, 'stroke-dasharray', dash);
      setLink(el, cache, 'stroke-dashoffset', offset);
    }
    for (let k = 0; k < PULSE.copies.length; k++) {
      const copy = style.pulse?.copies[k];
      const el = pulsePaths[index][k];
      const cache = pulseCache[index][k];
      setLink(el, cache, 'opacity', copy ? copy.opacity.toFixed(4) : '0');
      if (!copy || copy.opacity <= 0 || copy.to <= copy.from) continue;
      setLink(el, cache, 'stroke-width', copy.width.toFixed(3));
      setLink(el, cache, 'd', pulsePath(link, copy.from, copy.to));
    }
  });
}

/** El halo respira con la fase de SU nodo; radio y opacidad, como v1. */
const glowCache = nodeEls.map(() => ({}));
function paintGlow() {
  const seconds = clock / 1000;
  nodeEls.forEach((node, index) => {
    const { brightness } = glowFor(index, seconds);
    const cache = glowCache[index];
    const radius = (node.big ? 9.28 : 8) * (0.95 + 0.05 * brightness);
    setLink(node.glow, cache, 'r', radius.toFixed(3));
    setLink(node.glow, cache, 'opacity', (0.34 + 0.66 * brightness).toFixed(4));
  });
}

function paint() {
  if (!ready) return;
  const tx = camera.x / f.scale + (camera.zoom - 1) * f.x / f.scale;
  const ty = camera.y / f.scale + (camera.zoom - 1) * f.y / f.scale;
  const value = `translate(${tx} ${ty}) scale(${camera.zoom})`;
  figure.setAttribute('transform', value);
  near.setAttribute('transform', value);
  nodePlaneEls.forEach((plane, name) => {
    const c = planeCamera(name, camera);
    const scale = c.zoom / camera.zoom;
    const x = (c.x + (c.zoom - 1) * f.x) / f.scale;
    const y = (c.y + (c.zoom - 1) * f.y) / f.scale;
    plane.setAttribute('transform',
      `translate(${(x - tx) / camera.zoom} ${(y - ty) / camera.zoom}) scale(${scale})`);
  });
  links.forEach((link, index) => {
    const [ax, ay] = localPoint(link.from);
    const [bx, by] = localPoint(link.to);
    const d = `M${ax} ${ay}L${bx} ${by}`;
    setLink(linkInk[index], linkCache[index].ink, 'd', d);
    setLink(linkBack[index], linkCache[index].back, 'd', d);
  });
  paintLinks();
  paintGlow();
  stage.dataset.painted = 'true';
}

/**
 * El cruce de foco: OPACIDAD y TRANSFORM de las capas del fondo, por WAAPI, con
 * 61 keyframes en 1 200 ms y la curva de v1. El cielo conserva la mitad de su
 * detalle nítido; el lavado vivo nunca desaparece. Es `setOptics` de v1.
 */
function setOptics(to, instant = false) {
  const opacities = [skyFocus, washCanvas].map((el) => Number(getComputedStyle(el).opacity));
  animations.forEach((a) => a.cancel());
  stage.dataset.focused = String(active >= 0);
  if (instant) paintWash();
  animations = [skyFocus, washCanvas].flatMap((el, i) => {
    const rate = i ? PARALLAX.wash : PARALLAX.sky;
    const from = layerCamera(rate);
    const end = layerCamera(rate, to);
    const focus = i ? (active < 0 ? 1 : 0.94) : (active < 0 ? 0 : 0.5);
    const keys = Array.from({ length: 61 }, (_, k) => {
      const p = ease(k / 60);
      const value = (key) => from[key] + (end[key] - from[key]) * p;
      return {
        offset: k / 60,
        transform: `translate(${value('x')}px,${value('y')}px) scale(${value('zoom')})`,
        opacity: opacities[i] + (focus - opacities[i]) * p,
      };
    });
    const options = { duration: instant ? 0 : TRANSITION_MS, fill: 'both' };
    const focusKeys = keys.map(({ offset, opacity }) => ({ offset, opacity }));
    const cameraKeys = keys.map(({ offset, transform }) => ({ offset, transform }));
    const frames = (list) => (instant ? [list.at(-1), list.at(-1)] : list);
    const pair = [el.animate(frames(focusKeys), options), el.parentElement.animate(frames(cameraKeys), options)];
    if (active < 0) pair.forEach((a) => { a.onfinish = () => a.cancel(); });
    if (!canRun() && !instant) pair.forEach((a) => a.pause());
    return pair;
  });
}

function canRun() {
  return ready && !hidden && !document.hidden && !paused && !reduced;
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastTime = null;
  animations.forEach((a) => a.pause());
}

function start() {
  if (raf || !canRun()) return;
  lastTime = null;
  animations.forEach((a) => { if (a.playState === 'paused') a.play(); });
  if (!raf) raf = requestAnimationFrame(tick);
}

/**
 * La emisión de reposo, 12 Hz, en un worker con `OffscreenCanvas`. Una sola
 * petición en vuelo y descarte por `generation`: un cuadro que llega tarde no
 * repinta un estado que ya cambió.
 */
function animateEmission() {
  if (busy) return;
  if (!worker) {
    worker = new Worker(new URL('./emission.mjs', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data: message }) => {
      busy = false;
      emissionFrames += 1;
      emissionCost = message.cost;
      const now = performance.now();
      emissionInterval = emissionArrival ? now - emissionArrival : 0;
      emissionLatency = emissionRequestAt ? now - emissionRequestAt : 0;
      emissionArrival = now;
      if (message.generation === generation && canRun()) {
        const paintStart = performance.now();
        paintWash(message.bitmap);
        emissionPaint = performance.now() - paintStart;
      }
      message.bitmap.close();
    };
    worker.onerror = () => {
      busy = false;
      worker.terminate();
      worker = null;
    };
  }
  busy = true;
  emissionStarted = true;
  emissionRequests += 1;
  emissionRequestAt = performance.now();
  worker.postMessage({
    id,
    constellation: data.constellation,
    grid: { cols: BAKE.washGrid[0], rows: BAKE.washGrid[1], cell: BAKE.washCell },
    seconds: clock / 1000,
    focused: active >= 0,
    generation,
  });
}

/** Una traza a lo largo de una arista por ciclo, más el pulso de los enlaces. */
function eventFrame() {
  const p = cyclePosition(clock);
  const edge = traceEdgeOf(links, active);
  if (edge >= 0) {
    const window = traceWindow(p);
    const [a, b] = [localPoint(links[edge].from), localPoint(links[edge].to)];
    signal.setAttribute('opacity', String(window.envelope ** 2));
    signal.setAttribute('cx', String(a[0] + (b[0] - a[0]) * window.at));
    signal.setAttribute('cy', String(a[1] + (b[1] - a[1]) * window.at));
  }
  paintLinks(p);
  paintGlow();
}

function tick(now) {
  raf = 0;
  if (!canRun()) return;
  const dt = lastTime === null ? 0 : now - lastTime;
  lastTime = now;
  clock += dt;
  if (returnLeft > 0) {
    returnLeft -= dt;
    if (returnLeft <= 0) {
      returnedAt = performance.now();
      activate(-1);
    }
  }
  if (transition) {
    transition.elapsed += dt;
    const p = Math.min(1, transition.elapsed / TRANSITION_MS);
    const e = ease(p);
    for (const key of ['x', 'y', 'zoom']) camera[key] = transition.from[key] + (transition.to[key] - transition.from[key]) * e;
    paint();
    if (p === 1) { transition = null; settled = true; }
  }
  if (clock - lastEmission >= 1000 / 12) {
    animateEmission();
    lastEmission = clock;
  }
  eventFrame();
  if (!raf) raf = requestAnimationFrame(tick);
}

/** El destino de la cámara del nodo, con el grupo de enlaces del catálogo. */
function destinationFor(index) {
  return destination(index, nodes, groupFor(index), width, height);
}

function applyState(index) {
  related = groupFor(index);
  const treatments = treatmentOf(index);
  nodePlaneEls.forEach((plane, name) => {
    plane.dataset.treatment = index < 0 ? 'base' : treatments[name];
  });
  nodeEls.forEach((node, i) => {
    node.star.classList.toggle('node-selected', i === index);
    node.star.classList.toggle('node-related', related.has(i));
  });
  targets.forEach((target, i) => {
    target.setAttribute('aria-pressed', String(i === index));
    light(i, i === index || i === hovered);
  });
  stage.dataset.activeNode = String(index);
  resetButton.hidden = index < 0;
  status.textContent = index < 0
    ? 'Vista completa de la constelación.'
    : `Nodo ${index + 1}. Acercamiento a su grupo de enlaces. Escape para volver.`;
  hint.dataset.hidden = String(index >= 0);
}

function activate(index) {
  const next = Number(index);
  if (!Number.isInteger(next) || next < -1 || next >= nodes.length) return;
  if (next === active && !transition) {
    // Reafirmar el mismo nodo reinicia la vuelta automática; no reinicia la cámara.
    returnLeft = next < 0 || reduced ? 0 : RETURN_MS;
    return;
  }
  skyFocus.style.opacity = '';
  washCanvas.style.opacity = '';
  active = next;
  generation += 1;
  applyState(next);
  returnLeft = next < 0 || reduced ? 0 : RETURN_MS;
  if (next >= 0) focusedAt = performance.now();
  const to = destinationFor(next);
  setOptics(to, reduced);
  if (reduced) {
    camera = to;
    transition = null;
    settled = true;
  } else {
    transition = { from: { ...camera }, to, elapsed: 0 };
    settled = false;
    start();
  }
  paint();
}

/** Medición: aplica el estado de foco en `p` sin reloj (captura de la mitad y
 * del final de la transición). Las opacidades del fondo también quedan en `p`. */
function seekFocus(index, p = 0.5) {
  const next = Number(index);
  if (!Number.isInteger(next) || next < 0 || next >= nodes.length) return;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  lastTime = null;
  active = next;
  generation += 1;
  applyState(next);
  returnLeft = 0;
  const to = destinationFor(next);
  const e = ease(clamp01(Number(p)));
  camera = {
    x: lerp(0, to.x, e),
    y: lerp(0, to.y, e),
    zoom: lerp(1, to.zoom, e),
  };
  transition = null;
  settled = e >= 1;
  animations.forEach((a) => a.cancel());
  animations = [];
  stage.dataset.focused = 'true';
  skyFocus.style.opacity = String(0.5 * e);
  washCanvas.style.opacity = String(1 - 0.06 * e);
  paintWash(e > 0.02 ? focusedSheet : washSheet);
  paint();
}

function rebuild() {
  f = figureTransform(width, height);
  generation += 1;
  paintSky();
  washCanvas.width = Math.ceil(WORLD[0] * f.scale + 16);
  washCanvas.height = Math.ceil(WORLD[1] * f.scale + 16);
  // La lámina del lavado lleva 8 px de guarda y se coloca en f − 8: el contenido
  // cae exactamente sobre el mundo, como el `.wash` de v1.
  washCanvas.style.width = `${washCanvas.width}px`;
  washCanvas.style.height = `${washCanvas.height}px`;
  washCanvas.style.left = `${f.x - 8}px`;
  washCanvas.style.top = `${f.y - 8}px`;
  paintWash();
  vignetteCanvas.width = leaves.vignette.width;
  vignetteCanvas.height = leaves.vignette.height;
  vignetteCtx.putImageData(new ImageData(leaves.vignette.pixels, leaves.vignette.width, leaves.vignette.height), 0, 0);
  targets.forEach((target, index) => target.setAttribute('d', regionFor(index, nodes, f)));
  ready = true;
  clock = clockStart;
  lastEmission = 0;
  stage.dataset.focused = 'false';
  stage.dataset.instant = String(reduced || still);
  signal.setAttribute('opacity', '0');
  paint();
  if (initialFocus >= 0) activate(initialFocus);
  else if (!still && !reduced) start();
}

// ------------------------------------------------------------------- listeners
resetButton.addEventListener('click', () => {
  const previous = active;
  activate(-1);
  if (previous >= 0) targets[previous]?.focus();
});
pauseButton.hidden = reduced;
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.textContent = paused ? 'Reanudar campo' : 'Pausar campo';
  if (paused) stop(); else start();
});
addEventListener('keydown', (event) => {
  if (event.key === 'Escape') activate(-1);
});
addEventListener('pagehide', () => { hidden = true; stop(); });
addEventListener('pageshow', () => { hidden = false; start(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
motion.addEventListener('change', () => {
  reduced = reducedFlag || motion.matches;
  pauseButton.hidden = reduced;
  stop();
  if (reduced) {
    animations.forEach((a) => a.cancel());
    animations = [];
    skyFocus.style.opacity = '';
    washCanvas.style.opacity = '';
    camera = destinationFor(active);
    transition = null;
    settled = true;
    returnLeft = 0;
    paintWash();
    paint();
  } else start();
});

// ------------------------------------------------------------------- la API
const hex = (bytes) => [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
const countInk = (pixels) => {
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] === INK_RGB[0] && pixels[i + 1] === INK_RGB[1] && pixels[i + 2] === INK_RGB[2] && pixels[i + 3] > 0) count += 1;
  }
  return count;
};
const planeRead = (name) => {
  const el = nodePlaneEls.get(name);
  const style = getComputedStyle(el);
  return {
    treatment: el.dataset.treatment ?? 'base',
    transform: el.getAttribute('transform'),
    filter: style.filter,
    ink: style.getPropertyValue('--plane-ink').trim(),
    tone: style.getPropertyValue('--plane-tone').trim(),
    blur: style.getPropertyValue('--plane-blur').trim(),
    opacity: style.opacity,
  };
};
const nodeRead = (node, index) => {
  const matrix = nodeEls[index].core.getScreenCTM();
  const point = new DOMPoint(node.world[0], node.world[1]).matrixTransform(matrix);
  return {
    index,
    plane: node.plane,
    world: [...node.world],
    screen: [point.x, point.y],
    coreR: Number(nodeEls[index].core.getAttribute('r')),
    lit: nodeEls[index].star.classList.contains('node-lit'),
    selected: nodeEls[index].star.classList.contains('node-selected'),
  };
};

const live = {
  id,
  abbr: data.abbr,
  name: data.name,
  meaning: data.meaning,
  counts: data.counts,
  declared: data.declared,
  get state() { return active >= 0 ? 'enfocado' : 'reposo'; },
  get focusNode() { return active; },
  get focusPlane() { return active >= 0 ? nodes[active].plane : null; },
  get hovered() { return hovered; },
  get settled() { return settled; },
  get reduced() { return reduced; },
  get still() { return still; },
  get paused() { return paused; },
  get running() { return Boolean(raf); },
  get clock() { return clock; },
  get progress() { return transition ? Math.min(1, transition.elapsed / TRANSITION_MS) : 1; },
  get returnMs() { return RETURN_MS; },
  get returnAfter() { return focusedAt && returnedAt ? returnedAt - focusedAt : null; },
  get stillFrame() { return { frame: STILL_FRAME, frames: FRAMES, seconds: stillSeconds(), p: STILL_FRAME / FRAMES }; },
  get frameIndex() { return Math.round(wrap01(clock / 1000 / CYCLE_SECONDS) * data.constellation.cycle.frames); },
  get treatment() {
    if (active < 0) return Object.fromEntries(NODE_PLANES.map((name) => [name, 'base']));
    const treatments = treatmentsFor(nodes[active].plane);
    return treatments;
  },
  get backPlane() { return active < 0 ? null : backPlaneOf(nodes[active].plane); },
  get nodes() { return nodes.map((node, index) => nodeRead(node, index)); },
  get planes() { return Object.fromEntries(NODE_PLANES.map((name) => [name, planeRead(name)])); },
  get transforms() {
    const read = (el) => {
      const style = getComputedStyle(el);
      return {
        transform: style.transform,
        filter: style.filter,
        opacity: style.opacity,
        visibility: style.visibility,
      };
    };
    return {
      skyCamera: read(skyCamera),
      washCamera: read(washCamera),
      sky: read(skyCanvas),
      skyFocus: read(skyFocus),
      wash: read(washCanvas),
      figure: { transform: figure.getAttribute('transform') },
      near: { transform: near.getAttribute('transform') },
      planes: Object.fromEntries(NODE_PLANES.map((name) => [name, {
        transform: nodePlaneEls.get(name).getAttribute('transform'),
        filter: getComputedStyle(nodePlaneEls.get(name)).filter,
        opacity: getComputedStyle(nodePlaneEls.get(name)).opacity,
      }])),
      nodes: nodes.map((node, index) => nodeRead(node, index).screen),
    };
  },
  /** Las animaciones WAAPI vivas: duración, cantidad de keyframes, offsets,
   * opacidades y transforms. Es lo que el chequeo MIDE del cruce de foco. */
  optics() {
    return document.getAnimations()
      .filter((animation) => animation.effect && animation.effect.target)
      .map((animation) => {
        const target = animation.effect.target;
        const keys = animation.effect.getKeyframes();
        const role = target === skyFocus ? 'cielo-foco'
          : target === washCanvas ? 'lavado'
            : target === skyCamera ? 'camara-cielo'
              : target === washCamera ? 'camara-lavado' : 'otro';
        return {
          role,
          duration: animation.effect.getTiming().duration,
          keyframes: keys.length,
          easing: animation.effect.getTiming().easing,
          offsets: keys.map((key) => key.offset),
          opacities: keys.map((key) => (key.opacity === undefined ? null : Number(key.opacity))),
          transforms: keys.map((key) => key.transform ?? null),
          playState: animation.playState,
        };
      });
  },
  /** Las láminas horneadas: tamaño, celda, peldaños usados y la tinta de los
   * nodos que NO aparece en ninguna. */
  leaves() {
    return {
      sky: {
        width: leaves.sky.width, height: leaves.sky.height, cell: BAKE.skyCell,
        cols: Math.ceil((width * BAKE.overscan) / BAKE.skyCell),
        rows: Math.ceil((height * BAKE.overscan) / BAKE.skyCell),
        overscan: BAKE.overscan,
        steps: leaves.sky.steps.reduce((count, step) => count + (step > 0 ? 1 : 0), 0),
        histogram: leaves.sky.histogram,
      },
      wash: {
        width: leaves.wash.width, height: leaves.wash.height, cell: BAKE.washCell,
        cols: BAKE.washGrid[0], rows: BAKE.washGrid[1], transparent: true,
        steps: leaves.wash.steps.reduce((count, step) => count + (step > 0 ? 1 : 0), 0),
        histogram: leaves.wash.histogram,
      },
      focusedWash: { width: leaves.focusedWash.width, height: leaves.focusedWash.height, desaturate: BAKE.desaturate },
      ink: {
        hex: INK,
        inSky: countInk(leaves.sky.pixels),
        inWash: countInk(leaves.wash.pixels),
      },
    };
  },
  /** El sha256 de cada lámina: dos procesos separados tienen que dar el mismo. */
  async hashLeaves() {
    const digest = async (pixels) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', pixels)));
    return {
      sky: await digest(leaves.sky.pixels),
      wash: await digest(leaves.wash.pixels),
      focusedWash: await digest(leaves.focusedWash.pixels),
      vignette: await digest(leaves.vignette.pixels),
    };
  },
  get emission() {
    return {
      started: emissionStarted, frames: emissionFrames, cost: emissionCost,
      interval: emissionInterval, latency: emissionLatency, paint: emissionPaint, requests: emissionRequests,
      requestMs: EMISSION_MS, worker: Boolean(worker),
    };
  },
  get timing() {
    return { bakeMs, sky: [skyCanvas.width, skyCanvas.height], wash: [washCanvas.width, washCanvas.height] };
  },
  get geometry() {
    return {
      world: [...WORLD],
      frame: [width, height],
      figure: { ...f },
      zoom: FOCUS_ZOOM,
      rates: [...NODE_RATES],
      parallax: { ...PARALLAX },
      transitionMs: TRANSITION_MS,
      returnMs: RETURN_MS,
      hitPx: 26,
      selectionScale: 1.12,
    };
  },
  get links() {
    const all = [...pulsePaths.flat(), ...linkInk];
    return {
      total: links.length,
      pulses: pulsePaths.flat().length,
      copies: PULSE.copies.length,
      visible: all.filter((el) => Number(el.getAttribute('opacity')) > 0.01).length,
    };
  },
  activate,
  seekFocus,
  reset: () => activate(-1),
};
window.__live = live;

// --------------------------------------------------------------- listo, pintar
rebuild();
await document.fonts.ready;
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.documentElement.dataset.ready = 'true';
}));
