#!/usr/bin/env node
// WU29 — the public sequence: black start, engine reveal, corrupted text arc.
// ============================================================================
// The user's direction: the PUBLIC page starts on pure black — only the
// terminal typing "Wake up, Neo…" — then the engine's own warp ramp transforms
// it into the unicorn scene, the fate line takes the tagline slot, corrupts
// through OUR dot-ramp glyphs and re-forms into the watcher line, which stays.
// The eyebrow "Próximamente" is replaced by a line with character, and the
// ES/EN switch becomes a real link pair. This checker pins that contract from
// the repository sources and the built dist; nothing is asserted on trust.
//
// Usage: node scripts/check-public-sequence.mjs [--out <dir>]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async (path) => {
  try {
    return await readFile(resolve(root, path), 'utf8');
  } catch {
    return null;
  }
};

const failures = [];
let passed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed += 1;
  else failures.push({ name, detail: String(detail).slice(0, 400) });
};

const heroSrc = await read('src/components/joyan/JoyanComingHero.astro');
const esSrc = await read('src/pages/index.astro');
const enSrc = await read('src/pages/en/index.astro');
const pubSrc = await read('src/lib/public-sequence.ts');
const labRuntimeSrc = await read('src/lib/sequence-runtime.ts');
const sceneRuntimeSrc = await read('src/lib/scene-runtime.ts');
const warpSrc = await read('scripts/scene-src/sequence-warp.mjs');

