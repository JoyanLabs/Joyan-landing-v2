#!/usr/bin/env node
/**
 * WU140 — the four link behaviours of `design-studies/v1/`, measured.
 *
 * The piece used to draw all 52 links as one always-solid path (S4: «las lineas
 * que unen las estrellas quizas podria no todo el tiempo estar solidas»). Now
 * each link takes one of the four conductas and each one has a value that can
 * fail. This check reads the SAME definition the page draws with
 * (`design-studies/v1/link-behaviours.mjs`), in plain Node, with no browser:
 * if a behaviour stops being 2π-periodic, stops going to zero at the ends of
 * its loop, stops travelling in the signal's window, stops separating the
 * planes or stops fading the unfocused links, this exits non-zero.
 *
 * WU150 replaces the dashed line with a PULSE: the base link stays solid at its
 * plane's hairline and a short mark travels from one node to the other, once
 * per cycle, with a tail of 3-4 copies that get longer, thinner and fainter
 * behind a bright thick head. The rules below measure the travel (head from
 * origin to destination), the per-link phase, the tail's gradient and the fact
 * that the signal's own edge pulses with the signal and not on a second clock.
 *
 * Usage (from the repository root):
 *   timeout 180 node scripts/checks/check-link-behaviours.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  HAIRLINE, LINKS, LINK_CYCLE_MS, PLANE_LINK, PULSE, PULSE_REACH, TRACE_WINDOW, cyclePosition,
  linkBehaviour, linkPhase, linkStyle, pulseTravel, traceEdge, traceWindow, wrap01,
} from '../../design-studies/v1/link-behaviours.mjs';
import { FOCUS_FADE } from '../../scripts/scene-src/constellation.mjs';

const num = (v) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? '0' : v.toFixed(4)) : String(v));
const spread = (values) => Math.max(...values) - Math.min(...values);
const planeOf = (link) => PLANE_LINK[link.plane];

// The states the page actually draws: nothing focused, and a couple of the
// piece's own focus targets (node 0 is the tip of the lance with a 2-node
// group; node 20 has a 7-link group, so both extremes are covered).
const BASE = { active: false, edge: traceEdge(LINKS, -1) };
const focused = (node) => ({ active: true, edge: traceEdge(LINKS, node), node });
/** `link.inGroup` is the page's ring membership; the check rebuilds it from the
 * piece's own RINGS so it cannot silently assume a group. */
const rings = (await import('../../design-studies/v1/scene-constelacion2.mjs')).RINGS;
const groupOf = (node) => new Set(rings.filter((ring) => ring.includes(node)).flat());
const linkIn = (link, group) => group.has(link.from) || group.has(link.to);
const withGroup = (link, node) => ({ ...link, inGroup: linkIn(link, groupOf(node)) });

// --------------------------------------------------------------- the assertions
// Each case is a function of an implementation `style(link, p, state)`, so the
// same rule runs against the real module and against a deliberately broken one.
const cases = [];
const check = (name, run) => cases.push({ name, run });

const SAMPLE_STEPS = 96;
const at = (impl, link, p, state = BASE) => impl(link, p, state);
/** The copies of a pulse, or an empty list: every pulse rule reads them here. */
const copiesOf = (style) => style.pulse?.copies ?? [];
/** Everything one style says, so the periodicity rule can compare two of them. */
const styleDelta = (a, b) => {
  const parts = [Math.abs(a.opacity - b.opacity), Math.abs(a.offset - b.offset),
    Math.abs((a.dash?.[0] ?? -1) - (b.dash?.[0] ?? -1))];
  const [pa, pb] = [a.pulse, b.pulse];
  if (!pa || !pb) { parts.push(pa === pb ? 0 : 10); return Math.max(...parts); }
  parts.push(Math.abs(pa.head - pb.head));
  const count = Math.max(pa.copies.length, pb.copies.length);
  for (let i = 0; i < count; i++) {
    const [ca, cb] = [pa.copies[i], pb.copies[i]];
    if (!ca || !cb) { parts.push(10); continue; }
    parts.push(Math.abs(ca.from - cb.from), Math.abs(ca.to - cb.to), Math.abs(ca.opacity - cb.opacity),
      Math.abs(ca.width - cb.width), Math.abs(ca.length - cb.length));
  }
  return Math.max(...parts);
};

