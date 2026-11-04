/**
 * La constelación — the user's three SVGs read as a sky chart.
 *
 * The figure is a set of polygons, so its own corners are the star positions:
 * no invented constellation, the drawing's geometry becomes the sky. Two
 * compositions, both built from the same points:
 *
 *   DARK  deep field → milky band → nebula wash → mid stars → nodes with flares
 *         → constellation lines → vignette
 *   PAPER star chart: cream ground, ruled grid, hairline links, ink nodes
 *
 * Deterministic: every random star comes from a seeded generator, so a repeat
 * run is byte-identical.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DIR = resolve(new URL('.', import.meta.url).pathname);
await mkdir(DIR, { recursive: true });
const SRC = '/home/joshrm/Descargas';

const W = 1400, H = 900;

/** Seeded PRNG: the same sky every run. */
function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function parsePolygons(svg) {
  const polys = [];
  for (const m of svg.matchAll(/<polygon[^>]*points="([^"]+)"/g)) {
    const pts = m[1].trim().split(/\s+/).map((pair) => pair.split(',').map(Number));
    if (pts.length > 1 && pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))) polys.push(pts);
  }
  return polys;
}

/** Fit the 1000×1000 figure into the frame, leaving air around it. */
const fitPoint = ([x, y]) => fit(x, y);
const fit = (x, y) => {
  const scale = 0.62;
  return [W / 2 + (x - 500) * scale, H / 2 + (y - 500) * scale];
};

function uniquePoints(polys) {
  const seen = new Map();
  for (const poly of polys) for (const [x, y] of poly) {
    const key = `${Math.round(x)},${Math.round(y)}`;
    if (!seen.has(key)) seen.set(key, [x, y]);
  }
  return [...seen.values()];
}

function starField(count, seed, { minR = 0.4, maxR = 1.5 } = {}) {
  const rnd = rng(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = minR + rnd() * (maxR - minR);
    const o = 0.25 + rnd() * 0.75;
    out.push({ x, y, r, o });
  }
  return out;
}

/* ---------- DARK ---------- */
function darkChart(polys) {
  const nodes = uniquePoints(polys).map(fitPoint);
  const deep = starField(420, 11, { minR: 0.35, maxR: 1.1 });
  const mid = starField(70, 29, { minR: 1.0, maxR: 2.2 });
  const links = polys.map((poly) => poly.map(fitPoint));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="sky" cx="52%" cy="42%" r="78%">
      <stop offset="0%" stop-color="#16252B"/><stop offset="55%" stop-color="#101A1E"/><stop offset="100%" stop-color="#0A1114"/>
    </radialGradient>
    <linearGradient id="milky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#244C5B" stop-opacity="0"/>
      <stop offset="45%" stop-color="#346E7B" stop-opacity=".22"/>
      <stop offset="100%" stop-color="#244C5B" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="nebula" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4D9199" stop-opacity=".20"/><stop offset="100%" stop-color="#4D9199" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="50%" cy="45%" r="72%">
      <stop offset="62%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".55"/>
    </radialGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#milky)" transform="rotate(-18 ${W / 2} ${H / 2})"/>
  <ellipse cx="${W * 0.56}" cy="${H * 0.44}" rx="${W * 0.42}" ry="${H * 0.30}" fill="url(#nebula)"/>
  <g fill="#D5E5CF">
    ${deep.map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(2)}" opacity="${s.o.toFixed(2)}"/>`).join('')}
  </g>
  <g fill="#EAF3E6">
    ${mid.map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(2)}" opacity="${(s.o * 0.9).toFixed(2)}"/>`).join('')}
  </g>
  <g stroke="#73B7B0" stroke-width="1" opacity=".55" fill="none">
    ${links.map((poly) => `<path d="${poly.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}Z"/>`).join('')}
  </g>
  <g filter="url(#glow)">
    ${nodes.map(([x, y]) => `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#EAF3E6"/><path d="M${(x - 7).toFixed(1)} ${y.toFixed(1)}H${(x + 7).toFixed(1)}M${x.toFixed(1)} ${(y - 7).toFixed(1)}V${(y + 7).toFixed(1)}" stroke="#94CCBB" stroke-width=".9" opacity=".75"/></g>`).join('')}
  </g>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;
}

