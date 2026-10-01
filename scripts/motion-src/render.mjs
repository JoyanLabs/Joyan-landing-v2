#!/usr/bin/env node
/**
 * Render the Joyan motion film.
 *
 * The renderer is deliberately dumb: the composition owns every value as a
 * pure function of `t` (window.__seek), so the renderer only has to walk a
 * clock and take a picture. Nothing here can desynchronize the film from its
 * beat sheet — that lives in film.mjs, shared with the probe.
 *
 * Motion blur is real, not faked: each output frame is the linear-light
 * average of N sub-frame captures spread across an open shutter, which is
 * what makes a fast move smear instead of strobe. Drafts pass --blur 1.
 *
 * Usage:
 *   node scripts/motion-src/render.mjs --out dist-motion --blur 5 [--scale 1]
 *
 * Requires Playwright + chromium. Kept out of the landing's own dependency
 * tree on purpose: see docs/DESIGN.md — Motion film.
 */

import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(fileURLToPath(new URL('.', import.meta.url)));
const REPO = resolve(HERE, '../..');
const { FILM } = await import('./film.mjs');

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const OUT = resolve(REPO, arg('out', 'dist-motion'));

/**
 * The output directory is removed recursively before rendering starts, so a
 * mistyped `--out` is destructive: `resolve(REPO, '.')` is the repository
 * root, `'..'` is its parent, `'src'` is the source tree, and
 * `'public/assets/motion'` holds the committed film. Every one of those would
 * have been deleted with no further prompt.
 *
 * Refuse anything that is the repository root, contains the repository, sits
 * in a git directory or node_modules, or — inside the repository — holds a
 * git-tracked file. An external scratch directory carries no source, so it
 * stays allowed.
 */
function assertSafeOutput(dir) {
  const refuse = (why) => {
    throw new Error(
      `refusing --out ${dir}: ${why}.\n` +
        '  --out is removed recursively before rendering, so it must never be, or contain, source.'
    );
  };

  const fromRepo = relative(REPO, dir); // dir seen from the repository root
  const toRepo = relative(dir, REPO); // repository seen from dir

  if (fromRepo === '') refuse('it is the repository root');
  if (toRepo !== '' && !toRepo.startsWith('..') && !isAbsolute(toRepo)) {
    refuse('it contains the repository');
  }
  const parts = dir.split(sep);
  if (parts.includes('.git')) refuse('it is inside a git directory');
  if (parts.includes('node_modules')) refuse('it is inside node_modules');

  if (fromRepo.startsWith('..') || isAbsolute(fromRepo)) return; // external scratch dir

  // Fail closed. If the inventory cannot be read, an in-repository target
  // looks empty of tracked files and the guard would wave through a recursive
  // delete of the source tree — the exact failure it exists to prevent.
  const res = spawnSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8' });
  if (res.error || res.status !== 0 || typeof res.stdout !== 'string') {
    refuse(
      `the git tracked-file inventory is unavailable (${res.error?.message ?? `git exited ${res.status}`})`
    );
  }
  const tracked = res.stdout;
  for (const file of tracked.split('\0')) {
    if (!file) continue;
    const abs = resolve(REPO, file);
    if (abs === dir || abs.startsWith(dir + sep)) refuse(`it holds tracked file ${file}`);
  }
}
const BLUR = Math.max(1, Number(arg('blur', 1)));
const SCALE = Number(arg('scale', 1));
// Delivery size. Frames are always rendered at the composition's native
// 1920x1080 so motion blur has real detail to smear; only the encode is
// downscaled. Rendering small and blurring it is how hairlines disappear.
const OUT_WIDTH = Number(arg('out-width', FILM.width));
const CRF = Number(arg('crf', 18));

// AV1 is emitted alongside the H.264 fallback. The browser picks the first
// source it can decode, so this is a quality tier rather than a cost: modern
// engines get the sharper encode and only pay for it.
const AV1_WIDTH = Number(arg('av1-width', 0));
const AV1_CRF = Number(arg('av1-crf', 46));
const AV1_PRESET = Number(arg('av1-preset', 6));
const SHUTTER = 180 / (360 * 30); // 180 degrees at 30 fps, in frames

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.css': 'text/css; charset=utf-8',
};

/**
 * Playwright lives in an isolated toolchain (a ~150 MB browser download that
 * has no business in the landing's `pnpm install`). MOTION_TOOLCHAIN points at
 * it; fall back to a normal resolution so the script still works if somebody
 * did install it locally.
 */
async function loadPlaywright() {
  const toolchain = process.env.MOTION_TOOLCHAIN ?? join(process.env.HOME ?? '', '.cache/joyan-motion');
  const candidates = [join(toolchain, 'node_modules/playwright')];
  try {
    candidates.push(import.meta.resolve('playwright'));
  } catch {
    /* not installed locally — the toolchain path is the expected route */
  }
  for (const spec of candidates) {
    try {
      return await import(`file://${spec}/index.mjs`);
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error(
    'playwright not found. Install the motion toolchain first:\n' +
      `  mkdir -p ${toolchain} && cd ${toolchain} && npm init -y && npm i -D playwright && npx playwright install chromium`
  );
}

function stageFonts() {
  const fs = readdirSync(join(REPO, 'node_modules/@fontsource-variable/archivo/files'));
  const mono = readdirSync(join(REPO, 'node_modules/@fontsource-variable/jetbrains-mono/files'));
  const pick = (list) => list.find((f) => f === 'archivo-latin-wght-normal.woff2' || f === 'jetbrains-mono-latin-wght-normal.woff2');
  const pairs = [
    [join(REPO, 'node_modules/@fontsource-variable/archivo/files', pick(fs)), join(HERE, 'archivo.woff2')],
    [join(REPO, 'node_modules/@fontsource-variable/jetbrains-mono/files', pick(mono)), join(HERE, 'mono.woff2')],
  ];
  for (const [from, to] of pairs) {
    if (!existsSync(from)) throw new Error(`missing font source: ${from} (run pnpm install)`);
    writeFileSync(to, readFileSync(from));
  }
}

function serve(root) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const file = join(root, path === '/' ? 'composition.html' : path);
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port })));
}

