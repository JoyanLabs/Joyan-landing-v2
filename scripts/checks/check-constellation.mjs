#!/usr/bin/env node
/**
 * CONSTELLATIONS: the five-layer stack, the four link behaviours, measured.
 * ============================================================================
 * Node only, no browser. This file is the acceptance test for
 * `scripts/scene-src/constellation.mjs` and the two real asterisms in
 * `scripts/scene-src/constellations/`, and it exists because the previous
 * attempt produced scenes that were *correct and empty*: a skill validated a
 * scene and never demanded layers or richness, so a flat field passed.
 *
 * What it proves, with numbers rather than declarations:
 *
 *   STACK      the five layers of `docs/ESTETICA-CONSTELACION.md` are present
 *              AND each one moves the composite. The negative cases are the
 *              point: without `vignette`, without `cores`, without `wash`, with
 *              four planes or with an unknown behaviour, `validateConstellation`
 *              must REPORT errors, never pass silently.
 *   VIGNETTE   reproduces the approved measurements: centre 1.000, lateral edge
 *              0.928, corner 0.773.
 *   FIGURE     three planes of nodes; Genghe's three stars are measurably
 *              near-collinear (the research says "3 estrellas casi en línea
 *              recta"; a couple of cells off is what "casi" means).
 *   BEHAVIOURS each of the four with an observable value, in the frame and not
 *              only in the branch: `breathe` varies in the cycle and lights
 *              stretches along the stroke, `trace` is exactly zero at both ends
 *              of the loop and paints in the middle, `depth` is a strict
 *              opacity/width ladder per plane with no animation, `focus` keeps
 *              only the active group solid.
 *   LOOP       `constellationFrame(c, i)` renders identically twice and equals
 *              `constellationFrame(c, i + frames)`.
 *   PROVENANCE `official: false`, a culture, a source, copy marked provisional,
 *              and the unpublished product name kept out of every published
 *              string.
 *
 * Usage, from the repository root:
 *   timeout 180 node scripts/checks/check-constellation.mjs
 *
 * Exit code 0 only when every case passes. Prints the numbers it measured.
 *
 * NOTE ON ALIASING: `constellationLayers` returns VIEWS of the cached layout;
 * the next refresh rewrites them. Every number below is read immediately.
 */

import {
  BEHAVIOURS, FOCUS_FADE, LAYERS, PLANES, PLANE_STYLE, TRAMOS,
  constellationFrame, constellationLayers, constellationScene, linksForPlane, resolveLinks,
  traceEnvelope, traceProgress, linkSample, linkVisual, validateConstellation,
} from '../scene-src/constellation.mjs';
import genghe from '../scene-src/constellations/genghe.mjs';
import alrumh from '../scene-src/constellations/alrumh.mjs';
import { SCENES } from '../scene-src/constellations/index.mjs';
import { frameChars, RAMP, sceneMetrics } from '../scene-src/engine.mjs';

const COLS = 480;
const ROWS = 300;
const failures = [];
const lines = [];

/** One case: a name, the condition, and the numbers behind it. */
function check(name, ok, detail) {
  lines.push(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!ok) failures.push(name);
  return ok;
}

const num = (value) => (Number.isFinite(value) ? value.toFixed(4) : String(value));
const spread = (values) => Math.max(...values) - Math.min(...values);
const peak = (plane) => {
  let max = 0;
  for (let i = 0; i < plane.length; i++) if (plane[i] > max) max = plane[i];
  return max;
};
const mean = (plane) => {
  let sum = 0;
  for (let i = 0; i < plane.length; i++) sum += plane[i];
  return sum / plane.length;
};
const layersAt = (c, index, options = {}) => constellationLayers(c, { cols: COLS, rows: ROWS, index, ...options });
const clone = (value) => JSON.parse(JSON.stringify(value));

// ---------------------------------------------------------------------------
// 1. The two real constellations validate.
// ---------------------------------------------------------------------------
for (const [name, c] of Object.entries({ genghe, alrumh })) {
  const errors = validateConstellation(c);
  check(`validate ${name}`, errors.length === 0, errors.length ? errors.join(' | ') : 'no errors');
}
check('registry holds both asterisms', SCENES.genghe === genghe && SCENES.alrumh === alrumh,
  Object.keys(SCENES).join(', '));

