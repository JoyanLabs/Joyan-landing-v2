/**
 * Del dataset crudo (d3-celestial) a `catalogo-88.json`: la versión reducida y
 * versionada que usa la página del catálogo.
 *
 *   node datos/construir-catalogo.mjs
 *
 * Qué hace y qué NO hace:
 *   - agrupa las 89 features en 88 constelaciones (Serpens viene partida en
 *     Caput y Cauda: dos figuras, una constelación);
 *   - redondea las coordenadas a 4 decimales (≈ 0,0001°, 0,36″: mucho más fino
 *     que la precisión de la carta de la que salen) y descarta vértices
 *     repetidos al contar;
 *   - cuenta nodos y segmentos, y calcula la Dec media de los nodos;
 *   - NO dibuja, NO proyecta y NO inventa enlaces: las `lineas` son las del
 *     dataset, tal cual, en pares de coordenadas.
 *
 * El archivo de salida lleva su propia procedencia y su licencia adentro, para
 * que se pueda reusar fuera de esta página sin buscarlas en otro lado.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { NOMBRES } from './nombres-88.mjs';

const RAIZ = new URL('./', import.meta.url);
const FUENTE = new URL('./fuente-constellations.lines.json', RAIZ);
const SALIDA = new URL('./catalogo-88.json', RAIZ);

const FUENTE_URL =
  'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';
const LICENCIA = 'BSD-3-Clause';

const crudo = JSON.parse(readFileSync(FUENTE, 'utf8'));
if (crudo.type !== 'FeatureCollection') throw new Error('la fuente no es una FeatureCollection');

const r4 = (n) => Math.round(n * 1e4) / 1e4;
const clave = (p) => `${r4(p[0])},${r4(p[1])}`;

/** Agrupa features por abreviatura IAU; conserva el orden de líneas del dataset. */
const porId = new Map();
for (const f of crudo.features) {
  if (f.geometry.type !== 'MultiLineString') throw new Error(`${f.id}: tipo inesperado`);
  const rank = Number(f.properties.rank) || null;
  const previo = porId.get(f.id);
  if (!previo) {
    porId.set(f.id, { id: f.id, rank, lineas: f.geometry.coordinates.map((l) => l.map(([ra, dec]) => [r4(ra), r4(dec)])) });
  } else {
    // Serpens Cauda: segunda figura de la misma constelación. Se anexa y se
    // queda el rank más alto (el que el dataset usa para la figura principal).
    previo.lineas.push(...f.geometry.coordinates.map((l) => l.map(([ra, dec]) => [r4(ra), r4(dec)])));
    previo.rank = Math.min(previo.rank ?? rank, rank ?? previo.rank ?? 1);
  }
}

const nombres = new Map(NOMBRES.map((n) => [n.id, n]));
if (porId.size !== 88) throw new Error(`esperaba 88 constelaciones, hay ${porId.size}`);
for (const id of porId.keys()) if (!nombres.has(id)) throw new Error(`sin nombre para ${id}`);
for (const id of nombres.keys()) if (!porId.has(id)) throw new Error(`nombre sin figura: ${id}`);

const constelaciones = [...porId.values()]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((c) => {
    const n = nombres.get(c.id);
    const nodos = new Set();
    let segmentos = 0;
    for (const linea of c.lineas) {
      for (let i = 0; i < linea.length; i++) {
        nodos.add(clave(linea[i]));
        if (i > 0 && clave(linea[i - 1]) !== clave(linea[i])) segmentos++;
      }
    }
    const decs = [...nodos].map((k) => Number(k.split(',')[1]));
    const decMedia = r4(decs.reduce((a, b) => a + b, 0) / decs.length);
    return {
      id: c.id,
      nombre_es: n.es,
      nombre_en: n.en,
      nombre_la: n.la,
      nombre_es_fuente: n.fuente,
      nombre_es_alternativos: n.alt,
      rank: c.rank,
      dec_media: decMedia,
      nodos: nodos.size,
      segmentos,
      lineas: c.lineas,
    };
  });

const totales = constelaciones.reduce(
  (t, c) => ({ nodos: t.nodos + c.nodos, segmentos: t.segmentos + c.segmentos }),
  { nodos: 0, segmentos: 0 },
);

const meta = {
  titulo: 'Las 88 constelaciones — catálogo de referencia',
  fuente: {
    dataset: 'd3-celestial · data/constellations.lines.json',
    url: FUENTE_URL,
    repositorio: 'https://github.com/ofrohn/d3-celestial',
    autor: 'Olaf Frohn',
    licencia: LICENCIA,
    copyright: 'Copyright (c) 2015, Olaf Frohn. All rights reserved.',
    licencia_texto: 'LICENCIA-d3-celestial.txt (en esta misma carpeta)',
    condiciones:
      'BSD-3-Clause: redistribución permitida conservando el aviso de copyright, la licencia y la lista de condiciones; sin endoso del autor.',
    archivo_vendorizado: 'fuente-constellations.lines.json',
    sha256_fuente: '294f66bef5d5cf50b1e17f16d2efa1d97a15131612c68dd935adef6e7373e13c',
  },
  nombres: {
    es: 'Anexo:Constelaciones (es.wikipedia.org), que cita a José Luis Comellas, Astronomía, Rialp, 1987, pp. 211-212.',
    en: "Campo «en» de d3-celestial data/constellations.json (mismo repo y licencia).",
    la: 'Nombre en latín tal como lo escribe el dataset (campo «name»); no siempre coincide con la forma oficial de la IAU (Canis Maior / Canis Major, Corona Austrina / Corona Australis). En Serpens se unificó a «Serpens»: el dataset lo partía en Caput y Cauda.',
    nota: 'Serpens aparece en el dataset de líneas como Serpens Caput y Serpens Cauda; acá es una constelación, con las dos partes dibujadas.',
  },
  coordenadas: {
    sistema: 'J2000',
    ra: 'grados, en el rango [-180, 180) tal como viene en el dataset',
    dec: 'grados, [-90, 90]',
    forma: 'lineas[] = polilíneas; cada par [ra, dec] es un vértice y cada par consecutivo un segmento',
  },
  aviso_figura:
    'Las líneas que unen las estrellas son una convención de carta, no una definición de la IAU: la IAU fija límites y abreviaturas, no figuras. Distintos datasets dibujan la misma constelación con enlaces distintos.',
  rank: 'El campo rank (1-3) es la jerarquía de estilo del dataset (mayor tamaño o brillo), no una categoría oficial.',
  figuras: constelaciones.length,
  nodos: totales.nodos,
  segmentos: totales.segmentos,
  generado_por: 'datos/construir-catalogo.mjs',
};

// Meta legible arriba y una constelación por línea: el archivo se abre a mano
// y también se parsea sin ceremonia.
const cuerpo = constelaciones.map((c) => `    ${JSON.stringify(c)}`).join(',\n');
const json = `{\n  "meta": ${JSON.stringify(meta, null, 2).split('\n').join('\n  ')},\n  "constelaciones": [\n${cuerpo}\n  ]\n}\n`;

writeFileSync(SALIDA, json);

console.log(`${constelaciones.length} constelaciones · ${totales.nodos} nodos · ${totales.segmentos} segmentos → datos/catalogo-88.json (${(json.length / 1024).toFixed(1)} KB)`);
