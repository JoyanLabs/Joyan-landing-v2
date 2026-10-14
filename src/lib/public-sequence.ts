/**
 * PUBLIC SEQUENCE RUNTIME (WU33) — the hero's own act machine.
 * Never imported by a laboratory route: this is the ONE runtime path on the
 * public pages, imported only by `JoyanComingHero.astro`.
 *
 * WU33 — THE CONTENT GATE IS REMOVED (the user's decision, reversing WU31):
 * the page's content — the Joyan name, the eyebrow, the scene, the final
 * watcher line — is VISIBLE FROM FIRST PAINT, with zero JavaScript, with
 * reduced motion, and at first paint with scripting on. The sequence only
 * ever ADDS motion on top; it is never a door that hides content. The
 * terminal beat now types OVER the already-visible page instead of replacing
 * it, and the text arc decodes IN PLACE.
 *
 * The reveal is the HALFTONE MASK (the user retired the WU31/WU32 warp burst
 * from the public page): a threshold mask in our dot language drives DOT
 * COVERAGE, so the scene assembles from the ramp upward — radial from the
 * subject, Bayer-dithered front, dots blooming through the ladder behind it.
 * The ONE renderer is still the engine (`renderFrame`/`rasterize` in
 * `scripts/scene-src/engine.mjs`); the mask ramp is
 * `scripts/scene-src/sequence-warp.mjs` (`MASK_RAMP`, `sequenceMaskScene`) —
 * the SAME module the Node checkers read, so the live canvas derives the same
 * scene the checkers measure. The mask is time-free and at the top state the
 * runtime paints the base scene: the settled state is byte-identical to the
 * composition the page has always shown (checker-proven). The warp overlay
 * stays in the engine catalogue and in the laboratory; nothing on this path
 * references it any more.
 *
 * The text arc: the fate line decodes IN after the reveal (per-character
 * clocks, accent only on cycling glyphs, one real text node, the box pinned
 * so nothing shifts), holds ~5 s — the WU32 hold of 1,900 ms was the defect —
 * then decodes into the watcher line, which is where it stays. The name is
 * NEVER decoded and never hidden: it is first-paint content.
 *
 * Behaviour, all observable: one rAF loop at the engine's own fps cadence
 * drives the phases AND the scene; pauses offscreen and in hidden tabs;
 * pagehide releases everything; reduced motion never animates; the invisible
 * skip (click/tap/key) ignores the locale link.
 */
import { DELIVERY_CELL, rasterize, renderFrame } from '../../scripts/scene-src/engine.mjs';
import { MASK_RAMP, sequenceMaskScene, sequenceScene } from '../../scripts/scene-src/sequence-warp.mjs';

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
const HOST = '[data-coming-hero]';
/** The terminal's typed line — server-rendered attribute, not a runtime literal. */
const TERMINAL_FALLBACK = 'Wake up, Neo\u2026';
/** Hold after the typing completes before the reveal takes over. The terminal
 * types OVER the visible page (WU33), so this hold is a beat, not a gate. */
const TYPE_HOLD_MS = 900;
/** Brief hold at the top of the mask ramp before the fate line decodes in. */
const FULL_HOLD_MS = 300;
/** WU33 — the fate line decodes IN (per-character clocks, in place) before
 * its hold. */
const FATE_IN_MS = 1100;
/** WU33 — how long the fate line holds before the corruption begins. The
 * WU32 hold of 1,900 ms was the defect being fixed: ~5 s per phrase, readable
 * before it decodes into the next. */
const FATE_HOLD_MS = 5000;
/** WU33 — the corruption duration: SLOWER than WU32's 860 ms decode. */
const SCRAMBLE_MS = 1600;
/** Typewriter cadence (ms per character of played time). */
const TYPE_STEP_MS = 110;
/** OUR glyph language for the corruption: the dot ramp, never unicode noise. */
const SCRAMBLE_GLYPHS = '·•●';
/** WU32 DECODE — the cycling glyphs carry the ACCENT colour; a character that
 * has resolved keeps the element's own base tone (no per-character random
 * tones: the WU29 three-tone roulette read as noise). One real text node: the
 * spans are children of the element, no aria-hidden duplicate layers. */
