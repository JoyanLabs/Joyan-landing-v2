/**
 * PUBLIC SEQUENCE RUNTIME (WU29) — the hero's own act machine.
 * Never imported by a laboratory route: this is the ONE runtime path on the
 * public pages, imported only by `JoyanComingHero.astro`.
 *
 * The user's direction: the public page STARTS ON PURE BLACK — no scene, no
 * poster, no eyebrow — with only the terminal typing "Wake up, Neo…" (VT323,
 * bone text, amber prompt). The engine's own warp ramp then TRANSFORMS the
 * black into the unicorn scene (the same payload, grid, joyan-page palette and
 * stars/aurora/wash overlays the page always rendered), the terminal fades,
 * the literal fate line takes the tagline slot with its TERMINATOR 2 · SARAH
 * CONNOR credit, CORRUPTS through our dot-ramp glyphs and re-forms into the
 * watcher line, which is where it stays.
 *
 * THE ONLY RENDERER IS THE ENGINE. Every painted pixel comes from
 * `renderFrame`/`rasterize` in `scripts/scene-src/engine.mjs`; the reveal is
 * the shared warp ramp (`scripts/scene-src/sequence-warp.mjs`, states 0..steps)
 * — the SAME module the laboratory and the checkers read. The ramp goes UP to
 * bring the scene in and back DOWN to 0, so the settled state rasterises
 * byte-identical to the composition the page has always shown (checker-proven).
 *
 * The black start is a JS-GATED STATE, the WU28 lesson applied at section
 * level: an inline script in the hero sets `data-sequence-boot="js"` BEFORE
 * first paint, and the scoped CSS shows the black act-1 state only under that
 * attribute. Without scripting the attribute never appears and the server
 * markup IS the final state (poster, eyebrow, name, watcher line) — never
 * black. Reduced motion skips the intro and the scramble entirely (and the
 * boot CSS shows the final state under `prefers-reduced-motion` too, so even
 * the pre-mount frame is truthful).
 *
 * The corruption uses OUR glyph language: characters scramble through the dot
 * ramp (`·`, `•`, `●`) in the page's own tones (plomo, bone, amber) — never
 * random unicode noise.
 *
 * Behaviour, all observable: one rAF loop at the engine's own fps cadence
 * drives the phases AND the scene; pauses offscreen and in hidden tabs;
 * pagehide releases everything; reduced motion never animates.
 */
import { DELIVERY_CELL, rasterize, renderFrame } from '../../scripts/scene-src/engine.mjs';
import { WARP_RAMP, rampBurst, sequenceScene, sequenceWarpScene } from '../../scripts/scene-src/sequence-warp.mjs';

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
/** Hold after the typing completes before the reveal takes over. WU31: the
 * whole arc must sit inside 7–9 s (the user measured ~16 s and called the
 * pacing wrong); every constant below is summed by the checker. */
const TYPE_HOLD_MS = 600;
/** Full-warp hold at the top of the reveal before the ramp settles back. */
const FULL_HOLD_MS = 350;
/** The settle: the ramp returns to 0 so the final scene is exactly today's. */
const SETTLE_MS = 1200;
/** How long the fate line holds before the corruption begins. */
const FATE_HOLD_MS = 1900;
/** The corruption duration. */
const SCRAMBLE_MS = 860;
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

