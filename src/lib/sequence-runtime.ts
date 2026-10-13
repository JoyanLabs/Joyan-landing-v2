/**
 * Lab-only runtime for the WU27 SEQUENCE route (`/lab/sequence`).
 * Never imported by a landing page: the route is noindex and the delivery gate
 * admits it only as an add under the WU27 contract.
 *
 * THE ONE RENDERER IS THE ENGINE. The user rejected the standalone prototype
 * because its warp burst was a parallel particle canvas. Here the transition
 * happens TO THE SCENE THE PUBLIC PAGE RENDERS: the page frontmatter embeds the
 * SAME rolled serialised payload with the SAME joyan-page palette and the SAME
 * stars/aurora/wash overlays, and the act-1 → act-2 transition is the ENGINE's
 * own `warp` overlay ramping up over it (scripts/scene-src/overlays.mjs, tuned
 * slower and wider in WU27). The ramp is quantised into WARP_RAMP.buckets
 * discrete strengths (scripts/scene-src/sequence-warp.mjs — the ONE ramp
 * source the Node checkers read too); at bucket 0 the raster is BYTE-IDENTICAL
 * to the base scene, so the sequence starts ON the public scene. There is no
 * second canvas, no particle effect, no parallel renderer — every painted
 * pixel comes from `renderFrame`/`rasterize` in `scripts/scene-src/engine.mjs`.
 *
 * The acts:
 *   1  the terminal types "Wake up, Neo…" in VT323, coloured with the PAGE
 *      palette (bone text, amber prompt — never phosphor green); skippable by
 *      click or ArrowRight;
 *   →  the warp ramps up over the live scene while the terminal layer fades;
 *   2  the literal Sarah Connor line over the live scene, with its
 *      TERMINATOR 2 · SARAH CONNOR credit;
 *   3  the watcher line, Joyan set in Michroma, and the contact row
 *      (mailto + the authored dot Discord mark). The ES/EN toggle is the ONLY
 *      control; click/ArrowRight skips or restarts.
 *
 * Behaviour, all observable (same discipline as scene-runtime):
 *   - the scene plays at the engine's own fps ceiling; one rAF loop drives the
 *     scene AND the act progression, so pausing pauses both;
 *   - pauses offscreen (IntersectionObserver) and in hidden tabs; pagehide
 *     cancels the loop, clears every timer and removes every listener;
 *   - prefers-reduced-motion: reduce never starts the loop — the final act
 *     shows immediately over the static build-time poster (the same engine
 *     raster baked in Node); the toggle still works;
 *   - without JavaScript the server markup IS the final state over the poster.
 *
 * The payload is untyped JSON, so its shape is CHECKED at the boundary
 * (`isSequencePayload`) rather than cast — the same rule scene-runtime applies.
 */
import { DELIVERY_CELL, rasterize, renderFrame } from '../../scripts/scene-src/engine.mjs';
import { WARP_RAMP, sequenceScene, sequenceWarpScene } from '../../scripts/scene-src/sequence-warp.mjs';

/** The serialised converted scene the page embeds as data. */
interface SequencePayload {
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
  levels: string;
  rgb?: string;
}

/** What the runtime reads from the payload; everything else is validated. */
interface Scene {
  cols: number;
  rows: number;
  fps: number;
  cycleFrames: number;
  posterFrame: number;
  field: (x: number, y: number, t: number) => number | number[];
  palette: string[];
  ground: number;
}

const REDUCED = '(prefers-reduced-motion: reduce)';
const HOST = '[data-sequence-lab]';
/** Hold after the typewriter finishes before the warp takes over. */
const TYPE_HOLD_MS = 1400;
/** How long act 2 (the fate line) stays before the watcher act. */
const FATE_HOLD_MS = 7000;
/** Typewriter cadence: one character every 140 ms of played time. */
const TYPE_STEP_MS = 140;

/** Structural check for the embedded payload, mirroring scene-runtime. */
function isSequencePayload(value: unknown): value is SequencePayload {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value && 'cols' in value && 'rows' in value && 'fps' in value
    && 'cycleFrames' in value && 'posterFrame' in value && 'palette' in value
    && 'ground' in value && 'groundHex' in value && 'colorMode' in value && 'levels' in value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && v.id.length > 0
    && typeof v.cols === 'number' && Number.isInteger(v.cols) && v.cols > 0
    && typeof v.rows === 'number' && Number.isInteger(v.rows) && v.rows > 0
    && typeof v.fps === 'number' && v.fps > 0
    && typeof v.cycleFrames === 'number' && Number.isInteger(v.cycleFrames) && v.cycleFrames > 0
    && typeof v.posterFrame === 'number' && Number.isInteger(v.posterFrame) && v.posterFrame >= 0
    && Array.isArray(v.palette) && v.palette.length >= 4
    && typeof v.ground === 'number' && v.ground >= 0 && v.ground < v.palette.length
    && typeof v.groundHex === 'string'
    && typeof v.colorMode === 'string' && typeof v.levels === 'string';
}

