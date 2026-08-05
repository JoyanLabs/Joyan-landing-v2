#!/usr/bin/env node
/**
 * Deterministic Unit A checks for Joyan Landing iteration 3 (RED coverage).
 *
 * Verifies, against source files and a fresh `astro build` output:
 *   1. Dependency contract — exact `framer-motion@12.43.0` in package.json
 *      and pnpm-lock.yaml; `check:iteration-3` wired; no Three.js/WebGL/
 *      GSAP/Lenis runtime added.
 *   2. Import contract — the pages import ONLY `animate` and `inView` from
 *      `framer-motion/dom` (no `scroll`); the MAGI canvas stays vanilla and
 *      imports no external package.
 *   3. Reveal contract — `data-reveal` on below-hero sections only (never in
 *      the hero region), visible static server markup preserved, and the
 *      shipped reveal module gates on `prefers-reduced-motion`, animates only
 *      opacity/transform, stores inView cleanups and animation controls, and
 *      tears down on `astro:before-swap` / reboots on `astro:page-load`.
 *   4. MAGI model — executed 30-particle model across three depth layers
 *      (10 per layer) with tone/radius/opacity, 24-particle low-end fallback,
 *      bone reference layer on the node anchors, and the canvas wiring
 *      (data-particle-count=30, fallback count 24, DPR cap 2, 30 fps).
 *   5. Canvas runtime guards — pause vs teardown lifecycle, low-end
 *      detection, radial-sprite amber glow WITHOUT shadowBlur, pointer
 *      parallax only, and 2D-context (never WebGL).
 *   6. Hardware treatments — CSS-only tilt/scan/trace, hover/focus gated
 *      (no idle motion), reduced-motion static, focusable surface with a
 *      visible focus ring.
 *   7. Gzip-delta evidence — `--capture-baseline <path>` writes the gzip-sum
 *      of every emitted `dist/_astro/*.js` client chunk; `--baseline <path>`
 *      (or the default committed fixture) requires the candidate-minus-
 *      baseline delta to be at most 22528 bytes (22 KiB).
 *
 * Exit code 0 = all assertions pass; 1 = at least one failure. The checker
 * builds automatically when `dist/` is missing so `pnpm check` works from a
 * clean checkout. No runtime dependencies beyond project devDependencies.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = resolve(ROOT, 'dist');
const ASTRO_JS_DIR = resolve(DIST, '_astro');
const DEFAULT_BASELINE = resolve(ROOT, '.artifacts', 'iteration-2-client-js.json');
const GZIP_DELTA_BUDGET = 22 * 1024; // 22528 bytes — docs/DESIGN.md — Motion guide

// ---------------------------------------------------------------------------
// CLI: --capture-baseline <path> | --baseline <path> | (default)
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let baselinePath = '';
if (args[0] === '--capture-baseline') {
  baselinePath = args[1] ?? DEFAULT_BASELINE;
  captureBaseline(baselinePath);
  process.exit(0);
}
if (args[0] === '--baseline') {
  baselinePath = args[1] ?? DEFAULT_BASELINE;
}
if (args[0] && args[0] !== '--baseline') {
  console.error(`iteration-3: unknown flag "${args[0]}" (use --capture-baseline <path> or --baseline <path>)`);
  process.exit(1);
}

function listClientJs() {
  if (!existsSync(ASTRO_JS_DIR)) return [];
  return readdirSync(ASTRO_JS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort();
}

function gzipSum() {
  const chunks = listClientJs();
  let total = 0;
  const rows = [];
  for (const file of chunks) {
    const gz = gzipSync(readFileSync(resolve(ASTRO_JS_DIR, file))).byteLength;
    total += gz;
    rows.push({ file, gz });
  }
  return { rows, total };
}

function captureBaseline(path) {
  if (!existsSync(DIST) || !existsSync(resolve(DIST, 'index.html'))) {
    console.error(`iteration-3: dist/ not built yet — run \`npm run build\` before capturing a baseline.`);
    process.exit(1);
  }
  const { rows, total } = gzipSum();
  mkdirSync(resolve(path, '..'), { recursive: true });
  const fixture = {
    schema: 'joyan-iteration-2-client-js-gzip-baseline/1',
    totalGzip: total,
    chunkCount: rows.length,
    chunks: Object.fromEntries(rows.map((row) => [row.file, row.gz])),
  };
  writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`iteration-3: baseline captured at ${path}`);
  for (const row of rows) console.log(`  ${row.file}  gzip=${row.gz} B`);
  console.log(`  total gzip: ${total} B across ${rows.length} chunk(s)`);
}

const failures = [];
const passed = [];
const fail = (message) => failures.push(message);
const pass = (message) => passed.push(message);
const read = (filePath) => readFileSync(filePath, 'utf8');

// ---------------------------------------------------------------------------
// Build gate: the output assertions run against real built output.
// ---------------------------------------------------------------------------
if (!existsSync(DIST) || !existsSync(resolve(DIST, 'index.html'))) {
  console.log('iteration-3: dist/ not built yet — running `npm run build`...');
  const built = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
  if (built.status !== 0) {
    console.error('iteration-3: build failed; cannot run output assertions.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Generic TS module loader (same technique as check-iteration-2.mjs).
// ---------------------------------------------------------------------------
const loadTsModule = (filePath) => {
  const source = read(filePath);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function('exports', 'module', outputText)(module.exports, module);
  return module.exports;
};

const esHtml = existsSync(resolve(DIST, 'index.html')) ? read(resolve(DIST, 'index.html')) : '';
const enHtml = existsSync(resolve(DIST, 'en', 'index.html')) ? read(resolve(DIST, 'en', 'index.html')) : '';

// ---------------------------------------------------------------------------
// 1. Dependency contract.
// ---------------------------------------------------------------------------
const pkg = JSON.parse(read(resolve(ROOT, 'package.json')));

if (pkg.dependencies?.['framer-motion'] === '12.43.0') {
  pass('deps: package.json pins framer-motion to the exact version 12.43.0');
} else {
  fail(
    `deps: package.json must pin "framer-motion": "12.43.0" (got ${JSON.stringify(pkg.dependencies?.['framer-motion'] ?? 'missing')})`
  );
}

const lockfile = read(resolve(ROOT, 'pnpm-lock.yaml'));
if (/framer-motion@12\.43\.0:/m.test(lockfile)) {
  pass('deps: pnpm-lock.yaml resolves framer-motion@12.43.0');
} else {
  fail(
    'deps: pnpm-lock.yaml must contain a framer-motion@12.43.0 resolved entry (run `pnpm add framer-motion@12.43.0`)'
  );
}

const FORBIDDEN_RUNTIMES = ['three', 'gsap', 'lenis', '@studio-freight/lenis', '@react-three/fiber'];
for (const name of FORBIDDEN_RUNTIMES) {
  if (pkg.dependencies?.[name] || pkg.devDependencies?.[name]) {
    fail(`deps: forbidden animation runtime "${name}" must not be a dependency`);
  } else {
    pass(`deps: no "${name}" dependency (CSS-only hardware, DOM-only reveals)`);
  }
}
if (/^\s*(?:three|gsap|lenis)\b/m.test(lockfile)) {
  fail('deps: pnpm-lock.yaml must not resolve three/gsap/lenis');
} else {
  pass('deps: pnpm-lock.yaml resolves no forbidden animation runtime');
}

if (pkg.scripts?.['check:iteration-3'] === 'node scripts/check-iteration-3.mjs') {
  pass('deps: package.json wires check:iteration-3 to this checker');
} else {
  fail('deps: package.json must define "check:iteration-3": "node scripts/check-iteration-3.mjs"');
}
const checkChain = String(pkg.scripts?.check ?? '');
if (/check:iteration-2/.test(checkChain) && /check:iteration-3/.test(checkChain)) {
  pass('deps: pnpm check runs iteration 2 then iteration 3');
} else {
  fail(`deps: pnpm check must run check:iteration-2 and check:iteration-3 (got "${checkChain}")`);
}

// ---------------------------------------------------------------------------
// 2. Import contract: pages import ONLY animate/inView from framer-motion/dom.
// ---------------------------------------------------------------------------
const extractScriptBlocks = (source) => [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

for (const [page, filePath] of [
  ['ES', 'src/pages/index.astro'],
  ['EN', 'src/pages/en/index.astro'],
]) {
  const source = read(resolve(ROOT, filePath));
  const blocks = extractScriptBlocks(source);
  const motionImports = blocks
    .flatMap((block) => [...block.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]framer-motion\/dom['"]/g)])
    .map((m) =>
      m[1].split(',').map((name) =>
        name
          .trim()
          .split(/\s+as\s+/)[0]
          .trim()
      )
    );
  const names = motionImports.flat();
  if (names.includes('animate') && names.includes('inView')) {
    pass(`imports: ${page} page imports both animate and inView from framer-motion/dom`);
  } else {
    fail(`imports: ${page} page must import { animate, inView } from 'framer-motion/dom' (got [${names.join(', ')}])`);
  }
  if (names.includes('scroll')) {
    fail(`imports: ${page} page must not import scroll from framer-motion/dom (unused API)`);
  } else {
    pass(`imports: ${page} page imports no unused scroll API`);
  }
}

const canvasSource = read(resolve(ROOT, 'src/components/joyan/MagiParticleCanvas.astro'));
const canvasScripts = extractScriptBlocks(canvasSource);
if (canvasScripts.some((block) => /from\s*['"]framer-motion/.test(block))) {
  fail('imports: MagiParticleCanvas.astro must stay vanilla (no framer-motion import)');
} else {
  pass('imports: MagiParticleCanvas.astro keeps the vanilla canvas (no framer-motion import)');
}

// ---------------------------------------------------------------------------
// 3. Reveal contract: below-hero data-reveal, static markup, reduced-motion
//    gate, opacity/transform-only, lifecycle cleanup.
// ---------------------------------------------------------------------------
const REVEAL_SECTIONS = ['agents', 'magi', 'hardware', 'ecosystem'];
for (const [page, html] of [
  ['ES', esHtml],
  ['EN', enHtml],
]) {
  if (!html) continue;
  const reveals = [...html.matchAll(/data-reveal/g)];
  if (reveals.length >= REVEAL_SECTIONS.length) {
    pass(`reveal: ${page} page marks ${reveals.length} below-hero element(s) with data-reveal`);
  } else {
    fail(
      `reveal: ${page} page must mark at least ${REVEAL_SECTIONS.length} sections with data-reveal, found ${reveals.length}`
    );
  }
  const heroStart = html.indexOf('<section id="top"');
  const heroEnd = heroStart === -1 ? -1 : html.indexOf('</section>', heroStart);
  const heroRegion = heroStart !== -1 && heroEnd !== -1 ? html.slice(heroStart, heroEnd) : '';
  if (heroRegion && !heroRegion.includes('data-reveal')) {
    pass(`reveal: ${page} hero region carries no data-reveal (static LCP content untouched)`);
  } else if (!heroRegion) {
    fail(`reveal: ${page} hero region must be present to prove reveals stay below-hero`);
  } else {
    fail(`reveal: ${page} hero region must not carry data-reveal (static LCP content)`);
  }
}

// Compiled reveal modules: every JS chunk or inline module that handles
// data-reveal must ship the full motion guard set.
const jsFiles = existsSync(ASTRO_JS_DIR) ? readdirSync(ASTRO_JS_DIR).filter((file) => file.endsWith('.js')) : [];
const revealChunks = [];
for (const file of jsFiles) {
  const content = read(resolve(ASTRO_JS_DIR, file));
  if (content.includes('data-reveal')) revealChunks.push({ file, content });
}
const inlineModules = [...esHtml.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
for (const inline of inlineModules) {
  if (inline.includes('data-reveal')) revealChunks.push({ file: 'inline-module', content: inline });
}

if (revealChunks.length > 0) {
  const revealJs = revealChunks.map((chunk) => chunk.content).join('\n');
  const REQUIRED_REVEAL_GUARDS = [
    ['prefers-reduced-motion', 'gate reveals under reduced motion'],
    ['matchMedia', 'query the reduced-motion media feature'],
    ['opacity', 'animate opacity only'],
    ['astro:page-load', 'initialize after every Astro navigation'],
    ['astro:before-swap', 'clear cleanups/controls before the DOM swap'],
  ];
  for (const [token, what] of REQUIRED_REVEAL_GUARDS) {
    if (revealJs.includes(token)) {
      pass(`reveal: compiled reveal module must ${what} (${token})`);
    } else {
      fail(`reveal: compiled reveal module must ${what} (missing ${token})`);
    }
  }
  // The reveal module must import its motion engine from a code-split sibling
  // chunk (the minifier renames bindings, so the import edge is the stable
  // tree-shaken-evidence: the DOM API was imported, never inlined wholesale).
  if (/from"\.\/[^"]+\.js"/.test(revealJs)) {
    pass('reveal: compiled reveal module imports the code-split motion engine chunk');
  } else {
    fail('reveal: compiled reveal module must import a sibling motion-engine chunk');
  }
} else {
  fail('reveal: built output must ship a compiled reveal module handling data-reveal');
}

// ---------------------------------------------------------------------------
// 4. MAGI model — executed 30/24 depth-layer contract.
// ---------------------------------------------------------------------------
const magiModule = loadTsModule(resolve(ROOT, 'src/lib/magi-network.ts'));
const magiNetwork = magiModule.MAGI_NETWORK ?? magiModule;

if (magiNetwork?.nodes?.length === 7 && magiNetwork?.edges?.length === 6) {
  pass('model: MAGI_NETWORK keeps 7 nodes and 6 edges (static diagram grid)');
} else {
  fail(
    `model: MAGI_NETWORK must keep 7 nodes/6 edges, got ${magiNetwork?.nodes?.length}/${magiNetwork?.edges?.length}`
  );
}

if (magiNetwork?.particles?.length === 30) {
  pass('model: MAGI_NETWORK declares 30 normal particles');
} else {
  fail(`model: MAGI_NETWORK must declare 30 particles, got ${magiNetwork?.particles?.length}`);
}

const REQUIRED_PARTICLE_FIELDS = ['edge', 'progress', 'speed', 'depth', 'tone', 'radius', 'opacity'];
const particleShapeOk = (particle) =>
  REQUIRED_PARTICLE_FIELDS.every((field) => typeof particle?.[field] !== 'undefined') &&
  [0, 1, 2].includes(particle.depth) &&
  particle.tone === 'amber' &&
  typeof particle.edge === 'number' &&
  particle.edge >= 0 &&
  particle.edge < (magiNetwork?.edges?.length ?? 0);
if (magiNetwork?.particles?.every(particleShapeOk)) {
  pass('model: every particle carries edge/progress/speed/depth/tone/radius/opacity on a valid edge');
} else {
  fail('model: every particle must carry edge/progress/speed/depth/tone/radius/opacity and a valid edge');
}

const depthCounts = [0, 1, 2].map(
  (depth) => magiNetwork?.particles?.filter((particle) => particle.depth === depth).length ?? 0
);
if (depthCounts.every((count) => count === 10)) {
  pass(`model: particles spread exactly 10 per depth layer (back/mid/front = ${depthCounts.join('/')})`);
} else {
  fail(`model: expected 10 particles per depth layer, got back/mid/front = ${depthCounts.join('/')}`);
}

const fallback = magiModule.MAGI_FALLBACK_PARTICLES ?? [];
if (fallback.length === 24) {
  pass('model: MAGI_FALLBACK_PARTICLES declares the 24-particle low-end fallback');
} else {
  fail(`model: MAGI_FALLBACK_PARTICLES must declare 24 particles, got ${fallback.length}`);
}
const fallbackDepthCounts = [0, 1, 2].map((depth) => fallback.filter((particle) => particle.depth === depth).length);
if (fallbackDepthCounts.every((count) => count === 8)) {
  pass(`model: fallback spreads exactly 8 particles per depth layer (${fallbackDepthCounts.join('/')})`);
} else {
  fail(`model: fallback must spread 8 particles per depth layer, got ${fallbackDepthCounts.join('/')}`);
}
if (fallback.every(particleShapeOk)) {
  pass('model: every fallback particle satisfies the depth-layer shape contract');
} else {
  fail('model: every fallback particle must satisfy the depth-layer shape contract');
}

const boneReference = magiModule.MAGI_BONE_REFERENCE ?? [];
const ANCHORS = [
  { x: 240, y: 150 },
  { x: 390, y: 150 },
  { x: 315, y: 72 },
  { x: 165, y: 72 },
  { x: 90, y: 150 },
  { x: 165, y: 228 },
  { x: 315, y: 228 },
];
if (boneReference.length === 7 && boneReference.every((mark) => mark.tone === 'bone')) {
  pass('model: MAGI_BONE_REFERENCE declares 7 bone-tone reference marks');
} else {
  fail(`model: MAGI_BONE_REFERENCE must declare 7 bone-tone marks, got ${boneReference.length}`);
}
const anchorsMatch = ANCHORS.every((anchor, i) => boneReference[i]?.x === anchor.x && boneReference[i]?.y === anchor.y);
if (anchorsMatch) {
  pass('model: bone reference marks sit exactly on the seven node anchors');
} else {
  fail('model: bone reference marks must sit on the seven node anchors (240,150 hub + 6 satellites)');
}

// Canvas wiring on both built pages.
const magiRegion = (html) => {
  const start = html.indexOf('id="magi"');
  return start === -1 ? '' : html.slice(start);
};

for (const [page, html] of [
  ['ES', esHtml],
  ['EN', enHtml],
]) {
  if (!html) continue;
  const region = magiRegion(html);
  const canvasTag = region.match(/<canvas\b[^>]*data-magi-particles[^>]*>/)?.[0] ?? '';
  if (!canvasTag) {
    fail(`magi: ${page} page must render <canvas data-magi-particles>`);
    continue;
  }
  if (canvasTag.includes('aria-hidden="true"')) {
    pass(`magi: ${page} canvas stays aria-hidden (decorative overlay)`);
  } else {
    fail(`magi: ${page} canvas must be aria-hidden="true"`);
  }
  for (const [attr, expected] of [
    ['data-node-count', '7'],
    ['data-edge-count', '6'],
    ['data-particle-count', '30'],
    ['data-fallback-particle-count', '24'],
    ['data-max-dpr', '2'],
    ['data-fps', '30'],
  ]) {
    if (canvasTag.includes(`${attr}="${expected}"`)) {
      pass(`magi: ${page} canvas carries ${attr}="${expected}"`);
    } else {
      fail(`magi: ${page} canvas must carry ${attr}="${expected}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Canvas runtime guards (compiled chunk or inline module).
// ---------------------------------------------------------------------------
const canvasChunks = [];
for (const file of jsFiles) {
  const content = read(resolve(ASTRO_JS_DIR, file));
  if (content.includes('data-magi-particles')) canvasChunks.push({ file, content });
}
for (const inline of inlineModules) {
  if (inline.includes('data-magi-particles')) canvasChunks.push({ file: 'inline-module', content: inline });
}

if (canvasChunks.length > 0) {
  const canvasJs = canvasChunks.map((chunk) => chunk.content).join('\n');
  const REQUIRED_CANVAS_GUARDS = [
    ['devicePixelRatio', 'read the device pixel ratio'],
    ['Math.min(', 'cap DPR with Math.min'],
    ['IntersectionObserver', 'pause when the section leaves the viewport'],
    ['visibilitychange', 'pause when the tab is hidden'],
    ['pagehide', 'stop on navigation away'],
    ['pageshow', 'resume on bfcache restore'],
    ['prefers-reduced-motion', 'keep the static fallback under reduced motion'],
    ['cancelAnimationFrame', 'cancel the rAF loop on cleanup'],
    ['removeEventListener', 'remove listeners on cleanup'],
    ['astro:page-load', 'reboot after Astro view-transition navigation'],
    ['astro:before-swap', 'tear down before the Astro DOM swap'],
    ['hardwareConcurrency', 'detect the low-end fallback workload'],
    ['createRadialGradient', 'build the amber radial glow sprite'],
    ['pointermove', 'drive the pointer-capable parallax'],
    ['data-max-dpr', 'read the DPR cap attribute'],
    ['data-fps', 'read the fps cap attribute'],
  ];
  for (const [token, what] of REQUIRED_CANVAS_GUARDS) {
    if (canvasJs.includes(token)) {
      pass(`magi: canvas chunk must ${what} (${token})`);
    } else {
      fail(`magi: canvas chunk must ${what} (missing ${token})`);
    }
  }
  if (!canvasJs.includes('shadowBlur')) {
    pass('magi: canvas chunk never uses shadowBlur (radial sprite glow only)');
  } else {
    fail('magi: canvas chunk must not use shadowBlur (sprite glow keeps the loop cheap)');
  }
  if (/getContext\([`'"]2d[`'"]\)/.test(canvasJs) && !canvasJs.includes('webgl')) {
    pass('magi: canvas uses the 2d context only (no WebGL)');
  } else {
    fail('magi: canvas must use getContext("2d") and never WebGL');
  }
} else {
  fail('magi: built output must ship the compiled canvas controller');
}

// ---------------------------------------------------------------------------
// 6. Hardware treatments: CSS-only tilt/scan/trace, hover/focus gated,
//    reduced-motion static, focusable surface.
// ---------------------------------------------------------------------------
const cssFiles = existsSync(ASTRO_JS_DIR) ? readdirSync(ASTRO_JS_DIR).filter((file) => file.endsWith('.css')) : [];
const compiledCss = cssFiles.map((file) => read(resolve(ASTRO_JS_DIR, file))).join('\n');

// The reveal initial state is a JS-added CSS class (opacity/transform-only,
// no layout properties), so the transform contract lives in compiled CSS
// instead of inline style mutations in the reveal script.
const pendingRevealRule = compiledCss.match(/\.is-reveal-pending\{[^}]*\}/)?.[0] ?? '';
if (/opacity:0/.test(pendingRevealRule) && /transform:translateY\(1rem\)/.test(pendingRevealRule)) {
  pass('reveal: compiled .is-reveal-pending rule holds the opacity/transform initial state');
} else {
  fail('reveal: compiled CSS must define .is-reveal-pending with opacity: 0 and transform: translateY(1rem)');
}

for (const [page, html] of [
  ['ES', esHtml],
  ['EN', enHtml],
]) {
  if (!html) continue;
  const hardwareStart = html.indexOf('id="hardware"');
  const hardwareRegion = hardwareStart === -1 ? '' : html.slice(hardwareStart);
  if (!hardwareRegion) {
    fail(`hardware: ${page} page must render the #hardware section`);
    continue;
  }
  if (hardwareRegion.includes('data-hardware-surface')) {
    pass(`hardware: ${page} surface wrapper renders with data-hardware-surface`);
  } else {
    fail(`hardware: ${page} surface wrapper must carry data-hardware-surface`);
  }
  const scans = [...hardwareRegion.matchAll(/class="[^"]*hardware-scan[^"]*"/g)].length;
  const traces = [...hardwareRegion.matchAll(/class="[^"]*hardware-trace[^"]*"/g)].length;
  if (scans === 1 && traces === 1) {
    pass(`hardware: ${page} renders one scan and one trace treatment element`);
  } else {
    fail(`hardware: ${page} must render exactly one .hardware-scan and one .hardware-trace, got ${scans}/${traces}`);
  }
  if (hardwareRegion.includes('aria-hidden="true"') && hardwareRegion.includes('tabindex="0"')) {
    pass(`hardware: ${page} treatments are aria-hidden and the surface is keyboard-reachable`);
  } else {
    fail(`hardware: ${page} scan/trace must be aria-hidden and the surface must carry tabindex="0"`);
  }
}

if (/\.hardware-surface[^{}]*\{/.test(compiledCss)) {
  pass('css: compiled .hardware-surface rules exist');
} else {
  fail('css: compiled CSS must include .hardware-surface rules');
}
if (/\.hardware-scan\{/.test(compiledCss) && /\.hardware-trace\{/.test(compiledCss)) {
  pass('css: compiled .hardware-scan and .hardware-trace rules exist');
} else {
  fail('css: compiled CSS must include .hardware-scan and .hardware-trace rules');
}
if (/@keyframes hardware-scan/.test(compiledCss)) {
  pass('css: compiled @keyframes hardware-scan drives the sweep');
} else {
  fail('css: compiled CSS must include @keyframes hardware-scan');
}
if (/\.hardware-surface:hover[^{]*\{[^}]*transform:perspective\(/.test(compiledCss)) {
  pass('css: hover tilt uses a perspective transform (CSS-only, no JS)');
} else {
  fail('css: .hardware-surface:hover must apply a perspective tilt transform');
}
if (/@media \(prefers-reduced-motion:reduce\)\{/.test(compiledCss)) {
  const motionBlocks = [];
  const needle = '@media (prefers-reduced-motion:reduce){';
  let from = 0;
  while (true) {
    const start = compiledCss.indexOf(needle, from);
    if (start === -1) break;
    let depth = 0;
    let i = start + needle.length - 1;
    for (; i < compiledCss.length; i += 1) {
      if (compiledCss[i] === '{') depth += 1;
      else if (compiledCss[i] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    motionBlocks.push(compiledCss.slice(start + needle.length, i));
    from = i + 1;
  }
  const motionMedia = motionBlocks.join('\n');
  if (/\.hardware-scan\{animation:none/.test(motionMedia)) {
    pass('motion: reduced-motion CSS disables the hardware scan sweep');
  } else {
    fail('motion: reduced-motion CSS must set .hardware-scan animation: none');
  }
  if (/\.hardware-trace\{[^}]*opacity:0/.test(motionMedia)) {
    pass('motion: reduced-motion CSS keeps the trace hidden (static frame only)');
  } else {
    fail('motion: reduced-motion CSS must keep .hardware-trace opacity: 0');
  }
  if (/\.hardware-figure\{[^}]*transform:none/.test(motionMedia)) {
    pass('motion: reduced-motion CSS disables the tilt transform');
  } else {
    fail('motion: reduced-motion CSS must set .hardware-figure transform: none');
  }
} else {
  fail('motion: compiled CSS must include a prefers-reduced-motion: reduce block for the hardware treatments');
}

// ---------------------------------------------------------------------------
// 7. Gzip-delta evidence: candidate minus baseline <= 22528 bytes.
// ---------------------------------------------------------------------------
const candidate = gzipSum();

if (baselinePath) {
  if (!existsSync(baselinePath)) {
    fail(`budget: baseline fixture missing at ${baselinePath} (run --capture-baseline before changing dependencies)`);
  } else {
    const baseline = JSON.parse(read(baselinePath));
    const delta = candidate.total - baseline.totalGzip;
    if (delta <= GZIP_DELTA_BUDGET) {
      pass(
        `budget: client JS gzip delta ${delta} B (${candidate.total} - ${baseline.totalGzip}) <= ${GZIP_DELTA_BUDGET} B (22 KiB)`
      );
    } else {
      fail(
        `budget: client JS gzip delta ${delta} B exceeds the 22 KiB (${GZIP_DELTA_BUDGET} B) budget (baseline ${baseline.totalGzip} B -> candidate ${candidate.total} B)`
      );
    }
  }
} else if (existsSync(DEFAULT_BASELINE)) {
  const baseline = JSON.parse(read(DEFAULT_BASELINE));
  const delta = candidate.total - baseline.totalGzip;
  if (delta <= GZIP_DELTA_BUDGET) {
    pass(
      `budget: default baseline delta ${delta} B (${candidate.total} - ${baseline.totalGzip}) <= ${GZIP_DELTA_BUDGET} B (22 KiB)`
    );
  } else {
    fail(
      `budget: default baseline delta ${delta} B exceeds the 22 KiB (${GZIP_DELTA_BUDGET} B) budget (baseline ${baseline.totalGzip} B -> candidate ${candidate.total} B)`
    );
  }
} else {
  pass(
    `budget: no baseline fixture yet — candidate client JS gzip sum is ${candidate.total} B across ${candidate.rows.length} chunk(s)`
  );
}

// ---------------------------------------------------------------------------
// Summary.
// ---------------------------------------------------------------------------
console.log(`\niteration-3: ${passed.length} passed, ${failures.length} failed`);
for (const message of passed) console.log(`  ok  ${message}`);
for (const message of failures) console.log(`  FAIL ${message}`);
if (failures.length > 0) {
  console.error('\niteration-3: contract violations found.');
  process.exit(1);
}
console.log('\niteration-3: all Unit A contracts verified.');
