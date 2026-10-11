/**
 * F3 — 02 MAGI: el bloque que falta.
 *
 * Source of truth: joyanlabs-plan/docs/architecture/HARNESS_ENGINEERING.md §4
 *   "Doce componentes, agrupados en cuatro bloques. El bloque de control es el
 *    que suele faltar."
 *
 * CONCEPT: The harness assembles itself around a motionless agent. One whole
 *   group never arrives, and the hole is left visible.
 *
 * CARRY: the agent. It never moves, never changes, in any frame of the film.
 *   Everything in the picture happens around it, which is the whole claim of
 *   harness engineering: the model is a variable, the environment is the work.
 *
 * COLOUR: amber appears exactly once — as the single flash on the gap, which
 *   is the moment the missing block is named.
 */

import {
  PALETTE, LIVE, DEAD, AGENT_R, AGENT_IN, COMPONENT_W, COMPONENT_H, STROKES,
  agentGlyph, clamp, seg, arrive, land, outQuart, outCubic, outExpo, lerp,
} from '../lib.js';

export const meta = {
  id: 'F3',
  file: 'harness-assembly',
  title: 'F3 · el bloque que falta',
  width: 1920,
  height: 1080,
  duration: 15,
  fps: 30,
  focal: { x: 960, y: 540 },
  quiet: [[0.0, 1.5], [13.5, 15.0]],
  hits: [2.1, 2.9, 3.7, 4.5, 5.3],
  camera: [
    [0.0, 1.0, 960, 540],
    [1.6, 1.0, 960, 540],
    [3.4, 1.05, 960, 540],
    [7.2, 1.14, 960, 540],
    [11.4, 1.16, 960, 540],
    [12.2, 1.2, 960, 540],
    [13.4, 1.02, 960, 540],
    [13.9, 1.0, 960, 540],
    [15.0, 1.0, 960, 540],
  ],
  beats: [
    { key: 'rest', t0: 0.0, t1: 1.6 },
    { key: 'assemble', t0: 1.6, t1: 4.2 },
    { key: 'gap', t0: 4.2, t1: 6.8 },
    { key: 'work', t0: 6.8, t1: 10.6 },
    { key: 'flash', t0: 10.6, t1: 11.4 },
    { key: 'loop', t0: 11.4, t1: 15.0 },
  ],
};

const AGENT = { x: 960, y: 540 };

/** Four bands of the canonical model. Group 2 is CONTROL and never arrives. */
const BANDS = [
  { key: 0, count: 2, y: 210, arrive: 1.9, stroke: STROKES.component },
  { key: 1, count: 4, y: 330, arrive: 2.7, stroke: STROKES.component },
  { key: 2, count: 4, y: 750, arrive: null, stroke: LIVE }, // never arrives
  { key: 3, count: 3, y: 870, arrive: 3.5, stroke: STROKES.component },
];
const SLOT_W = 150;

