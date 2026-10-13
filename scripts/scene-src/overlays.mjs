/**
 * ANIMATED OVERLAYS (WU18) — the life laid over the structure.
 * ============================================================================
 * The image supplies the structure; the overlay supplies the life. Every
 * overlay here is a PURE FUNCTION of (cell, time, base colour): no Math.random,
 * no accumulated state, no time read from the clock, so a frame is reproducible
 * exactly and the Node raster and the live canvas stay byte-identical.
 *
 * PERIODIC BY CONSTRUCTION — the WU15 lesson, applied twice over:
 *
 *   - every sinusoidal term has a period that DIVIDES the loop (twinkle: 6 s of
 *     a 30 s loop, five whole cycles), so `field(x, y, 0)` and
 *     `field(x, y, LOOP_SECONDS)` differ only by floating-point round-off;
 *   - every lattice drift travels a WHOLE NUMBER of noise wraps over the loop
 *     (aurora 9 wraps in x, grain 21 wraps in y, glimmer a whole number of
 *     sweeps), so at the end of the loop the sample lands on the SAME lattice
 *     point. The drift is added to the coordinate BEFORE the noise multiplies by
 *     its frequency, and `layeredNoise` scales each octave's wrap with that same
 *     frequency, which is what makes the wrap land exactly.
 *
 * What the checker asserts is the FIELD, never the frame index: `renderFrame`
 * wraps its index with a modulo, so comparing frame 0 with frame `cycleFrames`
 * would prove nothing at all. The checker evaluates the composed field at
 * `t=0` and `t=LOOP_SECONDS` per cell and per channel, and requires the seam to
 * be no worse than an ordinary adjacent frame step.
 *
 * The overlays are composable and order-independent in the sense that the
 * composed function is deterministic; the composition order is fixed here so
 * the runtime and the checker cannot apply a different order.
 */
import { hashNoise, layeredNoise } from './engine.mjs';

/** The loop every overlay assumes. A converted scene must use the same one. */
export const LOOP_SECONDS = 30;

/** Every overlay id, in composition order. WU22 adds the sweep family; WU26
 * adds warp FIRST, because its radial displacement re-samples the subject's
 * own field and every later overlay must compose over the displaced cells. */
export const OVERLAY_IDS = Object.freeze(['warp', 'stars', 'aurora', 'grain', 'glimmer', 'wash', 'shimmer']);

/** Human labels, for the laboratory's controls and the docs. */
export const OVERLAY_LABELS = Object.freeze({
  stars: 'twinkling stars (positions by hash, 6 s twinkle)',
  aurora: 'aurora curtains (9 whole lattice wraps per loop, WU19 tuned finer, subject-preserving)',
  grain: 'drifting grain (21 whole lattice wraps per loop)',
  glimmer: 'glimmer sweep (soft subject-preserving band, whole sweeps per loop, WU22 tuned)',
  wash: 'colour wash (a wide tinted band crosses the whole scene and fades through two hues, WU22)',
  shimmer: 'shimmer band (a narrow bright band with hash sparkle travels whole sweeps per loop, WU22)',
  warp: 'warp (light-speed in dots: discrete dot streaks on radial spokes leave a centre bloom, two whole trips per loop with a wide gaussian window — WU27 slower/wider — and the subject dots displace radially near the frame border, WU26)',
});

/**
 * Every overlay's authored constants, frozen. They are the values the runtime
 * and the checker both read, so "the overlay" is one thing and not two.
 */
