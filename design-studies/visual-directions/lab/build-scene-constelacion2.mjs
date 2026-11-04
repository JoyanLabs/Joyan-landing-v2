/**
 * Constellation v2 — high resolution, brightness-driven, with events.
 *
 * Why a second version: at 240×150 the stars were bokeh and the links vanished.
 * Here the grid is 480 × 300 (144.000 cells), so a star can be ONE cell and a
 * link can be a one-cell dotted hairline.
 *
 * Layers, in the order they are evaluated:
 *   1 sky       one sky group — base gradient, milky band, two nebulae, two
 *               clusters — summed at its authored weight and amplified once by
 *               SKY_GAIN (see the comment on that constant: without it the whole
 *               sky sat under the first dither rung)
 *   2 dust      three brightness tiers of fixed stars, seeded (thousands); the
 *               brightest tier twinkles
 *   3 nodes     ONE STAR PER CLUSTER, not one per vertex. The drawing's 65
 *               vertices are decimated to stars at least 6 cells apart, so the
 *               halos no longer sum into a white mass; the surviving vertex
 *               keeps the drawing's silhouette and the rings stay closed.
 *   4 event     one shooting star per loop, with the measured comet tail, and a
 *               slow wandering light that carries a decaying trail
 *
 * THE ISOMETRIC FLOOR IS GONE. A lit rhombus used to sit under the figure and it
 * read as a TABLE beneath the sky instead of as sky. The cells it used to touch,
 * counted here: 26,503 cells inside the rhombus (18.40 % of the frame), a
 * 3,708-cell rim band (2.58 %), 28,383 cells in all (19.71 %). Nothing replaces
 * it — the sky in those cells is now only sky, and the figure floats.
 *
 * THE LOOP IS CONTINUOUS. Every animated term is a 2π-periodic function of
 * p = t/T with a per-element phase: the node breathing and the twinkle count
 * integer cycles per loop, the wandering light rides a closed path, and the two
 * rare events sit inside an explicit rise → hold → fall envelope that is exactly
 * zero at both ends. Nothing is switched on between two frames, so frame 143 →
 * frame 0 is one ordinary step and not a cut.
 *
 * THE LINK LAYER IS GONE FROM THE FIELD. It was 65 box tests per cell (~9.4 M
 * comparisons a frame) and zeroing its reach moved 0.22 % of the cells: the
 * constellation's hairline is drawn by the page's vector layer, so the field
 * stopped paying for a copy of it.
 *
 * THE FIELD IS SPLIT FOR ANIMATION. `baseTone` is the static sky (sky and dust
 * tiers 0–2); `dynamicTone` is everything that moves (node breathing, the
 * twinkling dust tier, the shooting star, the wandering light and its trail);
 * `field` is their sum, so the bake path and the live page evaluate the same
 * numbers. The page bakes the static layer once and then touches only the
 * dynamic cells (≈58k of 144k), which is what takes a frame from ~240 ms to
 * ~13 ms.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { IMAGE_PALETTES } from '../../../scripts/scene-src/image-pipeline.mjs';
import { hexToRgb, luma } from '../../../scripts/scene-src/engine.mjs';

const SRC = '/home/joshrm/Descargas/blade-runner-unicorn-line.svg';
const DIR = new URL('.', import.meta.url).pathname;

const svg = await readFile(SRC, 'utf8');
const polys = [...svg.matchAll(/<polygon[^>]*points="([^"]+)"/g)].map((m) =>
  m[1].trim().split(/\s+/).map((p) => p.split(',').map(Number)));
const all = polys.flat();
const cx0 = all.reduce((s, [x]) => s + x, 0) / all.length;
const cy0 = all.reduce((s, [, y]) => s + y, 0) / all.length;

// JD-A-001 / JD-A-004 fix: keep the drawing's OWN vertices and edges (the
// reduction dropped the torso and left six disconnected pieces), and map them
// with ONE scale for both axes into the 480x300 frame so nothing is stretched.
const uniq = new Map();
for (const poly of polys) for (const [x, y] of poly) uniq.set(`${Math.round(x)},${Math.round(y)}`, [x, y]);
const verts = [...uniq.values()];
const vertIndex = new Map([...uniq.keys()].map((key, i) => [key, i]));

const W_PX = 480, H_PX = 300;
const PAD = 0.80;
const scale = (Math.min(W_PX, H_PX) * PAD) / 1000;   // same scale on both axes
const toPx = ([x, y]) => [W_PX / 2 + (x - 500) * scale, H_PX / 2 + (y - 500) * scale];
const toNorm = (px) => [Number((px[0] / W_PX).toFixed(4)), Number((px[1] / H_PX).toFixed(4))];
const pxVerts = verts.map(toPx);

/**
 * The node decimation. 65 vertices of one drawing cannot be 65 stars: at 1.40
 * cells apart their halos sum, and the review measured 24 of 65 centres over
 * tone 1 (12 merged blobs, largest 48 cells) — the figure read as a white mass.
 *
 * A vertex survives only when it is at least `minSep` cells from every survivor.
 * The order is farthest-point (seed: the vertex farthest from the centroid; then
 * always the vertex farthest from all survivors), which keeps the hull and the
 * limbs instead of thinning one side. Each dropped vertex merges into its NEAREST
 * survivor, and the drawing's polygons are re-expressed through those survivors,
 * so the rings still close and the silhouette survives the decimation.
 */
const MERGE_CELLS = 6;
function decimate(points, minSep) {
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const n = points.length;
  const cx = points.reduce((s, p) => s + p[0], 0) / n;
  const cy = points.reduce((s, p) => s + p[1], 0) / n;
  let seed = 0, best = -1;
  points.forEach((p, i) => { const d = d2(p, [cx, cy]); if (d > best) { best = d; seed = i; } });
  const keep = [seed];
  const alive = new Array(n).fill(true);
  alive[seed] = false;
  const nearest = points.map((p) => d2(p, points[seed]));
  for (;;) {
    let pick = -1, far = -1;
    for (let i = 0; i < n; i++) if (alive[i] && nearest[i] > far) { far = nearest[i]; pick = i; }
    if (pick < 0 || Math.sqrt(far) < minSep) break;
    keep.push(pick);
    alive[pick] = false;
    for (let i = 0; i < n; i++) if (alive[i]) nearest[i] = Math.min(nearest[i], d2(points[i], points[pick]));
  }
  const rep = points.map((p) => {
    let at = keep[0], dist = Infinity;
    for (const k of keep) { const d = d2(p, points[k]); if (d < dist) { dist = d; at = k; } }
    return at;
  });
  return { keep, rep };
}

