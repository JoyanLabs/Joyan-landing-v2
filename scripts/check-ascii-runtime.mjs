#!/usr/bin/env node
/**
 * WU13/WU14 local acceptance. External Playwright, no new project test dependency.
 *
 * The WU13 tree under `dist-motion-verify/wu13/` is read-only input here: its
 * reports, preimages and captures are never rewritten. WU14 artifacts go to
 * `dist-motion-verify/wu14/` by default; `--out <dir>` writes the run's own
 * report and captures somewhere else, which is how WU15 re-runs this guard
 * without overwriting a single byte of the WU14 record.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { loadPlaywright } from './motion-src/render.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const originalOut = resolve(root, 'dist-motion-verify/wu13');
const correctionOut = resolve(originalOut, 'correction');
const outArg = process.argv.indexOf('--out');
const out = resolve(root, outArg > -1 ? process.argv[outArg + 1] : 'dist-motion-verify/wu14');
const captures = resolve(out, 'captures');
const red = process.argv.includes('--red');
const correctionRed = process.argv.includes('--correction-red');
const base = 'http://127.0.0.1:4321';
const failures = [], views = [], network = [], preservation = [], samples = [], mainViews = [], sceneViews = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const hash = data => createHash('sha256').update(data).digest('hex');
const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
// The six coloured `scenes` pieces this unit delivers, in gallery order.
const SCENE_NAMES = ['night-coast', 'misty-forest', 'desert-night', 'aurora-fjord', 'alpine-dawn', 'ocean-sunset'];
const SCENE_DOTS = '·•●';
const dotOnly = (chars) => chars.every((ch) => ch === '\n' || ch === ' ' || SCENE_DOTS.includes(ch));
const save = async (name, data) => writeFile(resolve(out, name), JSON.stringify(data, null, 2));
const shot = (name) => resolve(captures, name);
await mkdir(out, { recursive: true });
await mkdir(captures, { recursive: true });
try {
  const previous = await readFile(resolve(out, 'green.json'));
  if (JSON.parse(previous).failures.length) {
    await copyFile(resolve(out, 'green.json'), resolve(out, `failed-${hash(previous)}.json`), constants.COPYFILE_EXCL);
  }
} catch (error) {
  if (error.code !== 'ENOENT' && error.code !== 'EEXIST') throw error;
}
const pkg = await json('package.json');
check(pkg.dependencies['ascii.rest'] === '0.4.0', 'exact official ascii.rest@0.4.0 dependency missing');
for (const path of ['src/components/joyan/AsciiRuntime.astro', 'src/lib/ascii-runtime.ts']) {
  try { await readFile(resolve(root, path)); } catch { check(false, `${path} missing`); }
}
// `src/lib/ascii-runtime.ts` is deliberately NOT in this frozen list: WU14
// extends the lab controller on purpose, and that one file is the only
// install-adjacent source allowed to change. The install and lock files stay
// byte-identical to the recorded WU13 correction preimage.
const fixedFiles = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
if (correctionRed) {
  const preimage = resolve(correctionOut, 'preimage');
  await mkdir(preimage, { recursive: true });
  for (const entry of await readdir(originalOut, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const source = resolve(originalOut, entry.name), target = resolve(preimage, entry.name);
    try { await copyFile(source, target, constants.COPYFILE_EXCL); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      assert.equal(hash(await readFile(source)), hash(await readFile(target)), `preimage already differs: ${entry.name}`);
    }
  }
  const state = {};
  for (const path of fixedFiles) state[path] = hash(await readFile(resolve(root, path)));
  await save('fixed-file-preimage.json', state);
} else if (!red) {
  const state = await json('dist-motion-verify/wu13/correction/fixed-file-preimage.json');
  for (const path of fixedFiles) check(hash(await readFile(resolve(root, path))) === state[path], `unauthorized dependency/workspace change: ${path}`);
  for (const entry of await readdir(resolve(correctionOut, 'preimage'), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    check(hash(await readFile(resolve(originalOut, entry.name))) === hash(await readFile(resolve(correctionOut, 'preimage', entry.name))),
      `original WU13 evidence overwritten: ${entry.name}`);
  }
}

async function generatedJs(dir) {
  const paths = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) paths.push(...await generatedJs(path));
    else if (/\.(?:js|mjs|cjs)$/i.test(entry.name)) paths.push(path);
  }
  return paths.sort();
}
async function generatedHtml(dir) {
  const paths = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) paths.push(...await generatedHtml(path));
    else if (/\.html$/i.test(entry.name)) paths.push(path);
  }
  return paths.sort();
}
function inlineScripts(html) {
  const inline = [], excluded = [];
  const jsTypes = new Set(['module', 'text/javascript', 'application/javascript', 'text/ecmascript',
    'application/ecmascript', 'application/x-javascript', 'text/jscript', 'text/livescript',
    'text/x-javascript', 'text/x-ecmascript', ...[0, 1, 2, 3, 4, 5].map(n => `text/javascript1.${n}`)]);
  let index = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = match[1];
    const typeAttr = attrs.match(/(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const type = (typeAttr?.[1] ?? typeAttr?.[2] ?? typeAttr?.[3] ?? '').trim().toLowerCase().split(';')[0];
    const record = { index: index++, type: type || 'classic', bytes: Buffer.byteLength(match[2]),
      gzip: gzipSync(match[2]).length, hash: hash(match[2]) };
    if (/(?:^|\s)src\s*=/i.test(attrs)) excluded.push({ ...record, reason: 'external/src already in asset set' });
    else if (type && !jsTypes.has(type)) excluded.push({ ...record, reason: 'nonexecuting data/import map' });
    else inline.push(record);
  }
  return { inline, excluded };
}
const withinBudget = (total, baseline) => total - baseline <= 22528;
const unrelated = 'window.unrelatedExecutable = 1;';
assert.equal(inlineScripts(`<script>${unrelated}</script>`).inline[0].gzip, gzipSync(unrelated).length);
assert.equal(inlineScripts('<script type="module">export {};</script>').inline.length, 1);
assert.equal(inlineScripts('<script data-src="not-a-source" data-type="application/json">unrelated()</script>').inline.length, 1);
assert.equal(inlineScripts('<script type="application/ld+json">{}</script><script type="application/json">{}</script><script type="importmap">{}</script>').inline.length, 0);
assert.equal(inlineScripts('<script src="/existing.js">ignored()</script>').inline.length, 0);
assert.equal(withinBudget(114433, 91905), true);
assert.equal(withinBudget(114434, 91905), false);
const budgetControls = { unrelatedExecutableCounted: true, moduleCounted: true, dataAttributesNotFilters: true, dataExcluded: true,
  sourcedNotDoubleCounted: true, inclusiveBoundaryAccepted: true, overBoundaryRejected: true };
const chunks = {}, assets = [];
for (const path of await generatedJs(resolve(root, 'dist'))) {
  const bytes = await readFile(path);
  const evidence = { hash: hash(bytes), gzip: gzipSync(bytes).length };
  const name = path.startsWith(resolve(root, 'dist/_astro') + '/')
    ? relative(resolve(root, 'dist/_astro'), path) : relative(resolve(root, 'dist'), path);
  chunks[name] = evidence;
  assets.push({ path: relative(root, path), bytes: bytes.length, ...evidence });
}
const html = await readFile(resolve(root, 'dist/lab/ascii/index.html'), 'utf8');
const { inline, excluded } = inlineScripts(html);
const beforeBudget = await json('dist-motion-verify/wu13/before.json');
const baselineBudget = await json('.artifacts/iteration-2-client-js.json');
const landingChunkNames = Object.keys(beforeBudget.chunks);
for (const name of landingChunkNames) {
  check(JSON.stringify(chunks[name]) === JSON.stringify(beforeBudget.chunks[name]), `original chunk changed: ${name}`);
}
const assetGzip = assets.reduce((sum, asset) => sum + asset.gzip, 0);
const inlineGzip = inline.reduce((sum, script) => sum + script.gzip, 0);
const totalGzip = assetGzip + inlineGzip;

// ---- WU14 accounting ----------------------------------------------------
// The landing allowance is unchanged and enforced the hard way: the five
// original chunks must be byte-identical and sum to the recorded 109818 B
// gzip. Only /lab/ascii may grow, under a cap measured from the real bundle.
const LANDING_FIVE_GZIP = 109818;
const landingGzip = landingChunkNames.reduce((sum, name) => sum + beforeBudget.chunks[name].gzip, 0);
check(landingChunkNames.length === 5 && landingGzip === LANDING_FIVE_GZIP,
  `landing five-chunk set changed: ${landingChunkNames.length} chunks / ${landingGzip} B gzip`);
const labChunkNames = Object.keys(chunks).filter((name) => !landingChunkNames.includes(name));
const labChunkGzip = labChunkNames.reduce((sum, name) => sum + chunks[name].gzip, 0);
const labTotalGzip = labChunkGzip + inlineGzip;
// Cap prior (RED): the six scene modules at their own gzip level 9
// (5318 + 7223 + 7317 + 7631 + 7724 + 7863 = 43076 B) plus the largest honest
// margin this unit allows (4096 B) = 47172 B. The measured build came in far
// below that prior (25,239 B gzip of lab chunk + 0 B inline), so the cap is
// TIGHTENED to measured + 2409 B: the enlargement the user authorized is a real
// measured number with a documented margin, never an "unlimited" lab and never a
// silent raise. WU15 then added our own dot-scene engine, its runtime and the
// library comparison mount to the same single lab chunk; the user authorized
// that enlargement, and the number below is the measured result, not a guess
// (WU14 measured 25,239 B; WU15 measured 29,530 B gzip; see
// `dist-motion-verify/wu16/lab/bundle.json`).
// (A measured total above the prior must be reported, not absorbed.)
//
// WU16 (29,879 B): the engine gained the analytic anti-aliased disc masks and the
// adopted cell-sprite atlas, so its inline module grew from 4,274 B to 4,623 B
// gzip; the library chunk is unchanged at 25,256 B. Cap re-measured as
// measured + 2,048 B, the same documented margin, never a silent raise.
//
// LAB_CAP_GZIP is the same single measured value asserted by
// `scripts/check-iteration-3.mjs` section 7 (its `LAB_CAP_GZIP`), which pins the
// frozen landing five-chunk identity and this cap for the site-wide guard. A
// future change must update both loudly; there is no reset or unlimited mode.
const LAB_CAP_GZIP = 31927;
const LAB_MEASURED_GZIP = 29879;
const LAB_MARGIN_LIMIT = 4096;
// What the lab page itself claims about its own cost. The copy must carry the
// measured numbers, so a claim cannot drift away from the bundle it describes.
const LAB_CLAIMS = { libraryChunkGzip: 25256, ownModuleRaw: 9663, ownModuleGzip: 4623, bakedStillBytes: 41906 };
const withinLabCap = (total, cap) => total <= cap;
assert.equal(withinLabCap(LAB_CAP_GZIP, LAB_CAP_GZIP), true);
assert.equal(withinLabCap(LAB_CAP_GZIP + 1, LAB_CAP_GZIP), false);
check(labTotalGzip >= 20000, `scene gallery missing from the account: lab gzip ${labTotalGzip} B`);
check(labTotalGzip <= LAB_CAP_GZIP,
  `lab runtime/scene gzip ${labTotalGzip} B exceeds the measured WU15 cap ${LAB_CAP_GZIP} B`);
const capMargin = LAB_CAP_GZIP - labTotalGzip;
check(capMargin >= 0 && capMargin <= LAB_MARGIN_LIMIT,
  `lab cap margin ${capMargin} B is outside the honest 0..${LAB_MARGIN_LIMIT} B window`);
// The declared margin is a measurement, not a second allowance: the cap must be
// the measured lab total plus at most 4096 B, and the measured total must move
// whenever the cap moves.
const declaredLabMargin = LAB_CAP_GZIP - LAB_MEASURED_GZIP;
check(declaredLabMargin >= 0 && declaredLabMargin <= LAB_MARGIN_LIMIT,
  `declared lab margin ${declaredLabMargin} B is outside 0..${LAB_MARGIN_LIMIT} B`);
assert.equal(LAB_CAP_GZIP - LAB_MEASURED_GZIP > LAB_MARGIN_LIMIT, false);
const withinBudgetControls = { inclusiveBoundaryAccepted: withinLabCap(LAB_CAP_GZIP, LAB_CAP_GZIP),
  overBoundaryRejected: !withinLabCap(LAB_CAP_GZIP + 1, LAB_CAP_GZIP) };
assert.equal(dotOnly([...'·•● ']), true);
assert.equal(dotOnly([...'·•●A']), false);

// The install and lock files must stay exactly as the WU13 preimage recorded.
const installPreimage = await json('dist-motion-verify/wu13/correction/fixed-file-preimage.json');
for (const path of fixedFiles) {
  check(hash(await readFile(resolve(root, path))) === installPreimage[path], `dependency/workspace file changed: ${path}`);
}

// ---- WU15 comparison surface -------------------------------------------
// Our own engine's scene and the library's `night-coast` must be shown on the
// same grid and the same size, with the baked still of OUR scene beside them.
// The library gallery above stays untouched: the comparison uses its own
// attribute, so the six-scene count and every WU14 assertion keep their meaning.
const OWN_SCENE = 'joyan-night-coast';
const OWN_BAKED = /_astro\/joyan-night-coast\.[A-Za-z0-9_-]+\.png/;
check((html.match(/data-ascii-compare="/g) ?? []).length === 1,
  'the comparison must mount the library night-coast exactly once');
check(html.includes('data-ascii-compare="night-coast"'),
  'the comparison must show the library night-coast on the shared grid');
check((html.match(/data-own-scene="/g) ?? []).length === 1,
  'our own scene must be mounted live exactly once');
check(html.includes(`data-own-scene="${OWN_SCENE}"`),
  `the comparison must mount our scene ${OWN_SCENE} live`);
check(OWN_BAKED.test(html), 'the comparison must show the baked still of our scene');
check(html.includes('200 × 100') || html.includes('200x100'),
  'the comparison must state the shared 200 x 100 grid');
check(/measured/i.test(html), 'the comparison must state the measured cost of what it draws');
// The page must quote the numbers that were actually measured, and this guard
// must fail if either side moves without the other.
const labPageInline = inlineScripts(html).inline;
const ownModule = labPageInline.find((script) => script.bytes === LAB_CLAIMS.ownModuleRaw);
check(Boolean(ownModule) && ownModule.gzip === LAB_CLAIMS.ownModuleGzip,
  `the lab page's own engine module must measure ${LAB_CLAIMS.ownModuleRaw}/${LAB_CLAIMS.ownModuleGzip} B raw/gzip, saw ${JSON.stringify(ownModule ?? null)}`);
for (const [label, value] of Object.entries(LAB_CLAIMS)) {
  check(html.includes(`${value} B`),
    `the comparison must state the measured ${label} (${value} B), not an invented number`);
}
let bakedBytes = null;
try {
  bakedBytes = (await readFile(resolve(root, 'scripts/scene-src/baked/joyan-night-coast.png'))).length;
} catch (error) {
  check(false, `the engine's baked still is missing: ${error.message}`);
}
check(bakedBytes === LAB_CLAIMS.bakedStillBytes,
  `the baked still must be ${LAB_CLAIMS.bakedStillBytes} B, saw ${bakedBytes}`);

// No route other than /lab/ascii may carry runtime markup or fetch its chunk.
let sceneMounts = 0;
for (const name of SCENE_NAMES) {
  check(html.includes(`data-ascii-scene="${name}"`), `SSR scene mount missing: ${name}`);
  sceneMounts += html.split(`data-ascii-scene="${name}"`).length - 1;
}
check(sceneMounts === 6, `six SSR scene mounts required, saw ${sceneMounts}`);
check(/bas3line/.test(html) && /MIT/.test(html) && /github\.com\/bas3line\/ascii/.test(html),
  'lab must keep the MIT/bas3line attribution and source link');
check(/noindex/.test(html) && /nofollow/.test(html), 'lab must stay noindex,nofollow');
check((html.match(/data-ascii-piece="/g) ?? []).length === 2, 'the two SSR runtime pieces must stay exactly two');
const markerHtml = [];
for (const path of await generatedHtml(resolve(root, 'dist'))) {
  const source = await readFile(path, 'utf8');
  const name = relative(resolve(root, 'dist'), path);
  const scene = source.includes('data-ascii-scene');
  const piece = source.includes('data-ascii-piece');
  const chunk = labChunkNames.some((id) => source.includes(id));
  if (scene || piece || chunk) markerHtml.push({ path: name, scene, piece, chunk });
}
check(markerHtml.length === 1 && markerHtml[0].path === 'lab/ascii/index.html',
  `runtime markup/chunk must exist only on /lab/ascii: ${JSON.stringify(markerHtml)}`);
// Executable inline scripts per set: the lab page's inline is part of the lab
// budget above; site-wide and landing-route inline is pre-existing behaviour,
// measured here for honest reporting with NO limit asserted for it.
const inlineBySet = { site: { gzip: 0, blocks: 0, pages: 0 }, landing: { gzip: 0, blocks: 0 }, lab: { gzip: 0, blocks: 0 } };
const LANDING_ROUTE_HTML = ['index.html', 'en/index.html'];
const LAB_ROUTE_HTML = 'lab/ascii/index.html';
let generatedHtmlCount = 0;
for (const path of await generatedHtml(resolve(root, 'dist'))) {
  const name = relative(resolve(root, 'dist'), path).replaceAll('\\', '/');
  const { inline: pageInline } = inlineScripts(await readFile(path, 'utf8'));
  const pageGzip = pageInline.reduce((sum, script) => sum + script.gzip, 0);
  generatedHtmlCount += 1;
  inlineBySet.site.gzip += pageGzip;
  inlineBySet.site.blocks += pageInline.length;
  if (pageInline.length) inlineBySet.site.pages += 1;
  if (LANDING_ROUTE_HTML.includes(name)) {
    inlineBySet.landing.gzip += pageGzip;
    inlineBySet.landing.blocks += pageInline.length;
  }
  if (name === LAB_ROUTE_HTML) {
    inlineBySet.lab.gzip += pageGzip;
    inlineBySet.lab.blocks += pageInline.length;
  }
}
check(inlineBySet.lab.gzip === inlineGzip, 'lab inline accounting must match the lab page measurement');
const budget = { method: 'Recursive dist/**/*.js generated client JS plus every executable inline script on the lab page, each counted once; site-wide and landing-route inline scripts are measured and reported but deliberately unbudgeted',
  assetGzip, inlineGzip, totalGzip, baseline: baselineBudget.totalGzip,
  delta: totalGzip - baselineBudget.totalGzip, margin: baselineBudget.totalGzip + 22528 - totalGzip,
  assets, inline, excluded, chunks,
  landing: { chunkNames: landingChunkNames, gzip: landingGzip, frozenByteIdentical: true },
  lab: { chunkNames: labChunkNames, chunkGzip: labChunkGzip, inlineGzip, totalGzip: labTotalGzip,
    cap: LAB_CAP_GZIP, margin: capMargin, measured: LAB_MEASURED_GZIP,
    supersededLabDeltaBudget: 22528, supersededWU14Measured: 25239,
    marginRule: `cap - measured lab total, required 0..${LAB_MARGIN_LIMIT} B`,
    // Six scene modules at gzip level 9 of their raw files: 5318 + 7223 + 7317
    // + 7631 + 7724 + 7863 = 43076 B; the pre-measurement prior was that plus
    // the 4096 B maximum margin. The WU14 measured build came in below it.
    capPrior: 43076 + 4096 },
  inlineBySet: { ...inlineBySet, generatedHtmlCount,
    note: 'pre-existing, unbudgeted, no limit asserted; only the lab page inline participates in the lab cap' },
  sceneMounts, markerHtml, controls: { ...budgetControls, ...withinBudgetControls } };