// The negative cases: each clone breaks ONE thing and the error must name it.
const breaks = [
  ['a constellation without the vignette layer', (c) => { delete c.layers.vignette; }, /vignette/i],
  ['a constellation without the point sky', (c) => { delete c.layers.sky; }, /sky/i],
  ['a constellation without the wash', (c) => { delete c.layers.wash; }, /wash/i],
  ['a constellation without cores', (c) => { delete c.layers.cores; }, /cores/i],
  ['a figure with four planes', (c) => { c.layers.figure.planes = ['far', 'mid', 'near', 'x']; }, /plane/i],
  ['a figure with no plane', (c) => { c.layers.figure.planes = []; }, /plane/i],
  ['an empty layer object', (c) => { c.layers.vignette = {}; }, /vignette/i],
  ['an unknown link behaviour', (c) => { c.links[0].behaviour = 'shimmer'; }, /behaviour/i],
  ['a link to a node that does not exist', (c) => { c.links[0].from = 'nope'; }, /link|node/i],
  ['a node on a plane the figure does not draw', (c) => { c.nodes[0].plane = 'beyond'; }, /plane/i],
  ['copy that is not marked provisional', (c) => { delete c.nodes[0].content.provisional; }, /provisional/i],
  ['an asterism presented as an official constellation', (c) => { c.provenance.official = true; }, /official/i],
  ['a node outside every part of the figure', (c) => { c.nodes[0].content.partOf = 'x'; }, /partOf/i],
  ['a focus link without a group', (c) => { delete c.links[0].group; }, /focus|group/i],
  ['the unpublished product name in published copy',
    (c) => { c.nodes[0].content.line = `${c.project.label}: primera estrella.`; }, /name|publish|project/i],
];
for (const [label, mutate, pattern] of breaks) {
  const broken = clone(genghe);
  mutate(broken);
  const errors = validateConstellation(broken);
  const hit = errors.find((error) => pattern.test(error));
  check(`reports ${label}`, Boolean(hit), errors.length ? errors.join(' | ') : 'NO ERRORS (passed silently)');
}

// ---------------------------------------------------------------------------
// 2. The five-layer stack, measured on the composite.
// ---------------------------------------------------------------------------
const baseFrame = layersAt(genghe, 0);
const stack = {
  sky: peak(baseFrame.sky),
  wash: peak(baseFrame.wash),
  figure: peak(baseFrame.figure),
  vignette: mean(baseFrame.vignette),
  cores: peak(baseFrame.cores),
};
const vignetteAt = (u, v) => baseFrame.vignette[Math.round(v * (ROWS - 1)) * COLS + Math.round(u * (COLS - 1))];
const vignette = { centre: vignetteAt(0.5, 0.5), edge: vignetteAt(0, 0.5), corner: vignetteAt(0, 0) };
const baseCorner = baseFrame.composite[0];
const figurePlanes = Object.fromEntries(PLANES.map((plane) => [plane, peak(baseFrame.figureByPlane[plane])]));
const baseCompositePeak = peak(baseFrame.composite);
const baseCompositeMean = mean(baseFrame.composite);
const baseLinkPeaks = baseFrame.linkTone.map((plane) => peak(plane));

for (const layer of LAYERS) {
  check(`layer "${layer}" exists and carries tone`, stack[layer] > 0,
    layer === 'vignette' ? `mean ${num(stack.vignette)} (a multiplier, not ink)` : `peak ${num(stack[layer])}`);
}
check('vignette centre 1.000', Math.abs(vignette.centre - 1) < 0.002, num(vignette.centre));
check('vignette lateral edge 0.928', Math.abs(vignette.edge - 0.928) < 0.012, num(vignette.edge));
check('vignette corner 0.773', Math.abs(vignette.corner - 0.773) < 0.03, num(vignette.corner));

// A declared-but-empty layer is exactly the defect this unit prevents, so the
// composite has to lose something when the layer goes away.
const noVignette = clone(genghe);
delete noVignette.layers.vignette;
const flatCorner = layersAt(noVignette, 0).composite[0];
check('removing the vignette brightens the corner by the vignette value',
  Math.abs(flatCorner / baseCorner - 1 / vignette.corner) < 0.02,
  `corner ${num(baseCorner)} -> ${num(flatCorner)} (x${(flatCorner / baseCorner).toFixed(3)}, 1/0.773 = 1.294)`);

