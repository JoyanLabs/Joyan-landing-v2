/**
 * GENGHE (梗河, «Celestial Lance») — the visual identifier of the Lanza project.
 * ============================================================================
 * WHAT IT IS, and what it is not. Genghe is a CHINESE ASTERISM in Boötes: three
 * stars almost in a straight line, north of Arcturus, that governed «the
 * military advantage of the emperor». It is **not** an IAU constellation, and
 * `provenance.official: false` says so in the data instead of letting the piece
 * imply otherwise. Source: All Skies Encyclopaedia, *Genghe*.
 *
 * WHY THIS FIGURE. It is literally the lance: three stars nearly collinear read
 * as a minimal spear and work as a mark (S9). The three stars sit at different
 * distances from us — κ/ι Boötis are far, Arcturus is one of the nearest bright
 * stars — so the figure is drawn on three planes because the sky is drawn on
 * three planes, not for effect.
 *
 * THE LOCATOR IS DECLARED, NOT HIDDEN. The three asterism stars are joined by
 * two links; a fan of three thin locator filaments also runs from the stars down
 * to Arcturus (大角), which is the landmark that finds Genghe from the south.
 * Arcturus is **not** part of the asterism: its node declares
 * `content.partOf: 'guia'`, and that is what the copy says.
 *
 * THE STACK IS COMPLETE on purpose. Five layers, in the order of
 * `docs/ESTETICA-CONSTELACION.md`: sky, wash, figure in three planes, vignette,
 * cores. `validateConstellation` fails the scene if any of them is missing —
 * that is the lesson of the flattened attempt (S5).
 *
 * THE COPY IS PROVISIONAL (`content.provisional: true`) and describes the star,
 * not the product: nothing here promises a capability. The internal project name
 * never appears in published copy (`docs/DESIGN.md`, naming guardrail).
 */
