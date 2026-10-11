/**
 * SHAPE CATALOGUE, RAMPS, DITHERS AND CELL GEOMETRY — WU17, the study surface.
 * ============================================================================
 * The user's decision after WU16: round dots look a little nicer, but squares
 * also look good and THERE MAY BE OTHER SHAPES; they want that investigated
 * properly, a way to test every option, and no design limited to dots. This
 * module is the catalogue. It is deliberately separate from `engine.mjs` so the
 * engine keeps one job (draw a scene) and this one keeps another (decide WHAT
 * mark a cell carries), and so every mask can be measured on its own.
 *
 * HOW A MASK'S SIZE IS DERIVED. No mask gets a guessed radius. The authored
 * ladder is the measured one from WU16 — `LADDER` below, one coverage per ramp
 * step — and each shape has a single scalar size that is SOLVED from it: a scan
 * followed by a bisection over the shape's own area function, at a reference
 * cell, until the mean coverage of the cell equals `LADDER[step]`. The solve is
 * the same for every shape, so "the square is the size that covers 0.8125" and
 * "the disc is the size that covers 0.8125" are answers to the same question,
 * not two calibrations. `maskDerivation()` states, in words, what is solved for
 * each shape; `maskSize()` returns the solved number.
 *
 * HOW A PIXEL'S COVERAGE IS COMPUTED: EXACTLY, as an area, never as a sample
 * count. Each pixel's coverage is the area of the shape inside that pixel —
 * polygon clipping for the polygonal masks, the closed-form circle/rectangle
 * area for the disc and the ring, closed quarter-disc areas for the rounded
 * square, and rectangle intersections for the cross and the glyph. Two things
 * follow, and both are measured by the checks rather than asserted:
 *
 *   - the ladder holds at every pitch, because the sum of the per-pixel areas is
 *     the shape's own area and does not depend on how the cell is divided into
 *     pixels. A sampled mask cannot do that: at 4 px per cell a symmetric square
 *     can only reach 0.4727 or 0.5166 of a cell, never the 0.4844 the ladder asks
 *     for, and that is a real limit of the sampled mask, not of the square.
 *   - the mask is identical in Node and in the browser without any sampling, so
 *     the hash equality between the two output paths is a property of the
 *     arithmetic, not of a tolerance.
 *
 * WHAT THE PIXEL VALUES ARE. Geometric masks are therefore anti-aliased inside
 * the shape's own edges (a pixel that the edge crosses gets a fractional area),
 * which is what keeps the tone ladder honest at small pitch. The one exception
 * is `grain`, which is coverage with no shape at all: it lays the ladder's
 * coverage down as a deterministic rank order over the cell's pixels. Hard-edged
 * pixel blocks are a RAMP (`block`), not a mask: that is the honest place where
 * the ladder quantises to whole pixels.
 *
 * WHAT IS NOT CLAIMED: that any of these looks better. This module exists so the
 * options can be compared and so the limits can be measured.
 */

/** The authored ladder: the measured WU16 dot ladder, one value per ramp step. */
export const LADDER = Object.freeze([0, 0.2344, 0.4844, 0.8125]);

/** Every mask this unit ships. `disc` and `glyph` are described below. */
export const SHAPES = Object.freeze(['disc', 'square', 'rounded', 'diamond', 'triangle', 'hexagon',
  'ring', 'cross', 'hatch', 'grain', 'glyph']);

/** Every dither mode: two ordered matrices, one blue-noise tile, and none. */
export const DITHER_MODES = Object.freeze(['bayer4', 'bayer8', 'blue', 'none']);

/** Every ramp: a solved shape-size ladder, hard pixel blocks, a glyph table. */
export const RAMP_MODES = Object.freeze(['shape', 'block', 'glyph']);

/** Every cell geometry: square (1:1) or character (1:2). */
export const CELL_GEOMETRIES = Object.freeze(['square', 'char']);

const SQRT3 = 1.7320508075688772;
const SQRT3_2 = 0.8660254037844386;

/** One cell in pixels for a geometry. `char` is the 1:2 character cell. */
export function cellSizeFor(geometry, cell) {
  return geometry === 'char' ? { w: cell, h: cell * 2 } : { w: cell, h: cell };
}

/** The mask a ramp actually draws, whatever mask was selected. */
export function effectiveShape(shape, ramp) {
  if (ramp === 'block') return 'square';
  if (ramp === 'glyph') return 'glyph';
  return shape;
}

