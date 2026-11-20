/**
 * CONSTELLATION — a constellation is DATA, the renderer is an output.
 * ============================================================================
 * This module is the model the rest of the piece is built on. It never touches
 * the DOM and it never draws anything itself: it turns one constellation object
 * into the tone field that `engine.mjs` paints, and it answers the questions a
 * consumer asks about that object (which links belong to a plane, what a link
 * looks like at frame `p`, what each layer contributes).
 *
 * WHY THIS FILE EXISTS (WU, `odd/tasks/pieza-completa-constelaciones.md`, S5).
 * The previous attempt produced scenes that were *correct and empty*: the skill
 * validated a scene and never demanded a stack, so a flat field passed. The five
 * layers of `docs/ESTETICA-CONSTELACION.md` — point sky, wash, figure in up to
 * three planes, vignette, cores — are therefore REQUIRED DATA here, not a
 * suggestion, and `validateConstellation` reports a missing one instead of
 * rendering a flat frame. A figure without the stack is not a scene.
 *
 * THE FIVE LAYERS, composed in this order and never reordered:
 *
 *   1. sky      cells chosen by hash noise, three dust tiers plus a veil; the
 *               density and the veil are per constellation
 *   2. wash     structured atmosphere (two diagonal bands + knots), crossfaded
 *               between two static samples so the weather moves over the loop;
 *               never a generic radial gradient
 *   3. figure   node halos and link strokes across up to three planes; the
 *               plane decides the weight, the magnitude decides the star
 *   4. vignette multiplicative, applied to 1–3, reproducing the approved
 *               measurements of the piece: centre 1.000, edge 0.928, corner
 *               0.773
 *   5. cores    two solid steps per node, added AFTER the vignette so a core is
 *               never dimmed — "siempre encima de todo"
 *
 * THE FOUR LINK BEHAVIOURS (S4, S7). The user asked that the lines joining the
 * stars not always be solid. All four are 2π-periodic in the cycle and carry a
 * per-link phase, and each has one observable value:
 *
 *   breathe  the stroke lights in TRAMOS stretches that travel along the link
 *            and go out again; `breatheAlong` is the per-position value
 *   trace    the stroke is drawn from origin to destination, `traceProgress`
 *            going 0 -> 1 and `traceEnvelope` exactly zero at BOTH ends of the
 *            loop, so the wrap is invisible
 *   depth    opacity and thickness come from the plane and nothing else: no
 *            animation at all, the far link is barely readable
 *   focus    only the links of the active node's group stay solid; the rest
 *            fades to FOCUS_FADE
 *
 * Every link still takes its plane's opacity and width as the base, so the
 * plane ladder is visible through all four behaviours; `depth` is the one that
 * adds no modulation of its own.
 *
 * THE ENGINE IS NOT TOUCHED. `renderFrame` is the pinned dark-ground primitive
 * (WU108): this module composes a tone field and calls it. The palette is the
 * project's own seven tones — the ground is the darkest one, which is exactly
 * what `renderFrame` requires.
 */

import { compensate, hashNoise, layeredNoise, luma, renderFrame, sceneMetrics, stepFor } from './engine.mjs';

/** The stack, in composition order. A scene without all five is not a scene. */
export const LAYERS = Object.freeze(['sky', 'wash', 'figure', 'vignette', 'cores']);
/** The planes a figure may use, from the farthest to the nearest. */
export const PLANES = Object.freeze(['far', 'mid', 'near']);
/** The link vocabulary. */
export const BEHAVIOURS = Object.freeze(['breathe', 'trace', 'depth', 'focus']);

/**
 * The plane ladder. `opacity` and `width` are what `depth` reads; `figureGain`
 * is how strongly that plane's halos and cores are drawn. All three rise from
 * far to near, so "the far ones barely read" is a number, not a wish.
 */
export const PLANE_STYLE = Object.freeze({
  far: Object.freeze({ opacity: 0.24, width: 1.1, figureGain: 0.55, depth: 0 }),
  mid: Object.freeze({ opacity: 0.48, width: 1.7, figureGain: 0.78, depth: 1 }),
  near: Object.freeze({ opacity: 0.92, width: 2.4, figureGain: 1, depth: 2 }),
});

/** How much of a link stays visible when the active node is in another group. */
export const FOCUS_FADE = 0.12;
/** Lit stretches along a breathing link. Two or more is what "por tramos" means. */
export const TRAMOS = 2.4;

/**
 * THE COMPOSITION RULES of the approved piece (`docs/ESTETICA-CONSTELACION.md`,
 * «Composición»), as numbers. They are the recipe the first delivery of Genghe
 * met in spirit and missed in fact: it passed every loose threshold and still
 * read as a carpet. `compositionMetrics` measures them on the field and
 * `compositionErrors` refuses a field that is one density everywhere.
 *
 * The regions are the approved measuring protocol's, not this file's invention:
 *   pocket  the ellipse over the node bounding box, radii = half its spans
 *   ring    1 < r² <= 2.25 of that ellipse (outer radii 1.5x)
 *   calm    the rectangle the headline sits on (`composition.calm`, in px)
 *   dense   16 px tiles, the mean of the top 10 %, headline tiles excluded
 *   bands   non-overlapping 8 px groups, full rows and full columns
 */
export const COMPOSITION = Object.freeze({
  /** The size of the approved plate; every rule below is measured there. */
  reference: Object.freeze({ width: 1280, height: 900 }),
  /** Intensity of the calm zone in the dark ground (image intensity I). */
  calm: Object.freeze([0.040, 0.047]),
  /** The quiet pocket around the figure, against the ring that surrounds it. */
  pocketToRing: 0.70,
  /** The ring has to return the gaze: it is denser than the calm zone. */
  ringToCalm: 1.5,
  /** And the densest tiles are denser still: the field has zones. */
  denseToCalm: 1.8,
  /** No rectangular seam: bands of 8 px may not jump more than this. */
  bandPx: 8,
  bandJump: 0.06,
  /** No empty band (< 0.02) for more than 15 % of the window. */
  emptyBand: 0.02,
  emptyShare: 0.15,
  /** The densest region: complete 16 px tiles, top 10 % of their means. */
  tilePx: 16,
  denseShare: 0.1,
  /** The sky is as sparse as the unicorn's star overlay, and the star keeps
   * `keep` of itself where the atmosphere already carries structure. */
  skyDensity: 0.045,
  skyKeep: 0.7,
  /** The vignette's approved measurements, with real presence in the frame. */
  vignette: Object.freeze({ centre: 1.000, edge: 0.928, corner: 0.773 }),
});

// Field amplitudes, MEASURED against the engine's own rung ladder: the ramp's
// first rung sits at level ~0.008, the second at ~0.24 and the last at ~0.82 of
// the palette range. The sky is a SPARSE field now, not a carpet: `density` is
// the fraction of cells that receive a star (the unicorn overlay's 0.045), so a
// lit cell has to be a real star and not a whisper. The three tiers are dot
// sizes, and most of them are large: at 4.5 % of the frame, small dots cannot
// carry the material at all.
const SKY_FLOOR = 0;
const DUST = Object.freeze([0, 0.30, 0.62, 1.06]);
const NODE_GAIN = 0.135;
const LINK_GAIN = 0.72;
/** The stroke's tooth: a link is drawn as ink with grain, never as a rule. */
const LINK_GRAIN = 0.34;
const CORE_INNER = 1.12;
const CORE_OUTER = 0.55;
/** Distance, in cells, at which a node's halo is no longer worth computing. */
const HALO_REACH = 32;
/** How far from a link's axis a cell can be and still receive ink. */
const LINK_REACH = 4.5;

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const wrap01 = (v) => v - Math.floor(v);
const lerp = (a, b, k) => a + (b - a) * k;
const smoothstep = (edge0, edge1, value) => {
  const k = clamp01((value - edge0) / (edge1 - edge0));
  return k * k * (3 - 2 * k);
};

// ---------------------------------------------------------------------------
// Pure behaviour functions. Each one is the single definition of its behaviour:
// the field, the page and the check all read these, so none of them can drift.
// ---------------------------------------------------------------------------

/**
 * The lit-stretch pattern of a `breathe` link: a travelling cosine shaped into
 * stretches, so at any moment part of the stroke is lit and part is out, and
 * over the cycle every stretch has been lit. 2π-periodic in `p`, phase per link,
 * and exactly 0 at its trough and exactly 1 at its crest.
 * @param {number} along 0 at the origin, 1 at the destination
 * @param {number} p cycle position in [0,1)
 * @param {number} [phase] per-link phase in [0,1)
 */
export function breatheAlong(along, p, phase = 0) {
  const wave = 0.5 + 0.5 * Math.cos(TAU * (TRAMOS * along - p - phase));
  return smoothstep(0.3, 0.8, wave);
}

/**
 * How much of a `trace` link is drawn at `p`: 0 at the origin, 1 at the
 * destination, then it wraps. The wrap itself is invisible because
 * `traceEnvelope` is zero on both sides of it.
 * @param {number} p @param {number} [phase]
 */
export function traceProgress(p, phase = 0) {
  return wrap01(p + phase);
}