function ffmpeg(args) {
  return new Promise((ok, fail) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (b) => (err += b));
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg ${code}\n${err.slice(-2000)}`))));
  });
}

async function main() {
  assertSafeOutput(OUT);
  stageFonts();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'frames'), { recursive: true });

  const { chromium } = await loadPlaywright();
  const { server, port } = await serve(HERE);
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: FILM.width, height: FILM.height },
    deviceScaleFactor: SCALE,
  });
  await page.goto(`http://127.0.0.1:${port}/composition.html`);
  await page.waitForFunction('window.__ready === true');
  // Fonts must be resolved before frame 0 or the wordmark rasterizes wrong.
  await page.evaluate(() => document.fonts.ready);

  const total = Math.round(FILM.duration * FILM.fps);
  const t0 = Date.now();

  for (let f = 0; f < total; f++) {
    const t = f / FILM.fps;
    if (BLUR === 1) {
      await page.evaluate((time) => window.__seek(time), t);
      await page.screenshot({ path: join(OUT, 'frames', `f${String(f).padStart(4, '0')}.png`) });
    } else {
      // Average N sub-captures across the shutter. Sub-frame times WRAP
      // around the loop instead of clamping to zero: the film is a seamless
      // loop, so the shutter at t=0 legitimately reaches back into the tail
      // of the film. Clamping made frame 0 sharp and frame N-1 smeared,
      // which is exactly the seam the loop contract forbids.
      const subs = [];
      for (let s = 0; s < BLUR; s++) {
        const st = t - (SHUTTER * (s + 0.5)) / BLUR;
        const wrapped = ((st % FILM.duration) + FILM.duration) % FILM.duration;
        await page.evaluate((time) => window.__seek(time), wrapped);
        subs.push(await page.screenshot());
      }
      const stacked = await page.evaluate(async ({ buffers, n }) => {
        const load = (b) =>
          new Promise((ok) => {
            const img = new Image();
            img.onload = () => ok(img);
            img.src = 'data:image/png;base64,' + b;
          });
        const imgs = await Promise.all(buffers.map(load));
        const c = document.createElement('canvas');
        c.width = imgs[0].width;
        c.height = imgs[0].height;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        // getImageData is RGBA — four bytes per pixel, not three. Sizing the
        // accumulator at three averaged only the first three quarters of each
        // frame's byte stream and left the tail of out.data at zero, so every
        // blurred frame was a quarter short and partly transparent.
        const CHANNELS = 4;
        const acc = new Float32Array(c.width * c.height * CHANNELS);
        for (const img of imgs) {
          ctx.clearRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, c.width, c.height).data;
          for (let i = 0; i < acc.length; i++) acc[i] += d[i];
        }
        const out = ctx.createImageData(c.width, c.height);
        for (let i = 0; i < acc.length; i++) out.data[i] = acc[i] / n;
        // No palette snapping here. The composition already paints flat brand
        // colours; the only intermediate values are the moving edges, which
        // real motion blur has to produce. An earlier version re-quantized to
        // ink/bone and silently deleted the grid, because a 20%-alpha
        // hairline lands at luminance 60 — under any sane bone threshold.
        ctx.putImageData(out, 0, 0);
        return c.toDataURL('image/png').split(',')[1];
      }, { buffers: subs.map((b) => b.toString('base64')), n: BLUR });
      writeFileSync(join(OUT, 'frames', `f${String(f).padStart(4, '0')}.png`), Buffer.from(stacked, 'base64'));
    }
    if (f % 30 === 0) {
      const pct = ((f / total) * 100).toFixed(0);
      process.stdout.write(`\r  rendering ${pct}%  (frame ${f}/${total})   `);
    }
  }
  process.stdout.write('\n');

  await browser.close();
  server.close();

  const encHeight = (w) => Math.round((w * FILM.height) / FILM.width / 2) * 2;
  const encode = async (file, width, args) => {
    const out = join(OUT, file);
    await ffmpeg([
      '-y', '-framerate', String(FILM.fps),
      '-i', join(OUT, 'frames', 'f%04d.png'),
      '-vf', `scale=${width}:${encHeight(width)}:flags=lanczos,format=yuv420p`,
      ...args,
      '-movflags', '+faststart',
      out,
    ]);
    return { out, kb: Math.round(statSync(out).size / 1024) };
  };

  // H.264 fallback first: it must exist even when AV1 is the headline.
  const fallback = await encode(`${FILM.title}.mp4`, OUT_WIDTH, [
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF),
  ]);
  console.log(`\n  ${total} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  -> ${fallback.out}  (h264 ${OUT_WIDTH}px crf${CRF}, ${fallback.kb} KB)`);

  if (AV1_WIDTH > 0) {
    const av1 = await encode(`${FILM.title}.av1.mp4`, AV1_WIDTH, [
      '-c:v', 'libsvtav1', '-preset', String(AV1_PRESET), '-crf', String(AV1_CRF),
    ]);
    console.log(`  -> ${av1.out}  (av1 ${AV1_WIDTH}px crf${AV1_CRF}, ${av1.kb} KB)`);
  }
}

await main();
