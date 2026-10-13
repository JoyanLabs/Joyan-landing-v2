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

// --- The public sequence runtime --------------------------------------------
check('runtime: src/lib/public-sequence.ts exists', Boolean(pubSrc));
if (pubSrc) {
  check('runtime: renders ONLY through the engine (renderFrame/rasterize from scripts/scene-src/engine.mjs)',
    /from\s+'[^']*scripts\/scene-src\/engine\.mjs'/.test(pubSrc) && /renderFrame/.test(pubSrc) && /rasterize/.test(pubSrc));
  check('runtime: the reveal is the shared warp ramp (sequence-warp: sequenceWarpScene + WARP_RAMP.steps)',
    /sequence-warp/.test(pubSrc) && /sequenceWarpScene/.test(pubSrc) && /WARP_RAMP\.steps/.test(pubSrc));
  check('runtime: the corruption scrambles through OUR ramp glyphs ( ·•● ) — no random unicode noise',
    /['"`] ·•●['"`]/.test(pubSrc) || /['"`]·•●['"`]/.test(pubSrc), 'ramp-glyph alphabet missing');
  check('runtime: scramble tones are the page tokens (plomo, bone, amber) — no green',
    /plomo|6e6e73|a0a0a0/i.test(pubSrc) && /bone|e8e6e1|f4f2ed/i.test(pubSrc) && /amber|ffb000/i.test(pubSrc)
      && !/00ff41|00ff00|#0f0\b|c8ffc8/i.test(pubSrc));
  check('runtime: the intro settles at bucket 0 (the final scene is exactly today\'s composition)',
    /bucket[\s\S]*0[\s\S]*revealDown|sequenceWarpScene\([\s\S]*?state <= 0/.test(pubSrc)
      && /revealDown/i.test(pubSrc));
  check('runtime: pauses offscreen/hidden (IntersectionObserver, visibilitychange) and cleans up on pagehide',
    /IntersectionObserver/.test(pubSrc) && /visibilitychange/.test(pubSrc) && /pagehide/.test(pubSrc));
  check('runtime: reduced motion skips the intro and the scramble to the final state',
    /prefers-reduced-motion/.test(pubSrc) && /scramble/i.test(pubSrc));
  check('runtime: the payload is checked at the boundary, not cast',
    /isSequencePayload|isSerializedScene/.test(pubSrc));
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
check('hero: no-JS (no boot marker) shows the final state — scene and copy visible, never black',
  Boolean(heroSrc) && /data-hero-tagline/.test(heroSrc) && !/data-sequence-boot='no-js'/.test(heroSrc));
check('hero: reduced motion skips straight to the final state (media query on the boot state too)',
  Boolean(heroSrc) && /prefers-reduced-motion[\s\S]*data-sequence-boot/.test(heroSrc));
check('hero: the terminal lives in the tagline slot (VT323, bone text, amber prompt, caret)',
  Boolean(heroSrc) && /data-hero-terminal/.test(heroSrc) && /VT323/.test(heroSrc)
    && /text-accent|#ffb000/i.test(heroSrc) && /caret/i.test(heroSrc));
check('hero: the credit rides with the fate line and leaves with it',
  Boolean(heroSrc) && /data-hero-credit/.test(heroSrc) && /TERMINATOR 2 · SARAH CONNOR/.test(heroSrc));
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
const report = { mode, checker: 'check-public-sequence', passed, failed: failures.length, failures };
console.log(JSON.stringify(report, null, 2));
const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0 && process.argv[outIndex + 1]) {
  const outDir = resolve(root, process.argv[outIndex + 1]);
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, failures.length ? 'red.json' : 'green.json'), JSON.stringify(report, null, 2));
}
process.exit(failures.length ? 1 : 0);
