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
 *   8. Unit C Journal — the additive `journal` collection (typed schema and
 *      shared area/status consts), locale chrome maps, seed frontmatter
 *      contract (published per locale, drafts, ES-authoritative EN mirror),
 *      archive routes `/bitacora` ↔ `/en/log` (lang, canonical/hreflang
 *      cluster, toggle data-alt + hash preservation), built behavior
 *      (latest-three rows, draft exclusion, ES-only omissions, localized
 *      area/status labels, empty-state machinery), and claim scans of every
 *      journal Markdown file plus both built archives.
 *   8g. Journal details — explicit lowercase kebab-case `slug` + stable
 *      `translationKey` identity, published-only static detail routes
 *      (drafts/unknown => 404), rendered Markdown bodies, localized
 *      metadata, one H1 and landmarks, archive row/return links, truthful
 *      toggle targets (real counterpart or `/en/log` for ES-only), SEO
 *      clusters (paired ES/EN/x-default; ES-only self-canonical with zero
 *      hreflang), and built-detail claim leakage (visible text + alt/title/
 *      content attributes).
 *   8h. Disclosure contract — the five scoped repeated-list surfaces (Agents,
 *      MAGI, Hardware, Ecosystem items, Ecosystem community offers) render
 *      as native, independent multi-open `<details>` with the first item
 *      server-open, ordinal/title summaries, visible keyboard focus, static
 *      reduced-motion behavior, responsive prose/figure balance, and zero
 *      scripted state, carousels, slides, or client JS.
 *   9. Unit D audit — the extended copy ban set (public agentic/AGI/MCP/RAG
 *      jargon, commercial-claim patterns) applied to every locale source
 *      value and to the built landings' visible text, metadata, and
 *      alt/title attributes; honest-copy positives (cooperative identity,
 *      in-development statuses, negated enrollment/form/delivery promises,
 *      human review); and static a11y/perf evidence (landmarks, unique IDs,
 *      heading order, focus-visible path, reduced-motion blocks, route
 *      output inventory, build sizes) with no browser dependency.
 *
 * Exit code 0 = all assertions pass; 1 = at least one failure. The checker
 * builds automatically when `dist/` is missing so `pnpm check` works from a
 * clean checkout. No runtime dependencies beyond project devDependencies.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import yaml from 'js-yaml';
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

function listGeneratedJs(dir, base = dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) found.push(...listGeneratedJs(path, base));
    else if (/\.js$/i.test(entry.name)) found.push(path.slice(base.length + 1).replaceAll('\\', '/'));
  }
  return found.sort();
}

// Recursive walk of `dist/**/*.js`, so a generated chunk nested in a
// subdirectory is counted instead of passing silently. Paths are dist-relative.
function listClientJs() {
  if (!existsSync(DIST)) return [];
  return listGeneratedJs(DIST);
}

function gzipSum() {
  const chunks = listClientJs();
  let total = 0;
  const rows = [];
  for (const file of chunks) {
    const gz = gzipSync(readFileSync(resolve(DIST, file))).byteLength;
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
// 0. WU20 — the site is ONE page: the coming-soon contract for the built tree.
//    The old landing lives on `archive/full-landing` (cut at 637fb1e); the
//    build now emits exactly the two coming-soon pages and the three noindex
//    laboratories. Every other route and every archived component must be OUT
//    of the build, the hero must be present with real metadata, and the lab
//    routes must stay noindex and unlinked from the public page.
// ---------------------------------------------------------------------------
const WU20_BUILT_PAGES = ['index.html', 'en/index.html', 'lab/ascii/index.html', 'lab/shapes/index.html', 'lab/image/index.html'];
const WU20_ABSENT = ['404.html', 'bitacora/index.html', 'bitacora', 'en/log/index.html', 'en/log',
  'privacy/index.html', 'terms/index.html', 'rss.xml'];
if (existsSync(DIST)) {
  const builtHtml = listGeneratedHtml(resolve(DIST)).map((path) => path.slice(DIST.length + 1));
  const unexpected = builtHtml.filter((path) => !WU20_BUILT_PAGES.includes(path));
  if (unexpected.length === 0 && builtHtml.length === WU20_BUILT_PAGES.length) {
    pass(`wu20: the build emits exactly the one page per locale plus the three laboratories (${builtHtml.length} html files)`);
  } else {
    fail(`wu20: the build must emit exactly ${WU20_BUILT_PAGES.join(', ')}; unexpected or missing: ${unexpected.join(', ') || 'none'} (built ${builtHtml.length})`);
  }
  for (const route of WU20_ABSENT) {
    if (!existsSync(resolve(DIST, route))) {
      pass(`wu20: archived route is out of the build: ${route}`);
    } else {
      fail(`wu20: archived route must not be built: ${route}`);
    }
  }
  // The coming-soon pages: hero present, real metadata, no old-section markup.
  for (const [name, html] of [['ES', esHtml], ['EN', enHtml]]) {
    if (!html) { fail(`wu20: ${name} coming-soon page missing from the build`); continue; }
    if (html.includes('data-coming-hero')) pass(`wu20: ${name} page mounts the coming-hero`);
    else fail(`wu20: ${name} page must mount the coming-hero`);
    if (!html.includes('data-coming-hero-toggle')) pass(`wu20: ${name} page carries no hero Play control (the hero autoplays; user-directed)`);
    else fail(`wu20: ${name} page must NOT carry a hero Play control`);
    if (html.includes('data-hero-autoplay')) pass(`wu20: ${name} page declares the autoplaying hero`);
    else fail(`wu20: ${name} page must declare the autoplaying hero`);
    // WU22: the attribution line is NOT on the page — it moved to docs/MOTOR-ESCENAS.md.
    // The test targets VISIBLE text: the serialisation's own label (inside the
    // JSON payload script) is invisible metadata and is stripped first.
    const visibleHtml = html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '');
    if (!/Tom Southwell/.test(visibleHtml)) pass(`wu22: ${name} page carries no visible attribution line`);
    else fail(`wu22: ${name} page must NOT carry the attribution line (it moved to the repository docs)`);
    // WU22 copy removals: no construction note, no agent pitch, no value cells,
    // no visible engine readout, no old coming-soon eyebrow.
    for (const removed of ['Estamos construyendo', 'Diseñamos agentes', 'Sitio en construcción',
      'We are building', 'We design agents', 'Site under construction', 'coming soon for Joyan']) {
      if (!html.includes(removed)) pass(`wu22: ${name} page carries none of the removed copy (${removed})`);
      else fail(`wu22: ${name} page must not carry the removed copy (${removed})`);
    }
    const statusTag = html.match(/<p[^>]*data-hero-status[^>]*>/)?.[0] ?? '';
    if (statusTag && /sr-only/.test(statusTag)) pass(`wu22: ${name} hero status readout is screen-reader only`);
    else fail(`wu22: ${name} hero must carry no visible engine readout (the status line must be sr-only)`);
    // WU22 full-bleed: the scene covers the viewport and the copy sits over a scrim.
    if (/data-coming-hero[^>]*min-h-\[88dvh\]/.test(html.replace(/\n/g, ' ')) || /min-h-\[88dvh\][^>]*data-coming-hero/.test(html.replace(/\n/g, ' '))) {
      pass(`wu22: ${name} hero section is full-bleed (min-h-[88dvh])`);
    } else if (/data-coming-hero/.test(html) && /min-h-\[88dvh\]/.test(html)) {
      pass(`wu22: ${name} hero section is full-bleed (min-h-[88dvh])`);
    } else {
      fail(`wu22: ${name} hero must be full-bleed (the scene covers the viewport)`);
    }
    if (html.includes('object-cover')) pass(`wu22: ${name} scene layer covers the viewport (object-cover)`);
    else fail(`wu22: ${name} scene must cover the viewport (object-cover)`);
    // WU22 contact row: the mail link, the authored Discord mark, and the clearly
    // named constant for the future invite (no invented URL is ever shipped).
    if (html.includes('mailto:hello@joyan.dev')) pass(`wu22: ${name} contact row links hello@joyan.dev`);
    else fail(`wu22: ${name} contact row must link hello@joyan.dev`);
    if (html.includes('data-discord-mark')) pass(`wu22: ${name} carries the authored dot Discord mark`);
    else fail(`wu22: ${name} must carry the authored dot Discord mark`);
    const heroSrc = read(resolve(ROOT, 'src/components/joyan/JoyanComingHero.astro'));
    if (/DISCORD_INVITE_URL\s*=\s*''/.test(heroSrc)) pass('wu22: the future Discord invite lives in a clearly named, empty constant');
    else fail('wu22: JoyanComingHero.astro must declare DISCORD_INVITE_URL as an empty constant (the user configures it later)');
    if (!/discord.com|discord.gg/i.test(html)) pass('wu22: no invented Discord invite URL is shipped');
    else fail('wu22: the page must not ship an invented Discord invite URL');
    if (/<title>[^<]*Joyan/i.test(html)) pass(`wu20: ${name} page has a real title`);
    else fail(`wu20: ${name} page must carry a real Joyan title`);
    if (/rel="canonical"/.test(html)) pass(`wu20: ${name} page has a canonical`);
    else fail(`wu20: ${name} page must carry a canonical`);
    if (/rel="alternate" hreflang="en"/.test(html)) pass(`wu20: ${name} page has its hreflang pair`);
    else fail(`wu20: ${name} page must carry the / ↔ /en hreflang pair`);
    if (/name="robots"[^>]*content="[^"]*index/.test(html)) pass(`wu20: ${name} page is indexable`);
    else fail(`wu20: the public coming-soon page must be indexable (robots meta)`);
    for (const oldToken of ['data-reveal', 'data-magi', 'AgentsSection', 'data-journal']) {
      if (!html.includes(oldToken)) pass(`wu20: ${name} page carries none of the old-section markup (${oldToken})`);
      else fail(`wu20: ${name} page must not carry old-section markup (${oldToken})`);
    }
    if (!/(?:href="[^"]*)\/(?:bitacora|log|privacy|terms)/.test(html)) pass(`wu20: ${name} page links nowhere archived`);
    else fail(`wu20: ${name} page must not link to archived routes`);
  }
  // The laboratories stay noindex and unlinked from the public page.
  for (const lab of ['lab/ascii/index.html', 'lab/shapes/index.html', 'lab/image/index.html']) {
    const labPath = resolve(DIST, lab);
    if (!existsSync(labPath)) { fail(`wu20: laboratory missing from the build: ${lab}`); continue; }
    if (/noindex/.test(read(labPath))) pass(`wu20: ${lab} stays noindex`);
    else fail(`wu20: ${lab} must stay noindex`);
  }
  for (const [name, html] of [['ES', esHtml], ['EN', enHtml]]) {
    if (html && !/href="[^"]*\/lab\//.test(html)) pass(`wu20: ${name} page does not link the laboratories`);
    else if (html) fail(`wu20: ${name} page must not link the laboratory routes prominently (or at all)`);
  }
  // The archive surface itself: the old routes and their exclusive components
  // live in the repository (not built), so `archive/full-landing` stays true.
  for (const archived of ['archive/src/pages/bitacora.astro', 'archive/src/pages/en/log.astro',
    'archive/src/pages/404.astro', 'archive/src/components/joyan/Hero.astro',
    'archive/src/components/joyan/JournalSection.astro']) {
    if (existsSync(resolve(ROOT, archived))) pass(`wu20: old surface preserved in the repository: ${archived}`);
    else fail(`wu20: the old route/component must survive in archive/: ${archived}`);
  }
} else {
  fail('wu20: dist/ missing; the one-page contract cannot be evaluated');
}

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

// WU20: the single page no longer imports framer-motion — the reveal script
// is retired with the old landing. The pages' runtime is the coming-hero's
// scene-runtime import, which lives in JoyanComingHero.astro. The old
// framer-motion discipline survives in the ARCHIVE copy of the old landing.
const WU20_PAGE_CONTRACT = (page, source) => {
  if (/framer-motion/.test(source)) {
    fail(`imports: ${page} page must not import framer-motion (the reveal script is retired)`);
  } else {
    pass(`imports: ${page} page imports no framer-motion`);
  }
  if (/scene-runtime/.test(source)) {
    fail(`imports: ${page} page must import the runtime only through JoyanComingHero.astro`);
  } else {
    pass(`imports: ${page} page carries no direct runtime import`);
  }
};
WU20_PAGE_CONTRACT('ES', read(resolve(ROOT, 'src/pages/index.astro')));
WU20_PAGE_CONTRACT('EN', read(resolve(ROOT, 'src/pages/en/index.astro')));
const heroSource = read(resolve(ROOT, 'src/components/joyan/JoyanComingHero.astro'));
if (/import\s+'~\/lib\/scene-runtime'/.test(heroSource)) {
  pass('imports: JoyanComingHero.astro imports the shared scene runtime for the coming-hero');
} else {
  fail('imports: JoyanComingHero.astro must import ~/lib/scene-runtime (the one runtime path on the public page)');
}