// ---------------------------------------------------------------------------
// Exact circle areas (the same closed forms the engine's disc mask uses).
// ---------------------------------------------------------------------------

/** Area under the arc from 0 to x, for a radius r and 0 <= x <= r. */
export function arcArea(x, r) {
  return 0.5 * (x * Math.sqrt(Math.max(0, r * r - x * x)) + r * r * Math.asin(Math.min(1, x / r)));
}

/** Area of the disc inside {0 <= u <= x, 0 <= v <= y}, for x, y >= 0. */
export function quadrantArea(x, y, r) {
  if (x <= 0 || y <= 0) return 0;
  if (x >= r) return y >= r ? (Math.PI * r * r) / 4 : arcArea(y, r);
  if (y >= r) return arcArea(x, r);
  if (x * x + y * y <= r * r) return x * y;
  const u = Math.sqrt(r * r - y * y);
  return u * y + arcArea(x, r) - arcArea(u, r);
}

/** Area of a radius-`r` disc centred at the origin inside one axis-aligned rect. */
export function discAreaIn(x0, x1, y0, y1, r) {
  if (x1 <= 0) return discAreaIn(-x1, -x0, y0, y1, r);
  if (x0 < 0) return discAreaIn(0, x1, y0, y1, r) + discAreaIn(0, -x0, y0, y1, r);
  if (y1 <= 0) return discAreaIn(x0, x1, -y1, -y0, r);
  if (y0 < 0) return discAreaIn(x0, x1, 0, y1, r) + discAreaIn(x0, x1, 0, -y0, r);
  return quadrantArea(x1, y1, r) - quadrantArea(x0, y1, r) - quadrantArea(x1, y0, r)
    + quadrantArea(x0, y0, r);
}

/** The same, for a disc centred anywhere. */
export function discAreaInRect(cx, cy, r, x0, y0, x1, y1) {
  return discAreaIn(x0 - cx, x1 - cx, y0 - cy, y1 - cy, r);
}

/**
 * The area of a quarter disc anchored at (cx, cy), in the outward direction
 * (sx, sy), inside one pixel. Used for the rounded square's corners: the change
 * of variable (dx = (u - cx) * sx) has determinant 1, so it preserves area.
 */
function quarterDiscAreaInRect(cx, cy, r, sx, sy, x0, y0, x1, y1) {
  const clamp = (value) => (value < 0 ? 0 : value > r ? r : value);
  // The change of variable mirrors the axis when sx or sy is negative, so the
  // two interval ends are sorted rather than assumed.
  const ax0 = clamp((x0 - cx) * sx);
  const ax1 = clamp((x1 - cx) * sx);
  const ay0 = clamp((y0 - cy) * sy);
  const ay1 = clamp((y1 - cy) * sy);
  const ax = Math.min(ax0, ax1);
  const bx = Math.max(ax0, ax1);
  const ay = Math.min(ay0, ay1);
  const by = Math.max(ay0, ay1);
  return quadrantArea(bx, by, r) - quadrantArea(ax, by, r) - quadrantArea(bx, ay, r)
    + quadrantArea(ax, ay, r);
}

// ---------------------------------------------------------------------------
// Exact polygon areas (Sutherland-Hodgman clipping against the pixel).
// ---------------------------------------------------------------------------

/** Clip a polygon by the half-plane a*x + b*y <= c. */
function clipHalfPlane(polygon, a, b, c) {
  const out = [];
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    const d1 = a * x1 + b * y1 - c;
    const d2 = a * x2 + b * y2 - c;
    if (d1 <= 0) out.push([x1, y1]);
    if ((d1 < 0 && d2 > 0) || (d1 > 0 && d2 < 0)) {
      const t = d1 / (d1 - d2);
      out.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]);
    }
  }
  return out;
}

function polygonArea(polygon) {
  let doubled = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    doubled += x1 * y2 - x2 * y1;
  }
  return Math.abs(doubled) / 2;
}

/** The area of a convex polygon inside one axis-aligned pixel. */
function polygonAreaInRect(polygon, x0, y0, x1, y1) {
  let out = clipHalfPlane(polygon, 1, 0, x1);
  if (out.length < 3) return 0;
  out = clipHalfPlane(out, -1, 0, -x0);
  if (out.length < 3) return 0;
  out = clipHalfPlane(out, 0, 1, y1);
  if (out.length < 3) return 0;
  out = clipHalfPlane(out, 0, -1, -y0);
  if (out.length < 3) return 0;
  return polygonArea(out);
}

