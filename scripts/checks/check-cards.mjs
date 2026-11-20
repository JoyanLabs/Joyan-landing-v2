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
 *   NO PLANA       ≥ 3 peldaños de punto, la figura devuelve más tono que la
 *                  calma del texto y la calma de la copia no es más clara que
 *                  la de la vara. La alfombra NO se mide por cuánta tinta hay
 *                  —un umbral de cobertura bruta confunde «alfombra» con
 *                  «banda densa»— sino por falta de ESTRUCTURA: la banda de
 *                  atmósfera llena (≥ 90 %), el resto limpio (≤ 10 %) y la
 *                  banda separada de él (≥ 3×). Un campo uniforme, el mismo
 *                  tono en todo el cuadro, es el caso negativo que lo prueba.
 *   CAPAS          quitar cielo, lavado, figura o núcleos CAMBIA el compuesto:
 *                  las cinco capas están y cada una mueve la imagen.
 *   ISOMÉTRICO     (etapa 3) cada plano se desplaza y se escala en Z con la
 *                  fórmula compensada; el desplazamiento es POR PLANO (los nodos
 *                  de un plano comparten la pose); el orden de pintado va de
 *                  atrás hacia adelante y los núcleos van después de la viñeta;
 *                  ningún plano se oculta (peso > 0 y retención ≥ 40 % al
 *                  enfocar); ningún nodo sale del cuadro y el cielo y el lavado
 *                  cubren el lienzo.
 *   ESTADOS        cada tarjeta se captura DOS VECES EN PROCESOS SEPARADOS en
 *                  reposo y con un nodo enfocado: mismo sha256 por estado, y los
 *                  dos estados NO son el mismo PNG. El isométrico que no hace
 *                  nada falla este caso.
 *   REDUCIDO       con `prefers-reduced-motion` el PNG del estado enfocado es el
 *                  mismo byte a byte: el estado final, sin animación.
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
const IDS = [...TRES, CUARTA];
/** El nodo enfocado de la captura: el primero del catálogo, que vive en el
 * plano lejano (`i % 3`), así el caso prueba que el sujeto se afirma sin
 * reordenar la escalera. */
