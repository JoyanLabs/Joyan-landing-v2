/**
 * MAGI canvas overlay runtime (docs/DESIGN.md — Motion guide).
 *
 * Scoped browser-side controller for the decorative particle overlay in
 * MagiParticleCanvas.astro. Kept in its own internal module so the component
 * stays a slim composition of markup plus this one import; Astro bundles it
 * with the network model into the same self-contained inline module the
 * deterministic checkers execute.
 *
 * Motion contract: one 30fps loop capped at devicePixelRatio 2, paused
 * offscreen or hidden and on pagehide, resumed on re-entry or pageshow, torn
 * down on Astro view swaps. Low-end devices use the bounded 24-particle
 * fallback. Reduced motion and missing Canvas support keep the static SVG
 * renderer — the overlay is progressive enhancement.
 */

import {
  MAGI_NETWORK,
  MAGI_FALLBACK_PARTICLES,
  createMagiGlowSprite,
  drawMagiBoneReference,
} from '~/lib/magi-network';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let stopCurrent: (() => void) | null = null;

function stop(): void {
  if (stopCurrent) {
    stopCurrent();
    stopCurrent = null;
  }
}

function start(): void {
  stop();
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-magi-particles]');
  if (!canvas || window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  stopCurrent = run(canvas, ctx);
}

function run(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): () => void {
  const maxDpr = Number(canvas.getAttribute('data-max-dpr')) || 2;
  const fps = Number(canvas.getAttribute('data-fps')) || 30;
  const frameMs = 1000 / fps;
  const activeStatus = canvas.getAttribute('data-active-status');
  const status = document.querySelector('[data-magi-status]');
  // Low-end devices (<= 4 logical cores) use the bounded 24-particle set.
  const lowEnd =
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency <= 4;
  const particles = lowEnd ? MAGI_FALLBACK_PARTICLES : MAGI_NETWORK.particles;
  const progress = particles.map((particle) => particle.progress);
  const parallax = { x: 0, y: 0 };
  const glow = createMagiGlowSprite(ctx);
  let rafId = 0;
  let lastTime = 0;
  let running = false;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (dt: number) => {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.save();
    ctx.scale(canvas.clientWidth / MAGI_NETWORK.width, canvas.clientHeight / MAGI_NETWORK.height);
    drawMagiBoneReference(ctx);
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      progress[i] = (progress[i] + particle.speed * dt) % 1;
      const edge = MAGI_NETWORK.edges[particle.edge];
      const from = MAGI_NETWORK.nodes[edge.from];
      const to = MAGI_NETWORK.nodes[edge.to];
      // Depth scales the pointer parallax offset (max +-8 grid units).
      const x = from.x + (to.x - from.x) * progress[i] + particle.depth * parallax.x;
      const y = from.y + (to.y - from.y) * progress[i] + particle.depth * parallax.y;
      const dx = (to.x - from.x) * particle.speed * 0.45;
      const dy = (to.y - from.y) * particle.speed * 0.45;
      ctx.strokeStyle = '#FFB000';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.35 * particle.opacity;
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (glow) {
        // radial-sprite head: cheap drawImage, never shadowBlur
        ctx.globalAlpha = particle.opacity;
        const size = particle.radius * 6;
        ctx.drawImage(glow, x - size / 2, y - size / 2, size, size);
      } else {
        ctx.fillStyle = '#FFB000';
        ctx.globalAlpha = particle.opacity;
        ctx.beginPath();
        ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  const tick = (now: number) => {
    if (!running) return;
    if (lastTime === 0) lastTime = now;
    const elapsed = now - lastTime;
    if (elapsed >= frameMs) {
      lastTime = now;
      draw(Math.min(elapsed / 1000, 0.1));
    }
    rafId = requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (running) return;
    running = true;
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
    if (status && activeStatus) status.textContent = activeStatus;
  };

  const stopLoop = () => {
    running = false;
    cancelAnimationFrame(rafId);
  };

  const onVisibilityChange = () => {
    if (document.hidden) stopLoop();
    else startLoop();
  };
  const onPageHide = () => stopLoop();
  const onPageShow = () => {
    if (!document.hidden) startLoop();
  };
  const onResize = () => resize();
  // Pointer-capable parallax only: bounded layer offsets, reset on leave.
  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    parallax.x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
    parallax.y = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
  };
  const onPointerLeave = () => {
    parallax.x = 0;
    parallax.y = 0;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) startLoop();
        else stopLoop();
      }
    },
    { threshold: 0 }
  );

  resize();
  observer.observe(canvas);
  window.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerleave', onPointerLeave);

  return () => {
    stopLoop();
    observer.disconnect();
    window.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);
  };
}

// Astro view-transition lifecycle: boot on every page load and tear down
// before the DOM swap so the loop never survives into the next page.
document.addEventListener('astro:page-load', start);
document.addEventListener('astro:before-swap', stop);
start();
