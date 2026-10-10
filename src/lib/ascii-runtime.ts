/** Lab-only ascii.rest controller. Never imported by a landing page. */
import { mount } from 'ascii.rest';
import donut, { meta as donutMeta } from 'ascii.rest/pieces/donut';
import cup, { meta as cupMeta } from 'ascii.rest/pieces/java';

const PIECES = {
  donut: { default: donut, meta: donutMeta },
  java: { default: cup, meta: cupMeta },
} as const;
type PieceName = keyof typeof PIECES;
const REDUCED = '(prefers-reduced-motion: reduce)';
let release: (() => void) | undefined;

function initialize(): void {
  release?.();
  const hosts = document.querySelectorAll<HTMLElement>('[data-ascii-piece]');
  if (!hosts.length) return;
  const cleanups: Array<() => void> = [];
  const preference = matchMedia(REDUCED);
  for (const host of hosts) {
    const name = host.dataset.asciiPiece;
    if (!name || !(name in PIECES)) continue;
    const piece = PIECES[name as PieceName];
    const output = host.querySelector<HTMLElement>('[data-ascii-output]');
    const button = host.querySelector<HTMLButtonElement>('button');
    const status = host.querySelector<HTMLElement>('[data-ascii-status]');
    if (!output || !button || !status) continue;
    let paused = false;
    let visible = false;
    let stop: (() => void) | undefined;
    const updateStatus = () => {
      button.disabled = preference.matches;
      button.setAttribute('aria-pressed', String(!paused && !preference.matches));
      button.textContent = `${paused || preference.matches ? 'Play' : 'Pause'} ${name}`;
      status.textContent = preference.matches ? 'Static frame · reduced motion'
        : paused ? 'Paused by you' : !visible || document.hidden ? 'Paused · outside viewport or hidden'
          : 'Live library frame · 12 fps';
    };
    const render = () => {
      stop?.();
      // A zero-fps mount draws a genuine still. Remounting on Play restarts
      // the piece's timeline; the public API exposes stop, not seek/resume.
      stop = mount(output, piece, { fps: paused || preference.matches ? 0 : 12 });
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
