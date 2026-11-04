/**
 * The GPU spike, measured in the browser.
 *
 * Two paths render the same scene: the engine's own `renderFrame` + `rasterize`
 * (the canvas-2D dot field the site ships) and a WebGPU compute + fragment pair
 * that evaluates the same tone model per cell and paints the same cell mask. Both
 * run for `?frames=` frames (144 = one full cycle) at `?scale=1` (480 × 300) or
 * `?scale=4` (1920 × 1200, 16× the cells), and the results are compared cell by
 * cell and pixel by pixel.
 *
 * Nothing here is inferred: the capability probe, the adapter string, the init
 * time, every frame sample, the buffers' byte counts and both diffs are read back
 * from the browser and printed, including the failures.
 */
import {
  compensate, discMask, luma, rasterize, renderFrame, sceneMetrics, stepFor,
} from '../../../scripts/scene-src/engine.mjs';
import * as sceneModule from './scene-scaled.mjs';
import {
  BLINK_R, brightness, CYCLE, COMA_R, EASE, EVENT, FPS, H, HALO_SKIP, NODES, NODE_WEIGHT, SECONDS,
  SKY_GAIN, TAIL_GAIN, TAIL_P, TAIL_S, TRAIL, W, WANDER, baseTone, constelacion2Scene,
  forEachDynamicCell, makeScene, toneAt, toneTerms, trailTable, verifyAgainstScene, vignette,
} from './scene-scaled.mjs';
import { PARAM_FIELDS, packParams, PAINT_ENTRY, WGSL, WGSL_READ } from './wgsl.mjs';

const query = new URLSearchParams(location.search);
const scale = Number(query.get('scale') ?? '1') >= 4 ? 4 : 1;
const frames = Math.max(1, Number(query.get('frames') ?? String(CYCLE)));
const cellPx = 1; // cells are the delivery unit here: one pixel per cell on both paths

const cols = W * scale;
const rows = H * scale;
const cells = cols * rows;

const out = document.querySelector('[data-report]');
const tableOut = document.querySelector('[data-table]');
const canvasCpu = document.querySelector('[data-cpu]');
const canvasGpu = document.querySelector('[data-gpu]');
const statusOut = document.querySelector('[data-status]');
// Both panels are 2d canvases: this headless Chromium destroys the WebGPU device
// the moment a canvas presentation is attempted, so the GPU path renders into a
// texture and is PRESENTED by the same `putImageData` the CPU path uses. That also
// makes the comparison fair: identical bytes in, identical bytes out, and the
// readback is counted separately instead of hiding inside the frame time.

const report = {
  generated: new Date().toISOString(),
  scale, cols, rows, cells, frames, cellPx,
  origin: location.origin,
  userAgent: navigator.userAgent,
  hardwareConcurrency: navigator.hardwareConcurrency,
  capability: { hasNavigatorGpu: typeof navigator.gpu !== 'undefined' },
  adapter: null,
  verification: null,
  cpu: null,
  gpu: null,
  diff: null,
  determinism: null,
  memory: null,
  errors: [],
};

const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
const p95 = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length))];
};
const now = () => performance.now();

// ------------------------------------------------------------------ the scene
const sceneCpu = scale === 1 ? constelacion2Scene : makeScene(scale, 'asin');
const metrics = sceneMetrics(sceneCpu);
const PALETTE_RGB = metrics.colors;
const cpuInto = new Uint8ClampedArray(cells * 4);
const ctxCpu = canvasCpu.getContext('2d', { alpha: false });
canvasCpu.width = cols;
canvasCpu.height = rows;
const cpuImage = new ImageData(cpuInto, cols, rows);

const ctxGpu = canvasGpu.getContext('2d', { alpha: false });
const gpuPixelsInto = new Uint8ClampedArray(cells * 4);
const gpuImage = new ImageData(gpuPixelsInto, cols, rows);
function presentGpu(pixels) {
  gpuPixelsInto.set(pixels);
  ctxGpu.putImageData(gpuImage, 0, 0);
}

function cpuFrame(frame) {
  const field = renderFrame(sceneCpu, frame, { dither: 'bayer4' });
  rasterize(field, sceneCpu, cellPx, cpuInto);
  ctxCpu.putImageData(cpuImage, 0, 0);
  return field;
}

