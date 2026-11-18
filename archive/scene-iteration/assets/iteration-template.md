# Scene iteration record

Record proposed, approved, measured, failed, and unmeasured separately. Link evidence; canonical numbers/methods live only in [docs/ESTETICA-CONSTELACION.md](../../../docs/ESTETICA-CONSTELACION.md).

## Incident-backed hard rules

| Enforce | Incident / source |
|---|---|
| Keep the ordered stack; noise may supplement, never replace it. | A uniform replacement flattened the scene and required reconstruction; contract: “Las capas, en orden”. |
| Keep back planes visible while focusing; measure their luminance retention against the canonical floor. | The owner rejected disappearing layers: «dejé de ver las capas de atrás que se veía bastante genial cuando hacía click en un nodo». See “Capas y foco: corrección de rumbo”. |
| Bake focus endpoints per plane and cross-fade; never live-filter whole layers at large viewports. | Live filtering roughly doubled frame cost; historical copies below. Preserve separate parallax and live emission; baking is not free or a budget pass. |
| Use one camera in one continuous space, without cuts or level loads. | The scene proposal rejects separate pages/levels. Travel between regions is proposed, not built. |
| Measure before documenting a capability as done; use blind measurement, not report endorsement. | Both judges found two claimed capabilities absent: depth of field and ambient life. The contract's later corrections do not erase that incident. |
| Recalibrate from the approved piece; never change its look to satisfy a self-invented threshold. | The old calm band did not describe the approved dark image; the contract records evidence-led recalibration without retouching it. Preserve unresolved composition goals as unresolved. |
| Measure worst-cell contrast composited over the moving field; a static pass is insufficient. | Judge A's `pass2-results.json` exposed composited contrast failures; the later contract records corrected conservative contrast. DOM color pairs alone are not protection. |

## Interrogate before code

Use a 10–15 minute conversation with Angie (timebox from the authoring brief). Record her answers verbatim where wording matters; unresolved answers block implementation.

| Ask Angie | Why the answer changes the scene |
|---|---|
| What does this scene represent, and what should someone recognize without text? | Establish meaning before decoration. |
| What does each node mean: place, actor, district, authorization, or contact? What do links mean? | Prevent arbitrary graphs and meaningless interaction. |
| How many depth planes are needed, and what lives in each? | Separate the figure's planes from the fixed compositing stack. |
| What does dot size map to? For Arequipa, is it terrain elevation? | Make the size hierarchy accountable to data or an explicit design decision. |
| What exactly happens on click/tap/keyboard activation; where does the camera go, and how does one return? | Define interaction, focus destination, and navigation before coding. |
| Which planes/nodes must remain visible while focused, and which may soften? | Preserve the world behind the selected plane rather than hiding it. |
| What ambient behavior has meaning, what is its cycle, and what rests between events? | Avoid both dead fields and meaningless random motion. |
| What must the reduced-motion still show, including selection? | Design a complete static composition, not an animation paused accidentally. |
| What must this scene never do? | Record explicit rejection criteria before an expensive visual pass. |
| Which tone/accent belongs here, and exactly where may it appear? | Keep scene identity separate from gates and live UI states. |
| For a real place, which extent and source should be recognizable? For Arequipa: district, city, or basin with the volcanoes? | Decide the data boundary before promising a silhouette. |
| How is the scene reached and left: portal, galaxy map, or both? | Resolve the proposed travel model without inventing a second camera or a separate map screen. |

## Ground and propose

- For real subjects, inspect data before promising the shape. For Arequipa, investigate GeoJSON/OSM contour + SRTM elevation, simplify to nodes, map elevation to dot size, and follow principal roads for links—not an arbitrary graph.
- Show the source contour and derived points together, including Misti, Chachani, Pichu Pichu where the chosen extent permits. Record the source, chosen extent, simplification, elevation mapping, missing data, and recognizability limits; do not invent coordinates or heights.
- For an interpretive scene, record a measured reference and the intended departure. If real data is unavailable, stop and ask Angie to revise the premise; do not silently substitute a fictional city.
- Submit a short proposal: meaning, data/reference, manifest, difference from the approved hero, travel, risks, exclusions, and measurement plan. Obtain Angie's approve / adjust / reject with reason before code.
- Restrict the scene accent to cores, never UI states; reserve brand yellow/amber for gates and live states.

