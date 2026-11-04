/**
 * Isometric study, in Joyan's language and through OUR pipeline.
 *
 * The question is not "can we draw isometric" — any SVG can. The question is
 * whether an isometric figure survives being measured as ink and re-drawn as
 * dots by the engine, because that is the only way it can live next to the
 * hero without becoming a second illustration language.
 *
 * Writes: iso-line.svg (the authored figure), iso-dots.png (the engine's own
 * raster of it), iso-dots.svg is not produced on purpose — the dots are the
 * engine's job, never a hand tracing.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { convert } from '../../../scripts/scene-src/from-image.mjs';
import { applyTreatment } from '../../../scripts/scene-src/overlays.mjs';
import { IMAGE_PALETTES } from '../../../scripts/scene-src/image-pipeline.mjs';
import { renderFrame, rasterize, DELIVERY_CELL } from '../../../scripts/scene-src/engine.mjs';

const DIR = resolve(new URL('.', import.meta.url).pathname);
await mkdir(DIR, { recursive: true });

const W = 1200, H = 800;
const COS = Math.cos(Math.PI / 6), SIN = 0.5;
const project = (x, y, z) => [W / 2 + (x - y) * COS, H / 2 + (x + y) * SIN - z];

/** A plate is a rhombus: four corners projected at a height. */
function plate(cx, cy, z, size, fill, stroke, opacity = 1) {
  const corners = [[-size, -size], [size, -size], [size, size], [-size, size]]
    .map(([dx, dy]) => project(cx + dx, cy + dy, z));
  const d = corners.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ') + ' Z';
  return `<path d="${d}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="1.6"/>`;
}

/** Vertical edges joining two plates, so the stack reads as a volume. */
function edges(cx, cy, zLow, zHigh, size, stroke) {
  return [[-size, -size], [size, -size], [size, size], [-size, size]].map(([dx, dy]) => {
    const [x1, y1] = project(cx + dx, cy + dy, zHigh);
    const [x2, y2] = project(cx + dx, cy + dy, zLow);
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${stroke}" stroke-width="1.2" stroke-opacity=".55"/>`;
  }).join('');
}

/** The three layers: inferencia, trazabilidad, seguridad — as three strata. */
const layers = [
  { z: 0, size: 250, label: 'seguridad' },
  { z: 105, size: 195, label: 'trazabilidad' },
  { z: 210, size: 140, label: 'inferencia' },
];

// The pipeline's contract: source art is INK ON LIGHT. A dark-ground render is
// not a valid input — the measurement reads "ink" everywhere and the engine
// returns an inverted field (the first attempt proved it).
const BG = '#FFFFFF', EDGE = '#1B1B1B', PLATE = '#E8E8E8', TOP = '#F6F6F4', ACCENT = '#141414';

const dots = [];
for (let i = 0; i < 26; i++) {
  const t = i / 25;
  const [x, y] = project(140 - 280 * t, 140, 210 + 46 * Math.sin(t * Math.PI));
  dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2.2 + 1.6 * Math.sin(t * Math.PI)).toFixed(2)}" fill="${ACCENT}"/>`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${edges(0, 0, 0, 210, 250, EDGE)}
  ${layers.map((l) => plate(0, 0, l.z, l.size, l === layers[2] ? TOP : PLATE, EDGE, l === layers[2] ? 0.92 : 1)).join('\n  ')}
  ${dots.join('\n  ')}
</svg>\n`;
await writeFile(resolve(DIR, 'iso-line.svg'), svg);

/* The engine measures it as ink and draws it as dots. */
const scene = await convert(svg, {
  cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink',
  id: 'joyan-iso-study', label: 'estudio isométrico — tres estratos',
});
const treated = applyTreatment(scene.scene, { palette: 'joyan-marea', overlays: [] }, IMAGE_PALETTES);
const frame = renderFrame(treated, treated.posterFrame, { dither: 'bayer4', density: 1 });
const rgba = rasterize(frame, treated, DELIVERY_CELL);
await sharp(Buffer.from(rgba), { raw: { width: frame.cols * DELIVERY_CELL, height: frame.rows * DELIVERY_CELL, channels: 4 } })
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toFile(resolve(DIR, 'iso-dots.png'));

console.log('iso-line.svg y iso-dots.png escritos');