// -- pulse -----------------------------------------------------------------
const pulseLink = LINKS.find((link) => link.plane === 'mid' && link.index !== BASE.edge);
/** The cycle position where THIS link's comet is exactly halfway across it. */
const pulseMid = wrap01(0.5 - pulseLink.phase);
check('pulse is the behaviour of a mid-plane link with nothing focused', (impl) => {
  const style = at(impl, pulseLink, 0.2);
  return { pass: style.behaviour === 'pulse', detail: `link ${pulseLink.index} · ${style.behaviour}` };
});
check('a pulse link keeps its base stroke solid at the plane weight', (impl) => {
  const styles = Array.from({ length: SAMPLE_STEPS }, (_, step) => at(impl, pulseLink, step / SAMPLE_STEPS));
  const opacities = styles.map((style) => style.opacity);
  const solid = styles.every((style) => style.dash === null && style.offset === 0
    && Math.abs(style.opacity - planeOf(pulseLink).opacity) < 1e-9);
  return { pass: solid,
    detail: `${styles.length} posiciones · dash ${styles.every((style) => style.dash === null) ? 'ninguno' : 'presente'} · opacidad ${num(Math.min(...opacities))}..${num(Math.max(...opacities))} de ${num(planeOf(pulseLink).opacity)}` };
});
check('the pulse is a short head, not a second line along the link', (impl) => {
  const { pulse } = at(impl, pulseLink, pulseMid);
  const copies = copiesOf(at(impl, pulseLink, pulseMid));
  const head = copies[0];
  return { pass: !!pulse && head && head.length > 0 && head.length <= 0.15
      && copies.every((copy) => copy.length >= head.length),
    detail: `cabeza ${num(head?.length)} del enlace (≤ 0,15) · ${copies.length} copias, largos ${copies.map((copy) => num(copy.length)).join(' / ')}` };
});
check('the pulse travels from origin to destination, once per cycle', (impl) => {
  const steps = 192;
  // Sampled in the link's OWN travel position, so the phase cannot hide a
  // journey that never leaves the origin.
  const styles = Array.from({ length: steps }, (_, step) =>
    at(impl, pulseLink, wrap01(step / steps - pulseLink.phase)));
  const heads = styles.map((style) => style.pulse?.head ?? NaN);
  const spans = styles.map((style) => copiesOf(style)[0]).map((copy) => (copy ? [copy.from, copy.to] : [NaN, NaN]));
  const rising = heads.every((head, i) => i === 0 || head > heads[i - 1]);
  // One window, so one crossing of every point of the link per cycle.
  const crossings = heads.filter((head, i) => i > 0 && heads[i - 1] < 0.5 && head >= 0.5).length;
  const span = heads.at(-1) - heads[0];
  // The painted copy advances with it instead of standing still on the link.
  const visible = spans.filter(([from, to]) => to > from);
  const advances = visible.every(([from], i) => i === 0 || from >= visible[i - 1][0]);
  return { pass: rising && heads[0] <= 0 && heads.at(-1) >= 1 && span >= 1 && crossings === 1 && advances && visible.length > 0,
    detail: `cabeza ${num(heads[0])} → ${num(heads.at(-1))} (recorrido ${num(span)}) · monótona=${rising} · cruces del centro=${crossings} · fuera del enlace en los dos extremos=${heads[0] <= 0 && heads.at(-1) >= 1} · ${visible.length} posiciones con trazo, avanza=${advances}` };
});
check('every pulse carries its own phase: they do not pulse on one shared clock', (impl) => {
  const pulses = LINKS.filter((link) => at(impl, link, 0.4).behaviour === 'pulse');
  const heads = pulses.map((link) => at(impl, link, 0.4).pulse?.head ?? NaN);
  const range = spread(heads);
  // The phase relation itself: link A at p equals link B at p + phaseA - phaseB.
  const [a, b] = [pulses[0], pulses[Math.min(5, pulses.length - 1)]];
  const shifted = at(impl, b, wrap01(0.4 + linkPhase(a.index) - linkPhase(b.index)), BASE).pulse?.head ?? NaN;
  return { pass: pulses.length > 1 && range >= 0.5 && Math.abs(shifted - heads[0]) < 1e-9,
    detail: `${pulses.length} pulsos · cabezas en p=0.4 de ${num(Math.min(...heads))} a ${num(Math.max(...heads))} (abanico ${num(range)}) · enlace ${b.index} desplazado a la fase de ${a.index} → ${num(shifted)} vs ${num(heads[0])}` };
});
check('the tail: each copy behind the head is longer, thinner and fainter', (impl) => {
  const style = at(impl, pulseLink, pulseMid), pulse = style.pulse, copies = copiesOf(style);
  const lengths = copies.map((copy) => copy.length), widths = copies.map((copy) => copy.width), opacities = copies.map((copy) => copy.opacity);
  const longer = lengths.every((value, i) => i === 0 || value > lengths[i - 1]);
  const thinner = widths.every((value, i) => i === 0 || value < widths[i - 1]);
  const fainter = opacities.every((value, i) => i === 0 || value < opacities[i - 1]);
  // Every copy ends at the head and starts where its own length says, so the
  // extra length is the tail behind the head and not four separate marks.
  const tip = Math.min(1, Math.max(0, pulse.head));
  const aligned = copies.every((copy) => Math.abs(copy.to - tip) < 1e-9
    && Math.abs(copy.from - Math.max(0, pulse.head - copy.length)) < 1e-9);
  return { pass: copies.length >= 3 && longer && thinner && fainter && aligned,
    detail: `${copies.length} copias · largo ${lengths.map(num).join(' < ')} · grosor ${widths.map(num).join(' > ')} · opacidad ${opacities.map(num).join(' > ')} · todas terminan en la cabeza=${aligned}` };
});
check('the signal edge pulses with the signal, not on its own clock', (impl) => {
  const link = LINKS[BASE.edge];
  // Five positions inside the signal's window and two outside it, so the rule
  // proves both halves: the spark rides the signal and it is dark when the
  // signal is not travelling.
  const rows = [0.05, 0.25, 0.3, 0.35, 0.42, 0.45, 0.6].map((p) => ({ p, window: traceWindow(p), style: at(impl, link, p) }));
  const follows = rows.filter((row) => row.window.inside)
    .every((row) => row.style.pulse && Math.abs(row.style.pulse.head - row.window.at) < 1e-9);
  const off = rows.filter((row) => !row.window.inside)
    .every((row) => !row.style.pulse || copiesOf(row.style).every((copy) => copy.opacity === 0));
  const outside = rows.filter((row) => !row.window.inside).map((row) => Math.max(0, ...copiesOf(row.style).map((copy) => copy.opacity)));
  return { pass: follows && off && outside.length >= 2,
    detail: `cabeza del pulso = progreso de la señal en la ventana=${follows} · ${outside.length} posiciones fuera, copia más visible ${outside.map(num).join(' / ')} → apagado=${off}` };
});
check('every behaviour is 2π-periodic in the cycle', (impl) => {
  let worst = 0, where = '';
  for (const link of LINKS) for (const p of [0, 0.13, 0.5, 0.87]) {
    for (const state of [BASE, focused(20), focused(0)]) {
      const delta = styleDelta(impl(link, p, state), impl(link, p + 1, state));
      if (delta > worst) { worst = delta; where = `link ${link.index} @ p=${p}`; }
    }
  }
  return { pass: worst < 1e-12, detail: `worst |style(p) − style(p+1)| = ${num(worst)}${where ? ` at ${where}` : ''}` };
});

