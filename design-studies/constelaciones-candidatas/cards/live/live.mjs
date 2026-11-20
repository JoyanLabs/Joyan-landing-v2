/**
 * LA ESCENA VIVA — un id del catálogo, ocho planos que se mueven.
 * ============================================================================
 * La tarjeta quieta aplica la pose entera y la pinta en un PNG. Esta página
 * conserva la misma entrada (`?id=Ori`), la misma pila de ocho planos y el
 * mismo modelo de cinco capas, pero cada plano se hornea en su propia lámina
 * (`bake.mjs`), y la escena los mueve en tiempo real:
 *
 *   PARALAJE   el puntero desplaza cada capa con la tasa de v1 —cielo 0,18 ·
 *              lavado 0,52 · figura 1,00—: el cielo casi no se mueve y la
 *              figura lleva todo el recorrido. Es lo que hace visible que son
 *              planos distintos y no una imagen.
 *   FOCO       un clic en un nodo lleva la cámara a su plano (zoom 1,28, las
 *              tasas `NODE_RATES` de v1): el plano del sujeto se afirma y pesa
 *              1, el intermedio se atenúa, el MÁS LEJANO desde el sujeto se
 *              desenfoca (4,0 px). `Escape` vuelve a la vista completa.
 *   TRANSICIÓN interrumpible: un clic durante la transición arranca desde el
 *              estado actual, no desde el destino anterior. Es el `setOptics`
 *              de v1 aplicado a la cámara.
 *   ENLACES    la capa SVG de la vara (`link-behaviours.mjs`): trazo base por
 *              plano (0,8 / 1,1 / 1,5 px) y cometa con pulso.
 *   HALO       cada nodo lleva su núcleo y su halo en el grupo de SU plano, con
 *              la transformación, la opacidad y el desenfoque de ese plano.
 *   REDUCIDO   con `prefers-reduced-motion` no hay reloj, ni paralaje, ni
 *              transición: el estado final se aplica de una vez.
 *   ESTÁTICO   `?still=1` congela el pulso en el instante de la pieza
 *              (`CARD.p`) para que una captura sea reproducible byte a byte en
 *              dos procesos separados.
 *
 * El estado se expone en `window.__live` para que el chequeo MIDA la escena
 * —proyecciones, poses, nitidez y píxeles— en vez de creerle a la prosa.
 */

import { CARD, constellationFor, firstCatalogueId, validateCard } from '../data.mjs';
import { nodePx } from '../field.mjs';
import { figurePocket } from '../../../../scripts/scene-src/constellation.mjs';
import {
  DEPTH, REST_STACK, applyTransform, cameraTarget, focusTreatment, layerTransform,
} from './depth.mjs';
import { BAKE, bakeStack } from './bake.mjs';
import { LINK_CYCLE_MS, PULSE, cyclePosition, linkPhase, linkStyle } from '../../../v1/link-behaviours.mjs';

const NS = 'http://www.w3.org/2000/svg';
const params = new URLSearchParams(location.search);
// A visitor gets a scene, not a blank page. Without ?id the scene opens on the
// default constellation; an unknown id falls back to it with a visible note
// instead of throwing and leaving an empty frame (that is what the direction
// saw: a white page with only the footer).
const DEFAULT_ID = firstCatalogueId();
const requested = params.get('id');
let id = requested || DEFAULT_ID;
let notice = null;
let data;
try {
  data = constellationFor(id);
} catch (cause) {
  // An unknown id must not leave an empty frame: fall back to the default and
  // say so on the page.
  if (id === DEFAULT_ID) throw cause;
  id = DEFAULT_ID;
  notice = `No hay constelación «${requested}» en el catálogo; se muestra ${id}.`;
  data = constellationFor(id);
}
// A fallback the visitor can see, instead of a silent substitution.
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

