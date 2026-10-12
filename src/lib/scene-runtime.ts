/**
 * Lab-only runtime for OUR dot-scene engine. Never imported by a landing page:
 * `scripts/check-scene-engine.mjs` fails if any route outside `/lab/**` carries
 * its markup or fetches its chunk.
 *
 * It is deliberately thin. All the art is in `scripts/scene-src/engine.mjs`,
 * which the Node bake path imports too, so the canvas here is not a second
 * implementation of the picture: it is the same frame function, rasterised by
 * the same code and pushed into a canvas. The checks hash both paths and
 * require the same bytes.
 *
 * Two surfaces live here:
 *   /lab/ascii  `[data-own-scene]` — one scene, live at 12 fps
 *   /lab/shapes `[data-shape-lab]` — the WU17 study: shape, ramp, dither, cell
 *               geometry, grid density and palette switched live, plus the fixed
 *               board that draws every mask at once. The study surface is a
 *               STILL (the scene's poster frame) unless the visitor presses
 *               Play, so a comparison does not move under them; Play animates
 *               the three view panes only, and the board stays the reference.
 *   /lab/image  `[data-image-lab]` — the WU18 image pipeline: a converted local
 *               input (embedded as data by the page's frontmatter) with the
 *               animated overlays switched live. It is a STILL by default too.
 *               The embedded payload is the pipeline's own serialisation, so the
 *               canvas draws the SAME conversion the Node raster produced; the
 *               checker hashes both and requires equality.
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
import {
  CELL_GEOMETRIES, DELIVERY_CELL, DITHER_MODES, RAMP_MODES, SHAPES, cellSizeFor, maskDerivation,
  maskSize, rasterize, renderFrame,
} from '../../scripts/scene-src/engine.mjs';
import { SCENES } from '../../scripts/scene-src/scenes/index.mjs';
import { LAB_PALETTES, labPalette } from '../../scripts/scene-src/lab-palettes.mjs';
import { IMAGE_PALETTES, sceneFromSerialized } from '../../scripts/scene-src/image-pipeline.mjs';
import { applyTreatment } from '../../scripts/scene-src/overlays.mjs';

interface Scene {
  id: string;
  cols: number;
  rows: number;
  fps: number;
  cycleFrames: number;
  posterFrame: number;
  field: (x: number, y: number, t: number) => number | number[];
  palette: string[];
  ground: number;
  groundHex: string;
}

/** The selected study options, all of them strings straight from the controls. */
interface StudyOptions {
  shape: string;
  ramp: string;
  ditherMode: string;
  geometry: string;
  density: number;
  palette: string;
}

const REDUCED = '(prefers-reduced-motion: reduce)';
const HOST = '[data-own-scene]';
const STUDY = '[data-shape-lab]';
const BOARD = '[data-shape-board]';
const IMAGE = '[data-image-lab]';
// WU20: the coming-hero on the single public page. This is the ONE runtime
// path allowed outside `/lab/**`: the same engine, the same raster and the
// same serialised-payload contract as the image laboratory, wired to the
// hybrid still→live pattern the laboratory surfaces already proved.
const COMING_HERO = '[data-coming-hero]';
let release: (() => void) | undefined;

/** Structural check for a scene module. Every field the runtime reads is tested. */
function isScene(value: unknown): value is Scene {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value && 'cols' in value && 'rows' in value && 'fps' in value
    && 'cycleFrames' in value && 'posterFrame' in value && 'field' in value
    && 'palette' in value && 'ground' in value && 'groundHex' in value)) return false;
  if (!Array.isArray(value.palette) || value.palette.length < 4) return false;
  return typeof value.id === 'string' && value.id.length > 0
    && typeof value.cols === 'number' && Number.isInteger(value.cols) && value.cols > 0
    && typeof value.rows === 'number' && Number.isInteger(value.rows) && value.rows > 0
    && typeof value.fps === 'number' && value.fps > 0
    && typeof value.cycleFrames === 'number' && Number.isInteger(value.cycleFrames) && value.cycleFrames > 0
    && typeof value.posterFrame === 'number' && Number.isInteger(value.posterFrame) && value.posterFrame >= 0
    && typeof value.ground === 'number' && Number.isInteger(value.ground) && value.ground >= 0
    && typeof value.groundHex === 'string'
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
  const cleanups = [...initializeScenes(), ...initializeStudy(), ...initializeImage(), ...initializeComingHero()];
  release = () => {
    for (const cleanup of cleanups) cleanup();
    release = undefined;
  };
}

