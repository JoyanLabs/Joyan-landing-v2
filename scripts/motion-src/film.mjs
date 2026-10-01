/**
 * JOYAN MOTION FILM — "El caret"
 * =================================
 *
 * One continuous take. Every beat grows out of the one before it.
 *
 * CONCEPT (one sentence about the picture, not the product):
 *   One amber block types a line, the line collapses into the grid the
 *   agents run on, the grid fills with signals, the signals converge into one
 *   lit node, the node unrolls into a field of data, and the field folds
 *   back into the same block. No letters, no logo, no lockup — the film is
 *   carried entirely by one block and hairlines.
 *
 * The loop closes: the last frame is the first frame. That is what makes the
 * film usable as a background video without a visible seam.
 *
 * CARRY (what survives each boundary — the thing being designed):
 *   rest      → writes    the caret block
 *   writes    → collapse  caret + typed line become the rule
 *   collapse  → grid      the rule becomes the grid's first line
 *   grid      → signals   the grid stays; a node lands on it
 *   signals   → converge  the 7 nodes stay; they slide inward
 *   converge  → field     the lit core unrolls into the field
 *   field     → resolve   the field stays; it folds back into one point
 *   resolve   → seal      that point becomes the caret again
 *
 * RHYTHM: shot lengths 2.2 / 1.7 / 0.7 / 3.6 / 2.4 / 2.0 / 1.4 / 1.0 s.
 * Longest/shortest = 5.14x (contract wants >= 4x, and warns on uniform
 * cadence). Two near-silent stretches: 0.0-2.2s and 14.0-15.0s. Small
 * elements on big ground throughout.
 *
 * DETERMINISM: every value is a pure function of `t`. No rAF, no timers, no
 * Math.random (the "hand-held" camera float is a fixed sum of sines). Seeking
 * to the same t twice produces the same frame, so a change is a one-line edit
 * plus a re-render.
 *
 * Contract source: docs/DESIGN.md (tokens, dither palette, the 7-node/6-edge
 * MAGI model, the single amber state, the 84px orbit radius, the 1px
 * hairlines, the mono terminal motif).
 */

// ---------------------------------------------------------------------------
// Beat sheet. Shared by the composition, the renderer and the probe.
// ---------------------------------------------------------------------------

export const FILM = {
  title: 'el-caret',
  width: 1920,
  height: 1080,
  duration: 15,
  fps: 30,
  beats: [
    { key: 'rest', t0: 0.0, t1: 2.2 },
    { key: 'writes', t0: 2.2, t1: 3.9 },
    { key: 'collapse', t0: 3.9, t1: 4.6 },
    { key: 'signals', t0: 4.6, t1: 8.2 },
    { key: 'converge', t0: 8.2, t1: 10.6 },
    { key: 'field', t0: 10.6, t1: 12.6 },
    { key: 'resolve', t0: 12.6, t1: 14.0 },
    { key: 'seal', t0: 14.0, t1: 15.0 },
  ],
  /**
   * Beats the film intends to be near-silent. A blinking caret on an empty
   * frame is the design, not a defect — so the focus check must not count
   * these frames as "the subject left the frame".
   */
  quiet: [
    { key: 'rest', t0: 0.0, t1: 2.2 },
    { key: 'seal-hold', t0: 14.6, t1: 15.0 },
  ],
};

/** The 7-node / 6-edge MAGI model. */
export const CORE = { x: 960, y: 540, orbit: 340, satellite: 24, coreIdle: 44, coreLit: 96 };

/** The line the caret types. It is also the rule and the grid's first line. */
export const TYPED = 'datos · contexto · acción';

// ---------------------------------------------------------------------------
// Move library. Closed-form, measured curves — never a hand-rolled ease.
// ---------------------------------------------------------------------------

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

/** Normalized progress through [t0, t1], clamped. */
export const seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0));

const C1 = 1.70158;
const C2 = C1 * 1.525;
const C3 = C1 + 1;
const C4 = (2 * Math.PI) / 3;
const C5 = (2 * Math.PI) / 4.5;

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
export const outBack = (p) => 1 + C3 * (p - 1) ** 3 + C1 * (p - 1) ** 2;
export const inOutBack = (p) =>
  p < 0.5
    ? ((2 * p) ** 2 * ((C2 + 1) * 2 * p - C2)) / 2
    : ((2 * p - 2) ** 2 * ((C2 + 1) * (p * 2 - 2) + C2) + 2) / 2;

/**
 * Critically damped spring, closed form. Settles without overshoot, which is
 * what makes a "contact" read as mass rather than as a bounce.
 */
