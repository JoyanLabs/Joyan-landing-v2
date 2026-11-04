/**
 * Escena 2 · La máquina habitada — as an AUTHORED axonometric diagram, built
 * layer by layer.
 *
 * Why this exists: the procedural-field version read as "a grid with smudges".
 * The direction change is deliberate — a line diagram we control, composed in
 * cumulative layers, so each decision can be looked at and argued separately:
 *
 *   L1 base      the ground grid: the machine has a floor
 *   L2 structure three decks, four columns, visible thickness
 *   L3 stations  one platform per deck; four in total
 *   L4 operators two dots each, deliberately tiny against the machine
 *   L5 route     a dotted path from station to station, ending on the tray
 *   L6 tray      the receiver: three chips already stamped
 *
 * Outputs: maquina-l1..l6.svg (cumulative) and maquina.html to compare them.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DIR = resolve(new URL('.', import.meta.url).pathname);
await mkdir(DIR, { recursive: true });

const W = 1000, H = 760;
const COS = Math.cos(Math.PI / 6), SIN = 0.5;
const ORIGIN = { x: W / 2, y: H / 2 + 90 };

const P = (x, y, z) => [ORIGIN.x + (x - y) * COS, ORIGIN.y + (x + y) * SIN - z];

const C = {
  bg: '#10191C',
  grid: '#244C5B',
  structure: '#3E7F87',
  deck: '#16282F',
  deckTop: '#1E3A42',
  station: '#2A4E57',
  operator: '#94CCBB',
  route: '#73B7B0',
  token: '#D5E5CF',
  tray: '#244C5B',
};

const poly = (pts, fill, stroke, width = 1.6, opacity = 1) =>
  `<path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')} Z" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${width}"/>`;

/** A deck with visible thickness: top rhombus + two side faces. */
function deck(cx, cy, z, w, d, thickness, fillTop = C.deckTop, fillSide = C.deck) {
  const top = [[-w, -d], [w, -d], [w, d], [-w, d]].map(([dx, dy]) => P(cx + dx, cy + dy, z));
  const down = z - thickness;
  const sideA = [P(cx - w, cy + d, z), P(cx + w, cy + d, z), P(cx + w, cy + d, down), P(cx - w, cy + d, down)];
  const sideB = [P(cx + w, cy - d, z), P(cx + w, cy + d, z), P(cx + w, cy + d, down), P(cx + w, cy - d, down)];
  return [
    poly(sideB, fillSide, C.structure, 1.2, 0.95),
    poly(sideA, fillSide, C.structure, 1.2, 0.8),
    poly(top, fillTop, C.structure, 1.8),
  ].join('');
}

function column(x, y, z0, z1, size = 7) {
  const s = size;
  const top = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([dx, dy]) => P(x + dx, y + dy, z1));
  const faces = [
    [P(x + s, y - s, z0), P(x + s, y + s, z0), P(x + s, y + s, z1), P(x + s, y - s, z1)],
    [P(x - s, y + s, z0), P(x + s, y + s, z0), P(x + s, y + s, z1), P(x - s, y + s, z1)],
  ];
  return faces.map((f) => poly(f, C.deck, C.structure, 1.1, 0.9)).join('') +
    poly(top, C.deckTop, C.structure, 1.4);
}

function dot(x, y, z, r, fill, opacity = 1) {
  const [px, py] = P(x, y, z);
  return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r}" fill="${fill}" fill-opacity="${opacity}"/>`;
}

/** A dotted route between two points, arcing slightly upward. */
function dotted(from, to, lift = 26) {
  const out = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const z = from.z + (to.z - from.z) * t + Math.sin(t * Math.PI) * lift;
    out.push(dot(x, y, z, 2.6, C.route, 0.9));
  }
  return out.join('');
}

/* ---------- the scene ---------- */
const MACHINE = { w: 300, d: 210 };
const DECKS = [0, 130, 260];
const TOP = 330;

const STATIONS = [
  { x: -150, y: 30, z: DECKS[0] + 8, deck: 0 },
  { x: 80, y: -60, z: DECKS[1] + 8, deck: 1 },
  { x: -90, y: 60, z: DECKS[2] + 8, deck: 2 },
  { x: 110, y: 40, z: DECKS[2] + 8, deck: 2 },
];
const TRAY = { x: 420, y: 40, z: 10 };

const layer = {};

