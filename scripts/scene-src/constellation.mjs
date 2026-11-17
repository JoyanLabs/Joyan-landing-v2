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

import { hashNoise, layeredNoise, renderFrame } from './engine.mjs';

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
  far: Object.freeze({ opacity: 0.24, width: 0.52, figureGain: 0.55, depth: 0 }),
  mid: Object.freeze({ opacity: 0.48, width: 0.78, figureGain: 0.78, depth: 1 }),
  near: Object.freeze({ opacity: 0.92, width: 1.12, figureGain: 1, depth: 2 }),
});

/** How much of a link stays visible when the active node is in another group. */
export const FOCUS_FADE = 0.12;
/** Lit stretches along a breathing link. Two or more is what "por tramos" means. */
export const TRAMOS = 2.4;

// Field amplitudes, MEASURED against the engine's own rung ladder: the ramp's
// first rung sits at level ~0.008, the second at ~0.24 and the last at ~0.82 of
// the palette range, and a tone of `t` maps to roughly 0.6 t of level on this
// palette. So a dot has to be a real step on the tone axis, not a whisper: a
// field of 0.02 everywhere would light every cell with the smallest dot and
// read as a grey grid (the veil the approved piece rejects). These numbers put
// 55–70 % of the frame on step 0 with four rungs in use — the band the check
// enforces.
const SKY_FLOOR = 0;
const DUST = Object.freeze([0, 0.13, 0.42, 0.95]);
const NODE_GAIN = 0.075;
const LINK_GAIN = 0.6;
const CORE_INNER = 1.12;
const CORE_OUTER = 0.55;
/** Distance, in cells, at which a node's halo is no longer worth computing. */
const HALO_REACH = 30;
/** How far from a link's axis a cell can be and still receive ink. */
const LINK_REACH = 3.2;

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
      if (!isNumber(layers.sky.density) || layers.sky.density <= 0) errors.push('layer "sky" needs a positive density');
      if (!Number.isInteger(layers.sky.seed)) errors.push('layer "sky" needs an integer seed');
      if (!isNumber(layers.sky.veil) || layers.sky.veil < 0) errors.push('layer "sky" needs a veil amount');
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
 * The wash: structured atmosphere, never a radial gradient. A diagonal milky
 * band plus two knots, both modulated by the engine's own lattice noise, and the
 * band's own twist (a second, weaker band crossing it) so the cloud has a shape
 * instead of a centre. The two samples are crossfaded over the loop (`washK`),
 * which is what moves the weather.
 */
