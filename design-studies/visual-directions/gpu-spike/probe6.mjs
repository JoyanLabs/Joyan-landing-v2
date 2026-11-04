import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu','--enable-features=Vulkan','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('console', (m) => console.log('[page]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[err]', String(e).slice(0, 300)));
await page.goto('http://127.0.0.1:4403/design-studies/visual-directions/gpu-spike/probe-blank.html');
const got = await page.evaluate(async () => {
  const log = [];
  try {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    device.lost.then((i) => log.push('LOST ' + i.reason));
    const format = 'rgba8unorm';
    const mod = device.createShaderModule({ code: `
      @vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
        let x = f32((i << 1u) & 2u); let y = f32(i & 2u);
        return vec4f(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
      }
      @fragment fn fs(@builtin(position) p: vec4f) -> @location(0) vec4f { return vec4f(p.x / 480.0, p.y / 300.0, 0.2, 1.0); }` });
    const rp = device.createRenderPipeline({ layout: 'auto', vertex: { module: mod, entryPoint: 'vs' }, fragment: { module: mod, entryPoint: 'fs', targets: [{ format }] } });
    const target = device.createTexture({ size: { width: 480, height: 300 }, format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    const readback = device.createBuffer({ size: 480 * 256 * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: target.createView(), clearValue: {r:0,g:0,b:0,a:1}, loadOp:'clear', storeOp:'store' }] });
    pass.setPipeline(rp); pass.draw(3); pass.end();
    enc.copyTextureToBuffer({ texture: target }, { buffer: readback, bytesPerRow: 480 * 4, rowsPerImage: 300 }, { width: 480, height: 300 });
    device.queue.submit([enc.finish()]);
    await device.queue.onSubmittedWorkDone();
    log.push('render-to-texture ok');
    await readback.mapAsync(GPUMapMode.READ);
    const px = new Uint8Array(readback.getMappedRange(0, 480 * 300 * 4));
    log.push('pixel(100,50) = ' + px[(50 * 480 + 100) * 4] + ',' + px[(50 * 480 + 100) * 4 + 1]);
    readback.unmap();
    await new Promise((r) => setTimeout(r, 200));

    // now a canvas
    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 300;
    canvas.style.width = '480px'; canvas.style.height = '300px'; canvas.style.display = 'block';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('webgpu');
    ctx.configure({ device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'opaque' });
    const enc2 = device.createCommandEncoder();
    const view2 = ctx.getCurrentTexture().createView();
    const pass2 = enc2.beginRenderPass({ colorAttachments: [{ view: view2, clearValue: {r:0,g:0,b:0,a:1}, loadOp:'clear', storeOp:'store' }] });
    pass2.setPipeline(device.createRenderPipeline({ layout: 'auto', vertex: { module: mod, entryPoint: 'vs' }, fragment: { module: mod, entryPoint: 'fs', targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }] } }));
    pass2.draw(3); pass2.end();
    device.queue.submit([enc2.finish()]);
    await device.queue.onSubmittedWorkDone();
    log.push('canvas presented ok');
    await new Promise((r) => setTimeout(r, 300));
    log.push('lost? ' + log.join('|'));
  } catch (e) { log.push('THREW: ' + String(e)); }
  return log;
});
console.log(got.join('\n'));
await browser.close();
