---
name: design-taste-frontend
description: >
  Senior UI/UX Engineer. Architect digital interfaces overriding default LLM biases. 
  Enforces metric-based rules, strict component architecture, CSS hardware acceleration, and balanced design engineering.
metadata:
  author: conasin-team
  version: "1.0"
  scope: [app]
  auto_invoke: Building frontend components, pages, or interfaces
allowed-tools: Read, Edit, Write, Glob, Grep
---

# High-Agency Frontend Skill

## 1. ACTIVE BASELINE CONFIGURATION
* DESIGN_VARIANCE: 8 (1=Perfect Symmetry, 10=Artsy Chaos)
* MOTION_INTENSITY: 6 (1=Static/No movement, 10=Cinematic/Magic Physics)
* VISUAL_DENSITY: 4 (1=Art Gallery/Airy, 10=Pilot Cockpit/Packed Data)

**AI Instruction:** The standard baseline for all generations is strictly set to these values (8, 6, 4). Do not ask the user to edit this file. Otherwise, ALWAYS listen to the user: adapt these values dynamically based on what they explicitly request in their chat prompts. Use these baseline (or user-overridden) values as your global variables to drive the specific logic in Sections 3 through 7.

## 2. DEFAULT ARCHITECTURE & CONVENTIONS
Unless the user explicitly specifies a different stack, adhere to these structural constraints to maintain consistency:

* **DEPENDENCY VERIFICATION [MANDATORY]:** Before importing ANY 3rd party library, check `package.json`. 
* **Framework & Interactivity:** Vue/Nuxt or React/Next.js.
    * **RSC SAFETY:** Global state works ONLY in Client Components.
    * **INTERACTIVITY ISOLATION:** Interactive UI components MUST be isolated.
* **State Management:** Use local refs/state for isolated UI.
* **Styling Policy:** Use Tailwind CSS. 
* **ANTI-EMOJI POLICY [CRITICAL]:** NEVER use emojis. Use Lucide icons instead.
* **Responsiveness & Spacing:**
  * Standardize breakpoints (`sm`, `md`, `lg`, `xl`).
  * Contain page layouts using `max-w-[1400px] mx-auto` or `max-w-7xl`.
  * **Viewport Stability [CRITICAL]:** NEVER use `h-screen` for full-height Hero sections. ALWAYS use `min-h-[100dvh]`.
  * **Grid over Flex-Math:** Use CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`).
* **Icons:** Use `lucide-vue-next` or `@iconify-json/lucide`.

## 3. DESIGN ENGINEERING DIRECTIVES (Bias Correction)

**Rule 1: Deterministic Typography**
* **Display/Headlines:** Default to `text-4xl md:text-6xl tracking-tighter leading-none`.
    * **ANTI-SLOP:** Discourage `Inter` for "Premium" vibes. Use distinctive fonts.
* **Body/Paragraphs:** Default to `text-base text-gray-600 leading-relaxed max-w-[65ch]`.

**Rule 2: Color Calibration**
* **Constraint:** Max 1 Accent Color. Saturation < 80%.
* **THE LILA BAN:** The "AI Purple/Blue" aesthetic is strictly BANNED.
* **COLOR CONSISTENCY:** Stick to one palette.

**Rule 3: Layout Diversification**
* **ANTI-CENTER BIAS:** Centered Hero/H1 sections are strictly BANNED when `LAYOUT_VARIANCE > 4`. 
* Force "Split Screen" (50/50), "Left Aligned content/Right Aligned asset", or "Asymmetric White-space".

**Rule 4: Materiality, Shadows, and "Anti-Card Overuse"**
* **DASHBOARD HARDENING:** For `VISUAL_DENSITY > 7`, generic card containers are strictly BANNED.
* **Execution:** Use cards ONLY when elevation communicates hierarchy.

**Rule 5: Interactive UI States**
* **Mandatory Generation:** Full interaction cycles:
  * **Loading:** Skeletal loaders matching layout sizes.
  * **Empty States:** Beautifully composed empty states.
  * **Error States:** Clear, inline error reporting.
  * **Tactile Feedback:** On `:active`, use `-translate-y-[1px]` or `scale-[0.98]`.

**Rule 6: Data & Form Patterns**
* **Forms:** Label MUST sit above input.

## 4. CREATIVE PROACTIVITY (Anti-Slop Implementation)
* **"Liquid Glass" Refraction:** Beyond `backdrop-blur`. Add 1px inner border.
* **Perpetual Micro-Interactions:** When `MOTION_INTENSITY > 5`, embed continuous animations.
* **Staggered Orchestration:** Use `animation-delay` cascades for load-ins.

## 5. PERFORMANCE GUARDRAILS
* **DOM Cost:** Apply grain/noise filters exclusively to fixed elements.
* **Hardware Acceleration:** Never animate `top`, `left`, `width`, or `height`. Animate via `transform` and `opacity`.
* **Z-Index Restraint:** Never spam arbitrary z-indexes.

## 6. TECHNICAL REFERENCE (Dial Definitions)

### DESIGN_VARIANCE (Level 1-10)
* **1-3 (Predictable):** Flexbox `justify-center`, strict 12-column grids.
* **4-7 (Offset):** Use negative margins, varied aspect ratios.
* **8-10 (Asymmetric):** Masonry, CSS Grid with fractional units.
* **MOBILE OVERRIDE:** Fall back to single-column on mobile.

### MOTION_INTENSITY (Level 1-10)
* **1-3 (Static):** No automatic animations.
* **4-7 (Fluid CSS):** Use CSS transitions with cubic-bezier.
* **8-10 (Advanced Choreography):** Complex scroll-triggered reveals.

### VISUAL_DENSITY (Level 1-10)
* **1-3 (Art Gallery Mode):** Lots of white space.
* **4-7 (Daily App Mode):** Normal spacing.
* **8-10 (Cockpit Mode):** Tiny paddings, monospace for numbers.

## 7. THE 100 AI TELLS (Forbidden Patterns)

### Visual & CSS
* **NO Neon/Outer Glows.**
* **NO Pure Black:** Use Off-Black, Zinc-950.
* **NO Oversaturated Accents.**
* **NO Excessive Gradient Text.**
* **NO Custom Mouse Cursors.**

### Typography
* **NO Inter Font:** Use distinctive alternatives.
* **NO Oversized H1s.**

### Layout & Spacing
* **Align & Space Perfectly.**
* **NO 3-Column Card Layouts:** Use asymmetric grids.

### Content & Data
* **NO Generic Names.**
* **NO Generic Avatars.**
* **NO Fake Numbers.**

## 8. THE CREATIVE ARSENAL (High-End Inspiration)

### The Standard Hero Paradigm
* Stop doing centered text over a dark image. Try asymmetric Hero sections.

### Layout & Grids
* **Bento Grid:** Asymmetric, tile-based grouping.
* **Masonry Layout:** Staggered grid without fixed row heights.

## 9. THE "MOTION-ENGINE" BENTO PARADIGM

### A. Core Design Philosophy
* **Aesthetic:** High-end, minimal, and functional.
* **Surfaces:** Use `rounded-[2.5rem]` for containers.
* **Typography:** Use distinctive font stack with subtle tracking.

### B. The Animation Engine Specs
* **Spring Physics:** No linear easing.
* **Staggered Reveals:** Animation delay cascades.

## 10. FINAL PRE-FLIGHT CHECK
- [ ] Is mobile layout collapse guaranteed?
- [ ] Do full-height sections use `min-h-[100dvh]`?
- [ ] Are empty, loading, and error states provided?
- [ ] Are cards omitted in favor of spacing where possible?
