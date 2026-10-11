/**
 * Lab-only runtime for OUR dot-scene engine. Never imported by a landing page:
 * `scripts/check-scene-engine.mjs` fails if any route other than `/lab/ascii`
 * carries its markup or fetches its chunk.
 *
 * It is deliberately thin. All the art is in `scripts/scene-src/engine.mjs`,
 * which the Node bake path imports too, so the canvas here is not a second
 * implementation of the picture: it is the same frame function, rasterised by
 * the same code and pushed into a canvas. The checks hash both paths and
 * require the same bytes.
 *
 * Behaviour, all of it observable:
 *   - 12 fps ceiling; a frame index is kept on the host as `data-scene-frame`
 *   - pauses offscreen (IntersectionObserver) and in hidden tabs
 *   - `prefers-reduced-motion: reduce` paints the scene's poster frame once and
 *     never starts a loop, and the disabled control says so instead of offering
 *     a Play that cannot work
 *   - Play/Pause is a real stop, not a hidden timer
 *   - pagehide cancels the frame and removes every listener, so a second visit
 *     cannot stack a second loop
 *
 * The scene registry is untyped JavaScript, so its shape is CHECKED at the
 * boundary (`isScene`) rather than cast: a module that stops matching the shape
 * simply does not mount, and no `as` hides that.
 */
import { DELIVERY_CELL, rasterize, renderFrame } from '../../scripts/scene-src/engine.mjs';
import { SCENES } from '../../scripts/scene-src/scenes/index.mjs';

interface Scene {
  id: string;
  cols: number;
  rows: number;
  fps: number;
  cycleFrames: number;
  posterFrame: number;
  field: (x: number, y: number, t: number) => number | number[];
}

const REDUCED = '(prefers-reduced-motion: reduce)';
const HOST = '[data-own-scene]';
let release: (() => void) | undefined;

/** Structural check for a scene module. Every field the runtime reads is tested. */
function isScene(value: unknown): value is Scene {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value && 'cols' in value && 'rows' in value && 'fps' in value
    && 'cycleFrames' in value && 'posterFrame' in value && 'field' in value)) return false;
  return typeof value.id === 'string' && value.id.length > 0
    && typeof value.cols === 'number' && Number.isInteger(value.cols) && value.cols > 0
    && typeof value.rows === 'number' && Number.isInteger(value.rows) && value.rows > 0
    && typeof value.fps === 'number' && value.fps > 0
    && typeof value.cycleFrames === 'number' && Number.isInteger(value.cycleFrames) && value.cycleFrames > 0
    && typeof value.posterFrame === 'number' && Number.isInteger(value.posterFrame) && value.posterFrame >= 0
    && typeof value.field === 'function';
}

/** Look the scene up by id through the validated registry, never by casting it. */
function sceneFor(id: string): Scene | undefined {
  for (const [key, value] of Object.entries(SCENES)) {
    if (key === id && isScene(value)) return value;
  }
  return undefined;
}

function initialize(): void {
  release?.();
  const hosts = document.querySelectorAll<HTMLElement>(HOST);
  if (!hosts.length) return;
  const cleanups: Array<() => void> = [];
  const preference = matchMedia(REDUCED);
  for (const host of hosts) {
    const scene = sceneFor(host.dataset.ownScene ?? '');
    const canvas = host.querySelector<HTMLCanvasElement>('canvas');
    const button = host.querySelector<HTMLButtonElement>('button');
    const status = host.querySelector<HTMLElement>('[data-scene-status]');
    if (!scene || !canvas || !button || !status) continue;
    const cell = DELIVERY_CELL;
    const width = scene.cols * cell;
    const height = scene.rows * cell;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) continue;
    const image = context.createImageData(width, height);
    let frame = 0;
    let raf = 0;
    let last = 0;
    let paused = false;
    // The IntersectionObserver's first verdict is asynchronous, so the initial
    // on-screen test is a real geometry read. The observer then owns every
    // scroll change; this only decides whether the first frame starts a loop.
    const inViewport = (): boolean => {
      const box = canvas.getBoundingClientRect();
      return box.bottom > 0 && box.right > 0
        && box.top < (window.innerHeight || 0) && box.left < (window.innerWidth || 0);
    };
    let visible = inViewport();

    const paint = (index: number): void => {
      const rendered = renderFrame(scene, index);
      // Rasterised straight into the ImageData buffer the canvas reads: the same
      // engine raster as the Node bake, without a second megabyte-sized copy.
      rasterize(rendered, scene, cell, image.data);
      context.putImageData(image, 0, 0);
      host.dataset.sceneFrame = String(rendered.frame);
    };
    const updateStatus = (): void => {
      button.disabled = preference.matches;
      button.setAttribute('aria-pressed', String(!paused && !preference.matches));
      // Under reduced motion the control is disabled and there is nothing to
      // play, so it must not offer a Play that cannot work.
      button.textContent = preference.matches ? `Motion off ${scene.id}`
        : paused ? `Play ${scene.id}` : `Pause ${scene.id}`;
      status.textContent = preference.matches ? `Static frame ${scene.posterFrame} · reduced motion`
        : paused ? 'Paused by you'
          : !visible || document.hidden ? 'Paused · outside viewport or hidden'
            : `Our engine · ${scene.fps} fps · dot ramp only`;
    };
    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / scene.fps - 1) return;
      last = now;
      paint(frame);
      frame = (frame + 1) % scene.cycleFrames;
    };
    const start = (): void => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = (): void => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const sync = (): void => {
      if (preference.matches) {
        // A real static frame from the same engine, not a frozen animation.
        stop();
        paint(scene.posterFrame);
        frame = (scene.posterFrame + 1) % scene.cycleFrames;
      } else if (visible && !document.hidden && !paused) {
        start();
      } else {
        stop();
      }
      updateStatus();
    };
    const toggle = (): void => {
      paused = !paused;
      sync();
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      sync();
    });
    button.addEventListener('click', toggle);
    preference.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    // A truthful first frame, and the loop, before any callback fires.
    host.setAttribute('data-ready', '');
    paint(preference.matches ? scene.posterFrame : 0);
    frame = preference.matches ? (scene.posterFrame + 1) % scene.cycleFrames : 1;
    updateStatus();
    observer.observe(canvas);
    sync();
    cleanups.push(() => {
      stop();
      observer.disconnect();
      button.removeEventListener('click', toggle);
      preference.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    });
  }
  release = () => {
    for (const cleanup of cleanups) cleanup();
    release = undefined;
  };
}

// The lab page has no ClientRouter, so this fires once per document; the
// pagehide/pageshow pair covers bfcache restores, where the loops were stopped.
document.addEventListener('astro:page-load', initialize);
document.addEventListener('astro:before-swap', () => release?.());
window.addEventListener('pagehide', () => release?.());
window.addEventListener('pageshow', initialize);
initialize();
