#!/usr/bin/env node
/**
 * VERIFICADOR DE NAVEGADOR — cierra las filas de §4 que una corrida de Node no
 * puede tocar: «Sin JS», la señal `data-state`/hash, y el coste del navegador
 * (que añade `putImageData` sobre el mismo protocolo pineado de `bench.mjs`).
 *
 *   TMPDIR=$PWD/tmp timeout 120 node verify-browser.mjs
 *
 * Reglas que respeta y que la skill exige:
 *   - SE ESPERA POR ESTADO (atributo `data-state`), nunca por tiempo;
 *   - la espera por estado lleva TIMEOUT DE SEGURIDAD: si no llega, se reporta,
 *     no se cuelga;
 *   - todo se mide con el MISMO motor y el MISMO protocolo que Node, así que el
 *     hash del canvas tiene que coincidir con el del `rasterize` de Node;
 *   - sirve la raíz del repo (4403): una página que importa
 *     `scripts/scene-src/*` sólo funciona desde ahí.
 *
 * Captura: 1280, 390 y con scripting OFF (el fallback tiene que ser el póster
 * horneado, nunca un rectángulo vacío).
 */
import { spawn } from 'node:child_process';
import { closeSync, existsSync, openSync } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { CELL, benchLine } from './bench.mjs';
import { POSTER_FRAME } from './scene-traza.mjs';
import scene from './scene-traza.mjs';
import { renderFrame, rasterize } from '../../../../scripts/scene-src/engine.mjs';

const here = resolve(new URL('.', import.meta.url).pathname);
const repoRoot = resolve(here, '../../../..');
const PORT = 4403;
const sha = (data) => createHash('sha256').update(data).digest('hex');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const rows = [];
function record(row, verdict, value, note = '') {
  rows.push({ row, verdict });
  const mark = verdict === 'OK' ? 'OK  ' : verdict === 'FAIL' ? 'FAIL' : verdict;
  console.log(`${row.padEnd(18)} | ${mark} | ${value}${note ? ` — ${note}` : ''}`);
}
const assertRow = (row, ok, value, note) => record(row, ok ? 'OK' : 'FAIL', value, note);

// ------------------------------------------------------- bins: Chrome y servidor
/** La skill dice `chromium`; aquí hay que resolverlo (ver HUECOS). */
function resolveChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/home/joshrm/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/home/joshrm/.cache/puppeteer/chrome-headless-shell/linux-154.0.8037.57/chrome-headless-shell-linux64/chrome-headless-shell',
  ];
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) throw new Error('no encontré un binario de Chromium (definí CHROME_BIN)');
  return found;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
};
function serveRepo() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
    const path = resolve(join(repoRoot, decodeURIComponent(url.pathname)));
    if (!path.startsWith(repoRoot)) {
      response.writeHead(403).end('fuera de la raíz');
      return;
    }
    try {
      const body = await readFile(path);
      response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404).end('no encontrado');
    }
  });
  return new Promise((done, fail) => {
    server.on('error', fail);
    server.listen(PORT, '127.0.0.1', () => done(server));
  });
}

// ------------------------------------------------------------------ CDP mínimo
class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.next = 1;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const slot = message.id && this.pending.get(message.id);
      if (slot) {
        this.pending.delete(message.id);
        if (message.error) slot.fail(new Error(message.error.message));
        else slot.done(message.result);
      }
    });
  }

  static async open(url) {
    const socket = new WebSocket(url);
    await new Promise((done, fail) => {
      socket.addEventListener('open', done, { once: true });
      socket.addEventListener('error', () => fail(new Error('no pude abrir el socket de CDP')), { once: true });
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = this.next++;
    return new Promise((done, fail) => {
      this.pending.set(id, { done, fail });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, awaitPromise = false) {
    const { result } = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.value;
  }

  close() {
    this.socket.close();
  }
}

/** Se espera por ESTADO, con timeout de seguridad: nunca por tiempo fijo. */
async function waitForState(cdp, wanted, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await cdp.evaluate('document.documentElement.dataset.state || ""');
    if (wanted.includes(state)) return { state, timedOut: false };
    await sleep(50);
  }
  return { state: await cdp.evaluate('document.documentElement.dataset.state || ""'), timedOut: true };
}

async function capture(cdp, width, height, file, posterBytes) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 600,
  });
  await sleep(120);
  const { cssContentSize } = await cdp.send('Page.getLayoutMetrics');
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: Math.ceil(cssContentSize.width), height: Math.ceil(cssContentSize.height), scale: 1 },
  });
  const bytes = Buffer.from(shot.data, 'base64');
  await writeFile(resolve(here, file), bytes);
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  // Referencia: el póster del MOTOR, reescalado al ancho de la captura. Si la
  // captura no se parece al póster, el fallback no está: es un rectángulo.
  const ref = await sharp(posterBytes).resize({ width: info.width }).raw().toBuffer({ resolveWithObject: true });
  const rows = Math.min(info.height, ref.info.height);
  const histogram = new Set();
  let bright = 0;
  let diff = 0;
  let channels = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < info.width; x++) {
      const at = (y * info.width + x) * info.channels;
      const refAt = (y * ref.info.width + x) * ref.info.channels;
      const r = data[at];
      const g = data[at + 1];
      const b = data[at + 2];
      histogram.add((r << 16) | (g << 8) | b);
      if ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.35) bright += 1;
      diff += Math.abs(r - ref.data[refAt]) + Math.abs(g - ref.data[refAt + 1]) + Math.abs(b - ref.data[refAt + 2]);
      channels += 3;
    }
  }
  return {
    file, width: info.width, height: info.height,
    colors: histogram.size,
    brightFraction: bright / (info.width * rows),
    posterDiff: diff / channels,
  };
}

