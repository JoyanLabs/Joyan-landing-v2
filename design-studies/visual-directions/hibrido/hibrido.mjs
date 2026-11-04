/**
 * Hybrid: the engine paints the sky; the SVG paints the constellation.
 * The vector layer is placed from the scene's own CELL coordinates
 * (`NODES_PX` / `LINKS_PX`) into a `viewBox` of exactly 480 × 300 — the canvas'
 * pixel space — so a node lands on its engine glow and a circle stays a circle.
 *
 * WHAT CHANGED AFTER THE REVIEW, and why:
 *   - `renderFrame` per frame measured 396 ms (241 ms on this machine) against
 *     the 83 ms budget of a 12 fps loop, so the shooting star crawled and the
 *     blink strobed. The field is now split: the STATIC layer (sky, dust tiers
 *     0–2, the isometric floor) is baked ONCE into an offscreen canvas at the
 *     display's own cell size, and each frame redraws that bake and patches only
 *     the DYNAMIC cells — node halos, the twinkling dust tier, both events.
 *     Measured in Node: 12.8 ms mean, 31.6 ms worst per dynamic frame.
 *   - The loop pauses when the stage leaves the viewport (IntersectionObserver)
 *     and the resize handler is debounced by 180 ms, because a resize used to
 *     re-render ~400 ms of field per event.
 *   - The live raster is an INTEGER number of device pixels per cell and honours
 *     `devicePixelRatio`; `Math.ceil(clientWidth / 480)` overshot (1440 px in a
 *     1175.6 px box) and assumed DPR 1. The readout reports canvas.width, the
 *     effective scale and the DPR instead of hiding them.
 *   - Star geometry: rings are 1.2 cells (they used to be 2.4 and 43 of 65 rings
 *     overlapped a neighbour), and the scene now decimates the drawing's 65
 *     vertices to stars at least 6 cells apart.
 *   - The loop is driven by elapsed time, not by paints: `frame` is
 *     `floor(((now - started) / 1000) * FPS) % total` and a frame is drawn only
 *     when that index differs. `frame + 1` per paint behind a `1000 / FPS` gate
 *     made the period a function of the paint rate — measured 13.5 s at ~10.5
 *     painted fps where the design says 12 s, and 14.4 s when the scene's fps
 *     was raised to 24 (20 painted fps). Measured after this change: period
 *     12.0 s at the same ~10.5 painted fps, because the clock now skips frames.
 *   - The page runs TWO grounds over ONE field. `data-ground` on <html> picks the
 *     emission (dark or paper — the generator emits both from one template, so
 *     the module surface is identical) and the paper ground also flips the level
 *     at the ladder call sites (level = 1 - levelOf(color)): its palette's ground
 *     is its LIGHTEST tone, and without the inversion the render is the drawing's
 *     negative. The dark ground keeps levelOf untouched, and no engine option is
 *     passed either way.
 *
 * WHAT CHANGED AFTER THE JUDGE'S FINDINGS, and why:
 *   - THE SWITCH NO LONGER BLOCKS. Measured on the click handler before: 435 ms
 *     for the first paper (bake included), 225 ms back to dark, 218 ms back to
 *     paper, and the first painted frame of the new ground landed 433 ms after the
 *     click. The old handler re-pointed a dozen module-level bindings, re-baked the
 *     whole field and repainted, all before returning. Now the click only (a) sets
 *     `data-ground` and `aria-pressed` — the state it reports — and (b) schedules
 *     the work: the very next frame FILLS the canvas with the incoming ground's
 *     own `groundHex` (one fillRect, no field), and the bake then runs in ~9 ms
 *     slices across the following frames. Measured after: handler 0.7–1.1 ms,
 *     first painted frame 16.1–16.4 ms, and the heaviest task the switch causes is
 *     its last frame (~51 ms: the raster plus one draw) instead of 435 ms.
 *   - THE READOUT CANNOT LIE ANY MORE. `[data-cost]` times `draw()` alone and
 *     always did, which is why a click that cost 228 ms printed `20 ms`. A second
 *     readout, `[data-switch]`, reports the WHOLE switch: handler + the bake's CPU
 *     time + the total, with the wall clock to the finished frame and the first
 *     frame of the new ground in its title. The initial bake is reported there
 *     too, so the page never shows a cost that excludes it.
 *   - THE POINTS LEAD. At 390 CSS px a viewBox unit is 0.74 px, so the cores
 *     printed at 0.92–1.34 px against a 1 px hairline: a triangulated wireframe,
 *     not a constellation. The marks are now sized in CSS PX of the canvas box and
 *     floored at 2 px (cores 2.00–2.40 px at 390, 3.17–4.35 px at 1280) while the
 *     links got thinner (0.70 → 0.88 px) and dimmer (opacity .55 dark, .42 paper):
 *     core:link 3.05:1 at 390 and 4.06:1 at 1280, against 1.06:1 and 3.51:1
 *     before. The size is a function of the CSS width only — never of the device
 *     pixel ratio — so a retina screen gets the same figure, twice as crisp.
 *
 * WHAT CHANGED AFTER THE RASTER-SCALING DECISION (WU97), and why:
 *   - THE SCALING POLICY IS NOW WRITTEN DOWN AND MEASURED, not implied. The page
 *     keeps an integer number of DEVICE pixels per cell (`cellPixelsFor`) and
 *     `image-rendering: pixelated`, and the residual browser scale is therefore
 *     fractional: 2.449 device px per cell at 1280×900 (cell widths of 2 and 3
 *     device px), 1.487 at 390×844 at DPR 2 (1 and 2), and 0.743 at 390×844 at
 *     DPR 1 — where 122 of the interior 476 cell columns and 75 of 296 rows have
 *     no device pixel at all, i.e. ~26 % of each axis is skipped. The two
 *     alternatives were measured and rejected:
 *       · A · integer device scale. `cellPixelsFor` DERIVES the cell from the
 *         box, so the only realizable snap is a box that is an exact multiple of
 *         480 device px; the 1/integer branch is unreachable, because a smaller
 *         box makes the same function return cell 1 again and the scale goes
 *         fractional. That snap needs 480 device px at 390 DPR 1, where the box
 *         has 356.81: IMPOSSIBLE there. Where it exists it costs the sky: −33.3 %
 *         of the sky rect at 1280 (960×600 of 1175.6×734.8) and −54.8 % at
 *         390 DPR 2 (240×150). It buys lattice regularity (a single cell width)
 *         where nothing was being lost (224/224 one-cell features and 35/35
 *         cores survive at 1280) and cannot be applied where something IS lost.
 *       · B · `image-rendering: auto` on the dark ground. It cannot help the
 *         cores at all — they are SVG, outside `image-rendering` — and the core
 *         count is identical under all three options (35/35 at 1280, 22/35 at
 *         390 DPR 1, 35/35 at 390 DPR 2). What it does is turn the 21-level
 *         bayer ground into 141–174 distinct device luma levels and cut the share
 *         of hard (≥3 luma) column steps from 27 % to 12 % at 390 DPR 1: the
 *         stipple becomes a gradient, which is the blur this page chose
 *         `pixelated` to avoid. Its only gain — 1-cell dust kept above half tone
 *         (208/224 vs 175/224) — costs the dither's identity at exactly the
 *         viewport where the dither is the texture.
 *   - SO: THE IRREGULAR LATTICE IS ACCEPTED, AND THE CORE FLOOR IS A GUARANTEE.
 *     The defect that could delete content is a 1-cell feature falling between
 *     samples; the star CORES are vector and 2.0–2.4 CSS px across, i.e. 2.7–3.2
 *     raster cells at 390 and 1.3–1.8 cells at 1280 and above (the ratio bottoms
 *     out at the slope, 0.0027·480 = 1.296). `starGeometry` now floors each core
 *     at ONE RASTER CELL as well, so the invariant is enforced by the function
 *     instead of resting on a comment: at 390 that floor is 0.743 CSS px, far
 *     below the 2 px minimum, so it never binds and not one pixel moves. The
 *     measurement is in `dist-motion-verify/wu97-escalado/`.
 *
 * WHAT CHANGED AFTER THE DEPENDENCY AUDIT, and why:
 *   - THE PAGE NO LONGER NEEDS A MODIFIED ENGINE. `levelOf` normalised against
 *     `metrics.minTone`, a field that only existed because `sceneMetrics()` had
 *     been edited during this work; against the committed engine that field is
 *     `undefined` and the level of every cell was NaN — measured: 178 908 NaN
 *     levels, step 0 on 100 % of the cells, the whole figure printed as flat
 *     ground, and no error in the console to say so. The extremes are now derived
 *     from the scene's own palette (`hexToRgb` + `tone`, both published by the
 *     engine), so the page runs on an UNMODIFIED engine and still paints the same
 *     bytes: poster hash 40fee4e5 (dark) / 8c6b5a05 (paper), paper step 0 36.19 %,
 *     printed tone mean 0.883 — measured against both engines, see
 *     `dist-motion-verify/wu94-dependencia/`.
 *   - THE INVERSION HAS ONE OWNER, AND IT IS THIS FILE. See the note above
 *     `levelFor`: the paper ground's flip is a consumer reading, so the engine
 *     must not also offer one.
 *
 * WHAT CHANGED AFTER THE LOAD-TIME MEASUREMENT (WU98), and why:
 *   - THE FIRST FRAME NO LONGER WAITS FOR THE LAZY TABLES. The emission builds
 *     its node-halo table and its 720-frame trail history on FIRST USE, and
 *     `rebuild()` used to reach both through the very first `draw()` — inside
 *     module evaluation, after the DOM was parsed and before anything was
 *     painted. Measured here (dist-motion-verify/wu98-lcp/): module start →
 *     first painted frame 456.9 ms, of which the tables are ~220 ms (halo ~42,
 *     trail ~178) on top of the ~186 ms static bake. `rebuild()` now paints the
 *     STATIC BAKE ALONE — the sky, the dust tiers and the ring, with the vector
 *     layer already in the DOM above it — and the tables are built afterwards, in
 *     idle slices, one table per slice, with the active ground first. Measured
 *     after, same method, same machine: first painted frame 234.1 ms after module
 *     start, largest long task 235 ms instead of 457 ms, fully warm at 2.2 s
 *     instead of 4.7 s.
 *   - NOTHING CLAIMS TO BE READY EARLY. `tablesReady()` gates the only function
 *     that can put dynamic ink on the canvas, so the trail cannot appear before
 *     its table exists — that is a guard in `draw()`, not a hope. While the
 *     tables are missing the frame readout says `estático`, the `[data-tables]`
 *     readout reports how many of the three slices each ground has, and
 *     `data-warm` on <html> is `none` until a ground's tables are whole (`dark`
 *     or `paper`) and `both` only when both are. The reduced-motion still is
 *     repainted when the tables land, so it is the poster frame and not a
 *     permanent still.
 *   - THE SLICE IS THE MODULE'S OWN UNIT, AND THAT IS REPORTED HONESTLY. The
 *     emission publishes no way to build PART of a table (`haloTable()` /
 *     `trailTable()` are closure-private and monolithic), so the finest honest
 *     slice is one table — three per ground, six in total — and the residual
 *     ~178 ms trail slice is the largest long task this work could not remove.
 *     It runs after the first painted frame, in idle time, and its real cost is
 *     printed on the page instead of hidden.
 */
