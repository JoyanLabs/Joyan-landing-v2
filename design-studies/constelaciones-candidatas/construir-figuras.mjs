/**
 * Construye los diagramas: de coordenadas reales a SVG, sin forma inventada.
 *
 * PROYECCIÓN DECLARADA — gnomónica (plano tangente) centrada en el centroide
 * de las estrellas de cada figura. Se elige porque es la única proyección en
 * la que las líneas rectas del cielo siguen siendo rectas en el dibujo: los
 * enlaces que unen estas estrellas en cualquier carta se dibujan igual acá.
 *
 *   cos c = sin δ₀ sin δ + cos δ₀ cos δ cos(α − α₀)
 *   x     =  cos δ sin(α − α₀) / cos c      (hacia el este)
 *   y     = (cos δ₀ sin δ − sin δ₀ cos δ cos(α − α₀)) / cos c   (hacia el norte)
 *
 * Orientación: norte arriba, este a la IZQUIERDA — la convención de carta
 * celeste (vista desde el suelo), no la de mapa geográfico. Por eso x se
 * dibuja negado. Los ejes están a la misma escala (cos c vale lo mismo en
 * ambos), así que la figura no se deforma.
 *
 * Salida: `figuras.generated.mjs` — SVG ya calculado + los números que la
 * tarjeta declara (nodos, enlaces, extensión angular, escala de la barra).
 * El HTML no recalcula nada: lee lo que este script midió.
 */

import { writeFileSync } from 'node:fs';
import { CANDIDATAS } from './datos-constelaciones.mjs';

const VB = { w: 320, h: 240 };
const PAD = 28;           // margen interior para que el halo no toque el borde
const BARRA = 26;         // franja de la barra de grados, abajo
const DEG = Math.PI / 180;

/**
 * Polvo: un campo determinista de puntos bajo la figura (capa 1 de la escena).
 * No se sortea el cielo real — estas constelaciones tienen decenas de estrellas
 * visibles de fondo, no 200 estrellas al azar. El polvo dice «suelo con
 * material», no «carta del cielo», y por eso se dibuja sin nombres y muy bajo.
 * Semilla fija por constelación: el diagrama no cambia entre builds.
 */
