/**
 * LINK BEHAVIOURS — the four conductas of `odd/tasks/pieza-completa-constelaciones.md`
 * (S4, S7) over the 52 links of the approved piece `design-studies/v1/`.
 * ============================================================================
 * S4: «las lineas que unen las estrellas quizas podria no todo el tiempo estar
 * solidas». The links of the hero stop being always-solid and take one of four
 * behaviours, each with its own observable value. S7: the links ARE the
 * constellation, so the same web has to change when a node is focused and stay
 * alive when it is not.
 *
 * WHY THIS FILE EXISTS, and what it does NOT do. The composition, the palette,
 * the node centres, the parallax rates, the vignette and the 0.8 px blur belong
 * to the approved piece and are not touched here. This module only decides how
 * much of a link is drawn, at what weight, at cycle position `p`. It never
 * touches the DOM, so the page and `scripts/checks/check-link-behaviours.mjs`
 * read the SAME definition and cannot drift.
 *
 * The four behaviours (the vocabulary and the envelopes are the ones already
 * defined in `scripts/scene-src/constellation.mjs`, which is imported, not
 * re-implemented):
 *
 *   breathe  the stroke lights in TRAMOS stretches that travel along the link
 *            and go out again. Rendered here as a travelling dash pattern (same
 *            frequency `TRAMOS`, same travel: one period per cycle, same phase
 *            convention as `breatheAlong`) under a link envelope that is
 *            exactly 0 at both ends of that link's own loop.
 *   trace    the stroke is drawn from origin to destination. This is NOT a
 *            second travelling signal: the piece already has one (the `.signal`
 *            dot of `v1.mjs`, 3.0 s → 5.4 s of a 12 s cycle). `traceWindow` is
 *            that same window and `traceEnvelope`/`traceProgress` are the
 *            library's own shapes, so the link is drawn exactly where and while
 *            the dot travels it.
 *   depth    opacity and thickness come from the plane and nothing else — no
 *            animation at all, and the far links barely read.
 *   focus    when a node is active, only its group's links stay solid; the rest
 *            fades to FOCUS_FADE. A link belongs to the group when either of
 *            its endpoints does — the group AND its amarres, not only the edges
 *            that fall entirely inside it, or a 2-star group would keep a single
 *            line and the focus would dissolve the constellation instead of
 *            affirming a part of it. This composes with the piece's plane
 *            cooling instead of replacing it: the group keeps its plane weight,
 *            the rest keeps its behaviour at a fraction of it.
 *
 * ENVELOPES. Every animated behaviour is multiplied by an envelope that is
 * exactly zero at both ends of its own loop — `sin(πq)` for `breathe` on the
 * link's phase, `sin(π·at)` for `trace` on the signal's window — so the wrap is
 * invisible and nothing is remembered across it. `depth` has no envelope
 * because it has no animation, and `focus` is a state weight, not a loop.
 *
 * THE PLANE LADDER IS ANCHORED ON THE APPROVED HAIRLINE. The piece draws every
 * link at width 0.7 / opacity 0.65 (`v1.css`). The middle plane keeps exactly
 * those numbers and the far and near planes take their ratio from the piece's
 * own `PLANE_STYLE`, so `depth` spreads the existing hairline into three planes
 * instead of redrawing the figure at a new weight.
 */

import { EMISSIONS, NODE_PLANES, nodePlane } from './hero-field.mjs';
import { FOCUS_FADE, PLANE_STYLE, TRAMOS, traceEnvelope, traceProgress } from '../../scripts/scene-src/constellation.mjs';

/** The signal's cycle, in ms: the piece's own, 12 s (`diagnostics.signalCycleMs`). */
export const LINK_CYCLE_MS = 12000;
/** Where the existing `.signal` dot lives inside that cycle: delay and travel. */
export const TRACE_WINDOW = Object.freeze({ delay: 3000, travel: 2400 });

/** The approved hairline of the piece; the middle plane's link is exactly this. */
export const HAIRLINE = Object.freeze({ width: 0.7, opacity: 0.65 });

/** Phase used to spread the links' phases over [0,1): the golden ratio, so any
 * prefix of the edge list is already evenly covered. */
const PHASE_STEP = 0.6180339887498949;