// -- trace -----------------------------------------------------------------
const traceLink = LINKS[BASE.edge];
check('trace is drawn from origin to destination: 0 at the start, 1 at the end', (impl) => {
  // q = 0, 0.5 and "one step before the end": at q = 1 the traverse is over and
  // the envelope is 0, so the drawn fraction is the library's wrapped 0 again.
  const start = at(impl, traceLink, 0.25), mid = at(impl, traceLink, 0.35), end = at(impl, traceLink, 0.45 - 1e-6);
  const drawnStart = start.dash?.[0] ?? -1, drawnMid = mid.dash?.[0] ?? -1, drawnEnd = end.dash?.[0] ?? -1;
  const closes = at(impl, traceLink, 0.45);
  return { pass: start.behaviour === 'trace' && drawnStart === 0 && Math.abs(drawnMid - 0.5) < 1e-9
      && Math.abs(drawnEnd - 1) < 1e-5 && closes.opacity === 0,
    detail: `${start.behaviour} · drawn ${num(drawnStart)} @ q=0 · ${num(drawnMid)} @ q=0.5 · ${num(drawnEnd)} @ q→1 · en q=1 el trazo cierra con opacidad ${num(closes.opacity)}` };
});
check('trace envelope is 0 at both ends of the traverse and 1 at its middle', (impl) => {
  const values = [0, 0.25, 0.5, 0.75, 1].map((p) => at(impl, traceLink, 0.25 + p * 0.2).opacity);
  const base = planeOf(traceLink).opacity;
  return { pass: values[0] <= 1e-9 && values[4] <= 1e-9 && Math.abs(values[2] - base) < 1e-9,
    detail: `opacity ${values.map(num).join(' / ')} of plane ${num(base)}` };
});
check('trace is off outside the signal\'s window', (impl) => {
  const outside = [0.05, 0.2, 0.6, 0.9].map((p) => at(impl, traceLink, p).opacity);
  return { pass: outside.every((v) => v === 0), detail: `opacity at p=0.05/0.2/0.6/0.9 → ${outside.map(num).join(' / ')}` };
});
check('trace is the piece\'s own signal window, not a second travelling dot', () => {
  const samples = [0, 1000, 2999, 3000, 4200, 5400, 9000, 12000, 15600];
  const worst = samples.map((ms) => ({ ms, q: traceWindow(cyclePosition(ms)).q, expected: ((ms % LINK_CYCLE_MS) - TRACE_WINDOW.delay) / TRACE_WINDOW.travel }))
    .reduce((a, b) => (Math.abs(a.q - a.expected) >= Math.abs(b.q - b.expected) ? a : b));
  return { pass: Math.abs(worst.q - worst.expected) < 1e-12,
    detail: `q(ms) = ((ms % ${LINK_CYCLE_MS}) − ${TRACE_WINDOW.delay}) / ${TRACE_WINDOW.travel} · worst at ${worst.ms} ms: ${num(worst.q)} vs ${num(worst.expected)}` };
});
check('the signal dot keeps its own behaviour: same position, same sin² opacity', () => {
  // PRESERVE. "Integrate the trace, do not invent a second one" also means the
  // dot that was already there may not change: its position is the clamped
  // progress and its opacity the square of the envelope, exactly as the piece
  // computed them before this change (`q>0&&q<1 ? sin(πq)² : 0`).
  const samples = Array.from({ length: 97 }, (_, i) => (i / 96) * 24000);
  const worst = samples.reduce((a, ms) => {
    const q = ((ms % LINK_CYCLE_MS) - TRACE_WINDOW.delay) / TRACE_WINDOW.travel;
    const legacy = q > 0 && q < 1 ? Math.sin(Math.PI * q) ** 2 : 0;
    const window = traceWindow(cyclePosition(ms));
    const at = Math.min(1, Math.max(0, q));
    return Math.max(a, Math.abs(window.envelope ** 2 - legacy), Math.abs(window.at - at));
  }, 0);
  return { pass: worst < 1e-12, detail: `dos ciclos, 97 muestras · peor desvío contra la fórmula anterior ${num(worst)}` };
});
check('trace follows the edge the signal already travelled, and does not move it', () => {
  const nodes = [0, 5, 17, 20, 34];
  const expected = (active) => (active < 0 ? 48 : Math.max(0, LINKS.findIndex((l) => l.from === active || l.to === active)));
  const rows = [-1, ...nodes].map((active) => ({ active, edge: traceEdge(LINKS, active), expected: expected(active) }));
  return { pass: rows.every((row) => row.edge === row.expected),
    detail: rows.map((row) => `${row.active}→${row.edge}`).join(' · ') };
});