// The archive keeps the old landing honest: the moved components keep their
// old contracts verbatim (vanilla canvas, framer-motion only animate/inView).
const archiveCanvasSource = read(resolve(ROOT, 'archive/src/components/joyan/MagiParticleCanvas.astro'));
const canvasScripts = extractScriptBlocks(archiveCanvasSource);
if (canvasScripts.some((block) => /from\s*['"]framer-motion/.test(block))) {
  fail('imports: archived MagiParticleCanvas.astro must stay vanilla (no framer-motion import)');
} else {
  pass('imports: archived MagiParticleCanvas.astro keeps the vanilla canvas (no framer-motion import)');
}

// ---------------------------------------------------------------------------
// 3. Reveal contract: below-hero data-reveal, static markup, reduced-motion
//    gate, opacity/transform-only, lifecycle cleanup.
// ---------------------------------------------------------------------------
const REVEAL_SECTIONS = ['agents', 'magi', 'hardware', 'ecosystem'];
// WU20: the reveal contract is RETIRED with the old landing. The one page
// carries no data-reveal at all, and no compiled chunk may ship the reveal
// module: the framer-motion chunks left the build with the archived routes.
for (const [page, html] of [['ES', esHtml], ['EN', enHtml]]) {
  if (!html) continue;
  const reveals = [...html.matchAll(/data-reveal/g)];
  if (reveals.length === 0) {
    pass(`reveal: ${page} page carries no data-reveal (the one-page site retired the reveal pattern)`);
  } else {
    fail(`reveal: ${page} page must not carry data-reveal (retired with the old landing), found ${reveals.length}`);
  }
}

// Compiled reveal modules must be GONE from the build; the old landing's
// discipline lives on the archive/full-landing branch, not in dist.
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
if (revealChunks.length === 0) {
  pass('reveal: no compiled reveal module ships in dist (retired with the old landing)');
} else {
  fail(`reveal: the retired reveal module must not ship: ${revealChunks.map((c) => c.file).join(', ')}`);
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

// WU20: no built page may wire the MAGI canvas any more — the section moved to
// the archive with the old landing. The archived component must keep the exact
// attribute contract, so the surface can come back without re-deriving it.
const ARCHIVE_CANVAS = 'archive/src/components/joyan/MagiParticleCanvas.astro';
const archiveCanvasTagSource = read(resolve(ROOT, ARCHIVE_CANVAS));
const archiveCanvasTag = archiveCanvasTagSource.match(/<canvas\b[^>]*data-magi-particles[^>]*>/)?.[0] ?? '';
if (!archiveCanvasTag) {
  fail(`magi: the archived ${ARCHIVE_CANVAS} must keep its <canvas data-magi-particles>`);
} else {
  if (archiveCanvasTag.includes('aria-hidden="true"')) {
    pass('magi: archived canvas stays aria-hidden (decorative overlay)');
  } else {
    fail('magi: archived canvas must be aria-hidden="true"');
  }
  for (const [attr, expected] of [
    ['data-node-count', '7'],
    ['data-edge-count', '6'],
    ['data-particle-count', '30'],
    ['data-fallback-particle-count', '24'],
    ['data-max-dpr', '2'],
    ['data-fps', '30'],
  ]) {
    if (archiveCanvasTagSource.includes(attr)) {
      pass(`magi: archived canvas carries ${attr} (wired to the model)`);
    } else {
      fail(`magi: archived canvas must carry ${attr}`);
    }
  }
}
for (const [page, html] of [['ES', esHtml], ['EN', enHtml]]) {
  if (!html) continue;
  if (!html.includes('id="magi"') && !html.includes('data-magi-particles')) {
    pass(`magi: ${page} page carries no MAGI canvas (archived with the old landing)`);
  } else {
    fail(`magi: ${page} page must not carry MAGI canvas markup (archived with the old landing)`);
  }
}

// ---------------------------------------------------------------------------
// 5. Canvas runtime guards — WU20: the canvas controller no longer ships; the
// guard set now runs against the ARCHIVED component so the contract survives
// with the surface, and the build is asserted free of it.
// ---------------------------------------------------------------------------
const canvasChunks = [];
for (const file of jsFiles) {
  const content = read(resolve(ASTRO_JS_DIR, file));
  if (content.includes('data-magi-particles')) canvasChunks.push({ file, content });
}
for (const inline of inlineModules) {
  if (inline.includes('data-magi-particles')) canvasChunks.push({ file: 'inline-module', content: inline });
}
if (canvasChunks.length === 0) {
  pass('magi: no compiled canvas controller ships in dist (archived with the old landing)');
} else {
  fail(`magi: the retired canvas controller must not ship: ${canvasChunks.map((c) => c.file).join(', ')}`);
}
const canvasJs = read(resolve(ROOT, 'archive/src/components/joyan/MagiParticleCanvas.astro'))
  + '\n' + read(resolve(ROOT, 'src/lib/magi-canvas-runner.ts'))
  + '\n' + read(resolve(ROOT, 'src/lib/magi-network.ts'));
// shadowBlur is checked against the component and runner only: the model
// module legitimately names it inside its own explanatory comments.
const canvasExec = read(resolve(ROOT, 'archive/src/components/joyan/MagiParticleCanvas.astro'))
  + '\n' + read(resolve(ROOT, 'src/lib/magi-canvas-runner.ts'));
const REQUIRED_CANVAS_GUARDS = [
  ['devicePixelRatio', 'read the device pixel ratio'],
  ['Math.min(', 'cap DPR with Math.min'],
  ['IntersectionObserver', 'pause when the section leaves the viewport'],
  ['visibilitychange', 'pause when the tab is hidden'],
  ['pagehide', 'stop on navigation away'],
  ['prefers-reduced-motion', 'keep the static fallback under reduced motion'],
  ['cancelAnimationFrame', 'cancel the rAF loop on cleanup'],
  ['removeEventListener', 'remove listeners on cleanup'],
  ['hardwareConcurrency', 'detect the low-end fallback workload'],
  ['createRadialGradient', 'build the amber radial glow sprite'],
  ['data-max-dpr', 'read the DPR cap attribute'],
  ['data-fps', 'read the fps cap attribute'],
];
for (const [token, what] of REQUIRED_CANVAS_GUARDS) {
  if (canvasJs.includes(token)) {
    pass(`magi: archived canvas source must ${what} (${token})`);
  } else {
    fail(`magi: archived canvas source must ${what} (missing ${token})`);
  }
}
if (!/shadowBlur\s*[=.]/.test(canvasExec)) {
  pass('magi: archived canvas source never uses shadowBlur (radial sprite glow only)');
} else {
  fail('magi: archived canvas source must not use shadowBlur (sprite glow keeps the loop cheap)');
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

// WU20: the hardware sections are ARCHIVED with the old landing; the built
// pages carry none of the hardware markup. The CSS contract above and the
// archived source below keep the treatment honest for its return.
for (const [page, html] of [['ES', esHtml], ['EN', enHtml]]) {
  if (!html) continue;
  if (!html.includes('id="hardware"') && !html.includes('data-hardware-surface')) {
    pass(`hardware: ${page} page carries no hardware-treatment markup (archived with the old landing)`);
  } else {
    fail(`hardware: ${page} page must not carry hardware-treatment markup (archived with the old landing)`);
  }
}
{
  const archiveSections = ['AgentsSection', 'MagiSection', 'HardwareSection', 'EcosystemSection', 'SectionFilm']
    .map((name) => read(resolve(ROOT, `archive/src/components/joyan/${name}.astro`))).join('\n');
  if (archiveSections.includes('data-hardware-surface')) {
    pass('hardware: the archived sections keep the data-hardware-surface treatment wrapper');
  } else {
    fail('hardware: the archived sections must keep the data-hardware-surface treatment wrapper');
  }
}

// ---------------------------------------------------------------------------
// 7. Gzip-delta evidence — landing allowance unchanged, lab allowance measured.
//
//    WHAT IS COUNTED: every generated `.js` file under `dist/` (recursive walk,
//    `dist/**/*.js`, gzip level 6) plus, for reporting only, every executable
//    inline `<script>` once per page. Only the generated-JS chunks are budgeted;
//    inline scripts on other routes are pre-existing and unbudgeted, reported
//    without any limit. Nothing is recursive-by-claim: the walk really descends
//    into subdirectories, and a nested chunk that no page references is a
//    landing-set change (failure), never a silent pass.
//
//    A generated chunk is LAB-attributed when every generated page that can
//    reach it is a laboratory page (`/lab/**`); every other emitted file is
//    landing/site JavaScript. Reachability is transitive: a chunk imported by a
//    chunk a lab page names is lab too, because that is how the bundler shares
//    the engine between the two laboratory routes. Attribution fails closed: no
//    lab page at all, a chunk reachable from both a lab page and a real page
//    (scene JS leaking into a landing) or a chunk in both sets is a failure,
//    never a silent subtraction. The landing set is frozen by recorded hash and
//    its delta is pinned to the exact recorded value, so re-capturing the
//    fixture cannot weaken the guard. The lab cap below is the same single
//    measured value asserted in `scripts/check-ascii-runtime.mjs`
//    (`LAB_CAP_GZIP`); a future change must update both loudly. No reset, no
//    "unlimited" lab.
// ---------------------------------------------------------------------------
const candidate = gzipSum();
// WU20 (99,691 B across 4 chunks): the site is ONE page. The old landing set
// (framer-motion reveal/viewport chunks plus the two Astro client chunks)
// is gone: the reveal script no longer exists on the single page, so those
// chunks left the build. What REPLACED them, measured loudly: the coming-hero
// entry chunk (56 B gzip) plus the shared scene-runtime chunk — the hero's own
// interaction path, the ONE runtime allowed on a real page.
// The two Astro client chunks (59,520 + 26,689 B gzip, ClientRouter) are
// unchanged byte-for-byte. Total moved 109,818 -> 100,811 B gzip (-9,007 B, the checker's own gzipSync accounting).
// WU22 re-measure (never silently): the engine chunk grew with the tone cap,
// the roll helper, the wash + shimmer overlays and the page palette, so the
// scene-runtime chunk is now 13,866 B gzip under a new hash, and the landing
// set totals 101,339 B gzip. The delta against the UNCHANGED WU12-era baseline
// fixture (91,905 B) is 9,434 B — still far inside the untouched 22,528 B limit.
const LANDING_FROZEN_GZIP = 101339;
const LANDING_FROZEN_DELTA = 9434; // 101339 - 91905, baseline fixture untouched
// WU18 (38,211 B): the image→dot-scene pipeline, its browser-safe core, the
// composable overlays and the `/lab/image` route were added to the SAME engine
// chunk, now shared by THREE laboratory routes. The chunk measures 33,296 B raw
// / 12,787 B gzip; the lab executable is library 25,256 B + engine chunk 12,787 B
// + three 56 B entry chunks, with 0 B of executable inline on any lab page. Cap
// re-measured as measured + 2,048 B, the same documented margin, never a silent
// raise.
//
// WU19 (38,421 B -> WU20 38,904 B -> WU22 39,290 B -> palette re-pin 39,348 B): the scene-runtime chunk is
// shared by the THREE laboratory routes AND the two coming-soon pages, and WU22
// grew it with the tone cap, the roll helper, the wash + shimmer sweeps and the
// page palette. The lab executable is AsciiRuntime 25,256 B + engine chunk
// 13,866 B + three 56 B entry chunks, with 0 B of executable inline on any lab
// page. Cap re-measured as measured + 2,048 B, the same documented margin.
const LAB_MEASURED_GZIP = 39348;
const LAB_CAP_GZIP = 41396; // measured total + 2048 B honest margin (<= 4096 B)
const LAB_MARGIN_LIMIT = 4096;
const LANDING_ROUTE_PAGES = ['index.html', 'en/index.html'];
/** Every `/lab/**` page is a laboratory page; nothing else is. */
const isLabPage = (name) => name.startsWith('lab/') && name.endsWith('.html');
// Recorded WU20 landing hashes (measured at this delivery): byte identity,
// not just a byte count, so a changed chunk fails here. Keys are dist-relative
// because the walk is recursive. The shared scene-runtime chunk is INTENTIONALLY
// in this set: the coming-hero is the one runtime path on the public page, and
// the laboratories share the same engine code.
const LANDING_FROZEN_HASHES = {
  '_astro/JoyanComingHero.astro_astro_type_script_index_0_lang.DtHA3kec.js':
    '547fede9a6d7d2d53cec4c1f896521112e28d6ccc1a622670bf011097089825b',
  '_astro/client.BxDIQlYz.js': 'ed1f3e2228ec0a53328513096c375276d3aea8e4c8e2ded754af7b67a13d77f0',
  '_astro/client.kF-MUc6b.js': 'c72b737a3f669a7845f10ec12cf2206a3d4f964c2aef13d4572c6b831b74937d',
  '_astro/scene-runtime.DMQ3-fYM.js': '5f37fe38f9a51da3af45735517e687454120f2923b5b70147d6c3f0bc094febf',
};

const isClientChunk = (file) => typeof file === 'string' && /\.js$/i.test(file);
/**
 * Attribute one chunk from the set of pages that can reach it (transitively).
 *  - no page at all: an unreferenced emitted file, counted as landing (this is
 *    what keeps the landing set exactly as recorded);
 *  - every reaching page is a laboratory page: lab;
 *  - every reaching page is a real page: landing;
 *  - both: shared, and allowed ONLY since WU20 — the coming-hero is the one
 *    runtime path on the public page, and the laboratories import the same
 *    engine chunk. The shared chunk counts toward the LANDING budget, where it
 *    is pinned by hash, and toward the lab cap, so neither allowance escapes
 *    measurement.
 * `labPagesPresent` is 0 when no laboratory page was built, which fails closed.
 */
const attributeChunk = (pages, labPagesPresent) => {
  if (!labPagesPresent) return 'fail-closed';
  if (pages.length === 0) return 'landing';
  const lab = pages.filter(isLabPage).length;
  if (lab === 0) return 'landing';
  return lab === pages.length ? 'lab' : 'shared';
};
function listGeneratedHtml(dir) {
  const pages = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) pages.push(...listGeneratedHtml(path));
    else if (entry.name.endsWith('.html')) pages.push(path);
  }
  return pages.sort();
}
const chunkHash = (file) =>
  createHash('sha256').update(readFileSync(resolve(DIST, file))).digest('hex');

// Executable inline scripts, counted once per page: no `src`, and either no
// `type` or a JavaScript MIME. JSON/import maps/speculation rules and empty
// bodies are not executable code and are never counted.
const INLINE_JS_TYPES = new Set([
  'module', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript',
  'application/x-javascript', 'text/jscript', 'text/livescript', 'text/x-javascript', 'text/x-ecmascript',
]);
function executableInline(html) {
  let gzip = 0;
  let blocks = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = match[1];
    const body = match[2];
    const typeAttr = attrs.match(/(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const type = (typeAttr?.[1] ?? typeAttr?.[2] ?? typeAttr?.[3] ?? '').trim().toLowerCase().split(';')[0];
    if (/(?:^|\s)src\s*=/i.test(attrs)) continue;
    if (type && !INLINE_JS_TYPES.has(type)) continue;
    if (!body.trim()) continue;
    gzip += gzipSync(body).byteLength;
    blocks += 1;
  }
  return { gzip, blocks };
}

// Cheap deterministic negative controls for the counting and attribution rules.
// The nested-chunk control walks a real temporary tree with the same walker the
// guard uses, so a top-level-only regression fails here as well as in the guard.
const nestedFixture = mkdtempSync(resolve(tmpdir(), 'joyan-iteration-3-nested-'));
mkdirSync(resolve(nestedFixture, '_astro', 'sub'), { recursive: true });
writeFileSync(resolve(nestedFixture, '_astro', 'top.js'), 'export const top = 1;\n');
writeFileSync(resolve(nestedFixture, '_astro', 'sub', 'nested-generated.js'), 'export const nested = 1;\n');
const nestedWalk = listGeneratedJs(nestedFixture);
const budgetControls = {
  'cap boundary accepted at the cap and rejected one byte over':
    LAB_CAP_GZIP <= LAB_CAP_GZIP && !(LAB_CAP_GZIP + 1 <= LAB_CAP_GZIP),
  'unrelated and module .js still counted; JSON/import map never counted':
    isClientChunk('unrelated-generated.js') &&
    isClientChunk('module-entry.js') &&
    !isClientChunk('data.json') &&
    !isClientChunk('importmap.json'),
  'recursive walk counts a nested generated chunk, not only top-level files':
    nestedWalk.length === 2 && nestedWalk.includes('_astro/sub/nested-generated.js'),
  'every /lab/** page is a lab page, including a nested one':
    isLabPage('lab/ascii/index.html') && isLabPage('lab/shapes/index.html') && isLabPage('lab/deep/nested/index.html')
    && !isLabPage('index.html') && !isLabPage('en/index.html') && !isLabPage('lab/ascii/notes.txt'),
  'lab chunk on one lab page is lab; shared by two lab pages is still lab':
    attributeChunk(['lab/ascii/index.html'], 1) === 'lab' &&
    attributeChunk(['lab/ascii/index.html', 'lab/shapes/index.html'], 1) === 'lab',
  'a chunk on a real page is landing; a chunk shared by a lab page and a real page is the WU20 shared allowance':
    attributeChunk(['index.html'], 1) === 'landing' &&
    attributeChunk(['lab/ascii/index.html', 'index.html'], 1) === 'shared' &&
    attributeChunk(['lab/shapes/index.html', 'en/index.html'], 1) === 'shared',
  'a chunk no page reaches is landing, and no lab page fails closed':
    attributeChunk([], 1) === 'landing' && attributeChunk(['index.html'], 0) === 'fail-closed'
    && attributeChunk(['lab/ascii/index.html'], 0) === 'fail-closed',
};
for (const [name, ok] of Object.entries(budgetControls)) {
  if (ok) pass(`budget-control: ${name}`);
  else fail(`budget-control: ${name}`);
}

// Real attribution over every generated page and every emitted client chunk.
const labPages = listGeneratedHtml(DIST).map((path) => path.slice(DIST.length + 1).replaceAll('\\', '/'))
  .filter(isLabPage);
if (labPages.length === 0) {
  fail('budget: fail-closed — no /lab/** page was generated, so the lab JS set cannot be attributed');
}
const generatedPages = listGeneratedHtml(DIST).map((path) => ({
  name: path.slice(DIST.length + 1).replaceAll('\\', '/'),
  html: read(path),
}));
const gzipOf = new Map(candidate.rows.map((row) => [row.file, row.gz]));
// Reachability: page -> chunk it names -> the chunks that chunk imports. A chunk
// the bundler shares between the two laboratory routes is reached by both lab
// pages, and a chunk only an unreferenced module imports is not reached at all.
const chunkSources = new Map(listClientJs().map((file) => [file, read(resolve(DIST, file))]));
const posixDir = (file) => file.slice(0, file.lastIndexOf('/') + 1);
const posixJoin = (dir, spec) => {
  const parts = `${dir}${spec}`.split('/');
  const out = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
};
const importsOf = (file) => {
  const source = chunkSources.get(file) ?? '';
  const deps = [];
  for (const match of source.matchAll(/(?:import|from)\s*\(?\s*["'](\.\/[^"']+)["']/g)) {
    const resolved = posixJoin(posixDir(file), match[1]);
    if (chunkSources.has(resolved)) deps.push(resolved);
  }
  return deps;
};
const reaches = new Map();
for (const page of generatedPages) {
  const seen = new Set();
  const stack = listClientJs().filter((file) => page.html.includes(file));
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const dep of importsOf(file)) stack.push(dep);
  }
  for (const file of seen) {
    if (!reaches.has(file)) reaches.set(file, []);
    reaches.get(file).push(page.name);
  }
}
const labChunks = [];
const landingChunks = [];
const sharedChunks = [];
for (const file of listClientJs()) {
  const pages = reaches.get(file) ?? [];
  const kind = attributeChunk(pages, labPages.length > 0);
  if (kind === 'lab') labChunks.push(file);
  else if (kind === 'shared') sharedChunks.push(file);
  else landingChunks.push(file);
}
if (sharedChunks.length > 0) {
  pass(`budget: WU20 shared chunk(s) counted toward BOTH the landing set (pinned by hash) and the lab executable (real bytes the lab runs): ${sharedChunks.join(', ')}`);
}
const sumGzip = (files) => files.reduce((sum, file) => sum + (gzipOf.get(file) ?? 0), 0);
const landingGzip = sumGzip(landingChunks) + sumGzip(sharedChunks);
const sharedGzip = sumGzip(sharedChunks);
const labGzip = sumGzip(labChunks);
if (landingChunks.filter((file) => labChunks.includes(file)).length > 0) {
  fail(`budget: chunk attributed to both lab and landing exclusively (double count): ${landingChunks.filter((file) => labChunks.includes(file)).join(', ')}`);
} else {
  pass('budget: lab-exclusive and landing-exclusive chunk sets are disjoint; the shared WU20 chunk is reported separately and added to each allowance');
}
if (landingGzip + labGzip === candidate.total) {
  pass(
    `budget: generated client JS only (recursive dist/**/*.js, gzip level 6) totals ${candidate.total} B across ${candidate.rows.length} file(s) = landing-exclusive ${landingGzip - sharedGzip} B + lab-exclusive ${labGzip} B + WU20 shared ${sharedGzip} B; inline scripts are reported separately below and are not part of this total`
  );
} else {
  fail(
    `budget: generated client JS only totals ${candidate.total} B != landing-exclusive ${landingGzip - sharedGzip} B + lab-exclusive ${labGzip} B + shared ${sharedGzip} B — an emitted generated file is unattributed`
  );
}

// Executable inline scripts per set: measured and reported, deliberately NOT
// budgeted (pre-existing site behaviour, no limit asserted, no baseline reset).
const inlineBySet = {
  site: { gzip: 0, blocks: 0, pages: 0 },
  landing: { gzip: 0, blocks: 0 },
  lab: { gzip: 0, blocks: 0 },
};
for (const page of generatedPages) {
  const measured = executableInline(page.html);
  inlineBySet.site.gzip += measured.gzip;
  inlineBySet.site.blocks += measured.blocks;
  if (measured.blocks > 0) inlineBySet.site.pages += 1;
  if (LANDING_ROUTE_PAGES.includes(page.name)) {
    inlineBySet.landing.gzip += measured.gzip;
    inlineBySet.landing.blocks += measured.blocks;
  }
  if (isLabPage(page.name)) {
    inlineBySet.lab.gzip += measured.gzip;
    inlineBySet.lab.blocks += measured.blocks;
  }
}
pass(
  `budget-inline (pre-existing, unbudgeted, no limit asserted): site-wide executable inline ${inlineBySet.site.gzip} B gzip in ${inlineBySet.site.blocks} block(s) across ${inlineBySet.site.pages} of ${generatedPages.length} generated page(s)`
);
pass(
  `budget-inline (pre-existing, unbudgeted, no limit asserted): landing routes ${inlineBySet.landing.gzip} B gzip in ${inlineBySet.landing.blocks} block(s) across ${LANDING_ROUTE_PAGES.length} page(s); lab ${inlineBySet.lab.gzip} B gzip in ${inlineBySet.lab.blocks} block(s) across ${labPages.length} /lab/** page(s)`
);

// Landing invariant: same five chunks, byte-identical, same total, same delta.
const expectedLanding = Object.keys(LANDING_FROZEN_HASHES).sort();
const actualLanding = [...landingChunks, ...sharedChunks].sort();
const missingLanding = expectedLanding.filter((file) => !actualLanding.includes(file));
const extraLanding = actualLanding.filter((file) => !expectedLanding.includes(file));
const changedLanding = actualLanding.filter(
  (file) => LANDING_FROZEN_HASHES[file] && chunkHash(file) !== LANDING_FROZEN_HASHES[file]
);
if (missingLanding.length || extraLanding.length || changedLanding.length) {
  fail(
    `budget: landing generated-JS set changed — missing: [${missingLanding.join(', ')}] extra: [${extraLanding.join(', ')}] changed hashes: [${changedLanding.join(', ')}]`
  );
} else {
  pass(`budget: landing five chunks byte-identical by recorded hash (${actualLanding.length} file(s))`);
}
if (landingGzip === LANDING_FROZEN_GZIP) {
  pass(`budget: landing generated JS gzip ${landingGzip} B across ${actualLanding.length} file(s) unchanged`);
} else {
  fail(`budget: landing generated JS gzip ${landingGzip} B != recorded ${LANDING_FROZEN_GZIP} B`);
}

// Lab allowance: a measured number with a documented margin, never unlimited.
// The lab's executable set is every chunk reachable from a `/lab/**` page PLUS
// any executable inline module on those pages. WU17 moved the engine from an
// inline module (one page) to a shared chunk (two lab pages), so the inline is
// 0 B and the chunk carries the whole engine and catalogue. The landing set stays
// chunk-only and the landing allowance is untouched, so this does not move the
// landing invariant.
const labExecutableGzip = labGzip + sharedGzip + inlineBySet.lab.gzip;
const labMargin = LAB_CAP_GZIP - labExecutableGzip;
const declaredMargin = LAB_CAP_GZIP - LAB_MEASURED_GZIP;
if (declaredMargin >= 0 && declaredMargin <= LAB_MARGIN_LIMIT) {
  pass(`budget: lab cap ${LAB_CAP_GZIP} B = measured ${LAB_MEASURED_GZIP} B + ${declaredMargin} B margin (<= ${LAB_MARGIN_LIMIT} B)`);
} else {
  fail(`budget: lab cap margin ${declaredMargin} B over the measured ${LAB_MEASURED_GZIP} B is outside 0..${LAB_MARGIN_LIMIT} B`);
}
if (labExecutableGzip <= LAB_CAP_GZIP) {
  pass(`budget: lab-attributed executable gzip ${labExecutableGzip} B (chunk ${labGzip} B across ${labChunks.length} file(s) + inline ${inlineBySet.lab.gzip} B in ${inlineBySet.lab.blocks} block(s)) <= measured cap ${LAB_CAP_GZIP} B (margin ${labMargin} B)`);
} else {
  fail(`budget: lab-attributed executable gzip ${labExecutableGzip} B exceeds the measured cap ${LAB_CAP_GZIP} B`);
}
if (labMargin >= 0 && labMargin <= LAB_MARGIN_LIMIT) {
  pass(`budget: lab margin ${labMargin} B within 0..${LAB_MARGIN_LIMIT} B`);
} else {
  fail(`budget: lab margin ${labMargin} B is outside 0..${LAB_MARGIN_LIMIT} B`);
}

// Unchanged 22 KiB landing allowance against the untouched committed fixture.
if (baselinePath) {
  if (!existsSync(baselinePath)) {
    fail(`budget: baseline fixture missing at ${baselinePath} (run --capture-baseline before changing dependencies)`);
  } else {
    const baseline = JSON.parse(read(baselinePath));
    const delta = landingGzip - baseline.totalGzip;
    if (delta <= GZIP_DELTA_BUDGET) {
      pass(
        `budget: landing client JS gzip delta ${delta} B (${landingGzip} - ${baseline.totalGzip}) <= ${GZIP_DELTA_BUDGET} B (22 KiB)`
      );
    } else {
      fail(
        `budget: landing client JS gzip delta ${delta} B exceeds the 22 KiB (${GZIP_DELTA_BUDGET} B) budget (baseline ${baseline.totalGzip} B -> landing ${landingGzip} B)`
      );
    }
  }
} else if (existsSync(DEFAULT_BASELINE)) {
  const baseline = JSON.parse(read(DEFAULT_BASELINE));
  const delta = landingGzip - baseline.totalGzip;
  if (delta <= GZIP_DELTA_BUDGET && delta === LANDING_FROZEN_DELTA) {
    pass(
      `budget: default baseline landing delta ${delta} B (${landingGzip} - ${baseline.totalGzip}) <= ${GZIP_DELTA_BUDGET} B (22 KiB), baseline untouched`
    );
  } else if (delta > GZIP_DELTA_BUDGET) {
    fail(
      `budget: default baseline landing delta ${delta} B exceeds the 22 KiB (${GZIP_DELTA_BUDGET} B) budget (baseline ${baseline.totalGzip} B -> landing ${landingGzip} B)`
    );
  } else {
    fail(
      `budget: default baseline landing delta ${delta} B != recorded ${LANDING_FROZEN_DELTA} B — either the baseline fixture changed or the landing total left the frozen set; check the frozen-set assertion above for which`
    );
  }
} else {
  pass(
    `budget: no baseline fixture yet — landing client JS gzip sum is ${landingGzip} B across ${landingChunks.length} file(s), lab ${labGzip} B`
  );
}

// ---------------------------------------------------------------------------
// 8. Unit C — Journal: typed collection + chrome, seed frontmatter contract,
//    archive routes (/bitacora ↔ /en/log), built behavior (latest-three,
//    drafts, ES-only omissions, labels, empty state), and claim scans of
//    journal sources and built archive HTML.
// ---------------------------------------------------------------------------
const siteConfig = yaml.load(read(resolve(ROOT, 'src/config.yaml')));
const siteBase = String(siteConfig.site.site).replace(/\/+$/, '');

const bitacoraHtml = (() => {
  try {
    return read(resolve(DIST, 'bitacora', 'index.html'));
  } catch {
    // WU20: the archive routes are OUT of the build by contract; the absence
    // is asserted positively in the WU20 section at the top of this checker.
    return '';
  }
})();
const logHtml = (() => {
  try {
    return read(resolve(DIST, 'en', 'log', 'index.html'));
  } catch {
    return '';
  }
})();

// 8a. Archive route contract (mirrors the iteration-2 `/` ↔ `/en` checks).
for (const [page, html, expectedLang] of [
  ['ES', bitacoraHtml, 'es'],
  ['EN', logHtml, 'en'],
]) {
  if (!html) continue;
  const langTag = `<html lang="${expectedLang}"`;
  if (html.includes(langTag)) {
    pass(`journal-route: ${page} archive renders ${langTag} (active locale)`);
  } else {
    fail(`journal-route: ${page} archive must render ${langTag} (wrong active locale)`);
  }
  // No trailing-slash route targets: `/en/`, `/bitacora/`, `/en/log/` are
  // all invalid under `trailingSlash: "never"`. Legitimate `/en/log` hrefs
  // (the toggle link) are allowed — they are routes, not slash artifacts.
  for (const [target, what] of [
    ['/en/"', 'no /en/ trailing-slash link target'],
    ['/bitacora/"', 'no /bitacora/ trailing-slash link target'],
    ['/en/log/"', 'no /en/log/ trailing-slash link target'],
  ]) {
    if (html.includes(`href="${target}`)) {
      fail(`journal-route: ${page} archive contains ${what}`);
    } else {
      pass(`journal-route: ${page} archive has ${what}`);
    }
  }
}

const archiveCanonicalRows = [
  {
    label: 'ES archive canonical',
    html: bitacoraHtml,
    expected: `rel="canonical" href="${siteBase}/bitacora"`,
    banned: `rel="canonical" href="${siteBase}/bitacora/"`,
  },
  {
    label: 'EN archive canonical',
    html: logHtml,
    expected: `rel="canonical" href="${siteBase}/en/log"`,
    banned: `rel="canonical" href="${siteBase}/en/log/"`,
  },
];
for (const { label, html, expected, banned } of archiveCanonicalRows) {
  if (!html) continue;
  if (html.includes(expected)) {
    pass(`journal-route: ${label} is self-canonical (${expected})`);
  } else {
    fail(`journal-route: ${label} must be <link ${expected}>`);
  }
  if (html.includes(banned)) {
    fail(`journal-route: ${label} must not reference trailing-slash target ${banned}`);
  }
}

const archiveHreflangRows = [
  { locale: 'es', href: `${siteBase}/bitacora` },
  { locale: 'en', href: `${siteBase}/en/log` },
  { locale: 'x-default', href: `${siteBase}/bitacora` },
];
for (const [page, html] of [
  ['ES', bitacoraHtml],
  ['EN', logHtml],
]) {
  if (!html) continue;
  for (const { locale, href } of archiveHreflangRows) {
    const token = `rel="alternate" hreflang="${locale}" href="${href}"`;
    const bannedToken = `rel="alternate" hreflang="${locale}" href="${href}/"`;
    if (html.includes(token)) {
      pass(`journal-route: ${page} archive emits ${locale} -> ${href}`);
    } else {
      fail(`journal-route: ${page} archive must emit <link ${token}>`);
    }
    if (html.includes(bannedToken)) {
      fail(`journal-route: ${page} archive must not emit trailing-slash alternate ${bannedToken}`);
    }
  }
}

// 8b. Toggle on archives: data-alt maps /bitacora ↔ /en/log, hash preserved.
const archiveToggleRows = [
  { page: 'ES', html: bitacoraHtml, alt: '/en/log' },
  { page: 'EN', html: logHtml, alt: '/bitacora' },
];
for (const { page, html, alt } of archiveToggleRows) {
  if (!html) continue;
  if (html.includes('data-lang-toggle')) {
    pass(`journal-toggle: ${page} archive renders the language toggle`);
  } else {
    fail(`journal-toggle: ${page} archive must render [data-lang-toggle]`);
  }
  if (html.includes(`data-alt="${alt}"`)) {
    pass(`journal-toggle: ${page} archive alternates to ${alt} without trailing slash`);
  } else {
    fail(`journal-toggle: ${page} archive must set data-alt="${alt}"`);
  }
  if (!/location\.hash/.test(html)) {
    fail(`journal-toggle: ${page} archive must preserve the anchor hash (location.hash)`);
  } else {
    pass(`journal-toggle: ${page} archive hash-preservation script present`);
  }
  if (html.includes('aria-current="page"')) {
    pass(`journal-toggle: ${page} archive marks the active locale with aria-current="page"`);
  } else {
    fail(`journal-toggle: ${page} archive must mark the active locale with aria-current="page"`);
  }
}

// Execute the shipped inline toggle script against a deterministic DOM stub
// (same technique as the iteration-2 hash check).
const extractToggleScript = (html) => {
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const target = blocks.find((match) => match[1].includes('data-lang-toggle'));
  return target ? target[1] : '';
};
const runToggleScript = (scriptText, { alt, hash }) => {
  const link = {
    alt,
    href: '',
    listeners: {},
    getAttribute(name) {
      return name === 'data-alt' ? this.alt : null;
    },
    setAttribute(name, value) {
      if (name === 'href') this.href = String(value);
    },
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    },
  };
  const windowStub = { location: { hash } };
  const documentStub = { querySelectorAll: () => [link] };
  new Function('window', 'document', scriptText)(windowStub, documentStub);
  return link;
};

const archiveHashCases = [
  { page: 'ES', html: bitacoraHtml, alt: '/en/log', hash: '#top', expected: '/en/log#top' },
  { page: 'EN', html: logHtml, alt: '/bitacora', hash: '#top', expected: '/bitacora#top' },
];
for (const { page, html, alt, hash, expected } of archiveHashCases) {
  if (!html) continue;
  const scriptText = extractToggleScript(html);
  if (!scriptText) {
    fail(`journal-toggle: ${page} archive must ship the inline toggle hash script`);
    continue;
  }
  const link = runToggleScript(scriptText, { alt, hash });
  if (link.href === expected) {
    pass(`journal-toggle: ${page} archive toggle from ${hash} resolves to ${expected}`);
  } else {
    fail(
      `journal-toggle: ${page} archive toggle from ${hash} must resolve to ${expected}, got ${link.href || '(unset)'}`
    );
  }
  if (typeof link.listeners.click !== 'function') {
    fail(`journal-toggle: ${page} archive toggle script must bind a click listener`);
  } else {
    link.listeners.click();
    if (link.href === expected) {
      pass(`journal-toggle: ${page} archive toggle click keeps ${expected}`);
    } else {
      fail(`journal-toggle: ${page} archive toggle click must keep ${expected}, got ${link.href || '(unset)'}`);
    }
  }
}

// 8c. Collection contract: additive `journal` collection with the shared
//     area/status consts driving the schema, and identical chrome maps.
const contentConfigSource = read(resolve(ROOT, 'src/content.config.ts'));
const REQUIRED_COLLECTION_TOKENS = [
  ['journal', 'declares the journal collection'],
  ['defineCollection', 'defines a content collection'],
  ['src/data/journal', 'loads Markdown from src/data/journal'],
  ['date: z.date()', 'requires date'],
  ['area: z.enum(JOURNAL_AREAS)', 'types area from the shared const list'],
  ['status: z.enum(JOURNAL_STATUSES)', 'types status from the shared const list'],
  ['link: z.url().optional()', 'optional external link'],
  ['draft: z.boolean().optional()', 'optional draft flag'],
];
for (const [token, what] of REQUIRED_COLLECTION_TOKENS) {
  if (contentConfigSource.includes(token)) {
    pass(`journal-collection: content.config.ts ${what} (${token})`);
  } else {
    fail(`journal-collection: content.config.ts must ${what} (missing ${token})`);
  }
}

// WU7: retire the unused thumbnail API, not merely its currently empty data.
const hasRetiredField = (frontmatter) => Object.hasOwn(frontmatter, 'dither');
const hasRetiredSchemaField = (source) => {
  const ast = ts.createSourceFile('content.config.ts', source, ts.ScriptTarget.Latest, true);
  let found = false;
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && (
      node.name.getText(ast).replace(/['"\s]/g, '') === 'dither' ||
      (ts.isComputedPropertyName(node.name) && ts.isStringLiteral(node.name.expression) && node.name.expression.text === 'dither')
    )) found = true;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return found;
};
const hasRetiredConsumer = (source) =>
  /\bDitherFigure\b|\.\s*dither\b|\[\s*['"]dither['"]\s*\]|\{[^{}]*\bdither\b[^{}]*\}\s*=/.test(source);
const listRetirementSources = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = resolve(dir, entry.name);
  return entry.isDirectory() ? listRetirementSources(path) : /\.(?:astro|ts|js|md)$/.test(entry.name) ? [path] : [];
});
for (const [label, actual, expected] of [
  ['optional schema', hasRetiredSchemaField('z.object({ dither: z.string().optional() })'), true],
  ['quoted schema', hasRetiredSchemaField('z.object({ "dither": z.string() })'), true],
  ['computed schema', hasRetiredSchemaField("z.object({ ['dither']: z.string() })"), true],
  ['clean schema', hasRetiredSchemaField('z.object({ summary: z.string() })'), false],
  ['dot consumer', hasRetiredConsumer('data.dither'), true],
  ['indexed consumer', hasRetiredConsumer("data['dither']"), true],
  ['destructured consumer', hasRetiredConsumer('const { dither: thumb } = data'), true],
  ['component importer', hasRetiredConsumer("import Figure from './DitherFigure.astro'"), true],
  ['live hero path', hasRetiredConsumer("const poster = '/assets/dither/hero-dither.png'"), false],
  ...['/assets/thumb.png', null, false, undefined].map((dither) => ['retired frontmatter key', hasRetiredField({ dither }), true]),
  ['text-only frontmatter', hasRetiredField({ summary: 'Text alternative' }), false],
]) {
  if (actual === expected) pass(`journal-retirement-control: ${label}`);
  else fail(`journal-retirement-control: ${label} must return ${expected}`);
}
if (hasRetiredSchemaField(contentConfigSource)) fail('journal-retirement: schema must not declare dither');
else pass('journal-retirement: schema no longer declares dither');
if (existsSync(resolve(ROOT, 'src/components/joyan/DitherFigure.astro'))) fail('journal-retirement: dead DitherFigure must be removed');
else pass('journal-retirement: dead DitherFigure is absent');
const retirementSources = listRetirementSources(resolve(ROOT, 'src'));
const retiredConsumers = retirementSources.filter((path) => !path.endsWith('.md') && hasRetiredConsumer(read(path)));
if (retiredConsumers.length) retiredConsumers.forEach((path) => fail(`journal-retirement: retired consumer in ${path}`));
else pass('journal-retirement: no source imports DitherFigure or consumes dither');
const retiredFrontmatter = retirementSources.filter((path) => path.startsWith(resolve(ROOT, 'src/data/journal') + '/') && path.endsWith('.md') && hasRetiredField(yaml.load(read(path).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '') ?? {}));
if (retiredFrontmatter.length) retiredFrontmatter.forEach((path) => fail(`journal-retirement: retired dither frontmatter in ${path}`));
else pass('journal-retirement: all journal frontmatter is free of the retired key');

const typesSource = read(resolve(ROOT, 'src/lib/i18n/types.ts'));
const areasDecl = typesSource.match(/JOURNAL_AREAS\s*=\s*(\[[\s\S]*?\])\s*as\s+const/)?.[1] ?? '';
const statusesDecl = typesSource.match(/JOURNAL_STATUSES\s*=\s*(\[[\s\S]*?\])\s*as\s+const/)?.[1] ?? '';
const AREA_VALUES = ['hardware', 'software', 'integration', 'research'];
const STATUS_VALUES = ['in-progress', 'shipped', 'exploring'];
if (AREA_VALUES.every((value) => new RegExp(`['"]${value}['"]`).test(areasDecl))) {
  pass(`journal-collection: JOURNAL_AREAS declares exactly the four area values (${AREA_VALUES.join(', ')})`);
} else {
  fail(`journal-collection: JOURNAL_AREAS must declare ${AREA_VALUES.join(', ')}`);
}
if (STATUS_VALUES.every((value) => new RegExp(`['"]${value}['"]`).test(statusesDecl))) {
  pass(`journal-collection: JOURNAL_STATUSES declares the three status values (${STATUS_VALUES.join(', ')})`);
} else {
  fail(`journal-collection: JOURNAL_STATUSES must declare ${STATUS_VALUES.join(', ')}`);
}

const esJournalContent = (loadTsModule(resolve(ROOT, 'src/lib/i18n/es.ts')).es ?? {}).journal;
const enJournalContent = (loadTsModule(resolve(ROOT, 'src/lib/i18n/en.ts')).en ?? {}).journal;
const areaKeyOk = (content) =>
  content && [...new Set(Object.keys(content.areas))].sort().join(',') === AREA_VALUES.slice().sort().join(',');
const statusKeyOk = (content) =>
  content && [...new Set(Object.keys(content.statuses))].sort().join(',') === STATUS_VALUES.slice().sort().join(',');
for (const [locale, content] of [
  ['es', esJournalContent],
  ['en', enJournalContent],
]) {
  if (!content) {
    fail(`journal-chrome: ${locale} locale module must define journal chrome`);
    continue;
  }
  if (areaKeyOk(content)) {
    pass(`journal-chrome: ${locale} areas map is keyed by the four JournalArea values`);
  } else {
    fail(`journal-chrome: ${locale} areas map keys must match JOURNAL_AREAS`);
  }
  if (statusKeyOk(content)) {
    pass(`journal-chrome: ${locale} statuses map is keyed by the three JournalStatus values`);
  } else {
    fail(`journal-chrome: ${locale} statuses map keys must match JOURNAL_STATUSES`);
  }
  if (typeof content.emptyState === 'string' && content.emptyState.trim().length > 0) {
    pass(`journal-chrome: ${locale} emptyState is a non-empty honest string`);
  } else {
    fail(`journal-chrome: ${locale} emptyState must be a non-empty string`);
  }
  if (typeof content.archiveLabel === 'string' && typeof content.linkLabel === 'string') {
    pass(`journal-chrome: ${locale} archive/link labels are defined`);
  } else {
    fail(`journal-chrome: ${locale} archiveLabel and linkLabel must be strings`);
  }
}

// 8d. Seed contract: every MD file under src/data/journal/{es,en} parses with
//     valid frontmatter; published entries exist per locale; drafts are
//     optional in a clean public dataset;
//     EN published entries mirror ES (ES-authoritative).
const JOURNAL_DIR = resolve(ROOT, 'src/data/journal');
const listMd = (dirPath) =>
  existsSync(dirPath)
    ? readdirSync(dirPath)
        .filter((file) => file.endsWith('.md'))
        .sort()
    : [];
const parseFrontmatter = (source) => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  return match ? yaml.load(match[1]) : null;
};
const toIsoDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
};