type Phase = 'typing' | 'ramp' | 'fate' | 'watcher';

const TERMINAL_TEXT_DEFAULT = 'Wake up, Neo\u2026';

function initialize(): void {
  release?.();
  release = initializeSequence();
}

let release: (() => void) | undefined;

/** `/lab/sequence`: the three acts over the live engine scene. */
function initializeSequence(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>(HOST);
  if (!host) return undefined;
  const payloadNode = host.querySelector<HTMLScriptElement>('script[type="application/json"][data-sequence-scene]');
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const poster = host.querySelector<HTMLImageElement>('[data-sequence-poster]');
  const status = host.querySelector<HTMLElement>('[data-sequence-status]');
  const stage = host.querySelector<HTMLElement>('[data-sequence-stage]');
  const typed = host.querySelector<HTMLElement>('[data-sequence-typed]');
  // The typed line lives in the MARKUP (data-sequence-terminal-text), so the
  // copy is server-rendered content, not a runtime literal.
  const terminalText = typed?.dataset.sequenceTerminalText ?? TERMINAL_TEXT_DEFAULT;
  const terminalAct = host.querySelector<HTMLElement>('[data-act="terminal"]');
  const langButton = host.querySelector<HTMLButtonElement>('[data-sequence-lang]');
  if (!payloadNode || !canvas || !poster || !status || !stage || !typed || !terminalAct) return undefined;
  let payload: unknown;
  try {
    payload = JSON.parse(payloadNode.textContent ?? '') as unknown;
  } catch {
    return undefined;
  }
  if (!isSequencePayload(payload)) return undefined;

  // The scene the public page renders, and the warp ramp over it: one scene
  // object per bucket, built once (the engine caches masks/sprites per scene).
  const rampScenes = new Map<number, Scene>();
  const sceneForBucket = (bucket: number): Scene => {
    const cached = rampScenes.get(bucket);
    if (cached) return cached;
    const built = bucket <= 0
      ? sequenceScene(payload)
      : sequenceWarpScene(payload, Math.min(1, bucket / WARP_RAMP.buckets));
    rampScenes.set(bucket, built);
    return built;
  };

  const cell = DELIVERY_CELL;
  const width = payload.cols * cell;
  const height = payload.rows * cell;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  const image = context.createImageData(width, height);

  const preference = matchMedia(REDUCED);
  const reduced = (): boolean => preference.matches;

  let phase: Phase = 'typing';
  let phaseMs = 0;
  let frame = 0;
  let raf = 0;
  let last = 0;
  let visible = true;
  let lang: 'es' | 'en' = 'es';

  const acts = new Map<Phase, HTMLElement | null>([
    ['typing', terminalAct],
    ['fate', host.querySelector<HTMLElement>('[data-act="fate"]')],
    ['watcher', host.querySelector<HTMLElement>('[data-act="watcher"]')],
  ]);

  const showAct = (next: Phase): void => {
    for (const [name, node] of acts) {
      if (!node) continue;
      // The terminal layer fades while the warp takes over ('ramp' lights no
      // act: the terminal departs and the fate act enters when the ramp ends);
      // the other acts crossfade through the same opacity transition.
      node.classList.toggle('sequence-act-on', name === next);
      if (name === 'typing') node.classList.toggle('sequence-act-departed', next !== 'typing');
    }
  };

  const applyLang = (): void => {
    for (const node of host.querySelectorAll<HTMLElement>('[data-sequence-line]')) {
      const text = lang === 'es' ? node.dataset.es : node.dataset.en;
      if (typeof text === 'string') node.textContent = text;
    }
    const hint = host.querySelector<HTMLElement>('[data-sequence-hint]');
    if (hint) hint.textContent = lang === 'es'
      ? 'clic o → para avanzar'
      : 'click or → to advance';
    if (langButton) langButton.textContent = lang === 'es' ? 'EN' : 'ES';
  };

  const updateStatus = (): void => {
    status.textContent = reduced()
      ? 'Final state · static poster · reduced motion'
      : !visible || document.hidden ? 'Paused · outside viewport or hidden'
        : phase === 'typing' ? 'Act 1 · the terminal · our engine live behind it'
          : phase === 'ramp' ? 'Transition · the engine warp ramping over the scene'
            : phase === 'fate' ? 'Act 2 · the fate line over the live scene'
              : 'Act 3 · the watcher · final state';
  };

  const paint = (): void => {
    const bucket = phase === 'typing' ? 0
      : phase === 'ramp'
        ? Math.min(WARP_RAMP.buckets, Math.round((Math.min(1, phaseMs / WARP_RAMP.durationMs)) * WARP_RAMP.buckets))
        : WARP_RAMP.buckets;
    const scene = sceneForBucket(bucket);
    const rendered = renderFrame(scene, frame, { dither: 'bayer4', density: 1 });
    rasterize(rendered, scene, cell, image.data);
    context.putImageData(image, 0, 0);
    host.dataset.sequenceFrame = String(rendered.frame);
    host.dataset.sequenceBucket = String(bucket);
  };

  const setPhase = (next: Phase): void => {
    phase = next;
    phaseMs = 0;
    showAct(next);
    updateStatus();
  };

  const restart = (): void => {
    typed.textContent = '';
    setPhase('typing');
  };

  const advance = (): void => {
    if (reduced()) return;
    if (phase === 'typing') setPhase('ramp');
    else if (phase === 'ramp') setPhase('fate');
    else if (phase === 'fate') setPhase('watcher');
    else restart();
  };

  const tick = (now: number): void => {
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min(250, now - last) : 0;
    if (now - last < 1000 / payload.fps - 1) return;
    last = now;
    phaseMs += dt;
    if (phase === 'typing') {
      const shown = Math.min(terminalText.length, Math.floor(phaseMs / TYPE_STEP_MS));
      typed.textContent = terminalText.slice(0, shown);
      if (phaseMs > terminalText.length * TYPE_STEP_MS + TYPE_HOLD_MS) setPhase('ramp');
    } else if (phase === 'ramp') {
      if (phaseMs >= WARP_RAMP.durationMs) setPhase('fate');
    } else if (phase === 'fate') {
      if (phaseMs >= FATE_HOLD_MS) setPhase('watcher');
    }
    paint();
    frame = (frame + 1) % payload.cycleFrames;
  };

  const stop = (): void => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = (): void => {
    if (reduced()) {
      stop();
    } else if (visible && !document.hidden) {
      if (!raf) {
        last = 0;
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
  const onPreference = (): void => {
    if (reduced()) {
      // Reduced motion skips to the final state over the static poster.
      stop();
      host.removeAttribute('data-playing');
      showAct('watcher');
      if (phase === 'typing') typed.textContent = terminalText;
      phase = 'watcher';
    }
    sync();
  };
  const onSkip = (event: Event): void => {
    if (event instanceof KeyboardEvent && event.key !== 'ArrowRight') return;
    advance();
  };
  const onLang = (): void => {
    lang = lang === 'es' ? 'en' : 'es';
    applyLang();
  };
  const onVisibility = (): void => sync();

  stage.addEventListener('click', onSkip);
  document.addEventListener('keydown', onSkip);
  langButton?.addEventListener('click', onLang);
  preference.addEventListener('change', onPreference);
  document.addEventListener('visibilitychange', onVisibility);

  if (reduced()) {
    // The static poster (a real engine still baked at build time) stays; the
    // canvas is never painted and nothing animates. The final act shows.
    host.removeAttribute('data-playing');
    typed.textContent = terminalText;
    phase = 'watcher';
    showAct('watcher');
  } else {
    // Autoplay: the scene starts under the terminal (bucket 0 = the exact
    // public scene), the typewriter runs, then the engine warp takes over.
    host.setAttribute('data-playing', '');
    poster.hidden = true;
    showAct('typing');
    paint();
    frame = 1;
  }
  applyLang();
  host.setAttribute('data-ready', '');
  observer.observe(canvas);
  sync();

  return () => {
    stop();
    observer.disconnect();
    stage.removeEventListener('click', onSkip);
    document.removeEventListener('keydown', onSkip);
    langButton?.removeEventListener('click', onLang);
    preference.removeEventListener('change', onPreference);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

// The lab page has no ClientRouter, so this fires once per document; the
// pagehide/pageshow pair covers bfcache restores, where the loop was stopped.
document.addEventListener('astro:page-load', initialize);
document.addEventListener('astro:before-swap', () => release?.());
window.addEventListener('pagehide', () => release?.());
window.addEventListener('pageshow', initialize);
initialize();
