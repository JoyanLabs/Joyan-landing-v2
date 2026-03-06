---
name: {skill-name}
description: >
  {Descripción breve de lo que habilita este skill}.
  Trigger: {Cuándo la IA debería cargar este skill - ser específico}.
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke: "{Acción que triggerea}"
allowed-tools: Read, Edit, Write, Glob, Grep
---

## When to Use

Usa este skill cuando:
- {Condición 1}
- {Condición 2}
- {Condición 3}

---

## Critical Patterns

{Las reglas MÁS importantes - lo que la IA DEBE seguir}

### Pattern 1: {Nombre}

```{language}
{código de ejemplo}
```

### Pattern 2: {Nombre}

```{language}
{código de ejemplo}
```

---

## Decision Tree

```
{Pregunta 1}? → {Acción A}
{Pregunta 2}? → {Acción B}
De lo contrario → {Acción por defecto}
```

---

## Code Examples

### Example 1: {Descripción}

```{language}
{ejemplo mínimo y enfocado}
```

### Example 2: {Descripción}

```{language}
{ejemplo mínimo y enfocado}
```

---

## Commands

```bash
{comando 1}  # {descripción}
{comando 2}  # {descripción}
{comando 3}  # {descripción}
```

---

## Context7 MCP

Para consultar documentación actualizada:

| Library | Context7 ID | Use For |
|---------|-------------|---------|
| {Lib} | `{/org/project}` | {Para qué} |

Ejemplo de query:
```
mcp context7 query-docs --libraryId "{id}" --query "{tu pregunta específica}"
```

---

## Resources

- **Templates**: Ver [assets/](assets/) para {descripción de templates}
- **Documentation**: Ver [references/](references/) para links a docs locales
