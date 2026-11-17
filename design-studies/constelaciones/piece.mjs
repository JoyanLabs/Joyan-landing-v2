/**
 * Constelaciones — the review page (T1–T3 of
 * `odd/tasks/pieza-completa-constelaciones.md`).
 *
 * THREE SURFACES, ONE FIELD.
 *
 *   sky canvas   the engine frame: point sky, wash, figure halos, vignette and
 *                cores, composed by `scripts/scene-src/constellation.mjs` and
 *                painted by `renderFrame` + `rasterize`. The page never
 *                improvises noise; it hands the engine its own palette and grid.
 *   link canvas  the link strokes at vector resolution. The field can only paint
 *                whole cells, so `breathe`'s stretches and `trace`'s growing
 *                segment are drawn here from `linkSample`, the same function the
 *                field uses, so the two cannot disagree.
 *   alrumh       a second engine frame, smaller and farther, fading into the
 *                main field with a mask instead of an edge. The travel between
 *                the two is T4: this page shows the neighbour, it does not yet
 *                fly to it.
 *
 * RESOLUTION IS PART OF THE ART. A 480-cell grid stretched over 1280 px puts a
 * 2.7 px dot on screen, and at that size the field reads as television static
 * instead of a sky. So the frame is rasterised at `CELL = 3` device pixels per
 * cell (`rasterize`, the same mask the bake uses) and, on a phone, on a 240-cell
 * grid, which is the engine's own density idea: the same picture, larger marks.
 *
 * Deterministic review: `?frame=<index>` renders that exact frame and stops;
 * `?active=<nodeId>` opens a node. The capture script uses both.
 */
import { rasterize, renderFrame } from '../../scripts/scene-src/engine.mjs';
import {
  constellationScene, linkSample, linkVisual, paletteTone, planeStyle, resolveLinks,
} from '../../scripts/scene-src/constellation.mjs';
import genghe from '../../scripts/scene-src/constellations/genghe.mjs';
import alrumh from '../../scripts/scene-src/constellations/alrumh.mjs';

const params = new URLSearchParams(window.location.search);
const piece = document.querySelector('[data-piece]');
const field = document.querySelector('[data-field]');
const sky = document.querySelector('[data-sky]');
const links = document.querySelector('[data-links]');
const nodesHost = document.querySelector('[data-nodes]');
const neighbour = document.querySelector('[data-neighbour]');
const alrumhCanvas = document.querySelector('[data-alrumh]');
const panelTitle = document.querySelector('[data-panel-title]');
const panelLine = document.querySelector('[data-panel-line]');
const panelNote = document.querySelector('[data-panel-note]');

const C = genghe;
const LINKS = resolveLinks(C);
const LOOP_SECONDS = C.cycle.frames / C.cycle.fps;
const CELL = 3;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const STILL_FRAME = params.has('frame')
  ? Number(params.get('frame'))
  : REDUCED.matches ? Math.round(C.cycle.frames * 0.42) : null;
const STILL = STILL_FRAME !== null;

// ---------------------------------------------------------------------------
// Scenes. The grid changes with the viewport, so the scenes are built per grid
// and cached by the model.
// ---------------------------------------------------------------------------
const skyCtx = sky.getContext('2d');
const alrumhCtx = alrumhCanvas.getContext('2d');
const linkCtx = links.getContext('2d');
const isMobile = () => window.innerWidth <= 700;

let scene = null;
let alrumhScene = null;
let gridKey = '';
let cols = C.stage.cols;
let rows = C.stage.rows;

function ensureScenes(nextCols, nextRows) {
  const key = `${nextCols}x${nextRows}`;
  if (key === gridKey) return;
  cols = nextCols;
  rows = nextRows;
  scene = constellationScene(C, { cols, rows, activeNode: active });
  alrumhScene = constellationScene(alrumh, {
    cols: alrumh.stage.cols,
    rows: alrumh.stage.rows,
    activeNode: null,
  });
  sky.width = cols * CELL;
  sky.height = rows * CELL;
  alrumhCanvas.width = alrumh.stage.cols * 2;
  alrumhCanvas.height = alrumh.stage.rows * 2;
  gridKey = key;
  lastSkyIndex = -1;
  lastAlrumhIndex = -1;
}

/** Paint one engine frame into a canvas. The link strokes are drawn separately. */
function paintInto(context, engineScene, index, cell) {
  const frame = renderFrame(engineScene, index);
  const rgba = rasterize(frame, engineScene, cell);
  context.putImageData(new ImageData(rgba, frame.cols * cell, frame.rows * cell), 0, 0);
  return frame;
}

// ---------------------------------------------------------------------------
// Geometry: the field covers the stage without distorting a cell, so it crops
// instead of stretching. The link canvas shares that geometry exactly, which is
// what keeps a stroke on its two stars at every viewport.
// ---------------------------------------------------------------------------
let geo = null;
let aim = { x: 0, y: 0 };
let active = params.get('active') ?? null;