/**
 * The `trace` envelope: zero at the start AND at the end of the loop, 1 in the
 * middle. `sin(π q)` is exactly 0 at q = 0 and q = 1 (the two ends are the same
 * instant of the loop) and exactly 1 at q = 0.5.
 * @param {number} p @param {number} [phase]
 */
export function traceEnvelope(p, phase = 0) {
  return Math.sin(Math.PI * traceProgress(p, phase));
}

/** The plane style of a plane name, falling back to the middle plane. */
export function planeStyle(plane) {
  return PLANE_STYLE[plane] ?? PLANE_STYLE.mid;
}

/** The nodes of a constellation by id, without a second registry. */
const nodeById = (c) => new Map(c.nodes.map((node) => [node.id, node]));

/**
 * The figure's pocket, as the approved measuring protocol defines it: the
 * ellipse over the node bounding box, radii = half its spans. A figure with no
 * span (one star) still gets a minimum pocket, because a single star is a scene
 * and not a point. Both the field (which thins the sky there) and the check
 * (which measures the pocket against the ring) read this one function.
 * @param {object} c
 */
export function figurePocket(c) {
  const xs = c.nodes.map((node) => node.x);
  const ys = c.nodes.map((node) => node.y);
  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (Math.min(...ys) + Math.max(...ys)) / 2,
    rx: Math.max(0.06, (Math.max(...xs) - Math.min(...xs)) / 2),
    ry: Math.max(0.06, (Math.max(...ys) - Math.min(...ys)) / 2),
  };
}

/**
 * The page's own cover geometry: the field is scaled to cover the window and
 * cropped, never stretched. Composition is measured in the window, so the
 * mapping has to be the page's, not a second one.
 * @param {number} cols @param {number} rows @param {number} width @param {number} height
 */
export function stageWindow(cols, rows, width, height) {
  const scale = Math.max(width / cols, height / rows);
  return {
    width,
    height,
    cols,
    rows,
    scale,
    left: (width - cols * scale) / 2,
    top: (height - rows * scale) / 2,
  };
}

/** The pocket radius, r = 1 on the ellipse, of a point in frame units. */
const pocketRadius = (pocket, u, v) => Math.hypot((u - pocket.cx) / pocket.rx, (v - pocket.cy) / pocket.ry);

/**
 * The `focus` weight of a link: solid when the active node belongs to the
 * link's group (or when nothing is active), faded to FOCUS_FADE otherwise.
 * @param {object} c @param {object} link @param {string|null} activeNode
 */
export function focusWeight(c, link, activeNode) {
  if (!activeNode) return 1;
  const node = nodeById(c).get(activeNode);
  if (!node) return 1;
  return link.group === node.content.partOf ? 1 : FOCUS_FADE;
}

/**
 * The links of a constellation as data with their endpoints resolved. The
 * ordering is the authored ordering, which is what frame measurements index.
 * @param {object} c
 */
export function resolveLinks(c) {
  const nodes = nodeById(c);
  return c.links.map((link) => {
    const fromNode = nodes.get(link.from);
    const toNode = nodes.get(link.to);
    return {
      ...link,
      fromNode,
      toNode,
      ax: fromNode.x,
      ay: fromNode.y,
      bx: toNode.x,
      by: toNode.y,
      plane: link.plane ?? (PLANES.indexOf(fromNode.plane) < PLANES.indexOf(toNode.plane)
        ? toNode.plane : fromNode.plane),
    };
  });
}

/**
 * The links whose drawn stratum is `plane`. A link declares its plane; when it
 * does not, it takes the farther of its two endpoints, because a stroke between
 * a near and a far star is read at the far star's weight.
 * @param {object} c @param {string} plane
 */
export function linksForPlane(c, plane) {
  return resolveLinks(c).filter((link) => link.plane === plane).map((resolved) => {
    const { fromNode, toNode, ax, ay, bx, by, ...link } = resolved;
    return link;
  });
}

/**
 * The visible geometry of one link at cycle position `p`.
 *
 * @returns {{behaviour: string, plane: string, width: number, opacity: number,
 *   drawn: number}} `width` in cells, `opacity` already folded with the plane
 *   base, `drawn` the fraction of the segment painted from `from` to `to`.
 * @param {object} c @param {object} link @param {number} p
 * @param {{activeNode?: string|null}} [state]
 */
export function linkVisual(c, link, p, state = {}) {
  const style = planeStyle(link.plane);
  const base = { behaviour: link.behaviour, plane: link.plane, width: style.width, drawn: 1 };
  switch (link.behaviour) {
    case 'breathe':
      // The breathing lives along the stroke (`breatheAlong`), not in a global
      // opacity: a stroke that dims as a whole would be a fade, not "tramos".
      return { ...base, opacity: style.opacity };
    case 'trace':
      return {
        ...base,
        opacity: style.opacity * traceEnvelope(p, link.phase ?? 0),
        drawn: traceProgress(p, link.phase ?? 0),
      };
    case 'depth':
      return { ...base, opacity: style.opacity };
    case 'focus':
      return { ...base, opacity: style.opacity * focusWeight(c, link, state.activeNode ?? null) };
    default:
      return { ...base, opacity: 0 };
  }
}

/**
 * The ink of one link at a point `along` it, at cycle position `p`. This is the
 * value a consumer draws with (the page samples it in short segments) and the
 * value the field paints, so the picture and the frame cannot disagree.
 * @param {object} c @param {object} link @param {number} p @param {number} along
 * @param {{activeNode?: string|null}} [state]
 */
export function linkSample(c, link, p, along, state = {}) {
  const visual = linkVisual(c, link, p, state);
  if (along > visual.drawn || visual.opacity <= 0) return 0;
  const factor = link.behaviour === 'breathe' ? breatheAlong(along, p, link.phase ?? 0) : 1;
  return visual.opacity * factor;
}

// ---------------------------------------------------------------------------
// Validation. It RETURNS errors — it never throws — so a consumer can show the
// list, and a check can assert on the exact message.
// ---------------------------------------------------------------------------

const isHex = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isUnit = (value) => isNumber(value) && value >= 0 && value <= 1;

