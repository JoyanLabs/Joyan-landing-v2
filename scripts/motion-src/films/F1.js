/**
 * F1 — HERO: el modelo no es la variable.
 *
 * Source of truth: joyanlabs-plan/docs/architecture/HARNESS_ENGINEERING.md §1
 *   "Dos harnesses con el mismo modelo documentan hasta 6× de diferencia en
 *    precisión. El modelo es una variable más; el entorno que lo rodea es el
 *    proyecto."
 *
 * CONCEPT (one sentence about the picture, not about the product):
 *   Two agents drawn with the same glyph produce the same shape of result.
 *   One is surrounded by a harness and holds; the other is bare and does not.
 *
 * CARRY:
 *   rest → split     the single agent survives, and becomes the upper one
 *   split → harness  agent A is unchanged for the rest of the film
 *   harness → work   the box stays; B stays bare
 *   work → resolve   both produce the SAME shape; only B's comes apart
 *   resolve → loop   B and its result dissolve; A returns to t=0
 *
 * WHY IT IS SPLIT VERTICALLY: this film sits behind the hero copy, so the
 * left half of the frame is under a scrim. A vertical comparison keeps both
 * agents inside the visible right half and makes "wrapped / bare" readable
 * at a glance, which a side-by-side did not.
 *
 * COLOUR: amber appears once — on CONTROL, the gate system, which is the only
 * thing here that waits on a person.
 */

import {
  PALETTE, LIVE, DEAD, AGENT_R, AGENT_IN, COMPONENT_W, COMPONENT_H, STROKES,
  agentGlyph, clamp, seg, arrive, land, outQuart, outCubic, outExpo,
  lerp, inOutCubic,
} from '../lib.js';

export const meta = {
  id: 'F1',
  file: 'harness-outcome',
  width: 1920,
  height: 1080,
  duration: 15,
  fps: 30,
  focal: { x: 1250, y: 545 },
  title: 'F1 · el modelo no es la variable',
  quiet: [[0.0, 1.5], [13.4, 15.0]],
  hits: [2.2, 2.9, 4.2, 4.9, 5.6, 6.3, 7.0, 8.1],
  camera: [
    [0.0, 1.0, 1250, 545],
    [1.6, 1.0, 1250, 545],
    [3.6, 1.04, 1250, 545],
    [6.8, 1.08, 1250, 545],
    [7.6, 1.16, 1250, 560],
    [11.0, 1.14, 1250, 560],
    [13.2, 1.04, 1250, 545],
    [14.2, 1.0, 1250, 545],
    [15.0, 1.0, 1250, 545],
  ],
  // Beat lengths 1.6 / 2.0 / 3.2 / 0.8 / 3.4 / 4.0 s. The 0.8 s dwell on the
  // bare agent is the shortest thing in the film and the reason the rhythm
  // reads as uneven: a long look at the wrapped one, a clipped look at the
  // bare one.
  beats: [
    { key: 'rest', t0: 0.0, t1: 1.6 },
    { key: 'split', t0: 1.6, t1: 3.6 },
    { key: 'harness', t0: 3.6, t1: 6.8 },
    { key: 'bare', t0: 6.8, t1: 7.6 },
    { key: 'work', t0: 7.6, t1: 11.0 },
    { key: 'resolve', t0: 11.0, t1: 15.0 },
  ],
};

const A_UP = { x: 1250, y: 300 };
const A_HOME = { x: 1250, y: 545 };
const B_DOWN = { x: 1250, y: 800 };
const OUT_W = 320;
const OUT_H = 92;

/** The harness, in the order the canonical model lists its components. */
const PIECES = [
  ...[0, 1].map((i) => ({ g: 0, i })),      // IDENTIDAD    2
  ...[0, 1, 2, 3].map((i) => ({ g: 1, i })),  // CAPACIDADES 4
  ...[0, 1, 2, 3].map((i) => ({ g: 2, i })),  // CONTROL      4  <- amber, last
  ...[0, 1, 2].map((i) => ({ g: 3, i })),      // EVIDENCIA    3
];
const GROUP_AT = [3.8, 4.4, 5.9, 5.2];

/** Where each piece sits: a box drawn around A, one band per group. */
const BOX = {
  identidad: [[1100, 140], [1300, 140]],
  capacidades: [[990, 220], [990, 285], [990, 350], [990, 415]],
  control: [[1020, 470], [1150, 470], [1280, 470], [1410, 470]],
  evidencia: [[1510, 250], [1510, 320], [1510, 390]],
};
const SLOT = [...BOX.identidad, ...BOX.capacidades, ...BOX.control, ...BOX.evidencia];