await save(correctionRed ? 'bundle-red.json' : 'bundle.json', budget);
if (process.argv.includes('--bundle-only')) {
  console.log(JSON.stringify({ ...budget, failures }, null, 2));
  process.exit(failures.length ? 1 : 0);
}

const typography = async page => page.locator('[data-ascii-piece="donut"] pre').evaluate(el => {
  const style = getComputedStyle(el), node = el.firstChild;
  const range = document.createRange();
  range.setStart(node, 0); range.setEnd(node, 1);
  const advance = range.getBoundingClientRect().width;
  const at = node.textContent.indexOf('===');
  const equals = [];
  if (at >= 0) for (let i = 0; i < 3; i++) {
    range.setStart(node, at + i); range.setEnd(node, at + i + 1);
    equals.push(range.getBoundingClientRect().width);
  }
  return { font: style.fontFamily, size: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight),
    advance, ratio: parseFloat(style.lineHeight) / advance, ligatures: style.fontVariantLigatures, equals,
    localFontReady: document.fonts.check(`${style.fontSize} "JetBrains Mono Variable"`) };
});
function checkTypography(measured, label) {
  check(measured.localFontReady, `${label}: local font not ready`);
  check(Math.abs(measured.lineHeight / measured.size - 1.2) < .01, `${label}: canonical PRE line-height is not 1.2`);
  check(Math.abs(measured.ratio - 2) < .1, `${label}: donor 2:1 cell projection distorted (${measured.ratio})`);
  check(measured.ligatures === 'none', `${label}: ASCII ligatures must be disabled (${measured.ligatures})`);
  check(measured.equals.length === 3 && measured.equals.every(w => Math.abs(w - measured.advance) < .1), `${label}: equals glyph cells not individually spaced`);
}
if (correctionRed) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  try {
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      await page.goto(base + '/lab/ascii', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const measured = await typography(page);
      checkTypography(measured, `${width}/RED`);
      views.push({ width, typography: measured });
      await page.locator('[data-ascii-piece="donut"]').screenshot({ path: shot(`red-${width}-pre.png`) });
      await page.close();
    }
  } finally { await browser.close(); }
  await save('red.json', { failures, budget, views });
  console.log(JSON.stringify({ failures, totalGzip, delta: budget.delta, views }, null, 2));
  process.exit(failures.length ? 1 : 0);
}
const protectedPaths = execFileSync('git', ['ls-files', 'public/assets/motion', 'public/assets/dither',
  'public/assets/brand', 'scripts/motion-src', 'src/components/joyan/Hero.astro',
  'src/components/joyan/DitherScene.astro', '.artifacts/iteration-2-client-js.json'], { encoding: 'utf8' })
  .trim().split('\n');