/** Wrap a position into [0,1). Everything periodic here goes through it. */
export function wrap01(p) {
  const wrapped = p % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

/** The cycle position of a clock reading in ms. */
export function cyclePosition(ms) {
  return wrap01(ms / LINK_CYCLE_MS);
}

/** The per-link phase: deterministic, so a link breathes the same everywhere. */
export function linkPhase(index) {
  return wrap01(index * PHASE_STEP);
}

/**
 * The `breathe` geometry, in `pathLength="1"` units: `TRAMOS` lit stretches per
 * link, each a little longer than its gap, travelling one period per cycle.
 */
export const BREATH = Object.freeze({ period: 1 / TRAMOS, lit: 0.55 / TRAMOS });

/**
 * The plane ladder of a link, anchored on the approved hairline. The library's
 * ladder is 0.50 / 1.00 / 1.92 of the middle plane; applied raw, the far links
 * (31 of the 52) drop to half the approved hairline and the figure loses the web
 * that makes it read at a glance. Raised to `SPREAD` the far plane keeps 57 % of
 * the hairline and the near plane rises to 154 % (clamped at 1), so `depth`
 * reads as three planes without thinning the constellation: far 0.37 / 0.49,
 * mid 0.65 / 0.70 (the approved hairline), near 1.00 / 0.92.
 */
const SPREAD = 0.8;
const weight = (ratio) => ratio ** SPREAD;
const MID = PLANE_STYLE.mid;
export const PLANE_LINK = Object.freeze(Object.fromEntries(Object.entries(PLANE_STYLE).map(([plane, style]) => [
  plane,
  Object.freeze({
    width: HAIRLINE.width * weight(style.width / MID.width),
    opacity: Math.min(1, HAIRLINE.opacity * weight(style.opacity / MID.opacity)),
  }),
])));

const { NODES_PX, LINKS_PX } = EMISSIONS.dark;
const nodeAt = (point) => NODES_PX.findIndex(([x, y]) => x === point[0] && y === point[1]);

/**
 * The plane a link is drawn in: the farther of its two endpoints, because a
 * stroke between a near and a far star is read at the far star's weight.
 * Same rule as `resolveLinks` in the library.
 */
export function linkPlane(from, to) {
  return NODE_PLANES[Math.min(nodePlane(from), nodePlane(to))];
}

/** The 52 edges as data: endpoints resolved, plane, phase. One registry. */
export const LINKS = Object.freeze(LINKS_PX.map((edge, index) => {
  const from = nodeAt(edge[0]), to = nodeAt(edge[1]);
  return Object.freeze({ index, from, to, plane: linkPlane(from, to), phase: linkPhase(index) });
}));

/**
 * The edge the piece's signal travels: the same rule `v1.mjs` already used
 * (edge 48 with nothing focused, else the first edge of the focused node), so
 * integrating the trace did not move the dot.
 */
export function traceEdge(links, active) {
  if (active < 0) return 48;
  const at = links.findIndex((link) => link.from === active || link.to === active);
  return at < 0 ? 0 : at;
}

/**
 * The signal's window at cycle position `p`: `q` is the raw progress (outside
 * [0,1] the dot is not travelling), `at` is it clamped, `envelope` is the
 * library's `traceEnvelope` on the clamped progress — exactly 0 at both ends of
 * the traverse and 1 at its middle — and `drawn` the library's `traceProgress`.
 */
export function traceWindow(p) {
  const q = (wrap01(p) * LINK_CYCLE_MS - TRACE_WINDOW.delay) / TRACE_WINDOW.travel;
  const at = Math.min(1, Math.max(0, q));
  const inside = q >= 0 && q <= 1;
  return { q, at, inside, envelope: inside ? traceEnvelope(at) : 0, drawn: traceProgress(at) };
}

/**
 * Which behaviour a link takes right now. `state.active` is whether a node is
 * focused, `state.edge` the edge the signal is on, `link.inGroup` whether the
 * link belongs to the focused node's group (an endpoint in its rings).
 */
export function linkBehaviour(link, state = {}) {
  if (state.active && link.inGroup) return 'focus';
  if (link.index === state.edge) return 'trace';
  if (link.plane === 'far') return 'depth';
  return 'breathe';
}

/**
 * The visible style of one link at cycle position `p`.
 *
 * @returns {{behaviour: string, plane: string, width: number, opacity: number,
 *   dash: number[] | null, offset: number, drawn: number}} `width` and
 *   `opacity` in the piece's own units, `dash`/`offset` in `pathLength="1"`
 *   units, `drawn` the fraction of a traced link painted from `from` to `to`.
 * @param {object} link one entry of LINKS, plus `inGroup`
 * @param {number} p cycle position in [0,1)
 * @param {{active?: boolean, edge?: number, focusMix?: number}} [state]
 */
export function linkStyle(link, p, state = {}) {
  const plane = PLANE_LINK[link.plane] ?? PLANE_LINK.mid;
  const behaviour = linkBehaviour(link, state);
  // The focus weight: 1 in the group (or with nothing focused), FOCUS_FADE
  // outside it. `focusMix` lets the page ease it over the camera transition
  // (0 = the previous state, 1 = the new one) without a second definition.
  const mix = state.focusMix ?? 1;
  const fade = state.active && !link.inGroup ? 1 - (1 - FOCUS_FADE) * mix : 1;
  const base = { behaviour, plane: link.plane, width: plane.width, opacity: plane.opacity * fade, dash: null, offset: 0, drawn: 1 };
  if (behaviour === 'breathe') {
    const q = wrap01(p + link.phase);
    // The envelope is exactly 0 at both ends of the link's loop (q = 0 and
    // q = 1 are the same instant) and 1 at its crest.
    const envelope = Math.sin(Math.PI * q);
    return { ...base, opacity: plane.opacity * envelope * fade,
      dash: [BREATH.lit, BREATH.period - BREATH.lit], offset: -q * BREATH.period };
  }
  if (behaviour === 'trace') {
    const window = traceWindow(p);
    return { ...base, opacity: plane.opacity * window.envelope * fade,
      dash: window.inside ? [window.drawn, 2] : null, drawn: window.drawn };
  }
  // depth and focus: the plane's own weight, undashed, no animation.
  return base;
}
