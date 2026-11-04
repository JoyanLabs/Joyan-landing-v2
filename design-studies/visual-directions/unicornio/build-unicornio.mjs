/**
 * The three reference SVGs, through OUR pipeline, on both grounds, with layers.
 * Inputs stay outside the repo; only the derived PNGs and the page are written.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { convert } from '../../../scripts/scene-src/from-image.mjs';
import { applyTreatment } from '../../../scripts/scene-src/overlays.mjs';
import { IMAGE_PALETTES } from '../../../scripts/scene-src/image-pipeline.mjs';
import { renderFrame, rasterize, DELIVERY_CELL } from '../../../scripts/scene-src/engine.mjs';

const DIR = resolve(new URL('.', import.meta.url).pathname);
await mkdir(DIR, { recursive: true });
const SRC = '/home/joshrm/Descargas';

const SUBJECTS = [
  { id: 'linea', file: 'blade-runner-unicorn-line.svg', label: 'línea' },
  { id: 'linea-transp', file: 'blade-runner-unicorn-line-transparent.svg', label: 'línea, fondo transparente' },
  { id: 'solido', file: 'blade-runner-unicorn-solid.svg', label: 'sólido' },
];

const TREATMENTS = [
  { id: 'oscuro', ground: 'dark', palette: 'joyan-marea', overlays: ['stars', 'wash', 'vignette'], label: 'oscuro · con capas' },
  // The pipeline's 'paper' palette already runs cream → ink, so the ladder is
  // used as-is. Forcing 'light' here double-inverted the field and inked everything.
  { id: 'papel', ground: 'dark', palette: 'paper', overlays: ['wash'], label: 'papel · lavado' },
];

const cards = [];
for (const subject of SUBJECTS) {
  // The source SVGs have a TRANSPARENT background, and the ink measurement reads
  // transparency as ink — which inked the whole frame. Flatten onto white first,
  // so "nothing drawn" measures as zero ink instead of as a full field.
  const raw = await readFile(resolve(SRC, subject.file), 'utf8');
  const svg = raw.replace(/<svg([^>]*)>/, (m, attrs) =>
    `<svg${attrs}><rect x="0" y="0" width="100%" height="100%" fill="#FFFFFF"/>`);
  for (const t of TREATMENTS) {
    const scene = await convert(svg, {
      cols: 240, rows: 135, mode: 'ink', colorMode: 'levels', palette: 'ink',
      id: `uni-${subject.id}-${t.id}`, label: subject.label,
    });
    const treated = applyTreatment(scene.scene, { palette: t.palette, overlays: t.overlays }, IMAGE_PALETTES);
    // WU108: the engine no longer inverts; every treatment here is dark-ground,
    // so the option is gone instead of looking like it still does something.
    const frame = renderFrame(treated, treated.posterFrame, { dither: 'bayer4', density: 1 });
    const rgba = rasterize(frame, treated, DELIVERY_CELL);
    const name = `${subject.id}-${t.id}.png`;
    await sharp(Buffer.from(rgba), { raw: { width: frame.cols * DELIVERY_CELL, height: frame.rows * DELIVERY_CELL, channels: 4 } })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toFile(resolve(DIR, name));
    cards.push({ subjectId: subject.id, label: subject.label, treatmentId: t.id, treatmentLabel: t.label, name, file: name });
  }
}

await writeFile(resolve(DIR, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Joyan — tres referencias, dos suelos</title><link rel="stylesheet" href="unicornio.css"></head>
<body>
<header><p class="label">ESTUDIO 11 · REFERENCIAS DEL USUARIO</p>
<h1>Tres dibujos.<br>Dos suelos.<br>Un mismo motor.</h1>
<p class="lede">Las tres versiones del unicornio pasadas por el pipeline (medición de tinta, paleta Marea mineral) y renderizadas con capas del motor: estrellas, lavado, viñeta en oscuro; grano y lavado en papel.</p>
<p class="nota">Los archivos de origen quedan fuera del repositorio: acá sólo vive el derivado.</p></header>
<main>
${cards.map((c) => `<figure class="card"><img src="${c.name}" alt="${c.label} sobre ${c.treatmentLabel}"><figcaption><strong>${c.label}</strong><span>${c.treatmentLabel}</span></figcaption></figure>`).join('\n')}
</main>
<footer><p class="label">Lectura: el trazo de línea sobrevive mejor al dither que el sólido, porque la tinta ya está repartida.</p></footer>
</body></html>
`);

await writeFile(resolve(DIR, 'unicornio.css'), `*{box-sizing:border-box}body{margin:0;background:#E8E5DF;color:#15191A;font:16px/1.7 Arial,sans-serif}
header{padding:32px 4vw 8px}h1{font-size:clamp(26px,3.4vw,44px);line-height:1.1;letter-spacing:-.03em;margin:14px 0 12px}
.lede,.nota{max-width:64ch;color:#4B5658;font-size:14px}.nota{margin-top:8px;font-size:12px}
.label{font:10px/1.7 ui-monospace,Menlo,monospace;letter-spacing:.11em;color:#1C6B61}
main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:20px 4vw 40px}
.card{margin:0}img{display:block;width:100%;height:auto;background:#10191C}
figcaption{display:flex;justify-content:space-between;gap:10px;padding-top:7px;font-size:12px;color:#4B5658}
figcaption strong{color:#15191A}
footer{padding:0 4vw 40px}
@media(max-width:900px){main{grid-template-columns:1fr 1fr}}
@media(max-width:600px){main{grid-template-columns:1fr}}
`);
console.log('derivados:', cards.map((c) => c.name).join(', '));
