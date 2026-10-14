/**
 * SEQUENCE WARP RAMP (WU27) — the act-1 → act-2 transition constants.
 * ============================================================================
 * The user rejected the standalone sequence prototype because its warp burst
 * was a SECOND renderer (a parallel particle canvas). The correction: the
 * transition must happen TO THE SCENE THE PUBLIC PAGE RENDERS — the same
 * serialised payload, the same grid, the same joyan-page palette, the same
 * overlays — with the ENGINE's own `warp` overlay ramping up over it. This
 * module is the ONE source of truth for that ramp:
 *
 *   - `SEQUENCE_ROLL`     the placement roll, equal to the public page's
 *                         HERO_ROLL, so the lab shows the same placed scene;
 *   - `BASE_OVERLAYS`     the public page's overlay set (stars, aurora, wash);
 *   - `WARP_RAMP`         the quantised ramp: BUCKETS discrete steps over
 *                         DURATION_MS, so a scene object is built once per
 *                         bucket (the engine caches masks/sprites per scene
 *                         object) and never rebuilt per frame;
 *   - `rampBurst(s)`      the WU31 burst strength of a ramp state (0 at both
 *                         ends, 1 mid-ramp) — see the constant block below;
 *   - `warpRampOverrides(s, b)`  the frozen warp constants scaled by s in
 *                         [0,1] and amplified by the burst b in [0,1]. At
 *                         s = 0 every warp contribution is exactly zero, so
 *                         bucket 0 rasterises BYTE-IDENTICAL to the base scene
 *                         (the checker measures this) — the ramp starts ON the
 *                         public scene, not on a lookalike;
 *   - `sequenceScene(payload)`         the public scene, exactly (palette +
 *                         overlays through `applyTreatment`, the ONE function
 *                         the checker and the runtime both call);
 *   - `sequenceWarpScene(payload, s, b)`  the same scene with the engine's warp
 *                         overlay composed IN on top (warp first, per the
 *                         catalogue order), scaled to the bucket and amplified
 *                         by the burst. The only
 *                         renderer downstream is `scripts/scene-src/engine.mjs`.
 *
 * Nothing here touches the DOM or a clock: pure functions over the payload, so
 * the Node checkers and the browser runtime run the same code.
 */
import { IMAGE_PALETTES, PAGE_PALETTE_ID, sceneFromSerialized } from './image-pipeline.mjs';
import { OVERLAY_DEFAULTS, applyTreatment, withOverlays } from './overlays.mjs';

/** Same placement as the public page's HERO_ROLL (checker asserts equality). */
export const SEQUENCE_ROLL = 18;

/** The public page's overlay set — the transition only ADDS warp on top.
 * WU32: the vignette joins the composition (the field falls off at the frame
 * edges; the settled composition changes with it, by the user's rejection of
 * the WU31 frames). */
export const BASE_OVERLAYS = Object.freeze(['stars', 'aurora', 'wash', 'vignette']);

/** The quantised ramp: STEPS + 1 discrete strengths (0..STEPS — twelve steps
 * yield thirteen scene states, the WU27 record correction) over 2.4 s (WU31:
 * the user judged the 3.6 s ramp too slow to read as an event — the whole arc
 * had to sit inside 7–9 s; the engine renders at the scene's own 12 fps
 * cadence; the discrete steps keep the number of scene objects — and therefore
 * of solved mask/sprite sets — small and bounded). */
export const WARP_RAMP = Object.freeze({ steps: 12, durationMs: 2400 });

/** The warp's frozen constants, read once so the ramp cannot drift from them.
 * WU32 — `edge` is gone: the pull is now GLOBAL (quadratic in the radius) and
 * the trails are its multi-tap shadow. `pullAmount` is the burst displacement
 * in cells at the frame corner radius; the base pull is 0 (no displacement
 * without the burst — the plain warp stays a wavefront on the scene). */
const WARP_DEFAULTS = { intensity: 0.6, bloomRadius: 0.028, bloomIntensity: 0.7, sigma: 0.09, pullAmount: 0 };

/** WU31 BURST — the user's correction: the WU29 reveal "ni se notó". The
 * reveal must be unmistakable IN MOTION and legible in a SINGLE frame, so the
 * ramp states near the arrival carry a burst profile. WU32 (the user rejected
 * the WU31 frames: the burst read as a grey smudge): the burst now drives the
 * DISPLACEMENT itself — at the peak the pull reaches ~14 cells at the frame
 * corner radius, so the subject's dots leave real radial streaks — and the
 * amber wavefront rides on those streaks. It is exactly 0 at both ends — the
 * settled page is the public composition (checker-proven) — and peaks
 * mid-ramp where the arrival happens; the settle mirrors it on the way down. */
const WARP_BURST = Object.freeze({ intensity: 0.85, bloomRadius: 0.022, bloomIntensity: 1.4, sigma: 0.16, pullAmount: 20 });

/** The burst strength at ramp state `s` in [0, steps]: a half sine over the
 * ramp, 0 at both ends and exactly 1 at the middle state. Pure, deterministic. */