// -- depth -----------------------------------------------------------------
// The crest of a link's own envelope: the position where its behaviour is fully
// lit, so what is measured there is the plane's weight and nothing else.
const crestOf = (impl, link) => {
  const behaviour = impl(link, 0, BASE).behaviour;
  // A pulse link's base stroke is always at the plane weight, so any position
  // is its crest; `trace` is only at full weight in the middle of its window.
  if (behaviour === 'pulse') return 0.3;
  if (behaviour === 'trace') return (TRACE_WINDOW.delay + TRACE_WINDOW.travel / 2) / LINK_CYCLE_MS; // q = 0.5
  return 0.3;
};
check('every link at its crest sits at its plane weight, and the ladder rises from far to near', (impl) => {
  const rows = LINKS.map((link) => ({ link, style: impl(link, crestOf(impl, link), BASE) }));
  const worst = rows.reduce((a, row) => Math.max(a, Math.abs(row.style.opacity - planeOf(row.link).opacity)), 0);
  const widths = rows.reduce((a, row) => Math.max(a, Math.abs(row.style.width - planeOf(row.link).width)), 0);
  const ladder = PLANE_LINK.far.opacity < PLANE_LINK.mid.opacity && PLANE_LINK.mid.opacity < PLANE_LINK.near.opacity
    && PLANE_LINK.far.width < PLANE_LINK.mid.width && PLANE_LINK.mid.width < PLANE_LINK.near.width;
  return { pass: worst < 1e-9 && widths < 1e-12 && ladder,
    detail: `${rows.length} enlaces · desvío de opacidad ${num(worst)} · de grosor ${num(widths)} · escalera ${num(PLANE_LINK.far.opacity)} < ${num(PLANE_LINK.mid.opacity)} < ${num(PLANE_LINK.near.opacity)} (opacidad) y ${num(PLANE_LINK.far.width)} < ${num(PLANE_LINK.mid.width)} < ${num(PLANE_LINK.near.width)} (grosor)` };
});
check('the links that do not animate are the far ones: depth has no envelope', (impl) => {
  // Every far link except the one the signal travels is `depth`; no other plane
  // has a `depth` link, so "sin animación" is exactly the far stratum.
  const far = LINKS.filter((link) => link.plane === 'far' && link.index !== BASE.edge);
  const allDepth = far.every((link) => impl(link, 0.3, BASE).behaviour === 'depth');
  const noneElse = LINKS.filter((link) => link.plane !== 'far').every((link) => impl(link, 0.3, BASE).behaviour !== 'depth');
  return { pass: far.length > 0 && allDepth && noneElse,
    detail: `${far.length}/${LINKS.filter((link) => link.plane === 'far').length} enlaces far son depth (el otro es la traza) · ${noneElse ? 'ningún otro plano tiene depth' : 'hay depth fuera del plano lejano'}` };
});
check('the far links barely read against the near ones', (impl) => {
  const far = LINKS.filter((link) => link.plane === 'far');
  const near = LINKS.filter((link) => link.plane === 'near');
  const worst = far.reduce((a, link) => Math.max(a, at(impl, link, 0.3, BASE).opacity), 0);
  const brightest = near.reduce((a, link) => Math.max(a, at(impl, link, crestOf(impl, link), BASE).opacity), 0);
  return { pass: worst <= 0.7 * HAIRLINE.opacity && worst <= 0.5 * brightest,
    detail: `max far opacity ${num(worst)} ≤ ${num(0.7 * HAIRLINE.opacity)} (70 % de la hairline ${HAIRLINE.opacity}) y ≤ mitad del near más brillante ${num(brightest)}` };
});
check('depth has no animation at all', (impl) => {
  const link = LINKS.find((l) => l.plane === 'far' && l.index !== BASE.edge);
  const values = Array.from({ length: 24 }, (_, step) => at(impl, link, step / 24));
  const still = values.every((style) => style.opacity === values[0].opacity && style.dash === null
    && style.width === values[0].width && style.offset === 0);
  return { pass: still && values[0].behaviour === 'depth',
    detail: `${values[0].behaviour} · opacity constant ${num(values[0].opacity)} · dash ${String(values[0].dash)} over 24 positions` };
});