const { keep, rep } = decimate(pxVerts, MERGE_CELLS);
const NODES_PX = keep.map((i) => pxVerts[i]);
const nodeOfVert = new Map(keep.map((vi, ni) => [vi, ni]));
const repNode = rep.map((vi) => nodeOfVert.get(vi));

// The drawing's polygons, re-expressed through the surviving vertices: a ring
// that lost a vertex closes through the survivor that absorbed it, and an edge
// that collapsed to a point disappears instead of doubling back.
const RINGS = [];
for (const poly of polys) {
  const seq = poly.map(([x, y]) => repNode[vertIndex.get(`${Math.round(x)},${Math.round(y)}`)]);
  const ring = [];
  for (const node of seq) if (ring[ring.length - 1] !== node) ring.push(node);
  if (ring.length > 1 && ring[0] === ring[ring.length - 1]) ring.pop();
  if (ring.length) RINGS.push(ring);
}
const LINKS_PX = [];
const seenEdge = new Set();
for (const ring of RINGS) {
  if (ring.length < 2) continue;
  const edges = ring.length === 2
    ? [[ring[0], ring[1]]]
    : ring.map((a, i) => [a, ring[(i + 1) % ring.length]]);
  for (const [a, b] of edges) {
    if (a === b) continue;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seenEdge.has(key)) continue;
    seenEdge.add(key);
    LINKS_PX.push([NODES_PX[a], NODES_PX[b]]);
  }
}
const NODES = NODES_PX.map(toNorm);
const LINKS = LINKS_PX.map(([a, c]) => [toNorm(a), toNorm(c)]);

/**
 * The figure's bounding box in CELLS, from the nodes themselves — the region the
 * paper emission's sky is turned down inside (see PAPER_RELIEF). Measured, not
 * authored: a change to the drawing moves the box with it. The floor/ceil keep
 * it on whole cells; the pad and the feather are added at the call site.
 */
const FIG_BOX = (() => {
  const xs = NODES_PX.map(([x]) => x);
  const ys = NODES_PX.map(([, y]) => y);
  return [
    Math.floor(Math.min(...xs)), Math.floor(Math.min(...ys)),
    Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...ys)),
  ];
})();

// The paper emission's sky relief, as three integers and a factor. `pad` widens
// the box so the torso's own edges are inside it; `feather` is the width of the
// ramp OUTSIDE the padded box, in cells, over which the sky returns to its full
// amplitude. 30 cells of smoothstep is under a fifth of the band's 0.11 reach and
// well under one nebula's 0.20 bell, so the ramp cannot be located by eye; `gain`
// is the fraction of the sky group's amplitude removed inside the box.
const PAPER_RELIEF = { pad: 16, feather: 30, gain: 0.45 };

// ---------------------------------------------------------------- emissions
/**
 * TWO EMISSIONS, ONE GENERATOR, ONE FIELD.
 *
 * The dark scene is the original. The paper scene exists because the visual
 * system runs two grounds — "el oscuro emite, el papel absorbe" (see
 * docs/PLAN-SISTEMA-VISUAL.md) — and a ground is a PALETTE, not a second scene:
 * the sky, the dust, the nodes, the events and the timing are the same numbers
 * in both files, and only the ladder of colours changes. Keeping both behind
 * ONE template is what makes that true by construction instead of by claim: a
 * change to the field reaches both files or neither.
 *
 * The paper palette is not re-typed here. It is read from the pipeline's own
 * registry (`IMAGE_PALETTES`, id `paper`, cream → ink, ground 0) so there is one
 * definition of "paper" in the repository, and the scene declares it VERBATIM.
 *
 * The generator is deterministic: no clock, no random, no Map iteration order
 * that depends on the input beyond the SVG it reads, so running it twice returns
 * the same bytes for both files.
 */
const DARK_STOPS = [
  '#060B0D', '#0A1114', '#10191C', '#183039', '#244C5B', '#346E7B',
  '#4D9199', '#73B7B0', '#94CCBB', '#A8D3BA', '#D5E5CF', '#EAF3E6',
];

const PAPER_PRESET = IMAGE_PALETTES.find((entry) => entry.id === 'paper');
if (!PAPER_PRESET) throw new Error('image-pipeline.mjs no longer exports a palette with id `paper`');

// The dark scene's calibration note, verbatim: the field is calibrated once, and
// the paper emission inherits those numbers instead of inventing its own.
const DARK_CALIBRATION = `// CALIBRATION, measured and not guessed (JD-A-002). The engine normalises the
// field against the palette's own range and the first dither rung sits at level
// 0.234, while this palette's darkest stop is only Δluma 0.022 above its ground.
// The sky is therefore summed once at its authored weight and then amplified by
// SKY_GAIN, which multiplies the whole sky group (base, band, nebulae and
// clusters) and nothing else: dust, nodes and the events keep their own
// amplitude so a star still reads brighter than the cloud it sits in.
// Two numbers were settled by measurement, not taste: the base sky carries only
// half its old weight so the band, the nebulae and the clusters stand one or two
// ramp steps above the empty sky, and SKY_GAIN is the value that puts 64.9% of
// frame 8 on step 0 (the accepted band is 55–70%, against 89.2% before).
// WU78a removed the isometric floor, and that is what moved the number: the floor
// was the brightest large area in the field, so handing its 28,383 cells back to
// the sky took frame 8 from 60.7% to 64.9%. A full 720-frame sweep of THIS field
// measures 63.76% (frame 331) to 64.95% (frame 54) — 63.8 and 65.0 at one
// decimal — still inside the band. The cadence is 60 fps (720 frames, 12.0 s), so
// the sweep has five times the sample times it had at 12 fps and the range is
// therefore a little wider; the field itself is a function of t and did not
// change. SKY_GAIN was NOT re-tuned: the shift is the removed floor, not
// calibration.
`;

