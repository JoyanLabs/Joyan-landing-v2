/**
 * "Estratos" — a richer procedural scene for the engine lab.
 *
 * It exists to answer three complaints at once:
 *   1. the animated scene had too few layers,
 *   2. the dither choice looked like it changed almost nothing,
 *   3. everything looked low resolution.
 *
 * Resolution is a property of the scene (this one is 240 × 120, vs 160 × 80 of
 * the converted stills), and the layers are explicit: three strata drifting at
 * different speeds, a grid that breathes, and three pulses travelling along the
 * seams. The pulses are what make the animation unmistakable at a glance.
 *
 * Pure functions, no imports: `field(x, y, t)` is all the engine needs.
 */

const W = 240;
const H = 120;
const FPS = 12;
const CYCLE = 96;          // 8 s at 12 fps
const SECONDS = CYCLE / FPS;

/** H1 "Marea mineral", shadow → light. */
const STOPS = [
  '#0C1417', '#10191C', '#183039', '#244C5B', '#346E7B', '#4D9199',
  '#73B7B0', '#94CCBB', '#A8D3BA', '#D5E5CF', '#EAF3E6',
];

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const STOPS_RGB = STOPS.map(rgb);

function toneColor(tone) {
  const scaled = Math.min(0.999, Math.max(0, tone)) * (STOPS_RGB.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = STOPS_RGB[i];
  const b = STOPS_RGB[Math.min(STOPS_RGB.length - 1, i + 1)];
  // The engine reads channels in 0..1, not 0..255. Getting this wrong saturates
  // every cell and makes every dither and every frame look identical.
  return [0, 1, 2].map((k) => (a[k] + (b[k] - a[k]) * f) / 255);
}

const frac = (v) => v - Math.floor(v);
const bell = (d, s) => Math.exp(-(d * d) / (2 * s * s));

/** The three strata: centre rows, thickness, speed and phase of their pulse. */
const STRATA = [
  { centre: 0.30, half: 0.10, speed: 0.55, offset: 0.0, lift: 0.16 },
  { centre: 0.55, half: 0.13, speed: 0.80, offset: 0.45, lift: 0.26 },
  { centre: 0.80, half: 0.09, speed: 1.15, offset: 0.75, lift: 0.36 },
];

export function field(x, y, t) {
  const u = x / W;
  const v = y / H;
  const p = t / SECONDS;          // 0..1 across the loop

  // Base: the ground lifts toward the bottom, so the figure has a floor.
  let tone = 0.05 + 0.12 * v;

  for (const s of STRATA) {
    const d = Math.abs(v - s.centre);
    const inBand = Math.max(0, 1 - d / s.half);
    if (inBand > 0) {
      // Each stratum is a lit shelf; its edge brightens, its centre stays calm.
      tone += s.lift * inBand * (0.55 + 0.45 * Math.cos(d * Math.PI / s.half));
      // The travelling pulse: one node per stratum, looping exactly once.
      const head = frac(p * s.speed + s.offset);
      const along = Math.min(Math.abs(u - head), 1 - Math.abs(u - head));
      const pulse = bell(along, 0.035) * inBand;
      tone += 0.55 * pulse;
      // Behind the node, a short trail so the motion reads as travel, not blink.
      const trail = Math.max(0, 1 - along / 0.16) * inBand * (u < head ? 1 : 0.15);
      tone += 0.18 * trail * (1 - pulse);
    }
  }

  // A grid that breathes: vertical seams every 24 cells, offset by the loop.
  const seam = frac(u * 10 - p) * 10;
  const seamLine = 1 - Math.min(1, Math.abs(seam - 0.5) * 6);
  tone += 0.05 * seamLine * (0.6 + 0.4 * Math.sin(p * Math.PI * 2));

  // Horizontal scan of the whole frame: a slow sweep that keeps the surface alive.
  const sweep = frac(v * 0.5 - p);
  tone += 0.04 * Math.exp(-sweep * 9);

  return toneColor(tone);
}

export const strataScene = {
  id: 'lab-strata',
  label: 'estratos — tres capas, tres pulsos',
  cols: W,
  rows: H,
  fps: FPS,
  cycleFrames: CYCLE,
  posterFrame: 18,
  palette: STOPS,
  ground: 0,
  groundHex: STOPS[0],
  params: { strata: STRATA.length, seconds: SECONDS, resolution: `${W} × ${H}` },
  field,
};

export default strataScene;

/**
 * The same field on PAPER: the dot ladder runs the other way, so density means
 * ink instead of light. Same geometry, same motion, opposite physics.
 */
const PAPER_STOPS = [
  '#F2EFE7', '#E9E4D8', '#D8DFDA', '#ADC0BB', '#7C9895', '#547674', '#3B5B59', '#2A4342', '#1B2B2C',
];

export const strataPaperScene = {
  ...strataScene,
  id: 'lab-strata-paper',
  label: 'estratos sobre papel',
  palette: PAPER_STOPS,
  ground: 0,
  groundHex: PAPER_STOPS[0],
};