/** `/lab/ascii`: one scene per `[data-own-scene]` host, live at 12 fps. */
function initializeScenes(): Array<() => void> {
  const hosts = document.querySelectorAll<HTMLElement>(HOST);
  if (!hosts.length) return [];
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
  return cleanups;
}

// ---------------------------------------------------------------------------
// `/lab/shapes` — the WU17 study surface.
// ---------------------------------------------------------------------------

/** Read one control's value, falling back to the documented default. */
function controlValue(host: HTMLElement, name: string, fallback: string): string {
  const control = host.querySelector<HTMLSelectElement>(`[data-shape-control="${name}"]`);
  return control?.value ?? fallback;
}

/** The options the controls currently describe, validated against the catalogue. */
function studyOptions(host: HTMLElement): StudyOptions {
  const shape = controlValue(host, 'shape', 'disc');
  const ramp = controlValue(host, 'ramp', 'shape');
  const ditherMode = controlValue(host, 'dither', 'bayer4');
  const geometry = controlValue(host, 'geometry', 'square');
  const grid = Number(controlValue(host, 'grid', '1'));
  const palette = controlValue(host, 'palette', 'default');
  return {
    shape: SHAPES.includes(shape) ? shape : 'disc',
    ramp: RAMP_MODES.includes(ramp) ? ramp : 'shape',
    ditherMode: DITHER_MODES.includes(ditherMode) ? ditherMode : 'bayer4',
    geometry: CELL_GEOMETRIES.includes(geometry) ? geometry : 'square',
    density: [1, 2, 4].includes(grid) ? grid : 1,
    palette: LAB_PALETTES.some((entry) => entry.id === palette) ? palette : 'default',
  };
}

/**
 * The scene with a lab palette substituted. The engine caches its derived
 * metrics on the scene object, so a palette needs its own object: that is the
 * only reason this copies.
 */
function withPalette(scene: Scene, id: string): Scene {
  const preset = labPalette(id);
  if (!preset.palette) return scene;
  return { ...scene, palette: [...preset.palette], ground: preset.ground, groundHex: preset.palette[preset.ground] };
}

/**
 * The ENGINE's option shape. The runtime's own object carries `ditherMode` (the
 * control's name) and the engine reads `dither`; this is the one place the two
 * meet, so a rename on either side is a visible change here rather than a silent
 * fallback to the default dither.
 */
/** The engine's own option keys: the same choice, spelled the engine's way. */
interface EngineOptions {
  shape: string;
  ramp: string;
  dither: string;
  geometry: string;
  density: number;
  palette: string;
}

function engineOptions(options: StudyOptions, shape = options.shape, density = options.density): EngineOptions {
  return { shape, ramp: options.ramp, dither: options.ditherMode, geometry: options.geometry,
    density, palette: options.palette };
}

/**
 * Paint one canvas with the selected options; the cell size is per canvas, and a
 * canvas may pin its own grid density (`data-shape-density`) so the pixel-scale
 * board can draw a coarser grid at the same cell size without touching the
 * visitor's density control.
 */
function paintStudyCanvas(
  canvas: HTMLCanvasElement,
  scene: Scene,
  options: StudyOptions,
  frameIndex: number,
  shape = options.shape,
  density = Number(canvas.dataset.shapeDensity ?? options.density),
): void {
  const cell = Number(canvas.dataset.shapeCell ?? DELIVERY_CELL);
  const box = cellSizeFor(options.geometry, cell);
  // The same grid the engine will render: density is an integer stride over the
  // scene's own grid, so the canvas is sized from the frame it is about to get.
  const cols = Math.max(1, Math.round(scene.cols / density));
  const rows = Math.max(1, Math.round(scene.rows / density));
  const width = cols * box.w;
  const height = rows * box.h;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  const image = context.createImageData(width, height);
  const chosen = engineOptions(options, shape, density);
  rasterize(renderFrame(scene, frameIndex, chosen), scene, cell, image.data, chosen);
  context.putImageData(image, 0, 0);
}