// -- focus -----------------------------------------------------------------
for (const node of [0, 20]) {
  const group = groupOf(node);
  check(`focus leaves node ${node}'s group solid and everything else below the threshold`, (impl) => {
    const state = focused(node);
    const rows = LINKS.map((link) => ({ link, style: impl(withGroup(link, node), 0.3, state) }));
    const inside = rows.filter((row) => linkIn(row.link, group));
    const outside = rows.filter((row) => !linkIn(row.link, group));
    const solid = inside.every((row) => row.style.behaviour === 'focus' && row.style.dash === null
      && Math.abs(row.style.opacity - planeOf(row.link).opacity) < 1e-9);
    const faded = outside.every((row) => row.style.opacity <= planeOf(row.link).opacity * FOCUS_FADE + 1e-9);
    const maxOutside = Math.max(...outside.map((row) => row.style.opacity));
    const minInside = Math.min(...inside.map((row) => row.style.opacity));
    return { pass: inside.length > 0 && outside.length > 0 && solid && faded && maxOutside < minInside / 2,
      detail: `grupo ${group.size} nodos · ${inside.length} enlaces sólidos (min ${num(minInside)}) · ${outside.length} desvanecidos (max ${num(maxOutside)}, umbral ${num(FOCUS_FADE)})` };
  });
}
check('focus composes with the plane ladder instead of overriding it', (impl) => {
  const node = 20, group = groupOf(node), state = focused(node);
  const inside = LINKS.filter((link) => linkIn(link, group)).map((link) => impl(withGroup(link, node), 0.3, state));
  const planes = new Set(inside.map((style) => style.plane));
  const sorted = ['far', 'mid', 'near'].filter((plane) => planes.has(plane))
    .map((plane) => inside.find((style) => style.plane === plane).opacity);
  const monotone = sorted.every((value, at) => at === 0 || sorted[at - 1] < value);
  return { pass: sorted.length >= 2 && monotone, detail: `opacidad del grupo por plano: ${sorted.map(num).join(' < ')}` };
});
check('focus is a state, not a loop: membership only matters with a node active', (impl) => {
  const node = 20, group = groupOf(node);
  const baseDelta = LINKS.reduce((a, link) => Math.max(a,
    Math.abs(impl(withGroup(link, node), 0.42, BASE).opacity - impl(link, 0.42, BASE).opacity)), 0);
  const outside = LINKS.filter((link) => !linkIn(link, group));
  const focusDelta = outside.reduce((a, link) => Math.max(a,
    Math.abs(impl(withGroup(link, node), 0.42, BASE).opacity - impl(withGroup(link, node), 0.42, focused(node)).opacity)), 0);
  return { pass: baseDelta < 1e-12 && focusDelta > 0,
    detail: `sin foco el grupo no cambia nada (${num(baseDelta)}) · con el nodo ${node} el resto baja hasta ${num(focusDelta)}` };
});

