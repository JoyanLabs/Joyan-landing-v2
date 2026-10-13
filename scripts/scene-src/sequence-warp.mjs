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
 *   - `warpRampOverrides(s)`  the frozen warp constants scaled by s in [0,1]:
 *                         intensity, bloom intensity and edge amount. At s = 0
 *                         every warp contribution is exactly zero, so bucket 0
 *                         rasterises BYTE-IDENTICAL to the base scene (the
 *                         checker measures this) — the ramp starts ON the
 *                         public scene, not on a lookalike;
 *   - `sequenceScene(payload)`         the public scene, exactly (palette +
 *                         overlays through `applyTreatment`, the ONE function
 *                         the checker and the runtime both call);
 *   - `sequenceWarpScene(payload, s)`  the same scene with the engine's warp
 *                         overlay composed IN on top (warp first, per the
 *                         catalogue order), scaled to the bucket. The only
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

/** The quantised ramp: 13 discrete strengths over 3.6 s (the engine renders at
 * the scene's own 12 fps cadence; the buckets keep the number of scene objects
 * — and therefore of solved mask/sprite sets — small and bounded). */
export const WARP_RAMP = Object.freeze({ buckets: 12, durationMs: 3600 });

/** The warp's frozen constants, read once so the ramp cannot drift from them. */
const WARP_DEFAULTS = { intensity: 0.6, bloomRadius: 0.05, bloomIntensity: 0.9, edgeStart: 0.7, edgeAmount: 2.5 };

/**
 * The warp overrides for ramp position `s` in [0, 1]. Every contribution is
 * scaled by s, so s = 0 is the base scene and s = 1 is exactly the engine's
 * frozen warp. Pure and deterministic.
 * @param {number} s
 */
export function warpRampOverrides(s) {
  const k = s < 0 ? 0 : s > 1 ? 1 : s;
  return {
    intensity: WARP_DEFAULTS.intensity * k,
    bloom: { radius: WARP_DEFAULTS.bloomRadius, intensity: WARP_DEFAULTS.bloomIntensity * k },
    edge: { start: WARP_DEFAULTS.edgeStart, amount: WARP_DEFAULTS.edgeAmount * k },
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
 * @param {object} payload @param {number} s ramp position in [0, 1]
 */
export function sequenceWarpScene(payload, s) {
  if (!(s > 0)) return sequenceScene(payload);
  return withOverlays(paletteApplied(payload), [...BASE_OVERLAYS, 'warp'], { warp: warpRampOverrides(s) });
}