// -------------------------------------------------------------------- la corrida
const chromePath = resolveChrome();
const chromeProfile = resolve(here, 'browser-profile-verify');
// TMPDIR="." con cwd en el directorio del estudio: es la regla de §1. Con un
// TMPDIR absoluto largo, Chrome muere con "Socket path too long" (reproducido).
const chromeLog = openSync(resolve(here, 'chrome-verify.log'), 'a');
const server = await serveRepo();
console.log(`servidor ${PORT} → raíz del repo ${repoRoot}`);
console.log(`chrome ${chromePath}`);

let chrome;
try {
  chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=0', `--user-data-dir=${chromeProfile}`,
    '--window-size=1280,900', '--no-first-run', '--no-default-browser-check',
    'about:blank',
  ], {
    cwd: here,
    stdio: ['ignore', 'ignore', chromeLog],
    env: { ...process.env, TMPDIR: '.' },
  });

  // El puerto de depuración se lee del archivo que Chrome escribe en el perfil.
  // Se exige que sea POSTERIOR al arranque: un perfil viejo puede dejar un
  // DevToolsActivePort rancio y el fetch moriría en ECONNREFUSED.
  const portFile = join(chromeProfile, 'DevToolsActivePort');
  const startedAt = Date.now() - 1000;
  let debugPort = null;
  const deadline = Date.now() + 20000;
  while (!debugPort && Date.now() < deadline) {
    await sleep(100);
    if (!existsSync(portFile)) continue;
    const info = await stat(portFile).catch(() => null);
    if (!info || info.mtimeMs < startedAt) continue;
    const [candidate] = (await readFile(portFile, 'utf8')).split('\n');
    try {
      const response = await fetch(`http://127.0.0.1:${candidate}/json/version`);
      if (response.ok) debugPort = candidate;
    } catch {
      // todavía no escucha: se reintenta hasta el tope
    }
  }
  if (!debugPort) throw new Error('Chrome no expuso el puerto de depuración (timeout de seguridad)');
  const base = `http://127.0.0.1:${debugPort}`;

  const pageUrl = `http://127.0.0.1:${PORT}/design-studies/visual-directions/skill-validation/run-3/index.html`;
  // `/json/new` exige PUT en Chrome moderno.
  const target = await (await fetch(`${base}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' })).json();
  const cdp = await Cdp.open(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // ---------- señal ready por estado
  const ready = await waitForState(cdp, ['ready', 'error']);
  assertRow('§4 sin JS · señal', ready.state === 'ready' && !ready.timedOut,
    `data-state="${ready.state}"${ready.timedOut ? ' (TIMEOUT DE SEGURIDAD)' : ''}`,
    'se esperó por atributo, no por tiempo; la espera tiene tope');

  const pageHash = await cdp.evaluate('document.documentElement.dataset.hash || ""');
  const expected = sha(Buffer.from(rasterize(renderFrame(scene, POSTER_FRAME), scene, CELL)));
  assertRow('motor Node↔canvas', pageHash === expected,
    `hash del canvas ${pageHash.slice(0, 16)}… ${pageHash === expected ? '=' : '≠'} hash de Node ${expected.slice(0, 16)}…`,
    'el hash se tomó de un getImageData posterior a putImageData: prueba de que hubo pintura');

  const canvasVisible = await cdp.evaluate('!document.getElementById("stage").hidden && document.getElementById("poster").hidden');
  assertRow('§2B póster/canvas', canvasVisible === true,
    'canvas visible y póster oculto sólo después de la pintura',
    'antes de pintar el canvas arranca hidden y el póster visible');

  // ---------- coste en navegador (mismo protocolo pineado + putImageData)
  const bench = await cdp.evaluate('window.__bench()', true);
  const benchOk = bench.median <= bench.budget && bench.p90 <= bench.budget;
  assertRow('§4 coste (nav.)', benchOk, benchLine('navegador', bench),
    `presupuesto ${bench.budget} ms; el frame frío de la página fue ${bench.pageCold.toFixed(2)} ms (incluye el arranque del canvas)`);
  const probe = await cdp.evaluate('window.__probeCold()', true);
  console.log(`                   | …  | frame raso (renderFrame+rasterize) ${probe.frame.toFixed(2)} ms · primer putImageData en canvas nuevo ${probe.paint.toFixed(2)} ms`);

  const posterBytes = await readFile(resolve(here, 'poster.png'));
  // ---------- capturas 1280 y 390
  const shot1280 = await capture(cdp, 1280, 720, 'browser-1280.png', posterBytes);
  assertRow('captura 1280', shot1280.colors > 8 && shot1280.brightFraction > 0.01 && shot1280.posterDiff < 16,
    `${shot1280.file} ${shot1280.width}x${shot1280.height} · ${shot1280.colors} colores · `
    + `${(shot1280.brightFraction * 100).toFixed(1)} % de píxeles encendidos · diferencia media con el póster ${shot1280.posterDiff.toFixed(1)}/255`,
    'no es un rectángulo vacío y se parece al póster del motor');
  const shot390 = await capture(cdp, 390, 260, 'browser-390.png', posterBytes);
  assertRow('captura 390', shot390.colors > 8 && shot390.brightFraction > 0.01 && shot390.posterDiff < 16,
    `${shot390.file} ${shot390.width}x${shot390.height} · ${shot390.colors} colores · `
    + `${(shot390.brightFraction * 100).toFixed(1)} % de píxeles encendidos · diferencia media con el póster ${shot390.posterDiff.toFixed(1)}/255`,
    'escala proporcional al ancho, sin recorte');

  // ---------- señal de error (importación que falla)
  const errorUrl = `http://127.0.0.1:${PORT}/design-studies/visual-directions/skill-validation/run-3/error-demo.html`;
  await cdp.send('Page.navigate', { url: errorUrl });
  const errorState = await waitForState(cdp, ['ready', 'error']);
  assertRow('§4 señal de error', errorState.state === 'error' && !errorState.timedOut,
    `data-state="${errorState.state}" · ${await cdp.evaluate('document.documentElement.dataset.error || ""')}`,
    'una importación que falla no deja una promesa colgada');

  // ---------- scripting OFF: el fallback es el póster horneado
  await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
  await cdp.send('Page.navigate', { url: pageUrl });
  await sleep(600);
  const noJsState = await cdp.evaluate('document.documentElement.dataset.state || ""');
  const shotNoJs = await capture(cdp, 1280, 720, 'browser-nojs.png', posterBytes);
  const posterInfo = await sharp(posterBytes).metadata();
  const noJsOk = shotNoJs.colors > 8 && shotNoJs.brightFraction > 0.01 && shotNoJs.posterDiff < 16;
  assertRow('§4 sin JS', noJsOk,
    `${shotNoJs.file} ${shotNoJs.width}x${shotNoJs.height} · ${shotNoJs.colors} colores · `
    + `${(shotNoJs.brightFraction * 100).toFixed(1)} % de píxeles encendidos · diferencia media con el póster `
    + `${shotNoJs.posterDiff.toFixed(1)}/255 · póster ${posterInfo.width}x${posterInfo.height} · data-state="${noJsState}"`,
    'el fallback es el póster del mismo motor; con scripting off la señal se queda en "loading" (ver HUECOS)');

  cdp.close();
} finally {
  if (chrome) chrome.kill('SIGTERM');
  server.close();
  closeSync(chromeLog);
}

const failed = rows.filter((row) => row.verdict === 'FAIL').length;
console.log(`\nRESUMEN navegador: ${rows.length - failed} OK · ${failed} FAIL`);
process.exitCode = failed === 0 ? 0 : 1;
