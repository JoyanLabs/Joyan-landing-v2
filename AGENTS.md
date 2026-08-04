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
- **ESLint** 10.x - Linter
- **Prettier** 3.x - Formatter

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

| Skill                     | Descripción                          | Ubicación                               |
| ------------------------- | ------------------------------------ | --------------------------------------- |
| **typescript**            | Patrones estrictos de TypeScript     | `skills/typescript/SKILL.md`            |
| **zod-4**                 | Validación con Zod v4                | `skills/zod-4/SKILL.md`                 |
| **context7-docs**         | Docs via MCP (incluye Astro)         | `skills/context7-docs/SKILL.md`         |
| **frontend-design**       | Impeccable - 17 comandos diseño      | `skills/frontend-design/SKILL.md`       |
| **design-taste-frontend** | Reglas arquitectura y best practices | `skills/design-taste-frontend/SKILL.md` |
| **lobehub-marketplace**   | Buscar e instalar skills dinámica    | `skills/lobehub-marketplace/SKILL.md`   |
| **documentation**         | Estándares de documentación          | `skills/documentation/SKILL.md`         |
| **git-guidelines**        | Guías de Git y GitHub                | `skills/git-guidelines/SKILL.md`        |
| **skill-creator**         | Crear nuevos skills                  | `skills/skill-creator/SKILL.md`         |
| **skill-sync**            | Sincronizar metadata                 | `skills/skill-sync/SKILL.md`            |
| **skill-auditor**         | Auditar skills                       | `skills/skill-auditor/SKILL.md`         |
| **stitch-design**         | Diseno UI via Google Stitch MCP       | `skills/stitch-design/SKILL.md`         |
| **enhance-prompt**        | Mejorar prompts para Stitch           | `skills/enhance-prompt/SKILL.md`        |
| **react-components**      | Stitch a React/Astro components       | `skills/react-components/SKILL.md`      |
| **design-md**             | Crear DESIGN.md desde Stitch          | `skills/design-md/SKILL.md`             |

## Auto-invoke Skills

| Trigger                                             | Skill                   |
| --------------------------------------------------- | ----------------------- |
| Escribiendo tipos/interfaces TypeScript             | `typescript`            |
| Creando schemas Zod                                 | `zod-4`                 |
| Buscando documentación o buenas prácticas           | `context7-docs`         |
| Building frontend components, pages, or interfaces  | `frontend-design`       |
| Building frontend components, pages, or interfaces  | `design-taste-frontend` |
| Necesito instalar una nueva skill o capability      | `lobehub-marketplace`   |
| Buscando skills en el marketplace                   | `lobehub-marketplace`   |
| Creating commits, PRs, o usando templates de GitHub | `git-guidelines`        |
| Creando o actualizando documentación                | `documentation`         |
| Creating nuevos skills                              | `skill-creator`         |
| Después de crear/modificar un skill                 | `skill-sync`            |
| Regenerar tablas Auto-invoke de AGENTS.md           | `skill-sync`            |
| Auditando o revisando skills existentes             | `skill-auditor`         |
| Validando skills contra código real                 | `skill-auditor`         |
| Verificando documentación de skills                 | `skill-auditor`         |
| Disenando interfaces de usuario con Stitch          | `stitch-design`         |
| Mejorar prompts para generacion de UI               | `enhance-prompt`        |
| Convertir disenos Stitch a componentes              | `react-components`      |
| Crear documentacion de sistema de diseno            | `design-md`             |

## Stitch Integration

Stitch (google-labs-code/stitch-skills) permite disenar interfaces de usuario usando el MCP server de Google Stitch.

### Skills Incluidas

Este template incluye las siguientes skills de Stitch:

| Skill | Descripcion | Ver |
|-------|-------------|-----|
| `stitch-design` | Generar pantallas UI desde texto | `skills/stitch-design/SKILL.md` |
| `enhance-prompt` | Mejorar prompts para Stitch | `skills/enhance-prompt/SKILL.md` |
| `react-components` | Convertir disenos a React/Astro | `skills/react-components/SKILL.md` |
| `design-md` | Crear DESIGN.md desde proyectos Stitch | `skills/design-md/SKILL.md` |

### Setup Rapido

1. **Configurar MCP**: Reemplazar `REPLACE_WITH_YOUR_STITCH_API_KEY` en `.opencode/opencode.json`
2. **Reiniciar OpenCode**: Para cargar el MCP server
3. **Listo**: Las skills ya estan incluidas en el template

Ver guia completa en: `.opencode/STITCH_SETUP.md`

### Reglas de Stitch

- NO commitear archivos en `.stitch/` - son artefactos de diseno generados
- NUNCA hacer commit de API keys (reemplaza en `.opencode/opencode.json`)
- Las skills ya vienen incluidas en el template

## Development Commands

| Comando        | Descripción            |
| -------------- | ---------------------- |
| `pnpm dev`     | Servidor de desarrollo |
| `pnpm build`   | Build para producción  |
| `pnpm preview` | Preview del build      |
| `pnpm check`   | Verificar tipos y lint |
| `pnpm lint`    | ESLint lint            |
| `pnpm format`  | Formatear con Prettier |
| `pnpm fix`     | ESLint auto-fix        |

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
