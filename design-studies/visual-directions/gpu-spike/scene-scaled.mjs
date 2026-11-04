/**
 * The constellation tone model on a rescalable lattice.
 *
 * The shipped scene hardcodes W=480, H=300 in `baseTone`, `dustTier`, the halo
 * table and the events, so it can only be evaluated on its own 480 × 300 lattice.
 * The spike has to render the SAME scene at 1920 × 1200 (16× the cells), which
 * means evaluating the same expressions at fractional lattice coordinates. This
 * module does that by REUSING the scene's own private functions (exported by
 * `make-pinned.mjs` from a byte-identical snapshot) and dividing the lattice
 * coordinate by `scale` before anything else. Only the sky extraction and the
 * portable-noise variant are restated here; `verifyAgainstScene()` proves the
 * rest, and the scale-1 render is compared byte for byte against the scene's own
 * `renderFrame` output.
 *
 * LATTICE vs PHYSICAL CELLS: `scale` (S) is how many lattice cells sit on one
 * physical cell of the 480 × 300 scene. Distances, the halo reach, the comet and
 * the trail are PHYSICAL (they do not shrink or grow with resolution); dust and
 * twinkle are per LATTICE CELL (a cell is the sampling unit), so the 4× frame has
 * 16× the cells and 16× the dust stars at the same per-cell density.
 */
import {
  W, H, FPS, CYCLE, SECONDS, EVENT, DUST, TAIL_GAIN, TAIL_S, TAIL_P, COMA_R,
  BLINK_R, EASE, WANDER, eventEnvelope, wanderAt, trailTone, trailTable,
  brightness, baseTone, vignette, toneColor, NODES, NODE_GAIN, SKY_GAIN, TRAIL,
  constelacion2Scene, dynamicTone, forEachDynamicCell, hash as hashScene,
  vnoise as vnoiseScene, fbm as fbmScene, dustTier as dustTierScene,
} from './scene-pinned.generated.mjs';

export {
  W, H, FPS, CYCLE, SECONDS, EVENT, DUST, TAIL_GAIN, TAIL_S, TAIL_P, COMA_R,
  BLINK_R, EASE, WANDER, trailTable, toneColor, vignette, NODES, NODE_GAIN,
  SKY_GAIN, TRAIL, brightness, baseTone, forEachDynamicCell,
  constelacion2Scene,
};

export const TAU = Math.PI * 2;
export const PALETTE = constelacion2Scene.palette;
export const POSTER_FRAME = constelacion2Scene.posterFrame;
export const NODE_WEIGHT = NODES.map((_, i) => NODE_GAIN * (i % 3 === 0 ? 1 : 0.62));
export const HALO_SKIP = 1024;

// ------------------------------------------------------------------ the noise
const frac = (v) => v - Math.floor(v);

/** A portable integer hash: bit-identical in f32 WGSL and f64 JS, so the shader
 *  and this reference agree on every hash input instead of relying on `sin` of a
 *  six-digit argument, which f32 cannot carry. */
export function hashPortable(x, y) {
  let h = Math.imul(x | 0, 0x9e3779b1) ^ Math.imul(y | 0, 0x85ebca77) ^ 0x27d4eb2f;
  h >>>= 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h >>>= 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0x9e3779b1);
  h >>>= 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const hashSin = (x, y) => frac(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const bell = (d, s) => Math.exp(-(d * d) / (2 * s * s));

function makeNoise(hash) {
  const vnoise = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v)
      + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v;
  };
  const fbm = (x, y) => 0.55 * vnoise(x, y) + 0.28 * vnoise(x * 2.1, y * 2.1) + 0.17 * vnoise(x * 4.3, y * 4.3);
  const dustTier = (x, y) => {
    const h = hash(x, y);
    if (h > 0.9975) return 3;
    if (h > 0.988) return 2;
    if (h > 0.965) return 1;
    return 0;
  };
  return { hash, vnoise, fbm, dustTier };
}

export const NOISE = {
  asin: { hash: hashScene, vnoise: vnoiseScene, fbm: fbmScene, dustTier: dustTierScene },
  portable: makeNoise(hashPortable),
};

// ------------------------------------------------------------------ the model
/** The sky group as the scene computes it: `baseTone` minus the dust baseTone
 *  itself folded in. This is the REFERENCE the restated `skyTone` is checked
 *  against, so a transcription slip cannot hide inside a noise difference. */
export function skyAt(X, Y) {
  const tier = dustTierScene(X, Y);
  const base = baseTone(X, Y);
  return tier === 3 ? base : base - DUST[tier];
}

/** The sky group, restated (as the WGSL does) so it can be evaluated with either
 *  noise: the f64 sin hash, or the portable integer hash. The scene's isometric
 *  floor was removed upstream while this spike ran; this matches the snapshot. */
