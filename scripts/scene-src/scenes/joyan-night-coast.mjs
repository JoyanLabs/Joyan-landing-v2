/**
 * SCENE — coastal night with a lighthouse ("joyan-night-coast").
 * ============================================================================
 * Ours: the art, the palette and the composition. The library's `night-coast`
 * is the reference it is compared against in `/lab/ascii`, never a source: same
 * subject, same 200x100 grid, our own drawing. The colour literals are the
 * project's own tokens (ink, bone, the reserved amber for the live lamp) plus
 * interpolations between them, not vendor colours.
 *
 * The scene is data, not code: `params` below is the whole authored surface,
 * and `field(x, y, t)` turns it into a colour per cell. Everything else the
 * picture needs — the dot ramp, the coverage curve, the ordered dither, the
 * palette selection and the noise — belongs to `../engine.mjs`.
 *
 * THE LOOP CLOSES BY CONSTRUCTION, not by rounding. Every animated term is
 * periodic over `LOOP_SECONDS`: the swell and the beam are sines over periods
 * that divide it, the star twinkle is a sine over a period that divides it, and
 * the two animated lattice offsets (cloud drift and water chop) each travel a
 * WHOLE NUMBER of noise wraps over the loop, so t=0 and t=LOOP_SECONDS sample
 * exactly the same lattice. The checker measures that on the field itself
 * (`field(x,y,0)` against `field(x,y,LOOP_SECONDS)`, per channel) and requires
 * the seam to be no worse than an ordinary frame step, because an earlier
 * version of this scene looked closed only because the frame index wraps.
 */
import { hashNoise, layeredNoise } from '../engine.mjs';

/** Indexed palette. Index 0 is the ground: the scene is drawn on paper this dark. */
export const palette = [
  '#0b0b0c', // 0  ink     — Joyan ink; the night ground
  '#141b24', // 1  deep    — open water far out, and the top of the sky
  '#1d2a36', // 2  sea     — the swell just under the horizon
  '#2b4054', // 3  crest   — wave crests, wet rock
  '#3f5c74', // 4  rock    — the headland, lit side toward the moon
  '#5d7d94', // 5  mist    — haze at the horizon, moon halo
  '#93aab8', // 6  cloud   — cloud bellies
  '#c8d2d8', // 7  foam    — cloud lit edge, foam on a breaking wave
  '#f4f2ed', // 8  bone    — Joyan bone; the moon, the tower's paint
  '#7a5400', // 9  amberD  — beam tail, lamp spill on rock
  '#ffb000', // 10 amber   — Joyan's reserved amber: the live lamp and its beam
  '#ffe6a8', // 11 core    — the lamp's hot centre
];

/**
 * The authored parameters. Six groups, all of them in grid fractions or
 * seconds, so the picture can be re-composed without touching the engine:
 *
 *   horizon  0..1   where sky meets sea, as a fraction of the grid's rows
 *   moon     x, y   disc centre in grid fractions; radius in cells; glow
 *   stars    count  how many stars; seed picks which cells; twinkle is depth
 *   sea      swell  vertical amplitude in rows; bands crests across the water;
 *                   period is the swell's loop in seconds (divides LOOP_SECONDS)
 *   tower    x      base centre in grid fractions; height fraction of rows;
 *                   width in cells
 *   beam     period rotation loop in seconds (divides LOOP_SECONDS); spread the cone's
 *                   half-width in cells; reach its falloff; flare how much the
 *                   lamp brightens as the beam sweeps toward the viewer
 *
 * The constants under these parameters (`LOOP_SECONDS`, `CLOUD_SCALE`,
 * `CLOUD_WRAP`, `CHOP_RATE`, `CHOP_WRAP`, `TWINKLE_PERIOD`) are what make the
 * loop exact: changing one of them without keeping its term periodic over
 * `LOOP_SECONDS` reopens the seam, and the checker will say so.
 */
export const params = {
  horizon: 0.62,
  moon: { x: 0.75, y: 0.16, radius: 3.6, glow: 0.95 },
  stars: { count: 140, seed: 20261010, twinkle: 0.3 },
  sea: { swell: 3.6, bands: 7, period: 7.5 },
  tower: { x: 0.265, height: 0.4, width: 2.6 },
  beam: { period: 15, spread: 1.5, reach: 0.86, flare: 0.55 },
};

const W = 200;
const H = 100;
const FPS = 12;
/**
 * The loop length in seconds. Every animated term is periodic over exactly this:
 * a sine whose period divides it, or a lattice offset that lands on a whole
 * number of noise wraps at the end of it. `cycleFrames` is derived from it, so
 * the loop and the frame count cannot drift apart.
 */
const LOOP_SECONDS = 30;
/** 30 s of 12 fps frames. */
const CYCLE = LOOP_SECONDS * FPS;
/** Cloud drift, in lattice units per pixel and in wraps over the whole loop. */
const CLOUD_SCALE = 0.055;
const CLOUD_WRAP = 11;
/** Water chop: rows per second, and the lattice wrap that makes it close. */
const CHOP_RATE = 0.6;
const CHOP_WRAP = 18;
/** Star twinkle period in seconds (five cycles per loop). */
const TWINKLE_PERIOD = 6;

