/**
 * Capability probe only: does this Chromium expose a usable WebGPU adapter?
 * Prints what the browser says, so no later number is attributed to hardware it
 * did not come from.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';

const ROOT = '/home/joshrm/Proyectos/Joyan-landing-v2';
const PORT = 4403;
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const path = join(ROOT, rel === '/' ? '/design-studies/visual-directions/gpu-spike/index.html' : rel);
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
// 4403 is the required origin and may already serve the repo root (another
// agent's server). Reuse it instead of fighting for the port.
const own = await new Promise((resolve) => {
  server.once('error', (error) => resolve(error.code !== 'EADDRINUSE'));
  server.listen(PORT, '127.0.0.1', () => resolve(true));
});
if (!own) console.log('port 4403 already served by another process; reusing it');

const FLAGS = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader',
];
for (const variant of [FLAGS, []]) {
  const browser = await chromium.launch({ args: variant, headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/design-studies/visual-directions/gpu-spike/probe-blank.html`);
  const got = await page.evaluate(async () => {
    const out = { hasGpu: !!navigator.gpu, secure: isSecureContext };
    if (!navigator.gpu) return out;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      out.adapter = adapter ? 'yes' : 'null';
      if (adapter) {
        out.info = adapter.info ? { ...adapter.info } : null;
        const d = await adapter.requestDevice();
        out.device = !!d;
        out.features = [...d.features];
      }
    } catch (error) { out.error = String(error); }
    return out;
  });
  console.log(JSON.stringify({ flags: variant.length ? 'webgpu+swiftshader' : 'none', got }, null, 2));
  await browser.close();
}
server.close();
