import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { EventEmitter, once } from 'node:events';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = new URL('.', import.meta.url);
const base = '/design-studies/visual-directions/skill-validation/run-2/';
const allowed = new Map([
  ...['index.html', 'scene.css', 'browser.mjs', 'scene.mjs', 'poster.png'].map((name) => [base + name, new URL(name, here)]),
  ...['engine.mjs', 'shapes.mjs'].map((name) => ['/scripts/scene-src/' + name,
    new URL('../../../../scripts/scene-src/' + name, here)]),
]);
const mime = { html: 'text/html', css: 'text/css', mjs: 'text/javascript', png: 'image/png' };
const requests = [];
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost:4403').pathname;
  requests.push(path);
  if (path === '/favicon.ico') { response.writeHead(204).end(); return; }
  const file = allowed.get(path);
  if (!file) { response.writeHead(404).end('Not in this study'); return; }
  try {
    response.writeHead(200, { 'Content-Type': mime[path.split('.').at(-1)], 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch (error) { response.writeHead(500).end(String(error)); }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(4403, '127.0.0.1', resolve);
});

// CDP over pipe: no automation package/install, no external debugging socket.
const browser = spawn('chromium', ['--headless', '--disable-gpu', '--no-sandbox',
  '--remote-debugging-pipe', '--user-data-dir=./browser-check-profile',
  '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--no-first-run', '--no-default-browser-check', 'about:blank'], {
  cwd: fileURLToPath(here), env: { ...process.env, TMPDIR: '.' },
  stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
});
const events = new EventEmitter();
const pending = new Map();
let nextId = 0;
let buffer = '';
let stderr = '';
browser.stderr.on('data', (chunk) => { stderr += chunk; });
browser.stdio[4].on('data', (chunk) => {
  buffer += chunk.toString();
  let end;
  while ((end = buffer.indexOf('\0')) >= 0) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    if (message.id) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    } else events.emit(message.method, message);
  }
});
browser.on('exit', (code) => {
  for (const waiter of pending.values()) waiter.reject(new Error(`Chromium exited: ${code}; ${stderr}`));
});
function cdp(method, params = {}, sessionId) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}
function event(method, sessionId) {
  return new Promise((resolve) => {
    const handler = (message) => {
      if (message.sessionId === sessionId) { events.off(method, handler); resolve(message.params); }
    };
    events.on(method, handler);
  });
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const report = { readiness: 'Page.loadEventFired + data-state=ready/data-hash; no sleep/time waits',
  screenshots: [], costs: [], failures: [] };
try {
  report.browser = await cdp('Browser.getVersion');
  const poster = JSON.parse(await readFile(new URL('poster-metadata.json', here), 'utf8'));
  const posterPixels = await sharp(fileURLToPath(new URL('poster.png', here))).ensureAlpha().raw().toBuffer();
  assert.equal(sha(posterPixels), poster.rgbaSHA256, 'Baked poster must equal the engine raster');
  for (const mode of [{ width: 1280, height: 768 }, { width: 390, height: 320 },
    { width: 390, height: 320, noJS: true }]) {
    const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
    await cdp('Page.enable', {}, sessionId);
    await cdp('Runtime.enable', {}, sessionId);
    await cdp('Emulation.setDeviceMetricsOverride', {
      width: mode.width, height: mode.height, deviceScaleFactor: 1, mobile: false,
    }, sessionId);
    if (mode.noJS) await cdp('Emulation.setScriptExecutionDisabled', { value: true }, sessionId);
    const loaded = event('Page.loadEventFired', sessionId);
    await cdp('Page.navigate', { url: 'http://127.0.0.1:4403' + base + 'index.html?verify=1' }, sessionId);
    await loaded;
    if (!mode.noJS) {
      const ready = await cdp('Runtime.evaluate', { awaitPromise: true, returnByValue: true,
        expression: `new Promise(resolve => {
          const done = () => {
            if (document.documentElement.dataset.state !== 'ready') return false;
            resolve({ hash: document.documentElement.dataset.hash, frame: document.documentElement.dataset.frame,
              cost: window.studyCost, state: document.documentElement.dataset.state });
            return true;
          };
          if (!done()) { const observer = new MutationObserver(() => { if (done()) observer.disconnect(); });
            observer.observe(document.documentElement, { attributes: true }); }
        })`,
      }, sessionId);
      assert(!ready.exceptionDetails, JSON.stringify(ready.exceptionDetails));
      const state = ready.result.value;
      assert.equal(state.hash, poster.rgbaSHA256, 'Browser canvas must equal the real Node bake');
      assert.equal(state.frame, '0');
      report.costs.push({ width: mode.width, ...state.cost, rgbaSHA256: state.hash });
      if (state.cost.status !== 'PASS') report.failures.push(`browser cost at ${mode.width}`);
    } else {
      const { root } = await cdp('DOM.getDocument', {}, sessionId);
      const { outerHTML } = await cdp('DOM.getOuterHTML', { nodeId: root.nodeId }, sessionId);
      assert(!outerHTML.includes('data-state="ready"'), 'Page scripts must not execute');
      assert(outerHTML.includes('src="./poster.png"'), 'The no-JS page must retain the baked image');
      report.noJS = { protocol: 'Emulation.setScriptExecutionDisabled(value=true)',
        enginePosterRGBA: sha(posterPixels),
        moduleRan: false, loaded: 'Page.loadEventFired (including the poster image)' };
    }
    const { data } = await cdp('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
    const name = mode.noJS ? 'scene-390-no-js.png' : `scene-${mode.width}.png`;
    const png = Buffer.from(data, 'base64');
    await writeFile(new URL(name, here), png);
    const decoded = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let nonGroundPixels = 0;
    for (let i = 0; i < decoded.data.length; i += 4) {
      if (decoded.data[i] !== 2 || decoded.data[i + 1] !== 4 || decoded.data[i + 2] !== 5) nonGroundPixels++;
    }
    assert(nonGroundPixels > 0, 'Screenshot must not be an empty ground rectangle');
    report.screenshots.push({ name, width: decoded.info.width, height: decoded.info.height,
      rgbaSHA256: sha(decoded.data), nonGroundPixels });
    await cdp('Target.closeTarget', { targetId });
  }
  const live = report.screenshots.find((entry) => entry.name === 'scene-390.png');
  const fallback = report.screenshots.find((entry) => entry.name === 'scene-390-no-js.png');
  report.noJS.identicalToLivePinnedCapture = live.rgbaSHA256 === fallback.rgbaSHA256;
  // CSS downscaling of an img and a canvas need not be pixel-identical.
  // Native poster/canvas identity is asserted above, not inferred from resized screenshots.
  const livePixels = await sharp(fileURLToPath(new URL(live.name, here))).ensureAlpha().raw().toBuffer();
  const fallbackPixels = await sharp(fileURLToPath(new URL(fallback.name, here))).ensureAlpha().raw().toBuffer();
  let changedChannels = 0;
  let maxChannelDelta = 0;
  for (let i = 0; i < livePixels.length; i++) {
    const delta = Math.abs(livePixels[i] - fallbackPixels[i]);
    if (delta) changedChannels++;
    maxChannelDelta = Math.max(maxChannelDelta, delta);
  }
  report.noJS.resamplingDifference = { changedChannels, maxChannelDelta };
  report.requests = [...new Set(requests)];
  await writeFile(new URL('browser-results.json', here), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.failures.length, 0, report.failures.join('; '));
} finally {
  await writeFile(new URL('browser-stderr.log', here), stderr);
  await cdp('Browser.close').catch(() => {});
  if (browser.exitCode === null) await once(browser, 'exit');
  await new Promise((resolve) => server.close(resolve));
}