type Phase = 'typing' | 'revealUp' | 'full' | 'revealDown' | 'fate' | 'scramble' | 'final';

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
  // WU31 — the name is captured BEFORE any assembly touches it; the h1 keeps
  // a stable accessible name through aria-label, so the screen reader never
  // sees the dot-ramp glyphs.
  const nameText = (nameEl.textContent ?? '').trim();
  const fateText = tagline.dataset.heroFate ?? tagline.textContent ?? '';
  const watcherText = tagline.dataset.heroWatcher ?? tagline.textContent ?? '';

  // One scene object per ramp state (0..steps); state 0 IS the base scene.
  // WU31 — the burst is a property of the STATE (rampBurst), so the cache key
  // stays the state number and the live canvas derives the same scene the
  // Node checkers do.
  const rampScenes = new Map<number, Scene>();
  const sceneForState = (state: number): Scene => {
    const cached = rampScenes.get(state);
    if (cached) return cached;
    const built = state <= 0
      ? sequenceScene(payload)
      : sequenceWarpScene(payload, Math.min(1, state / WARP_RAMP.steps), rampBurst(state));
    rampScenes.set(state, built);
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
    if (next === 'final' || next === 'revealDown' || next === 'fate' || next === 'scramble') {
      terminal.classList.add('hero-terminal-departed');
    } else {
      terminal.classList.remove('hero-terminal-departed');
    }
    // The credit rides with the fate line and leaves with it.
    credit.classList.toggle('hero-credit-on', next === 'fate' || next === 'scramble');
    updateStatus();
  };

  const updateStatus = (): void => {
    status.textContent = reduced() ? 'Static poster · reduced motion'
      : !visible || document.hidden ? 'Paused · outside viewport or hidden'
        : phase === 'typing' ? 'Act 1 · the terminal on black · click, tap or press any key to skip'
          : phase === 'revealUp' || phase === 'full' ? 'The reveal · the engine warp bringing the scene in'
            : phase === 'revealDown' ? 'The reveal settling · the scene you know'
              : phase === 'fate' ? 'The fate line · TERMINATOR 2 · SARAH CONNOR'
                : phase === 'scramble' ? 'The corruption · the line re-forms'
                  : 'Our engine · the scene, at rest';
  };

  const paint = (bucket: number): void => {
    const scene = sceneForState(bucket);
    const rendered = renderFrame(scene, frame, { dither: 'bayer4', density: 1 });
    rasterize(rendered, scene, cell, image.data);
    context.putImageData(image, 0, 0);
    host.dataset.heroFrame = String(rendered.frame);
    host.dataset.heroBucket = String(bucket);
  };

  /** WU32 — the DECODE: one function for the tagline arc AND the name
   * assembly, so the name and the lines share one language. Each character
   * resolves on its own clock (charDeadline); unresolved characters cycle
   * through the dot-ramp glyphs in the accent colour; resolved characters
   * keep the base tone. The box is pinned before the first span, released on
   * completion — the line never jumps. */
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
      if (phaseMs > terminalText.length * TYPE_STEP_MS + TYPE_HOLD_MS) setPhase('revealUp');
      paint(0);
    } else if (phase === 'revealUp') {
      const p = Math.min(1, phaseMs / WARP_RAMP.durationMs);
      const bucket = Math.round(p * WARP_RAMP.steps);
      sceneLayer.style.opacity = String(bucket / WARP_RAMP.steps);
      paint(bucket);
      if (p >= 1) {
        releaseBox(nameEl);
        nameEl.dataset.decoded = '';
        nameEl.textContent = nameText;
        setPhase('full');
      } else {
        renderDecode(nameEl, nameText, p, 31);
      }
    } else if (phase === 'full') {
      sceneLayer.style.opacity = '1';
      paint(WARP_RAMP.steps);
      if (phaseMs >= FULL_HOLD_MS) setPhase('revealDown');
    } else if (phase === 'revealDown') {
      const p = Math.min(1, phaseMs / SETTLE_MS);
      const bucket = Math.round((1 - p) * WARP_RAMP.steps);
      paint(bucket);
      if (p >= 1) {
        sceneLayer.style.opacity = '1';
        // The fate line takes the tagline slot with its credit.
        tagline.dataset.decoded = '';
        tagline.textContent = fateText;
        setPhase('fate');
      }
    } else if (phase === 'fate') {
      paint(0);
      if (phaseMs >= FATE_HOLD_MS) setPhase('scramble');
    } else if (phase === 'scramble') {
      renderScramble(Math.min(1, phaseMs / SCRAMBLE_MS));
      paint(0);
      if (phaseMs >= SCRAMBLE_MS) {
        releaseBox(tagline);
        tagline.dataset.decoded = '';
        tagline.textContent = watcherText;
        setPhase('final');
      }
    } else {
      paint(0);
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
    releaseBox(nameEl);
    tagline.dataset.decoded = '';
    tagline.textContent = watcherText;
    typed.textContent = terminalText;
    nameEl.dataset.decoded = '';
    nameEl.textContent = nameText;
    phase = 'final';
    host.dataset.sequencePhase = 'final';
    updateStatus();
  };
  // WU31 — the invisible skip: click, tap or keypress jumps to the final
  // state. No visible control is added (the language pair stays the only
  // visible control); Tab and modifier chords are left to the browser.
  const onSkip = (event: Event): void => {
    if (reduced() || phase === 'final') return;
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
    host.setAttribute('data-playing', '');
    poster.hidden = true;
    paint(0);
    frame = 1;
  }
  host.setAttribute('data-ready', '');
  observer.observe(canvas);
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