## Scene manifest

Declare these fields; this is an authoring template, not a runtime schema. Propose its location; do not assume a port or engine API.

| Field | Required declaration |
|---|---|
| Identity and status | Scene name, meaning, proposed/approved/measured state, Angie's decision and reason. |
| Data/reference | Source and extent, transformation into nodes, size mapping, known gaps, evidence links. |
| Layers | Ordered sky, wash, figure, vignette, cores; per-layer role, material, movement, and full-bleed coverage. Keep the canonical order. |
| Figure planes | Plane membership and depth order; node meaning/count per plane; focused, intermediate, farthest treatments. |
| Tone | Ground, scene tone, proposed accent, allowed placement, excluded UI uses. |
| Node topology | Node identities and positions, size meaning, link semantics, click/tap/keyboard destination, portal/contact roles. |
| Ambient behavior | Drift/breathing/discrete event meaning, cycle/rest, pause and lifecycle clock behavior. |
| Camera and focus | Entry/exit route, selected travel model, focus/return/interruption behavior, baked endpoints per plane. |
| Reduced motion | Approved still/reference time, instantaneous selection state, no autonomous change. |
| Acceptance | Canonical contract links, measurement protocol, raw outputs, independent findings, pass/fail/unmeasured per check. |
| Decision history | Angie's approvals/adjustments/rejections with reasons, rejected alternatives, remaining failures and next gate. |

### Arequipa starting brief — proposal, not approval

Use [the scene proposal](../../../odd/tasks/escenas-del-espacio.md) for the proposed node count, temperature/accent candidates, elevation-sized volcano cores, district focus, and onward travel to Estratosfera. Do not preselect the extent, accent, or travel model; those questions remain open in that source.

The proposed inventory is Nebulosa (hero), Arequipa, Estratosfera, La traza, Confín (footer). The galaxy zoom-out is a navigation layer, not another scene. Preserve the proposed build order: close the hero → approve scene/travel direction → investigate Arequipa data → Arequipa and transition → Confín → Estratosfera and La traza → navigation map if chosen. Verify each prerequisite; do not infer completion from the inventory.

## Measure and review

Keep the canonical protocol unchanged for hero regression. For a new topology, declare masks, state/time, and adaptations before code; obtain independent review. Do not compare unlike transfers/masks or confuse image intensity with linearized WCAG luminance.

Produce: viewport / ground / state / metric / value and unit / canonical rule link / pass, fail, or unmeasured / raw evidence. Historical observations are not thresholds. Record missing methods/bands; settle the method before certification, never invent a passing limit.

All dimensions here are copies from the canonical protocol, not a separate contract: **390×844, 768×1024, 1440×900**, both **dark and paper**, with its specified browser, DPR, still time, and readiness conditions. Verify the actual ground, not just the screenshot filename; early judge A static outputs duplicated dark under paper labels. Paper remains rejected/open exploration, not an approved palette required for release.

| Acceptance checklist — produce every row | Evidence and decision required |
|---|---|
| Layer visibility | Base/focused screenshots plus isolated layer evidence; verify the ordered stack, distinct material, full bleed, and no rectangular seams. Check canonical composition, palette, vignette, and dot-step rules. |
| Per-plane treatment table | One row per plane: contents/depth, base and focused blur, opacity, saturation, parallax, endpoint technique, visible result. Distinguish computed CSS from baked optical blur. |
| Back-plane luminance retention | Per rear plane, base/focused luminance, masks/camera correspondence, ratio, and raw images. Use “Capas y foco: corrección de rumbo” for the acceptance floor; record the agreed protocol, never opacity as a luminance proxy. |
| Idle changed-pixel percentage | Paired frames over the canonical idle interval, denominator and pixel-difference method, in base and focus; identify scene events/cycle. Also measure paused and reduced stills. A deliberately quiet footer is not permission to freeze an active scene. |
| Reduced-motion still | Base and selected stills against the approved reference; verify no worker/rAF, immediate focus, no automatic return, and hidden pause control. |
| Frame cost mean/p95 | Per run: sample count, mean/p95 for idle/focus/travel, each viewport/ground. Separate cadence, callback, delivery, one-off bake, recurring worker cost. Follow `dist-motion-verify/wu114-v1/focus-report.md`; do not pool away failures or infer GPU/mobile performance. |
| Worst-cell contrast | Measure text against the composited field during idle, focus, and travel, covering its cycle and brightest interfering states; retain worst cell/state evidence and the contrast method. Static DOM color-pair checks are supplementary. |
| Touch target sizes | Actual CSS bounds and center activation for every node in base/focus, including overlapping targets under the inverse camera. Verify click/tap destination and explicit keyboard destination, independent of visible star size. |
| Accessibility tree summary | Names, roles, selected/pressed states, node/control counts, live status, focus order/indicator, Enter/Space, Escape/return, pause/resume, and no-JS fallback. State whether a physical screen reader was tested; an AX dump is not that test. |
| Pause and lifecycle | Verify clock, emission, trace, camera, focus, return timer, queued selection, and stale-worker results across pause, offscreen, hidden tab, `pagehide`, resume, and ground switch. |
| Continuous travel | Capture entry, intermediate, and destination states: same camera, no blank frame, cut, or level load. Verify interruption and return; proposed inter-scene travel is not the hero's existing focus capability. |

