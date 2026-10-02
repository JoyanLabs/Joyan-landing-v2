/**
 * F5 — 04 ECOSISTEMA: el ciclo.
 *
 * Source of truth: joyanlabs-plan/docs/architecture/decision-flow.mmd
 *   Chat → Hermes detects + confirms with a human → PROPOSED → durable?
 *   → plan repo (branch + PR) → human review → ACCEPTED → Plane → GitHub
 *   → back into the detector as context.
 *
 * CONCEPT: One pulse crosses the whole knowledge cycle and comes back
 *   transformed, as context for the next pulse. The loop never dead-ends at
 *   the same place it started, which is what "cooperativa" means here.
 *
 * CARRY: the pulse. Same object at every station, changed by each one.
 *
 * COLOUR: amber is the human gate. It is the only station that stops, and
 *   the only place the pulse waits.
 */

import {
  PALETTE, LIVE, DEAD, AGENT_R, AGENT_IN, STROKES, gateGlyph,
  clamp, seg, arrive, land, outQuart, outCubic, outExpo, lerp,
} from '../lib.js';

export const meta = {
  id: 'F5',
  file: 'knowledge-cycle',
  title: 'F5 · el ciclo',
  width: 1920,
  height: 1080,
  duration: 15,
  fps: 30,
  focal: { x: 960, y: 540 },
  quiet: [[0.0, 1.5], [13.5, 15.0]],
  hits: [1.9, 2.6, 3.3, 4.0, 6.4, 7.1, 7.8],
  camera: [
    [0.0, 1.0, 960, 540],
    [1.6, 1.0, 960, 540],
    [4.6, 1.06, 960, 540],
    [8.6, 1.14, 960, 540],
    [12.0, 1.1, 960, 540],
    [13.4, 1.02, 960, 540],
    [14.4, 1.0, 960, 540],
    [15.0, 1.0, 960, 540],
  ],
  beats: [
    { key: 'rest', t0: 0.0, t1: 1.6 },
    { key: 'travel', t0: 1.6, t1: 4.6 },
    { key: 'gate', t0: 4.6, t1: 5.4 },
    { key: 'pass', t0: 5.4, t1: 8.6 },
    { key: 'split', t0: 8.6, t1: 12.0 },
    { key: 'return', t0: 12.0, t1: 15.0 },
  ],
};

/** The cycle, as a closed loop of five stations. Station 2 is the person. */
const STATIONS = [
  { a: -90, r: 1, live: true },
  { a: -18, r: 1, live: false },
  { a: 54, r: 1, live: true }, // the human gate
  { a: 126, r: 1, live: false },
  { a: 198, r: 1, live: false },
];
const CX = 960;
const CY = 540;
const R = 330;

const pt = (a) => ({
  x: CX + Math.cos(a * (Math.PI / 180)) * R,
  y: CY + Math.sin(a * (Math.PI / 180)) * R,
});
const STATION_PTS = STATIONS.map((s) => pt(s.a));