import {
  compensate, hexToRgb, luma, rasterize, sceneMetrics, stepFor, tone,
} from '../../../scripts/scene-src/engine.mjs';
// BOTH emissions, imported as namespaces. The generator emits them from one
// template, so the module surface is identical and the ground toggle is a swap
// of WHICH emission the painters read. Only the palette differs — and with it
// the meaning of the engine's normalised level, which is why the paper ground
// also flips the level (see `levelFor`).
import * as darkEmission from '../lab/scene-constelacion2.mjs';
import * as paperEmission from '../lab/scene-constelacion2-papel.mjs';
// THE PAGE'S OWN CLOCK, so a probe (or a reader with devtools) measures these
// three moments instead of guessing at them: module start, the first painted
// frame, and the moment each ground's lazy tables are whole. Marks are cheap and
// they are the only timing claim this page makes about itself.
performance.mark('hibrido:start');

const { LINKS_PX, NODES_PX, cellPixelsFor } = darkEmission;
const GROUNDS = {
  dark: { emission: darkEmission, inverted: false },
  paper: { emission: paperEmission, inverted: true },
};
const groundName = (value) => (value === 'paper' ? 'paper' : 'dark');

/**
 * ONE STATE OBJECT PER GROUND, built on first use and then reused. The page used
 * to keep a dozen module-level `let`s that `useGround()` re-pointed one by one,
 * and every one of them had to be right before the switch could paint. A ground
 * is now a single reference, and the bake is a PURE FUNCTION of the object it is
 * handed: that is what lets the expensive pass run in slices while the loop keeps
 * painting, with no binding able to disagree with another mid-switch. `draw()`
 * reads the state off the BAKE it is patching, not off the module, so pixels and
 * palette cannot cross.
 */