function measure() {
  if (isMobile()) ensureScenes(240, 150);
  else ensureScenes(C.stage.cols, C.stage.rows);

  const width = piece.clientWidth;
  const height = isMobile() ? Math.round(window.innerHeight * 0.56) : window.innerHeight;
  const scale = Math.max(width / cols, height / rows);
  const fieldWidth = cols * scale;
  const fieldHeight = rows * scale;
  const left = (width - fieldWidth) / 2;
  const top = isMobile() ? 0 : (height - fieldHeight) / 2;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  geo = { width, height, scale, fieldWidth, fieldHeight, left, top, dpr, mobile: isMobile() };

  field.style.width = `${fieldWidth}px`;
  field.style.height = `${fieldHeight}px`;
  field.style.left = `${left}px`;
  field.style.top = `${top}px`;

  links.width = Math.round(fieldWidth * dpr);
  links.height = Math.round(fieldHeight * dpr);
  links.style.width = `${fieldWidth}px`;
  links.style.height = `${fieldHeight}px`;
  linkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  for (const [id, button] of Object.entries(buttons)) {
    const node = C.nodes.find((entry) => entry.id === id);
    button.style.left = `${node.x * fieldWidth}px`;
    button.style.top = `${node.y * fieldHeight}px`;
  }
  aim = { x: width * 0.5, y: geo.mobile ? height * 0.46 : height * 0.5 };
  applyCamera(true);
}

// ---------------------------------------------------------------------------
// The camera: one transform over the field wrapper, parallax on the neighbour.
// ---------------------------------------------------------------------------
function target() {
  const focus = active ? C.camera.focus[active] : null;
  const home = C.camera.home;
  if (!focus) return { u: home.x, v: home.y, zoom: home.scale ?? 1 };
  return { u: focus.x, v: focus.y, zoom: geo.mobile ? Math.min(focus.scale, 1.15) : focus.scale };
}

let homeTransform = { tx: 0, ty: 0 };

function applyCamera(immediate = false) {
  if (!geo) return;
  if (immediate) field.style.transition = 'none';
  const state = target();
  const px = state.u * geo.fieldWidth;
  const py = state.v * geo.fieldHeight;
  const tx = aim.x - geo.left - px * state.zoom;
  const ty = aim.y - geo.top - py * state.zoom;
  field.style.transform = `translate(${tx}px, ${ty}px) scale(${state.zoom})`;
  if (immediate) {
    field.style.transition = '';
    homeTransform = {
      tx: aim.x - geo.left - C.camera.home.x * geo.fieldWidth,
      ty: aim.y - geo.top - C.camera.home.y * geo.fieldHeight,
    };
  }
  // Depth: the neighbour sits four times farther away, so the camera moves much
  // less of it. That is the parallax the piece needs before T4 exists.
  neighbour.style.transform = `translate(${(tx - homeTransform.tx) * 0.35}px, ${(ty - homeTransform.ty) * 0.35}px)`;
}

// ---------------------------------------------------------------------------
// The link strokes. Each link is drawn as short segments whose alpha is
// `linkSample`: that is how a breathing stroke lights in stretches and how a
// traced one grows from its origin, without the page inventing a second law.
// ---------------------------------------------------------------------------
const INK_TONE = { far: 0.4, mid: 0.6, near: 0.86 };

const rgba = (colour, alpha) => `rgba(${Math.round(colour[0] * 255)}, `
  + `${Math.round(colour[1] * 255)}, ${Math.round(colour[2] * 255)}, ${alpha})`;

