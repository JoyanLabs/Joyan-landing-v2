#!/usr/bin/env node
/**
 * CHECK DE LA SKILL — las filas de §4 que se pueden medir en Node, con las
 * aserciones que la skill define, y las de §1/§3 que las enmiendas v1.2/v1.3
 * añadieron. Una sola corrida imprime un veredicto por fila y un DIGEST.
 *
 *   TMPDIR=$PWD/tmp timeout 180 node check-skill.mjs
 *
 * La fila Legibilidad NO se certifica aquí: la skill exige un evaluador
 * independiente y esta corrida es parte de la iteración (protocolo ciego).
 *
 * Determinismo: se corre DOS veces, en procesos independientes, y se comparan
 * los DIGEST. La salida tiene que ser byte-idéntica.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { COVERAGE, frameChars, hexToRgb, luma, renderFrame, rasterize } from '../../../../scripts/scene-src/engine.mjs';
import { BUDGET_MS, CELL, benchLine, runBench } from './bench.mjs';
import scene, {
  ACCENT_NODE, COLS, CYCLE_FRAMES, NODES, POSTER_FRAME, ROWS, T,
  eventEnvelope, lightState, posterRgba, sweepAt,
} from './scene-traza.mjs';

const here = resolve(new URL('.', import.meta.url).pathname);
const sha = (data) => createHash('sha256').update(data).digest('hex');
const pct = (v) => `${(v * 100).toFixed(2)} %`;
const ms = (v) => `${v.toFixed(2)} ms`;
const LAST_RUNG = COVERAGE.length - 1;

const rows = [];
function record(row, verdict, value, note = '') {
  rows.push({ row, verdict, value, note });
  const mark = verdict === 'OK' ? 'OK  ' : verdict === 'FAIL' ? 'FAIL' : verdict;
  console.log(`${row.padEnd(16)} | ${mark} | ${value}${note ? ` — ${note}` : ''}`);
}
const assertRow = (row, condition, value, note) => record(row, condition ? 'OK' : 'FAIL', value, note);

// ---------------------------------------------------------------- §4 · Coste
// Primero de todo, para que el frame frío sea el primero del proceso.
const benchBuffer = new Uint8ClampedArray(COLS * CELL * ROWS * CELL * 4);
const bench = runBench({
  renderFrame, rasterize, scene, cycleFrames: CYCLE_FRAMES, buffer: benchBuffer,
});
assertRow('§4 coste (Node)', bench.median <= BUDGET_MS && bench.p90 <= BUDGET_MS,
  `mediana ${ms(bench.median)} · p90 ${ms(bench.p90)} · media ${ms(bench.mean)} · p95 ${ms(bench.p95)} · `
  + `peor ${ms(bench.worst)} · frío ${ms(bench.cold)}`,
  `presupuesto ${ms(BUDGET_MS)} sobre mediana y p90; ${bench.samples} muestras, ${bench.warmup} calentamiento, `
  + `buffer reutilizado=${bench.reusedBuffer}, ${bench.resolution}`);
console.log(`                 | …  | ${benchLine('protocolo', bench)}`);

// ------------------------------------------------------- §4 · Determinismo
const PINS = [0, 90, POSTER_FRAME, 270, CYCLE_FRAMES - 1];
const pinChars = PINS.map((index) => `#${index}\n${frameChars(renderFrame(scene, index))}`).join('\n');
const poster = posterRgba(CELL);
const digestTrace = sha(`chars\n${pinChars}\nrgba\n${Buffer.from(poster.rgba)}`);
const repeatChars = frameChars(renderFrame(scene, POSTER_FRAME));
const repeatSame = repeatChars === frameChars(renderFrame(scene, POSTER_FRAME));
assertRow('§4 determinismo', repeatSame, `DIGEST ${digestTrace}`,
  'misma salida en el mismo proceso; la igualdad byte a byte entre corridas la compara el runner (dos procesos)');
console.log(`                 | …  | frames pineados ${PINS.join(',')} · poster ${poster.width}x${poster.height} · `
  + `rgba-sha256 ${sha(Buffer.from(poster.rgba))}`);

// -------------------------------------------------------- §4 · Saturación
const total = COLS * ROWS;
let worstFrame = -1;
let worstCount = -1;
let worstFrac = 0;
let nonEmptyPoster = 0;
const posterSteps = poster.frame;
for (let i = 0; i < total; i++) if (posterSteps.steps[i] > 0) nonEmptyPoster += 1;
let prevSteps = null;
let firstSteps = null;
let jumpCells = 0;
let jumpMax = 0;
for (let index = 0; index < CYCLE_FRAMES; index++) {
  const frame = renderFrame(scene, index);
  let count = 0;
  for (let i = 0; i < total; i++) if (frame.steps[i] === LAST_RUNG) count += 1;
  const frac = count / total;
  if (frac > worstFrac) {
    worstFrac = frac;
    worstCount = count;
    worstFrame = index;
  }
  // Continuidad del loop (§3, trampa 3 de §6): un salto de ≥ 2 peldaños entre
  // frames consecutivos —incluido el cierre 359→0— sería una costura visible.
  if (prevSteps) {
    let jumps = 0;
    for (let i = 0; i < total; i++) if (Math.abs(frame.steps[i] - prevSteps[i]) >= 2) jumps += 1;
    jumpCells += jumps;
    if (jumps > jumpMax) jumpMax = jumps;
  } else {
    firstSteps = frame.steps;
  }
  prevSteps = frame.steps;
}
{
  let jumps = 0;
  for (let i = 0; i < total; i++) if (Math.abs(firstSteps[i] - prevSteps[i]) >= 2) jumps += 1;
  jumpCells += jumps;
  if (jumps > jumpMax) jumpMax = jumps;
}
assertRow('§4 saturación', worstFrac < 0.05,
  `peor frame ${worstFrame}: ${worstCount}/${total} celdas = ${pct(worstFrac)} en el último peldaño (${LAST_RUNG})`,
  `barrido completo de ${CYCLE_FRAMES} índices; umbral < 5 %`);

// Control obligatorio 1: la escena NO está vacía.
assertRow('§4 control vacío', nonEmptyPoster > 0,
  `póster: ${nonEmptyPoster}/${total} celdas con tinta (${pct(nonEmptyPoster / total)})`,
  'control de escena no vacía');

// Control obligatorio 2: un campo saturado tiene que dar 100 %.
const maxTone = Math.max(...scene.palette.map((hex) => luma(...hexToRgb(hex))));
const saturatedControl = {
  id: 'control-saturado', cols: 8, rows: 8, fps: 1, cycleFrames: 1,
  palette: scene.palette, ground: scene.ground, field: () => maxTone,
};
const controlFrame = renderFrame(saturatedControl, 0);
const controlCount = Array.from(controlFrame.steps).filter((step) => step === LAST_RUNG).length;
const controlFrac = controlCount / controlFrame.steps.length;
assertRow('§4 control saturado', controlFrac === 1,
  `campo a maxTone: ${controlCount}/${controlFrame.steps.length} = ${pct(controlFrac)}`,
  'el control tiene que dar 100 %; si no, la medición de saturación no mide nada');

// --------------------------------------------------------------- §4 · Contraste
const page = await readFile(resolve(here, 'index.html'), 'utf8');
const token = (name) => {
  const match = page.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  return match ? match[1] : null;
};
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const relativeLuminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastRatio = (a, b) => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const paper = token('paper');
const ink = token('ink');
const ratio = paper && ink ? contrastRatio(ink, paper) : Number.NaN;
const engineRatio = paper && ink
  ? (Math.max(luma(...hexToRgb(ink)), luma(...hexToRgb(paper))) + 0.05)
    / (Math.min(luma(...hexToRgb(ink)), luma(...hexToRgb(paper))) + 0.05)
  : Number.NaN;
assertRow('§4 contraste', ratio >= 4.5,
  `par --ink ${ink} sobre --paper ${paper} = ${ratio.toFixed(2)}:1 (WCAG, luminancia linealizada)`,
  `la escena no trae texto; el único par real es la leyenda de la página. Con la luma de pantalla del motor `
  + `daría ${engineRatio.toFixed(2)}:1 — la skill no dice qué luminancia usar (ver HUECOS)`);

// ------------------------------------------------------------- §4 · Sin JS
const posterBytes = await readFile(resolve(here, 'poster.png'));
const posterW = posterBytes.readUInt32BE(16);
const posterH = posterBytes.readUInt32BE(20);
const noJs = /<img[^>]+poster\.png/.test(page) && /<canvas[^>]+hidden/.test(page)
  && /data-state/.test(page) && /'ready'/.test(page) && /'error'/.test(page);
assertRow('§4 sin JS', noJs && posterW === COLS * CELL && posterH === ROWS * CELL,
  `póster ${posterW}x${posterH} referenciado por <img>; canvas arranca hidden; señal ready/error en el marcado`,
  'la captura con scripting off la hace verify-browser.mjs (una corrida de Node no puede pintar)');

// ----------------------------------------------------------------- §3 · Animación
const adapterOk = T === CYCLE_FRAMES / scene.fps;
const envZero = eventEnvelope(0) === 0 && eventEnvelope(1) === 0
  && eventEnvelope(-0.1) === 0 && eventEnvelope(1.1) === 0;
const sweepZero = sweepAt(0) === 0 && sweepAt(1) === 0;
const endsOffState = lightState(0).head < 0 && lightState(1).head < 0
  && lightState(0).accent === 0 && lightState(1).accent === 0;
const headZero = endsOffState;
const frame0 = renderFrame(scene, 0);
const frameLast = renderFrame(scene, CYCLE_FRAMES - 1);
/** Cuántas celdas están ENCENDIDAS (peldaño 3 o 4): la cadena y el acento. */
const litCells = (frame) => Array.from(frame.steps).filter((step) => step >= 3).length;
const topCells = (frame) => Array.from(frame.steps).filter((step) => step === LAST_RUNG).length;
const endsDark = litCells(frame0) === 0 && litCells(frameLast) === 0
  && topCells(frame0) === 0 && topCells(frameLast) === 0;
