# Joyan Design Manual

The single source of truth for the Joyan landing visual, copy, asset, diagram, motion, accessibility, and localization system. It is the contract that `pnpm check`, `pnpm generate:dither`, and code review enforce. If a component, asset, or copy line disagrees with this manual, the manual wins — fix the implementation.

**Audience:** designers and developers producing or reviewing landing surfaces, dither assets, MAGI diagrams, motion, or locale copy.

## Quick path

1. **Start from the tokens** — ink/bone/plomo/accent, radius `0`, no italics ([Tokens](#visual-tokens--contrast), [Typography](#typography)).
2. **Place dither by level** — L0 none, L1 shell texture, L2 section illustration, L3 hero only ([Dither levels](#dither-levels-l0l3)).
3. **Add an asset** — kebab-case SVG in `scripts/dither-src/`, SVGO, `pnpm generate:dither`, verify PASS, consume with intrinsic dimensions ([Asset contract](#asset-contract), [Generation workflow](#asset-generation-workflow), checklists below).
4. **Add copy** — mirror ES and EN keys exactly, warm cooperative voice, no prohibited patterns ([Copy & i18n rules](#copy--i18n-rules)).
5. **Verify** — `pnpm check` and `pnpm build` must pass before commit.

## Brand essence and voice

Joyan is a **people-centered cooperative that creates specialized agents as a service** — never generic software. Agents are digital specialists for one concrete operational task, acting within agreed limits; humans design, tune, review important decisions, and answer for each agent. MAGI is the main agent, operating business systems in the background.

**Voice: warm, specific, people-centered.** Real people are behind every agent; decisions are human; nothing is overpromised.

**Two distinct offer layers — never conflate them:**

| Layer | What it is | Where it lives | Tone rule |
|---|---|---|---|
| **Cooperative model** | What Joyan does today: agents as a service, MAGI, hardware concepts | `hero`, `agents`, `magi`, `hardware`, `ecosystem.items` | Present tense, concrete, no caveats |
| **Community offers** | Guides, content, training, and prototype invitations — explicitly **in development** | `ecosystem.community` (status/audiences/offers) and `hardware.prototypeInvitation` | Explain what agents can do, cannot do, and need human review; no dates, enrollment/forms, beta, or delivery promises |

## Visual tokens & contrast

Defined in `src/assets/styles/tailwind.css` `@theme`; always reference the Tailwind utilities, never hard-code hex in markup.

| Token | Utility | Hex | Role |
|---|---|---|---|
| ink-950 | `bg-ink-950` | `#0B0B0C` | Page background |
| ink-900 | `bg-ink-900` | `#121214` | Surface (figures, panels) |
| ink-800 | `bg-ink-800` | `#1A1A1D` | Terminal background |
| bone-50 | `text-bone-50` | `#F4F2ED` | Display headings |
| bone-100 | `text-bone-100` | `#E8E6E1` | Body text |
| plomo-400 | `text-plomo-400` | `#8A8A90` | Secondary text, mono labels |
| plomo-500 | `text-plomo-500` | `#6E6E73` | Large mono labels only |
| accent | `bg-accent` | `#FFB000` | Amber accent, active states, CTAs |
| accent-ink | `text-accent-ink` | `#0B0B0C` | Text on accent |
| hairline | `border-hairline` | `rgb(255 255 255 / 0.16)` | 1px separators, strokes, frames |

**Contrast contract (WCAG 2.1 AA, computed):**

| Pair | Ratio | Allowed use |
|---|---|---|
| bone-50 `#F4F2ED` on ink-950 `#0B0B0C` | 17.6:1 | Display headings |
| bone-100 `#E8E6E1` on ink-950 `#0B0B0C` | 15.8:1 | Body text — **≥4.5:1 required** |
| plomo-400 `#8A8A90` on ink-950 `#0B0B0C` | 5.7:1 | Secondary text — passes 4.5:1 |
| plomo-500 `#6E6E73` on ink-950 `#0B0B0C` | 3.9:1 | **Large text only** (≥18.7px / 14pt bold) — 3:1 rule |
| accent `#FFB000` on ink-950 `#0B0B0C` | 10.7:1 | Accents, active diagram states |
| accent-ink `#0B0B0C` on accent `#FFB000` | 10.7:1 | Text/CTAs on accent |

**Rules:**

- Body text must maintain **≥4.5:1** contrast; use bone-100 or plomo-400, never plomo-500 for small text.
- `hairline` is decorative — separators, borders, diagram strokes. Never set text in hairline.
- Texture and dither must **never sit under text**.
- **Purple gradients are prohibited** anywhere in the design.

## Typography

| Role | Font | Utility / rule |
|---|---|---|
| Display | Archivo Variable | `text-display`: weight 850, stretch 125%, `uppercase`, tracking `-0.01em` |
| Body | Archivo Variable | default sans; `text-bone-100` |
| Labels / terminal | JetBrains Mono Variable | `font-mono`, `text-xs`, `uppercase`, `tracking-widest` (buttons, kickers, captions, terminal lines) |

**Hard rules:**

- **No italics** anywhere (no `italic`, no em/oblique styling).
- **Radius 0** everywhere — all `--radius-*` tokens are `0px`; keep them that way.
- **Hairlines** — 1px separators in `border-hairline` define all framing.
- **Terminal motif** — mono uppercase labels, `[magi]`-style terminal lines (`TerminalBlock`, `magi.terminalLines`), and the amber **caret** block after the hero kicker.
- Caret blink is **opacity-only** and disabled under `prefers-reduced-motion` (see [Motion](#motion-guide)).
- Use `@fontsource-variable/archivo` and `@fontsource-variable/jetbrains-mono`; never add another font dependency.

## Dither levels (L0–L3)

Pre-baked, deterministic, palette-limited ordered-dither art. Levels define **where** texture/illustration may appear:

| Level | Name | Placement | Notes |
|---|---|---|---|
| L0 | None | Nav, labels, body text, footer | No texture anywhere text lives |
| L1 | Subtle global texture | Static CSS/SVG shell texture in page gutters, **behind opaque surfaces** | Canvas-free; never under text; kept in `tailwind.css` + `PageLayout` |
| L2 | Section illustration | Bounded figures: Agents, MAGI, Hardware, Ecosystem | `agents-dither`, `magi-dither`, `ecosystem-dither` (new), `hardware-dither` (V1) |
| L3 | Focal illustration | **Hero only** | `hero-dither` is the single focal piece; V1 hardware illustration stays a bounded L2 figure |

**Rules:**

- Texture/illustration must never overlap text; keep contrast ≥4.5:1 in any region that touches content.
- **Static/pre-baked preferred** — assets are committed PNGs, not runtime canvas (the only canvas is the optional MAGI particle overlay, section [Motion](#motion-guide)).
- No idle motion outside the MAGI section.
- Hero and shell texture are decorative (`alt=""` / `aria-hidden`); section figures are informative (localized `alt` + `caption`).

## Asset contract

Formats: **SVG sources** (vector, ink/bone palette, 1px strokes, no embedded raster, no data URIs) in `scripts/dither-src/`; **2-color palette PNGs** (Bayer 8×8 dither, ink-950/bone-50 only) in `public/assets/dither/`; the brand OG PNG in `public/assets/brand/`.

| Source (`scripts/dither-src/`) | Output (`public/assets/`) | Dimensions | Budget | Unit |
|---|---|---|---|---|
| `hero-network.svg` | `dither/hero-dither.png` | 1600×900 | 80 KiB | V1 (L3) |
| `hardware-board.svg` | `dither/hardware-dither.png` | 1024×1024 | 60 KiB | V1 (L2) |
| `agents-network.svg` | `dither/agents-dither.png` | 1200×900 | 70 KiB | C (L2) |
| `magi-network.svg` | `dither/magi-dither.png` | 1200×750 | 75 KiB | C (L2) |
| `ecosystem-network.svg` | `dither/ecosystem-dither.png` | 1200×750 | 75 KiB | C (L2) |
| `wordmark.svg` | `brand/og-default.png` | 1200×628 | 100 KiB | V1 (OG) |

**Five dither illustrations, one separate OG output.** `hero-dither`, `hardware-dither`, `agents-dither`, `magi-dither`, and `ecosystem-dither` are the five dither illustrations. `og-default.png` is the **separate brand output** — it composites the `wordmark.svg` over a dithered texture derived from `hardware-board.svg` and is only used for social/OpenGraph sharing, never as an in-page figure.

**Naming rules:** kebab-case source SVG names in `scripts/dither-src/`; matching kebab-case PNG names in `public/assets/dither/`; the sole exception is `brand/og-default.png`. Consuming paths are **absolute** `/assets/...` with **intrinsic dimensions** (`width`/`height` attributes on the `<img>`, as `DitherFigure` requires) to reserve layout and avoid CLS.

## Asset generation workflow

```bash
# 1. Optimize every source SVG (also the MAGI diagram)
pnpm dlx svgo --config scripts/svgo.config.mjs --folder scripts/dither-src

# 2. Regenerate and verify all outputs against budgets (exits 1 on any over-budget asset)
pnpm generate:dither
```

**Source SVG authoring conventions:**

- Kebab-case filename; `viewBox` aspect-matching the target output (e.g. 16:9 for hero/agents, 1:1 for hardware, 8:5 for magi/ecosystem).
- Ink/bone two-value art (grayscale shapes; dithering derives tone). 1px strokes preferred; no fills that will read as flat blocks.
- No embedded raster, no data URIs, no text layers (the wordmark is the only composited text, and only into the OG).
- No stock photos, no logos beyond the JOYAN wordmark, no UI mockups or screenshots.

**Bayer 8×8 two-color palette generation (`scripts/generate-dither.mjs`):**

1. SVG → grayscale → resize to exact target dimensions → normalize → raw single-channel.
2. Ordered-dither with the standard 8×8 Bayer matrix, ink-biased (`darkBias` 12–16).
3. Map binary result to exactly two colors: ink-950 `#0B0B0C` / bone-50 `#F4F2ED`.
4. Encode as palette PNG (`sharp png palette: true, colours: 2`); the OG additionally composites `wordmark.svg` at pixel level to preserve the 2-color palette.

**Deterministic budget checks:** the script prints `PASS|FAIL <name>: <bytes> / <budget>` for every output, verifies exact pixel dimensions, and exits `1` when any asset exceeds its budget. A merged asset must print `PASS` for all rows. Generation must be rerun whenever a source SVG changes, and the PNGs are committed — never generated at build time.

## MAGI SVG diagram guide

The static diagram (`AgentNetworkDiagram.astro`, and the three new sources in Unit C) follows one strict grid:

- **viewBox `0 0 480 300`**, responsive via `h-auto w-full`.
- **Palette:** ink-950 page, ink-900 surface, ink-800 node fills, hairline strokes, bone text, accent for the single active state.
- **Nodes:** circular, `fill-ink-800` + 1px `stroke-hairline`, radius 11 for satellites; central MAGI node radius 52, `fill-accent` with an `accent-ink` mono bold uppercase label (`MAGI`, `tracking-widest`).
- **Edges:** 1px hairline lines (`stroke-hairline`); a dashed variant (`stroke-dasharray="3 4"`) marks weaker links; the inner orbit is a dashed circle (`2 7`).
- **Active state:** exactly **one** amber node (`stroke-accent`) — the current focus; never multiple.
- **Grid anchor:** center `(240, 150)`; satellites at `(390,150)`, `(315,72)`, `(165,72)`, `(90,150)`, `(165,228)`, `(315,228)`; orbit radius 84.
- **No embedded raster, no screenshots** — abstract art only.
- **Decorative semantics:** the SVG carries `aria-hidden="true"`; the copy conveys the meaning. Export optimized with SVGO (command above).
- **Motion on the SVG is opacity-only** (edge-energy pulse); static under reduced motion — see next section.

## Motion guide

There is exactly **one** continuous runtime loop: the optional MAGI particle overlay (`src/components/joyan/MagiParticleCanvas.astro` + `src/lib/magi-network.ts`) over the static diagram. Below-hero reveals are one-shot progressive enhancements, never a hero animation.

| Concern | Contract |
|---|---|
| Motion dependency | Exact `framer-motion@12.43.0`; use tree-shaken `animate` and `inView` from `framer-motion/dom`. Import `scroll` only when used. |
| Reveals | Below hero only; visible server markup; opacity/transform only; gate with `matchMedia('(prefers-reduced-motion: reduce)')` so reduced motion is static. |
| Particles | **7 nodes, 6 edges, 30 normal particles across three depth layers**; 24-particle low-end fallback; 30 fps cap |
| Canvas | `aria-hidden="true"` with **adjacent explanatory text** (`magi.motion.canvasLabel`, `staticStatus`, `activeStatus`); localized |
| DPR | Cap at **2** — never render above devicePixelRatio 2 |
| Pause | `IntersectionObserver` (offscreen), `visibilitychange` (hidden tab), and `pagehide` cancel rAF but retain observers/listeners for resume |
| Teardown / resume | `astro:before-swap` cancels rAF and Motion controls, invokes `inView` cleanup functions, disconnects observers, and removes listeners; reinitialize on `astro:page-load`, resume on re-entry / `pageshow` |
| SVG pulses / caret | **Opacity-only** (no transform/scale); 1.1s step-end caret, edge-energy pulses |
| Reduced motion | `prefers-reduced-motion: reduce` → no canvas, no pulses, caret `animation: none` — all static |
| No JS | PNG/SVG render statically without the overlay — motion is progressive enhancement |

**Performance proof:** before implementation, run `pnpm build && node scripts/check-iteration-3.mjs --capture-baseline .artifacts/iteration-2-client-js.json`. For a candidate, run `pnpm build && node scripts/check-iteration-3.mjs --baseline .artifacts/iteration-2-client-js.json`. The checker gzip-sums every emitted `dist/_astro/*.js` client chunk and requires a delta of **≤22 KiB (22528 bytes)**. `pnpm build` verifies static structure and emitted assets; intrinsic dimensions, static hero markup, and transform/opacity-only below-hero motion are CLS/LCP safeguards, not metric measurements. Measure CLS/LCP later in a browser or CI performance run.

No idle motion anywhere outside the MAGI section.

## Component & file consumption map

| Path | Role in the system |
|---|---|
| `src/assets/styles/tailwind.css` | All tokens, fonts, radius 0, `text-display`, L1 shell texture rules (Unit C) |
| `src/lib/i18n/types.ts` | Locale shape: `LocaleContent`, `IllustratedSectionContent`, `CommunityContent`, `MotionContent`, `HardwareContent`… |
| `src/lib/i18n/es.ts` / `en.ts` | Authoritative ES copy + identical-key EN mirror (`satisfies LocaleContent`) |
| `src/lib/i18n/index.ts` | `getAlternateLocalePath()` — `/` ↔ `/en` and `/bitacora` ↔ `/en/log` without trailing slashes |
| `src/pages/index.astro` | ES landing at `/` |
| `src/pages/en/index.astro` | EN landing at `/en` (never `/en/`; `trailingSlash: "never"`) |
| `src/layouts/{Layout,PageLayout}.astro` | `Layout` owns path-aware canonical/hreflang; `PageLayout` only forwards pathname/lang; `main#main` focus target and L1 texture host |
| `src/components/joyan/Hero.astro` | L3 hero figure (`/assets/dither/hero-dither.png`, empty alt), caret, CTA buttons |
| `src/components/joyan/Wordmark.astro` | JOYAN wordmark (hero + OG source) |
| `src/components/joyan/AgentNetworkDiagram.astro` | Static 480×300 MAGI diagram, `aria-hidden`, one amber state |
| `src/components/joyan/MagiParticleCanvas.astro` | Iteration-3 Unit A — bounded 30/24 MAGI overlay (motion contract above) |
| `src/lib/magi-network.ts` | Shared 480×300 model; replace V1's 12 particles with the 30/24 depth-layer contract above |
| `src/components/joyan/DitherFigure.astro` | Figure wrapper: absolute `/assets/...` src, intrinsic `width`/`height`, localized alt/caption |
| `src/components/joyan/{AgentsSection,MagiSection,HardwareSection,EcosystemSection}.astro` | Section figures (Unit E) + community/prototype blocks |
| `src/components/joyan/{SectionHeader,TerminalBlock,SiteHeader,SiteFooter,LanguageToggle}.astro` | Index/kicker/title, terminal motif, nav + toggle (current pathname + hash-preserving, `aria-current="page"`) |
| `scripts/generate-dither.mjs` | Bayer 8×8 generator + deterministic budgets |
| `scripts/svgo.config.mjs` | SVGO config for all source SVGs (Unit C) |
| `scripts/dither-src/*.svg` | kebab-case vector sources (3 V1 + 3 Unit C) |
| `public/assets/dither/*.png` | Five dither illustrations (2 V1 + 3 Unit C) |
| `public/assets/brand/og-default.png` | Separate OG brand output |
| `src/{content.config.ts,utils/journal.ts}` | Isolated typed Journal collection and locale queries; never use blog helpers |
| `src/components/joyan/{JournalSection,JournalEntryRow}.astro` | Section 05 and archive rows: hairline-separated mono metadata, title, summary, optional dither/link, no cards/radius |
| `src/pages/{bitacora,en/log}.astro` | ES/EN list-only archives with self-canonical and equivalent alternate cluster |
| `scripts/{check-iteration-2,check-iteration-3}.mjs` | Both deterministic checkers must be wired into `pnpm check`; iteration 3 verifies Journal, motion, and archive contracts |

## Copy & i18n rules

- **Strict key parity:** `es.ts` and `en.ts` must have **identical keys**, both `satisfies LocaleContent`; a missing key fails `pnpm check` (no fallback).
- **Routes and SEO:** ES is `/`, EN is `/en`; archives are `/bitacora` and `/en/log` — no trailing slash. `Layout` emits pathname-aware metadata: `/bitacora` self-canonical with `es=/bitacora`, `en=/en/log`, `x-default=/bitacora`; `/en/log` self-canonical with the same cluster. `PageLayout` only passes pathname/lang. Anchors survive the toggle.
- **Voice:** warm, cooperative, people-centered; state the cooperative model in present tense and every community offer with an explicit in-progress status.
- **Exact prohibited phrase:** the string `software para agentes` must never appear in copy (we create agents, not software) — this is asserted verbatim by the checker.
- **No vendor/technology names** in user-visible copy (framework, model, cloud, or chip names — the checker scans locale modules and built HTML against an explicit list).
- **No public implementation jargon** — `agentic`, AGI, MCP, and RAG never appear in landing, Journal, metadata, or alt text.
- **No fake screenshots** — no screenshot/captura de pantalla references, no UI mockups presented as product.
- **No unsupported claims** — nothing asserting pricing, purchase, enrollment/sign-up, open/available beta, immediate availability, hardware delivery, or guarantees. Community and prototype offers say "in development / en desarrollo" and promise no dates, no inscription, no delivery.
- **Human review is explicit** — community copy preserves `cooperativa`, explains what agents can do, cannot do, and require people to review, and never converts an in-development offer into a form, enrollment, beta, or delivery commitment.
- `check-iteration-3.mjs` scans locale source values; built metadata, visible text, and `alt`/`title` attributes; Journal Markdown/frontmatter; and `/bitacora` plus `/en/log` archive HTML for the above banned vendors/jargon/screenshots/unsupported claims. It preserves iteration 2 as a separate checker and enforces both contracts through `pnpm check`.

## Journal row rules

Use only list rows: a top hairline, mono uppercase date/area/status, title, summary, and optional dither/link. Area and status always come from localized chrome. Empty states are localized and honest. Do not use cards, rounded corners, thumbnails, detail pages, filters, or pagination.

**Row heading levels:** the landing section (h2) renders rows as **h3**; the archives render their page title as the single **h1** (`SectionHeader headingLevel={1}`) and rows as **h2** (`JournalEntryRow titleLevel={2}`) so heading order never skips a level.

## Static audit evidence (a11y & performance)

`check-iteration-3.mjs` (section 9) records deterministic, browser-free evidence for every PR that touches landing or Journal surface:

| Evidence | Deterministic check | Location |
|---|---|---|
| Landmarks | Site `<header>`, `<main id="main" tabindex="-1">` focus target, `<footer>`, `<nav aria-label="Main">`, `<nav aria-label="Footer">` on landings and archives | checker 9d |
| Unique IDs | Every `id` attribute unique per built page (section anchors `top/agents/magi/hardware/ecosystem/bitacora`, `main`, `shell-dots`) | checker 9d |
| Heading order | Exactly one h1 per page, first heading is h1, no skipped levels (landing: h1→h2→h3/h4; archives: h1→h2) | checker 9d |
| Keyboard / focus-visible | `:focus-visible` outline utilities in compiled CSS; hardware surface `tabindex="0"` + ring class + `:focus-within` treatment hook | checker 9d |
| Reduced-motion paths | JS gates (`prefers-reduced-motion`) plus ≥3 compiled CSS media blocks (canvas, pulses, caret, hardware, shell texture) | checker 9d + sections 3/5/6 |
| Content parity | ES/EN identical chrome keys (iteration-2 block 4) and ES-authoritative journal mirror (checker 8d) | both checkers |
| Build size | Client-JS gzip delta ≤ 22 KiB (22,528 B) against `.artifacts/iteration-2-client-js.json` | checker 7 |
| Route output | `/`, `/en`, `/bitacora`, `/en/log`, `/privacy`, `/terms` emit HTML; static HTML and gzip sums reported | checker 9e |

**No browser claims:** these are static structural safeguards (intrinsic dimensions, static hero markup, opacity/transform-only motion, contrast math, worst-case texture blend). Real LCP/CLS metrics require a browser or CI performance run and are deferred — never report Lighthouse-style numbers from this evidence.

## Accepted deviations (documented, not defects)

1. **Relative landing archive links.** The EN landing links the archive as `href="log"` (ES: `href="bitacora"`) instead of an absolute `/en/log` href because the iteration-2 route contract rejects any `/en/…` link target on the EN landing. The relative links resolve to `/bitacora` and `/en/log` at runtime; the archives themselves use absolute self-canonical URLs.
2. **Seed journal entries carry no `link` or `dither`.** The schema and components support both fields, but there is nothing real to link yet and no journal dither asset exists in the pipeline — no fake assets or dead links are shipped.
3. **Empty state is verified at source + conditionally.** The `entries.length > 0` branch and localized strings are source-verified, and the strings are proven absent from built output while entries exist. The empty-state render itself is not exercised in built output because both locales have published entries; temporarily drafting all entries of one locale exercises it.

## Checklists

### Adding an asset or diagram

- [ ] Source SVG: kebab-case name, aspect-matching viewBox, ink/bone art, 1px strokes, no raster/data URIs/text (except wordmark → OG only)
- [ ] `pnpm dlx svgo --config scripts/svgo.config.mjs --folder scripts/dither-src` passes
- [ ] `pnpm generate:dither` prints `PASS` for every row (dimensions + byte budget)
- [ ] Output committed in `public/assets/dither/` (or `brand/` for OG); path matches the table above
- [ ] Consumed via `DitherFigure` with absolute `/assets/...` path and intrinsic `width`/`height`
- [ ] Informative figure → localized `alt` + `caption`; decorative (hero/texture/diagram) → `alt=""` / `aria-hidden="true"`
- [ ] Diagram: 480×300 viewBox, grid anchors, one amber active state, no screenshots
- [ ] `pnpm check` and `pnpm build` both pass

### Accessibility & reduced motion

- [ ] Body text ≥4.5:1 (plomo-500 only for large mono labels, 3:1 rule)
- [ ] Texture/dither never under text
- [ ] No italics, no purple gradients, radius 0 maintained
- [ ] Canvas `aria-hidden` with adjacent explanatory localized text
- [ ] No-JS and reduced-motion states render static (PNG/SVG)
- [ ] Motion: opacity-only, 30 fps cap, DPR ≤2, pauses offscreen/hidden/pagehide, Astro navigation cleanup
- [ ] Focus-visible ring on interactive elements (toggle, CTAs); language toggle keeps `aria-current="page"`
- [ ] Landmarks present (`main#main`, header, footer, labeled navs); every `id` unique per page
- [ ] Exactly one h1 per page; heading order never skips a level (archives: h1 title → h2 rows)

---

**Version:** 1.0 — **Last updated:** 2026-08-05 — **Maintainer:** JoyanLabs
**Related skills:** [`design-taste-frontend`](../skills/design-taste-frontend/SKILL.md) (architecture rules), [`frontend-design`](../skills/frontend-design/SKILL.md) (design quality), [`documentation`](../skills/documentation/SKILL.md) (docs standards)
**Related docs:** [VIRTUAL-MODULE.md](./VIRTUAL-MODULE.md)
