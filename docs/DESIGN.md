# Joyan Design Manual

The single source of truth for the Joyan landing visual, copy, asset, diagram, motion, accessibility, and localization system. It is the contract that `pnpm check`, `pnpm generate:dither`, and code review enforce. If a component, asset, or copy line disagrees with this manual, the manual wins — fix the implementation.

**Audience:** designers and developers producing or reviewing landing surfaces, dither assets, MAGI diagrams, motion, or locale copy.

## Quick path

1. **Start from the tokens** — ink/bone/plomo/accent, radius `0`, no italics ([Tokens](#visual-tokens--contrast), [Typography](#typography)).
2. **Place dither by level** — L0 none, L1 shell texture, L2 section illustration, L3 hero/dedicated J1 surface ([Dither levels](#dither-levels-l0l3)).
3. **Add an asset** — OG: local `render-og.mjs` tone input + browser-free `pnpm generate:dither`; hero tone poster: local `render-poster.mjs`; visible J1 loop: local `render-dither-scene.mjs`. Verify dimensions and budgets, consume with intrinsic dimensions ([Asset contract](#asset-contract), [Generation workflow](#asset-generation-workflow), checklists below).
4. **Add copy** — mirror ES and EN keys exactly, warm cooperative voice, no prohibited patterns ([Copy & i18n rules](#copy--i18n-rules)).
5. **Verify** — `pnpm check` and `pnpm build` must pass before commit.

## Brand essence and voice

Joyan is a **people-centered cooperative that builds agents and connected systems for real-world operations** — never generic software, never an autonomous worker that runs itself. The organizing principle is `Human purpose → Data → Context → Intelligence → Action → Human outcome`: capture a reality, build context, apply intelligence within explicit limits, produce a result useful for people.

Two distinctions carry every page and must never collapse into each other:

| Concept | What it is | What it is **not** | Where it lives |
|---|---|---|---|
| **Agents** | Digital specialists for one concrete operational task, acting within agreed limits | Generic software; a replacement for a team | `hero`, `agents` |
| **MAGI** | The reusable intelligence layer agents are built on: context, tools, memory, explicit policies, graded autonomy, human review | An always-on autonomous worker; "the main agent" that never sleeps | `magi` |
| **Connected systems** | Deterministic recording of what physically happened — timestamp, precision, source — staying useful with imperfect connectivity | Buttons, knobs or voice controllers for agents; a device manufacturer claim | `hardware` (id kept; the section is reframed) |

Humans set goals, review important decisions and answer for every agent and system. A person is part of the responsibility architecture, not a fallback for when the AI failed.

**Naming guardrail:** the first vertical product is still in brand validation. Describe the problem it addresses; do **not** publish its name until branding clears it.

**Voice: warm, specific, people-centered.** Real people are behind every agent; decisions are human; nothing is overpromised.

**Two distinct offer layers — never conflate them:**

| Layer | What it is | Where it lives | Tone rule |
|---|---|---|---|
| **Cooperative model** | What Joyan builds: agents, MAGI, connected systems | `hero`, `agents`, `magi`, `hardware`, `ecosystem.items` | Present tense, concrete, no caveats |
| **Community offers** | Guides, content, training, and working-together invitations — explicitly **in development** | `ecosystem.community` (status/audiences/offers) and `hardware.prototypeInvitation` | Explain what agents can do, cannot do, and need human review; no dates, enrollment/forms, beta, or delivery promises |

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
- **ASCII drawings:** respect each piece's cell projection; the local font and host CSS are part of its render contract. Measure glyph advance after fonts load, not just the frame box. Donut expects approximately2:1 height/advance: canonical PRE line-height1.2 with this monospace font, `font-variant-ligatures: none`. Never alter donor geometry to compensate for stretched host cells; ligatures must not join drawing characters.

## Dither levels (L0–L3)

Pre-baked, deterministic, palette-limited ordered-dither art. Levels define **where** texture/illustration may appear:

| Level | Name | Placement | Notes |
|---|---|---|---|
| L0 | None | Nav, labels, body text, footer | No texture anywhere text lives |
| L1 | Subtle global texture | Static CSS/SVG shell texture in page gutters, **behind opaque surfaces** | Canvas-free; never under text; kept in `tailwind.css` + `PageLayout` |
| L2 | Section illustration | Pre-baked section films: Agents, MAGI, Connected systems, Ecosystem | `SectionFilm.astro`; MAGI also keeps `AgentNetworkDiagram.astro` + `MagiParticleCanvas.astro` |
| L3 | Focal illustration | Hero + dedicated post-hero J1 surface (WU12 extension) | F1 keeps `hero-dither` beneath it; `DitherScene` adds a separate visible loop, never a filter over F1 |

**Rules:**

- Texture/illustration must never overlap text; keep contrast ≥4.5:1 in any region that touches content.
- **Static/pre-baked preferred on the landing** — assets are committed PNGs and MP4s; the optional MAGI particle overlay remains its only canvas. The isolated [WU13 comparison lab](#wu13--runtime-comparison-trial) and its [WU14 scene gallery](#wu14--live-coloured-scene-gallery-2026-10-10) are explicit experimental exceptions, not production placement rules. No landing route loads runtime scene JavaScript.
- Idle motion is limited to the five argument films, the dedicated baked J1 scene, the MAGI overlay/SVG pulses, and the hero caret/scroll cue.
- Hero and shell texture are decorative (`alt=""` / `aria-hidden`); section figures are informative (localized `alt` + `caption`).

## Asset contract

Formats: independent **procedural tone scenes** `scripts/motion-src/scenes/{J1,OG1}.js` for hero and OG; the unchanged `scripts/dither-src/wordmark.svg` supplies the OG mask. Both outputs are lossless palette PNGs:

- **Hero:** `dither.js`'s token grey ramp (ink-950/900/800, plomo-500/400, bone-100/50), with the reserved amber ramp only at the scene's gate and its spill. Brightness compensation and fixed subpixel dot coverage derive intermediate colours from those ramps: the current WU9 poster has **38 colours**, not two (reduced-motion page guards pass in both locales). A binary threshold cannot carry the scene's tone; a halftone needs a ramp.
- **OG:** the same pure `dither.js` tone/amber ramps, cell16, **64 colours**. Amber belongs only to one gate; JOYAN mask pixels (alpha≥128) remain exact bone-50. Its generator remains browser-free.

| Source (repository-relative; wordmark in `scripts/dither-src/`) | Output (`public/assets/`) | Dimensions | Budget | Unit |
|---|---|---|---|---|
| `scripts/motion-src/scenes/J1.js`, t=7.8 s → `captureFrame`, cell 7 | `dither/hero-dither.png` (38-colour WU9 poster) | 1600×900 | 80 KiB (11,407 B measured) | V1 (L3) |
| `scripts/motion-src/scenes/OG1.js` → `scripts/dither-src/og-tone.png` + `wordmark.svg` | `brand/og-default.png` | 1200×628 | 100 KiB (6,571 B measured) | V1 (OG) |

**Pitch contract (WU5):** target **6–8 CSS px after presentation**, not a shared source-pixel constant. `cell = targetPitch × sourceWidth / displayedWidth`; for `object-cover`, use `scale = max(boxWidth/sourceWidth, boxHeight/sourceHeight)`, `displayedWidth = sourceWidth × scale`, and `pitch = cell × scale`. Use the painted box, not blindly the viewport.

For the 1600×900 poster, **cell 7** keeps all three requested viewport-cover pitches inside the range:

| Viewport / cover box | Cover arithmetic | Scale | Displayed width | Pitch (cell 7) |
|---|---|---|---|---|
| 390×844 | max(390/1600, 844/900) | 0.9378 | 1500.44 | 6.56 CSS px |
| 768×1024 | max(768/1600, 1024/900) | 1.1378 | 1820.44 | 7.96 CSS px |
| 1440×900 | max(1440/1600, 900/900) | 1.0000 | 1600.00 | 7.00 CSS px |

WU5 measured a taller **390×936** hero box at the mobile viewport: the poster's real scale there is `936/900 = 1.04`, pitch **7.28**, still in range. Cell 6 would fall below 6 at the requested mobile viewport-cover scale; cell 8 exceeds 8 on tablet. Do not copy the 1280-wide film's cell: it is not the same displayed pitch at 1600.

**Two baked posters, one OG output, five argument films in two encodes each, plus one H.264 J1 loop.** The four section dither textures were removed. Sections 01, 02, 03 and 04 now ship **section films** through `src/components/joyan/SectionFilm.astro`, with localized `shows`/`means` text and the shared hero poster. The only inline SVG diagram is `src/components/joyan/AgentNetworkDiagram.astro` (480×300), used by MAGI alongside `MagiParticleCanvas.astro` and its section film.

`hero-dither.png` remains the **hero poster** — the static layer under the film, shown under reduced motion and while the video is unavailable. Video autoplay does not require JavaScript. `og-default.png` is the **separate brand output**, compositing unchanged `wordmark.svg` over the static OG1 tone halftone; it is only used for social/OpenGraph sharing. `motion/` holds the separate [five films](#hero-film--motion-film) and is deliberately the heaviest thing on the site; that asymmetry is the cost of the format, stated rather than hidden.

**Type inside the MAGI SVG diagram is sized in viewBox units, not CSS pixels.** Its viewBox is 480×300; the current `MAGI` label uses `text-sm`. Judge legibility at the actual rendered size, not from the SVG font size alone.

**Naming rules:** kebab-case source SVG names in `scripts/dither-src/`; kebab-case PNG names in `public/assets/dither/`; the OG lives separately at `brand/og-default.png`. The hero source is the named J1 scene, not `hero-network.svg`. Consuming paths are **absolute** `/assets/...` with **intrinsic dimensions** (`width`/`height` attributes on the poster `<img>` in `MotionFigure`) to reserve layout and avoid CLS.

## Asset generation workflow

```bash
# 1. Optimize every source SVG (also the MAGI diagram)
pnpm dlx svgo --config scripts/svgo.config.mjs --folder scripts/dither-src

# 2. Build OG1 tone locally when its scene changes; commit the tone PNG too
node scripts/motion-src/render-og.mjs
# Browser-free final OG writer (exits 1 when over budget)
pnpm generate:dither

# 3. Build the tone poster locally with the isolated browser toolchain
MOTION_TOOLCHAIN=~/.cache/joyan-motion node scripts/motion-src/render-poster.mjs
```

**The poster builder is deliberately absent from `package.json` and CI:** Playwright is not a repository dependency. It seeks J1 at 7.8 s (the quiet support beat, with the waiting gate visible), uses the films' real `captureFrame` resize/dither path at 1600×900, then losslessly encodes a palette PNG. It asserts pixel identity after encoding and the 80 KiB budget before writing. `pnpm check` runs the browser-free OG generator, so the hero must never re-enter its output path: that would silently overwrite this poster. Verify the poster's sha256 stays identical across `pnpm check`; the OG must remain byte-identical too.

### WU9 framing — reduced-motion GREEN (2026-10-09)

**Containment is not recognition.** A larger horizontal pair now occupies the
space above the kicker: the proportional ring/block is centered at `(885,80), r58`;
the sole amber gate at `(1085,80), half32, glow32 + flare8`. Original shading ramps,
beat sheet and loop remain; the slab stays background. `Hero.astro` now opens a
localized elliptical scrim field **only under reduced motion**. An additive opaque
mask floor restores the original directional scrim before the copy (140 CSS px,
160 at the 640–1023 px breakpoint). The normal F1 styling/position is unchanged.

Fresh `pnpm build` output is served directly, including its poster, which must be
byte-identical to `public/`. No asset interception is used. Chromium checks ES/EN
at 390×844, 768×1024 and 1440×900, with JS both enabled and disabled: **12 passes**.
The image remains `cover`, `50% 50%`, opacity1, natural1600×900; video is `display:none`.

| Page / viewport | Painted box | Visible poster x window |
|---|---|---|
| ES / 390×844 | 390×936.4375 | 612.588–987.412 |
| EN / 390×844 | 390×844 | 592.062–1007.938 |
| ES and EN / 768×1024 | 768×1024 | 462.5–1137.5 |
| ES and EN / 1440×900 | 1440×900 | 80–1520 |

**Proof correction:** half-cell padding and the old 7.167 px gap were insufficient.
The checker now captures opaque native subject envelopes through the production
resize boundary, rounds every touched cell outward, and adds one guard cell for
filter/AA tails. `dither.js` writes only within its sampled cell, not merely within
half a cell of the original shape. Current toolchain bounds (exclusive right/bottom)
are ring `x679–798/y7–126`, full glow `x861–952/y21–112`: **63 poster px separation**,
well above cell7. All fit cover/viewport and avoid header, kicker, H1, lead, CTA and
note rectangles. These measured stencil bounds are not a guarantee for arbitrary
scenes/browsers; two stills at7.8/9.2s are not animation-wide halftone evidence.

Post-scrim guards retain ≥4 pixels at ≥24/255 lift for each rim/block/diamond,
and additionally require four visible ring quadrants, annulus/hollow and block/hollow
mean separation, and minimum CSS dimensions (ring80, diamond40, block16 px).
Desktop peaks are now **122.144 / 206.064 / 194.086**, rather than22 /28.928 /15.197.
Six actual viewport screenshots and the native closeup were inspected for shapes,
not just brightness. All twelve all-bone stress controls preserve protected content
pixels exactly against an identically composited, fully opaque mask reference.
Clipping, overlap, insufficient spacing, ink-only/muted subjects and transparent
scrim controls are rejected. Locator screenshot scrolling is explicitly undone
before controls; old false failures and RED evidence remain preserved.

```bash
node scripts/motion-src/check-poster-framing.mjs --out dist-motion-verify/wu9/final-green --require-page-clear
```

Evidence stays local outside `package.json`/CI: `dist-motion-verify/wu9/final-green/`
contains `framing.json`, six `{es,en}-{390,768,1440}.png` viewport images and their
`-no-js.png` counterparts (six byte-identical pairs), plus hero crops/controls.
`check-normal.mjs after` matches six no-preference F1 CSS/attribute snapshots and
all five emitted JS chunks to the saved baseline: **109,818 B gzip, zero JS delta**.
The 11,407 B poster sha256 is
`b9c1ad1b6bb68ba8dc813fb329e0e25b67fbf393d4ad5e8c3aa2ad9d9041ec18`;
poster and OG hashes remain identical across the final `pnpm check` (0 errors,
0 warnings,26 hints; ESLint PASS; iteration-2 309/0, iteration-3 469/0).

Fresh `animation-aperture-final/` contains450 native1920×1080 **blur1, non-halftone**
frames: determinism PASS; oracle accepted, carry0.83/CV0.66/stillness69.3%, zero
empty/out-of-frame/haze or seam cell delta; first/last PNGs byte-identical. No fresh
encoded or full delivery-halftone seam proof is claimed. Production film binaries
are untouched. **No-JS alone does not imply a static poster:** native video autoplay
needs no JS. No-preference loading/codec fallback retains the original F1 scrim;
its poster recognition is not covered by this reduced-motion aperture or GREEN.

**OG tone authoring and generation (`scripts/generate-dither.mjs`):**

1. Author OG1 at1200×628, independently of J1: recessed ring/block and one amber gate above JOYAN, broad neutral bevel below; no added copy, stock art or UI mockups.
2. Local `render-og.mjs` uses `captureFrame`, dither:false, t=0; repeat/alternate seek and fresh-page PNGs must match. Commit lossless `og-tone.png` (60,861 B); no browser enters build/CI.
3. Sharp decodes RGBA; pure DOM-free `ditherImageData`, cell16, paints tone halftone. Overlay the unchanged sharp/librsvg wordmark mask: alpha≥128→bone-50, otherwise retain dots.
4. Encode losslessly (`palette:true`, colours256, quality100, dither0); assert decoded RGB equality. Never normalize, resample dots or quantize away amber.

Native,600×314 and400×209 Chromium previews were inspected. Cell16 gives8px/5.33px pitch; the400px screen is denser, but wordmark and gate remain distinct. Rows208–415 are ink outside48,187 exact mask pixels: no subject/texture interference. Raster amber bounds are x402–477/y67–156 (inclusive),2,636 pixels;89.20% ink ground. Palette checks cannot prove spatial reservation. The negative budget test permanently compares OG hashes before/after regeneration. Wordmark rasterization retains the existing fontconfig/librsvg portability caveat; no font or brand change is claimed. Output palette checks do not validate future tone-input chroma or opacity: dithering can hide off-brand source colors. An independent in-memory probe mapped red/teal/purple to compliant greys/ink; yellow-to-amber is structural evidence only. No current-asset defect was found; review source art whenever it changes.

**Deterministic budget checks:** the script prints `PASS|FAIL <name>: <bytes> / <budget>` for every output, verifies exact pixel dimensions, and exits `1` when any asset exceeds its budget. A merged asset must print `PASS` for all rows. Generation must be rerun whenever the committed tone input or wordmark changes, and the PNGs are committed — never generated at build time.

### WU12 — visible normal-mode J1 surface (2026-10-10)

`Hero.astro` mounts `DitherScene.astro` immediately **after**, not inside, `#top`.
Visit `/#dither-scene` or `/en#dither-scene`. The decorative div has no copy,
script, controls or sixth figure. It reuses the `.joyan-film` reduced-motion class;
its separate `data-dither-film` marker keeps the old section-only density tool's
`data-hero-film` inventory unchanged. F1, its scrim and all five argument films remain.
This is original locally baked art inspired by halftone/ASCII scenes. At the WU12
boundary, `ascii.rest` was not installed; WU13 subsequently installs it only for
the separate lab. No glyph library runs on either landing.

The local `render-dither-scene.mjs` reuses unchanged J1 time functions and the
production `captureFrame` dot pass. It reframes the band's existing surfaces and
magnifies/repositions the original ring/block and gate into its hollow **before**
dithering. Shared J1, composition, renderer and dither helpers are untouched.
450 fresh frames (382 unique PNGs) contain changes in every one-second interval.

| Delivery | Measured contract |
|---|---|
| `motion/harness-tones-dither.mp4` | H.264,960×540,30fps,15s,450frames;286,342 B ≤300KiB; blur1,cell8,CRF41 |
| `dither/scene-dither.png` | Accurate support beat7.8s;960×540,37 colors,6,735 B ≤80KiB; lossless capture pixels |
| Displayed boxes / pitch | 390×420 /6.22px;768×432 /6.4px;960×540 at1440 /8px |

Mobile center-cover deliberately crops the **outer band**, not the complete
ring/block/gate. The native pair centers are344/644,y270; ring radius87, gate
half48 and peak glow60. Conservative envelopes add two delivery cells for filter
and touched-cell tails; mobile bounds stay inside390px with ~8px minimum margin.
No scrim, text or CTA overlays the new surface; only24px padding per vertical side is added.

CRF34 produced505,228 B and was rejected. CRF40 seam/budget attempts also failed;
final encoding pins boundary keyframes/zone QP20 at0/449. A second fresh450-frame bake after geometry extraction reproduced both delivery
hashes exactly. Source first/last PNGs are byte-identical; decoded boundary MAE0.815/255,max26 (not pixel-identical).
Decoded support-vs-start MAE13.23/255 confirms changing artwork, not a fake CSS loop.
MP4 sha256 `c3f2f55d4817edcc28c59ad7d7c8b6921bc84c3edc97380b39a993a6f7cf3f88`;
poster sha256 `bfcdde62c70550c39eca8b5dbdda56e52eb55a646e6b8444259eca6780293668`.
Lossy video does not retain exact PNG palette entries.

`check-dither-scene.mjs --red` failed on the old live page in all12 contexts.
The normal checker now passes ES/EN×390/768/1440×normal/reduced, with errors0,
recognizable dots/ring/block/gate, full semantic envelopes, clear copy/CTA and
12 rejected hidden-art controls. Native readyState4,~1.26s unforced advancement,
and14.6s→~0.60s wrap were observed before test-only still capture at7.8s.
Reduced motion hides video via CSS and exposes the poster. **No-JS alone does
not force a still:** mobile Chromium autoplay advanced~1.21s; reduced/no-JS was
hidden/paused at0. CSS visibility is the guarantee, not cross-browser pause policy.

Evidence: `dist-motion-verify/wu12/{red,green,render,preservation}.json`, logs,
`{es,en}-{390,768,1440}-{no-preference,reduce}.png`, `-full.png`, and `-hero.png`.
Full-page captures visit existing reveal sections first. Viewport images and
placement were inspected, not inferred from rectangles alone. All450 source
bitmaps pass palette, cell-corner and spatial amber guards. Public/dist/live
assets match;31 protected paths including ten encodes/hero/OG/deps remain identical.
WU9 regression passes12 contexts with text delta0; normal F1 six snapshots and
five JS chunks remain identical (109,818 B gzip). `pnpm check`:345/0 +486/0;
Astro0errors/0warnings/26hints; build13pages. No new client JS/dependencies.

Limits: Chromium at these three widths, not Firefox/Safari or universal perception,
loading/codec/power-save or LCP/CLS proof. Existing390px document overflow remains
488px ES/442px EN in both modes, delta0; no global overflow mask or unrelated fix.
The native J1 oracle's focal coordinates do not describe this local reframe;
its historical acceptance is not this delivery's motion/seam proof. Parent owns
ODD reconciliation, commit and eventual main integration.

```bash
node scripts/motion-src/render-dither-scene.mjs
pnpm build
node scripts/motion-src/check-dither-scene.mjs
# --encode-only reuses this fresh local frame set, never the historical spike
```

## WU13 — runtime comparison trial

**Status: isolated experiment; rollout pending human testing.** Visit
`/lab/ascii` (English technical artifact labels, self-canonical, `noindex,nofollow`),
not the main navigation. It keeps the unchanged `DitherScene` J1 video beside real
`ascii.rest@0.4.0` text and canvas output. Package provenance: bas3line,
[official source](https://github.com/bas3line/ascii), MIT, ESM, optional React peer.
The exact dependency and lock entry are authorized for this trial; no framework
island, hosted catalogue, new font or production branding is added. The install
also normalized existing Vue peer metadata without upgrading locked versions;
the installer's workspace-policy addition was removed by the parent.

### Placement decision matrix

| Surface / purpose | Preferred delivery | Fallback / constraint | Decision |
|---|---|---|---|
| Controlled brand narrative: F1, argument films, J1 | Baked video + accurate PNG | Native autoplay can run without JS; reduced CSS reveals poster | Retain current delivery |
| Poster, OG, social or printable asset | Static baked composition | Deterministic framing/palette, no browser loop | Retain; runtime cannot replace social output |
| Purposeful generative accent or art inspection beside content | Selected local runtime piece | SSR description with no JS; real still frame under reduced motion | Candidate only; human placement test pending |
| Interface accent representing actual state | Bounded runtime only if useful | Accessible real state must also be ordinary text; never invented live statistics | Not implemented or approved by this trial |
| Copy background, tiny illegible illustration, repeated idle decoration | Neither runtime nor competing baked motion | Keep content surfaces L0 and preserve contrast | Do not apply |

Brand amber still means a gate/live state. The canvas's red/blue **vendor Java
mark** is explicitly experimental, not a product endorsement, a new Joyan token
or an accepted logo placement. Vendor landscape palettes are not brand standards.
Meaningful art needs adjacent explanation, not texture behind the text surface.

### Observed runtime and delivery contract

- Actual imports: `mount` from `ascii.rest`; default + named `meta` imports from
  `ascii.rest/pieces/donut` and `ascii.rest/pieces/java`. No by-name `load`, adapter,
  registry or 217-piece chunk fan-out. Direct package frame tests verify repeatable
  stills, changing text and changing palette indices; browser tests verify PRE
  content and real red/blue canvas pixels, not just element presence.
- Default **12 fps**; observed **12 PRE updates/s** at all three widths, within
  the 13-updates/s test tolerance. The package handles viewport/hidden/reduced gates; the scoped
  controller adds keyboard Pause/Play and preference-change stills. This lab uses
  native full-document navigation with `pagehide` cleanup and load/`pageshow`
  initialization, **not ClientRouter transitions**. Existing controller router
  hooks remain unused here; the controller itself was not changed. Pause holds
  the current frame; Play **restarts** the timeline (the API returns stop, not seek).
  Reduced-motion Play is disabled; no motion override is passed to the library.
- SSR/no-JS uses clear text descriptions with disabled controls, not a blank
  canvas or a fake animation. Reduced/JS draws actual static package frames. The
  native J1 video pauses/hides in reduced/JS; no-JS native autoplay was observed
  advancing and is not described as paused.
- Chromium **390/768/1440 × normal/reduced/no-JS: nine contexts** pass. Lab document
  width equals each viewport; no global overflow mask. Donut has exactly40×22
  characters, 12–16px type, canonical **line-height1.2** (14.4/19.2px) and the
  loaded local JetBrains Mono font, with **ligatures disabled**. Actual Range
  measurements give7px advance /2.057:1 cells at390 and10px /1.92:1 at768/1440,
  within the5% projection tolerance. The former line-height2 gave3.43/3.2:1 and
  failed acceptance; donor frames/geometry remain unchanged. Canvas42×28
  fits358×477px mobile /420×560px desktop. Its independent atlas actually
  uses the package's system `ui-monospace` stack, not the canvas's computed body
  font. Selected ASCII glyphs were visually inspected; broader Unicode/box-glyph
  coverage is **not** established. Library canvas sizing writes vendor inline
  style attributes; no authored inline styles or third-party fonts were added.
- Keyboard Enter/Space, frozen/resumed frames, real offscreen scrolling, changed
  reduced preference and bounded RAF counts are checked. Native return/back
  navigation proves document replacement and **zero active RAFs at pagehide**
  after leaving with an active loop; both package pieces advance again after
  returning. This Chromium run has `persisted:false`, not BFCache-restoration
  proof. Unload evidence uses synchronous test-only session storage: console
  messages can be lost when the old execution context is destroyed.
  Hidden-document events are simulated; this is
  listener evidence, not an OS-tab scheduling/power-use measurement. Network
  interception records only same-origin requests; no external module/font/CDN
  fetch, console/page error or HTTP error occurs on the lab.
- **Full budget correction:** the former PageLayout lab shipped five executable
  inline blocks:405+5516+3728+1443+959 B gzip, plus the109,818 B asset set.
  Full total **121,869 B**, delta29,964 B: **7,436 B over** the cap. The former
  113,546/887-headroom claim omitted shared bootstrap/router scripts and was
  invalid as full acceptance; independent evidence and preimages remain intact.
  The lab now uses minimal HTML, server-only metadata/favicon components and
  existing local Tailwind/font CSS, without the shared browser bootstrap/router.
  Recursive generated JS remains **109,818 B**, all five original files
  byte-identical; **ALL executable lab inline** is now exactly one module,
  **3,728 B**, with no excluded blocks. Correct full total **113,546 B**, delta
  **21,641 B** against unchanged91,905 B baseline, **887 B margin** under the
  114,433 B total cap. Every script block is reported separately, regardless of
  marker or purpose; sourced JS is not double-counted. Synthetic controls prove
  unrelated executable/module scripts contribute, data attributes cannot filter
  scripts out, JSON/import maps do not execute, and one byte over the cap fails.
  Earlier coast/namespace-import failure remains historical; default/named leaf
  imports and the compact colored cup avoid registry/shared-helper expansion.
- Protected source/asset hashes, public/dist/live film/poster/OG bytes and six
  ES/EN normal F1 DOM/style/metadata snapshots are checked separately. Seven old
  route HTTP/metadata probes pass; old mobile overflow stays488pxES/442pxEN.
  `pnpm check` passes
  Astro0errors/0warnings/26hints, ESLint, iteration-2 **345/0**, iteration-3 **486/0**;
  build emits14pages, preserving the original13. No old guard or baseline is reset.

Correction evidence: `dist-motion-verify/wu13/correction/`: meaningful two-blocker
`red.json`/`bundle-red.json`, strict per-block `bundle.json`, `green.json` (frames,
network, glyph ratios, native lifecycle), package-frame tests and
`{390,768,1440}-{normal,reduce,no-js}.png` plus per-piece/baked captures. Original
root RED/before/GREEN/bundles/images remain untouched and are also snapshotted in
`correction/preimage/`; the independent report remains in `wu13/independent/`.
Corrected desktop/mobile normal and reduced glyph images were inspected. No
measured CPU, LCP, CLS, memory, universal CSP, Firefox/Safari or rollout claim.

```bash
pnpm build
node scripts/check-ascii-runtime.mjs --bundle-only
node scripts/check-ascii-runtime.mjs
pnpm check
```

### WU14 — live coloured scene gallery (2026-10-10)

**Status: isolated lab experiment; the landing still ships zero runtime scene
JavaScript.** User decision: what the review liked are the library's coloured
`scenes` pieces — dot art (ramp `" ·•●"`), **not** ASCII glyphs — delivered live
in the noindex laboratory, with the lab JavaScript allowance explicitly enlarged
by that decision. `/lab/ascii` keeps the unchanged baked J1, the donut and the
cup, and adds a six-scene gallery.

| Family | What it draws | Measured bundled cost | Decision |
|---|---|---|---|
| `scenes` (six selected) | 200 × 100 cells, `cell: 1` (square), dots only, fixed 30–46 colour palette, ordered Bayer dither + palette compensation, 15 fps source replayed at 12 fps | per module (gzip level 9 of each raw package file) 5,318 + 7,223 + 7,317 + 7,631 + 7,724 + 7,863 = **43,076 B**; bundled into the lab entry: one chunk **25,239 B gzip**, **0 B** executable inline (the former 3,728 B inline module is now that chunk) | Delivered live in the lab |
| `looks` (one example, e.g. `sea()`) | character art in a different ramp; `dither: false` by default for every look but `sweep` | method-dependent, so never quoted as "the" closure: whole recipes barrel bundled minified (vite/esbuild, gzip level 6) **324,343 B raw / 98,814 B gzip**; tree-shaken to one `sea()` **143,960 B raw / 44,252 B gzip**; unminified static-import closure of the recipes barrel (17 files, gzip level 9) **727,066 B raw / 216,897 B gzip**; whole `dist/kit` source tree (21 files, gzip level 6) **997,443 B raw / 305,984 B gzip**. One real `sea()` example measured **+44,134 B gzip** over the gallery (limit: scene-only + 12,288 B) | **Omitted:** the cost did not fit. The package also exports no `ascii.rest/kit/recipes/looks` leaf, so the only legal specifier is the recipes barrel |
| Any remote catalogue, CDN module or downloaded font | — | 0 B | Not used; every module is a local focused leaf import |

- **Imports (actual):** `mount` plus default+named leaf imports from exactly six
  `ascii.rest/pieces/<scene>` modules, beside the existing `donut` and `java`
  leaves. No `ascii.rest/pieces` barrel, no by-name `load`/`names` registry, no
  whole-kit fan-out, no `ascii.rest/kit` import. **Namespace imports were measured
  and rejected:** `import * as` pulled the bundler's shared namespace helper into
  a new shared chunk, which changed the byte-frozen landing `client` chunk
  (60,302 → 60,308 B gzip) and added a `rolldown-runtime` chunk; default+named
  leaves restore byte identity.
- **Budget (measured, not estimated).** Landing allowance unchanged: the five
  original chunks are **byte-identical** and sum to **109,818 B gzip**
  (`client.BxDIQlYz.js` 60,302 + `client.kF-MUc6b.js` 27,057 + two 406 B
  `index.astro` chunks + `viewport.BHcnJOoz.js` 21,647). The lab allowance is a
  measured number with a documented margin: lab chunk **25,239 B gzip** + 0 B
  inline = **25,239 B**, cap **27,648 B**, margin **2,409 B** (rule: cap − measured
  total must stay within 0…4,096 B). The pre-measurement cap prior was 47,172 B
  (the six scene modules at gzip level 9 = 43,076 B plus the 4,096 B maximum
  margin); the measured build came in below it, so the cap was **tightened**, not
  raised. Generated client JS is counted by a **recursive `dist/**/*.js` walk**
  (a nested generated chunk that no page references fails the frozen landing set
  instead of passing silently): **135,057 B gzip** = landing 109,818 B + lab
  25,239 B, delta **43,152 B** over the 91,905 B baseline, which supersedes the
  22 KiB lab-delta allowance for `/lab/ascii` by the explicit user decision.
  **Executable inline scripts are a separate, pre-existing and unbudgeted
  figure, reported with no limit:** 114,589 B gzip in 64 blocks across 13 of 14
  generated pages site-wide, 20,972 B on the two landing routes, 0 B on the lab
  page. Only the lab page's inline participates in the lab cap; no inline figure
  enters the 22,528 B contract.
- **Landing identity and lab attribution in the site-wide guard.**
  `scripts/check-iteration-3.mjs` section 7 freezes the five landing files by
  recorded sha256 and pins their delta to the exact 17,913 B against the
  untouched 91,905 B fixture (limit 22,528 B unchanged). A file is lab-attributed
  only when `/lab/ascii` is its single referencing page; a missing lab page or a
  file shared with a real page fails closed as a leak, and a file in both sets
  fails as a double count. The measured lab cap constant (27,648 B) is declared
  in both checkers and each names the other. The baseline fixture is untouched;
  no reset and no "unlimited" lab exists in either checker.
- **Measured load (laboratory only, not a landing budget).** Independent
  verification measured, headless Chromium on this host with no CPU throttling and
  all six canvases visible at once: steady-state RAF cadence **47.2 fps** (p50
  16.7 ms, p95 33.4, p99 50, none above 50 ms at 1440; p99 50 at 390), 4 long
  tasks totalling **213 ms** (max 56 ms) at 1440 and 208 ms (max 55 ms) at 390,
  load phase to all-ready ≈**1.29 s** with 6 long tasks totalling 2,980 ms (max
  1,480 ms), and **≈12.2 fps per piece**. A control with the lab chunk blocked ran
  at **60.0 fps with 0 long tasks**. A bounded writer re-run reproduced 47.2 fps,
  12.2 fps per piece and the 60.0 fps / 0-long-task control. These are
  measurements of one headless browser on one host: they are **not** generalisable,
  and CPU, LCP, CLS, Firefox/Safari, mobile, OS background scheduling and BFCache
  stay unmeasured. The design-system rule they support: six live 200 × 100 dot
  canvases are a **laboratory-scale load, not a landing budget** — a real landing
  surface would need far fewer live pieces or a static frame.
- **Invariants that are documented truthfully.** Each caption states the package's
  own `meta.name` and `meta.note` plus `cols × rows`, square cells, the dot ramp
  and the 12 fps ceiling, all server-rendered (never drawn by script). Node-side
  package checks prove every one of the six frames uses **only** `" ·•●"`,
  `category: scenes`, 200 × 100, `cell: 1` and an advancing frame; the browser
  checks read real canvas pixels: 8+ distinct colour buckets, a fully painted
  ground, a 2:1 frame box, distinct per-scene fingerprints and a frame that
  actually changes over time (measured **41 distinct frames in 3.34 s ≈ 12.3 fps**
  for `ocean-sunset` at a 20 Hz poll resolution, consistent with the 12 fps
  ceiling; under load the played rate can be lower).
- **Behaviour and accessibility.** One controller mounts both families; the scenes
  are decorative canvases (`aria-hidden`) with an adjacent human-readable caption
  and a real keyboard-operable Pause/Play button each. The controller keeps the
  accepted WU13 contract: no `motion: true` override, so the library itself draws
  the static frame under `prefers-reduced-motion`; offscreen and hidden-document
  playback stops; Play restarts the package timeline (the API returns stop, not
  seek); pagehide/`astro:before-swap` cancel every loop with no duplicate rAF or
  listeners (bounded ≤ 8 live loops for 8 hosts, zero at pagehide). No authored
  inline style was added; the vendor canvas writes its own sizing attributes.
- **Fallbacks.** No-JS shows the descriptive caption and fallback text per scene
  with disabled controls — never a blank canvas or a fake animation. Reduced
  motion with JS draws the package's real static dot frame. The native baked J1
  behaviour is unchanged (pauses/hides under reduced motion; native autoplay may
  continue without JS).
- **Not measured (no claim):** CPU, LCP, CLS and memory cost of six simultaneous
  20,000-cell canvases; Firefox and Safari; OS-level background scheduling and
  BFCache restoration; glyph coverage beyond the package's own system
  `ui-monospace` atlas; and any rollout, branding or performance acceptance.
  Vendor palettes and art stay demo-only, never Joyan tokens.

WU14 evidence: `dist-motion-verify/wu14/` — preserved `red.log`/`red.json`/`before.json`
(10 recorded failures before implementation), `bundle.json`, `scene-frames.json`,
`package-frames.json`, `smoke.json`, the isolated `looks` cost probe, and
`captures/` with 390/768/1440 × normal/reduce/no-JS plus per-scene images. The
WU13 tree stays untouched and is read as input only. Method notes are kept in
Spanish in `dist-motion-verify/wu14/EVIDENCE.md`.

```bash
pnpm build
node scripts/check-ascii-runtime.mjs --red      # preserved RED before implementing
node scripts/check-ascii-runtime.mjs            # GREEN: 0 failures, 9 contexts
pnpm check
```

## WU15 — our own dot-scene engine and the side-by-side comparison

**Status: isolated laboratory comparison; the landing still ships zero scene or
runtime JavaScript, and no landing page imports the engine.** The user decision
behind this unit: the landing's visual language should be this dot-scene
language, built by us, with the library's predefined scenes as the reference.
`/lab/ascii` therefore shows three panes on the same 200 × 100 grid and at the
same size — the library's `night-coast` live, our own coastal night live, and our
own coastal night baked — without touching the verified baked J1, the donut, the
cup or the six-scene gallery.

| Piece | What it is | Measured cost |
|---|---|---|
| Engine + scene + runtime | Our own code (`scripts/scene-src/engine.mjs`, `scenes/joyan-night-coast.mjs`, `src/lib/scene-runtime.ts`): square cells, dot ramp `· •●` only, ordered 4×4 Bayer dither over a **measured** coverage curve, one indexed palette per scene, our own 32-bit mix and two-axis wrapping lattice noise, per-cell palette compensation | **8,821 B raw / 4,274 B gzip** as one executable inline module on the lab page. The project's configured 16 KiB inline limit keeps it inline rather than in a separate chunk; the lab accounting counts it in `lab.inlineGzip` |
| Baked still | The engine's poster frame (frame 30, t = 2.5 s) written by Node — no browser, no canvas — and shipped byte-identical through the component's asset import | **9,554 B**, sha256 `144d9fe24640f0c6eb7e047beddd95070e83181c021f394bf23b1bb5cce9cf8a`, 800 × 400 |
| Baked loop (pipeline output, not shipped on any page) | 120 frames at 12 fps (10 s), 800 × 400, H.264 CRF 32 through the local ffmpeg | **70,483 B**, sha256 `a139813cbeaf35edac7d9425d9c833de7f85b530b3110935cfd364dfa2aa9151`; two consecutive encodes produced the identical hash (byte-deterministic on this host/toolchain), 2.6 s per encode |
| Library bundle | All eight library mounts on the page (two pieces, six gallery scenes, this pane) | **25,256 B gzip** in one chunk — the panes share it, so it is not a per-pane number |

- **One engine, two outputs, proven equal.** The Node raster path and the live
  canvas call the same `renderFrame()` + `rasterize()` and, for the same frame
  index, must hash identically. `scripts/check-scene-engine.mjs` reads the frame
  the runtime reports on the host (`data-scene-frame`), SHA-256s the canvas
  pixels and requires them to equal the SHA-256 of the Node raster of that exact
  frame: observed **`9554c122dad5695476adaca798f5552129c69ba178c691a1ea354e07633d8a56`**
  for frame 0 from both paths (re-measured after the correction pass changed the
  noise and closed the loop). The baked PNG decodes to the same bytes as the
  engine's poster-frame raster (pixel sha256
  `d634a9a9716c92e949dcc25dca35cdb3e9cfd694fd1a4bc4d0a438de7582916b`), so the
  baked and live surfaces are one piece of art, not two lookalikes. This is the
  honesty condition for the planned hybrid hero (baked by default, live on
  interaction).
- **What the checks require of the art, not just of the DOM.** Ramp exactly
  `" ·•●"` with no ASCII glyph art (the runtime draws no text at all — the source
  is checked for `fillText`/`ctx.font`); `cell: 1` square cells; the authored
  coverage curve `[0, 0.24, 0.5, 0.79]` must match the dot area the raster mask
  actually paints (measured `[0, 0.2344, 0.4844, 0.8125]` at the delivery cell);
  the tone ladder is derived from that measured coverage, so a level on a rung
  renders exactly that step and a midpoint splits the 4×4 Bayer block 8/8; every
  palette index is in bounds and every drawn pixel is a ground→palette blend
  (no colour outside the scene's indexed palette can appear); and repeat runs of
  the same frame are identical.
- **The loop closes by construction, and it is measured on the field.** The
  earlier version looked closed only because `renderFrame(cycleFrames)` *is*
  `renderFrame(0)` through the modulo — an assertion that could not fail. The
  scene's two animated lattice offsets (cloud drift and water chop) now travel a
  **whole number of noise wraps** over the loop, and every sine uses a period that
  divides it, so `field(x, y, 0)` and `field(x, y, 30)` sample the same lattice.
  Measured on the field, per channel, over all 60,000 channels: seam **max
  2.83e-15 / mean 8.58e-17** against an adjacent-frame baseline of **max 0.0988 /
  mean 0.00599**, with the animation seam (frame 359 → frame 0) at max 0.0938 /
  mean 0.00567 — i.e. smoother than an ordinary step. At the rendered level the
  seam changes **1,345 cells** against **1,453** for an adjacent pair. Before the
  fix the same measurement read max 0.378 / mean 0.0181 (a visible pop every
  30 s).
- **Runtime contract (measured, not asserted).** 12 fps ceiling with the frame
  index published as `data-scene-frame` (observed **18 frame updates in 1.5 s**);
  pauses offscreen and in hidden tabs (live RAFs **2 → 0** on both, resuming to
  the same count, so no duplicate loop); `prefers-reduced-motion: reduce` paints
  the scene's poster frame once and starts no loop; `pagehide` cancels every loop
  (recorded **0** active RAFs in the pagehide handler); no external request at any
  of the nine browser contexts; decorative canvases are `aria-hidden` with a real
  server-rendered caption beside them; the component stays under 200 lines with
  no `any` and no authored inline style. Under reduced motion both the engine's
  control and the library pane's control read **"Motion off …"**, not a Play that
  cannot work, and the checker fails if either says Play while disabled.
- **Licence and provenance boundary, stated in three groups.** (1) *Published
  standard material, used as published:* the canonical 4×4 ordered-dither matrix
  (Bayer, 1973), the Rec.709 luma coefficients (ITU-R BT.709) for both the tone
  model and the chroma term of the palette selection, and the quintic fade plus
  bilinear blending in the lattice noise (Perlin, 2002). None of it is ours and
  none of it came from the reference library. (2) *Ideas learned from
  `ascii.rest@0.4.0` (MIT, bas3line) and reimplemented without copying code:* a
  dot ramp as a tone ladder with an ordered dither, per-cell colour compensation
  for how much ink a dot lays down, deterministic integer hash noise, and a
  per-scene indexed palette with a declared ground. (3) *Ours:* `mix32` (our
  constants, lane order and shift schedule — a rotate-multiply mix in the
  published MurmurHash3/SplitMix family, **not** that family's or the library's
  constants); `latticeNoise`/`layeredNoise` (a two-axis wrapping lattice with a
  per-octave seed stride and nested-lerp blending, deliberately not the library's
  one-period `noise(x, y, period)` shape); the coverage ladder derived from our
  measured mask; the rendered-tone error minimisation that chooses the palette
  entry; the dot masks, the scene, the palette, the bake path and every check.
  An earlier draft of this entry claimed the noise was simply "ours" while
  sharing the library's constant set and structure — that claim was wrong and is
  corrected here. `scripts/check-scene-engine.mjs` now fails if any of the
  library's mixing constants or an `ascii.rest` import reappears in the engine.
  What we did **not** take: its scene catalogue (weight), its scene colours as our
  art, its artwork, or any vendored file. The installed package keeps its own MIT
  `LICENSE`; the lab keeps the bas3line/MIT attribution and the source link.
- **Budget (measured, not estimated).** Landing invariant intact: the five
  original chunks are byte-identical and sum to **109,818 B gzip**, and no route
  other than `/lab/ascii` carries the markup or reaches the module. The lab
  allowance is a measured number with a documented margin: lab chunk 25,256 B +
  executable inline 4,274 B = **29,530 B gzip**, cap **31,578 B**, margin
  **2,048 B** (rule: cap − measured must stay within 0…4,096 B; WU14 measured
  25,239 B, the first WU15 pass 29,154 B, the
  correction's first cut 29,513 B). `scripts/check-iteration-3.mjs` section 7 now measures the lab's
  executable set as chunk **plus** its inline module — required because the
  project's 16 KiB inline limit puts this unit's code inline rather than in a new
  chunk — and the landing set stays chunk-only. The lab copy itself states the
  measured numbers, and both checkers fail if the copy and the bundle disagree.
- **Not measured (no claim):** the tone model is a display-space luma, not
  colorimetric linear light, and the engine has no colour management; the dot mask
  is supersampled, not analytically anti-aliased; CPU cost, frame time, LCP and CLS
  of the live pane were not measured, and no cross-engine fidelity or perceptual
  comparison with the library was performed; Firefox/Safari, OS background
  scheduling and BFCache restoration are unmeasured; the MP4 is a pipeline output
  and is not shipped on any page; and no landing rollout, hero change or branding
  adoption is authorised by this unit.

WU15 evidence: `dist-motion-verify/wu15/` — `red.json`/`red.log` and
`lab-red/` (preserved RED before implementation: engine, runtime, component,
comparison surface and baked still all missing), `green.json`,
`scene-engine-green.json`, `lab/green.log`, `lab/bundle.json`, and `captures/`
with 390/768/1440 × normal/reduce comparison sections plus full-page images. The
independent verifier's own scripts and numbers are preserved untouched in
`dist-motion-verify/wu15/independent/`, and the correction pass writes only to
`dist-motion-verify/wu15/correction/` (its RED: 11 failures — the loop did not
close, the engine reused the library's mixing constants and claimed otherwise,
and the reduced-motion control still said Play). The WU13 and WU14 trees are
read-only inputs and were not rewritten: the lab checker was re-run with
`--out dist-motion-verify/wu15/lab` and, for the correction, with
`--out dist-motion-verify/wu15/correction/lab`.

```bash
node scripts/scene-src/bake.mjs              # PNG from the engine, Node only
node scripts/scene-src/bake.mjs --mp4        # + the deterministic 10 s loop
pnpm build
node scripts/check-scene-engine.mjs          # engine/art/periodicity/equality + browser
node scripts/check-ascii-runtime.mjs --out dist-motion-verify/wu15/correction/lab
pnpm check
```

## WU16 — round dots, an adoption ledger and large-size evidence

**Status: same isolated laboratory; the landing still ships zero scene or runtime
JavaScript and no landing page imports the engine.** The user's report after
seeing the WU15 comparison: our scene is right, but *it draws squares where the
library draws dots, and the dots look better*; they also asked what this actually
is and how it looks much larger, and explicitly authorized **taking the library's
code and improving it**, not only its ideas.

- **Root cause, measured, not assumed** (`dist-motion-verify/wu16/investigation/`).
  The WU15 mask *was* a supersampled disc, but at the shipped 4 px per cell the
  raster is what a viewer sees, and it degenerated: the smallest step came out a
  hard **2 × 2 square** (four pixels at 0.9375 and nothing else — two distinct
  coverages, no anti-aliasing anywhere), and the largest step put **12 of its 16
  pixels at 0.938+** with corner pixels at 0.375, i.e. a block whose measured
  coverage 0.8125 equals a **square of side 0.9014** — the hypothesis's exact
  "0.81 becomes a square of side 0.9". The 4 × 4 supersample also over-covered
  the disc: 0.8125 where a disc is 0.7854, and the ladder drifted with the raster
  (0.2422 / 0.5117 / 0.7930 at 8 px per cell against 0.2344 / 0.4844 / 0.8125 at
  4). Display made it worse: the pane shipped an 800 × 400 canvas displayed at
  307 × 154 CSS px (≈1.54 device px per cell) with `image-rendering: pixelated`,
  i.e. nearest-neighbour, while the library sizes its own canvas to that box and
  lets the browser resample its font glyphs. Measured on this host, the library's
  `·`/`•`/`●` mark 0.125 / 0.25 / 0.8125 touched pixels at 4 px per cell, 0.0625 / 0.2188 /
  0.5313 at 8, 0.0625 / 0.1563 / 0.4961 at 16 and 0.5 / 0.5 / 1.0 at its real
  ≈1.5 px pitch — so its ladder is font- and size-dependent. **Refuted as
  stated, confirmed in effect:** the mask was not an area-matched square, but at
  the shipped cell size it read as one, and the delivered pixel pitch could not
  carry a round rim.
- **The fix.** `discMask` now returns the **exact analytic area** of the disc
  inside each pixel (`quadrantArea` / `discAreaIn`; verified against the closed
  forms: a radius-2 disc in a 4 px cell covers its corner pixel 0.31515 and its
  edge pixel 0.91315), and each step's radius is **derived** from the measured
  coverage ladder by bisection: `COVERAGE [0, 0.2344, 0.4844, 0.8125]` →
  `DOT_RADIUS [0, 0.2731, 0.3927, 0.5103]` in cell units, so the largest dot is
  the inscribed disc (0.5) plus the 2 % the measured ladder asks for, never a
  block. The ladder is now held at **exactly** the measured values at 4, 8 and 16
  px per cell, and every pixel agrees with an independent 32 × 32-sampled disc
  reference to within **0.004 of a cell** (before: worst pixel 0.0156–0.2422).
  `DELIVERY_CELL` went 4 → **8** (1600 × 800) because below that the smallest dot
  is a hard block, the checker now fails if it drops below 8, and our canvas is
  no longer rescaled with nearest-neighbour pixelation. The WU15 behaviour is
  preserved as negative controls in the checker: an area-matched square of the
  same coverage and the WU15 2 × 2 block are both rejected by the same two
  predicates.
- **Node/canvas equality survived the change.** The runtime and the Node bake
  path still call the same `renderFrame` + `rasterize`; frame 0 hashes
  **`34a76821c2d5c8098df81ca4044cc2484cb6a6ca91d4e04fa38db5ee06a3725e`** in both,
  and the baked PNG decodes to the poster-frame raster
  (`2808ffc730c273c700b1dc85d56e6dc76a24583e44009e3e110049dc14c5f3fe`). Reduced
  motion, offscreen/hidden pause (live RAFs 2 → 0, resuming to the same count),
  `pagehide` cleanup (0 RAFs) and zero external requests all still pass at all
  seven browser contexts, and the landing keeps five byte-identical chunks
  (**109,818 B gzip**).
- **Licence boundary: an adoption ledger, not a prohibition.** The user
  authorized taking library code, so the "its constants must never appear" guard
  became `scripts/scene-src/adoption-ledger.json`: one entry — the **cell-sprite
  atlas**, adapted from `ascii.rest/dist/mount.js` (glyphs drawn once into an
  atlas and copied per cell), with the notice retained verbatim in
  `scripts/scene-src/ascii.rest-LICENSE` (MIT, © 2026 bas3line). What we improved
  beyond the original: the key is our ramp step and palette ink rather than a
  glyph and a colour (no font, no slot eviction, bounded by the palette), and the
  same atlas feeds the Node bake and the live canvas, so an optimised blit cannot
  make them disagree — measured **9.5 ms** per 200 × 100 frame at 8 px per cell
  against **12.2 ms** for a per-pixel blend, byte-identical output, and the
  checker asserts that equality. The ledger is asserted in **both directions**
  (a listed entry must exist in the code; library-derived material in the code
  must be listed, with a synthetic unlisted constant proving the scan can fail).
  Deliberately **not** adopted: the library's font glyphs as our dots, its scene
  catalogue, its artwork and its colours as ours.
- **Large sizes** (`dist-motion-verify/wu16/sizes/`, Chromium only, one host, one
  process, same-origin blank page, idle control shows 0 long tasks). Paint of a
  200 × 100 frame at 8 px per cell is **19.6 ms** with **0 long tasks** in a 2.5 s
  loop at 12 fps at 1280/1920/2560/3840; the resample ratio (backing px per
  displayed px) is 1.25× at 1280, 0.83× at 1920, 0.63× at 2560 and **0.42× at
  3840**, where the crop is visibly soft. The 320 × 160 grid costs **~51 ms** per
  frame (every frame a >50 ms long task, ~61 % of the 12 fps budget) and drops the
  thinnest dot to 2.2 display px at 1280. **Recommendation: a hero uses 200 × 100
  cells and picks the delivery cell so the backing store is near the display
  width — cell 8 for 1280–1920 px, cell 12 at 2560 (0.94× ≈ 1:1, 24–25 ms), cell
  16 at 3840 (0.83×, ~31 ms); or cap the pane near 2200–2600 CSS px instead of
  stretching it to 3840.** Raising the grid density is the wrong lever.
- **Budget re-measured, not raised silently.** The engine module grew from 4,274
  to **4,623 B gzip** (9,663 B raw) as an executable inline module; the library
  chunk is unchanged at 25,256 B gzip, so the lab total is **29,879 B gzip** with
  the same documented **2,048 B** margin, cap **31,927 B** (rule: cap − measured
  within 0…4,096 B). The baked still is now **41,906 B** at 1600 × 800
  (`5c2f8f3d…`), the pipeline MP4 **219,412 B** (`655f45bb…`); both checkers and
  the lab copy carry the same numbers and fail if they drift. `pnpm build` builds
  14 pages and `node scripts/check-scene-engine.mjs` reports GREEN with 0
  failures.
- **Not measured (no claim):** frame time is Chromium-only on one host and is not
  a general performance claim; CPU, LCP and CLS are still unmeasured, as are
  Firefox/Safari, OS background scheduling and BFCache; the largest step's
  measured ladder (0.8125) means adjacent dots touch in the brightest areas —
  that is the artwork's own tone, not squareness, and the corner pixels stay
  dark; and no landing rollout, hero change or branding adoption is authorized by
  this unit. One more limit worth stating plainly: the laboratory pane is ~307
  CSS px wide, i.e. ≈1.54 device px per cell on a 200-cell grid, and at that
  pitch **no** dot renderer reads as round — the library's glyphs smear at the
  same pitch. What changed there is the path (nearest-neighbour pixelation of an
  800 × 400 raster became a smooth downscale of a 1600 × 800 one); the dots
  themselves read as dots from about 3 display px per cell, i.e. from a pane
  about 600 CSS px wide at cell 8 (200 cells × 3 px).

## WU17 — shape, ramp and dither study, and a test surface

**Status: laboratory only. The landing still ships zero scene or runtime
JavaScript, no landing page imports the engine, and the landing's five chunks are
byte-identical at 109,818 B gzip (delta 17,913 against the untouched 91,905 B
fixture, limit 22,528 B).** The user's decision after WU16: round dots look a
little nicer, *but squares also look good and there may be other shapes*. They
asked for that to be investigated properly, for a way to **test every option**,
and explicitly not to be limited to dots. The aesthetic call is theirs; this unit
makes the options comparable and states where each one breaks down.

- **A real catalog, not one favourite.** Eleven masks: `disc`, `square`,
  `rounded`, `diamond`, `triangle`, `hexagon`, `ring`, `cross`, `hatch`, `grain`
  (coverage only, no shape) and `glyph` (a bitmap footprint, drawn through the
  adopted atlas path). Each one's size is **solved**, not guessed: a 160-step scan
  (the ring's coverage is not monotone — its hole grows) followed by 30
  bisections finds the smallest size whose area inside a cell reaches that
  ladder rung, and `maskDerivation()` states in words what is solved for each
  mask. Solved sizes per step, in cell units (WU22 ladder; the WU19-era values
  were disc 0.2732/0.3927/0.5103 and are superseded):
  disc 0.2421/0.3480/0.4507 (top rung 0.5000, the inscribed disc), square
  0.2145/0.3084/0.3994, rounded 0.2172/0.3123/0.4045, diamond
  0.3034/0.4361/0.5746, triangle 0.3034/0.4361/0.6492, hexagon 0.2662/0.3826/0.4956,
  ring 0.2538/0.3648/0.4724, cross 0.2634/0.3786/0.4903, hatch (line duty)
  0.1841/0.3804/0.6381, glyph ≈0.8862 (its own bitmap carries the ladder, scaled
  to the inscribed-disc rung), grain = the coverage itself (there is no shape to
  size).
- **Coverage is an exact area, never a sample count** — polygon clipping for the
  polygonal masks, closed-form circle/rectangle areas for the disc and the ring,
  closed quarter-disc areas for the rounded square, rectangle intersections for
  the cross and the glyph, clipped diagonal bands for the hatch. Two consequences,
  both measured rather than asserted: the ladder holds **at every pitch** (0.0000
  deviation from the WU22 ladder 0.1841/0.3804/0.6381/0.7854 at 8, 4 and 2 px per
  cell, tolerance 0.001)
  because the per-pixel areas sum to the shape's own area, and the mask is
  bit-identical in Node and in the browser without any sampling. A sampled mask
  cannot do that: at 4 px a symmetric square can only reach 0.4727 or 0.5166 of a
  cell, never the 0.4844 the ladder asks for.
- **The geometry each name claims is proven by an independent metric**
  (`scripts/check-shape-study.mjs`, 32 px per cell, computed in the checker): a
  square is **exactly separable** as row × column (error 0.000) while the disc
  scores 1.000; the disc keeps only **0.8 %** of its mass outside the inscribed
  disc at the WU22 top rung against the square's 8.7 %; the ring's centre pixel is 0.00 with its edge
  at 1.00 (a hole); the triangle's mass below/above the centre is **2.20** (it is
  asymmetric); hatch ink is measurably constant along one diagonal but NOT exactly
  (diagonal invariance **0.9875** at 32 px per cell, 0.9378 at 16 and 0.9960 at 64:
  the metric counts neighbouring pixel pairs with the same coverage, so a stripe
  edge inside a cell breaks it — only a stricter inked-run test reaches 1.000);
  grain shows no symmetry at all (transpose 0.67, rotation 0.63) and a binary
  fraction of 1.00. The rounded square's bounding-box fill is **0.9666** at 32 px
  per cell (0.9618 at step 1), and the hexagon is **pointy-top** — a vertex up and
  one down, which is the orientation its six vertices encode. Headline versions of
  the square/disc/ring/triangle
  proofs also live in `scripts/check-scene-engine.mjs`, and
  `check-shape-study.mjs` re-measures every number above and fails if the docs stop
  matching it, so the older guard cannot pass a mask that is not the shape it
  claims to be and the docs cannot go stale.
- **Ramp, dither and cell geometry, measured.** The ramps are the solved shape
  ladder, hard pixel blocks (`block`) and the glyph table; the dithers are ordered
  Bayer 4 × 4 (16 thresholds) and 8 × 8 (64), a **blue-noise** 16 × 16 tile built
  by void-and-cluster with an **integer tent kernel** (no `exp`, so Node and the
  browser cannot drift; 189 distinct thresholds) and `none` (rounds at 0.5); the
  cell geometries are 1:1 and 1:2. Tone resolution is the four-rung ladder plus
  whatever the dither can spend between rungs, so `bayer8` and the blue tile
  resolve finer means where `none` resolves none. The hard `block` ramp does
  **not** hold the ladder — every pixel snaps to 0 or 1, so its cell means are
  0.2500 / **0.5625** / 0.9375 at 8 px per cell and 0.25 / 0.25 / 1.00 at 4 px
  against the 0.2344 / 0.4844 / 0.8125 it aims at. The 15/64 footprint belongs to
  the **glyph** ramp, whose three bitmaps are 15, 31 and 52 of 64 cells and which
  therefore does hold the ladder at 8, 4 and 2 px per cell.
- **Where the shapes stop reading** (measured as distinct pixel coverages in rung
  1): at **8 px per cell** every mask offers 3–13 distinct coverages and no shape
  collapses; at **4 px** the square and the rounded square fall to two levels and
  the glyph becomes a pixel block; at **2 px** every mask falls to 1–2 levels and
  no shape reads at all. What matters for judging is the pitch on SCREEN, not in
  the backing store: the overview board shows 200 cells across a pane of roughly
  230 CSS px at a 1440 viewport, i.e. **1.15 CSS px per cell**, where only the
  textures read, and the view panes about 1.5. That is why the study page also has
  a **1:1 pixel-scale row**: the same frame on 50 × 25 cells at 8 px per cell,
  shown at 160 px, i.e. **about 3.2 CSS px per cell**, which is where the eleven
  shapes can actually be compared at 1×. WU16 fixed `DELIVERY_CELL = 8` for the
  real scene for the same reason.
- **Node/canvas equality survived every option** — the differentiator of this
  engine. 38 hash comparisons pass: all eleven shapes × `bayer4`/`none` at 4 px
  per cell on the fixed board, all eleven at the 1:2 cell geometry, `bayer8` and
  blue noise, and the 8 px view panes. The baked still is still the engine's own
  poster frame: `5c2f8f3d…`, **41,906 B** at 1600 × 800, decoding to the poster
  raster `2808ffc7…`, unchanged by WU17 because the default options resolve to the
  WU16 disc on 1:1 cells with Bayer 4 × 4.
- **Cost per option** (`dist-motion-verify/wu17/study/` and
  `dist-motion-verify/wu17/independent/shape-study/`, **Chromium only, one host,
  20 iterations**, masks already solved and cached, so this is the per-frame path
  and not the one-time solve): the eleven shapes land at **19.2–19.5 ms** median
  in one run and **19.5–19.9 ms** in a second, a spread of 0.3 ms inside a run and
  a 0.3–0.4 ms shift between runs, so **no shape is claimed to be cheaper than
  another**. The mask choice is effectively free because the sprite atlas builds
  one finished cell per (mask, step, ink) and copies it. Among the dithers, `none`
  is the only one that is cheapest in **both** runs (18.8 / 19.1 ms, no dither to
  evaluate); the order of `bayer4` (19.4 / 19.6), `bayer8` (19.9 / 19.5) and
  `blue` (19.4 / 19.8) **flips between runs**, so it is not claimed. The **1:2
  cell geometry costs 1.39×** (27.1 ms in both runs) because it doubles the
  delivered pixels. These are comparable samples, not a general performance claim.
- **A test surface the user can drive:** `/lab/shapes` (noindex), with shape,
  ramp, dither, cell geometry, grid density and palette switchable live, the
  measured ladder and solved sizes printed beside the panes, the same frame shown
  at three delivered pitches, and a **fixed board** that draws all eleven shapes
  at once so options can be compared without clicking — plus the **1:1 pixel-scale
  row** (50 × 25 cells at 8 px per cell, shown at 160 px, ≈3.2 CSS px per cell)
  without which the overview at ≈1.1 CSS px per cell is only a texture overview.
  The study loads as a **still** at the poster frame (the page, this document and
  the runtime all say so, and the checker asserts it in normal motion): Play
  animates the three view panes only, the board stays the reference, and Pause
  stops them again. `/lab/ascii` keeps every existing section and links to it.
- **Budget and the guard extension, re-measured rather than assumed.** The engine,
  the catalog and the runtime are now **one chunk shared by both laboratory
  routes** (23,366 B raw / **9,508 B gzip**) instead of an inline module on one
  page; the lab's executable total is **34,876 B gzip** (library 25,256 + engine
  9,508 + two 56 B entry chunks, 0 B inline) with the same documented **2,048 B**
  margin, cap **36,924 B**. Section 7 of `scripts/check-iteration-3.mjs` no longer
  attributes a chunk to a single `lab/ascii` page: a chunk is lab when **every**
  page that can reach it (transitively, following module imports) is a `/lab/**`
  page, landing when no lab page reaches it, and a **leak** when both do. Every
  previous negative control still fails as intended — a lab chunk reachable from a
  real page, a chunk reached from a lab page and a real page, a chunk reached by
  no page (landing, so the frozen five-chunk set is unchanged) and no lab page at
  all (fail closed) — plus new controls for the shared-between-two-lab-pages and
  nested `/lab/**` cases. `scripts/check-ascii-runtime.mjs` follows: the lab
  runtime markup/chunk may exist only on `/lab/**` pages, the engine's own chunk
  is identified by content (the scene id plus the study marker) and must still
  measure 23,366/9,508 B, and the lab inline accounting now sums over every lab
  page.
- **Not measured (no claim).** The aesthetic ranking is not measured at all — the
  laboratory exists so the user can decide, and nothing here authorizes a hero or
  scene change. The per-shape cost is Chromium-only, one host, 20 iterations, with
  masks already cached. "Where a shape stops reading" is a count of distinct pixel
  coverages, not a user study. The masks' shade-and-paper recommendations
  (squares read as pixel/retro, discs as halftone/photographic) are stated as what
  the geometry does, not as a verdict. CPU, LCP, CLS, Firefox, Safari, OS
  background scheduling and BFCache remain unmeasured.

```bash
node scripts/scene-src/bake.mjs              # PNG from the engine, Node only
node scripts/scene-src/bake.mjs --mp4        # + the deterministic 10 s loop
pnpm build
node scripts/check-scene-engine.mjs          # dot geometry, catalog, ledger, equality, browser
node scripts/check-shape-study.mjs           # WU17: catalog, ladder, geometry, equality, cost
node scripts/check-ascii-runtime.mjs --out dist-motion-verify/wu17/lab
pnpm check
```

## WU18 — image → dot-scene pipeline and animated overlays

**Status: laboratory only. The landing still ships zero scene or runtime
JavaScript, no landing page imports the engine or the pipeline, and the landing's
five chunks are byte-identical at 109,818 B gzip (delta 17,913 against the
untouched 91,905 B fixture, limit 22,528 B).** The user asked *how an image
becomes this style*, finding our authored scene simpler than the library's, and
supplied a test input — a Blade Runner unicorn line-art SVG gist — asking for it
converted with animated details (twinkling stars on black, or aurora colours).
Video is explicitly deferred. This unit answers with a pipeline, four composable
overlays, a third laboratory route, and an honest comparison that does not argue
with the user's impression.

- **The pipeline is seven steps, and it reuses the engine rather than cloning
  it.** Decode (SVG through the local `sharp`/librsvg at 1024 px longest side,
  PNG and JPEG raw, straight alpha; a network URL is refused before decoding); fit
  (contain + margin, `scale = min((1−2m)·cols/W, (1−2m)·rows/H)`, centred, aspect
  exact by algebra); measure (per cell, area-weighted `α·(1−luma)` in `ink` mode
  for line art, `1−luma` of the composited cell in `luminance` mode for
  photographs, with a representative colour kept per cell); map (the measurement
  becomes field luma and `engine.stepFor()` walks the **measured** coverage
  ladder with the chosen dither — no second ladder); colour (a named
  `IMAGE_PALETTES` entry with the ground declared at index 0, or a deterministic
  median-cut extraction); emit (a scene object `renderFrame`/`rasterize` accept
  live and in the bake); serialise (`serializeScene`/`sceneFromSerialized` carry
  the quantised measurement so the canvas draws **the same conversion**). The CLI
  documents every flag (`--in --mode --color --palette --palette-count --cols
  --rows --margin --dither --shape --cell --density --overlays --out --png`);
  `from-image.mjs` is Node-only, `image-pipeline.mjs` is browser-safe (no `sharp`
  import), and nothing in either duplicates `engine.mjs`/`shapes.mjs`.
- **The fixture numbers, measured at three grid densities** (fixture decodes to
  **1024**×1024). WU18 measured 713 inked cells (0.0357), max 0.68281, histogram
  19452/490/58/0, raster sha256 `da63f9e9…`, 13,962 B PNG. **WU19 re-measured with
  the pitch-matched prefilter and auto-gain on by default:** fitted scale
  0.08984375 with the art drawn **92×92 cells inside a 4 % margin** on the
  200×100 grid; **1180** inked cells of 20,000 (fraction **0.0590**), mean level
  0.00949, max 0.44081 (pre-gain measurement), **gain 2.944 recorded**, step
  histogram 18827/554/370/175/**74**, raster sha256 `125557ea…`, 22,637 B PNG. At
  100×50: 368 inked, 0.0736, gain 3.500, sha `5454fa09…`, 5,929 B. At 50×25: 86
  inked, 0.0688, gain 3.500, sha `009cb8c2…`, 1,823 B. The
  serialised scene rasters to **the same sha256 as the live one** (round trip),
  the PNG decodes to the identical measurement, and JPEG opens at the same size
  with the same measurement inside 0.01. The two modes are different instruments:
  `ink` measures mean level 0.00949 / palette 7, `luminance` 0.4232 / palette 2.
  Median-cut extraction on this near-monochrome line art yields only **4**
  entries (`#060607`…`#0b0b0c`) — a real limit of the subject, which is why a
  named palette exists.
- **The overlays are periodic by construction, and periodicity is measured on
  the field, not the frame index.** Sinusoidal terms divide the loop (twinkle 6 s
  of 30 s, five whole cycles) and every lattice drift travels a whole number of
  wraps (aurora 9 in x and 5 in y, grain 21 in y, glimmer 1 sweep), added to the
  coordinate before `layeredNoise` multiplies by its frequency so each octave's
  scaled wrap lands exactly. Measured seam `t=0` vs `t=30 s` (max / mean) against
  an ordinary adjacent step: stars 3.39e−15 / 5.05e−17 vs 0.0390 / 0.00089;
  aurora 5.61e−15 / 1.63e−16 vs 0.1088 / 0.00649; grain 1.34e−15 / 6.33e−17 vs
  0.0265 / 0.00261; glimmer 0 / 0 vs 0.0184 / 0.00111. Rendered cells changing at
  the seam vs at an adjacent pair: 84/88, 458/512, 66/84, 99/404 — the seam is
  never worse. Every overlay changes the base scene and repeats identically;
  composition order is fixed by the catalogue. (WU19 re-measured the seam table
  with the tuned aurora and an exhaustive adjacent-pair baseline; see the WU19
  section below.) Two honest notes: the aurora
  overlay needs a **chromatic palette** — with `--palette ink` its colours
  approximate to greys and the CLI PNG is monochrome
  (`dist-motion-verify/wu18/cli/image-scene[stars+aurora]-8px-density1.png`),
  while `--palette aurora` renders green/blue/violet
  (`…/unicorn-aurora[stars+aurora]-8px-density1.png`) — and at 200×100 the WU18
  aurora read as **large dither blocks** (~33 cells per blob at `scaleX = 0.06`), not a
  fine curtain. WU19 tuned it; the before/after numbers are in the WU19 section
  below and in `docs/AUDITORIA-ESCENAS.md`.
- **The laboratory (`/lab/image`, noindex) converts with our own drawings.**
  `joyan-mark` and `test-target` are authored in
  `scripts/scene-src/local-inputs.mjs`; the page converts them in its frontmatter
  with the same `convert()` the CLI runs, embeds the serialised scene as JSON
  data, and offers `input`, `treatment` (plain, stars on black, aurora colours,
  grain, glimmer, all) and `density` (1/2/4), a still by default with Play to
  animate. All six treatments hash **identically** between the Node raster and the
  live canvas (measured in `scripts/check-image-pipeline.mjs`), and the three
  laboratory routes link to each other. The image route adds markup and data, not
  a second engine: as data the two conversions are 34,983 B of JSON, not executable
  JS.
- **Licence, stated plainly.** The gist art is a **film prop design** and is a
  third-party work: it is used locally only, under the gitignored
  `dist-motion-verify/wu18/input/`, never committed, never copied into `public/`,
  never shipped. The checker fails if the fixture's name or source appears in any
  generated page or in `public/`. If the user confirms they hold the rights, a
  later unit may add it as a third laboratory input.
- **The honest comparison, with numbers.** At the same 200×100 grid and displayed
  size, the converted unicorn reads **sparser** than the library's
  scenes, and this unit recorded it rather than defending the motor: the library's
  `night-coast` declares a **30**-entry palette (20 used at frame 0) and uses all
  its ramp steps (2540 / 10311 / 6739 / 410 cells), while the converted WU18
  unicorn had 7 entries, used only **three** of four steps, never the full dot
  (19452 / 490 / 58 / **0**), and left 96.8 % of adjacent cell pairs flat
  (`flatRunFraction` 0.9682) where the library leaves 51.7 % flat. The cause is mainly the subject — a thin line drawing
  covers 3.57 % of the cells where a landscape fills the frame — but the result
  at the same grid was thinner, and that is what the WU19 audit round measured and
  partly closed: with the prefilter and auto-gain the same drawing covers 5.90 %
  of cells, gains 2.944, uses all five steps (18827 / 554 / 370 / 175 / 74) and
  leaves 94.4 % flat. The full prioritised audit is `docs/AUDITORIA-ESCENAS.md`.
- **Budget, re-measured rather than assumed.** The engine chunk is now 33,296 B
  raw / **12,787 B gzip** shared by the three laboratory routes; the laboratory's
  executable total is **38,211 B gzip** (library 25,256 + engine 12,787 + three
  56 B entry chunks, 0 B inline), capped at **40,259 B** (measured + 2,048 B,
  margin rule ≤ 4,096 B), asserted identically in `check-iteration-3.mjs` and
  `check-ascii-runtime.mjs`, with the laboratory copy updated to the same
  numbers. The landing five chunks are untouched. (WU19 re-measured: engine chunk
  33,856 B raw / 12,997 B gzip, lab total 38,421 B gzip, cap 40,469 B — see the
  WU19 section.)

```bash
node scripts/scene-src/from-image.mjs --in input.svg --mode ink --palette ink --png --out out
node scripts/check-image-pipeline.mjs            # WU18: pipeline, overlays, equality, browser
node scripts/check-scene-engine.mjs              # dot geometry, catalog, ledger, equality, /lab/image guard
node scripts/check-shape-study.mjs               # WU17 catalog + the three-lab cross-links
node scripts/check-ascii-runtime.mjs --out dist-motion-verify/wu18/lab
pnpm check
```

## WU19 — measured audit and improvement round

The user praised the stars-and-aurora treatment, was confused that the unicorn
never appeared on the laboratory page (licence decision: the gist art is a local
fixture only), and flagged that **our calibration-target drawing converts badly**
— a fine diagonal hatch aliased into a dominant dither block. The round produced
a measured audit (`docs/AUDITORIA-ESCENAS.md`, Spanish), four engine-level fixes
and re-measured everything they touch:

- **Anti-moiré prefilter** (`image-pipeline.mjs`, `prefilterRgba`, on by default;
  `--prefilter none` reproduces the WU18 measurement path byte for byte — the
  measurement matches; the raster does not, because this round's fifth ladder rung
  also changes the output): a Gaussian matched to the
  cell pitch (σ = 0.75 × pitch, three box passes, premultiplied alpha) applied
  **before** per-cell measurement. The calibration target's hatch region tone
  coefficient of variation falls **0.8145 → 0.3519** with the region's mean kept
  (0.3190 → 0.3177); a smooth-gradient control is untouched (identical mean and
  monotonicity). Honest cost: strokes narrower than a cell soften (the mark's ink
  p90 drops to 0.6009 ungained); auto-gain claws much of that back for sparse art.
- **Auto-gain** (`AUTO_GAIN_RULE`, on by default; `--auto-gain none` disables):
  `gain = clamp(0.75 / p90, 1, 3.5)` over inked cells, recorded in
  `scene.params.gain` and in the serialisation. The unicorn fixture moves from p90
  0.395 / histogram 19452/490/58/**0** to gain 2.944 and 18827/554/370/175/**74**;
  full-range input stays at gain 1, and our dark sparse mark takes a mild gain of
  1.248 because the prefilter softens its ink p90 to 0.6009.
- **Deeper default palette**: extraction now asks for **16** entries
  (`DEFAULT_EXTRACT_COUNT`); on a smooth gradient that yields 15 real entries and
  cuts the mean per-cell tone error **0.0174 → 0.0078** against 8 requested.
- **Fifth ladder rung at full coverage** (WU19), **recapped to the inscribed disc
  in WU22**: WU19's rung at coverage 1.0 was the circumscribed circle — its
  clipped disc IS the cell, so saturated highlights read as squares (the user saw
  exactly that). WU22 caps the ladder at the inscribed disc: `COVERAGE = [0,
  0.1841, 0.3804, 0.6381, 0.7854]` (the WU19 interior rungs rescaled by π/4),
  radii re-derived to `[0, 0.2421, 0.3480, 0.4507, 0.5000]`. The honest
  consequence, stated plainly: **highlights now top out at the inscribed disc** —
  the brightest cell is a full round dot, never a full square (the checkers
  require the top rung's corner mass to equal a disc's). The shipped default
  scene changed again: the same 63 poster cells now paint the inscribed disc, so
  the bake was re-rendered — PNG 43,235 → **35,270 B** (`6ae11f51…`), poster
  raster `bd1c708d…` → **`e6844efc…`**, MP4 re-encoded (**323,910 B**,
  `d11398bb…`), and the mark fallback `coming-hero.png` re-baked (38,615 →
  **31,561 B**, `a0ae3011…`). Checker assertions were updated to the NEW measured
  ladder, never the old one. The normalized tone ladder is unchanged (it is
  relative to the largest dot).
- **Tone cap for dense line art (WU22)**: auto-gain lifts the whole tone range,
  so the unicorn's dense overlapping-line core saturated (65 of 663 inked core
  cells at the top rung — the "white dotted blob"). A per-image soft-knee cap
  (knee 0.6 → ceiling 0.86 on the gained level; below-knee tones untouched;
  `toneCap: 'none'` reproduces the uncapped conversion) brings the core's
  top-rung cells to **34** (−47.7 %) while the inked p90 stays at **0.667**, so
  sparse areas keep their lift. Before/after crops:
  `dist-motion-verify/wu22/white-core/`.
- **Sweep family and page palette (WU22)**: `glimmer` is tuned (softer band,
  subject-preserving) and joined by `wash` (a wide colour wash crossing the
  scene, its hue travelling between two adapted aurora colours) and `shimmer`
  (a narrow sparkled band) — all periodic by construction with field-level seam
  assertions. Measured over the unicorn: wash covers 28.67 % of cells above a
  0.12 tone shift with the gentlest maximum (0.176) and the best subject
  preservation (subject/ground 0.679), so **wash** is the page's sweep. The page
  palette `joyan-page` (12 entries) is built from the site tokens — ink-950
  ground `#0b0b0c`, bone-50 ink `#f4f2ed`, amber accent `#ffb000`, the adapted
  aurora greens/violets and one combining accent (rose `#ff5d73`) — swappable in
  one place (`PAGE_PALETTE_ID`).
- **Aurora tuned** (finer octaves, finer lattice, blend 0.92 → 0.55,
  subject-preserving blending): on our mark at 200×100 the tinted wash falls
  **28.33 % → 9.30 %** of the grid, the largest connected blob **1193 → 117
  cells**, and the subject's local contrast retention rises **0.8562 → 0.9650**.
  Periodicity stays exact by construction (field seam 4.36e−15; rendered seam 192
  cells vs an exhaustive adjacent-pair maximum of 198).
- **Laboratory copy refreshed**: the licence note beside the inputs states the
  gist art was a local fixture only, the exact CLI conversion command is shown,
  and the quality statement names the prefilter, the auto-gain and the aliasing
  defect with its numbers. All three laboratory routes stay linked, still by
  default, with Play, reduced-motion and cleanup behaviour unchanged.
- **Budget re-measured**: engine chunk 33,856 B raw / **12,997 B gzip**; lab
  executable total **38,421 B gzip**, cap **40,469 B** (measured + 2,048 B,
  margin ≤ 4,096 B), asserted identically in both budget checkers. The landing
  five chunks remain byte-identical at 109,818 B gzip (delta 17,913 against the
  untouched 91,905 B fixture).
- **The audit document** is the prioritised record: every finding with its
  number, evidence file, P1/P2/P3 priority and fixed-this-round status, plus what
  remains (deeper authored palettes, photographic dither default, presentation
  pitch per width) feeding the single-page unit.

```bash
node scripts/check-audit.mjs                     # WU19: audit claims re-measured against the doc
node scripts/scene-src/bake.mjs --scene joyan-night-coast --cell 8 --mp4 --frames 360 --crf 41
```

## MAGI SVG diagram guide

The static diagram (`AgentNetworkDiagram.astro`) follows one strict grid:

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

The optional MAGI particle overlay (`src/components/joyan/MagiParticleCanvas.astro` + `src/lib/magi-network.ts`) runs over the static diagram. Five argument videos loop: the L3 hero film and four section films (see [Film contract](#hero-film--motion-film)); WU12 adds the separate decorative J1 loop above. SVG edge pulses, the caret and the hero scroll cue also loop; below-hero reveals are one-shot progressive enhancements.

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
| No JS | PNG/SVG remain; no canvas overlay or JS reveals. The native videos and CSS animations can still run. |

**Performance proof:** before implementation, run `pnpm build && node scripts/check-iteration-3.mjs --capture-baseline .artifacts/iteration-2-client-js.json`. For a candidate, run `pnpm build && node scripts/check-iteration-3.mjs --baseline .artifacts/iteration-2-client-js.json`. The checker gzip-sums every emitted `dist/_astro/*.js` client chunk and requires a delta of **≤22 KiB (22528 bytes)**. `pnpm build` verifies static structure and emitted assets; intrinsic dimensions, static hero markup, and transform/opacity-only below-hero motion are CLS/LCP safeguards, not metric measurements. Measure CLS/LCP later in a browser or CI performance run.

No additional landing idle motion beyond the argument films, dedicated J1 scene, MAGI overlay/SVG pulses and hero caret/scroll cue. The separately authorized WU13 lab trial does not extend that production allowance.

## Hero film (motion film)

### The legend — one shape, one meaning

A viewer has to read these films without a caption. That only works if the same shape means the same thing everywhere, so `lib.js` owns the vocabulary and no film may invent its own. Before the legend the same concepts were drawn at four sizes — the agent was r=64 in one film, r=58 in another, r=74 in a third — and nothing carried over.

| Glyph | Means |
|---|---|
| Ring with a block inside | something that works |
| Small rect in a band | one piece that makes it work |
| **Amber diamond** | a gate: it stops and waits for a person |
| Solid line that stays | evidence, what was recorded |
| Same line, dashed | no longer current |

**The hero (F1) is where the legend is taught.** F3 then shows the same agent with the same gate *missing*, and it reads without further explanation. Amber is reserved for the gate and for what is live; nothing else is amber.

### Every film must be named

A film nobody can name is decoration. Each section carries two lines beside it, and the checker asserts both are present in both locales:

- **`shows`** — what is literally on screen, in the visitor's words, no internal vocabulary.
- **`means`** — why that matters to them, marked with the reserved amber rule.

They are real text, so the argument survives with the film removed. `hero.filmNote` does the same job for the background film, which is otherwise the first thing on the page and completely unnamed.


The L3 hero figure carries a 15 s seamlessly looping film, stacked **on top of** the committed `hero-dither.png` rather than replacing it.

**Why the film exists:** F1 compares two agents and what sustains them, teaching the shared agent/component/gate legend. It is not the static 7-node MAGI network animated. It carries no wordmark, no letters and no logo lockup.

**Progressive enhancement (the whole contract):**

| Concern | Rule |
|---|---|
| Delivery | `MotionFigure.astro` renders the static `<img>` first and the `<video>` absolutely on top. Reduced motion, an unavailable codec or a video not yet loaded leave the poster visible; native autoplay works without JS. |
| Reduced motion | `.joyan-film { display: none }` — the element is **removed**, not paused. The poster is the intended resting state; a paused first frame is not a frame the film rests on. |
| Autoplay | `autoplay muted loop playsinline`, no `controls`, `preload="metadata"`, `aria-hidden="true"`, `tabindex="-1"` — decorative, never focusable, never announced. |
| Layout | Intrinsic `width`/`height` on both `<img>` and `<video>`; `object-cover`. The hero backdrop fills its `min-h-[100svh]` section, so narrow screens crop the 16:9 film; section films remain bounded figures. |
| Contrast | The hero is full-bleed behind the copy, with a directional scrim in `src/components/joyan/Hero.astro` opaque across the copy column. Section films stay in their own figure, separate from text. |
| LCP | The committed poster is the fallback; the actual LCP candidate and timing require browser measurement, not a static assertion. |

**Two encodes, one visitor.** AV1 is listed first in `<source>`; the browser downloads the first source it can decode and never requests the rest, so this is a quality tier and not a double cost. Both hero encodes are 1280×720; all four section films deliver both encodes at 960×540. The committed AV1 files are smaller than their H.264 counterparts.

**Why resolution, not a super-resolution model.** The softness was never an upscale — the film is rendered at 1920×1080 natively and was being *downscaled* to 960×540 at encode time, then upscaled again by the browser on a 1440px-wide hero. An upscaler on top of that would add invented detail; on flat geometric content with 1px hairlines it mostly softens. Delivering native pixels at a higher resolution is strictly better here, and it is also free in bytes thanks to AV1.

**Asset contract:**

| Source (`scripts/motion-src/`) | Output (`public/assets/motion/`) | Dimensions | Budget | Unit |
|---|---|---|---|---|
| `films/F1.js` | `harness-outcome.av1.mp4` | 1280×720, 30 fps, 15.0 s | 300 KiB | V1 |
| `films/F1.js` | `harness-outcome.mp4` | 1280×720, 30 fps, 15.0 s | 300 KiB | V1 (H.264 fallback) |
| `films/F2.js` | `action-gates.av1.mp4`, `action-gates.mp4` | 960×540, 30 fps, 15.0 s | 300 KiB each | Agents |
| `films/F3.js` | `harness-assembly.av1.mp4`, `harness-assembly.mp4` | 960×540, 30 fps, 15.0 s | 300 KiB each | MAGI |
| `films/F4.js` | `signal-freshness.av1.mp4`, `signal-freshness.mp4` | 960×540, 30 fps, 15.0 s | 300 KiB each | Connected systems |
| `films/F5.js` | `knowledge-cycle.av1.mp4`, `knowledge-cycle.mp4` | 960×540, 30 fps, 15.0 s | 300 KiB each | Ecosystem |

`pnpm check` enforces existence and ≤300 KiB **per encode**, exactly one occurrence per locale in its declared section, AV1 before H.264, intrinsic video dimensions, decorative autoplay attributes and localized film copy. Encode metadata can be inspected with `ffprobe -v error -show_streams -show_format public/assets/motion/harness-outcome.mp4` (substitute each table output).

Frames are always rendered at the composition's native 1920×1080 and only the encode is downscaled; rendering small and blurring it is how hairlines disappear.

**The loop is a contract, not an aspiration.** The goal is a seamless join. `probe.mjs` accepts zero sampled cells differing by more than 24/255; it reports the maximum cell delta too, but does **not** enforce pixel identity. Two safeguards were found during authoring:

- sub-frame shutter times **wrap** around the duration instead of clamping to zero — the film is a loop, so the shutter at `t=0` legitimately reaches back into the tail;
- every moving element has an explicit visibility window rather than one left to emerge from the beat maths, because emergent values drift.

**Build and verify:**

```bash
# Requires an isolated toolchain; see the script header for why Playwright is
# deliberately absent from the landing's own dependencies.
(mkdir -p ~/.cache/joyan-motion && cd ~/.cache/joyan-motion && npm init -y && npm i -D playwright && npx playwright install chromium)

pnpm build   # emits dist/_astro/*.woff2; the renderer stages fonts from node_modules
for F in F1 F2 F3 F4 F5; do
  W=960; B=5
  if [ "$F" = F1 ]; then W=1280; fi
  if [ "$F" = F5 ]; then B=1; fi
  node scripts/motion-src/render.mjs --film $F --out dist-motion --blur $B \
    --out-width $W --crf 34 --av1-width $W --av1-crf 46 || exit 1
  node scripts/motion-src/probe.mjs --film $F --frames dist-motion/frames || exit 1 # must print "accepted"
  cp dist-motion/*.mp4 public/assets/motion/ # next render replaces dist-motion
done
```

`probe.mjs` is an **oracle, not a linter**: it reads the rendered frames and rejects a film that reads as a slideshow — uniform cadence, beats that replace each other instead of carrying, a subject that dissolves into full-frame haze, or a visible loop seam. A rejected film is a slideshow with good typography.

The authoring recipe uses `--blur 5` for F1–F4 (each output frame is the linear-light average of five sub-captures across a 180° shutter) and `--blur 1` for F5. This recipe is not proof of byte-identical regeneration of committed MP4s across encoder/toolchain versions. Do not re-encode without re-running the oracle.

For seek-order purity, run `node scripts/motion-src/check-determinism.mjs --film F1` (repeat for F2–F5). It compares serialized SVG and painted RGBA at sampled times in forward/reverse/forward-again order and on a fresh page. This local gate needs the isolated Playwright toolchain and is not part of `pnpm check`.

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
| `src/components/joyan/Hero.astro` | L3 hero figure via `MotionFigure` (poster `/assets/dither/hero-dither.png`, empty alt, film `/assets/motion/harness-outcome.mp4`), caret, CTA buttons |
| `src/components/joyan/Wordmark.astro` | JOYAN wordmark (hero + OG source) |
| `src/components/joyan/AgentNetworkDiagram.astro` | Static 480×300 MAGI diagram, `aria-hidden`, one amber state |
| `src/components/joyan/MagiParticleCanvas.astro` | Iteration-3 Unit A — bounded 30/24 MAGI overlay (motion contract above) |
| `src/lib/magi-network.ts` | Shared 480×300 model; replace V1's 12 particles with the 30/24 depth-layer contract above |
| `src/components/joyan/MotionFigure.astro` | Hero figure wrapper: static poster `<img>` with the decorative loop `<video>` stacked on top; the film contract lives here |
| `src/components/joyan/{AgentsSection,MagiSection,HardwareSection,EcosystemSection}.astro` | Section figures (Unit E) + community/prototype blocks |
| `src/components/joyan/{SectionHeader,TerminalBlock,SiteHeader,SiteFooter,LanguageToggle}.astro` | Index/kicker/title, terminal motif, nav + toggle (current pathname + hash-preserving, `aria-current="page"`) |
| `scripts/generate-dither.mjs` | Browser-free tone OG writer + exact wordmark mask, lossless palette and deterministic budget |
| `scripts/motion-src/render-poster.mjs` | Local J1 tone-poster builder via the real `captureFrame`; lossless palette PNG, 80 KiB gate |
| `src/components/joyan/DitherScene.astro` | Dedicated decorative `#dither-scene` after hero, native H.264 + static poster, no script |
| `scripts/motion-src/{render-dither-scene,check-dither-scene}.mjs` | Local WU12 reframed J1 bake and live preview acceptance; external Playwright, never CI/client |
| `scripts/motion-src/render-og.mjs` | Local static OG1 tone-input builder; repeat/fresh-load assertions, no final OG writes |
| `scripts/motion-src/{lib.js,composition.html}` | Shared glyph/move library and parameterized `seek(t)` composition |
| `scripts/motion-src/films/{F1,F2,F3,F4,F5}.js` | Each film owns its beat sheet (`meta`), shared by composition, renderer and oracle |
| `scripts/motion-src/check-determinism.mjs` | Local seek-order gate: SVG markup and painted pixels; isolated Playwright required |
| `scripts/motion-src/check-poster-framing.mjs` | Local fresh-build ES/EN cover, production stencil-cell bounds, post-scrim recognition guards and copy protection; use `--require-page-clear` |
| `scripts/motion-src/render.mjs` | Playwright walk of the clock, real motion blur (sub-captures averaged across a 180° shutter, times wrapped around the loop), ffmpeg encode |
| `scripts/motion-src/probe.mjs` | The oracle: cadence, carry, stillness, focus retention and loop seam, measured from rendered frames |
| `scripts/svgo.config.mjs` | SVGO config for all source SVGs (Unit C) |
| `scripts/dither-src/{og-tone.png,wordmark.svg}` | Committed OG tone input and unchanged mask; other SVG art is legacy, no longer generated |
| `public/assets/dither/hero-dither.png` | The hero poster — the static layer under the film |
| `src/components/joyan/SectionFilm.astro` | Four section films via `MotionFigure`, shared poster and localized `shows`/`means` |
| `public/assets/motion/*.mp4` | Five argument films, AV1 + H.264 each, plus WU12 H.264 J1 scene; dimensions/budgets above |
| `public/assets/brand/og-default.png` | Separate OG brand output |
| `src/{content.config.ts,utils/journal.ts}` | Isolated typed Journal collection and locale queries; never use blog helpers |
| `src/components/joyan/{JournalSection,JournalEntryRow}.astro` | Section 05 and archive rows: hairline-separated mono metadata, title, summary, optional external link and localized detail link, no cards/radius |
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

Use only list rows: a top hairline, mono uppercase date/area/status, title, summary, optional external link, and a localized detail link. Area and status always come from localized chrome. Empty states are localized and honest. Do not use cards, rounded corners, thumbnails, filters, or pagination.

**WU7 retirement:** journal `dither` is no longer a schema field or row consumer. The summary and localized detail link are the existing textual alternative in ES/EN; no new copy is needed. The deterministic checker rejects any reintroduced frontmatter key (including null), schema field, consumer or `DitherFigure` importer. The unused component has been deleted; independent build/check passes with iteration-3 486/0, and static DOM checks retain 11 rows and six localized details.

**Row heading levels:** the landing section (h2) renders rows as **h3**; the archives render their page title as the single **h1** (`SectionHeader headingLevel={1}`) and rows as **h2** (`JournalEntryRow titleLevel={2}`) so heading order never skips a level.

## Journal detail rules

Every published entry builds a static detail at `/bitacora/{slug}` (ES) or `/en/log/{slug}` (EN); drafts and unknown slugs resolve as 404 (no static output). A detail renders its Markdown body in `joyan-prose`, localized date/area/status metadata, exactly one H1 with no skipped heading levels, the entry summary as the meta description, and a localized archive return link. Rows link to details from the landing (relative `bitacora/{slug}` / `log/{slug}`) and the archives (absolute `/bitacora/{slug}` / `/en/log/{slug}`).

- **Truthful pairing:** details toggle only to real counterparts. An ES-only detail toggles EN to `/en/log`, emits its absolute self-canonical, and **zero** `hreflang`/`x-default` alternates — never a fabricated EN page. Paired details emit self-canonical plus real ES/EN and ES `x-default`.
- **Detail prose:** rendered Markdown keeps the honest Journal voice; bodies and built attributes are claim-scanned like every other surface (`alt`/`title`/`content` included). No cards/radius, no inline styles.
- **Chrome:** detail header/footer anchors use the locale landing base (`/#…` ES, `/en#…` EN) and `id="top"`; the language toggle keeps `aria-current`.

## Disclosure rules

The five scoped repeated lists — Agents, MAGI, Hardware, Ecosystem items, and the Ecosystem community offers — render as **native, independently multi-open `<details>`** via `JournalDisclosureList.astro`:

- The first item of every scoped list is **server-rendered open**; every other item starts closed. No `name` attribute (that would force exclusive accordions), no script, no client state, no carousel/slides, no new dependencies.
- Summaries keep the **mono ordinal + title** (h3 under landing section h2s; h4 under the community offers h3), hide the default marker, and show the **amber `:focus-visible` ring**.
- Rows keep hairlines and radius `0`; bodies align under the title column on wide screens (`4rem` ordinal column) and stack full-width on narrow screens so prose and figures never overlap.
- Open/close is **instant** — no transition — so reduced-motion and no-JS users get identical static behavior.

## Static audit evidence (a11y & performance)

`check-iteration-3.mjs` (section 9) records deterministic, browser-free evidence for every PR that touches landing or Journal surface:

| Evidence | Deterministic check | Location |
|---|---|---|
| Landmarks | Site `<header>`, `<main id="main" tabindex="-1">` focus target, `<footer>`, `<nav aria-label="Main">`, `<nav aria-label="Footer">` on landings, archives and details | checker 9d + 8g4 |
| Unique IDs | Every `id` attribute unique per built page (section anchors `top/agents/magi/hardware/ecosystem/bitacora`, `main`, `shell-dots`, disclosure ids) | checker 9d |
| Heading order | Exactly one h1 per page, first heading is h1, no skipped levels (landing: h1→h2→h3/h4; archives: h1→h2; details: single h1 → prose headings) | checker 9d |
| Keyboard / focus-visible | `:focus-visible` outline utilities in compiled CSS; hardware surface `tabindex="0"` + ring class + `:focus-within` treatment hook; disclosure summary `:focus-visible` ring | checker 9d + 8h3 |
| Native disclosures | Five scoped surfaces per locale; first item server-open (exactly 5 open per page); one `<summary>` per `<details>`; ordinal/title summaries with h3/h4; no `name`/exclusive accordion; no script inside the five list regions; no disclosure-named JS chunk | checker 8h2 + 8h3 |
| Disclosure motion | Instant open/close — `transition: none` for `.disclosure` under `prefers-reduced-motion` | checker 8h4 |
| Responsive figures | Wide screens: `4rem` ordinal column (`@media (width >= 48rem)` grid rule); narrow: stacked single column | checker 8h4 |
| Reduced-motion paths | JS gates (`prefers-reduced-motion`) plus ≥3 compiled CSS media blocks (canvas, pulses, caret, hardware, shell texture, disclosures) | checker 9d + sections 3/5/6 |
| Content parity | ES/EN identical chrome keys (iteration-2 block 4) and ES-authoritative journal mirror (checker 8d) | both checkers |
| Build size | Client-JS gzip delta ≤ 22 KiB (22,528 B) against `.artifacts/iteration-2-client-js.json` | checker 7 |
| Route output | `/`, `/en`, `/bitacora`, `/en/log`, `/privacy`, `/terms`, every published detail, `/404` emit HTML; static HTML and gzip sums reported | checker 9e |

**No browser claims:** these are static structural safeguards (intrinsic dimensions, static hero markup, opacity/transform-only motion, contrast math, worst-case texture blend). Real LCP/CLS metrics require a browser or CI performance run and are deferred — never report Lighthouse-style numbers from this evidence.

## Accepted deviations (documented, not defects)

1. **Relative landing archive links.** The EN landing links the archive as `href="log"` (ES: `href="bitacora"`) instead of an absolute `/en/log` href because the iteration-2 route contract rejects any `/en/…` link target on the EN landing. The relative links resolve to `/bitacora` and `/en/log` at runtime; the archives themselves use absolute self-canonical URLs.
2. **Seed journal entries carry no external `link`.** The optional link remains supported, but there is nothing real to link yet. The former optional `dither` contract was unused and is retired by WU7 after WU5 rejected 192px thumbnails; do not repopulate it.
3. **Empty state is verified at source + conditionally.** The `entries.length > 0` branch and localized strings are source-verified, and the strings are proven absent from built output while entries exist. The empty-state render itself is not exercised in built output because both locales have published entries; temporarily drafting all entries of one locale exercises it.

## Checklists

### Adding an asset or diagram

- [ ] Tone scene: independent format framing, token neutrals/one reserved amber gate, no text except unchanged wordmark → OG only
- [ ] `pnpm dlx svgo --config scripts/svgo.config.mjs --folder scripts/dither-src` passes
- [ ] OG: `pnpm generate:dither` prints `PASS`; hero: local `render-poster.mjs` prints `PASS` (dimensions + byte budget + lossless palette), sha256 unchanged across `pnpm check`
- [ ] Output committed in `public/assets/dither/` (or `brand/` for OG); path matches the table above
- [ ] Page figures: absolute `/assets/...` path and intrinsic dimensions; OG: metadata only,1200×628, never an in-page image
- [ ] Informative figure → localized `alt` + `caption`; decorative (hero/texture/diagram) → `alt=""` / `aria-hidden="true"`
- [ ] Diagram: 480×300 viewBox, grid anchors, one amber active state, no screenshots
- [ ] `pnpm check` and `pnpm build` both pass

### Accessibility & reduced motion

- [ ] Body text ≥4.5:1 (plomo-500 only for large mono labels, 3:1 rule)
- [ ] Texture/dither never under text
- [ ] No italics, no purple gradients, radius 0 maintained
- [ ] Canvas `aria-hidden` with adjacent explanatory localized text
- [ ] Reduced-motion exposes static PNG/SVG; no-JS keeps native markup but videos may autoplay
- [ ] Motion: opacity-only, 30 fps cap, DPR ≤2, pauses offscreen/hidden/pagehide, Astro navigation cleanup
- [ ] Focus-visible ring on interactive elements (toggle, CTAs, disclosure summaries); language toggle keeps `aria-current="page"`
- [ ] Landmarks present (`main#main`, header, footer, labeled navs); every `id` unique per page
- [ ] Exactly one h1 per page; heading order never skips a level (archives: h1 title → h2 rows; details: single h1 → prose headings)
- [ ] Disclosures: first item server-open per scoped list; native multi-open summaries keyboard-operable (Enter/Space); no carousel, slides, or scripted state

### Journal detail review

- [ ] Only published entries build details; drafts/unknown slugs 404; Markdown renders in `joyan-prose`
- [ ] One H1, no skipped heading levels; localized date/area/status; summary as meta description; archive return link
- [ ] Paired details toggle/canonical/alternate to real counterparts only; ES-only details self-canonical with zero hreflang and `/en/log` toggle
- [ ] Bodies, metadata, visible text and `alt`/`title`/`content` values pass the Journal claim scan

---

**Version:** 1.13 — **Last updated:** 2026-10-10 — **Maintainer:** JoyanLabs

> **1.13 — WU14 live coloured scene gallery.** Six real `ascii.rest` `scenes`
> pieces (dots, not glyphs) mounted live in the noindex lab beside the unchanged
> baked J1, donut and cup, with an explicitly user-authorized enlargement of the
> lab JavaScript allowance as a measured number (25,239 B gzip chunk + 0 B
> inline, cap 27,648 B, margin 2,409 B). Landing five chunks stay byte-identical
> at 109,818 B gzip and no other route loads runtime scene JS. Namespace imports
> were measured and rejected because they mutated the frozen landing chunk. One
> `looks` example was measured at +44,134 B gzip and omitted as over budget.
> Preserved RED, real canvas-pixel frame checks, frozen/pause/no-JS/offscreen/
> cleanup evidence and 54 captures; CPU/LCP/CLS, Firefox/Safari, BFCache and glyph
> coverage remain unmeasured. Correction pass: the site-wide guard now walks
> `dist/**/*.js` recursively (nested chunks counted, negative control added),
> reports executable inline scripts per set as pre-existing and unbudgeted
> (114,589 B site-wide / 20,972 B landing / 0 B lab), corrects the six-scene
> per-module total to 43,076 B, replaces the unreproducible closure figure with
> method-labelled measurements, and records the independently measured load
> (47.2 fps steady, ≈12.2 fps per piece, 60.0 fps control).

> **1.12 — WU13 runtime trial.** Pinned real ascii.rest0.4.0 in an isolated noindex
> comparison lab; retain baked J1 and untouched landing assets/chunks. Selected
> PRE/canvas imports, explicit inline-JS budget accounting, static fallbacks,
> accessible controls and browser motion/network/lifecycle evidence. Independent
> blockers corrected: canonical glyph-cell projection/ligatures, minimal native
> lab shell, recursive JS plus all executable-inline accounting. Earlier narrow
> budget claim is explicitly invalidated; original evidence remains preserved.
> Placement matrix keeps retained baked rules separate from runtime candidates.

> **1.11 — WU12 visible normal-mode scene.** Dedicated original J1 H.264 surface
> after the unchanged F1 hero; accurate static poster, native loop/recognition and
> hidden-art controls. Fresh450-frame bake, bytes/seam/cell/palette proof, protected
> F1/chunks/OG/ten encodes. Mobile outer-band crop and prior overflow are explicit;
> this is local writer evidence, not ODD closure or main integration.

> **1.10 — WU7 journal thumbnail retirement.** Removed the unused schema field,
> row image and importer-free component; preserved localized summary/detail chrome.
> Observed RED 483/3, intermediate 485/1 and independent GREEN 486/0. Fourteen
> retirement controls pass; build13pages and full check pass with unchanged assets,
> encodes and five client chunks. External-link runtime is unexercised (no seed links).

> **1.9 — WU8 static tone OG.** Separate OG1 input and browser-free final writer,
> exact JOYAN mask,64 colours,6,571 B. Native/social inspection and static repeat/
> fresh-load checks pass; build13pages, check0errors/0warnings/26hints,
> iteration-2 323/0, iteration-3 469/0. WU9/films and five client chunks unchanged.
> OG sha256 `a49aabb8334ae756eb207996dc3e83fe343676fcac0400e9e32358886961921e`.

> **1.8 — WU9 reduced-motion GREEN.** Larger horizontal semantic pair, localized
> poster-only scrim aperture, corrected production stencil-cell bounds and12
> actual-page passes. Copy protection and normal F1/JS baselines are verified;
> no-preference loading fallback and native-vs-halftone oracle limits stay explicit.

> **1.7 — Prior WU9 checkpoint (superseded).** Recorded a compact upper-right J1 candidate,
> complete flare/cell bounds and six actual ES/EN reduced-motion views. Crop,
> separation and copy clearance pass; desktop post-scrim recognition does not.
> Preserved the failing acceptance guard and distinguished fresh native blur-1
> oracle evidence from delivered halftone and browser visibility.

> **1.6 — Hero poster carries tone.** Replaced the two-colour SVG threshold
> with J1 at 7.8 s through the films' capture path: 1600×900, cell 7,
> 38-colour ramp-derived palette, 11,916 B within 80 KiB. Recorded WU5's
> displayed-pitch rule and cover arithmetic. The poster builds locally, not
> in CI or `package.json`; `pnpm check` regenerates only the ink/bone OG,
> so it cannot undo the browser-built poster. Reserved amber stays at the gate.

> **1.5 — Contract reconciled with the tree.** Corrected the hero source,
> replaced nonexistent inline section figures with the four section films,
> inventoried both encodes of all five films and both generated PNGs, and
> documented the current dimensions, budgets, native no-JS playback, scrim,
> oracle tolerance and local determinism gate. The older 1.4 description of
> three inline diagrams and a 960 H.264 hero fallback was superseded; today
> only MAGI has an inline diagram and both hero encodes are 1280×720.

> **1.4 — Immersive hero and real section figures (historical; superseded by 1.5).** The hero film is now
> full-bleed behind the copy with a directional scrim that is opaque across
> the whole text column, replacing the boxed figure. The film was re-authored
> for that layout: composed right-of-centre, geometric with no text of its
> own, and delivered as AV1 1280 with an H.264 960 fallback. The four dither
> section textures are gone, replaced by three inline SVG diagrams; MAGI has
> no figure because its real diagram already is one.

> **1.3 — Hero film.** Added the L3 hero film and its asset/progressive-
> enhancement contract. This is the second continuous runtime loop the
> design system allows, and the first animation in the hero: the previous
> rule was "never a hero animation". The film is stacked over the existing
> poster rather than replacing it, so every no-JS / reduced-motion /
> slow-connection guarantee still holds unchanged.

> **1.2 — Narrative alignment.** Brand essence, MAGI definition and the
> connected-systems framing were rewritten to match the 2026 product
> direction. Section 03 is no longer "hardware for agents"; its anchor stays
> `hardware` because locale-invariant ids are a published contract. Added the
> naming guardrail for the first vertical product.
**Related skills:** [`design-taste-frontend`](../skills/design-taste-frontend/SKILL.md) (architecture rules), [`frontend-design`](../skills/frontend-design/SKILL.md) (design quality), [`documentation`](../skills/documentation/SKILL.md) (docs standards)
**Related docs:** [VIRTUAL-MODULE.md](./VIRTUAL-MODULE.md)

## WU20 — the single coming-soon page (delivered on test/motion-graphics)

The site is ONE page. `/` and `/en` render a coming-soon for Joyan; the three `/lab/**` routes stay noindex and unlinked; every other route is archived out of the build into `archive/` (files preserved in the repository; the full old landing also lives on the `archive/full-landing` branch, cut at `637fb1e`).

**Delivered composition (user-directed corrections applied).** The hero is the Blade Runner unicorn the user supplied, animating on load over the star/aurora field — recipe in `docs/MOTOR-ESCENAS.md` §15. Below it: an eyebrow coming-soon line, the Joyan name, one professional positioning line, a three-cell value strip (agreed limits / auditable record / human review), the attribution line, and a minimal footer. Copy is placeholder pending branding review — that decision is recorded in `odd/tasks/dither-iteration.md` (WU20), nowhere user-visible. The word "cooperativa" is not used.

**Rights decision, on the record.** The user states they consider the unicorn an open-source-style illustration based on the film design but belonging to no one, and explicitly directs using it "para probar". The licence discipline holds: the SVG fixture stays gitignored (`dist-motion-verify/wu18/input/`), nothing derivative is committed — the page embeds only the pipeline's converted serialisation (17 KB JSON) and a build-time baked poster as a data URI — and the page carries the attribution ("based on the Blade Runner unicorn, design attributed to Tom Southwell — used as a demonstration; production use requires confirmed rights"). Without the local fixture the build falls back to our mark and the page says so.

**Hero behaviour (user-directed).** The hero AUTOPLAYS: no Play control on the public page; the still-until-Play pattern remains on the lab routes. Reduced motion shows the real static poster (the same scene's bake) with truthful wording and never animates. Offscreen and hidden-tab pause, pagehide cleanup and no duplicate RAFs are checker-verified.

**Measured budget (the landing set changed, loudly).** Landing JS = Astro ClientRouter ×2 (60,302 + 27,057 B gzip, byte-identical to the WU12 recordings) + hero entry (56 B) + the shared `scene-runtime` chunk (13,924 B gzip) = **101,339 B gzip across 4 chunks**, 9,434 B over the untouched WU12 baseline (91,905 B), inside the 22 KiB delta budget. The framer-motion reveal/viewport chunks left the build with the old landing (-2 chunks). The lab executes 39,348 B (cap 41,396 B = measured + 2,048 B). The old five-chunk landing set is superseded by the recorded WU20 four-chunk set (hash-pinned in `check-iteration-3.mjs`, `check-ascii-runtime.mjs` and — since the follow-up contract pass — `check-iteration-2.mjs`, which also re-asserts the delta rule against the untouched fixture).

**Gate contract.** `scripts/check-delivery-scope.mjs` allows exactly: M on the two page paths, the three lab pages and `src/lib/scene-runtime.ts`; A/M on `JoyanComingHero.astro`; M on `ImageLab.astro`; D/R/C on the enumerated 27 old routes/components into their enumerated `archive/src/**` destinations; the usual prefixes (docs, odd, public assets, dither/motion src). Everything else still fails closed (135 self-tests).

**Archive state.** 27 files moved: 8 pages (`404.astro`, `privacy.md`, `terms.md`, `rss.xml.ts`, `bitacora.astro`, `bitacora/[slug].astro`, `en/log.astro`, `en/log/[slug].astro`) and 19 joyan components (Hero, SiteHeader, SiteFooter, Wordmark, LanguageToggle, Agents/ Magi/ Hardware/ Ecosystem/ Journal sections and rows, SectionHeader, SectionFilm, MotionFigure, MagiParticleCanvas, AgentNetworkDiagram, TerminalBlock), with imports rewritten to relative paths inside `archive/src/`.

**Remaining limits.** No Firefox/Safari proof; no field LCP/CLS; the hero poster data URI measures 47,442 B (46.3 KiB, about 34,562 B gzip of HTML transfer); autoplaying hero is a user-directed choice for this page; branding review and a new OG image remain open. `scripts/check-iteration-2.mjs` was re-contracted to the one-page+archive state in the follow-up pass (153 assertions, 0 failures): its toggle/MAGI/figure/scene built-output contracts run against `archive/src/**` or assert built-output absence, its runtime harness executes the archived controller bundled with the model, its copy bans now include the retired positioning word and scan the shipped locale keys plus built meta attributes, and its retired items are listed in the WU20 handoff.

## WU26 — warp in our dot language, the sequence prototype fixed, Bitcount sampler

**Warp overlay (user-confirmed effect; WU27 tuning below).** Light-speed built in the dot language: discrete dots on 48 hash-selected radial spokes (dotted, never lines), a centre bloom cluster toward the palette's hot bone, and a static radial re-sampling of the base field near the frame border (up to 2.5 cells inward — the border stretches outward without moving a painted cell). The wavefront completes whole trips per 30 s loop (WU26: 3; WU27: 2); the measured field seam is ≈ 0 (WU26: exactly 0; WU27 at the wider window: 4.2e-15 float round-off against an adjacent-frame baseline of 0.0559 — generic seam loop in `check-image-pipeline.mjs`). Every declared colour is a `joyan-page` palette entry (checker-verified). Composition order puts warp first so later overlays compose over the displaced cells. Wired into the CLI (`--overlays warp`), the `/lab/image` treatments (`page-wash` vs `page-warp` on `joyan-page`, same grid) and, since WU27, the real `/lab/sequence` transition. Honest judgement, recorded: the burst reads clearly as light-speed in motion; in stills the streaks compete with the star field, and a slower, wider pulse may serve the page better — left for the user.

**Sequence prototype (root cause).** `secuencia.html` died because the v2 edit removed the `#next`/`#replay` buttons but kept their listeners: `document.getElementById('next')` returned null and the load-time `TypeError` killed the entire script — typing, toggle and keyboard never started. Rewritten without dead references; browser-verified: autoplay typing → warp burst → act 2 → act 3, click/ArrowRight advance (last act replays), ES/EN toggle swaps the literal lines, **zero console errors** (`dist-motion-verify/wu26/sequence/`).

**Bitcount sampler.** `dist-motion-verify/wu23/fonts/bitcount-sampler.html` (served by the existing :4400 server) drives Bitcount's REAL variable axes (CRSV 0..1, ELSH 0..100, ELXP 0..100, slnt −8..0, wght 100..900) with live sliders, a 45-cell wght × ELSH × ELXP matrix at 16 px, and the hero's own words ("Joyan", the resistance line, `hello@joyan.dev`) at text sizes with Michroma beside at identical sizes; VT323 shown as the act-1 CRT candidate. Browser-verified (45 cells render, computed `font-variation-settings` follows the sliders, all three fonts load, zero errors). Finding the user asked for: at text sizes the legible window is **wght ≥ 300 with ELSH ≤ 50** (ELXP mid); wght 100 is a hairline illegible, and CRSV 1 + ELSH 100 collapses into decorative blocks at 16 px — fine for display, not for lines. **Px437 IBM VGA skipped**: the Oldschool PC Font Pack download was unavailable through both the int10h site path and the GitHub API from this machine — recorded, not silently dropped.

**Measured costs (re-pinned, loudly; superseded by the WU27 re-pin below).** The shared `scene-runtime` chunk grows 37,252 → 38,647 B raw (13,924 → 14,497 B gzip) with the warp overlay: landing **101,912 B gzip across 4 chunks** (delta 10,007 B over the untouched 91,905 B baseline, ≤ 22,528 B), lab executable **39,921 B** (cap **41,969 B** = measured + 2,048 B). Re-pinned in `check-iteration-2.mjs` (set), `check-iteration-3.mjs` (frozen hashes + LAB constants) and `check-ascii-runtime.mjs` (landing hashes, LAB_CLAIMS, sharedChunkGzip), plus the lab pages' cost claims and `docs/MOTOR-ESCENAS.md` §17. The landing invariant (same four chunks, byte-identical) is intact; the round-only ladder is untouched and the no-square assertion is re-stated in the WU26 checker block.

## WU27 — the real sequence on the engine, Michroma, and a slower wider warp

**The transition is the engine's, on the public scene (the user's rejection, corrected).** The standalone prototype is retired as the reference: `/lab/sequence` (noindex, self-canonical) mounts the engine through a lab-only runtime (`src/lib/sequence-runtime.ts` → `SequenceLab.astro`), embedding the SAME rolled serialised payload, the same grid, the same `joyan-page` palette and the same stars/aurora/wash overlays the public page renders. The act-1 → act-2 transition is the ENGINE's own `warp` overlay ramping up over that live scene — the dots themselves accelerate — while the VT323 terminal fades. The ramp is quantised into 13 buckets by `scripts/scene-src/sequence-warp.mjs` (the ONE ramp source the runtime and both checkers read); at bucket 0 the raster is BYTE-IDENTICAL to the public composition (Node-measured), so the sequence starts on the public scene, not a lookalike. No parallel particle canvas exists anywhere on the route. Acts: 1 terminal (VT323, bone text, amber prompt — no phosphor green; skip by click/ArrowRight), 2 the literal Sarah Connor line with its credit, 3 the watcher line + Joyan in Michroma + mailto and the authored dot Discord mark. The ES/EN toggle is the only control; reduced motion shows the final state over the static build-time poster; no-JS server markup IS that final state; offscreen/hidden pauses; pagehide cleans up.

**Michroma (user choice), self-hosted.** `public/fonts/michroma-400.woff2` + `vt323-400.woff2` (act-1 terminal only), both SIL OFL 1.1 with the notice recorded in `public/fonts/OFL-NOTICE.txt`. `@font-face` in `src/assets/styles/tailwind.css`; `--font-display` → Michroma; applied to the name and headings on both public pages and the lab. Choice stated: Michroma is a single-weight (400) naturally wide face with NO weight/width axes, so `text-display` keeps the uppercase and drops the Archivo-axis fakes (850 weight would synthesize faux bold; `font-stretch` 125% does nothing without a width axis). JetBrains Mono keeps mono roles; Archivo keeps body.

**Warp slower and wider (user direction).** `trips` 3 → **2** per 30 s loop, wavefront gaussian `sigma` 0.05 → **0.09**. Field seam re-measured **4.2e-15** (float round-off ≈ 0; adjacent-frame baseline 0.0559) — whole trips and the fract advance keep it periodic by construction. Pinned by `check-image-pipeline.mjs` (WU27 block) and `scripts/check-sequence-lab.mjs`.

**Measured costs (re-pinned, loudly).** Adding the `/lab/sequence` entry SPLIT the shared scene graph: engine + scene + shape catalogue + image pipeline + overlays now ship as their own chunk **21,452 B raw / 8,838 B gzip** beside the runtime chunk **17,363 B raw / 6,358 B gzip** (both shared by the public hero and every lab route). Landing **102,611 B gzip across 5 chunks** (delta 10,706 B over the untouched 91,905 B baseline, ≤ 22,528 B; the two Astro client chunks byte-identical); lab executable **42,889 B gzip**, cap **44,937 B** (measured + 2,048 B). Re-pinned in `check-iteration-2.mjs` (set + hashes), `check-iteration-3.mjs` (frozen hashes, delta, LAB constants, six-page build set), `check-ascii-runtime.mjs` (landing hashes, two-chunk LAB_CLAIMS, shared 15,196 B), the three existing lab pages' cost figures, and `docs/MOTOR-ESCENAS.md` §19. The WU27 gate contract covers the route/component/runtime (A), `public/fonts/**` (A, enumerated), the touched checkers (A/M), and keeps everything else failing closed (self-test 175/0; an unknown lab route still fails).

## WU28 — the recorded limitations, resolved and measured

**The pre-act-1 flash of the final state — impossible by construction.** The route ships `<html class="no-js">` and an inline head script replaces it with `js` BEFORE first paint. With scripting, the CSS initial state IS act 1 (terminal visible, watcher hidden); the runtime's mount changes no opacity, so the 1→0 transition of the final act can no longer occur whenever the deferred module arrives. Without scripting, the final state over the static poster is the only state (verified with JavaScript disabled: watcher 1, terminal 0, poster visible). RED, measured with a realistic 600 ms module delay: the final-act text sat at opacity 1.0 for ~1.4 s (1,403 frames; 0.94 at the 100 ms mark) — `dist-motion-verify/wu28/limit1-red.json`. GREEN on the same reproduction: watcher 0 at 100/400/800 ms (`early-100/400/800ms.png`), no-JS final state intact (`limit1-green-nojs.png`).

**Warp still-legibility — all-amber trails, measured.** Of the cells the warp changes, WU27's alternating bone/amber spokes put only **12.8 %** on the accent signature ((r−b) > 0.25; only amber #ffb000 and rose #ff5d73 reach it in joyan-page). Candidates measured over the mark conversion at 160 × 80: all-rose 15.8 %, **all-amber 26.1 %** — shipped. Radial coherence (changed cells on a hash-active spoke inside the wavefront window) holds at **78.2 %**; the bloom stays hot bone (the centre still reads as the light source); every colour is a joyan-page entry; the seam is untouched (0.0 this build vs adjacent-frame baseline 0.0562). Crops a human can read: `dist-motion-verify/wu28/warp-still-1440.png` and `warp-still-390.png` — honest note: the still reads as a warm front around the subject; the pulse is still best judged in motion, because the structural brightness competition was resolved by COLOUR, not by brightness, to keep the palette rule.

**Firefox and LCP/CLS — measured what was measurable.** Firefox: no binary exists in the local Playwright caches (Chromium + chrome-headless-shell only) and installing is out of scope — Firefox remains unverified, stated plainly. LCP/CLS (method: PerformanceObserver `largest-contentful-paint` + `layout-shift`, `buffered: true`, injected before navigation, networkidle + 3.5 s settle, 1440 × 900, LOCAL preview server — not field data, no universality claimed): public ES page **LCP 72 ms** (the Michroma h1 itself) / **CLS 0.0000**; `/lab/sequence` **LCP 64 ms** / **CLS 0.0002**. Recorded in `docs/MOTOR-ESCENAS.md` §16.

**`buckets` renamed to `steps`.** `WARP_RAMP.steps = 12` with states **0..steps** (thirteen discrete strengths) documented in code, checkers and docs; `buckets` is gone and the checker fails on its return.

**Budgets re-pinned, loudly.** Landing **102,621 B gzip across 5 chunks** (delta 10,716 ≤ 22,528 against the untouched 91,905 fixture; client chunks byte-identical); lab **42,976 B gzip** under cap **45,024 B** — the measured total now honestly includes the sequence route's 69 B no-js bootstrap inline, the first executable inline on any lab route, and `check-ascii-runtime.mjs`'s lab-inline accounting was corrected to sum EVERY `/lab/**` route. Re-pinned in `check-iteration-2.mjs`, `check-iteration-3.mjs`, `check-ascii-runtime.mjs` (hashes: entry C6OjqazL, scene-runtime CQTB6O0Y, overlays DJ6pB0e_), the two lab pages' cost figures, and `docs/MOTOR-ESCENAS.md` §19/§20. Invariants re-verified: Node/canvas equality on the live sequence at 1440 AND 390 (identical strided sample sums), bucket 0 byte-identical to the public composition, palette bounds, no-square ladder, no engine/runtime JS on a real page beyond the hero's path, gate self-test 175/0 with the committed WU27 paths now A+M (D/T still fail).

## WU29 — the public sequence: black start, engine reveal, corrupted text

**The public page starts on pure black.** A section-level inline script sets `data-sequence-boot="js"` before first paint; the scoped CSS shows the black act-1 state (terminal only) only under that marker — without scripting the server markup IS the final state (poster, eyebrow, name, watcher line), never black (the WU28 lesson, applied where the layouts could not be touched). Reduced motion renders the final state even in the pre-mount boot frame and the runtime skips the intro and the scramble. Measured: at 100/400/800 ms the scene layer, eyebrow, tagline and credit are at opacity 0, the terminal at 1; the page is 99.2 % pure black at full-resolution pixel analysis (`dist-motion-verify/wu29/public-early-*.png`).

**The reveal is the engine's own ramp, up AND down.** The shared `sequence-warp` states rise 0..12 while the scene layer's opacity follows the bucket, then settle back to 0 — the settled state rasterises byte-identical to the composition the page has always shown (Node-verified; `check-scene-engine.mjs` now probes the live canvas against the REAL painted bucket via `data-hero-bucket`). The terminal fades as the dots arrive; the canvas paints from load (bucket 0) so the autoplay contract and the Node/canvas equality hold throughout.

**The text arc corrupts in our glyph language.** After the reveal the fate line takes the tagline slot with its `TERMINATOR 2 · SARAH CONNOR` credit, then corrupts — every character scrambling through the dot ramp (`·`, `•`, `●`) in plomo `#6e6e73`, bone `#e8e6e1` and amber `#ffb000`, a deterministic hash sweep resolving left to right — and re-forms into the watcher line, which stays; the credit leaves with the fate line. Mid-scramble capture: `dist-motion-verify/wu29/mid-scramble.png`; DOM snapshot in `browser-evidence.json`. Reduced motion swaps phrases without scrambling.

**Eyebrow.** Shipped: `TRANSMISIÓN` / `TRANSMISSION` (fits the terminal/broadcast motif; the generic line is gone, and the meta description now carries the watcher line). Alternatives for the user to pick from: ES — TRANSMISIÓN (shipped) · SEÑAL · FRECUENCIA ABIERTA · MODO RESISTENCIA; EN — TRANSMISSION (shipped) · SIGNAL · OPEN FREQUENCY · RESISTANCE MODE.

**ES/EN is now a real link pair** in the top corner (`/` ↔ `/en`, correct `hreflang`/`lang`, no JS). No other control exists; the hero autoplays (WU20).

**Runtime and budgets.** `src/lib/public-sequence.ts` is the ONE runtime on the public pages; the hero no longer imports the lab runtime, `scene-runtime.ts` is lab-only (its coming-hero section retired), and the landing budget DROPPED: **98,917 B gzip across 5 chunks** (delta **7,012** ≤ 22,528 vs the untouched 91,905 fixture — **15,516 B headroom left**; client chunks byte-identical; hero entry 2,280 B includes public-sequence; shared: engine 8,848 + ramp module 430). Lab **42,722 B** under cap **44,770 B** (`scene-runtime` 5,956 is lab-only now). LCP/CLS (WU28 method, local Chromium): **LCP 72 ms / CLS 0.0002** — unchanged in practice; the Michroma h1 remains the LCP element even on the black start. Node/canvas equality re-verified through the bucket-aware scene-engine probe; palette bounds, no-square ladder, seam ≈ 0, `.artifacts/iteration-2-client-js.json` untouched; gate self-test 183/0 with the WU29 files covered.

**Honest notes.** The reveal's amber presence in a single still is subtle at full-screen scale (the WU28 colour-based fix keeps the palette rule; the pulse reads best in motion). In-session visual inspection was blocked by the environment (the image reader stopped accepting files it accepted in WU27/WU28) — full-resolution pixel analysis of every capture stands in (black 99.2 % at start; 0.00 % warm until the reveal; 0.07 % warm during the corruption), and all captures are preserved for human review.
