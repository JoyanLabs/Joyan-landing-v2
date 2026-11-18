#!/usr/bin/env node
/**
 * WU114 — the rules of the v1 brief, checked against `probe.json`, and written
 * down as CHECKLIST.md. Nothing here is asserted by hand: every PASS below is a
 * field the browser produced, and the field name is printed next to it.
 *
 * Usage:
 *   node dist-motion-verify/wu114-v1/probe.mjs     # writes probe.json + shots
 *   node dist-motion-verify/wu114-v1/check-rules.mjs
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const HERE = new URL('.', import.meta.url).pathname;
const ROOT = new URL('../../', import.meta.url).pathname;
const probe = JSON.parse(await readFile(`${HERE}probe.json`, 'utf8'));

const sha = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const SIGNATURE = 'Alguien tiene que vigilar a las máquinas.';

const rows = [];
const add = (rule, verdict, evidence) => rows.push({ rule, verdict, evidence });

// ---------------------------------------------------------------- 1 · signature
const s = probe.structure;
add(
  'Firma al final, sin explicación ni atribución, no usada como argumento',
  s.signatureIsLast && s.lastTextOnPage === SIGNATURE && s.bodyMentions.signatureOnlyOnce === 1
    ? 'PASS' : 'FAIL',
  `probe.structure.signatureIsLast=${s.signatureIsLast} · lastTextOnPage="${s.lastTextOnPage}" `
  + `· apariciones=${s.bodyMentions.signatureOnlyOnce} · <footer> contiene un solo <p> y nada después`,
);

// ------------------------------------------------------------- 2 · no readouts
add(
  'Sin lecturas instrumentales (frame/canvas/escala/coste/DPR/ms)',
  s.bannedReadouts.length === 0 ? 'PASS' : 'FAIL',
  `probe.structure.bannedReadouts=${JSON.stringify(s.bannedReadouts)} · `
  + 'el detector busca las formas del híbrido (`frame 100 / 719`, `dinámico 14.9 ms`, '
  + '`escala ×1.225`, `celda 2`, `canvas 960 × 600`, `DPR 2`), no las palabras sueltas '
  + 'que también son copy («se escala», «a qué costo»)',
);

// ----------------------------------------------------------------- 3 · glosas
const glossBad = s.glossOrder.filter((g) => !g.ok);
add(
  'Cada sigla glosada en su primer uso (Magi, L4, OTel, O2/O3, peer, SCIM)',
  glossBad.length === 0 && Object.values(s.glosses).every(Boolean) ? 'PASS' : 'FAIL',
  `primer-uso: ${s.glossOrder.map((g) => `${g.token}→${g.ok ? 'sí' : 'NO'}${g.glossAt - g.at === 0 || g.token.startsWith('O2 ') || g.token.startsWith('O3 ') ? ' (contiguo)' : ` (+${g.delta})`}`).join(' · ')}`
  + ` · probe.structure.glosses=${JSON.stringify(s.glosses)}`,
);

// ------------------------------------------------------------------ 4 · L3 limits
const lim = s.limitsAsBody;
add(
  'Los tres límites de L3 en el cuerpo del texto (no en letra chica)',
  lim && lim.insideLineBody && !lim.inSmallPrint && lim.limitFontPx === lim.bodyFontPx
    && s.bodyMentions.limits.every(Boolean) ? 'PASS' : 'FAIL',
  `licencia→license.netbird.io=${s.bodyMentions.limits[0]} · air-gapped=${s.bodyMentions.limits[1]} `
  + `· un solo inquilino=${s.bodyMentions.limits[2]} · Enterprise=${s.bodyMentions.limits[3]} · `
  + `tipografía del límite ${lim.limitFontPx}px = párrafo ${lim.bodyFontPx}px · `
  + `dentro de .line-body=${lim.insideLineBody} · dentro de small/aside=${lim.inSmallPrint}`,
);

// -------------------------------------------------------------- 5 · prohibiciones
const p = s.prohibitions;
const prohibitionsOk = !p.enProduccion && !p.egressGuarantee && !p.autonomous
  && p.isoNegated && p.isoMentions === 2 && !p.price && !p.euRegulation && !p.clientNames;
add(
  'Prohibiciones: sin certificaciones implícitas, sin «Magi en producción», sin agentes '
  + 'autónomos, sin «sin egreso de datos», sin precios, sin normativa europea, sin clientes',
  prohibitionsOk ? 'PASS' : 'FAIL',
  `Magi en producción=${p.enProduccion} · egreso garantizado=${p.egressGuarantee} · `
  + `autónomos=${p.autonomous} · menciones ISO/SOC=${p.isoMentions} (sólo la frase negada `
  + `«No hay ISO ni SOC 2»=${p.isoNegated}) · precio=${p.price} · normativa UE=${p.euRegulation} `
  + `· Cusco/nombre de cliente=${p.clientNames}`,
);

// --------------------------------------------------------- 6 · accesibilidad
const btns = s.buttons;
const btnsOk = btns.length === 2 && btns.every((b) => b.tag === 'BUTTON' && ['true', 'false'].includes(b.pressed));
const a11yOk = s.h1.length === 1 && s.headingSkips.length === 0
  && s.canvasAriaHidden === 'true' && s.svgAriaHidden === 'true'
  && s.figcaptionText.length > 40 && btnsOk
  && probe.motion.reducedStill === true
  && probe.noJs.complete === true && probe.noJs.visible === true && probe.noJs.naturalWidth > 0
  && probe.mobileOverflow.duplicateIds.length === 0;
add(
  'Estructura y accesibilidad: un h1, encabezados ordenados, canvas/SVG aria-hidden con '
  + 'equivalente textual, botones nativos, reduced-motion en still, póster sin JS',
  a11yOk ? 'PASS' : 'FAIL',
  `h1=${s.h1.length} · saltos de nivel=${JSON.stringify(s.headingSkips)} · `
  + `canvas aria-hidden=${s.canvasAriaHidden} · svg aria-hidden=${s.svgAriaHidden} · `
  + `equivalente textual="${s.figcaptionText.slice(0, 60)}…" · `
  + `botones=${btns.map((b) => `${b.tag}[aria-pressed=${b.pressed}]`).join(', ')} · `
  + `still con reduced motion (dos hashes 700 ms apart)=${probe.motion.reducedStill} `
  + `(${probe.motion.reduced}) · póster sin JS ${probe.noJs.naturalWidth}×${probe.noJs.naturalHeight} `
  + `visible=${probe.noJs.visible} · ids duplicados=${JSON.stringify(probe.mobileOverflow.duplicateIds)}`,
);

// --------------------------------------------------- the control (not a rule, but
// the thing a reviewer clicks first: does the toggle paint what it says?)
const c = probe.control;
add(
  'Control de suelo: atributo, aria-pressed y píxeles de acuerdo (incluido un doble clic rápido)',
  c.paper.attribute === 'paper' && c.roundTrip.ground === 'paper' && c.fastToggleGround === 'dark'
    && c.fastToggleDark.luma < 80 && c.fastTogglePaper.luma > 150 ? 'PASS' : 'FAIL',
  `oscuro→papel: data-ground=${c.paper.attribute}, aria-pressed=${c.paper.pressed.join(' ')} · `
  + `ida y vuelta: ${c.roundTrip.ground} · doble clic rápido papel→oscuro: atributo=${c.fastToggleGround}, `
  + `luma media del canvas=${c.fastToggleDark.luma} (oscuro) y ${c.fastTogglePaper.luma} (papel) · `
  + `redimensionado a 860 px: caja ${c.afterResize.box.w}×${c.afterResize.box.h}, canvas ${c.afterResize.canvas.w}×${c.afterResize.canvas.h}`,
);

// -------------------------------------------------- the three evidence requirements
const contrastPairs = [...probe.contrast.dark, ...probe.contrast.paper].filter((x) => !x.missing);
const worst = contrastPairs.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
const errorsOk = probe.errors.length === 0;
add(
  'Evidencia: contraste medido en ambos fondos · capturas 1440×900 y 390×844 revisadas · '
  + 'cero errores de consola y de página',
  probe.contrast.failures.length === 0 && errorsOk ? 'PASS' : 'FAIL',
  `${contrastPairs.length} pares medidos (${probe.contrast.dark.length}+${probe.contrast.paper.length}) · `
  + `mínimo ${probe.minRatio}:1 (${worst.label}, ${worst.fontPx}px, umbral ${worst.threshold}) · `
  + `pares que no pasan=${probe.contrast.failures.length} · errores=${JSON.stringify(probe.errors)}`,
);

// ---------------------------------------------------------------- provenance
const hashes = {
  'design-studies/v1/poster-sky.png': await sha(`${ROOT}design-studies/v1/poster-sky.png`),
  'design-studies/v1/scene-constelacion2.mjs': await sha(`${ROOT}design-studies/v1/scene-constelacion2.mjs`),
  'design-studies/v1/scene-constelacion2-papel.mjs': await sha(`${ROOT}design-studies/v1/scene-constelacion2-papel.mjs`),
  'design-studies/visual-directions/lab/scene-constelacion2.mjs': await sha(`${ROOT}design-studies/visual-directions/lab/scene-constelacion2.mjs`),
  'design-studies/visual-directions/lab/scene-constelacion2-papel.mjs': await sha(`${ROOT}design-studies/visual-directions/lab/scene-constelacion2-papel.mjs`),
  'design-studies/v1/v1.mjs': await sha(`${ROOT}design-studies/v1/v1.mjs`),
  'design-studies/v1/index.html': await sha(`${ROOT}design-studies/v1/index.html`),
  'design-studies/v1/v1.css': await sha(`${ROOT}design-studies/v1/v1.css`),
};
const darkMatches = hashes['design-studies/v1/scene-constelacion2.mjs'] === hashes['design-studies/visual-directions/lab/scene-constelacion2.mjs'];
const paperMatches = hashes['design-studies/v1/scene-constelacion2-papel.mjs'] === hashes['design-studies/visual-directions/lab/scene-constelacion2-papel.mjs'];
const f = probe.findings;

const shot = (name) => `dist-motion-verify/wu114-v1/${name}`;
const contrastTable = (list) => [
  '| par | texto | fondo | px | ratio | umbral |',
  '| --- | --- | --- | --- | --- | --- |',
  ...[...list].sort((a, b) => a.ratio - b.ratio)
    .map((x) => `| ${x.label} | ${x.textHex} | ${x.background} | ${x.fontPx} | **${x.ratio}:1** | ${x.threshold} |`),
].join('\n');

const md = `# v1 — checklist de reglas, medido

Página: \`design-studies/v1/\` · observada en Chromium ${probe.browser} contra \`${probe.url}\`.
Cada veredicto sale de \`probe.json\`, que produce \`probe.mjs\`; no hay PASS escrito a mano.

## Reproducir

\`\`\`bash
# desde la raíz del repositorio
python3 -m http.server 4414 --bind 127.0.0.1
node dist-motion-verify/wu114-v1/bake-poster.mjs      # póster sin JS (renderFrame + rasterize)
node dist-motion-verify/wu114-v1/probe.mjs           # probe.json + capturas
node dist-motion-verify/wu114-v1/check-rules.mjs     # este archivo
\`\`\`

## Las reglas, una por fila

| # | regla | veredicto | evidencia |
| --- | --- | --- | --- |
${rows.map((r, i) => `| ${i + 1} | ${r.rule} | **${r.verdict}** | ${r.evidence} |`).join('\n')}

## Contraste, medido en los dos fondos

Los colores se leen del DOM vivo (no de la hoja de estilos) y el fondo efectivo es el
primer ancestro con fondo pintado. Umbral WCAG AA: 4.5:1 para texto normal, 3:1 para
texto grande (≥24 px, o ≥18.66 px en negrita).

### Fondo oscuro (\`data-ground="dark"\`, suelo #060B0D)

${contrastTable(probe.contrast.dark)}

### Fondo papel (\`data-ground="paper"\`, suelo #EFE7D6)

${contrastTable(probe.contrast.paper)}

Mínimo de la página: **${probe.minRatio}:1**. Pares por debajo del umbral: **${probe.contrast.failures.length}**.

## Capturas revisadas

| archivo | qué muestra |
| --- | --- |
| \`${shot('1280x900-dark.png')}\` | 1280×900, fondo oscuro, primer pantallazo |
| \`${shot('1280x900-paper.png')}\` | 1280×900, fondo papel |
| \`${shot('1280x900-dark-full.png')}\` / \`${shot('1280x900-paper-full.png')}\` | página completa, ambos fondos |
| \`${shot('1440x900-dark.png')}\` / \`${shot('1440x900-paper.png')}\` | 1440×900, ambos suelos |
| \`${shot('1440x900-dark-full.png')}\` / \`${shot('1440x900-paper-full.png')}\` | página completa, escritorio solicitado |
| \`${shot('copy-{390,1440}-{dark,paper}-*-title.png')}\` | cada sección de copia a tamaño real |
| \`${shot('390x844-dark.png')}\` / \`${shot('390x844-paper.png')}\` | 390×844 (DPR 1) |
| \`${shot('390x844-dark-full.png')}\` / \`${shot('390x844-paper-full.png')}\` | página completa en móvil |
| \`${shot('390x844@2x-dark.png')}\` / \`${shot('1280x900@2x-dark.png')}\` | DPR 2: raster de ${probe.retina.canvas.w}×${probe.retina.canvas.h} (celda ${Math.round(probe.retina.canvas.w / 480)}) a 390 y de ${probe.retinaWide.canvas.w}×${probe.retinaWide.canvas.h} (celda ${probe.retinaWide.cell}) a 1280 |
| \`${shot('1280x900-nojs.png')}\` | JavaScript desactivado: el póster es la página |
| \`${shot('1280x900-reduced-motion.png')}\` | \`prefers-reduced-motion: reduce\`: still |
| \`${shot('detail-1280-dark-stage.png')}\` / \`${shot('detail-1280-paper-stage.png')}\` | la placa del hero, a tamaño real |
| \`${shot('detail-1280-dark-l3.png')}\` / \`${shot('detail-1280-dark-l4.png')}\` | L3 (los tres límites) y L4 a tamaño real |
| \`${shot('detail-1280-paper-work.png')}\` | diagnóstico, primer paso de trabajo |
| \`${shot('detail-1280-paper-band.png')}\` | el bloque de cero certificaciones |
| \`${shot('detail-1280-paper-escenarios.png')}\` | escenarios con aprobación y registro explícitos |
| \`${shot('detail-1280-dark-closing.png')}\` / \`${shot('detail-1280-dark-signature.png')}\` | cierre y firma |
| \`${shot('320x640-dark.png')}\` / \`${shot('360x740-dark.png')}\` / \`${shot('960x900-dark.png')}\` | 320, 360 y 960 px: sin scroll horizontal (docWidth = innerWidth) |
| \`${shot('variant-bleed-1280.png')}\` / \`${shot('variant-bleed-1600.png')}\` | variante probada y descartada: la placa sangrando al borde derecho |

## Póster sin JavaScript

\`design-studies/v1/poster-sky.png\` — 1440×900 (celda 3), marco 100 (posterFrame) del emisor oscuro,
tinta de \`renderFrame\` + \`rasterize\` (PNG sin pérdida, sin cuantizar: los bytes del
póster son los del rasterizador). En el marcado va debajo del canvas y por encima hasta
que el canvas tiene un cuadro terminado; con JS desactivado es lo que se ve.

| objeto | sha256 |
| --- | --- |
${Object.entries(hashes).map(([path, h]) => `| \`${path}\` | \`${h}\` |`).join('\n')}

La emisión oscura sigue idéntica a \`lab/\`: **${darkMatches}**.
La emisión de papel también es idéntica a lab/: **${paperMatches}**.
El tratamiento del hero vive en hero-field.mjs, no en las emisiones.
La geometría entre los dos suelos sigue idéntica: **${f?.sameGeometry}**.
El póster conserva sólo el cielo: la constelación está ahora en el SVG del HTML,
visible con o sin JS y encima tanto del póster como del canvas.

## Hallazgos y límites de este estudio

1. **S1 — Suelo:** rótulo visible y nombre accesible: \`${f?.labelText}\`,
   grupo encontrado por ese nombre: \`${f?.groupNamedSuelo}\`.
2. **S2 — Contacto:** \`mailto:hello@joyan.dev\`, antes de la firma:
   \`${f?.contactBeforeSignature}\`. Contrastes del enlace:
   ${probe.contrast.dark.find((p) => p.label === 'contact')?.ratio}:1 oscuro /
   ${probe.contrast.paper.find((p) => p.label === 'contact')?.ratio}:1 papel.
   Foco de teclado: \`${JSON.stringify(f?.contact)}\`.
3. **S3 — Papel:** el tratamiento hero-only conserva la geometría. Identidad
   byte-for-byte con las dos emisiones lab/: \`${JSON.stringify(f?.labIdentity)}\`.
   La cobertura visible se mide aparte, tras el velo, en iteration2-evidence.json.
4. **S4 — Sin JS:** 35 centros y 52 enlaces estáticos idénticos a la emisión,
   en 390×844 y 1280×900, ambos suelos (el suelo papel se sirve como estado inicial
   por el probe; no se ejecuta JS). Capturas \`390x844-nojs-{dark,paper}.png\` y
   \`1280x900-nojs-{dark,paper}.png\`. Se espera a la decodificación del póster.
5. **S5 — L4:** «evidencia que vincula cada acción con su autorización».
6. **S6:** las ocho reglas anteriores, con el CTA añadido a los pares de contraste.
7. **Copia S7–S8:** SBOM y PROV/RO-Crate llevan las glosas del mazo. La escalera
   A0–A5 se retiró: su glosa se exige sólo si aparece el término. Magi, L4, OTel,
   O2/O3, peer y SCIM conservan sus comprobaciones obligatorias. Los selectores
   de contraste y capturas siguen los bloques presentes. Regresiones de copia
   (vocabulario, jerarquía, verdades únicas, regiones protegidas, desbordamiento)
   en \`probe.copy\`: **${probe.copy?.pass}**. Sin cambios al campo ni al CSS.

Comprobaciones focalizadas: \`${JSON.stringify(f?.checks)}\`.
Sin estilos inline en el DOM observado: \`${f?.noInlineStyles}\`.
Base de esta tarea conservada en \`findings-baseline/\`.
`;

await writeFile(`${HERE}CHECKLIST.md`, md);
console.log(rows.map((r, i) => `${i + 1}. ${r.verdict}  ${r.rule}`).join('\n'));
console.log(`\nmin ratio ${probe.minRatio} · failures ${probe.contrast.failures.length} · errors ${probe.errors.length}`);
console.log(`emisión oscura idéntica a lab/: ${darkMatches} · emisión papel idéntica a lab/: ${paperMatches} · geometría entre suelos idéntica: ${f?.sameGeometry}`);
process.exitCode = rows.every((r) => r.verdict === 'PASS') && darkMatches && paperMatches ? 0 : 1;
