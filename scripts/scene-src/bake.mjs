#!/usr/bin/env node
/**
 * BAKE — write a scene to a PNG (and, if asked, a short MP4) with the SAME
 * engine the browser canvas runs, from plain Node: no browser, no canvas, no
 * headless render. That is the whole point of the engine split — if the bake
 * and the live canvas were drawn by different code, "baked" and "live" would be
 * two lookalikes instead of one piece of art.
 *
 *   node scripts/scene-src/bake.mjs [--scene <id>] [--cell <n>] [--mp4] [--frames <n>]
 *
 * Output goes to `scripts/scene-src/baked/<id>.png` and `<id>.mp4`. The checked
 * lab surface is the only place these files are read from; see
 * `docs/MOTOR-ESCENAS.md` for why the bake output sits beside its engine rather
 * than in `public/`.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { DELIVERY_CELL, renderFrame, rasterize } from './engine.mjs';
import { COMPARISON_SCENE, SCENES } from './scenes/index.mjs';

const here = resolve(new URL('.', import.meta.url).pathname);
const baked = resolve(here, 'baked');
const sha = (data) => createHash('sha256').update(data).digest('hex');

/** One poster frame as RGBA, plus the geometry the file will carry. */
export function bakePoster(scene, cell = DELIVERY_CELL) {
  const frame = renderFrame(scene, scene.posterFrame);
  const rgba = rasterize(frame, scene, cell);
  return { frame, rgba, width: frame.cols * cell, height: frame.rows * cell };
}

/** PNG bytes for the poster frame. Fixed options, so the output is repeatable. */
export async function bakePng(scene, cell = DELIVERY_CELL) {
  const { rgba, width, height } = bakePoster(scene, cell);
  const png = await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  return { png, width, height };
}

/** Pipe raw RGBA frames to the local ffmpeg, one frame at a time. */
function encodeMp4(scene, { cell, frames, crf, out }) {
  return new Promise((done, fail) => {
    const width = scene.cols * cell;
    const height = scene.rows * cell;
    const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-r', String(scene.fps), '-i', '-',
      '-an', '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(crf), '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    ffmpeg.on('error', fail);
    ffmpeg.on('close', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}`))));
    const feed = async () => {
      try {
        for (let index = 0; index < frames; index++) {
          const rgba = Buffer.from(rasterize(renderFrame(scene, index), scene, cell));
          if (!ffmpeg.stdin.write(rgba)) {
            await new Promise((drain) => ffmpeg.stdin.once('drain', drain));
          }
        }
        ffmpeg.stdin.end();
      } catch (error) {
        fail(error);
      }
    };
    void feed();
  });
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(name);
  return at > -1 ? args[at + 1] : fallback;
};
const sceneId = flag('--scene', COMPARISON_SCENE);
const cell = Number(flag('--cell', DELIVERY_CELL));
const frames = Number(flag('--frames', 120));
const crf = Number(flag('--crf', 32));
const scene = SCENES[sceneId];
if (!scene) {
  console.error(`unknown scene: ${sceneId} (have ${Object.keys(SCENES).join(', ')})`);
  process.exit(2);
}

await mkdir(baked, { recursive: true });
const pngPath = resolve(baked, `${scene.id}.png`);
const { png, width, height } = await bakePng(scene, cell);
await writeFile(pngPath, png);
const report = {
  scene: scene.id, cell, width, height, posterFrame: scene.posterFrame,
  png: { path: `scripts/scene-src/baked/${scene.id}.png`, bytes: png.length, sha256: sha(png) },
  pixelSha256: sha(Buffer.from(bakePoster(scene, cell).rgba)),
};
if (args.includes('--mp4')) {
  const mp4Path = resolve(baked, `${scene.id}.mp4`);
  const started = Date.now();
  await encodeMp4(scene, { cell, frames, crf, out: mp4Path });
  const mp4 = await readFile(mp4Path);
  report.mp4 = { path: `scripts/scene-src/baked/${scene.id}.mp4`, bytes: mp4.length, sha256: sha(mp4),
    frames, seconds: frames / scene.fps, crf, encodeMs: Date.now() - started };
}
console.log(JSON.stringify(report, null, 2));