/** The area of an axis-aligned rectangle inside one pixel. */
function rectAreaInRect(ax0, ay0, ax1, ay1, x0, y0, x1, y1) {
  const w = Math.max(0, Math.min(ax1, x1) - Math.max(ax0, x0));
  const h = Math.max(0, Math.min(ay1, y1) - Math.max(ay0, y0));
  return w * h;
}

// ---------------------------------------------------------------------------
// The glyph table. `glyph` reuses the adopted atlas path — one finished cell per
// (mask, step, ink) is built once and copied per cell — and its footprint is a
// small bitmap of the ramp's dot glyphs, kept here as rows of '.' and '#'. The
// three bitmaps carry exactly 15, 31 and 52 of the 64 cells, so at 8 px per cell
// the glyph mode holds the ladder with hard pixels; at any other pitch its
// footprint is still solved from the ladder like every other mask.
// ---------------------------------------------------------------------------
const GLYPH_BITMAPS = Object.freeze([
  Object.freeze([]),
  Object.freeze(['........', '........', '..####..', '..####..', '..####..', '..###...', '........', '........']),
  Object.freeze(['........', '..####..', '.######.', '.######.', '.######.', '.#####..', '..####..', '........']),
  Object.freeze(['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..']),
]);

/** The bitmap footprint of one glyph step as axis-aligned boxes in bitmap units. */
const GLYPH_RECTS = GLYPH_BITMAPS.map((rows) => {
  const rects = [];
  for (let y = 0; y < rows.length; y++) {
    let start = -1;
    for (let x = 0; x <= rows[y].length; x++) {
      const inked = x < rows[y].length && rows[y][x] === '#';
      if (inked && start < 0) start = x;
      if (!inked && start >= 0) {
        rects.push({ x0: start, x1: x, y0: y, y1: y + 1 });
        start = -1;
      }
    }
  }
  return rects;
});

const GLYPH_SPAN = 8;

/** The area of one glyph footprint, scaled by `s`, inside one pixel. */
function glyphAreaInRect(step, s, x0, y0, x1, y1) {
  let area = 0;
  for (const rect of GLYPH_RECTS[step] ?? []) {
    const ax0 = (rect.x0 / GLYPH_SPAN - 0.5) * s;
    const ax1 = (rect.x1 / GLYPH_SPAN - 0.5) * s;
    const ay0 = (rect.y0 / GLYPH_SPAN - 0.5) * s;
    const ay1 = (rect.y1 / GLYPH_SPAN - 0.5) * s;
    area += rectAreaInRect(ax0, ay0, ax1, ay1, x0, y0, x1, y1);
  }
  return area;
}

// ---------------------------------------------------------------------------
// The masks, as exact areas.
// ---------------------------------------------------------------------------

const ROUNDED_CORNER = 0.34;

/** Area of one mask at size `s` inside one pixel at (x0,y0)-(x1,y1) cell units. */
function areaInPixel(shape, step, s, x0, y0, x1, y1) {
  switch (shape) {
    case 'disc': return discAreaInRect(0, 0, s, x0, y0, x1, y1);
    case 'square': return rectAreaInRect(-s, -s, s, s, x0, y0, x1, y1);
    case 'rounded': {
      const r = ROUNDED_CORNER * s;
      const inner = s - r;
      // The plus-shaped body plus four corner quarter discs, all disjoint.
      let area = rectAreaInRect(-s, -inner, s, inner, x0, y0, x1, y1)
        + rectAreaInRect(-inner, -s, inner, s, x0, y0, x1, y1)
        - rectAreaInRect(-inner, -inner, inner, inner, x0, y0, x1, y1);
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          area += quarterDiscAreaInRect(sx * inner, sy * inner, r, sx, sy, x0, y0, x1, y1);
        }
      }
      return area;
    }
    case 'diamond':
      return polygonAreaInRect([[0, -s], [s, 0], [0, s], [-s, 0]], x0, y0, x1, y1);
    case 'triangle':
      return polygonAreaInRect([[0, -s], [s, s], [-s, s]], x0, y0, x1, y1);
    case 'hexagon':
      return polygonAreaInRect([[0, -s], [SQRT3_2 * s, -s / 2], [SQRT3_2 * s, s / 2], [0, s],
        [-SQRT3_2 * s, s / 2], [-SQRT3_2 * s, -s / 2]], x0, y0, x1, y1);
    case 'ring': {
      const inner = 0.3 * s;
      return discAreaInRect(0, 0, s, x0, y0, x1, y1) - discAreaInRect(0, 0, inner, x0, y0, x1, y1);
    }
    case 'cross': {
      const t = 0.42 * s;
      return rectAreaInRect(-t, -s, t, s, x0, y0, x1, y1)
        + rectAreaInRect(-s, -t, s, t, x0, y0, x1, y1)
        - rectAreaInRect(-t, -t, t, t, x0, y0, x1, y1);
    }
    case 'hatch': {
      // 45-degree stripes: {frac((u - v) / P) < duty}, clipped to the pixel.
      let area = 0;
      const min = x0 - y1;
      const max = x1 - y0;
      for (let k = Math.floor(min / HATCH_PERIOD); k <= Math.floor(max / HATCH_PERIOD) + 1; k++) {
        const lo = k * HATCH_PERIOD;
        const hi = lo + s * HATCH_PERIOD;
        let out = clipHalfPlane([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 1, -1, hi);
        if (out.length < 3) continue;
        out = clipHalfPlane(out, -1, 1, -lo);
        if (out.length < 3) continue;
        area += polygonArea(out);
      }
      return area;
    }
    case 'glyph': return glyphAreaInRect(step, s, x0, y0, x1, y1);
    default: return 0;
  }
}