for (const plane of PLANES) {
  const owners = genghe.nodes.filter((node) => node.plane === plane).map((node) => node.id);
  check(`figure plane "${plane}" is populated`, owners.length > 0, owners.join(', ') || 'empty');
}
check('the three figure planes form a weight ladder',
  figurePlanes.near > figurePlanes.mid && figurePlanes.mid > figurePlanes.far,
  PLANES.map((plane) => `${plane} ${num(figurePlanes[plane])}`).join(' · '));

// The composite itself has to have contrast: bright cores on a dark field.
check('the composite has contrast, not a uniform veil',
  baseCompositePeak > 0.5 && baseCompositePeak / Math.max(baseCompositeMean, 1e-6) > 4,
  `peak ${num(baseCompositePeak)} · mean ${num(baseCompositeMean)} · ratio ${(baseCompositePeak / baseCompositeMean).toFixed(1)}`);

// ---------------------------------------------------------------------------
// 3. Genghe is the figure the research describes: three stars, near-collinear.
// ---------------------------------------------------------------------------
const stars = genghe.nodes.filter((node) => node.content.partOf !== 'guia');
check('Genghe has three asterism stars', stars.length === 3, `${stars.length} nodes`);
const [first, middle, last] = stars;
const vx = last.x - first.x;
const vy = (last.y - first.y) * (ROWS / COLS);
const wx = middle.x - first.x;
const wy = (middle.y - first.y) * (ROWS / COLS);
const deviation = Math.abs(vx * wy - vy * wx) / Math.hypot(vx, vy);
check('the three stars sit nearly on one line', deviation < 0.02,
  `${num(deviation)} of the frame width, about ${(deviation * COLS).toFixed(1)} cells`);
const anchor = genghe.nodes.find((node) => node.content.partOf === 'guia');
check('the locator star sits south of the asterism',
  anchor.y > Math.max(...stars.map((node) => node.y)) + 0.1, `${anchor.id} y ${num(anchor.y)}`);

// ---------------------------------------------------------------------------
// 4. The four link behaviours, each with an observable value.
// ---------------------------------------------------------------------------
const links = resolveLinks(genghe);
const byBehaviour = Object.fromEntries(BEHAVIOURS.map((behaviour) => [behaviour,
  links.filter((link) => link.behaviour === behaviour)]));
check('all four behaviours are authored',
  BEHAVIOURS.every((behaviour) => byBehaviour[behaviour].length > 0),
  BEHAVIOURS.map((behaviour) => `${behaviour} ${byBehaviour[behaviour].length}`).join(' · '));
check('every link declares a phase in [0,1)',
  links.every((link) => link.phase >= 0 && link.phase < 1),
  links.map((link) => num(link.phase)).join(', '));

const partition = PLANES.flatMap((plane) => linksForPlane(genghe, plane));
check('linksForPlane partitions the links exactly once',
  partition.length === links.length
  && new Set(partition.map((link) => `${link.from}->${link.to}`)).size === links.length,
  PLANES.map((plane) => `${plane} ${linksForPlane(genghe, plane).length}`).join(' · '));

// -- breathe: on and off in stretches, across the cycle and along the stroke
// The cycle measurement samples ONE point of the stroke: the stroke is always
// lit somewhere (that is what stretches mean), so the honest observable is that
// a fixed point goes dark and comes back within the cycle.
const breatheLink = byBehaviour.breathe[0];
const breatheBase = linkVisual(genghe, breatheLink, 0, {}).opacity;
const breatheCycle = Array.from({ length: 96 }, (_, step) => linkSample(genghe, breatheLink, step / 96, 0.31, {}));
const breatheAlongSpread = spread(Array.from({ length: 33 },
  (_, index) => linkSample(genghe, breatheLink, 0.25, index / 32, {})));
check('breathe goes out and comes back at a fixed point of the stroke',
  spread(breatheCycle) >= 0.5 * breatheBase,
  `${num(Math.min(...breatheCycle))}..${num(Math.max(...breatheCycle))} of base ${num(breatheBase)} at along 0.31`);
check('breathe lights TRAMOS stretches along the stroke, not the whole line',
  breatheAlongSpread >= 0.4 * breatheBase && TRAMOS >= 2,
  `spread ${num(breatheAlongSpread)} at p=0.25 with ${TRAMOS} tramos`);