function drawLinks(p) {
  const { fieldWidth, fieldHeight } = geo;
  const cellPx = fieldWidth / cols;
  linkCtx.clearRect(0, 0, fieldWidth, fieldHeight);
  linkCtx.globalCompositeOperation = 'lighter';
  linkCtx.lineCap = 'round';

  for (const link of LINKS) {
    const visual = linkVisual(C, link, p, { activeNode: active });
    if (visual.opacity <= 0 || visual.drawn <= 0) continue;
    const ink = paletteTone(C, INK_TONE[link.plane] ?? 0.6);
    const width = Math.max(0.85, visual.width * cellPx * 0.4);
    const ax = link.fromNode.x * fieldWidth;
    const ay = link.fromNode.y * fieldHeight;
    const bx = link.toNode.x * fieldWidth;
    const by = link.toNode.y * fieldHeight;

    // THE STROKE IS MADE OF THE SAME DOTS AS THE FIELD. A solid vector line over
    // a field of dots reads as a drawn rule; the constellation's language is
    // points, so the link is a chain of round marks along the segment, and each
    // mark's alpha is `linkSample` at its own position. That is also what makes
    // a breathing stroke light in stretches without a second code path.
    const span = Math.hypot(bx - ax, by - ay) * visual.drawn;
    const spacing = Math.max(2.2, cellPx * 0.95);
    const dots = Math.max(1, Math.floor(span / spacing));
    for (let i = 0; i <= dots; i++) {
      const along = visual.drawn * (i / dots);
      const alpha = linkSample(C, link, p, along, { activeNode: active });
      if (alpha <= 0.004) continue;
      const x = ax + (bx - ax) * along;
      const y = ay + (by - ay) * along;
      linkCtx.fillStyle = rgba(ink, alpha * 0.16);
      linkCtx.beginPath();
      linkCtx.arc(x, y, width * 2.1, 0, Math.PI * 2);
      linkCtx.fill();
      linkCtx.fillStyle = rgba(ink, alpha * 0.92);
      linkCtx.beginPath();
      linkCtx.arc(x, y, width, 0, Math.PI * 2);
      linkCtx.fill();
    }
  }

  // Cores, always above the strokes: two steps, as the layer requires.
  for (const node of C.nodes) {
    const gain = planeStyle(node.plane).figureGain;
    const x = node.x * fieldWidth;
    const y = node.y * fieldHeight;
    const ink = paletteTone(C, 0.92);
    const radius = (0.46 + 0.66 * gain) * cellPx;
    linkCtx.fillStyle = rgba(ink, 0.2);
    linkCtx.beginPath();
    linkCtx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
    linkCtx.fill();
    linkCtx.fillStyle = rgba(ink, 0.5 + 0.4 * node.magnitude);
    linkCtx.beginPath();
    linkCtx.arc(x, y, radius, 0, Math.PI * 2);
    linkCtx.fill();
  }
  linkCtx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------------------
// Nodes: the interaction. Buttons inside the transformed wrapper, so they ride
// the camera with their stars.
// ---------------------------------------------------------------------------
const buttons = {};
for (const node of C.nodes) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'node';
  button.dataset.node = node.id;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', `${node.content.title}: ${node.content.line}`);
  button.addEventListener('click', () => activate(active === node.id ? null : node.id));
  nodesHost.append(button);
  buttons[node.id] = button;
}

function setPanel(node) {
  if (!node) {
    panelTitle.textContent = 'Tres estrellas';
    panelLine.textContent = 'Tocá una estrella del asterismo para leer su nodo.';
    panelNote.textContent = 'contenido provisional';
    return;
  }
  panelTitle.textContent = node.content.title;
  panelLine.textContent = node.content.line;
  panelNote.textContent = `contenido provisional · parte ${node.content.partOf} · plano ${node.plane}`;
}

function activate(nodeId) {
  active = nodeId;
  if (scene) scene.setActiveNode(active);
  for (const [id, button] of Object.entries(buttons)) {
    button.setAttribute('aria-pressed', String(id === active));
  }
  setPanel(C.nodes.find((node) => node.id === active) ?? null);
  applyCamera();
  lastSkyIndex = -1;
  if (STILL) {
    paintSky(STILL_FRAME);
    drawLinks(STILL_FRAME / C.cycle.frames);
  }
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && active) activate(null);
});

// ---------------------------------------------------------------------------
// The loop. The engine frame is evaluated at the constellation's own 12 Hz; the
// strokes ride at display rate on the same cycle position, so they stay on
// their stars.
// ---------------------------------------------------------------------------
let lastSkyIndex = -1;
let lastAlrumhIndex = -1;
let started = 0;

function paintSky(index) {
  paintInto(skyCtx, scene, index, CELL);
  lastSkyIndex = index;
}

function paintAlrumh(index) {
  paintInto(alrumhCtx, alrumhScene, index, 2);
  lastAlrumhIndex = index;
}

function frame(now) {
  const seconds = (now - started) / 1000;
  const p = (((seconds % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS) / LOOP_SECONDS;
  const index = Math.floor(p * C.cycle.frames);
  if (index !== lastSkyIndex) paintSky(index);
  const alrumhIndex = Math.floor(p * alrumh.cycle.frames) % alrumh.cycle.frames;
  if (alrumhIndex !== lastAlrumhIndex) paintAlrumh(alrumhIndex);
  drawLinks(p);
  requestAnimationFrame(frame);
}

function start() {
  measure();
  const startIndex = STILL ? STILL_FRAME : 0;
  paintSky(startIndex);
  paintAlrumh(STILL ? Math.round(startIndex * alrumh.cycle.frames / C.cycle.frames) : 0);
  drawLinks(startIndex / C.cycle.frames);
  setPanel(C.nodes.find((node) => node.id === active) ?? null);
  for (const [id, button] of Object.entries(buttons)) {
    button.setAttribute('aria-pressed', String(id === active));
  }
  applyCamera(true);
  if (!STILL) {
    started = performance.now();
    requestAnimationFrame(frame);
  }
  document.body.dataset.ready = 'true';
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const wasMobile = geo?.mobile;
    measure();
    if (wasMobile !== geo.mobile) {
      paintSky(0);
      paintAlrumh(0);
      drawLinks(0);
    } else {
      paintSky(lastSkyIndex < 0 ? 0 : lastSkyIndex);
      drawLinks(0);
    }
  }, 160);
});

// Fonts change nothing about the field, but the capture must not race them.
if (document.fonts?.ready) document.fonts.ready.then(start);
else start();