function initializeStudy(): Array<() => void> {
  const host = document.querySelector<HTMLElement>(STUDY);
  if (!host) return [];
  const scene = sceneFor(host.dataset.shapeScene ?? '') ?? sceneFor('joyan-night-coast');
  if (!scene) return [];
  const board = document.querySelector<HTMLElement>(BOARD);
  const views = [...host.querySelectorAll<HTMLCanvasElement>('canvas[data-shape-view]')];
  const boardItems = board ? [...board.querySelectorAll<HTMLElement>('[data-shape-board-item]')] : [];
  const readout = host.querySelector<HTMLElement>('[data-shape-readout]');
  const fallbacks = [...host.querySelectorAll<HTMLElement>('[data-shape-fallback]')];
  const toggle = host.querySelector<HTMLButtonElement>('[data-shape-toggle]');
  const status = host.querySelector<HTMLElement>('[data-shape-status]');
  if (!views.length) return [];
  // An initial state can be handed in through the query string, which is how a
  // screenshot or a hash comparison pins one configuration without clicking.
  const params = new URLSearchParams(window.location.search);
  for (const [name, key] of [['shape', 'shape'], ['ramp', 'ramp'], ['dither', 'dither'],
    ['geometry', 'geometry'], ['grid', 'grid'], ['palette', 'palette']]) {
    const wanted = params.get(name);
    const control = host.querySelector<HTMLSelectElement>(`[data-shape-control="${key}"]`);
    if (wanted && control && [...control.options].some((option) => option.value === wanted)) control.value = wanted;
  }
  const preference = matchMedia(REDUCED);
  const cleanups: Array<() => void> = [];
  let options = studyOptions(host);
  let current = withPalette(scene, options.palette);
  let frame = scene.posterFrame;
  let raf = 0;
  let last = 0;
  // The study is a STILL until the visitor presses Play: the page, the docs and
  // this runtime all say so, and the user asked to compare options without the
  // picture moving under them. `started` only decides how the status is worded.
  let playing = false;
  let started = false;
  let visible = true;

  const describe = (): string => {
    // The readout is measured, never invented: the coverage ladder and the solved
    // sizes come from the engine, and the derivation is the engine's own words.
    const sizes = [1, 2, 3]
      .map((step) => maskSize(options.shape, options.ramp, options.geometry, step).toFixed(4))
      .join(' / ');
    return `${options.shape} · ${options.ramp} ramp · ${options.ditherMode} dither · `
      + `${options.geometry === 'char' ? '1:2 character' : '1:1 square'} cells · `
      + `${scene.cols / options.density} × ${scene.rows / options.density} cells · ${options.palette} palette · `
      + `solved size (cell units) ${sizes} · ${maskDerivation(options.shape)}`;
  };
  const repaint = (): void => {
    for (const view of views) paintStudyCanvas(view, current, options, frame);
    // The board is the fixed reference: every shape at the poster frame, so the
    // comparison does not move while the view panes play.
    for (const item of boardItems) {
      const canvas = item.querySelector<HTMLCanvasElement>('canvas[data-shape-board-canvas]');
      const shape = item.dataset.shapeFor ?? options.shape;
      if (canvas) paintStudyCanvas(canvas, current, { ...options, ramp: 'shape' }, scene.posterFrame, shape);
    }    host.dataset.shapeFrame = String(frame);
    if (board) board.dataset.shapeBoardFrame = String(scene.posterFrame);
    if (readout) readout.textContent = describe();
    for (const node of fallbacks) node.hidden = true;
  };
  const updateStatus = (): void => {
    if (!toggle || !status) return;
    toggle.disabled = preference.matches;
    toggle.setAttribute('aria-pressed', String(playing && !preference.matches));
    toggle.textContent = preference.matches ? 'Still frame · reduced motion' : playing ? 'Pause' : 'Play';
    status.textContent = preference.matches
      ? `Still frame ${scene.posterFrame} · reduced motion · the study never animates on its own`
      : !playing
        ? started
          ? 'Paused · the board stays at the poster frame and the study panes hold their last frame'
          : `Still at the poster frame ${scene.posterFrame} · press Play to animate the three view panes`
        : !visible || document.hidden
          ? 'Paused · outside viewport or hidden'
          : `Playing the three view panes at ${scene.fps} fps · the board stays at the poster frame`;
  };
  const tick = (now: number): void => {
    raf = requestAnimationFrame(tick);
    if (now - last < 1000 / scene.fps - 1) return;
    last = now;
    repaint();
    frame = (frame + 1) % scene.cycleFrames;
  };
  const stop = (): void => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = (): void => {
    if (preference.matches) {
      stop();
      frame = scene.posterFrame;
      repaint();
    } else if (playing && visible && !document.hidden) {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    } else {
      stop();
    }
    updateStatus();
  };
  const onChange = (): void => {
    options = studyOptions(host);
    current = withPalette(scene, options.palette);
    stop();
    // A still stays on the poster frame; a playing pane restarts from the top.
    frame = playing && !preference.matches ? 0 : scene.posterFrame;
    repaint();
    sync();
  };
  const onToggle = (): void => {
    playing = !playing;
    if (playing) started = true;
    stop();
    sync();
  };
  for (const control of host.querySelectorAll<HTMLElement>('[data-shape-control]')) {
    control.addEventListener('change', onChange);
  }
  toggle?.addEventListener('click', onToggle);
  preference.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  const observer = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    sync();
  });
  observer.observe(views[0]);
  // A bounded, lab-only frame-time probe: it renders the CURRENT options N times
  // (the masks are already solved and cached, so this is the per-frame path) and
  // returns the sorted milliseconds. It is a comparable sample on one host, not a
  // generalisation, and it is only installed on this page.
  const probeWindow = window as unknown as { __joyanShapeProbe?: (iterations?: number) => unknown };
  probeWindow.__joyanShapeProbe = (iterations = 20) => {
    const canvas = views[0];
    const cell = Number(canvas.dataset.shapeCell ?? DELIVERY_CELL);
    const density = options.density;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const cols = Math.max(1, Math.round(scene.cols / density));
    const rows = Math.max(1, Math.round(scene.rows / density));
    const image = context.createImageData(cols * cell, rows * cell);
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const chosen = engineOptions(options);
      rasterize(renderFrame(current, scene.posterFrame, chosen), current, cell, image.data, chosen);
      context.putImageData(image, 0, 0);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return {
      iterations, cell, geometry: options.geometry, dither: options.ditherMode, shape: options.shape, ramp: options.ramp,
      palette: options.palette, density: options.density,
      min: times[0], median: times[times.length >> 1],
      p95: times[Math.min(times.length - 1, Math.floor(times.length * 0.95))], ms: times,
    };
  };
  host.setAttribute('data-ready', '');
  frame = scene.posterFrame;
  repaint();
  sync();  cleanups.push(() => {
    stop();
    observer.disconnect();
    for (const control of host.querySelectorAll<HTMLElement>('[data-shape-control]')) {
      control.removeEventListener('change', onChange);
    }
    toggle?.removeEventListener('click', onToggle);
    preference.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    delete probeWindow.__joyanShapeProbe;
  });
  return cleanups;
}

