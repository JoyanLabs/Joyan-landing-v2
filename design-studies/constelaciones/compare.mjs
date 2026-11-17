#!/usr/bin/env node
/**
 * The A/B plate: Genghe under the approved hero, at the same width.
 *
 * Usage, from the repository root:
 *   timeout 90 node design-studies/constelaciones/compare.mjs
 *
 * The plates are only comparable at the same size, so both are drawn 1280 wide:
 * `design-studies/comparar/v1-hero.png` (the approved piece, the vara) on top
 * and `captures/genghe-1280.png` (this study) below, with a 16 px gutter. It
 * reads the captures; it never renders a page, so it stays honest about what
 * was actually captured.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(resolve('package.json'));
const sharp = require('sharp');

const WIDTH = 1280;
const GAP = 16;
const VARA = 'design-studies/comparar/v1-hero.png';
const PIECE = 'design-studies/constelaciones/captures/genghe-1280.png';
const OUT = 'design-studies/constelaciones/captures/genghe-vs-vara.png';

const vara = await sharp(VARA).resize({ width: WIDTH }).toBuffer();
const piece = await sharp(PIECE).resize({ width: WIDTH }).toBuffer();
const varaHeight = (await sharp(vara).metadata()).height;
const pieceHeight = (await sharp(piece).metadata()).height;

await sharp({
  create: { width: WIDTH, height: varaHeight + GAP + pieceHeight, channels: 3, background: '#000000' },
})
  .composite([{ input: vara, top: 0, left: 0 }, { input: piece, top: varaHeight + GAP, left: 0 }])
  .png()
  .toFile(OUT);

console.log(`${OUT} — vara ${WIDTH}x${varaHeight} on top, piece ${WIDTH}x${pieceHeight} below, ${GAP} px gutter`);