// The paper emission's note says the two things the numbers below it cannot:
// where the palette comes from, and what the same ladder MEANS on a ground that
// is the palette's lightest tone instead of its darkest. Every figure here was
// measured at t = 0.667 s (frame 40 at 60 fps) of THIS file — reproduced with
// `node dist-motion-verify/wu90/check-cadence.mjs`.
const PAPER_CALIBRATION = `// CALIBRATION. The field is the dark scene's field — SKY_GAIN, NODE_GAIN, the tail
// gain, the nodes, the events and the timing are the same values, so the 64.9%
// frame-8 measurement documented in scene-constelacion2.mjs applies here too —
// with ONE deliberate difference, skyRelief: the sky group is turned down behind
// the figure in this emission only (see the constant below). Everything that
// follows was measured AFTER that relief, at t = 0.667 s (frame 40 at 60 fps) of
// THIS file, with \`node dist-motion-verify/wu93-pagina/measure-tone.mjs\`.
// The paper palette also changes what a step MEANS.
// The dark palette runs darkest → lightest and its ground is its DARKEST tone, so
// the engine's level (the cell's luma normalised between the palette's two
// extremes) grows with the ink a cell asks for. The paper palette runs
// cream → ink and its ground IS its LIGHTEST tone, so the same normalised level
// reads the other way round: a cell that asks for cream takes the top rung and a
// cell that asks for ink takes step 0, which is the cream ground. Measured with
// the ladder used as-is and no groundMode, as decided: at frame 40 it puts 0.02%
// of the cells on step 0 (the dark scene: 64.92%), the darkest tone this render
// PRINTS is 0.649 — the palette's own ink is 0.043 — and the mean printed tone is
// 0.821. In one line: the sky is inked a pale tan and the constellation comes out
// as cream holes, i.e. the NEGATIVE of the drawing. The ink end is not merely
// unreached here, it is unreachable through this ladder: any step above 0 needs a
// request of at least 0.246 luma, and sweeping the request across 0…1 the darkest
// tone this palette can print is 0.68.
// AN ABSORBING GROUND IS ONE LEVEL AWAY: level = 1 - the normalised luma (what
// the engine's groundMode 'light' computes). That inversion belongs to the
// CONSUMER, not to this field: the engine reads the step AND the ink index from
// the colour this field returns, so a field cannot invert one and leave the
// other — measured at the same frame 40, on the page's own split path: step 0 =
// 36.24%, printed tone 0.229 … 0.908, mean 0.883: ink on cream. (Before the sky
// relief the same path measured step 0 = 26.57% and mean 0.863: the relief gives
// 9.67 points of the frame back to the cream, and the ink range is untouched.)
// A full 720-frame sweep holds 35.29% (frame 332) to 36.35% (frame 473), and the
// darkest tone printed anywhere in the loop is still 0.229. The page applies
// exactly that inversion, and only for this emission.
`;

const PAPER_LADDER_NOTE = `// The palette the pipeline exports as \`paper\` (image-pipeline.mjs,
// IMAGE_PALETTES id 'paper'), VERBATIM: cream first, ink last, ground 0 = cream.
// No value is edited here and the order is not reversed.\n`;

const VARIANTS = [
  {
    file: 'scene-constelacion2.mjs',
    id: 'lab-constelacion2',
    label: 'constelación v2 — 480 × 300',
    staticLabel: 'constelación v2 — capa estática',
    stops: [...DARK_STOPS],
    ground: 0,
    groundHex: DARK_STOPS[0],
    headerNote: '',
    calibrationNote: DARK_CALIBRATION,
    ladderNote: '',
    reliefDecl: '',
    reliefCall: '',
  },
  {
    file: 'scene-constelacion2-papel.mjs',
    id: 'lab-constelacion2-papel',
    label: 'constelación v2 — papel — 480 × 300',
    staticLabel: 'constelación v2 — papel — capa estática',
    stops: [...PAPER_PRESET.palette],
    ground: PAPER_PRESET.ground,
    groundHex: PAPER_PRESET.palette[PAPER_PRESET.ground].toUpperCase(),
    headerNote: '// PAPER emission. Same field, same nodes, same events, same timing as\n'
      + '// scene-constelacion2.mjs; the differences are deliberate and there are two:\n'
      + '// the ladder of colours (the pipeline `paper` palette, cream → ink) and the\n'
      + '// sky relief behind the figure (skyRelief, below), which exists only here.\n'
      + '// The module surface is identical on purpose, so a consumer swaps one import\n'
      + '// and nothing else.\n',
    calibrationNote: PAPER_CALIBRATION,
    ladderNote: PAPER_LADDER_NOTE,
    reliefDecl: paperReliefDecl(),
    reliefCall: '\n  // The sky group, turned down behind the figure: this emission only, so the\n'
      + '  // band cannot print an ink diagonal across the torso. Sky only — the dust,\n'
      + '  // the nodes and the events keep their amplitude, or the field would empty.\n'
      + '  sky *= skyRelief(x, y);\n',
  },
];

/** The paper emission's relief: its note, its constants and its one function. */
function paperReliefDecl() {
  // The constants line up on one comment column, like every other block here.
  const field = (key, value, note) => `  ${`${key}: ${value},`.padEnd(26)}// ${note}\n`;
  return `// THE SKY BEHIND THE FIGURE IS TURNED DOWN — this emission only, and never the\n`
    + `// dark one. On paper the sky group PRINTS: the palette runs cream → ink, so a\n`
    + `// brighter cell (the band, the nebulae, the clusters) is a cell that asks for\n`
    + `// more ink, and the diagonal band printed as a dark diagonal straight through\n`
    + `// the torso and the head. The figure's own bounding box, from NODES_PX, now\n`
    + `// carries a broad, low-frequency reduction of that group's amplitude, feathered\n`
    + `// over ${PAPER_RELIEF.feather} cells OUTSIDE the padded box with a smoothstep: the factor and its\n`
    + `// first derivative are continuous across the whole ramp, so there is no edge to\n`
    + `// find. It multiplies the SKY and nothing else — the base wash, the band, both\n`
    + `// nebulae and both clusters — because dimming the dust or the nodes would empty\n`
    + `// the field instead of quietening it. The dark emission has neither this\n`
    + `// constant nor this function: its sky is byte-identical to what it was.\n`
    + `const RELIEF = {\n`
    + field('box', `[${FIG_BOX.join(', ')}]`, "the constellation's bounding box, in cells")
    + field('pad', PAPER_RELIEF.pad, 'cells added around it before the ramp starts')
    + field('feather', PAPER_RELIEF.feather, 'cells of ramp outside the padded box')
    + field('gain', PAPER_RELIEF.gain.toFixed(2), "of the sky group's amplitude, at full depth")
    + `};\n`
    + `function skyRelief(x, y) {\n`
    + `  const d = Math.max(\n`
    + `    RELIEF.box[0] - RELIEF.pad - x, x - (RELIEF.box[2] + RELIEF.pad),\n`
    + `    RELIEF.box[1] - RELIEF.pad - y, y - (RELIEF.box[3] + RELIEF.pad),\n`
    + `  );   // L-infinity distance to the padded box: <= 0 inside, positive outside\n`
    + `  const t = Math.min(1, Math.max(0, 1 - d / RELIEF.feather));\n`
    + `  return 1 - RELIEF.gain * t * t * (3 - 2 * t);   // smoothstep: no edge, no corner\n`
    + `}\n\n`;
}

/** The palette as a source literal, six stops a line — the file's own layout. */
function stopsLiteral(stops) {
  const lines = [];
  for (let i = 0; i < stops.length; i += 6) {
    lines.push('  ' + stops.slice(i, i + 6).map((hex) => `'${hex}'`).join(', ') + ',');
  }
  return `[\n${lines.join('\n')}\n]`;
}

