/**
 * WGSL for the spike: one compute pass that selects a ramp step and a palette
 * ink per cell, and one fragment pass that paints those cells.
 *
 * The tone model is the scene's, restated in WGSL: the sky group (base, band,
 * nebulae, clusters — the isometric floor was removed from the scene while this
 * spike ran), the three dust tiers plus the twinkling tier, the inverse-square
 * node halo, the eased shooting star, the wandering light and its trail. Every
 * authoring constant the scene holds (event window, tail geometry, wander path,
 * trail scale, gains, palette) is uploaded rather than transcribed; only the sky
 * weights are written here, and the portable-mode pixel diff is what proves the
 * transcription.
 *
 * `PARAM_FIELDS` is the single source of truth for the params struct: the WGSL
 * struct is generated from it and `packParams` writes the same order, so the two
 * sides cannot drift.
 */

export const PARAM_FIELDS = [
  ['cols', 'u32'], ['rows', 'u32'], ['mode', 'u32'], ['frame', 'u32'],
  ['nodeCount', 'u32'], ['paletteCount', 'u32'], ['ladderCount', 'u32'], ['groundIndex', 'u32'],
  ['trailFrame', 'u32'], ['trailW', 'u32'], ['trailH', 'u32'], ['trailX0', 'u32'],
  ['trailY0', 'u32'],
  ['scale', 'f32'], ['t', 'f32'], ['fps', 'f32'], ['seconds', 'f32'],
  ['skyGain', 'f32'], ['minTone', 'f32'], ['maxTone', 'f32'], ['groundTone', 'f32'],
  ['haloSkip', 'f32'], ['trailScale', 'f32'],
  ['evS0', 'f32'], ['evS1', 'f32'], ['ease', 'f32'], ['evFromX', 'f32'],
  ['evFromY', 'f32'], ['evToX', 'f32'], ['evToY', 'f32'], ['evDirX', 'f32'],
  ['evDirY', 'f32'], ['tailGain', 'f32'], ['tailS', 'f32'], ['tailP', 'f32'],
  ['comaR', 'f32'], ['blinkR', 'f32'],
  ['wu0', 'f32'], ['wu1', 'f32'], ['wu2', 'f32'], ['wu3', 'f32'],
  ['wu4', 'f32'], ['wv0', 'f32'], ['wv1', 'f32'], ['wv2', 'f32'],
  ['wv3', 'f32'], ['wv4', 'f32'],
];

const struct = PARAM_FIELDS.map(([name, type]) => `  ${name}: ${type},`).join('\n');

