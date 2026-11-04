#!/usr/bin/env node
/**
 * WU30 — browser-free, SOLE final OG writer (ADR-1 kept).
 * ============================================================================
 * `public/assets/brand/og-default.png` (1200x628) is the card people see when a
 * Joyan link is shared, so it now matches what the site actually is: the
 * dot-scene hero over the page palette, the `Joyan` wordmark in Michroma and one
 * supporting line.
 *
 * THE GROUND IS THE PAGE'S OWN COMPOSITION. This command runs the EXACT
 * conversion `src/pages/index.astro` runs — same `convert` call (160x80, ink
 * measurement, auto-gain, tone cap), same roll of +18 columns, same
 * `joyan-page` palette, same stars/aurora/wash/vignette overlays — and rasterises
 * the poster frame with the same engine (`scripts/scene-src/engine.mjs`) at the
 * page's 8 px delivery cell. The 1280x640 result is cropped by WHOLE CELLS
 * (5 columns and 1 row off each side) into the 1200x628 card with two 1-cell
 * ground bands, so every dot is an unclipped cell of the page's scene and no
 * resampling ever touches the mark. No browser, and none allowed.
 *
 * THE TEXT IS COMMITTED VECTOR OUTLINES (Michroma + JetBrains Mono, both OFL,
 * derived once by `scripts/motion-src/derive-outlines.py`). Nothing here depends
 * on a font being installed, so this stays portable — unlike the retired WU8
 * `<text>` wordmark, which needed fontconfig to resolve 'Archivo Variable'.
 *
 * THE COLOUR MODEL IS CLOSED. Every pixel the card paints is a blend between the
 * ground and ONE `joyan-page` entry: the dot field, the card's own scrim (the
 * page's `.scrim` gradient, whose colour IS the ground, so it only scales the
 * dots' coverage), the calm panel behind the text, and the text antialiasing.
 * The result is snapped to a fixed coverage ladder (`og-card.mjs`) so the whole
 * card fits a lossless 256-colour palette PNG and cannot drift off the palette.
 *
 * ENV:
 *   DITHER_OUT=<path>         write somewhere else (the checker's repeat-run
 *                             identity test; the committed asset is untouched)
 *   DITHER_BUDGET_SCALE=<n>   scale the byte budget only — never the pixels
 *                             (the checker's negative budget-gate control)
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { convert } from './scene-src/from-image.mjs';
import { applyTreatment } from './scene-src/overlays.mjs';
import {
  serializeScene, sceneFromSerialized, rollSerializedScene, PAGE_PALETTE_ID, IMAGE_PALETTES,
} from './scene-src/image-pipeline.mjs';
import { LOCAL_INPUTS } from './scene-src/local-inputs.mjs';
import { renderFrame, rasterize } from './scene-src/engine.mjs';
import * as card from './motion-src/og-card.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.DITHER_OUT
  ? (isAbsolute(process.env.DITHER_OUT) ? process.env.DITHER_OUT : resolve(ROOT, process.env.DITHER_OUT))
  : join(ROOT, 'public/assets/brand/og-default.png');
const BUDGET_SCALE = Number(process.env.DITHER_BUDGET_SCALE ?? '1');
const MAX_BYTES = 100 * 1024;
const { width: W, height: H } = card.CARD;
const formatBytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

// ---------------------------------------------------------------------------
// 1. The page's scene, verbatim (src/pages/index.astro — WU22/WU32 recipe).
// ---------------------------------------------------------------------------
const palette = IMAGE_PALETTES.find((entry) => entry.id === PAGE_PALETTE_ID).palette;
const ground = card.hexToRgb(card.GROUND_HEX);
const fixture = join(ROOT, card.SCENE.fixture);
const hasFixture = existsSync(fixture);
const fallback = LOCAL_INPUTS.find((entry) => entry.id === card.SCENE.fallbackInputId)?.svg ?? '';
const converted = await convert(hasFixture ? fixture : fallback, {
  cols: card.SCENE.cols,
  rows: card.SCENE.rows,
  mode: 'ink',
  colorMode: 'levels',
  palette: 'ink',
  id: card.SCENE.id,
  label: hasFixture
    ? 'the coming-hero — based on the Blade Runner unicorn, design attributed to Tom Southwell (demonstration; attribution recorded in docs/MOTOR-ESCENAS.md)'
    : 'the Joyan mark — ring, two triangles, axis and dots',
});
const scene = applyTreatment(
  sceneFromSerialized(rollSerializedScene(serializeScene(converted.scene), card.SCENE.roll)),
  { palette: PAGE_PALETTE_ID, overlays: [...card.SCENE.overlays] },
  IMAGE_PALETTES,
);
const frame = renderFrame(scene, scene.posterFrame, { dither: 'bayer4', density: 1 });
const source = rasterize(frame, scene, card.CARD.cell);
const sourceWidth = frame.cols * card.CARD.cell;
const sourceHeight = frame.rows * card.CARD.cell;

// ---------------------------------------------------------------------------
// 2. The card's text layers, from the committed outlines.
// ---------------------------------------------------------------------------
const layers = card.LAYERS.map((layer) => {
  const svg = readFileSync(join(ROOT, layer.svg));
  const box = card.layerBox(svg.toString('utf8'), layer);
  return { layer, svg, box, ink: card.hexToRgb(card.INKS[layer.ink]) };
});
const panel = card.panelRect(layers.map((entry) => entry.box));
const masks = await Promise.all(layers.map(async (entry) => ({
  ...entry,
  alpha: (await sharp(entry.svg).resize(entry.box.width, entry.box.height, { fit: 'fill' })
    .ensureAlpha().raw().toBuffer()),
})));

// ---------------------------------------------------------------------------
// 3. Compose: crop + ground bands, the page's scrim, the calm panel, the text.
// ---------------------------------------------------------------------------
const rgb = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  const band = y < card.CARD.band || y >= card.CARD.band + card.CARD.crop.height;
  for (let x = 0; x < W; x++) {
    const at = (y * W + x) * 3;
    if (band) {
      rgb[at] = ground[0];
      rgb[at + 1] = ground[1];
      rgb[at + 2] = ground[2];
      continue;
    }
    const sy = card.CARD.crop.top + (y - card.CARD.band);
    const sx = card.CARD.crop.left + x;
    const from = (sy * sourceWidth + sx) * 4;
    // The page's scrim colour is the ground, so compositing it is exactly a
    // coverage scale; the calm panel does the same, harder, behind the text.
    const m = (1 - card.scrimAlpha(x, y)) * card.panelFactor(x, y, panel);
    rgb[at] = Math.round(ground[0] + (source[from] - ground[0]) * m);
    rgb[at + 1] = Math.round(ground[1] + (source[from + 1] - ground[1]) * m);
    rgb[at + 2] = Math.round(ground[2] + (source[from + 2] - ground[2]) * m);
  }
}
for (const { box, ink, alpha } of masks) {
  for (let py = 0; py < box.height; py++) {
    const y = box.y + py;
    if (y < 0 || y >= H) continue;
    for (let px = 0; px < box.width; px++) {
      const a = alpha[(py * box.width + px) * 4 + 3] / 255;
      if (a <= 0) continue;
      const x = box.x + px;
      if (x < 0 || x >= W) continue;
      const at = (y * W + x) * 3;
      for (let channel = 0; channel < 3; channel++) {
        rgb[at + channel] = Math.round(rgb[at + channel] + (ink[channel] - rgb[at + channel]) * a);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Snap onto the enumerated card palette (lossless 256-colour PNG).
// ---------------------------------------------------------------------------
const snap = card.makeSnapper(palette);
const paletteModel = card.cardPalette(palette);
const used = new Set();
for (let at = 0; at < rgb.length; at += 3) {
  const [r, g, b] = snap(rgb[at], rgb[at + 1], rgb[at + 2]);
  rgb[at] = r;
  rgb[at + 1] = g;
  rgb[at + 2] = b;
  used.add((r << 16) | (g << 8) | b);
}
assert.ok(used.size > 2, `expected a real dot scene, got ${used.size} colours`);
assert.ok(used.size <= 256, `the card must fit a lossless palette, got ${used.size} colours`);
for (const value of used) {
  assert.ok(paletteModel.has(card.rgbToHex([(value >> 16) & 255, (value >> 8) & 255, value & 255])),
    'every shipped colour must be an enumerated ground -> joyan-page-entry blend');
}

const png = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
  .png({ palette: true, colours: 256, quality: 100, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
assert.deepEqual(await sharp(png).removeAlpha().raw().toBuffer(), rgb, 'palette encoding changed OG pixels');

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, png);
const { size } = await stat(OUT);
const sha256 = createHash('sha256').update(png).digest('hex');
const withinBudget = size <= MAX_BYTES * BUDGET_SCALE;
const relative = OUT.startsWith(ROOT) ? OUT.slice(ROOT.length + 1) : OUT;
console.log(`${withinBudget ? 'PASS' : 'FAIL'} ${relative}: ${formatBytes(size)} / ${formatBytes(MAX_BYTES)} (${W}x${H}), ${used.size} colours, sha256 ${sha256}`);
console.log(`ground: ${hasFixture ? 'the page hero composition (rolled +18, joyan-page, stars/aurora/wash/vignette, 8 px cells)' : 'the fallback Joyan mark (hero fixture absent)'}`);
console.log(`text: committed outlines — Michroma wordmark + JetBrains Mono tagline/prompt, panel x${panel.x0}..${panel.x1} y${panel.y0}..${panel.y1}`);
console.log(`\nGenerated 1 asset(s) — ${withinBudget ? 'all within budget' : 'AT LEAST ONE OVER BUDGET'}`);
process.exit(withinBudget ? 0 : 1);
