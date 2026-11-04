/**
 * Driver: serve the repo at http://127.0.0.1:4403/, open the spike page in the
 * Playwright Chromium, wait for the measurement, and write the report and the
 * screenshots. No installs, no writes outside the spike's own folders.
 *
 * node design-studies/visual-directions/gpu-spike/run-spike.mjs --scale=1 [--frames=144]
 */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const ROOT = resolve(HERE, '../../..');
const SHOTS = resolve(ROOT, 'dist-motion-verify/wu81-gpu-spike');
const PORT = 4403;
const TYPES = {
  '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
};

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const scale = Number(arg('scale', '1'));
const frames = Number(arg('frames', '144'));
const shotsOnly = arg('shots', '0') === '1';

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const path = join(ROOT, rel);
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
const own = await new Promise((done) => {
  server.once('error', (error) => done(error.code !== 'EADDRINUSE'));
  server.listen(PORT, '127.0.0.1', () => done(true));
});
if (!own) console.log('port 4403 already served; reusing the existing server');

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--enable-unsafe-swiftshader'],
});
const cols = 480 * scale;
const rows = 300 * scale;
const page = await browser.newPage({
  viewport: shotsOnly ? { width: cols + 80, height: 2 * rows + 200 } : { width: 1500, height: 1000 },
  deviceScaleFactor: 1,
});
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') console.log(`[page ${message.type()}] ${message.text()}`);
});
page.on('pageerror', (error) => console.log(`[page error] ${String(error).slice(0, 400)}`));

const url = `http://127.0.0.1:${PORT}/design-studies/visual-directions/gpu-spike/index.html?scale=${scale}&frames=${frames}${shotsOnly ? '&shots=1' : ''}`;
console.log('open', url);
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => document.body.dataset.done === '1', null, { timeout: 55 * 60 * 1000, polling: 1000 });
const report = await page.evaluate(() => window.__SPIKE_RESULT__);

await mkdir(SHOTS, { recursive: true });
const tag = `scale-${scale}${shotsOnly ? '-native' : ''}`;
if (shotsOnly) {
  // native pixels: one column, each canvas at its own pixel size
  await page.evaluate(() => {
    document.body.classList.add('shots');
    for (const el of document.querySelectorAll('[data-cpu], [data-gpu]')) {
      el.style.width = `${el.width}px`;
      el.style.height = `${el.height}px`;
    }
  });
} else {
  await page.screenshot({ path: join(SHOTS, `spike-${tag}-page.png`), fullPage: true });
}
await page.locator('[data-cpu]').screenshot({ path: join(SHOTS, `spike-${tag}-cpu.png`) });
await page.locator('[data-gpu]').screenshot({ path: join(SHOTS, `spike-${tag}-gpu.png`) });

await writeFile(join(SHOTS, `results-${tag}.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  scale, frames,
  cells: report.cells,
  adapter: report.adapter,
  verification: report.verification,
  cpu: report.cpu,
  gpu: report.gpu,
  memory: report.memory,
  diff: report.diff,
  determinism: report.determinism,
  errors: report.errors,
}, null, 2));

await browser.close();
if (own) server.close();