const HATCH_PERIOD = 0.5;

/** Mean coverage of one `w` x `h` cell by the shape at size `s`. */
export function coverageOf(shape, step, w, h, s) {
  const cellH = h / w;
  const pixelArea = cellH / (w * h);
  let total = 0;
  for (let py = 0; py < h; py++) {
    const y0 = ((py / h) - 0.5) * cellH;
    const y1 = (((py + 1) / h) - 0.5) * cellH;
    for (let px = 0; px < w; px++) {
      const x0 = px / w - 0.5;
      const x1 = (px + 1) / w - 0.5;
      let area = areaInPixel(shape, step, s, x0, y0, x1, y1);
      if (area < 0) area = 0;
      else if (area > pixelArea) area = pixelArea;
      total += area;
    }
  }
  return total / cellH;
}

const REFERENCE_CELL = 8;
const SCAN_STEPS = 160;
// The scan must reach a size large enough for the tallest geometry: on a 1:2
// character cell the glyph footprint has to grow to about 1.42 to carry the same
// ladder rung, so the limit is well above it.
const SCAN_LIMIT = 3;
const sizeCache = new Map();

/**
 * The size, in cell units, that makes a cell of `geometry` lay down `coverage`.
 * A coarse scan finds the FIRST crossing (the ring's coverage is not monotone —
 * its hole grows — so a bare bisection is not enough), then a bisection refines
 * inside that bracket and returns the smallest size that reaches the rung.
 */
export function solveSize(shape, geometry, step, coverage = LADDER[step]) {
  if (!(coverage > 0)) return 0;
  if (shape === 'grain') return coverage; // no shape: the ladder IS the answer
  const key = `${shape}|${geometry}|${coverage}`;
  const cached = sizeCache.get(key);
  if (cached !== undefined) return cached;
  const box = cellSizeFor(geometry, REFERENCE_CELL);
  let lo = 0;
  let hi = -1;
  let previous = 0;
  for (let i = 1; i <= SCAN_STEPS; i++) {
    const size = (i / SCAN_STEPS) * SCAN_LIMIT;
    if (coverageOf(shape, step, box.w, box.h, size) >= coverage) {
      lo = previous;
      hi = size;
      break;
    }
    previous = size;
  }
  if (hi < 0) {
    lo = 0;
    hi = SCAN_LIMIT;
  }
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (coverageOf(shape, step, box.w, box.h, mid) >= coverage) hi = mid;
    else lo = mid;
  }
  sizeCache.set(key, hi);
  return hi;
}