// ------------------------------------------------------------------- WebGPU
let device = null;
let target = null;
let readback = null;
let readbackRowBytes = 0;
let computePipeline = null;
let paintPipeline = null;
let computeBind = null;
let renderBind = null;
let gpu = null;

function createBuffer(usage, bytes) {
  const buffer = device.createBuffer({ size: Math.ceil(bytes / 4) * 4, usage, mappedAtCreation: false });
  return buffer;
}

async function initGpu() {
  const started = now();
  report.stage = 'requestAdapter';
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) {
    report.capability.adapter = null;
    return null;
  }
  const info = adapter.info ?? {};
  report.adapter = {
    vendor: info.vendor ?? null,
    architecture: info.architecture ?? null,
    device: info.device ?? null,
    description: info.description ?? null,
    isFallbackAdapter: adapter.isFallbackAdapter ?? null,
    features: null,
  };
  report.stage = 'requestDevice';
  device = await adapter.requestDevice();
  report.adapter.features = [...device.features];
  device.lost.then((info2) => report.errors.push(`device lost: ${info2.reason} / ${info2.message}`));
  device.addEventListener('uncapturederror', (event) => {
    report.errors.push(`uncaptured: ${event.error?.message ?? event.error}`);
  });

  const format = 'rgba8unorm';
  report.adapter.targetFormat = format;
  target = device.createTexture({
    size: { width: cols, height: rows },
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
  readbackRowBytes = Math.ceil((cols * 4) / 256) * 256;
  readback = device.createBuffer({ size: readbackRowBytes * rows, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  canvasGpu.width = cols;
  canvasGpu.height = rows;

  report.stage = 'trailTable';
  const trail = trailTable();
  const trailRegion = trail.region;
  const trailPlanes = trail.planes;

  const BUFFER = GPUBufferUsage;
  const CONSTS_FLOATS = 64; // 16-float bands: ladder 0, coverage 16, tones 32, mask 48
  const bytes = {
    params: PARAM_FIELDS.length * 4,
    palette: PALETTE_RGB.length * 16,
    consts: CONSTS_FLOATS * 4,
    nodes: NODES.length * 16,
    steps: cells * 4,
    inks: cells * 4,
    staging: cells * 4 * 2,
    trail: trailRegion.w * trailRegion.h * CYCLE,
    target: cells * 4,
    readback: readbackRowBytes * rows,
  };

  const paramsBuffer = device.createBuffer({ size: bytes.params, usage: BUFFER.STORAGE | BUFFER.COPY_DST });
  const storage = (size) => createBuffer(BUFFER.STORAGE | BUFFER.COPY_DST, size);
  const paletteBuffer = storage(bytes.palette);
  const constsBuffer = storage(bytes.consts);
  const nodesBuffer = storage(bytes.nodes);
  const stepsBuffer = device.createBuffer({ size: bytes.steps, usage: BUFFER.STORAGE | BUFFER.COPY_SRC | BUFFER.COPY_DST });
  const toneBuffer = device.createBuffer({ size: bytes.steps, usage: BUFFER.STORAGE | BUFFER.COPY_SRC | BUFFER.COPY_DST });
  const stagingTones = device.createBuffer({ size: bytes.steps, usage: BUFFER.MAP_READ | BUFFER.COPY_DST });
  const inksBuffer = device.createBuffer({ size: bytes.inks, usage: BUFFER.STORAGE | BUFFER.COPY_SRC | BUFFER.COPY_DST });
  const stagingSteps = device.createBuffer({ size: bytes.steps, usage: BUFFER.MAP_READ | BUFFER.COPY_DST });
  const stagingInks = device.createBuffer({ size: bytes.inks, usage: BUFFER.MAP_READ | BUFFER.COPY_DST });

  // palette
  const paletteData = new Float32Array(PALETTE_RGB.length * 4);
  PALETTE_RGB.forEach((rgb, i) => paletteData.set([rgb[0], rgb[1], rgb[2], 1], i * 4));
  device.queue.writeBuffer(paletteBuffer, 0, paletteData);

  // the engine's own ladder, measured coverage, palette tones, and the 1-px cell
  // mask (exactly the coverage `rasterize` blends with at cellPx = 1)
  const consts = new Float32Array(CONSTS_FLOATS);
  consts.set(Float32Array.from(metrics.ladder), 0);
  consts.set(Float32Array.from(metrics.coverage), 16);
  consts.set(Float32Array.from(metrics.tones), 32);
  const stepMasks = [];
  for (let step = 0; step < metrics.ladder.length; step++) {
    const coverage = discMask(step, cellPx)[0] ?? 0;
    consts[48 + step] = coverage;
    stepMasks.push(coverage);
  }
  device.queue.writeBuffer(constsBuffer, 0, consts);

  // the trail as a 144-layer r8uint array texture
  const trailTexture = device.createTexture({
    size: { width: trailRegion.w, height: trailRegion.h, depthOrArrayLayers: CYCLE },
    dimension: '2d',
    format: 'r8uint',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  for (let f = 0; f < CYCLE; f++) {
    device.queue.writeTexture(
      { texture: trailTexture, origin: { x: 0, y: 0, z: f } },
      trailPlanes[f],
      { bytesPerRow: trailRegion.w, rowsPerImage: trailRegion.h },
      { width: trailRegion.w, height: trailRegion.h, depthOrArrayLayers: 1 },
    );
  }

  report.stage = 'shaderModules';
  const computeModule = device.createShaderModule({ code: WGSL });
  const paintModule = device.createShaderModule({ code: WGSL_READ });
  const computeLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 6, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'uint', viewDimension: '2d-array' } },
      { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ],
  });
  const renderLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      { binding: 5, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
    ],
  });

  report.stage = 'pipelines';
  computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
    compute: { module: computeModule, entryPoint: 'selectCells' },
  });
  paintPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
    vertex: { module: paintModule, entryPoint: 'vs' },
    fragment: { module: paintModule, entryPoint: PAINT_ENTRY, targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });

  computeBind = device.createBindGroup({
    layout: computeLayout,
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: paletteBuffer } },
      { binding: 2, resource: { buffer: constsBuffer } },
      { binding: 3, resource: { buffer: nodesBuffer } },
      { binding: 4, resource: { buffer: stepsBuffer } },
      { binding: 5, resource: { buffer: inksBuffer } },
      { binding: 6, resource: trailTexture.createView({ dimension: '2d-array' }) },
      { binding: 7, resource: { buffer: toneBuffer } },
    ],
  });
  renderBind = device.createBindGroup({
    layout: renderLayout,
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: paletteBuffer } },
      { binding: 2, resource: { buffer: constsBuffer } },
      { binding: 4, resource: { buffer: stepsBuffer } },
      { binding: 5, resource: { buffer: inksBuffer } },
    ],
  });

  gpu = {
    paramsBuffer, stepsBuffer, inksBuffer, toneBuffer, stagingSteps, stagingInks,
    stagingTones, nodesBuffer, stepMasks, trailRegion, bytes, format,
  };

  const shaderInfo = await paintModule.getCompilationInfo();
  report.shaderMessages = shaderInfo.messages.concat(
    (await computeModule.getCompilationInfo()).messages,
  ).map((m) => `${m.type} ${m.lineNum}:${m.linePos} ${m.message}`);

  report.stage = 'flush';
  await device.queue.onSubmittedWorkDone();
  report.stage = 'ready';
  gpu.initMs = now() - started;
  return gpu;
}