/* ---------- PAPER: the same sky, as a chart ---------- */
function paperChart(polys) {
  const nodes = uniquePoints(polys).map(fitPoint);
  const links = polys.map((poly) => poly.map(fitPoint));
  const fine = starField(260, 41, { minR: 0.7, maxR: 1.4 });
  const grid = [];
  for (let x = 70; x < W; x += 70) grid.push(`<path d="M${x} 0V${H}"/>`);
  for (let y = 70; y < H; y += 70) grid.push(`<path d="M0 ${y}H${W}"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#F2EFE7"/>
  <g stroke="#CFC9BC" stroke-width=".8" opacity=".8">${grid.join('')}</g>
  <g fill="#1B2B2C" opacity=".55">
    ${fine.map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(2)}"/>`).join('')}
  </g>
  <g stroke="#15191A" stroke-width="1.1" fill="none" opacity=".9">
    ${links.map((poly) => `<path d="${poly.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}Z"/>`).join('')}
  </g>
  <g>
    ${nodes.map(([x, y]) => `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="#15191A"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" fill="none" stroke="#1C6B61" stroke-width=".9" opacity=".7"/></g>`).join('')}
  </g>
</svg>`;
}

const SUBJECTS = [
  { id: 'linea', file: 'blade-runner-unicorn-line.svg', label: 'línea' },
  { id: 'solido', file: 'blade-runner-unicorn-solid.svg', label: 'sólido' },
];

const cards = [];
for (const subject of SUBJECTS) {
  const svg = await readFile(resolve(SRC, subject.file), 'utf8');
  const polys = parsePolygons(svg);
  const nodes = uniquePoints(polys).length;
  for (const [id, make, label] of [['constelacion', darkChart, 'constelación'], ['carta', paperChart, 'carta estelar']]) {
    const name = `${subject.id}-${id}.svg`;
    await writeFile(resolve(DIR, name), make(polys));
    cards.push({ subject: subject.label, id, label, name, nodes, polys: polys.length });
  }
}

await writeFile(resolve(DIR, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Joyan — el dibujo como constelación</title><link rel="stylesheet" href="constelacion.css"></head>
<body>
<header><p class="label">ESTUDIO 12 · EL DIBUJO COMO CIELO</p>
<h1>Sus esquinas<br>son las estrellas.</h1>
<p class="lede">El dibujo no es una imagen decorativa: es una lista de polígonos. Tomé sus vértices —no inventé ninguno— y los usé como estrellas. Las líneas siguen las aristas originales.</p>
<p class="nota">Oscuro: campo profundo, banda de polvo, nebulosa, estrellas medias, nodos con destello, líneas y viñeta. Papel: carta estelar con retícula fina y nodos anillados.</p></header>
<main>
${cards.map((c) => `<figure class="card" data-kind="${c.id}"><img src="${c.name}" alt="${c.subject} como ${c.label}"><figcaption><strong>${c.subject}</strong><span>${c.label} · ${c.nodes} estrellas · ${c.polys} trazos</span></figcaption></figure>`).join('\n')}
</main>
<footer><p class="label">Semilla fija: repetir el generador devuelve el mismo cielo.</p></footer>
</body></html>
`);

await writeFile(resolve(DIR, 'constelacion.css'), `*{box-sizing:border-box}body{margin:0;background:#E8E5DF;color:#15191A;font:16px/1.7 Arial,sans-serif}
header{padding:32px 4vw 8px}h1{font-size:clamp(26px,3.6vw,46px);line-height:1.08;letter-spacing:-.03em;margin:14px 0 12px}
.lede,.nota{max-width:66ch;color:#4B5658;font-size:14px}.nota{margin-top:8px;font-size:12px}
.label{font:10px/1.7 ui-monospace,Menlo,monospace;letter-spacing:.11em;color:#1C6B61}
main{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:20px 4vw 40px}
figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid #CFC9BC}
figcaption{display:flex;justify-content:space-between;gap:12px;padding-top:7px;font-size:12px;color:#4B5658}
figcaption strong{color:#15191A}
footer{padding:0 4vw 40px}
@media(max-width:800px){main{grid-template-columns:1fr}}
`);

console.log('láminas:', cards.map((c) => `${c.name} (${c.nodes} estrellas)`).join(' · '));
