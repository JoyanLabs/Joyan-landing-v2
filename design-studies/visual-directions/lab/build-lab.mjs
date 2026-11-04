/**
 * Engine lab payloads: the serialised scenes the browser will render.
 *
 * The browser cannot run the image pipeline (it needs sharp), so the conversion
 * happens here, once, exactly like the real page's build step does. The lab then
 * imports the SAME engine module and renders those payloads live, which is the
 * only way a "what does the engine generate" page can be true.
 *
 * Outputs: lab/fold.json, lab/iso.json, lab/poster-fold.png
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { convert } from '../../../scripts/scene-src/from-image.mjs';
import { applyTreatment } from '../../../scripts/scene-src/overlays.mjs';
import { serializeScene, IMAGE_PALETTES } from '../../../scripts/scene-src/image-pipeline.mjs';
import { renderFrame, rasterize, DELIVERY_CELL } from '../../../scripts/scene-src/engine.mjs';

const LAB = resolve(new URL('.', import.meta.url).pathname);
await mkdir(LAB, { recursive: true });

const W = 1200, H = 760;

/* ---- 1 · the fold: our own art, smooth tones (ink on light) ---- */
function foldSvg() {
  const lobes = [];
  for (let i = 0; i < 2; i++) {
    const cx = 470 + i * 260;
    lobes.push(`<ellipse cx="${cx}" cy="380" rx="230" ry="300" fill="url(#g${i})" transform="rotate(${i ? 14 : -12} ${cx} 380)"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g0" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#2B2B2B"/><stop offset="55%" stop-color="#8A8A8A"/><stop offset="100%" stop-color="#FFFFFF"/>
    </radialGradient>
    <radialGradient id="g1" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#3A3A3A"/><stop offset="60%" stop-color="#9C9C9C"/><stop offset="100%" stop-color="#FFFFFF"/>
    </radialGradient>
    <linearGradient id="seam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFFFFF"/><stop offset="50%" stop-color="#101010"/><stop offset="100%" stop-color="#FFFFFF"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${lobes.join('\n  ')}
  <rect x="596" y="90" width="26" height="600" fill="url(#seam)" opacity=".85"/>
</svg>`;
}

/* ---- 2 · the isometric figure: three strata and a data path ---- */
const COS = Math.cos(Math.PI / 6), SIN = 0.5;
const project = (x, y, z) => [W / 2 + (x - y) * COS, H / 2 + (x + y) * SIN - z];
function plate(z, size, fill, stroke, width = 2.4) {
  const corners = [[-size, -size], [size, -size], [size, size], [-size, size]]
    .map(([dx, dy]) => project(dx, dy, z));
  return `<path d="${corners.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ')} Z" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
}
function isoDots() {
  const out = [];
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const [x, y] = project(150 - 300 * t, 150, 210 + 40 * Math.sin(t * Math.PI));
    out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(6 + 5 * Math.sin(t * Math.PI)).toFixed(2)}" fill="#111111"/>`);
  }
  return out.join('\n  ');
}
const iso = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${[[0, 250, '#EDEDED'], [105, 195, '#DFDFDF'], [210, 140, '#F7F7F5']]
    .map(([z, size, fill]) => plate(z, size, fill, '#1B1B1B')).join('\n  ')}
  ${isoDots()}
</svg>`;

async function payload(svg, id, overlays) {
  const scene = await convert(svg, { cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink', id, label: id });
  const treated = applyTreatment(scene.scene, { palette: 'joyan-marea', overlays }, IMAGE_PALETTES);
  return treated;
}

const fold = await payload(foldSvg(), 'lab-fold', ['stars', 'vignette']);
const isoScene = await payload(iso, 'lab-iso', []);

await writeFile(resolve(LAB, 'fold.json'), JSON.stringify(serializeScene(fold)));
await writeFile(resolve(LAB, 'iso.json'), JSON.stringify(serializeScene(isoScene)));

for (const [scene, name] of [[fold, 'poster-fold.png'], [isoScene, 'poster-iso.png']]) {
  const frame = renderFrame(scene, scene.posterFrame, { dither: 'bayer4', density: 1 });
  const rgba = rasterize(frame, scene, DELIVERY_CELL);
  await sharp(Buffer.from(rgba), { raw: { width: frame.cols * DELIVERY_CELL, height: frame.rows * DELIVERY_CELL, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(resolve(LAB, name));
}

console.log('lab payloads: fold.json, iso.json, poster-fold.png, poster-iso.png');
console.log('frames disponibles:', fold.frames.length, '/', isoScene.frames.length);
