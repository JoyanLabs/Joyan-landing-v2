/**
 * F2 — 01 AGENTES: dónde va el gate.
 *
 * Source of truth: joyanlabs-plan/docs/architecture/HARNESS_ENGINEERING.md §5
 *   "Un gate sobre todo hace al humano el cuello de botella; un gate sobre
 *    nada significa que nadie mira. El gate va donde el error es caro de
 *    deshacer."
 *
 * CONCEPT: A stream of actions crosses three lanes. Two pass untouched. The
 *   third one stops at a gate and does not move until someone resolves it.
 *
 * CARRY: each action keeps its own identity across the gate — the block that
 *   stops is the block that continues, which is the point of an action.
 *
 * COLOUR: amber is the gate and only the gate. The irreversible lane is the
 *   only lane that contains one, and it is the only one that ever waits.
 */

import {
  PALETTE, LIVE, DEAD, COMPONENT_W, COMPONENT_H, STROKES, gateGlyph,
  clamp, seg, arrive, land, outQuart, outCubic, outExpo, lerp,
} from '../lib.js';

export const meta = {
  id: 'F2',
  file: 'action-gates',
  title: 'F2 · dónde va el gate',
  width: 1920,
  height: 1080,
  duration: 15,
  fps: 30,
  focal: { x: 960, y: 540 },
  quiet: [[0.0, 2.2], [13.4, 15.0]],
  hits: [1.9, 2.6, 3.3, 4.0, 4.7, 5.4],
  camera: [
    [0.0, 1.0, 960, 540],
    [1.6, 1.0, 960, 540],
    [3.8, 1.05, 960, 540],
    [6.6, 1.12, 1010, 540],
    [7.5, 1.2, 1060, 540],
    [11.5, 1.12, 1010, 540],
    [13.2, 1.02, 960, 540],
    [13.9, 1.0, 960, 540],
    [15.0, 1.0, 960, 540],
  ],
  beats: [
    { key: 'rest', t0: 0.0, t1: 1.6 },
    { key: 'lanes', t0: 1.6, t1: 3.8 },
    { key: 'flow', t0: 3.8, t1: 6.6 },
    { key: 'gate', t0: 6.6, t1: 7.5 },
    { key: 'pass', t0: 7.5, t1: 11.5 },
    { key: 'loop', t0: 11.5, t1: 15.0 },
  ],
};

const LANES = [
  { y: 250, n: 5, gated: false, retry: false },
  { y: 540, n: 5, gated: false, retry: true },
  { y: 830, n: 5, gated: true, retry: false },
];
const X0 = 300;
const X1 = 1620;
const GATE_X = 1060;
const BLOCK_W = COMPONENT_W;
const BLOCK_H = COMPONENT_H * 2.4;

