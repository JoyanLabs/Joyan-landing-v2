#!/usr/bin/env node
/**
 * LOS ESPACIOS — la misma plantilla, seis cielos distintos, medido.
 * ============================================================================
 * `docs/PROCESO-ESCENAS.md` §Validación de la dirección aprueba la escena viva
 * con el material de v1 y deja el camino: la escena es una PLANTILLA con
 * variantes, y el paso 1 es la **variante de fondo por espacio** — la atmósfera
 * importada acepta parámetros de encuadre sin reescribir su receta. Este chequeo
 * es el que dice si esa variante existe de verdad o si es una prosa.
 *
 * MIDE CINCO COSAS, y las cinco pueden fallar:
 *
 *   1 VENTANA DENTRO DEL OVERSCAN
 *     cada espacio declara `ventana: {x, y}` en unidades del mundo (480 × 300).
 *     El recorte del cuadro sobre la hoja del cielo (sobremuestreo 1,6) tiene
 *     una sangre medida; el desplazamiento no puede salirse de ella, y cada eje
 *     tiene que ser múltiplo de 4 celdas para que el lavado horneado y la
 *     emisión viva caigan en la MISMA fase del bayer4. Un espacio fuera de los
 *     límites levanta un error NOMBRADO (campo, valor, cota). El caso se prueba
 *     además contra tres espacios deliberadamente inválidos: una regla que
 *     ningún caso roto puede incumplir no es una regla.
 *   2 DOS ESPACIOS, DOS LÁMINAS
 *     el sha256 del CIELO RECORTADO (lo que el cuadro pinta de la hoja, no la
 *     hoja entera) tiene que ser distinto para cada par de espacios, y el
 *     centroide de la banda —la región al 50 % de su propio pico, la convención
 *     de la casa— tiene que desplazarse una distancia visible entre cada par.
 *     El cielo es el de v1, muestreado en otra ventana de la MISMA hoja.
 *   3 EL CLIMA ES UN TINTE, NO UN COLOR NUEVO
 *     la luminancia media del campo compuesto (cielo + lavado + viñeta, el orden
 *     de la página) sigue dentro de la banda acordada de 4–6 %, y el clima,
 *     tomado solo (el mismo espacio con `clima: null`), no la mueve más de un
 *     6 % relativo. Un clima fuerte tiene que romper el caso.
 *   4 BYTE A BYTE POR ESPACIO
 *     DOS PROCESOS separados hornean el mismo espacio y tienen que dar el mismo
 *     sha256 de cada lámina y el mismo campo.
 *   5 LA ESCENA VIVA SALE CON SU ESPACIO
 *     `?id=<id>` elige la figura y el espacio viene con el id: la página reporta
 *     la ventana y el clima del registro, no tiene errores de consola, y todos
 *     sus nodos caen en pantalla.
 *   6 LA FAMILIA SIGUE SIENDO LA MISMA
 *     la escalera de peldaños que usan las hojas es idéntica en los seis
 *     espacios y en el encuadre de la vara, las paradas del lavado son LAS
 *     MISMAS y ningún cielo trae un color fuera del rango que el material
 *     produce en su propio encuadre. Es lo que se puede exigir sin ojos: el
 *     encuadre cambió, la receta del material importado no.
 *
 * Uso (desde la raíz del repo):
 *   timeout 180 node scripts/checks/check-escenas-variantes.mjs
 *   timeout 60  node scripts/checks/check-escenas-variantes.mjs --hashes Ori
 *
 * El modo `--hashes` hornea un espacio en un proceso limpio y deja el JSON en
 * stdout; el caso 4 lo lanza dos veces por espacio.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CARD, constellationFor } from '../../design-studies/constelaciones-candidatas/cards/data.mjs';
import {
  BAKE, bakeLayers, dynamicWash, skyFrame, skySheetAt,
} from '../../design-studies/constelaciones-candidatas/cards/live/bake.mjs';
import {
  ESPACIOS, ESPACIO_DEFECTO, ID_DEFECTO, IDS_ESPACIOS, espacioPara, validarEspacio,
} from '../../design-studies/constelaciones-candidatas/cards/live/espacios.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at > -1 ? argv[at + 1] : fallback;
};
const BASE = flag('base', 'http://127.0.0.1:4403/design-studies/constelaciones-candidatas/cards/live/index.html');
const num = (value, digits = 3) => (Number.isFinite(value) ? value.toFixed(digits) : String(value));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const LUMA = [0.2126, 0.7152, 0.0722];
const lumaAt = (pixels, at) => LUMA[0] * pixels[at] + LUMA[1] * pixels[at + 1] + LUMA[2] * pixels[at + 2];

/** La banda acordada del campo (la de la casa) y la cota de sutileza del clima. */
const CAMPO_MIN = 4;
const CAMPO_MAX = 6;
const CLIMA_MAX_DELTA = 0.06;
/** Y tiene que notarse: un clima que no mueve ni el 0,2 % no es un tinte. */
const CLIMA_MIN_DELTA = 0.002;
/** El desplazamiento mínimo de banda entre dos espacios, en píxeles del cuadro. */
const BANDA_MIN_PX = 48;
/** Lo que puede variar el número de paradas del cielo entre encuadres sin que
 * sea otra receta: el cielo tiene 133 053 celdas y qué peldaño cae en cada una
 * depende de la región, así que la cuenta no es idéntica; lo que SÍ es idéntica
 * es la escalera y el rango de colores (caso 6). */