export function rampBurst(state) {
  if (state <= 0 || state >= WARP_RAMP.steps) return 0;
  return Math.sin((Math.PI * state) / WARP_RAMP.steps);
}

/**
 * The warp overrides for ramp position `s` in [0, 1] and burst strength `b`
 * in [0, 1]. Every amplitude contribution is scaled by s, so s = 0 is the base
 * scene regardless of the burst (the burst only ever amplifies states the
 * ramp actually visits); the burst then adds to intensity, bloom and pull and
 * widens the trail window. WU32 — the pull gets a gentle onset (a smoothstep
 * on s: the displacement starts slow, then accelerates into the flash) and
 * the burst carries the displacement, so the arrival IS the streak event;
 * convergence is the settle back to 0. Pure and deterministic.
 * @param {number} s @param {number} [burst]
 */
export function warpRampOverrides(s, burst = 0) {
  const k = s < 0 ? 0 : s > 1 ? 1 : s;
  const b = burst < 0 ? 0 : burst > 1 ? 1 : burst;
  // Gentle onset: the smoothstep rises slowly, then accelerates — the ramp's
  // first third barely moves, the arrival third carries the event.
  const eased = k * k * (3 - 2 * k);
  return {
    intensity: (WARP_DEFAULTS.intensity + WARP_BURST.intensity * b) * k,
    bloom: {
      radius: WARP_DEFAULTS.bloomRadius + WARP_BURST.bloomRadius * b,
      intensity: (WARP_DEFAULTS.bloomIntensity + WARP_BURST.bloomIntensity * b) * k,
    },
    pull: {
      amount: (WARP_DEFAULTS.pullAmount + WARP_BURST.pullAmount * b) * eased,
      taps: 6,
    },
    sigma: WARP_DEFAULTS.sigma + (WARP_BURST.sigma - WARP_DEFAULTS.sigma) * b,
  };
}

/**
 * The palette-applied raw scene — exactly the first half of `applyTreatment`
 * (the palette swap), exposed so the warp variant can compose a DIFFERENT
 * overlay set over the SAME palette swap without composing the base overlays
 * twice. Mirrors `applyTreatment`'s own copy semantics.
 * @param {object} payload
 */
function paletteApplied(payload) {
  const raw = sceneFromSerialized(payload);
  const preset = IMAGE_PALETTES.find((entry) => entry.id === PAGE_PALETTE_ID) ?? null;
  return preset && preset.palette
    ? { ...raw, palette: [...preset.palette], ground: preset.ground, groundHex: preset.palette[preset.ground] }
    : raw;
}

/**
 * The scene the public page renders, from the SAME serialised payload: joyan-page
 * palette + stars/aurora/wash through `applyTreatment` — the one treatment path.
 * @param {object} payload the rolled serialised scene
 */
export function sequenceScene(payload) {
  return applyTreatment(sceneFromSerialized(payload),
    { palette: PAGE_PALETTE_ID, overlays: [...BASE_OVERLAYS] }, IMAGE_PALETTES);
}

/**
 * The public scene with the ENGINE's warp overlay ramped to bucket `s`. For
 * s <= 0 this IS `sequenceScene(payload)` (not a copy, not a lookalike — the
 * same composition, so the bytes agree by construction). For s > 0 the SAME
 * palette swap is composed with the base overlays PLUS warp (warp first, per
 * the catalogue order), so the ramp adds the engine overlay and nothing else.
 * The warp's colours are joyan-page entries by default.
 * @param {object} payload @param {number} s ramp position in [0, 1] @param {number} [burst] burst strength in [0, 1]
 */
export function sequenceWarpScene(payload, s, burst = 0) {
  if (!(s > 0)) return sequenceScene(payload);
  return withOverlays(paletteApplied(payload), [...BASE_OVERLAYS, 'warp'], { warp: warpRampOverrides(s, burst) });
}

// ---------------------------------------------------------------------------
// WU33 — THE HALFTONE MASK RAMP: the PUBLIC reveal.
// ---------------------------------------------------------------------------
// The user retired the warp burst from the public page and chose a HALFTONE
// reveal: a threshold mask that drives DOT COVERAGE so the scene assembles
// from the ramp upward — crisp, graphic, our own dot language, not a particle
// warp and not a soft bloom. The mechanism lives in the halftone overlay
// (overlays.mjs, last in the catalogue); THIS module is the one source of the
// public ramp constants and of the mask geometry, exactly as WARP_RAMP was for
// the retired burst:
//
//   - `MASK_RAMP`               the quantised public ramp: STEPS + 1 discrete
//                               states over DURATION_MS (same shape as
//                               WARP_RAMP, so the runtime builds one scene
//                               object per state and the engine's caches hold);
//   - `maskCentreFromPayload`   the SUBJECT centroid, computed deterministically
//                               from the serialised levels (the coverage-weighted
//                               centroid of inked cells), plus the radial max —
//                               the mask sweeps RADIALLY FROM THE SUBJECT;
//   - `maskGeometry`            the metric constants derived from that centre
//                               (one cell's metric span, the bloom band, the
//                               dither edge and the top-of-ramp position sMax);
//   - `maskFront`               the ease of the front (ease-out quad: the
//                               subject resolves immediately, the far rim
//                               finishes gently);
//   - `maskOverrides(p, geo)`   the frozen halftone constants at progress p —
//                               at p = 1 the front sits past every cell's worst
//                               dither, so the settled state is the base scene;
//   - `sequenceMaskScene`       the public scene with the halftone mask at a
//                               ramp STATE 0..steps. At the top state this IS
//                               `sequenceScene(payload)` (not a copy — the same
//                               composition, so the bytes agree by construction).
//
// The warp machinery above stays for the LAB (the /lab/sequence transition and
// the /lab/image page-warp treatment); the public page no longer references it.