export const OVERLAY_DEFAULTS = Object.freeze({
  stars: Object.freeze({ seed: 20261010, density: 0.055, twinkle: 0.9, period: 6,
    colour: Object.freeze([0.95, 0.97, 1]) }),
  // WU19 tuning, measured in docs/AUDITORIA-ESCENAS.md: the WU18 aurora read as
  // one ~1200-cell connected wash on a 200x100 grid (28.9% of cells shifted by
  // more than 0.12 of tone) and could submerge the subject. Finer octaves, a
  // finer lattice, a lower amplitude and subject-preserving blending bring the
  // wash down without losing the look the user praised.
  aurora: Object.freeze({ seed: 0x7a1, scaleX: 0.13, scaleY: 0.16, wrapsX: 9, wrapsY: 5,
    hueScale: 0.05, hueWraps: 4, octaves: 3, blend: 0.55, keep: 0.55 }),
  grain: Object.freeze({ seed: 0x6a1, scale: 0.34, wrapsY: 21, amount: 0.14 }),
  glimmer: Object.freeze({ seed: 0x9117, sweeps: 1, sigma: 0.09, intensity: 0.32,
    keep: 0.45, colour: Object.freeze([0.92, 0.95, 1]) }),
  // WU22 — the sweep family. Both travel a WHOLE number of sweeps per loop (the
  // wrapped-distance band of glimmer), so they are periodic by construction.
  // wash: a WIDE diagonal band (sigma 0.18 of the diagonal) tints the scene
  // toward one of two colours chosen by a slow hue noise with whole wraps, at a
  // strength that fades on bright structure (keep) so the subject survives.
  wash: Object.freeze({ seed: 0x21f2, sweeps: 1, sigma: 0.18, intensity: 0.4, keep: 0.5,
    colourA: Object.freeze([0.07, 0.55, 0.47]), colourB: Object.freeze([0.42, 0.36, 0.85]) }),
  // shimmer: a NARROW bright band (sigma 0.035) whose strength is modulated by
  // hash sparkle along the band, so it reads as glitter crossing the picture.
  shimmer: Object.freeze({ seed: 0x31d7, sweeps: 2, sigma: 0.035, intensity: 0.35, keep: 0.55,
    sparkle: 0.5, sparkleScale: 0.35, colour: Object.freeze([0.95, 0.96, 1]) }),
  // WU26 — warp: light-speed in our dot language. The centre is declared in
  // grid fractions; the streaks are DISCRETE dots: a cell lights up only if it
  // sits on one of the hash-selected radial spokes (dotted, not lines) AND its
  // wrapped radial distance to the travelling wavefront is inside the gaussian
  // window. The wavefront completes a WHOLE number of trips per loop (fract of
  // trips), so the seam is exact. The centre bloom is a dot cluster (a radial
  // gaussian over the hot bone of the page palette). Near the frame border the
  // subject's own dots displace radially: the overlay re-samples the BASE field
  // up to `edge.amount` cells inward, so the border content stretches outward
  // like the classic light-speed pull. Every colour is a joyan-page entry.
  // WU27 (user direction, after the WU26 honest judgement): SLOWER and WIDER —
  // two whole trips per 30 s loop instead of three, and the wavefront gaussian
  // widens sigma 0.05 -> 0.09, so the pulse reads as light-speed in motion
  // without competing with the star field. The seam stays exactly 0 (whole
  // trips, fract advance); re-measured by both checkers.
  warp: Object.freeze({ seed: 0x5af1, centre: Object.freeze([0.5, 0.46]), spokes: 48,
    spokeDensity: 0.5, dotFill: 0.55, rings: 24, trips: 2, sigma: 0.09, intensity: 0.6,
    keep: 0.35, bloom: Object.freeze({ radius: 0.05, intensity: 0.9 }),
    edge: Object.freeze({ start: 0.7, amount: 2.5 }),
    colour: Object.freeze([0.957, 0.949, 0.929]), hotColour: Object.freeze([1, 0.993, 0.973]),
    amberColour: Object.freeze([1, 0.69, 0]) }),
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
// Rec.709 luma weights for the subject-preserving aurora blend (WU19): the same
// published convention the engine's tone model uses, so "bright" means the same
// thing here as everywhere else in the engine.
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;
const smoothstep = (edge0, edge1, v) => {
  const k = clamp01((v - edge0) / (edge1 - edge0));
  return k * k * (3 - 2 * k);
};

/** The aurora curtain's own colours; the noise band picks between neighbours. */
const AURORA_COLOURS = Object.freeze([
  [0.18, 0.85, 0.72],
  [0.24, 0.55, 0.95],
  [0.62, 0.38, 0.95],
  [0.45, 0.95, 0.85],
]);

/** Wrap a fraction into [0, 1) so a sweep's position closes at the loop end. */
const fract = (v) => v - Math.floor(v);

/** TWINKLING STARS — star cells by hash, brightness by a whole-cycle sine. */
function starsOverlay(overrides) {
  const p = { ...OVERLAY_DEFAULTS.stars, ...overrides };
  const colour = p.colour;
  return {
    id: 'stars',
    label: OVERLAY_LABELS.stars,
    apply(x, y, t, base, ctx) {
      const pick = hashNoise(x, y, p.seed);
      if (pick > p.density) return base;
      const phase = hashNoise(x, y, p.seed + 1) * Math.PI * 2;
      // 30 / period whole cycles: the sine returns to the same value at the seam.
      const wave = 0.5 + 0.5 * Math.sin((Math.PI * 2 * t) / p.period + phase);
      const gain = p.twinkle * wave;
      const alpha = gain * (0.35 + 0.65 * hashNoise(x, y, p.seed + 2));
      return mix(base, colour, clamp01(alpha));
    },
  };
}

/** AURORA CURTAINS — the whole lattice drifts a whole number of wraps. */
function auroraOverlay(overrides) {
  const p = { ...OVERLAY_DEFAULTS.aurora, ...overrides };
  const driftX = (t) => (t / LOOP_SECONDS) * p.wrapsX;
  const driftY = (t) => (t / LOOP_SECONDS) * p.wrapsY;
  const driftHue = (t) => (t / LOOP_SECONDS) * p.hueWraps;
  return {
    id: 'aurora',
    label: OVERLAY_LABELS.aurora,
    apply(x, y, t, base, ctx) {
      const curtain = layeredNoise(x * p.scaleX + driftX(t), y * p.scaleY + driftY(t), p.seed,
        { octaves: p.octaves ?? 3, wrapX: p.wrapsX, wrapY: p.wrapsY });
      const hue = layeredNoise(x * p.hueScale + driftHue(t), y * p.hueScale, p.seed + 0x51,
        { octaves: 2, wrapX: p.hueWraps });
      const at = hue * AURORA_COLOURS.length;
      const i = Math.min(AURORA_COLOURS.length - 1, Math.floor(at));
      const j = (i + 1) % AURORA_COLOURS.length;
      const colour = mix(AURORA_COLOURS[i], AURORA_COLOURS[j], at - i);
      // Vertical banding: the curtain hangs from the top and fades downward.
      const vertical = 1 - 0.55 * (ctx.rows > 1 ? y / (ctx.rows - 1) : 0);
      // Subject-preserving blending (WU19, measured): a cell that already carries
      // a bright structure keeps `keep` more of itself per unit of brightness, so
      // the curtain washes the ground, not the drawing. The 0.55 knee is the tone
      // above which a cell reads as subject on our dark grounds.
      const lum = LUMA_R * base[0] + LUMA_G * base[1] + LUMA_B * base[2];
      const preserve = 1 - (p.keep ?? 0.5) * clamp01((lum - 0.55) / 0.45);
      const strength = smoothstep(0.52, 0.94, curtain) * vertical * p.blend * preserve;
      return mix(base, colour, clamp01(strength));
    },
  };
}

/** DRIFTING GRAIN — a lattice that wraps a whole number of times per loop. */
function grainOverlay(overrides) {
  const p = { ...OVERLAY_DEFAULTS.grain, ...overrides };
  return {
    id: 'grain',
    label: OVERLAY_LABELS.grain,
    apply(x, y, t, base) {
      const drift = (t / LOOP_SECONDS) * p.wrapsY;
      const noise = layeredNoise(x * p.scale, y * p.scale + drift, p.seed,
        { octaves: 2, wrapY: p.wrapsY });
      const lift = (noise - 0.5) * 2 * p.amount;
      return [clamp01(base[0] + lift), clamp01(base[1] + lift), clamp01(base[2] + lift)];
    },
  };
}

/** GLIMMER SWEEP — a diagonal band that crosses a whole number of times. WU22
 * tunes it: a softer, wider band at lower intensity, and subject-preserving so
 * the pass brightens the scene without blowing out the drawing's bright cells. */
function glimmerOverlay(overrides) {
  const p = { ...OVERLAY_DEFAULTS.glimmer, ...overrides };
  return {
    id: 'glimmer',
    label: OVERLAY_LABELS.glimmer,
    apply(x, y, t, base, ctx) {
      const position = fract((t / LOOP_SECONDS) * p.sweeps);
      const u = (x + y) / Math.max(1, ctx.cols + ctx.rows - 2);
      // The wrapped distance to the band, so the seam is not a jump.
      let d = fract(u - position + 0.5) - 0.5;
      const band = Math.exp(-(d * d) / (2 * p.sigma * p.sigma));
      // Subject-preserving (WU22): bright structure keeps itself, as the aurora does.
      const lum = LUMA_R * base[0] + LUMA_G * base[1] + LUMA_B * base[2];
      const preserve = 1 - (p.keep ?? 0) * clamp01((lum - 0.55) / 0.45);
      return mix(base, p.colour, clamp01(band * p.intensity * preserve));
    },
  };
}

/** COLOUR WASH (WU22) — a wide tinted band crossing whole sweeps per loop, its
 * hue moving between two aurora-adapted colours by a lattice noise with whole
 * wraps, so both the band's position and its hue are periodic by construction. */
function washOverlay(overrides) {
  const p = { ...OVERLAY_DEFAULTS.wash, ...overrides };
  return {
    id: 'wash',
    label: OVERLAY_LABELS.wash,
    apply(x, y, t, base, ctx) {
      const position = fract((t / LOOP_SECONDS) * p.sweeps);
      const u = (x + y) / Math.max(1, ctx.cols + ctx.rows - 2);
      let d = fract(u - position + 0.5) - 0.5;
      const band = Math.exp(-(d * d) / (2 * p.sigma * p.sigma));
      // The band's hue: a lattice that wraps a whole number of times per loop.
      const hue = layeredNoise(x * 0.04, y * 0.04 + (t / LOOP_SECONDS) * 2, p.seed,
        { octaves: 2, wrapY: 2 });
      const colour = mix(p.colourA, p.colourB, hue);
      const lum = LUMA_R * base[0] + LUMA_G * base[1] + LUMA_B * base[2];
      const preserve = 1 - (p.keep ?? 0) * clamp01((lum - 0.55) / 0.45);
      return mix(base, colour, clamp01(band * p.intensity * preserve));
    },
  };
}

/** SHIMMER BAND (WU22) — a narrow bright band with hash sparkle along it,
 * travelling a whole number of sweeps (two by default) per loop. */
function shimmerOverlay(overrides) {
  const p = { ...OVERLAY_DEFAULTS.shimmer, ...overrides };
  return {
    id: 'shimmer',
    label: OVERLAY_LABELS.shimmer,
    apply(x, y, t, base, ctx) {
      const position = fract((t / LOOP_SECONDS) * p.sweeps);
      const u = (x + y) / Math.max(1, ctx.cols + ctx.rows - 2);
      let d = fract(u - position + 0.5) - 0.5;
      const band = Math.exp(-(d * d) / (2 * p.sigma * p.sigma));
      // Sparkle along the band: a per-cell phase driven by a whole-cycle sine
      // (15 twinkle cycles per loop), so it is deterministic and periodic.
      const phase = hashNoise(x, y, p.seed) * Math.PI * 2;
      const sparkle = 1 - p.sparkle * (0.5 + 0.5 * Math.sin((Math.PI * 2 * 15 * t) / LOOP_SECONDS + phase));
      const lum = LUMA_R * base[0] + LUMA_G * base[1] + LUMA_B * base[2];
      const preserve = 1 - (p.keep ?? 0) * clamp01((lum - 0.55) / 0.45);
      return mix(base, p.colour, clamp01(band * p.intensity * sparkle * preserve));
    },
  };
}

/** WARP (WU26) — light-speed in dots. See OVERLAY_DEFAULTS.warp for the frozen
 * constants and the construction notes; the short version: dotted radial
 * streaks on hash spokes, a centre bloom, whole trips per loop, and an edge
 * displacement that re-samples the base field (never moves a painted cell). */
function warpOverlay(overrides) {
  const p = { ...OVERLAY_DEFAULTS.warp, ...overrides };
  return {
    id: 'warp',
    label: OVERLAY_LABELS.warp,
    apply(x, y, t, base, ctx) {
      const cx = p.centre[0] * (ctx.cols - 1);
      const cy = p.centre[1] * (ctx.rows - 1);
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const maxDist = Math.hypot(Math.max(cx, ctx.cols - 1 - cx), Math.max(cy, ctx.rows - 1 - cy)) || 1;
      const r = dist / maxDist;
      // Edge displacement: sample the base field INWARD along the radial
      // direction, so the border content stretches outward. The displacement
      // is static (time-free), quantised by the field's own integer cells, and
      // bounded by `edge.amount` cells at the frame border.
      let colour = base;
      if (ctx.sample && r > p.edge.start) {
        const pull = p.edge.amount * smoothstep(p.edge.start, 1, r);
        if (pull > 0 && dist > 0) {
          colour = ctx.sample(x - (dx / dist) * pull, y - (dy / dist) * pull);
        }
      }
      // The travelling wavefront: a WHOLE number of radial trips per loop.
      const front = fract((t / LOOP_SECONDS) * p.trips);
      // Discrete dotted streaks: the cell must sit on a hash-selected spoke
      // (radial path), be a dot on that spoke (dotted, not a line), and sit
      // inside the gaussian window of the wavefront at its own radius.
      const angle = Math.atan2(dy, dx);
      const spoke = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * p.spokes);
      const onSpoke = hashNoise(spoke, 0, p.seed) < p.spokeDensity;
      const isDot = hashNoise(x, y, p.seed + 1) < p.dotFill;
      let glow = 0;
      if (onSpoke && isDot) {
        const d = fract(r - front + 1) - 0.5;
        glow = Math.exp(-(d * d) / (2 * p.sigma * p.sigma)) * p.intensity;
      }
      // Centre bloom: a dot cluster of the hot bone, fading with radius.
      const bloom = Math.exp(-(r * r) / (2 * p.bloom.radius * p.bloom.radius)) * p.bloom.intensity;
      // Alternate spokes carry the amber so the burst stays in the page accent.
      const streakColour = spoke % 2 === 0 ? p.colour : p.amberColour;
      let out = colour;
      if (glow > 0) {
        const lum = LUMA_R * out[0] + LUMA_G * out[1] + LUMA_B * out[2];
        const preserve = 1 - p.keep * clamp01((lum - 0.55) / 0.45);
        out = mix(out, streakColour, clamp01(glow * preserve));
      }
      if (bloom > 0.02) {
        out = mix(out, p.hotColour, clamp01(bloom));
      }
      return out;
    },
  };
}

const BUILDERS = { warp: warpOverlay, stars: starsOverlay, aurora: auroraOverlay, grain: grainOverlay,
  glimmer: glimmerOverlay, wash: washOverlay, shimmer: shimmerOverlay };

/** Build one overlay by id. Throws on an unknown id rather than guessing. */
export function makeOverlay(id, overrides = {}) {
  const builder = BUILDERS[id];
  if (!builder) throw new Error(`unknown overlay: ${id}`);
  return builder(overrides[id] ?? overrides);
}

/**
 * Compose overlays over any scene, in the fixed catalogue order. The returned
 * object is a NEW scene: the engine caches derived metrics on the scene object,
 * so a composed scene must not mutate the base one. The palette, ground and
 * geometry are carried through untouched, so the composer never changes the
 * colour the engine may use.
 * @param {object} scene @param {string[]} ids @param {object} [overrides]
 */
export function withOverlays(scene, ids, overrides = {}) {
  const active = OVERLAY_IDS.filter((id) => ids.includes(id)).map((id) => makeOverlay(id, overrides));
  if (active.length === 0) return scene;
  const baseField = scene.field;
  const ctx = { cols: scene.cols, rows: scene.rows, loopSeconds: scene.cycleFrames / scene.fps };
  const field = (x, y, t) => {
    // `sample` lets a displacement overlay (warp) read the BASE field at a
    // shifted coordinate; it is the raw base only — later overlays in the
    // catalogue compose over the displaced result, in the fixed order.
    const ctxWithSample = { ...ctx, sample: (sx, sy) => baseField(sx, sy, t) };
    let colour = baseField(x, y, t);
    for (const overlay of active) colour = overlay.apply(x, y, t, colour, ctxWithSample);
    return colour;
  };
  return {
    ...scene,
    id: `${scene.id}[${active.map((overlay) => overlay.id).join('+')}]`,
    field,
    overlays: active.map((overlay) => overlay.id),
  };
}

/** The ids, parsed from a control value like `stars,aurora`, in catalogue order. */
export function parseOverlayIds(value) {
  const wanted = String(value ?? '').split(/[,+\s]+/).filter(Boolean);
  return OVERLAY_IDS.filter((id) => wanted.includes(id) || wanted.includes('all'));
}

/**
 * Apply one named treatment (a palette id and a list of overlay ids) to a scene.
 * The runtime and the checker both go through this ONE function, so the canvas
 * cannot apply a different palette or a different overlay set than the Node
 * expectation. The palette swap copies the scene because the engine caches
 * derived metrics on the scene object.
 * @param {object} scene @param {{palette?: string, overlays?: string[]}} treatment
 * @param {ReadonlyArray<{id: string, palette: readonly string[], ground: number}>} palettes
 */
export function applyTreatment(scene, treatment, palettes) {
  const preset = (palettes ?? []).find((entry) => entry.id === treatment.palette) ?? null;
  const based = preset && preset.palette
    ? { ...scene, palette: [...preset.palette], ground: preset.ground, groundHex: preset.palette[preset.ground] }
    : scene;
  return withOverlays(based, treatment.overlays ?? []);
}
