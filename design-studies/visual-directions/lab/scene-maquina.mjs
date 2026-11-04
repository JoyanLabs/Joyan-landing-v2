/**
 * Escena 2 · La máquina habitada — integración.
 *
 * Direction (docs/ESCENAS-SERIE.md): a three-deck machine, seen from above and
 * from the side, occupying two thirds of the frame; interior visible; one
 * station per deck; FOUR operators, each two or three dots, deliberately tiny
 * against the machine. A work token travels deck to deck; each operator
 * receives it with a brief two-beat gesture; the last one leaves it on a tray
 * that slowly fills. Constant rhythm, no epic.
 *
 * Rendered as a FIELD, not as imported art: density is the only weight tool,
 * so the machine reads because its edges are dense and the air around it is
 * empty. If the animation is switched off, the still has to explain itself.
 *
 * 16:9, 320 × 180 cells. Loop: 12 s at 12 fps (144 frames).
 */

const W = 320;
const H = 180;
const FPS = 12;
const CYCLE = 144;          // 12 s
const SECONDS = CYCLE / FPS;

/** H1 "Marea mineral", shadow → light. Channels in 0..1: the engine reads 0..1. */
const STOPS = [
  '#0C1417', '#10191C', '#183039', '#244C5B', '#346E7B', '#4D9199',
  '#73B7B0', '#94CCBB', '#A8D3BA', '#D5E5CF', '#EAF3E6',
].map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));

function toneColor(tone) {
  const scaled = Math.min(0.999, Math.max(0, tone)) * (STOPS.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = STOPS[i];
  const b = STOPS[Math.min(STOPS.length - 1, i + 1)];
  return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * f);
}

const frac = (v) => v - Math.floor(v);
const bell = (d, s) => Math.exp(-(d * d) / (2 * s * s));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => clamp01((v - a) / (b - a));

/* ---- the machine, in normalised coordinates ---- */
const SHELL = { x0: 0.06, x1: 0.66, y0: 0.16, y1: 0.88 };
const DECKS = [0.30, 0.52, 0.74];        // three decks, top to bottom
// Soft axonometric: each deck above the base sits slightly right and narrower,
// so the machine reads as seen from above and from the side instead of as a
// flat rectangle. This is what the first build got wrong.
const SHEAR = 0.035;
const SHRINK = 0.055;
const deckShift = (i) => SHEAR * (DECKS.length - 1 - i);
const deckInset = (i) => SHRINK * (DECKS.length - 1 - i);

/** Stations: two on the top deck, one on each of the others. */
const STATIONS = [
  { x: 0.20, y: DECKS[0] - 0.055, deck: 0, id: 'A' },
  { x: 0.42, y: DECKS[0] - 0.055, deck: 0, id: 'B' },
  { x: 0.30, y: DECKS[1] - 0.055, deck: 1, id: 'C' },
  { x: 0.22, y: DECKS[2] - 0.055, deck: 2, id: 'D' },
];

const TRAY = { x: 0.56, y: DECKS[2] - 0.045 };

/** The token's route: A → B → C → D → tray, one leg after another. */
const ROUTE = [...STATIONS.map((s) => ({ x: s.x, y: s.y })), TRAY];

function routePoint(p) {
  const legs = ROUTE.length - 1;
  const scaled = clamp01(p) * legs;
  const i = Math.min(legs - 1, Math.floor(scaled));
  const f = scaled - i;
  const a = ROUTE[i];
  const b = ROUTE[i + 1];
  const e = f * f * (3 - 2 * f);          // ease in/out: a hand moving, not a fly
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, current: i + e, at: b };
}

/** An operator is three dots: head and two shoulders. Never a character. */
function operatorTone(u, v, station, pulse) {
  // Deliberately tiny: three dots of about one cell each. The brief is explicit
  // that if they look like drawings of people, the scale argument is lost.
  const lift = 0.004 * pulse;             // the brief gesture: two beats, then rest
  const dots = [
    { dx: 0, dy: -0.007 - lift },
    { dx: -0.0035, dy: 0.002 - lift },
    { dx: 0.0035, dy: 0.002 - lift },
  ];
  let tone = 0;
  for (const d of dots) {
    tone += 0.9 * bell(Math.hypot(u - (station.x + d.dx), v - (station.y + d.dy)), 0.0032);
  }
  return tone;
}