/** Luma of `#rrggbb`, used only to require that the ground is the darkest stop. */
function hexTone(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Every hard rule of the model. Returns an array of human-readable errors, in a
 * stable order; an empty array means the constellation is complete enough to
 * render. The five-layer rule is the reason this function exists: a missing
 * layer is reported, never silently skipped.
 * @param {object} c
 * @returns {string[]}
 */
export function validateConstellation(c) {
  const errors = [];
  if (!c || typeof c !== 'object') return ['constellation must be an object'];
  if (typeof c.id !== 'string' || !c.id) errors.push('id is required');
  if (typeof c.name !== 'string' || !c.name) errors.push('name is required');
  if (typeof c.meaning !== 'string' || !c.meaning) errors.push('meaning is required');

  // Provenance is visible: an asterism is never presented as an IAU constellation.
  const provenance = c.provenance;
  if (!provenance || typeof provenance !== 'object') {
    errors.push('provenance is required');
  } else {
    if (typeof provenance.culture !== 'string' || !provenance.culture) {
      errors.push('provenance.culture is required');
    }
    if (typeof provenance.source !== 'string' || !provenance.source) {
      errors.push('provenance.source is required');
    }
    if (provenance.official !== false) {
      errors.push('provenance.official must be false for an asterism: it is not an IAU constellation');
    }
  }

  // The project it identifies. The label stays internal until branding clears
  // it (`docs/DESIGN.md`, naming guardrail), so it may not appear in copy.
  const project = c.project;
  if (!project || typeof project !== 'object') {
    errors.push('project is required');
  } else {
    if (typeof project.id !== 'string' || !project.id) errors.push('project.id is required');
    if (typeof project.label !== 'string' || !project.label) errors.push('project.label is required');
    if (project.publish !== false) errors.push('project.publish must be false: the product name is internal until branding approves it');
  }

  const cycle = c.cycle;
  if (!cycle || typeof cycle !== 'object') {
    errors.push('cycle is required');
  } else {
    if (!Number.isInteger(cycle.fps) || cycle.fps <= 0) errors.push('cycle.fps must be a positive integer');
    if (!Number.isInteger(cycle.frames) || cycle.frames <= 0) errors.push('cycle.frames must be a positive integer');
  }

  const palette = c.palette;
  if (!palette || typeof palette !== 'object') {
    errors.push('palette is required');
  } else {
    if (!isHex(palette.ground)) errors.push('palette.ground must be #rrggbb');
    if (!Array.isArray(palette.stops) || palette.stops.length < 5) {
      errors.push('palette.stops needs at least five tones');
    } else {
      if (!palette.stops.every(isHex)) errors.push('palette.stops must be #rrggbb hexes');
      if (palette.stops[0] !== palette.ground) {
        errors.push('palette.stops[0] must be palette.ground: the engine draws on a dark ground');
      }
      const tones = palette.stops.map(hexTone);
      if (tones[0] > Math.min(...tones)) errors.push('palette.ground must be the darkest stop');
      if (Math.max(...tones) - tones[0] < 0.2) errors.push('palette.stops must span a readable range above the ground');
    }
  }

  const stage = c.stage;
  if (!stage || !Number.isInteger(stage.cols) || !Number.isInteger(stage.rows)
    || stage.cols < 80 || stage.rows < 50) {
    errors.push('stage needs integer cols >= 80 and rows >= 50');
  }

  // ---- the five layers ----------------------------------------------------
  const layers = c.layers;
  if (!layers || typeof layers !== 'object') {
    errors.push('layers is required: a scene without the stack is a flat field');
  } else {
    if (!layers.sky || typeof layers.sky !== 'object') {
      errors.push('missing layer: sky (the point sky)');
    } else {
      if (!isNumber(layers.sky.density) || layers.sky.density <= 0 || layers.sky.density > 1) {
        errors.push('layer "sky" needs a density in (0,1]: it is the fraction of cells that receive a star');
      }
      if (!Number.isInteger(layers.sky.seed)) errors.push('layer "sky" needs an integer seed');
      if (!isNumber(layers.sky.veil) || layers.sky.veil < 0) errors.push('layer "sky" needs a veil amount');
      if (!isUnit(layers.sky.keep)) {
        errors.push('layer "sky" needs a keep in [0,1]: the star textures the ground, it does not punch the figure');
      }
      const structure = layers.sky.structure;
      if (!structure || typeof structure !== 'object') {
        errors.push('layer "sky" needs a structure: one density everywhere is a carpet, not a sky');
      } else {
        for (const key of ['pocket', 'ring', 'outer', 'band', 'noise']) {
          if (!isNumber(structure[key]) || structure[key] < 0) {
            errors.push(`layer "sky" structure.${key} must be a non-negative number`);
          }
        }
      }
    }
    if (!layers.wash || typeof layers.wash !== 'object') {
      errors.push('missing layer: wash (the atmosphere)');
    } else {
      if (!Number.isInteger(layers.wash.seed)) errors.push('layer "wash" needs an integer seed');
      if (!isNumber(layers.wash.gain) || layers.wash.gain <= 0) errors.push('layer "wash" needs a positive gain');
      if (!isNumber(layers.wash.drift) || layers.wash.drift < 0 || layers.wash.drift > 1) {
        errors.push('layer "wash" needs a drift in [0,1]: it moves, it is not a still gradient');
      }
    }
    if (!layers.figure || typeof layers.figure !== 'object') {
      errors.push('missing layer: figure (nodes and links)');
    } else {
      const planes = layers.figure.planes;
      if (!Array.isArray(planes) || planes.length < 1 || planes.length > 3) {
        errors.push('layer "figure" must draw 1 to 3 planes: ' + PLANES.join(', '));
      } else {
        if (!planes.every((plane) => PLANES.includes(plane))) {
          errors.push(`layer "figure" uses an unknown plane: ${planes.join(', ')}`);
        }
        if (new Set(planes).size !== planes.length) errors.push('layer "figure" repeats a plane');
      }
      const parts = layers.figure.parts;
      if (!Array.isArray(parts) || parts.length < 1 || !parts.every((part) => typeof part === 'string' && part)) {
        errors.push('layer "figure" needs at least one named part');
      }
    }
    if (!layers.vignette || typeof layers.vignette !== 'object' || Object.keys(layers.vignette).length === 0) {
      errors.push('missing layer: vignette (it closes the frame)');
    } else {
      const { start, exponent, strength } = layers.vignette;
      if (!isUnit(start)) errors.push('layer "vignette" needs a start in [0,1]');
      if (!isNumber(exponent) || exponent <= 0) errors.push('layer "vignette" needs a positive exponent');
      if (!isNumber(strength) || strength <= 0 || strength >= 1) errors.push('layer "vignette" needs a strength in (0,1)');
    }
    if (!layers.cores || typeof layers.cores !== 'object') {
      errors.push('missing layer: cores (two solid steps above everything)');
    } else {
      const { inner, outer } = layers.cores;
      if (!isNumber(inner) || inner <= 0) errors.push('layer "cores" needs an inner radius');
      if (!isNumber(outer) || outer <= inner) errors.push('layer "cores" needs an outer radius above the inner one');
    }
  }

  // ---- nodes --------------------------------------------------------------
  const nodes = Array.isArray(c.nodes) ? c.nodes : null;
  if (!nodes || nodes.length === 0) {
    errors.push('nodes must be a non-empty array');
  } else {
    const figurePlanes = layers?.figure?.planes ?? [];
    const parts = layers?.figure?.parts ?? [];
    const ids = new Set();
    for (const node of nodes) {
      if (typeof node.id !== 'string' || !node.id) { errors.push('every node needs an id'); continue; }
      if (ids.has(node.id)) errors.push(`node "${node.id}" is declared twice`);
      ids.add(node.id);
      if (!isUnit(node.x) || !isUnit(node.y)) errors.push(`node "${node.id}" needs x and y in [0,1]`);
      if (!figurePlanes.includes(node.plane)) {
        errors.push(`node "${node.id}" sits on plane "${node.plane}" that the figure does not draw`);
      }
      if (!isUnit(node.magnitude)) errors.push(`node "${node.id}" needs a magnitude in [0,1]`);
      const content = node.content;
      if (!content || typeof content !== 'object') {
        errors.push(`node "${node.id}" needs content`);
        continue;
      }
      if (typeof content.title !== 'string' || !content.title) errors.push(`node "${node.id}" needs a title`);
      if (typeof content.line !== 'string' || !content.line) errors.push(`node "${node.id}" needs a line`);
      if (content.provisional !== true) {
        errors.push(`node "${node.id}" content is not marked provisional: no approved copy exists yet`);
      }
      if (!parts.includes(content.partOf)) {
        errors.push(`node "${node.id}" content.partOf "${content.partOf}" is not a part of the figure (${parts.join(', ')})`);
      }
      if (project?.label && `${content.title} ${content.line}`.toLowerCase().includes(project.label.toLowerCase())) {
        errors.push(`node "${node.id}" publishes the internal project name "${project.label}": the label is internal until branding approves it`);
      }
    }
  }

  // ---- links --------------------------------------------------------------
  const links = Array.isArray(c.links) ? c.links : null;
  if (!links) {
    errors.push('links must be an array (empty is allowed for a single star)');
  } else if (nodes) {
    const ids = new Set(nodes.map((node) => node.id));
    const parts = layers?.figure?.parts ?? [];
    const figurePlanes = layers?.figure?.planes ?? [];
    const pairs = new Set();
    for (const link of links) {
      const name = `${link.from}->${link.to}`;
      if (!ids.has(link.from) || !ids.has(link.to)) {
        errors.push(`link ${name} points at a node that does not exist`);
        continue;
      }
      if (link.from === link.to) errors.push(`link ${name} joins a node to itself`);
      const pair = [link.from, link.to].sort().join('|');
      if (pairs.has(pair)) errors.push(`link ${name} duplicates another link`);
      pairs.add(pair);
      if (!BEHAVIOURS.includes(link.behaviour)) {
        errors.push(`link ${name} has unknown behaviour "${link.behaviour}" (${BEHAVIOURS.join(', ')})`);
      }
      if (!isUnit(link.phase)) errors.push(`link ${name} needs a phase in [0,1)`);
      if (link.plane !== undefined && !figurePlanes.includes(link.plane)) {
        errors.push(`link ${name} sits on plane "${link.plane}" that the figure does not draw`);
      }
      if (link.group !== undefined && !parts.includes(link.group)) {
        errors.push(`link ${name} belongs to group "${link.group}" that is not a part of the figure`);
      }
      if (link.behaviour === 'focus' && !parts.includes(link.group)) {
        errors.push(`link ${name} has focus behaviour without a group: it could never be the active one`);
      }
    }
  }

  // ---- camera -------------------------------------------------------------
  const camera = c.camera;
  if (!camera || typeof camera !== 'object') {
    errors.push('camera is required');
  } else {
    const aim = (point) => point && isUnit(point.x) && isUnit(point.y) && isNumber(point.scale);
    if (!aim(camera.home)) errors.push('camera.home needs x, y in [0,1] and a scale');
    if (!camera.focus || typeof camera.focus !== 'object') {
      errors.push('camera.focus is required');
    } else {
      for (const [id, point] of Object.entries(camera.focus)) {
        if (!aim(point)) errors.push(`camera.focus["${id}"] needs x, y in [0,1] and a scale`);
      }
    }
    if (!camera.travel || typeof camera.travel !== 'object') errors.push('camera.travel is required (it may be empty)');
  }

  // ---- composition ---------------------------------------------------------
  // The calm zone has to be declared, because it is measured: a field with no
  // calm zone and no pocket is a carpet, and the check refuses it.
  const composition = c.composition;
  if (!composition || typeof composition !== 'object') {
    errors.push('composition is required: the calm zone and the pocket are measured, not assumed');
  } else {
    const rect = composition.calm;
    if (!rect || typeof rect !== 'object' || !['x', 'y', 'w', 'h'].every((key) => isNumber(rect[key]))) {
      errors.push('composition.calm needs x, y, w and h in px');
    } else if (rect.w <= 0 || rect.h <= 0) {
      errors.push('composition.calm needs a positive width and height');
    }
    const reference = composition.reference;
    if (reference !== undefined
      && (!reference || !isNumber(reference.width) || !isNumber(reference.height)
        || reference.width <= 0 || reference.height <= 0)) {
      errors.push('composition.reference needs a positive width and height');
    }
    // The legibility veil is measured with the field (the approved protocol
    // measures it), so it is data and not only CSS.
    if (composition.veil !== undefined) {
      if (!composition.veil || !isHex(composition.veil.colour) || !isUnit(composition.veil.alpha)
        || composition.veil.alpha <= 0) {
        errors.push('composition.veil needs a #rrggbb colour and an alpha in (0,1]');
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// The field. Pure functions of (x, y, t) over a cached layout, exactly the
// contract `renderFrame` expects: `scene.field(x, y, time)` -> [r,g,b].
// ---------------------------------------------------------------------------

// Keyed by the constellation OBJECT, then by grid: a clone (the negative cases)
// must build its own layout, or deleting a layer from it would change nothing.
const LAYOUTS = new WeakMap();
const PALETTES = new WeakMap();
// The palette and the layout are cached per object and per grid. One live scene
// per constellation and grid: `constellationLayers` returns VIEWS of the layout's
// arrays and the next refresh rewrites them.

/** The palette as channels in 0..1, parsed once per constellation. */
function paletteRgb(c) {
  const cached = PALETTES.get(c);
  if (cached) return cached;
  const rgb = c.palette.stops.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255));
  PALETTES.set(c, rgb);
  return rgb;
}

/** A tone in 0..1 as a colour on the constellation's own ramp. */
export function paletteTone(c, tone) {
  const stops = paletteRgb(c);
  const at = clamp01(tone) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(at));
  const k = at - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}

/**
 * THE ATMOSPHERE IS A LATTICE, AND `design-studies/v1/` IS THE RULER.
 *
 * WHAT WAS WRONG. The atmosphere used to be painted with a PROBABILITY equal to
 * the cloud's density, and that density was shredded by a grain that zeroed it
 * outside a threshold: 3,8 % of the frame was painted and 17 % of its densest
 * window. v1's band paints 91–96 % of its own positions. A scattered breath and
 * a filled reticle are not the same material, and no dither can fix a field
 * that is not there.
 *
 * WHAT IT IS NOW. The density IS the tone the engine dithers. A position paints
 * when its Bayer threshold falls under the tone's level — the same mechanism
 * `bake()` uses, the one the approved nebula uses — so the band fills and the
 * RUING, not the hole, carries the material. The grain survives as a modulation
 * of the tone: it frays the shoulder and varies the rung, it no longer shreds
 * the band. The band keeps an edge because the tone has one: below the ladder's
 * first rung nothing is painted at all.
 *
 * THE NUMBERS, MEASURED. `tone` is the ceiling: the second rung. Above it the
 * ladder reaches the full-coverage disc, which is a solid patch and not
 * atmosphere, so a recipe stronger than the ceiling fills more of its shape
 * instead of getting brighter (that is how the catalogue's `gain` 0.14 and the
 * house constellations' 0.65 coexist on one ruler). `floor` is the band's own
 * gradient — the crest one rung above the shoulder, so a filled band has a
 * blotch. `calm` is the copy's own pocket: the headline keeps a bit under half
 * of the band's tone, which is why the calm zone is a quiet lattice and not a
 * hole.
 */
const WASH = Object.freeze({
  /** The band's own value on its axis: the shape's unit. */
  unit: 0.64,
  /** The band's own value, in units, where the lattice starts to close. */
  edge: 0.35,
  /** How quickly it fills from the edge: at `edge + fill` the band is full. */
  fill: 0.11,
  /** The tone at full presence: inside the second rung, never the solid disc. */
  tone: 0.73,
  /** The recipe's strength at which the tone reaches its ceiling. */
  gain: 6.0,
  /** The share of the band's tone left over the copy (`composition.calm`). */
  calm: 0.45,
  /** The band's own gradient: the tone at its shoulder, as a share of the tone
   * at its crest. A filled band is not one density from end to end. */
  floor: 0.62,
  /** The calm pocket's minimum radius (in frame fractions): a short headline
   * rectangle still gets a soft, round pocket instead of a straight-edged cut. */
  feather: 0.09,
});

/**
 * The atmosphere's SMOOTH shape — one band that falls across the frame, the
 * ribbon that crosses it and the knots that give it weight — with no grain in
 * it. The BAND is the only mass: the ribbon and the knots weigh under the
 * fill's edge and only modulate the band's tone where they meet it, so the
 * atmosphere has ONE direction and one edge and does not read as overlapping
 * shapes. The band is ON SCREEN, NARROW, and crosses the headline's pocket
 * while leaving the copy's corner dark. It is the reference the region is
 * measured against: a hole in the lattice is a hole in the grain, never a
 * redefinition of where the band is.
 */
function washShape(u, v, variant) {
  const slide = variant === 0 ? 0.025 : -0.025;
  const axis = (u * 0.34 + v * 0.94) - (0.44 + slide);
  const band = Math.exp(-((axis / 0.065) ** 2));
  const cross = (-u * 0.94 + v * 0.34) + 0.30 - slide;
  const twist = Math.exp(-((cross / 0.13) ** 2));
  const knotA = Math.exp(-(((u - (0.30 + variant * 0.03)) ** 2 + ((v - (0.56 - variant * 0.04)) * 1.1) ** 2) / 0.05));
  const knotB = Math.exp(-(((u - (0.74 - variant * 0.03)) ** 2 + ((v - (0.24 + variant * 0.04)) * 1.1) ** 2) / 0.06));
  // The air also reaches the frame's top-left corner: the vignette has to close
  // something there (the approved composition measures its presence on the
  // painted corner) and it stays clear of the headline's pocket.
  const knotC = Math.exp(-(((u - 0.04) ** 2 + (v - 0.02) ** 2) / 0.009));
  return 0.64 * band + 0.24 * twist + 0.26 * knotA + 0.22 * knotB + 0.50 * knotC;
}

/** The weather: a slow grain that modulates the tone, never a shredder. */
function washWeather(seed, u, v, variant) {
  const grain = layeredNoise(u * 6.6 + variant * 3.1, v * 6.6 - variant * 1.7, seed + variant * 13, { octaves: 3 });
  return 0.88 + 0.12 * grain;
}

/**
 * The pocket and the ring of the composition, as the two gains the wash and the
 * region share: the atmosphere thins around the figure so it reads clean, and
 * thickens on the ring around it so the gaze returns.
 */
function washPocketAndRing(pocket, u, v) {
  const radius = pocketRadius(pocket, u, v);
  return {
    pocket: 1 - 0.04 * (1 - smoothstep(0.55, 1.35, radius)),
    ring: 0.55 + 0.85 * Math.exp(-(((radius - 1.35) / 0.55) ** 2)),
  };
}

/**
 * The copy's own pocket: the atmosphere gives up over the headline, feathered so
 * it closes without a seam. It is an ELLIPSE over the declared rectangle, like
 * the figure's pocket, because a rectangular pocket cut the band with two
 * straight edges that read as a cut-out. The calm zone keeps the lattice (a
 * quiet one), because a hole would dim the field the approved composition
 * measures there.
 */
function calmPocketAt(c, cols, rows) {
  const calm = c.composition?.calm;
  const reference = c.composition?.reference ?? COMPOSITION.reference;
  if (!calm || !(calm.w > 0) || !(calm.h > 0)) return () => 1;
  const win = stageWindow(cols, rows, reference.width, reference.height);
  const cx = ((calm.x + calm.w / 2) - win.left) / (win.scale * cols);
  const cy = ((calm.y + calm.h / 2) - win.top) / (win.scale * rows);
  const rx = Math.max((calm.w / 2) / (win.scale * cols), WASH.feather);
  const ry = Math.max((calm.h / 2) / (win.scale * rows), WASH.feather);
  return (u, v) => {
    const radius = Math.hypot((u - cx) / rx, (v - cy) / ry);
    const inside = 1 - smoothstep(0.72, 1.55, radius);
    return 1 - (1 - WASH.calm) * inside;
  };
}

/**
 * The atmosphere's presence in 0..1: the shape in units of the band's own axis
 * value, with the figure's pocket, the ring and the copy's pocket, filled from
 * `edge` so the band's interior saturates and only its shoulder dissolves. It
 * returns the units too, because the TONE also carries the band's gradient (the
 * crest one rung above the shoulder) and both come from the same shape.
 */
function washPresence(shape, gains, calm) {
  const units = (shape * gains.pocket * gains.ring) / WASH.unit;
  const presence = clamp01((units - WASH.edge) / WASH.fill) * calm;
  return { units, presence };
}

/**
 * THE ATMOSPHERE'S REGION — where the composition says there is air: the shape
 * at half of its own band unit (its full width at half maximum), with the
 * figure's pocket and ring applied and the copy's pocket removed. Coverage is
 * measured INSIDE it; a hole in the copy's pocket is a declared quiet zone, not
 * a failure of the band. It is a RULER, not a result: the grain is not in it,
 * so what the band covers is never decided by its own holes.
 * @param {object} c the constellation
 * @param {{cols?: number, rows?: number, share?: number}} [options]
 * @returns {{mask: Uint8Array, cells: number}}
 */
export function washRegion(c, options = {}) {
  const cols = options.cols ?? c.stage.cols;
  const rows = options.rows ?? c.stage.rows;
  const share = options.share ?? 0.5;
  const pocket = figurePocket(c);
  const calm = calmPocketAt(c, cols, rows);
  // The region is the band's own full width at half maximum (after the figure's
  // pocket and its ring), minus the copy's pocket: the headline is a declared
  // quiet zone, not a place where the band was supposed to be. The grain is not
  // in it: what the band covers is not decided by its own holes.
  const unitsAt = (u, v) => {
    const gains = washPocketAndRing(pocket, u, v);
    return Math.max(washShape(u, v, 0), washShape(u, v, 1)) * gains.pocket * gains.ring / WASH.unit;
  };
  const mask = new Uint8Array(cols * rows);
  let cells = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const u = (x + 0.5) / cols;
      const v = (y + 0.5) / rows;
      if (unitsAt(u, v) >= share && calm(u, v) > 0.5) {
        mask[y * cols + x] = 1;
        cells += 1;
      }
    }
  }
  return { mask, cells };
}

