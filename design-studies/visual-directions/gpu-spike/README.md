# WU81 · GPU spike — does WebGPU buy anything over the canvas-2D dot field?

A measurement spike, not a production change. Two paths render the same scene:

- **2D path** — `scripts/scene-src/engine.mjs`: `renderFrame()` + `rasterize()`, one pixel per cell.
- **GPU path** — inline WGSL: a compute pass that evaluates the same tone model per cell
  (sky groups, three dust tiers + the twinkling tier, the inverse-square node halo, the eased
  shooting star, the wandering light and its 144-frame trail plane, the vignette, palette +
  ladder + `compensate`), then a fragment pass that paints the same cell mask.

Page: `design-studies/visual-directions/gpu-spike/index.html?scale=1|4&frames=144`
Served from the repo root at `http://127.0.0.1:4403/` (the engine's relative imports need it).
Driver: `node design-studies/visual-directions/gpu-spike/run-spike.mjs --scale=4 --frames=144`

## Result

**Every GPU number below comes from a software adapter** (`google` / `swiftshader`), because
headless Chromium in this container never exposed the machine's real GPU (an NVIDIA RTX 3050
Mobile with a working Vulkan ICD is present; every flag set that forced native Vulkan instead
turned WebGPU off entirely). The GPU timings therefore measure a CPU emulator, not hardware.
The CPU columns are real host-CPU timings.

| capability / adapter | `navigator.gpu` present: **true** (headless Chromium 153, `--enable-unsafe-webgpu --enable-features=Vulkan`); adapter `vendor: google`, `architecture: swiftshader`, `device: ""`, no `isFallbackAdapter` field, features `[core-features-and-limits]` (no `timestamp-query`, so no GPU-side timings) |
|---|---|
| **480 × 300** (144,000 cells, 144 frames) | |
| GPU init (device + pipelines + buffers + 144-layer trail texture) | **410.3 ms**, one-off |
| CPU 2D — cached bake + dynamic patch (`hibrido.mjs` `draw()`) | **16.3 ms mean / 35.7 ms p95** |
| CPU 2D — `renderFrame` + `rasterize` per frame | **212.4 ms mean / 227.4 ms p95** |
| GPU — compute + paint, submit elapsed | **55.3 ms mean / 62.2 ms p95** (CPU-side encode+submit **0.14 / 0.20 ms**) |
| GPU memory allocated | **5.9 MB** (steps 0.58 + inks 0.58 + staging 1.15 + target 0.58 + readback 0.61 + trail 2.44 + constants 0.001) |
| cell diff, as-shipped noise | **21,808 / 144,000 = 15.144 %** (tone mean abs Δ 0.0216, p99 0.153, max 0.423) |
| cell diff, portable-hash variant | **1 / 144,000 = 0.00069 %** (tone mean abs Δ 6.2e-8) |
| pixel diff vs CPU raster (bytes) | 21,788 px = 15.131 % (max channel Δ 111) / portable: 1 px | 
| GPU-to-GPU repeat (same frame, two dispatches) | **0 / 144,000 cells** |
| **1920 × 1200** (2,304,000 cells = 16×, 144 frames) | |
| GPU init | **429.5 ms** |
| CPU 2D — `renderFrame` + `rasterize` per frame | **3491.7 ms mean / 3707.3 ms p95** |
| GPU — compute + paint | **879.3 ms mean / 934.0 ms p95** (submit 0.16 / 0.30 ms) |
| GPU memory allocated | **57.7 MB** (steps 9.2 + inks 9.2 + staging 18.4 + target 9.2 + readback 9.2 + trail 2.4 + constants 0.001) |
| cell diff, as-shipped noise | **346,717 / 2,304,000 = 15.048 %** (tone mean abs Δ 0.0214, max 0.437) |
| cell diff, portable-hash variant | **3 / 2,304,000 = 0.00013 %** |
| GPU-to-GPU repeat | **0 cells** |

Screenshots (`dist-motion-verify/wu81-gpu-spike/`):

- `spike-scale-1-page.png`, `spike-scale-4-page.png` — the measured pages, numbers included
- `spike-scale-1-native-{cpu,gpu}.png` (480 × 300), `spike-scale-4-native-{cpu,gpu}.png`
  (1920 × 1200) — one panel per path at **native pixel size**, same poster frame
  (`--shots=1`, which renders the poster frame through both paths without the 144-frame runs)

Raw reports: `dist-motion-verify/wu81-gpu-spike/results-scale-{1,4}.json` and
`results-scale-{1,4}-native.json` — they carry the per-size tone-diff map, the term-by-term
audit, the adapter record and every raw frame sample.