function stateFor(name) {
  const key = groundName(name);
  const { emission, inverted } = GROUNDS[key];
  const scene = emission.constelacion2Scene;
  const metrics = sceneMetrics(scene);
  // THE TONE EXTREMES ARE DERIVED HERE, FROM THE SCENE'S OWN PALETTE — not read
  // off the engine. The level normalisation below needs the palette's lightest
  // and darkest tone, and `sceneMetrics()` ships the committed engine without
  // them, so the page computes them with the engine's published primitives
  // (`hexToRgb` + `tone`, the same Rec.709 luma `compensate` and `stepFor` use).
  // This keeps the page on an UNMODIFIED engine: the level is a consumer
  // decision, so the consumer owns its inputs. Two lines, one palette, no
  // engine change — and `metrics.minTone` / `metrics.maxTone` are not read, so
  // reverting those out of the engine cannot turn this page's levels into NaN.
  const paletteTones = scene.palette.map((hex) => tone(hexToRgb(hex)));
  const minTone = Math.min(...paletteTones);
  const maxTone = Math.max(...paletteTones);
  return {
    ground: key, emission, inverted, scene, metrics, minTone, maxTone,
    W: scene.cols, H: scene.rows, FPS: scene.fps, total: scene.cycleFrames,
    baseTone: emission.baseTone, toneColor: emission.toneColor,
    vignette: emission.vignette, forEachDynamicCell: emission.forEachDynamicCell,
    groundHex: scene.groundHex,
    levelSpan: Math.max(1e-6, maxTone - minTone),
  };
}
const STATES = { dark: null, paper: null };
const stateOf = (name) => (STATES[groundName(name)] ??= stateFor(name));
// The ACTIVE state: what the clock reads. The pixels read `bake.state`.
let state = stateOf(document.documentElement.dataset.ground);
const DITHER = 'bayer4';

// ---------------------------------------------------------------- the star mark
// SIZED IN CSS PIXELS OF THE CANVAS BOX — not in cells, and never in device px.
// The mark used to be `r = 0.62 | 0.90` viewBox units, and at 390 CSS px one unit
// is 0.743 px, so the cores printed at 0.92–1.34 px while `non-scaling-stroke`
// kept the links at a full 1 px: the links were thicker than half the points and
// brighter than all of them, and the figure read as a triangulated wireframe.
// Two floors, both in CSS px, are what make the points lead:
//   · a core is at least 2 px across (`smallMin`) and 2.4 (the one-in-three big
//     node) — above the 1280 values, so the two tiers keep their rhythm;
//   · a link is at most ~1 px and dim, so it can only ever be a hairline.
// Above the floor both scale with the canvas' CSS width, so the hierarchy is the
// same shape at every viewport instead of collapsing at the small ones. The DPR
// is deliberately absent: the box is CSS px, so a retina screen shows the same
// figure with twice the samples.
const STAR = {
  bigMin: 2.4, bigK: 0.0037,        // core diameter, CSS px: 2.40 at 390 … 4.35 at 1280
  smallMin: 2.0, smallK: 0.0027,    //                          2.00 at 390 … 3.17 at 1280
  // THE CORE FLOOR, IN RASTER CELLS (WU97). The sky is scaled by the browser at
  // a fractional factor (×0.743, ×1.225, ×1.487 — see the module header), so a
  // one-cell raster feature can fall between samples. A CORE must not: it is the
  // mark the figure is read by. One cell is the floor the decision promised, and
  // at every viewport the CSS floors above are larger than it (a cell is at most
  // 1.54 CSS px when a floor binds, and 1/0.0027 = 370 px of slope otherwise, so
  // the smallest possible ratio is 1.296), which is why this line changes no
  // pixel — it makes the invariant the function's job instead of a comment's.
  coreCells: 1,
  ringOfBig: 1.45,                  // ring diameter as a multiple of the big core
  ringStrokeMin: 0.7, ringStrokeK: 0.16,
  linkMin: 0.7, linkK: 0.00075,     // link stroke, CSS px:      0.70 at 390 … 0.88 at 1280
};
/** The whole star hierarchy for a canvas box `cssWidth` wide, in both the CSS px
 *  the brief measures and the viewBox units the circle attributes want. */
function starGeometry(cssWidth) {
  const unitsPerPx = 480 / Math.max(1, cssWidth);
  // one raster cell in CSS px: the canvas is 480 cells across its whole box
  const cellCss = 1 / unitsPerPx;
  const cellFloor = cellCss * STAR.coreCells;
  const bigPx = Math.max(STAR.bigMin, cellFloor, cssWidth * STAR.bigK);
  const smallPx = Math.max(STAR.smallMin, cellFloor, cssWidth * STAR.smallK);
  const ringPx = bigPx * STAR.ringOfBig;
  const ringStrokePx = Math.max(STAR.ringStrokeMin, bigPx * STAR.ringStrokeK);
  const linkPx = Math.max(STAR.linkMin, cssWidth * STAR.linkK);
  return {
    bigPx, smallPx, ringPx, ringStrokePx, linkPx, cellCss, cellFloor,
    // measured guarantee, for the readout: how many raster cells the smallest
    // core spans. It cannot be below 1 by construction; the readout reports it
    // so a future edit that breaks the invariant shows up on the page.
    smallCells: smallPx / cellCss,
    bigCells: bigPx / cellCss,
    bigR: (bigPx / 2) * unitsPerPx,
    smallR: (smallPx / 2) * unitsPerPx,
    // the ring's stroke is centred on `r`, so the OUTER diameter is 2r + stroke
    ringR: (Math.max(0.05, ringPx - ringStrokePx) / 2) * unitsPerPx,
  };
}

const canvas = document.querySelector('[data-sky]');
const ctx = canvas.getContext('2d', { alpha: false });
const svg = document.querySelector('[data-constellation]');
const stage = document.querySelector('.stage');
const frameOut = document.querySelector('[data-frame]');
const registerOut = document.querySelector('[data-register]');
const canvasOut = document.querySelector('[data-canvas]');
const scaleOut = document.querySelector('[data-scale]');
const dprOut = document.querySelector('[data-dpr]');
const cellOut = document.querySelector('[data-cell]');
const costOut = document.querySelector('[data-cost]');
const switchOut = document.querySelector('[data-switch]');
const tablesOut = document.querySelector('[data-tables]');
const starOut = document.querySelector('[data-star]');