export function build(scene) {
  scene.ground();
  const grid = scene.grid({ alpha: 0.18 });
  const spokes = scene.add('g', {});
  const bandLayer = scene.add('g', {});
  const agentLayer = scene.add('g', {});
  const gapLayer = scene.add('g', {});

  const a = agentGlyph(scene, scene.cam, AGENT.x, AGENT.y);
  const agent = a.ring;

  const pieces = [];
  for (const b of BANDS) {
    for (let i = 0; i < b.count; i++) {
      const cx = AGENT.x + (i - (b.count - 1) / 2) * SLOT_W;
      const spoke = scene.el('line', {
        x1: AGENT.x, y1: AGENT.y, x2: cx, y2: b.y,
        stroke: 'rgba(255,255,255,0.22)', 'stroke-width': 1,
        'vector-effect': 'non-scaling-stroke', opacity: 0,
      });
      spokes.appendChild(spoke);
      const node = scene.el('rect', {
        x: cx - COMPONENT_W / 2, y: b.y - COMPONENT_H / 2,
        width: COMPONENT_W, height: COMPONENT_H, fill: PALETTE.ink900,
        stroke: b.stroke, 'stroke-width': 1.5,
        'vector-effect': 'non-scaling-stroke', opacity: 0,
      });
      bandLayer.appendChild(node);
      pieces.push({ ...b, i, node, spoke, cx });
    }
  }

  // The gap CONTROL leaves: four outlined slots that stay empty.
  const gapSlots = BANDS[2].count;
  for (let i = 0; i < gapSlots; i++) {
    const cx = AGENT.x + (i - (gapSlots - 1) / 2) * SLOT_W;
    gapLayer.appendChild(
      scene.el('rect', {
        x: cx - COMPONENT_W / 2, y: BANDS[2].y - COMPONENT_H / 2,
        width: COMPONENT_W, height: COMPONENT_H,
        fill: 'none', stroke: DEAD, 'stroke-width': 1.5,
        'stroke-dasharray': '7 6', 'vector-effect': 'non-scaling-stroke', opacity: 0,
      })
    );
    gapLayer.appendChild(
      scene.el('line', {
        x1: AGENT.x, y1: AGENT.y, x2: cx, y2: BANDS[2].y,
        stroke: DEAD, 'stroke-width': 1, 'stroke-dasharray': '3 6',
        'vector-effect': 'non-scaling-stroke', opacity: 0,
      })
    );
  }
  const gapFrame = scene.el('rect', {
    x: AGENT.x - (gapSlots * SLOT_W) / 2 - 6, y: BANDS[2].y - 26,
    width: gapSlots * SLOT_W + 12, height: 52,
    fill: 'none', stroke: DEAD, 'stroke-width': 1.5,
    'vector-effect': 'non-scaling-stroke', opacity: 0,
  });
  gapLayer.appendChild(gapFrame);

  return (t) => {
    scene.set(grid, { opacity: '0.34' });
    // agentGlyph is born hidden like every other element in the legend; the
    // agent is the one thing that must be on screen from frame 0.
    scene.set(a.g, { opacity: '1' });
    scene.set(agentLayer, { opacity: '1' });

    const fade = 1 - outCubic(seg(t, 11.6, 12.8));
    for (const p of pieces) {
      if (p.arrive === null) continue; // CONTROL never arrives
      const start = p.arrive + p.i * 0.16;
      const v = arrive(seg(t, start, start + 0.5), 2.9, 1);
      scene.set(p.node, { opacity: (v * fade).toFixed(3) });
      scene.set(p.spoke, { opacity: (clamp(v * 1.7 - 0.5) * 0.9 * fade).toFixed(3) });
    }

    const gapIn = arrive(seg(t, 4.6, 5.4), 2.6, 1);
    // The flash: the only amber in the film, on the empty band, once.
    const flash = outExpo(seg(t, 10.6, 11.0)) * (1 - outQuart(seg(t, 11.2, 11.4)));
    scene.set(gapLayer, { opacity: (gapIn * fade).toFixed(3) });
    scene.set(gapFrame, {
      stroke: flash > 0.05 ? LIVE : DEAD,
      'stroke-width': flash > 0.05 ? 3 : 1.5,
      opacity: (0.55 + flash * 0.45).toFixed(3),
    });
    // Write every child's stroke every frame. An earlier version only
    // repainted children whose stroke was still DEAD, so after the flash the
    // whole gap stayed amber forever and seeking the same t gave a different
    // frame depending on what had been seeked before it.
    for (const c of gapLayer.children) {
      if (c !== gapFrame) scene.set(c, { stroke: flash > 0.05 ? LIVE : DEAD });
    }

    // The agent works the whole film and is identical in every frame of it.
    const busy = arrive(seg(t, 6.8, 7.4), 2.4, 1) * (1 - outQuart(seg(t, 11.4, 12.2)));
    scene.set(agent, {
      r: (AGENT_R * (1 + busy * 0.05)).toFixed(2),
      stroke: PALETTE.bone,
    });
    return t;
  };
}

export default { meta, build };