const DECODE_ACCENT = '#ffb000';
/** WU32 — per-character clocks. Each character resolves on its OWN deadline;
 * the lock is left-to-right (a deadline is always inside its own slot, so
 * deadlines stay strictly increasing) but UNEVEN (each deadline is offset
 * within its slot by a deterministic hash), so the string locks like a
 * decipherment, not a sweep. All characters resolve inside the first 70 % of
 * the phase; the rest is hold. */
const DECODE_WINDOW = 0.7;
const DECODE_JITTER = 0.9;

/** The resolution instant of character `i`, in [0, 1] of the phase duration.
 * Pure and deterministic. */
function charDeadline(i: number, len: number): number {
  if (len <= 1) return 0;
  const slot = DECODE_WINDOW / len;
  const jitter = (scrambleHash(i + 13, 991) - 0.5) * DECODE_JITTER;
  return Math.min(0.95, Math.max(0, (i + 0.5 + jitter) * slot));
}

/** Escape the resolved text for innerHTML (the copy is plain, but the decoder
 * is generic). */
function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

/** WU32 — no layout shift: before the first scramble span replaces the text,
 * the element's FINAL text is laid out and its box pinned (min-width /
 * min-height), so the narrower dot-ramp glyphs cannot reflow the line and the
 * resolved line fits its own reserved box exactly; the pin is released when
 * the decode completes. */
function reserveBox(el: HTMLElement, finalText: string): void {
  if (el.dataset.boxReserved === '1') return;
  const previous = el.textContent;
  el.textContent = finalText;
  const rect = el.getBoundingClientRect();
  el.textContent = previous;
  el.style.minWidth = `${Math.ceil(rect.width)}px`;
  el.style.minHeight = `${Math.ceil(rect.height)}px`;
  el.dataset.boxReserved = '1';
}

function releaseBox(el: HTMLElement): void {
  if (el.dataset.boxReserved !== '1') return;
  delete el.dataset.boxReserved;
  el.style.minWidth = '';
  el.style.minHeight = '';
}

/** Structural check for the embedded payload, mirroring the other runtimes. */
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

type Phase = 'typing' | 'reveal' | 'full' | 'fateIn' | 'fate' | 'scramble' | 'final';

/** Deterministic hash for the scramble: a pure function of (i, step). */
function scrambleHash(i: number, step: number): number {
  let h = Math.imul(i + 1, 0x2f1b3d5f) ^ Math.imul(step + 1, 0x6a4f9c17);
  h = Math.imul(h ^ (h >>> 15), 0x1d8e5b93);
  return ((h >>> 8) & 0xffff) / 0xffff;
}

let release: (() => void) | undefined;

function initialize(): void {
  release?.();
  release = initializePublicSequence();
}

