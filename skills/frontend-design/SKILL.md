---
name: frontend-design
description: >
  Create distinctive, production-grade frontend interfaces with high design quality.
  Trigger: When building web components, pages, or applications that require exceptional aesthetics.
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [app]
  auto_invoke: Building frontend components, pages, or interfaces
allowed-tools: Read, Edit, Write, Glob, Grep, Context7
---

## When to Use

Use this skill when:
- Building web components, pages, or applications
- Creating UI elements that need exceptional aesthetic quality
- Implementing visual designs that must be memorable and distinctive
- Working on any frontend interface that requires design thinking

**DO NOT use this skill when:**
- Working on backend logic or API design
- Database schemas or server configuration
- General project questions → Use `conasin-landing`

---

## Design Thinking (REQUIRED)

Before coding, always analyze the context and commit to a BOLD aesthetic direction:

### 1. Purpose
- What problem does this interface solve?
- Who are the users?

### 2. Tone
Pick an extreme and commit fully:
- Brutally minimal
- Maximalist chaos
- Retro-futuristic
- Organic/natural
- Luxury/refined
- Playful/toy-like
- Editorial/magazine
- Brutalist/raw
- Art deco/geometric
- Soft/pastel
- Industrial/utilitarian

### 3. Constraints
- Framework requirements
- Performance targets
- Accessibility needs

### 4. Differentiation
- What makes this UNFORGETTABLE?
- What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

---

## Frontend Aesthetics Guidelines

### Typography

- Choose fonts that are beautiful, unique, and interesting
- AVOID generic fonts: Arial, Inter, Roboto, system fonts
- OPT for distinctive choices that elevate the design
- Pair a distinctive display font with a refined body font

### Color & Theme

- Commit to a cohesive aesthetic
- Use CSS variables for consistency
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes

### Motion

- Use animations for effects and micro-interactions
- Prioritize CSS-only solutions when possible
- Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions
- Use scroll-triggering and hover states that surprise

### Spatial Composition

- Unexpected layouts
- Asymmetry
- Overlap
- Diagonal flow
- Grid-breaking elements
- Generous negative space OR controlled density

### Backgrounds & Visual Details

- Create atmosphere and depth rather than defaulting to solid colors
- Add contextual effects and textures that match the overall aesthetic
- Apply creative forms:
  - Gradient meshes
  - Noise textures
  - Geometric patterns
  - Layered transparencies
  - Dramatic shadows
  - Decorative borders
  - Custom cursors
  - Grain overlays

---

## What to AVOID

NEVER use generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character
- Common choices like "Space Grotesk" that feel overused

---

## Implementation Approach

### Match Complexity to Vision
- **Maximalist designs**: Need elaborate code with extensive animations and effects
- **Minimalist designs**: Need restraint, precision, careful attention to spacing, typography, and subtle details

### Key Principles
1. Interpret creatively and make unexpected choices
2. Feel genuinely designed for the context
3. Vary between light and dark themes, different fonts, different aesthetics
4. NEVER converge on common choices across generations

---

## Technology-Specific Guidance

### Vue/Nuxt Components
- Use `<script setup lang="ts">` composition API
- Follow Vue 3/Nuxt 4 conventions
- Leverage Nuxt UI components when appropriate

### Tailwind CSS
- Use custom CSS variables for theming
- Extend Tailwind config for unique utilities
- Apply arbitrary values for one-off designs

### Animations
- Prefer CSS transitions and keyframes
- Use `@vueuse/motion` or VueUse for complex animations
- Implement staggered reveals with `animation-delay`

---

## Example: Bold Aesthetic Execution

```vue
<script setup lang="ts">
const features = [
  { title: "Lightning Fast", description: "Built for speed" },
  { title: "Secure by Design", description: "Enterprise-grade security" },
  { title: "Accessible", description: "WCAG compliant" },
];
</script>

<template>
  <section class="features">
    <div
      v-for="(feature, index) in features"
      :key="feature.title"
      class="feature-card"
      :style="{ animationDelay: `${index * 150}ms` }"
    >
      <h3 class="feature-title">{{ feature.title }}</h3>
      <p class="feature-description">{{ feature.description }}</p>
    </div>
  </section>
</template>

<style scoped>
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  padding: 4rem;
}

.feature-card {
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 2rem;
  animation: fadeSlideIn 0.6s ease-out both;
}

.feature-title {
  font-family: "Clash Display", sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #f0f0f0;
  margin-bottom: 0.5rem;
}

.feature-description {
  font-family: "Satoshi", sans-serif;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
```

---

## Context7 Integration

For framework-specific guidance:
```bash
mcp context7 query-docs \
  --libraryId "/nuxt/nuxt" \
  --query "best practices for Vue component animations"
```