const COLORES_CIELO_TOL = 8;

const frame = skyFrame(CARD.width, CARD.height);

// ------------------------------------------------------------------ la ventana
/** El recorte del cielo que el cuadro pinta: la sangre del canvas vivo sobre la
 * hoja sobremuestreada, en coordenadas de la hoja. Es EL recorte de `paintSky`. */
export function cieloRecortado(sheet) {
  const { left, top, width, height } = frame.recorte;
  if (left + width > sheet.width || top + height > sheet.height) {
    throw new Error(`cieloRecortado: el recorte ${left},${top} ${width}×${height} no cabe en la hoja ${sheet.width}×${sheet.height}`);
  }
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const from = ((top + y) * sheet.width + left) * 4;
    pixels.set(sheet.pixels.subarray(from, from + width * 4), y * width * 4);
  }
  return { pixels, width, height };
}

/** El centro de la banda del recorte: la región al 50 % de su propio pico y el
 * centroide de esa región, en fracciones del cuadro. La convención de la casa. */
export function centroBanda(crop, step = 2) {
  const { pixels, width, height } = crop;
  let peak = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const value = lumaAt(pixels, (y * width + x) * 4);
      if (value > peak) peak = value;
    }
  }
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (lumaAt(pixels, (y * width + x) * 4) < peak * 0.5) continue;
      sx += x;
      sy += y;
      n += 1;
    }
  }
  if (!n) throw new Error('centroBanda: el recorte no tiene ninguna celda al 50 % de su pico');
  return { u: sx / n / width, v: sy / n / height, cells: n, peak };
}

const raw = (sheet) => sharp(Buffer.from(sheet.pixels.buffer, sheet.pixels.byteOffset, sheet.pixels.length), {
  raw: { width: sheet.width, height: sheet.height, channels: 4 },
});

/** Las paradas de color que una hoja usa, como lista ordenada. Una hoja del
 * material sólo puede pintar los colores de SU escalera; si un espacio metiera
 * un color nuevo, aparecería aquí. */
function coloresDe(sheet) {
  const set = new Set();
  for (let at = 0; at < sheet.pixels.length; at += 4) {
    if (sheet.transparent === true && sheet.pixels[at + 3] === 0) continue;
    set.add(`${sheet.pixels[at]},${sheet.pixels[at + 1]},${sheet.pixels[at + 2]}`);
  }
  return [...set].sort();
}

/** Los peldaños que una hoja usa, ordenados: la escalera del material. */
const peldanosDe = (sheet) => [...new Set(sheet.steps)].sort((a, b) => a - b);

/**
 * El campo del cuadro compuesto: las tres hojas horneadas en el ORDEN de la
 * página (cielo opaco, lavado encima, viñeta encima) sobre el ground del espacio,
 * medido sobre los 1 440 × 900 del cuadro. La figura SVG y la copia no entran:
 * este instrumento mide el fondo, que es lo que el espacio cambia.
 * @returns {Promise<{meanPct:number, groundPct:number}>}
 */
