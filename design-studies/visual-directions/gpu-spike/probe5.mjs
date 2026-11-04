import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu','--enable-features=Vulkan','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[err]', String(e).slice(0, 300)));
await page.goto('http://127.0.0.1:4403/design-studies/visual-directions/gpu-spike/probe-blank.html');
const got = await page.evaluate(async () => {
  const log = [];
  try {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  device.lost.then((i) => log.push('LOST ' + i.reason + '/' + i.message));
  device.addEventListener('uncapturederror', (e) => log.push('uncaptured: ' + e.error.message));

  // 1 canvas + render pipeline
  const canvas = document.createElement('canvas');
  canvas.width = 480; canvas.height = 300;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'opaque' });
  log.push('configured ' + format);
  const rmod = device.createShaderModule({ code: `
    @vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
      let x = f32((i << 1u) & 2u); let y = f32(i & 2u);
      return vec4f(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
    }
    @fragment fn fs() -> @location(0) vec4f { return vec4f(0.1, 0.2, 0.3, 1.0); }` });
  const rp = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: rmod, entryPoint: 'vs' },
    fragment: { module: rmod, entryPoint: 'fs', targets: [{ format }] },
  });
  log.push('render pipeline');
  let enc = device.createCommandEncoder();
  let pass = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), clearValue: {r:0,g:0,b:0,a:1}, loadOp:'clear', storeOp:'store' }] });
  pass.setPipeline(rp); pass.draw(3); pass.end();
  device.queue.submit([enc.finish()]);
  await device.queue.onSubmittedWorkDone();
  log.push('render submitted');

  // 2 r8uint 2d array texture + writeTexture
  const w = 199, h = 85;
  const tex = device.createTexture({ size: { width: w, height: h, depthOrArrayLayers: 144 }, dimension: '2d', format: 'r8uint', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
  log.push('texture created');
  const plane = new Uint8Array(w * h);
  for (let i = 0; i < plane.length; i++) plane[i] = i & 255;
  for (let f = 0; f < 144; f++) device.queue.writeTexture({ texture: tex, origin: { x: 0, y: 0, z: f } }, plane, { bytesPerRow: w, rowsPerImage: h }, { width: w, height: h, depthOrArrayLayers: 1 });
  log.push('texture written');
  await device.queue.onSubmittedWorkDone();
  await new Promise((r) => setTimeout(r, 250));
  log.push('end');
  } catch (e) { log.push('THREW: ' + String(e)); }
  return log;
});
console.log(got.join('\n'));
await browser.close();
