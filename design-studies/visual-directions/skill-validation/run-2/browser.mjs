import { rasterize } from '../../../../scripts/scene-src/engine.mjs';
import { CELL, renderConfine, scene } from './scene.mjs';

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const pixels = new ImageData(scene.cols * CELL, scene.rows * CELL);
const draw = (index) => {
  rasterize(renderConfine(index), scene, CELL, pixels.data);
  context.putImageData(pixels, 0, 0);
};
const verification = new URL(location.href).searchParams.has('verify');

if (verification) {
  const start = performance.now();
  draw(0);
  const coldMs = performance.now() - start;
  for (let index = 0; index < 60; index++) draw(index);
  const samples = [];
  for (let index = 0; index < 240; index++) {
    const start = performance.now();
    draw((index * 3) % scene.cycleFrames);
    samples.push(performance.now() - start);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.ceil(sorted.length * p) - 1];
  window.studyCost = {
    scope: 'renderFrame + rasterize + putImageData; 60 warmup frames; 240 dynamic samples',
    samples: samples.length, coldMs, medianMs: percentile(0.5), p90Ms: percentile(0.9),
    meanMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    p95Ms: percentile(0.95), worstMs: sorted.at(-1),
  };
  window.studyCost.status = window.studyCost.medianMs <= 16.67 && window.studyCost.p90Ms <= 16.67
    ? 'PASS' : 'FAIL';
}

draw(0);
const hash = await crypto.subtle.digest('SHA-256', pixels.data);
document.documentElement.dataset.hash = [...new Uint8Array(hash)]
  .map((byte) => byte.toString(16).padStart(2, '0')).join('');
document.documentElement.dataset.frame = '0';
document.documentElement.dataset.state = 'ready';

if (!verification && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const start = performance.now();
  function animate(now) {
    // Wall time in seconds: missed paints skip frame indices, never stretch T.
    const seconds = (now - start) / 1000;
    draw(Math.floor(seconds * scene.fps));
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
