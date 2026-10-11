/**
 * JOYAN MOTION — shared library
 * ===============================
 *
 * Every film on this site is drawn with these primitives. They exist so that
 * five films read as ONE system rather than as five separate ideas: same
 * ground, same stroke weights, same five motion verbs, same timing grid.
 *
 * THE FIVE VERBS. A film may only use these. Nothing else is a motion.
 *
 *   llegar    (arrive)   a spring settles. Mass, not a bounce.
 *   degradar  (decay)    freshness is lost. Structure goes dashed and dim.
 *   detener   (halt)     a gate. Amber, and it does not move until a
 *                        person resolves it. This is the only amber that
 *                        means "waiting on a human".
 *   arrastrar (carry)    the thing that survives a beat boundary and
 *                        visibly becomes the next beat.
 *   dejar     (leave)    a trace. What stays on screen as evidence.
 *
 * COLOUR IS SEMANTIC, NOT DECORATIVE. Amber is reserved. It means: live,
 * pending a human, or halted. It is never used to fill space or to look
 * expensive. If nothing is live, nothing is amber.
 *
 * DETERMINISM. Every value is a pure function of t. No rAF, no timers, no
 * Math.random. Seeking to the same t twice gives the same frame.
 */

export const PALETTE = {
  ink: '#0b0b0c',
  ink900: '#121214',
  ink800: '#1a1a1d',
  bone: '#f4f2ed',
  bone100: '#e8e6e1',
  plomo: '#8a8a90',
  plomo500: '#6e6e73',
  accent: '#ffb000',
};

/** The reserved amber, at the strengths the films actually use. */
export const LIVE = PALETTE.accent;
export const LIVE_DIM = 'rgba(255,176,0,0.34)';
export const DEAD = PALETTE.plomo500;

// ---------------------------------------------------------------------------
// THE LEGEND
//
// A viewer has to read these films without a caption. That only works if one
// shape means one thing, everywhere. Before this the same concepts were drawn
// at four different sizes — the agent was r=64 in one film, r=58 in another,
// r=74 in a third; the gate diamond was 46 and then 38 — so nothing carried
// over between films and every frame needed its own explanation.
//
// The hero film (F1) is where the legend is taught: agent, the ring of
// components around it, and the amber gate. F3 then shows the same agent with
// the same gate MISSING, and it reads without any further explanation.
//
//   AGENT      a ring with a block inside  = something that works
//   COMPONENT  a small rect in a band     = one piece that makes it work
//   GATE       the amber diamond          = it stops and waits for a person
//   TRACE      a solid line that stays    = evidence, what was recorded
//   STALE      the same line, dashed      = no longer current
//
// AMBER IS RESERVED for the GATE and for what is live. Nothing else is amber.
// ---------------------------------------------------------------------------

export const AGENT_R = 60;
export const AGENT_IN = 30;
export const COMPONENT_W = 104;
export const COMPONENT_H = 24;
export const GATE_R = 38;
export const TRACE_H = 6;

export const STROKES = {
  agent: 'rgba(255,255,255,0.55)',
  component: 'rgba(255,255,255,0.55)',
  strong: 'rgba(255,255,255,0.75)',
};

/** The agent glyph. Identical in every film, at every size. */
export function agentGlyph(scene, parent, cx, cy, { r = AGENT_R } = {}) {
  const g = scene.el('g', { transform: `translate(${cx} ${cy})`, opacity: 0 });
  parent.appendChild(g);
  const ring = scene.el('circle', {
    r, fill: 'none', stroke: PALETTE.bone,
    'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke',
  });
  const inner = scene.el('rect', {
    x: -AGENT_IN / 2, y: -AGENT_IN / 2, width: AGENT_IN, height: AGENT_IN,
    fill: PALETTE.bone,
  });
  g.appendChild(ring);
  g.appendChild(inner);
  return { g, ring, inner };
}