// -- continuity ------------------------------------------------------------
check('no behaviour jumps across the loop, measured as a continuous sequence', (impl) => {
  let worst = 0, where = '';
  const steps = 4000;
  for (const link of LINKS) for (const state of [BASE, focused(20)]) {
    let previous = impl({ ...link, inGroup: linkIn(link, groupOf(20)) }, 0, state).opacity;
    for (let step = 1; step <= steps; step++) {
      const p = (step / steps) * 2; // two whole loops, so the wrap at p = 1 is inside
      const value = impl({ ...link, inGroup: linkIn(link, groupOf(20)) }, p, state).opacity;
      const delta = Math.abs(value - previous);
      if (delta > worst) { worst = delta; where = `link ${link.index} @ p=${num(p)}`; }
      previous = value;
    }
  }
  return { pass: worst <= 0.02, detail: `peor salto entre pasos de 1/${steps / 2} ciclo = ${num(worst)}${where ? ` en ${where}` : ''}` };
});

// -- the definition the page is allowed to draw with ------------------------
check('the page draws with this module and does not define a second trace', async () => {
  const source = await readFile(fileURLToPath(new URL('../../design-studies/v1/v1.mjs', import.meta.url)), 'utf8');
  const imports = /from '\.\/link-behaviours\.mjs'/.test(source);
  const secondTrace = /clock\s*%\s*12000|\)\s*\/\s*2400/.test(source);
  return { pass: imports && !secondTrace,
    detail: `importa ./link-behaviours.mjs = ${imports} · ventana de traza duplicada en v1.mjs = ${secondTrace}` };
});