// Vector layer, in cell units of the 480 × 300 frame (the SVG's viewBox).
const NS = 'http://www.w3.org/2000/svg';
for (const [[ax, ay], [bx, by]] of LINKS_PX) {
  const line = document.createElementNS(NS, 'line');
  line.setAttribute('x1', ax.toFixed(2)); line.setAttribute('y1', ay.toFixed(2));
  line.setAttribute('x2', bx.toFixed(2)); line.setAttribute('y2', by.toFixed(2));
  svg.appendChild(line);
}
// `r` and `stroke-width` are SET FROM THE BOX, not authored: see starGeometry.
// The two tiers survive (one node in three is the bigger star) but both of them
// are floored at 2 CSS px, so the smallest point on a 390 px screen still leads
// the hairline instead of tying with it.
const starMarks = [];
NODES_PX.forEach(([nx, ny], i) => {
  const big = i % 3 === 0;
  const core = document.createElementNS(NS, 'circle');
  core.setAttribute('class', 'core');
  core.setAttribute('cx', nx.toFixed(2)); core.setAttribute('cy', ny.toFixed(2));
  svg.appendChild(core);
  const ring = document.createElementNS(NS, 'circle');
  ring.setAttribute('class', 'ring');
  ring.setAttribute('cx', nx.toFixed(2)); ring.setAttribute('cy', ny.toFixed(2));
  svg.appendChild(ring);
  starMarks.push({ core, ring, big });
});

/** Size every mark for the box it is actually drawn in, and report the result.
 *  The link and ring strokes are CSS px because both carry
 *  `vector-effect: non-scaling-stroke`; the circles' `r` is in viewBox units, so
 *  it is divided by the same factor. Called from `rebuild()` — init and the
 *  debounced resize — so the hierarchy follows the box, not a guess about it. */
function applyStarGeometry() {
  const box = svg.getBoundingClientRect();
  const cssWidth = box.width || canvas.getBoundingClientRect().width || 480;
  const g = starGeometry(cssWidth);
  for (const { core, ring, big } of starMarks) {
    core.setAttribute('r', (big ? g.bigR : g.smallR).toFixed(3));
    ring.setAttribute('r', g.ringR.toFixed(3));
  }
  svg.style.setProperty('--link-w', `${g.linkPx.toFixed(2)}px`);
  svg.style.setProperty('--ring-w', `${g.ringStrokePx.toFixed(2)}px`);
  starOut.textContent = `núcleo ${g.smallPx.toFixed(2)}–${g.bigPx.toFixed(2)} px`
    + ` · anillo ${g.ringPx.toFixed(2)} px · enlace ${g.linkPx.toFixed(2)} px`;
  starOut.title = `medidas en px CSS de la caja (${cssWidth.toFixed(1)} px de ancho): `
    + `núcleo ${g.smallPx.toFixed(2)}/${g.bigPx.toFixed(2)} px, anillo ${g.ringPx.toFixed(2)} px `
    + `(trazo ${g.ringStrokePx.toFixed(2)} px), enlace ${g.linkPx.toFixed(2)} px; `
    + `núcleo:enlace ${(g.smallPx / g.linkPx).toFixed(2)}:1 (pequeño) y ${(g.bigPx / g.linkPx).toFixed(2)}:1 (grande)`
    + ` · celda de ráster ${g.cellCss.toFixed(3)} px CSS · núcleo ${g.smallCells.toFixed(2)}–${g.bigCells.toFixed(2)} celdas`
    + ` (suelo ${STAR.coreCells} celda: el núcleo nunca cae por debajo de una celda de ráster)`;
  return g;
}

// Registration, measured in the page: the canvas box and the overlay box must be
// the same rectangle, or every node is drawn off its glow.
function reportRegistration() {
  const a = canvas.getBoundingClientRect();
  const b = svg.getBoundingClientRect();
  const dx = Math.abs(a.left - b.left) + Math.abs(a.top - b.top);
  const dw = Math.abs(a.width - b.width) + Math.abs(a.height - b.height);
  registerOut.textContent = `registro Δ ${(dx + dw).toFixed(2)} px`;
  registerOut.title = `canvas ${a.width.toFixed(1)}×${a.height.toFixed(1)} · svg ${b.width.toFixed(1)}×${b.height.toFixed(1)}`;
}

// ---------------------------------------------------------------- the cell grid
// The engine's own selection, cell by cell: tone -> palette colour -> the level
// that colour carries -> dither step -> compensated ink. `renderFrame` does the
// same five lines; the page needs the per-cell TONE as well (not only the
// colour), because the dynamic layer is added to it before the vignette, so it
// walks the grid itself instead of paying for a second field pass.
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// Read off the TARGET state, never off the module: the bake and the draw of one
// frame both pass the state they are working with, so a switch mid-bake cannot
// mix one ground's palette with the other ground's range.
// `target.minTone` is the target's own palette extreme (see `stateFor`), never
// `metrics.minTone`: the engine that the repository commits does not carry that
// field, and a level computed against `undefined` is NaN on every cell.
const levelOf = (target, color) => clamp01(
  (luma(color[0], color[1], color[2]) - target.minTone) / target.levelSpan,
);
// THE PAPER GROUND IS ONE LEVEL AWAY, and it is the CONSUMER that pays it. The
// paper palette runs cream → ink with its ground on the LIGHT end, so the
// engine's normalised level (luma between the palette's two extremes) means the
// opposite of "more ink": used as-is, a cell asking for cream takes the top rung
// and prints ink, and the render comes out as the drawing's NEGATIVE (measured:
// 0.06% of the cells on step 0, the darkest printed tone 0.649 — the palette's
// own ink is 0.043). Inverting the level here — `level = 1 - levelOf(color)`, no
// engine option, no `groundMode` — prints cream ground and ink figure: step 0
// 36.24%, printed tone 0.229 … 0.908, mean 0.883 after the paper sky relief.
// The DARK ground keeps `levelOf` untouched, byte for byte: this is the only
// branch that differs.
//
// WHO OWNS THE PAPER INVERSION: THIS PAGE, and only this page. The inversion is
// not a property of the engine's field model — it is a property of ONE consumer
// that decided a paper palette should read cream-as-ground and ink-as-figure. A
// second one inside the engine (`renderFrame`'s `groundMode: 'light'`) would be
// the same decision made twice, in two places, with two chances to disagree: a
// caller that flipped the level on its own and also asked the engine to flip it
// would get the dark render back, silently, with no error. So the engine stays
// the tone model (palette range in, ramp step out) and the layer that reads the
// paper palette pays for the reading — here, in `levelFor`, at the two call
// sites that are the only places a level exists in this page. Do not add an
// engine-side ground mode; if a second page ever needs the paper reading, it
// imports this rule, it does not re-implement it next to the ladder.
const levelFor = (target, color) => (target.inverted ? 1 - levelOf(target, color) : levelOf(target, color));