### Independent review and evidence provenance

- Request phase A1 blind double review: candidate, contract, manifest, reproduction conditions, no implementer verdict. Each reviewer measures and returns findings/raw evidence, not report endorsement.
- Compare independent results with the implementer's table; reconcile ground, version, masks, units, and runtime conditions before changing the image. Fix failures, rerun affected checks, and repeat the Angie gate for the changed candidate.
- Preserve the judges' lessons: `judge-a/interact-results.json` and `judge-b/measurements.json` found missing idle life; focus styles alone did not prove depth. With baked endpoints, `filter: none` alone no longer disproves it either—inspect the pixels.
- Historical cost copies, not acceptance limits: the contract records **18,38–18,63 ms** mean even with diagnostic filters disabled; `dist-motion-verify/wu114-v1/focus-report.md` records live-filter paper baseline **38.38–39.06 / 50.10** mean/p95. Baking improved cost but did not meet the canonical large-viewport budget. Keep separate planes; blur before downsampling to avoid the rejected crosshatch artifacts.
- Judge B's `provenance.json` reports filesystem replay, not live-server evidence, and unavailable GPU timing. Preserve limitations; carry ignored evidence explicitly. Request missing judge directories; never fabricate verdicts.

## Validate with Angie and record

Send each gate's decision artifact. For a built candidate, send:

- Screenshots at the canonical **390/768/1440** widths (copies of the protocol above), in both grounds: base, focused depth, and reduced still; include travel evidence where relevant.
- The completed numbers table, per-plane treatment table, independent findings, and clearly named failures/unmeasured checks.
- A short “what to look at” note: recognizability, depth retained behind focus, meaningful ambient life, accent placement, and continuity; point to the intended change, not a general request to find bugs.

Ask Angie for **approve / adjust / reject with reason**. She validates meaning and appearance; the agent measures the numbers and determines contract compliance. Never delegate instrumentation, pass/fail calculation, or deciding whether a numerical failure meets the contract to her. Record a visual approval separately from technical acceptance; failed/unmeasured requirements remain blocked, not waived by taste.

Record her decision, evidence, rejected options/reasons, and unresolved work in the manifest and [aesthetic document](../../../docs/ESTETICA-CONSTELACION.md). Keep authorized calibrations only there, with before/after evidence and rationale—not visual retouching. On adjust/reject, revisit the question/proposal, remeasure, and review before asking again.

## Boundaries and source conflicts

- Leave typography, general UI layout/responsive craft, color exploration technique, and aesthetic critique to `frontend-design`; leave dependency verification, component structure, Tailwind/styling policy, and framework architecture to `design-taste-frontend`. Neither overrides the approved scene contract.
- Do not write business copy, revive discarded copy, rebuild stacked page sections, or perform the Astro port. The phase plan keeps text discarded and the port unstarted; node/navigation semantics are not authorization to write page text.
- The plan's “judges not run”, absent life, and absent blur are historical; the later contract records both judges and corrections. Rear-plane navigation, large-viewport budget, physical screen-reader/mobile verification, and palette exploration remain open.
- The proposal calls the hero multi-plane; the contract leaves rear-plane navigation unfinished. Verify membership/navigation. These sources supply neither a manifest schema nor verified Arequipa data.
