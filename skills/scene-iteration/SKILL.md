---
name: scene-iteration
description: >
  Implement or revise dot-engine scenes through measured iteration with Angie.
  Trigger: Implementing or revising a scene of the dot-engine space: hero, galaxy, stratum, trace, footer, or Arequipa.
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke: "Implementing or revising dot-engine scenes with Angie"
---

## When to Use

- Use for scene meaning, layers, topology, focus, ambient life, and continuous camera travel.
- Exclude plain UI sections, copywriting, general layout, and the Astro port.
- Load [frontend-design](../frontend-design/SKILL.md) for visual/UI craft and [design-taste-frontend](../design-taste-frontend/SKILL.md) for implementation architecture; do not duplicate their rules.

## Critical Patterns

Read the [contract](../../docs/ESTETICA-CONSTELACION.md), [scene proposal](../../odd/tasks/escenas-del-espacio.md), [phase plan](../../odd/tasks/plan-lenguaje-constelacion.md), and [iteration template](assets/iteration-template.md) completely before work. The template contains mandatory questions, incident-backed rules, manifest fields, and acceptance evidence—not optional background.

Keep canonical numbers only in the contract. Distinguish proposals, approved appearance, measured capabilities, and unresolved failures; older plan statuses are not current proof.

| Order | Action → required artifact | Gate |
|---|---|---|
| Interrogate | Question bank → Angie's answers. | No code before answers. |
| Ground | Real data/measured reference → feasibility record. | Angie validates meaning and extent. |
| Propose | Short proposal + manifest + measurement plan. | Angie approves before code. |
| Implement | One bounded scene change → candidate. | Follow the approved contract/proposal. |
| Measure | Acceptance checklist + numbers + raw evidence. | Agent determines pass/fail. |
| Review independently | Blind double measurement → findings. | Fix, remeasure; disclose missing review. |
| Validate with Angie | Screenshots + numbers + viewing note → approve / adjust / reject with reason. | Visual approval never turns numerical failure into a pass. |
| Record | Aesthetic document + manifest → decisions/evidence/remaining failures. | Return adjustments to the affected gate. |

Stop at every human gate; never batch unanswered decisions into implementation. Never delegate measurement or contract-compliance decisions to Angie.

## Code Examples

Use the [scene manifest](assets/iteration-template.md#scene-manifest): layers, tone, node topology, ambient behavior, camera, still, and evidence. The Arequipa brief is a proposal, not an implemented scene or runtime schema.

## Commands

Existing hero probes, copied from `dist-motion-verify/wu114-v1/focus-report.md`; inspect/adapt scene assumptions before claiming Arequipa coverage. Run from repository root during authorized implementation, not documentation authoring:

```bash
node dist-motion-verify/wu114-v1/focus-contract.mjs
node dist-motion-verify/wu114-v1/hero-optics.mjs
node dist-motion-verify/wu114-v1/focus-budget.mjs final
```

Preview registration when `AGENTS.md` is outside the edit surface; defer the write:

```bash
./skills/skill-sync/assets/sync.sh --dry-run
```

## Context7 MCP

Use local measurements, not library search, to establish compliance. For unfamiliar APIs, load [context7-docs](../context7-docs/SKILL.md), resolve the library ID, and query source terms such as `OffscreenCanvas` or `prefers-reduced-motion`; do not invent an ID.

## Resources

- **Template**: [Iteration record](assets/iteration-template.md) — questions, incidents, manifest, checklist, Angie handoff, and source conflicts.
- **Documentation**: [Aesthetic contract](../../docs/ESTETICA-CONSTELACION.md) — sole numeric authority.
- **Evidence**: `dist-motion-verify/wu114-v1/judge-a/`, `dist-motion-verify/wu114-v1/judge-b/`, `dist-motion-verify/wu114-v1/focus-report.md`. Carry ignored evidence explicitly with reviews.