const clockStart = CARD.p * LINK_CYCLE_MS;
const centre = [CARD.width / 2, CARD.height / 2];
const clamp = (value, lo, hi) => (value < lo ? lo : value > hi ? hi : value);
const ease = (p) => p * p * p * (10 + p * (-15 + 6 * p));
const lerp = (a, b, t) => a + (b - a) * t;
const f2 = (value) => value.toFixed(2);
const f3 = (value) => value.toFixed(3);

// --------------------------------------------------------------- el horneado
const pocket = figurePocket(data.constellation);
const anchorCells = [pocket.cx * CARD.cols, pocket.cy * CARD.rows];
const anchorPx = [anchorCells[0] * CARD.cell, anchorCells[1] * CARD.cell];
const bakeStarted = performance.now();
const baked = bakeStack(data.constellation, anchorCells);
const bakeMs = performance.now() - bakeStarted;

const figureEntry = (plane) => REST_STACK.find((entry) => entry.layer === 'figura' && entry.plane === plane);
const restNodes = data.constellation.nodes.map((node, index) => {
  const model = nodePx(node, CARD.cell);
  const entry = figureEntry(node.plane);
  return {
    index,
    plane: node.plane,
    magnitude: node.magnitude,
    model,
    q: [
      anchorPx[0] + (model[0] - anchorPx[0]) * entry.scale + entry.offsetPx[0],
      anchorPx[1] + (model[1] - anchorPx[1]) * entry.scale + entry.offsetPx[1],
    ],
  };
});
const restPose = new Map(REST_STACK.map((entry) => [entry.key, {
  scale: entry.scale,
  tx: entry.offsetPx[0],
  ty: entry.offsetPx[1],
}]));

// ---------------------------------------------------------------- la escena
const stage = document.getElementById('stage');
const linksSvg = document.getElementById('links');
const nodesSvg = document.getElementById('nodes');
const planeEls = new Map();
for (const plane of baked) {
  const canvas = document.createElement('canvas');
  canvas.width = plane.width;
  canvas.height = plane.height;
  canvas.className = 'plane';
  canvas.dataset.plane = plane.entry.key;
  canvas.dataset.layer = plane.entry.layer;
  canvas.getContext('2d').putImageData(new ImageData(plane.rgba, plane.width, plane.height), 0, 0);
  stage.insertBefore(canvas, nodesSvg);
  planeEls.set(plane.entry.key, canvas);
}
// Los enlaces viven entre la figura y los núcleos: los núcleos van por encima
// de todo, como en el modelo.
stage.insertBefore(linksSvg, planeEls.get('núcleos:far'));

const planeGroups = new Map([...nodesSvg.querySelectorAll('[data-node-plane]')]
  .map((group) => [group.dataset.nodePlane, group]));

const circle = (cx, cy, r, dataName) => {
  const node = document.createElementNS(NS, 'circle');
  node.setAttribute('cx', f3(cx));
  node.setAttribute('cy', f3(cy));
  node.setAttribute('r', f3(r));
  if (dataName) node.setAttribute(`data-${dataName}`, '');
  return node;
};

const nodeEls = restNodes.map((node, index) => {
  const group = planeGroups.get(node.plane);
  const wrap = document.createElementNS(NS, 'g');
  wrap.setAttribute('class', 'node');
  wrap.dataset.node = String(index);
  const magnitude = Number.isFinite(node.magnitude) ? node.magnitude : 0.5;
  const glow = circle(node.q[0], node.q[1], 16 + 14 * magnitude, 'node-glow');
  const core = circle(node.q[0], node.q[1], 1.8 + 2.0 * magnitude, 'node-core');
  const hit = circle(node.q[0], node.q[1], 16, 'node-hit');
  hit.setAttribute('role', 'button');
  hit.setAttribute('tabindex', '0');
  hit.setAttribute('aria-label', `Enfocar el nodo ${index + 1} y su plano`);
  hit.addEventListener('click', (event) => { event.stopPropagation(); activate(index); });
  hit.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(index); }
  });
  wrap.append(glow, core, hit);
  group.append(wrap);
  return { wrap, core, glow, hit, baseCoreR: 1.8 + 2.0 * magnitude, baseGlowR: 16 + 14 * magnitude };
});