let bake = null;
// A BAKE IN FLIGHT. Non-null from the moment a switch schedules its work until
// the finished bake replaces `bake`; while it is set the loop holds the new ground
// flat instead of painting the previous ground's sky under the new ink.
let job = null;
let frame = state.scene.posterFrame;
// The loop's phase in seconds is (now - started) / 1000, so `started` lives here
// with `frame`/`total`/`FPS`, at module scope: the frame index is DERIVED from
// elapsed time, never carried by the paint count, and every (re)start re-points
// this epoch (setClock) so resuming does not jump.
let started = 0;
let raf = 0;
let visible = true;
let costMean = 0;
let costFrames = 0;
// When the first frame actually landed on the canvas (0 until then), so the mark
// is written once and not once per still.
let firstFrameAt = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One finished cell per (ramp step, palette ink), drawn by the engine's own
 *  rasterize, so a patched cell is byte-identical to a baked one. */
function spriteTable(target, cell) {
  const { metrics, scene } = target;
  const table = [];
  for (let step = 0; step < metrics.coverage.length; step++) {
    const row = [];
    for (let ink = 0; ink < metrics.colors.length; ink++) {
      row.push(rasterize(
        { cols: 1, rows: 1, steps: Uint8Array.of(step), indices: Uint8Array.of(ink) },
        scene, cell,
      ));
    }
    table.push(row);
  }
  return table;
}

// --------------------------------------------------------------- the bake
// THE BAKE IS A JOB, NOT A CALL. It used to be one synchronous function: 435 ms
// for the first paper ground, 225 ms back to dark (measured on the click handler
// this replaces), and the click that asked for it could not paint until it
// returned. The same work is now an object whose expensive pass can be stopped
// and resumed between frames:
//
//   makeBake(state, box)   allocates and records what the box measured
//   bakeRows(job, budget)  fills the static grid row by row until the budget is
//                          spent, and returns true when the last row is in
//   finishBake(job)        the sprites, the raster and the ImageData
//
// Nothing in the job reads a module binding: it reads `job.state`, so a job can
// outlive the ground it was started for without mixing palettes. The slice is
// ~9 ms — one long-ish frame, not a quarter of a second — and the total CPU time
// is what the readout reports, so slicing cannot hide work.
const BAKE_SLICE_MS = 9;

function makeBake(target, cell) {
  const N = target.W * target.H;
  return {
    state: target,
    cell,
    width: target.W * cell,
    height: target.H * cell,
    base: new Float32Array(N),
    steps: new Uint8Array(N),
    indices: new Uint8Array(N),
    row: 0,
    work: 0,
    slices: 0,
    startedAt: performance.now(),
    paintedAt: 0,
  };
}

/** Fill the static grid one row at a time. `budgetMs` bounds one slice; the last
 *  row always completes, so a slice is only ever over budget by one row. */
function bakeRows(job, budgetMs) {
  const { state: s, base, steps, indices } = job;
  const { W, H } = s;
  const began = performance.now();
  while (job.row < H) {
    const y = job.row;
    for (let x = 0; x < W; x++) {
      const at = y * W + x;
      const tone = s.baseTone(x, y);
      base[at] = tone;
      const color = s.toneColor(tone * s.vignette(x, y));
      const step = stepFor(levelFor(s, color), x, y, DITHER);
      steps[at] = step;
      indices[at] = step === 0
        ? s.scene.ground
        : compensate(s.scene, color[0], color[1], color[2], step, s.metrics);
    }
    job.row++;
    if (performance.now() - began >= budgetMs) break;
  }
  job.work += performance.now() - began;
  job.slices++;
  return job.row >= H;
}

/** The finished bake: the sprites, the raster and the ImageData the loop patches.
 *  The static pixels are already correct for every cell the animation cannot
 *  reach, which is what keeps a dynamic frame at ~16 ms in the browser (measured
 *  at 1280×900, cell 2: 15.2 ms before this change, 15.3–16.3 ms after). */
function finishBake(job, report = true) {
  const s = job.state;
  const { cell, width, height, base, steps, indices } = job;
  const rgba = rasterize({ cols: s.W, rows: s.H, steps, indices }, s.scene, cell);
  const next = {
    state: s, cell, width, height,
    base, steps, indices,
    sprites: spriteTable(s, cell),
    staticPixels: new Uint8ClampedArray(rgba),
    out: new Uint8ClampedArray(rgba.length),
    image: null,
  };
  next.image = new ImageData(next.out, width, height);
  // THE STILL, WRAPPED WITHOUT A COPY: `stillImage` reads the very bytes
  // `rasterize` produced for the static layer, so the frame the page paints
  // before its lazy tables exist IS the bake and not a second rendering of it.
  // A Node re-computation of the same bake matches it cell for cell — see
  // `dist-motion-verify/wu98-lcp/`.
  next.stillImage = new ImageData(next.staticPixels, width, height);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  if (report) reportCell(next);
  return next;
}

/** The cell readout, printed from the bake that produced it. */
function reportCell(baked) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvasOut.textContent = `canvas ${baked.width} × ${baked.height} px`;
  // ONE CELL IS `cell` DEVICE PIXELS. cellPixelsFor divides the box's device
  // width by the column count and FLOORS, so the raster is an integer number of
  // device pixels per cell (never a fraction, never zero) and the DPR is read
  // from the window instead of assumed to be 1. The residual browser scale is
  // then one uniform factor, not a fractional cell — and `image-rendering:
  // pixelated` in the stylesheet keeps that factor from interpolating the dither
  // into grey. At a 390 px viewport and DPR 1 the box is 356.8 device px wide for
  // 480 columns: below one device pixel per cell BY GEOMETRY (356.8 / 480 =
  // 0.743), so the readout prints `celda 1` and `escala ×0.743` instead of
  // pretending the grid can be resolved there.
  scaleOut.textContent = `escala ×${(rect.width * dpr / baked.width).toFixed(3)}`;
  dprOut.textContent = `DPR ${dpr}`;
  cellOut.textContent = `celda ${baked.cell} px dispositivo`;
}