export async function campoCompuesto(leaves) {
  const [gr, gg, gb] = leaves.sky.base;
  const crop = cieloRecortado(leaves.sky);
  const vignette = await raw(leaves.vignette)
    .resize({ width: CARD.width, height: CARD.height, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const { data, info } = await sharp({
    create: { width: CARD.width, height: CARD.height, channels: 4, background: { r: gr, g: gg, b: gb, alpha: 1 } },
  })
    .composite([
      { input: await raw(crop).png().toBuffer(), left: 0, top: 0 },
      { input: await raw(leaves.wash).png().toBuffer(), left: 0, top: 0 },
      { input: vignette, left: 0, top: 0 },
    ])
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let r = 0;
  let b = 0;
  for (let at = 0; at < data.length; at += info.channels) {
    sum += lumaAt(data, at);
    r += data[at];
    b += data[at + 2];
  }
  const n = info.width * info.height;
  // El sesgo cálido/frío del clima: rojo menos azul sobre el cuadro compuesto.
  return {
    meanPct: (sum / n / 255) * 100,
    groundPct: ((0.2126 * gr + 0.7152 * gg + 0.0722 * gb) / 255) * 100,
    sesgo: (r - b) / n,
  };
}

/** Todo lo que el chequeo mide de un espacio, en un solo horneado. Se guarda por
 * (id, ventana, clima): los mismos seis espacios se vuelven a pedir caso a caso. */
const medidasCache = new Map();
async function medida(id, espacio) {
  const key = `${id}|${espacio.ventana?.x},${espacio.ventana?.y}|${espacio.clima ?? 'sin clima'}`;
  if (medidasCache.has(key)) return medidasCache.get(key);
  const value = await medir(id, espacio);
  medidasCache.set(key, value);
  return value;
}

async function medir(id, espacio) {
  const catalogue = constellationFor(id).constellation;
  const leaves = bakeLayers(catalogue, { width: CARD.width, height: CARD.height, espacio });
  const crop = cieloRecortado(leaves.sky);
  const sinClima = await campoCompuesto(bakeLayers(catalogue, {
    width: CARD.width, height: CARD.height, espacio: { ...espacio, clima: null },
  }));
  const campo = await campoCompuesto(leaves);
  return {
    id,
    espacio: espacio.nombre,
    ventana: { ...espacio.ventana },
    clima: espacio.clima,
    hashes: {
      cieloRecortado: sha(crop.pixels),
      cielo: sha(leaves.sky.pixels),
      lavado: sha(leaves.wash.pixels),
      lavadoEnfocado: sha(leaves.focusedWash.pixels),
      vineta: sha(leaves.vignette.pixels),
    },
    peldanos: { cielo: peldanosDe(leaves.sky), lavado: peldanosDe(leaves.wash) },
    colores: { cielo: coloresDe(leaves.sky), lavado: coloresDe(leaves.wash) },
    banda: centroBanda(crop),
    campo: campo.meanPct,
    ground: campo.groundPct,
    sesgo: campo.sesgo,
    climaDelta: sinClima.meanPct ? campo.meanPct / sinClima.meanPct - 1 : 0,
  };
}

// ------------------------------------------------------------------ el modo hash
if (argv.includes('--hashes')) {
  const id = flag('hashes', ID_DEFECTO);
  process.stdout.write(`${JSON.stringify(await medir(id, espacioPara(id)))}\n`);
  process.exit(0);
}

// ------------------------------------------------------------------- los casos
const cases = [];
const check = (name, run) => cases.push({ name, run });
const medidas = new Map();
const medidaDe = async (id) => {
  if (!medidas.has(id)) medidas.set(id, await medida(id, espacioPara(id)));
  return medidas.get(id);
};

check('1 · la ventana de cada espacio está dentro del overscan', () => {
  const errores = IDS_ESPACIOS.flatMap((id) => validarEspacio(id, ESPACIOS[id]).map((error) => `${id}: ${error}`));
  const limites = frame.ventanaLimite;
  return {
    pass: errores.length === 0,
    detail: errores.length
      ? errores.join(' | ')
      : `${IDS_ESPACIOS.length} espacios declarados · ventana dentro de ±${num(limites.x, 1)}×±${num(limites.y, 1)} unidades del mundo `
        + `(la sangre del recorte sobre la hoja de sobremuestreo ${BAKE.overscan}) · recorte ${frame.recorte.left},${frame.recorte.top} `
        + `${frame.recorte.width}×${frame.recorte.height} de una hoja de ${frame.sheet[0]}×${frame.sheet[1]}`,
  };
});

check('1b · una ventana fuera de límites levanta el error nombrado', () => {
  const rotos = [
    { nombre: 'x fuera de límites', espacio: { nombre: 'roto', ventana: { x: 4000, y: 0 }, clima: '#0F2A31' }, busca: 'ventana.x' },
    { nombre: 'y fuera de límites', espacio: { nombre: 'roto', ventana: { x: 0, y: -4000 }, clima: '#0F2A31' }, busca: 'ventana.y' },
    { nombre: 'eje no entero de celda', espacio: { nombre: 'roto', ventana: { x: 6, y: 0 }, clima: '#0F2A31' }, busca: 'ventana.x' },
    { nombre: 'clima que no es hex', espacio: { nombre: 'roto', ventana: { x: 0, y: 0 }, clima: 'celeste' }, busca: 'clima' },
  ];
  const fallos = [];
  for (const roto of rotos) {
    const errores = validarEspacio('prueba', roto.espacio);
    if (!errores.length) fallos.push(`${roto.nombre}: no devolvió ningún error`);
    else if (!errores.some((error) => error.includes(roto.busca))) {
      fallos.push(`${roto.nombre}: ningún error nombra «${roto.busca}» (${errores.join(' | ')})`);
    }
  }
  return {
    pass: fallos.length === 0,
    detail: fallos.length ? fallos.join(' | ') : `${rotos.length} espacios rotos, ${rotos.length} errores nombrados`,
  };
});

check('1c · el lavado de 12 Hz sigue respondiendo a la llamada de siempre', async () => {
  // `check-cards-live` llama a `dynamicWash(catalogue)` SIN opciones. Cuando la
  // ventana entró como parámetro, la retícula dejó de tener default y esa llamada
  // se rompió. El caso la fija: sin opciones sigue dando la retícula de la vara y
  // los mismos píxeles que con la ventana de la vara explícita.
  const siempre = dynamicWash(null);
  const explicita = dynamicWash(null, { ventana: ESPACIO_DEFECTO.ventana });
  const movida = dynamicWash(null, { ventana: ESPACIOS.Ori.ventana });
  // La LUT se llena en `update`: antes de alimentarla las tres hojas están en
  // blanco y compararlas no diría nada (igual que en el worker de 12 Hz).
  [siempre, explicita, movida].forEach((wash) => wash.update(0, false));
  const reticula = `${siempre.cols}×${siempre.rows}×${siempre.cell}`;
  const esperada = `${BAKE.washGrid[0]}×${BAKE.washGrid[1]}×${BAKE.washCell}`;
  const fallos = [];
  if (reticula !== esperada) fallos.push(`sin opciones devuelve retícula ${reticula}, se esperaba ${esperada}`);
  if (sha(siempre.pixels) !== sha(explicita.pixels)) fallos.push('la ventana de la vara explícita ya no es un no-op en el lavado vivo');
  if (sha(siempre.pixels) === sha(movida.pixels)) fallos.push('la ventana del espacio no desplaza nada en el lavado de 12 Hz');
  if (movida.pixels.length !== siempre.pixels.length) fallos.push('desplazar el lavado le cambió el tamaño');
  return {
    pass: fallos.length === 0,
    detail: fallos.length
      ? fallos.join(' | ')
      : `dynamicWash(catalogue) sin opciones: retícula ${reticula}, ${siempre.pixels.length} bytes, los mismos píxeles que con la ventana 0,0 · `
        + `con la ventana de Ori (${ESPACIOS.Ori.ventana.x},${ESPACIOS.Ori.ventana.y}) el mismo tamaño y hoja desplazada`,
  };
});

check('2 · dos espacios distintos producen cielos recortados distintos', async () => {
  const rows = await Promise.all(IDS_ESPACIOS.map((id) => medidaDe(id)));
  const defecto = await medida(ID_DEFECTO, ESPACIO_DEFECTO);
  const hashes = new Map();
  const fallos = [];
  for (const row of [...rows, defecto]) {
    const key = row.hashes.cieloRecortado;
    if (hashes.has(key)) fallos.push(`${hashes.get(key)} y ${row.id} dan el mismo cielo recortado`);
    hashes.set(key, row.id);
  }
  return {
    pass: fallos.length === 0 && rows.length === IDS_ESPACIOS.length,
    detail: fallos.length
      ? fallos.join(' | ')
      : `${rows.length + 1} láminas, ${hashes.size} sha256 distintos del cielo recortado (${frame.recorte.width}×${frame.recorte.height} px) · `
        + `el espacio por defecto no coincide con ninguno declarado`,
    rows,
  };
});

check('2b · la misma figura con seis ventanas da seis cielos distintos', async () => {
  // El control que quita el confundo: si las seis láminas se midieran sobre seis
  // figuras distintas, una diferencia de hash no probaría nada del encuadre. acá
  // el id es SIEMPRE el mismo y lo único que cambia es la ventana del espacio.
  const filas = await Promise.all(IDS_ESPACIOS.map((space) => medida(ID_DEFECTO, ESPACIOS[space])));
  const hashes = new Map();
  const fallos = [];
  for (const row of filas) {
    const key = row.hashes.cieloRecortado;
    if (hashes.has(key)) fallos.push(`${ID_DEFECTO} con la ventana de ${hashes.get(key)} y la de ${row.espacio} dan la misma hoja`);
    hashes.set(key, row.espacio);
  }
  const sinVentana = await medida(ID_DEFECTO, ESPACIO_DEFECTO);
  if (filas.some((row) => row.hashes.cieloRecortado === sinVentana.hashes.cieloRecortado)) {
    fallos.push('alguna ventana deja el cielo igual que no declarar espacio');
  }
  return {
    pass: fallos.length === 0,
    detail: fallos.length
      ? fallos.join(' | ')
      : `${ID_DEFECTO} con las seis ventanas declaradas: ${hashes.size} sha256 distintos del cielo recortado, ninguno igual al del encuadre de la vara`,
  };
});

check('2c · la banda está en un lugar distinto en cada espacio', async () => {
  const rows = await Promise.all(IDS_ESPACIOS.map((id) => medidaDe(id)));
  const fallos = [];
  let min = Infinity;
  let par = '';
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const dx = (rows[i].banda.u - rows[j].banda.u) * CARD.width;
      const dy = (rows[i].banda.v - rows[j].banda.v) * CARD.height;
      const distance = Math.hypot(dx, dy);
      if (distance < min) {
        min = distance;
        par = `${rows[i].id}–${rows[j].id}`;
      }
      if (distance < BANDA_MIN_PX) fallos.push(`${rows[i].id} y ${rows[j].id} a ${num(distance, 1)} px`);
    }
  }
  return {
    pass: fallos.length === 0,
    detail: fallos.length
      ? `bandas too juntas: ${fallos.join(' | ')}`
      : `la pareja más cercana (${par}) queda a ${num(min, 0)} px del cuadro · el centroide de la banda mide `
        + `${rows.map((row) => `${row.id} ${num(row.banda.u, 3)},${num(row.banda.v, 3)}`).join(' · ')}`,
  };
});