/** The public reveal ramp (WU33): 13 discrete mask states over 2.4 s. */
export const MASK_RAMP = Object.freeze({ steps: 12, durationMs: 2400 });

/** The halftone defaults are frozen ONCE, in the overlay catalogue. */
const HALFTONE = OVERLAY_DEFAULTS.halftone;

/**
 * The mask centre: the SUBJECT's own centroid, pure from the serialised
 * levels (coverage-weighted, inked cells > 0.4), normalized to [0, 1] — and
 * the radial maximum from that centre, so the metric maps the frame to [0, 1].
 * Deterministic: the runtime and the checkers derive the same centre from the
 * same payload.
 * @param {object} payload the rolled serialised scene
 */
export function maskCentreFromPayload(payload) {
  const cols = payload.cols;
  const rows = payload.rows;
  const levels = sceneFromSerialized(payload).converted.levels8;
  let weight = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = levels[y * cols + x] / 255;
      if (v > 0.4) {
        weight += v;
        sx += x * v;
        sy += y * v;
      }
    }
  }
  const centre = weight > 0
    ? [sx / weight / (cols - 1), sy / weight / (rows - 1)]
    : [...HALFTONE.centre];
  const cx = centre[0] * (cols - 1);
  const cy = centre[1] * (rows - 1);
  const maxDist = Math.hypot(Math.max(cx, cols - 1 - cx), Math.max(cy, rows - 1 - cy)) || 1;
  return { centre, maxDist };
}

/**
 * The mask's metric constants for one payload: the metric span of one cell,
 * the bloom band (`growth` cells of ladder behind the front), the dither edge
 * (`edge` cells of Bayer jitter) and the top-of-ramp front position `sMax`.
 * `sMax` overshoots the farthest dithered cell by the FULL edge, so at the top
 * state every cell's resolve amount clamps to exactly 1 and the last mask
 * state hands over to the base scene without a visible pop.
 * @param {object} payload the rolled serialised scene
 */
export function maskGeometry(payload) {
  const geo = maskCentreFromPayload(payload);
  const cellMetric = 1 / geo.maxDist;
  const growthN = HALFTONE.growth * cellMetric;
  const edgeN = HALFTONE.edge * cellMetric;
  return { ...geo, cellMetric, growthN, edgeN, sMax: 1 + growthN + edgeN };
}

/** The ease of the mask front: ease-out quad — the subject resolves at once,
 * the far rim finishes gently. Pure, deterministic. @param {number} p progress in [0, 1] */
export function maskFront(p) {
  const k = p < 0 ? 0 : p > 1 ? 1 : p;
  return 1 - (1 - k) * (1 - k);
}

/**
 * The halftone overrides at ramp progress `p` in [0, 1] for a payload's
 * geometry. Pure and deterministic; the front position is the eased progress
 * times `sMax`, so p = 1 resolves every cell (the settled state is the base
 * scene byte for byte).
 * @param {number} p @param {object} geometry @param {string} [mode]
 */
export function maskOverrides(p, geometry, mode = HALFTONE.mode) {
  return {
    s: maskFront(p) * geometry.sMax,
    mode,
    centre: geometry.centre,
    growth: HALFTONE.growth,
    edge: HALFTONE.edge,
    accentIntensity: HALFTONE.accentIntensity,
    accentColour: [...HALFTONE.accentColour],
  };
}

/**
 * The public scene with the HALFTONE mask at ramp `state` 0..MASK_RAMP.steps.
 * State 0 resolves nothing (every cell at ground); at the top state this IS
 * `sequenceScene(payload)` — the settled page, byte-identical by construction.
 * `mode` selects the measured variant ('radial' shipped, 'wipe' rejected) for
 * the checkers' side-by-side measurement.
 * @param {object} payload @param {number} state @param {string} [mode]
 */
export function sequenceMaskScene(payload, state, mode = HALFTONE.mode) {
  const p = Math.max(0, Math.min(MASK_RAMP.steps, state)) / MASK_RAMP.steps;
  if (p >= 1) return sequenceScene(payload);
  return withOverlays(paletteApplied(payload), [...BASE_OVERLAYS, 'halftone'],
    { halftone: maskOverrides(p, maskGeometry(payload), mode) });
}
