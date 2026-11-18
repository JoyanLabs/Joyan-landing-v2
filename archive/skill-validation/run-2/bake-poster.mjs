import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { rasterize } from '../../../../scripts/scene-src/engine.mjs';
import { CELL, renderConfine, scene } from './scene.mjs';

const frame = renderConfine(0);
const rgba = rasterize(frame, scene, CELL);
const width = scene.cols * CELL;
const height = scene.rows * CELL;
await sharp(rgba, { raw: { width, height, channels: 4 } })
  .png().toFile(new URL('poster.png', import.meta.url).pathname);
const metadata = { frame: 0, width, height, source: 'engine.renderFrame + engine.rasterize',
  rgbaSHA256: createHash('sha256').update(rgba).digest('hex') };
writeFileSync(new URL('poster-metadata.json', import.meta.url), JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify(metadata, null, 2));