## The three sentences the numbers support

(a) **Resolution** — at 16× the cells the GPU costs 15.9× the frame and the CPU 16.4×, so WebGPU
buys resolution only in absolute terms (879 ms against 3492 ms a frame) and not in headroom: at
1920 × 1200 the GPU path is still ~10× over the 83 ms budget of the 12 fps loop, and neither path
is close to real time at that size.

(b) **Frame rate** — at the shipped 480 × 300 the GPU path (55.3 ms mean) is 3.4× *slower* than
the canvas path the site actually ships (16.3 ms cached) and 3.8× faster than an uncached engine
re-render (212.4 ms), on an adapter that is a CPU emulator, so this column says what SwiftShader
does and not what an RTX 3050 would do.

(c) **Determinism** — the GPU is reproducible against itself (0 of 144,000 cells differ between two
dispatches of the same frame) but not against the CPU: the shipped `sin(x·127.1 + y·311.7)`
hash loses ~0.03 rad in f32 and moves 15.1 % of cells onto a different ramp step at both sizes,
whereas the identical model on a portable integer hash disagrees on 1 cell in 144,000 (3 in
2.3 million), so bit-identical CPU/GPU output is reachable only by replacing the noise, not by
porting the renderer.

## What was measured, and what would be dishonest to claim

- **Same scene, finer lattice.** The 1920 × 1200 frame is the same model sampled on a 4× lattice:
  distances (halo reach, comet, trail) are physical 480-space cells, dust and twinkle are per
  sampling cell. Both paths get the identical scene object, so the diff is meaningful at both sizes.
- **The scene moved under this spike.** `lab/scene-constelacion2.mjs` was being edited while the
  spike ran (the isometric floor was removed, both events were rewritten with an eased envelope
  and a closed wander path, the twinkle was snapped to whole cycles, a decaying trail was added).
  All numbers here are measured against a **byte-identical snapshot**
  (`scene-snapshot.mjs`, sha256 `6ff10308657f150ad7f505a9fff47df8c8567498f4874713783aac3a0aeee1dd`)
  whose private names are re-exported by `scene-pinned.generated.mjs` (`make-pinned.mjs`), so the
  reference reuses the scene's own hash, fbm, dust tiers, halo, envelopes, wander path and trail
  instead of restating them.
- **The reference is proven, not asserted.** `verifyAgainstScene()` reports
  `skyMax = 2.8e-17`, `toneMax = 7.4e-15`, the restated sin noise identical to the scene's
  (`noiseMax = 0`), and the scale-1 render compared grid-for-grid against the scene's own
  `renderFrame` gives **0 differing cells**. Without that, no diff below would mean anything.
- **Both paths present pixels the same way.** This headless Chromium destroys the WebGPU device
  the moment a canvas presentation is attempted (probe5), so the GPU path renders into a texture
  and its pixels are put on screen with the same `putImageData` the CPU path uses. The readback is
  **not** inside the measured frame; it happens once, for the diff frame, and `submit` is reported
  separately (0.14 ms) so the CPU-side and GPU-side costs are not conflated.
- **One pixel per cell.** Both paths render at 1 px/cell in this spike, so the diff is exactly per
  cell. The shipped hybrid rasterises at 3–8 px/cell for a round rim; that changes the raster cost,
  not the cell selection, and it is not what these numbers measure.
- **`frames = 144`** is one full cycle of the loop, on every path and both sizes (p95 over the 144
  samples, warm-up frame excluded).
- **The 12.8 ms / 31.6 ms baseline in the brief was not reproduced bit for bit**: the cached-path
  reimplementation here measures 16.3 / 35.7 ms in headless Chromium with SwiftShader resident.
  The difference is environmental and the numbers above are the ones observed.
- No recommendation, no art direction: the table is the finding.

## Files

| file | role |
|---|---|
| `index.html` | the page (two panels, readout table, full JSON report) |
| `spike.mjs` | capability probe, init timing, 144-frame runs, diffs, determinism |
| `scene-scaled.mjs` | the tone model on a rescalable lattice; portable-hash variant; verification |
| `wgsl.mjs` | the WGSL (compute + paint) and the shared params struct/packer |
| `scene-snapshot.mjs` | byte-identical snapshot of the scene at measurement time |
| `scene-pinned.generated.mjs` | generated by `make-pinned.mjs`: snapshot + private-name exports |
| `run-spike.mjs` | Playwright driver: serves 4403, runs the page, writes JSON + screenshots |
| `probe*.mjs` | the capability probes that established which flags yield which adapter |