export default {
  id: 'genghe',
  name: 'Genghe',
  meaning: 'Celestial Lance',
  native: '梗河',

  provenance: {
    culture: 'chino',
    source: 'All Skies Encyclopaedia · Genghe',
    official: false,
    notes: 'Asterismo de tres estrellas en Boötes, al norte de Arturo. No es una constelación IAU; '
      + 'la figura dibujada suma un abanico de localización hacia Arturo, que no forma parte del asterismo.',
  },

  // Identifies the Lanza project. `publish: false` keeps the name internal
  // until branding clears it; the constellation is the public mark instead.
  project: { id: 'lanza', label: 'Lanza', publish: false },

  cycle: { fps: 12, frames: 360 },
  stage: { cols: 480, rows: 300 },

  // Seven tones, the approved dark palette: ground #020405, ink #b4cabe. The
  // engine normalises the field against the palette's own range, so the ground
  // has to be the darkest stop — validation enforces it.
  palette: {
    ground: '#020405',
    stops: ['#020405', '#0a1418', '#16292f', '#254450', '#3f6873', '#7a9c9e', '#b4cabe'],
  },

  layers: {
    sky: {
      kind: 'dust',
      // THE SPARSE FIELD. `density` is the fraction of cells that receive a star,
      // the unicorn overlay's own 0.045, and `structure` is what makes it a sky:
      // quiet around the figure (0.55 of the baseline), dense in the ring that
      // surrounds it (1.75x), calmer again in the far field, with the milky band
      // and the cluster knots on top. `keep: 0.7` is the overlay's rule applied
      // to our stack: where the wash already carries tone the star gives up to
      // 70 % of itself, so a star never punches the atmosphere.
      density: 0.045,
      seed: 20261105,
      veil: 1,
      keep: 0.7,
      structure: { pocket: 0.65, ring: 7, outer: 1, band: 0.55, noise: 0.8 },
      // Two small knots of dust, off the figure, so the sky has weather.
      clusters: [{ x: 0.15, y: 0.74, r: 0.075, boost: 0.7 }, { x: 0.85, y: 0.18, r: 0.06, boost: 0.6 }],
    },
    wash: { kind: 'atmosphere', seed: 20261105, gain: 0.65, drift: 0.35 },
    figure: { planes: ['far', 'mid', 'near'], parts: ['asta', 'punta', 'guia'], haloReach: 32 },
    vignette: { start: 0.35, exponent: 1.92, strength: 0.227 },
    cores: { inner: 2.2, outer: 5 },
  },

  // Three asterism stars, nearly on one line (about 0.7 cells off at 480 wide),
  // plus the locator. Planes follow the real sky: the asterism stars are distant,
  // Arcturus is near.
  nodes: [
    {
      id: 'genghe-i',
      x: 0.4,
      y: 0.6,
      plane: 'mid',
      magnitude: 0.82,
      content: {
        title: '梗河一',
        line: 'Extremo del asta. El trazo nace acá y la figura se lee desde este punto.',
        partOf: 'asta',
        provisional: true,
      },
    },
    {
      id: 'genghe-ii',
      x: 0.503,
      y: 0.514,
      plane: 'far',
      magnitude: 0.95,
      content: {
        title: '梗河二',
        line: 'Tramo medio. El asterismo se apoya en esta estrella para no cerrarse.',
        partOf: 'asta',
        provisional: true,
      },
    },
    {
      id: 'genghe-iii',
      x: 0.61,
      y: 0.43,
      plane: 'mid',
      magnitude: 0.7,
      content: {
        title: '梗河三',
        line: 'La punta. El asterismo se corta en el cielo y el trazo se abre al vacío.',
        partOf: 'punta',
        provisional: true,
      },
    },
    {
      id: 'arcturus',
      x: 0.47,
      y: 0.845,
      plane: 'near',
      magnitude: 1,
      content: {
        title: '大角 · Arturo',
        line: 'Referencia. No es parte del asterismo: ubica a Genghe desde el sur.',
        partOf: 'guia',
        provisional: true,
      },
    },
  ],

  // The two asterism links carry `focus`: only the active group stays solid.
  // The locator fan carries the other three behaviours, so all four are live in
  // the same figure. `phase` is per link; every envelope is 2π-periodic.
  links: [
    { from: 'genghe-i', to: 'genghe-ii', behaviour: 'focus', plane: 'mid', phase: 0, group: 'asta' },
    { from: 'genghe-ii', to: 'genghe-iii', behaviour: 'focus', plane: 'far', phase: 0, group: 'punta' },
    { from: 'genghe-i', to: 'arcturus', behaviour: 'breathe', plane: 'mid', phase: 0.13, group: 'guia' },
    { from: 'genghe-iii', to: 'arcturus', behaviour: 'trace', plane: 'near', phase: 0.25, group: 'guia' },
    { from: 'genghe-ii', to: 'arcturus', behaviour: 'depth', plane: 'near', phase: 0, group: 'guia' },
  ],

  // The composition the field is measured against: the rectangle the headline
  // occupies on the approved plate (1280x900) is the calm zone, and everything
  // else is derived from the nodes. The check reads this; the page's CSS reads
  // the same place, so the measured calm zone is the one the copy sits on.
  composition: {
    reference: { width: 1280, height: 900 },
    calm: { x: 40, y: 332, w: 320, h: 44 },
    // The copy's legibility veil, the approved piece's own device. It is
    // measured with the field, so the calm zone is the zone the reader sees.
    veil: { colour: '#0a1114', alpha: 0.4 },
  },

  // The camera as data: the home view, one aim per node, and the jump to the
  // neighbouring constellation (T4). The page reads these; the field ignores them.
  camera: {
    // The home view frames the lance as the subject, not as an ornament.
    home: { x: 0.5, y: 0.53, scale: 1.18 },
    focus: {
      'genghe-i': { x: 0.46, y: 0.55, scale: 1.35 },
      'genghe-ii': { x: 0.5, y: 0.52, scale: 1.45 },
      'genghe-iii': { x: 0.55, y: 0.47, scale: 1.35 },
      arcturus: { x: 0.48, y: 0.72, scale: 1.3 },
    },
    travel: { 'genghe-iii': 'alrumh' },
  },
};
