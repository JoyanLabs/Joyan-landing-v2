---
name: design-taste-frontend
description: >
  Senior UI/UX Engineer rules for frontend development.
  This skill complements Impeccable with specific architectural constraints and best practices.
  Trigger: When building frontend components that require strict architecture patterns.
license: MIT
metadata:
  author: JoyanLabs
  version: 2.0.0
  scope: root
  auto_invoke: Building frontend components, pages, or interfaces
allowed-tools: Read, Edit, Write, Glob, Grep
---

# Design Taste - Complementary Rules

> **NOTE:** This skill complements the main `frontend-design` skill (Impeccable).
> For design aesthetics, typography, and anti-patterns, use Impeccable commands.

---

## Architecture Constraints

### Dependency Verification

Before importing ANY 3rd party library:

1. Check `package.json` first
2. Verify the package is actually needed
3. Consider native solutions first

### Framework & Interactivity

**For Astro projects:**

- Use islands architecture: `client:visible`, `client:load `client:id`,le`
- Global state works ONLY in Client Components
- Interactive UI components MUST be isolated

### Styling Policy

- Use Tailwind CSS with `cn()` for conditional classes
- Use CSS variables for theming
- Never use inline styles

### Icons Policy

- **NEVER use emojis** in production UI
- Use Lucide icons: `lucide-react` or `@iconify-json/tabler`
- Example: `<Icon icon="tabler:rocket" />`

---

## Responsive & Spacing Rules

### Breakpoints

Standardize on Tailwind's default breakpoints:

- `sm` - 640px
- `md` - 768px
- `lg` - 1024px
- `xl` - 1280px
- `2xl` - 1536px

### Page Container

```html
<!-- Always use max-width constraint -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- Content -->
</div>
```

### Viewport Height (CRITICAL)

- **NEVER** use `h-screen` for full-height Hero sections
- **ALWAYS** use `min-h-[100dvh]` for dynamic viewport height
- This handles mobile browser chrome properly

---

## Typography Defaults

### Headlines

```html
<h1 class="text-4xl md:text-6xl tracking-tight leading-none"></h1>
```

### Body Text

```html
<p class="text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-[65ch]"></p>
```

### Font Recommendations (from Impeccable)

| Type    | Font          | When                |
| ------- | ------------- | ------------------- |
| Display | Clash Display | Bold, modern        |
| Display | Satoshi       | Clean, contemporary |
| Display | Space Grotesk | Tech, startup       |
| Body    | Geist         | Modern, readable    |
| Body    | Inter         | Fallback only       |

---

## Color Rules

### The LILA BAN (CRITICAL)

The "AI Purple/Blue" gradient aesthetic is **STRICTLY BANNED**.

### Color Constraints

- Maximum 1 accent color
- Saturation < 80% for accessibility
- Build neutrals from accent color

### CSS Variables Pattern

```css
:root {
  --color-primary: oklch(70% 0.15 250);
  --color-primary-foreground: oklch(98% 0.02 250);
  --color-accent: oklch(60% 0.18 30);
}
```

---

## Component Architecture

### Max Component Size

- Maximum 200 lines per component
- Break larger components into smaller parts
- Use composition over inheritance

### Props Pattern (TypeScript)

```typescript
interface Props {
  class?: string;
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}
```

### Conditional Classes

```typescript
import { cn } from '~/lib/utils';

const buttonVariants = cva('inline-flex items-center justify-center rounded-md', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
    },
    size: {
      sm: 'h-9 px-3',
      md: 'h-10 px-4',
      lg: 'h-11 px-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});
```

---

## Performance Rules

### Images

- Use Astro's `<Image />` component
- Always specify width and height
- Use `loading="lazy"` for below-fold images

### Fonts

- Use `@fontsource-variable/` packages
- Subset fonts if possible
- Preload critical fonts

### JavaScript

- Prefer CSS animations over JS
- Use `client:visible` for below-fold interactive components
- Defer non-critical JS with `client:idle`

---

## References

- [Impeccable Style](https://impeccable.style) - Main design skill
- [Tailwind CSS](https://tailwindcss.com)
- [Astro Docs](https://docs.astro.build)
