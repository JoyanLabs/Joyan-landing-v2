#!/usr/bin/env node
/** WU13 local acceptance. External Playwright, no new project test dependency. */
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
const out = resolve(originalOut, 'correction');
const red = process.argv.includes('--red');
const correctionRed = process.argv.includes('--correction-red');
const base = 'http://127.0.0.1:4321';
const failures = [], views = [], network = [], preservation = [], samples = [], mainViews = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const hash = data => createHash('sha256').update(data).digest('hex');
const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const save = async (name, data) => writeFile(resolve(out, name), JSON.stringify(data, null, 2));
await mkdir(out, { recursive: true });
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
const fixedFiles = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'src/lib/ascii-runtime.ts'];
if (correctionRed) {
  const preimage = resolve(out, 'preimage');
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
  for (const path of fixedFiles) check(hash(await readFile(resolve(root, path))) === state[path], `unauthorized correction change: ${path}`);
  for (const entry of await readdir(resolve(out, 'preimage'), { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    check(hash(await readFile(resolve(originalOut, entry.name))) === hash(await readFile(resolve(out, 'preimage', entry.name))),
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
for (const [name, evidence] of Object.entries(beforeBudget.chunks)) {
  check(JSON.stringify(chunks[name]) === JSON.stringify(evidence), `original chunk changed: ${name}`);
}
const assetGzip = assets.reduce((sum, asset) => sum + asset.gzip, 0);
const inlineGzip = inline.reduce((sum, script) => sum + script.gzip, 0);
const totalGzip = assetGzip + inlineGzip;
const budget = { method: 'Recursive generated JS plus ALL executable lab inline scripts once',
  assetGzip, inlineGzip, totalGzip, baseline: baselineBudget.totalGzip,
  delta: totalGzip - baselineBudget.totalGzip, margin: baselineBudget.totalGzip + 22528 - totalGzip,
  assets, inline, excluded, chunks, controls: budgetControls };
check(withinBudget(totalGzip, baselineBudget.totalGzip), `full client JS delta ${budget.delta} exceeds unchanged 22528 B budget by ${-budget.margin} B`);
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
      await page.locator('[data-ascii-piece="donut"]').screenshot({ path: resolve(out, `red-${width}-pre.png`) });
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
    const before = await json('dist-motion-verify/wu13/before.json');
    for (const [name, evidence] of Object.entries(before.chunks)) assert.deepEqual(chunks[name], evidence, `original chunk changed: ${name}`);
    check(withinBudget(budget.totalGzip, budget.baseline), 'full generated and executable-inline budget exceeded');
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
        await host.screenshot({ path: resolve(out, `${width}-${mode}-${kind}.png`) });
      }
      const baked = page.locator('#dither-scene'); await baked.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const nativeBefore = await baked.locator('video').evaluate(v => v.currentTime);
      await page.waitForTimeout(500);
      const native = await baked.locator('video').evaluate(v => ({ paused: v.paused, time: v.currentTime, display: getComputedStyle(v).display }));
      native.advance = (native.time - nativeBefore + 15) % 15;
      if (mode === 'no-js') check(native.advance > .2, `${width}: native no-JS video should actually advance`);
      if (mode === 'reduce') check(native.paused && native.display === 'none', 'reduced baked video must actually pause and hide');
      view.native = native;
      await baked.screenshot({ path: resolve(out, `${width}-${mode}-baked.png`) });
      await page.locator('h1').scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(out, `${width}-${mode}.png`), fullPage: true });
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
        // Leave with a live loop: a zero count after leaving must prove cleanup,
        // not merely the offscreen state used for the preceding full-page image.
        await page.locator('[data-ascii-piece="java"]').scrollIntoViewIfNeeded();
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
      }
      check(errors.length === 0, `${width}/${mode}: ${errors.join('; ')}`);
      view.errors = errors; views.push(view); network.push({ width, mode, requests });
      await context.close();
    }
  }
} finally { await browser.close(); }
await save(red ? 'red.json' : 'green.json', { failures, views, mainViews, samples, preservation, network });
console.log(JSON.stringify({ mode: red ? 'RED' : 'GREEN', failures, views: views.length, protectedPaths: preservation.length }, null, 2));
process.exitCode = failures.length ? 1 : 0;
