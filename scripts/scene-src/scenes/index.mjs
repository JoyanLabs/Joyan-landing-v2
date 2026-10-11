/**
 * The scene registry. Adding a scene is adding one module and one line here:
 * the engine, the runtime, the bake script and the checks all read this map,
 * so nothing else has to change.
 */
import nightCoast from './joyan-night-coast.mjs';

export const SCENES = {
  'joyan-night-coast': nightCoast,
};

/** The scene the laboratory compares against the library's `night-coast`. */
export const COMPARISON_SCENE = 'joyan-night-coast';