// ---------------------------------------------------------------------------
// `/lab/image` — the WU18 image pipeline surface.
// ---------------------------------------------------------------------------

/** The serialised converted scene the page embeds as data. */
interface SerializedScene {
  id: string;
  cols: number;
  rows: number;
  fps: number;
  cycleFrames: number;
  posterFrame: number;
  palette: string[];
  ground: number;
  groundHex: string;
  colorMode: string;
  params?: Record<string, unknown>;
  levels: string;
  rgb?: string;
}

/**
 * Structural check for an embedded payload, the same way `isScene` checks a
 * registry scene: a payload that stops matching simply does not mount, and no
 * `as` hides that. `sceneFromSerialized` validates the rest (the base64 and the
 * cell count) when it rebuilds the field.
 */
function isSerializedScene(value: unknown): value is SerializedScene {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value && 'cols' in value && 'rows' in value && 'fps' in value
    && 'cycleFrames' in value && 'posterFrame' in value && 'palette' in value
    && 'ground' in value && 'groundHex' in value && 'colorMode' in value && 'levels' in value)) return false;
  return typeof value.id === 'string' && value.id.length > 0
    && typeof value.cols === 'number' && Number.isInteger(value.cols) && value.cols > 0
    && typeof value.rows === 'number' && Number.isInteger(value.rows) && value.rows > 0
    && typeof value.fps === 'number' && value.fps > 0
    && typeof value.cycleFrames === 'number' && Number.isInteger(value.cycleFrames) && value.cycleFrames > 0
    && typeof value.posterFrame === 'number' && Number.isInteger(value.posterFrame) && value.posterFrame >= 0
    && Array.isArray(value.palette) && value.palette.length >= 4
    && typeof value.ground === 'number' && value.ground >= 0 && value.ground < value.palette.length
    && typeof value.groundHex === 'string'
    && typeof value.colorMode === 'string' && typeof value.levels === 'string';
}