/** THE FIRST FRAME, WITHOUT THE LAZY TABLES. The static bake is the whole sky —
 *  band, nebulae, dust tiers 0–2, the isometric ring — and the vector layer
 *  (cores, rings, links) is already in the DOM above the canvas, so this frame is
 *  a legible still and not a placeholder. What it deliberately does NOT have is
 *  the dynamic layer: node halos, the twinkling tier, the two events and the
 *  trail, all of which are read out of tables the emission builds on first use.
 *  `stillImage` wraps the bake's own buffer, so nothing is rendered twice and no
 *  cell is half-written — the still equals the static bake byte for byte. */
function paintStill() {
  const total = bake.state.total - 1;
  ctx.putImageData(bake.stillImage, 0, 0);
  frameOut.textContent = `estático ${frame} / ${total}`;
  frameOut.title = `capa estática del marco ${frame}: cielo, polvo y anillo. `
    + 'Los halos, el titileo, los eventos y la estela esperan a sus tablas (ver «tablas»)';
  costOut.textContent = 'dinámico — (tablas en curso)';
  if (!firstFrameAt) {
    firstFrameAt = performance.now();
    performance.mark('hibrido:first-frame');
  }
}

/** Draw one frame: the baked static layers, then only the cells the animation
 *  can change. The static pixels are already correct for every other cell.
 *  EVERY emission binding is read off `bake.state` — the state the pixels were
 *  baked from — so a switch that happens mid-frame cannot paint one ground's sky
 *  with the other ground's palette. */
function draw() {
  const s = bake.state;
  // THE TRAIL CANNOT APPEAR BEFORE ITS TABLE EXISTS. The dynamic layer has no
  // half-built state a frame could be drawn from: the halo table, the twinkle
  // set and the 720-frame trail history are built whole or not at all, so this
  // guard — in the ONE function that puts dynamic ink on the canvas — is what
  // makes "the trail only appears when the tables exist" a property instead of
  // a hope. Until then the still is the frame.
  if (!tablesReady(s.ground)) { paintStill(); return; }
  // `began`, not `started`: the module owns an epoch by that name.
  const began = performance.now();
  const { cell, width, base, steps, indices, sprites, staticPixels, out, image } = bake;
  out.set(staticPixels);
  s.forEachDynamicCell(frame / s.FPS, (at, x, y, added) => {
    const color = s.toneColor((base[at] + added) * s.vignette(x, y));
    const step = stepFor(levelFor(s, color), x, y, DITHER);
    const ink = step === 0 ? s.scene.ground : compensate(s.scene, color[0], color[1], color[2], step, s.metrics);
    if (step === steps[at] && ink === indices[at]) return;   // the bake already says this
    const sprite = sprites[step][ink];
    const target = (y * cell * width + x * cell) * 4;
    for (let py = 0; py < cell; py++) {
      out.set(sprite.subarray(py * cell * 4, py * cell * 4 + cell * 4), target + py * width * 4);
    }
  });
  ctx.putImageData(image, 0, 0);
  frameOut.textContent = `frame ${frame} / ${s.total - 1}`;
  // Measured, not claimed: the last dynamic frame's own cost, and the mean in
  // the tooltip. At 60 fps the paint budget is 16.7 ms. This number is `draw()`
  // ONLY, and it always was — which is why a switch that cost 228 ms printed
  // 20 ms here. The title says so, and the bake is reported by `[data-switch]`.
  const spent = performance.now() - began;
  costMean += (spent - costMean) / (costFrames + 1);
  costFrames++;
  costOut.textContent = `dinámico ${spent.toFixed(1)} ms`;
  costOut.title = `media ${costMean.toFixed(1)} ms en ${costFrames} marcos · mide draw() SOLO: `
    + 'el bake de la capa estática no entra aquí, se reporta en «cambio»';
}

/** Point the epoch at the frame we are already on: (now - started) keeps
 *  describing the current frame, so a (re)start resumes in phase instead of
 *  snapping back to frame 0. */
function setClock() {
  started = performance.now() - (frame / state.FPS) * 1000;
}

/** Which frame the clock says we are on. Derived from SECONDS, never counted. */
function currentFrame(now = performance.now()) {
  return Math.floor(((now - started) / 1000) * state.FPS) % state.total;
}

/** Put the best frame the page can honestly paint on the canvas: the dynamic
 *  one when the tables exist, the static bake when they do not. Called where the
 *  canvas' contents become stale — a finished bake, a resize, and the moment a
 *  ground's tables land — so the reduced-motion still is repainted into the
 *  poster frame instead of staying a still forever. */
function repaint() {
  if (!bake) return;
  if (!tablesReady(bake.state.ground)) { paintStill(); return; }
  if (raf) frame = currentFrame();
  draw();
}

function tick(now) {
  if (!visible) { raf = 0; return; }
  raf = requestAnimationFrame(tick);
  // A ground bake in flight owns the canvas: the incoming ground is painted flat
  // on the frame the click scheduled, and drawing the PREVIOUS ground's bake over
  // it would show a dark sky under the new ground's ink for a quarter of a second.
  // The clock keeps running, so the loop resumes in phase instead of stuttering.
  if (job) return;
  // THE STILL IS ALREADY ON THE CANVAS. While the tables are missing there is
  // nothing new to paint, and re-putting the still every frame would burn the
  // frames the tables are being built in. The clock keeps running, so the loop
  // resumes in phase the moment the tables land.
  if (!tablesReady(bake.state.ground)) return;
  // The period is a property of SECONDS: which frame we should be on is read
  // from the clock, so a slower paint rate skips frames instead of stretching
  // the loop (a per-paint `frame + 1` behind a 1000 / FPS gate made the period a
  // function of the frame budget: 13.5 s at ~10.5 fps instead of 12 s).
  const target = currentFrame(now);
  if (target === frame) return;   // nothing new to paint: the clock has not moved us
  frame = target;
  draw();
}

function start() {
  if (raf || reduced) return;
  setClock();
  raf = requestAnimationFrame(tick);
}
function stop() {
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
}