check('breathe is 2π-periodic in the cycle',
  Math.abs(linkSample(genghe, breatheLink, 0, 0.3, {}) - linkSample(genghe, breatheLink, 1, 0.3, {})) < 1e-9,
  `${num(linkSample(genghe, breatheLink, 0, 0.3, {}))} vs ${num(linkSample(genghe, breatheLink, 1, 0.3, {}))}`);

// -- trace: progress 0 -> 1, envelope exactly zero at both ends of the loop
const traceLink = byBehaviour.trace[0];
const traceEdge = (p) => linkVisual(genghe, traceLink, p, {}).opacity;
const traceAtLoopEnds = [traceEdge(1 - traceLink.phase), traceEdge((1 - traceLink.phase) % 1 + 1)];
check('trace is exactly zero at both ends of the loop',
  Math.abs(traceEdge(1 - traceLink.phase)) < 1e-9 && Math.abs(traceEdge(-traceLink.phase)) < 1e-9
  && Math.abs(traceEnvelope(0)) < 1e-9 && Math.abs(traceEnvelope(1)) < 1e-9,
  `envelope(q=0) ${num(traceEnvelope(0))} · envelope(q=1) ${num(traceEnvelope(1))}`
  + ` · at the loop ends ${traceAtLoopEnds.map(num).join(', ')}`);
const progress = Array.from({ length: 10 }, (_, index) => traceProgress(index / 10, 0));
check('trace draws from origin to destination, 0 -> 1',
  progress[0] < 1e-9 && Math.abs(progress[9] - 0.9) < 1e-9
  && progress.every((value, index) => index === 0 || value > progress[index - 1]),
  `${progress.map((value) => value.toFixed(2)).join(' ')} (then wraps to 0 at the loop end, where the envelope is already 0)`);
check('trace starts at the link phase, not at the frame origin',
  Math.abs(traceProgress(0, traceLink.phase) - traceLink.phase) < 1e-9,
  `phase ${num(traceLink.phase)} -> progress ${num(traceProgress(0, traceLink.phase))}`);
check('trace reaches full strength mid-stroke', Math.abs(traceEnvelope(0.5) - 1) < 1e-9, num(traceEnvelope(0.5)));

// -- depth: a strict ladder per plane, and no animation at all
// `PLANES` runs far -> near, so a correct ladder RISES along that array: the far
// stroke is the faintest and the thinnest, the near one the strongest.
const depthLink = byBehaviour.depth[0];
const ladder = PLANES.map((plane) => linkVisual(genghe, { ...depthLink, plane }, 0.3, {}));
check('depth opacity increases from the far plane to the near one',
  ladder.every((value, index) => index === 0 || value.opacity > ladder[index - 1].opacity),
  PLANES.map((plane, index) => `${plane} ${num(ladder[index].opacity)}`).join(' · '));
check('depth width increases from the far plane to the near one',
  ladder.every((value, index) => index === 0 || value.width > ladder[index - 1].width),
  PLANES.map((plane, index) => `${plane} ${num(ladder[index].width)}`).join(' · '));
const depthSamples = Array.from({ length: 32 }, (_, index) => linkVisual(genghe, depthLink, index / 32, {}));
check('depth does not animate',
  spread(depthSamples.map((value) => value.opacity)) < 1e-12
  && spread(depthSamples.map((value) => value.width)) < 1e-12,
  `opacity ${num(depthSamples[0].opacity)} and width ${num(depthSamples[0].width)} over the whole cycle`);

// -- focus: only the active node's group stays solid
const focusLinks = byBehaviour.focus;
const insideGroup = focusLinks[0].group;
const insideNode = genghe.nodes.find((node) => node.content.partOf === insideGroup);
const outsideLink = focusLinks.find((link) => link.group !== insideGroup);
const insideNode2 = genghe.nodes.find((node) => node.content.partOf === outsideLink.group);
const solidInside = linkVisual(genghe, focusLinks[0], 0.3, { activeNode: insideNode.id }).opacity;
const fadedOutside = linkVisual(genghe, outsideLink, 0.3, { activeNode: insideNode.id }).opacity;
check('focus keeps the active group solid',
  solidInside === PLANE_STYLE[focusLinks[0].plane].opacity && solidInside > fadedOutside * 5,
  `${insideNode.id} -> ${num(solidInside)} (plane ${focusLinks[0].plane}) vs faded ${num(fadedOutside)}`);