/** The gate. The only amber shape in the legend. */
export function gateGlyph(scene, parent, cx, cy) {
  const g = scene.el('g', { transform: `translate(${cx} ${cy})`, opacity: 0 });
  parent.appendChild(g);
  const d = scene.el('path', {
    d: `M0 ${-GATE_R}L${GATE_R} 0 0 ${GATE_R} ${-GATE_R} 0Z`,
    fill: LIVE_DIM, stroke: LIVE, 'stroke-width': 2.5,
    'vector-effect': 'non-scaling-stroke',
  });
  g.appendChild(d);
  return { g, d };
}

// ---------------------------------------------------------------------------
// Moves. Closed-form and measured. No hand-rolled easings anywhere.
// ---------------------------------------------------------------------------

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, p) => a + (b - a) * p;
export const seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0));

export const linear = (p) => p;
export const inQuad = (p) => p * p;
export const outQuad = (p) => 1 - (1 - p) * (1 - p);
export const inOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
export const outCubic = (p) => 1 - (1 - p) ** 3;
export const inCubic = (p) => p * p * p;
export const outQuart = (p) => 1 - (1 - p) ** 4;
export const outExpo = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
export const inOutExpo = (p) =>
  p === 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2;

/** `llegar` — critically damped. Mass without overshoot. */
export const arrive = (p, freq = 3, damping = 1) => {
  if (p >= 1) return 1;
  if (p <= 0) return 0;
  return 1 - Math.exp(-damping * freq * p) * (1 + damping * freq * p);
};

/** One arrival that slightly overshoots and settles. For objects landing. */
export const land = (p, freq = 2.6, damping = 0.5) => {
  if (p >= 1) return 1;
  if (p <= 0) return 0;
  const env = Math.exp(-damping * freq * p);
  return 1 - env * (Math.cos(freq * 1.3613 * p) + damping * 1.3613 * Math.sin(freq * 1.3613 * p));
};

/** Damped burst on impact. */
export const impact = (t, t0, freq = 26, decay = 7, amp = 1) => {
  const d = t - t0;
  if (d < 0) return 0;
  return amp * Math.exp(-decay * d) * Math.sin(freq * d);
};

/** Hand-held operator: a fixed sum of incommensurate sines. Reproducible. */
export const float = (t, seed = 0) =>
  Math.sin(t * 0.73 + seed * 1.7) * 0.6 +
  Math.sin(t * 1.31 + seed * 2.9) * 0.3 +
  Math.sin(t * 2.17 + seed * 4.1) * 0.1;

// ---------------------------------------------------------------------------
// Bayer 8x8 — the two-value tone, the same generator the PNG assets use.
// ---------------------------------------------------------------------------

export const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

export const grain = (x, y) => {
  const s = Math.sin(x * 0.1271 + y * 0.3117) * 43758.5453123;
  return s - Math.floor(s);
};

// ---------------------------------------------------------------------------
// Camera. ONE camera holds a film; it never cuts. Films key their own track.
// ---------------------------------------------------------------------------

export function cameraAt(t, keys) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1][0]) i += 1;
  const [ta, sa, xa, ya] = keys[i];
  const [tb, sb, xb, yb] = keys[i + 1];
  const p = inOutCubic(seg(t, ta, tb));
  return { scale: sa + (sb - sa) * p, x: xa + (xb - xa) * p, y: ya + (yb - ya) * p };
}

/**
 * The operator breathes; it stops dead during declared rests.
 * `hits` are the film's impact times, passed explicitly: `t` is a number and
 * module scope is strict, so it cannot carry properties.
 */
export function operatorAt(t, quiet, hits = []) {
  const still = quiet.some(([a, b]) => t >= a && t < b);
  if (still) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const h of hits) {
    sx += impact(t, h, 24, 6.5, 1);
    sy += impact(t, h, 19, 7.5, 1) * 0.7;
  }
  return { x: float(t, 1) * 3.1 + sx * 5.2, y: float(t, 2) * 2.4 + sy * 4 };
}

// ---------------------------------------------------------------------------
// Scene. One world, built once, mutated by seek(t).
// ---------------------------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';

