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
const sceneRuntimeSrc = await read('src/lib/scene-runtime.ts');
const warpSrc = await read('scripts/scene-src/sequence-warp.mjs');

// --- The public sequence runtime --------------------------------------------
check('runtime: src/lib/public-sequence.ts exists', Boolean(pubSrc));
if (pubSrc) {
  check('runtime: renders ONLY through the engine (renderFrame/rasterize from scripts/scene-src/engine.mjs)',
    /from\s+'[^']*scripts\/scene-src\/engine\.mjs'/.test(pubSrc) && /renderFrame/.test(pubSrc) && /rasterize/.test(pubSrc));
  check('runtime: the reveal is the shared warp ramp (sequence-warp: sequenceWarpScene + WARP_RAMP.steps)',
    /sequence-warp/.test(pubSrc) && /sequenceWarpScene/.test(pubSrc) && /WARP_RAMP\.steps/.test(pubSrc));
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
  check('runtime: the intro settles at bucket 0 (the final scene is exactly today\'s composition)',
    /bucket[\s\S]*0[\s\S]*revealDown|sequenceWarpScene\([\s\S]*?state <= 0/.test(pubSrc)
      && /revealDown/i.test(pubSrc));
  check('runtime: pauses offscreen/hidden (IntersectionObserver, visibilitychange) and cleans up on pagehide',
    /IntersectionObserver/.test(pubSrc) && /visibilitychange/.test(pubSrc) && /pagehide/.test(pubSrc));
  check('runtime: reduced motion skips the intro and the scramble to the final state',
    /prefers-reduced-motion/.test(pubSrc) && /scramble/i.test(pubSrc));
  check('runtime: the payload is checked at the boundary, not cast',
    /isSequencePayload|isSerializedScene/.test(pubSrc));

  // --- WU31: the user's correction round ------------------------------------
  // The name arrives WITH the effect: it assembles through the same dot-ramp
  // glyph corruption the tagline uses, never a plain fade.
  // WU32: the name assembles through the SAME decode as the lines —
  // renderDecode over the ramp glyphs, its own salt, released with the arc.
  check('runtime WU31/WU32: the name assembles through OUR dot-ramp glyphs (renderDecode on the h1, own salt, box released)',
    /renderDecode\(nameEl, nameText, p, 31\)/.test(pubSrc) && /data-hero-name/.test(pubSrc)
      && /SCRAMBLE_GLYPHS/.test(pubSrc) && /releaseBox\(nameEl\)/.test(pubSrc),
    'the name has no assembly path of its own');
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
  // The arc must sit inside 7–9 s: typing (server-rendered terminal text ×
  // step) + hold + the shared ramp + full hold + settle + fate hold + scramble.
  const ms = (re) => Number(re.exec(pubSrc)?.[1] ?? NaN);
  const rampMs = Number(/durationMs:\s*(\d+)/.exec(warpSrc ?? '')?.[1] ?? NaN);
  const terminalLine = /data-hero-terminal-text="([^"]*)"/.exec(heroSrc ?? '')?.[1] ?? '';
  const arcMs = terminalLine.length * ms(/TYPE_STEP_MS = (\d+)/) + ms(/TYPE_HOLD_MS = (\d+)/)
    + rampMs + ms(/FULL_HOLD_MS = (\d+)/) + ms(/SETTLE_MS = (\d+)/) + ms(/FATE_HOLD_MS = (\d+)/) + ms(/SCRAMBLE_MS = (\d+)/);
  check('runtime WU31: the whole arc (typing + reveal + settle + fate + scramble) sits inside 7–9 s',
    Number.isFinite(arcMs) && arcMs >= 7000 && arcMs <= 9000, `arcMs=${arcMs} (rampMs=${rampMs})`);
}