check('focus fades the rest of the figure', fadedOutside <= FOCUS_FADE + 1e-9,
  `${outsideLink.from}->${outsideLink.to} -> ${num(fadedOutside)} (fade ${FOCUS_FADE})`);
check('focus keeps every group solid when nothing is active',
  focusLinks.every((link) => linkVisual(genghe, link, 0.3, {}).opacity === PLANE_STYLE[link.plane].opacity),
  focusLinks.map((link) => `${link.group} ${num(linkVisual(genghe, link, 0.3, {}).opacity)}`).join(' · '));

// ---------------------------------------------------------------------------
// 5. The behaviours measured on the composed frame, not only in the branch.
// ---------------------------------------------------------------------------
/** The painted tone of a link at a point along it, with a 3x3 tolerance. */
const toneAlong = (index, link, along, options = {}) => {
  const plane = layersAt(genghe, index, options).linkTone[links.indexOf(link)];
  const x0 = Math.round((link.ax + (link.bx - link.ax) * along) * COLS);
  const y0 = Math.round((link.ay + (link.by - link.ay) * along) * ROWS);
  let max = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
      max = Math.max(max, plane[y * COLS + x]);
    }
  }
  return max;
};

// breathe: the strokes along the line are lit in stretches, and one stretch
// goes out and comes back within the cycle.
const breatheSpatial = Array.from({ length: 40 }, (_, index) => toneAlong(0, breatheLink, index / 39));
const breatheTemporal = Array.from({ length: 48 }, (_, index) => toneAlong(
  Math.round((index / 48) * genghe.cycle.frames), breatheLink, 0.42));
check('breathe paints stretches along the stroke in the frame',
  spread(breatheSpatial) >= 0.5 * Math.max(...breatheSpatial),
  `${num(Math.min(...breatheSpatial))}..${num(Math.max(...breatheSpatial))} along the link at frame 0`);
check('breathe goes out and comes back over the cycle in the frame',
  spread(breatheTemporal) >= 0.85 * Math.max(...breatheTemporal),
  `${num(Math.min(...breatheTemporal))}..${num(Math.max(...breatheTemporal))} at one point of the stroke`);

// trace: at q=0 the stroke paints nothing; at q=0.5 it paints.
const traceIndex = links.indexOf(traceLink);
const traceFrame = (q) => {
  const frame = Math.round(((q - traceLink.phase + 1) % 1) * genghe.cycle.frames) % genghe.cycle.frames;
  return layersAt(genghe, frame).linkTone[traceIndex];
};
const traceAt0 = peak(traceFrame(0));
const traceAtHalf = peak(traceFrame(0.5));
check('trace paints nothing at the start of the loop and everything at the middle',
  traceAt0 < 1e-6 && traceAtHalf > 0.02,
  `tone at q=0 ${num(traceAt0)} · at q=0.5 ${num(traceAtHalf)}`);

// depth: the plane ladder is visible in the painted frame, and the stroke is
// identical at every phase (that is what "sin animación" means).
const peakOverCycle = (link) => Math.max(...Array.from({ length: 64 }, (_, index) => peak(
  layersAt(genghe, Math.round((index / 64) * genghe.cycle.frames)).linkTone[links.indexOf(link)])));
const painted = {
  near: peakOverCycle(byBehaviour.depth[0]),
  mid: peakOverCycle(byBehaviour.breathe[0]),
  far: peakOverCycle(links.find((link) => link.plane === 'far')),
};
check('the painted frame carries the plane ladder (each at its own crest)',
  painted.near > painted.mid * 1.15 && painted.mid > painted.far * 1.15,
  PLANES.map((plane) => `${plane} ${num(painted[plane])}`).join(' · '));

const depthIndex = links.indexOf(depthLink);
const depthCells = [];
const depthAt0 = layersAt(genghe, 0).linkTone[depthIndex];
for (let cell = 0; cell < depthAt0.length; cell++) if (depthAt0[cell] > 0) depthCells.push(cell);
const depthValues = depthCells.map((cell) => depthAt0[cell]);
let depthDrift = 0;
for (const frame of [90, 180, 270]) {
  const plane = layersAt(genghe, frame).linkTone[depthIndex];
  depthCells.forEach((cell, index) => {
    depthDrift = Math.max(depthDrift, Math.abs(plane[cell] - depthValues[index]));
  });
}
check('depth paints the same stroke at every phase',
  depthCells.length > 0 && depthDrift < 1e-9,
  `${depthCells.length} cells, max drift ${depthDrift}`);