export const spring = (p, freq = 3, damping = 1) => {
  if (p >= 1) return 1;
  if (p <= 0) return 0;
  return 1 - Math.exp(-damping * freq * p) * (1 + damping * freq * p);
};

/** Settles fast, overshoots once and comes back — for arrivals, not contacts. */
export const springBack = (p, freq = 2.4, damping = 0.55) => {
  if (p >= 1) return 1;
  if (p <= 0) return 0;
  const env = Math.exp(-damping * freq * p);
  return 1 - env * (Math.cos(freq * C4 * p) + (damping * C4) * Math.sin(freq * C4 * p));
};

/**
 * Damped oscillation burst, used for camera shake on contact. Deterministic.
 */
export const shake = (t, t0, freq = 26, decay = 7, amp = 1) => {
  const d = t - t0;
  if (d < 0) return 0;
  return amp * Math.exp(-decay * d) * Math.sin(freq * d);
};

/**
 * Hand-held float: a fixed sum of incommensurate sines. Pure function of t,
 * so it is reproducible — the point of "hand-held" is irregularity, not noise.
 */
export const float = (t, seed = 0) =>
  Math.sin(t * 0.73 + seed * 1.7) * 0.6 +
  Math.sin(t * 1.31 + seed * 2.9) * 0.3 +
  Math.sin(t * 2.17 + seed * 4.1) * 0.1;

/** Sum of any number of curve applications — used to stage a compound move. */
export const mix = (v) => v.reduce((a, b) => a * b, 1);

// ---------------------------------------------------------------------------
// Camera. One camera holds the whole film. It never cuts.
// ---------------------------------------------------------------------------

/**
 * Camera keyframes: [t, scale, x, y]. Interpolated with a smooth curve so the
 * push is continuous; the operator "leads" the subject by arriving slightly
 * ahead of the beat, which is what stops the move reading as a slideshow.
 *
 * The move has one idea: push in when the core ignites, then pull back out
 * for the collapse. The first draft pushed in to 2.35 and magnified the
 * dither past legibility.
 */
const CAM_KEYS = [
  [0.0, 1.0, 960, 540],
  [2.2, 1.0, 960, 540],
  [4.6, 1.04, 960, 540],
  [8.2, 1.12, 960, 540],
  [10.6, 1.55, 960, 540],
  [11.9, 1.24, 960, 540],
  [12.7, 1.0, 960, 540],
  [15.0, 1.0, 960, 540],
];

export function cameraAt(t) {
  let i = 0;
  while (i < CAM_KEYS.length - 2 && t > CAM_KEYS[i + 1][0]) i += 1;
  const [ta, sa, xa, ya] = CAM_KEYS[i];
  const [tb, sb, xb, yb] = CAM_KEYS[i + 1];
  const p = inOutCubic(seg(t, ta, tb));
  return { scale: sa + (sb - sa) * p, x: xa + (xb - xa) * p, y: ya + (yb - ya) * p };
}

/**
 * The film breathes: a continuous low-amplitude float plus a decaying shake
 * each time something lands hard. Both are pure functions of t.
 */
export function operatorAt(t) {
  const rests = [t < 2.2, t > 14.0];
  const still = rests[0] || rests[1];
  // Landing times: each satellite contact, then the core ignition.
  const hits = [5.15, 5.62, 6.09, 6.56, 7.03, 7.5, 9.9];
  let sx = 0;
  let sy = 0;
  for (const h of hits) {
    sx += shake(t, h, 24, 6.5, 1);
    sy += shake(t, h, 19, 7.5, 1) * 0.7;
  }
  const amp = still ? 0 : 1;
  return {
    x: (float(t, 1) * 3.1 + sx * 5.2) * amp,
    y: (float(t, 2) * 2.4 + sy * 4.0) * amp,
  };
}

// ---------------------------------------------------------------------------
// Node model. 7 nodes, 6 edges — the documented MAGI contract.
// ---------------------------------------------------------------------------

export const NODES = Array.from({ length: 7 }, (_, i) => {
  if (i === 0) return { x: CORE.x, y: CORE.y, kind: 'core' };
  const a = (-90 + (i - 1) * 60) * (Math.PI / 180);
  return { x: CORE.x + Math.cos(a) * CORE.orbit, y: CORE.y + Math.sin(a) * CORE.orbit, kind: 'sat' };
});

export const EDGES = Array.from({ length: 6 }, (_, i) => ({ from: 0, to: i + 1 }));

/** When each satellite touches down (drives the shake and the contact ring). */
export const LAND = [5.15, 5.62, 6.09, 6.56, 7.03, 7.5];

// ---------------------------------------------------------------------------
// Dither field. Bayer 8x8 two-value palette (docs/DESIGN.md).
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