function rebuild() {
  // A resize outruns a pending switch: the slices in flight were measured for the
  // old box, so the job is dropped and this pass takes over.
  job = null;
  const began = performance.now();
  const rect = canvas.getBoundingClientRect();
  const cell = cellPixelsFor(rect.width, window.devicePixelRatio || 1);
  applyStarGeometry();
  reportRegistration();
  // One synchronous pass: there is nothing painted yet (or the box just changed
  // and everything on screen is stale), so slicing would only delay the truth.
  const whole = makeBake(state, cell);
  bakeRows(whole, Infinity);   // the budget is Infinity: one call fills every row
  bake = finishBake(whole);
  // The sky is on the canvas NOW. If the tables for this ground are missing, this
  // is the still and `repaint()` will upgrade it the moment they land; if they
  // are warm (a resize, not a first load) this is the animated frame as before.
  repaint();
  costMean = 0;
  costFrames = 0;
  // The page reports this cost too: it is the most expensive thing it does, and
  // a readout that only ever printed `draw()` is exactly what let 228 ms of bake
  // print itself as 20 ms.
  const spent = performance.now() - began;
  switchOut.textContent = `capa ${spent.toFixed(1)} ms`;
  switchOut.title = `bake de la capa estática, sincrónico (carga y redimensionado): `
    + `${spent.toFixed(1)} ms en un solo bloque, ${whole.slices} pasada; sin cortes porque `
    + 'no hay un cuadro anterior que conservar. Es lo único que retrasa el primer cuadro: '
    + 'las tablas perezosas se construyen después, en reposo';
  return whole;
}

// Re-bake only after the resize has settled: the bake is the expensive part and
// a drag used to run it once per event.
let resizeTimer = 0;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(rebuild, 180);
});

// Nothing off screen should burn frames.
if (typeof IntersectionObserver === 'function') {
  new IntersectionObserver((entries) => {
    for (const entry of entries) visible = entry.isIntersecting;
    if (visible) start(); else stop();
  }, { threshold: 0.01 }).observe(stage);
}

// ---------------------------------------------------------------- the ground
// `data-ground` on <html> is the state; the two buttons are the control.
//
// A SWITCH IS TWO STEPS, AND THE CLICK ONLY DOES THE FIRST.
//   (a) the state — the attribute, the pressed control, and a flat fill of the
//       incoming ground on the very next frame — happens inside the handler, so
//       the click paints and the page never blocks on the field;
//   (b) the field — in ~9 ms slices, because the bake is palette- and
//       level-dependent and takes ~230 ms of CPU.
// The frame index is KEPT: both emissions run the same cadence (60 fps, 720
// frames), so the clock is already in phase and re-anchoring it would jump.
const groundButtons = [...document.querySelectorAll('button[data-ground]')];
let token = 0;

/** What the switch cost, ALL of it: the handler, the bake's CPU time and the sum.
 *  The title carries the wall clock to the finished frame, the moment the new
 *  ground first painted, and the state of the ground's lazy tables — so no line of
 *  this readout can be read as the whole story when it is only a part. */
function reportSwitch(cost) {
  const ms = (v) => v.toFixed(1);
  switchOut.textContent = `cambio ${ms(cost.handler)} + ${ms(cost.work)} = ${ms(cost.handler + cost.work)} ms`;
  switchOut.title = `handler ${ms(cost.handler)} ms (atributo, aria-pressed y programación) · `
    + `bake ${ms(cost.work)} ms de CPU en ${cost.slices} cortes de ~${BAKE_SLICE_MS} ms · `
    + `${ms(cost.wall)} ms de reloj hasta el cuadro completo · `
    + `primer cuadro del fondo nuevo ${ms(cost.paintedAt - cost.startedAt)} ms después del clic · `
    + `tablas perezosas (halo + estela): ${tablesSummary()}`;
}

/** The incoming ground under the vector layer, right now: one fillRect of the
 *  emission's own ground colour. No field is evaluated, so the frame the click
 *  scheduled paints. The figure is already in the new ink — the stylesheet's
 *  paper rules key off `data-ground`, which the handler set first. */
function paintGround(target) {
  ctx.fillStyle = target.groundHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** One frame of the bake. Frame 1 paints the ground; frames 2+ fill rows. */
function sliceBake(which) {
  if (!job || which !== job.token) return;
  if (!job.paintedAt) {
    job.paintedAt = performance.now();
    paintGround(job.state);
    requestAnimationFrame(() => sliceBake(which));
    return;
  }
  if (!bakeRows(job, BAKE_SLICE_MS)) {
    requestAnimationFrame(() => sliceBake(which));
    return;
  }
  const done = job;
  job = null;
  bake = finishBake(done);
  // The loop was holding the flat ground: put the right frame on the clock. If
  // the incoming ground's tables are not built yet this paints the still and the
  // table that finishes last repaints the frame — never a trail without a table.
  repaint();
  done.wall = performance.now() - done.startedAt;
  reportSwitch(done);
}

function useGround(mode) {
  const began = performance.now();
  const next = stateOf(mode);
  // (a) THE STATE FIRST: the attribute IS the state — the stylesheet's paper
  // rules key off it and a URL that ships `data-ground="paper"` must keep it —
  // and the control has to agree with it before anything expensive starts.
  document.documentElement.dataset.ground = next.ground;
  for (const button of groundButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.ground === next.ground));
  }
  if (next === state && !job) return;   // nothing to re-bake
  state = next;
  // (b) THE WORK SECOND, next frame: the fill now, the field in slices. If this
  // ground's lazy tables are still missing, the warm-up re-prioritises itself on
  // the next idle slice (see `pumpWarm`), so the frame is never denied longer
  // than one slice of the other ground's work.
  const rect = canvas.getBoundingClientRect();
  job = makeBake(next, cellPixelsFor(rect.width, window.devicePixelRatio || 1));
  job.token = ++token;
  job.handler = performance.now() - began;
  requestAnimationFrame(() => sliceBake(job.token));
  pumpWarm();
}
for (const button of groundButtons) {
  button.addEventListener('click', () => useGround(button.dataset.ground));
}