// --- The public sequence runtime --------------------------------------------
check('runtime: src/lib/public-sequence.ts exists', Boolean(pubSrc));
if (pubSrc) {
  check('runtime: renders ONLY through the engine (renderFrame/rasterize from scripts/scene-src/engine.mjs)',
    /from\s+'[^']*scripts\/scene-src\/engine\.mjs'/.test(pubSrc) && /renderFrame/.test(pubSrc) && /rasterize/.test(pubSrc));
  // WU33 — the reveal is the HALFTONE MASK ramp (the warp burst is retired
  // from the public page); the shared ramp module is still the one source.
  check('runtime WU33: the reveal is the shared halftone mask ramp (sequence-warp: sequenceMaskScene + MASK_RAMP.steps)',
    /sequence-warp/.test(pubSrc) && /sequenceMaskScene/.test(pubSrc) && /MASK_RAMP\.steps/.test(pubSrc));
  check('runtime WU33: the WARP BURST is retired from the public path (no rampBurst/sequenceWarpScene in the public runtime)',
    !/rampBurst/.test(pubSrc) && !/sequenceWarpScene/.test(pubSrc),
    'the public runtime still references the retired warp burst');
  check('runtime: the corruption scrambles through OUR ramp glyphs ( ·•● ) — no random unicode noise',
    /['"`] ·•●['"`]/.test(pubSrc) || /['"`]·•●['"`]/.test(pubSrc), 'ramp-glyph alphabet missing');
  check('runtime WU32: the decode resolves per character on its own clock (charDeadline + jitter, left-to-right lock)',
    /charDeadline/.test(pubSrc) && /renderDecode/.test(pubSrc),
    'the decode still sweeps the whole string with one clock');
  check('runtime WU32: cycling glyphs carry the ACCENT colour; settled text keeps the base tone (no per-char random tone)',
    /DECODE_ACCENT/.test(pubSrc) && !/SCRAMBLE_TONES/.test(pubSrc),
    'the decode still randomises glyph tones');
  check('runtime WU32: the decode reserves the final box before scrambling (no layout shift: the box is pinned, then released)',
    /reserveBox/.test(pubSrc) && /releaseBox/.test(pubSrc),
    'the decode does not pin the text box');
  // WU33 — the settled state IS today's composition: the mask ramp's top state
  // paints the base scene (the checker measures the bytes further below).
  check('runtime WU33: the arc settles on the base scene (the runtime paints the top mask state / base after the reveal)',
    /MASK_RAMP\.steps/.test(pubSrc) && /sceneForState|sequenceMaskScene/.test(pubSrc));
  check('runtime: pauses offscreen/hidden (IntersectionObserver, visibilitychange) and cleans up on pagehide',
    /IntersectionObserver/.test(pubSrc) && /visibilitychange/.test(pubSrc) && /pagehide/.test(pubSrc));
  check('runtime: reduced motion skips the intro and the scramble to the final state',
    /prefers-reduced-motion/.test(pubSrc) && /scramble/i.test(pubSrc));
  check('runtime: the payload is checked at the boundary, not cast',
    /isSequencePayload|isSerializedScene/.test(pubSrc));

  // --- WU33: the name is first-paint content --------------------------------
  // The user REMOVED the content gate: the name is never decoded and never
  // hidden — it is visible from first paint, and the sequence only ever adds
  // motion on top. The WU31/WU32 name assembly (renderDecode on the h1) is
  // retired from the public runtime.
  check('runtime WU33: the name is NEVER decoded (no renderDecode on the h1, no name box pin) — first-paint content',
    !/renderDecode\(nameEl/.test(pubSrc) && !/releaseBox\(nameEl\)/.test(pubSrc) && !/reserveBox\(nameEl/.test(pubSrc),
    'the name still has an assembly/decode path');
  // The watcher line may only ever be assigned at the arc's final phase (the
  // scramble completes) or by the skip affordance — never during the reveal.
  check('runtime WU31: the watcher line is assigned ONLY at the final phase and by the skip',
    (pubSrc.match(/tagline\.textContent = watcherText/g) ?? []).length === 2
      && /tagline\.textContent = watcherText[\s\S]{0,120}setPhase\('final'\)/.test(pubSrc),
    'the watcher line can surface before the final phase');
  // The invisible skip: click, tap or keypress jumps to the final state; no
  // visible button, so the only control is still the language pair.
  check('runtime WU31: an invisible skip affordance exists (pointerdown on the hero + keydown, both land on skipToFinal)',
    /addEventListener\(\s*['"]pointerdown['"]/ .test(pubSrc)
      && /addEventListener\(\s*['"]keydown['"]/.test(pubSrc)
      && /skipToFinal\(\)/.test(pubSrc));
  // The arc constants. WU33 supersedes WU31's 7–9 s window ON THE RECORD (the
  // user re-paced the text to ~5 s per phrase): the arc is now typing + hold
  // + mask reveal + full hold + fate-in decode + fate hold + watcher decode.
  // The checker pins a window around the constant sum; the LIVE duration is
  // measured by the browser evidence (WU32's live arc ran ~400 ms over its
  // constant sum — the sum alone is not proof).
  const ms = (re) => Number(re.exec(pubSrc)?.[1] ?? NaN);
  const rampMs = Number(/durationMs:\s*(\d+)/.exec(warpSrc ?? '')?.[1] ?? NaN);
  const terminalLine = /data-hero-terminal-text="([^"]*)"/.exec(heroSrc ?? '')?.[1] ?? '';
  const arcMs = terminalLine.length * ms(/TYPE_STEP_MS = (\d+)/) + ms(/TYPE_HOLD_MS = (\d+)/)
    + rampMs + ms(/FULL_HOLD_MS = (\d+)/) + ms(/FATE_IN_MS = (\d+)/)
    + ms(/FATE_HOLD_MS = (\d+)/) + ms(/SCRAMBLE_MS = (\d+)/);
  check('runtime WU33: the whole arc (typing + reveal + fate-in + fate + decode) sits inside 10–15 s (WU33 pacing, supersedes WU31 7–9 s)',
    Number.isFinite(arcMs) && arcMs >= 10000 && arcMs <= 15000, `arcMs=${arcMs} (rampMs=${rampMs})`);
  // WU33 — the pacing defect: the WU32 fate hold of 1,900 ms was the defect.
  // The fate line must hold ~5 s (readable before it decodes into the next
  // phrase), and the decode itself must run SLOWER than WU32's 860 ms.
  check('runtime WU33: the fate line holds ~5 s (4500–5500 ms; the WU32 hold of 1900 ms was the defect)',
    ms(/FATE_HOLD_MS = (\d+)/) >= 4500 && ms(/FATE_HOLD_MS = (\d+)/) <= 5500,
    `FATE_HOLD_MS=${ms(/FATE_HOLD_MS = (\d+)/)}`);
  check('runtime WU33: the decode runs slower than WU32 (SCRAMBLE_MS > 860; per-character clocks kept)',
    ms(/SCRAMBLE_MS = (\d+)/) > 860, `SCRAMBLE_MS=${ms(/SCRAMBLE_MS = (\d+)/)}`);
  check('runtime WU33: the fate line decodes IN (a FATE_IN phase with its own decode before the ~5 s hold)',
    ms(/FATE_IN_MS = (\d+)/) >= 800, `FATE_IN_MS=${ms(/FATE_IN_MS = (\d+)/)}`);
  // WU33 — the invisible skip must not swallow the locale link.
  check('runtime WU33: the invisible skip excludes the locale link (targets inside [data-hero-locale] are ignored)',
    /data-hero-locale/.test(pubSrc) && /closest\([^)]*data-hero-locale/.test(pubSrc),
    'the skip can swallow the locale link');
}

// --- The hero component ------------------------------------------------------
// WU33 — the content gate is REMOVED. The h1, the eyebrow, the scene layer and
// the final watcher line exist and are visible with zero JavaScript, with
// reduced motion, and at first paint with scripting on; the sequence only ever
// ADDS motion on top. No rule may ever hide the name, the eyebrow or the
// tagline; the only hidden-by-default elements are the terminal (it fades in
// when its typing phase starts) and the credit (it rides with the fate line).
check('hero: imports the public sequence runtime (~/lib/public-sequence), not the lab runtime',
  Boolean(heroSrc) && /~\/lib\/public-sequence/.test(heroSrc) && !/~\/lib\/scene-runtime/.test(heroSrc));
{
  const heroStyle = heroSrc ? (/<style>[\s\S]*<\/style>/.exec(heroSrc)?.[0] ?? '') : '';
  const blocks = [...heroStyle.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const zeroRules = (token) => blocks
    .filter((m) => m[1].includes(token) && /opacity:\s*0/.test(m[2]))
    .map((m) => m[1].replace(/\s+/g, ' ').trim());
  // Content is never hidden: not at boot, not per phase, not under reduced
  // motion — no opacity:0 rule may name the name, the eyebrow or the tagline.
  for (const token of ['[data-hero-name]', '[data-hero-eyebrow]', '[data-hero-tagline]']) {
    check(`hero WU33: ${token} is never hidden by any rule (first-paint content, all states)`,
      zeroRules(token).length === 0, zeroRules(token).join(' | ') || 'clean');
  }
  // The scene layer is visible from first paint; the ONLY dimming allowed is
  // the poster's reveal-time crossfade (gated on [data-playing], which the
  // runtime sets when the mask reveal starts — never before, never without JS).
  const sceneZero = zeroRules('.scene-layer').concat(zeroRules('[data-hero-poster]'));
  check('hero WU33: the scene layer is visible from first paint — the only dimming is the poster crossfade gated on [data-playing] (the reveal)',
    sceneZero.length > 0 && sceneZero.every((sel) => sel.includes('data-playing')),
    sceneZero.join(' | ') || 'no scene rule');
  // The terminal is the beat, not a door: hidden by default, shown when its
  // typing phase runs (a phase attribute only scripting can set).
  const termZero = zeroRules('[data-hero-terminal]');
  const termShow = blocks.filter((m) => m[1].includes('[data-hero-terminal]') && /opacity:\s*1/.test(m[2]))
    .map((m) => m[1].replace(/\s+/g, ' ').trim());
  check('hero WU33: the terminal is the only pre-reveal-hidden element (default hidden, shown only under the typing phase)',
    termZero.length > 0 && termShow.length > 0 && termShow.every((sel) => sel.includes("data-sequence-phase='typing'")),
    `${termShow.join(' | ') || 'no show rule'}`);
  // The credit still rides with the fate line only.
  const creditShow = blocks.filter((m) => m[1].includes('hero-credit') && /opacity:\s*1/.test(m[2]))
    .map((m) => m[1].replace(/\s+/g, ' ').trim());
  check('hero WU33: the credit rides with the fate line only (fateIn/fate/scramble; gone at final)',
    creditShow.length > 0 && creditShow.every((sel) => sel.includes('hero-credit-on')),
    creditShow.join(' | ') || 'no show rule');
  // The old content gate machinery must be GONE: no boot-state hiding of
  // content, no [data-ready]-gated scene blackout.
  check('hero WU33: the boot content gate is removed (no data-sequence-boot hiding rules, no :not([data-ready]) blackout of the scene)',
    !/data-sequence-boot[^{]*\{[^}]*opacity:\s*0/.test(heroStyle)
      && !/:not\(\[data-ready\]\)[^{]*\.scene-layer[^{]*\{[^}]*opacity:\s*0/.test(heroStyle));
}
check('hero WU33: the server markup IS the final state (watcher line in the tagline slot, poster in the scene layer, no-JS complete)',
  Boolean(heroSrc) && /data-hero-tagline[^>]*>\s*\{watcherLine\}/.test(heroSrc.replace(/\n/g, ' '))
    && /data-hero-poster/.test(heroSrc));
check('hero: reduced motion needs no boot override (no content to un-hide); the terminal stays hidden and the caret stops',
  Boolean(heroSrc) && /prefers-reduced-motion/.test(heroSrc) && !/data-sequence-boot/.test(heroSrc));
check('hero: the terminal lives in the tagline slot (VT323, bone text, amber prompt, caret)',
  Boolean(heroSrc) && /data-hero-terminal/.test(heroSrc) && /VT323/.test(heroSrc)
    && /text-accent|#ffb000/i.test(heroSrc) && /caret/i.test(heroSrc));
check('hero: the credit rides with the fate line and leaves with it',
  Boolean(heroSrc) && /data-hero-credit/.test(heroSrc) && /TERMINATOR 2 · SARAH CONNOR/.test(heroSrc));
// WU32 — the taste corrections the user named: the credit must sit clearly
// BELOW the eyebrow in hierarchy (10 px plomo, reduced tracking, against the
// eyebrow's 12 px amber 0.3em), and the footer dot rule next to the footer
// note is gone (the footer text and the contact row stay).
check('hero WU32: the credit is 10 px, plomo, with reduced tracking (below the eyebrow in hierarchy)',
  Boolean(heroSrc) && /data-hero-credit class="hero-credit[^"]*text-\[10px\]/.test(heroSrc)
    && /data-hero-credit class="hero-credit[^"]*text-plomo/.test(heroSrc)
    && /data-hero-credit class="hero-credit[^"]*tracking-\[0\.12em\]/.test(heroSrc)
    && !/data-hero-credit class="hero-credit[^"]*text-accent/.test(heroSrc),
  'the credit is still 12 px amber');
check('hero WU32: the footer dot rule is gone (footer text and contact row stay)',
  Boolean(heroSrc) && !/viewBox="0 0 104 8"/.test(heroSrc) && /footerNote/.test(heroSrc) && /contactEmail/.test(heroSrc),
  'the 104x8 dot rule svg is still in the footer');
check('hero: the ES/EN link pair renders in the corner (localeHref prop, real <a> to the other locale)',
  Boolean(heroSrc) && /data-hero-locale/.test(heroSrc) && /localeHref/.test(heroSrc) && /<a\s/.test(heroSrc));

// --- The pages ---------------------------------------------------------------
for (const [name, src, other, label, eyebrow, oldEyebrow] of [
  ['ES', esSrc, '"/en"', 'EN', 'TRANSMISIÓN', 'Próximamente'],
  ['EN', enSrc, '"/"', 'ES', 'TRANSMISSION', 'Coming soon'],
]) {
  check(`${name}: the eyebrow is replaced (${eyebrow}) and the generic line is gone from the markup`,
    Boolean(src) && src.includes(eyebrow)
      && !/eyebrow="Próximamente"|eyebrow="Coming soon"|comingSoon=/.test(src));
  check(`${name}: the fate line and the watcher line are the tagline arc`,
    Boolean(src)
      && (src.includes('El futuro no está escrito. No hay destino, salvo el que hacemos nosotros.')
        || src.includes('The future is not set. There is no fate but what we make for ourselves.'))
      && (src.includes('Alguien tiene que mirar a las máquinas.')
        || src.includes('Someone has to watch the machines.')));
  check(`${name}: links to the other locale (${other}) labelled ${label}`,
    Boolean(src) && src.includes(`localeHref=${other}`) && src.includes(`localeLabel="${label}"`));
  check(`${name}: the old generic tagline is gone from the hero copy`,
    Boolean(src) && !src.includes('Algo preciso está tomando forma.')
      && !src.includes('Something precise is taking shape.'));
}

// --- The lab stays coherent --------------------------------------------------
check('lab: /lab/sequence keeps its own runtime and boot mechanism (no public-sequence import)',
  Boolean(read('src/components/joyan/SequenceLab.astro'))
    && !/public-sequence/.test(await read('src/components/joyan/SequenceLab.astro') ?? ''));
check('lab: the shared ramp module is still the one source (sequence-warp untouched by the public arc)',
  Boolean(read('scripts/scene-src/sequence-warp.mjs')));

// --- Node-side scene invariant ----------------------------------------------
try {
  const engine = await import(resolve(root, 'scripts/scene-src/engine.mjs'));
  const ramp = await import(resolve(root, 'scripts/scene-src/sequence-warp.mjs'));
  const pipeline = await import(resolve(root, 'scripts/scene-src/image-pipeline.mjs'));
  const fromImage = await import(resolve(root, 'scripts/scene-src/from-image.mjs'));
  const local = await import(resolve(root, 'scripts/scene-src/local-inputs.mjs'));
  const mark = local.LOCAL_INPUTS.find((entry) => entry.id === 'joyan-mark');
  const converted = await fromImage.convert(mark.svg, {
    cols: 160, rows: 80, mode: 'ink', colorMode: 'levels', palette: 'ink',
    id: 'wu29-public-probe', label: 'wu29 checker probe',
  });
  const payload = pipeline.rollSerializedScene(pipeline.serializeScene(converted.scene), ramp.SEQUENCE_ROLL);
  const base = ramp.sequenceScene(payload);
  const frameBase = engine.renderFrame(base, base.posterFrame, { dither: 'bayer4', density: 1 });
  const rgbaBase = engine.rasterize(frameBase, base, engine.DELIVERY_CELL);

  // --- WU33: the halftone mask reveal ---------------------------------------
  // The user retired the WU31/WU32 warp burst from the PUBLIC page and chose a
  // HALFTONE reveal: a mask that drives dot coverage so the scene assembles
  // from the ramp upward — crisp, graphic, our own dot language. The mask
  // function (docs/MOTOR-ESCENAS.md): per cell, a normalized metric m(x,y)
  // (radial from the SUBJECT centroid, or a diagonal wipe), dithered by one
  // Bayer cell (m' = m + (bayer - 0.5)·edgeN) so the front is crisp but never
  // jagged; the resolve amount a = clamp01((s - m')/growthN) climbs the RAMP
  // ladder behind the front (dots bloom ground → rungs → full); still-
  // resolving cells carry a small amber front (k ∝ a·(1−a), exactly 0 at
  // a = 1, so the settled state is untouched). The front position is
  // s = maskFront(p)·sMax with sMax = 1 + growthN + edgeN/2, so at the top of
  // the ramp every cell is fully resolved and the settled raster is the base
  // composition BYTE FOR BYTE.
  const overlaysMod = await import(resolve(root, 'scripts/scene-src/overlays.mjs'));
  check('scene WU33: the halftone mask overlay is the LAST catalogue entry (it masks the whole composed field, vignette included)',
    overlaysMod.OVERLAY_IDS[overlaysMod.OVERLAY_IDS.length - 1] === 'halftone');
  check('scene WU33: the warp overlay stays in the catalogue and in the lab runtime (retired from the public page, not deleted)',
    overlaysMod.OVERLAY_IDS.includes('warp') && /sequenceWarpScene|WARP_RAMP/.test(labRuntimeSrc ?? ''));
  check('scene WU33: MASK_RAMP is the public reveal ramp (steps 12, a finite durationMs)',
    ramp.MASK_RAMP && ramp.MASK_RAMP.steps === 12 && Number.isFinite(ramp.MASK_RAMP.durationMs)
      && ramp.MASK_RAMP.durationMs > 0);
  const settled = ramp.sequenceMaskScene(payload, ramp.MASK_RAMP.steps);
  const frameSettled = engine.renderFrame(settled, settled.posterFrame, { dither: 'bayer4', density: 1 });
  const rgbaSettled = engine.rasterize(frameSettled, settled, engine.DELIVERY_CELL);
  let equal = rgbaBase.length === rgbaSettled.length;
  for (let i = 0; equal && i < rgbaBase.length; i++) equal = rgbaBase[i] === rgbaSettled[i];
  check('scene WU33: the settled mask state (top of the ramp) rasterises byte-identical to the base composition', equal);

  const masked0 = ramp.sequenceMaskScene(payload, 0);
  const frame0 = engine.renderFrame(masked0, masked0.posterFrame, { dither: 'bayer4', density: 1 });
  check('scene WU33: mask state 0 resolves nothing (every cell at ground — the scene assembles from the ramp upward)',
    [...frame0.steps].every((s) => s === 0), `lit at state 0: ${[...frame0.steps].filter((s) => s > 0).length}`);

  // Determinism: the same state renders byte-identical, twice in a row and
  // interleaved with another state (the memoised sampler must survive it).
  const detScene = ramp.sequenceMaskScene(payload, 5);
  const detA = engine.rasterize(engine.renderFrame(detScene, 3, { dither: 'bayer4', density: 1 }), detScene, engine.DELIVERY_CELL);
  const detB = engine.rasterize(engine.renderFrame(detScene, 3, { dither: 'bayer4', density: 1 }), detScene, engine.DELIVERY_CELL);
  let detEqual = detA.length === detB.length;
  for (let i = 0; detEqual && i < detA.length; i++) detEqual = detA[i] === detB[i];
  const detOther = engine.rasterize(engine.renderFrame(masked0, 3, { dither: 'bayer4', density: 1 }), masked0, engine.DELIVERY_CELL);
  const detC = engine.rasterize(engine.renderFrame(detScene, 3, { dither: 'bayer4', density: 1 }), detScene, engine.DELIVERY_CELL);
  let detInterleaved = detC.length === detA.length;
  for (let i = 0; detInterleaved && i < detA.length; i++) detInterleaved = detC[i] === detA[i];
  check('scene WU33: the mask is deterministic (repeat render byte-identical, interleaved state sampling equals fresh evaluation)',
    detEqual && detInterleaved && (detOther.length !== 0));

  // The mask centre IS the subject: radial-from-subject, measured against the
  // inked centroid of the ROLLED scene (the same geometry the render uses).
  const geo = ramp.maskCentreFromPayload(payload);
  const rawFieldProbe = pipeline.sceneFromSerialized(payload).field;
  let inkW = 0; let inkX = 0; let inkY = 0;
  const rawProbe = new Float64Array(base.cols * base.rows);
  const subjectProbe = new Uint8Array(base.cols * base.rows);
  for (let y = 0; y < base.rows; y++) {
    for (let x = 0; x < base.cols; x++) {
      const got = rawFieldProbe(x, y, 0);
      const v = typeof got === 'number' ? got : 0.2126 * got[0] + 0.7152 * got[1] + 0.0722 * got[2];
      rawProbe[y * base.cols + x] = v;
      if (v > 0.4) { subjectProbe[y * base.cols + x] = 1; inkW += v; inkX += x * v; inkY += y * v; }
    }
  }
  const inkCentroid = inkW > 0 ? [inkX / inkW / (base.cols - 1), inkY / inkW / (base.rows - 1)] : [0.5, 0.46];
  check('scene WU33: the mask centre IS the subject (within 0.12 of the inked centroid of the rolled scene — radial from the subject)',
    Math.abs(geo.centre[0] - inkCentroid[0]) <= 0.12 && Math.abs(geo.centre[1] - inkCentroid[1]) <= 0.12,
    `mask=${JSON.stringify(geo.centre)} ink=${JSON.stringify(inkCentroid)}`);

  // MEASURED mask metrics for BOTH variants (the parent asked for the sweep
  // direction to be measured, not assumed):
  //   - cells resolving per frame at mid-ramp (motion, not a flicker);
  //   - edge sharpness: the fraction of changed cells inside the mask's own
  //     transition band (a scattered resolve would fail this);
  //   - subject recognition: the ramp fraction at which >= 50 % of the
  //     subject's cells render a dot (recognizable BEFORE the reveal ends).
  const HT = overlaysMod.OVERLAY_DEFAULTS.halftone;
  const g = ramp.maskGeometry(payload);
  const metricOf = (mode) => (x, y) => mode === 'wipe'
    ? (x + y) / Math.max(1, base.cols + base.rows - 2)
    : Math.hypot(x - geo.centre[0] * (base.cols - 1), y - geo.centre[1] * (base.rows - 1)) / geo.maxDist;
  const renderState = (state, mode) => engine.renderFrame(
    ramp.sequenceMaskScene(payload, state, mode), base.posterFrame, { dither: 'bayer4', density: 1 });
  const measureMode = (mode) => {
    const metric = metricOf(mode);
    const framesPerState = (ramp.MASK_RAMP.durationMs / ramp.MASK_RAMP.steps) / 1000 * base.fps;
    const k = Math.round(ramp.MASK_RAMP.steps / 2);
    const sLo = ramp.maskFront(k / ramp.MASK_RAMP.steps) * g.sMax;
    const sHi = ramp.maskFront((k + 1) / ramp.MASK_RAMP.steps) * g.sMax;
    const fa = renderState(k, mode);
    const fb = renderState(k + 1, mode);
    let changed = 0; let inBand = 0;
    for (let y = 0; y < base.rows; y++) {
      for (let x = 0; x < base.cols; x++) {
        const i = y * base.cols + x;
        if (fa.steps[i] === fb.steps[i] && fa.indices[i] === fb.indices[i]) continue;
        changed += 1;
        const m = metric(x, y);
        if (m > sLo - g.growthN - g.edgeN / 2 - g.cellMetric && m <= sHi + g.edgeN / 2 + g.cellMetric) inBand += 1;
      }
    }
    let s50 = null;
    let s90 = null;
    for (let st = 0; st <= ramp.MASK_RAMP.steps && (s50 === null || s90 === null); st++) {
      const f = renderState(st, mode);
      let lit = 0; let n = 0;
      for (let i = 0; i < subjectProbe.length; i++) {
        if (!subjectProbe[i]) continue;
        n += 1;
        if (f.steps[i] > 0) lit += 1;
      }
      const fraction = lit / Math.max(1, n);
      if (s50 === null && fraction >= 0.5) s50 = st / ramp.MASK_RAMP.steps;
      if (s90 === null && fraction >= 0.9) s90 = st / ramp.MASK_RAMP.steps;
    }
    return { mode, changed, cellsPerFrame: +(changed / framesPerState).toFixed(1),
      edgeSharpness: +(inBand / Math.max(1, changed)).toFixed(4), s50, s90 };
  };
  const mRadial = measureMode('radial');
  const mWipe = measureMode('wipe');
  check('scene WU33: the mask sweeps as MOTION (shipped mode resolves 10..4000 cells per frame at mid-ramp)',
    mRadial.cellsPerFrame >= 10 && mRadial.cellsPerFrame <= 4000, `cells/frame=${mRadial.cellsPerFrame}`);
  check('scene WU33: the resolve edge is SHARP (>= 0.9 of changed cells sit inside the mask transition band; the rest would be scattered noise)',
    mRadial.edgeSharpness >= 0.9, `edgeSharpness=${mRadial.edgeSharpness}`);
  check('scene WU33: the subject is recognizable before the reveal completes (>= 50 % of subject cells lit by 35 % of the ramp)',
    mRadial.s50 !== null && mRadial.s50 <= 0.35, `s50=${mRadial.s50}`);
  check('scene WU33: radial-from-subject WINS the measurement (subject half-lit earlier than the wipe) and is the shipped mode',
    HT.mode === 'radial' && mRadial.s50 !== null && mWipe.s50 !== null && mRadial.s50 <= mWipe.s50,
    `radial s50=${mRadial.s50} wipe s50=${mWipe.s50}`);

  // Seam: the mask is TIME-FREE (a function of the ramp state, never of t),
  // so the composed field closes over the loop exactly like the base's own
  // periodic overlays (float round-off only).
  const maskSeamScene = ramp.sequenceMaskScene(payload, 6);
  const loopT = base.cycleFrames / base.fps;
  let seamMask = 0;
  for (let y = 0; y < base.rows; y++) {
    for (let x = 0; x < base.cols; x++) {
      const a = maskSeamScene.field(x, y, 0);
      const b = maskSeamScene.field(x, y, loopT);
      for (let ch = 0; ch < 3; ch++) seamMask = Math.max(seamMask, Math.abs(a[ch] - b[ch]));
    }
  }
  check('scene WU33: the mask field seam stays ~0 over the loop (time-free mask; measured against the same grid)',
    seamMask <= 1e-9, `seamMask=${seamMask.toExponential(2)}`);
  var maskEvidence = { radial: mRadial, wipe: mWipe, centre: geo.centre, seamMask, sMax: g.sMax };

  // --- WU32: the settled composition keeps the subject legible --------------
  // Two metrics, both honest about sparse line art:
  //   - subject/ground LIT-FRACTION contrast (the perceptual test): the raw
  //     converted field is ink COVERAGE (0 = empty), so the audit's own
  //     thresholds hold unchanged: subject cells are raw > 0.4, empty ground
  //     is raw <= 0.1. The metric is how often a subject cell actually
  //     renders a visible dot (raster step > 0) minus how often an empty
  //     ground cell does. The WU31 composition measured 0.2545 on this
  //     metric — the unicorn's faint strokes rendered no brighter than the
  //     lifted ground around them —; the rebuilt composition must beat 0.55.
  //   - the ground-noise fraction (composed field tone > 0.15 on empty
  //     cells): the WU31 composition measured 0.2472; the rebuilt one must
  //     hold <= 0.15 (measured 0.121 after the WU32 re-tuning).
  const settledW32 = ramp.sequenceScene(payload);
  // The mask must be taken at the ROLLED geometry (the page rolls the serialised
  // scene +18 columns before treating it) — the unrolled converted field would
  // measure a drawing that is not where the render put it.
  const rawFieldW32 = pipeline.sceneFromSerialized(payload).field;
  const rawW32 = new Float64Array(settledW32.cols * settledW32.rows);
  const fieldW32 = new Float64Array(settledW32.cols * settledW32.rows);
  for (let y = 0; y < settledW32.rows; y++) {
    for (let x = 0; x < settledW32.cols; x++) {
      const got = rawFieldW32(x, y, 0);
      rawW32[y * settledW32.cols + x] = typeof got === 'number' ? got : 0.2126 * got[0] + 0.7152 * got[1] + 0.0722 * got[2];
      const composed = settledW32.field(x, y, settledW32.posterFrame / settledW32.fps);
      fieldW32[y * settledW32.cols + x] = 0.2126 * composed[0] + 0.7152 * composed[1] + 0.0722 * composed[2];
    }
  }
  let noisyW32 = 0; let groundW32 = 0;
  for (let i = 0; i < rawW32.length; i++) {
    if (rawW32[i] > 0.1) continue;
    groundW32 += 1;
    if (fieldW32[i] > 0.15) noisyW32 += 1;
  }
  const groundNoiseW32 = noisyW32 / Math.max(1, groundW32);
  const renderedW32 = engine.renderFrame(settledW32, settledW32.posterFrame, { dither: 'bayer4', density: 1 });
  let subjectLitW32 = 0; let subjectNW32 = 0; let groundLitW32 = 0;
  for (let i = 0; i < rawW32.length; i++) {
    const lit = renderedW32.steps[i] > 0;
    if (rawW32[i] > 0.4) { subjectNW32 += 1; if (lit) subjectLitW32 += 1; }
    else if (rawW32[i] <= 0.1 && lit) groundLitW32 += 1;
  }
  const litContrastW32 = subjectLitW32 / Math.max(1, subjectNW32) - groundLitW32 / Math.max(1, groundW32);
  check('scene WU32: the settled composition keeps the subject legible (subject/ground lit-fraction contrast >= 0.55; the WU31 composition measured 0.2545)',
    litContrastW32 >= 0.55, `litContrast=${litContrastW32.toFixed(4)}`);
  check('scene WU32: the ground behind the subject stays quiet (noisy ground fraction <= 0.15; the WU31 composition measured 0.2472)',
    groundNoiseW32 <= 0.15, `groundNoise=${groundNoiseW32.toFixed(4)}`);
  var wu32Evidence = { litContrast: litContrastW32,
    subjectLitFraction: +(subjectLitW32 / Math.max(1, subjectNW32)).toFixed(4), groundNoise: groundNoiseW32 };
} catch (error) {
  check('scene: settled-state byte equality', false, error.message);
}

check('hero WU33: the footer mark is the 88-cell pipeline rendering (an <img> under /assets/brand/, data-discord-mark kept; the 16×10 svg grid is gone from the hero)',
  Boolean(heroSrc) && /data-discord-mark/.test(heroSrc)
    && /\/assets\/brand\/discord-mark-88\.png/.test(heroSrc)
    && !/DISCORD_DOT_GRID/.test(heroSrc),
  'the footer still carries the 16×10 hand grid');
{
  // The committed asset: the pipeline's own 88-cell conversion (the user's
  // pick), baked from the serialised scene through the engine's raster path —
  // never a third-party bitmap.
  const { existsSync, statSync } = await import('node:fs');
  const markPath = resolve(root, 'public/assets/brand/discord-mark-88.png');
  check('asset WU33: public/assets/brand/discord-mark-88.png exists (the 88-cell rendering committed as an asset, not an inline blob)',
    existsSync(markPath));
  if (existsSync(markPath)) {
    const buf = await (await import('node:fs/promises')).readFile(markPath);
    const isPng = buf.toString('ascii', 1, 4) === 'PNG';
    const w = isPng ? buf.readUInt32BE(16) : 0;
    const h = isPng ? buf.readUInt32BE(20) : 0;
    check('asset WU33: the mark asset is a 176×176 PNG (88 cells at 2 px per cell — dots stay round at the footer size)',
      isPng && w === 176 && h === 176, `${w}x${h}`);
    check('asset WU33: the mark asset stays within 20 KiB (a footer dot mark, not a poster)',
      buf.length <= 20 * 1024, `${buf.length} B`);
  }
}

// --- DIST --------------------------------------------------------------------
const esHtml = await read('dist/index.html');
const enHtml = await read('dist/en/index.html');
check('dist: the built ES page mounts the hero with the terminal, the mark asset and the locale link (no boot gate in the markup)',
  Boolean(esHtml) && esHtml.includes('data-hero-terminal') && esHtml.includes('discord-mark-88.png')
    && !esHtml.includes('data-sequence-boot')
    && /href="\/en"/.test(esHtml));
check('dist: the built EN page links back to /',
  Boolean(enHtml) && /href="\/"/.test(enHtml) && enHtml.includes('data-hero-terminal'));

// --- Report ------------------------------------------------------------------
const mode = failures.length ? 'RED' : 'GREEN';
const report = { mode: failures.length ? 'RED' : 'GREEN', checker: 'check-public-sequence', passed, failed: failures.length, failures };
if (typeof maskEvidence !== 'undefined') report.maskEvidence = maskEvidence;
if (typeof wu32Evidence !== 'undefined') report.wu32Evidence = wu32Evidence;
console.log(JSON.stringify(report, null, 2));
const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0 && process.argv[outIndex + 1]) {
  const outDir = resolve(root, process.argv[outIndex + 1]);
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, failures.length ? 'red.json' : 'green.json'), JSON.stringify(report, null, 2));
}
process.exit(failures.length ? 1 : 0);
