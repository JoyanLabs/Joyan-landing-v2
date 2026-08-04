---
name: documentation
description: >
  Crea y mantiene documentación del proyecto siguiendo estándares CONASIN.
  Trigger: Cuando se crea nueva funcionalidad, se modifica arquitectura, o se necesita documentar patrones.
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke: "Creando o actualizando documentación"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Cuándo Usar Este Skill

Usar este skill cuando:
- Se implementa una nueva funcionalidad que necesita documentación
- Se crea un nuevo contexto o módulo
- Se modifica la arquitectura del proyecto
- Se detecta documentación desactualizada o inconsistente
- Se necesita asociar un doc a un skill

**NO usar cuando:**
- Es una corrección menor de typo (editar directamente)
- La funcionalidad es trivial o temporal
- Ya existe documentación equivalente

---

## Principios de Documentación CONASIN

### Jerarquía docs/ vs skills/

```
docs/                    # Para humanos (lectura continua, guías)
├── ARCHITECTURE.md      # Visión general, punto de entrada
├── {feature}.md         # Guías específicas de funcionalidades
└── ...

skills/                  # Para IA (referencia rápida, patrones)
├── {skill}/
│   ├── SKILL.md         # Patrones críticos, árboles de decisión
│   └── references/      # Links a docs/ relacionados
```

### Reglas de Oro

| ✅ SÍ HACER | ❌ NO HACER |
|-------------|-------------|
| Crear un doc POR funcionalidad principal | Duplicar contenido entre docs |
| Referenciar el skill relacionado | Crear doc sin skill asociado |
| Usar plantilla estándar | Inconsistentes formatos de fecha |
| Mantener docs < 15KB (dividir si es más grande) | Docs monolíticos gigantes |
| Actualizar fecha en cada cambio | Docs obsoletos sin fecha actualizada |
| Usar `YYYY-MM-DD` para fechas | Formatos variados de fechas |

---

## Estructura de Documentos

### Ubicación según el tipo

```
¿Qué estás documentando?
│
├─ Arquitectura general del proyecto?
│  └─ docs/ARCHITECTURE.md
│
├─ Funcionalidad específica de un contexto?
│  └─ docs/{CONTEXT}_{FEATURE}.md
│     Ej: docs/USER_AUTH.md, docs/PAYMENT_STRIPE.md
│
├─ Patrón reutilizable (aplica a varios contextos)?
│  └─ docs/{PATTERN}.md
│     Ej: docs/PORTS_ADAPTERS.md, docs/CQRS.md
│
├─ Guía de operaciones/DevOps?
│  └─ docs/{TOPIC}.md
│     Ej: docs/DOCKER_DEPLOYMENT.md, docs/SETUP.md
│
└─ Integración con servicio externo?
   └─ docs/{SERVICE}.md
      Ej: docs/BETTER_AUTH.md, docs/INNGEST.md
```

### Asociación con Skills

TODO documento en docs/ DEBE estar asociado a al menos un skill:

| Tipo de Doc | Skill Asociado | Ejemplo |
|-------------|----------------|---------|
| Arquitectura | `conasin` o `nestjs` | ARCHITECTURE.md → conasin |
| Feature específica | Skill del contexto | USER_AUTH.md → better-auth |
| Patrón reutilizable | Skill más cercano | PORTS_ADAPTERS.md → nestjs |
| Operaciones/DevOps | `conasin` | DOCKER_DEPLOYMENT.md → conasin |
| Servicio externo | Skill del servicio | BETTER_AUTH.md → better-auth |

---

## Plantilla Estándar

Usar SIEMPRE esta plantilla para nuevos documentos:

```markdown
# {Título del Documento}

Breve descripción de una línea sobre qué cubre este documento.

## Tabla de Contenidos

- [Resumen Ejecutivo](#resumen-ejecutivo)
- [Conceptos Clave](#conceptos-clave)
- [Implementación](#implementación)
- [Ejemplos](#ejemplos)
- [Recursos](#recursos)

## Resumen Ejecutivo

[2-3 párrafos máximo. Explicar el propósito, cuándo usar, y valor proporcionado]

## Conceptos Clave

### {Concepto 1}
Explicación breve...

### {Concepto 2}
Explicación breve...

## Implementación

### Paso 1: {Acción}
```typescript
// Código de ejemplo
```

### Paso 2: {Acción}
Descripción...

## Ejemplos

### {Caso de Uso 1}
```typescript
// Ejemplo completo
```

## Troubleshooting

| Problema | Solución |
|----------|----------|
| {Error común} | {Cómo resolver} |

## Recursos

### Skills Relacionados
- [{Skill Name}](../skills/{skill}/SKILL.md) - {Qué aporta}

### Documentación Relacionada
- [{Otro Doc}](./{archivo}.md) - {Relación}

### Comandos Útiles
```bash
{comando} # descripción
```

---

**Versión**: 1.0  
**Última actualización**: YYYY-MM-DD  
**Mantenedor**: conasin-team  
**Skill asociado**: [{skill}](../skills/{skill}/SKILL.md)
```

---

## Decision Tree: ¿Necesitas un nuevo doc?

