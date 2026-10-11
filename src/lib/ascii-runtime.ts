/**
 * Lab-only ascii.rest controller. Never imported by a landing page.
 *
 * Two families share one controller:
 *  - `data-ascii-piece` hosts run the two comparison pieces (donut text, cup canvas).
 *  - `data-ascii-scene` hosts run the six coloured scene pieces, which draw dots
 *    (ramp `" ·•●"`) on a canvas with a palette, never ASCII glyph art.
 *
 * Every scene is a focused leaf import; the piece barrel, the catalogue `load`
 * helper and any remote asset are deliberately absent.
 */
import { mount, type Piece } from 'ascii.rest';
import donut, { meta as donutMeta } from 'ascii.rest/pieces/donut';
import cup, { meta as cupMeta } from 'ascii.rest/pieces/java';
// Default + named leaf imports, never `import * as`: a namespace import pulls in
// the bundler's shared namespace helper, which splits a shared chunk and mutates
// the byte-frozen landing chunks (measured WU14 RED).
import nightCoast, { meta as nightCoastMeta } from 'ascii.rest/pieces/night-coast';
import mistyForest, { meta as mistyForestMeta } from 'ascii.rest/pieces/misty-forest';
import desertNight, { meta as desertNightMeta } from 'ascii.rest/pieces/desert-night';
import auroraFjord, { meta as auroraFjordMeta } from 'ascii.rest/pieces/aurora-fjord';
import alpineDawn, { meta as alpineDawnMeta } from 'ascii.rest/pieces/alpine-dawn';
import oceanSunset, { meta as oceanSunsetMeta } from 'ascii.rest/pieces/ocean-sunset';

const PIECES: Record<string, Piece> = {
  donut: { default: donut, meta: donutMeta },
  java: { default: cup, meta: cupMeta },
};
const SCENES: Record<string, Piece> = {
  'night-coast': { default: nightCoast, meta: nightCoastMeta },
  'misty-forest': { default: mistyForest, meta: mistyForestMeta },
  'desert-night': { default: desertNight, meta: desertNightMeta },
  'aurora-fjord': { default: auroraFjord, meta: auroraFjordMeta },
  'alpine-dawn': { default: alpineDawn, meta: alpineDawnMeta },
  'ocean-sunset': { default: oceanSunset, meta: oceanSunsetMeta },
};
const REDUCED = '(prefers-reduced-motion: reduce)';
const HOSTS = '[data-ascii-piece], [data-ascii-scene]';
const LAB_FPS = 12;
let release: (() => void) | undefined;

function pieceFor(host: HTMLElement): { piece: Piece; name: string } | undefined {
  const piece = host.dataset.asciiPiece;
  if (piece && piece in PIECES) return { piece: PIECES[piece], name: piece };
  const scene = host.dataset.asciiScene;
  if (scene && scene in SCENES) return { piece: SCENES[scene], name: scene };
  return undefined;
}

function initialize(): void {
  release?.();
  const hosts = document.querySelectorAll<HTMLElement>(HOSTS);
  if (!hosts.length) return;
  const cleanups: Array<() => void> = [];
  const preference = matchMedia(REDUCED);
  for (const host of hosts) {
    const entry = pieceFor(host);
    if (!entry) continue;
    const output = host.querySelector<HTMLElement>('[data-ascii-output]');
    const button = host.querySelector<HTMLButtonElement>('button');
    const status = host.querySelector<HTMLElement>('[data-ascii-status]');
    if (!output || !button || !status) continue;
    const { piece, name } = entry;
    let paused = false;
    let visible = false;
    let stop: (() => void) | undefined;
    const updateStatus = () => {
      button.disabled = preference.matches;
      button.setAttribute('aria-pressed', String(!paused && !preference.matches));
      button.textContent = `${paused || preference.matches ? 'Play' : 'Pause'} ${name}`;
      status.textContent = preference.matches ? 'Static frame · reduced motion'
        : paused ? 'Paused by you' : !visible || document.hidden ? 'Paused · outside viewport or hidden'
          : `Live library frame · ${LAB_FPS} fps`;
    };
    const render = () => {
      stop?.();
      // A zero-fps mount draws a genuine still. Remounting on Play restarts
      // the piece's timeline; the public API exposes stop, not seek/resume.
      // `motion` is never passed, so the library keeps its reduced-motion still.
      stop = mount(output, piece, { fps: paused || preference.matches ? 0 : LAB_FPS });
      host.setAttribute('data-ready', '');
      updateStatus();
    };
    const toggle = () => {
      paused = !paused;
      if (paused) {
        stop?.();
        stop = undefined;
        updateStatus();
      } else render();
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries[entries.length - 1].isIntersecting;
      updateStatus();
    });
    observer.observe(output);
    button.addEventListener('click', toggle);
    preference.addEventListener('change', render);
    document.addEventListener('visibilitychange', updateStatus);
    try { render(); } catch {
      stop?.();
      host.removeAttribute('data-ready');
      button.disabled = true;
      status.textContent = 'Static fallback · runtime unavailable';
    }
    cleanups.push(() => {
      stop?.();
      stop = undefined;
      observer.disconnect();
      button.removeEventListener('click', toggle);
      preference.removeEventListener('change', render);
      document.removeEventListener('visibilitychange', updateStatus);
    });
  }
  // Same baked component as the landing. CSS hides its video for reduced
  // motion; this lab listener additionally guarantees actual native pause.
  const video = document.querySelector<HTMLVideoElement>('#dither-scene video');
  const syncVideo = () => {
    if (!video) return;
    if (preference.matches || document.hidden) video.pause();
    else void video.play().catch(() => { /* Native autoplay can be denied. */ });
  };
  preference.addEventListener('change', syncVideo);
  document.addEventListener('visibilitychange', syncVideo);
  syncVideo();
  cleanups.push(() => {
    video?.pause();
    preference.removeEventListener('change', syncVideo);
    document.removeEventListener('visibilitychange', syncVideo);
  });
  release = () => {
    for (const cleanup of cleanups) cleanup();
    release = undefined;
  };
}

// The shared ClientRouter already exists; do not create another router.
document.addEventListener('astro:page-load', initialize);
document.addEventListener('astro:before-swap', () => release?.());
window.addEventListener('pagehide', () => release?.());
window.addEventListener('pageshow', initialize);
initialize();