export function createScene({ width, height }) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('xmlns', NS);
  document.body.appendChild(svg);

  const cam = document.createElementNS(NS, 'g');
  svg.appendChild(cam);

  const el = (tag, attrs = {}) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const set = (n, attrs) => {
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  };

  const scene = {
    svg,
    cam,
    el,
    set,
    width,
    height,
    /** Everything lives inside the camera group, in film coordinates. */
    add(tag, attrs) {
      const n = el(tag, attrs);
      cam.appendChild(n);
      return n;
    },
    ground() {
      return this.add('rect', { x: 0, y: 0, width, height, fill: PALETTE.ink });
    },
    /** The world ground. Faint on purpose: films read through their ELEMENTS. */
    grid({ cell = 120, alpha = 0.24, strokeWidth = 1.25 } = {}) {
      const g = this.add('g', { opacity: 0 });
      const w = { stroke: `rgba(255,255,255,${alpha})`, 'stroke-width': strokeWidth, 'vector-effect': 'non-scaling-stroke' };
      for (let i = 0; i <= Math.round(width / cell); i++)
        g.appendChild(el('line', { x1: i * cell, y1: 0, x2: i * cell, y2: height, ...w }));
      for (let j = 0; j <= Math.round(height / cell); j++)
        g.appendChild(el('line', { x1: 0, y1: j * cell, x2: width, y2: j * cell, ...w }));
      return g;
    },
    /** A hairline edge. `dashed` marks the weaker links, as the diagram does. */
    edge(dashed = false) {
      return this.add('line', {
        stroke: 'rgba(255,255,255,0.45)',
        'stroke-width': 1.5,
        'vector-effect': 'non-scaling-stroke',
        'stroke-dasharray': dashed ? '6 7' : 'none',
        opacity: 0,
      });
    },
    /** A node: hollow, hairline. Exactly one film element may be amber. */
    node({ r = 14, fill = PALETTE.ink900, stroke = 'rgba(255,255,255,0.55)', width = 1.5 } = {}) {
      return this.add('circle', {
        r,
        fill,
        stroke,
        'stroke-width': width,
        'vector-effect': 'non-scaling-stroke',
        opacity: 0,
      });
    },
    /** A filled block. The one solid shape the films use. */
    block({ w = 28, h = 58, fill = PALETTE.accent } = {}) {
      return this.add('rect', { width: w, height: h, fill });
    },
    /** A gate: the only element that uses the diamond and the reserved amber. */
    gate({ r = 34 } = {}) {
      const g = this.add('g', { opacity: 0 });
      const d = el('path', {
        d: `M${r} 0l${r} ${r}-${r} ${r}-${r}-${r}z`,
        fill: LIVE_DIM,
        stroke: LIVE,
        'stroke-width': 2,
        'vector-effect': 'non-scaling-stroke',
      });
      g.appendChild(d);
      return { g, d };
    },
    /** A contact ring: cause is visible before the effect. */
    ring() {
      return this.add('circle', {
        fill: 'none',
        stroke: LIVE,
        'stroke-width': 2,
        'vector-effect': 'non-scaling-stroke',
        opacity: 0,
        r: 0,
      });
    },
    /** A dither field cell. Tone comes from the Bayer threshold, never a grey. */
    ditherField({ cols = 80, rows = 45, cell = 24 } = {}) {
      const g = this.add('g', { opacity: 0 });
      const cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rect = el('rect', { x: c * cell, y: r * cell, width: cell, height: cell, opacity: 0 });
          g.appendChild(rect);
          cells.push({
            rect,
            cx: c * cell + cell / 2,
            cy: r * cell + cell / 2,
            threshold: (BAYER8[r % 8][c % 8] + 0.5) / 64,
            grain: grain(c * cell + cell / 2, r * cell + cell / 2),
          });
        }
      }
      return { g, cells };
    },
  };
  return scene;
}

/** Draw an edge between two points, optionally only part of the way. */
export function link(e, ax, ay, bx, by, p) {
  e.setAttribute('x1', ax);
  e.setAttribute('y1', ay);
  e.setAttribute('x2', lerp(ax, bx, p));
  e.setAttribute('y2', lerp(ay, by, p));
}