const posterPeak = topCells(posterSteps) > 0 && litCells(posterSteps) > 0;
assertRow('§3 adaptador/loop',
  adapterOk && envZero && sweepZero && headZero && endsDark && posterPeak,
  `T=${T}s (=${CYCLE_FRAMES}/${scene.fps}) · envolvente(0)=${eventEnvelope(0)} envolvente(1)=${eventEnvelope(1)} · `
  + `head(0)=${lightState(0).head.toFixed(2)} head(1)=${lightState(1).head.toFixed(2)} · `
  + `encendidas frame 0=${litCells(frame0)}, frame ${CYCLE_FRAMES - 1}=${litCells(frameLast)}, `
  + `póster=${litCells(posterSteps)} (peldaño ${LAST_RUNG}: ${topCells(posterSteps)})`,
  'los dos extremos del loop quedan apagados (ni cadena ni acento) y el póster tiene el acento en el último peldaño');
assertRow('§3 continuidad', jumpCells === 0,
  `${jumpCells} celdas con |Δpaso| ≥ 2 entre frames consecutivos del ciclo (peor par: ${jumpMax})`,
  'incluye el cierre último→primero; se mide la secuencia, no dos renders independientes');

// ------------------------------------------------------------- §1 · Boceto
const sketch = await readFile(resolve(here, 'sketch.svg'), 'utf8');
const sketchDims = sketch.match(/viewBox="0 0 (\d+) (\d+)"/);
const sketch390 = await readFile(resolve(here, 'sketch-390.png'));
const s390W = sketch390.readUInt32BE(16);
const s390H = sketch390.readUInt32BE(20);
const aspect = sketch.match(/data-aspect-ratio="([^"]+)"/);
const mobile = sketch.match(/data-mobile-policy="([^"]+)"/);
const scales = /width="100%"/.test(sketch) && /height="100%"/.test(sketch) && /preserveAspectRatio=/.test(sketch);
assertRow('§1 boceto',
  Boolean(aspect && mobile && scales && sketchDims && sketchDims[1] === '1600' && sketchDims[2] === '800')
  && s390W === 390 && s390H === 195,
  `aspecto ${aspect ? aspect[1] : '—'} · móvil declarado · captura 390x${s390H} (sin recorte: 2:1)`,
  `tablero ${sketchDims ? `${sketchDims[1]}x${sketchDims[2]}` : '—'}; el SVG declara width/height 100 % + viewBox `
  + `porque el comando de §1 abre el archivo directo y, con un width fijo, recorta`);

// --------------------------------------------------------- §4 · Legibilidad
record('§4 legibilidad', 'PENDIENTE',
  'no certificable por quien itera: hace falta un evaluador ciego',
  'consigna y capturas listas en RESULTADO.md; la escena no se aprueba sin ese paso');

// --------------------------------------------------------------------- salida
const failed = rows.filter((row) => row.verdict === 'FAIL').length;
console.log(`\nDIGEST ${digestTrace}`);
console.log(`RESUMEN ${rows.length - failed} fila(s) OK · ${failed} FAIL · 1 PENDIENTE (legibilidad) · escena ${scene.id} · `
  + `nodos ${NODES.length} (acento ${ACCENT_NODE})`);
process.exitCode = failed === 0 ? 0 : 1;