// ------------------------------------------------------------------ the run
const failures = [];
const rows = [];
for (const { name, run } of cases) {
  let result;
  try {
    result = await run((link, p, state = BASE) => linkStyle(link, p, state));
  } catch (error) {
    result = { pass: false, detail: `lanzó ${error.message}` };
  }
  rows.push({ name, ...result });
  if (!result.pass) failures.push(name);
}

// The negative cases: each mutant breaks exactly one rule and MUST be caught.
// A rule that no broken implementation can fail is not a check.
const withHead = (style, head) => (style.pulse ? { ...style, pulse: { ...style.pulse, head } } : style);
const mutants = [
  { name: 'todos los enlaces sólidos (la conducta anterior)', guards: ['the pulse is a short head, not a second line along the link', 'the pulse travels from origin to destination, once per cycle', 'the tail: each copy behind the head is longer, thinner and fainter', 'trace is drawn from origin to destination: 0 at the start, 1 at the end'],
    style: (link, p, state = BASE) => ({ ...linkStyle(link, p, state), opacity: PLANE_LINK[link.plane].opacity, dash: null, offset: 0, pulse: null }) },
  { name: 'escalera de planos invertida', guards: ['every link at its crest sits at its plane weight, and the ladder rises from far to near'],
    style: (link, p, state = BASE) => ({ ...linkStyle(link, p, state), opacity: PLANE_LINK[link.plane === 'far' ? 'near' : link.plane === 'near' ? 'far' : 'mid'].opacity }) },
  { name: 'foco que no desvanece el resto', guards: ['focus leaves node 20\'s group solid and everything else below the threshold'],
    style: (link, p, state = BASE) => ({ ...linkStyle(link, p, state), opacity: PLANE_LINK[link.plane].opacity }) },
  { name: 'el enlace base vuelve a ir punteado', guards: ['a pulse link keeps its base stroke solid at the plane weight'],
    style: (link, p, state = BASE) => ({ ...linkStyle(link, p, state), dash: [0.2, 0.2], offset: 0 }) },
  { name: 'pulso clavado en el origen (sin viaje)', guards: ['the pulse travels from origin to destination, once per cycle'],
    style: (link, p, state = BASE) => withHead(linkStyle(link, p, state), -PULSE_REACH) },
  { name: 'pulso invertido: del destino al origen', guards: ['the pulse travels from origin to destination, once per cycle'],
    style: (link, p, state = BASE) => { const style = linkStyle(link, p, state);
      return style.pulse ? withHead(style, 1 + PULSE_REACH - (style.pulse.head + PULSE_REACH)) : style; } },
  { name: 'cola sin degradado: todas las copias iguales', guards: ['the tail: each copy behind the head is longer, thinner and fainter'],
    style: (link, p, state = BASE) => { const style = linkStyle(link, p, state);
      return style.pulse ? { ...style, pulse: { ...style.pulse, copies: style.pulse.copies.map(() => ({ ...style.pulse.copies[0] })) } } : style; } },
  { name: 'todos los pulsos en fase', guards: ['every pulse carries its own phase: they do not pulse on one shared clock'],
    style: (link, p, state = BASE) => withHead(linkStyle(link, p, state), pulseTravel(wrap01(p))) },
  { name: 'la traza pierde su pulso', guards: ['the signal edge pulses with the signal, not on its own clock'],
    style: (link, p, state = BASE) => (link.index === state.edge ? { ...linkStyle(link, p, state), pulse: null } : linkStyle(link, p, state)) },
  { name: 'traza con fase propia, no la del señal', guards: ['trace is drawn from origin to destination: 0 at the start, 1 at the end', 'trace is off outside the signal\'s window'],
    style: (link, p, state = BASE) => (link.index === state.edge
      ? { ...linkStyle(link, p, state), opacity: PLANE_LINK[link.plane].opacity, dash: [wrap01(p + link.phase), 2] }
      : linkStyle(link, p, state)) },
];
const negatives = [];
for (const mutant of mutants) {
  const caught = [];
  for (const { name, run } of cases) {
    if (!mutant.guards.includes(name)) continue;
    let result;
    try { result = await run(mutant.style); } catch { result = { pass: false }; }
    caught.push({ name, caught: !result.pass });
  }
  const ok = caught.length === mutant.guards.length && caught.every((row) => row.caught);
  negatives.push({ name: mutant.name, ok, guards: mutant.guards, caught });
  if (!ok) failures.push(`caso negativo no detectado: ${mutant.name}`);
}

