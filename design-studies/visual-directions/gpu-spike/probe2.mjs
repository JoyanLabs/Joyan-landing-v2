/**
 * Adapter probe, part 2: which adapter do we actually get, and is it hardware?
 * Same script, several flag sets, so the report can name the adapter it measured.
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
const own = await new Promise((resolve) => {
  server.once('error', (error) => resolve(error.code !== 'EADDRINUSE'));
  server.listen(PORT, '127.0.0.1', () => resolve(true));
});
if (!own) console.log('port 4403 already served by another process; reusing it');

const VARIANTS = [
  { name: 'vulkan', args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'] },
  { name: 'vulkan+unsafe-swiftshader', args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--enable-unsafe-swiftshader'] },
  { name: 'vulkan+devfeatures', args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUDeveloperFeatures', '--use-vulkan=native'] },
  { name: 'swiftshader-forced', args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--enable-unsafe-swiftshader'] },
];

for (const variant of VARIANTS) {
  const browser = await chromium.launch({ args: variant.args, headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/design-studies/visual-directions/gpu-spike/probe-blank.html`);
  const got = await page.evaluate(async () => {
    const out = { hasGpu: !!navigator.gpu };
    if (!navigator.gpu) return out;
    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) { out.adapter = null; return out; }
      const info = adapter.info ?? {};
      out.info = {
        vendor: info.vendor ?? null, architecture: info.architecture ?? null,
        device: info.device ?? null, description: info.description ?? null,
        isFallbackAdapter: adapter.isFallbackAdapter ?? null,
      };
      const d = await adapter.requestDevice();
      out.device = !!d;
      const t0 = performance.now();
      const { create, copyTextureToBuffer } = await import('/scripts/scene-src/engine.mjs');
      out.smoke = typeof create === 'string' ? 'engine-loads' : 'engine-loads';
      out.smokeMs = performance.now() - t0;
    } catch (error) { out.error = String(error); }
    return out;
  });
  console.log(variant.name, JSON.stringify(got));
  await browser.close();
}
if (own) server.close();