check('3 · el campo de cada espacio sigue dentro de la banda acordada 4–6 %', async () => {
  const rows = await Promise.all(IDS_ESPACIOS.map((id) => medidaDe(id)));
  const fallos = rows.filter((row) => !(row.campo >= CAMPO_MIN && row.campo <= CAMPO_MAX));
  return {
    pass: fallos.length === 0,
    detail: fallos.length
      ? `fuera de la banda: ${fallos.map((row) => `${row.id} ${num(row.campo, 2)} %`).join(' | ')}`
      : `campo compuesto (cielo + lavado + viñeta, 1 440 × 900): ${rows.map((row) => `${row.id} ${num(row.campo, 2)} %`).join(' · ')} · banda acordada ${CAMPO_MIN}–${CAMPO_MAX} %`,
  };
});

check('3b · el clima es un tinte: se ve, pero no mueve el campo más de un 6 %', async () => {
  const rows = await Promise.all(IDS_ESPACIOS.map((id) => medidaDe(id)));
  const worst = rows.reduce((a, b) => (Math.abs(b.climaDelta) > Math.abs(a.climaDelta) ? b : a));
  const flojo = rows.reduce((a, b) => (Math.abs(b.climaDelta) < Math.abs(a.climaDelta) ? b : a));
  // Un clima que no mueve nada (0,2 % relativo) es decoración, no un tinte.
  const flojos = rows.filter((row) => Math.abs(row.climaDelta) < CLIMA_MIN_DELTA);
  const fallos = rows.filter((row) => Math.abs(row.climaDelta) > CLIMA_MAX_DELTA);
  // El caso negativo: un clima fuerte tiene que romper la misma regla.
  const fuerte = await medida(ID_DEFECTO, { ...ESPACIO_DEFECTO, clima: '#9FE8F5' });
  const detectado = Math.abs(fuerte.climaDelta) > CLIMA_MAX_DELTA;
  return {
    pass: fallos.length === 0 && flojos.length === 0 && detectado,
    detail: !detectado
      ? `un clima fuerte (${fuerte.clima}) movió el campo sólo ${num(fuerte.climaDelta * 100, 2)} %: el instrumento no distingue un tinte de un color nuevo`
      : flojos.length
        ? `climas que no se notan: ${flojos.map((row) => `${row.id} ${row.clima} ${num(row.climaDelta * 100, 3)} %`).join(' | ')}`
        : fallos.length
          ? `climas fuertes: ${fallos.map((row) => `${row.id} ${row.clima} ${num(row.climaDelta * 100, 2)} %`).join(' | ')}`
          : `el clima más movido es ${worst.id} ${worst.clima} con ${num(worst.climaDelta * 100, 2)} % y el menos, ${flojo.id} ${flojo.clima} con ${num(flojo.climaDelta * 100, 2)} % sobre el mismo espacio sin clima (banda ${num(CLIMA_MIN_DELTA * 100, 1)}–${num(CLIMA_MAX_DELTA * 100, 0)} %) · un clima fuerte (${fuerte.clima}) da ${num(fuerte.climaDelta * 100, 2)} % y el caso lo detecta`,
  };
});