layer.base = `
  <g stroke="${C.grid}" stroke-width="1" opacity=".85">
    ${Array.from({ length: 11 }, (_, i) => {
      const t = -350 + i * 70;
      const [ax, ay] = P(t, -350, 0), [bx, by] = P(t, 350, 0);
      const [cx2, cy2] = P(-350, t, 0), [dx2, dy2] = P(350, t, 0);
      return `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}"/><path d="M${cx2.toFixed(1)} ${cy2.toFixed(1)}L${dx2.toFixed(1)} ${dy2.toFixed(1)}"/>`;
    }).join('')}
  </g>`;

layer.structure = [
  ...[[-MACHINE.w, -MACHINE.d], [MACHINE.w, -MACHINE.d], [MACHINE.w, MACHINE.d], [-MACHINE.w, MACHINE.d]]
    .map(([x, y]) => column(x, y, 0, TOP)),
  ...DECKS.map((z) => deck(0, 0, z, MACHINE.w, MACHINE.d, 16)),
].join('');

layer.stations = STATIONS.map((s) =>
  deck(s.x, s.y, s.z, 58, 40, 7, C.station, C.station)).join('');

layer.operators = STATIONS.map((s) =>
  dot(s.x, s.y, s.z + 8, 5.5, C.operator) + dot(s.x, s.y, s.z + 17, 3.6, C.operator)).join('');

layer.route = [
  // The route travels ABOVE the decks, not through them: the lift is what makes
  // it read as a hand passing the token over, not as a line drawn on the floor.
  dotted(STATIONS[0], STATIONS[1], 54),
  dotted(STATIONS[1], STATIONS[2], 62),
  dotted(STATIONS[2], STATIONS[3], 40),
  dotted(STATIONS[3], TRAY, 70),
].join('');

layer.tray = [
  // Bridge from the machine to the tray: without it the tray floats.
  deck((MACHINE.w + TRAY.x) / 2 + 10, TRAY.y, 2, (TRAY.x - MACHINE.w) / 2 + 20, 34, 8, C.deck, C.deck),
  deck(TRAY.x, TRAY.y, TRAY.z, 70, 48, 8, C.tray, C.tray),
  dot(TRAY.x - 26, TRAY.y - 8, TRAY.z + 10, 4.2, C.token, 0.95),
  dot(TRAY.x - 8, TRAY.y - 4, TRAY.z + 10, 4.2, C.token, 0.95),
  dot(TRAY.x + 12, TRAY.y - 10, TRAY.z + 10, 4.2, C.token, 0.95),
].join('');

const ORDER = [
  ['base', 'CAPA 1 · BASE', 'La máquina tiene piso: la retícula da escala y horizonte.'],
  ['structure', 'CAPA 2 · ESTRUCTURA', 'Tres pisos, cuatro columnas, espesor visible: se ve el interior.'],
  ['stations', 'CAPA 3 · ESTACIONES', 'Una plataforma por puesto. Cuatro en total, repartidas en los tres pisos.'],
  ['operators', 'CAPA 4 · OPERARIOS', 'Dos puntos cada uno. Diminutos contra la máquina: ahí está el argumento de escala.'],
  ['route', 'CAPA 5 · RECORRIDO', 'La ficha va de puesto en puesto. Trayecto punteado, sin flechas.'],
  ['tray', 'CAPA 6 · BANDEJA', 'El último la deja acá. Tres fichas ya entregadas.'],
];

const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${inner}
</svg>\n`;

let accumulated = '';
const figures = [];
for (const [key, title, caption] of ORDER) {
  accumulated += layer[key];
  await writeFile(resolve(DIR, `maquina-${key}.svg`), wrap(accumulated));
  figures.push({ key, title, caption, file: `maquina-${key}.svg` });
}

await writeFile(resolve(DIR, 'maquina.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Escena 2 · máquina habitada, capa por capa</title>
<link rel="stylesheet" href="maquina.css"></head>
<body>
<header><p class="label">ESCENA 2 · LA MÁQUINA HABITADA</p>
<h1>Construida por capas.<br>Una decisión por capa.</h1>
<p class="lede">Cada cuadro agrega una capa y conserva las anteriores. Si una capa no se justifica sola, sobra.</p></header>
<main>
${figures.map((f) => `<figure><img src="${f.file}" width="${W}" height="${H}" alt="${f.caption}"><figcaption><strong>${f.title}</strong> · ${f.caption}</figcaption></figure>`).join('\n')}
</main>
<footer><p class="label">Prueba de la escena: se entiende en tres segundos y sin palabras. Si no, se corrige la capa, no el texto.</p></footer>
</body></html>
`);

await writeFile(resolve(DIR, 'maquina.css'), `@font-face{font-family:Michroma;src:url('../../fonts/michroma-400.woff2') format('woff2');font-display:swap}
*{box-sizing:border-box}body{margin:0;background:#E8E5DF;color:#15191A;font:16px/1.7 Arial,sans-serif}
header{padding:34px 4vw 10px}h1{font-family:Michroma,sans-serif;font-weight:400;font-size:clamp(26px,3.4vw,44px);line-height:1.1;letter-spacing:-.03em;margin:14px 0 12px}
.lede{max-width:62ch;color:#4B5658;font-size:14px}
.label{font:10px/1.7 ui-monospace,Menlo,monospace;letter-spacing:.11em;color:#1C6B61}
main{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:22px 4vw 40px}
figure{margin:0;background:#10191C;padding:10px}img{display:block;width:100%;height:auto}
figcaption{padding:10px 4px 4px;font-size:12px;line-height:1.6;color:#A9BDB8}
figcaption strong{color:#E4EEEA}
footer{padding:0 4vw 40px}
@media(max-width:820px){main{grid-template-columns:1fr}}
`);

console.log('capas escritas:', figures.map((f) => f.key).join(', '));