/**
 * Build (once, cached) every static plane and the sparse term tables a frame
 * needs: the sky, the two wash samples, the vignette, the cores, and per node
 * and per link the cells they can touch. Outside the loop a frame is a lookup
 * plus the animated terms, so the browser loop and the bake pay for the same
 * arithmetic.
 * @param {object} c @param {number} cols @param {number} rows
 */
function buildLayout(c, cols, rows) {
  const n = cols * rows;
  const sky = new Float32Array(n);
  const washA = new Float32Array(n);
  const washB = new Float32Array(n);
  const vignette = new Float32Array(n);
  const core = new Float32Array(n);
  const skyCfg = c.layers.sky ?? { density: 0, seed: 0, keep: 0, veil: 0, structure: {} };
  const washCfg = c.layers.wash ?? { seed: 0, gain: 0 };
  // A missing layer renders as nothing (identity for the vignette, zero for the
  // ink layers): the RENDERER draws what the data has, and validation is the
  // gate that reports the omission. A stack gap has to be measurable, not fatal.
  const vig = c.layers.vignette ?? { start: 0, exponent: 1, strength: 0 };
  const coreCfg = c.layers.cores ?? { inner: 0, outer: 0 };
  const density = skyCfg.density ?? 0;
  const keep = skyCfg.keep ?? 0;
  const skyShape = skyCfg.structure ?? {};
  const pocketGain = skyShape.pocket ?? 1;
  const ringGain = skyShape.ring ?? 1;
  const outerGain = skyShape.outer ?? 1;
  const bandGain = skyShape.band ?? 0;
  const noiseGain = skyShape.noise ?? 0;
  // The quiet pocket of `docs/ESTETICA-CONSTELACION.md`: the field thins around
  // the figure so the constellation reads clean and the ring around it is denser.
  // It is composed from the nodes, not from the camera, so it is part of the art,
  // and the check measures the same ellipse.
  const pocket = figurePocket(c);
  const clusters = c.layers.sky.clusters ?? [];
  // The copy's own pocket, fixed for the whole layout so the band and the
  // region cannot drift apart.
  const calmAt = calmPocketAt(c, cols, rows);

  // The sky's structure, as a pure function of the frame: a quiet pocket, a
  // dense ring, the far field, the milky band, the cluster knots and a weather
  // that opens gaps. It does NOT include `keep`, which depends on the wash.
  const skyShapeAt = (u, v) => {
    const radius = pocketRadius(pocket, u, v);
    // A smooth radial PROFILE through three measured values, not a weighted
    // average of three strong terms: the ring has to be dense at r = 1.25 and
    // quiet again at r = 1, or its gain leaks into the pocket.
    const ringBump = Math.exp(-(((radius - 1.38) / 0.24) ** 2));
    const quiet = 1 - smoothstep(0.40, 1.30, radius);
    const radial = outerGain + (ringGain - outerGain) * ringBump - (outerGain - pocketGain) * quiet;
    const weather = 1 - noiseGain + noiseGain
      * (0.32 + 1.42 * layeredNoise(u * 5.6 + 3.1, v * 5.6 - 1.7, skyCfg.seed + 71, { octaves: 2 }));
    const bandAxis = (u * 0.55 + v * 0.83 - 0.62) / 0.13;
    const milky = bandAxis * bandAxis < 1
      ? (1 - bandAxis * bandAxis) ** 1.4
        * (0.35 + 0.9 * layeredNoise(u * 8.4 - 2.2, v * 8.4 + 4.6, skyCfg.seed + 53, { octaves: 2 }))
      : 0;
    let shape = Math.max(0, radial) * weather + bandGain * milky;
    for (const cluster of clusters) {
      const d = Math.hypot(u - cluster.x, (v - cluster.y) * 1.1);
      if (d < cluster.r) shape += cluster.boost * (1 - d / cluster.r) ** 2;
    }
    return shape;
  };

  // `density` is the MEAN fraction of cells that receive a star — the unicorn
  // overlay's 0.045 — so the structure is normalised by its own mean instead of
  // multiplying the baseline wherever the weather happens to be low. That is
  // what makes the number mean something at every viewport and every sample.
  let shapeSum = 0;
  let shapeCount = 0;
  for (let j = 0; j < 60; j++) {
    for (let i = 0; i < 96; i++) {
      shapeSum += skyShapeAt((i + 0.5) / 96, (j + 0.5) / 60);
      shapeCount += 1;
    }
  }
  const shapeNorm = shapeCount / Math.max(shapeSum, 1e-9);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = y * cols + x;
      const u = (x + 0.5) / cols;
      const v = (y + 0.5) / rows;
      // 2 · wash. It is atmosphere BEHIND the figure, so the pocket thins it too:
      // the approved composition asks for a pocket where the figure reads clean
      // and a denser ring around it, and a nebula laid over the stars hides them.
      // 2 · wash. It is atmosphere BEHIND the figure, so the pocket thins it too:
      // the approved composition asks for a pocket where the figure reads clean
      // and a denser ring around it, and a nebula laid over the stars hides them.
      // The value is the TONE the engine dithers (see `WASH`): where the lattice
      // has no tone the cell is a hole, and that is the band's edge.
      const washGains = washPocketAndRing(pocket, u, v);
      const calmGain = calmAt(u, v);
      const cloudA = washPresence(washShape(u, v, 0), washGains, calmGain);
      const cloudB = washPresence(washShape(u, v, 1), washGains, calmGain);
      const presenceA = cloudA.presence * washWeather(washCfg.seed, u, v, 0);
      const presenceB = cloudB.presence * washWeather(washCfg.seed, u, v, 1);
      // The recipe's strength scales the tone and saturates at `WASH.tone`: a
      // stronger recipe fills more of its shape, it does not become a solid
      // field. `gain = 0` still renders nothing.
      const washStrength = clamp01((washCfg.gain ?? 0) * WASH.gain);
      // The band's own gradient: the crest is one rung above its shoulders, so a
      // filled band has a blotch and is not one density from end to end.
      const lift = (cloud) => WASH.floor + (1 - WASH.floor) * clamp01(cloud.units);
      const washAValue = WASH.tone * washStrength * lift(cloudA) * presenceA;
      const washBValue = WASH.tone * washStrength * lift(cloudB) * presenceB;
      washA[at] = washAValue;
      washB[at] = washBValue;
      // 1 · point sky: a SPARSE field, at the unicorn overlay's density (0.045 of
      // the cells receive a star), with the structure that makes it a sky and
      // not a carpet: a quiet pocket around the figure, a dense ring around it
      // that returns the gaze, a milky band, knots and a weather that opens gaps.
      const shape = skyShapeAt(u, v) * shapeNorm;
      // keep: the star textures the GROUND, not the atmosphere. Where the wash
      // already carries structure the star gives up to `keep` of its BRIGHTNESS
      // (the overlay's own rule: its `preserve` scales the mix toward the base),
      // so a star never punches a hole in the subject.
      const starKeep = 1 - keep * clamp01(((presenceA + presenceB) / 2 - 0.20) / 0.45);
      const veil = clamp01(density * shape * (skyCfg.veil ?? 1));
      const roll = hashNoise(x, y, skyCfg.seed + 17);
      let dust = 0;
      if (roll < veil) {
        // Three dot sizes, weighted toward the small ones: the field's dust is
        // quiet and only a fifth of the stars is the big bright mark. A field of
        // mostly big dots is confetti — the carpet at a larger scale.
        const size = hashNoise(x, y, skyCfg.seed + 29);
        dust = (size < 0.60 ? DUST[1] : size < 0.90 ? DUST[2] : DUST[3]) * starKeep;
      }
      sky[at] = SKY_FLOOR + dust;
      // 4 · vignette: 1 at the centre, 0.928 at a lateral edge, 0.773 at a
      // corner. `r` is normalised so the frame corner is 1, which is what makes
      // those three approved measurements reproducible from (start, exponent,
      // strength) instead of hand-tuned per viewport.
      const r = Math.hypot((u - 0.5) * 2, (v - 0.5) * 2) / Math.SQRT2;
      const t = clamp01((r - vig.start) / (1 - vig.start));
      vignette[at] = 1 - vig.strength * t ** vig.exponent;
    }
  }

  // 5 · cores: two solid steps per node, applied above the vignette. The radii
  // are in CELLS, not in frame fractions: a core is a cell-sized mark at any
  // grid, and scaling it by the grid width made the inner step vanish on a
  // smaller stage (measured: 0.506 where the inner step is 1.12).
  const inner = coreCfg.inner ?? 0;
  const outer = coreCfg.outer ?? 0;
  for (const node of c.nodes) {
    const cx = node.x * cols;
    const cy = node.y * rows;
    const gain = node.magnitude * planeStyle(node.plane).figureGain;
    const x0 = Math.max(0, Math.floor(cx - outer - 1));
    const x1 = Math.min(cols - 1, Math.ceil(cx + outer + 1));
    const y0 = Math.max(0, Math.floor(cy - outer - 1));
    const y1 = Math.min(rows - 1, Math.ceil(cy + outer + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const tone = d <= inner ? CORE_INNER : d <= outer ? CORE_OUTER : 0;
        if (tone <= 0) continue;
        const at = y * cols + x;
        core[at] = Math.max(core[at], tone * gain);
      }
    }
  }

  // 3a · node halos: the inverse-square halo of the previous study, in cells,
  // precomputed without the time term so a frame only scales it.
  const nodeTerms = c.nodes.map((node) => {
    const cx = node.x * cols;
    const cy = node.y * rows;
    const cells = [];
    const weights = [];
    const x0 = Math.max(0, Math.floor(cx - HALO_REACH));
    const x1 = Math.min(cols - 1, Math.ceil(cx + HALO_REACH));
    const y0 = Math.max(0, Math.floor(cy - HALO_REACH));
    const y1 = Math.min(rows - 1, Math.ceil(cy + HALO_REACH));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > HALO_REACH * HALO_REACH) continue;
        cells.push(y * cols + x);
        weights.push(16 / (d2 + 4) + 7 / (d2 + 3));
      }
    }
    return { cells: Int32Array.from(cells), weights: Float32Array.from(weights) };
  });

  // 3b · link strokes: every cell within reach of the segment, with its
  // position along the segment and its distance across it. Width becomes a
  // per-frame number, so the plane ladder can change the thickness of the ink.
  const links = resolveLinks(c);
  const linkTerms = links.map((link) => {
    const ax = link.ax * cols;
    const ay = link.ay * rows;
    const bx = link.bx * cols;
    const by = link.by * rows;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-6;
    const len = Math.sqrt(len2);
    const cells = [];
    const along = [];
    const cross = [];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - LINK_REACH - 1));
    const x1 = Math.min(cols - 1, Math.ceil(Math.max(ax, bx) + LINK_REACH + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - LINK_REACH - 1));
    const y1 = Math.min(rows - 1, Math.ceil(Math.max(ay, by) + LINK_REACH + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - ax;
        const py = y + 0.5 - ay;
        const t = (px * dx + py * dy) / len2;
        if (t < -0.02 || t > 1.02) continue;
        const perp = Math.abs(px * dy - py * dx) / len;
        if (perp > LINK_REACH) continue;
        cells.push(y * cols + x);
        along.push(clamp01(t));
        cross.push(perp);
      }
    }
    return { cells: Int32Array.from(cells), along: Float32Array.from(along), cross: Float32Array.from(cross) };
  });

  return {
    c, cols, rows, links,
    sky, washA, washB, vignette, core, nodeTerms, linkTerms,
    dyn: new Float32Array(n),
    composite: new Float32Array(n),
    linkTone: links.map(() => new Float32Array(n)),
    state: { p: NaN, activeNode: undefined, washK: 0.5 },
  };
}