for (const path of protectedPaths) {
  const current = await readFile(resolve(root, path));
  const head = execFileSync('git', ['show', `HEAD:${path}`], { maxBuffer: 16 * 1024 * 1024 });
  const unchanged = hash(current) === hash(head);
  check(unchanged, `protected path changed: ${path}`);
  preservation.push({ path, sha256: hash(current), unchanged });
  if (path.startsWith('public/')) {
    check(hash(await readFile(resolve(root, 'dist', path.slice(7)))) === hash(head), `dist asset changed: ${path}`);
    const response = await fetch(`${base}/${path.slice(7)}`);
    check(response.ok && hash(Buffer.from(await response.arrayBuffer())) === hash(head), `live asset changed: ${path}`);
  }
}
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const old = { chunks, pages: {} };
const fingerprint = () => {
  const video = document.querySelector('#top video');
  return { hero: video?.outerHTML, css: video && ['objectFit', 'objectPosition', 'display', 'opacity'].map(k => getComputedStyle(video)[k]),
    metadata: [...document.querySelectorAll('head meta, head link[rel="canonical"], head link[rel="alternate"]')].map(e => e.outerHTML) };
};
const frame = async (page, kind) => page.locator(`[data-ascii-piece="${kind}"] [data-ascii-output]`).evaluate(el => {
  if (el instanceof HTMLPreElement) return el.textContent;
  if (el instanceof HTMLCanvasElement) return el.toDataURL();
  return null;
});
const sample = async (page, kind, moving) => {
  // Browser media-query and intersection change notifications are asynchronous.
  await page.waitForTimeout(150);
  const frames = [await frame(page, kind)];
  // The small colored mark glints periodically rather than changing every frame.
  const sampleCount = moving && kind === 'java' ? 10 : 1;
  for (let i = 0; i < sampleCount; i++) {
    await page.waitForTimeout(sampleCount === 1 ? 450 : 350);
    frames.push(await frame(page, kind));
  }
  const changed = new Set(frames).size > 1;
  const diagnostic = await page.locator(`[data-ascii-piece="${kind}"]`).evaluate(el => ({
    status: el.querySelector('[data-ascii-status]').textContent,
    rect: el.querySelector('[data-ascii-output]').getBoundingClientRect().toJSON(),
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, hidden: document.hidden,
  }));
  check(moving ? changed : !changed, `${kind}: expected ${moving ? 'changing' : 'frozen'} real frame: ${JSON.stringify(diagnostic)}`);
  const evidence = { kind, moving, changed, hashes: frames.map(f => hash(f ?? '')), diagnostic,
    viewport: page.viewportSize(), url: page.url() };
  samples.push(evidence);
  return evidence;
};
// ---- WU14 scene gallery --------------------------------------------------
// A scene must be judged on real canvas pixels, not on the presence of a DOM
// node: every check below reads the drawn frame and requires it to be coloured,
// non-uniform, distinct per scene and actually changing over time.
const SCENE_LABELS = {
  'night-coast': 'night coast', 'misty-forest': 'misty forest', 'desert-night': 'desert night',
  'aurora-fjord': 'aurora fjord', 'alpine-dawn': 'alpine dawn', 'ocean-sunset': 'ocean sunset',
};
const sceneFingerprint = (host) => host.locator('[data-ascii-output]').evaluate((el) => {
  const canvas = el;
  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  const { data } = context.getImageData(0, 0, width, height);
  let painted = 0, rgb = 5381, luma = 52711;
  const colors = new Set(), bins = new Array(24).fill(0);
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4, alpha = data[i + 3];
      if (alpha) painted += 1;
      const value = ((data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) * alpha) / 255;
      rgb = (Math.imul(rgb, 33) ^ (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16))) >>> 0;
      luma = (Math.imul(luma, 33) ^ (value | 0)) >>> 0;
      colors.add((data[i] >> 5) * 64 + (data[i + 1] >> 5) * 8 + (data[i + 2] >> 5));
      bins[Math.min(23, value >> 5)] += 1;
    }
  }
  const sampled = Math.ceil(width / 2) * Math.ceil(height / 2);
  return { width, height, sampled, painted, colorBuckets: colors.size,
    lumaBins: bins.filter((count) => count > sampled * 0.005).length,
    rgb: rgb.toString(16), luma: luma.toString(16) };
});
const sceneSample = async (page, name, moving, count = 3) => {
  const host = page.locator(`[data-ascii-scene="${name}"]`);
  const frames = [];
  for (let i = 0; i < count; i += 1) {
    frames.push(await sceneFingerprint(host));
    if (i < count - 1) await page.waitForTimeout(500);
  }
  const changes = new Set(frames.map((frame) => `${frame.rgb}:${frame.luma}`)).size - 1;
  check(moving ? changes >= 1 : changes === 0,
    `${name}: expected ${moving ? 'changing' : 'frozen'} dot frames, saw ${changes} change(s) in ${count} samples`);
  return { name, moving, changes, fingerprints: frames.map((frame) => ({ rgb: frame.rgb, luma: frame.luma,
    colorBuckets: frame.colorBuckets, lumaBins: frame.lumaBins, painted: frame.painted, sampled: frame.sampled,
    box: `${frame.width}x${frame.height}` })) };
};
async function scenePass(page, width, mode) {
  const view = { width, mode, mountCount: 0, captions: [], scenes: [] };
  const mountCount = await page.locator('[data-ascii-scene]').count();
  view.mountCount = mountCount;
  check(mountCount === 6, `${width}/${mode}: six scene mounts required, saw ${mountCount}`);
  if (mountCount !== 6) return view;
  for (const name of SCENE_NAMES) {
    const host = page.locator(`[data-ascii-scene="${name}"]`);
    const scene = { name };
    if (await host.count() !== 1) { check(false, `${width}/${mode}/${name}: exactly one mount required`); continue; }
    const caption = (await host.locator('[data-ascii-caption]').innerText()).replace(/\s+/g, ' ').trim();
    scene.caption = caption;
    view.captions.push(caption);
    check(caption.length > 40 && caption.toLowerCase().includes(SCENE_LABELS[name]),
      `${width}/${mode}/${name}: caption must name the scene readably (${caption.slice(0, 90)})`);
    check(await host.locator('button').count() === 1, `${width}/${mode}/${name}: one pause/play control required`);
    check(await host.locator('canvas[data-ascii-output]').count() === 1, `${width}/${mode}/${name}: canvas output required`);
    check(await host.locator('[data-ascii-fallback]').count() === 1, `${width}/${mode}/${name}: SSR fallback required`);
    await host.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    if (mode === 'no-js') {
      const fallback = (await host.locator('[data-ascii-fallback]').innerText()).trim();
      scene.noJs = { fallback, canvasVisible: await host.locator('canvas').isVisible(), disabled: await host.locator('button').isDisabled() };
      check(fallback.length > 20, `${name}: descriptive no-JS fallback required`);
      check(!scene.noJs.canvasVisible && scene.noJs.disabled, `${name}: no-JS must show text, not a blank canvas`);
      view.scenes.push(scene);
      continue;
    }
    const geometry = await host.evaluate((el) => {
      const canvas = el.querySelector('[data-ascii-output]');
      const rect = canvas.getBoundingClientRect();
      return { documentWidth: document.documentElement.scrollWidth, ready: el.hasAttribute('data-ready'),
        width: rect.width, height: rect.height, status: el.querySelector('[data-ascii-status]').textContent };
    });
    scene.geometry = geometry;
    check(geometry.documentWidth === width, `${width}/${mode}: scene gallery horizontal overflow ${geometry.documentWidth}`);
    check(geometry.ready && geometry.width > 0 && geometry.height > 0, `${name}: mounted canvas has no box`);
    check(Math.abs(geometry.width / geometry.height - 2) < 0.08,
      `${name}: 200x100 square cells must keep a 2:1 frame (${geometry.width}x${geometry.height})`);
    if (mode === 'normal') {
      const motion = await sceneSample(page, name, true);
      scene.motion = motion;
      scene.fingerprint = motion.fingerprints[0];
      // Dark night scenes legitimately peak in one or two luma bins, so the
      // non-uniformity test is: many distinct colours, a real painted ground and
      // more than one brightness band. A blank or flat canvas fails all three.
      check(scene.fingerprint.colorBuckets >= 8 && scene.fingerprint.lumaBins >= 2
        && scene.fingerprint.painted >= scene.fingerprint.sampled * 0.9,
        `${name}: dot frame must be coloured and non-uniform (${JSON.stringify(scene.fingerprint)})`);
      scene.rafCount = await page.evaluate(() => window.wu13Rafs.size);
      check(scene.rafCount >= 1 && scene.rafCount <= 8, `${name}: bounded live loops expected, saw ${scene.rafCount}`);
      await host.locator('button').focus();
      await page.keyboard.press('Enter');
      scene.paused = await sceneSample(page, name, false, 2);
      await page.keyboard.press('Space');
      scene.resumed = await sceneSample(page, name, true, 2);
    } else {
      scene.reduced = await sceneSample(page, name, false, 2);
      check(await host.locator('button').isDisabled(), `${name}: reduced-motion control must be disabled`);
      const reducedLabel = (await host.locator('button').innerText()).trim();
      scene.reducedLabel = reducedLabel;
      check(!/play/i.test(reducedLabel),
        `${name}: a disabled reduced-motion control must not offer playback, saw "${reducedLabel}"`);
    }
    view.scenes.push(scene);
  }
  check(new Set(view.captions).size === view.captions.length, `${width}/${mode}: scene captions must be distinct`);
  const fingerprints = view.scenes.map((scene) => scene.fingerprint).filter(Boolean);
  if (fingerprints.length === 6) {
    const distinct = new Set(fingerprints.map((frame) => `${frame.colorBuckets}:${frame.rgb}`));
    check(distinct.size === 6, `six distinct scene fingerprints required, saw ${distinct.size}`);
  }
  if (mode === 'normal') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    view.offscreen = await sceneSample(page, 'ocean-sunset', false, 2);
    view.offscreenRafs = await page.evaluate(() => window.wu13Rafs.size);
    check(view.offscreenRafs <= 1, `offscreen scene loops must stop, saw ${view.offscreenRafs} active`);
  }
  return view;
}
try {
  for (const route of ['/', '/en', '/bitacora', '/en/log', '/privacy', '/terms', '/404']) {
    const page = await browser.newPage();
    const requests = [];
    page.on('request', r => requests.push(r.url()));
    const response = await page.goto(base + route, { waitUntil: 'networkidle' });
    check(response.status() === 200 || route === '/404', `${route}: old route HTTP failure`);
    old.pages[route] = await page.evaluate(fingerprint);
    check(await page.locator('[data-ascii-piece]').count() === 0, `${route}: runtime leaked into old page`);
    if (!red) {
      const before = await json('dist-motion-verify/wu13/before.json');
      assert.deepEqual(JSON.parse(JSON.stringify(old.pages[route])), before.pages[route], `${route}: F1 DOM/style or metadata changed`);
      const added = Object.keys(chunks).filter(n => !before.chunks[n]);
      check(!requests.some(url => added.some(n => url.endsWith(n))), `${route}: runtime chunk fetched`);
    }
    await page.close();
  }
  if (red) {
    await save('before.json', old);
    const page = await browser.newPage();
    const response = await page.goto(base + '/lab/ascii', { waitUntil: 'networkidle' });
    check(response.status() === 200, `live /lab/ascii HTTP ${response.status()} (expected 200)`);
    check(await page.locator('[data-ascii-piece]').count() === 2, 'live genuine text/canvas runtime comparison missing');
    // WU14 RED must be the same predicate GREEN later runs, not a weaker one.
    sceneViews.push(await scenePass(page, 390, 'normal'));
    await page.close();
  } else {
    const mainBaseline = await json('dist-motion-verify/wu13/before.json');
    for (const route of ['/', '/en']) for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const response = await page.goto(base + route, { waitUntil: 'networkidle' });
      const measured = JSON.parse(JSON.stringify(await page.evaluate(fingerprint)));
      assert.deepEqual(measured, mainBaseline.pages[route], `${route}/${width}: normal F1 DOM/style or metadata changed`);
      const inlineRuntime = await page.evaluate(() => [...document.scripts].some(s => s.textContent.includes('data-ascii-piece')));
      check(!inlineRuntime && response.ok(), `${route}/${width}: runtime leaked or HTTP failure`);
      mainViews.push({ route, width, unchanged: true,
        documentWidth: await page.evaluate(() => document.documentElement.scrollWidth) });
      await page.close();
    }
    const installed = await json('node_modules/ascii.rest/package.json');
    check(installed.name === 'ascii.rest' && installed.version === '0.4.0' && installed.license === 'MIT', 'published package provenance mismatch');
    const donut = await import('ascii.rest/pieces/donut');
    const cup = await import('ascii.rest/pieces/java');
    const textFrame = donut.default();
    const color = new Uint8Array(cup.meta.cols * cup.meta.rows);
    const cupFrame = cup.default();
    assert.equal(textFrame(0), donut.default()(0), 'package donut must have a repeatable static frame');
    assert.notEqual(textFrame(0), textFrame(1), 'real package donut must advance');
    const stillCup = cupFrame(0, { color });
    const colorsAtZero = Array.from(color);
    assert.notEqual(cupFrame(1, { color }), stillCup, 'real package glint must advance');
    assert.notDeepEqual(Array.from(color), colorsAtZero, 'package palette indices must actually advance');
    await save('package-frames.json', { name: installed.name, version: installed.version,
      donutStatic: hash(textFrame(0)), cupStatic: hash(stillCup), palette: cup.meta.palette });
    const runtime = await readFile(resolve(root, 'src/lib/ascii-runtime.ts'), 'utf8');
    check(runtime.includes("from 'ascii.rest'") && runtime.includes('ascii.rest/pieces/donut') && runtime.includes('ascii.rest/pieces/java'), 'actual package/leaf imports missing');
    for (const name of SCENE_NAMES) {
      check(runtime.includes(`'ascii.rest/pieces/${name}'`), `focused scene leaf import missing: ${name}`);
    }
    check(!/from 'ascii\.rest\/pieces'/.test(runtime), 'piece barrel/catalogue import must stay out of the lab');
    check(!/ascii\.rest\/pieces\/index/.test(runtime), 'piece catalogue fan-out must stay out of the lab');
    check(!/https?:\/\//.test(runtime), 'no CDN or remote module may be imported by the lab runtime');
    const sceneMeta = {};
    for (const name of SCENE_NAMES) {
      const piece = await import(`ascii.rest/pieces/${name}`);
      const frame = piece.default();
      const chars = new Set();
      for (const t of [0, 0.5, 2.5, 7]) for (const ch of frame(t)) chars.add(ch);
      const ink = [...chars].filter((ch) => ch !== '\n' && ch !== ' ');
      check(dotOnly([...chars]), `${name}: scenes must draw dots only, saw ${ink.join('')}`);
      check(ink.length >= 1 && chars.has(' '), `${name}: dot ramp needs inked and empty cells`);
      assert.notEqual(frame(0), frame(2.5), `${name}: package scene must advance`);
      const { meta } = piece;
      check(meta.category === 'scenes' && meta.cols === 200 && meta.rows === 100 && meta.cell === 1,
        `${name}: 200x100 square-cell scene invariant changed`);
      check((meta.palette?.length ?? 0) >= 8, `${name}: coloured scene palette missing`);
      check(html.includes(meta.note) && html.includes(meta.name), `${name}: lab caption must state the package's own name and line`);
      sceneMeta[name] = { name: meta.name, note: meta.note, cols: meta.cols, rows: meta.rows, cell: meta.cell,
        fps: meta.fps, colors: meta.palette?.length ?? 0, ink: ink.join('') };
    }
    await save('scene-frames.json', { dots: SCENE_DOTS, scenes: sceneMeta });
    const before = await json('dist-motion-verify/wu13/before.json');
    for (const [name, evidence] of Object.entries(before.chunks)) assert.deepEqual(chunks[name], evidence, `original chunk changed: ${name}`);
    check(landingGzip === LANDING_FIVE_GZIP && labTotalGzip <= LAB_CAP_GZIP,
      'WU14 budget accounting regressed after the browser pass');
    for (const width of [390, 768, 1440]) for (const mode of ['normal', 'reduce', 'no-js']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 },
        reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference', javaScriptEnabled: mode !== 'no-js' });
      await context.addInitScript(() => {
        window.wu13DocumentId = crypto.randomUUID();
        window.wu13AtlasFonts = [];
        window.wu13Rafs = new Set();
        const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
        window.requestAnimationFrame = callback => {
          const id = raf(time => { window.wu13Rafs.delete(id); callback(time); });
          window.wu13Rafs.add(id);
          return id;
        };
        window.cancelAnimationFrame = id => { window.wu13Rafs.delete(id); cancel(id); };
        const draw = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (...args) {
          if (!window.wu13AtlasFonts.includes(this.font)) window.wu13AtlasFonts.push(this.font);
          return draw.apply(this, args);
        };
      });
      const page = await context.newPage();
      const errors = [], requests = [], lifecycle = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.url()}: HTTP ${r.status()}`); });
      await context.route('**/*', route => {
        const url = route.request().url(); requests.push(url);
        if (new URL(url).origin !== base) { errors.push(`external request: ${url}`); return route.abort(); }
        return route.continue();
      });
      const response = await page.goto(base + '/lab/ascii', { waitUntil: 'networkidle' });
      check(response.status() === 200, `${width}/${mode}: HTTP failure`);
      check((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'), 'lab must be noindex');
      check((await page.locator('meta[name="robots"]').getAttribute('content')).includes('nofollow'), 'lab must be nofollow');
      check((await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith('/lab/ascii'), 'lab self-canonical required');
      await page.evaluate(() => document.fonts.ready);
      check(await page.locator('[data-ascii-piece]').count() === 2, 'two runtime pieces required');
      const view = { width, mode, pieces: [] };
      for (const kind of ['donut', 'java']) {
        const host = page.locator(`[data-ascii-piece="${kind}"]`);
        await host.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        const geometry = await host.evaluate(el => {
          const output = el.querySelector('[data-ascii-output]'), s = getComputedStyle(output), r = output.getBoundingClientRect();
          return { documentWidth: document.documentElement.scrollWidth, viewport: innerWidth, width: r.width, height: r.height,
            scrollWidth: output.scrollWidth, clientWidth: output.clientWidth, font: s.fontFamily, fontSize: s.fontSize,
            lineHeight: s.lineHeight, fallback: el.querySelector('[data-ascii-fallback]').textContent };
        });
        check(geometry.documentWidth === width, `${width}/${mode}: new lab horizontal overflow ${geometry.documentWidth}`);
        check(geometry.scrollWidth <= geometry.clientWidth + 1, `${width}/${mode}/${kind}: glyphs overflow frame`);
        check(geometry.fallback.trim().length > 20, `${kind}: clear SSR fallback missing`);
        if (mode !== 'no-js') {
          if (kind === 'donut') {
            const measured = await typography(page);
            checkTypography(measured, `${width}/${mode}`);
            view.typography = measured;
          }
          const content = await host.locator('[data-ascii-output]').evaluate(el => {
            if (el instanceof HTMLPreElement) return { rows: el.textContent.split('\n').length,
              columns: Math.max(...el.textContent.split('\n').map(line => line.length)),
              localFontReady: document.fonts.check('12px "JetBrains Mono Variable"') };
            const ctx = el.getContext('2d'), data = ctx.getImageData(0, 0, el.width, el.height).data;
            let red = 0, blue = 0, painted = 0;
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3]) painted++;
              if (data[i] > data[i + 2] + 30) red++;
              if (data[i + 2] > data[i] + 30) blue++;
            }
            return { painted, red, blue, atlasFonts: window.wu13AtlasFonts };
          });
          if (kind === 'donut') check(content.rows === 22 && content.columns === 40 && content.localFontReady, 'real 40x22 locally-fonted PRE required');
          else check(content.painted > 100 && content.red > 50 && content.blue > 50 && content.atlasFonts.length > 0, 'real colored canvas pixels/font required');
          view.pieces.push({ kind, content });
          const motion = await sample(page, kind, mode === 'normal');
          const rafCount = await page.evaluate(() => window.wu13Rafs.size);
          check(rafCount <= 2, `${width}/${mode}: duplicate runtime RAF loops (${rafCount})`);
          let frameCount;
          if (kind === 'donut' && mode === 'normal') {
            frameCount = await host.locator('pre').evaluate(el => new Promise(resolve => {
              let count = 0;
              const observer = new MutationObserver(() => count++);
              observer.observe(el, { childList: true });
              setTimeout(() => { observer.disconnect(); resolve(count); }, 1000);
            }));
            check(frameCount > 2 && frameCount <= 13, `12 fps ceiling violated: ${frameCount} PRE updates/s`);
          }
          view.pieces.push({ kind, geometry, motion, rafCount, frameCount });
          const button = host.locator('button');
          if (mode === 'normal') {
            await button.focus(); await page.keyboard.press('Enter');
            await sample(page, kind, false);
            await page.keyboard.press('Space'); await sample(page, kind, true);
            await page.emulateMedia({ reducedMotion: 'reduce' }); await sample(page, kind, false);
            await page.emulateMedia({ reducedMotion: 'no-preference' }); await sample(page, kind, true);
            // Real scroll and visibility-event test. Hidden document property is simulated;
            // this exercises the browser listener without claiming OS-tab throttling proof.
            await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
            await sample(page, kind, false);
            await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
            await sample(page, kind, true);
            await page.locator('h1').scrollIntoViewIfNeeded(); await page.waitForTimeout(250); await sample(page, kind, false);
            await host.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); await sample(page, kind, true);
          } else {
            check(await button.isDisabled(), `${kind}: reduced-motion play must be disabled`);
            await page.emulateMedia({ reducedMotion: 'no-preference' }); await sample(page, kind, true);
            await page.emulateMedia({ reducedMotion: 'reduce' }); await sample(page, kind, false);
          }
        } else {
          check(await host.locator('button').isDisabled(), `${kind}: no-JS controls must remain disabled`);
          check(await host.locator('[data-ascii-fallback]').isVisible(), `${kind}: no-JS fallback invisible`);
          view.pieces.push({ kind, geometry });
        }
      await host.screenshot({ path: shot(`${width}-${mode}-${kind}.png`) });
      }
      const baked = page.locator('#dither-scene'); await baked.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      // Scenes are inspected after the accepted WU13 pieces, on the same page.
      const sceneView = await scenePass(page, width, mode);
      sceneViews.push(sceneView);
      // The scene pass scrolls the document, so the baked film is brought back
      // into view before the accepted WU13 native-playback measurement runs.
      await baked.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      if (mode === 'normal') for (const scene of sceneView.scenes) {
        await page.locator(`[data-ascii-scene="${scene.name}"]`).screenshot({ path: shot(`${width}-${mode}-scene-${scene.name}.png`) });
      }
      const nativeBefore = await baked.locator('video').evaluate(v => v.currentTime);
      await page.waitForTimeout(500);
      const native = await baked.locator('video').evaluate(v => ({ paused: v.paused, time: v.currentTime, display: getComputedStyle(v).display }));
      native.advance = (native.time - nativeBefore + 15) % 15;
      if (mode === 'no-js') check(native.advance > .2, `${width}: native no-JS video should actually advance`);
      if (mode === 'reduce') check(native.paused && native.display === 'none', 'reduced baked video must actually pause and hide');
      view.native = native;
      await baked.screenshot({ path: shot(`${width}-${mode}-baked.png`) });
      await page.locator('h1').scrollIntoViewIfNeeded();
      await page.screenshot({ path: shot(`${width}-${mode}.png`), fullPage: true });
      if (mode === 'normal') {
        // Native document navigation, not a ClientRouter swap. Register after
        // the controller so pagehide evidence is captured after its cleanup.
        const documentId = await page.evaluate(() => {
          window.addEventListener('pagehide', event => sessionStorage.setItem('wu13-pagehide', JSON.stringify({
            documentId: window.wu13DocumentId, rafCount: window.wu13Rafs.size, persisted: event.persisted,
          })));
          return window.wu13DocumentId;
        });
        check(await page.locator('meta[name="astro-view-transitions-enabled"]').count() === 0, 'isolated lab must not import ClientRouter');
        // Leave with live loops: a zero count after leaving must prove cleanup,
        // not merely the offscreen state used for the preceding full-page image.
        await page.locator('[data-ascii-piece="java"]').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await page.locator('[data-ascii-scene="ocean-sunset"]').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        check(await page.evaluate(() => window.wu13Rafs.size) > 0, 'navigation cleanup test needs an active runtime loop');
        await page.locator('a[data-lab-return]').evaluate(el => el.click());
        await page.waitForURL(base + '/'); await page.waitForTimeout(250);
        check(await page.evaluate(() => window.wu13DocumentId) !== documentId, 'return link did not create a new document');
        // Synchronous same-origin test storage survives unload; console transport
        // can drop messages when Chromium destroys the old execution context.
        const cleanup = await page.evaluate(() => JSON.parse(sessionStorage.getItem('wu13-pagehide') ?? 'null'));
        if (cleanup) lifecycle.push(cleanup);
        check(lifecycle.some(event => event.documentId === documentId && event.rafCount === 0), 'native pagehide did not cancel runtime RAFs');
        view.navigation = { kind: 'native full-document', pagehide: lifecycle };
        await page.goBack(); await page.waitForURL(base + '/lab/ascii');
        await page.evaluate(() => document.fonts.ready);
        await page.locator('[data-ascii-piece="donut"]').scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
        await sample(page, 'donut', true);
        await page.locator('[data-ascii-piece="java"]').scrollIntoViewIfNeeded(); await sample(page, 'java', true);
        await page.locator('[data-ascii-scene="ocean-sunset"]').scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
        view.sceneReturn = await sceneSample(page, 'ocean-sunset', true, 2);
      }
      check(errors.length === 0, `${width}/${mode}: ${errors.join('; ')}`);
      view.errors = errors; views.push(view); network.push({ width, mode, requests });
      await context.close();
    }
  }
} finally { await browser.close(); }
await save(red ? 'red.json' : 'green.json', { failures, views, sceneViews, mainViews, samples, preservation, network });
console.log(JSON.stringify({ mode: red ? 'RED' : 'GREEN', failures, views: views.length, sceneViews: sceneViews.length, protectedPaths: preservation.length }, null, 2));
process.exitCode = failures.length ? 1 : 0;