/** Un proceso limpio por espacio y por pasada: el mismo comando, dos veces. */
function procesoHash(id) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--hashes', id], {
      cwd: fileURLToPath(new URL('../..', import.meta.url)),
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { err += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`el proceso de ${id} salió con ${code}: ${err.trim().slice(0, 400)}`));
        return;
      }
      try {
        // `bake.mjs` dice su BAND_EVENT por stdout al cargarse: el JSON es la
        // última línea que empieza por «{», no la última línea a secas.
        const line = out.split('\n').filter((l) => l.startsWith('{')).pop();
        if (!line) throw new Error(`el proceso de ${id} no devolvió JSON: ${out.slice(0, 200)}`);
        resolve(JSON.parse(line));
      } catch (error) {
        reject(error);
      }
    });
  });
}

check('4 · el mismo espacio hornea igual en dos procesos', async () => {
  const pairs = await Promise.all(IDS_ESPACIOS.map(async (id) => [id, await procesoHash(id), await procesoHash(id)]));
  const fallos = [];
  const claves = ['cieloRecortado', 'cielo', 'lavado', 'lavadoEnfocado', 'vineta'];
  for (const [id, a, b] of pairs) {
    for (const key of claves) {
      if (a.hashes[key] !== b.hashes[key]) fallos.push(`${id}.${key}: ${a.hashes[key].slice(0, 12)}… ≠ ${b.hashes[key].slice(0, 12)}…`);
    }
    if (Math.abs(a.campo - b.campo) > 1e-9) fallos.push(`${id}.campo: ${a.campo} ≠ ${b.campo}`);
  }
  return {
    pass: fallos.length === 0,
    detail: fallos.length
      ? fallos.join(' | ')
      : `${pairs.length * 2} procesos · ${claves.length} hashes por espacio idénticos entre procesos · campo idéntico a 1e-9`,
  };
});