/** The layout of a constellation at one grid, built at most once per pair. */
function layoutFor(c, cols, rows) {
  let grids = LAYOUTS.get(c);
  if (!grids) {
    grids = new Map();
    LAYOUTS.set(c, grids);
  }
  const key = `${cols}x${rows}`;
  let layout = grids.get(key);
  if (!layout) {
    layout = buildLayout(c, cols, rows);
    grids.set(key, layout);
  }
  return layout;
}

/** Node phases: deterministic, so a node breathes identically in every path. */
const nodePhase = (index) => (index * 0.2917) % 1;

/**
 * Recompute the animated terms and the composite for cycle position `p`. One
 * call per frame, guarded by (p, activeNode), never per cell.
 */
function refresh(layout, p, activeNode) {
  const state = layout.state;
  if (state.p === p && state.activeNode === activeNode) return;
  state.p = p;
  state.activeNode = activeNode;

  const { c, cols, dyn, composite, sky, washA, washB, vignette, core, linkTone } = layout;
  dyn.fill(0);
  for (const plane of linkTone) plane.fill(0);

  // 3 · figure · node halos
  c.nodes.forEach((node, index) => {
    const style = planeStyle(node.plane);
    const twinkle = 0.72 + 0.28 * Math.cos(TAU * (p + nodePhase(index)));
    const gain = NODE_GAIN * node.magnitude * style.figureGain * twinkle;
    const terms = layout.nodeTerms[index];
    for (let i = 0; i < terms.cells.length; i++) dyn[terms.cells[i]] += terms.weights[i] * gain;
  });

  // 3 · figure · link strokes
  layout.links.forEach((link, index) => {
    const visual = linkVisual(c, link, p, { activeNode });
    const plane = linkTone[index];
    const terms = layout.linkTerms[index];
    const width2 = visual.width * visual.width;
    for (let i = 0; i < terms.cells.length; i++) {
      const along = terms.along[i];
      if (along > visual.drawn) continue;
      const amplitude = link.behaviour === 'breathe'
        ? visual.opacity * breatheAlong(along, p, link.phase ?? 0)
        : visual.opacity;
      if (amplitude <= 0) continue;
      const amount = LINK_GAIN * amplitude * Math.exp(-2.4 * (terms.cross[i] * terms.cross[i]) / width2)
        // The tooth: ink with grain, not a drawn rule. The modulation is a hash
        // of the cell, so it is stable frame to frame and the stroke does not
        // crawl.
        * (1 - LINK_GRAIN / 2 + LINK_GRAIN * hashNoise(terms.cells[i], 7, 0));
      dyn[terms.cells[i]] += amount;
      plane[terms.cells[i]] += amount;
    }
  });

  // 2 · wash crossfade: two static samples, moving over the loop. `drift` is how
  // far the weather travels; at 0 the wash would be a still gradient.
  const drift = c.layers.wash?.drift ?? 1;
  const k = 0.5 + 0.5 * drift * Math.cos(TAU * p + 0.7);
  state.washK = k;
  const breath = 0.88 + 0.12 * k;

  // 4 and 5 · vignette then cores, in that order
  for (let i = 0; i < composite.length; i++) {
    composite[i] = (sky[i] + Math.max(washA[i], washB[i]) * breath + dyn[i]) * vignette[i] + core[i];
  }
}

