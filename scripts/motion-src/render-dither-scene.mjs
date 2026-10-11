#!/usr/bin/env node
/** Local-only J1 surface bake. No destructive output cleanup, no AV1 pass. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { AGENT, GATE } from './scenes/J1.js';
import { loadPlaywright, stageFonts, loadFilm, serve, setupPage, captureFrame } from './render.mjs';

// Imported by the local checker without starting a browser or writing files.
// Source and delivery rectangles own the geometry, not a second test fixture.
const band = { source: [540, 230, 960, 530], delivery: [48, 32, 864, 477] };
const pair = { source: [817, 12, 318, 136], delivery: [242, 168, 477, 204] };
const pairScale = pair.delivery[2] / pair.source[2];
const center = subject => ({
  x: pair.delivery[0] + (subject.x - pair.source[0]) * pairScale,
  y: pair.delivery[1] + (subject.y - pair.source[1]) * pairScale,
});
export const SCENE = {
  width: 960, height: 540, cell: 8, crf: 41, posterTime: 7.8,
  frames: 450, fps: 30, duration: 15, reframe: { band, pair },
  agent: { ...center(AGENT), radius: AGENT.radius * pairScale },
  gate: { ...center(GATE), half: GATE.half * pairScale, flare: (GATE.glow + GATE.flare) * pairScale },
};
const root = resolve(new URL('../..', import.meta.url).pathname);
const out = resolve(root, 'dist-motion-wu12');
const evidence = resolve(root, 'dist-motion-verify/wu12');
const sha = data => createHash('sha256').update(data).digest('hex');
const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  return result.stdout;
};

async function renderFrames() {
  stageFonts();
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const served = await serve();
  let poster;
  try {
    const film = await loadFilm('J1');
    assert.equal(film.duration * film.fps, SCENE.frames);
    const { page, seek } = await setupPage(browser, { port: served.port, filmId: 'J1', film });
    for (let frame = 0; frame < SCENE.frames; frame++) {
      await seek(frame / SCENE.fps);
      // Reposition the authored surfaces before painting dots. Shared J1 stays
      // composed for its existing reduced-motion hero; its time functions stay.
      await page.evaluate(({ reframe, width }) => {
        const canvas = document.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        const source = document.createElement('canvas');
        source.width = canvas.width;
        source.height = canvas.height;
        source.getContext('2d').drawImage(canvas, 0, 0);
        ctx.resetTransform();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#0b0b0c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const nativeScale = canvas.width / width;
        for (const region of Object.values(reframe)) {
          ctx.drawImage(source, ...region.source, ...region.delivery.map(v => v * nativeScale));
        }
      }, SCENE);
      const raster = Buffer.from(await captureFrame(page, {
        buffers: [(await page.screenshot()).toString('base64')], n: 1,
        dither: true, cell: SCENE.cell, width: SCENE.width, height: SCENE.height,
      }), 'base64');
      await writeFile(resolve(out, 'frames', `f${String(frame).padStart(4, '0')}.png`), raster);
      if (frame === Math.round(SCENE.posterTime * SCENE.fps)) poster = raster;
      if (frame % 30 === 0) console.log(`J1 fresh bake: ${frame}/${SCENE.frames}`);
    }
  } finally {
    await browser.close();
    await new Promise(ok => served.server.close(ok));
  }
  return poster;
}

async function encodePoster(raster) {
  const { data, info } = await sharp(raster).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, SCENE.width);
  assert.equal(info.height, SCENE.height);
  const colors = new Set();
  let corners = 0, nonInkCenters = 0, amber = 0;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    colors.add(data.subarray(i, i + 3).toString('hex'));
    const neutral = Math.max(r, g, b) - Math.min(r, g, b) <= 7;
    const hue = 60 * (g - b) / (r - b);
    assert.ok(neutral || (r > g && g > b && hue >= 30 && hue <= 50), 'off-brand source bitmap pixel');
    if (!neutral) amber++;
  }
  const ink = Buffer.from([11, 11, 12]);
  for (let y = 0; y + SCENE.cell <= SCENE.height; y += SCENE.cell) {
    for (let x = 0; x + SCENE.cell <= SCENE.width; x += SCENE.cell) {
      const i = (y * SCENE.width + x) * 3;
      assert.ok(data.subarray(i, i + 3).equals(ink), 'cell corner is not ink');
      corners++;
      const c = ((y + 4) * SCENE.width + x + 4) * 3;
      if (!data.subarray(c, c + 3).equals(ink)) nonInkCenters++;
    }
  }
  assert.ok(amber > 100 && nonInkCenters > 1000, 'empty artwork/absent dots');
  const png = await sharp(data, { raw: { width: SCENE.width, height: SCENE.height, channels: 3 } })
    .png({ palette: true, colours: 256, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
  assert.ok((await sharp(png).removeAlpha().raw().toBuffer()).equals(data), 'poster palette encoding changed source pixels');
  assert.ok(png.length <= 80 * 1024, 'poster over budget');
  return { png, colors: colors.size, corners, nonInkCenters, amber };
}

async function encodedMetrics(movie) {
  run('ffmpeg', [
    '-y', '-i', movie, '-vf', "select='eq(n,0)+eq(n,234)+eq(n,449)'",
    '-fps_mode', 'passthrough', resolve(evidence, 'decoded-%02d.png'),
  ]);
  const first = await sharp(resolve(evidence, 'decoded-01.png')).removeAlpha().raw().toBuffer();
  const last = await sharp(resolve(evidence, 'decoded-03.png')).removeAlpha().raw().toBuffer();
  const support = await sharp(resolve(evidence, 'decoded-02.png')).removeAlpha().raw().toBuffer();
  let error = 0, max = 0, motionDelta = 0;
  for (let i = 0; i < first.length; i++) {
    const delta = Math.abs(first[i] - last[i]);
    error += delta;
    max = Math.max(max, delta);
    motionDelta += Math.abs(first[i] - support[i]);
  }
  const seamMAE = error / first.length;
  await appendFile(resolve(evidence, 'encoding-attempts.log'), `decoded first/last MAE ${seamMAE}, max ${max}\n`);
  assert.ok(seamMAE < 2, 'decoded H.264 loop seam exceeds 2/255 MAE');
  assert.ok(motionDelta / first.length > 3, 'encoded artwork is effectively static');
  return { seamMAE, seamMax: max, supportVsFirstMAE: motionDelta / first.length };
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--encode-only'), 'only --encode-only is supported');
  await mkdir(resolve(out, 'frames'), { recursive: true });
  await mkdir(evidence, { recursive: true });
  const raster = args.length ? await readFile(resolve(out, 'frames/f0234.png')) : await renderFrames();
  const { png, ...posterStats } = await encodePoster(raster);
  const first = await readFile(resolve(out, 'frames/f0000.png'));
  const last = await readFile(resolve(out, 'frames/f0449.png'));
  assert.ok(first.equals(last), 'source loop seam differs');
  const movie = resolve(out, 'harness-tones-dither.mp4');
  // Boundary QP pins stop CRF rate control making identical source endpoints
  // look different. Both first and last are actual independently encoded frames.
  run('ffmpeg', [
    '-y', '-framerate', String(SCENE.fps), '-i', resolve(out, 'frames/f%04d.png'),
    '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(SCENE.crf),
    '-force_key_frames', '0,14.966667', '-x264-params', 'zones=0,0,q=20/449,449,q=20',
    '-movflags', '+faststart', movie,
  ]);
  const encoded = await readFile(movie);
  await appendFile(resolve(evidence, 'encoding-attempts.log'), `cell ${SCENE.cell}, ${SCENE.width}x${SCENE.height}, CRF ${SCENE.crf}: ${encoded.length} bytes\n`);
  assert.ok(encoded.length <= 300 * 1024, `movie ${encoded.length} bytes over 300 KiB`);
  const metrics = await encodedMetrics(movie);
  // No committed artifact is written until all encode/pixel/budget gates pass.
  await writeFile(resolve(root, 'public/assets/motion/harness-tones-dither.mp4'), encoded);
  await writeFile(resolve(root, 'public/assets/dither/scene-dither.png'), png);
  const report = {
    scene: 'J1', ...SCENE, blur: 1, originalGeometry: { AGENT, GATE },
    source: { ...posterStats, posterTime: SCENE.posterTime, posterPixelsEqual: true, seamBytesEqual: true, seamSha256: sha(first) },
    encoded: { bytes: encoded.length, sha256: sha(encoded), ...metrics },
    poster: { bytes: png.length, sha256: sha(png) },
    probe: JSON.parse(run('ffprobe', [
      '-v', 'error', '-show_entries', 'stream=codec_name,width,height,nb_frames,avg_frame_rate,duration', '-of', 'json', movie,
    ])),
    limitations: [
      'Local bake reframes existing J1 surfaces, not a shared scene change. Mobile center-cover crops the outer band; complete ring/block/gate including flare remain visible.',
      'Lossy H.264 is not the source bitmap palette. No AV1 output.',
    ],
  };
  await writeFile(resolve(evidence, 'render.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
