#!/usr/bin/env node
/**
 * WU130 — plane focus treatment, measured.
 *
 * Measures the LUMINANCE RETENTION of each rear plane of `design-studies/v1/`
 * between the base state and the focused state, with the protocol fixed in
 * `odd/tasks/difuminado-por-planos.md` (§Protocolo de medición):
 *
 *   1. base state  : t = STILL_SECONDS, no focused node
 *   2. focus state : node N focused, transition finished (not mid-flight)
 *   3. plane mask  : pixels where alpha > 0.5 of that plane, from the same render
 *   4. luminance   : WCAG relative, linearised (sRGB -> linear ->
 *                    0.2126R + 0.7152G + 0.0722B), averaged over the mask.
 *                    NOT the engine's `luma()`, NOT the CSS opacity.
 *   5. retention   : luminance_focus / luminance_base per rear plane, >= 0.40
 *   6. masks       : each plane in its OWN mask space; a mask is never projected
 *                    from one render onto the other (the camera moves)
 *   7. reported    : both luminances, the ratio, the masks and both captures
 *
 * The planes are read from the piece's own surfaces, with the camera transform,
 * the plane opacity and the plane filter applied — never from a declared
 * `opacity` value. What is left out of a plane's own raster is composited page
 * furniture that sits above every plane equally and belongs to no plane: the
 * vignette, the hero veil and the copy column. They are named in the report.
 *
 * The focus state is reached through the piece's own activation path
 * (`fieldMeasure` in `v1.mjs`): same `activate()`, same camera, same transition.
 * The hook only pins the emission to `STILL_SECONDS` so both states are sampled
 * on the same emission, exactly as the protocol demands.
 *
 * Usage (from the repository root):
 *   timeout 180 node scripts/checks/check-plane-retention.mjs --label before
 *   timeout 180 node scripts/checks/check-plane-retention.mjs --label after
 *
 * Writes, under the git-ignored `dist-motion-verify/wu130-planes/`:
 *   report-<label>.json            every number this file prints
 *   RETENTION-<label>.md           the table
 *   masks-<label>/*.png            one mask (+ plane raster) per plane and state
 *   node-planes-<label>/*.png      masks of the three node depth planes
 *   <label>-<viewport>-{base,foco}.png, -reduced-foco.png, -teclado.png
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';

const OUT = fileURLToPath(new URL('../../dist-motion-verify/wu130-planes/', import.meta.url));
const ROOT = resolve(OUT, '../..');
const STUDY = 'design-studies/v1/';
const THRESHOLD = 0.4;
const STILL_SECONDS = 100 / 60;
const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const LABEL = arg('--label', 'current');
const NODE = Number(arg('--node', 0)); // the node the piece is asked to focus
const VIEWPORTS = [[1280, 900], [390, 844]];
const PLANES = [
  { name: 'cielo', label: 'cielo (sky, plano lejano)', selects: ['[data-sky]', '.sky.focus-copy'] },
  { name: 'lavado', label: 'lavado (wash, plano intermedio)', selects: ['[data-wash]'] },
];
const NODE_PLANES = ['far', 'mid', 'near'];

const report = { command: `node scripts/checks/check-plane-retention.mjs --label ${LABEL}`, label: LABEL,
  node: NODE, threshold: THRESHOLD, stillSeconds: STILL_SECONDS, errors: [], states: {}, checks: {}, captures: [] };
const fail = (name, detail) => { report.checks[name] = { pass: false, detail }; };
const pass = (name, detail) => { report.checks[name] = { pass: true, detail }; };
const png = (dataUrl) => Buffer.from(String(dataUrl).split(',')[1], 'base64');
const write = async (path, data) => { await mkdir(resolve(OUT, path, '..'), { recursive: true }); await writeFile(resolve(OUT, path), data); };

// ---------------------------------------------------------------- in-page work
/** Rasterise one plane exactly as the piece composites it, then measure the
 *  mask (alpha > 0.5) and the WCAG relative luminance averaged over it. */