export function skyTone(u, v, fbm) {
  let sky = 0.006 + 0.010 * (1 - v);
  const bandD = Math.abs((u * 0.55 + v * 0.83) - 0.62) / 0.11;
  if (bandD < 1) {
    const cloud = fbm(u * 9, v * 9);
    sky += 0.075 * (1 - bandD) * (0.35 + 0.9 * cloud);
    if (cloud > 0.62) sky += 0.035 * (1 - bandD);
  }
  sky += 0.085 * bell(Math.hypot(u - 0.30, v - 0.30), 0.20) * (0.4 + 0.8 * fbm(u * 4 + 3, v * 4));
  sky += 0.070 * bell(Math.hypot(u - 0.72, v - 0.62), 0.24) * (0.4 + 0.8 * fbm(u * 4 + 11, v * 4 + 7));
  for (const [kx, ky, kr] of [[0.16, 0.72, 0.035], [0.84, 0.22, 0.030]]) {
    const d = Math.hypot(u - kx, v - ky);
    if (d < kr) sky += 0.10 * (1 - d / kr) ** 2 * (0.5 + 0.5 * fbm(u * 60, v * 60));
  }
  return sky * SKY_GAIN;
}

const twinkleAt = (x, y, t, noise) => {
  const b0 = noise.hash(x + 3, y + 7);
  const ph = noise.hash(x + 11, y + 5) * TAU;
  const cycles = 2 + Math.floor(b0 * 4);
  const tw = 0.5 + 0.5 * Math.sin(TAU * cycles * (t / SECONDS) + ph);
  return tw > 0.25 ? DUST[3] * (0.35 + 0.9 * tw) : 0;
};

/** The inverse-square halo, analytic in PHYSICAL cells. Equal to the scene's
 *  precomputed table at scale 1 (it is the same expression, same skip, same
 *  node order). */
export function haloAt(X, Y, t) {
  const b = brightness(t);
  let sum = 0;
  for (let i = 0; i < NODES.length; i++) {
    const dx = X - NODES[i][0] * W;
    const dy = Y - NODES[i][1] * H;
    const d2 = dx * dx + dy * dy;
    if (d2 > HALO_SKIP) continue;
    sum += NODE_WEIGHT[i] * (16 / (d2 + 4) + 7 / (d2 + 3)) * b[i];
  }
  return sum;
}

function tailBox(hx, hy) {
  const px = -EVENT.dir[1];
  const py = EVENT.dir[0];
  const tx = hx - EVENT.dir[0] * TAIL_S;
  const ty = hy - EVENT.dir[1] * TAIL_S;
  const xs = [hx, tx, hx + px * TAIL_P, hx - px * TAIL_P, tx + px * TAIL_P, tx - px * TAIL_P];
  const ys = [hy, ty, hy + py * TAIL_P, hy - py * TAIL_P, ty + py * TAIL_P, ty - py * TAIL_P];
  return [
    Math.min(...xs) - COMA_R, Math.max(...xs) + COMA_R,
    Math.min(...ys) - COMA_R, Math.max(...ys) + COMA_R,
  ];
}

export function tailBoxAt(hx, hy) { return tailBox(hx, hy); }

function eventAt(X, Y, t, noise) {
  const p = t / SECONDS;
  const a = TAU * p;
  let tone = 0;
  if (p > EVENT.s0 && p < EVENT.s1) {
    const q = (p - EVENT.s0) / (EVENT.s1 - EVENT.s0);
    const env = eventEnvelope(q);
    if (env > 0) {
      const hx = (EVENT.from[0] + q * (EVENT.to[0] - EVENT.from[0])) * W;
      const hy = (EVENT.from[1] + q * (EVENT.to[1] - EVENT.from[1])) * H;
      const box = tailBox(hx, hy);
      if (X >= box[0] && X <= box[1] && Y >= box[2] && Y <= box[3]) {
        const rx = X - hx;
        const ry = Y - hy;
        const coma = Math.exp(-Math.hypot(rx, ry) / 3.2) * 1.8;
        let dustTail = 0;
        const s = -(rx * EVENT.dir[0] + ry * EVENT.dir[1]);
        if (s > -1) {
          const sp = Math.max(0, s);
          const across = -rx * EVENT.dir[1] + ry * EVENT.dir[0];
          const pc = across - 0.006 * sp * sp;
          const w = 1.8 + 0.26 * sp;
          const streak = noise.fbm(sp * 0.05 - a, (pc / w) * 2.5);
          dustTail = Math.exp(-((pc / w) ** 2)) * Math.exp(-sp / 42) * (0.6 + 0.9 * streak);
        }
        tone += env * TAIL_GAIN * Math.max(coma, dustTail);
      }
    }
  }
  const at = wanderAt(p);
  const bx = at[0];
  const by = at[1];
  if (Math.abs(X - bx * W) <= BLINK_R && Math.abs(Y - by * H) <= BLINK_R) {
    const blink = 0.5 + 0.5 * Math.sin(a * 13);
    tone += 0.30 * blink * bell(Math.hypot(X / W - bx, Y / H - by), 0.0035);
  }
  return tone;
}

