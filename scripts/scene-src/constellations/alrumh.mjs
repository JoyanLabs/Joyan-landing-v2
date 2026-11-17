/**
 * AL-RUMḤ (الرُّمْح, «the spear») — the echo in the same sky.
 * ============================================================================
 * An ARABIC asterism in Boötes; the IAU adopted *Alrumh* in 2026 as the name of
 * 34 Boötis, the star this constellation is drawn on. Source: All Skies
 * Encyclopaedia, *Alrumh*. Like Genghe it is a name and an asterism, not an IAU
 * constellation, and `provenance.official: false` declares that.
 *
 * WHY IT IS HERE. Genghe and Al-Rumḥ share the sky and the meaning, so the
 * second one is the neighbouring constellation the camera can travel to (S7)
 * and the same project's second visual register (S9). It is drawn with its own
 * climate — a warm dust palette instead of Genghe's cold steel — so that
 * arriving changes the air and not only the coordinates (S6).
 *
 * ONE STAR, ONE FIGURE. There is no second star to join, so `links` is empty and
 * the whole figure is the core, its halo and the atmosphere around it. The five
 * layers are still complete: a single star is a scene, a bare field is not.
 */
export default {
  id: 'alrumh',
  name: 'Alrumh',
  meaning: 'The Spear',
  native: 'الرُّمْح',

  provenance: {
    culture: 'árabe',
    source: 'All Skies Encyclopaedia · Alrumh',
    official: false,
    notes: 'Asterismo árabe en Boötes; nombre adoptado por la IAU en 2026 para 34 Boötis. '
      + 'Comparte cielo y sentido con Genghe.',
  },

  project: { id: 'lanza', label: 'Lanza', publish: false },

  cycle: { fps: 12, frames: 300 },
  stage: { cols: 240, rows: 150 },

  // A warm dust climate: the same seven-step ladder, a different air. No amber:
  // the brand accent belongs to live states, not to a constellation.
  palette: {
    ground: '#050403',
    stops: ['#050403', '#171310', '#2a231c', '#443a2e', '#6b5c46', '#9c8e74', '#c6bca6'],
  },

  layers: {
    sky: {
      kind: 'dust',
      density: 0.045,
      seed: 20261106,
      veil: 0.8,
      keep: 0.7,
      structure: { pocket: 0.5, ring: 6, outer: 1, band: 0.45, noise: 0.7 },
      clusters: [{ x: 0.62, y: 0.66, r: 0.09, boost: 0.6 }],
    },
    wash: { kind: 'atmosphere', seed: 20261106, gain: 0.35, drift: 0.35 },
    figure: { planes: ['near'], parts: ['eco'], haloReach: 26 },
    vignette: { start: 0.35, exponent: 1.92, strength: 0.227 },
    cores: { inner: 2, outer: 4.5 },
  },

  composition: {
    reference: { width: 1280, height: 900 },
    calm: { x: 40, y: 332, w: 320, h: 44 },
    // The copy's legibility veil, the approved piece's own device. It is
    // measured with the field, so the calm zone is the zone the reader sees.
    veil: { colour: '#0a1114', alpha: 0.4 },
  },

  nodes: [
    {
      id: 'alrumh',
      x: 0.5,
      y: 0.46,
      plane: 'near',
      magnitude: 1,
      content: {
        title: 'الرُّمْح · 34 Boötis',
        line: 'La estrella que lleva el nombre. El eco de Genghe, en el mismo cielo.',
        partOf: 'eco',
        provisional: true,
      },
    },
  ],

  // No second star to join: the figure is the core and its halo.
  links: [],

  camera: {
    home: { x: 0.5, y: 0.5, scale: 1 },
    focus: { alrumh: { x: 0.5, y: 0.46, scale: 1.4 } },
    travel: { alrumh: 'genghe' },
  },
};