export function build(scene) {
  scene.ground();
  const grid = scene.grid({ alpha: 0.18 });
  const guides = scene.add('g', {});
  const traceLayer = scene.add('g', {});
  const blockLayer = scene.add('g', {});
  const retryLayer = scene.add('g', {});

  for (const l of LANES) {
    guides.appendChild(
      scene.el('line', {
        x1: X0, y1: l.y, x2: X1, y2: l.y,
        // 2.5px at 0.4, not 1.5px at 0.34. The lane guides are the film's
        // only structure before the first action arrives; at hairline weight
        // they vanished into the ground and the first four seconds played
        // on an empty frame.
        stroke: 'rgba(255,255,255,0.40)', 'stroke-width': 2.5,
        'vector-effect': 'non-scaling-stroke',
      })
    );
  }
  const fade = (t) => 1 - outCubic(seg(t, 13.2, 14.2));

  /**
   * The trace is the evidence, and it stays. A conveyor of actions replaces
   * itself at every boundary, which is exactly what reads as a slideshow, so
   * nothing here flows past and vanishes: every action leaves its line
   * behind. The frame therefore always has structure on it, and the boundary
   * carries.
   */
  const lanes = LANES.map((l) => {
    const trace = scene.el('rect', {
      x: X0, y: l.y - 3, width: 0, height: 6,
      fill: l.gated ? LIVE : PALETTE.bone,
      'vector-effect': 'non-scaling-stroke', opacity: 0,
    });
    traceLayer.appendChild(trace);

    const n = l.gated ? 1 : 2;
    const blocks = Array.from({ length: n }, (_, i) => {
      const r = scene.el('rect', {
        width: BLOCK_W, height: BLOCK_H, fill: PALETTE.ink900,
        stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 1.5,
        'vector-effect': 'non-scaling-stroke', opacity: 0,
      });
      blockLayer.appendChild(r);
      return r;
    });

    // The retry tick: the lane that may fail and try again.
    const tick = l.retry
      ? scene.el('path', {
          d: '', stroke: DEAD, 'stroke-width': 2, fill: 'none',
          'vector-effect': 'non-scaling-stroke', opacity: 0,
        })
      : null;
    if (tick) retryLayer.appendChild(tick);

    return { ...l, trace, blocks, tick };
  });

  const gate = gateGlyph(scene, scene.cam, GATE_X, LANES[2].y);

  return (t) => {
    scene.set(grid, { opacity: '0.34' });

    const gatesIn = arrive(seg(t, 5.7, 6.5), 3.0, 1);
    scene.set(gate.g, { opacity: (gatesIn * fade(t)).toFixed(3) });

    for (const lane of lanes) {
      lane.blocks.forEach((b, k) => {
        const spawn = 2.1 + k * 2.1;
        // Where the action is at time t.
        let p;
        let traceW;
        if (lane.gated) {
          // It stops at the gate and does not move until it is released.
          const run = outCubic(seg(t, spawn, spawn + 1.6));
          const holdAt = clamp((GATE_X - BLOCK_W / 2 - X0) / (X1 - X0));
          const past = outCubic(seg(t, 9.3, 11.0));
          p = run < holdAt ? run : lerp(holdAt, 1, past);
          traceW = p * (X1 - X0);
        } else {
          p = outCubic(seg(t, spawn, spawn + 4.8));
          traceW = p * (X1 - X0);
        }
        const x = X0 + (X1 - X0 - BLOCK_W) * p;
        const alive = clamp(seg(t, spawn, spawn + 0.3)) * (p < 0.995 ? 1 : 0);
        scene.set(b, {
          x: x.toFixed(1),
          y: lane.y - BLOCK_H / 2,
          opacity: (alive * fade(t)).toFixed(3),
        });
        if (lane.gated) {
          // Waiting looks like waiting: the block dims and its border goes amber.
          const waiting = clamp(seg(t, 6.6, 7.0)) * (1 - clamp(seg(t, 9.2, 9.5)));
          scene.set(b, {
            fill: waiting > 0.35 ? PALETTE.ink800 : PALETTE.ink900,
            stroke: waiting > 0.35 ? LIVE : STROKES.component,
            'stroke-width': waiting > 0.35 ? 3 : 1.5,
          });
        }
        // The trace grows behind the action and stays.
        scene.set(lane.trace, {
          width: Math.max(0, traceW - (lane.gated ? 0 : BLOCK_W / 2)).toFixed(1),
          opacity: (clamp(seg(t, spawn + 0.2, spawn + 0.6)) *
                    (lane.gated ? outCubic(seg(t, 9.3, 10.0)) : 1) * 0.55 * fade(t)).toFixed(3),
        });
      });

      // One retry arc, drawn and kept.
      if (lane.tick) {
        const rp = outCubic(seg(t, 3.2, 4.6));
        const bx = X0 + (X1 - X0) * 0.46;
        scene.set(lane.tick, {
          d: `M${bx} ${LANES[1].y - BLOCK_H / 2 - 8}
              q -86 -84 -172 0
              q 86 84 172 0`,
          opacity: (rp * 0.7 * fade(t)).toFixed(3),
        });
      }
    }
    return t;
  };
}

export default { meta, build };
