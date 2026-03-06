# AGENTS.md - Joyan Landing Template

> Configuración centralizada para agentes de IA. Este archivo es la **fuente de verdad** para todas las reglas y skills del proyecto.

## Project Overview

**Joyan Landing** es una plantilla de landing page de alta calidad construida con Astro 5 + Tailwind CSS. Pertenece a **JoyanLabs**.

### Stack Tecnológico

- **Astro** 5.x - Framework principal
- **React** 19.x - Componentes interactivos
- **Vue** 3.5 - Componentes alternativos
- **Tailwind CSS** 3.4 - Estilos
- **TypeScript** 5.x - Tipado
- **Biome** 2.3 - Linter/Formatter principal
- **ESLint** 10.x - Linter alternativo
- **Prettier** 3.x - Formateador oficial

### Estructura del Proyecto

```
joyan-landing/
├── src/
│   ├── components/    # Componentes
│   ├── layouts/       # Layouts
│   ├── pages/        # Páginas
│   ├── content/      # Contenido
│   └── config.yaml   # Configuración
├── public/           # Assets
├── skills/           # Agent Skills
├── .opencode/        # OpenCode config
└── package.json
```

## Available Skills

| Skill                     | Descripción                      | Ubicación                               |
| ------------------------- | -------------------------------- | --------------------------------------- |
| **typescript**            | Patrones estrictos de TypeScript | `skills/typescript/SKILL.md`            |
| **zod-4**                 | Validación con Zod v4            | `skills/zod-4/SKILL.md`                 |
| **context7-docs**         | Consulta documentación via MCP   | `skills/context7-docs/SKILL.md`         |
| **frontend-design**       | Diseño frontend de alta calidad  | `skills/frontend-design/SKILL.md`       |
| **design-taste-frontend** | Engineer UI/UX Senior            | `skills/design-taste-frontend/SKILL.md` |
| **documentation**         | Estándares de documentación      | `skills/documentation/SKILL.md`         |
| **git-guidelines**        | Guías de Git y GitHub            | `skills/git-guidelines/SKILL.md`        |
| **skill-creator**         | Crear nuevos skills              | `skills/skill-creator/SKILL.md`         |
| **skill-sync**            | Sincronizar metadata             | `skills/skill-sync/SKILL.md`            |
| **skill-auditor**         | Auditar skills                   | `skills/skill-auditor/SKILL.md`         |

## Auto-invoke Skills

| Trigger                                            | Skill                   |
| -------------------------------------------------- | ----------------------- |
| Escribiendo tipos/interfaces TypeScript            | `typescript`            |
| Creando schemas Zod                                | `zod-4`                 |
| Buscando documentación o buenas prácticas          | `context7-docs`         |
| Building frontend components, pages, or interfaces | `frontend-design`       |
| Building frontend components, pages, or interfaces | `design-taste-frontend` |
| Creando o actualizando documentación               | `documentation`         |
| Creando commits, PRs, o usando templates de GitHub | `git-guidelines`        |
| Creando nuevos skills                              | `skill-creator`         |
| Después de crear/modificar un skill                | `skill-sync`            |
| Regenerar tablas Auto-invoke de AGENTS.md          | `skill-sync`            |
| Auditando o revisando skills existentes            | `skill-auditor`         |
| Validando skills contra código real                | `skill-auditor`         |
| Verificando documentación de skills                | `skill-auditor`         |

## Development Commands

| Comando        | Descripción            |
| -------------- | ---------------------- |
| `pnpm dev`     | Servidor de desarrollo |
| `pnpm build`   | Build para producción  |
| `pnpm preview` | Preview del build      |
| `pnpm check`   | Verificar tipos y lint |
| `pnpm lint`    | Biome lint             |
| `pnpm format`  | Formatear con Biome    |
| `pnpm fix`     | Auto-fix con Biome     |

## Commit & Pull Request Guidelines

### Formato de Commits

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Types:** feat, fix, docs, style, refactor, perf, test, chore

**Ejemplos:**

```
feat: add new hero component
fix: resolve navigation bug
docs: update installation guide
```

### Reglas

- Máximo 100 caracteres en el subject
- Sin mayúscula inicial
- Sin punto final
- Usar imperative mood

## Reglas del Proyecto

### Patrones Requeridos

1. **TypeScript**: Usar patrones estrictos - ver `skills/typescript/SKILL.md`
2. **Diseño**: Seguir guías de diseño - ver `skills/frontend-design/SKILL.md`
3. **Componentes**: Crear en `src/components/`
4. **Estilos**: Usar Tailwind CSS con `cn()` para conditional classes

### No Hacer

- ❌ Usar `any` en TypeScript
- ❌ Estilos inline
- ❌ Componentes giant (max 200 líneas)
- ❌ Olvidar testing

---

_Este archivo es la fuente de verdad. Para sincronizar skills, ejecutar `./skills/skill-sync/assets/sync.sh`_
