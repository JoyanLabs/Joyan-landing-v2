#!/usr/bin/env node
// WU27 — the real sequence, Michroma and a slower warp.
// ============================================================================
// The user rejected the standalone prototype: the transition must happen TO THE
// SCENE THE PUBLIC PAGE RENDERS — same payload, same grid, same joyan-page
// palette, same overlays — with the ENGINE's own warp overlay ramping up over
// it, never a second particle canvas. This checker pins that contract plus the
// self-hosted Michroma/VT323 fonts, the tuned warp constants and the delivery
// gate's WU27 paths. Every check is observable from the repository or the
// built dist; nothing is asserted on trust.
//
// Usage: node scripts/check-sequence-lab.mjs [--out <dir>]
//   Writes red.json / green.json into --out (default: no file, stdout only).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async (path) => {
  try {
    return await readFile(resolve(root, path), 'utf8');
  } catch {
    return null;
  }
};
const list = async (path) => {
  try {
    return await readdir(resolve(root, path));
  } catch {
    return [];
  }
};

const failures = [];
let passed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed += 1;
  else failures.push({ name, detail: String(detail).slice(0, 400) });
};

// --- Sources (null when a file does not exist yet — that IS the RED) --------
const routeSrc = await read('src/pages/lab/sequence.astro');
const componentSrc = await read('src/components/joyan/SequenceLab.astro');
const runtimeSrc = await read('src/lib/sequence-runtime.ts');
const indexSrc = await read('src/pages/index.astro');
const heroSrc = await read('src/components/joyan/JoyanComingHero.astro');
const cssSrc = await read('src/assets/styles/tailwind.css');
const gateSrc = await read('scripts/check-delivery-scope.mjs');
const fontsDir = await list('public/fonts');

// --- ROUTE: /lab/sequence is a real laboratory route ------------------------
check('route: src/pages/lab/sequence.astro exists', Boolean(routeSrc));
if (routeSrc) {
  check('route: noindex robots metadata', /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/.test(routeSrc));
  check('route: self-canonical /lab/sequence', routeSrc.includes("getCanonical('/lab/sequence')"));
  check('route: mounts SequenceLab.astro', /SequenceLab/.test(routeSrc));
  check('route: imports the sequence runtime ~/lib/sequence-runtime (directly or through the component)',
    /~\/lib\/sequence-runtime/.test(routeSrc) || /~\/lib\/sequence-runtime/.test(componentSrc ?? ''));
}

// --- RECIPE: the lab shows the SAME scene the public page renders -----------
if (routeSrc && indexSrc) {
  const roll = (src) => /HERO_ROLL\s*=\s*(\d+)/.exec(src)?.[1] ?? /SEQUENCE_ROLL\s*=\s*(\d+)/.exec(src)?.[1];
  check('recipe: same roll 18 as the public page', roll(routeSrc) === '18' && roll(indexSrc) === '18',
    `sequence=${roll(routeSrc)} index=${roll(indexSrc)}`);
  check('recipe: same joyan-page palette (PAGE_PALETTE_ID)',
    routeSrc.includes('PAGE_PALETTE_ID') && indexSrc.includes('PAGE_PALETTE_ID'));
  check('recipe: same overlays stars,aurora,wash',
    /['"]stars['"]\s*,\s*['"]aurora['"]\s*,\s*['"]wash['"]/.test(routeSrc)
    && /['"]stars['"]\s*,\s*['"]aurora['"]\s*,\s*['"]wash['"]/.test(indexSrc));
  check('recipe: fixture fallback is our authored mark AND the page says so',
    routeSrc.includes('LOCAL_INPUTS') && routeSrc.includes('joyan-mark') && /data-subject-note|fixture is absent|subject note/i.test(routeSrc));
}

