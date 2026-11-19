#!/usr/bin/env node
/**
 * TARJETAS DE CONSTELACIÓN — el flujo, probado; no las 88, sólo cuatro.
 * ============================================================================
 * Node + Chromium (Playwright del cache del proyecto), sin dependencias nuevas.
 * Levanta un servidor efímero desde la raíz del repo (no toca el 4403), captura
 * cada tarjeta DOS VECES EN PROCESOS SEPARADOS y exige PNG byte-idéntico.
 *
 * QUÉ PRUEBA, con números y no con declaraciones:
 *
 *   FORMA          1440 × 900, tres tarjetas distintas, PNG con cabecera válida.
 *   REPRODUCIBLE   sha256 de la corrida A === sha256 de la corrida B, para Ori,
 *                  Lyr y Cru. Dos procesos, dos navegadores, mismo hash.
 *   SIN CÓDIGO     la cuarta (Sge) se renderiza con el mismo comando, sin editar
 *                  el renderer, y los archivos del flujo no contienen ningún id
 *                  del catálogo: agregar una constelación es cambiar la entrada.
 *   DATO           los nodos y segmentos dibujados igualan los que el catálogo
 *                  declara, `validateCard` no devuelve nada y el validador del
 *                  modelo devuelve exactamente la desviación declarada (las 88
 *                  son IAU; la regla `official: false` se escribió para
 *                  asterismos).
 *   NO PLANA       ≥ 3 peldaños de punto, el campo no es ni vacío ni una
 *                  alfombra, la figura devuelve más tono que la calma del texto
 *                  y la calma queda por debajo del techo de legibilidad.
 *   CAPAS          quitar cielo, lavado, figura o núcleos CAMBIA el compuesto:
 *                  las cinco capas están y cada una mueve la imagen.
 *   COSTE          ms por tarjeta y coste marginal de cada capa, con la
 *                  proyección a 88 para saber si el flujo escala.
 *
 * Uso, desde la raíz del repo:
 *   timeout 180 node scripts/checks/check-cards.mjs
 *
 * Exit 0 sólo si todo pasa. Imprime lo que midió.
 */

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const CARDS = 'design-studies/constelaciones-candidatas/cards';
const TRES = ['Ori', 'Lyr', 'Cru'];
const CUARTA = 'Sge';