function initializePublicSequence(): (() => void) | undefined {
  const host = document.querySelector<HTMLElement>(HOST);
  if (!host) return undefined;
  const payloadNode = host.querySelector<HTMLScriptElement>('script[type="application/json"][data-coming-hero-scene]');
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const poster = host.querySelector<HTMLImageElement>('[data-hero-poster]');
  const status = host.querySelector<HTMLElement>('[data-hero-status]');
  const sceneLayer = host.querySelector<HTMLElement>('.scene-layer');
  const typed = host.querySelector<HTMLElement>('[data-hero-typed]');
  const terminal = host.querySelector<HTMLElement>('[data-hero-terminal]');
  const nameEl = host.querySelector<HTMLElement>('[data-hero-name]');
  const tagline = host.querySelector<HTMLElement>('[data-hero-tagline]');
  const credit = host.querySelector<HTMLElement>('[data-hero-credit]');
  if (!payloadNode || !canvas || !poster || !status || !sceneLayer || !typed || !terminal || !nameEl || !tagline || !credit) {
    return undefined;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(payloadNode.textContent ?? '') as unknown;
  } catch {
    return undefined;
  }
  if (!isSequencePayload(payload)) return undefined;

  // The typed line is server-rendered content (data attribute), like the lab.
  const terminalText = typed.dataset.heroTerminalText ?? TERMINAL_FALLBACK;
  // WU33 — the name is first-paint content and is NEVER touched: no decode,
  // no box pin, no phase gate. It sits over the scene the whole time.
  const fateText = tagline.dataset.heroFate ?? tagline.textContent ?? '';
  const watcherText = tagline.dataset.heroWatcher ?? tagline.textContent ?? '';

  // One scene object per mask state (0..steps); the TOP state IS the base
  // scene (the settled page, byte-identical by construction), state 0
  // resolves nothing — the reveal assembles from the ramp upward.
  const maskScenes = new Map<number, Scene>();
  const sceneForState = (state: number): Scene => {
    const cached = maskScenes.get(state);
    if (cached) return cached;
    const built = state >= MASK_RAMP.steps
      ? sequenceScene(payload)
      : sequenceMaskScene(payload, Math.max(0, state));
    maskScenes.set(state, built);
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

  const setPhase = (next: Phase): void => {
    phase = next;
    phaseMs = 0;
    host.dataset.sequencePhase = next;
    // The terminal is the beat: it fades out when the reveal takes over.
    if (next === 'typing') {
      terminal.classList.remove('hero-terminal-departed');
    } else {
      terminal.classList.add('hero-terminal-departed');
    }
    // The credit rides with the fate line and leaves with it.
    credit.classList.toggle('hero-credit-on', next === 'fateIn' || next === 'fate' || next === 'scramble');
    updateStatus();
  };

  const updateStatus = (): void => {
    status.textContent = reduced() ? 'Static poster · reduced motion'
      : !visible || document.hidden ? 'Paused · outside viewport or hidden'
        : phase === 'typing' ? 'Act 1 · the terminal over the page · click, tap or press any key to skip'
          : phase === 'reveal' ? 'The reveal · the halftone mask resolving the scene from the ramp upward'
            : phase === 'full' ? 'The scene, resolved'
              : phase === 'fateIn' ? 'The fate line decoding in · TERMINATOR 2 · SARAH CONNOR'
                : phase === 'fate' ? 'The fate line · TERMINATOR 2 · SARAH CONNOR'
                  : phase === 'scramble' ? 'The corruption · the line re-forms'
                    : 'Our engine · the scene, at rest';
  };

  const paint = (state: number): void => {
    const scene = sceneForState(state);
    const rendered = renderFrame(scene, frame, { dither: 'bayer4', density: 1 });
    rasterize(rendered, scene, cell, image.data);
    context.putImageData(image, 0, 0);
    host.dataset.heroFrame = String(rendered.frame);
    host.dataset.heroBucket = String(state);
  };

  /** WU32 — the DECODE: each character resolves on its own clock
   * (charDeadline); unresolved characters cycle through the dot-ramp glyphs
   * in the accent colour; resolved characters keep the base tone. The box is
   * pinned before the first span, released on completion — the line never
   * jumps. WU33: the fate line decodes IN with this too. */
  const renderDecode = (el: HTMLElement, text: string, progress: number, salt: number): void => {
    reserveBox(el, text);
    const step = Math.floor(progress * 24);
    if (Number(el.dataset.decodeStep ?? -1) === step && el.dataset.decoded === '1') return;
    el.dataset.decodeStep = String(step);
    el.dataset.decoded = '1';
    let html = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (progress >= charDeadline(i, text.length)) {
        html += ch === ' ' ? ' ' : escapeHtml(ch);
        continue;
      }
      if (ch === ' ') {
        html += ' ';
        continue;
      }
      const glyph = SCRAMBLE_GLYPHS[Math.floor(scrambleHash(i + salt, step) * SCRAMBLE_GLYPHS.length)];
      html += `<span style="color:${DECODE_ACCENT}">${glyph}</span>`;
    }
    el.innerHTML = html;
  };

  /** The corruption phase: the watcher line decodes into place. */
  const renderScramble = (progress: number): void => {
    renderDecode(tagline, watcherText, progress, 7);
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
      if (phaseMs > terminalText.length * TYPE_STEP_MS + TYPE_HOLD_MS) setPhase('reveal');
    } else if (phase === 'reveal') {
      // WU33 — the halftone mask reveal: the FIRST reveal frame flips
      // data-playing (the canvas takes over; the poster crossfades out under
      // it, CSS), then the mask assembles the scene from the ramp upward,
      // radial from the subject.
      if (!host.hasAttribute('data-playing')) {
        host.setAttribute('data-playing', '');
      }
      const p = Math.min(1, phaseMs / MASK_RAMP.durationMs);
      paint(Math.round(p * MASK_RAMP.steps));
      if (p >= 1) setPhase('full');
    } else if (phase === 'full') {
      paint(MASK_RAMP.steps);
      if (phaseMs >= FULL_HOLD_MS) setPhase('fateIn');
    } else if (phase === 'fateIn') {
      renderDecode(tagline, fateText, Math.min(1, phaseMs / FATE_IN_MS), 31);
      paint(MASK_RAMP.steps);
      if (phaseMs >= FATE_IN_MS) {
        tagline.dataset.decoded = '';
        tagline.textContent = fateText;
        setPhase('fate');
      }
    } else if (phase === 'fate') {
      paint(MASK_RAMP.steps);
      if (phaseMs >= FATE_HOLD_MS) setPhase('scramble');
    } else if (phase === 'scramble') {
      renderScramble(Math.min(1, phaseMs / SCRAMBLE_MS));
      paint(MASK_RAMP.steps);
      if (phaseMs >= SCRAMBLE_MS) {
        releaseBox(tagline);
        tagline.dataset.decoded = '';
        tagline.textContent = watcherText;
        setPhase('final');
      }
    } else {
      paint(MASK_RAMP.steps);
    }
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
    if (reduced()) skipToFinal();
    sync();
  };
  const skipToFinal = (): void => {
    stop();
    host.removeAttribute('data-playing');
    poster.hidden = false;
    sceneLayer.style.opacity = '1';
    terminal.classList.add('hero-terminal-departed');
    credit.classList.remove('hero-credit-on');
    releaseBox(tagline);
    tagline.dataset.decoded = '';
    tagline.textContent = watcherText;
    typed.textContent = terminalText;
    phase = 'final';
    host.dataset.sequencePhase = 'final';
    updateStatus();
  };
  // WU31 — the invisible skip: click, tap or keypress jumps to the final
  // state. No visible control is added (the language pair stays the only
  // visible control); Tab and modifier chords are left to the browser.
  // WU33 — the skip must not swallow the locale link: targets inside the
  // language nav navigate instead of skipping.
  const onSkip = (event: Event): void => {
    if (reduced() || phase === 'final') return;
    if (event.target instanceof Element && event.target.closest('[data-hero-locale]')) return;
    if (event instanceof KeyboardEvent
      && (event.key === 'Tab' || event.ctrlKey || event.metaKey || event.altKey)) return;
    skipToFinal();
  };
  host.addEventListener('pointerdown', onSkip);
  window.addEventListener('keydown', onSkip);
  const onVisibility = (): void => sync();

  preference.addEventListener('change', onPreference);
  document.addEventListener('visibilitychange', onVisibility);

  host.dataset.sequencePhase = 'typing';
  if (reduced()) {
    skipToFinal();
  } else {
    // WU33 — the scene layer is visible from first paint (the poster IS the
    // scene) and NOTHING is painted over it while the terminal types: no
    // data-playing, no canvas paint. The canvas takes over only when the
    // reveal phase starts (the tick's first reveal frame flips data-playing):
    // the mask begins at state 0 and the poster crossfades out while the
    // subject resolves — radial from the subject, so the eye keeps the
    // unicorn the whole time.
  }
  host.setAttribute('data-ready', '');
  // WU33 — observe the SCENE LAYER, not the canvas: the canvas is display:none
  // until the reveal (the poster is the first-paint scene), and an observer on
  // a display:none element would report the hero permanently offscreen.
  observer.observe(sceneLayer);
  sync();

  return () => {
    stop();
    observer.disconnect();
    host.removeEventListener('pointerdown', onSkip);
    window.removeEventListener('keydown', onSkip);
    preference.removeEventListener('change', onPreference);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

// The public pages have no ClientRouter, so this fires once per document; the
// pagehide/pageshow pair covers bfcache restores, where the loop was stopped.
document.addEventListener('astro:page-load', initialize);
document.addEventListener('astro:before-swap', () => release?.());
window.addEventListener('pagehide', () => release?.());
window.addEventListener('pageshow', initialize);
initialize();