export function build(scene) {
  scene.ground();
  const grid = scene.grid({ alpha: 0.18 });
  const ringLayer = scene.add('g', {});
  const stLayer = scene.add('g', {});
  const pulseLayer = scene.add('g', {});
  const traceLayer = scene.add('g', {});

  // The closed path. Drawn once, dashed: it is a cycle, not a queue.
  const ring = scene.el('path', {
    d: `M${STATION_PTS[0].x} ${STATION_PTS[0].y} ` +
       STATION_PTS.slice(1).map((p) => `L${p.x} ${p.y}`).join(' ') +
       ` L${STATION_PTS[0].x} ${STATION_PTS[0].y}`,
    fill: 'none', stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 2,
    'stroke-dasharray': '8 9', 'vector-effect': 'non-scaling-stroke', opacity: 0,
  });
  ringLayer.appendChild(ring);

  const stEls = STATION_PTS.map((p, i) => {
    const g = scene.el('g', { opacity: 0 });
    stLayer.appendChild(g);
    if (STATIONS[i].live) {
      const gate = gateGlyph(scene, g, 0, 0);
      gate.g.removeAttribute('transform');
      void gate;
    } else {
      g.appendChild(
        scene.el('circle', {
          cx: p.x, cy: p.y, r: 32, fill: PALETTE.ink900,
          stroke: 'rgba(255,255,255,0.75)', 'stroke-width': 2.5,
          'vector-effect': 'non-scaling-stroke',
        })
      );
    }
    return g;
  });

  const pulse = scene.el('rect', {
    width: 68, height: 68, fill: PALETTE.bone, opacity: 0,
  });
  pulseLayer.appendChild(pulse);
  // Three copies that split off and re-merge: parallel work inside a cycle.
  const echoes = [0, 1, 2].map(() => {
    const r = scene.el('rect', { width: 34, height: 34, fill: DEAD, opacity: 0 });
    pulseLayer.appendChild(r);
    return r;
  });
  const trail = scene.el('path', {
    d: '', fill: 'none', stroke: PALETTE.bone, 'stroke-width': 2,
    'vector-effect': 'non-scaling-stroke', opacity: 0,
  });
  traceLayer.appendChild(trail);

  return (t) => {
    scene.set(grid, { opacity: '0.32' });
    const fade = 1 - outCubic(seg(t, 13.0, 14.0));
    // The cycle and its stations exist before anyone puts a signal in it:
    // they are the world, not the event. Fading them in on t>0 left the first
    // and last frames holding nothing but the ground, which the oracle reads
    // as an empty subject.
    scene.set(ring, { opacity: '0.9' });
    for (let i = 0; i < STATION_PTS.length; i++) {
      scene.set(stEls[i], { opacity: '1' });
    }

    // Travel: station to station, clockwise. Station 2 (the person) stops it.
    const pTravel = seg(t, 1.8, 4.6);
    const pAfter = seg(t, 5.7, 8.6);
    const pSplit = outCubic(seg(t, 8.8, 11.0));
    const pReturn = outCubic(seg(t, 12.0, 14.2));

    const segAt = (u) => {
      const n = STATION_PTS.length;
      const f = u * n;
      const i = Math.min(n - 1, Math.floor(f));
      const k = f - i;
      const a = STATION_PTS[i];
      const b = STATION_PTS[(i + 1) % n];
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), i };
    };

    // The echoes exist only on the split leg. Writing them here, outside the
    // branch, means seeking backwards past the gate cannot leave them behind
    // — every value in this film is a function of t and nothing is inherited.
    if (t < 5.4) {
      for (const e of echoes) scene.set(e, { opacity: '0' });
    }
    // Forward run 0→1, held at 1 (the gate), forward 1→0 again, then back.
    const uBefore = pTravel;
    const uAfter = pAfter;
    const uTotal = lerp(uBefore, uAfter * 0.999 + 0.001, pSplit);

    let pos;
    if (t < 4.6) {
      pos = segAt(uBefore);
      const w = outQuart(seg(t, 1.8, 2.6));
      scene.set(pulse, {
        x: (pos.x - 34).toFixed(1), y: (pos.y - 34).toFixed(1),
        fill: PALETTE.bone, opacity: w.toFixed(3),
      });
    } else if (t < 5.6) {
      // Held. The person has not decided yet.
      pos = segAt(1);
      const w = 1;
      scene.set(pulse, {
        x: (pos.x - 34).toFixed(1), y: (pos.y - 34).toFixed(1),
        fill: LIVE, opacity: (w * (0.6 + 0.4 * Math.abs(Math.sin(t * 5)))).toFixed(3),
      });
    } else {
      const u = lerp(0.999, 1.0, pReturn) * 0.999;
      const back = 1 - outCubic(seg(t, 12.0, 14.4));
      const uu = lerp(uAfter, 0.0, back);
      pos = segAt(uu);
      scene.set(pulse, {
        x: (pos.x - 34).toFixed(1), y: (pos.y - 34).toFixed(1),
        fill: PALETTE.bone, opacity: (1 - outCubic(seg(t, 13.4, 14.2))).toFixed(3),
      });
      // The three echoes spread on the long leg and merge back on the last.
      echoes.forEach((e, i) => {
        const spread = pSplit * (1 - pReturn);
        const off = (i - 1) * 46 * spread;
        scene.set(e, {
          x: (pos.x - 17 + off).toFixed(1),
          y: (pos.y - 17 - Math.abs(i - 1) * 26 * spread).toFixed(1),
          opacity: (spread * (1 - pReturn) * 0.75).toFixed(3),
        });
      });
    }

    scene.set(trail, {
      d: `M${STATION_PTS[0].x} ${STATION_PTS[0].y} L${pos.x.toFixed(1)} ${pos.y.toFixed(1)}`,
      opacity: (outCubic(seg(t, 2.2, 3.0)) * 0.35 * fade).toFixed(3),
    });
    return t;
  };
}

export default { meta, build };