const samplePlane = ({ selects }) => {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const relative = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const stage = document.querySelector('[data-stage]');
  const box = stage.getBoundingClientRect();
  const W = Math.round(box.width), H = Math.round(box.height);
  const surface = document.createElement('canvas');
  surface.width = W; surface.height = H;
  const ctx = surface.getContext('2d', { willReadFrequently: true });
  const layers = [];
  for (const selector of selects) for (const el of document.querySelectorAll(selector)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) {
      layers.push({ selector, skipped: `display:${cs.display} visibility:${cs.visibility} opacity:${cs.opacity}` });
      continue;
    }
    const r = el.getBoundingClientRect();
    ctx.save();
    // Real pixels: the plane's own opacity and filter are baked into the raster.
    ctx.globalAlpha = Number(cs.opacity);
    ctx.filter = cs.filter === 'none' ? 'none' : cs.filter;
    ctx.imageSmoothingEnabled = cs.imageRendering !== 'pixelated';
    ctx.drawImage(el, r.left - box.left, r.top - box.top, r.width, r.height);
    ctx.restore();
    layers.push({ selector, opacity: Number(cs.opacity), filter: cs.filter, imageRendering: cs.imageRendering,
      rect: [r.left - box.left, r.top - box.top, r.width, r.height].map((v) => Math.round(v * 10) / 10) });
  }
  const data = ctx.getImageData(0, 0, W, H).data;
  const mask = document.createElement('canvas');
  mask.width = W; mask.height = H;
  const mctx = mask.getContext('2d');
  const maskImage = mctx.createImageData(W, H);
  const values = [];
  // Integrated light (alpha * luminance, summed over every painted pixel) is
  // the anti-occlusion floor: a plane that is hidden or clipped loses it, while
  // a blur only redistributes it.
  let light = 0, alphaMax = 0, alphaSum = 0, painted = 0;
  for (let at = 0; at < data.length; at += 4) {
    const alpha = data[at + 3] / 255;
    if (!alpha) continue;
    const L = relative(data[at], data[at + 1], data[at + 2]);
    painted++; light += alpha * L; alphaSum += alpha; alphaMax = Math.max(alphaMax, alpha);
    if (data[at + 3] <= 127.5) continue; // mask: alpha > 0.5
    values.push(L);
    maskImage.data[at] = maskImage.data[at + 1] = maskImage.data[at + 2] = 255;
    maskImage.data[at + 3] = 255;
  }
  mctx.putImageData(maskImage, 0, 0);
  values.sort((a, b) => a - b);
  const q = (p) => (values.length ? values[Math.min(values.length - 1, Math.floor(p * (values.length - 1)))] : 0);
  const sum = values.reduce((a, v) => a + v, 0);
  return { stage: [W, H], layers, maskPixels: values.length, painted,
    light, alphaMax, alphaMean: alphaSum / Math.max(1, painted),
    mean: sum / Math.max(1, values.length), min: q(0), p05: q(0.05), p50: q(0.5), p95: q(0.95), max: q(1),
    nearBlack: values.filter((v) => v < 0.002).length,
    mask: mask.toDataURL('image/png'), raster: surface.toDataURL('image/png') };
};
/** Mask + luminance of a screenshot taken with `omitBackground` (vector planes). */
const statsFromScreenshot = async (dataUrl) => {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, image.width, image.height).data;
  const mask = document.createElement('canvas');
  mask.width = image.width; mask.height = image.height;
  const mctx = mask.getContext('2d');
  const maskImage = mctx.createImageData(mask.width, mask.height);
  const values = [];
  let light = 0, alphaMax = 0, alphaSum = 0, painted = 0;
  for (let at = 0; at < data.length; at += 4) {
    const alpha = data[at + 3] / 255;
    if (!alpha) continue;
    const L = 0.2126 * lin(data[at]) + 0.7152 * lin(data[at + 1]) + 0.0722 * lin(data[at + 2]);
    painted++; light += alpha * L; alphaSum += alpha; alphaMax = Math.max(alphaMax, alpha);
    if (data[at + 3] <= 127.5) continue;
    values.push(L);
    maskImage.data[at] = maskImage.data[at + 1] = maskImage.data[at + 2] = 255;
    maskImage.data[at + 3] = 255;
  }
  mctx.putImageData(maskImage, 0, 0);
  values.sort((a, b) => a - b);
  const q = (p) => (values.length ? values[Math.min(values.length - 1, Math.floor(p * (values.length - 1)))] : 0);
  return { size: [image.width, image.height], maskPixels: values.length, painted,
    light, alphaMax, alphaMean: alphaSum / Math.max(1, painted),
    mean: values.reduce((a, v) => a + v, 0) / Math.max(1, values.length),
    min: q(0), p05: q(0.05), p50: q(0.5), p95: q(0.95), max: q(1),
    nearBlack: values.filter((v) => v < 0.002).length, mask: mask.toDataURL('image/png') };
};
/** Worst WCAG ratio of the copy ink over every pixel of its own box. */
const contrastOverBoxes = async ({ png: dataUrl, boxes }) => {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, image.width, image.height).data;
  return boxes.map((box) => {
    const ink = box.color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const fg = 0.2126 * lin(ink[0]) + 0.7152 * lin(ink[1]) + 0.0722 * lin(ink[2]);
    let worst = Infinity, at = -1, brightest = -1;
    const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y));
    const x1 = Math.min(image.width, Math.ceil(box.x + box.width)), y1 = Math.min(image.height, Math.ceil(box.y + box.height));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * image.width + x) * 4;
      const bg = 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]);
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      if (ratio < worst) { worst = ratio; at = [x, y, data[i], data[i + 1], data[i + 2]]; }
      if (bg > brightest) brightest = bg;
    }
    return { text: box.text, color: box.color, foregroundLuminance: fg, threshold: box.threshold,
      worstRatio: worst, worstPixel: at, brightestBackgroundLuminance: brightest };
  });
};