const HORIZON = Math.round(params.horizon * (H - 1));
const MOON_X = params.moon.x * (W - 1);
const MOON_Y = params.moon.y * (H - 1);
const TOWER_X = params.tower.x * (W - 1);

// The field speaks the palette, so the engine's compensation lands on the
// intended entry instead of guessing at an arbitrary colour. Index 9 (#7a5400)
// is the dim amber the engine reaches on its own for the beam's tail, so the
// scene does not have to name it.
const PAL = palette.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));
const [INK, DEEP, SEA, CREST, ROCK, MIST, CLOUD, FOAM, BONE, , AMBER, CORE] = PAL;

const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const smooth = (edge0, edge1, v) => {
  const k = clamp((v - edge0) / (edge1 - edge0));
  return k * k * (3 - 2 * k);
};
const exp = Math.exp;

/** The scene's noise setups, hoisted so the field allocates nothing per cell. */
const CLOUD_LAYERS = Object.freeze({ octaves: 2, wrapX: CLOUD_WRAP });
const CHOP_LAYERS = Object.freeze({ octaves: 2, wrapY: CHOP_WRAP });

/** The headland's ridge, as a row per column: a slope falling from the left. */
const ridge = (x) => HORIZON - 15 * smooth(96, 4, x) - 2.5 * layeredNoise(x * 0.12, 3.7, 11);
/** A low islet on the right, at the horizon. */
const islet = (x) => HORIZON - 3.4 * Math.max(0, 1 - ((x - 176) / 24) ** 2) - 1.1 * layeredNoise(x * 0.2, 9.4, 23);

// The tower stands on the ridge, not in the water: its base is the ground it is
// built on, and `tower.height` is measured up from there.
const TOWER_BASE = ridge(TOWER_X);
const TOWER_TOP = TOWER_BASE - params.tower.height * (H - 1);
const LAMP_Y = TOWER_TOP - 2.4;

/** Stars: which cells carry one, and how bright. Deterministic, not random. */
function starAt(x, y) {
  const roll = hashNoise(x, y, params.stars.seed);
  const threshold = 1 - params.stars.count / (W * HORIZON);
  if (roll < threshold) return 0;
  return 0.35 + 0.65 * hashNoise(x, y, params.stars.seed + 7);
}

/**
 * One cell of the picture, in 0..1 colour. Pure in (x, y, t), and PERIODIC in t
 * with period `LOOP_SECONDS`: every animated term is either a sine over a period
 * that divides the loop, or a lattice offset that lands on a whole number of
 * noise wraps at the end of it. The checker measures that (field at t=0 against
 * t=LOOP_SECONDS) instead of trusting it.
 * @param {number} x @param {number} y @param {number} t seconds
 */
