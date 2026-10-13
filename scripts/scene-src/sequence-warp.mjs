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
import { applyTreatment, withOverlays } from './overlays.mjs';

/** Same placement as the public page's HERO_ROLL (checker asserts equality). */
export const SEQUENCE_ROLL = 18;

/** The public page's overlay set — the transition only ADDS warp on top. */
export const BASE_OVERLAYS = Object.freeze(['stars', 'aurora', 'wash']);

/** The quantised ramp: STEPS + 1 discrete strengths (0..STEPS — twelve steps
 * yield thirteen scene states, the WU27 record correction) over 2.4 s (WU31:
 * the user judged the 3.6 s ramp too slow to read as an event — the whole arc
 * had to sit inside 7–9 s; the engine renders at the scene's own 12 fps
 * cadence; the discrete steps keep the number of scene objects — and therefore
 * of solved mask/sprite sets — small and bounded). */
export const WARP_RAMP = Object.freeze({ steps: 12, durationMs: 2400 });

/** The warp's frozen constants, read once so the ramp cannot drift from them. */
const WARP_DEFAULTS = { intensity: 0.6, bloomRadius: 0.05, bloomIntensity: 0.9, edgeStart: 0.7, edgeAmount: 2.5, sigma: 0.09 };

/** WU31 BURST — the user's correction: the WU29 reveal "ni se notó". The
 * reveal must be unmistakable IN MOTION and legible in a SINGLE frame, so the
 * ramp states near the arrival carry a burst profile: stronger streaks (the
 * frozen intensity plus a burst increment), a longer trail (the wavefront
 * gaussian widens from sigma 0.09 toward 0.16, so each spoke lights a wider
 * band of dots), a bigger, hotter centre bloom and a harder edge pull. The
 * burst is a property of the RAMP STATE (`rampBurst`), not of a phase flag,
 * so the live canvas, the Node checkers and the engine probe all derive the
 * same scene from the state number alone. It is exactly 0 at both ends — the
 * settled page is byte-identical to today's (checker-proven) — and peaks
 * mid-ramp where the arrival happens; the settle mirrors it on the way down. */
const WARP_BURST = Object.freeze({ intensity: 0.85, bloomRadius: 0.06, bloomIntensity: 1.6, edgeAmount: 3.5, sigma: 0.16 });

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
 * ramp actually visits); the burst then adds to intensity, bloom and edge and
 * widens the trail window. Pure and deterministic.
 * @param {number} s @param {number} [burst]
 */
export function warpRampOverrides(s, burst = 0) {
  const k = s < 0 ? 0 : s > 1 ? 1 : s;
  const b = burst < 0 ? 0 : burst > 1 ? 1 : burst;
  return {
    intensity: (WARP_DEFAULTS.intensity + WARP_BURST.intensity * b) * k,
    bloom: {
      radius: WARP_DEFAULTS.bloomRadius + WARP_BURST.bloomRadius * b,
      intensity: (WARP_DEFAULTS.bloomIntensity + WARP_BURST.bloomIntensity * b) * k,
    },
    edge: { start: WARP_DEFAULTS.edgeStart, amount: (WARP_DEFAULTS.edgeAmount + WARP_BURST.edgeAmount * b) * k },
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