export const WGSL = /* wgsl */ `
struct Params {
${struct}
};

// Six storage buffers and one texture: under the 8-per-stage default, so the
// pipeline runs on any WebGPU adapter without raising a limit.
@group(0) @binding(0) var<storage, read> P: Params;
@group(0) @binding(1) var<storage, read> palette: array<vec4f>;
@group(0) @binding(2) var<storage, read> consts: array<f32>;
@group(0) @binding(3) var<storage, read> nodes: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> stepsOut: array<u32>;
@group(0) @binding(5) var<storage, read_write> inksOut: array<u32>;
@group(0) @binding(6) var trailTex: texture_2d_array<u32>;
@group(0) @binding(7) var<storage, read_write> toneOut: array<f32>;

// consts bands: the engine's ladder, its measured coverage, the palette tones
// and the 1-px cell mask. Fixed 16-float slots keep the offsets stable.
const LADDER_OFF: u32 = 0u;
const COVERAGE_OFF: u32 = 16u;
const TONES_OFF: u32 = 32u;
const MASK_OFF: u32 = 48u;
fn ladder(i: u32) -> f32 { return consts[LADDER_OFF + i]; }
fn coverageAt(i: u32) -> f32 { return consts[COVERAGE_OFF + i]; }
fn tonesAt(i: u32) -> f32 { return consts[TONES_OFF + i]; }
fn maskAt(i: u32) -> f32 { return consts[MASK_OFF + i]; }

var<private> BAYER4 = array<u32, 16>(
  0u, 8u, 2u, 10u,
  12u, 4u, 14u, 6u,
  3u, 11u, 1u, 9u,
  15u, 7u, 13u, 5u,
);
var<private> DUSTV = array<f32, 4>(0.0, 0.028, 0.075, 0.20);
var<private> CLUSTERS = array<vec3f, 2>(vec3f(0.16, 0.72, 0.035), vec3f(0.84, 0.22, 0.030));

const FW: f32 = 480.0;
const FH: f32 = 300.0;
const TAU: f32 = 6.283185307179586;
const LUMA_R: f32 = 0.2126;
const LUMA_G: f32 = 0.7152;
const LUMA_B: f32 = 0.0722;

fn frac1(v: f32) -> f32 { return v - floor(v); }
fn hypot2(a: f32, b: f32) -> f32 { return sqrt(a * a + b * b); }
fn bell(d: f32, s: f32) -> f32 { return exp(-(d * d) / (2.0 * s * s)); }

// ---- noise: the scene's sin hash (mode 0) or a portable integer hash (mode 1)
fn hashSin(x: f32, y: f32) -> f32 {
  return frac1(sin(x * 127.1 + y * 311.7) * 43758.5453);
}

fn hashPortable(x: f32, y: f32) -> f32 {
  var h = (u32(i32(x)) * 0x9e3779b1u) ^ (u32(i32(y)) * 0x85ebca77u) ^ 0x27d4eb2fu;
  h = h ^ (h >> 15u);
  h = h * 0x2545f491u;
  h = h ^ (h >> 13u);
  h = h * 0x9e3779b1u;
  h = h ^ (h >> 16u);
  return f32(h) / 4294967296.0;
}

fn hashAt(x: f32, y: f32) -> f32 {
  if (P.mode == 1u) { return hashPortable(x, y); }
  return hashSin(x, y);
}

fn vnoise(x: f32, y: f32) -> f32 {
  let xi = floor(x);
  let yi = floor(y);
  let xf = x - xi;
  let yf = y - yi;
  let u = xf * xf * (3.0 - 2.0 * xf);
  let v = yf * yf * (3.0 - 2.0 * yf);
  let a = hashAt(xi, yi);
  let b = hashAt(xi + 1.0, yi);
  let c = hashAt(xi, yi + 1.0);
  let d = hashAt(xi + 1.0, yi + 1.0);
  return (a * (1.0 - u) + b * u) * (1.0 - v) + (c * (1.0 - u) + d * u) * v;
}

fn fbm(x: f32, y: f32) -> f32 {
  return 0.55 * vnoise(x, y) + 0.28 * vnoise(x * 2.1, y * 2.1) + 0.17 * vnoise(x * 4.3, y * 4.3);
}

fn dustTier(x: f32, y: f32) -> u32 {
  let h = hashAt(x, y);
  if (h > 0.9975) { return 3u; }
  if (h > 0.988) { return 2u; }
  if (h > 0.965) { return 1u; }
  return 0u;
}

// ---- the sky group, as authored (weights transcribed; see the header)
fn skyTone(u: f32, v: f32) -> f32 {
  var sky = 0.006 + 0.010 * (1.0 - v);
  let bandD = abs((u * 0.55 + v * 0.83) - 0.62) / 0.11;
  if (bandD < 1.0) {
    let cloud = fbm(u * 9.0, v * 9.0);
    sky += 0.075 * (1.0 - bandD) * (0.35 + 0.9 * cloud);
    if (cloud > 0.62) {
      sky += 0.035 * (1.0 - bandD);
    }
  }
  sky += 0.085 * bell(hypot2(u - 0.30, v - 0.30), 0.20) * (0.4 + 0.8 * fbm(u * 4.0 + 3.0, v * 4.0));
  sky += 0.070 * bell(hypot2(u - 0.72, v - 0.62), 0.24) * (0.4 + 0.8 * fbm(u * 4.0 + 11.0, v * 4.0 + 7.0));
  for (var i = 0u; i < 2u; i++) {
    let c = CLUSTERS[i];
    let d = hypot2(u - c.x, v - c.y);
    if (d < c.z) {
      let a = 1.0 - d / c.z;
      sky += 0.10 * a * a * (0.5 + 0.5 * fbm(u * 60.0, v * 60.0));
    }
  }
  return sky * P.skyGain;
}

fn twinkleAt(x: f32, y: f32, t: f32) -> f32 {
  let b0 = hashAt(x + 3.0, y + 7.0);
  let ph = hashAt(x + 11.0, y + 5.0) * TAU;
  let cycles = 2.0 + floor(b0 * 4.0);
  let tw = 0.5 + 0.5 * sin(TAU * cycles * (t / P.seconds) + ph);
  if (tw <= 0.25) { return 0.0; }
  return DUSTV[3] * (0.35 + 0.9 * tw);
}

fn haloAt(X: f32, Y: f32) -> f32 {
  var sum = 0.0;
  for (var i = 0u; i < P.nodeCount; i++) {
    let n = nodes[i];
    let dx = X - n.x * FW;
    let dy = Y - n.y * FH;
    let d2 = dx * dx + dy * dy;
    if (d2 > P.haloSkip) { continue; }
    sum += n.z * (16.0 / (d2 + 4.0) + 7.0 / (d2 + 3.0)) * n.w;
  }
  return sum;
}

fn envelope(q: f32) -> f32 {
  if (q <= 0.0 || q >= 1.0) { return 0.0; }
  let edge = min(1.0, min(q, 1.0 - q) / P.ease);
  return edge * edge * (3.0 - 2.0 * edge);
}

fn wanderU(p: f32) -> vec2f {
  let a = TAU * p;
  return vec2f(
    P.wu0 + P.wu1 * sin(a + P.wu2) + P.wu3 * sin(2.0 * a + P.wu4),
    P.wv0 + P.wv1 * sin(a + P.wv2) + P.wv3 * sin(2.0 * a + P.wv4),
  );
}

fn tailBox(hx: f32, hy: f32) -> vec4f {
  let dir = vec2f(P.evDirX, P.evDirY);
  let px = -dir.y;
  let py = dir.x;
  let tx = hx - dir.x * P.tailS;
  let ty = hy - dir.y * P.tailS;
  let xs = vec4f(hx, tx, hx + px * P.tailP, hx - px * P.tailP);
  let xs2 = vec2f(tx + px * P.tailP, tx - px * P.tailP);
  let ys = vec4f(hy, ty, hy + py * P.tailP, hy - py * P.tailP);
  let ys2 = vec2f(ty + py * P.tailP, ty - py * P.tailP);
  let minX = min(min(min(xs.x, xs.y), min(xs.z, xs.w)), min(xs2.x, xs2.y)) - P.comaR;
  let maxX = max(max(max(xs.x, xs.y), max(xs.z, xs.w)), max(xs2.x, xs2.y)) + P.comaR;
  let minY = min(min(min(ys.x, ys.y), min(ys.z, ys.w)), min(ys2.x, ys2.y)) - P.comaR;
  let maxY = max(max(max(ys.x, ys.y), max(ys.z, ys.w)), max(ys2.x, ys2.y)) + P.comaR;
  return vec4f(minX, maxX, minY, maxY);
}

fn eventAt(X: f32, Y: f32, t: f32) -> f32 {
  let p = t / P.seconds;
  let a = TAU * p;
  var tone = 0.0;
  if (p > P.evS0 && p < P.evS1) {
    let q = (p - P.evS0) / (P.evS1 - P.evS0);
    let env = envelope(q);
    if (env > 0.0) {
      let hx = (P.evFromX + q * (P.evToX - P.evFromX)) * FW;
      let hy = (P.evFromY + q * (P.evToY - P.evFromY)) * FH;
      let box = tailBox(hx, hy);
      if (X >= box.x && X <= box.y && Y >= box.z && Y <= box.w) {
        let rx = X - hx;
        let ry = Y - hy;
        let coma = exp(-hypot2(rx, ry) / 3.2) * 1.8;
        var dustTail = 0.0;
        let s = -(rx * P.evDirX + ry * P.evDirY);
        if (s > -1.0) {
          let sp = max(0.0, s);
          let across = -rx * P.evDirY + ry * P.evDirX;
          let pc = across - 0.006 * sp * sp;
          let w = 1.8 + 0.26 * sp;
          let streak = fbm(sp * 0.05 - a, (pc / w) * 2.5);
          let q2 = pc / w;
          dustTail = exp(-(q2 * q2)) * exp(-sp / 42.0) * (0.6 + 0.9 * streak);
        }
        tone += env * P.tailGain * max(coma, dustTail);
      }
    }
  }
  let at = wanderU(p);
  if (abs(X - at.x * FW) <= P.blinkR && abs(Y - at.y * FH) <= P.blinkR) {
    let blink = 0.5 + 0.5 * sin(a * 13.0);
    tone += 0.30 * blink * bell(hypot2(X / FW - at.x, Y / FH - at.y), 0.0035);
  }
  return tone;
}

fn trailAt(X: f32, Y: f32) -> f32 {
  let px = i32(floor(X)) - i32(P.trailX0);
  let py = i32(floor(Y)) - i32(P.trailY0);
  if (px < 0 || py < 0 || px >= i32(P.trailW) || py >= i32(P.trailH)) { return 0.0; }
  // a sampled texture load returns vec4 of the sample type; r8uint carries the
  // value in .x
  let q = textureLoad(trailTex, vec2i(px, py), i32(P.trailFrame), 0);
  return f32(q.x) / P.trailScale;
}

fn toneAt(x: f32, y: f32, t: f32) -> f32 {
  let X = x / P.scale;
  let Y = y / P.scale;
  let u = X / FW;
  let v = Y / FH;
  let tier = dustTier(x, y);
  let sky = skyTone(u, v);
  var tone = sky;
  if (tier != 3u) {
    tone += DUSTV[tier];
  } else {
    tone += twinkleAt(x, y, t);
  }
  let halo = haloAt(X, Y);
  let event = eventAt(X, Y, t);
  let trail = trailAt(X, Y);
  // TERM-LEVEL DEBUG: modes 2..4 return a partial sum BEFORE the vignette, so a
  // port can be checked term by term instead of only by its dithered output
  if (P.mode == 2u) { return sky; }
  if (P.mode == 3u) { return sky + halo; }
  tone += halo + event + trail;
  if (P.mode == 4u) { return tone; }
  // vignette: the frame closes at the edges
  let r = hypot2(u - 0.5, (v - 0.5) * 0.9);
  return tone * (1.0 - 0.45 * max(0.0, (r - 0.42) / 0.5));
}

fn toneColor(tone: f32) -> vec3f {
  let s = min(0.999, max(0.0, tone)) * f32(P.paletteCount - 1u);
  let i = u32(floor(s));
  let f = s - f32(i);
  let a = palette[i].rgb;
  let b = palette[min(P.paletteCount - 1u, i + 1u)].rgb;
  return a + (b - a) * f;
}

fn luma(rgb: vec3f) -> f32 {
  return LUMA_R * rgb.r + LUMA_G * rgb.g + LUMA_B * rgb.b;
}

fn bayerThreshold(x: u32, y: u32) -> f32 {
  return (f32(BAYER4[(y & 3u) * 4u + (x & 3u)]) + 0.5) / 16.0;
}

fn stepFor(level: f32, x: u32, y: u32) -> u32 {
  let last = P.ladderCount - 1u;
  var step = 0u;
  loop {
    if (step >= last) { break; }
    if (level < ladder(step + 1u)) { break; }
    step = step + 1u;
  }
  if (step == last) { return step; }
  let span = ladder(step + 1u) - ladder(step);
  var position = 1.0;
  if (span > 0.0) { position = (level - ladder(step)) / span; }
  if (position > bayerThreshold(x, y)) { return step + 1u; }
  return step;
}

fn compensate(rgb: vec3f, step: u32) -> u32 {
  let cov = coverageAt(step);
  let targetTone = luma(rgb);
  let wanted = P.groundTone + (targetTone - P.groundTone) * cov;
  var best = P.groundIndex;
  var bestScore = 1e9;
  for (var i = 0u; i < P.paletteCount; i++) {
    let entry = palette[i].rgb;
    let rendered = P.groundTone + (tonesAt(i) - P.groundTone) * cov;
    let toneError = abs(rendered - wanted);
    let dr = (entry.r - rgb.r) * cov;
    let dg = (entry.g - rgb.g) * cov;
    let db = (entry.b - rgb.b) * cov;
    let chromaError = sqrt(LUMA_R * dr * dr + LUMA_G * dg * dg + LUMA_B * db * db);
    let score = toneError + 1.4 * chromaError;
    if (score < bestScore - 1e-9) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

@compute @workgroup_size(8, 8)
fn selectCells(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= P.cols || gid.y >= P.rows) { return; }
  let tone = toneAt(f32(gid.x), f32(gid.y), P.t);
  let rgb = toneColor(tone);
  let level = clamp((luma(rgb) - P.minTone) / max(1e-6, P.maxTone - P.minTone), 0.0, 1.0);
  let step = stepFor(level, gid.x, gid.y);
  var ink = P.groundIndex;
  if (step != 0u) { ink = compensate(rgb, step); }
  let at = gid.y * P.cols + gid.x;
  stepsOut[at] = step;
  inksOut[at] = ink;
  // the raw f32 tone, so the port can be judged numerically and not only by how
  // many cells happened to sit near a dither threshold
  toneOut[at] = tone;
}
`;

