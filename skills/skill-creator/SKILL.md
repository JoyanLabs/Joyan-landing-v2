---
name: skill-creator
description: >
  Crea nuevos AI agent skills siguiendo el estándar Agent Skills.
  Trigger: Cuando el usuario pide crear un nuevo skill, agregar instrucciones de agente, o documentar patrones para IA.
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke: "Creando nuevos skills"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Cuándo Crear un Skill

Crear un skill cuando:
- Un patrón se usa repetidamente y la IA necesita guía
- Las convenciones específicas del proyecto difieren de las mejores prácticas genéricas
- Workflows complejos necesitan instrucciones paso a paso
- Árboles de decisión ayudan a la IA a elegir el enfoque correcto

**No crear un skill cuando:**
- La documentación ya existe (crear una referencia en su lugar)
- El patrón es trivial o autoexplicativo
- Es una tarea de una sola vez

---

## Estructura del Skill

```
skills/{skill-name}/
├── SKILL.md              # Requerido - archivo principal del skill
├── assets/               # Opcional - templates, schemas, ejemplos
│   ├── template.py
│   └── schema.json
└── references/           # Opcional - links a docs locales
    └── docs.md           # Apunta a docs/{archivo}.md
```

**⚠️ IMPORTANTE**: Los archivos en `assets/` son ignorados por ESLint (ver `eslint.config.mjs`).
Esto permite incluir ejemplos de código sin restricciones de linting.

---

## Template SKILL.md

```markdown
---
name: {skill-name}
description: >
  {Descripción de una línea de lo que hace este skill}.
  Trigger: {Cuándo la IA debería cargar este skill}.
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]                    # Dónde aplica: root, api, ui
  auto_invoke: "{Acción trigger}"  # Para tabla auto-invoke
---

## When to Use

{Puntos de cuándo usar este skill}

## Critical Patterns

{Las reglas más importantes - lo que la IA DEBE saber}

## Code Examples

{Ejemplos mínimos y enfocados}

## Commands

```bash
{Comandos comunes}
```

## Context7 MCP

| Library | Context7 ID | Use For |
|---------|-------------|---------|
| ... | ... | ... |

## Resources

- **Templates**: Ver [assets/](assets/) para {descripción}
- **Documentation**: Ver [references/](references/) para docs locales
```

---

## Convenciones de Nombres

| Tipo | Patrón | Ejemplos |
|------|--------|----------|
| Skill genérico | `{technology}` | `typescript`, `zod-4`, `vitest` |
| Skill específico | `{project-component}` | `nestjs`, `better-auth`, `prisma` |
| Skill de testing | `{tech}-testing` | `vitest-testing` |
| Skill de workflow | `{action}-{target}` | `skill-creator` |

---

## Decision: assets/ vs references/

```
¿Necesitas templates de código?    → assets/
¿Necesitas JSON schemas?           → assets/
¿Necesitas configs de ejemplo?     → assets/
¿Link a docs existentes?           → references/
¿Link a guías externas?            → references/ (con path local)
```

**Regla clave**: `references/` debe apuntar a archivos LOCALES (`docs/*.md`), no URLs web.

---

## Campos del Frontmatter

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `name` | Sí | Identificador del skill (lowercase, guiones) |
| `description` | Sí | Qué + Trigger en un bloque |
| `license` | Sí | Siempre `MIT` para CONASIN |
| `metadata.author` | Sí | `conasin-team` |
| `metadata.version` | Sí | Versión semántica como string |
| `metadata.scope` | Sí | Array: `[root]`, `[root, api]`, etc. |
| `metadata.auto_invoke` | Sí | Acción que triggerea el skill |
| `metadata.status` | Opcional | `draft` para skills en definición |

---

## Guidelines de Contenido

### SÍ HACER
- Empezar con los patrones más críticos
- Usar tablas para árboles de decisión
- Mantener ejemplos de código mínimos y enfocados
- Incluir sección Commands con comandos copy-paste
- Agregar sección Context7 MCP con queries relevantes

### NO HACER
- Agregar sección Keywords (el agente busca frontmatter, no body)
- Duplicar contenido de docs existentes (referenciar en su lugar)
- Incluir explicaciones largas (linkear a docs)
- Agregar secciones de troubleshooting (mantener enfocado)
- Usar URLs web en references (usar paths locales)

---

## Skills EN DEFINICIÓN (Draft)

Para documentar patrones aún no implementados:

```yaml
metadata:
  status: draft
  version: "0.1.0"
```

Incluir al inicio del contenido:

```markdown
## Estado: EN DEFINICIÓN

> Este skill documenta un patrón que está siendo definido.
> Los ejemplos son la implementación objetivo, no el código actual.
```

Y al final:

```markdown
## TODO: Implementación Pendiente

- [ ] Tarea 1
- [ ] Tarea 2
```

---

## Registrando el Skill

Después de crear el skill, ejecutar sync para actualizar AGENTS.md:

```bash
./skills/skill-sync/assets/sync.sh
```

---

## Checklist Antes de Crear

- [ ] El skill no existe ya (revisar `skills/`)
- [ ] El patrón es reutilizable (no de una sola vez)
- [ ] El nombre sigue convenciones
- [ ] El frontmatter está completo (description incluye trigger)
- [ ] Los patrones críticos son claros
- [ ] Los ejemplos de código son mínimos
- [ ] La sección Commands existe
- [ ] Se ejecutó `skill-sync`

## Resources

- **Templates**: Ver [assets/](assets/) para template de SKILL.md