// ------------------------------------------------------------------ the table
const base = LINKS.map((link) => linkStyle(link, 0.3, BASE).behaviour);
const count = (behaviours) => ['pulse', 'trace', 'depth', 'focus'].map((behaviour) => `${behaviour} ${behaviours.filter((value) => value === behaviour).length}`).join(' · ');
const focus20 = LINKS.map((link) => linkBehaviour(withGroup(link, 20), focused(20)));
const focus0 = LINKS.map((link) => linkBehaviour(withGroup(link, 0), focused(0)));

console.log(`enlaces: ${LINKS.length} · ciclo ${LINK_CYCLE_MS} ms · ventana de traza ${TRACE_WINDOW.delay}–${TRACE_WINDOW.delay + TRACE_WINDOW.travel} ms`);
console.log(`conductas sin foco: ${count(base)}`);
console.log(`conductas con el nodo 0 activo: ${count(focus0)}`);
console.log(`conductas con el nodo 20 activo: ${count(focus20)}`);
console.log(`escalera de planos (opacidad / grosor): far ${num(PLANE_LINK.far.opacity)}/${num(PLANE_LINK.far.width)} · mid ${num(PLANE_LINK.mid.opacity)}/${num(PLANE_LINK.mid.width)} · near ${num(PLANE_LINK.near.opacity)}/${num(PLANE_LINK.near.width)}`);
console.log(`pulso: cabeza ${PULSE.head.toFixed(4)} · cola ${PULSE.step.toFixed(4)} × ${PULSE.copies.length} copias · alcance ${PULSE_REACH.toFixed(4)} del enlace`);
console.log('');
for (const row of rows) console.log(`${row.pass ? 'PASS' : 'FAIL'}  ${row.name} — ${row.detail}`);
console.log('');
for (const negative of negatives) console.log(`${negative.ok ? 'PASS' : 'FAIL'}  caso negativo · ${negative.name} — detectado por ${negative.caught.filter((row) => row.caught).length}/${negative.guards.length} reglas`);
console.log(`\n${rows.filter((row) => row.pass).length}/${rows.length} reglas PASS · ${negatives.filter((negative) => negative.ok).length}/${negatives.length} casos negativos PASS`);
if (failures.length) { console.log(`fallan: ${JSON.stringify(failures)}`); process.exitCode = 1; }