const lines = [];
const failures = [];
const check = (name, ok, detail) => {
  lines.push(`${ok ? 'ok  ' : 'FALLA'}  ${name}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!ok) failures.push(name);
  return ok;
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const num = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : String(value));
const ms = (value) => `${num(value)} ms`;

// --------------------------------------------------------------- el servidor
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const ALLOWED = [`${CARDS}/`, 'design-studies/constelaciones-candidatas/datos/', 'design-studies/v1/', 'scripts/scene-src/'];
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const file = resolve(ROOT, `.${pathname}`);
  const local = relative(ROOT, file).split('\\').join('/');
  if (!ALLOWED.some((prefix) => local.startsWith(prefix)) || !TYPES[extname(file)]) {
    response.writeHead(403).end();
    return;
  }
  try {
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const BASE = `http://127.0.0.1:${server.address().port}/${CARDS}/card.html`;

// ------------------------------------------------------- un id, un PNG, en frío
/** Una captura en su PROPIO proceso: eso es lo que hace la prueba de bytes. */
function capture(id, out, timeout = 90000) {
  return new Promise((done) => {
    const started = Date.now();
    const child = spawn(process.execPath, [resolve(ROOT, CARDS, 'capture.mjs'), id, '--out', out, '--base', BASE], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let spawnError = '';
    child.on('error', (error) => { spawnError = String(error.message); });
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.on('close', (code) => {
      clearTimeout(timer);
      const wall = Date.now() - started;
      let summary = null;
      try { summary = JSON.parse(stdout.trim().split('\n').pop()); } catch { /* se informa abajo */ }
      done({ code, wall, summary, stderr: (spawnError || stderr).trim().slice(0, 600) });
    });
  });
}

/** Ancho y alto de un PNG, leídos de su IHDR (sin decodificar la imagen). */
function pngSize(bytes) {
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const scratch = await mkdtemp(resolve(tmpdir(), 'check-cards-'));
const report = { hashes: {}, walls: {}, cards: {} };
const { CARD, constellationFor, validateCard, EXPECTED_DEVIATION } =
  await import(`file://${ROOT}/${CARDS}/data.mjs`);

try {
  // -------------------------------------------------------------- 1 · forma
  const first = {};
  for (const id of [...TRES, CUARTA]) {
    const out = resolve(scratch, `${id}-a.png`);
    const run = await capture(id, out);
    first[id] = run;
    report.walls[id] = run.wall;
    if (!run.summary) {
      check(`captura ${id}`, false, `el proceso salió ${run.code}: ${run.stderr || 'sin salida'}`);
      continue;
    }
    const bytes = await readFile(out);
    const size = pngSize(bytes);
    report.hashes[id] = sha(bytes);
    report.cards[id] = run.summary.card;
    report.shots = report.shots ?? {};
    report.shots[id] = run.summary.shotMs;
    const expected = run.summary.card;
    check(`captura ${id}`, run.code === 0 && size?.width === CARD.width && size?.height === CARD.height,
      `${size?.width}×${size?.height} · ${bytes.length} B · ${ms(run.wall)} · ${report.hashes[id].slice(0, 16)}…`);
    check(`dato ${id}`,
      expected.counts.nodes === expected.declared.nodes
      && expected.counts.segments === expected.declared.segments,
      `${expected.counts.nodes} nodos · ${expected.counts.segments} segmentos (el catálogo declara lo mismo)`);
    // La tarjeta IMPRESA: abreviatura, nombre, significado y los dos conteos.
    const printed = run.summary.text.replace(/\s+/g, ' ').toLowerCase();
    const wanted = [expected.abbr, expected.name, expected.meaning,
      `${expected.counts.nodes} nodos`, `${expected.counts.segments} segmentos`];
    const missing = wanted.filter((piece) => !printed.includes(piece.toLowerCase()));
    check(`lo impreso ${id}`, missing.length === 0,
      missing.length ? `falta: ${missing.join(' | ')}` : `«${wanted.join(' · ')}»`);
    check(`sin nombre de producto ${id}`, !printed.includes('lanza'),
      'la tarjeta no publica el nombre interno');
  }

  // ------------------------------------------------- 2 · reproducible en frío
  for (const id of TRES) {
    if (!report.hashes[id]) continue;
    const out = resolve(scratch, `${id}-b.png`);
    const run = await capture(id, out);
    const bytes = await readFile(out);
    const again = sha(bytes);
    check(`reproducible ${id} (dos procesos)`, run.code === 0 && again === report.hashes[id],
      `${report.hashes[id].slice(0, 24)}… = ${again.slice(0, 24)}… · ${ms(run.wall)}`);
    report.walls[`${id}-b`] = run.wall;
  }

  const distinct = new Set(TRES.map((id) => report.hashes[id]));
  check('las tres tarjetas son distintas', distinct.size === TRES.length, `${distinct.size} hashes distintos`);
  report.hashes[`${CUARTA} (cuarta, sin código)`] = report.hashes[CUARTA];

  // ------------------------------------------- 3 · agregar una no pide código
  const sourceFiles = ['data.mjs', 'field.mjs', 'card.mjs', 'card.html', 'card.css', 'capture.mjs'];
  // Sin comentarios: la prueba es que el CÓDIGO no nombre una constelación, no
  // que la documentación no pueda dar un ejemplo.
  const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const source = stripComments((await Promise.all(
    sourceFiles.map((file) => readFile(resolve(ROOT, CARDS, file), 'utf8')),
  )).join('\n'));
  const hardcoded = [...TRES, CUARTA, 'Orion', 'Lyra', 'Crux', 'Sagitta']
    .filter((token) => new RegExp(`['"]${token}['"]`).test(source));
  check('el flujo no conoce ningún id', hardcoded.length === 0,
    `${CUARTA} se renderizó con la misma orden${hardcoded.length ? `; literales: ${hardcoded.join(', ')}` : ''}`);

  // ------------------------------------------------ 4 · el modelo y el catálogo
  const { validateConstellation } = await import(`file://${ROOT}/scripts/scene-src/constellation.mjs`);
  for (const id of [...TRES, CUARTA]) {
    const data = constellationFor(id);
    const errors = validateCard(data.constellation);
    const raw = validateConstellation(data.constellation);
    check(`modelo ${id}`, errors.length === 0 && raw.length === 1 && raw[0] === EXPECTED_DEVIATION,
      errors.length ? errors.join(' | ') : 'cinco capas válidas; única desviación: procedencia IAU vs asterismo');
  }

  // ------------------------------------------------------------ 5 · no plana
  const { buildField } = await import(`file://${ROOT}/${CARDS}/field.mjs`);
  const dataOri = constellationFor('Ori');
  const field = buildField(dataOri);
  check('peldaños de punto', field.stats.distinctSteps >= 3, `${field.stats.distinctSteps} pasos no nulos`);
  check('el campo no es ni vacío ni una alfombra',
    field.stats.litShare >= 0.03 && field.stats.litShare <= 0.25,
    `${(field.stats.litShare * 100).toFixed(1)} % de celdas con tinta`);
  check('la figura tiene más cuerpo que la calma',
    field.stats.figureTone > field.stats.calmTone * 1.15,
    `bolsillo ${num(field.stats.figureTone, 4)} · calma ${num(field.stats.calmTone, 4)}`);
  check('la calma del texto queda oscura', field.stats.calmTone <= 0.032, `${num(field.stats.calmTone, 4)} de tono`);

  // ---------------------------------------------------------------- 6 · capas
  const clone = () => {
    const c = constellationFor('Ori').constellation;
    return {
      ...c,
      palette: { ...c.palette, stops: [...c.palette.stops] },
      layers: {
        sky: { ...c.layers.sky, structure: { ...c.layers.sky.structure }, clusters: [...c.layers.sky.clusters] },
        wash: { ...c.layers.wash },
        figure: { ...c.layers.figure, parts: [...c.layers.figure.parts], planes: [...c.layers.figure.planes] },
        vignette: { ...c.layers.vignette },
        cores: { ...c.layers.cores },
      },
      nodes: c.nodes.map((node) => ({ ...node, content: { ...node.content } })),
      links: [],
      composition: { ...c.composition, calm: { ...c.composition.calm } },
      camera: { ...c.camera },
    };
  };
  const variant = (name, change) => {
    const c = clone();
    change(c);
    const data = { ...constellationFor('Ori'), constellation: c };
    const built = buildField(data);
    const layersMs = built.timings.layers;
    const changed = built.rgba.some((value, i) => value !== field.rgba[i]);
    check(`capa ${name}`, changed, changed ? `mueve el compuesto · ${ms(layersMs)}` : 'no cambia nada: capa ausente');
    return layersMs;
  };
  const full = field.timings.layers;
  const costs = {
    cielo: full - variant('cielo', (c) => { c.layers.sky.density = 0; }),
    lavado: full - variant('lavado', (c) => { c.layers.wash.gain = 0; }),
    figura: full - variant('figura', (c) => { c.nodes.forEach((node) => { node.magnitude = 0; }); }),
    núcleos: full - variant('núcleos', (c) => { c.layers.cores.inner = 0; c.layers.cores.outer = 0; }),
  };

  // ---------------------------------------------------------------- 7 · coste
  const walls = TRES.map((id) => report.walls[id]).sort((a, b) => a - b);
  const medianWall = walls[Math.floor(walls.length / 2)];
  const fieldMs = field.timings.field;
  lines.push('');
  lines.push(`COSTE  por tarjeta: campo ${ms(fieldMs)} `
    + `(capas ${ms(field.timings.layers)} · dither ${ms(field.timings.dither)} · raster ${ms(field.timings.raster)}) `
    + `+ proceso con navegador ${ms(medianWall)}`);
  lines.push(`COSTE  marginal de capa (motor ya caliente): `
    + `cielo ${ms(costs.cielo)} · lavado ${ms(costs.lavado)} · figura ${ms(costs.figura)} · núcleos ${ms(costs.núcleos)}`);
  const shotMedian = TRES
    .map((id) => report.shots?.[id])
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)[Math.floor(TRES.length / 2)] ?? 0;
  const linksMs = report.cards.Ori?.timings?.links ?? 0;
  const warm = fieldMs + linksMs + shotMedian;
  lines.push(`COSTE  proyección a 88: ${num(88 * medianWall / 1000)} s con un navegador por tarjeta; `
    + `${num(88 * warm / 1000)} s con el navegador ya abierto (campo ${ms(fieldMs)} + enlaces ${ms(linksMs)} `
    + `+ captura ${ms(shotMedian)} = ${ms(warm)})`);
  lines.push('');
  lines.push('HASHES');
  for (const [name, hash] of Object.entries(report.hashes)) lines.push(`  ${name.padEnd(26)} ${hash}`);
  lines.push('');
  lines.push(`IDS renderizados: ${[...TRES, CUARTA].join(', ')} — ${CUARTA} sin editar el renderer, sólo el id de entrada`);
} catch (error) {
  check('el flujo completo', false, String(error?.stack ?? error).split('\n').slice(0, 3).join(' · ').slice(0, 500));
} finally {
  await new Promise((done) => server.close(done));
  await rm(scratch, { recursive: true, force: true });
}

process.stdout.write(`${lines.join('\n')}\n\n`);
if (failures.length) {
  process.stdout.write(`FALLAN ${failures.length}: ${failures.join(' | ')}\n`);
  process.exit(1);
}
process.stdout.write(`TODO GREEN — ${lines.filter((line) => line.startsWith('ok  ')).length} casos\n`);
