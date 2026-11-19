/**
 * Monta el catálogo de las 88 desde `datos/catalogo-88.json`.
 *
 * No inventa nada: lee las polilíneas del dataset y las proyecta. La geometría
 * es la misma de `construir-figuras.mjs` (las seis candidatas), recortada a lo
 * que un cuadro chico necesita:
 *
 *   - gnomónica centrada en el centroide de los nodos de la figura, para que
 *     los enlaces sigan rectos como en el cielo;
 *   - norte arriba, este a la izquierda (convención de carta celeste);
 *   - escala isotrópica por figura, con margen para el halo;
 *   - un solo `<path>` por figura para todos los enlaces: 88 figuras se
 *     dibujan con ~800 paths y ~1500 círculos, no con 1500 paths.
 *
 * Sin animación y sin filtros de SVG: sólo dos círculos por nodo (halo y
 * núcleo) y un trazo fino. Eso es lo que mantiene la página liviana con 88
 * figuras en pantalla.
 */

const VB = { w: 100, h: 78 };
const PAD = 7;
const DEG = Math.PI / 180;
const LIMITE_HEMISFERIO = 20; // |Dec media| ≤ 20° → ecuatorial

const r2 = (n) => Math.round(n * 100) / 100;
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// Para la tarjeta, una décima alcanza: el JSON guarda las cuatro.
const coma1 = (n) => {
  const v = Math.round(n * 10) / 10;
  const signo = v > 0 ? '+' : v < 0 ? '−' : '';
  return signo + Math.abs(v).toFixed(1).replace('.', ',');
};

const hemisferio = (dec) =>
  Math.abs(dec) <= LIMITE_HEMISFERIO ? 'ecuatorial' : dec > 0 ? 'norte' : 'sur';
const tamano = (n) => (n <= 5 ? '2-5' : n <= 9 ? '6-9' : '10+');

/** Centroide de los nodos en la esfera: media de vectores unitarios. */
function centroide(nodos) {
  let x = 0, y = 0, z = 0;
  for (const [ra, dec] of nodos) {
    x += Math.cos(dec * DEG) * Math.cos(ra * DEG);
    y += Math.cos(dec * DEG) * Math.sin(ra * DEG);
    z += Math.sin(dec * DEG);
  }
  return {
    ra0: Math.atan2(y, x) / DEG,
    dec0: Math.atan2(z, Math.hypot(x, y)) / DEG,
  };
}

/** Gnomónica; devuelve grados sobre el plano tangente (x al este, y al norte). */
function proyectar(ra, dec, ra0, dec0) {
  const da = (((ra - ra0 + 540) % 360) - 180) * DEG;
  const sd = Math.sin(dec * DEG), cd = Math.cos(dec * DEG);
  const s0 = Math.sin(dec0 * DEG), c0 = Math.cos(dec0 * DEG);
  const cosc = s0 * sd + c0 * cd * Math.cos(da);
  return {
    x: cd * Math.sin(da) / cosc / DEG,
    y: (c0 * sd - s0 * cd * Math.cos(da)) / cosc / DEG,
  };
}

/** SVG mínimo de una constelación: un path de enlaces y dos círculos por nodo. */
function figura(c) {
  const unicos = new Map();
  for (const linea of c.lineas) for (const p of linea) {
    const k = `${p[0]},${p[1]}`;
    if (!unicos.has(k)) unicos.set(k, p);
  }
  const nodos = [...unicos.values()];
  const { ra0, dec0 } = centroide(nodos);

  const proy = new Map();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [k, [ra, dec]] of unicos) {
    const p = proyectar(ra, dec, ra0, dec0);
    proy.set(k, p);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const escala = Math.min(
    (VB.w - 2 * PAD) / Math.max(maxX - minX, 0.4),
    (VB.h - 2 * PAD) / Math.max(maxY - minY, 0.4),
  );
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const put = (k) => {
    const p = proy.get(k);
    return { x: r2(VB.w / 2 - (p.x - cx) * escala), y: r2(VB.h / 2 - (p.y - cy) * escala) };
  };

  let d = '';
  for (const linea of c.lineas) {
    for (let i = 1; i < linea.length; i++) {
      const a = put(`${linea[i - 1][0]},${linea[i - 1][1]}`);
      const b = put(`${linea[i][0]},${linea[i][1]}`);
      if (a.x === b.x && a.y === b.y) continue;
      d += `M${a.x} ${a.y}L${b.x} ${b.y}`;
    }
  }

  const halos = [], cores = [];
  for (const k of unicos.keys()) {
    const { x, y } = put(k);
    halos.push(`<circle cx="${x}" cy="${y}" r="5.6"/>`);
    cores.push(`<circle cx="${x}" cy="${y}" r="1.45"/>`);
  }

  return `<svg class="cat-fig" viewBox="0 0 ${VB.w} ${VB.h}" aria-hidden="true" focusable="false">` +
    `<path class="link" d="${d}"/>` +
    `<g class="halo">${halos.join('')}</g>` +
    `<g class="core">${cores.join('')}</g>` +
    `</svg>`;
}