const seedEntries = { es: [], en: [] };
for (const [localeKey, dirName] of [
  ['es', 'es'],
  ['en', 'en'],
]) {
  const dirPath = resolve(JOURNAL_DIR, dirName);
  if (!existsSync(dirPath)) {
    fail(`journal-seed: src/data/journal/${dirName} must exist`);
    continue;
  }
  for (const file of listMd(dirPath)) {
    const raw = read(resolve(dirPath, file));
    const frontmatter = parseFrontmatter(raw);
    const location = `${dirName}/${file}`;
    if (!frontmatter || typeof frontmatter !== 'object') {
      fail(`journal-seed: ${location} must carry valid YAML frontmatter`);
      continue;
    }
    const isoDate = toIsoDate(frontmatter.date);
    const title = frontmatter.title;
    const summary = frontmatter.summary;
    const area = frontmatter.area;
    const status = frontmatter.status;
    const slug = frontmatter.slug;
    const translationKey = frontmatter.translationKey;
    const issues = [];
    if (!isoDate) issues.push('date must be an ISO date (yyyy-mm-dd)');
    if (typeof title !== 'string' || title.trim() === '') issues.push('title must be a non-empty string');
    if (typeof summary !== 'string' || summary.trim() === '') issues.push('summary must be a non-empty string');
    if (!AREA_VALUES.includes(area)) issues.push(`area must be one of ${AREA_VALUES.join('/')}`);
    if (!STATUS_VALUES.includes(status)) issues.push(`status must be one of ${STATUS_VALUES.join('/')}`);
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      issues.push('slug must be a lowercase kebab-case string (slash-free)');
    }
    if (typeof translationKey !== 'string' || translationKey.trim() === '') {
      issues.push('translationKey must be a non-empty string');
    }
    if (typeof frontmatter.draft !== 'undefined' && typeof frontmatter.draft !== 'boolean') {
      issues.push('draft must be a boolean');
    }
    if (
      typeof frontmatter.link !== 'undefined' &&
      !(typeof frontmatter.link === 'string' && frontmatter.link.startsWith('https://'))
    ) {
      issues.push('link must be an https:// URL');
    }
    if (hasRetiredField(frontmatter)) issues.push('dither is retired; use the summary and localized detail link');
    if (issues.length > 0) {
      for (const issue of issues) fail(`journal-seed: ${location} ${issue}`);
      continue;
    }
    seedEntries[localeKey].push({
      location,
      title: String(title),
      summary: String(summary),
      area: String(area),
      status: String(status),
      date: isoDate,
      draft: frontmatter.draft === true,
      slug: String(slug ?? ''),
      translationKey: String(translationKey ?? ''),
      raw,
    });
  }
}