export function field(x, y, t) {
  const belowHorizon = y > HORIZON;
  const sky = smooth(0, HORIZON, y);
  let base;
  let solid = 0;

  if (!belowHorizon) {
    // Sky: the ink lifts toward the horizon and picks up the moon's haze.
    base = mix(INK, MIST, 0.1 + 0.52 * sky * sky);
    // A band of haze sitting on the horizon line, strongest under the moon,
    // which is what makes the headland read as a silhouette instead of a smudge.
    base = mix(base, MIST, 0.22 * exp(-(((y - HORIZON + 5) / 8) ** 2)) * exp(-(((x - MOON_X) / 90) ** 2)));
    // Two cloud banks. The drift is expressed in LATTICE units and its total
    // over the loop is exactly CLOUD_WRAP, so t=0 and t=LOOP_SECONDS sample the
    // same lattice point and the clouds close with the rest of the scene.
    const driftLattice = (t / LOOP_SECONDS) * CLOUD_WRAP;
    const bank = layeredNoise(x * CLOUD_SCALE + driftLattice, y * 0.16, 5, CLOUD_LAYERS) * sky;
    const lit = clamp((bank - 0.4) * 3.2) * params.moon.glow;
    base = mix(base, CLOUD, 0.7 * clamp((bank - 0.46) * 3.4));
    base = mix(base, FOAM, 0.5 * lit * 0.6);
  } else {
    // Sea: darker with distance from the horizon, toned by the swell.
    const depth = smooth(HORIZON, H, y);
    const phase = (t / params.sea.period) * Math.PI * 2;
    const chop = layeredNoise(x * 0.09, y * 0.5 - t * CHOP_RATE, 41, CHOP_LAYERS);
    // `bands` crests across the visible water; `swell` is how far the chop
    // noise may displace a crest, in rows.
    const crests = params.sea.bands * (Math.PI * 2) / (H - HORIZON);
    const band = Math.sin((y - HORIZON + params.sea.swell * (chop - 0.5) * 2) * crests
      - phase + (chop - 0.5) * 2.2) * 0.5 + 0.5;
    base = mix(SEA, DEEP, depth * 0.6);
    base = mix(base, CREST, 0.3 * band * (0.22 + 0.78 * chop) * (0.45 + 0.55 * depth));
    // The moon's road: a broken column of light under the moon.
    const road = exp(-(((x - MOON_X) / 9) ** 2)) * exp(-(y - HORIZON) / 18);
    base = mix(base, MIST, 0.5 * road * (0.3 + 0.7 * chop));
  }

  // The headland on the left, and the islet on the right.
  const top = ridge(x);
  if (x < 96 && y >= top && y < HORIZON + 3) {
    // A dark mass with a moonlit rim: the headland has to read as a silhouette
    // against the haze, not as another band of fog.
    const brow = smooth(top + 2.5, top, y);
    base = mix(DEEP, INK, 0.6 - 0.25 * layeredNoise(x * 0.3, y * 0.3, 17));
    base = mix(base, MIST, 0.8 * brow);
    solid = 1;
  }
  if (x > 148 && y >= islet(x) && y < HORIZON) {
    base = mix(ROCK, DEEP, 0.45);
    solid = 1;
  }

  // The tower: tapered, its right side catching the moon, its left side dark.
  const dx = x + 0.5 - TOWER_X;
  if (y >= TOWER_TOP && y < TOWER_BASE + 2) {
    const half = params.tower.width * (0.55 + 0.55 * smooth(TOWER_TOP, TOWER_BASE, y));
    if (Math.abs(dx) <= half) {
      const side = clamp((dx / half + 1) / 2);
      base = mix(mix(ROCK, DEEP, 0.55), mix(BONE, FOAM, 0.2), 0.12 + 0.88 * side);
      solid = 1;
    }
  }
  // Gallery, lantern housing, roof and the lantern itself.
  if (y >= TOWER_TOP - 1 && y < TOWER_TOP + 1.5 && Math.abs(dx) <= 3.2) {
    base = mix(DEEP, ROCK, 0.4);
    solid = 1;
  }
  if (y >= TOWER_TOP - 4.4 && y < TOWER_TOP - 1 && Math.abs(dx) <= 2.2) {
    base = mix(AMBER, CORE, clamp(1 - Math.abs(dx) / 2.2));
    solid = 1;
  }
  if (y >= TOWER_TOP - 6 && y < TOWER_TOP - 4.4 && Math.abs(dx) <= 2.9) {
    base = mix(ROCK, INK, 0.4);
    solid = 1;
  }

  // The lamp itself, and the flare when the beam sweeps toward the viewer.
  const angle = (t / params.beam.period) * Math.PI * 2;
  const facing = exp(-((Math.sin(angle) ** 2) / 0.08));
  const lampDist = Math.hypot(dx, y - LAMP_Y);
  const lamp = exp(-lampDist / 6) * (0.45 + 0.95 * facing);
  let colour = mix(base, AMBER, clamp(lamp * 0.9));
  colour = mix(colour, CORE, clamp(exp(-lampDist / 2.2) * (0.55 + 0.45 * facing)));

  // Stars: only above the horizon, and never inside the headland or the tower.
  if (!belowHorizon && !solid) {
    const star = starAt(x, y);
    if (star > 0) {
      const depth = 1 - params.stars.twinkle
        + params.stars.twinkle * (0.5 + 0.5 * Math.sin((t / TWINKLE_PERIOD) * Math.PI * 2 + star * 12.6));
      colour = mix(colour, BONE, clamp(star * depth * (1 - 0.6 * sky)));
    }
  }

  // The beam: a cone from the lamp. It is occluded by rock and by the tower,
  // which is what makes it read as light leaving a building. It also warms
  // toward the lamp, where the light is densest.
  if (!solid) {
    const dirX = Math.cos(angle);
    const dirY = -Math.sin(angle) * 0.9;
    const rx = x + 0.5 - TOWER_X;
    const ry = y - LAMP_Y;
    const along = rx * dirX + ry * dirY;
    if (along > 0) {
      const across = Math.abs(-rx * dirY + ry * dirX);
      const spread = params.beam.spread * (1 + along * 0.11);
      const falloff = exp(-((across / spread) ** 2)) * (1 - along / (params.beam.reach * 190));
      const beam = clamp(falloff) * 0.85 * (0.5 + 0.5 * facing);
      if (beam > 0.01) {
        colour = mix(colour, AMBER, beam);
        colour = mix(colour, CORE, clamp(beam * beam * 0.9 * exp(-along / 40)));
      }
    }
  }

  // The moon: a wide halo, then the disc, drawn last so nothing dims it.
  const moonDist = Math.hypot(x + 0.5 - MOON_X, y - MOON_Y);
  colour = mix(colour, MIST, clamp(exp(-moonDist / 13) * 0.55 * params.moon.glow));
  colour = mix(colour, BONE, clamp((params.moon.radius + 0.5 - moonDist) * 1.4));

  return colour;
}

/** The scene, as the engine wants it. */
export const nightCoast = {
  id: 'joyan-night-coast',
  label: 'our coastal night',
  cols: W,
  rows: H,
  fps: FPS,
  cycleFrames: CYCLE,
  /** t = 2.5 s: the beam sweeping up to the right, toward the moon. */
  posterFrame: 30,
  palette,
  ground: 0,
  groundHex: palette[0],
  params,
  field,
};

export default nightCoast;