// focus: the same link is solid or faint in the frame depending on the active node.
const focusIndex = links.indexOf(focusLinks[0]);
const outsideIndex = links.indexOf(outsideLink);
const focusFrame = layersAt(genghe, 0, { activeNode: insideNode.id });
const focusTone = peak(focusFrame.linkTone[focusIndex]);
const focusFaded = peak(focusFrame.linkTone[outsideIndex]);
const otherFrame = layersAt(genghe, 0, { activeNode: insideNode2.id });
const otherTone = peak(otherFrame.linkTone[outsideIndex]);
const otherFirst = peak(otherFrame.linkTone[focusIndex]);
check('focus paints the active group and fades the rest',
  focusTone > 0 && focusFaded < focusTone * 0.3,
  `active ${num(focusTone)} · other ${num(focusFaded)} (${(focusFaded / focusTone).toFixed(2)}x)`);
check('the other group paints when it is the active one',
  otherTone > otherFirst * 1.15, `other ${num(otherTone)} · first ${num(otherFirst)}`);

// ---------------------------------------------------------------------------
// 6. Determinism and the closed loop.
// ---------------------------------------------------------------------------
const stepHash = (frame) => {
  let hash = 2166136261;
  for (let i = 0; i < frame.steps.length; i++) hash = Math.imul(hash ^ frame.steps[i], 16777619) >>> 0;
  return hash >>> 0;
};
const frame0 = constellationFrame(genghe, 0, { cols: COLS, rows: ROWS });
const frame0Again = constellationFrame(genghe, 0, { cols: COLS, rows: ROWS });
const frameLoop = constellationFrame(genghe, genghe.cycle.frames, { cols: COLS, rows: ROWS });
const frameHalf = constellationFrame(genghe, Math.round(genghe.cycle.frames / 2), { cols: COLS, rows: ROWS });
check('the same index renders identically twice', stepHash(frame0) === stepHash(frame0Again),
  `hash ${stepHash(frame0)}`);
check('the loop closes: index and index+frames are identical', stepHash(frame0) === stepHash(frameLoop),
  `${stepHash(frame0)} vs ${stepHash(frameLoop)}`);
check('a moving cycle differs at the middle', stepHash(frame0) !== stepHash(frameHalf),
  `hash ${stepHash(frame0)} vs ${stepHash(frameHalf)}`);

// Tone coverage: the field is measured on what the ENGINE ACTUALLY PAINTS —
// the ground plus each cell's dot at its measured coverage — against the
// approved field luminance (4–6 %, `docs/ESTETICA-CONSTELACION.md`) and the
// rung diversity it demands ("4–8 tonos distinguibles"). This is the number the
// previous, flat attempt could not have passed: a uniform veil and flat black
// both miss the band.
const scene0 = constellationScene(genghe, { cols: COLS, rows: ROWS });
const metrics0 = sceneMetrics(scene0);
let luminance = 0;
for (let cell = 0; cell < frame0.steps.length; cell++) {
  const step = frame0.steps[cell];
  luminance += metrics0.groundTone
    + (metrics0.tones[frame0.indices[cell]] - metrics0.groundTone) * metrics0.coverage[step];
}
luminance /= frame0.steps.length;
const counts = Array.from({ length: RAMP.length }, () => 0);
for (const step of frame0.steps) counts[step] += 1;
const darkShare = counts[0] / frame0.steps.length;
const usedSteps = counts.map((count, step) => ({ step, share: count / frame0.steps.length }))
  .filter((entry) => entry.share > 0);
check('the rendered field lands in the approved 4–6 % luminance band',
  luminance > 0.04 && luminance < 0.06,
  `${(luminance * 100).toFixed(2)} % (dots + ground, coverage measured by the engine)`);
check('the frame is neither a veil nor flat black',
  darkShare > 0.2 && darkShare < 0.92 && usedSteps.length >= 4,
  `${(darkShare * 100).toFixed(1)} % on step 0 · `
  + usedSteps.map((entry) => `${entry.step}:${(entry.share * 100).toFixed(1)}%`).join(' '));