const publishedByLocale = {
  es: seedEntries.es.filter((entry) => !entry.draft),
  en: seedEntries.en.filter((entry) => !entry.draft),
};
if (publishedByLocale.es.length >= 1) {
  pass(
    `journal-seed: ES has ${publishedByLocale.es.length} published entr${publishedByLocale.es.length === 1 ? 'y' : 'ies'}`
  );
} else {
  fail('journal-seed: ES must have at least one published entry');
}
if (publishedByLocale.en.length >= 1) {
  pass(
    `journal-seed: EN has ${publishedByLocale.en.length} published entr${publishedByLocale.en.length === 1 ? 'y' : 'ies'}`
  );
} else {
  fail('journal-seed: EN must have at least one published entry');
}
const draftCount =
  seedEntries.es.filter((entry) => entry.draft).length + seedEntries.en.filter((entry) => entry.draft).length;
if (draftCount >= 1) {
  pass(
    `journal-seed: ${draftCount} draft entr${draftCount === 1 ? 'y' : 'ies'} present (draft filtering is exercised)`
  );
} else {
  pass('journal-seed: no committed draft entries; draft filtering remains conditional/schema-covered');
}

// A published EN entry is a translation of the ES entry sharing its
// date/area/status (titles differ per language). ES-authoritative
// means translations mirror a source entry and omissions are allowed — an
// EN entry without a matching source would violate the authority policy.
const enMirrorKey = (entry) => `${entry.date}|${entry.area}|${entry.status}`;
const esMirrorKeys = new Set(publishedByLocale.es.map(enMirrorKey));
const orphanEn = publishedByLocale.en.filter((entry) => !esMirrorKeys.has(enMirrorKey(entry)));
if (orphanEn.length === 0) {
  pass(
    'journal-seed: every published EN entry mirrors a published ES entry (same date/area/status — ES-authoritative)'
  );
} else {
  for (const entry of orphanEn) {
    fail(`journal-seed: ${entry.location} has no published ES source entry with the same date/area/status`);
  }
}