export function build(scene) {
  scene.ground();
  const grid = scene.grid({ alpha: 0.2 });
  const harness = scene.add('g', {});
  const agents = scene.add('g', {});
  const results = scene.add('g', {});

  const makeAgent = () => {
    const a = agentGlyph(scene, agents, 0, 0);
    const halo = scene.el('circle', {
      r: AGENT_R, fill: 'none', stroke: PALETTE.bone, 'stroke-width': 1,
      'stroke-dasharray': '5 9', 'vector-effect': 'non-scaling-stroke', opacity: 0,
    });
    a.g.appendChild(halo);
    return { ...a, halo };
  };
  const a = makeAgent();
  const b = makeAgent();

  const pieces = PIECES.map((p) => {
    const isControl = p.g === 2;
    const [x, y] = SLOT[PIECES.indexOf(p)];
    const node = scene.el('rect', {
      x: x - COMPONENT_W / 2, y: y - COMPONENT_H / 2,
      width: COMPONENT_W, height: COMPONENT_H, fill: PALETTE.ink900,
      stroke: isControl ? LIVE : STROKES.component,
      'stroke-width': isControl ? 2.5 : 1.5,
      'vector-effect': 'non-scaling-stroke', opacity: 0,
    });
    harness.appendChild(node);
    return { node, isControl, g: p.g, i: p.i };
  });

  // Both agents produce the SAME shape. That is the comparison.
  const makeResult = (degraded) => {
    const g = scene.el('g', { opacity: 0 });
    results.appendChild(g);
    const body = scene.el('rect', {
      x: -OUT_W / 2, y: -OUT_H / 2, width: OUT_W, height: OUT_H,
      fill: degraded ? 'none' : PALETTE.bone,
      stroke: degraded ? DEAD : 'none',
      'stroke-width': degraded ? 2 : 0,
      'stroke-dasharray': degraded ? '9 8' : 'none',
      'vector-effect': 'non-scaling-stroke',
    });
    const shards = degraded
      ? Array.from({ length: 5 }, (_, i) => {
          const r = scene.el('rect', {
            x: -OUT_W / 2 + i * 70, y: -OUT_H / 2 - 26 - i * 9, width: 46, height: 14,
            fill: DEAD, opacity: 0,
          });
          g.appendChild(r);
          return r;
        })
      : [];
    g.appendChild(body);
    return { g, body, shards };
  };
  const resA = makeResult(false);
  const resB = makeResult(true);

  return (t) => {
    const pSplit = inOutCubic(seg(t, 1.6, 3.6));
    const bIn = land(seg(t, 1.8, 2.7), 2.4, 0.55);
    const bOut = outQuart(seg(t, 11.6, 13.0));
    // A never hides. It goes back down to where it started, which is what
    // makes the last frame equal the first. Hiding it left the final frame
    // empty: a 231/255 loop seam and 39 empty frames from one inverted term.
    const pHome = inOutCubic(seg(t, 11.8, 14.2));

    // Constant, not ramped. A ground that eases IN over the opening rest is a
    // ground that is not the same at the end, which is a loop seam.
    scene.set(grid, { opacity: '0.5' });

    // A travels up and splits off B. A itself never changes shape.
    const split = inOutCubic(seg(t, 1.6, 3.6));
    const home = inOutCubic(seg(t, 11.8, 14.2));
    const up = Math.max(0, split - home);
    place(scene, a, A_HOME.x, lerp(A_HOME.y, A_UP.y, up), 1, t, 7.6, 11.0);
    place(scene, b, B_DOWN.x, B_DOWN.y, bIn * (1 - bOut), t, 7.7, 11.0);

    // The box closes around A. CONTROL arrives last and is the only amber.
    for (const p of pieces) {
      const start = GROUP_AT[p.g] + p.i * 0.16;
      const v = arrive(seg(t, start, start + 0.5), 2.9, 1);
      scene.set(p.node, {
        opacity: (v * (1 - outCubic(seg(t, 11.6, 12.8)))).toFixed(3),
      });
    }

    // Work: A holds a solid result; B produces the same shape and it comes apart.
    const workA = arrive(seg(t, 7.6, 8.2), 2.6, 1);
    const fadeA = 1 - outCubic(seg(t, 11.4, 12.2));
    scene.set(resA.g, {
      transform: `translate(${A_UP.x} ${(A_UP.y + 150 * home + (A_HOME.y - A_UP.y) * 0).toFixed(1)})`,
      opacity: (workA * fadeA).toFixed(3),
    });
    scene.set(resA.body, { width: (OUT_W * workA).toFixed(1) });

    const workB = arrive(seg(t, 7.7, 8.3), 2.6, 1);
    scene.set(resB.g, {
      transform: `translate(${B_DOWN.x} ${B_DOWN.y + 150})`,
      opacity: (workB * (1 - bOut)).toFixed(3),
    });
    // B's shape comes apart: the shards drift off it before it dies.
    resB.shards.forEach((sh, i) => {
      const drift = outQuart(seg(t, 8.4 + i * 0.18, 10.6 + i * 0.18));
      scene.set(sh, {
        x: (-OUT_W / 2 + i * 70 + drift * 130).toFixed(1),
        y: (-OUT_H / 2 - 26 - i * 9 - drift * 46).toFixed(1),
        opacity: (outExpo(seg(t, 8.3 + i * 0.16, 8.7 + i * 0.16)) * (1 - drift)).toFixed(3),
      });
    });
    return t;
  };
}

function place(scene, ag, x, y, presence, t, tWork0, tWork1) {
  scene.set(ag.g, { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, opacity: presence.toFixed(3) });
  // Hidden agents still need complete state: an arbitrary seek must not
  // inherit ring or halo attributes from the last visible frame.
  // Periodic AND enveloped to zero before the end. Periodicity alone is not
  // enough: the last rendered frame is at t = duration - 1/fps, not duration,
  // so a sine that closes at t=15 is still 0.016 off at the frame that has to
  // match t=0. On a circle's shallow top edge that 0.4px radius change moves
  // the antialiased pixels enough to read as a seam.
  const envelope = 1 - clamp((t - 11.6) / 1.8);
  const breathe = 1 + Math.sin((t / 15) * Math.PI * 2) * 0.006 * envelope;
  scene.set(ag.ring, { r: (AGENT_R * breathe).toFixed(2) });
  const busy = outExpo(seg(t, tWork0, tWork0 + 0.7)) * (1 - outQuart(seg(t, tWork1, tWork1 + 0.8)));
  scene.set(ag.halo, {
    r: (AGENT_R * (1.3 + 0.1 * Math.sin((t / 15) * Math.PI * 2 * 3))).toFixed(2),
    opacity: (busy * 0.5).toFixed(3),
  });
}

export default { meta, build };