// --- COMPONENT: the three acts, the one control, the palette discipline -----
check('component: src/components/joyan/SequenceLab.astro exists', Boolean(componentSrc));
if (componentSrc) {
  check('component: one [data-sequence-lab] host with an engine canvas',
    componentSrc.includes('data-sequence-lab') && /<canvas/.test(componentSrc));
  check('component: three acts (terminal, fate, watcher)',
    /data-act=["']terminal["']/.test(componentSrc)
    && /data-act=["']fate["']/.test(componentSrc)
    && /data-act=["']watcher["']/.test(componentSrc));
  check('component: act-1 terminal types Wake up, Neo (the line is server-rendered content)',
    /Wake up, Neo/.test(componentSrc));
  // The skip BEHAVIOUR lives in the runtime (it owns the listeners); the
  // component carries the hint that says it is skippable.
  check('component: act-1 skippable by click and ArrowRight (hint in markup, listeners in the runtime)',
    /clic o → para avanzar|click or → to advance/.test(componentSrc)
    && /ArrowRight/.test(runtimeSrc ?? '') && /addEventListener\(\s*['"]click['"]/.test(runtimeSrc ?? ''));
  check('component: act-2 the literal Sarah Connor line over the live scene',
    /El futuro no está escrito\. No hay destino, salvo el que hacemos nosotros\./.test(componentSrc)
    && /The future is not set\. There is no fate but what we make for ourselves\./.test(componentSrc));
  check('component: act-2 carries the TERMINATOR 2 · SARAH CONNOR credit',
    componentSrc.includes('TERMINATOR 2 · SARAH CONNOR'));
  check('component: act-3 the watcher line literal',
    componentSrc.includes('Alguien tiene que mirar a las máquinas.')
    && componentSrc.includes('Someone has to watch the machines.'));
  check('component: act-3 Joyan set in Michroma (the display face)',
    /data-act=["']watcher["'][\s\S]*?font-display/.test(componentSrc));
  check('component: contact row mailto + the authored dot Discord mark',
    /mailto:hello@joyan\.dev/.test(componentSrc) && /data-discord-mark/.test(componentSrc));
  const buttons = (componentSrc.match(/<button/g) ?? []).length;
  check('component: the ES/EN toggle is the ONLY control (exactly one <button>)', buttons === 1, `saw ${buttons}`);
  check('component: VT323 terminal in the page palette — bone text, amber prompt',
    /VT323/.test(componentSrc) && /text-bone-50|#f4f2ed/i.test(componentSrc)
    && /text-accent|#ffb000/i.test(componentSrc));
  check('component: no phosphor green anywhere',
    !/00ff41|00ff00|#0f0\b|c8ffc8|33ff33|39ff14/i.test(componentSrc));
  check('component: no external asset requests (no http(s) asset URL, no font CDN)',
    !/(?:src|href)=["']https?:/i.test(componentSrc) && !/fonts\.googleapis|fonts\.gstatic/.test(componentSrc));
  check('component: static poster for the final reduced-motion state',
    /data-sequence-poster/.test(componentSrc));
}

// --- RUNTIME: the engine is the only renderer -------------------------------
check('runtime: src/lib/sequence-runtime.ts exists', Boolean(runtimeSrc));
if (runtimeSrc) {
  check('runtime: renders ONLY through the engine (renderFrame/rasterize from scripts/scene-src/engine.mjs)',
    /from\s+'[^']*scripts\/scene-src\/engine\.mjs'/.test(runtimeSrc)
    && /renderFrame/.test(runtimeSrc) && /rasterize/.test(runtimeSrc));
  check('runtime: builds the scene through the pipeline + treatment path (the sequence-warp module applies the joyan-page palette and overlays over sceneFromSerialized)',
    /sceneFromSerialized|sequenceScene/.test(runtimeSrc) && /sequence-warp/.test(runtimeSrc));
  check('runtime: the transition is the engine warp overlay ramping (sequence-warp ramp module)',
    /sequence-warp/.test(runtimeSrc) && /warpRampOverrides|WARP_RAMP/.test(runtimeSrc));
  check('runtime: no second particle canvas (no createElement("canvas"))',
    !/createElement\(\s*['"]canvas['"]/.test(runtimeSrc));
  check('runtime: pauses offscreen/hidden (IntersectionObserver, visibilitychange) and cleans up on pagehide',
    /IntersectionObserver/.test(runtimeSrc) && /visibilitychange/.test(runtimeSrc) && /pagehide/.test(runtimeSrc));
  check('runtime: reduced motion skips to the final static state',
    /prefers-reduced-motion/.test(runtimeSrc));
}

// --- ENGINE: the tuned warp, measured seam, exact ramp start ----------------
let engineEvidence = null;
try {
  const engine = await import(resolve(root, 'scripts/scene-src/engine.mjs'));
  const overlays = await import(resolve(root, 'scripts/scene-src/overlays.mjs'));
  const pipeline = await import(resolve(root, 'scripts/scene-src/image-pipeline.mjs'));
  const fromImage = await import(resolve(root, 'scripts/scene-src/from-image.mjs'));
  const local = await import(resolve(root, 'scripts/scene-src/local-inputs.mjs'));
  const ramp = await import(resolve(root, 'scripts/scene-src/sequence-warp.mjs'));
  const warp = overlays.OVERLAY_DEFAULTS.warp;
  check('engine: scripts/scene-src/sequence-warp.mjs exists (the one ramp source)',
    typeof ramp.warpRampOverrides === 'function' && typeof ramp.sequenceWarpScene === 'function');
  check('engine: warp tuned slower and wider — trips 2 (was 3), sigma 0.09 (was 0.05)',
    warp?.trips === 2 && warp?.sigma === 0.09, `trips=${warp?.trips} sigma=${warp?.sigma}`);

  // One authored mark conversion stands in for the payload when the third-party
  // fixture is absent: the seam and the ramp-start equality are properties of
  // the OVERLAY and the RAMP, not of the subject.
  const mark = local.LOCAL_INPUTS.find((entry) => entry.id === 'joyan-mark');
  const converted = await fromImage.convert(mark.svg, {
    cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink',
    id: 'wu27-sequence-probe', label: 'wu27 checker probe',
  });
  const payload = pipeline.rollSerializedScene(pipeline.serializeScene(converted.scene), ramp.SEQUENCE_ROLL);
  const base = ramp.sequenceScene(payload);
  const warpFull = ramp.sequenceWarpScene(payload, 1);
  const warpZero = ramp.sequenceWarpScene(payload, 0);
  const loopT = base.cycleFrames / base.fps;

  // Field seam: t=0 against the loop end, per cell per channel, against the
  // ordinary adjacent-frame step. The overlay is periodic by construction.
  let seamMax = 0;
  let adjacentMax = 0;
  for (let y = 0; y < base.rows; y++) {
    for (let x = 0; x < base.cols; x++) {
      const a = warpFull.field(x, y, 0);
      const b = warpFull.field(x, y, loopT);
      const c = warpFull.field(x, y, 1 / base.fps);
      for (let k = 0; k < 3; k++) {
        seamMax = Math.max(seamMax, Math.abs(a[k] - b[k]));
        adjacentMax = Math.max(adjacentMax, Math.abs(a[k] - c[k]));
      }
    }
  }
  engineEvidence = { seamMax, adjacentMax, loopT };
  check('engine: warp field seam stays ~0 at the loop end', seamMax <= 1e-9, `seamMax=${seamMax}`);
  check('engine: warp seam no worse than the adjacent-frame baseline', seamMax <= adjacentMax + 1e-12,
    `seam=${seamMax} adjacent=${adjacentMax}`);

  // The ramp STARTS on the exact public scene: bucket 0 must raster byte-equal
  // the base composition — same engine, same bytes, no parallel renderer.
  const cell = engine.DELIVERY_CELL;
  const frameBase = engine.renderFrame(base, base.posterFrame, { dither: 'bayer4', density: 1 });
  const frameZero = engine.renderFrame(warpZero, warpZero.posterFrame, { dither: 'bayer4', density: 1 });
  const rgbaBase = engine.rasterize(frameBase, base, cell);
  const rgbaZero = engine.rasterize(frameZero, warpZero, cell);
  let equal = rgbaBase.length === rgbaZero.length;
  for (let i = 0; equal && i < rgbaBase.length; i++) equal = rgbaBase[i] === rgbaZero[i];
  check('engine: bucket-0 warp scene raster is byte-identical to the base scene (the ramp starts on the public scene)', equal);
} catch (error) {
  check('engine: sequence-warp module + seam + ramp-start measurement', false, error.message);
}

// --- FONTS: self-hosted Michroma (and VT323 for the terminal), OFL recorded -
check('fonts: public/fonts/michroma-400.woff2 exists', fontsDir.includes('michroma-400.woff2'));
check('fonts: public/fonts/vt323-400.woff2 exists (the act-1 terminal face)', fontsDir.includes('vt323-400.woff2'));
check('fonts: an OFL licence notice lives in public/fonts',
  fontsDir.some((name) => /OFL|LICEN/i.test(name)));

check('css: @font-face Michroma in src/assets/styles/tailwind.css from /fonts/michroma-400.woff2',
  Boolean(cssSrc) && /@font-face[\s\S]*?Michroma[\s\S]*?\/fonts\/michroma-400\.woff2/.test(cssSrc));
check('css: @font-face VT323 in src/assets/styles/tailwind.css from /fonts/vt323-400.woff2',
  Boolean(cssSrc) && /@font-face[\s\S]*?VT323[\s\S]*?\/fonts\/vt323-400\.woff2/.test(cssSrc));
check('css: --font-display resolves to Michroma', Boolean(cssSrc) && /--font-display:[^;]*Michroma/.test(cssSrc));
check('css: JetBrains Mono keeps mono roles and Archivo keeps body',
  Boolean(cssSrc) && /--font-mono:[^;]*JetBrains/.test(cssSrc) && /--font-sans:[^;]*Archivo/.test(cssSrc));
check('hero: the public h1 name carries the Michroma display face',
  Boolean(heroSrc) && /<h1[^>]*font-display/.test(heroSrc));

// --- DIST: the built route, noindex, self-canonical, local assets only ------
const distHtml = await read('dist/lab/sequence/index.html');
check('dist: dist/lab/sequence/index.html built', Boolean(distHtml));
if (distHtml) {
  check('dist: built page is noindex and self-canonical',
    /name="robots"\s+content="noindex,\s*nofollow"/.test(distHtml)
    && /rel="canonical"\s+href="[^"]*\/lab\/sequence"/.test(distHtml));
  check('dist: built page hosts the engine payload, the canvas and the lab host',
    distHtml.includes('data-sequence-lab') && /<canvas/.test(distHtml)
    && /application\/json/.test(distHtml));
  const srcs = [...distHtml.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1])
    .filter((value) => /\.(?:js|css|woff2?|png|jpg|svg)(?:[?#].*)?$/i.test(value) || value.startsWith('/_astro/'));
  check('dist: every script/style/font/image reference is local',
    srcs.length > 0 && srcs.every((value) => value.startsWith('/') || value.startsWith('#')),
    srcs.filter((value) => !value.startsWith('/') && !value.startsWith('#')).join(', '));
}

// --- GATE: the WU27 contract exists in the delivery scope -------------------
check('gate: the WU27 contract covers the route, component, runtime and fonts',
  Boolean(gateSrc) && gateSrc.includes('src/pages/lab/sequence.astro')
  && gateSrc.includes('src/components/joyan/SequenceLab.astro')
  && gateSrc.includes('src/lib/sequence-runtime.ts')
  && gateSrc.includes('public/fonts/'));

// --- Report -----------------------------------------------------------------
const mode = failures.length ? 'RED' : 'GREEN';
const report = { mode, checker: 'check-sequence-lab', passed, failed: failures.length, failures, engineEvidence };
console.log(JSON.stringify(report, null, 2));
const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0 && process.argv[outIndex + 1]) {
  const outDir = resolve(root, process.argv[outIndex + 1]);
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, failures.length ? 'red.json' : 'green.json'), JSON.stringify(report, null, 2));
}
process.exit(failures.length ? 1 : 0);