/** The stated derivation of each shape's size, for the docs and the checks. */
const DERIVATIONS = Object.freeze({
  disc: 'the disc radius is solved by bisection so the exact area of the disc clipped to a cell equals the ladder coverage',
  square: 'the square half-extent is solved by bisection so the exact area of the square clipped to a cell equals the ladder coverage (a square that grows past the cell is clipped, which is what a cell mask is)',
  rounded: 'the half-extent is solved by bisection with the corner radius fixed at 0.34 of it, so the exact area of the rounded square equals the ladder coverage',
  diamond: 'the half-diagonal is solved by bisection so the exact clipped area of the diamond equals the ladder coverage',
  triangle: 'the half-height of the isosceles triangle is solved by bisection so its exact clipped area equals the ladder coverage',
  hexagon: 'the circumradius of the pointy-top hexagon (a vertex up and one down) is solved by bisection so its exact clipped area equals the ladder coverage',
  ring: 'the outer radius is solved by bisection with the hole fixed at 0.30 of it (a ring cannot cover more than 1 - 0.30^2 of a cell), so the exact ring area equals the ladder coverage',
  cross: 'the arm half-length is solved by bisection with the arm half-thickness fixed at 0.42 of it, so the exact clipped area of the plus equals the ladder coverage',
  hatch: 'the 45-degree line duty cycle is solved by bisection so the exact striped area inside a cell equals the ladder coverage',
  grain: 'no size is solved: the ladder coverage is laid down as a deterministic rank order over the cell pixels, coverage only',
  glyph: 'the glyph bitmap footprint is scaled by bisection so the exact inked area inside a cell equals the ladder coverage',
});

/** The stated derivation of one mask, in words (docs and checks read this). */
export function maskDerivation(shape) {
  return DERIVATIONS[shape] ?? 'unknown mask';
}

const grainCache = new Map();