const f = (value) => Number(value).toFixed(2);
const linkEls = data.links.map((link) => {
  const base = document.createElementNS(NS, 'line');
  base.setAttribute('class', 'link-base');
  linksSvg.append(base);
  const pulses = [];
  for (let k = PULSE.copies.length - 1; k >= 0; k--) {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('class', 'pulse');
    line.setAttribute('opacity', '0');
    linksSvg.append(line);
    pulses[k] = line;
  }
  return { link, base, pulses };
});

// ------------------------------------------------------------------- el dato
document.getElementById('abbr').textContent = data.abbr;
document.getElementById('name').textContent = data.name;
document.getElementById('meaning').textContent = data.meaning;
document.getElementById('counts').textContent = `${data.counts.nodes} nodos · ${data.counts.segments} segmentos`;
document.title = `${data.name} · escena viva`;
const hint = document.getElementById('hint');

// ------------------------------------------------------------------ el estado
let camera = { zoom: 1, pan: [0, 0] };
let weights = new Map(REST_STACK.map((entry) => [entry.key, entry.weight]));
let blurs = new Map(REST_STACK.map((entry) => [entry.key, entry.blurPx]));
let affirm = new Map([['far', 0], ['mid', 0], ['near', 0]]);
let mix = 0;
let focusNode = -1;
let focusSubject = -1;
let transition = null;
let settled = true;
let clock = clockStart;
let pointer = { x: 0, y: 0 };
let pointerSeen = false;
let nodeScreens = restNodes.map((node) => [...node.q]);
let lastPoses = new Map();
let ambient = !still && !reduced;
let raf = 0;
let lastNow = 0;

const figures = (index) => (index < 0 ? null : restNodes[index].plane);

function targetFor(index) {
  const subject = figures(index);
  const nextWeights = new Map();
  const nextBlurs = new Map();
  const treatments = {};
  for (const entry of REST_STACK) {
    const treatment = index < 0
      ? { weight: entry.weight, blurPx: entry.blurPx, treatment: 'reposo' }
      : focusTreatment(entry, subject);
    nextWeights.set(entry.key, treatment.weight);
    nextBlurs.set(entry.key, treatment.blurPx);
    treatments[entry.key] = treatment.treatment;
  }
  const nextAffirm = new Map([['far', 0], ['mid', 0], ['near', 0]]);
  if (index >= 0) nextAffirm.set(subject, 1);
  return {
    camera: cameraTarget(index, restNodes),
    weights: nextWeights,
    blurs: nextBlurs,
    affirm: nextAffirm,
    mix: index >= 0 ? 1 : 0,
    treatments,
  };
}

function snapshot() {
  return {
    camera: { zoom: camera.zoom, pan: [...camera.pan] },
    weights: new Map(weights),
    blurs: new Map(blurs),
    affirm: new Map(affirm),
    mix,
  };
}

function pointerOffset() {
  if (reduced) return [0, 0];
  return [(pointer.x * DEPTH.pointerPx) / 2, (pointer.y * DEPTH.pointerPx) / 2];
}

/** La escalera de enlaces de la escena viva: el trazo de la vara (0,8 / 1,1 /
 * 1,5 px) abierto en profundidad. El lejano queda fino y tenue, el cercano
 * grueso y pleno: el mismo recurso que hace legible la figura de v1. */
const LINK_GAIN = Object.freeze({
  far: Object.freeze({ width: 1.0, opacity: 0.8 }),
  mid: Object.freeze({ width: 1.3, opacity: 0.92 }),
  near: Object.freeze({ width: 1.6, opacity: 1 }),
});