/**
 * The engine scene of one constellation. Same shape as any other scene in
 * `scripts/scene-src/scenes/`, so `renderFrame`, `rasterize`, the bake path and
 * the browser all work on it unchanged.
 * @param {object} c
 * @param {{cols?: number, rows?: number, activeNode?: string|null}} [options]
 */
export function constellationScene(c, options = {}) {
  const cols = options.cols ?? c.stage.cols;
  const rows = options.rows ?? c.stage.rows;
  const layout = layoutFor(c, cols, rows);
  const seconds = c.cycle.frames / c.cycle.fps;
  const scene = {
    id: c.id,
    label: c.name,
    cols,
    rows,
    fps: c.cycle.fps,
    cycleFrames: c.cycle.frames,
    palette: c.palette.stops,
    ground: 0,
    groundHex: c.palette.ground,
    params: c,
    constellation: c,
    activeNode: options.activeNode ?? null,
    setActiveNode(nodeId) {
      this.activeNode = nodeId;
      layout.state.p = NaN;
    },
    field(x, y, t) {
      refresh(layout, wrap01(t / seconds), scene.activeNode);
      return paletteTone(c, layout.composite[y * cols + x]);
    },
  };
  return scene;
}

/**
 * One frame of one constellation, painted by the engine. This is the only door
 * between the model and the renderer: nothing else here knows the engine.
 * @param {object} c @param {number} index
 * @param {{cols?: number, rows?: number, activeNode?: string|null, dither?: string}} [options]
 */
export function constellationFrame(c, index, options = {}) {
  const scene = constellationScene(c, options);
  return renderFrame(scene, index, { dither: options.dither ?? 'bayer4' });
}

/**
 * Every layer of one frame, separately, so a check (or a study) can measure
 * what each layer contributes instead of trusting that it was composed.
 * @param {object} c
 * @param {{cols?: number, rows?: number, index?: number, activeNode?: string|null}} [options]
 */