```
¿Estás implementando algo nuevo?
│
├─ ¿Es un patrón/arquitectura que afecta múltiples contextos?
│  ├─ SÍ: ¿Ya existe PORTS_ADAPTERS.md o similar?
│  │  ├─ SÍ: Actualizar doc existente
│  │  └─ NO: Crear docs/{PATRON}.md
│  └─ NO: Continuar...
│
├─ ¿Es una integración con servicio externo?
│  ├─ SÍ: ¿Existe docs/{SERVICIO}.md?
│  │  ├─ SÍ: Actualizar doc existente
│  │  └─ NO: Crear docs/{SERVICIO}.md
│  └─ NO: Continuar...
│
├─ ¿Es funcionalidad específica de un contexto?
│  ├─ SÍ: ¿Existe skill para este contexto?
│  │  ├─ SÍ: Crear docs/{CONTEXT}_{FEATURE}.md
│  │  └─ NO: Crear skill primero, luego doc
│  └─ NO: Continuar...
│
└─ ¿Es guía de operaciones/DevOps?
   └─ Crear docs/{TOPIC}.md (ej: DEPLOYMENT, SETUP)
```

---

## Checklist de Calidad

Antes de finalizar un documento, verificar:

- [ ] Usa la plantilla estándar
- [ ] Tiene skill asociado en sección "Recursos"
- [ ] Skill relacionado tiene referencia en `references/docs.md`
- [ ] Fecha actualizada con formato `YYYY-MM-DD`
- [ ] No duplica contenido de otros docs (verificar con grep)
- [ ] Tamaño < 15KB (si es más grande, considerar dividir)
- [ ] Comandos de código funcionan (testeados)
- [ ] Links a otros docs funcionan (no rotos)
- [ ] Referencias a skills usan paths relativos correctos

---

## Evitar Duplicaciones

### Verificar antes de crear

```bash
# Buscar contenido similar
grep -r "{concepto clave}" docs/

# Verificar si ya existe skill relacionado
ls skills/ | grep -i {concepto}

# Buscar referencias existentes
grep -r "{tema}" skills/*/SKILL.md
```

### Si detectas duplicación

1. **NO crear nuevo doc**
2. Actualizar doc existente con contenido adicional
3. Crear sección "Actualizaciones Recientes" si es necesario
4. Actualizar fecha del doc existente

---

## Actualizar Documentación Existente

### Flujo de actualización

1. **Identificar el doc**: `docs/{nombre}.md`
2. **Identificar skill asociado**: Ver sección "Recursos" del doc
3. **Actualizar contenido**: Mantener formato estándar
4. **Actualizar fecha**: Cambiar a fecha actual `YYYY-MM-DD`
5. **Verificar skills**: Asegurar que references/docs.md apunte a doc
6. **Ejecutar skill-sync**: `./skills/skill-sync/assets/sync.sh`

### Cambios menores vs Mayores

| Tipo de Cambio | Acción | Actualizar Fecha |
|----------------|--------|------------------|
| Typos, formato | Commit directo | Opcional |
| Nueva sección | Commit con descripción | SÍ |
| Reestructuración | PR recomendado | SÍ |
| Nuevo doc | PR requerido | SÍ (nueva) |

---

## Comandos Útiles

```bash
# Verificar tamaño de docs
ls -lh docs/*.md | awk '{print $5, $9}'

# Buscar docs sin skill asociado
grep -L "Skill asociado" docs/*.md

# Buscar fechas inconsistentes
grep -n "Última actualización" docs/*.md | grep -v "YYYY-MM-DD"

# Verificar links rotos entre docs
grep -r "\.\./" docs/*.md | while read line; do
  file=$(echo $line | grep -o '\.\./[^)]*' | head -1)
  if [ ! -f "$file" ]; then echo "Roto: $line"; fi
done

# Buscar duplicaciones de contenido
find docs/ -name "*.md" -exec grep -h "^## " {} \; | sort | uniq -d

# Ejecutar skill-sync después de cambios
./skills/skill-sync/assets/sync.sh
```

---

## Context7 MCP

```bash
# Buscar documentación existente
mcp context7 search-files --repo=/home/joshrm/Documentos/proyectos/peruintercorp/conasin/conasin-backend --query="documentation structure"

# Verificar formato de skills existentes
mcp context7 search-files --repo=/home/joshrm/Documentos/proyectos/peruintercorp/conasin/conasin-backend --query="SKILL.md frontmatter"
```

---

## Resources

- **Plantilla**: Ver [assets/doc-template.md](assets/doc-template.md)
- **Ejemplos**: Ver docs/ existentes como referencia:
  - `docs/INNGEST.md` - Buena estructura para integraciones
  - `docs/PORTS_ADAPTERS.md` - Ejemplo de patrón reutilizable
  - `docs/SETUP.md` - Guía de operaciones
- **Skill Creator**: [../skill-creator/SKILL.md](../skill-creator/SKILL.md) - Para crear skills asociados
- **Skill Sync**: [../skill-sync/SKILL.md](../skill-sync/SKILL.md) - Para mantener AGENTS.md actualizado