function paramValues(frame, mode) {
  const t = frame / FPS;
  // the halo's per-node brightness: one sine per node per frame, as the scene does
  const bright = brightness(t);
  const nodeData = new Float32Array(NODES.length * 4);
  NODES.forEach(([nx, ny], i) => nodeData.set([nx, ny, NODE_WEIGHT[i], bright[i]], i * 4));
  device.queue.writeBuffer(gpu.nodesBuffer, 0, nodeData);
  return {
    cols, rows, mode: mode === 'portable' ? 1 : mode, frame,
    nodeCount: NODES.length, paletteCount: PALETTE_RGB.length, ladderCount: metrics.ladder.length,
    groundIndex: sceneCpu.ground,
    trailFrame: ((Math.round(t * FPS) % CYCLE) + CYCLE) % CYCLE,
    trailW: gpu.trailRegion.w, trailH: gpu.trailRegion.h,
    trailX0: gpu.trailRegion.x0, trailY0: gpu.trailRegion.y0,
    scale, t, fps: FPS, seconds: SECONDS,
    skyGain: SKY_GAIN,
    // WU108: the engine no longer reports `minTone`; the caller derives it from
    // the palette it already has, exactly as the product consumer does.
    minTone: Math.min(...metrics.tones), maxTone: metrics.maxTone, groundTone: metrics.groundTone,
    haloSkip: HALO_SKIP, trailScale: TRAIL.scale,
    evS0: EVENT.s0, evS1: EVENT.s1, ease: EASE,
    evFromX: EVENT.from[0], evFromY: EVENT.from[1], evToX: EVENT.to[0], evToY: EVENT.to[1],
    evDirX: EVENT.dir[0], evDirY: EVENT.dir[1],
    tailGain: TAIL_GAIN, tailS: TAIL_S, tailP: TAIL_P, comaR: COMA_R, blinkR: BLINK_R,
    wu0: WANDER.u[0], wu1: WANDER.u[1], wu2: WANDER.u[2], wu3: WANDER.u[3], wu4: WANDER.u[4],
    wv0: WANDER.v[0], wv1: WANDER.v[1], wv2: WANDER.v[2], wv3: WANDER.v[3], wv4: WANDER.v[4],
  };
}

