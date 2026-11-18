/**
 * PROTOCOLO DE BENCHMARK PINEADO (skill §4, fila Coste).
 * ============================================================================
 * Un solo módulo para las dos superficies, para que Node y el navegador midan
 * exactamente lo mismo y la comparación signifique algo:
 *
 *   - el frame FRÍO se mide aparte, antes de cualquier calentamiento;
 *   - 60 frames de calentamiento;
 *   - 240 muestras dinámicas con índices repartidos por el ciclo;
 *   - el buffer RGBA se REUTILIZA (no se asigna por muestra);
 *   - resolución nativa: 200x100 celdas a 8 px = 1600x800, sin reescalar;
 *   - Node mide `renderFrame` + `rasterize`; el navegador añade `putImageData`
 *     porque eso es lo que el canvas paga de verdad.
 *
 * Se afirma sobre MEDIANA y p90; se reportan media/p95/peor (skill §6, trampa 4:
 * medir tiempo de pared con la máquina cargada produce falsos rojos).
 */
export const WARMUP_FRAMES = 60;
export const SAMPLE_FRAMES = 240;
export const BUDGET_MS = 16.67;
export const CELL = 8;

const now = () => globalThis.performance.now();

/** Cuantil por rango más cercano sobre un array YA ordenado. */
export function quantile(sorted, q) {
  if (sorted.length === 0) return Number.NaN;
  const at = Math.round((sorted.length - 1) * q);
  return sorted[Math.min(sorted.length - 1, Math.max(0, at))];
}

/**
 * Corre el protocolo pineado.
 * @param {{
 *   renderFrame: (scene: object, frame: number) => object,
 *   rasterize: (frame: object, scene: object, cell: number, into?: Uint8ClampedArray) => Uint8ClampedArray,
 *   scene: object,
 *   cycleFrames: number,
 *   buffer: Uint8ClampedArray,
 *   paint?: (rgba: Uint8ClampedArray, width: number, height: number) => void,
 * }} env
 */
export function runBench(env) {
  const { renderFrame, rasterize, scene, cycleFrames, buffer, paint } = env;
  const paintIfAny = (rgba, frame) => {
    if (paint) paint(rgba, frame.cols * CELL, frame.rows * CELL);
  };

  // Frame frío: la primera llamada del proceso, sin cachés tibias.
  const coldStart = now();
  const coldFrame = renderFrame(scene, 0);
  const coldRgba = rasterize(coldFrame, scene, CELL, buffer);
  paintIfAny(coldRgba, coldFrame);
  const cold = now() - coldStart;

  // Calentamiento: mismos caminos de código, 60 frames.
  for (let i = 0; i < WARMUP_FRAMES; i++) {
    const frame = renderFrame(scene, i % cycleFrames);
    paintIfAny(rasterize(frame, scene, CELL, buffer), frame);
  }

  // 240 muestras dinámicas: índices repartidos por todo el ciclo.
  const stride = Math.max(1, Math.floor(cycleFrames / SAMPLE_FRAMES));
  const samples = new Array(SAMPLE_FRAMES);
  for (let i = 0; i < SAMPLE_FRAMES; i++) {
    const index = (i * stride) % cycleFrames;
    const start = now();
    const frame = renderFrame(scene, index);
    const rgba = rasterize(frame, scene, CELL, buffer);
    paintIfAny(rgba, frame);
    samples[i] = now() - start;
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length;
  return {
    cell: CELL,
    resolution: `${scene.cols * CELL}x${scene.rows * CELL}`,
    warmup: WARMUP_FRAMES,
    samples: SAMPLE_FRAMES,
    budget: BUDGET_MS,
    cold,
    median: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    mean,
    p95: quantile(sorted, 0.95),
    worst: sorted[sorted.length - 1],
    reusedBuffer: buffer.length === scene.cols * CELL * scene.rows * CELL * 4,
    paints: paint ? 'renderFrame+rasterize+putImageData' : 'renderFrame+rasterize',
  };
}

/** El formato de una línea, idéntico en Node y en el navegador. */
export function benchLine(label, result) {
  const n = (v) => v.toFixed(2);
  return `${label}: mediana ${n(result.median)} ms · p90 ${n(result.p90)} ms · media ${n(result.mean)} ms · `
    + `p95 ${n(result.p95)} ms · peor ${n(result.worst)} ms · frío ${n(result.cold)} ms `
    + `(${result.paints}, ${result.samples} muestras, ${result.warmup} calentamiento, ${result.resolution})`;
}