export function constellationLayers(c, options = {}) {
  const cols = options.cols ?? c.stage.cols;
  const rows = options.rows ?? c.stage.rows;
  const layout = layoutFor(c, cols, rows);
  const index = options.index ?? 0;
  const p = wrap01(index / c.cycle.frames);
  refresh(layout, p, options.activeNode ?? null);

  const n = cols * rows;
  const wash = new Float32Array(n);
  const k = layout.state.washK;
  // The two cloud samples are a UNION, not a crossfade: crossfading dot tones
  // dims dots through the low rungs and rebuilds the very lattice the dot cloud
  // exists to avoid. The weather moves as a slow brightness breath instead.
  const breath = 0.88 + 0.12 * k;
  for (let i = 0; i < n; i++) wash[i] = Math.max(layout.washA[i], layout.washB[i]) * breath;

  // The figure, split by plane: nodes only, so the ladder is the plane's weight
  // and not a link's behaviour.
  const figureByPlane = {};
  const figurePlanes = c.layers.figure?.planes ?? [];
  for (const plane of figurePlanes) figureByPlane[plane] = new Float32Array(n);
  c.nodes.forEach((node, index2) => {
    const plane = figureByPlane[node.plane];
    if (!plane) return;
    const style = planeStyle(node.plane);
    const twinkle = 0.72 + 0.28 * Math.cos(TAU * (p + nodePhase(index2)));
    const gain = NODE_GAIN * node.magnitude * style.figureGain * twinkle;
    const terms = layout.nodeTerms[index2];
    for (let i = 0; i < terms.cells.length; i++) plane[terms.cells[i]] += terms.weights[i] * gain;
  });

  return {
    p,
    cols,
    rows,
    sky: layout.sky,
    wash,
    figure: layout.dyn,
    vignette: layout.vignette,
    cores: layout.core,
    composite: layout.composite,
    linkTone: layout.linkTone,
    figureByPlane,
  };
}

export default { validateConstellation, constellationFrame, linksForPlane };

// ---------------------------------------------------------------------------
// Composition. Measured on the FIELD (sky + wash + vignette) at the size of the
// approved plate, because that is the material behind the figure: the approved
// protocol hides the cores for the same reason. Every number below is the one
// the engine actually lays down — a tone is turned into a ramp step, its ink is
// compensated and its dot covers `coverage[step]` of the cell, exactly as
// `renderFrame` does — so the measurement cannot flatter the data.
// ---------------------------------------------------------------------------

const FIELD_SCENES = new WeakMap();

/** The scene (and its engine metrics) of a constellation at one grid, cached. */
function fieldScene(c, cols, rows) {
  let grids = FIELD_SCENES.get(c);
  if (!grids) {
    grids = new Map();
    FIELD_SCENES.set(c, grids);
  }
  const key = `${cols}x${rows}`;
  let entry = grids.get(key);
  if (!entry) {
    const scene = constellationScene(c, { cols, rows });
    entry = { scene, metrics: sceneMetrics(scene) };
    grids.set(key, entry);
  }
  return entry;
}

/**
 * The field's rendered intensity, one number per cell: sky + wash, closed by the
 * vignette, then painted as the engine paints it (ramp step, compensated ink,
 * dot coverage). This is the quantity the approved protocol calls `I`.
 * @param {object} c
 * @param {{cols?: number, rows?: number, index?: number}} [options]
 */
export function fieldIntensity(c, options = {}) {
  const cols = options.cols ?? c.stage.cols;
  const rows = options.rows ?? c.stage.rows;
  const layers = constellationLayers(c, { cols, rows, index: options.index ?? 0 });
  const { scene, metrics } = fieldScene(c, cols, rows);
  const span = metrics.maxTone - metrics.groundTone;
  const values = new Float32Array(cols * rows);
  const rgb = new Float32Array(cols * rows * 3);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = y * cols + x;
      const cell = paintCell(c, scene, metrics, span, (layers.sky[at] + layers.wash[at]) * layers.vignette[at], x, y);
      rgb[at * 3] = cell[0];
      rgb[at * 3 + 1] = cell[1];
      rgb[at * 3 + 2] = cell[2];
      values[at] = luma(cell[0], cell[1], cell[2]);
    }
  }
  return { cols, rows, values, rgb };
}

/** One cell as the engine paints it: the RGBA the raster would put there. */
function paintCell(c, scene, metrics, span, tone, x, y) {
  const rgb = paletteTone(c, tone);
  const level = clamp01((luma(rgb[0], rgb[1], rgb[2]) - metrics.groundTone) / span);
  const step = stepFor(level, x, y, 'bayer4');
  const ground = metrics.colors[metrics.groundIndex];
  if (step === 0) return ground;
  const ink = metrics.colors[compensate(scene, rgb[0], rgb[1], rgb[2], step, metrics)];
  const coverage = metrics.coverage[step];
  return [
    ground[0] + (ink[0] - ground[0]) * coverage,
    ground[1] + (ink[1] - ground[1]) * coverage,
    ground[2] + (ink[2] - ground[2]) * coverage,
  ];
}

/** Image intensity I of one cell painted at `tone`. */
function paintTone(c, scene, metrics, span, tone, x, y) {
  const [r, g, b] = paintCell(c, scene, metrics, span, tone, x, y);
  return luma(r, g, b);
}

/** The legibility veil of the calm zone, as data, or null when it declares none. */
function calmVeil(c) {
  const veil = c.composition?.veil;
  if (!veil || !isHex(veil.colour) || !isNumber(veil.alpha) || veil.alpha <= 0) return null;
  return { rgb: [1, 3, 5].map((i) => parseInt(veil.colour.slice(i, i + 2), 16) / 255), alpha: veil.alpha };
}

const mean4 = (pair) => (pair[1] ? pair[0] / pair[1] : 0);
const fixed = (value) => (Number.isFinite(value) ? value.toFixed(4) : String(value));

/**
 * The composition of one constellation, measured on the field at a window.
 *
 * Regions follow `docs/ESTETICA-CONSTELACION.md` §Protocolo de medición:
 * `pocket` is the ellipse over the node bounding box, `ring` is 1 < r² <= 2.25,
 * `calm` is the declared headline rectangle, `dense` is the mean of the top 10 %
 * of complete 16 px tiles (headline tiles excluded), bands are non-overlapping
 * 8 px groups of full rows and full columns. The page covers the stage without
 * distorting a cell, so the window mapping is `stageWindow`, the page's own.
 *
 * @param {object} c
 * @param {{width?: number, height?: number, cols?: number, rows?: number, index?: number}} [options]
 */
