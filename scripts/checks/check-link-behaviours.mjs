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
 * Usage (from the repository root):
 *   timeout 180 node scripts/checks/check-link-behaviours.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  BREATH, HAIRLINE, LINKS, LINK_CYCLE_MS, PLANE_LINK, TRACE_WINDOW, cyclePosition, linkBehaviour,
  linkStyle, traceEdge, traceWindow, wrap01,
} from '../../design-studies/v1/link-behaviours.mjs';
import { FOCUS_FADE, TRAMOS, breatheAlong } from '../../scripts/scene-src/constellation.mjs';

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

// -- breathe ---------------------------------------------------------------
const breatheLink = LINKS.find((link) => link.plane === 'mid' && link.index !== BASE.edge);
check('breathe is the behaviour of a mid-plane link with nothing focused', (impl) => {
  const style = at(impl, breatheLink, 0.2);
  return { pass: style.behaviour === 'breathe', detail: `link ${breatheLink.index} · ${style.behaviour}` };
});
check('breathe varies inside the cycle (the stroke lights and goes out)', (impl) => {
  const values = Array.from({ length: SAMPLE_STEPS }, (_, step) => at(impl, breatheLink, step / SAMPLE_STEPS).opacity);
  const range = spread(values);
  return { pass: range >= 0.5 * planeOf(breatheLink).opacity,
    detail: `${num(Math.min(...values))}..${num(Math.max(...values))} of plane ${num(planeOf(breatheLink).opacity)} (needs ≥ ${num(0.5 * planeOf(breatheLink).opacity)})` };
});
check('breathe is 0 at both ends of its own loop and 1 at its crest', (impl) => {
  const phase = breatheLink.phase;
  const start = at(impl, breatheLink, wrap01(-phase)).opacity;
  const end = at(impl, breatheLink, wrap01(1 - phase)).opacity;
  const crest = at(impl, breatheLink, wrap01(0.5 - phase)).opacity;
  return { pass: start <= 1e-9 && end <= 1e-9 && Math.abs(crest - planeOf(breatheLink).opacity) < 1e-9,
    detail: `q=0 → ${num(start)} · q=1 → ${num(end)} · crest → ${num(crest)} of ${num(planeOf(breatheLink).opacity)}` };
});
check('breathe lights TRAMOS stretches along the stroke, lit longer than the gap', (impl) => {
  const { dash } = at(impl, breatheLink, 0.31);
  const [lit, gap] = dash ?? [NaN, NaN];
  const period = lit + gap;
  return { pass: Math.abs(period - 1 / TRAMOS) < 1e-9 && lit > gap && lit > 0,
    detail: `dash ${num(lit)}/${num(gap)} · period ${num(period)} = 1/${TRAMOS} → ${num(1 / period)} stretches` };
});
check('breathe travels from origin to destination, one period per cycle', (impl) => {
  const step = 0.01;
  const before = at(impl, breatheLink, 0.2).offset, after = at(impl, breatheLink, 0.2 + step).offset;
  // The crest of the library's own `breatheAlong` is the reference: the dash
  // pattern must move in the same direction and at the same speed.
  const crestAt = (p) => {
    let best = -Infinity, along = 0;
    for (let k = 0; k < 2000; k++) {
      const value = breatheAlong(k / 2000, p, breatheLink.phase);
      if (value > best) { best = value; along = k / 2000; }
    }
    return along;
  };
  const drift = wrap01((crestAt(0.2 + step) - crestAt(0.2)) * TRAMOS);
  const dashDrift = wrap01((before - after) * TRAMOS);
  return { pass: after < before && Math.abs(dashDrift - drift) < 0.05 && Math.abs(dashDrift - step) < 0.05,
    detail: `offset ${num(before)} → ${num(after)} (dash drift ${num(dashDrift)} periods per ${step} cycle) · breatheAlong crest drift ${num(drift)}` };
});
check('every behaviour is 2π-periodic in the cycle', (impl) => {
  let worst = 0, where = '';
  for (const link of LINKS) for (const p of [0, 0.13, 0.5, 0.87]) {
    for (const state of [BASE, focused(20), focused(0)]) {
      const a = impl(link, p, state), b = impl(link, p + 1, state);
      const delta = Math.max(Math.abs(a.opacity - b.opacity), Math.abs(a.offset - b.offset),
        Math.abs((a.dash?.[0] ?? -1) - (b.dash?.[0] ?? -1)));
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
  if (behaviour === 'breathe') return wrap01(0.5 - link.phase);
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
const mutants = [
  { name: 'todos los enlaces sólidos (la conducta anterior)', guards: ['breathe varies inside the cycle (the stroke lights and goes out)', 'breathe lights TRAMOS stretches along the stroke, lit longer than the gap', 'trace is drawn from origin to destination: 0 at the start, 1 at the end'],
    style: (link, p, state = BASE) => ({ ...linkStyle(link, p, state), opacity: PLANE_LINK[link.plane].opacity, dash: null }) },
  { name: 'escalera de planos invertida', guards: ['every link at its crest sits at its plane weight, and the ladder rises from far to near'],
    style: (link, p, state = BASE) => ({ ...linkStyle(link, p, state), opacity: PLANE_LINK[link.plane === 'far' ? 'near' : link.plane === 'near' ? 'far' : 'mid'].opacity }) },
  { name: 'foco que no desvanece el resto', guards: ['focus leaves node 20\'s group solid and everything else below the threshold'],
    style: (link, p, state = BASE) => ({ ...linkStyle(link, p, state), opacity: PLANE_LINK[link.plane].opacity }) },
  { name: 'breathe sin envolvente', guards: ['breathe is 0 at both ends of its own loop and 1 at its crest'],
    style: (link, p, state = BASE) => { const style = linkStyle(link, p, state); return style.behaviour === 'breathe' ? { ...style, opacity: PLANE_LINK[link.plane].opacity } : style; } },
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
const count = (behaviours) => ['breathe', 'trace', 'depth', 'focus'].map((behaviour) => `${behaviour} ${behaviours.filter((value) => value === behaviour).length}`).join(' · ');
const focus20 = LINKS.map((link) => linkBehaviour(withGroup(link, 20), focused(20)));
const focus0 = LINKS.map((link) => linkBehaviour(withGroup(link, 0), focused(0)));

console.log(`enlaces: ${LINKS.length} · ciclo ${LINK_CYCLE_MS} ms · ventana de traza ${TRACE_WINDOW.delay}–${TRACE_WINDOW.delay + TRACE_WINDOW.travel} ms`);
console.log(`conductas sin foco: ${count(base)}`);
console.log(`conductas con el nodo 0 activo: ${count(focus0)}`);
console.log(`conductas con el nodo 20 activo: ${count(focus20)}`);
console.log(`escalera de planos (opacidad / grosor): far ${num(PLANE_LINK.far.opacity)}/${num(PLANE_LINK.far.width)} · mid ${num(PLANE_LINK.mid.opacity)}/${num(PLANE_LINK.mid.width)} · near ${num(PLANE_LINK.near.opacity)}/${num(PLANE_LINK.near.width)}`);
console.log(`breathe: ${BREATH.period.toFixed(4)} periodo → ${(1 / BREATH.period).toFixed(2)} tramos, ${BREATH.lit.toFixed(4)} encendido / ${(BREATH.period - BREATH.lit).toFixed(4)} apagado`);
console.log('');
for (const row of rows) console.log(`${row.pass ? 'PASS' : 'FAIL'}  ${row.name} — ${row.detail}`);
console.log('');
for (const negative of negatives) console.log(`${negative.ok ? 'PASS' : 'FAIL'}  caso negativo · ${negative.name} — detectado por ${negative.caught.filter((row) => row.caught).length}/${negative.guards.length} reglas`);
console.log(`\n${rows.filter((row) => row.pass).length}/${rows.length} reglas PASS · ${negatives.filter((negative) => negative.ok).length}/${negatives.length} casos negativos PASS`);
if (failures.length) { console.log(`fallan: ${JSON.stringify(failures)}`); process.exitCode = 1; }