function drawLinks() {
  const p = cyclePosition(clock);
  for (const { link, base, pulses } of linkEls) {
    const work = {
      index: link.index,
      plane: link.plane,
      phase: linkPhase(link.index),
      // El enlace se queda con su conducta de siempre; el foco lo atenúa con su
      // PLANO, no lo borra por no pertenecer al grupo del nodo (el catálogo no
      // trae anillos, y un foco que apaga 22 de 24 enlaces disuelve la figura).
      inGroup: true,
    };
    const style = linkStyle(work, p, { active: false, edge: -1 });
    const gain = LINK_GAIN[link.plane] ?? LINK_GAIN.mid;
    const planeKey = `figura:${link.plane}`;
    const planeGain = 1 + ((weights.get(planeKey) ?? 1) - 1) * mix;
    const [ax, ay] = nodeScreens[link.a];
    const [bx, by] = nodeScreens[link.b];
    base.setAttribute('x1', f(ax));
    base.setAttribute('y1', f(ay));
    base.setAttribute('x2', f(bx));
    base.setAttribute('y2', f(by));
    base.setAttribute('stroke-width', f3(style.width * gain.width));
    base.setAttribute('opacity', (style.opacity * gain.opacity * planeGain).toFixed(4));
    for (let k = 0; k < pulses.length; k++) {
      const copy = style.pulse?.copies[k];
      const line = pulses[k];
      if (!copy || copy.opacity <= 0 || copy.to <= copy.from) {
        line.setAttribute('opacity', '0');
        continue;
      }
      const at = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t];
      const [x1, y1] = at(copy.from);
      const [x2, y2] = at(copy.to);
      line.setAttribute('x1', f(x1));
      line.setAttribute('y1', f(y1));
      line.setAttribute('x2', f(x2));
      line.setAttribute('y2', f(y2));
      line.setAttribute('stroke-width', f3(copy.width * gain.width));
      line.setAttribute('opacity', (copy.opacity * gain.opacity * planeGain).toFixed(4));
    }
  }
}

function applyToDom() {
  const offset = pointerOffset();
  const poses = new Map();
  for (const entry of REST_STACK) {
    const el = planeEls.get(entry.key);
    const gain = entry.plane ? (affirm.get(entry.plane) ?? 0) : 0;
    const pose = layerTransform(entry.rate, camera, offset, gain);
    poses.set(entry.key, pose);
    el.style.transform = `translate(${f2(pose.tx)}px, ${f2(pose.ty)}px) scale(${pose.scale.toFixed(5)})`;
    el.style.opacity = (weights.get(entry.key) ?? 1).toFixed(4);
    const blur = blurs.get(entry.key) ?? 0;
    el.style.filter = blur > 0.04 ? `blur(${f2(blur)}px)` : 'none';
  }
  lastPoses = poses;

  const figurePoses = new Map(['far', 'mid', 'near'].map((plane) => [plane, poses.get(`figura:${plane}`)]));
  nodeScreens = restNodes.map((node) => applyTransform(node.q, figurePoses.get(node.plane)));
  for (const [plane, group] of planeGroups) {
    const pose = figurePoses.get(plane);
    group.setAttribute('transform',
      `translate(${f2(centre[0] + pose.tx)} ${f2(centre[1] + pose.ty)}) scale(${pose.scale.toFixed(5)}) `
      + `translate(${-centre[0]} ${-centre[1]})`);
    const key = `figura:${plane}`;
    group.style.opacity = (weights.get(key) ?? 1).toFixed(4);
    const blur = blurs.get(key) ?? 0;
    group.style.filter = blur > 0.04 ? `blur(${f2(blur)}px)` : 'none';
  }

  const selected = focusNode >= 0 ? focusNode : mix > 0.02 ? focusSubject : -1;
  for (const [index, node] of nodeEls.entries()) {
    node.wrap.classList.toggle('is-selected', index === selected);
    node.core.setAttribute('r', f3(index === selected ? node.baseCoreR * 1.35 : node.baseCoreR));
    node.glow.setAttribute('r', f3((index === selected ? 1.5 : 1) * node.baseGlowR));
  }

  drawLinks();
  document.documentElement.dataset.state = focusNode >= 0 ? 'enfocado' : 'reposo';
  hint.dataset.hidden = String(focusNode >= 0);
}

