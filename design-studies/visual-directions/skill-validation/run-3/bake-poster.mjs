#!/usr/bin/env node
/**
 * BAKE DEL PÓSTER — receta de §2B: `rasterize()` del MISMO motor → PNG para el
 * `<img>` del fallback sin JS. No hay canvas, no hay navegador: si el póster y
 * el canvas no salieran del mismo motor serían dos parecidos, no una obra.
 *
 *   TMPDIR=$PWD/tmp timeout 180 node bake-poster.mjs
 *
 * Escribe `poster.png` (1600x800: 200x100 celdas a 8 px) junto a este archivo.
 */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { POSTER_FRAME, posterRgba, scene } from './scene-traza.mjs';

const here = resolve(new URL('.', import.meta.url).pathname);
const { frame, rgba, width, height } = posterRgba(8);
// PNG con opciones fijas: la salida es repetible byte a byte.
const png = await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toBuffer();
await writeFile(resolve(here, 'poster.png'), png);
const sha = (data) => createHash('sha256').update(data).digest('hex');
// La huella del RGBA es la que el navegador puede reproducir con el mismo motor.
console.log(`poster.png ${width}x${height} frame=${frame.frame} time=${frame.time.toFixed(3)}s`);
console.log(`rgba-sha256 ${sha(Buffer.from(rgba))}`);
console.log(`png-sha256  ${sha(png)}`);
console.log(`scene=${scene.id} cols=${frame.cols} rows=${frame.rows} posterFrame=${POSTER_FRAME}`);
