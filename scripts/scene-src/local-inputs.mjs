/**
 * THE LABORATORY'S OWN LOCAL INPUTS (WU18) — non-infringing by construction.
 * ============================================================================
 * The user's probe used the Blade Runner unicorn gist. That art is a film prop
 * design and is used ONLY as a local, gitignored test fixture for evidence: it
 * is never committed, never copied into `public/`, and never shipped. The
 * laboratory surface therefore demonstrates the pipeline with drawings we author
 * here, so what ships is ours and the licence question never leaves the evidence
 * directory.
 *
 * Both inputs are plain geometric line art on a 1000×1000 viewBox: black strokes
 * on a transparent ground, which is exactly the shape of input the user's probe
 * was. `joyan-mark` is an abstract mark of ours; `test-target` is a calibration
 * drawing (concentric circles, axes, diagonals and a hatched quadrant) chosen so
 * dot pitch and coverage can be judged, not to be pretty.
 *
 * This module is imported by the `/lab/image` page's frontmatter and by the
 * checker only. It never reaches the client bundle: the page serialises the
 * CONVERTED scene, not this source.
 */

/** A 1000×1000 line drawing of ours: ring, two triangles, axis and dots. */
const JOYAN_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <g fill="none" stroke="black" stroke-width="14" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="500" cy="500" r="340"/>
    <polygon points="500,180 780,660 220,660"/>
    <polygon points="500,820 220,340 780,340"/>
    <path d="M500 160 L500 840"/>
  </g>
  <g fill="black">
    <circle cx="500" cy="500" r="46"/>
    <circle cx="500" cy="180" r="30"/>
    <circle cx="780" cy="660" r="30"/>
    <circle cx="220" cy="660" r="30"/>
    <circle cx="500" cy="820" r="30"/>
    <circle cx="220" cy="340" r="30"/>
    <circle cx="780" cy="340" r="30"/>
  </g>
</svg>`;

/** A 1000×1000 calibration target: rings, axes, diagonals and a hatched quadrant. */
const TEST_TARGET = (() => {
  const hatch = [];
  for (let i = 0; i <= 22; i++) {
    const offset = 60 + i * 40;
    hatch.push(`<line x1="${offset}" y1="1000" x2="1000" y2="${offset}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <g fill="none" stroke="black" stroke-width="10">
    <circle cx="500" cy="500" r="90"/>
    <circle cx="500" cy="500" r="200"/>
    <circle cx="500" cy="500" r="310"/>
    <circle cx="500" cy="500" r="420"/>
    <path d="M500 60 L500 940 M60 500 L940 500 M188 188 L812 812 M812 188 L188 812"/>
  </g>
  <g fill="none" stroke="black" stroke-width="7">
    ${hatch.join('\n    ')}
  </g>
</svg>`;
})();

/** The authored inputs, with the flags the page converts them with. */
export const LOCAL_INPUTS = Object.freeze([
  Object.freeze({
    id: 'joyan-mark',
    label: 'our abstract mark — ring, two triangles, axis and dots',
    svg: JOYAN_MARK,
    cols: 160,
    rows: 80,
    mode: 'ink',
    colorMode: 'levels',
    palette: 'ink',
    licence: 'ours',
  }),
  Object.freeze({
    id: 'test-target',
    label: 'our calibration target — rings, axes, diagonals and a hatched quadrant',
    svg: TEST_TARGET,
    cols: 160,
    rows: 80,
    mode: 'ink',
    colorMode: 'levels',
    palette: 'ink',
    licence: 'ours',
  }),
]);

/** The treatments the laboratory offers, each a named overlay + palette pair. */
export const LAB_TREATMENTS = Object.freeze([
  Object.freeze({ id: 'plain', label: 'structure only', overlays: Object.freeze([]), palette: 'ink' }),
  Object.freeze({ id: 'stars', label: 'stars on black', overlays: Object.freeze(['stars']), palette: 'ink' }),
  Object.freeze({ id: 'aurora', label: 'aurora colours', overlays: Object.freeze(['aurora', 'stars']),
    palette: 'aurora' }),
  Object.freeze({ id: 'grain', label: 'drifting grain', overlays: Object.freeze(['grain']), palette: 'ink' }),
  Object.freeze({ id: 'glimmer', label: 'glimmer sweep', overlays: Object.freeze(['glimmer']), palette: 'ink' }),
  Object.freeze({ id: 'all', label: 'every overlay', overlays: Object.freeze(['stars', 'aurora', 'grain', 'glimmer']),
    palette: 'aurora' }),
]);

export const LAB_INPUT_IDS = LOCAL_INPUTS.map((entry) => entry.id);