function applyMix(from, to, e) {
  camera = {
    zoom: lerp(from.camera.zoom, to.camera.zoom, e),
    pan: [lerp(from.camera.pan[0], to.camera.pan[0], e), lerp(from.camera.pan[1], to.camera.pan[1], e)],
  };
  weights = new Map([...to.weights.keys()].map((key) => [key, lerp(from.weights.get(key) ?? to.weights.get(key), to.weights.get(key), e)]));
  blurs = new Map([...to.blurs.keys()].map((key) => [key, lerp(from.blurs.get(key) ?? to.blurs.get(key), to.blurs.get(key), e)]));
  affirm = new Map([...to.affirm.keys()].map((plane) => [plane, lerp(from.affirm.get(plane) ?? 0, to.affirm.get(plane), e)]));
  mix = lerp(from.mix, to.mix, e);
  applyToDom();
}

function syncFocus(index) {
  focusNode = index;
  if (index >= 0) focusSubject = index;
  applyToDom();
}

function activate(index) {
  const next = Number(index);
  if (!Number.isInteger(next) || next < -1 || next >= restNodes.length) return;
  if (next === focusNode && !transition) return;
  const from = snapshot();
  const to = targetFor(next);
  focusNode = next;
  if (next >= 0) focusSubject = next;
  if (reduced) {
    transition = null;
    settled = true;
    applyMix(from, to, 1);
    syncFocus(next);
    return;
  }
  transition = { from, to, elapsed: 0 };
  settled = false;
  lastNow = 0;
  syncFocus(next);
  schedule();
}

/** Herramienta de medición: deja la transición en `p` sin reloj. */
function seekFocus(index, p = 0.5) {
  const next = Number(index);
  if (!Number.isInteger(next) || next < 0 || next >= restNodes.length) return;
  const from = snapshot();
  const to = targetFor(next);
  focusNode = next;
  focusSubject = next;
  transition = null;
  settled = p >= 1;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  lastNow = 0;
  applyMix(from, to, ease(clamp(Number(p), 0, 1)));
}

function schedule() {
  if (raf) return;
  raf = requestAnimationFrame(tick);
}

function tick(now) {
  raf = 0;
  const dt = lastNow ? Math.min(64, now - lastNow) : 16;
  lastNow = now;
  if (ambient) clock += dt;
  if (transition) {
    transition.elapsed += dt;
    const p = Math.min(1, transition.elapsed / DEPTH.transitionMs);
    applyMix(transition.from, transition.to, ease(p));
    if (p >= 1) {
      transition = null;
      settled = true;
    }
  } else if (ambient) {
    applyToDom();
  }
  if (transition || ambient) schedule();
  else lastNow = 0;
}

// ---------------------------------------------------------------- el puntero
window.addEventListener('pointermove', (event) => {
  if (reduced) return;
  // Chromium puede emitir un `pointermove` en (0,0) al cargar; el primer cuadro
  // sin interacción no debe llevar paralaje. Se descarta ese evento, no el
  // paralaje: el primer movimiento real manda.
  if (!pointerSeen) {
    pointerSeen = true;
    if (event.clientX === 0 && event.clientY === 0) return;
  }
  const rect = stage.getBoundingClientRect();
  pointer = {
    x: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
    y: clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
  };
  applyToDom();
});
window.addEventListener('pointerleave', () => {
  pointer = { x: 0, y: 0 };
  applyToDom();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') activate(-1);
});
stage.addEventListener('click', (event) => {
  if (event.target.closest?.('[data-node-hit]')) return;
  if (focusNode >= 0) activate(-1);
});
motion.addEventListener('change', () => {
  reduced = reducedFlag || motion.matches;
  ambient = !still && !reduced;
  if (reduced) {
    transition = null;
    settled = true;
    pointer = { x: 0, y: 0 };
    applyMix(snapshot(), targetFor(focusNode), 1);
  } else {
    schedule();
  }
});