function semilla(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function azar(s) {
  let a = s;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Centroide de las estrellas en la esfera: media de vectores unitarios. */
function centroide(estrellas) {
  let x = 0, y = 0, z = 0;
  for (const e of estrellas) {
    const ra = e.ra * DEG, dec = e.dec * DEG;
    x += Math.cos(dec) * Math.cos(ra);
    y += Math.cos(dec) * Math.sin(ra);
    z += Math.sin(dec);
  }
  const ra0 = Math.atan2(y, x);
  const dec0 = Math.atan2(z, Math.hypot(x, y));
  return { ra0: ra0 / DEG, dec0: dec0 / DEG };
}

/** Gnomónica desde el centroide. Devuelve grados sobre el plano tangente. */
function proyectar(e, ra0, dec0) {
  const d = DEG;
  const da = (e.ra - ra0) * d;
  const sd = Math.sin(e.dec * d), cd = Math.cos(e.dec * d);
  const s0 = Math.sin(dec0 * d), c0 = Math.cos(dec0 * d);
  const cosc = s0 * sd + c0 * cd * Math.cos(da);
  const x = (cd * Math.sin(da) / cosc) / d;
  const y = ((c0 * sd - s0 * cd * Math.cos(da)) / cosc) / d;
  return { x, y };
}

/** Radios por magnitud: la más brillante de la figura manda la escalera. */
function radios(mags) {
  const lo = Math.min(...mags), hi = Math.max(...mags);
  const span = hi - lo || 1;
  return mags.map((m) => 3.95 - ((m - lo) / span) * 1.75); // 3,95 → 2,20
}

const r2 = (n) => Math.round(n * 100) / 100;

function figura(c) {
  const { ra0, dec0 } = centroide(c.estrellas);
  const proy = c.estrellas.map((e) => ({ ...e, ...proyectar(e, ra0, dec0) }));

  const xs = proy.map((p) => p.x), ys = proy.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  // Escala isotrópica: un solo factor para los dos ejes.
  const escala = Math.min(
    (VB.w - 2 * PAD) / Math.max(maxX - minX, 0.6),
    (VB.h - 2 * PAD - BARRA) / Math.max(maxY - minY, 0.6),
  );
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

  // Norte arriba, este a la izquierda: x negado.
  const put = (p) => ({
    x: r2(VB.w / 2 - (p.x - cx) * escala),
    y: r2((VB.h - BARRA) / 2 - (p.y - cy) * escala),
  });

  const nodos = proy.map((p) => {
    const q = put(p);
    return { id: p.id, bayer: p.bayer, nombre: p.nombre, mag: p.mag, x: q.x, y: q.y };
  });
  const rad = radios(c.estrellas.map((e) => e.mag));
  nodos.forEach((n, i) => { n.r = r2(rad[i]); });

  const byId = Object.fromEntries(nodos.map((n) => [n.id, n]));
  const enlaces = c.links.map(([a, b, conducta], i) => {
    const A = byId[a], B = byId[b];
    return {
      id: `${c.id}-${i}`,
      from: a, to: b, conducta,
      d: `M${A.x} ${A.y}L${B.x} ${B.y}`,
      // Fase de la chispa: razón áurea, como los enlaces de v1.
      dur: `${r2(4.2 + ((i * 0.618) % 1) * 2.6)}s`,
    };
  });

  const ext = {
    anchoGrados: r2((maxX - minX)),
    altoGrados: r2((maxY - minY)),
    pxPorGrado: r2(escala),
    ra0: r2(((ra0 % 360) + 360) % 360),
    dec0: r2(dec0),
  };

  // Polvo bajo la figura, con un bolsillo limpio alrededor de cada estrella
  // (la escena aprobada deja respirar la figura; el polvo no la invade).
  const rand = azar(semilla(c.id));
  const polvo = [];
  for (let i = 0; i < 260; i++) {
    const x = PAD - 14 + rand() * (VB.w - 2 * PAD + 28);
    const y = PAD - 14 + rand() * (VB.h - 2 * PAD - BARRA + 28);
    const d = Math.min(...nodos.map((n) => Math.hypot(n.x - x, n.y - y)));
    if (d < 34) continue;
    const camada = d < 90 ? 0 : rand() < 0.35 ? 1 : 2;
    polvo.push(`<circle class="dust" cx="${r2(x)}" cy="${r2(y)}" r="${r2(0.28 + rand() * 0.62)}" data-tier="${camada}" fill-opacity="${r2(0.1 + rand() * 0.32)}"/>`);
  }

  const stars = nodos.map((n) => {
    const halo = r2(n.r * 5);
    const ring = r2(n.r + 2.6);
    const ringPart = n.mag < 3.2 ? `<circle class="ring" cx="${n.x}" cy="${n.y}" r="${ring}"/>` : '';
    return `<g class="star"><circle class="halo" cx="${n.x}" cy="${n.y}" r="${halo}"/><circle class="core" cx="${n.x}" cy="${n.y}" r="${n.r}"/>${ringPart}</g>`;
  }).join('\n');

  const links = enlaces.map((l) => {
    const marca = l.conducta === 'focus' ? ' data-focus="1"' : '';
    return `<path class="link" data-behaviour="${l.conducta}"${marca} id="l-${l.id}" d="${l.d}"/>`;
  }).join('\n');

  const chispas = enlaces
    .filter((l) => l.conducta === 'pulse')
    .map((l) => `<circle class="spark" r="2.1"><animateMotion dur="${l.dur}" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#l-${l.id}"/></animateMotion></circle>`)
    .join('\n');

  // Barra de escala: grados reales sobre el mismo suelo, para que el tamaño
  // relativo de las seis figuras se pueda comparar mirando. El valor sale de
  // una escalera de números redondos y se acota al ancho del cuadro.
  const tramo = [1, 2, 5, 10].filter((v) => v * escala <= 150).pop() ?? 1;
  const barra = r2(tramo * escala);
  const scaleBar = `<g class="scalebar" aria-hidden="true"><path d="M${PAD} ${VB.h - 12}h${barra}"/><path d="M${PAD} ${VB.h - 16}v8"/><path d="M${r2(PAD + barra)} ${VB.h - 16}v8"/><text x="${r2(PAD + barra / 2)}" y="${VB.h - 3}" text-anchor="middle">${tramo}°</text></g>`;

  return {
    id: c.id,
    nodos: nodos.length,
    enlaces: enlaces.length,
    ext,
    svg: [
      `<svg class="figura" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="Diagrama de ${c.nombre}: ${nodos.length} nodos y ${enlaces.length} enlaces, proyección gnomónica sobre posiciones J2000">`,
      `<g class="dust-field">\n${polvo.join('\n')}\n</g>`,
      `<g class="links">\n${links}\n</g>`,
      `<g class="stars">\n${stars}\n</g>`,
      chispas,
      scaleBar,
      '</svg>',
    ].join('\n'),
  };
}

const salida = CANDIDATAS.map(figura);
const cuerpo = salida
  .map((f) => `  '${f.id}': {\n    nodos: ${f.nodos},\n    enlaces: ${f.enlaces},\n    ext: ${JSON.stringify(f.ext)},\n    svg: \`${f.svg}\`,\n  },`)
  .join('\n');

writeFileSync(
  new URL('./figuras.generated.mjs', import.meta.url),
  `// GENERADO por construir-figuras.mjs — no editar a mano.\n// Proyección gnomónica sobre coordenadas J2000 de datos-constelaciones.mjs.\n\nexport const FIGURAS = {\n${cuerpo}\n};\n`,
);

for (const f of salida) {
  console.log(`${f.id.padEnd(10)} nodos ${f.nodos}  enlaces ${f.enlaces}  ext ${f.ext.anchoGrados}° × ${f.ext.altoGrados}°  ${f.ext.pxPorGrado}px/°  centro ${f.ext.ra0}° ${f.ext.dec0}°`);
}
