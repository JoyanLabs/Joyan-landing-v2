/**
 * The constellation registry. Adding a constellation is adding one module and
 * one line here: the checks, the page and (later) the bake read this map, so the
 * engine never has to know what a constellation is.
 */
import genghe from './genghe.mjs';
import alrumh from './alrumh.mjs';

export const SCENES = { genghe, alrumh };

export default SCENES;