/** The render pass reads the same buffers with read-only access (a read_write
 *  storage buffer cannot be bound in a fragment shader), so it is its own
 *  module, sharing the identical params struct. */
export const WGSL_READ = /* wgsl */ `
struct Params {
${struct}
};

@group(0) @binding(0) var<storage, read> P: Params;
@group(0) @binding(1) var<storage, read> palette: array<vec4f>;
@group(0) @binding(2) var<storage, read> consts: array<f32>;
@group(0) @binding(4) var<storage, read> stepsIn: array<u32>;
@group(0) @binding(5) var<storage, read> inksIn: array<u32>;

const MASK_OFF: u32 = 48u;

fn maskAt(i: u32) -> f32 { return consts[MASK_OFF + i]; }

@vertex
fn vs(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let x = f32((index << 1u) & 2u);
  let y = f32(index & 2u);
  return vec4f(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
}

@fragment
fn paint(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let px = vec2u(floor(pos.xy));
  let at = px.y * P.cols + px.x;
  let step = stepsIn[at];
  let ink = inksIn[at];
  let cov = maskAt(step);
  let g = palette[P.groundIndex].rgb;
  let c = palette[ink].rgb;
  let rgb = floor((g + (c - g) * cov) * 255.0 + 0.5) / 255.0;
  return vec4f(rgb, 1.0);
}
`;

/** Pack the params exactly in `PARAM_FIELDS` order (u32 and f32 both 4 bytes). */
export function packParams(values) {
  const buffer = new ArrayBuffer(PARAM_FIELDS.length * 4);
  const words = new DataView(buffer);
  PARAM_FIELDS.forEach(([name, type], i) => {
    const value = values[name];
    if (value === undefined) throw new TypeError(`missing param ${name}`);
    if (type === 'u32') words.setUint32(i * 4, value >>> 0, true);
    else words.setFloat32(i * 4, value, true);
  });
  return buffer;
}

/** The compute module's `paint` entry is unused: it exists so both modules share
 *  one struct. Split exports keep the pipelines readable. */
export const COMPUTE_ENTRY = 'selectCells';
export const PAINT_ENTRY = 'paint';
