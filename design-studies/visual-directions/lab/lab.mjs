/**
 * The engine lab, v2.
 *
 * What changed after the first round of feedback:
 *   - the animated scene is the DEFAULT, so "it does not move" is falsifiable;
 *   - the new "estratos" scene runs at 240 × 120 (vs 160 × 80 of the stills),
 *     which is the honest answer to "everything looks low resolution";
 *   - a strip renders the SAME frame with all five dithers, because judging
 *     them one at a time is how differences get lost;
 *   - the readout states resolution and frame count instead of hiding them.
 *
 * Everything is the production path: `renderFrame` + `rasterize` from
 * engine.mjs. No mock.
 */
import { DELIVERY_CELL, rasterize, renderFrame } from '../../../scripts/scene-src/engine.mjs';
import { sceneFromSerialized } from '../../../scripts/scene-src/image-pipeline.mjs';
import { nightCoast } from '../../../scripts/scene-src/scenes/joyan-night-coast.mjs';
import { strataScene, strataPaperScene } from './strata-scene.mjs';
import { maquinaScene } from './scene-maquina.mjs';
import { constelacionScene } from './scene-constelacion.mjs';
import { constelacion2Scene } from './scene-constelacion2.mjs';

const canvas = document.querySelector('[data-lab-canvas]');
const ctx = canvas.getContext('2d', { alpha: false });
const stripHost = document.querySelector('[data-strip]');
const out = {
  scene: document.querySelector('[data-out-scene]'),
  res: document.querySelector('[data-out-res]'),
  dither: document.querySelector('[data-out-dither]'),
  density: document.querySelector('[data-out-density]'),
  frame: document.querySelector('[data-out-frame]'),
  status: document.querySelector('[data-out-status]'),
  caption: document.querySelector('[data-out-caption]'),
};
const frameInput = document.querySelector('input[name="frame"]');
const frameOut = document.querySelector('output[name="frameOut"]');
const animateBox = document.querySelector('input[name="animate"]');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LABELS = { strataPaper: 'estratos · papel', maquina: 'máquina habitada', strata: 'estratos', night: 'noche', fold: 'pliegue', iso: 'isométrico' };
const DITHERS = ['bayer2', 'bayer4', 'bayer8', 'blue', 'none'];
const scenes = { constelacion2: constelacion2Scene, constelacion: constelacionScene, strataPaper: strataPaperScene, maquina: maquinaScene, strata: strataScene, night: nightCoast };
const state = { scene: 'constelacion2', dither: 'bayer4', density: 1, frame: 0, animate: !reduced };

async function load(name) {
  if (scenes[name]) return scenes[name];
  const response = await fetch(`${name}.json`);
  if (!response.ok) throw new Error(`no pude cargar ${name}.json`);
  scenes[name] = sceneFromSerialized(await response.json());
  return scenes[name];
}

function paint(target, scene, frame, options) {
  const result = renderFrame(scene, frame, options);
  const rgba = rasterize(result, scene, DELIVERY_CELL);
  const w = result.cols * DELIVERY_CELL;
  const h = result.rows * DELIVERY_CELL;
  const context = target.getContext('2d', { alpha: false });
  if (target.width !== w || target.height !== h) {
    target.width = w;
    target.height = h;
  }
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
  return { cols: result.cols, rows: result.rows };
}

function syncControls(scene) {
  const total = Math.max(1, scene.cycleFrames ?? 1);
  frameInput.max = String(total - 1);
  state.frame = Math.min(state.frame, total - 1);
  frameInput.value = String(state.frame);
  frameOut.textContent = `${state.frame} / ${total - 1}`;
  animateBox.disabled = reduced;
  animateBox.checked = state.animate;
  frameInput.disabled = state.animate;
}

function draw() {
  const scene = scenes[state.scene];
  if (!scene) return;
  const total = Math.max(1, scene.cycleFrames ?? 1);
  const index = Math.min(state.frame, total - 1);
  const size = paint(canvas, scene, index, { dither: state.dither, density: state.density });
  out.scene.textContent = LABELS[state.scene];
  out.res.textContent = `${scene.cols} × ${scene.rows} celdas · ${size.cols} × ${size.rows} dibujadas`;
  out.dither.textContent = state.dither;
  out.density.textContent = `${state.density}×`;
  out.frame.textContent = `frame ${index} / ${total - 1}`;
  out.status.textContent = state.animate ? 'animando' : 'quieto';
  out.caption.textContent = `${LABELS[state.scene]} · ${state.dither} · ${state.density}× · frame ${index}`;
  drawStrip(scene, index);
  if (reduced) out.status.textContent = 'reduced-motion: quieto';
}

/** The five dithers, same scene and frame, side by side. */
let stripBuilt = false;
function drawStrip(scene, index) {
  if (!stripBuilt) {
    stripHost.innerHTML = DITHERS.map((name) => `
      <figure class="cell">
        <canvas data-strip-${name} width="480" height="240"></canvas>
        <figcaption class="label">${name}</figcaption>
      </figure>`).join('');
    stripBuilt = true;
  }
  for (const name of DITHERS) {
    const target = stripHost.querySelector(`[data-strip-${name}]`);
    if (!target) continue;
    paint(target, scene, index, { dither: name, density: 2 });
    const caption = target.parentElement.querySelector('figcaption');
    if (caption && name === state.dither) caption.textContent = `${name} · en uso`;
    else if (caption) caption.textContent = name;
  }
}

document.querySelectorAll('input[name="scene"]').forEach((input) => {
  input.addEventListener('change', async () => {
    state.scene = input.value;
    out.status.textContent = 'cargando';
    const scene = await load(state.scene);
    syncControls(scene);
    draw();
  });
});
document.querySelectorAll('input[name="dither"]').forEach((input) => {
  input.addEventListener('change', () => { state.dither = input.value; draw(); });
});
document.querySelectorAll('input[name="density"]').forEach((input) => {
  input.addEventListener('change', () => { state.density = Number(input.value); draw(); });
});
frameInput.addEventListener('input', () => {
  state.frame = Number(frameInput.value);
  frameOut.textContent = `${state.frame} / ${frameInput.max}`;
  draw();
});
animateBox.addEventListener('change', () => {
  state.animate = animateBox.checked && !reduced;
  frameInput.disabled = state.animate;
  out.status.textContent = state.animate ? 'animando' : 'quieto';
});

let last = 0;
function tick(now) {
  if (state.animate && now - last > 1000 / 12) {
    last = now;
    const scene = scenes[state.scene];
    const total = Math.max(1, scene?.cycleFrames ?? 1);
    state.frame = (state.frame + 1) % total;
    frameInput.value = String(state.frame);
    frameOut.textContent = `${state.frame} / ${total - 1}`;
    draw();
  }
  requestAnimationFrame(tick);
}

(async () => {
  try {
    const scene = await load(state.scene);
    syncControls(scene);
    draw();
    requestAnimationFrame(tick);
  } catch (error) {
    out.status.textContent = `error: ${error.message}`;
  }
})();