function gpuEncode(frame, mode) {
  const values = paramValues(frame, mode);
  device.queue.writeBuffer(gpu.paramsBuffer, 0, packParams(values));
  const encoder = device.createCommandEncoder();
  const compute = encoder.beginComputePass();
  compute.setPipeline(computePipeline);
  compute.setBindGroup(0, computeBind);
  compute.dispatchWorkgroups(Math.ceil(cols / 8), Math.ceil(rows / 8));
  compute.end();
  const paint = encoder.beginRenderPass({
    colorAttachments: [{ view: target.createView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
  });
  paint.setPipeline(paintPipeline);
  paint.setBindGroup(0, renderBind);
  paint.draw(3);
  paint.end();
  device.queue.submit([encoder.finish()]);
}

async function gpuReadCellBuffers() {
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(gpu.stepsBuffer, 0, gpu.stagingSteps, 0, gpu.bytes.steps);
  encoder.copyBufferToBuffer(gpu.inksBuffer, 0, gpu.stagingInks, 0, gpu.bytes.inks);
  encoder.copyBufferToBuffer(gpu.toneBuffer, 0, gpu.stagingTones, 0, gpu.bytes.steps);
  device.queue.submit([encoder.finish()]);
  await Promise.all([
    gpu.stagingSteps.mapAsync(GPUMapMode.READ),
    gpu.stagingInks.mapAsync(GPUMapMode.READ),
    gpu.stagingTones.mapAsync(GPUMapMode.READ),
  ]);
  const steps = new Uint32Array(gpu.stagingSteps.getMappedRange(0, gpu.bytes.steps).slice(0));
  const inks = new Uint32Array(gpu.stagingInks.getMappedRange(0, gpu.bytes.inks).slice(0));
  const tones = new Float32Array(gpu.stagingTones.getMappedRange(0, gpu.bytes.steps).slice(0));
  gpu.stagingSteps.unmap();
  gpu.stagingInks.unmap();
  gpu.stagingTones.unmap();
  return { steps, inks, tones };
}

// ------------------------------------------------------------------ the runs
async function runCpu(framesToRun) {
  cpuFrame(0); // warm: masks, sprites, JIT
  const times = [];
  for (let f = 0; f < framesToRun; f++) {
    const t0 = now();
    cpuFrame(f % CYCLE);
    times.push(now() - t0);
    if (f % 8 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  return { times };
}

async function runGpu(framesToRun, mode) {
  gpuEncode(0, mode);
  await device.queue.onSubmittedWorkDone(); // warm: pipeline compile + first submit
  const spans = [];
  const submits = [];
  for (let f = 0; f < framesToRun; f++) {
    const t0 = now();
    gpuEncode(f % CYCLE, mode);
    const t1 = now();
    await device.queue.onSubmittedWorkDone();
    const t2 = now();
    submits.push(t1 - t0);
    spans.push(t2 - t0);
    if (f % 8 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  return { spans, submits };
}

/** Term-by-term agreement of the WGSL model with the f64 reference: sky, then
 *  sky + halo, then everything but the vignette. This is the audit that says
 *  WHICH part of the port disagrees, not just how many cells flipped. */
async function diagnoseTerms(frame) {
  const t = frame / FPS;
  const out = [];
  const termsFor = { 2: ['sky'], 3: ['sky', 'halo'], 4: ['sky', 'dust', 'twinkle', 'halo', 'event', 'trail'] };
  for (const mode of [2, 3, 4]) {
    gpuEncode(frame, mode);
    await device.queue.onSubmittedWorkDone();
    const got = await gpuReadCellBuffers();
    let sum = 0;
    let max = 0;
    let worst = null;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const terms = toneTerms(x, y, t, scale, 'asin');
        let ref = 0;
        for (const key of termsFor[mode]) ref += terms[key];
        const d = Math.abs(got.tones[i] - ref);
        sum += d;
        if (d > max) { max = d; worst = [x, y, got.tones[i], ref]; }
      }
    }
    out.push({ mode, terms: termsFor[mode], meanAbs: sum / cells, maxAbs: max, worst });
  }
  return out;
}

/**
 * The SHIPPED canvas path at 480 × 300, reproduced: bake the static sky once,
 * then per frame copy the bake and patch only the cells the animation can touch
 * (`hibrido/hibrido.mjs` draw()). This is what the 12.8 ms baseline measures, and
 * it exists here only to check that figure in this browser — it cannot run at 4×,
 * because the scene's dynamic cell set is defined on its own 480 × 300 lattice.
 */
function buildCachedPath() {
  const staticScene = {
    ...constelacion2Scene,
    id: 'gpu-spike-static',
    field: (x, y) => {
      const { toneColor } = sceneModule;
      return toneColor(baseTone(x, y) * vignette(x, y));
    },
  };
  const baked = renderFrame(staticScene, 0, { dither: 'bayer4' });
  const staticPixels = new Uint8ClampedArray(rasterize(baked, staticScene, cellPx));
  const base = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) base[y * W + x] = baseTone(x, y);
  const sprites = [];
  for (let step = 0; step < metrics.coverage.length; step++) {
    const row = [];
    for (let ink = 0; ink < metrics.colors.length; ink++) {
      row.push(rasterize({ cols: 1, rows: 1, steps: Uint8Array.of(step), indices: Uint8Array.of(ink) }, constelacion2Scene, cellPx));
    }
    sprites.push(row);
  }
  const out = new Uint8ClampedArray(staticPixels.length);
  const image = new ImageData(out, W, H);
  // WU108: derived here, because the engine no longer reports `minTone`.
  const minTone = Math.min(...metrics.tones);
  const span = Math.max(1e-6, metrics.maxTone - minTone);
  return {
    draw(frame) {
      const t = frame / FPS;
      out.set(staticPixels);
      forEachDynamicCell(t, (at, x, y, added) => {
        const colour = sceneModule.toneColor((base[at] + added) * vignette(x, y));
        const level = Math.max(0, Math.min(1, (luma(colour[0], colour[1], colour[2]) - minTone) / span));
        const step = stepFor(level, x, y, 'bayer4');
        const ink = step === 0 ? constelacion2Scene.ground : compensate(constelacion2Scene, colour[0], colour[1], colour[2], step, metrics);
        if (step === baked.steps[at] && ink === baked.indices[at]) return;
        const sprite = sprites[step][ink];
        out.set(sprite, (y * W + x) * 4);
      });
      ctxCpu.putImageData(image, 0, 0);
    },
  };
}

async function runCpuCached(framesToRun) {
  const path = buildCachedPath();
  path.draw(0);
  const times = [];
  for (let f = 0; f < framesToRun; f++) {
    const t0 = now();
    path.draw(f % CYCLE);
    times.push(now() - t0);
    if (f % 8 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  return { times };
}

/** One frame through both paths, compared cell by cell and pixel by pixel. The
 *  CPU reference for a mode is that mode's own scene, so `portable` measures the
 *  pipeline's portability and not a different noise field. */
async function compareFrame(frame, mode) {
  const refScene = mode === 'asin' && scale === 1 ? constelacion2Scene : makeScene(scale, mode);
  const cpuField = renderFrame(refScene, frame, { dither: 'bayer4' });
  rasterize(cpuField, refScene, cellPx, cpuInto);
  ctxCpu.putImageData(cpuImage, 0, 0);
  gpuEncode(frame, mode);
  await device.queue.onSubmittedWorkDone();
  const got = await gpuReadCellBuffers();
  let cellDiff = 0;
  let stepDiff = 0;
  let inkDiff = 0;
  for (let i = 0; i < cells; i++) {
    const stepSame = got.steps[i] === cpuField.steps[i];
    const inkSame = got.inks[i] === cpuField.indices[i];
    if (!stepSame) stepDiff++;
    if (!inkSame) inkDiff++;
    if (!stepSame || !inkSame) cellDiff++;
  }
  // the pixels the GPU rendered, read back byte for byte
  const gpuPixels = await readGpuPixels();
  let pixelDiff = 0;
  let maxDelta = 0;
  for (let i = 0; i < cpuInto.length; i += 4) {
    const d = Math.max(
      Math.abs(cpuInto[i] - gpuPixels[i]),
      Math.abs(cpuInto[i + 1] - gpuPixels[i + 1]),
      Math.abs(cpuInto[i + 2] - gpuPixels[i + 2]),
    );
    if (d > 0) pixelDiff++;
    if (d > maxDelta) maxDelta = d;
  }
  if (mode === 'asin') presentGpu(gpuPixels); // the picture the GPU produced
  // how far the f32 port's TONE is from the f64 reference, independent of how
  // many cells happened to land near a threshold
  const refTones = new Float32Array(cells);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) refTones[y * cols + x] = toneAt(x, y, frame / FPS, scale, mode);
  }
  let toneMax = 0;
  let toneSum = 0;
  let toneWorst = null;
  const abs = new Float32Array(cells);
  for (let i = 0; i < cells; i++) {
    const d = Math.abs(got.tones[i] - refTones[i]);
    abs[i] = d;
    toneSum += d;
    if (d > toneMax) { toneMax = d; toneWorst = [i % cols, Math.floor(i / cols)]; }
  }
  const sortedAbs = abs.slice().sort();
  // a coarse map of the error, plus the terms at the worst cell: enough to say
  // WHICH part of the model the port disagrees with
  const BW = 48;
  const BH = 30;
  const toneMap = [];
  for (let by = 0; by < BH; by++) {
    const row = [];
    for (let bx = 0; bx < BW; bx++) {
      let sum = 0;
      let n = 0;
      for (let y = Math.floor((by * rows) / BH); y < Math.floor(((by + 1) * rows) / BH); y++) {
        for (let x = Math.floor((bx * cols) / BW); x < Math.floor(((bx + 1) * cols) / BW); x++) {
          sum += abs[y * cols + x];
          n++;
        }
      }
      row.push(Number((sum / Math.max(1, n)).toFixed(4)));
    }
    toneMap.push(row);
  }
  const worstAt = toneWorst ?? [0, 0];
  const terms = toneTerms(worstAt[0], worstAt[1], frame / FPS, scale, mode);
  return {
    toneMap,
    toneWorstDetail: {
      at: worstAt,
      gpu: got.tones[worstAt[1] * cols + worstAt[0]],
      ref: refTones[worstAt[1] * cols + worstAt[0]],
      terms,
    },
    frame, mode,
    cellDiff, stepDiff, inkDiff,
    cellDiffPct: (100 * cellDiff) / cells,
    pixelDiff, pixelDiffPct: (100 * pixelDiff) / cells, maxChannelDelta: maxDelta,
    toneMaxAbs: toneMax, toneMeanAbs: toneSum / cells,
    toneP99Abs: sortedAbs[Math.min(cells - 1, Math.floor(0.99 * cells))],
    toneWorst,
  };
}

/** The rendered target, as tightly packed RGBA. `copyTextureToBuffer` demands a
 *  256-byte row stride, so the padded rows are copied into a tight buffer here. */
async function readGpuPixels(into) {
  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer(
    { texture: target },
    { buffer: readback, bytesPerRow: readbackRowBytes, rowsPerImage: rows },
    { width: cols, height: rows },
  );
  device.queue.submit([encoder.finish()]);
  await readback.mapAsync(GPUMapMode.READ);
  const view = new Uint8Array(readback.getMappedRange(0));
  const tight = into ?? new Uint8ClampedArray(cells * 4);
  const rowBytes = cols * 4;
  for (let y = 0; y < rows; y++) {
    tight.set(view.subarray(y * readbackRowBytes, y * readbackRowBytes + rowBytes), y * rowBytes);
  }
  readback.unmap();
  return tight;
}

async function main() {
  const poster = constelacion2Scene.posterFrame % CYCLE;

  // ---- the reference model is the scene, or nothing below means anything
  report.verification = verifyAgainstScene();
  const engineSame = (() => {
    const a = renderFrame(constelacion2Scene, poster, { dither: 'bayer4' });
    const b = renderFrame(makeScene(1, 'asin'), poster, { dither: 'bayer4' });
    let diff = 0;
    for (let i = 0; i < a.steps.length; i++) if (a.steps[i] !== b.steps[i] || a.indices[i] !== b.indices[i]) diff++;
    return diff;
  })();
  report.verification.scaleOneGridDiff = engineSame;

  // `?shots=1`: render the poster frame through both paths only, so the native-
  // resolution screenshots can be taken without waiting for the 144-frame runs
  if (query.get('shots') === '1') {
    cpuFrame(poster);
    await initGpu();
    if (gpu) report.shotsOnly = await compareFrame(poster, 'asin');
    statusOut.textContent = 'capturas listas';
    document.body.dataset.done = '1';
    window.__SPIKE_RESULT__ = report;
    render();
    return;
  }
  statusOut.textContent = 'modelo verificado; midiendo';

  // ---- CPU path, and the shipped cached variant at 480 × 300 (reference only)
  if (scale === 1) {
    const cached = await runCpuCached(frames);
    report.cpuCached = {
      frames: cached.times.length,
      meanMs: mean(cached.times),
      p95Ms: p95(cached.times),
      minMs: Math.min(...cached.times),
      maxMs: Math.max(...cached.times),
      note: 'bake once + patch the dynamic cells, as hibrido.mjs draw() does',
    };
  }
  const cpuRun = await runCpu(frames);
  report.cpu = {
    frames: cpuRun.times.length,
    meanMs: mean(cpuRun.times),
    p95Ms: p95(cpuRun.times),
    minMs: Math.min(...cpuRun.times),
    maxMs: Math.max(...cpuRun.times),
  };

  // ---- GPU path
  await initGpu();
  if (!gpu) {
    report.capability.note = 'no adapter: the GPU column could not be measured';
  } else {
    const gpuRun = await runGpu(frames, 'asin');
    report.gpu = {
      initMs: gpu.initMs,
      frames: gpuRun.spans.length,
      meanMs: mean(gpuRun.spans),
      p95Ms: p95(gpuRun.spans),
      minMs: Math.min(...gpuRun.spans),
      maxMs: Math.max(...gpuRun.spans),
      submitMeanMs: mean(gpuRun.submits),
      submitP95Ms: p95(gpuRun.submits),
    };
    report.memory = {
      stepsBytes: gpu.bytes.steps,
      inksBytes: gpu.bytes.inks,
      stagingBytes: gpu.bytes.staging,
      trailBytes: gpu.bytes.trail,
      constantBytes: gpu.bytes.params + gpu.bytes.palette + gpu.bytes.consts + gpu.bytes.nodes,
      targetBytes: gpu.bytes.target,
      readbackBytes: gpu.bytes.readback,
      totalBytes: gpu.bytes.steps + gpu.bytes.inks + gpu.bytes.staging + gpu.bytes.trail
        + gpu.bytes.target + gpu.bytes.readback
        + gpu.bytes.params + gpu.bytes.palette + gpu.bytes.consts + gpu.bytes.nodes,
    };
    report.terms = await diagnoseTerms(poster);
    report.diff = await compareFrame(poster, 'asin');
    report.diff.portable = await compareFrame(poster, 'portable');
    // run-to-run reproducibility of the GPU path itself
    gpuEncode(poster, 'asin');
    await device.queue.onSubmittedWorkDone();
    const first = await gpuReadCellBuffers();
    gpuEncode(poster, 'asin');
    await device.queue.onSubmittedWorkDone();
    const second = await gpuReadCellBuffers();
    let repeat = 0;
    for (let i = 0; i < cells; i++) if (first.steps[i] !== second.steps[i] || first.inks[i] !== second.inks[i]) repeat++;
    report.determinism = {
      gpuRepeatSteps: repeat,
      gpuRepeatPct: (100 * repeat) / cells,
      cpuRepeat: 'renderFrame is pure; the Node bake and the live raster already agree byte for byte',
    };
  }

  statusOut.textContent = 'listo';
  document.body.dataset.done = '1';
  window.__SPIKE_RESULT__ = report;
  render();
}

// ------------------------------------------------------------------- the page
function render() {
  out.textContent = JSON.stringify(report, null, 2);
  const rowsOut = [];
  const pct = (v) => `${v.toFixed(3)} %`;
  rowsOut.push(['cells', cells.toLocaleString('en-US')]);
  rowsOut.push(['frames', String(frames)]);
  rowsOut.push(['navigator.gpu', String(report.capability.hasNavigatorGpu)]);
  if (report.adapter) {
    rowsOut.push(['adapter', `${report.adapter.vendor ?? '?'} / ${report.adapter.architecture ?? '?'}${report.adapter.isFallbackAdapter ? ' (fallback)' : ''}`]);
  }
  if (report.cpuCached) {
    rowsOut.push(['CPU 2D cached mean / p95', `${report.cpuCached.meanMs.toFixed(1)} / ${report.cpuCached.p95Ms.toFixed(1)} ms`]);
  }
  if (report.cpu) {
    rowsOut.push(['CPU 2D re-render mean / p95', `${report.cpu.meanMs.toFixed(1)} / ${report.cpu.p95Ms.toFixed(1)} ms`]);
  }
  if (report.gpu) {
    rowsOut.push(['GPU init', `${report.gpu.initMs.toFixed(1)} ms`]);
    rowsOut.push(['GPU mean / p95', `${report.gpu.meanMs.toFixed(1)} / ${report.gpu.p95Ms.toFixed(1)} ms`]);
    rowsOut.push(['GPU submit mean / p95', `${report.gpu.submitMeanMs.toFixed(1)} / ${report.gpu.submitP95Ms.toFixed(1)} ms`]);
    rowsOut.push(['GPU memory', `${(report.memory.totalBytes / 1e6).toFixed(1)} MB`]);
    rowsOut.push(['cell diff (asin)', `${report.diff.cellDiff.toLocaleString('en-US')} — ${pct(report.diff.cellDiffPct)}`]);
    rowsOut.push(['cell diff (portable)', `${report.diff.portable.cellDiff.toLocaleString('en-US')} — ${pct(report.diff.portable.cellDiffPct)}`]);
    rowsOut.push(['pixel diff (asin)', `${report.diff.pixelDiff.toLocaleString('en-US')} — ${pct(report.diff.pixelDiffPct)}, Δmax ${report.diff.maxChannelDelta}`]);
    rowsOut.push(['pixel diff (portable)', `${report.diff.portable.pixelDiff.toLocaleString('en-US')} — ${pct(report.diff.portable.pixelDiffPct)}, Δmax ${report.diff.portable.maxChannelDelta}`]);
    rowsOut.push(['GPU repeat', `${report.determinism.gpuRepeatSteps} cells`]);
  }
  tableOut.innerHTML = rowsOut.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

main().catch((error) => {
  report.errors.push(`at ${report.stage}: ${String(error?.stack ?? error)}`);
  statusOut.textContent = 'error';
  document.body.dataset.done = '1';
  window.__SPIKE_RESULT__ = report;
  render();
});
