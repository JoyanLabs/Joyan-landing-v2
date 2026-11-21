#!/usr/bin/env node
/**
 * LAS SEIS CAPTURAS DE LOS ESPACIOS — seis cuadros de 1440 × 900 y su rejilla 3×2.
 * ============================================================================
 * Sirve para la pregunta que el número no contesta: ¿se distinguen los seis
 * espacios y siguen siendo la MISMA familia? Un espacio cambia el lugar de la
 * banda y el aire del ground; no cambia la figura, ni la retícula, ni los
 * peldaños del material, así que las seis láminas tienen que parecer seis
 * lugares de un mismo cielo.
 *
 *   timeout 300 node design-studies/constelaciones-candidatas/cards/live/espacios-capturas.mjs \
 *     [--base http://127.0.0.1:4403/design-studies/constelaciones-candidatas/cards/live/index.html]
 *
 * NO reimplementa la captura: lanza `capture.mjs` una vez por id —el navegador
 * real, `?id=<id>&still=1`, el instante de la pieza, cero interacción— y con los
 * seis PNG compone `rejilla-3x2.png` (tres columnas, dos filas, en el orden de
 * `IDS_ESPACIOS`, con un separador de 2 px para que la junta se vea). Los seis
 * PNG y la rejilla van a `../capturas/espacios/`.
 *
 * Requiere el servidor de estudios en el puerto 4403:
 *   python3 -m http.server 4403 --bind 0.0.0.0 --directory .
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CARD } from '../data.mjs';
import { ESPACIOS, IDS_ESPACIOS } from './espacios.mjs';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const OUT = resolve(here, '..', 'capturas', 'espacios');
const BASE = (() => {
  const at = process.argv.indexOf('--base');
  return at > -1 ? process.argv[at + 1] : 'http://127.0.0.1:4403/design-studies/constelaciones-candidatas/cards/live/index.html';
})();
const GAP = 2;
const slug = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** Una captura por proceso: es la que garantiza que cada PNG salió de un mundo
 * limpio, y es exactamente la que produce las capturas de la escena viva. */
function capturar(id, out) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [
      resolve(here, 'capture.mjs'), id, '--state', 'reposo', '--out', out, '--base', BASE,
    ], { cwd: resolve(here, '../../..') });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`capture.mjs ${id} salió con ${code}: ${(stderr || stdout).trim().slice(0, 500)}`));
        return;
      }
      const line = stdout.split('\n').filter((l) => l.startsWith('{')).pop();
      if (!line) {
        reject(new Error(`capture.mjs ${id} no devolvió JSON`));
        return;
      }
      try {
        resolvePromise(JSON.parse(line));
      } catch (error) {
        reject(error);
      }
    });
  });
}

const alive = await fetch(BASE, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
if (!alive) {
  process.stderr.write(`el servidor de estudios no responde en ${BASE}\n  python3 -m http.server 4403 --bind 0.0.0.0 --directory .\n`);
  process.exit(2);
}

await mkdir(OUT, { recursive: true });
const filas = [];
for (const [at, id] of IDS_ESPACIOS.entries()) {
  const espacio = ESPACIOS[id];
  const nombre = `${String(at + 1).padStart(2, '0')}-${id}-${slug(espacio.nombre)}.png`;
  const out = resolve(OUT, nombre);
  const result = await capturar(id, out);
  filas.push({
    at: at + 1,
    id,
    archivo: nombre,
    espacio: espacio.nombre,
    ventana: espacio.ventana,
    clima: espacio.clima,
    sha256: result.sha256,
    cielo: result.live.hashes.sky.slice(0, 16),
    lavado: result.live.hashes.wash.slice(0, 16),
    nodos: result.live.nodes.length,
    bytes: result.bytes,
  });
  console.log(`  ${filas.at(-1).at} ${id.padEnd(4)} ${espacio.nombre.padEnd(15)} ventana ${espacio.ventana.x},${espacio.ventana.y} · clima ${espacio.clima}`
    + ` · ${result.live.nodes.length} nodos · ${result.bytes} bytes · ${nombre}`);
}

// La rejilla 3×2 en el orden de IDS_ESPACIOS: tres arriba, tres abajo.
const cols = 3;
const rows = Math.ceil(filas.length / cols);
const canvas = {
  width: cols * CARD.width + (cols + 1) * GAP,
  height: rows * CARD.height + (rows + 1) * GAP,
};
const composite = [];
for (const [at, fila] of filas.entries()) {
  const buffer = await readFile(resolve(OUT, fila.archivo));
  composite.push({
    input: buffer,
    left: GAP + (at % cols) * (CARD.width + GAP),
    top: GAP + Math.floor(at / cols) * (CARD.height + GAP),
  });
}
const grid = await sharp({ create: { width: canvas.width, height: canvas.height, channels: 3, background: '#04070a' } })
  .composite(composite)
  .png()
  .toBuffer();
const gridPath = resolve(OUT, 'rejilla-3x2.png');
await writeFile(gridPath, grid);
console.log(`rejilla 3×2 · ${canvas.width}×${canvas.height} · ${grid.length} bytes · ${gridPath}`);
process.stdout.write(`${JSON.stringify({ out: OUT, grid: gridPath, cols, rows, cuadro: [CARD.width, CARD.height], filas }, null, 2)}\n`);