// Every palette-derived number the emitted file documents is computed here from
// the palette itself, so a note cannot drift from the values it describes.
for (const variant of VARIANTS) {
  const tones = variant.stops.map((hex) => luma(...hexToRgb(hex)));
  const span = Math.max(...tones) - Math.min(...tones);
  variant.stopsLiteral = stopsLiteral(variant.stops);
  // The engine normalises the field against the palette's extremes and puts the
  // first dither rung at level 0.234 (MEASURED_COVERAGE[1] / the top rung).
  variant.rungTone = (0.234 * span).toFixed(2);
  variant.spanText = span.toFixed(2);
}

/** One scene module, as source. The same template for both emissions. */
function sceneSource(v) {
  return `/** GENERATED by build-scene-constelacion2.mjs — do not edit by hand. */
${v.headerNote}const W = 480, H = 300, FPS = 60, CYCLE = 720, SECONDS = CYCLE / FPS;
${v.calibrationNote}export const SKY_GAIN = 3.4;
// Node halo and event tails are additive in the same tone space, so their gains
// are the measured amplitudes of the library they come from, scaled to this
// palette's range rather than to 0..1. The halo amplitude is kept low on
// purpose: the drawing's vertices sit as close as 1.40 cells apart, and a louder
// skirt sums them into one blob. NODE_GAIN is the value at which NO cell of any
// frame of the loop reaches tone 1: the peak halo is 0.87 and the stars are at
// least 6 cells apart, where the old 0.20 reached 2.28 at 1.40 cells.
export const NODE_GAIN = 0.13;
const TAIL_GAIN = 0.55;
${v.ladderNote}
const STOPS = ${v.stopsLiteral}.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));

export const NODES = ${JSON.stringify(NODES)};
export const NODES_PX = ${JSON.stringify(NODES_PX)};
export const LINKS = ${JSON.stringify(LINKS)};
export const LINKS_PX = ${JSON.stringify(LINKS_PX)};
// The drawing's polygons as indices into NODES, after the merge: every
// consecutive pair (and the last back to the first) is a link, so a checker can
// prove the shape is still closed instead of trusting the link list.
export const RINGS = ${JSON.stringify(RINGS)};

// The shooting star of the loop, in unit space, plus its direction of travel as
// a UNIT vector in CELL space (the frame is 480×300 cells, so the direction has
// to be derived from the cell-space delta or the tail leans off-axis).
const EVENT = (() => {
  const from = [0.06, 0.10], to = [0.98, 0.44];
  const dx = (to[0] - from[0]) * W, dy = (to[1] - from[1]) * H;
  const len = Math.hypot(dx, dy) || 1;
  return { from, to, s0: 0.42, s1: 0.50, dir: [dx / len, dy / len] };
})();

// THE EASED ENVELOPE of a rare event. The old test was 'p > s0 && p < s1', so the
// whole streak appeared and disappeared between two frames: a cut at both ends of
// the event and, worse, a second cut where the loop wraps. A rare event now rides
// rise → hold → fall: EASE of its own window is spent ramping up with a smoothstep
// and the same fraction ramping down, and the envelope is EXACTLY zero at q = 0
// and q = 1 (smoothstep(0) = 0), so the first and last visible frames carry a
// fraction of the amplitude instead of all of it.
const EASE = 0.22;
function eventEnvelope(q) {
  if (q <= 0 || q >= 1) return 0;
  const edge = Math.min(1, Math.min(q, 1 - q) / EASE);
  return edge * edge * (3 - 2 * edge);
}

// Event 2 · the wandering light. It is the one thing the viewer asked to keep, so
// it stays a small light that drifts slowly. What it cannot stay is a straight
// crossing: that path ran u = 0.15 → 0.85 and teleported back at the wrap. It now
// rides a CLOSED path — two sine terms per axis, each with its own phase, every
// one at an INTEGER number of cycles per loop — so position and velocity are both
// 2π-periodic in p and the seam is gone. The sum of the terms keeps the speed
// where it was: at most 5.0 cells/frame horizontally and 1.9 vertically, against
// 2.3 cells/frame for the old straight ramp.
const WANDER = { u: [0.50, 0.18, 0.90, 0.030, 2.10], v: [0.58, 0.11, 2.40, 0.018, 0.60] };
function wanderAt(p) {
  const a = Math.PI * 2 * p;
  return [
    WANDER.u[0] + WANDER.u[1] * Math.sin(a + WANDER.u[2]) + WANDER.u[3] * Math.sin(2 * a + WANDER.u[4]),
    WANDER.v[0] + WANDER.v[1] * Math.sin(a + WANDER.v[2]) + WANDER.v[3] * Math.sin(2 * a + WANDER.v[4]),
  ];
}

function toneColor(tone) {
  const s = Math.min(0.999, Math.max(0, tone)) * (STOPS.length - 1);
  const i = Math.floor(s), f = s - i;
  const a = STOPS[i], b = STOPS[Math.min(STOPS.length - 1, i + 1)];
  return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * f);
}
const frac = (v) => v - Math.floor(v);
const bell = (d, s) => Math.exp(-(d * d) / (2 * s * s));
const hash = (x, y) => frac(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (a, b) => hash(a, b);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (s(xi, yi) * (1 - u) + s(xi + 1, yi) * u) * (1 - v) + (s(xi, yi + 1) * (1 - u) + s(xi + 1, yi + 1) * u) * v;
};
/** Three octaves: enough structure to read as cloud, cheap enough per cell. */
const fbm = (x, y) => 0.55 * vnoise(x, y) + 0.28 * vnoise(x * 2.1, y * 2.1) + 0.17 * vnoise(x * 4.3, y * 4.3);

/** Three fixed tiers of sky stars: the density is what was missing. */
const DUST = [0, 0.028, 0.075, 0.20];
function dustTier(x, y) {
  const h = hash(x, y);
  if (h > 0.9975) return 3;             // 0.25%: bright pinpoints (these twinkle)
  if (h > 0.988) return 2;              // 1.2%: mid dust
  if (h > 0.965) return 1;              // 2.3%: faint field
  return 0;
}

// ---------------------------------------------------------------- the static
// layer: sky group + dust tiers 0–2. Time never enters here, so the page can
// bake it once and keep it.
${v.reliefDecl}export function baseTone(x, y) {
  const u = x / W, v = y / H;

  // The sky group, summed at its authored weight. SKY_GAIN is applied ONCE, to
  // the sum, so the band and the nebulae keep their relative weight instead of
  // each being amplified on its own.
  let sky = 0.006 + 0.010 * (1 - v);

  // 2a · milky band: a diagonal river of dust, structured, not a flat gradient.
  const bandD = Math.abs((u * 0.55 + v * 0.83) - 0.62) / 0.11;
  if (bandD < 1) {
    const cloud = fbm(u * 9, v * 9);
    sky += 0.075 * (1 - bandD) * (0.35 + 0.9 * cloud);
    if (cloud > 0.62) sky += 0.035 * (1 - bandD);   // brighter knots inside the river
  }
  // 2b · two nebulae, wide and faint, so the sky has weather.
  sky += 0.085 * bell(Math.hypot(u - 0.30, v - 0.30), 0.20) * (0.4 + 0.8 * fbm(u * 4 + 3, v * 4));
  sky += 0.070 * bell(Math.hypot(u - 0.72, v - 0.62), 0.24) * (0.4 + 0.8 * fbm(u * 4 + 11, v * 4 + 7));

  // 2c · two distant clusters: small, dense, off the figure so they read as sky.
  for (const [kx, ky, kr] of [[0.16, 0.72, 0.035], [0.84, 0.22, 0.030]]) {
    const d = Math.hypot(u - kx, v - ky);
    if (d < kr) sky += 0.10 * Math.pow(1 - d / kr, 2) * (0.5 + 0.5 * fbm(u * 60, v * 60));
  }

  // THE FLOOR IS GONE. This is where the isometric rhombus used to lift the sky
  // (+0.045 tone inside it, up to +0.045 again on a soft rim). It touched 26,503
  // cells inside (18.40 %) and 3,708 on the rim (2.58 %), 28,383 cells in all
  // (19.71 %), and at SKY_GAIN it read as a table top laid under the stars. Those
  // cells now carry the sky and nothing else.
${v.reliefCall}
  let tone = sky * SKY_GAIN;
  const tier = dustTier(x, y);
  if (tier !== 3) tone += DUST[tier];   // tier 3 is the twinkling layer (dynamic)
  return tone;
}

// vignette: the frame closes at the edges, like looking through something.
// Multiplicative and per cell, so the live path can apply it after adding the
// dynamic layer without changing the result.
export function vignette(x, y) {
  const u = x / W, v = y / H;
  const r = Math.hypot(u - 0.5, (v - 0.5) * 0.9);
  return 1 - 0.45 * Math.max(0, (r - 0.42) / 0.5);
}

export function staticColor(x, y) {
  return toneColor(baseTone(x, y) * vignette(x, y));
}

// --------------------------------------------------------------- the dynamic
// layer: the twinkling dust tier, the nodes' breathing halo and both events.

export function twinkleTone(x, y, t) {
  if (dustTier(x, y) !== 3) return 0;
  // per-star brightness and phase, twinkle 1..4 rad/s (comet.js:74) — snapped to
  // the loop: an INTEGER number of cycles per loop (2..5, i.e. 6.0 s .. 2.4 s),
  // with the per-star phase kept. A non-integer rate, the old 't * (1 + b0 * 3)',
  // is not periodic in t/T and was one of the two terms that made the wrap a cut.
  const b0 = hash(x + 3, y + 7);
  const ph = hash(x + 11, y + 5) * Math.PI * 2;
  const cycles = 2 + Math.floor(b0 * 4);
  const tw = 0.5 + 0.5 * Math.sin(Math.PI * 2 * cycles * (t / SECONDS) + ph);
  return tw > 0.25 ? DUST[3] * (0.35 + 0.9 * tw) : 0;
}

// Per-node breathing, one sine per node per frame (never one per cell).
export function nodeBrightness(i, t) {
  return 0.55 + 0.45 * Math.sin((t / SECONDS + i * 0.11) * Math.PI * 2);
}
let brightAt = NaN;
const BRIGHT = new Float64Array(NODES.length);
function brightness(t) {
  if (t === brightAt) return BRIGHT;
  for (let i = 0; i < NODES.length; i++) BRIGHT[i] = nodeBrightness(i, t);
  brightAt = t;
  return BRIGHT;
}

// The halo is the library's INVERSE-SQUARE one (binary-stars.js:59-63), not a
// gaussian bell:  I = 16 / (d² + 4) + 7 / (d² + 3),  d in CELLS. Precomputed
// once per cell within the 32-cell reach, WITHOUT the time term, so a frame
// multiplies each term by that node's brightness instead of re-measuring 65
// distances per cell. The distance expression is the field's own, so the table
// and the analytic halo are the same number, not two approximations.
const HALO_REACH = 32;
let halo = null;
function haloTable() {
  if (halo) return halo;
  const index = new Int32Array(W * H).fill(-1);
  const byCell = new Map();
  for (let i = 0; i < NODES.length; i++) {
    const nx = NODES[i][0], ny = NODES[i][1];
    const weight = NODE_GAIN * (i % 3 === 0 ? 1 : 0.62);
    const x0 = Math.max(0, Math.floor(nx * W - HALO_REACH));
    const x1 = Math.min(W - 1, Math.ceil(nx * W + HALO_REACH));
    const y0 = Math.max(0, Math.floor(ny * H - HALO_REACH));
    const y1 = Math.min(H - 1, Math.ceil(ny * H + HALO_REACH));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dxc = (x / W - nx) * W, dyc = (y / H - ny) * H;
        const d2 = dxc * dxc + dyc * dyc;
        if (d2 > 1024) continue;                       // beyond 32 cells: nothing left to add
        const cell = y * W + x;
        const amount = weight * (16 / (d2 + 4) + 7 / (d2 + 3));
        const list = byCell.get(cell);
        if (list) list.push(i, amount); else byCell.set(cell, [i, amount]);
      }
    }
  }
  const cells = [...byCell.keys()].sort((a, b) => a - b);
  const counts = new Int32Array(cells.length + 1);
  let terms = 0;
  for (let k = 0; k < cells.length; k++) { counts[k] = terms; terms += byCell.get(cells[k]).length / 2; }
  counts[cells.length] = terms;
  const termNode = new Uint8Array(terms);
  const termAmount = new Float64Array(terms);
  for (let k = 0; k < cells.length; k++) {
    const list = byCell.get(cells[k]);
    index[cells[k]] = k;
    for (let j = 0; j < list.length; j += 2) {
      termNode[counts[k] + j / 2] = list[j];
      termAmount[counts[k] + j / 2] = list[j + 1];
    }
  }
  halo = { index, cells: Int32Array.from(cells), counts, termNode, termAmount };
  return halo;
}

export function nodeTone(x, y, t) {
  const table = haloTable();
  const k = table.index[y * W + x];
  if (k < 0) return 0;
  const b = brightness(t);
  let sum = 0;
  for (let j = table.counts[k]; j < table.counts[k + 1]; j++) sum += table.termAmount[j] * b[table.termNode[j]];
  return sum;
}

// Event 1 · a shooting star: crosses once, fast, with a fading tail.
// The tail is the MEASURED one (comet.js:84-92), evaluated at the cell itself
// instead of by walking 60 guessed samples: s is the distance along the
// direction of travel, p the distance across it, both in cells, and
//   falloff exp(-s/42), widening 1.8 + 0.26·s, curvature -0.006·s².
// The head also carries the library's coma, exp(-r/3.2)·1.8.
// A tail box keeps the live loop off the 144k cells the streak cannot reach:
// past s = 160 the streak is under 0.02 tone (a tenth of a dither rung) and its
// across reach is bounded by 2.5·w, so the box cannot clip a visible cell.
const TAIL_S = 160, TAIL_P = 40, COMA_R = 16, BLINK_R = 8;
function tailBox(hx, hy) {
  const px = -EVENT.dir[1], py = EVENT.dir[0];
  const tx = hx - EVENT.dir[0] * TAIL_S, ty = hy - EVENT.dir[1] * TAIL_S;
  const xs = [hx, tx, hx + px * TAIL_P, hx - px * TAIL_P, tx + px * TAIL_P, tx - px * TAIL_P];
  const ys = [hy, ty, hy + py * TAIL_P, hy - py * TAIL_P, ty + py * TAIL_P, ty - py * TAIL_P];
  return [
    Math.min(...xs) - COMA_R, Math.max(...xs) + COMA_R,
    Math.min(...ys) - COMA_R, Math.max(...ys) + COMA_R,
  ];
}
function inside(box, x, y) {
  return x >= box[0] && x <= box[1] && y >= box[2] && y <= box[3];
}

// ---------------------------------- event 2's trail — a portable history canvas
// The trail is a HISTORY CANVAS, not a smear recomputed along the path: a Float32
// buffer at cell resolution over the path's bounding box that holds what past
// frames stamped into it, with
//
//   · dt-based decay — 'value *= exp(-dt / tau)' applied once per frame, so the
//     fade is the same number of SECONDS at any fps (tau = 0.70 s, 42 frames at
//     60 fps). It is not a per-frame constant: dt comes from the frame rate.
//   · a frame-difference gate — the head's footprint is rasterised every frame,
//     but a cell is stamped only the FIRST time the footprint reaches it, i.e.
//     only the cells whose cover changed this frame. Everything behind the head
//     is never re-stamped, it can only decay, so a frame pays for the leading
//     edge of a 5-cell disc and not for the trail.
//   · a cheap blur — separable 3x3 (1,2,1)/4, two 3-tap passes, no gaussian.
//
// Deterministic and pure from the outside: the buffer is warmed up for
// TRAIL.warmup extra loops (the decay makes it converge) and then all 720 frames
// are snapshotted as Uint8 planes, so trailTone(x, y, t) is a function of t
// ALONE — the same frame always renders the same bytes, which is what lets the
// split live path and the one-pass renderer keep agreeing.
const TRAIL = {
  tau: 0.70,          // seconds — the decay constant (dt-based, not per-frame)
  radius: 5,          // cells — the head footprint
  gain: 0.38,         // tone stamped at the head's centre (clears rung 1)
  scale: 255 / 0.75,  // Uint8 plane scale: 0.75 tone is full scale
  warmup: 2,          // extra loops before the first recorded one
};

function trailRegion() {
  let minU = 1, maxU = 0, minV = 1, maxV = 0;
  for (let f = 0; f < CYCLE; f++) {
    const at = wanderAt(f / CYCLE);
    if (at[0] < minU) minU = at[0];
    if (at[0] > maxU) maxU = at[0];
    if (at[1] < minV) minV = at[1];
    if (at[1] > maxV) maxV = at[1];
  }
  const pad = TRAIL.radius + 3;
  const x0 = Math.max(0, Math.floor(minU * W) - pad);
  const x1 = Math.min(W - 1, Math.ceil(maxU * W) + pad);
  const y0 = Math.max(0, Math.floor(minV * H) - pad);
  const y1 = Math.min(H - 1, Math.ceil(maxV * H) + pad);
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const cycleFrame = (t) => ((Math.round(t * FPS) % CYCLE) + CYCLE) % CYCLE;

// The tone the first dither rung asks for on this palette: the engine normalises
// the field against the palette's extremes and puts rung 1 at level 0.234, so a
// cell needs 0.234 * (maxTone - minTone) of tone before any ink appears. That is
// the threshold a trail is measured against when the question is what is SEEN.
const RUNG_TONE = ${v.rungTone};

let trailCache = null;
function trailTable() {
  if (trailCache) return trailCache;
  const region = trailRegion();
  const n = region.w * region.h;
  const hist = new Float32Array(n);   // the state: what was stamped, decayed
  const line = new Float32Array(n);   // horizontal pass of the cheap blur
  const planes = new Array(CYCLE);    // the read: blurred, quantised
  const offs = new Array(CYCLE);      // the cells worth visiting, per frame
  const stamps = new Int32Array(CYCLE);   // cells the gate actually let through
  const skipped = new Int32Array(CYCLE);  // frames whose head did not change cell
  const decay = Math.exp(-(1 / FPS) / TRAIL.tau);   // dt = one frame
  const max2 = TRAIL.radius * TRAIL.radius;
  const footprint = Math.round(Math.PI * max2);   // cells one stamp can touch
  let prevCell = -1;
  for (let k = 0; k < (TRAIL.warmup + 1) * CYCLE; k++) {
    const f = k % CYCLE;
    const record = k >= TRAIL.warmup * CYCLE;
    // 1 · dt-based decay of everything already stamped
    for (let i = 0; i < n; i++) hist[i] *= decay;
    // 2 · stamp the head, gated on the frame difference
    const at = wanderAt(f / CYCLE);
    const hx = at[0] * W, hy = at[1] * H;
    const headCell = Math.floor(hy) * W + Math.floor(hx);
    let fresh = 0;
    if (headCell !== prevCell) {
      prevCell = headCell;
      const x0 = Math.max(region.x0, Math.floor(hx) - TRAIL.radius);
      const x1 = Math.min(region.x0 + region.w - 1, Math.ceil(hx) + TRAIL.radius);
      const y0 = Math.max(region.y0, Math.floor(hy) - TRAIL.radius);
      const y1 = Math.min(region.y0 + region.h - 1, Math.ceil(hy) + TRAIL.radius);
      for (let y = y0; y <= y1; y++) {
        const row = (y - region.y0) * region.w - region.x0;
        for (let x = x0; x <= x1; x++) {
          const dx = x - hx, dy = y - hy;
          const r2 = dx * dx + dy * dy;
          if (r2 > max2) continue;
          const o = row + x;
          // only a cell this stamp BRIGHTENS is written: a cell that is already
          // fading is never re-stamped back to the value it holds
          const fall = 1 - r2 / max2;
          const amount = TRAIL.gain * fall * fall;
          if (amount > hist[o]) { hist[o] = amount; fresh++; }
        }
      }
    }
    if (record) { stamps[f] = fresh; skipped[f] = fresh === 0 ? 1 : 0; }
    if (!record) continue;
    // 3 · the read: cheap separable (1,2,1)/4 blur, then quantise to Uint8
    for (let y = 0; y < region.h; y++) {
      const row = y * region.w;
      for (let x = 0; x < region.w; x++) {
        const l = hist[row + (x > 0 ? x - 1 : x)];
        const c = hist[row + x];
        const r = hist[row + (x < region.w - 1 ? x + 1 : x)];
        line[row + x] = (l + 2 * c + r) * 0.25;
      }
    }
    const plane = new Uint8Array(n);
    const list = [];
    for (let y = 0; y < region.h; y++) {
      const row = y * region.w;
      const up = y > 0 ? row - region.w : row;
      const dn = y < region.h - 1 ? row + region.w : row;
      for (let x = 0; x < region.w; x++) {
        const v = (line[up + x] + 2 * line[row + x] + line[dn + x]) * 0.25;
        const q = Math.round(v * TRAIL.scale);
        if (q <= 0) continue;
        plane[row + x] = q > 255 ? 255 : q;
        list.push(row + x);
      }
    }
    planes[f] = plane;
    offs[f] = Int32Array.from(list);
  }
  trailCache = { region, planes, offs, stamps, skipped, footprint };
  return trailCache;
}

export function trailTone(x, y, t) {
  const table = trailTable();
  const R = table.region;
  if (x < R.x0 || x >= R.x0 + R.w || y < R.y0 || y >= R.y0 + R.h) return 0;
  return table.planes[cycleFrame(t)][(y - R.y0) * R.w + (x - R.x0)] / TRAIL.scale;
}

// The trail measured in the cells it actually lights: how many carry a visible
// amount and how far behind the head the last visible cell sits, along the
// direction of travel. 'visible' is the tone the first dither rung asks for on
// this palette (level 0.234 of a ${v.spanText} span), so the number is what a viewer sees
// and not what a float buffer holds; the faint tail is reported separately.
export function trailStats(visible = RUNG_TONE) {
  const table = trailTable();
  const R = table.region;
  const cut = Math.round(visible * TRAIL.scale);
  const faint = Math.round(0.02 * TRAIL.scale);
  const faintLen = [];
  const faintCellsList = [];
  const cellsList = [];
  const lenList = [];
  let peak = 0;
  for (let f = 0; f < CYCLE; f++) {
    const plane = table.planes[f];
    const at = wanderAt(f / CYCLE);
    const ahead = wanderAt((f + 1) / CYCLE);
    const vx = (ahead[0] - at[0]) * W, vy = (ahead[1] - at[1]) * H;
    const vl = Math.hypot(vx, vy) || 1;
    const hx = at[0] * W, hy = at[1] * H;
    let cells = 0, far = 0, farFaint = 0, faintCells = 0;
    for (let i = 0; i < plane.length; i++) {
      const q = plane[i];
      if (q > peak) peak = q;
      if (q < faint) continue;
      faintCells++;
      const y = R.y0 + ((i / R.w) | 0), x = R.x0 + (i % R.w);
      const behind = -((x - hx) * vx + (y - hy) * vy) / vl;
      if (behind > farFaint) farFaint = behind;
      if (q < cut) continue;
      cells++;
      if (behind > far) far = behind;
    }
    cellsList.push(cells);
    lenList.push(far);
    faintLen.push(farFaint);
    faintCellsList.push(faintCells);
  }
  cellsList.sort((a, b) => a - b);
  lenList.sort((a, b) => a - b);
  faintLen.sort((a, b) => a - b);
  faintCellsList.sort((a, b) => a - b);
  return {
    tauSeconds: TRAIL.tau,
    decayPerFrame: Number(Math.exp(-(1 / FPS) / TRAIL.tau).toFixed(4)),
    radiusCells: TRAIL.radius,
    peakTone: Number((peak / TRAIL.scale).toFixed(3)),
    regionPx: R.w + 'x' + R.h,
    cellsMedian: cellsList[Math.floor(cellsList.length / 2)],
    cellsMax: cellsList[cellsList.length - 1],
    visibleTone: visible,
    lengthMedianCells: Math.round(lenList[Math.floor(lenList.length / 2)]),
    lengthMaxCells: Math.round(lenList[lenList.length - 1]),
    faintLengthMedianCells: Math.round(faintLen[Math.floor(faintLen.length / 2)]),
    faintLengthMaxCells: Math.round(faintLen[faintLen.length - 1]),
    faintCellsMedian: faintCellsList[Math.floor(faintCellsList.length / 2)],
    faintCellsMax: faintCellsList[faintCellsList.length - 1],
    footprintCells: table.footprint,
    stampedMedian: Int32Array.from(table.stamps).sort()[Math.floor(CYCLE / 2)],
    stampedMax: Math.max.apply(null, Array.from(table.stamps)),
    framesGatedOut: table.skipped.reduce((a, b) => a + b, 0),
  };
}

export function eventTone(x, y, t) {
  const p = t / SECONDS;
  const a = Math.PI * 2 * p;
  let tone = 0;
  if (p > EVENT.s0 && p < EVENT.s1) {
    const q = (p - EVENT.s0) / (EVENT.s1 - EVENT.s0);
    const env = eventEnvelope(q);
    if (env > 0) {
      const hx = (EVENT.from[0] + q * (EVENT.to[0] - EVENT.from[0])) * W;
      const hy = (EVENT.from[1] + q * (EVENT.to[1] - EVENT.from[1])) * H;
      if (inside(tailBox(hx, hy), x, y)) {
        const rx = x - hx, ry = y - hy;
        const coma = Math.exp(-Math.hypot(rx, ry) / 3.2) * 1.8;
        let dustTail = 0;
        const s = -(rx * EVENT.dir[0] + ry * EVENT.dir[1]);   // > 0 behind the head
        if (s > -1) {
          const sp = Math.max(0, s);
          const across = -rx * EVENT.dir[1] + ry * EVENT.dir[0];
          const pc = across - 0.006 * sp * sp;                // curvature in cells
          const w = 1.8 + 0.26 * sp;                          // widening in cells
          // the streak's own scroll is a WHOLE cycle of the loop now, not
          // '-t * 0.4', which is not periodic in t/T
          const streak = fbm(sp * 0.05 - a, (pc / w) * 2.5);
          dustTail = Math.exp(-((pc / w) ** 2)) * Math.exp(-sp / 42) * (0.6 + 0.9 * streak);
        }
        tone += env * TAIL_GAIN * Math.max(coma, dustTail);
      }
    }
  }

  // Event 2 · the wandering light, on its closed path, plus its decaying trail.
  const at = wanderAt(p);
  const bx = at[0], by = at[1];
  const bxc = bx * W, byc = by * H;
  if (Math.abs(x - bxc) <= BLINK_R && Math.abs(y - byc) <= BLINK_R) {
    const blink = 0.5 + 0.5 * Math.sin(a * 13);
    tone += 0.30 * blink * bell(Math.hypot(x / W - bx, y / H - by), 0.0035);
  }
  return tone + trailTone(x, y, t);
}

export function dynamicTone(x, y, t) {
  return twinkleTone(x, y, t) + nodeTone(x, y, t) + eventTone(x, y, t);
}

// THE FIELD: the static layer plus the dynamic layer, in one expression. The
// bake path calls this; the live page reaches the same numbers through
// baseTone + forEachDynamicCell, which is what lets it bake the sky once.
export function field(x, y, t) {
  const tone = (baseTone(x, y) + dynamicTone(x, y, t)) * vignette(x, y);
  return toneColor(tone);
}

// ------------------------------------------------- the dynamic cell set, once
// Every cell the animation can touch, deduplicated and visited exactly once per
// frame. ~50k cells instead of 144k, and no trigonometry per cell: the node
// halo is a table lookup and the brightness is one sine per node per frame.
let twinkle = null;
function twinkleCells() {
  if (twinkle) return twinkle;
  const cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dustTier(x, y) === 3) cells.push(y * W + x);
  twinkle = Int32Array.from(cells);
  return twinkle;
}

let mark = null;
const touchedCells = new Int32Array(W * H);
export function forEachDynamicCell(t, visit) {
  if (!mark) mark = new Uint8Array(W * H);
  let count = 0;
  const touch = (cell) => {
    if (mark[cell]) return;
    mark[cell] = 1;
    touchedCells[count++] = cell;
    const x = cell % W;
    visit(cell, x, (cell - x) / W, dynamicTone(x, (cell - x) / W, t));
  };
  const table = haloTable();
  for (let k = 0; k < table.cells.length; k++) touch(table.cells[k]);
  const tw = twinkleCells();
  for (let k = 0; k < tw.length; k++) touch(tw[k]);

  const p = t / SECONDS;
  if (p > EVENT.s0 && p < EVENT.s1) {
    const q = (p - EVENT.s0) / (EVENT.s1 - EVENT.s0);
    if (eventEnvelope(q) > 0) {
      const hx = (EVENT.from[0] + q * (EVENT.to[0] - EVENT.from[0])) * W;
      const hy = (EVENT.from[1] + q * (EVENT.to[1] - EVENT.from[1])) * H;
      const box = tailBox(hx, hy);
      const x0 = Math.max(0, Math.floor(box[0])), x1 = Math.min(W - 1, Math.ceil(box[1]));
      const y0 = Math.max(0, Math.floor(box[2])), y1 = Math.min(H - 1, Math.ceil(box[3]));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) touch(y * W + x);
    }
  }
  const at = wanderAt(p);
  const bx = at[0] * W, by = at[1] * H;
  const bx0 = Math.max(0, Math.floor(bx) - BLINK_R), bx1 = Math.min(W - 1, Math.ceil(bx) + BLINK_R);
  const by0 = Math.max(0, Math.floor(by) - BLINK_R), by1 = Math.min(H - 1, Math.ceil(by) + BLINK_R);
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) touch(y * W + x);
  // the trail: exactly the cells its own frame carries, so the split path visits
  // the same set the one-pass field lights
  const trailCells = trailTable();
  const trailOffs = trailCells.offs[cycleFrame(t)];
  const region = trailCells.region;
  for (let j = 0; j < trailOffs.length; j++) {
    const o = trailOffs[j];
    touch((region.y0 + ((o / region.w) | 0)) * W + region.x0 + (o % region.w));
  }

  for (let k = 0; k < count; k++) mark[touchedCells[k]] = 0;
}

// The live raster: an INTEGER number of device pixels per cell, and the device
// pixel ratio honoured instead of assumed to be 1. Math.ceil overshot (1440 px
// for a 1175.6 px box, a 0.816 downscale that beat against the cell lattice),
// and ignoring DPR made a retina screen show half the resolution it could. The
// floor never invents pixels, and the residual browser scale is ONE uniform
// factor instead of a fractional cell.
export function cellPixelsFor(cssWidth, devicePixelRatio = 1) {
  const device = cssWidth * (devicePixelRatio > 0 ? devicePixelRatio : 1);
  return Math.max(1, Math.floor(device / W));
}

// The loop's own bookkeeping, exported so a checker can measure the events
// instead of guessing their frames: the shooting star's window and the fraction
// of it spent easing in and out, and the trail's decay constant and footprint.
export const EVENT_WINDOWS = {
  shooting: { s0: EVENT.s0, s1: EVENT.s1, ease: EASE },
  wander: { tau: TRAIL.tau, radiusCells: TRAIL.radius, gain: TRAIL.gain },
};

export const constelacion2Scene = {
  id: '${v.id}',
  label: '${v.label}',
  cols: W, rows: H, fps: FPS, cycleFrames: CYCLE, posterFrame: 100,
  palette: STOPS.map((c) => '#' + c.map((n) => Math.round(n * 255).toString(16).padStart(2, '0')).join('').toUpperCase()),
  ground: ${v.ground},
  groundHex: '${v.groundHex}',
  params: { nodes: NODES.length, links: LINKS.length, resolution: W + ' × ' + H, seconds: SECONDS },
  field,
};

// The static layer as a scene of its own: the page's offscreen bake and the
// checks measure the SAME field the full frame uses for its sky.
export const staticScene = {
  ...constelacion2Scene,
  id: '${v.id}-static',
  label: '${v.staticLabel}',
  field: staticColor,
};

export { toneColor };
export default constelacion2Scene;
`;
}

for (const variant of VARIANTS) {
  await writeFile(resolve(DIR, variant.file), sceneSource(variant));
  console.log(`emitida ${variant.file}: ${variant.stops.length} stops, ${variant.id}`);
}

console.log(`v2 generada: ${verts.length} vértices → ${NODES.length} nodos, ${LINKS.length} enlaces, ${RINGS.length} anillos (separación mínima ${MERGE_CELLS} celdas)`);