check('5 · la escena viva con ?id= trae su espacio, sin errores y con sus nodos en pantalla', async () => {
  const { chromium } = await import('/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs');
  const browser = await chromium.launch();
  const fallos = [];
  const leido = [];
  try {
    for (const id of IDS_ESPACIOS) {
      const declared = ESPACIOS[id];
      const errors = [];
      const context = await browser.newContext({ viewport: { width: CARD.width, height: CARD.height }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(`pageerror ${error}`));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
      page.on('requestfailed', (request) => errors.push(`requestfailed ${request.url()} ${request.failure()?.errorText}`));
      try {
        await page.goto(`${BASE}?id=${encodeURIComponent(id)}`, { waitUntil: 'load', timeout: 30000 });
        await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 45000 });
        await page.evaluate(() => new Promise((done) => {
          requestAnimationFrame(() => requestAnimationFrame(done));
        }));
        const read = await page.evaluate(() => {
          const api = window.__live;
          return {
            id: api.id,
            espacio: api.espacio,
            painted: document.getElementById('stage').dataset.painted === 'true',
            nodes: api.nodes.map((node) => ({ index: node.index, screen: node.screen, coreR: node.coreR, plane: node.plane })),
            planes: Object.fromEntries(Object.entries(api.planes).map(([name, plane]) => [name, plane.opacity])),
            leaves: api.leaves(),
          };
        });
        if (read.id !== id) fallos.push(`${id}: la página reporta ${read.id}`);
        if (!read.espacio) fallos.push(`${id}: __live.espacio no está expuesto`);
        else {
          if (read.espacio.declarado !== true) fallos.push(`${id}: __live.espacio.declarado es ${read.espacio.declarado}, debía ser true`);
          if (read.espacio.ventana?.x !== declared.ventana.x || read.espacio.ventana?.y !== declared.ventana.y) {
            fallos.push(`${id}: la ventana de la página ${JSON.stringify(read.espacio.ventana)} no es la del registro ${JSON.stringify(declared.ventana)}`);
          }
          if (read.espacio.clima !== declared.clima) fallos.push(`${id}: el clima de la página ${read.espacio.clima} no es el del registro ${declared.clima}`);
        }
        if (!read.painted) fallos.push(`${id}: el stage no pintó`);
        if (read.leaves.sky.width !== frame.sheet[0] || read.leaves.sky.height !== frame.sheet[1]) {
          fallos.push(`${id}: la hoja del cielo es ${read.leaves.sky.width}×${read.leaves.sky.height}, no ${frame.sheet[0]}×${frame.sheet[1]}`);
        }
        const fuera = read.nodes.filter((node) => !(node.screen[0] >= 0 && node.screen[0] <= CARD.width
          && node.screen[1] >= 0 && node.screen[1] <= CARD.height && node.coreR > 0));
        if (fuera.length) fallos.push(`${id}: ${fuera.length} nodos fuera de pantalla (${fuera.slice(0, 3).map((node) => `${node.index}@${num(node.screen[0], 0)},${num(node.screen[1], 0)} r${node.coreR}`).join(' ')})`);
        if (!Object.values(read.planes).every((opacity) => Number(opacity) > 0)) {
          fallos.push(`${id}: algún plano de nodos está invisible (${JSON.stringify(read.planes)})`);
        }
        leido.push(`${id} ${read.espacio?.nombre ?? '—'} · ${read.nodes.length} nodos en pantalla · cielo ${read.leaves.sky.width}×${read.leaves.sky.height}`);
      } catch (error) {
        fallos.push(`${id}: ${error.message}`);
      } finally {
        if (errors.length) fallos.push(`${id}: ${errors.slice(0, 3).join(' | ')}`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  return {
    pass: fallos.length === 0,
    detail: fallos.length ? fallos.join(' | ') : `${leido.length} escenas abiertas en Chromium · ${leido.join(' · ')}`,
  };
});

/**
 * La paleta que el MATERIAL puede pintar: las cuatro esquinas del mundo
 * alcanzable más el centro, horneadas por el propio `skySheetAt` (y el centro
 * también a doble densidad). Es la referencia con la que se exige que un espacio
 * no introduzca ningún color: lo que el material no pinte en NINGUNA parte de su
 * hoja no puede salir de un espacio. No es una lista de colores a mano: es el
 * material, barrido.
 */
let barrido = null;
async function paletaDelMaterial() {
  if (barrido) return barrido;
  const { x, y } = frame.ventanaLimite;
  const sweeps = [
    { x: 0, y: 0 }, { x, y }, { x, y: -y }, { x: -x, y }, { x: -x, y: -y },
  ];
  const set = new Set();
  // Alcance Y fase: cada esquina del mundo alcanzable, horneada a la densidad del
  // cuadro y al doble. La retícula del cielo cae en puntos distintos según la
  // ventana; sin las dos densidades hay niveles del material que el barrido no ve
  // y el caso se quejaría de un color que el material sí pinta.
  for (const escala of [1, 2]) {
    for (const ventana of sweeps) {
      coloresDe(skySheetAt(CARD.width * escala, CARD.height * escala, ventana)).forEach((colour) => set.add(colour));
    }
  }
  barrido = set;
  return barrido;
}

check('6 · la receta del material no cambió: la misma escalera y las mismas paradas', async () => {
  const rows = await Promise.all(IDS_ESPACIOS.map((id) => medidaDe(id)));
  const base = await medida(ID_DEFECTO, ESPACIO_DEFECTO);
  const material = await paletaDelMaterial();
  const fallos = [];
  const lista = (values) => values.join(',');
  for (const row of rows) {
    if (lista(row.peldanos.cielo) !== lista(base.peldanos.cielo)) {
      fallos.push(`${row.id}: el cielo usa los peldaños ${lista(row.peldanos.cielo)}, la vara usa ${lista(base.peldanos.cielo)}`);
    }
    if (lista(row.peldanos.lavado) !== lista(base.peldanos.lavado)) {
      fallos.push(`${row.id}: el lavado usa los peldaños ${lista(row.peldanos.lavado)}, la vara usa ${lista(base.peldanos.lavado)}`);
    }
    if (lista(row.colores.lavado) !== lista(base.colores.lavado)) {
      fallos.push(`${row.id}: el lavado pinta ${row.colores.lavado.length} colores y el del encuadre de la vara ${base.colores.lavado.length} — no son los mismos`);
    }
    const fuera = row.colores.cielo.filter((colour) => !material.has(colour));
    if (fuera.length) {
      fallos.push(`${row.id}: ${fuera.length} colores de cielo que el material no pinta en ninguna parte de su hoja (${fuera.slice(0, 3).join(' | ')})`);
    }
    if (Math.abs(row.colores.cielo.length - base.colores.cielo.length) > COLORES_CIELO_TOL) {
      fallos.push(`${row.id}: ${row.colores.cielo.length} paradas de cielo contra ${base.colores.cielo.length} del encuadre de la vara`);
    }
  }
  return {
    pass: fallos.length === 0,
    detail: fallos.length
      ? fallos.join(' | ')
      : `escalera intacta: cielo peldaños [${lista(base.peldanos.cielo)}] y lavado [${lista(base.peldanos.lavado)}] en los seis espacios · `
        + `las ${base.colores.lavado.length} paradas del lavado son LAS MISMAS en los siete horneados · el cielo usa `
        + `${rows.map((row) => row.colores.cielo.length).join('/')} paradas contra ${base.colores.cielo.length} de la vara y todas están en las `
        + `${material.size} que el material puede pintar en su hoja`,
  };
});

// -------------------------------------------------------------------- la corrida
const failures = [];
const rows = [];
for (const { name, run } of cases) {
  let result;
  const started = Date.now();
  try {
    result = await run();
  } catch (error) {
    result = { pass: false, detail: `lanzó ${error.message}` };
  }
  rows.push({ name, ...result, ms: Date.now() - started });
  if (!result.pass) failures.push(name);
}

const todas = await Promise.all(IDS_ESPACIOS.map((id) => medidaDe(id)));
console.log(`espacios: ${IDS_ESPACIOS.length} declarados + 1 por defecto · ventana límite ±${num(frame.ventanaLimite.x, 1)}×±${num(frame.ventanaLimite.y, 1)} unidades del mundo`);
console.log(`cuadro ${CARD.width}×${CARD.height} · hoja del cielo ${frame.sheet[0]}×${frame.sheet[1]} (celda ${BAKE.skyCell}, sobremuestreo ${BAKE.overscan}) · recorte ${frame.recorte.left},${frame.recorte.top}`);
for (const row of todas) {
  console.log(`  ${row.id.padEnd(4)} ${row.espacio.padEnd(16)} ventana ${String(row.ventana.x).padStart(4)},${String(row.ventana.y).padStart(3)} · clima ${row.clima}`
    + ` · banda ${num(row.banda.u, 3)},${num(row.banda.v, 3)} (${row.banda.cells} celdas) · campo ${num(row.campo, 2)} % (clima ${num(row.climaDelta * 100, 2)} %, sesgo R-B ${num(row.sesgo, 2)})`
    + ` · cielo ${row.hashes.cieloRecortado.slice(0, 12)}…`);
}
const defecto = await medida(ID_DEFECTO, ESPACIO_DEFECTO);
console.log(`  ---- ${ESPACIO_DEFECTO.nombre} (${ID_DEFECTO}) ventana ${ESPACIO_DEFECTO.ventana.x},${ESPACIO_DEFECTO.ventana.y} · clima ${ESPACIO_DEFECTO.clima}`
  + ` · banda ${num(defecto.banda.u, 3)},${num(defecto.banda.v, 3)} · campo ${num(defecto.campo, 2)} % · cielo ${defecto.hashes.cieloRecortado.slice(0, 12)}…`);

for (const row of rows) {
  console.log(`[${row.pass ? 'OK  ' : 'FALLO'}] ${row.name} (${row.ms} ms)\n        ${row.detail}`);
}
if (failures.length) {
  console.error(`\n${failures.length} caso(s) en rojo: ${failures.join(' | ')}`);
  process.exit(1);
}
console.log(`\nlos ${cases.length} casos en verde.`);