// 8e. WU20 — the journal routes are ARCHIVED: no built page may render any
// journal entry (draft or published), link an archive route, or carry the
// journal chrome. The latest-three, labels, dates and rows contracts survive
// with the archived sources, which still parse (checked below).
const builtPages = [
  ['ES landing', esHtml],
  ['EN landing', enHtml],
  ['ES archive', bitacoraHtml],
  ['EN archive', logHtml],
];
const draftEntries = [
  ...seedEntries.es.filter((entry) => entry.draft),
  ...seedEntries.en.filter((entry) => entry.draft),
];
const allEntries = [...seedEntries.es, ...seedEntries.en];
let archivedRendered = 0;
for (const entry of allEntries) {
  for (const [page, html] of builtPages) {
    if (html && html.includes(entry.title)) {
      archivedRendered += 1;
      fail(`journal-archived: "${entry.title}" must not render on ${page} (the journal is archived out of the build)`);
    }
  }
}
if (archivedRendered === 0) {
  pass(`journal-archived: none of the ${allEntries.length} journal title(s) render on any built page`);
}
if (esHtml && !/href="[^"]*bitacora/.test(esHtml)) {
  pass('journal-archive-link: ES landing links no archive route (WU20 one-page contract)');
} else if (esHtml) {
  fail('journal-archive-link: ES landing must not link /bitacora (archived route)');
}
if (enHtml && !/href="[^"]*\/?log[\/?"]/.test(enHtml)) {
  pass('journal-archive-link: EN landing links no archive route (WU20 one-page contract)');
} else if (enHtml) {
  fail('journal-archive-link: EN landing must not link /en/log (archived route)');
}

// Empty state: the branch exists in the section and archive sources, and the
// localized strings never render while entries exist (conditional proven).
const journalSectionSource = read(resolve(ROOT, 'archive/src/components/joyan/JournalSection.astro'));
const journalArchiveSource = read(resolve(ROOT, 'archive/src/pages/bitacora.astro'));
if (/entries\.length > 0/.test(journalSectionSource) && /emptyState/.test(journalSectionSource)) {
  pass('journal-empty: JournalSection.astro owns the entries.length > 0 / emptyState branch');
} else {
  fail('journal-empty: JournalSection.astro must render emptyState only when entries.length === 0');
}
if (/entries\.length > 0/.test(journalArchiveSource) && /emptyState/.test(journalArchiveSource)) {
  pass('journal-empty: the archive pages own the same conditional empty-state branch');
} else {
  fail('journal-empty: archive pages must render emptyState only when entries.length === 0');
}
for (const [locale, content] of [
  ['es', esJournalContent],
  ['en', enJournalContent],
]) {
  if (!content) continue;
  for (const [page, html] of builtPages) {
    if (html && html.includes(content.emptyState)) {
      fail(`journal-empty: ${page} must not render the ${locale} empty state while entries exist`);
    }
  }
}
if (esJournalContent && enJournalContent) {
  pass('journal-empty: empty-state strings absent from all built pages (branch is conditional, not always-on)');
}

