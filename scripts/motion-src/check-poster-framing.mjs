#!/usr/bin/env node
/** Local only: production captureFrame, external Playwright, fresh built pages.
 * Usage: node scripts/motion-src/check-poster-framing.mjs --require-page-clear
 *   [--out dist-motion-verify/wu9/accepted]
 * No package.json/CI dependency. No animation-wide halftone claim from two stills.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { AGENT, GATE } from './scenes/J1.js';
import { loadPlaywright, stageFonts, loadFilm, serve, setupPage, captureFrame } from './render.mjs';

const WIDTH = 1600, HEIGHT = 900, CELL = 7, SOURCE_SCALE = WIDTH / 1920;
const root = resolve(new URL('../..', import.meta.url).pathname);
const arg = process.argv.indexOf('--out');
const out = resolve(root, arg < 0 ? 'dist-motion-verify/wu9/accepted' : process.argv[arg + 1]);
assert.ok(out.startsWith(resolve(root, 'dist-motion-verify/wu9') + '/'), 'evidence must stay inside WU9');
await mkdir(out, { recursive: true });
const errors = [], pageErrors = [];
const report = { geometry: {}, views: [], frames: [], controls: [], limitations: [
  'Fresh dist HTML/CSS/assets are served unchanged. Built poster must equal public poster; no public-asset interception.',
  'Opaque native envelope stencils pass through production resize; touched delivery cells are rounded outward, plus one guard cell for filter/AA tails. No half-cell guarantee.',
  'The dither stage cannot paint outside its own cell. The measured stencil bound is for this Chromium/toolchain and current fixed subject geometry, not every browser or arbitrary scene.',
  'Two real stills cover support and peak flare, not the entire halftone animation. Native blur-1 oracle evidence is separate.',
  'Luminance guards and angular/size/mean-contrast checks supplement manual shape inspection; they are not a WCAG or universal perception proof.',
  'Reduced-motion is the only available CSS state guaranteeing the img is visible. No-preference loading/codec fallback keeps the original F1 scrim.',
] };
function gap(a, b) {
  return Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom));
}
const inside = (b, w) => b.left >= w.left && b.right <= w.right && b.top >= w.top && b.bottom <= w.bottom;
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const rectBounds = r => ({ left: r.x, right: r.x + r.width, top: r.y, bottom: r.y + r.height });
const project = (b, v) => ({
  left: v.box.x + (b.left - v.window.left) * v.scale, right: v.box.x + (b.right - v.window.left) * v.scale,
  top: v.box.y + (b.top - v.window.top) * v.scale, bottom: v.box.y + (b.bottom - v.window.top) * v.scale,
});
function amberBounds(data, width, channels) {
  let left = Infinity, top = Infinity, right = -1, bottom = -1, count = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r - b <= 7 || r <= g || g <= b) continue;
    const pixel = i / channels, x = pixel % width, y = Math.floor(pixel / width);
    left = Math.min(left, x); right = Math.max(right, x + 1);
    top = Math.min(top, y); bottom = Math.max(bottom, y + 1); count++;
  }
  return { left, top, right, bottom, count }; // exclusive right/bottom
}
const luminanceLift = (a, b, i) => (a[i] - b[i]) * .2126 + (a[i + 1] - b[i + 1]) * .7152 + (a[i + 2] - b[i + 2]) * .0722;
async function contrast(actual, ground, v) {
  const a = await sharp(actual).removeAlpha().raw().toBuffer();
  const b = await sharp(ground).removeAlpha().raw().toBuffer();
  const measure = (cx, cy, radius, mask) => {
    const result = { peakLift: 0, pixelsOver24: 0, meanLift: 0, samples: 0, sectorsOver24: [0, 0, 0, 0] };
    for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(v.viewport.height, Math.ceil(cy + radius)); y++) {
      for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(v.viewport.width, Math.ceil(cx + radius)); x++) {
        const dx = (x + .5 - cx) / radius, dy = (y + .5 - cy) / radius;
        if (!mask(dx, dy)) continue;
        const lift = luminanceLift(a, b, (y * v.viewport.width + x) * 3);
        result.peakLift = Math.max(result.peakLift, lift);
        result.meanLift += lift; result.samples++;
        if (lift >= 24) {
          result.pixelsOver24++;
          result.sectorsOver24[(dx < 0 ? 1 : 0) + (dy < 0 ? 2 : 0)]++;
        }
      }
    }
    result.meanLift /= Math.max(1, result.samples);
    return result;
  };
  const center = (x, y) => ({ x: v.box.x + (x * SOURCE_SCALE - v.window.left) * v.scale, y: v.box.y + (y * SOURCE_SCALE - v.window.top) * v.scale });
  const agent = center(AGENT.x, AGENT.y), gate = center(GATE.x, GATE.y);
  const radius = AGENT.radius * SOURCE_SCALE * v.scale;
  return {
    rim: measure(agent.x, agent.y, radius, (x, y) => x*x + y*y >= (82/120)**2 && x*x + y*y <= 1),
    hollow: measure(agent.x, agent.y, radius, (x, y) => x*x + y*y <= (70/120)**2 && (Math.abs(x) > 35/120 || Math.abs(y) > 37/120)),
    block: measure(agent.x, agent.y, radius, (x, y) => Math.abs(x) <= 28/120 && Math.abs(y) <= 30/120),
    diamond: measure(gate.x, gate.y, GATE.half * SOURCE_SCALE * v.scale, (x, y) => Math.abs(x) + Math.abs(y) <= 1),
  };
}
function visibilityProblems(metrics, v) {
  const failures = [];
  for (const feature of ['rim', 'block', 'diamond']) {
    if (metrics[feature].pixelsOver24 < 4) failures.push(`${feature}: fewer than four pixels >=24/255 lift`);
  }
  if (metrics.rim.sectorsOver24.some(n => n < 4)) failures.push('ring: not visible in all four quadrants');
  if (metrics.rim.meanLift < metrics.hollow.meanLift + 6) failures.push('ring: insufficient annulus/hollow separation');
  if (metrics.block.meanLift < metrics.hollow.meanLift + 8) failures.push('block: insufficient block/hollow separation');
  if (2 * AGENT.radius * SOURCE_SCALE * v.scale < 80) failures.push('ring: below 80 CSS px diameter');
  if (2 * GATE.half * SOURCE_SCALE * v.scale < 40) failures.push('diamond: below 40 CSS px diameter');
  if (56 * AGENT.radius / 120 * SOURCE_SCALE * v.scale < 16) failures.push('block: below 16 CSS px width');
  return failures;
}
async function pixelDeltaInContent(actual, baseline, v) {
  const a = await sharp(actual).removeAlpha().raw().toBuffer();
  const b = await sharp(baseline).removeAlpha().raw().toBuffer();
  let max = 0;
  for (const c of v.content) {
    for (let y = Math.max(0, Math.floor(c.y)); y < Math.min(v.viewport.height, Math.ceil(c.y + c.height)); y++) {
      for (let x = Math.max(0, Math.floor(c.x)); x < Math.min(v.viewport.width, Math.ceil(c.x + c.width)); x++) {
        const i = (y * v.viewport.width + x) * 3;
        for (let ch = 0; ch < 3; ch++) max = Math.max(max, Math.abs(a[i + ch] - b[i + ch]));
      }
    }
  }
  return max;
}

stageFonts();
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const composition = await serve(), site = await serve(resolve(root, 'dist'));
try {
  const poster = await readFile(resolve(root, 'public/assets/dither/hero-dither.png'));
  assert.ok(poster.equals(await readFile(resolve(root, 'dist/assets/dither/hero-dither.png'))), 'build is stale: dist/public poster differ');
  const film = await loadFilm('J1');
  const { page, seek } = await setupPage(browser, { port: composition.port, filmId: 'J1', film });
  // Instrument the real resize/dither boundary; the production algorithm still
  // runs unchanged. No second resize pipeline or forked dither implementation.
  await page.route(/\/dither\.js$/, route => route.fulfill({ contentType: 'text/javascript', body: `
    import { ditherImageData as paint } from '/dither.js?production';
    export function ditherImageData(data, width, height, options) {
      window.__deliveryStencil = { data: data.slice(), width, height };
      return paint(data, width, height, options);
    }` }));
  const capture = async () => {
    const buffer = await page.screenshot();
    return Buffer.from(await captureFrame(page, { buffers: [buffer.toString('base64')], n: 1, dither: true, cell: CELL, width: WIDTH, height: HEIGHT }), 'base64');
  };
  async function stencil(name, x, y, radius) {
    // The ring encloses every block position; maximum glow encloses the gate.
    // One native pixel expands each opaque envelope to include edge AA.
    await page.evaluate(({ x, y, radius }) => {
      const ctx = document.querySelector('canvas').getContext('2d');
      ctx.resetTransform(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, radius + 1, 0, Math.PI * 2); ctx.fill();
    }, { x, y, radius });
    const raster = await capture();
    await writeFile(resolve(out, `${name}-envelope.png`), raster);
    const pixels = await page.evaluate(() => Array.from(window.__deliveryStencil.data));
    let minX = WIDTH, minY = HEIGHT, maxX = -1, maxY = -1;
    for (let i = 0; i < pixels.length; i += 4) {
      if (!pixels[i] && !pixels[i+1] && !pixels[i+2]) continue;
      const p = i / 4, px = p % WIDTH, py = Math.floor(p / WIDTH);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    assert.ok(maxX >= 0, 'empty production-resampled stencil');
    const touchedCells = { left: Math.floor(minX/CELL)*CELL, right: (Math.floor(maxX/CELL)+1)*CELL, top: Math.floor(minY/CELL)*CELL, bottom: (Math.floor(maxY/CELL)+1)*CELL };
    const bound = { left: touchedCells.left-CELL, right: touchedCells.right+CELL, top: touchedCells.top-CELL, bottom: touchedCells.bottom+CELL };
    report.geometry[name] = { native: { x, y, radius }, resized: { left:minX,right:maxX+1,top:minY,bottom:maxY+1 }, touchedCells, bound };
    return bound;
  }
  const ring = await stencil('ring', AGENT.x, AGENT.y, AGENT.radius);
  const fullFlare = await stencil('fullFlare', GATE.x, GATE.y, Math.max(GATE.half, GATE.glow + GATE.flare));
  report.geometry.gap = gap(ring, fullFlare);
  if (gap(ring, fullFlare) < CELL) errors.push('full production stencil-cell bounds lack one dot-pitch separation');
  // Controls use the same comparators as real acceptance, not a second oracle.
  assert.equal(inside(fullFlare, { left:0,right:fullFlare.right-1,top:0,bottom:HEIGHT }), false);
  assert.equal(overlaps(ring, ring), true);
  assert.ok(gap(ring, { ...ring, left:ring.right+CELL-1,right:ring.right+2*CELL }) < CELL);
  report.controls.push('clipped gate, intersecting content, and closed separation: rejected');
  const rasters = [{ label:'committed-poster', buffer:poster }];
  for (const time of [7.8, 9.2]) {
    await seek(time);
    const raster = await capture();
    await writeFile(resolve(out, `J1-${time}.png`), raster);
    rasters.push({ label:`J1-${time}`, buffer:raster });
  }
  await page.close();
  for (const { label, buffer } of rasters) {
    const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject:true });
    assert.equal(info.width, WIDTH); assert.equal(info.height, HEIGHT);
    const amber = amberBounds(data, WIDTH, info.channels);
    report.frames.push({ label, amber, gap:gap(amber, ring) });
    if (!amber.count || !inside(amber, fullFlare)) errors.push(`${label}: absent amber or amber outside envelope`);
    if (gap(amber, ring) < CELL) errors.push(`${label}: amber/ring gap below one dot pitch`);
  }
  assert.ok((await sharp(rasters[1].buffer).removeAlpha().raw().toBuffer()).equals(await sharp(poster).removeAlpha().raw().toBuffer()), 'poster differs from production capture');
  const ink = await sharp({ create:{ width:WIDTH,height:HEIGHT,channels:3,background:'#0b0b0c' } }).png().toBuffer();
  const bone = await sharp({ create:{ width:WIDTH,height:HEIGHT,channels:3,background:'#f4f2ed' } }).png().toBuffer();
  const mutedRaw = await sharp(poster).removeAlpha().raw().toBuffer();
  for (let i = 0; i < mutedRaw.length; i++) mutedRaw[i] = Math.round([11,11,12][i%3] + (mutedRaw[i]-[11,11,12][i%3])*.05);
  const muted = await sharp(mutedRaw, { raw:{ width:WIDTH,height:HEIGHT,channels:3 } }).png().toBuffer();
  for (const javaScriptEnabled of [true, false]) for (const locale of ['es','en']) for (const [width,height] of [[390,844],[768,1024],[1440,900]]) {
    const viewPage = await browser.newPage({ viewport:{ width,height }, reducedMotion:'reduce', javaScriptEnabled });
    await viewPage.goto(`http://127.0.0.1:${site.port}/${locale==='en'?'en/':''}index.html`, { waitUntil:'networkidle' });
    await viewPage.evaluate(() => document.fonts.ready);
    const v = await viewPage.evaluate(() => {
      const hero = document.querySelector('#top'), img = hero.querySelector('img');
      const rect = el => { const r=el.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; };
      const s = getComputedStyle(img), video = getComputedStyle(hero.querySelector('video'));
      const scrim = getComputedStyle(hero.querySelector('.hero-backdrop'),'::after');
      return { viewport:{ width:innerWidth,height:innerHeight },box:rect(img),natural:{ width:img.naturalWidth,height:img.naturalHeight },styles:{ objectFit:s.objectFit,objectPosition:s.objectPosition,display:s.display,opacity:s.opacity,videoDisplay:video.display },scrim:{ background:scrim.backgroundImage,mask:scrim.maskImage,composite:scrim.maskComposite },content:[document.querySelector('header'),...hero.querySelectorAll('h1,p,a')].filter(el=>el.getBoundingClientRect().width).map(el=>({ tag:el.tagName,text:el.textContent.trim(),...rect(el) })) };
    });
    v.locale = locale; v.javaScriptEnabled = javaScriptEnabled;
    assert.equal(v.styles.objectFit,'cover'); assert.equal(v.styles.objectPosition,'50% 50%'); assert.equal(v.styles.videoDisplay,'none');
    assert.deepEqual(v.natural, { width:WIDTH,height:HEIGHT });
    v.scale = Math.max(v.box.width/WIDTH,v.box.height/HEIGHT);
    v.window = { left:(WIDTH-v.box.width/v.scale)/2,right:(WIDTH+v.box.width/v.scale)/2,top:(HEIGHT-v.box.height/v.scale)/2,bottom:(HEIGHT+v.box.height/v.scale)/2 };
    v.projected = { ring:project(ring,v),fullFlare:project(fullFlare,v) }; v.intersections = {};
    const label = `${locale}-${width}${javaScriptEnabled?'':'-no-js'}`;
    for (const [key,bounds] of Object.entries(v.projected)) {
      v.intersections[key] = v.content.filter(c=>overlaps(bounds,rectBounds(c))).map(c=>({ tag:c.tag,text:c.text }));
      if (v.intersections[key].length) pageErrors.push(`${label}: ${key} intersects header/kicker/H1/lead/CTA/note`);
      if (!inside(bounds,{ left:0,right:width,top:0,bottom:height })) pageErrors.push(`${label}: ${key} outside viewport`);
    }
    for (const { label:frame,amber } of report.frames) if (!inside(amber,v.window)) errors.push(`${frame} ${label}: amber outside cover`);
    if (!inside(ring,v.window) || !inside(fullFlare,v.window)) errors.push(`${label}: full stencil bounds outside cover`);
    const actual = await viewPage.screenshot({ path:resolve(out,`${label}.png`) });
    const initialScroll = await viewPage.evaluate(() => ({ x:scrollX, y:scrollY }));
    await viewPage.locator('#top').screenshot({ path:resolve(out,`${label}-hero.png`) });
    // Locator screenshots scroll the element into view. Restore the measured
    // viewport before controls, or the sticky header is tested over the wrong
    // part of the backdrop and its 95%-opaque surface yields a false failure.
    await viewPage.evaluate(({ x,y }) => scrollTo({ left:x,top:y,behavior:'instant' }), initialScroll);
    assert.equal(await viewPage.locator('#top img').evaluate(img => img.getBoundingClientRect().y), v.box.y, 'control capture changed measured scroll geometry');
    v.scroll = initialScroll;
    const show = buffer => viewPage.evaluate(async src=>{ const img=document.querySelector('#top img'); img.src=src; await img.decode(); }, `data:image/png;base64,${buffer.toString('base64')}`);
    await show(ink);
    const ground = await viewPage.screenshot({ path:resolve(out,`${label}-ink-control.png`) });
    v.postScrim = await contrast(actual,ground,v);
    pageErrors.push(...visibilityProblems(v.postScrim,v).map(problem=>`${label}: ${problem}`));
    assert.ok(visibilityProblems(await contrast(ground,ground,v),v).length, 'ink-only control must fail');
    await show(muted);
    const mutedShot = await viewPage.screenshot();
    assert.ok(visibilityProblems(await contrast(mutedShot,ground,v),v).length, 'muted subjects must fail');
    await show(bone);
    const protectedShot = await viewPage.screenshot({ path:resolve(out,`${label}-bone-control.png`) });
    // An all-bone stress poster exposes any loss of content protection. Keep
    // both mask layers opaque in the reference: alpha=1 preserves the original
    // directional scrim, without changing Chromium's compositing path. Removing
    // the mask altogether also changes compositing/rounding below the aperture
    // (isolated in protection-probe/), so is not this oracle. The earlier 13-level
    // failure additionally included the locator screenshot's scroll side effect.
    const setProofMask = mask => viewPage.evaluate(mask => {
      let style = document.querySelector('#proof-mask');
      if (!style) {
        style = document.createElement('style'); style.id = 'proof-mask';
        document.head.appendChild(style);
      }
      style.textContent = `.hero-backdrop::after { mask-image: ${mask} !important; }`;
      return getComputedStyle(document.querySelector('.hero-backdrop'), '::after').maskImage;
    }, mask);
    await setProofMask('linear-gradient(#fff,#fff), linear-gradient(#fff,#fff)');
    const originalScrim = await viewPage.screenshot();
    v.textProtectionMaxDelta = await pixelDeltaInContent(protectedShot,originalScrim,v);
    if (v.textProtectionMaxDelta !== 0) pageErrors.push(`${label}: aperture changes pixels in a protected content rectangle`);
    await setProofMask('linear-gradient(transparent,transparent), linear-gradient(transparent,transparent)');
    v.unprotectedControlMaxDelta = await pixelDeltaInContent(await viewPage.screenshot(),originalScrim,v);
    assert.ok(v.unprotectedControlMaxDelta > 0, 'transparent-mask control must lose content protection');
    report.views.push(v);
    await viewPage.close();
  }
  report.controls.push('ink-only and 5%-signal subjects: rejected in all twelve reduced-motion contexts');
  report.controls.push('transparent scrim masks: rejected by zero-delta content protection in all twelve contexts');
  await writeFile(resolve(out,'poster.png'),poster);
  const left = Math.max(0,Math.floor(Math.min(ring.left,fullFlare.left))-CELL), top = Math.max(0,Math.floor(Math.min(ring.top,fullFlare.top))-CELL);
  const crop = { left,top,width:Math.min(WIDTH-left,Math.ceil(Math.max(ring.right,fullFlare.right))-left+CELL),height:Math.min(HEIGHT-top,Math.ceil(Math.max(ring.bottom,fullFlare.bottom))-top+CELL) };
  const closeup = await sharp(poster).extract(crop).png().toBuffer();
  await writeFile(resolve(out,'poster-closeup-native.png'),closeup);
  await sharp(closeup).resize(crop.width*3,crop.height*3,{ kernel:'nearest' }).toFile(resolve(out,'poster-closeup-3x.png'));
} finally {
  await browser.close();
  await Promise.all([composition.server,site.server].map(server=>new Promise(resolve=>server.close(resolve))));
}
report.errors = errors; report.pageErrors = pageErrors;
await writeFile(resolve(out,'framing.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ geometry:report.geometry,frames:report.frames,views:report.views.map(v=>({ locale:v.locale,js:v.javaScriptEnabled,box:v.box,window:v.window,postScrim:v.postScrim,textProtectionMaxDelta:v.textProtectionMaxDelta,intersections:v.intersections })),controls:report.controls,errors,pageErrors },null,2));
assert.equal(errors.length,0,errors.join('\n'));
if (process.argv.includes('--require-page-clear')) assert.equal(pageErrors.length,0,pageErrors.join('\n'));
console.log(pageErrors.length ? 'PARTIAL page acceptance' : 'PASS twelve ES/EN reduced-motion contexts: geometry, recognition guards and unchanged text protection');