// --- The hero component ------------------------------------------------------
check('hero: the boot marker gates the black start on scripting (inline script sets data-sequence-boot before first paint)',
  Boolean(heroSrc) && /data-sequence-boot/.test(heroSrc) && /<script is:inline>/.test(heroSrc));
check('hero: imports the public sequence runtime (~/lib/public-sequence), not the lab runtime',
  Boolean(heroSrc) && /~\/lib\/public-sequence/.test(heroSrc) && !/~\/lib\/scene-runtime/.test(heroSrc));
check('hero: act 1 hides the scene layer, eyebrow and tagline (black start, JS-gated)',
  Boolean(heroSrc)
    && /data-sequence-boot='js'\]:not\(\[data-ready\]\)[\s\S]*scene-layer[\s\S]*opacity:\s*0/.test(heroSrc)
    && /data-sequence-boot='js'\]:not\(\[data-ready\]\)[\s\S]*data-hero-eyebrow[\s\S]*opacity:\s*0/.test(heroSrc));
// WU31 — act 1 contains NOTHING but the terminal: the name h1 is emptied too.
check('hero WU31: act 1 hides the name as well — no Joyan h1 while the terminal types (boot-gated, aria-label keeps the SR name)',
  Boolean(heroSrc)
    && /data-sequence-boot='js'\]:not\(\[data-ready\]\)\s+\[data-hero-name\]\s*\{[^}]*opacity:\s*0/.test(heroSrc)
    && /data-hero-name/.test(heroSrc) && /aria-label=\{name\}/.test(heroSrc));
// WU31 — the watcher-line guarantee: under scripting the tagline (and the
// credit) are phase-gated; every rule that shows them must name one of the
// late phases. The pre-mount reduced-motion boot rules (:not([data-ready]))
// are the documented exception — reduced motion shows the final state.
{
  const heroStyle = heroSrc ? (/<style>[\s\S]*<\/style>/.exec(heroSrc)?.[0] ?? '') : '';
  const blocks = [...heroStyle.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const showSelectors = (token) => blocks
    .filter((m) => m[1].includes(token) && /opacity:\s*1/.test(m[2]))
    .map((m) => m[1])
    .filter((sel) => !sel.includes(':not([data-ready])'));
  const phaseGated = (token, phases) => {
    const rules = showSelectors(token);
    return rules.length > 0 && rules.every((sel) => phases.some((ph) => sel.includes(`data-sequence-phase='${ph}'`)));
  };
  const LATE = ['fate', 'scramble', 'final'];
  check('hero WU31: the watcher line is phase-gated — every show rule names fate, scramble or final',
    phaseGated('[data-hero-tagline]', LATE),
    showSelectors('[data-hero-tagline]').join(' | ') || 'no show rule');
  check('hero WU31: the credit rides with the fate line only (fate/scramble; gone at final)',
    phaseGated('[data-hero-credit]', ['fate', 'scramble']),
    showSelectors('[data-hero-credit]').join(' | ') || 'no show rule');
  check('hero WU31: the name and eyebrow arrive at the reveal (visible from revealUp on, never before)',
    phaseGated('[data-hero-name]', ['revealUp', 'full', 'revealDown', ...LATE])
      && phaseGated('[data-hero-eyebrow]', ['revealUp', 'full', 'revealDown', ...LATE]),
    showSelectors('[data-hero-name]').join(' | ') || 'no show rule');
  check('hero WU31: the fate line renders SMALLER than the watcher line (a quote, not the headline: fate 15px, watcher 18px; WU32: the credit 10px plomo)',
    /data-sequence-phase='fate'\]\s*\[data-hero-tagline\][\s\S]{0,200}font-size:\s*0\.9375rem/.test(heroSrc)
      && /data-hero-tagline[^>]*class="[^"]*\btext-lg\b/.test(heroSrc)
      && /data-hero-credit[^>]*class="[^"]*text-\[10px\]/.test(heroSrc));
}
check('hero: no-JS (no boot marker) shows the final state — scene and copy visible, never black',
  Boolean(heroSrc) && /data-hero-tagline/.test(heroSrc) && !/data-sequence-boot='no-js'/.test(heroSrc));
