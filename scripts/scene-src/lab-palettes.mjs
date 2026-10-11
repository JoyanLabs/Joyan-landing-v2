/**
 * THE LABORATORY'S PALETTE SET (WU17).
 * ============================================================================
 * The shape study asks what a mask reads like, and a mask only reads through an
 * ink and a ground. These are lab-only palettes: the first entry is the scene's
 * own palette (no override), and the others are authoring aids so a mask can be
 * judged against a light ink, a warm ink and a cool ink. They are NOT Joyan
 * brand tokens and nothing here ships outside `/lab/**`.
 *
 * Every palette declares its ground as index 0, and the engine normalises the
 * field against the palette's own range, so swapping the palette changes the
 * ink, not the picture.
 */

export const LAB_PALETTES = Object.freeze([
  Object.freeze({ id: 'default', label: "the scene's own palette", palette: null, ground: 0 }),
  Object.freeze({ id: 'mono', label: 'bone mono', ground: 0,
    palette: Object.freeze(['#0b0b0c', '#1a1a1c', '#3c3c40', '#6f6f75', '#a8a8ae', '#f4f2ed']) }),
  Object.freeze({ id: 'amber', label: 'amber on ink', ground: 0,
    palette: Object.freeze(['#0b0b0c', '#2b1a00', '#5c3d00', '#a06f00', '#ffb000', '#ffe6a8']) }),
  Object.freeze({ id: 'ice', label: 'ice on deep', ground: 0,
    palette: Object.freeze(['#05080d', '#0e1b26', '#23485e', '#4f86ab', '#a9cfe6', '#eef7ff']) }),
  Object.freeze({ id: 'paper', label: 'sepia on paper', ground: 0,
    palette: Object.freeze(['#120e0a', '#241a12', '#4a3a26', '#82684a', '#c3a476', '#efe0c4']) }),
]);

/** Look up one lab palette by id; the scene's own palette is the fallback. */
export function labPalette(id) {
  return LAB_PALETTES.find((entry) => entry.id === id) ?? LAB_PALETTES[0];
}