/** The trail is a quantised per-PHYSICAL-cell history plane, so a finer lattice
 *  reads its parent cell's value (the table has no sub-cell detail to lose). */
const trailAt = (X, Y, t) => trailTone(Math.floor(X), Math.floor(Y), t);

/** The model's terms, for diagnosing a port: same numbers `toneAt` sums. */
export function toneTerms(x, y, t, scale = 1, mode = 'asin') {
  const noise = NOISE[mode] ?? NOISE.asin;
  const X = x / scale;
  const Y = y / scale;
  const tier = noise.dustTier(x, y);
  const sky = skyTone(X / W, Y / H, noise.fbm);
  const dust = tier === 3 ? 0 : DUST[tier];
  const twinkle = tier === 3 ? twinkleAt(x, y, t, noise) : 0;
  const halo = haloAt(X, Y, t);
  const event = eventAt(X, Y, t, noise);
  const trail = trailAt(X, Y, t);
  const vig = vignette(X, Y);
  return { tier, sky, dust, twinkle, halo, event, trail, vig, total: (sky + dust + twinkle + halo + event + trail) * vig };
}

/** The whole tone model at one LATTICE cell of a (480·S) × (300·S) grid. */
export function toneAt(x, y, t, scale = 1, mode = 'asin') {
  const noise = NOISE[mode] ?? NOISE.asin;
  const X = x / scale;
  const Y = y / scale;
  const tier = noise.dustTier(x, y);
  let tone = skyTone(X / W, Y / H, noise.fbm);
  if (tier !== 3) tone += DUST[tier];
  else tone += twinkleAt(x, y, t, noise);
  tone += haloAt(X, Y, t) + eventAt(X, Y, t, noise) + trailAt(X, Y, t);
  return tone * vignette(X, Y);
}

/** The same model as a scene object the engine can render (`field` -> colour). */
export function makeScene(scale = 1, mode = 'asin') {
  return {
    id: `gpu-spike-${scale}x-${mode}`,
    label: `${W * scale} × ${H * scale} — ${mode}`,
    cols: W * scale,
    rows: H * scale,
    fps: FPS,
    cycleFrames: CYCLE,
    posterFrame: POSTER_FRAME,
    palette: PALETTE,
    ground: constelacion2Scene.ground,
    groundHex: constelacion2Scene.groundHex,
    params: { source: 'lab/scene-constelacion2.mjs (snapshot)', scale, mode, resolution: `${W * scale} × ${H * scale}` },
    field: (x, y, t) => toneColor(toneAt(x, y, t, scale, mode)),
  };
}

// --------------------------------------------------------------- verification
/**
 * 1 `noise` — the restated sin-hash noise equals the scene's own, so the
 *   portable variant differs only in the hash it uses.
 * 2 `tone` — at scale 1 the model equals the scene's own field (sky + dynamic,
 *   times the vignette), which is the gate that makes the 4× scene the same
 *   scene sampled finer rather than a different picture.
 */
export function verifyAgainstScene(frames = [0, 20, 71, 108, 143]) {
  let noiseMax = 0;
  for (let i = 0; i < 4000; i++) {
    const x = (i * 37) % W;
    const y = (i * 53) % H;
    noiseMax = Math.max(noiseMax, Math.abs(hashSin(x, y) - hashScene(x, y)));
  }
  // the portable noise must differ from the scene's (it is a different hash) and
  // the restated asin noise must not.
  const portableDiffers = Math.abs(NOISE.portable.hash(3, 5) - hashScene(3, 5)) > 1e-9;
  let skyMax = 0;
  let skyWorst = null;
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const d = Math.abs(skyTone(x / W, y / H, NOISE.asin.fbm) - skyAt(x, y));
      if (d > skyMax) { skyMax = d; skyWorst = [x, y]; }
    }
  }
  let toneMax = 0;
  let worst = null;
  for (let y = 0; y < H; y += 6) {
    for (let x = 0; x < W; x += 6) {
      const u = x / W;
      const v = y / H;
      let r = 0;
      let g = 0;
      let b = 0;
      for (const frame of frames) {
        const t = frame / FPS;
        const mine = toneAt(x, y, t, 1, 'asin');
        const theirs = (baseTone(x, y) + dynamicTone(x, y, t)) * vignette(x, y);
        const d = Math.abs(mine - theirs);
        if (d > toneMax) { toneMax = d; worst = [x, y, frame]; }
        const rgb = toneColor(theirs);
        r = Math.max(r, Math.abs(rgb[0] - toneColor(mine)[0]));
        g = Math.max(g, Math.abs(rgb[1] - toneColor(mine)[1]));
        b = Math.max(b, Math.abs(rgb[2] - toneColor(mine)[2]));
      }
      toneMax = Math.max(toneMax, Math.max(r, g, b));
    }
  }
  return { noiseMax, portableDiffers, skyMax, skyWorst, toneMax, worst };
}
