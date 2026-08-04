---
name: skill-sync
description: >
  Sincroniza metadata de skills a secciones Auto-invoke de AGENTS.md.
  Trigger: Cuando se actualiza metadata de skills, se regeneran tablas Auto-invoke, o se ejecuta sync.sh.
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke:
    - "Después de crear/modificar un skill"
    - "Regenerar tablas Auto-invoke de AGENTS.md"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Propósito

Mantiene las secciones Auto-invoke de AGENTS.md sincronizadas con la metadata de los skills. Cuando creas o modificas un skill, ejecuta el script de sync para actualizar automáticamente los archivos AGENTS.md afectados.

## Metadata Requerida del Skill

Cada skill que debe aparecer en secciones Auto-invoke necesita estos campos en `metadata`:

`auto_invoke` puede ser un string único **o** una lista de acciones:

```yaml
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]                              # Qué AGENTS.md: root

  # Opción A: acción única
  auto_invoke: "Creando/modificando componentes"

  # Opción B: múltiples acciones
  # auto_invoke:
  #   - "Creando/modificando componentes"
  #   - "Refactorizando estructura de carpetas"
```

### Valores de Scope

| Scope | Actualiza |
|-------|-----------|
| `root` | `AGENTS.md` (raíz del repo) |

Los skills pueden tener múltiples scopes: `scope: [root, api]`

---

## Uso

### Después de Crear/Modificar un Skill

```bash
./skills/skill-sync/assets/sync.sh
```

### Qué Hace

1. Lee todos los archivos `skills/*/SKILL.md`
2. Extrae `metadata.scope` y `metadata.auto_invoke`
3. Genera tablas Auto-invoke para cada AGENTS.md
4. Actualiza la sección `### Auto-invoke Skills` en cada archivo

---

## Ejemplo

Dada esta metadata de skill:

```yaml
# skills/nestjs/SKILL.md
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke: "Creando controladores o módulos NestJS"
```

El script sync genera en `AGENTS.md`:

```markdown
### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Creando controladores o módulos NestJS | `nestjs` |
```

---

## Commands

```bash
# Sincronizar todos los archivos AGENTS.md
./skills/skill-sync/assets/sync.sh

# Dry run (mostrar qué cambiaría)
./skills/skill-sync/assets/sync.sh --dry-run
```

---

## Checklist Después de Modificar Skills

- [ ] Agregado `metadata.scope` al skill nuevo/modificado
- [ ] Agregado `metadata.auto_invoke` con descripción de acción
- [ ] Ejecutado `./skills/skill-sync/assets/sync.sh`
- [ ] Verificado que AGENTS.md se actualizó correctamente