function washTone(u, v, cfg, seed, variant) {
  const skew = variant === 0 ? 1 : -0.82;
  const axis = (u * 0.62 + v * 0.79) * skew + 0.52;
  const cross = (u * -0.55 + v * 0.62) + 0.18 + variant * 0.06;
  const band = Math.exp(-((axis / 0.17) ** 2))
    * (0.3 + 0.7 * layeredNoise(u * 6.4 + variant * 3.1, v * 6.4 - variant * 1.7, seed + variant * 13, { octaves: 2 }));
  const twist = Math.exp(-((cross / 0.24) ** 2))
    * (0.2 + 0.8 * layeredNoise(u * 9.1 - 4.4, v * 9.1 + 6.2, seed + 31 + variant * 11, { octaves: 2 }));
  const knotA = Math.exp(-(((u - 0.3 - variant * 0.05) ** 2 + (v - 0.28) ** 2) / 0.055));
  const knotB = Math.exp(-(((u - 0.74 + variant * 0.04) ** 2 + (v - 0.68) ** 2) / 0.075));
  const grain = 0.35 + 0.65 * layeredNoise(u * 13 + 7.3, v * 13 + 2.9, seed + 61 + variant * 7, { octaves: 2 });
  return cfg.gain * (0.2 * band + 0.09 * twist + 0.32 * knotA * grain + 0.26 * knotB * grain);
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
  const skyCfg = c.layers.sky ?? { density: 0, seed: 0, veil: 0 };
  const washCfg = c.layers.wash ?? { seed: 0, gain: 0 };
  // A missing layer renders as nothing (identity for the vignette, zero for the
  // ink layers): the RENDERER draws what the data has, and validation is the
  // gate that reports the omission. A stack gap has to be measurable, not fatal.
  const vig = c.layers.vignette ?? { start: 0, exponent: 1, strength: 0 };
  const coreCfg = c.layers.cores ?? { inner: 0, outer: 0 };
  const density = skyCfg.density ?? 0;
  // The quiet pocket of `docs/ESTETICA-CONSTELACION.md`: the field thins around
  // the figure so the constellation reads clean and the ring around it is denser.
  // It is composed from the nodes, not from the camera, so it is part of the art.
  const pocketX = c.nodes.reduce((sum, node) => sum + node.x, 0) / c.nodes.length;
  const pocketY = c.nodes.reduce((sum, node) => sum + node.y, 0) / c.nodes.length;
  const clusters = c.layers.sky.clusters ?? [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = y * cols + x;
      const u = (x + 0.5) / cols;
      const v = (y + 0.5) / rows;
      // 1 · point sky: a veil of the smallest dot whose DENSITY is the picture —
      // large-scale cloud, a milky band and a few clusters — plus two brighter
      // tiers, so the ramp shows several dot sizes and not one uniform grain.
      // Density is what makes material instead of a floor: a positive tone on
      // every cell would put the smallest dot everywhere and read as a grid.
      const cloud = layeredNoise(x * 0.016, y * 0.016, skyCfg.seed, { octaves: 2 });
      const bandAxis = (u * 0.62 + v * 0.82 - 0.55) / 0.22;
      const milky = Math.exp(-(bandAxis ** 2));
      const pocket = 1 - 0.55 * Math.exp(-(((u - pocketX) ** 2 + ((v - pocketY) * 1.15) ** 2) / 0.045));
      let lit = 0.05 + 0.16 * cloud + 0.26 * milky;
      for (const cluster of clusters) {
        const d = Math.hypot(u - cluster.x, (v - cluster.y) * 1.1);
        if (d < cluster.r) lit += cluster.boost * (1 - d / cluster.r) ** 2;
      }
      const veil = clamp01(lit * pocket * density * (skyCfg.veil ?? 1));
      const roll = hashNoise(x, y, skyCfg.seed + 17);
      let dust = 0;
      if (roll < veil) dust = DUST[1];
      if (roll < veil * 0.82) dust = DUST[2];
      if (roll < veil * 0.2) dust = DUST[3];
      sky[at] = SKY_FLOOR + dust;
      // 2 · wash. It is atmosphere BEHIND the figure, so the pocket thins it too:
      // the approved composition asks for a pocket where the figure reads clean
      // and a denser ring around it, and a nebula laid over the stars hides them.
      const washPocket = pocket ** 1.6;
      washA[at] = washTone(u, v, washCfg, washCfg.seed, 0) * washPocket;
      washB[at] = washTone(u, v, washCfg, washCfg.seed, 1) * washPocket;
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
      const amount = LINK_GAIN * amplitude * Math.exp(-2.4 * (terms.cross[i] * terms.cross[i]) / width2);
      dyn[terms.cells[i]] += amount;
      plane[terms.cells[i]] += amount;
    }
  });

  // 2 · wash crossfade: two static samples, moving over the loop. `drift` is how
  // far the weather travels; at 0 the wash would be a still gradient.
  const drift = c.layers.wash?.drift ?? 1;
  const k = 0.5 + 0.5 * drift * Math.cos(TAU * p + 0.7);
  state.washK = k;

  // 4 and 5 · vignette then cores, in that order
  for (let i = 0; i < composite.length; i++) {
    composite[i] = (sky[i] + washA[i] * k + washB[i] * (1 - k) + dyn[i]) * vignette[i] + core[i];
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
  for (let i = 0; i < n; i++) wash[i] = layout.washA[i] * k + layout.washB[i] * (1 - k);

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
