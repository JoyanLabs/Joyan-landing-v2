/**
 * F4 — 03 CONECTADOS: la frescura del dato.
 *
 * Source of truth: joyanlabs-plan/docs/JOYAN_DIRECTION_2026.md §5 — the world
 *   state is recorded deterministically, never inferred. Section copy: "Un
 *   dato viejo con apariencia de dato actual es un riesgo."
 *
 * CONCEPT: Signals arrive carrying their own clock. As they age they lose their
 *   link, and the oldest one goes dark instead of pretending to be current.
 *
 * CARRY: each signal keeps its timestamp when it drops. A signal that ages out
 *   does not vanish; it stays dashed and dimmed, which is what "old data that
 *   still looks like data" actually looks like.
 *
 * COLOUR: amber is live. Only a live signal is amber, so as they age the
 *   lights go out one by one — the semantic rule does the storytelling.
 */

import {
  PALETTE, LIVE, DEAD, clamp, seg, arrive, land, outQuart, outCubic, outExpo, lerp,
} from '../lib.js';

export const meta = {
  id: 'F4',
  file: 'signal-freshness',
  title: 'F4 · la frescura del dato',
  width: 1920,
  height: 1080,
  duration: 15,
  fps: 30,
  focal: { x: 1180, y: 540 },
  quiet: [[0.0, 1.5], [13.4, 15.0]],
  hits: [1.9, 2.4, 2.9, 3.4, 3.9, 4.4, 4.9, 9.4],
  camera: [
    [0.0, 1.0, 1180, 540],
    [1.6, 1.0, 1180, 540],
    [4.6, 1.06, 1180, 540],
    [9.4, 1.14, 1180, 540],
    [11.6, 1.18, 1180, 540],
    [13.0, 1.03, 1180, 540],
    [13.6, 1.0, 1180, 540],
    [15.0, 1.0, 1180, 540],
  ],
  beats: [
    { key: 'rest', t0: 0.0, t1: 1.6 },
    { key: 'arrive', t0: 1.6, t1: 4.6 },
    { key: 'link', t0: 4.6, t1: 7.4 },
    { key: 'decay', t0: 7.4, t1: 11.6 },
    { key: 'snap', t0: 11.6, t1: 12.5 },
    { key: 'loop', t0: 12.5, t1: 15.0 },
  ],
};

const CORE = { x: 1180, y: 540 };
const SATS = 7;
const RADIUS = 400;
const AGE_START = 2.4; // when the first signal stops being current

const nodes = Array.from({ length: SATS }, (_, i) => {
  const a = (-90 + i * (360 / SATS)) * (Math.PI / 180);
  return { x: CORE.x + Math.cos(a) * RADIUS, y: CORE.y + Math.sin(a) * RADIUS, i };
});

export function build(scene) {
  scene.ground();
  const grid = scene.grid({ alpha: 0.18 });
  const edges = scene.add('g', {});
  const nodesLayer = scene.add('g', {});
  const ticks = scene.add('g', {});

  const core = scene.add('circle', {
    cx: CORE.x, cy: CORE.y, r: 74, fill: PALETTE.ink900,
    stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 1.5,
    'vector-effect': 'non-scaling-stroke',
  });
  const coreInner = scene.add('rect', {
    x: CORE.x - 20, y: CORE.y - 20, width: 40, height: 40, fill: PALETTE.bone,
  });

  const satEls = nodes.map((n) =>
    nodesLayer.appendChild(
      scene.el('circle', {
        cx: n.x, cy: n.y, r: 26, fill: PALETTE.ink900,
        stroke: LIVE, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', opacity: 0,
      })
    )
  );
  const edgeEls = nodes.map((n, i) =>
    edges.appendChild(
      scene.el('line', {
        x1: CORE.x, y1: CORE.y, x2: n.x, y2: n.y,
        stroke: LIVE, 'stroke-width': 1.5,
        'vector-effect': 'non-scaling-stroke', opacity: 0,
      })
    )
  );
  // A clock tick that advances while the signal is current and freezes when
  // it is not. It never rewinds, so a stale signal still carries its age.
  const tickEls = nodes.map((n) =>
    ticks.appendChild(
      scene.el('line', {
        x1: n.x, y2: n.y, stroke: PALETTE.bone, 'stroke-width': 2,
        'vector-effect': 'non-scaling-stroke', opacity: 0,
      })
    )
  );

  return (t) => {
    scene.set(grid, { opacity: '0.32' });
    const fade = 1 - outCubic(seg(t, 12.6, 13.8));

    for (let i = 0; i < SATS; i++) {
      const n = nodes[i];
      const born = 1.9 + i * 0.3;
      const inP = land(seg(t, born, born + 0.5), 2.6, 0.5);
      // Current for a while, then ages out and stays visibly old.
      const staleAt = AGE_START + i * 0.75;
      const stale = outQuart(seg(t, staleAt, staleAt + 0.8));

      scene.set(satEls[i], {
        r: (26 * (0.2 + 0.8 * inP)).toFixed(1),
        fill: stale > 0.5 ? PALETTE.ink900 : PALETTE.ink900,
        stroke: stale > 0.5 ? DEAD : LIVE,
        'stroke-width': stale > 0.5 ? 1.5 : 2,
        'stroke-dasharray': stale > 0.5 ? '5 5' : 'none',
        opacity: (clamp(inP * 1.4) * fade).toFixed(3),
      });

      const link = outCubic(seg(t, born + 0.35, born + 1.0));
      const breakP = outQuart(seg(t, staleAt + 0.35, staleAt + 1.1));
      const len = Math.hypot(n.x - CORE.x, n.y - CORE.y);
      scene.set(edgeEls[i], {
        x2: lerp(CORE.x, n.x, link * (1 - breakP)).toFixed(1),
        y2: lerp(CORE.y, n.y, link * (1 - breakP)).toFixed(1),
        stroke: stale > 0.5 ? DEAD : LIVE,
        'stroke-dasharray': stale > 0.5 ? '4 7' : 'none',
        opacity: (link * (1 - breakP * 0.85) * 0.8 * fade).toFixed(3),
      });

      // The tick sweeps a quarter-circle while live, then stops dead.
      const sweep = clamp((t - born) * 1.1);
      const frozen = Math.min(sweep, staleAt - born + 0.6);
      const ang = (-Math.PI / 2) + clamp(frozen, 0, Math.PI * 1.2);
      const rr = 40;
      scene.set(tickEls[i], {
        x1: (n.x + Math.cos(ang) * rr).toFixed(1),
        y1: (n.y + Math.sin(ang) * rr).toFixed(1),
        opacity: (clamp(inP * 1.4) * (stale > 0.5 ? 0.35 : 0.8) * fade).toFixed(3),
      });
    }

    // The core is the system, not a signal: it does not age, and it never
    // changes colour. An earlier version dimmed it when everything around it
    // went stale, which left the last frame bone and the first frame grey —
    // a 131/255 loop seam from a single line.
    scene.set(core, { opacity: '1' });
    scene.set(coreInner, { opacity: '1' });
    return t;
  };
}

export default { meta, build };