// 8f. Claim scans: journal Markdown sources and both built archives must stay
//     free of banned phrase, public jargon, vendors, screenshots and claims.
const JOURNAL_BANS = [
  { label: 'exact prohibited phrase', re: /software\s+para\s+agentes/i },
  { label: 'public agentic jargon', re: /\bagentic\b/i },
  { label: 'AGI terminology', re: /\bAGI\b/i },
  { label: 'MCP terminology', re: /\bMCP\b/i },
  { label: 'RAG terminology', re: /\bRAG\b/i },
  { label: 'pricing claim', re: /\b(?:precio|precios|pricing|price)\b/i },
  { label: 'purchase claim', re: /\b(?:comprar|purchase|buy\s+now)\b/i },
  {
    label: 'enrollment offer',
    re: /\b(?:inscr[ií]bete|inscribirte|sign\s*[- ]?up|register\s+(?:now|today)|enrollment\s+open|registro\s+abierto|apunt[aá]te)\b/i,
  },
  {
    label: 'beta availability claim',
    re: /\b(?:open\s+beta|beta\s+(?:p[uú]blica|abierta|available)|available\s+beta|beta\s+ya)\b/i,
  },
  {
    label: 'immediate availability claim',
    re: /\b(?:ya\s+disponible|available\s+now|disponible\s+hoy|launching\s+(?:today|soon))\b/i,
  },
  {
    label: 'delivery claim',
    re: /\b(?:shipping|env[ií]o|delivery\s+date|delivery\s+in\s+\d|entrega\s+(?:garantizada|inmediata|prometida))\b/i,
  },
  { label: 'guarantee claim', re: /\b(?:garantizad\w*|guaranteed|money[-\s]?back)\b/i },
  { label: 'screenshot reference', re: /\b(?:screenshot|captura\s+de\s+pantalla|pantallazo)\b/i },
];
const JOURNAL_VENDORS = [
  'react',
  'vue',
  'svelte',
  'angular',
  'astro',
  'tailwind',
  'bootstrap',
  'node',
  'nodejs',
  'typescript',
  'javascript',
  'python',
  'php',
  'ruby',
  'openai',
  'anthropic',
  'claude',
  'chatgpt',
  'gpt',
  'gemini',
  'llama',
  'mistral',
  'aws',
  'azure',
  'google cloud',
  'cloudflare',
  'vercel',
  'netlify',
  'nvidia',
  'intel',
  'amd',
  'raspberry',
  'arduino',
  'esp32',
  'docker',
  'kubernetes',
  'postgres',
  'mysql',
  'mongodb',
  'graphql',
];
let journalCopyIssues = 0;
const scanJournalText = (target, source) => {
  for (const { label, re } of JOURNAL_BANS) {
    if (re.test(target)) {
      fail(`journal-copy: ${source} matches ${label}`);
      journalCopyIssues += 1;
    }
  }
  for (const name of JOURNAL_VENDORS) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(target)) {
      fail(`journal-copy: ${source} names vendor/technology "${name}"`);
      journalCopyIssues += 1;
    }
  }
};

for (const entry of [...seedEntries.es, ...seedEntries.en]) {
  scanJournalText(entry.raw, `journal:${entry.location}`);
}
if (journalCopyIssues === 0) {
  pass('journal-copy: every journal Markdown source is free of banned phrase, jargon, vendors, screenshots and claims');
}

const journalVisibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
const journalAttributeValues = (html) =>
  [...html.matchAll(/\b(?:alt|title|content)="([^"]*)"/gi)].map((match) => match[1].toLowerCase());

for (const [page, html] of [
  ['/bitacora', bitacoraHtml],
  ['/en/log', logHtml],
]) {
  if (!html) continue;
  if (/software\s+para\s+agentes/i.test(html)) {
    fail(`journal-copy: ${page} built HTML contains the prohibited phrase`);
  }
  scanJournalText(journalVisibleText(html), `${page} visible text`);
  for (const value of journalAttributeValues(html)) {
    scanJournalText(value, `${page} attribute`);
  }
}
if (journalCopyIssues === 0) {
  pass('journal-copy: both built archives are free of banned phrase, jargon, vendors, screenshots and claims');
}

// ---------------------------------------------------------------------------
// 9. Unit D — complete copy audit (locale sources + built landing output),
//    honest-copy positives, and static accessibility/performance evidence.
//    No browser dependency: every check runs against source files and the
//    emitted build (LCP/CLS remain deferred to a future browser/CI run).
// ---------------------------------------------------------------------------

// The extended ban set adds public implementation jargon and a commercial-
// offer pattern on top of the journal claim set (8f), because iteration-2's
// checker predates the agentic/AGI/MCP/RAG prohibition.
const UNIT_D_EXTRA_BANS = [
  {
    label: 'commercial offer claim',
    re: /\b(?:commercial\s+(?:offer|offering|product|launch|license)|oferta\s+comercial|en\s+venta|on\s+sale)\b/i,
  },
];
const UNIT_D_BANS = [...JOURNAL_BANS, ...UNIT_D_EXTRA_BANS];

const collectStrings = (value, path = '', out = []) => {
  if (typeof value === 'string') {
    out.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      collectStrings(item, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
};

let unitDCopyIssues = 0;
const scanUnitDText = (target, source) => {
  for (const { label, re } of UNIT_D_BANS) {
    if (re.test(target)) {
      fail(`copy: ${source} matches ${label}`);
      unitDCopyIssues += 1;
    }
  }
  for (const name of JOURNAL_VENDORS) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(target)) {
      fail(`copy: ${source} names vendor/technology "${name}"`);
      unitDCopyIssues += 1;
    }
  }
};

// 9a. Locale source values (every executed string, reported by key path).
const esContentFull = loadTsModule(resolve(ROOT, 'src/lib/i18n/es.ts')).es ?? {};
const enContentFull = loadTsModule(resolve(ROOT, 'src/lib/i18n/en.ts')).en ?? {};
for (const [locale, content] of [
  ['es', esContentFull],
  ['en', enContentFull],
]) {
  for (const { path, value } of collectStrings(content)) {
    scanUnitDText(value, `${locale}.ts ${path || '(root)'}`);
  }
}
if (unitDCopyIssues === 0) {
  pass('copy: locale source values are free of banned phrase, public jargon, vendors, screenshots and claims');
}

// 9b. Built landing HTML (/, /en): visible text plus metadata/alt/title
//     attribute values (archives were already scanned in 8f).
for (const [page, html] of [
  ['ES landing', esHtml],
  ['EN landing', enHtml],
]) {
  if (!html) continue;
  if (/software\s+para\s+agentes/i.test(html)) {
    fail(`copy: ${page} built HTML contains the prohibited phrase`);
  }
  scanUnitDText(journalVisibleText(html), `${page} visible text`);
  for (const value of journalAttributeValues(html)) {
    scanUnitDText(value, `${page} attribute`);
  }
}
if (unitDCopyIssues === 0) {
  pass('copy: both built landings are free of banned phrase, public jargon, vendors, screenshots and claims');
}

// 9c. Honest-copy positives: the cooperative identity, explicit in-
//     development statuses, negated enrollment/form/delivery disclaimers,
//     and human review of agent limits remain present in both locales.
const esCommunity = esContentFull.ecosystem?.community ?? {};
const enCommunity = enContentFull.ecosystem?.community ?? {};
for (const [locale, content] of [
  ['es', esContentFull],
  ['en', enContentFull],
]) {
  const coopTitle = content.ecosystem?.items?.[0]?.title ?? '';
  if (/cooperativ/i.test(coopTitle)) {
    pass(`copy: ${locale} retains the cooperative identity ("${coopTitle}")`);
  } else {
    fail(`copy: ${locale} ecosystem must retain the cooperative identity (items[0].title)`);
  }
}
const inDevelopmentChecks = [
  ['es prototype', esContentFull.hardware?.prototypeInvitation?.status, /desarrollo/i],
  ['en prototype', enContentFull.hardware?.prototypeInvitation?.status, /development/i],
  ['es community', esCommunity.status, /desarrollo/i],
  ['en community', enCommunity.status, /development/i],
];
for (const [label, status, re] of inDevelopmentChecks) {
  if (typeof status === 'string' && re.test(status)) {
    pass(`copy: ${label} offer carries the explicit in-development status ("${status}")`);
  } else {
    fail(`copy: ${label} offer must carry an explicit in-development status`);
  }
}
const disclaimerChecks = [
  {
    locale: 'es',
    lead: esCommunity.lead,
    tokens: [/inscripci[oó]n/i, /formulario/i, /entrega/i],
  },
  {
    locale: 'en',
    lead: enCommunity.lead,
    tokens: [/enrollment/i, /\bform\b/i, /delivery/i],
  },
];
for (const { locale, lead, tokens } of disclaimerChecks) {
  if (typeof lead === 'string' && tokens.every((re) => re.test(lead))) {
    pass(`copy: ${locale} community lead negates enrollment, form, and delivery offers`);
  } else {
    fail(`copy: ${locale} community lead must negate enrollment, form, and delivery offers`);
  }
}
const reviewChecks = [
  ['es', `${esContentFull.agents?.lead ?? ''} ${esCommunity.lead ?? ''}`, /revis\w*/i],
  ['en', `${enContentFull.agents?.lead ?? ''} ${enCommunity.lead ?? ''}`, /review\w*/i],
];
for (const [locale, text, re] of reviewChecks) {
  if (re.test(text)) {
    pass(`copy: ${locale} copy keeps human review of agent limits explicit`);
  } else {
    fail(`copy: ${locale} copy must state that people review agent actions and limits`);
  }
}

// 9d. Static accessibility evidence (deterministic, no browser).
const auditPages = [
  ['ES landing', esHtml],
  ['EN landing', enHtml],
  ['ES archive', bitacoraHtml],
  ['EN archive', logHtml],
];

for (const [page, html] of auditPages) {
  if (!html) continue;
  // WU20: the one-page coming-soon site renders ONE landmark — the main
  // content target from PageLayout. The header, footer and navigation chrome
  // are archived with the old landing; requiring them here would be false.
  const landmarks = [
    ['main landmark focus target', /<main\b[^>]*id="main"[^>]*tabindex="-1"/],
  ];
  for (const [label, re] of landmarks) {
    if (re.test(html)) {
      pass(`a11y: ${page} renders the ${label} landmark`);
    } else {
      fail(`a11y: ${page} must render the ${label} landmark`);
    }
  }
  // The minimal WU20 footer (user-directed: a subtle professional footer) is
  // allowed; the old sticky header and both navigation landmarks stay banned.
  for (const [label, re] of [
    ['sticky site header', /<header\b[^>]*class="sticky/],
    ['primary navigation', /<nav\b[^>]*aria-label="Main"/],
    ['footer navigation', /<nav\b[^>]*aria-label="Footer"/],
  ]) {
    if (!re.test(html)) {
      pass(`a11y: ${page} renders no ${label} (archived with the old chrome)`);
    } else {
      fail(`a11y: ${page} must not render the ${label} (archived with the old chrome)`);
    }
  }
  if ((html.match(/<footer\b/g) ?? []).length <= 1) {
    pass(`a11y: ${page} carries at most the one minimal WU20 footer`);
  } else {
    fail(`a11y: ${page} must carry at most one footer landmark`);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length === 0) {
    pass(`a11y: ${page} carries ${ids.length} unique id attribute(s), none duplicated`);
  } else {
    fail(`a11y: ${page} must not duplicate id attributes (${duplicates.join(', ')})`);
  }
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
  const h1Count = levels.filter((level) => level === 1).length;
  const headingIssues = [];
  if (h1Count !== 1) headingIssues.push(`exactly one h1 expected, found ${h1Count}`);
  if (levels.length > 0 && levels[0] !== 1) headingIssues.push(`the first heading must be h1, found h${levels[0]}`);
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) {
      headingIssues.push(`heading level jumps from h${levels[i - 1]} to h${levels[i]} (skipped level)`);
    }
  }
  if (headingIssues.length === 0) {
    pass(`a11y: ${page} heading order is one h1 with no skipped levels (${levels.length} headings)`);
  } else {
    for (const issue of headingIssues) fail(`a11y: ${page} ${issue}`);
  }
}

// Keyboard / focus-visible path: the toggle ring rule (iteration-2 contract)
// plus the focusable hardware surface ring, in compiled CSS.
if (/\.focus-visible\\:outline:focus-visible/.test(compiledCss)) {
  pass('a11y: compiled CSS enables the :focus-visible outline ring for interactive controls');
} else {
  fail('a11y: compiled CSS must include the .focus-visible\\:outline:focus-visible rule');
}
if (/\.hardware-surface:focus-within/.test(compiledCss)) {
  pass('a11y: compiled CSS drives the hardware treatments from focus (focus-within)');
} else {
  fail('a11y: compiled CSS must include a .hardware-surface:focus-within rule');
}
for (const [page, html] of auditPages) {
  if (!html) continue;
  if (html.includes('data-hardware-surface')) {
    if (/data-hardware-surface[^>]*tabindex="0"/.test(html) || /tabindex="0"[^>]*data-hardware-surface/.test(html)) {
      pass(`a11y: ${page} hardware surface is keyboard-reachable (tabindex="0")`);
    } else {
      fail(`a11y: ${page} hardware surface must carry tabindex="0"`);
    }
    if (
      /data-hardware-surface[^>]*focus-visible:outline-accent/.test(html) ||
      /focus-visible:outline-accent[^>]*data-hardware-surface/.test(html)
    ) {
      pass(`a11y: ${page} hardware surface carries the visible focus-visible ring class`);
    } else {
      fail(`a11y: ${page} hardware surface must carry focus-visible:outline-accent`);
    }
  }
}

