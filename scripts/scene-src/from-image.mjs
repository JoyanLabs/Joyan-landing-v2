#!/usr/bin/env node
/**
 * FROM IMAGE — decode + CLI for the WU18 image→dot-scene pipeline.
 * ============================================================================
 * This is the Node-only half of the pipeline. It owns the rasteriser (the local
 * `sharp`/librsvg, already installed for the motion toolchain — no new
 * dependency) and the command line. The browser-safe half, which the laboratory
 * page and the live runtime also import, is `image-pipeline.mjs`; it is kept free
 * of `sharp` on purpose, so the same conversion can travel to the canvas as data.
 *
 * FLAGS (all documented, all with defaults):
 *
 *   --in <path>            required; a local file path. A network URL is refused.
 *   --out <dir>            where PNG/JSON evidence is written (default: none, stdout only)
 *   --mode ink|luminance   measurement (default ink): line art vs photograph
 *   --color levels|rgb     field colour (default levels): quantised grey ladder vs the image's own colour
 *   --palette <id|extract> named IMAGE_PALETTES id, or `extract` (default ink)
 *   --palette-count <n>    entries when extracting (default 8)
 *   --cols <n> --rows <n>  requested grid (default 200x100, the project's grid)
 *   --margin <f>           reserved fraction each side (default 0.04)
 *   --dither <mode>        engine dither (default bayer4): bayer4|bayer8|blue|none
 *   --shape <id>           engine mask (default disc)
 *   --cell <px>            delivery pixels per cell for the PNG (default 8)
 *   --density <1|2|4>      grid stride for the PNG (default 1)
 *   --overlays <ids>       comma list of stars,aurora,grain,glimmer (default none)
 *   --prefilter pitch|none anti-moiré prefilter matched to the cell pitch (default pitch)
 *   --auto-gain auto|none  per-image normalisation for sparse inputs (default auto)
 *   --tone-cap auto|none   WU22 soft-knee tone cap over the gained levels (default auto)
 *   --png                  also write <id>-cell<N>.png into --out
 *
 * Usage: node scripts/scene-src/from-image.mjs --in <file> [flags]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import {
  AUTO_GAIN_RULE, DEFAULT_EXTRACT_COUNT, IMAGE_PALETTES, MEASURE_MODES, COLOR_MODES, PREFILTER_RULE,
  convertRgba, fitGrid, sceneFromMeasurement, serializeScene, PIPELINE_RECIPE,
} from './image-pipeline.mjs';
import { OVERLAY_IDS, withOverlays } from './overlays.mjs';
import { DELIVERY_CELL, renderFrame, rasterize } from './engine.mjs';

/** A network URL is never accepted: the pipeline is local-only by construction. */
export function assertLocalInput(input) {
  if (typeof input === 'string' && /^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
    throw new Error(`refusing a network URL (${input}); the pipeline decodes local files only`);
  }
}

/** Bytes from a path, a Buffer/Uint8Array, or a string of SVG source. */
async function readBytes(input) {
  assertLocalInput(input);
  if (typeof input === 'string' && /^\s*</.test(input)) return Buffer.from(input);
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) return Buffer.from(input);
  if (typeof input === 'string') return readFile(resolve(input));
  throw new Error('decode: expected a path, bytes or SVG source');
}

/**
 * Decode a local SVG, PNG or JPEG to straight-alpha RGBA. SVG is rasterised by
 * the local librsvg through sharp at a documented target size; PNG and JPEG are
 * read as they are (no resampling) so their own pixels are what gets measured.
 */
export async function decodeImage(input, options = {}) {
  const bytes = await readBytes(input);
  const meta = await sharp(bytes).metadata();
  const source = { format: meta.format ?? 'unknown', width: meta.width ?? null, height: meta.height ?? null,
    bytes: bytes.length, name: typeof input === 'string' && !/^\s*</.test(input) ? input : null };
  let pipeline = sharp(bytes, { density: meta.format === 'svg' ? 384 : 72 });
  if (meta.format === 'svg') {
    const target = options.rasterSize ?? 1024;
    pipeline = pipeline.resize({ width: target, height: target, fit: 'inside', withoutEnlargement: false,
      kernel: 'lanczos3' });
  }
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { rgba: data, width: info.width, height: info.height, rasterised: meta.format === 'svg',
    source, width0: meta.width, height0: meta.height };
}

/**
 * The high-level conversion: decode a local file and measure/emit the scene.
 * Options are exactly the CLI flags, defaulted here so callers and the CLI
 * cannot disagree.
 */
export async function convert(input, options = {}) {
  const decoded = await decodeImage(input, options);
  const conversion = convertRgba(decoded.rgba, decoded.width, decoded.height, {
    cols: options.cols ?? 200,
    rows: options.rows ?? 100,
    mode: options.mode ?? 'ink',
    colorMode: options.colorMode ?? 'levels',
    palette: options.palette ?? 'ink',
    paletteCount: options.paletteCount ?? DEFAULT_EXTRACT_COUNT,
    margin: options.margin ?? 0.04,
    prefilter: options.prefilter,
    autoGain: options.autoGain,
    toneCap: options.toneCap,
    id: options.id ?? 'image-scene',
    label: options.label,
  });
  return { ...conversion, decoded };
}

/** The composed scene for a CLI report: conversion plus the requested overlays. */
export function composeForReport(scene, overlays = []) {
  const active = overlays.filter((id) => OVERLAY_IDS.includes(id));
  return active.length ? withOverlays(scene, active) : scene;
}