function item(c) {
  const nodos = c.nodos;
  const hem = hemisferio(c.dec_media);
  const rank = c.rank ?? 1;
  const desc = `${c.nombre_es} (${c.id}) — ${c.nombre_en} · ${nodos} nodos · ${c.segmentos} segmentos · Dec media ${coma1(c.dec_media)}° · rank ${rank}`;
  return `<li class="cat-item" data-hem="${hem}" data-size="${tamano(nodos)}" data-rank="${rank}" data-q="${esc(norm([c.nombre_es, c.nombre_en, c.nombre_la ?? '', c.id, ...(c.nombre_es_alternativos ?? [])].join(' ')))}" title="${esc(desc)}">` +
    figura(c) +
    `<p class="cat-name"><span class="cat-abbr mono">${esc(c.id)}</span>${esc(c.nombre_es)}</p>` +
    `<p class="cat-en">${esc(c.nombre_en)}</p>` +
    `<p class="cat-meta mono">${nodos} nodos · ${c.segmentos} segmentos<br>dec ${coma1(c.dec_media)}° · ${hem}</p>` +
    `</li>`;
}

const datos = await (await fetch('datos/catalogo-88.json')).json();
const cs = datos.constelaciones;

const grid = document.getElementById('grid');
grid.innerHTML = cs.map(item).join('');

const totales = cs.reduce((t, c) => ({ n: t.n + c.nodos, s: t.s + c.segmentos }), { n: 0, s: 0 });
document.getElementById('totales').textContent =
  `${cs.length} figuras · ${totales.n} nodos · ${totales.s} segmentos · J2000 · proyección gnomónica`;

// ------------------------------------------------------------------ el estado
const marca = { hem: 'todos', size: 'todos', rank: 'todos' };
let consulta = '';

const items = [...grid.children];
const vacio = document.getElementById('vacio');
const cuenta = document.getElementById('count');
const limpiar = document.getElementById('limpiar');
const input = document.getElementById('q');

// Cuántas figuras caen en cada opción de cada filtro: el número va en el botón.
const filtros = [...document.querySelectorAll('.filtro')].map((el) => ({
  grupo: el.dataset.grupo,
  botones: [...el.querySelectorAll('button')],
}));

for (const { grupo, botones } of filtros) {
  for (const b of botones) {
    const v = b.dataset.v;
    const n = v === 'todos' ? cs.length : items.filter((it) => it.dataset[grupo] === v).length;
    // La etiqueta va en su propio span para que el pelo del estado activo
    // subraye la opción y no el número.
    b.innerHTML = `<span class="v">${b.textContent}</span><span class="n">${n}</span>`;
  }
}

function pintar() {
  let visibles = 0;
  for (const it of items) {
    const ok =
      (marca.hem === 'todos' || it.dataset.hem === marca.hem) &&
      (marca.size === 'todos' || it.dataset.size === marca.size) &&
      (marca.rank === 'todos' || it.dataset.rank === marca.rank) &&
      (!consulta || it.dataset.q.includes(consulta));
    it.hidden = !ok;
    if (ok) visibles++;
  }
  cuenta.innerHTML = `${visibles} de ${items.length} figuras` +
    (consulta ? ` · <span class="q">«${esc(input.value.trim())}»</span>` : '');
  vacio.hidden = visibles > 0;
  limpiar.disabled = !consulta && marca.hem === 'todos' && marca.size === 'todos' && marca.rank === 'todos';
}

input.addEventListener('input', () => {
  consulta = norm(input.value);
  pintar();
});

for (const { grupo, botones } of filtros) {
  for (const b of botones) {
    b.addEventListener('click', () => {
      marca[grupo] = b.dataset.v;
      for (const otro of botones) {
        otro.setAttribute('aria-pressed', String(otro === b));
      }
      pintar();
    });
  }
}

limpiar.addEventListener('click', () => {
  consulta = '';
  input.value = '';
  for (const { grupo, botones } of filtros) {
    marca[grupo] = 'todos';
    for (const b of botones) {
      b.setAttribute('aria-pressed', String(b.dataset.v === 'todos'));
    }
  }
  pintar();
});

// «/» lleva al buscador; Escape lo vacía. Ningún atajo se come la escritura.
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== input) {
    e.preventDefault();
    input.focus();
  } else if (e.key === 'Escape' && document.activeElement === input && input.value) {
    input.value = '';
    consulta = '';
    pintar();
  }
});

pintar();
