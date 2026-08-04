#!/usr/bin/env node
/**
 * generate-dither.mjs — pre-baked ordered-dither brand assets (ADR-1)
 *
 * Source art (P3.2): there are no real hardware photos yet, so every source is
 * procedural brand art committed under scripts/dither-src/:
 *   - hero-network.svg    abstract agent-network: nodes + PCB-style traces
 *   - hardware-board.svg  conceptual PCB: IC package, pins, traces, vias
 *   - wordmark.svg        "JOYAN" wordmark, composited onto the OG texture
 * No stock photos, no logos, no UI mockups (design.md — File Changes).
 *
 * Pipeline: SVG source -> grayscale -> resize -> normalize -> raw buffer ->
 * Bayer 8x8 ordered dither in JS -> 2-color palette PNG (ink-950 / bone-50)
 * via sharp. The OG asset additionally composites the wordmark SVG over the
 * dithered texture.
 *
 * Budgets (bytes): hero 1600x900 <= 80 KB, hardware 1024x1024 <= 60 KB,
 * og-default 1200x628 <= 100 KB. Prints every output size and exits 1 when
 * any asset exceeds its budget.
 */
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** --color-ink-950 and --color-bone-50 from the visual token system. */
const INK = [11, 11, 12];
const BONE = [244, 242, 237];

/** Standard 8x8 Bayer matrix (ordered-dither thresholds 0..63). */
const BAYER_8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

const ASSETS = [
  {
    name: 'hero-dither.png',
    out: 'public/assets/dither/hero-dither.png',
    src: 'scripts/dither-src/hero-network.svg',
    width: 1600,
    height: 900,
    maxBytes: 80 * 1024,
    darkBias: 12,
  },
  {
    name: 'hardware-dither.png',
    out: 'public/assets/dither/hardware-dither.png',
    src: 'scripts/dither-src/hardware-board.svg',
    width: 1024,
    height: 1024,
    maxBytes: 60 * 1024,
    darkBias: 16,
  },
  {
    name: 'og-default.png',
    out: 'public/assets/brand/og-default.png',
    src: 'scripts/dither-src/hardware-board.svg',
    width: 1200,
    height: 628,
    maxBytes: 100 * 1024,
    darkBias: 14,
    fit: 'cover',
    overlay: 'scripts/dither-src/wordmark.svg',
  },
];

/** Ordered-dither threshold for pixel (x, y), biased toward ink. */
function thresholdAt(x, y, darkBias) {
  return ((BAYER_8[y & 7][x & 7] + 0.5) / 64) * 255 + darkBias;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function renderAsset(config) {
  // 1-3. grayscale -> resize -> normalize, then read raw single-channel pixels
  const { data, info } = await sharp(join(ROOT, config.src))
    .grayscale()
    .resize(config.width, config.height, { fit: config.fit ?? 'fill' })
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== config.width || info.height !== config.height) {
    throw new Error(`${config.name}: expected ${config.width}x${config.height}, got ${info.width}x${info.height}`);
  }

  // 4. Bayer 8x8 ordered dither in JS -> binary 0/255
  const pixels = new Uint8Array(config.width * config.height);
  for (let y = 0; y < config.height; y++) {
    const row = y * config.width;
    for (let x = 0; x < config.width; x++) {
      const i = row + x;
      pixels[i] = data[i] > thresholdAt(x, y, config.darkBias) ? 255 : 0;
    }
  }

  // 5. Map binary -> ink/bone RGB and encode as a 2-color palette PNG
  const rgb = Buffer.alloc(config.width * config.height * 3);
  for (let i = 0; i < pixels.length; i++) {
    const color = pixels[i] === 255 ? BONE : INK;
    rgb[i * 3] = color[0];
    rgb[i * 3 + 1] = color[1];
    rgb[i * 3 + 2] = color[2];
  }

  const outPath = join(ROOT, config.out);
  await mkdir(dirname(outPath), { recursive: true });

  // Overlay: composite the wordmark at pixel level so the output keeps the
  // exact 2-color palette (ink-950 / bone-50) — antialiased text pixels with
  // alpha >= 128 become bone, everything else stays the dithered texture.
  if (config.overlay) {
    const overlay = await sharp(join(ROOT, config.overlay))
      .resize(config.width, config.height, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer();
    for (let i = 0; i < pixels.length; i++) {
      if (overlay[i * 4 + 3] >= 128) {
        rgb[i * 3] = BONE[0];
        rgb[i * 3 + 1] = BONE[1];
        rgb[i * 3 + 2] = BONE[2];
      }
    }
  }

  let image = sharp(rgb, { raw: { width: config.width, height: config.height, channels: 3 } });
  await image.png({ palette: true, colours: 2, quality: 100 }).toFile(outPath);

  const { size } = await stat(outPath);
  const withinBudget = size <= config.maxBytes;
  console.log(
    `${withinBudget ? 'PASS' : 'FAIL'} ${config.name}: ${formatBytes(size)} / ${formatBytes(config.maxBytes)} (${config.width}x${config.height})`
  );
  return withinBudget;
}

let allWithinBudget = true;
for (const config of ASSETS) {
  allWithinBudget = (await renderAsset(config)) && allWithinBudget;
}
console.log(
  `\nGenerated ${ASSETS.length} asset(s) — ${allWithinBudget ? 'all within budget' : 'AT LEAST ONE OVER BUDGET'}`
);
process.exit(allWithinBudget ? 0 : 1);