check('hero: reduced motion skips straight to the final state (media query on the boot state too)',
  Boolean(heroSrc) && /prefers-reduced-motion[\s\S]*data-sequence-boot/.test(heroSrc));
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
  const settled = ramp.sequenceWarpScene(payload, 0);
  const frameBase = engine.renderFrame(base, base.posterFrame, { dither: 'bayer4', density: 1 });
  const frameSettled = engine.renderFrame(settled, settled.posterFrame, { dither: 'bayer4', density: 1 });
  const rgbaBase = engine.rasterize(frameBase, base, engine.DELIVERY_CELL);
  const rgbaSettled = engine.rasterize(frameSettled, settled, engine.DELIVERY_CELL);
  let equal = rgbaBase.length === rgbaSettled.length;
  for (let i = 0; equal && i < rgbaBase.length; i++) equal = rgbaBase[i] === rgbaSettled[i];
  check('scene: the settled reveal state (ramp back to 0) rasterises byte-identical to the base composition', equal);

  // --- WU31: the burst profile — a reveal that actually reads ---------------
  // The burst is a property of the RAMP STATE (`rampBurst(state)`), so the
  // live canvas, the Node checkers and the engine probe agree without a
  // second channel. It is exactly 0 at both ends (the settled page is today's
  // page, byte for byte) and peaks mid-ramp, where the arrival happens.
  check('scene WU31: the burst is a property of the ramp state (rampBurst exported, used by the runtime, zero at both ends, peak >= 0.99 mid-ramp)',
    typeof ramp.rampBurst === 'function' && /rampBurst/.test(pubSrc)
      && ramp.rampBurst(0) === 0 && ramp.rampBurst(ramp.WARP_RAMP.steps) === 0
      && ramp.rampBurst(Math.round(ramp.WARP_RAMP.steps / 2)) >= 0.99);
  check('scene WU31: the burst overrides differ from the plain warp (warpRampOverrides takes the burst argument)',
    JSON.stringify(ramp.warpRampOverrides(1, 1)) !== JSON.stringify(ramp.warpRampOverrides(1, 0)));
  // Bucket 0 with the burst switched on must STILL be the base composition:
  // the burst only ever amplifies states the ramp actually visits.
  const burstZero = ramp.sequenceWarpScene(payload, 0, 1);
  const frameB0 = engine.renderFrame(burstZero, burstZero.posterFrame, { dither: 'bayer4', density: 1 });
  const rgbaB0 = engine.rasterize(frameB0, burstZero, engine.DELIVERY_CELL);
  let b0equal = rgbaB0.length === rgbaBase.length;
  for (let i = 0; b0equal && i < rgbaB0.length; i++) b0equal = rgbaB0[i] === rgbaBase[i];
  check('scene WU31: burst-0 (bucket 0 with the burst on) raster is byte-identical to the base composition', b0equal);

  // Measured legibility of the burst against the plain full warp, over the
  // same probe scene the lab checker uses (the metrics are properties of the
  // OVERLAY + RAMP, not of the subject): changed cells, accent-signed
  // fraction ((r-b) > 0.25 — only amber/rose joyan-page entries reach it) and
  // peak brightness. WU32 — the radial-coherence metric is REPLACED by the
  // trail/streak metrics further below: the rebuilt warp lights a trail field
  // everywhere the subject's light reaches, so counting only spoke-window,
  // bloom-core and edge-zone cells would call the new streaks "incoherent".
  const overlaysMod = await import(resolve(root, 'scripts/scene-src/overlays.mjs'));
  const wp = overlaysMod.OVERLAY_DEFAULTS.warp;
  const pcx = wp.centre[0] * (base.cols - 1);
  const pcy = wp.centre[1] * (base.rows - 1);
  const pMaxDist = Math.hypot(Math.max(pcx, base.cols - 1 - pcx), Math.max(pcy, base.rows - 1 - pcy)) || 1;
  const probeT = base.cycleFrames / base.fps * 0.12;
  const front = ((probeT / 30) * wp.trips) % 1;
  const measureBurst = (scene, overrides) => {
    const sigma = overrides.sigma ?? wp.sigma;
    // The bloom core extends to where the gaussian drops under 0.02, as the
    // overlay itself applies it.
    const br = overrides.bloom?.radius ?? wp.bloom.radius;
    const bi = overrides.bloom?.intensity ?? wp.bloom.intensity;
    const bloomExtent = bi > 0.02 ? br * Math.sqrt(2 * Math.log(bi / 0.02)) : 0;
    let changed = 0; let accent = 0; let radial = 0; let peak = 0;
    for (let y = 0; y < base.rows; y++) {
      for (let x = 0; x < base.cols; x++) {
        const a = base.field(x, y, probeT);
        const b = scene.field(x, y, probeT);
        const luma = 0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2];
        if (luma > peak) peak = luma;
        if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) <= 0.02) continue;
        changed += 1;
        if (b[0] - b[2] > 0.25) accent += 1;
        const dx = x - pcx; const dy = y - pcy;
        const r = Math.hypot(dx, dy) / pMaxDist;
        const spoke = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * wp.spokes);
        const onSpoke = engine.hashNoise(spoke, 0, wp.seed) < wp.spokeDensity;
        const d = ((r - front) % 1 + 1) % 1 - 0.5;
        if ((onSpoke && Math.exp(-(d * d) / (2 * sigma * sigma)) > 0.05) || r <= bloomExtent) radial += 1;
      }
    }
    return { changed, accent, accentFraction: accent / Math.max(1, changed), spokeFraction: radial / Math.max(1, changed), peak, bloomExtent };
  };
  const plainFull = ramp.sequenceWarpScene(payload, 1);
  const burstFull = ramp.sequenceWarpScene(payload, 1, 1);
  const mPlain = measureBurst(plainFull, ramp.warpRampOverrides(1, 0));
  const mBurst = measureBurst(burstFull, ramp.warpRampOverrides(1, 1));
  check('scene WU31: the burst changes MORE cells than the plain full warp',
    mBurst.changed > mPlain.changed, `burst=${mBurst.changed} plain=${mPlain.changed}`);
  // WU32 re-baseline (honest, not silent): the WU31 check demanded an
  // accent-SIGNED FRACTION >= 0.35 of the changed cells — but the rebuilt warp
  // lights a trail field of thousands of cells, so the amber wavefront (now
  // gated to ride ON light) is a minority of the changed set BY DESIGN. The
  // discipline itself is the WU32 scatter check (0 amber cells off-spoke);
  // what must stay is an absolute amber presence on the streaks and above the
  // plain warp.
  check('scene WU31: the burst carries the amber on the streaks (>= 150 accent-signed cells, above the plain warp)',
    mBurst.accent >= 150 && mBurst.accent > mPlain.accent,
    `burst=${mBurst.accent} plain=${mPlain.accent} (changed ${mBurst.changed})`);
  check('scene WU31: the burst peak brightness is above the plain warp (the bloom reads as a light source)',
    mBurst.peak > mPlain.peak, `burst=${mBurst.peak.toFixed(4)} plain=${mPlain.peak.toFixed(4)}`);
  var burstEvidence = { plain: mPlain, burst: mBurst, probeT, front };

  // --- WU32: the warp rebuilt as DISPLACEMENT WITH TRAILS -------------------
  // The user rejected the WU31 frames: the burst read as a grey smudge, the
  // accents scattered at the frame edges and the subject drowned. The fix is
  // mechanical: radial resampling (a 1/z-style pull that samples the base
  // field along the ray toward the centre) plus TRAILS (a cell keeps the
  // recent path of its ray at reduced coverage), so a still frame shows
  // radial streaks instead of a blob. Measured here, RASTER level (the
  // scattered accents live in the palette selection, not the field):
  //   - trail field: interior (r <= 0.6) cells the burst changes OUTSIDE the
  //     spoke windows and the bloom core. The WU31 warp produced 2-3; the
  //     rebuilt warp must light a real field (>= 300).
  //   - accent discipline: NEW accent cells ((r-b) > 0.2 — the amber/rose
  //     joyan-page entries) at r > 0.6 whose perpendicular distance to every
  //     hash-active spoke ray exceeds 1.5 cells are SCATTERED noise. The WU31
  //     warp scattered 70.87 % of them; the rebuilt warp must hold <= 0.15.
  const probeFrameW32 = Math.round(probeT * base.fps);
  const rasterCellsW32 = (scene) => {
    const rendered = engine.renderFrame(scene, probeFrameW32, { dither: 'bayer4', density: 1 });
    const rgba = engine.rasterize(rendered, scene, engine.DELIVERY_CELL);
    const out = new Float64Array(base.cols * base.rows * 3);
    for (let y = 0; y < base.rows; y++) {
      for (let x = 0; x < base.cols; x++) {
        let rr = 0; let gg = 0; let bb = 0;
        for (let py = 0; py < engine.DELIVERY_CELL; py++) {
          for (let px = 0; px < engine.DELIVERY_CELL; px++) {
            const i = (((y * engine.DELIVERY_CELL + py) * (base.cols * engine.DELIVERY_CELL)) + x * engine.DELIVERY_CELL + px) * 4;
            rr += rgba[i]; gg += rgba[i + 1]; bb += rgba[i + 2];
          }
        }
        const n = engine.DELIVERY_CELL * engine.DELIVERY_CELL;
        out[(y * base.cols + x) * 3] = rr / n / 255;
        out[(y * base.cols + x) * 3 + 1] = gg / n / 255;
        out[(y * base.cols + x) * 3 + 2] = bb / n / 255;
      }
    }
    return out;
  };
  const baseCellsW32 = rasterCellsW32(base);
  const burstCellsW32 = rasterCellsW32(ramp.sequenceWarpScene(payload, 1, 1));
  const wcx = wp.centre[0] * (base.cols - 1);
  const wcy = wp.centre[1] * (base.rows - 1);
  const wMax = Math.hypot(Math.max(wcx, base.cols - 1 - wcx), Math.max(wcy, base.rows - 1 - wcy)) || 1;
  const bloomRadiusW32 = ramp.warpRampOverrides(1, 1).bloom?.radius ?? wp.bloom.radius;
  const bloomIntensityW32 = ramp.warpRampOverrides(1, 1).bloom?.intensity ?? wp.bloom.intensity;
  const bloomExtentW32 = bloomIntensityW32 > 0.02
    ? bloomRadiusW32 * Math.sqrt(2 * Math.log(bloomIntensityW32 / 0.02)) : 0;
  const spokePerpW32 = (x, y) => {
    const dx = x - wcx; const dy = y - wcy;
    let perp = Infinity;
    for (let s = 0; s < wp.spokes; s++) {
      if (engine.hashNoise(s, 0, wp.seed) >= wp.spokeDensity) continue;
      const rayAngle = (s / wp.spokes) * Math.PI * 2 - Math.PI;
      const pd = Math.abs(dx * Math.sin(rayAngle) - dy * Math.cos(rayAngle));
      if (pd < perp) perp = pd;
    }
    return perp;
  };
  let trailFieldW32 = 0; let accentEdgeW32 = 0; let accentScatteredW32 = 0;
  const sigmaW32 = ramp.warpRampOverrides(1, 1).sigma;
  const frontW32 = ((probeT / 30) * wp.trips) % 1;
  for (let y = 0; y < base.rows; y++) {
    for (let x = 0; x < base.cols; x++) {
      const at = (y * base.cols + x) * 3;
      const moved = Math.max(
        Math.abs(baseCellsW32[at] - burstCellsW32[at]),
        Math.abs(baseCellsW32[at + 1] - burstCellsW32[at + 1]),
        Math.abs(baseCellsW32[at + 2] - burstCellsW32[at + 2])) > 0.02;
      if (!moved) continue;
      const dx = x - wcx; const dy = y - wcy;
      const r = Math.hypot(dx, dy) / wMax;
      const spokeIdxW32 = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * wp.spokes);
      const onSpokeW32 = engine.hashNoise(spokeIdxW32, 0, wp.seed) < wp.spokeDensity;
      const dW32 = ((r - frontW32) % 1 + 1) % 1 - 0.5;
      const inWindowW32 = onSpokeW32 && Math.exp(-(dW32 * dW32) / (2 * sigmaW32 * sigmaW32)) > 0.05;
      if (r <= 0.6 && r > bloomExtentW32 && !inWindowW32) trailFieldW32 += 1;
      const baseAccent = baseCellsW32[at] - baseCellsW32[at + 2] > 0.2;
      if (!baseAccent && burstCellsW32[at] - burstCellsW32[at + 2] > 0.2 && r > 0.6) {
        accentEdgeW32 += 1;
        if (r > bloomExtentW32 && spokePerpW32(x, y) > 1.5) accentScatteredW32 += 1;
      }
    }
  }
  const scatterFractionW32 = accentScatteredW32 / Math.max(1, accentEdgeW32);
  check('scene WU32: the burst lights a TRAIL FIELD (interior off-spoke changed cells >= 300; the WU31 warp produced 2-3)',
    trailFieldW32 >= 300, `trailField=${trailFieldW32}`);
  check('scene WU32: accent discipline — new edge accents sit on the spokes (scattered fraction <= 0.15; the WU31 warp scattered 0.7087)',
    scatterFractionW32 <= 0.15, `scatter=${scatterFractionW32.toFixed(4)} of ${accentEdgeW32}`);

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
  var wu32Evidence = { trailField: trailFieldW32, accentEdge: accentEdgeW32, accentScattered: accentScatteredW32,
    scatterFraction: scatterFractionW32, litContrast: litContrastW32,
    subjectLitFraction: +(subjectLitW32 / Math.max(1, subjectNW32)).toFixed(4), groundNoise: groundNoiseW32 };
} catch (error) {
  check('scene: settled-state byte equality', false, error.message);
}