const args = process.argv.slice(2);
const at = (name) => (args.indexOf(name) > -1 ? args[args.indexOf(name) + 1] : undefined);
const has = (name) => args.includes(name);
const isMain = process.argv[1] ? /from-image\.mjs$/.test(process.argv[1]) : false;

if (isMain) {
  const input = at('--in');
  if (!input) {
    console.error('usage: node scripts/scene-src/from-image.mjs --in <file> [flags]');
    process.exit(2);
  }
  const mode = at('--mode') ?? 'ink';
  const colorMode = at('--color') ?? 'levels';
  if (!MEASURE_MODES.includes(mode)) {
    console.error(`unknown --mode ${mode}; have ${MEASURE_MODES.join(', ')}`);
    process.exit(2);
  }
  if (!COLOR_MODES.includes(colorMode)) {
    console.error(`unknown --color ${colorMode}; have ${COLOR_MODES.join(', ')}`);
    process.exit(2);
  }
  const palette = at('--palette') ?? 'ink';
  if (palette !== 'extract' && !IMAGE_PALETTES.some((entry) => entry.id === palette)) {
    console.error(`unknown --palette ${palette}; have extract, ${IMAGE_PALETTES.map((e) => e.id).join(', ')}`);
    process.exit(2);
  }
  const overlayIds = (at('--overlays') ?? '').split(/[,+\s]+/).filter(Boolean);
  for (const id of overlayIds) {
    if (!OVERLAY_IDS.includes(id)) {
      console.error(`unknown --overlays entry ${id}; have ${OVERLAY_IDS.join(', ')}`);
      process.exit(2);
    }
  }
  const cell = Number(at('--cell') ?? DELIVERY_CELL);
  const density = Number(at('--density') ?? 1);
  const dither = at('--dither') ?? 'bayer4';
  const shape = at('--shape') ?? 'disc';
  const prefilter = (at('--prefilter') ?? 'pitch') === 'none' ? false : 'pitch';
  const autoGain = (at('--auto-gain') ?? 'auto') === 'none' ? 'none' : 'auto';
  const toneCap = (at('--tone-cap') ?? 'auto') === 'none' ? 'none' : 'auto';
  const out = at('--out');
  const options = {
    cols: Number(at('--cols') ?? 200), rows: Number(at('--rows') ?? 100),
    margin: Number(at('--margin') ?? 0.04), mode, colorMode, palette,
    paletteCount: Number(at('--palette-count') ?? DEFAULT_EXTRACT_COUNT),
    prefilter, autoGain, toneCap,
    id: at('--id') ?? 'image-scene', label: at('--label'),
    rasterSize: Number(at('--raster-size') ?? 1024),
  };
  assertLocalInput(input);
  const converted = await convert(resolve(input), options);
  const scene = composeForReport(converted.scene, overlayIds);
  const engineOptions = { shape, dither, density };
  const frame = renderFrame(scene, scene.posterFrame, engineOptions);
  const raster = rasterize(frame, scene, cell, undefined, engineOptions);
  const report = {
    input: { name: converted.decoded.source.name, format: converted.decoded.source.format,
      bytes: converted.decoded.source.bytes, decoded: `${converted.decoded.width}x${converted.decoded.height}` },
    recipe: PIPELINE_RECIPE,
    mode, colorMode, palette: converted.scene.converted.paletteSource,
    prefilter: converted.scene.params.prefilter, autoGain: converted.scene.params.gain > 1 ? `auto (gain ${converted.scene.params.gain.toFixed(2)})` : 'auto (gain 1)',
    fit: converted.measure.stats.fit,
    fitRule: converted.fit.rule,
    measureRule: converted.measure.rule,
    stats: converted.measure.stats,
    paletteHex: converted.palette,
    paletteDepth: converted.palette.length,
    grid: `${scene.cols}x${scene.rows}`,
    overlays: scene.overlays ?? [],
    render: { cell, density, dither, shape, width: frame.cols * cell,
      height: frame.rows * cell, frame: frame.frame },
    serialized: converted.serialized,
  };
  if (out) {
    await mkdir(out, { recursive: true });
    await writeFile(resolve(out, `${scene.id}.json`), JSON.stringify(report, null, 2));
    if (has('--png')) {
      const png = await sharp(Buffer.from(raster), { raw: { width: frame.cols * cell, height: frame.rows * cell, channels: 4 } })
        .png({ compressionLevel: 9, adaptiveFiltering: false })
        .toBuffer();
      const name = `${scene.id}-${cell}px-density${density}.png`;
      await writeFile(resolve(out, name), png);
      report.png = { name, bytes: png.length };
    }
  }
  console.log(JSON.stringify(report, null, 2));
}

export { fitGrid, sceneFromMeasurement, serializeScene };
export { convertRgba } from './image-pipeline.mjs';
export const CLI_USAGE = 'node scripts/scene-src/from-image.mjs --in <file> [--mode ink|luminance] '
  + '[--color levels|rgb] [--palette <id|extract>] [--cols n] [--rows n] [--margin f] '
  + '[--dither bayer4|bayer8|blue|none] [--shape id] [--cell px] [--density 1|2|4] '
  + '[--prefilter pitch|none] [--auto-gain auto|none] [--tone-cap auto|none] '
  + '[--overlays stars,aurora,grain,glimmer] [--out dir] [--png]';
export const CLI_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg'];