/** The treatment the treatment control currently names, read from its option. */
function imageTreatment(host: HTMLElement | null): { id: string; palette: string; overlays: string[] } {
  const select = host?.querySelector<HTMLSelectElement>('[data-image-control="treatment"]');
  const option = select?.selectedOptions[0];
  return {
    id: select?.value ?? 'plain',
    palette: option?.dataset.palette ?? 'ink',
    overlays: (option?.dataset.overlays ?? '').split(/[,+\s]+/).filter(Boolean),
  };
}

function initializeImage(): Array<() => void> {
  const host = document.querySelector<HTMLElement>(IMAGE);
  if (!host) return [];
  const payloads = new Map<string, SerializedScene>();
  for (const node of host.querySelectorAll<HTMLScriptElement>('script[type="application/json"][data-image-scene]')) {
    const id = node.dataset.imageScene ?? '';
    try {
      const parsed = JSON.parse(node.textContent ?? '') as unknown;
      if (isSerializedScene(parsed)) payloads.set(id, parsed);
    } catch {
      // A payload that will not parse simply does not mount; the fallback text
      // stays as the honest description of what is missing.
    }
  }
  if (payloads.size === 0) return [];
  const views = [...host.querySelectorAll<HTMLCanvasElement>('canvas[data-image-view]')];
  if (!views.length) return [];
  const inputControl = host.querySelector<HTMLSelectElement>('[data-image-control="input"]');
  const treatmentControl = host.querySelector<HTMLSelectElement>('[data-image-control="treatment"]');
  const densityControl = host.querySelector<HTMLSelectElement>('[data-image-control="density"]');
  const readout = host.querySelector<HTMLElement>('[data-image-readout]');
  const status = host.querySelector<HTMLElement>('[data-image-status]');
  const toggle = host.querySelector<HTMLButtonElement>('[data-image-toggle]');
  const fallbacks = [...host.querySelectorAll<HTMLElement>('[data-image-fallback]')];
  const preference = matchMedia(REDUCED);
  const cleanups: Array<() => void> = [];
  const cache = new Map<string, Scene>();
  let scene = buildImageScene();
  let frame = 0;
  let raf = 0;
  let last = 0;
  let playing = false;
  let started = false;
  let visible = true;

  function inputId(): string {
    const wanted = inputControl?.value ?? host?.dataset.imageScene ?? '';
    return payloads.has(wanted) ? wanted : [...payloads.keys()][0];
  }

  function density(): number {
    const value = Number(densityControl?.value ?? '1');
    return [1, 2, 4].includes(value) ? value : 1;
  }

  /**
   * The scene for the current controls, built ONCE per (input, treatment): the
   * payload is the pipeline's own serialisation, `applyTreatment` is the shared
   * overlay+palette function, and the engine owns the ladder, dither and
   * compensation from there. This is the same call the checker makes in Node.
   */
  function buildImageScene(): Scene {
    const id = inputId();
    const treatment = imageTreatment(host);
    const key = `${id}|${treatment.id}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const payload = payloads.get(id);
    if (!payload) throw new Error(`no embedded payload for ${id}`);
    const built = applyTreatment(sceneFromSerialized(payload), treatment, IMAGE_PALETTES);
    cache.set(key, built);
    return built;
  }

  const paintView = (canvas: HTMLCanvasElement, index: number, stride: number): void => {
    const cell = Number(canvas.dataset.imageCell ?? DELIVERY_CELL);
    const cols = Math.max(1, Math.round(scene.cols / stride));
    const rows = Math.max(1, Math.round(scene.rows / stride));
    const width = cols * cell;
    const height = rows * cell;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const image = context.createImageData(width, height);
    rasterize(renderFrame(scene, index, { dither: 'bayer4', density: stride }), scene, cell, image.data);
    context.putImageData(image, 0, 0);
  };
  const describe = (): string => {
    const payload = payloads.get(inputId());
    const treatment = imageTreatment(host);
    const stride = density();
    const cols = Math.round(scene.cols / stride);
    const rows = Math.round(scene.rows / stride);
    return `${inputId()} · ${treatment.id} · ${cols} × ${rows} cells · `
      + `${scene.palette.length}-entry palette (ground ${scene.groundHex}) · `
      + `overlays: ${treatment.overlays.length ? treatment.overlays.join(', ') : 'none'} · `
      + `measure ${String(payload?.params?.measure ?? 'unknown')} · colour ${payload?.colorMode ?? 'unknown'}`;
  };
  const repaint = (): void => {
    const stride = density();
    for (const view of views) paintView(view, frame, stride);
    host.dataset.imageFrame = String(frame);
    if (readout) readout.textContent = describe();
    for (const node of fallbacks) node.hidden = true;
  };
  const updateStatus = (): void => {
    if (!toggle || !status) return;
    toggle.disabled = preference.matches;
    toggle.setAttribute('aria-pressed', String(playing && !preference.matches));
    toggle.textContent = preference.matches ? 'Still frame · reduced motion' : playing ? 'Pause' : 'Play';
    status.textContent = preference.matches
      ? 'Still frame 0 · reduced motion · the image study never animates on its own'
      : !playing
        ? started
          ? 'Paused · the views hold the last frame'
          : 'Still at the poster frame · press Play to animate the views'
        : !visible || document.hidden
          ? 'Paused · outside viewport or hidden'
          : `Playing the views at ${scene.fps} fps · overlays periodic over the loop`;
  };
  const tick = (now: number): void => {
    raf = requestAnimationFrame(tick);
    if (now - last < 1000 / scene.fps - 1) return;
    last = now;
    repaint();
    frame = (frame + 1) % scene.cycleFrames;
  };
  const stop = (): void => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = (): void => {
    if (preference.matches) {
      stop();
      frame = scene.posterFrame;
      repaint();
    } else if (playing && visible && !document.hidden) {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    } else {
      stop();
    }
    updateStatus();
  };
  const onChange = (): void => {
    try {
      scene = buildImageScene();
    } catch {
      return;
    }
    stop();
    frame = playing && !preference.matches ? 0 : scene.posterFrame;
    repaint();
    sync();
  };
  const onToggle = (): void => {
    playing = !playing;
    if (playing) started = true;
    stop();
    sync();
  };
  for (const control of [inputControl, treatmentControl, densityControl]) {
    control?.addEventListener('change', onChange);
  }
  toggle?.addEventListener('click', onToggle);
  preference.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  const observer = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    sync();
  });
  observer.observe(views[0]);
  host.setAttribute('data-ready', '');
  frame = scene.posterFrame;
  repaint();
  sync();
  cleanups.push(() => {
    stop();
    observer.disconnect();
    for (const control of [inputControl, treatmentControl, densityControl]) {
      control?.removeEventListener('change', onChange);
    }
    toggle?.removeEventListener('click', onToggle);
    preference.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
  });
  return cleanups;
}

// ---------------------------------------------------------------------------
// `[data-coming-hero]` — WU20 (correction round): the public page's hero
// AUTOPLAYS. The user directed that the effects always play — no Play control
// exists on the public page; the still-until-Play pattern stays on the lab
// routes. The loop starts on load when the host is on screen, pauses
// offscreen and in hidden tabs, resumes on return, and pagehide releases
// everything. `prefers-reduced-motion` keeps the real static poster (the
// build-time bake) with truthful wording and never animates.
// ---------------------------------------------------------------------------
function initializeComingHero(): Array<() => void> {
  const host = document.querySelector<HTMLElement>(COMING_HERO);
  if (!host) return [];
  const payloadNode = host.querySelector<HTMLScriptElement>('script[type="application/json"][data-coming-hero-scene]');
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const status = host.querySelector<HTMLElement>('[data-hero-status]');
  const poster = host.querySelector<HTMLImageElement>('img');
  if (!payloadNode || !canvas || !status || !poster) return [];
  let payload: unknown;
  try {
    payload = JSON.parse(payloadNode.textContent ?? '') as unknown;
  } catch {
    return [];
  }
  if (!isSerializedScene(payload)) return [];
  const overlays = (host.dataset.heroOverlays ?? 'stars,aurora').split(/[+,\s]+/).filter(Boolean);
  const treatment = { id: host.dataset.heroPalette ?? 'aurora', palette: host.dataset.heroPalette ?? 'aurora', overlays };
  const scene = applyTreatment(sceneFromSerialized(payload), treatment, IMAGE_PALETTES);
  const cell = DELIVERY_CELL;
  const width = scene.cols * cell;
  const height = scene.rows * cell;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return [];
  const image = context.createImageData(width, height);
  const preference = matchMedia(REDUCED);
  let frame = 0;
  let raf = 0;
  let last = 0;
  let visible = true;
  const playing = (): boolean => host.hasAttribute('data-playing');

  const paint = (index: number): void => {
    const rendered = renderFrame(scene, index, { dither: 'bayer4', density: 1 });
    // The same engine raster the Node bake ran — no second implementation.
    rasterize(rendered, scene, cell, image.data);
    context.putImageData(image, 0, 0);
    host.dataset.heroFrame = String(rendered.frame);
  };
  const updateStatus = (): void => {
    status.textContent = preference.matches ? 'Static poster · reduced motion'
      : playing() && (!visible || document.hidden) ? 'Paused · outside viewport or hidden'
        : `Our engine · ${scene.fps} fps · stars and aurora`;
  };
  const tick = (now: number): void => {
    raf = requestAnimationFrame(tick);
    if (now - last < 1000 / scene.fps - 1) return;
    last = now;
    paint(frame);
    frame = (frame + 1) % scene.cycleFrames;
  };
  const stop = (): void => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = (): void => {
    if (preference.matches) {
      stop();
    } else if (visible && !document.hidden) {
      if (!raf) {
        // The phase starts NOW: the loop continues from the synchronously
        // painted frame 0 on the engine's own cadence.
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    } else {
      stop();
    }
    updateStatus();
  };
  const observer = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    sync();
  });
  preference.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if (preference.matches) {
    // Reduced motion: the baked poster (a real still of the same scene) stays;
    // the canvas is never painted and nothing animates.
    updateStatus();
  } else {
    // Autoplay (user-directed): paint frame 0 synchronously — the exact Node
    // raster — then start the loop from it.
    host.setAttribute('data-playing', '');
    poster.hidden = true;
    paint(0);
    frame = 1;
  }
  host.setAttribute('data-ready', '');
  observer.observe(canvas);
  sync();
  return [() => {
    stop();
    observer.disconnect();
    preference.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
  }];
}

// The lab page has no ClientRouter, so this fires once per document; the
// pagehide/pageshow pair covers bfcache restores, where the loops were stopped.
document.addEventListener('astro:page-load', initialize);
document.addEventListener('astro:before-swap', () => release?.());
window.addEventListener('pagehide', () => release?.());
window.addEventListener('pageshow', initialize);
initialize();