// --------------------------------------------------------- the lazy tables
// THE LAST THING THAT COULD STILL BLOCK A FIRST FRAME — and, before WU98, the
// thing that did. Each emission builds its node halo table and its 720-frame
// trail history on FIRST use, and the page used to reach both through the very
// first `draw()` inside module evaluation: measured 456.9 ms from module start to
// the first painted frame, ~220 ms of it these two tables (halo ~42 ms, trail
// ~178 ms) landing after the DOM was parsed and before anything was painted. The
// tables are pure functions of the emission, so they do not have to exist for the
// SKY to be on screen — and from WU98 they do not: the first frame is the static
// bake, and the tables are built afterwards, one per idle slice.
//
// THE SLICE IS THE MODULE'S UNIT, AND THAT IS THE WHOLE TRUTH. `haloTable()` and
// `trailTable()` are closure-private and monolithic — no caller can ask for half a
// table — so the finest slice the page can honestly take is ONE TABLE, three per
// ground:
//   halo   `nodeTone(0, 0, 0)`        the inverse-square halo index
//   trail  `trailTone(0, 0, 0)`       the 720-frame history canvas
//   cells  `forEachDynamicCell(0, …)` the twinkle set, the visit mark and the
//                                     first pass over ~50k cells
// Six slices, the ACTIVE ground first, because its tables are what the animation
// is waiting for. The residual ~178 ms trail slice is therefore the largest long
// task this change could not remove — it is reported on the page `[data-tables]`
// instead of being hidden, and it now runs after the first painted frame.
//
// IDLE FIRST, BUT NEVER STARVED. `requestIdleCallback` is the schedule that matters
// — the work runs in the time the browser says it has. Its `timeout` is the only
// bound on how long that can take, and it is NOT the 4000 ms a single warm-up task
// could afford: measured with 4000, this page's own rAF loop left the browser no
// idle period at all, every idle request fell through to its timeout, and the paper
// ground (six slices deep, one request each) reported warm at 12.7 s — worse than
// the 4.7 s the single old warm-up cost. 500 ms keeps idle first (a browser with
// idle time runs each slice in it) and bounds the whole chain to ~1.5 s of wall
// clock per ground instead of a timeout per slice.
const WARM_TIMEOUT_MS = 500;
const whenIdle = typeof requestIdleCallback === 'function'
  ? (fn) => requestIdleCallback(fn, { timeout: WARM_TIMEOUT_MS })
  : (fn) => setTimeout(fn, 300);
const WARM_STEPS = ['halo', 'trail', 'cells'];
const TABLES = {
  dark: { halo: null, trail: null, cells: null, spent: 0, ready: false },
  paper: { halo: null, trail: null, cells: null, spent: 0, ready: false },
};
/** Is this ground's dynamic layer drawable? The ONE question `draw()` asks before
 *  it puts any dynamic ink on the canvas — so "the trail appears only when the
 *  tables exist" is a guard, not an ordering that happens to hold. */
const tablesReady = (ground) => TABLES[groundName(ground)].ready;

/** One idle slice: ONE table, timed. The slice is not interruptible by design —
 *  it is the module's own unit of work — so the only honest thing to do with its
 *  cost is measure it and print it. */
function runWarmStep(ground, step) {
  const target = stateOf(ground);
  const began = performance.now();
  if (step === 'halo') target.emission.nodeTone(0, 0, 0);
  else if (step === 'trail') target.emission.trailTone(0, 0, 0);
  else target.forEachDynamicCell(0, () => {});
  const spent = performance.now() - began;
  const record = TABLES[target.ground];
  record[step] = spent;
  record.spent += spent;
  record.ready = WARM_STEPS.every((name) => record[name] !== null);
  if (record.ready) {
    performance.mark(`hibrido:tables:${target.ground}`);
    // The frame this ground is showing has been the still until now. Repaint it:
    // under reduced motion this is what turns the still into the poster frame,
    // and with motion on it is the frame the animation starts from.
    if (bake && bake.state.ground === target.ground) repaint();
  }
  reportTables();
  reportWarm();
  return spent;
}

let warming = false;
/** The next slice to run: the ACTIVE ground's missing tables first, then the
 *  other ground's. `bake.state.ground` and not `state.ground`, so a switch that
 *  is mid-bake claims its own ground as soon as the bake lands. */
function pumpWarm() {
  if (warming) return;
  const active = groundName(bake ? bake.state.ground : state.ground);
  for (const ground of [active, active === 'dark' ? 'paper' : 'dark']) {
    const step = WARM_STEPS.find((name) => TABLES[ground][name] === null);
    if (!step) continue;
    warming = true;
    whenIdle(() => {
      warming = false;
      runWarmStep(ground, step);
      pumpWarm();
    });
    return;
  }
  reportWarm();
}

/** The three slices of one ground, for the tooltips: measured ms, never a guess. */
function tablesSummary() {
  const ms = (v) => (v === null ? '—' : `${v.toFixed(1)} ms`);
  return ['dark', 'paper']
    .map((name) => {
      const r = TABLES[name];
      return `${name} ${r.ready ? 'listo' : 'pendiente'} (halo ${ms(r.halo)}, estela ${ms(r.trail)}, celdas ${ms(r.cells)})`;
    })
    .join(' · ');
}

/** The READINESS READOUT. It may not claim a state the pixels are not in: while a
 *  ground's tables are missing it says so, and `data-warm` on <html> — the signal
 *  a probe reads — stays `none` until the first ground is whole and `both` only
 *  when both are. */
function reportTables() {
  if (!tablesOut) return;
  const order = ['dark', 'paper'];
  const total = order.reduce((sum, name) => sum + TABLES[name].spent, 0);
  const ready = order.every((name) => TABLES[name].ready);
  if (ready) {
    tablesOut.textContent = `tablas ${total.toFixed(0)} ms en reposo`;
  } else {
    const parts = order.map((name) => `${name} ${WARM_STEPS.filter((s) => TABLES[name][s] !== null).length}/${WARM_STEPS.length}`);
    tablesOut.textContent = `tablas ${parts.join(' · ')}`;
  }
  tablesOut.title = 'Tablas perezosas del emisor, construidas una sola vez, en reposo: '
    + `${tablesSummary()} · mientras falten, el marco es el bake estático (sin halos, `
    + 'titileo, eventos ni estela) y la estela no puede aparecer';
}

let warmMarked = false;
function reportWarm() {
  const ready = ['dark', 'paper'].filter((name) => TABLES[name].ready);
  const html = document.documentElement;
  html.dataset.warm = ready.length === 2 ? 'both' : (ready[0] ?? 'none');
  if (ready.length === 2 && !warmMarked) {
    warmMarked = true;
    performance.mark('hibrido:warm');
  }
}

// First paint, synchronously, and WITHOUT the lazy tables: getBoundingClientRect
// forces the layout the bake needs, the bake paints the sky, and the vector layer
// is already in the DOM above it — so the first frame a visitor sees is a legible
// still instead of a black rectangle or a quarter-second of nothing.
// `data-warm="none"` is written BEFORE that paint: the page's readiness signal is
// never optimistic, not even for the few milliseconds the bake takes.
document.documentElement.dataset.warm = 'none';
rebuild();
useGround(state.ground);   // sync the buttons with the attribute the page was served with
reportTables();
if (!reduced) start();
pumpWarm();   // the tables, in idle slices, once the first frame is on screen