check('every glyph of the ramp is reached somewhere in the cycle', (() => {
  const used = new Set();
  for (let index = 0; index < 24; index++) {
    const frame = constellationFrame(genghe, Math.round((index / 24) * genghe.cycle.frames),
      { cols: COLS, rows: ROWS });
    for (const step of frame.steps) used.add(step);
  }
  return used.size >= 4;
})(), '>= 4 ramp steps across 24 frames');

// ---------------------------------------------------------------------------
// 7. Provenance, copy and the brand guardrail.
// ---------------------------------------------------------------------------
for (const [name, c] of Object.entries({ genghe, alrumh })) {
  check(`${name} declares a culture and a source`,
    Boolean(c.provenance.culture) && Boolean(c.provenance.source),
    `${c.provenance.culture} · ${c.provenance.source}`);
  check(`${name} is declared an asterism, not an official constellation`,
    c.provenance.official === false, `official=${c.provenance.official}`);
  check(`${name} marks its copy provisional`,
    c.nodes.every((node) => node.content.provisional === true), `${c.nodes.length} nodes`);
  check(`${name} keeps the unpublished product name out of published copy`,
    c.nodes.every((node) => !`${node.content.title} ${node.content.line}`
      .toLowerCase().includes(c.project.label.toLowerCase())),
    `project label "${c.project.label}" is internal and publish=${c.project.publish}`);
}
check('Genghe is the visual identifier of the Lanza project',
  genghe.project.id === 'lanza' && genghe.project.id === alrumh.project.id,
  `${genghe.project.id} / ${alrumh.project.id}`);
check('Al-Rumh is the same sky and a different culture',
  alrumh.provenance.culture !== genghe.provenance.culture && alrumh.nodes.length >= 1,
  `${alrumh.name} (${alrumh.provenance.culture}, ${alrumh.nodes.length} node) vs `
  + `${genghe.name} (${genghe.provenance.culture})`);

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
// The text map shows the FIGURE, not the sky: block-max of every link's painted
// tone plus the cores, so the shape this file validates is visible in the report.
// A point-sky preview would be all dots and would hide the constellation.
const mapLayers = layersAt(genghe, 0);
const linkMax = new Float32Array(COLS * ROWS);
for (const plane of mapLayers.linkTone) {
  for (let i = 0; i < plane.length; i++) if (plane[i] > linkMax[i]) linkMax[i] = plane[i];
}
for (let i = 0; i < mapLayers.cores.length; i++) {
  if (mapLayers.cores[i] > linkMax[i]) linkMax[i] = mapLayers.cores[i];
}
const preview = (plane, blockX = 4, blockY = 6) => {
  const rows = [];
  for (let y = 0; y < ROWS; y += blockY) {
    let line = '';
    for (let x = 0; x < COLS; x += blockX) {
      let best = 0;
      for (let dy = 0; dy < blockY && y + dy < ROWS; dy++) {
        for (let dx = 0; dx < blockX && x + dx < COLS; dx++) {
          const value = plane[(y + dy) * COLS + (x + dx)];
          if (value > best) best = value;
        }
      }
      line += RAMP[Math.min(RAMP.length - 1, Math.round(best / 0.14))];
    }
    rows.push(line);
  }
  return rows.join('\n');
};

console.log('\nconstellation check — stack, behaviours, provenance\n');
console.log(`grid ${COLS}x${ROWS} · cycle ${genghe.cycle.frames} frames @ ${genghe.cycle.fps} fps`
  + ` · palette ${genghe.palette.stops.length} tones · layers ${LAYERS.join(' > ')}\n`);
for (const line of lines) console.log(line);
const map = preview(linkMax);
console.log(`\nfigure map at frame 0 (links + cores, block-max, ramp "${RAMP}", `
  + `${map.split('\n')[0].length}x${map.split('\n').length}):\n`);
console.log(map);
console.log('\ncomposite peaks: ' + LAYERS.map((layer) => `${layer} ${num(stack[layer])}`).join(' · '));
console.log('figure by plane: ' + PLANES.map((plane) => `${plane} ${num(figurePlanes[plane])}`).join(' · '));
console.log('link peaks at frame 0: ' + links.map((link, index) =>
  `${link.from}->${link.to} ${num(baseLinkPeaks[index])}`).join(' · '));
console.log(`\n${lines.length - failures.length}/${lines.length} cases pass`);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}): ${failures.join('; ')}`);
  process.exitCode = 1;
}