export function compositionMetrics(c, options = {}) {
  const reference = c.composition?.reference ?? COMPOSITION.reference;
  const width = options.width ?? reference.width;
  const height = options.height ?? reference.height;
  const cols = options.cols ?? c.stage.cols;
  const rows = options.rows ?? c.stage.rows;
  const win = stageWindow(cols, rows, width, height);
  const field = fieldIntensity(c, { cols, rows, index: options.index ?? 0 });
  const fieldRgb = field.rgb;
  const veil = calmVeil(c);
  const sky = constellationLayers(c, { cols, rows, index: options.index ?? 0 }).sky;
  const pocket = figurePocket(c);
  const calmRect = c.composition?.calm ?? { x: 0, y: 0, w: 0, h: 0 };

  const px = (x) => win.left + (x + 0.5) * win.scale;
  const py = (y) => win.top + (y + 0.5) * win.scale;
  const centreX = px(pocket.cx * cols - 0.5);
  const centreY = py(pocket.cy * rows - 0.5);
  const rx = pocket.rx * cols * win.scale;
  const ry = pocket.ry * rows * win.scale;

  const field3 = { calm: [0, 0], pocket: [0, 0], ring: [0, 0] };
  const lit3 = { calm: [0, 0], pocket: [0, 0], ring: [0, 0], outer: [0, 0] };
  const rows2 = new Map();
  const cols2 = new Map();
  const tilePx = COMPOSITION.tilePx;
  const tilesX = Math.ceil(width / tilePx);
  const tilesY = Math.ceil(height / tilePx);
  const tiles = new Array(tilesX * tilesY).fill(null);
  const calmHitsTile = (tx, ty) => {
    const x0 = tx * tilePx;
    const y0 = ty * tilePx;
    return x0 < calmRect.x + calmRect.w && x0 + tilePx > calmRect.x
      && y0 < calmRect.y + calmRect.h && y0 + tilePx > calmRect.y;
  };

  // dense: the top 10 % of the complete tiles' means, rounded up. "Complete" is
  // measured in cells: a tile of 16 px holds about (16 / scale)² cell centres,
  // and a tile missing more than a fifth of them is a partial tile. The tiles
  // read a 3x3 smoothed field: at this sparsity a single 6x6-cell tile is a
  // Poisson sample, and the top decile of raw tiles would name luck as density.
  const smoothed = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
          sum += field.values[yy * cols + xx];
          n += 1;
        }
      }
      smoothed[y * cols + x] = sum / n;
    }
  }
  let mean = 0;
  let count = 0;
  let peak = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = y * cols + x;
      const sx = px(x);
      const sy = py(y);
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
      const inCalm = sx >= calmRect.x && sx < calmRect.x + calmRect.w
        && sy >= calmRect.y && sy < calmRect.y + calmRect.h;
      // The legibility veil is part of the measured composite (the approved
      // protocol measures it), so the calm zone carries it here too.
      const value = inCalm && veil
        ? luma(
          veil.rgb[0] * veil.alpha + fieldRgb[at * 3] * (1 - veil.alpha),
          veil.rgb[1] * veil.alpha + fieldRgb[at * 3 + 1] * (1 - veil.alpha),
          veil.rgb[2] * veil.alpha + fieldRgb[at * 3 + 2] * (1 - veil.alpha),
        )
        : field.values[at];
      const lit = sky[at] > 0 ? 1 : 0;
      const r2 = ((sx - centreX) / rx) ** 2 + ((sy - centreY) / ry) ** 2;
      const inPocket = r2 <= 1;
      const inRing = r2 > 1 && r2 <= 2.25;
      const add = (pair, amount) => { pair[0] += amount; pair[1] += 1; };
      if (inPocket) { add(field3.pocket, value); add(lit3.pocket, lit); }
      else if (inRing) { add(field3.ring, value); add(lit3.ring, lit); }
      else { add(lit3.outer, lit); }
      if (inCalm) { add(field3.calm, value); add(lit3.calm, lit); }

      const rowKey = Math.floor(sy / COMPOSITION.bandPx);
      const colKey = Math.floor(sx / COMPOSITION.bandPx);
      const rowBand = rows2.get(rowKey) ?? [0, 0];
      rowBand[0] += value;
      rowBand[1] += 1;
      rows2.set(rowKey, rowBand);
      const colBand = cols2.get(colKey) ?? [0, 0];
      colBand[0] += value;
      colBand[1] += 1;
      cols2.set(colKey, colBand);

      const tx = Math.floor(sx / tilePx);
      const ty = Math.floor(sy / tilePx);
      if (tx < tilesX && ty < tilesY && !calmHitsTile(tx, ty)) {
        const key = ty * tilesX + tx;
        const tile = tiles[key] ?? { sum: 0, count: 0 };
        tile.sum += smoothed[at];
        tile.count += 1;
        tiles[key] = tile;
      }      mean += value;
      count += 1;
      if (value > peak) peak = value;
    }
  }

  const calm = mean4(field3.calm);
  const pocketMean = mean4(field3.pocket);
  const ringMean = mean4(field3.ring);
  let calmFieldSum = 0;
  let calmFieldCount = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const sx = px(x);
      const sy = py(y);
      if (sx < calmRect.x || sx >= calmRect.x + calmRect.w) continue;
      if (sy < calmRect.y || sy >= calmRect.y + calmRect.h) continue;
      calmFieldSum += field.values[y * cols + x];
      calmFieldCount += 1;
    }
  }

  const full = Math.ceil(1 / COMPOSITION.denseShare);
  const cellsPerTile = (tilePx / win.scale) ** 2;
  const tileMeans = tiles.filter(Boolean)
    .filter((tile) => tile.count >= cellsPerTile * 0.8)
    .map((tile) => tile.sum / tile.count)
    .sort((a, b) => b - a);
  const topCount = Math.max(1, Math.ceil(tileMeans.length / full));
  const dense = tileMeans.length
    ? tileMeans.slice(0, topCount).reduce((a, b) => a + b, 0) / topCount : 0;

  // Bands: the last group of 8 px is incomplete and is discarded, as the
  // protocol says. The seam is the worst jump on either axis.
  const bandAxis = (bands, limit) => {
    const keys = [...bands.keys()].sort((a, b) => a - b)
      .filter((key) => (key + 1) * COMPOSITION.bandPx <= limit);
    const means = keys.map((key) => mean4(bands.get(key)));
    let jump = 0;
    let longest = 0;
    let run = 0;
    for (let i = 0; i < means.length; i++) {
      if (i > 0) jump = Math.max(jump, Math.abs(means[i] - means[i - 1]));
      if (means[i] < COMPOSITION.emptyBand) {
        run += 1;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }
    return { jump, emptyShare: longest * COMPOSITION.bandPx / limit };
  };
  const rowBands = bandAxis(rows2, height);
  const colBands = bandAxis(cols2, width);
  const bandJump = Math.max(rowBands.jump, colBands.jump);
  const emptyShare = Math.max(rowBands.emptyShare, colBands.emptyShare);

  // Vignette: the layer's own measurements at the field coordinates, plus the
  // lift a corner REGION gains when the layer is removed — presence, not a
  // declaration. A corner region is used because a single dark cell lands on no
  // ramp step and its ratio says nothing.
  const layers = constellationLayers(c, { cols, rows, index: options.index ?? 0 });
  const vigAt = (u, v) => layers.vignette[Math.round(v * (rows - 1)) * cols + Math.round(u * (cols - 1))];
  const { scene, metrics } = fieldScene(c, cols, rows);
  const span = metrics.maxTone - metrics.groundTone;
  let cornerLit = 0;
  let cornerOpen = 0;
  for (let y = 0; y < Math.min(16, rows); y++) {
    for (let x = 0; x < Math.min(16, cols); x++) {
      const at = y * cols + x;
      const tone = layers.sky[at] + layers.wash[at];
      cornerLit += paintTone(c, scene, metrics, span, tone * layers.vignette[at], x, y);
      cornerOpen += paintTone(c, scene, metrics, span, tone, x, y);
    }
  }
  const vignette = {
    centre: vigAt(0.5, 0.5),
    edge: vigAt(0, 0.5),
    corner: vigAt(0, 0),
    lift: cornerLit > 0 ? cornerOpen / cornerLit : 1,
  };

  return {
    window: win,
    calm,
    calmField: calmFieldCount ? calmFieldSum / calmFieldCount : 0,
    pocket: pocketMean,
    ring: ringMean,
    dense,
    pocketToRing: ringMean > 0 ? pocketMean / ringMean : 0,
    ringToCalm: calm > 0 ? ringMean / calm : 0,
    denseToCalm: calm > 0 ? dense / calm : 0,
    bandJump,
    bandAxis: rowBands.jump >= colBands.jump ? 'row' : 'column',
    emptyShare,
    emptyAxis: rowBands.emptyShare >= colBands.emptyShare ? 'row' : 'column',
    emptyBand: COMPOSITION.emptyBand,
    sky: {
      lit: (lit3.pocket[0] + lit3.ring[0] + lit3.outer[0])
        / Math.max(1, lit3.pocket[1] + lit3.ring[1] + lit3.outer[1]),
      calm: mean4(lit3.calm),
      pocket: mean4(lit3.pocket),
      ring: mean4(lit3.ring),
      outer: mean4(lit3.outer),
    },
    vignette,
    intensity: { mean: count ? mean / count : 0, peak },
  };
}

/**
 * The composition rules as errors, in a stable order. An empty array means the
 * field has the approved recipe; a uniform field is NAMED as uniform, because
 * the flat delivery is exactly that and it must not pass silently.
 * @param {object} c
 * @param {{width?: number, height?: number, cols?: number, rows?: number, index?: number}} [options]
 * @returns {string[]}
 */
export function compositionErrors(c, options = {}) {
  const m = compositionMetrics(c, options);
  const R = COMPOSITION;
  const errors = [];
  // Uniformity is judged on the SKY's own density, over the three regions that
  // have enough cells to be a sample: the calm rectangle is only ~1.5k cells,
  // and its Poisson noise would either hide a uniform field or invent one.
  const lit = [m.sky.pocket, m.sky.ring, m.sky.outer].filter((value) => value > 0);
  const litSpread = lit.length ? Math.max(...lit) / Math.min(...lit) - 1 : 0;
  if (litSpread <= 0.2) {
    errors.push(`composition: uniform field — pocket ${fixed(m.pocket)}, ring ${fixed(m.ring)} `
      + `and field calm ${fixed(m.calmField)} carry the same intensity: a carpet, not a sky`);
  }
  if (!(m.pocketToRing <= R.pocketToRing)) {
    errors.push(`composition: quiet pocket ${fixed(m.pocketToRing)} of the ring (max ${R.pocketToRing}): `
      + 'the figure does not read clean');
  }
  if (!(m.ringToCalm >= R.ringToCalm)) {
    errors.push(`composition: ring/calm ${fixed(m.ringToCalm)} (min ${R.ringToCalm}): `
      + 'the ring does not return the gaze');
  }
  if (!(m.denseToCalm >= R.denseToCalm)) {
    errors.push(`composition: dense/calm ${fixed(m.denseToCalm)} (min ${R.denseToCalm}): `
      + 'the field has no zones');
  }
  if (!(m.bandJump <= R.bandJump)) {
    errors.push(`composition: band jump ${fixed(m.bandJump)} on ${m.bandAxis} bands of ${R.bandPx} px `
      + `(max ${R.bandJump}): there is a seam`);
  }
  if (!(m.calm >= R.calm[0] && m.calm <= R.calm[1])) {
    errors.push(`composition: calm ${fixed(m.calm)} is outside ${R.calm[0]}-${R.calm[1]}: `
      + 'the headline zone is off the approved intensity');
  }
  if (!(m.emptyShare < R.emptyShare)) {
    errors.push(`composition: empty band ${(m.emptyShare * 100).toFixed(1)} % of the ${m.emptyAxis} axis `
      + `(max ${R.emptyShare * 100} %): the field dies somewhere`);
  }
  if (!(m.sky.outer >= R.skyDensity * 0.72 && m.sky.outer <= R.skyDensity * 1.35)) {
    errors.push(`composition: sky density ${fixed(m.sky.outer)} at the field baseline `
      + `(approved ${R.skyDensity}): the sky is a carpet`);
  }
  if (!(m.vignette.lift > 1.04 && m.vignette.corner < 0.86)) {
    errors.push(`composition: the vignette has no presence — corner ${fixed(m.vignette.corner)}, `
      + `x${fixed(m.vignette.lift)} on the painted corner when the layer is removed`);
  }
  return errors;
}