// ------------------------------------------------------------ estado inicial
if (initialFocus >= 0) {
  const to = targetFor(initialFocus);
  focusNode = initialFocus;
  focusSubject = initialFocus;
  camera = to.camera;
  weights = new Map(to.weights);
  blurs = new Map(to.blurs);
  affirm = new Map(to.affirm);
  mix = 1;
  settled = true;
}
applyToDom();

// ------------------------------------------------------------------- la API
const live = {
  id,
  abbr: data.abbr,
  name: data.name,
  meaning: data.meaning,
  counts: data.counts,
  declared: data.declared,
  get state() { return focusNode >= 0 ? 'enfocado' : 'reposo'; },
  get focusNode() { return focusNode; },
  get focusPlane() { return focusSubject >= 0 ? restNodes[focusSubject].plane : null; },
  get settled() { return settled; },
  get mix() { return mix; },
  get reduced() { return reduced; },
  get still() { return still; },
  get clock() { return clock; },
  get pointer() { return { ...pointer }; },
  get treatment() {
    if (focusSubject < 0 || mix <= 0.001) {
      return Object.fromEntries(REST_STACK.map((entry) => [entry.key, 'reposo']));
    }
    return Object.fromEntries(REST_STACK.map((entry) => [entry.key, focusTreatment(entry, restNodes[focusSubject].plane).treatment]));
  },
  /** Los pesos y desenfoques que la escena está aplicando AHORA. */
  get current() {
    return {
      weights: Object.fromEntries(weights),
      blurs: Object.fromEntries(blurs),
      affirm: Object.fromEntries(affirm),
    };
  },
  depth: { ...DEPTH },
  stack: REST_STACK.map((entry) => ({
    key: entry.key, layer: entry.layer, plane: entry.plane, z: entry.z, scale: entry.scale,
    offsetPx: entry.offsetPx, weight: entry.weight, blurPx: entry.blurPx, rate: entry.rate,
    afterVignette: entry.afterVignette,
  })),
  get nodes() {
    return restNodes.map((node, index) => ({
      plane: node.plane, model: node.model, rest: node.q, screen: nodeScreens[index],
    }));
  },
  get layers() {
    return Object.fromEntries([...lastPoses.entries()].map(([key, pose]) => [key, { ...pose }]));
  },
  /** La proyección de un nodo en el plano pedido, en reposo (sin cámara). */
  project(index, plane) {
    const pose = restPose.get(`figura:${plane}`);
    const node = restNodes[Number(index)];
    if (!pose || !node) return null;
    return [
      anchorPx[0] + (node.model[0] - anchorPx[0]) * pose.scale + pose.tx,
      anchorPx[1] + (node.model[1] - anchorPx[1]) * pose.scale + pose.ty,
    ];
  },
  activate,
  seekFocus,
  isSettled: () => settled,
  /** Las transformaciones realmente aplicadas al DOM (matriz, filtro, opacidad). */
  domTransforms() {
    return Object.fromEntries(REST_STACK.map((entry) => {
      const style = getComputedStyle(planeEls.get(entry.key));
      return [entry.key, { transform: style.transform, filter: style.filter, opacity: style.opacity }];
    }));
  },
  timing: { bakeMs, bakeSize: [BAKE.width, BAKE.height], margin: [BAKE.marginX, BAKE.marginY] },
  links: { total: data.links.length, pulses: data.links.length * PULSE.copies.length },
};
window.__live = live;

// --------------------------------------------------------------- listo, pintar
if (ambient) schedule();
await document.fonts.ready;
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.documentElement.dataset.ready = 'true';
}));