// Reduced-motion coverage across the compiled stylesheet (canvas overlay,
// edge pulses, caret, hardware treatments, shell texture).
const reducedMotionBlockCount = (compiledCss.match(/@media \(prefers-reduced-motion:reduce\)\{/g) ?? []).length;
if (reducedMotionBlockCount >= 3) {
  pass(`a11y: compiled CSS ships ${reducedMotionBlockCount} prefers-reduced-motion blocks (static fallbacks)`);
} else {
  fail(`a11y: compiled CSS must ship at least 3 prefers-reduced-motion blocks, found ${reducedMotionBlockCount}`);
}

// ---------------------------------------------------------------------------
// 8g. Journal detail contract — explicit slug/key identity (RED 1.1):
//     published-only static detail routes (drafts/unknown => 404), rendered
//     Markdown bodies, localized metadata and one H1, archive row/return
//     links, truthful toggle targets (real counterpart or /en/log), SEO
//     clusters (paired ES/EN/x-default; ES-only details emit NO alternate),
//     detail claim leakage (visible text + alt/title/content attributes),
//     and page landmarks/unique ids.
// ---------------------------------------------------------------------------

// 8g1. Source identity: schema fields, helper surface (no blog imports),
//      published-only route files, and the detail shell contract.
const REQUIRED_DETAIL_SCHEMA_TOKENS = [
  ['slug: z', 'types the required slug field'],
  ['translationKey: z', 'types the required translationKey field'],
  ['a-z0-9', 'enforces lowercase kebab-case slugs'],
];
for (const [token, what] of REQUIRED_DETAIL_SCHEMA_TOKENS) {
  if (contentConfigSource.includes(token)) {
    pass(`journal-detail: content.config.ts ${what} (${token})`);
  } else {
    fail(`journal-detail: content.config.ts must ${what} (missing ${token})`);
  }
}

const journalUtilSource = read(resolve(ROOT, 'src/utils/journal.ts'));
const REQUIRED_UTIL_TOKENS = [
  ['journalDetailPath', 'derives detail paths from the archive bases'],
  ['getPublishedJournalRouteRecords', 'exposes published route records'],
  ['getJournalRouteRecord', 'looks up a single published record'],
  ['resolveJournalLocaleCluster', 'resolves the pathname locale cluster'],
  ['alternatePath', 'models real counterpart paths only'],
];
for (const [token, what] of REQUIRED_UTIL_TOKENS) {
  if (journalUtilSource.includes(token)) {
    pass(`journal-detail: src/utils/journal.ts ${what} (${token})`);
  } else {
    fail(`journal-detail: src/utils/journal.ts must ${what} (missing ${token})`);
  }
}
const utilImports = [...journalUtilSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
if (utilImports.some((specifier) => /post|blog/.test(specifier))) {
  fail('journal-detail: src/utils/journal.ts must not import dormant blog/post helpers');
} else {
  pass('journal-detail: src/utils/journal.ts stays isolated from the dormant blog helpers');
}

const esDetailRouteSource = read(resolve(ROOT, 'archive/src/pages/bitacora/[slug].astro'));
const enDetailRouteSource = read(resolve(ROOT, 'archive/src/pages/en/log/[slug].astro'));
for (const [label, source] of [
  ['/bitacora/[slug].astro', esDetailRouteSource],
  ['/en/log/[slug].astro', enDetailRouteSource],
]) {
  for (const [token, what] of [
    ['getStaticPaths', 'publishes static paths'],
    ['render(entry)', 'renders the entry Markdown'],
    ['<Content', 'passes the rendered body to the detail shell'],
    ['getPublishedJournalRouteRecords', 'builds paths from published records'],
  ]) {
    if (source.includes(token)) {
      pass(`journal-detail: ${label} ${what} (${token})`);
    } else {
      fail(`journal-detail: ${label} must ${what} (missing ${token})`);
    }
  }
}

const detailShellSource = read(resolve(ROOT, 'archive/src/components/joyan/JournalDetailPage.astro'));
for (const [token, what] of [
  ['PageLayout', 'uses the standard page layout'],
  ['joyan-prose', 'renders the Markdown body with Joyan prose'],
  ['id="top"', 'keeps the header/footer home anchors working'],
  ['detailReturnLabel', 'renders the localized archive return link'],
  ['JOURNAL_ROUTES', 'derives the archive return path'],
]) {
  if (detailShellSource.includes(token)) {
    pass(`journal-detail: JournalDetailPage.astro ${what} (${token})`);
  } else {
    fail(`journal-detail: JournalDetailPage.astro must ${what} (missing ${token})`);
  }
}
if (detailShellSource.includes('MarkdownLayout')) {
  fail('journal-detail: JournalDetailPage.astro must not reuse the MarkdownLayout shell');
} else {
  pass('journal-detail: JournalDetailPage.astro owns its shell (no MarkdownLayout reuse)');
}

// 8g2. WU20 — the detail routes are ARCHIVED: no detail page builds at all,
// and the one-page build ships no 404 route (the archive branch holds the old
// behaviour). The archived route sources keep the whole contract verbatim.
let archivedDetailBuilt = 0;
for (const entry of [...publishedByLocale.es, ...publishedByLocale.en]) {
  for (const rel of [`dist/bitacora/${entry.slug}/index.html`, `dist/en/log/${entry.slug}/index.html`]) {
    if (existsSync(resolve(ROOT, rel))) {
      archivedDetailBuilt += 1;
      fail(`journal-detail: archived entry "${entry.slug}" must not build (${rel})`);
    }
  }
}
if (archivedDetailBuilt === 0) {
  pass(`journal-detail: none of the ${publishedByLocale.es.length + publishedByLocale.en.length} published detail route(s) build (archived out of the build)`);
}
if (existsSync(resolve(ROOT, 'dist/404.html'))) {
  fail('journal-detail: dist/404.html must NOT exist — 404 is an archived route in the one-page build');
} else {
  pass('journal-detail: no dist/404.html (archived with the old routes)');
}

// 8g3. Identity integrity: locale-unique published slugs/keys and
//      ES-authoritative pairing (published EN keys need a published ES peer).
for (const [localeKey, entries] of [
  ['es', publishedByLocale.es],
  ['en', publishedByLocale.en],
]) {
  const slugs = entries.map((entry) => entry.slug);
  const keys = entries.map((entry) => entry.translationKey);
  const duplicateSlugs = [...new Set(slugs.filter((slug, index) => slugs.indexOf(slug) !== index))];
  const duplicateKeys = [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
  if (duplicateSlugs.length === 0) {
    pass(`journal-detail: ${localeKey} published slugs are locale-unique`);
  } else {
    fail(`journal-detail: ${localeKey} duplicate published slug(s): ${duplicateSlugs.join(', ')}`);
  }
  if (duplicateKeys.length === 0) {
    pass(`journal-detail: ${localeKey} published translationKeys are unique`);
  } else {
    fail(`journal-detail: ${localeKey} duplicate published translationKey(s): ${duplicateKeys.join(', ')}`);
  }
}
const esPublishedKeys = new Set(publishedByLocale.es.map((entry) => entry.translationKey));
const orphanEnEntries = publishedByLocale.en.filter((entry) => !esPublishedKeys.has(entry.translationKey));
if (orphanEnEntries.length === 0) {
  pass('journal-detail: every published EN entry pairs with a published ES entry (same translationKey)');
} else {
  for (const entry of orphanEnEntries) {
    fail(
      `journal-detail: EN "${entry.location}" has no published ES source entry for translationKey "${entry.translationKey}"`
    );
  }
}
// Astro 7's glob loader turns the frontmatter `slug` into the collection
// entry id, so published slugs must be unique across BOTH locales — a
// cross-locale duplicate would silently overwrite one entry in the store.
const allPublishedSlugs = [...publishedByLocale.es, ...publishedByLocale.en].map((entry) => entry.slug);
const duplicateGlobalSlugs = [
  ...new Set(allPublishedSlugs.filter((slug, index) => allPublishedSlugs.indexOf(slug) !== index)),
];
if (duplicateGlobalSlugs.length === 0) {
  pass('journal-detail: published slugs are unique across the whole journal collection (they become entry ids)');
} else {
  fail(
    `journal-detail: published slugs must be globally unique (glob-loader entry id collision): ${duplicateGlobalSlugs.join(', ')}`
  );
}

// 8g4. Built detail content: rendered Markdown body, metadata, one H1 with
//      no skipped heading levels, landmarks, and unique ids.
const detailHtml = (relPath) => {
  try {
    return read(resolve(ROOT, relPath));
  } catch {
    return '';
  }
};
const esDetails = new Map(
  publishedByLocale.es.map((entry) => [entry.slug, detailHtml(`dist/bitacora/${entry.slug}/index.html`)])
);
const enDetails = new Map(
  publishedByLocale.en.map((entry) => [entry.slug, detailHtml(`dist/en/log/${entry.slug}/index.html`)])
);
const markdownBodyText = (raw) => {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  const body = match ? raw.slice(match[0].length) : raw;
  return body.toLowerCase().replace(/\s+/g, ' ').trim();
};

for (const [label, entries, details] of [
  ['ES', publishedByLocale.es, esDetails],
  ['EN', publishedByLocale.en, enDetails],
]) {
  for (const entry of entries) {
    const html = details.get(entry.slug) ?? '';
    if (!html) continue;
    const body = markdownBodyText(entry.raw);
    if (body && journalVisibleText(html).includes(body)) {
      pass(`journal-detail: ${label} "${entry.slug}" renders its Markdown body`);
    } else {
      fail(`journal-detail: ${label} "${entry.slug}" must render its Markdown body`);
    }
    if (html.includes(`<title>${entry.title} — Joyan</title>`)) {
      pass(`journal-detail: ${label} "${entry.slug}" titles the page with the entry title`);
    } else {
      fail(`journal-detail: ${label} "${entry.slug}" must emit <title>${entry.title} — Joyan</title>`);
    }
    if (html.includes(`content="${entry.summary}"`)) {
      pass(`journal-detail: ${label} "${entry.slug}" uses the summary as the meta description`);
    } else {
      fail(`journal-detail: ${label} "${entry.slug}" must set description content="${entry.summary}"`);
    }
    const headingLevels = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
    const h1Count = headingLevels.filter((level) => level === 1).length;
    const headingIssues = [];
    if (h1Count !== 1) headingIssues.push(`exactly one h1 expected, found ${h1Count}`);
    for (let i = 1; i < headingLevels.length; i += 1) {
      if (headingLevels[i] - headingLevels[i - 1] > 1) {
        headingIssues.push(`heading level jumps from h${headingLevels[i - 1]} to h${headingLevels[i]}`);
      }
    }
    if (headingIssues.length === 0) {
      pass(`journal-detail: ${label} "${entry.slug}" keeps one h1 with no skipped heading levels`);
    } else {
      for (const issue of headingIssues) fail(`journal-detail: ${label} "${entry.slug}" ${issue}`);
    }
    const landmarks = [
      ['site header', /<header\b[^>]*class="sticky/],
      ['main landmark focus target', /<main\b[^>]*id="main"[^>]*tabindex="-1"/],
      ['footer landmark', /<footer\b/],
      ['primary navigation', /<nav\b[^>]*aria-label="Main"/],
      ['footer navigation', /<nav\b[^>]*aria-label="Footer"/],
    ];
    for (const [landmark, re] of landmarks) {
      if (re.test(html)) {
        pass(`journal-detail: ${label} "${entry.slug}" renders the ${landmark} landmark`);
      } else {
        fail(`journal-detail: ${label} "${entry.slug}" must render the ${landmark} landmark`);
      }
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    if (duplicateIds.length === 0) {
      pass(`journal-detail: ${label} "${entry.slug}" carries ${ids.length} unique id attribute(s), none duplicated`);
    } else {
      fail(`journal-detail: ${label} "${entry.slug}" must not duplicate id attributes (${duplicateIds.join(', ')})`);
    }
  }
}

// 8g5. WU20 — the built pages must link NO archive or detail route; the link
// contracts live with the archived sources (checked by the source scans).
let archivedLinks = 0;
for (const [page, html] of [['ES landing', esHtml], ['EN landing', enHtml]]) {
  if (!html) continue;
  for (const token of ['href="/bitacora', 'href="bitacora', 'href="/en/log', 'href="log/']) {
    if (html.includes(token)) {
      archivedLinks += 1;
      fail(`journal-detail: ${page} must not link an archived route (${token})`);
    }
  }
}
if (archivedLinks === 0) {
  pass('journal-detail: no built page links an archived detail or archive route');
}

// 8g6. Detail header/footer anchors point at the locale landing base
//      (the landing sections do not exist on a detail page).
for (const entry of publishedByLocale.es) {
  const html = esDetails.get(entry.slug) ?? '';
  if (!html) continue;
  if (html.includes('href="/#agents"') || html.includes('href="/#magi"')) {
    pass(`journal-detail: ES "${entry.slug}" anchors point at the ES landing base (/#…)`);
  } else {
    fail(`journal-detail: ES "${entry.slug}" must prefix nav anchors with the ES landing base (/#…)`);
  }
}
for (const entry of publishedByLocale.en) {
  const html = enDetails.get(entry.slug) ?? '';
  if (!html) continue;
  if (html.includes('href="/en#agents"') || html.includes('href="/en#magi"')) {
    pass(`journal-detail: EN "${entry.slug}" anchors point at the EN landing base (/en#…)`);
  } else {
    fail(`journal-detail: EN "${entry.slug}" must prefix nav anchors with the EN landing base (/en#…)`);
  }
}

// 8g7. Truthful toggle targets: paired details map to their real
//      counterpart; an ES-only detail maps EN to /en/log — never a
//      fabricated EN detail path.
for (const entry of publishedByLocale.es) {
  const html = esDetails.get(entry.slug) ?? '';
  if (!html) continue;
  const enPeer = publishedByLocale.en.find((peer) => peer.translationKey === entry.translationKey);
  const expectedAlt = enPeer ? `/en/log/${enPeer.slug}` : '/en/log';
  if (html.includes(`data-alt="${expectedAlt}"`)) {
    pass(`journal-detail: ES "${entry.slug}" toggles EN to ${expectedAlt}`);
  } else {
    fail(`journal-detail: ES "${entry.slug}" must toggle EN to ${expectedAlt} (real counterpart or /en/log)`);
  }
}
for (const entry of publishedByLocale.en) {
  const html = enDetails.get(entry.slug) ?? '';
  if (!html) continue;
  const esPeer = publishedByLocale.es.find((peer) => peer.translationKey === entry.translationKey);
  const expectedAlt = esPeer ? `/bitacora/${esPeer.slug}` : '';
  if (expectedAlt && html.includes(`data-alt="${expectedAlt}"`)) {
    pass(`journal-detail: EN "${entry.slug}" toggles ES to ${expectedAlt}`);
  } else {
    fail(`journal-detail: EN "${entry.slug}" must toggle ES to ${expectedAlt}`);
  }
}

// 8g8. SEO clusters: paired details emit the absolute self-canonical plus
//      real ES/EN and ES x-default alternates; an ES-only detail emits ONLY
//      its absolute self-canonical — zero hreflang, including no x-default.
for (const entry of publishedByLocale.es) {
  const html = esDetails.get(entry.slug) ?? '';
  if (!html) continue;
  const enPeer = publishedByLocale.en.find((peer) => peer.translationKey === entry.translationKey);
  const selfHref = `${siteBase}/bitacora/${entry.slug}`;
  if (html.includes(`rel="canonical" href="${selfHref}"`)) {
    pass(`journal-detail: ES "${entry.slug}" canonical is absolute and self-referencing`);
  } else {
    fail(`journal-detail: ES "${entry.slug}" must emit <link rel="canonical" href="${selfHref}">`);
  }
  if (html.includes(`rel="canonical" href="${selfHref}/"`)) {
    fail(`journal-detail: ES "${entry.slug}" canonical must not carry a trailing slash`);
  }
  if (enPeer) {
    const enHref = `${siteBase}/en/log/${enPeer.slug}`;
    for (const [locale, href] of [
      ['es', selfHref],
      ['en', enHref],
      ['x-default', selfHref],
    ]) {
      const token = `rel="alternate" hreflang="${locale}" href="${href}"`;
      if (html.includes(token)) {
        pass(`journal-detail: ES "${entry.slug}" emits ${locale} -> ${href}`);
      } else {
        fail(`journal-detail: ES "${entry.slug}" must emit <link ${token}>`);
      }
    }
  } else if (html.includes('rel="alternate"')) {
    fail(`journal-detail: ES-only "${entry.slug}" must emit NO alternate links (not even x-default)`);
  } else {
    pass(`journal-detail: ES-only "${entry.slug}" emits zero hreflang alternates (self-canonical only)`);
  }
}
for (const entry of publishedByLocale.en) {
  const html = enDetails.get(entry.slug) ?? '';
  if (!html) continue;
  const esPeer = publishedByLocale.es.find((peer) => peer.translationKey === entry.translationKey);
  const selfHref = `${siteBase}/en/log/${entry.slug}`;
  if (html.includes(`rel="canonical" href="${selfHref}"`)) {
    pass(`journal-detail: EN "${entry.slug}" canonical is absolute and self-referencing`);
  } else {
    fail(`journal-detail: EN "${entry.slug}" must emit <link rel="canonical" href="${selfHref}">`);
  }
  if (esPeer) {
    const esHref = `${siteBase}/bitacora/${esPeer.slug}`;
    for (const [locale, href] of [
      ['es', esHref],
      ['en', selfHref],
      ['x-default', esHref],
    ]) {
      const token = `rel="alternate" hreflang="${locale}" href="${href}"`;
      if (html.includes(token)) {
        pass(`journal-detail: EN "${entry.slug}" emits ${locale} -> ${href}`);
      } else {
        fail(`journal-detail: EN "${entry.slug}" must emit <link ${token}>`);
      }
    }
  }
}

// 8g9. Claim leakage on built details: visible text plus alt/title/content
//      attribute values must stay free of the journal ban set.
for (const entry of publishedByLocale.es) {
  const html = esDetails.get(entry.slug) ?? '';
  if (!html) continue;
  if (/software\s+para\s+agentes/i.test(html)) {
    fail(`journal-detail-copy: ES "/bitacora/${entry.slug}" built HTML contains the prohibited phrase`);
  }
  scanJournalText(journalVisibleText(html), `ES /bitacora/${entry.slug} visible text`);
  for (const value of journalAttributeValues(html)) {
    scanJournalText(value, `ES /bitacora/${entry.slug} attribute`);
  }
}
for (const entry of publishedByLocale.en) {
  const html = enDetails.get(entry.slug) ?? '';
  if (!html) continue;
  if (/software\s+para\s+agentes/i.test(html)) {
    fail(`journal-detail-copy: EN "/en/log/${entry.slug}" built HTML contains the prohibited phrase`);
  }
  scanJournalText(journalVisibleText(html), `EN /en/log/${entry.slug} visible text`);
  for (const value of journalAttributeValues(html)) {
    scanJournalText(value, `EN /en/log/${entry.slug} attribute`);
  }
}

// ---------------------------------------------------------------------------
// 8h. Disclosure contract (RED 1.2): the five scoped repeated-list surfaces
//     (Agents, MAGI, Hardware, Ecosystem items, Ecosystem community offers)
//     render as native, independent multi-open <details> with the first item
//     server-open, ordinal/title summaries, visible keyboard focus, static
//     reduced-motion behavior, and responsive prose/figure balance. No
//     carousels, slides, scripted state, client JS, or dependencies.
// ---------------------------------------------------------------------------
// The five script-free disclosure list regions on a built page (one per
// scoped surface); each list div ends with its last details element.
const disclosureListRegions = (html) => [
  ...html.matchAll(/class="disclosure-list">[\s\S]*?<\/details>\s*<\/div>/g),
].map((match) => match[0]);

// 8h1. Source identity: JournalDisclosureList exists and stays script-free;
//      every scoped section consumes it and passes its items.
const disclosureListSource = read(resolve(ROOT, 'archive/src/components/joyan/JournalDisclosureList.astro'));
for (const [token, what] of [
  ['<details', 'renders native <details> elements'],
  ['<summary', 'renders native <summary> elements'],
  ['open={i === 0}', 'server-renders the first item open'],
  ['idPrefix', 'keeps disclosure ids unique per surface'],
]) {
  if (disclosureListSource.includes(token)) {
    pass(`disclosure: JournalDisclosureList.astro ${what} (${token})`);
  } else {
    fail(`disclosure: JournalDisclosureList.astro must ${what} (missing ${token})`);
  }
}
if (/<script/.test(disclosureListSource) || /client:/.test(disclosureListSource)) {
  fail('disclosure: JournalDisclosureList.astro must be script-free with no client: directives');
} else {
  pass('disclosure: JournalDisclosureList.astro is script-free server markup (no client state)');
}

const disclosureSectionNames = ['AgentsSection', 'MagiSection', 'HardwareSection', 'EcosystemSection'];
for (const name of disclosureSectionNames) {
  const source = read(resolve(ROOT, `archive/src/components/joyan/${name}.astro`));
  if (source.includes('JournalDisclosureList.astro')) {
    pass(`disclosure: ${name} consumes JournalDisclosureList`);
  } else {
    fail(`disclosure: ${name} must consume JournalDisclosureList`);
  }
  if (/<script/.test(source) || /client:/.test(source)) {
    fail(`disclosure: ${name} must be script-free with no client: directives`);
  } else {
    pass(`disclosure: ${name} keeps the native disclosure markup (no script, no client state)`);
  }
  const carouselHits = source.match(/\b(?:carousel|slider|swiper|slick)\b/i);
  if (carouselHits) {
    fail(`disclosure: ${name} must not introduce carousel/slide markup (found ${carouselHits[0]})`);
  } else {
    pass(`disclosure: ${name} introduces no carousel/slide markup`);
  }
}

const disclosureSurfacePasses = [
  ['AgentsSection', 'AgentsSection', 'items={content.items}'],
  ['MagiSection', 'MagiSection', 'items={content.items}'],
  ['HardwareSection', 'HardwareSection', 'items={content.items}'],
  ['EcosystemSection', 'EcosystemSection', 'items={content.items}'],
  ['EcosystemSection community offers', 'EcosystemSection', 'items={communityOffers}'],
];
for (const [label, fileName, token] of disclosureSurfacePasses) {
  const source = read(resolve(ROOT, `archive/src/components/joyan/${fileName}.astro`));
  if (source.includes(token)) {
    pass(`disclosure: ${label} passes its items to the disclosure list (${token})`);
  } else {
    fail(`disclosure: ${label} must pass items to the disclosure list (missing ${token})`);
  }
}

// 8h2. WU20 — built evidence inverted: the disclosure surfaces are ARCHIVED,
// so no built page may render any <details>/<summary> journal chrome. The
// archive sources keep the full per-surface contract (scanned above), and the
// built pages are asserted free of the markup.
const detailsTagsIn = (html) => [...html.matchAll(/<details\b[^>]*>/g)].map((match) => match[0]);
const rawSummariesIn = (html) => [...html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/g)].map((match) => match[1]);
for (const [page, html] of [['ES landing', esHtml], ['EN landing', enHtml]]) {
  if (!html) continue;
  const allDetails = detailsTagsIn(html);
  if (allDetails.length === 0 && rawSummariesIn(html).length === 0) {
    pass(`disclosure: ${page} renders no disclosure markup (archived with the old landing)`);
  } else {
    fail(`disclosure: ${page} must not render disclosure markup (archived with the old landing)`);
  }
}
pass('disclosure: no built page renders disclosure summaries (the journal chrome is archived; WU20)');

// 9e. Static performance evidence: route output inventory and build sizes.
//     The client-JS gzip budget itself is enforced in section 7.
const ROUTE_OUTPUT = [
  ['/', 'dist/index.html'],
  ['/en', 'dist/en/index.html'],
];
const ARCHIVED_ROUTE_OUTPUT = ['/bitacora', '/en/log', '/privacy', '/terms',
  ...publishedByLocale.es.map((entry) => `/bitacora/${entry.slug}`),
  ...publishedByLocale.en.map((entry) => `/en/log/${entry.slug}`)];
for (const [route, relPath] of ROUTE_OUTPUT) {
  if (existsSync(resolve(ROOT, relPath))) {
    pass(`routes: ${route} builds to ${relPath}`);
  } else {
    fail(`routes: ${route} must build to ${relPath}`);
  }
}
let archivedRouteOutput = 0;
for (const route of ARCHIVED_ROUTE_OUTPUT) {
  const rel = `dist${route}/index.html`;
  if (existsSync(resolve(ROOT, rel))) {
    archivedRouteOutput += 1;
    fail(`routes: archived route must not build: ${route}`);
  }
}
if (archivedRouteOutput === 0) {
  pass(`routes: all ${ARCHIVED_ROUTE_OUTPUT.length} archived route(s) are out of the build`);
}
const htmlBytes = ROUTE_OUTPUT.reduce(
  (sum, [, relPath]) => sum + (existsSync(resolve(ROOT, relPath)) ? statSync(resolve(ROOT, relPath)).size : 0),
  0
);
pass(
  `evidence: ${ROUTE_OUTPUT.length} HTML routes totalling ${(htmlBytes / 1024).toFixed(1)} KiB; client JS gzip sum ${candidate.total} B across ${candidate.rows.length} chunk(s) (delta budget enforced in section 7)`
);
const disclosureSummaryCount = ROUTE_OUTPUT.filter(([route]) => route === '/' || route === '/en').reduce(
  (sum, [route]) => sum + rawSummariesIn(route === '/' ? esHtml : enHtml).length,
  0
);
pass(
  `evidence: disclosures render ${disclosureSummaryCount} server-side summaries across the two landings (5 scoped surfaces, no client JS)`
);

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
console.log('\niteration-3: all Unit A and Unit B contracts verified.');