/** Our own 32-bit mix, used only to order the grain and seed the blue tile. */
function mix32(a) {
  let x = a | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** The deterministic rank order of a cell's pixels, for `grain`. */
function grainOrder(w, h) {
  const key = `${w}x${h}`;
  const cached = grainCache.get(key);
  if (cached) return cached;
  const order = [...Array(w * h).keys()]
    .sort((a, b) => mix32(a * 2654435761 + h) - mix32(b * 2654435761 + h) || a - b);
  grainCache.set(key, order);
  return order;
}

/**
 * One finished cell mask: `w` x `h` coverage values in [0, 1], the cell's share
 * of the ladder rung. `ramp` decides whether the edges follow the shape exactly
 * (shape ramp) or snap to whole pixels (block ramp); `step` is the ramp step.
 */
export function buildMask(shape, step, w, h, ramp = 'shape', geometry = 'square') {
  const effective = effectiveShape(shape, ramp);
  const target = LADDER[step];
  const mask = new Float64Array(w * h);
  if (!(target > 0)) return mask;
  if (effective === 'grain') {
    // Coverage only: the ladder's coverage is spread over the cell as a rank
    // order, so there is no shape to measure a corner or an axis on.
    const wanted = target * w * h;
    const order = grainOrder(w, h);
    for (let rank = 0; rank < order.length; rank++) {
      mask[order[rank]] = Math.max(0, Math.min(1, wanted - rank));
    }
    return mask;
  }
  const size = solveSize(effective, geometry, step, target);
  const cellH = h / w;
  const pixelArea = cellH / (w * h);
  for (let py = 0; py < h; py++) {
    const y0 = ((py / h) - 0.5) * cellH;
    const y1 = (((py + 1) / h) - 0.5) * cellH;
    for (let px = 0; px < w; px++) {
      const x0 = px / w - 0.5;
      const x1 = (px + 1) / w - 0.5;
      let area = areaInPixel(effective, step, size, x0, y0, x1, y1);
      if (ramp === 'block') area = area >= pixelArea / 2 ? pixelArea : 0;
      if (area < 0) area = 0;
      else if (area > pixelArea) area = pixelArea;
      // The coverage of one pixel: its share of the cell, which is what the
      // sprite atlas blends toward the palette ink.
      mask[py * w + px] = area / pixelArea;
    }
  }
  return mask;
}

// ---------------------------------------------------------------------------
// DITHER. Ordered Bayer 4x4 and 8x8, one blue-noise tile, and none. The
// published part is the ordered matrix construction (Bayer, 1973); the blue
// tile is ours: void-and-cluster on a 16x16 torus with an INTEGER tent kernel,
// so it contains no transcendental function and cannot drift between the Node
// and browser paths.
// ---------------------------------------------------------------------------

/** The canonical ordered matrix, built by the published recursive construction. */
function bayerMatrix(size) {
  let matrix = [[0]];
  while (matrix.length < size) {
    const span = matrix.length;
    const next = Array.from({ length: span * 2 }, () => new Array(span * 2));
    for (let y = 0; y < span; y++) {
      for (let x = 0; x < span; x++) {
        next[y][x] = 4 * matrix[y][x];
        next[y][x + span] = 4 * matrix[y][x] + 2;
        next[y + span][x] = 4 * matrix[y][x] + 3;
        next[y + span][x + span] = 4 * matrix[y][x] + 1;
      }
    }
    matrix = next;
  }
  return matrix.flat();
}

/** Published standard material: the canonical ordered-dither matrix (Bayer, 1973). */
export const BAYER4 = Object.freeze(bayerMatrix(4));
const BAYER8 = Object.freeze(bayerMatrix(8));

const BLUE_SIZE = 16;
const BLUE_TILE_SIZE = BLUE_SIZE * BLUE_SIZE;
const BLUE_RADIUS = 2;
let BLUE_TILE;
let BLUE_RANKS;

/** Integer tent weights over a wrapped neighbourhood: no exp, no division. */
function blueKernel() {
  const kernel = [];
  for (let dy = -BLUE_RADIUS; dy <= BLUE_RADIUS; dy++) {
    for (let dx = -BLUE_RADIUS; dx <= BLUE_RADIUS; dx++) {
      const weight = Math.max(0, 3 - Math.abs(dx)) * Math.max(0, 3 - Math.abs(dy));
      if (weight > 0) kernel.push({ dx, dy, weight });
    }
  }
  return kernel;
}

/**
 * A blue-noise threshold tile: void-and-cluster relaxation on a 16x16 torus,
 * then a rank order built by repeatedly removing the tightest cluster and
 * filling the largest void. Deterministic (integer weights, our own hash for
 * the seed pattern), so the tile is identical in Node and in the browser.
 */
function blueTile() {
  if (BLUE_TILE) return BLUE_TILE;
  const kernel = blueKernel();
  const grid = new Uint8Array(BLUE_TILE_SIZE);
  const energy = new Float64Array(BLUE_TILE_SIZE);
  const at = (x, y) => ((y + BLUE_SIZE) % BLUE_SIZE) * BLUE_SIZE + ((x + BLUE_SIZE) % BLUE_SIZE);
  const bump = (index, sign) => {
    const x = index % BLUE_SIZE;
    const y = (index / BLUE_SIZE) | 0;
    for (const k of kernel) energy[at(x + k.dx, y + k.dy)] += sign * k.weight;
  };
  const seeded = [...Array(BLUE_TILE_SIZE).keys()]
    .sort((a, b) => mix32(a * 0x9d + 17) - mix32(b * 0x9d + 17) || a - b);
  for (let i = 0; i < BLUE_TILE_SIZE / 2; i++) {
    grid[seeded[i]] = 1;
    bump(seeded[i], 1);
  }
  const tightest = () => {
    let index = -1;
    let best = -Infinity;
    for (let i = 0; i < BLUE_TILE_SIZE; i++) if (grid[i] && energy[i] > best) { best = energy[i]; index = i; }
    return index;
  };
  const largestVoid = () => {
    let index = -1;
    let best = Infinity;
    for (let i = 0; i < BLUE_TILE_SIZE; i++) if (!grid[i] && energy[i] < best) { best = energy[i]; index = i; }
    return index;
  };
  for (let pass = 0; pass < 12; pass++) {
    const cluster = tightest();
    grid[cluster] = 0;
    bump(cluster, -1);
    const gap = largestVoid();
    grid[gap] = 1;
    bump(gap, 1);
  }
  const ranks = new Int32Array(BLUE_TILE_SIZE);
  for (let rank = BLUE_TILE_SIZE - 1; rank >= BLUE_TILE_SIZE / 2; rank--) {
    const cluster = tightest();
    grid[cluster] = 0;
    bump(cluster, -1);
    ranks[cluster] = rank;
  }
  for (let rank = BLUE_TILE_SIZE / 2 - 1; rank >= 0; rank--) {
    const gap = largestVoid();
    grid[gap] = 1;
    bump(gap, 1);
    ranks[gap] = rank;
  }
  BLUE_RANKS = ranks;
  BLUE_TILE = new Float64Array(BLUE_TILE_SIZE);
  for (let i = 0; i < BLUE_TILE_SIZE; i++) BLUE_TILE[i] = (ranks[i] + 0.5) / BLUE_TILE_SIZE;
  return BLUE_TILE;
}

/** The rank order of the blue tile, for the checker's aperiodicity evidence. */
export function blueRanks() {
  blueTile();
  return BLUE_RANKS;
}

/**
 * The dither threshold for one cell: where a level between two ladder rungs is
 * spent. `none` returns 0.5 everywhere, which rounds instead of dithering.
 */
export function ditherThreshold(mode, x, y) {
  switch (mode) {
    case 'bayer8': return (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
    case 'blue': return blueTile()[((y & 15) * 16 + (x & 15))];
    case 'none': return 0.5;
    default: return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  }
}