// -------------------------------------------------------------------- the run
const types = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const file = resolve(ROOT, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
  const local = relative(ROOT, file);
  if (!(local.startsWith(STUDY) || local.startsWith('scripts/scene-src/')) || !types[extname(file)]) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] }); res.end(await (await import('node:fs/promises')).readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const URL_ = `http://127.0.0.1:${server.address().port}/${STUDY}`;

let browser;
try {
  browser = await chromium.launch();
  report.browser = browser.version();

  const watch = (page) => {
    page.on('console', (m) => { if (m.type() === 'error') report.errors.push({ kind: 'console', message: m.text() }); });
    page.on('pageerror', (e) => report.errors.push({ kind: 'pageerror', message: String(e) }));
    page.on('requestfailed', (r) => report.errors.push({ kind: 'requestfailed', url: r.url() }));
    page.on('response', (r) => { if (r.status() >= 400) report.errors.push({ kind: 'http', url: r.url(), status: r.status() }); });
  };
  const open = async (width, height, reducedMotion) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion });
    const page = await context.newPage();
    watch(page);
    await page.goto(URL_);
    await page.waitForFunction(() => document.querySelector('[data-stage]').dataset.painted === 'true');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    return { context, page };
  };
  const measure = (page, state) => page.evaluate(async ({ node }) => {
    const module = await import('./v1.mjs');
    return module.fieldMeasure({ node });
  }, { node: state === 'base' ? -1 : NODE });
  const diagnostics = (page) => page.evaluate(async () => (await import('./v1.mjs')).fieldDiagnostics());

  const capture = async (page, name, options = {}) => {
    await page.screenshot({ path: resolve(OUT, name), ...options });
    report.captures.push(name);
  };
  const samplePlanes = async (page, viewport, state) => {
    const out = {};
    for (const plane of PLANES) {
      const sample = await page.evaluate(samplePlane, { selects: plane.selects });
      const stem = `masks-${LABEL}/${plane.name}-${state}`;
      await write(`${stem}-mask.png`, png(sample.mask));
      await write(`${stem}-raster.png`, png(sample.raster));
      delete sample.mask; delete sample.raster;
      out[plane.name] = sample;
    }
    report.states[viewport][state].planes = out;
  };
  // Node depth planes are SVG groups, so they are isolated for the raster: every
  // other stage child, the copy column and the hero veil are hidden FOR THE
  // SAMPLE only, the screenshot keeps its alpha (omitBackground) and the styles
  // are removed immediately after. Same isolation in both states.
  const sampleNodePlane = async (page, viewport, state, plane) => {
    const style = await page.addStyleTag({ content: `
      html[data-plane-probe], html[data-plane-probe] body { background: transparent !important; }
      html[data-plane-probe] .hero-copy,
      html[data-plane-probe] .top,
      html[data-plane-probe] .hero-utility,
      html[data-plane-probe] .hero::after { visibility: hidden !important; }
      html[data-plane-probe] .stage > :not([data-node-controls]) { visibility: hidden !important; }
      html[data-plane-probe] .stage { background: transparent !important; }
      html[data-plane-probe] .stage [data-node-plane]:not([data-node-plane='${plane}']) { visibility: hidden !important; }` });
    await page.evaluate(() => document.documentElement.setAttribute('data-plane-probe', ''));
    const box = await page.evaluate(() => { const r = document.querySelector('[data-stage]').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    const shot = await page.screenshot({ omitBackground: true, clip: box });
    const stats = await page.evaluate(statsFromScreenshot, 'data:image/png;base64,' + shot.toString('base64'));
    await page.evaluate(() => document.documentElement.removeAttribute('data-plane-probe'));
    await style.evaluate((el) => el.remove());
    await write(`node-planes-${LABEL}/${plane}-${state}.png`, shot);
    await write(`node-planes-${LABEL}/${plane}-${state}-mask.png`, png(stats.mask));
    delete stats.mask;
    report.states[viewport][state].nodePlanes[plane] = stats;
  };
  const contrast = async (page, viewport, state) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    const boxes = await page.evaluate(() => ['.hero-title'].map((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // The requested gate is 4.5:1 for every piece of copy over the lit zone;
      // WCAG would allow 3:1 for large text, the stricter figure is reported.
      return { text: selector, color: cs.color, fontPx: parseFloat(cs.fontSize),
        x: r.x, y: r.y, width: r.width, height: r.height, threshold: 4.5 };
    }).filter(Boolean));
    const style = await page.addStyleTag({ content: '.hero-copy, .hero-copy * { color: transparent !important; -webkit-text-fill-color: transparent !important; }' });
    const shot = await page.screenshot();
    await style.evaluate((el) => el.remove());
    const rows = await page.evaluate(contrastOverBoxes, { png: 'data:image/png;base64,' + shot.toString('base64'), boxes });
    report.states[viewport][state].contrast = rows;
    const worst = rows.reduce((a, b) => (a.worstRatio <= b.worstRatio ? a : b));
    const ok = rows.every((row) => row.worstRatio >= row.threshold);
    (ok ? pass : fail)(`contraste de la copia sobre la zona iluminada ${viewport} ${state}`,
      `peor ${worst.worstRatio.toFixed(2)}:1 en ${worst.text} (umbral ${worst.threshold}, tinta ${worst.color})`);
  };
  const keyboard = async (page, viewport, state) => {
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    let found = null;
    for (let i = 0; i < 60 && !found; i++) {
      await page.keyboard.press('Tab');
      found = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el.dataset?.node === undefined) return null;
        const planeGroup = el.closest('[data-node-plane]');
        const star = planeGroup.querySelector(`[data-star="${el.dataset.node}"]`);
        const ring = star?.querySelector('.ring');
        const cs = ring ? getComputedStyle(ring) : null;
        return { node: el.dataset.node, plane: el.dataset.depth, focusVisible: el.matches(':focus-visible'),
          ringStrokeWidth: cs?.strokeWidth ?? null, ringOpacity: cs ? Number(cs.opacity) : null,
          lit: star?.classList.contains('node-lit') ?? false,
          outlineStyle: getComputedStyle(el).outlineStyle,
          planeOpacity: getComputedStyle(el.closest('[data-node-plane]')).opacity,
          planeFilter: getComputedStyle(el.closest('[data-node-plane]')).filter };
      });
    }
    report.states[viewport][state].keyboard = found;
    (found && found.focusVisible && parseFloat(found.ringStrokeWidth) >= 2 && Number(found.planeOpacity) > 0
      && found.ringOpacity >= 0.9 ? pass : fail)(
      `foco de teclado visible ${viewport} ${state}`,
      found ? `nodo ${found.node} (plano ${found.plane}) · :focus-visible=${found.focusVisible} · anillo ${found.ringStrokeWidth} a opacidad ${found.ringOpacity} · opacidad del plano ${found.planeOpacity}`
        : 'ningún [data-node] recibió foco con Tab');
    await page.screenshot({ path: resolve(OUT, `${LABEL}-${viewport}-teclado-${state}.png`) });
    report.captures.push(`${LABEL}-${viewport}-teclado-${state}.png`);
  };

  for (const [width, height] of VIEWPORTS) {
    const viewport = `${width}x${height}`;
    report.states[viewport] = {};
    const { context, page } = await open(width, height);
    for (const state of ['base', 'foco']) {
      report.states[viewport][state] = { nodePlanes: {} };
      report.states[viewport][state].diagnostics = await measure(page, state);
      const diag = report.states[viewport][state].diagnostics;
      if (diag.clock !== 0) report.errors.push({ kind: 'emission', message: `${state} ${viewport}: clock ${diag.clock} en vez del still` });
      if (state === 'foco' ? !(diag.active === NODE) : diag.active !== -1) report.errors.push({ kind: 'state', message: `${state} ${viewport}: active=${diag.active}` });
      await page.screenshot({ path: resolve(OUT, `${LABEL}-${viewport}-${state}.png`) });
      report.captures.push(`${LABEL}-${viewport}-${state}.png`);
      await samplePlanes(page, viewport, state);
      if (width === 1280) for (const plane of NODE_PLANES) await sampleNodePlane(page, viewport, state, plane);
      await contrast(page, viewport, state);
      await keyboard(page, viewport, state);
    }
    await page.evaluate(async ({ node }) => (await import('./v1.mjs')).fieldMeasure({ node: -1, release: true }), { node: -1 });
    await context.close();
  }

  // -------------------------------------------------------------- reduced motion
  const reduced = {};
  for (const [width, height] of [[1280, 900], [390, 844]]) {
    const { context, page } = await open(width, height, 'reduce');
    const before = await page.evaluate(() => document.documentElement.dataset.activeNode);
    await page.waitForFunction(() => document.querySelector('[data-stage]').dataset.painted === 'true');
    // The state must land with no animation: activate, then read at once.
    // The state must land with no animation: sample at once, then again after
    // 400 ms, and require both samples to be identical.
    const sample = () => page.evaluate(async ({ node }) => {
      const module = await import('./v1.mjs');
      const planes = [...document.querySelectorAll('[data-node-plane]')].map((plane) => {
        const cs = getComputedStyle(plane);
        return { plane: plane.dataset.nodePlane, treatment: plane.dataset.treatment, opacity: cs.opacity, filter: cs.filter,
          animations: plane.getAnimations().map((a) => ({ duration: a.effect?.getTiming?.().duration, playState: a.playState })) };
      });
      return { active: module.fieldDiagnostics().active, planes, navigation: module.fieldDiagnostics().navigation };
    }, { node: NODE });
    const instant = await page.evaluate(async ({ node }) => {
      const target = document.querySelector(`[data-node="${node}"]`);
      target.focus();
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return true;
    }, { node: NODE }).then(sample);
    await page.waitForTimeout(400);
    const settled = await sample();
    reduced[`${width}x${height}`] = { before, instant, settled };
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(OUT, `${LABEL}-${width}x${height}-reduced-foco.png`) });
    report.captures.push(`${LABEL}-${width}x${height}-reduced-foco.png`);
    const running = instant.planes.flatMap((p) => p.animations).filter((a) => a.playState === 'running' && a.duration > 0);
    const same = JSON.stringify(instant.planes) === JSON.stringify(settled.planes);
    const applied = instant.planes.every((p) => p.treatment);
    (instant.active === NODE && running.length === 0 && applied && same ? pass : fail)(
      `reduced-motion aplica el foco sin animación ${width}x${height}`,
      `active=${instant.active} · tratamientos=${instant.planes.map((p) => `${p.plane}:${p.treatment}@${p.opacity}`).join(',')} · animaciones en curso=${running.length} · estado idéntico a los 400 ms=${same}`);
    await context.close();
  }
  report.reducedMotion = reduced;
} finally {
  await browser?.close();
  server.close();
}