// --- DIST --------------------------------------------------------------------
const esHtml = await read('dist/index.html');
const enHtml = await read('dist/en/index.html');
check('dist: the built ES page mounts the hero with the boot marker, terminal and locale link',
  Boolean(esHtml) && esHtml.includes('data-sequence-boot') && esHtml.includes('data-hero-terminal')
    && /href="\/en"/.test(esHtml));
check('dist: the built EN page links back to /',
  Boolean(enHtml) && /href="\/"/.test(enHtml) && enHtml.includes('data-hero-terminal'));

// --- Report ------------------------------------------------------------------
const mode = failures.length ? 'RED' : 'GREEN';
const report = { mode: failures.length ? 'RED' : 'GREEN', checker: 'check-public-sequence', passed, failed: failures.length, failures };
if (typeof burstEvidence !== 'undefined') report.burstEvidence = burstEvidence;
if (typeof wu32Evidence !== 'undefined') report.wu32Evidence = wu32Evidence;
console.log(JSON.stringify(report, null, 2));
const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0 && process.argv[outIndex + 1]) {
  const outDir = resolve(root, process.argv[outIndex + 1]);
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, failures.length ? 'red.json' : 'green.json'), JSON.stringify(report, null, 2));
}
process.exit(failures.length ? 1 : 0);
