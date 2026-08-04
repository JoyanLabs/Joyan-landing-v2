---
name: frontend-design
description: >
  Impeccable - The design language that makes your AI harness better at design.
  Creates distinctive, production-grade frontend interfaces with 17 design commands.
  Trigger: When building web components, pages, or applications that require exceptional aesthetics.
license: MIT
metadata:
  author: JoyanLabs
  version: 2.0.0
  scope: root
  auto_invoke:
    - "Building frontend components, pages, or interfaces"
    - "Creating UI elements with high design quality"
    Designing landing pages, dashboards, or any web interface
allowed-tools: Read, Edit, Write, Glob, Grep, Context7
---

# Impeccable - Frontend Design Skill

## Overview

This skill provides comprehensive design guidance for creating distinctive, production-grade frontend interfaces. It includes 17 design commands and explicit anti-patterns to avoid generic "AI slop" aesthetics.

## Design Philosophy

Every LLM learned from the same generic templates. Without guidance, you get predictable mistakes:

- Inter font
- Purple gradients
- Cards nested in cards
- Gray text on colored backgrounds

This skill fights that bias with intentional design choices.

---

## The 17 Commands

### Core Commands

| Command             | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `/teach-impeccable` | One-time setup: gather design context, save to config        |
| `/audit`            | Run technical quality checks (a11y, performance, responsive) |
| `/critique`         | UX design review: hierarchy, clarity, emotional resonance    |
| `/normalize`        | Align with design system standards                           |
| `/polish`           | Final pass before shipping                                   |
| `/distill`          | Strip to essence                                             |

### Enhancement Commands

| Command     | Description                      |
| ----------- | -------------------------------- |
| `/clarify`  | Improve unclear UX copy          |
| `/optimize` | Performance improvements         |
| `/harden`   | Error handling, i18n, edge cases |
| `/animate`  | Add purposeful motion            |
| `/colorize` | Introduce strategic color        |
| `/bolder`   | Amplify boring designs           |
| `/quieter`  | Tone down overly bold designs    |
| `/delight`  | Add moments of joy               |
| `/extract`  | Pull into reusable components    |
| `/adapt`    | Adapt for different devices      |
| `/onboard`  | Design onboarding flows          |

---

## Reference Files

### Typography (`reference/typography.md`)

- Type systems, font pairing
- Modular scales
- OpenType features
- **Recommended fonts:**
  - Display: Clash Display, Satoshi, Space Grotesk
  - Body: Geist, Inter (as fallback only)
- **AVOID:** Inter, Roboto, Arial, system defaults

### Color & Contrast (`reference/color-and-contrast.md`)

- OKLCH color space
- Tinted neutrals
- Dark mode
- Accessibility compliance
- **Rules:**
  - NEVER use pure black (#000000)
  - NEVER use gray text on colored backgrounds
  - Always tint blacks/grays

### Spatial Design (`reference/spatial-design.md`)

- Spacing systems (4px base unit)
- Grids and alignment
- Visual hierarchy
- **Rules:**
  - Don't wrap everything in cards
  - Don't nest cards inside cards

### Motion Design (`reference/motion-design.md`)

- Easing curves
- Staggered reveals
- Reduced motion support
- **Rules:**
  - AVOID bounce/elastic easing (feels dated)
  - Use purposeful animation, not random motion

### Interaction Design (`reference/interaction-design.md`)

- Forms
- Focus states
- Loading patterns

### Responsive Design (`reference/responsive-design.md`)

- Mobile-first approach
- Fluid design
- Container queries

### UX Writing (`reference/ux-writing.md`)

- Button labels
- Error messages
- Empty states

---

## Anti-Patterns (NEVER DO)

### Typography

- ❌ Use overused fonts (Arial, Inter, Roboto, system defaults)
- ❌ Use generic font pairings

### Color

- ❌ Use pure black (#000000) - always tint
- ❌ Use gray text on colored backgrounds
- ❌ Use purple gradients as default
- ❌ Use timid, evenly-distributed color palettes

### Layout

- ❌ Wrap everything in cards
- ❌ Nest cards inside cards
- ❌ Use centered layouts by default
- ❌ Use predictable grid patterns

### Motion

- ❌ Use bounce/elastic easing
- ❌ Add random animations
- ❌ Over-animate every element

---

## Usage Examples

### Before Writing Code

```
User: Create a landing page for an AI startup

You: [Use /teach-impeccable to gather context, then proceed]
```

### After First Draft

```
User: The landing page looks generic

You: [Run /critique to identify issues]
[Run /bolder to amplify the design]
[Run /polish to finalize]
```

### Specific Focus

```
/audit header
/polish checkout-form
/adapt mobile
/animate hero-section
```

---

## Implementation Guidance

### For Astro + Tailwind Projects

1. Use CSS variables for theming
2. Leverage Tailwind's arbitrary values
3. Prefer CSS animations over JS
4. Use `client:visible` or `client:load` sparingly

### Typography Selection

| Look      | Display Font     | Body Font    |
| --------- | ---------------- | ------------ |
| Technical | JetBrains Mono   | Geist        |
| Modern    | Clash Display    | Satoshi      |
| Startup   | Space Grotesk    | Inter        |
| Luxury    | Playfair Display | Source Serif |

### Color Strategy

1. Pick ONE accent color
2. Use saturation < 80% for accessibility
3. Build neutrals from the accent color
4. Test contrast ratios

---

## Resources

- [Impeccable Website](https://impeccable.style)
- [Command Cheatsheet](https://impeccable.style/cheatsheet)
- [Before/After Case Studies](https://impeccable.style#casestudies)