export function field(x, y, t) {
  const u = x / W;
  const v = y / H;
  const p = t / SECONDS;                  // 0..1 once per loop

  // Air: almost nothing. The empty space is part of the drawing.
  let tone = 0.02 + 0.03 * (1 - v);

  const insideX = smooth(SHELL.x0 - 0.012, SHELL.x0, u) * (1 - smooth(SHELL.x1, SHELL.x1 + 0.012, u));
  const insideY = smooth(SHELL.y0 - 0.012, SHELL.y0, v) * (1 - smooth(SHELL.y1, SHELL.y1 + 0.012, v));

  // The interior: a light hatch so the machine reads as open, not as a box.
  if (insideX > 0 && insideY > 0) {
    const hatch = 0.5 + 0.5 * Math.sin((u * 46 + v * 26) * Math.PI);
    tone += 0.10 * insideX * insideY * hatch;
  }

  // Shell edges and deck lines: the structure carries the weight.
  const spanAt = (yy) => {
    // The machine is two thirds of the width, and each deck is narrower still.
    const near = Math.min(...DECKS.map((d) => Math.abs(yy - d)));
    const inset = SHRINK * (1 - clamp01(near / 0.12));
    const x0 = SHELL.x0 + inset * 0.5;
    const x1 = SHELL.x1 - inset * 0.5;
    return smooth(x0, x0 + 0.02, u) * (1 - smooth(x1 - 0.02, x1, u));
  };
  const verticals = Math.max(bell(u - SHELL.x0, 0.006), bell(u - SHELL.x1, 0.006));
  const horizontals = Math.max(
    bell(v - SHELL.y0, 0.006), bell(v - SHELL.y1, 0.006),
  );
  tone += 0.5 * (verticals * insideY + horizontals * spanAt(v));
  DECKS.forEach((deck, i) => {
    const shift = deckShift(i);
    const inset = deckInset(i);
    const x0 = SHELL.x0 + shift + inset * 0.5;
    const x1 = SHELL.x1 + shift - inset * 0.5;
    const span = smooth(x0, x0 + 0.02, u) * (1 - smooth(x1 - 0.02, x1, u));
    // The deck plate: a thin band, so the floor has mass instead of a hairline.
    tone += 0.46 * bell(v - deck, 0.005) * span;
    tone += 0.10 * bell(v - (deck + 0.012), 0.004) * span;
  });

  // Vertical ribs between decks, sparse: structure, not decoration.
  for (const rx of [0.14, 0.28, 0.50, 0.62]) {
    const inMachine = u > SHELL.x0 && u < SHELL.x1 && v > SHELL.y0 && v < SHELL.y1;
    if (inMachine) tone += 0.16 * bell(u - rx, 0.004);
  }

  // The token: one bright mark, always legible against the structure.
  const token = routePoint(p);
  tone += 0.95 * bell(Math.hypot(u - token.x, v - token.y), 0.0045);

  // Arrival pulse at the station the token is reaching, then it resets.
  for (const station of STATIONS) {
    const dist = Math.hypot(token.x - station.x, token.y - station.y);
    const arriving = bell(dist, 0.02);
    const beat = Math.sin(frac(p * 8) * Math.PI);       // two beats per arrival beat
    tone += operatorTone(u, v, station, arriving * Math.max(0, beat));
  }

  // The tray fills as the loop advances: eight marks, then it stops. Never infinite.
  const filled = Math.floor(clamp01((p - 0.55) / 0.35) * 8);
  for (let i = 0; i < filled; i++) {
    const tx = TRAY.x - 0.045 + (i % 4) * 0.012;
    const ty = TRAY.y + Math.floor(i / 4) * 0.012;
    tone += 0.7 * bell(Math.hypot(u - tx, v - ty), 0.006);
  }

  return toneColor(tone);
}

export const maquinaScene = {
  id: 'lab-maquina',
  label: 'escena 2 — la máquina habitada',
  cols: W,
  rows: H,
  fps: FPS,
  cycleFrames: CYCLE,
  posterFrame: 22,
  palette: STOPS.map((c) => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()),
  ground: 0,
  groundHex: '#0C1417',
  params: { decks: DECKS.length, stations: STATIONS.length, seconds: SECONDS, resolution: `${W} × ${H}` },
  field,
};

export default maquinaScene;