const FOCUS_NODE = 0;

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
/** Diferencia entre dos campos de tono: fracción de celdas que cambian, media y pico. */
const compareTone = (a, b) => {
  let sum = 0;
  let changed = 0;
  let peak = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    sum += d;
    if (d > 0.01) changed += 1;
    if (d > peak) peak = d;
  }
  return { changed: changed / a.length, mean: sum / a.length, peak };
};

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
function capture(id, out, { focus = null, reduced = false, timeout = 90000 } = {}) {
  return new Promise((done) => {
    const started = Date.now();
    const args = [resolve(ROOT, CARDS, 'capture.mjs'), id, '--out', out, '--base', BASE];
    if (focus !== null) args.push('--focus', String(focus));
    if (reduced) args.push('--reduced');
    const child = spawn(process.execPath, args, {
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
  for (const id of IDS) {
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

  // ------------------------------- 2 · estados: reposo y nodo enfocado
  // Cada tarjeta se captura DOS VECES EN PROCESOS SEPARADOS en cada estado. El
  // reposo "a" ya lo hizo la sección 1; acá va el "b" y las dos del enfocado.
  // Y los dos estados no pueden ser el mismo PNG: un isométrico que no hace
  // nada no pasa.
  const estados = {};
  for (const id of IDS) {
    const restA = report.hashes[id];
    const restOut = resolve(scratch, `${id}-reposo-b.png`);
    const restB = await capture(id, restOut);
    const restBytes = restB.summary ? await readFile(restOut) : null;
    const restHash = restBytes ? sha(restBytes) : null;
    const focusPasses = [];
    for (const pass of ['a', 'b']) {
      const out = resolve(scratch, `${id}-enfocado-${pass}.png`);
      const run = await capture(id, out, { focus: FOCUS_NODE });
      const bytes = run.summary ? await readFile(out) : null;
      focusPasses.push({ run, hash: bytes ? sha(bytes) : null, size: bytes ? pngSize(bytes) : null });
      if (!bytes) check(`captura ${id} enfocado ${pass}`, false, `el proceso salió ${run.code}: ${run.stderr || 'sin salida'}`);
    }
    estados[id] = { reposo: { hash: restHash, run: restB }, enfocado: focusPasses };
    if (restA && restHash) {
      check(`reproducible ${id} reposo (dos procesos)`, restHash === restA,
        `${restA.slice(0, 24)}… = ${restHash.slice(0, 24)}… · ${ms(restB.wall)}`);
    }
    report.walls[`${id}-reposo`] = restB.wall;
    const [a, b] = focusPasses;
    if (a.hash && b.hash) {
      check(`reproducible ${id} enfocado (dos procesos)`, a.hash === b.hash,
        `${a.hash.slice(0, 24)}… = ${b.hash.slice(0, 24)}… · ${ms(a.run.wall)} + ${ms(b.run.wall)}`);
      check(`forma ${id} enfocado`, a.size?.width === CARD.width && a.size?.height === CARD.height,
        `${a.size?.width}×${a.size?.height} · nodo ${a.run.summary?.card?.focusNode} · plano ${a.run.summary?.card?.focusPlane}`);
    }
    report.walls[`${id}-enfocado`] = a.run.wall;
    if (restA && a.hash) {
      check(`el enfocado no es el reposo ${id}`, restA !== a.hash,
        a.hash ? `reposo ${restA.slice(0, 16)}… ≠ enfocado ${a.hash.slice(0, 16)}…` : 'falta la captura del enfocado');
      report.hashes[`${id} · reposo`] = restA;
      report.hashes[`${id} · enfocado`] = a.hash;
    }
  }

  // ------------------------------------------------ 2b · reduced motion
  // La tarjeta no anima: el estado enfocado se aplica de una vez. Con
  // `prefers-reduced-motion` el resultado tiene que ser el mismo byte a byte —
  // el estado final sin animación, no una version aparte.
  const reducedOut = resolve(scratch, 'Ori-enfocado-reduced.png');
  const reduced = await capture('Ori', reducedOut, { focus: FOCUS_NODE, reduced: true });
  const reducedBytes = reduced.summary ? await readFile(reducedOut) : null;
  const reducedHash = reducedBytes ? sha(reducedBytes) : null;
  const motionHash = estados.Ori?.enfocado?.[0]?.hash ?? null;
  check('reduced motion = estado final', reducedHash !== null && reducedHash === motionHash,
    `${reducedHash ? `${reducedHash.slice(0, 24)}… = ${motionHash?.slice(0, 24)}…` : 'falta la captura reducida'}`);
  report.hashes['Ori · enfocado (reduced motion)'] = reducedHash;

  const distinct = new Set(TRES.map((id) => report.hashes[`${id} · reposo`]));
  check('las tres tarjetas son distintas', distinct.size === TRES.length, `${distinct.size} hashes distintos`);
  report.hashes[`${CUARTA} (cuarta, sin código)`] = report.hashes[`${CUARTA} · reposo`];

  // ------------------------------------------- 3 · agregar una no pide código
  const sourceFiles = ['data.mjs', 'isometric.mjs', 'field.mjs', 'card.mjs', 'card.html', 'card.css', 'capture.mjs'];
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

  // --------------------------------------------------- 5 · estructura, no tinta
  // Una alfombra es un campo PAREJO, no un campo con mucha tinta: la banda
  // densa del conjunto aprobado pinta casi todo su interior y sigue siendo una
  // banda, con borde y con un bolsillo limpio donde va la copia. Medir cuánta
  // tinta hay en el cuadro confunde las dos cosas y defiende el defecto
  // contrario (la nube dispersa). Por eso la regla mide ESTRUCTURA: la BANDA
  // —la región de atmósfera del propio modelo, al 50 % de su forma, menos el
  // bolsillo de la copia— llena, el RESTO del campo limpio, y la separación
  // entre los dos. Un campo uniforme da 1,0 de separación y falla.
  const { buildField, planeSheets } = await import(`file://${ROOT}/${CARDS}/field.mjs`);
  const { material } = await import(`file://${ROOT}/${CARDS}/live/bake.mjs`);
  const { washRegion } = await import(`file://${ROOT}/scripts/scene-src/constellation.mjs`);
  const { EMISSIONS } = await import(`file://${ROOT}/design-studies/v1/hero-field.mjs`);
  const dataOri = constellationFor('Ori');
  const field = buildField(dataOri);
  check('peldaños de punto', field.stats.distinctSteps >= 3, `${field.stats.distinctSteps} pasos no nulos`);

  // Los umbrales. `inside`/`outside` son los del conjunto aprobado (la banda de
  // la vara pinta 91–96 % de sus posiciones y deja polvo fuera de ella); la
  // separación se pide por encima de 1,0 —el campo parejo— y por debajo de la
  // que la vara logra entre su banda y su campo: 0,910 / 0,243 = 3,74× medido
  // con su propia región (`check-cards-live.mjs`, caso de cobertura). Nuestra
  // tarjeta mide 0,996 / 0,088 = 11,3×.
  const BAND = Object.freeze({ inside: 0.90, outside: 0.10, separation: 3, region: 0.08 });

  /** La atmósfera de la tarjeta, con el dither del motor: el tono del lavado
   * del modelo pasado por `material()`, la misma función que hornea la escena
   * viva. Mide la CAPA DE ATMÓSFERA y no el compuesto: el cielo (polvo
   * declarado) y la figura no son candidatos a alfombra, y contarlos juntos
   * mezclaría dos materiales en un solo número. */
  const atmosphere = (c) => {
    const wash = planeSheets(c).lavado;
    return material(c, CARD.cols, CARD.rows, CARD.cell, (x, y) => wash[y * CARD.cols + x], true).steps;
  };

  /** Cobertura dentro y fuera de la región, y la separación entre las dos. */
  const structureOf = (mask, steps) => {
    let inside = 0;
    let inked = 0;
    let outside = 0;
    let outed = 0;
    for (let at = 0; at < mask.length; at++) {
      const painted = steps[at] > 0;
      if (mask[at]) { inside += 1; if (painted) inked += 1; } else { outside += 1; if (painted) outed += 1; }
    }
    const coverage = { inside: inside ? inked / inside : 0, outside: outside ? outed / outside : 0, cells: inside };
    return {
      ...coverage,
      separation: coverage.outside > 0 ? coverage.inside / coverage.outside : Infinity,
      share: inside / mask.length,
    };
  };

  // Las tres condiciones con nombre, para que el caso negativo informe CUÁL
  // rechaza al campo uniforme y no sólo que no pasa.
  const structureRules = (band) => [
    { name: 'la banda de atmósfera está llena',
      ok: band.inside >= BAND.inside && band.share >= BAND.region,
      detail: `${num(band.inside, 3)} de la banda pintada sobre ${band.cells} celdas `
        + `(${(band.share * 100).toFixed(1)} % del cuadro, el piso es ${num(BAND.region, 2)})` },
    { name: 'fuera de la banda el campo queda limpio',
      ok: band.outside <= BAND.outside,
      detail: `${num(band.outside, 3)} de tinta fuera de la banda · ${num(band.inside, 3)} dentro` },
    { name: 'la banda se separa del resto del campo',
      ok: band.separation >= BAND.separation,
      detail: `${num(band.separation, 1)}× (${num(band.inside, 3)} / ${num(band.outside, 3)}); un campo parejo da 1,0` },
  ];

  const region = washRegion(dataOri.constellation, { cols: CARD.cols, rows: CARD.rows, share: 0.5 });
  const band = structureOf(region.mask, atmosphere(dataOri.constellation));
  for (const rule of structureRules(band)) check(rule.name, rule.ok, rule.detail);

  // EL CASO NEGATIVO. Un campo PAREJO —el mismo tono en todas las celdas, el
  // promedio de la atmósfera de esta tarjeta— pasa por el mismo dither y por
  // las mismas tres condiciones. Si no fallara, la regla estaría midiendo
  // cobertura y no estructura.
  const wash = planeSheets(dataOri.constellation).lavado;
  const flatTone = wash.reduce((sum, value) => sum + value, 0) / wash.length;
  const flatSteps = material(dataOri.constellation, CARD.cols, CARD.rows, CARD.cell, () => flatTone, true).steps;
  const flatBand = structureOf(region.mask, flatSteps);
  const rejected = structureRules(flatBand).filter((rule) => !rule.ok).map((rule) => rule.name);
  check('un campo uniforme no pasa (caso negativo)', rejected.length > 0,
    `banda ${num(flatBand.inside, 3)} · fuera ${num(flatBand.outside, 3)} · ${num(flatBand.separation, 2)}× `
    + `— lo rechaza «${rejected.join('» y «')}»`);

  check('la figura tiene más cuerpo que la calma',
    field.stats.figureTone > field.stats.calmTone * 1.15,
    `bolsillo ${num(field.stats.figureTone, 4)} · calma ${num(field.stats.calmTone, 4)}`);

  // LA CALMA DEL TEXTO, CONTRA LA VARA. El 0,032 anterior se calibró con la
  // nube vieja; no se sube para que pase, se reemplaza por la vara medida con
  // el MISMO instrumento: el tono que el motor convierte en punto —el que
  // promedia `field.stats.calmTone`—, en la MISMA retícula de 480 × 300, sobre
  // el MISMO rectángulo de copia y con la viñeta de su cuadro. Nada se inventa:
  // la vara es `design-studies/v1/`, de sólo lectura, y su emisión se lee acá.
  // En intensidad de imagen (el protocolo de `docs/ESTETICA-CONSTELACION.md`,
  // que es como la casa llama «calma») la vara mide 0,044151 a 1440 y la
  // tarjeta 0,0157: los dos instrumentos dicen lo mismo, la copia es más oscura.
  const calm = dataOri.constellation.composition.calm;
  let calmLuma = 0;
  let calmCells = 0;
  let varaCalm = 0;
  const emission = EMISSIONS.dark;
  for (let y = 0; y < CARD.rows; y++) {
    for (let x = 0; x < CARD.cols; x++) {
      const px = (x + 0.5) * CARD.cell;
      const py = (y + 0.5) * CARD.cell;
      if (px < calm.x || px >= calm.x + calm.w || py < calm.y || py >= calm.y + calm.h) continue;
      calmLuma += field.rgbaLuma[y * CARD.cols + x];
      // La vara se muestrea en las mismas coordenadas de su retícula 480 × 300
      // (su `baseTone` ya habla en unidades de esa retícula) y con su viñeta.
      varaCalm += emission.baseTone(x + 0.5, y + 0.5) * emission.vignette(x + 0.5, y + 0.5);
      calmCells += 1;
    }
  }
  calmLuma = calmCells ? calmLuma / calmCells : 0;
  varaCalm = calmCells ? varaCalm / calmCells : 0;
  check('la calma de la copia no es más clara que la de la vara',
    field.stats.calmTone <= varaCalm,
    `copia ${num(field.stats.calmTone, 4)} de tono contra ${num(varaCalm, 4)} de la vara `
    + `· en intensidad de imagen: ${num(calmLuma, 4)} contra 0.0442 (la vara a 1440)`);

  // ------------------------------------------------------- 6 · isométrico
  // La etapa 3 como números: la pose de cada plano (desplazamiento + escala
  // compensada), la escalera de pesos, el orden de pintado y la diferencia
  // entre reposo y enfocado. Nada de esto se cree por declaración.
  const { ISO, STACK, planeScale } = await import(`file://${ROOT}/${CARDS}/isometric.mjs`);
  const isoRest = field;
  const isoFocus = buildField(dataOri, { focus: FOCUS_NODE });
  const corePlanes = STACK.filter((plane) => plane.afterVignette);

  check('los dos estados están identificados',
    isoRest.state === 'reposo' && isoFocus.state === 'enfocado' && isoFocus.focusPlane === 'far',
    `reposo sin nodo · enfocado nodo ${isoFocus.focusNode} del plano ${isoFocus.focusPlane}`);

  // El orden de pintado: la pila declarada es la que se recorre, y va de atrás
  // hacia adelante dentro de cada grupo; los núcleos van después de la viñeta.
  const paintKeys = isoRest.planes.map((plane) => plane.key);
  const frameOrder = isoRest.planes.filter((plane) => !plane.afterVignette).map((plane) => plane.z);
  const coreOrder = isoRest.planes.filter((plane) => plane.afterVignette).map((plane) => plane.z);
  const ascending = (values) => values.every((value, i) => i === 0 || value > values[i - 1]);
  check('orden de pintado, de atrás hacia adelante y sin reordenar',
    paintKeys.length === STACK.length && paintKeys.every((key, i) => key === STACK[i].key)
    && ascending(frameOrder) && ascending(coreOrder) && corePlanes.length > 0,
    `${paintKeys.join(' → ')} · núcleos después de la viñeta (${corePlanes.length})`);

  // La escala compensada: la de cada plano es la fórmula pedida, normalizada
  // por el plano más profundo (o el cielo abre un borde de ground en el cuadro).
  // Se mide sobre la escalera (`ladder`, la fórmula) y no sobre la pose final,
  // que además lleva la cámara del foco.
  const ratioOk = isoRest.planes.every((plane) => isoRest.planes.every((other) => {
    const left = plane.ladder / other.ladder;
    const right = planeScale(plane.z - isoRest.zFloor) / planeScale(other.z - isoRest.zFloor);
    return Math.abs(left - right) <= 1e-9;
  }));
  const ladders = isoRest.planes.map((plane) => plane.ladder);
  check('escala compensada por plano',
    ratioOk && Math.min(...ladders) >= 1 && Math.max(...ladders) <= 1.25,
    `(P + z − zfondo)/P en ${num(Math.min(...ladders), 4)} a ${num(Math.max(...ladders), 4)} `
    + `· ningún plano encoge (piso ${num(isoRest.cover, 4)} que cubre el cuadro)`);

  // La cámara del foco: el sujeto responde con la tasa 1 y su pose final supera
  // su escalera — la afirmación no es sólo el peso.
  const subjectRate = isoFocus.planes.find((plane) => plane.layer === 'figura' && plane.plane === isoFocus.focusPlane).rate;
  const otherRates = isoFocus.planes.filter((plane) => plane.layer === 'figura' && plane.plane !== isoFocus.focusPlane).map((plane) => plane.rate);
  check('la cámara afirma el plano del sujeto',
    subjectRate === 1 && otherRates.every((rate) => rate < 1),
    `sujeto ${num(subjectRate, 2)} · vecinos ${otherRates.map((rate) => num(rate, 2)).join(', ')}`);

  // El desplazamiento es POR PLANO, no por nodo: cada nodo se pinta en la pose
  // de su plano y los nodos de un plano comparten altura.
  const sharedPose = (field) => {
    const perPlane = new Map();
    for (const [i, node] of field.nodes.entries()) {
      const entry = perPlane.get(node.plane) ?? { same: true, count: 0 };
      const projected = field.screenOf(field.modelPx[i], node.plane);
      const ok = Math.abs(projected[0] - field.nodesPx[i][0]) <= 1e-6
        && Math.abs(projected[1] - field.nodesPx[i][1]) <= 1e-6;
      perPlane.set(node.plane, {
        z: field.zOf(node.plane),
        scale: field.poseOf(node.plane).scale,
        offset: field.poseOf(node.plane).offsetPx,
        same: entry.same && ok,
        count: entry.count + 1,
      });
    }
    return perPlane;
  };
  const poses = sharedPose(isoRest);
  const planesOk = poses.size === 3 && [...poses.values()].every((pose) => pose.same && pose.count > 0);
  const offsets = isoRest.planes.filter((plane) => plane.layer === 'figura').map((plane) => plane.offsetPx[1]);
  check('desplazamiento por plano, no por nodo',
    planesOk && ascending(offsets),
    [...poses.entries()].map(([name, pose]) => `${name} ${pose.count} nodos z ${num(pose.z, 1)}px`).join(' · '));

  // Ningún nodo fuera del cuadro: ni en reposo ni enfocando cada uno de los tres
  // planos (el sujeto afirma con la tasa 1 en cualquiera de ellos).
  const inside = (field) => field.nodesPx.every(([x, y]) => x >= 0 && x <= field.width && y >= 0 && y <= field.height);
  const focusPerPlane = {};
  for (const id of IDS) {
    const data = constellationFor(id);
    focusPerPlane[id] = ['far', 'mid', 'near'].map((plane) => {
      const node = data.constellation.nodes.findIndex((entry) => entry.plane === plane);
      return inside(node < 0 ? buildField(data) : buildField(data, { focus: node }));
    });
  }
  const allInside = Object.values(focusPerPlane).every((states) => states.every(Boolean));
  check('todos los nodos dentro del cuadro', inside(isoRest) && inside(isoFocus) && allInside,
    `${isoRest.nodesPx.length} nodos · reposo y los tres planos enfocados, en las cuatro tarjetas`);

  // Ningún plano se oculta: peso > 0 siempre y retención ≥ 40 % al enfocar.
  const lightest = Math.min(...isoRest.planes.map((plane) => plane.weight), ...isoFocus.planes.map((plane) => plane.weight));
  const retention = isoFocus.planes.map((plane) => {
    const base = isoRest.planes.find((entry) => entry.key === plane.key);
    return base && base.ink > 0 ? plane.ink / base.ink : 1;
  });
  check('ningún plano se oculta',
    lightest > 0 && retention.every((value) => value >= 0.4),
    `peso mínimo ${num(lightest, 4)} · retención mínima ${num(Math.min(...retention), 4)}`);

  // El sujeto se afirma: su plano es el que más pesa, no lleva desenfoque, se
  // adelanta sobre su propia altura (`ISO.affirm`) y su pose supera su escalera.
  const subject = isoFocus.planes.find((plane) => plane.layer === 'figura' && plane.plane === isoFocus.focusPlane);
  const heaviest = Math.max(...isoFocus.planes.filter((plane) => plane.layer !== 'núcleos').map((plane) => plane.weight));
  check('el plano del sujeto se afirma',
    subject.weight === heaviest && subject.blurPx === 0
    && Math.abs(subject.z - ISO.affirm * ISO.step) <= 1e-9 && subject.scale > subject.ladder,
    `${isoFocus.focusPlane}: peso ${num(subject.weight, 4)} · desenfoque ${num(subject.blurPx, 2)}px `
    + `· z ${num(subject.z, 1)}px (afirmación ${num(ISO.affirm * ISO.step, 1)}) · esc ${num(subject.scale, 3)} sobre ${num(subject.ladder, 3)}`);

  // El cielo y el lavado cubren el lienzo: la muestra de las cuatro esquinas
  // cae dentro de la lámina, o el plano de fondo abriría un borde recto.
  const corners = (field) => [[0, 0], [field.cols, 0], [0, field.rows], [field.cols, field.rows]];
  const covers = (field) => field.planes
    .filter((plane) => plane.plane === null)
    .every((plane) => corners(field).every(([x, y]) => {
      const source = field.sourceOf(x, y, plane);
      return source[0] >= -1e-9 && source[0] <= field.cols && source[1] >= -1e-9 && source[1] <= field.rows;
    }));
  check('el cielo y el lavado cubren el lienzo', covers(isoRest) && covers(isoFocus),
    'las cuatro esquinas de la muestra caen dentro de la lámina');

  // ¿El isométrico hace algo? La pieza tiene que cambiar entre los dos estados.
  const delta = compareTone(isoRest.tone, isoFocus.tone);
  check('el estado enfocado mueve la pieza',
    delta.changed >= 0.05 && delta.mean >= 0.004 && delta.peak >= 0.02,
    `${(delta.changed * 100).toFixed(1)} % de celdas cambian · media ${num(delta.mean, 4)} · pico ${num(delta.peak, 4)}`);

  lines.push('');
  lines.push(`ISOMÉTRICO  perspectiva ${ISO.perspective} px · paso ${ISO.step} px · eje ${ISO.axis.join(' / ')} `
    + `· deriva ${ISO.drift} · paralaje ${Object.entries(ISO.parallax).map(([layer, rate]) => `${layer} ${rate}`).join(' / ')} `
    + `· afirmación ${num(ISO.affirm * ISO.step, 1)} px`);
  for (const [name, field] of [['reposo', isoRest], ['enfocado', isoFocus]]) {
    lines.push(`ISOMÉTRICO  ${name.padEnd(8)} cubre ${num(field.cover, 4)} ` + field.planes.map((plane) =>
      `${plane.key} z${num(plane.z, 1)} esc${num(plane.scale, 3)} desp${plane.offsetPx.map((value) => num(value, 1)).join('/')} peso${num(plane.weight, 2)} des${num(plane.blurPx, 1)}`).join(' | '));
  }
  lines.push(`ISOMÉTRICO  reposo→enfocado: ${(delta.changed * 100).toFixed(1)} % de celdas · media ${num(delta.mean, 4)} · pico ${num(delta.peak, 4)}`);

  // ---------------------------------------------------------------- 7 · capas
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
    const changed = built.rgba.some((value, i) => value !== field.rgba[i]);
    check(`capa ${name}`, changed, changed ? 'mueve el compuesto' : 'no cambia nada: capa ausente');
  };
  variant('cielo', (c) => { c.layers.sky.density = 0; });
  variant('lavado', (c) => { c.layers.wash.gain = 0; });
  variant('figura', (c) => { c.nodes.forEach((node) => { node.magnitude = 0; }); });
  variant('núcleos', (c) => { c.layers.cores.inner = 0; c.layers.cores.outer = 0; });

  // ---------------------------------------------------------------- 8 · coste
  const walls = TRES.map((id) => report.walls[id]).sort((a, b) => a - b);
  const focusWalls = TRES.map((id) => report.walls[`${id}-enfocado`]).filter(Number.isFinite).sort((a, b) => a - b);
  const medianWall = walls[Math.floor(walls.length / 2)];
  const medianFocus = focusWalls[Math.floor(focusWalls.length / 2)] ?? medianWall;
  const fieldMs = isoRest.timings.field;
  lines.push('');
  lines.push(`COSTE  por tarjeta: campo ${ms(fieldMs)} `
    + `(láminas ${ms(isoRest.timings.sheets)} · planos ${ms(isoRest.timings.planes)} · dither ${ms(isoRest.timings.dither)} `
    + `· raster ${ms(isoRest.timings.raster)}) · proceso con navegador ${ms(medianWall)} (reposo) / ${ms(medianFocus)} (enfocado)`);

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
