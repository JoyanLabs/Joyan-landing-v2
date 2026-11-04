import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu','--enable-features=Vulkan','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.type(), m.text().slice(0, 200)));
page.on('pageerror', (e) => console.log('[err]', String(e).slice(0, 300)));
await page.goto('http://127.0.0.1:4403/design-studies/visual-directions/gpu-spike/probe-blank.html');
const got = await page.evaluate(async () => {
  const log = [];
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  let lost = null;
  device.lost.then((i) => { lost = `${i.reason}/${i.message}`; });
  device.addEventListener('uncapturederror', (e) => log.push('uncaptured: ' + e.error.message));
  const mod = device.createShaderModule({ code: `
    @group(0) @binding(0) var<storage, read_write> out: array<u32>;
    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) gid: vec3u) {
      let at = gid.y * 480u + gid.x;
      out[at] = gid.x + gid.y;
    }` });
  const info = await mod.getCompilationInfo();
  log.push('compile: ' + info.messages.map((m) => m.message).join('; '));
  const buf = device.createBuffer({ size: 480*300*4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const stage = device.createBuffer({ size: 480*300*4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  const layout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }] });
  const pipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }), compute: { module: mod, entryPoint: 'main' } });
  const bind = device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: buf } }] });
  const enc = device.createCommandEncoder();
  const pass = enc.beginComputePass();
  pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.dispatchWorkgroups(60, 38);
  pass.end();
  enc.copyBufferToBuffer(buf, 0, stage, 0, 480*300*4);
  device.queue.submit([enc.finish()]);
  await device.queue.onSubmittedWorkDone();
  log.push('flushed');
  await new Promise((r) => setTimeout(r, 200));
  log.push('after wait, lost=' + lost);
  await stage.mapAsync(GPUMapMode.READ);
  const words = new Uint32Array(stage.getMappedRange(0, 64));
  log.push('first words ' + [...words].join(',') + ' lost=' + lost);
  return log;
});
console.log(got.join('\n'));
await browser.close();