// ------------------------------------------------------------------- the table
const lum = (v) => (v === undefined ? '—' : v.toFixed(4));
const rows = [];
const collect = (viewport, name, base, foco) => {
  const ratio = base.mean > 0 ? foco.mean / base.mean : 0;
  rows.push({ viewport, plane: name, base: base.mean, foco: foco.mean, ratio,
    verdict: ratio >= THRESHOLD ? 'PASS' : 'FAIL',
    baseP: `${lum(base.p50)}/${lum(base.p95)}`, focoP: `${lum(foco.p50)}/${lum(foco.p95)}`,
    coverage: base.maskPixels > 0 ? foco.maskPixels / base.maskPixels : 0,
    lightRatio: base.light > 0 ? foco.light / base.light : 0,
    alphaMax: [base.alphaMax, foco.alphaMax],
    light: [base.light, foco.light], painted: [base.painted, foco.painted],
    pixels: [base.maskPixels, foco.maskPixels] });
};
for (const viewport of Object.keys(report.states)) for (const plane of PLANES) {
  const state = report.states[viewport];
  collect(viewport, plane.name, state.base.planes[plane.name], state.foco.planes[plane.name]);
}
for (const viewport of Object.keys(report.states)) for (const plane of NODE_PLANES) {
  const state = report.states[viewport];
  if (!state.base.nodePlanes[plane] || !state.foco.nodePlanes[plane]) continue;
  collect(viewport, `nodo ${plane}`, state.base.nodePlanes[plane], state.foco.nodePlanes[plane]);
}
report.retention = rows;
for (const row of rows) {
  const key = `retención ${row.viewport} ${row.plane}`;
  (row.ratio >= THRESHOLD ? pass : fail)(key,
    `razón ${row.ratio.toFixed(3)} · luminancia media base ${lum(row.base)} / foco ${lum(row.foco)} · p95 foco ${lum(Number(row.focoP.split('/')[1]))}`);
  // Nothing may be hidden. The mask count is reported but not gated on its own:
  // on a filtered vector group Chromium rasterises the group and rescales it, so
  // alpha>0.5 shrinks without any light being lost. The floor is integrated
  // light (alpha x luminance) plus the peak alpha still painted.
  const hidden = row.lightRatio < THRESHOLD || row.alphaMax[1] < 0.5;
  (hidden ? fail : pass)(`plano no oculto ${row.viewport} ${row.plane}`,
    `luz integrada ${row.light[0].toFixed(1)} → ${row.light[1].toFixed(1)} (${(row.lightRatio * 100).toFixed(1)} %) · alfa máximo ${row.alphaMax[0].toFixed(3)} → ${row.alphaMax[1].toFixed(3)} · píxeles pintados ${row.painted[0]} → ${row.painted[1]} · máscara α>0,5 ${row.pixels[0]} → ${row.pixels[1]} (${(row.coverage * 100).toFixed(1)} %)`);
}
const table = ['| plano | luminancia base | luminancia foco | razón | umbral | veredicto |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.plane} @ ${row.viewport} | ${lum(row.base)} | ${lum(row.foco)} | **${row.ratio.toFixed(3)}** | ≥ ${THRESHOLD} | **${row.verdict}** |`)].join('\n');
const floors = ['| plano | máscara α>0,5 base → foco | cobertura | luz integrada base → foco | razón de luz | alfa máx. foco | p50 base / foco | p95 base / foco |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.plane} @ ${row.viewport} | ${row.pixels[0]} → ${row.pixels[1]} | ${(row.coverage * 100).toFixed(1)} % | ${row.light[0].toFixed(1)} → ${row.light[1].toFixed(1)} | ${row.lightRatio.toFixed(3)} | ${row.alphaMax[1].toFixed(3)} | ${row.baseP} | ${row.focoP} |`)].join('\n');

const md = `# Retención de luminancia por plano — WU130 (${LABEL})

Medido con \`${report.command}\` en Chromium ${report.browser}, sobre \`${STUDY}\`.
Protocolo: \`odd/tasks/difuminado-por-planos.md\` §Protocolo de medición. Estado base
\`t = STILL_SECONDS = ${STILL_SECONDS.toFixed(3)} s\`; estado foco = nodo ${NODE} activado por la ruta real
de la pieza (\`activate()\`), transición de 1200 ms terminada, emisión fijada al mismo still en los dos
estados (la opacidad CSS no se usa como medición: se rasteriza el plano y se mide el píxel).

${table}

## Piso absoluto (ningún plano oculto)

| plano | máscara α>0,5 base → foco | cobertura | luz integrada base → foco | razón de luz | alfa máx. foco | p50 base / foco | p95 base / foco |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row.plane} @ ${row.viewport} | ${row.pixels[0]} → ${row.pixels[1]} | ${(row.coverage * 100).toFixed(1)} % | ${row.light[0].toFixed(1)} → ${row.light[1].toFixed(1)} | ${row.lightRatio.toFixed(3)} | ${row.alphaMax[1].toFixed(3)} | ${row.baseP} | ${row.focoP} |`).join('\n')}

## Verificaciones

${Object.entries(report.checks).map(([name, value]) => `- ${value.pass ? 'PASS' : 'FAIL'} · ${name} — ${value.detail}`).join('\n')}
${report.errors.length ? `\nErrores observados: \`${JSON.stringify(report.errors)}\`\n` : '\nSin errores de consola, de página ni de red.\n'}
`;
await write(`report-${LABEL}.json`, JSON.stringify(report, null, 2) + '\n');
await write(`RETENTION-${LABEL}.md`, md);
console.log(table);
console.log(floors);
for (const [name, value] of Object.entries(report.checks)) console.log(`${value.pass ? 'PASS' : 'FAIL'}  ${name} — ${value.detail}`);
if (report.errors.length) console.log(`errores: ${JSON.stringify(report.errors)}`);
const failing = Object.values(report.checks).filter((value) => !value.pass);
process.exitCode = failing.length || report.errors.length ? 1 : 0;
