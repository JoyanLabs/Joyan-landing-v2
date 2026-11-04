/** Reproducible screenshots + structural checks for the isolated accent study.
 * Writes only to the owner-authorized evidence directory. */
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { measurements, contrast, hueDistance, rgb } from './acentos-colors.mjs';
const out = 'dist-motion-verify/wu114-v1';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const response = await page.goto('http://127.0.0.1:4403/design-studies/v1/acentos.html');
  assert.equal(response.status(), 200, 'The isolated accent comparison must exist');
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow');
  assert.equal(await page.locator('.variant').count(), 4);
  assert.equal(contrast('#FFFFFF', '#000000'), 21);
  assert.equal(contrast('#060B0D', '#060B0D'), 1);
  assert(contrast('#8E5A44') < 4.5, 'Raw copper must be reported as failing text');
  assert(contrast('#A57159') >= 4.5, 'Copper UI companion must pass');
  assert(hueDistance('#A98A50') < 2, 'Ochre is in the brand-amber risk zone');
  await mkdir(out, { recursive: true });
  const report = { variants: measurements(), samples: [], navigation: [], motion: [], screenshots: [], errors, unchangedInputs: {} };
  for (const path of ['index.html', 'v1.css', 'v1.mjs', 'hero-field.mjs']) {
    report.unchangedInputs[path] = createHash('sha256').update(await readFile(`design-studies/v1/${path}`)).digest('hex');
  }
  // Browser-computed colors, not just the intended tokens. Independent WCAG calculation.
  const measured = await page.locator('.variant').evaluateAll(variants => {
    const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
      v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
    const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
    return variants.map(el => {
      const bg = getComputedStyle(el.querySelector('.ui-sample')).backgroundColor;
      const text = ['.ui-eyebrow', '.ui-code', '.ui-link', '.ui-focus'].map(selector => {
        const color = getComputedStyle(el.querySelector(selector)).color;
        return { selector, color, ratio: ratio(color, bg) };
      });
      const ring = getComputedStyle(el.querySelector('.ui-focus'));
      return { id: el.id, bg, text, ring: { color: ring.outlineColor, ratio: ratio(ring.outlineColor, bg), width: ring.outlineWidth, offset: ring.outlineOffset } };
    });
  });
  for (const sample of measured) {
    for (const text of sample.text) assert(text.ratio >= 4.5, `${sample.id} ${text.selector} text contrast`);
    assert(sample.ring.ratio >= 3, `${sample.id} focus contrast`);
  }
  report.samples = measured;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    // The existing hero runtime debounces resize by 120 ms.
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal page overflow');
    const images = [];
    const signatures = [];
    for (const [i, variant] of measurements().entries()) {
      const frame = page.frames().find(f => f !== page.mainFrame() && f.frameElement && f.url().endsWith('index.html') && !signatures.some(s => s.frame === f));
      assert(frame, 'Each panel has its own real scene');
      const facts = await frame.evaluate(async () => {
        const { fieldDiagnostics } = await import('./v1.mjs');
        const digest = async selector => {
          const canvas = document.querySelector(selector);
          return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data)), v => v.toString(16).padStart(2, '0')).join('');
        };
        return { sky: await digest('[data-sky]'), wash: await digest('[data-wash]'),
          nodePlanes: [...document.querySelectorAll('[data-node-plane]')].map(p => p.dataset.nodePlane),
          nodes: document.querySelectorAll('[data-node]').length,
          cores: [...document.querySelectorAll('.node-controls .core')].map(c => [c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r')]),
          coreColor: getComputedStyle(document.querySelector('.node-controls .core')).fill,
          ringColor: getComputedStyle(document.querySelector('.node-controls .ring')).stroke,
          palette: fieldDiagnostics().palette, parallax: fieldDiagnostics().layers,
          running: fieldDiagnostics().running,
          inlineStyles: document.querySelectorAll('[style]').length };
      });
      const cssRGB = hex => `rgb(${rgb(hex).join(', ')})`;
      assert.equal(facts.coreColor, cssRGB(variant.core), 'Exact core accent');
      assert.equal(facts.ringColor, cssRGB(variant.accent), 'Exact ring accent');
      assert.equal(facts.nodes, 35);
      assert.deepEqual(facts.nodePlanes, ['far', 'mid', 'near']);
      assert.equal(facts.running, false, 'Reduced-motion still has no animation');
      assert.equal(facts.inlineStyles, 0);
      if (i) for (const key of ['sky', 'wash', 'palette', 'cores', 'parallax']) assert.deepEqual(facts[key], signatures[0].facts[key], `${width}: unchanged ${key}`);
      signatures.push({ frame, facts });
      const shotPath = `${out}/acentos-${variant.id}-${width}.png`;
      const buffer = await page.locator(`#${variant.id}`).screenshot({ path: shotPath });
      report.screenshots.push(shotPath);
      images.push(buffer.toString('base64'));
      report.navigation.push({ width, id: variant.id, ...facts });
    }
    // Node navigation uses the original runtime in all four views, all 3 planes.
    for (const node of [0, 1, 2]) {
      const cameras = [];
      for (const { frame } of signatures) {
        await frame.locator(`[data-node="${node}"]`).dispatchEvent('click');
        const state = await frame.evaluate(async () => {
          const { fieldDiagnostics } = await import('./v1.mjs');
          return { camera: fieldDiagnostics().camera, active: fieldDiagnostics().active,
            treatments: [...document.querySelectorAll('[data-node-plane]')].map(p => p.dataset.treatment) };
        });
        assert.equal(state.active, node);
        assert.deepEqual([...state.treatments].sort(), ['back', 'focus', 'middle']);
        cameras.push(state.camera);
        await frame.locator('.field-reset').dispatchEvent('click');
        await frame.evaluate(() => document.activeElement.blur());
      }
      cameras.forEach(camera => assert.deepEqual(camera, cameras[0], 'Identical camera/navigation across accent variants'));
    }
    const sheet = await browser.newPage({ viewport: { width: width * (width === 390 ? 4 : 2), height: 900 }, deviceScaleFactor: 1 });
    await sheet.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#060B0D;display:grid;grid-template-columns:repeat(${width === 390 ? 4 : 2},${width}px);align-items:start}img{display:block;width:${width}px;height:auto}</style>${images.map(src => `<img src="data:image/png;base64,${src}">`).join('')}`);
    await sheet.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
    const sheetPath = `${out}/acentos-contact-${width}.png`;
    await sheet.screenshot({ path: sheetPath, fullPage: true });
    report.screenshots.push(sheetPath);
    await sheet.close();
  }
  // Alternate case: normal motion, live emission, pause, and actual keyboard focus.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#v1').scrollIntoViewIfNeeded();
  const liveFrame = page.frames().filter(f => f.url().endsWith('index.html'))[1];
  await liveFrame.waitForFunction(async () => (await import('./v1.mjs')).fieldDiagnostics().running);
  await page.waitForTimeout(1200);
  const live = await liveFrame.evaluate(async () => (await import('./v1.mjs')).fieldDiagnostics());
  assert(live.clock > 0 && live.dynamicFrames.length > 0, 'Real live emission is running');
  assert(!live.emissionError, 'Worker loaded successfully');
  await liveFrame.locator('.field-pause').dispatchEvent('click');
  const pausedClock = await liveFrame.evaluate(async () => (await import('./v1.mjs')).fieldDiagnostics().clock);
  await page.waitForTimeout(300);
  assert.equal(await liveFrame.evaluate(async () => (await import('./v1.mjs')).fieldDiagnostics().clock), pausedClock);
  report.motion.push({ id: 'v1', liveClock: live.clock, workerUpdates: live.dynamicFrames.length, pauseClockStable: true });
  await page.locator('#v3 .ui-link').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#v3 .ui-focus').evaluate(el => el === document.activeElement && el.matches(':focus-visible')), true);
  assert.equal(await page.locator('#v3 .ui-focus').evaluate(el => getComputedStyle(el).outlineWidth), '3px', 'Keyboard focus is distinct from the always-visible 2px sample ring');
  for (const [path, hash] of Object.entries(report.unchangedInputs)) {
    assert.equal(createHash('sha256').update(await readFile(`design-studies/v1/${path}`)).digest('hex'), hash, `Approved input ${path} unchanged during verification`);
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/acentos-measurements.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: 'PASS', variants: report.variants, computedUI: measured, screenshots: report.screenshots, motion: report.motion, errors }, null, 2));
} finally {
  await browser.close();
}
