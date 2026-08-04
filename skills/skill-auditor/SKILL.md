---
name: skill-auditor
description: >
  Audita y valida skills existentes comparando documentación con código real del proyecto.
  Trigger: Cuando se necesita revisar, auditar o validar que las skills estén alineadas con el código real del proyecto.
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke:
    - "Auditar o revisar skills existentes"
    - "Validar skills contra código real"
    - "Verificar documentación de skills"
    - "Crear skill de auditoría"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## When to Use

Usa este skill cuando:
- Se necesita auditar todas las skills del proyecto
- Se detectan discrepancias entre skills y código real
- Se quiere validar que las skills estén actualizadas
- Se crea una nueva skill y se quiere verificar calidad
- El tool `skill` falla al cargar skills (fallback manual)
- Se necesita un reporte de estado de todas las skills

**NO usar cuando:**
- Es una corrección menor de typo (usar skill-creator o editar directo)
- La skill es obviamente correcta (no desperdiciar tiempo)

---

## Critical Patterns

### Pattern 1: Auditoría Sistemática por Skill

**Flujo de auditoría paso a paso:**

1. **Leer SKILL.md** - Extraer metadata, patrones, ejemplos
2. **Comparar con código real** - Buscar archivos mencionados en `app/`
3. **Identificar discrepancias** - Versiones, APIs, rutas, nombres
4. **Generar preguntas** - Al usuario para decidir correcciones
5. **Documentar hallazgos** - En reporte estructurado

### Pattern 2: Detección de Problemas Comunes

**Verificar siempre:**

| Tipo de Problema | Cómo Detectar | Ejemplo |
|------------------|---------------|---------|
| **API desactualizada** | Grep por imports/funciones en código vs skill | `accessControl` vs `createAccessControl` |
| **Referencias rotas** | Verificar que archivos docs/ existen | `docs/ARCHITECTURE.md` no existe |
| **Versiones inconsistentes** | Comparar package.json vs skill | Zod 4 en skill, Zod 3 en código |
| **Rutas incorrectas** | Validar paths mencionados en skill | `app/composables/useAuth.ts` |
| **Missing patterns** | Código real tiene helpers no documentados | `useAuthFetch` no mencionado |

### Pattern 3: Generación de Reporte

**Estructura del reporte de auditoría:**

```markdown
# Skill Audit Report - {nombre-skill}

## Metadata Check ✅/❌
- name: {valor}
- description: {valor}
- version: {valor}
- scope: {valor}

## Code Validation

### Archivos Referenciados
| Archivo (Skill) | Existe Real | Estado |
|-----------------|-------------|--------|
| app/lib/auth-client.ts | ✅ | Correcto |
| docs/ARCHITECTURE.md | ❌ | **Rota** |

### APIs/Versiones
| Componente | Skill Dice | Código Real | Estado |
|------------|------------|-------------|--------|
| Better Auth import | `accessControl` | `createAccessControl` | **Desactualizado** |
| Zod API | `z.email()` (v4) | `z.string().email()` (v3) | **Inconsistente** |

## Discrepancias Críticas
1. **{Problema 1}** - {Descripción} - {Severidad: Alta/Media/Baja}

## Recomendaciones
- [ ] {Acción 1}
- [ ] {Acción 2}

## Preguntas para el Usuario
1. {Pregunta 1}?
2. {Pregunta 2}?
```

---

## Decision Tree: ¿Qué hacer con las discrepancias?

```
¿La skill está desactualizada respecto al código?
│
├─ ¿Es solo un refactor de nombres (mismo comportamiento)?
│  ├─ SÍ → Actualizar skill para reflejar código real
│  └─ NO → Continuar...
│
├─ ¿El código real usa una versión diferente de la librería?
│  ├─ SÍ → ¿Actualizar código a versión nueva o mantener actual?
│  │        ├─ Actualizar código → Crear tarea de upgrade
│  │        └─ Mantener actual → Actualizar skill a versión actual
│  └─ NO → Continuar...
│
└─ ¿Hay funcionalidad en código real no documentada en skill?
   ├─ SÍ → Agregar a skill para mantener documentación completa
   └─ NO → Skill está OK
```

---

## Code Examples

### Example 1: Auditar una skill específica

```typescript
// Flujo de auditoría para skill "better-auth"

// 1. Leer skill
const skillContent = await readFile('skills/better-auth/SKILL.md')

// 2. Extraer archivos referenciados
const referencedFiles = [
  'app/lib/auth-client.ts',
  'app/lib/permissions.ts', 
  'app/composables/useAuth.ts',
  'app/composables/useRole.ts'
]

// 3. Verificar existencia
for (const file of referencedFiles) {
  const exists = await checkFileExists(file)
  if (!exists) discrepancies.push({file, type: 'missing_file'})
}

// 4. Comparar APIs
const skillApi = 'accessControl'  // De SKILL.md línea X
const realApi = 'createAccessControl'  // De permissions.ts línea 11
if (skillApi !== realApi) {
  discrepancies.push({skill: skillApi, real: realApi, type: 'api_mismatch'})
}
```

### Example 2: Auditoría completa de todas las skills

```bash
#!/bin/bash
# Script de auditoría completa

SKILLS_DIR="skills"
REPORT_FILE="audit-report-$(date +%Y%m%d).md"

# Listar todas las skills
for skill in $(ls $SKILLS_DIR); do
  if [ -f "$SKILLS_DIR/$skill/SKILL.md" ]; then
    echo "Auditing: $skill"
    
    # Verificar frontmatter
    head -15 "$SKILLS_DIR/$skill/SKILL.md" | grep -E "^(name:|description:|version:)"
    
    # Verificar referencias
    grep -oE "app/[^ )\"\']*" "$SKILLS_DIR/$skill/SKILL.md" | while read ref; do
      if [ ! -f "$ref" ]; then
        echo "  ❌ Missing: $ref"
      fi
    done
  fi
done
```

---

## Commands

```bash
# Auditoría manual de una skill específica
grep -n "app/" skills/{skill-name}/SKILL.md  # Listar referencias a archivos
ls -la app/{path}  # Verificar si existe

# Comparar versiones
head -30 skills/{skill}/SKILL.md | grep -i version  # Version en skill
cat package.json | grep "{library}"  # Version real

# Buscar APIs desactualizadas
grep -r "accessControl" skills/  # Skill dice
grep -r "createAccessControl" app/  # Código real dice

# Generar reporte de todas las skills
./skills/skill-auditor/assets/audit-all.sh
```

---

## Context7 MCP

**Consultar documentación actualizada de librerías para validar skills:**

| Library | Context7 ID | Use For |
|---------|-------------|---------|
| Zod | `/colinhacks/zod` | Validar API de Zod 4 vs Zod 3 |
| Better Auth | `/better-auth/better-auth` | Validar imports y plugins |
| Nuxt | `/nuxt/nuxt` | Validar composables y patterns |
| TypeScript | `/microsoft/TypeScript` | Validar type patterns |

**Ejemplo de queries para auditoría:**

```bash
# Validar API de Better Auth
mcp context7 query-docs \
  --libraryId "/better-auth/better-auth" \
  --query "access control plugin API createAccessControl vs accessControl"

# Validar breaking changes de Zod 4
mcp context7 query-docs \
  --libraryId "/colinhacks/zod" \
  --query "Zod 4 breaking changes from Zod 3 email url uuid"
```

---

## Resources

- **Audit Scripts**: Ver [assets/](assets/) para scripts de auditoría automatizada
- **Report Templates**: Ver [assets/audit-report-template.md](assets/audit-report-template.md)
- **Documentation**: Ver [references/](references/) para links a docs locales
- **Related Skills**: 
  - [skill-creator](../skill-creator/SKILL.md) - Para crear nuevas skills
  - [skill-sync](../skill-sync/SKILL.md) - Para sincronizar después de cambios
  - [documentation](../documentation/SKILL.md) - Para documentar hallazgos

---

## Checklist de Auditoría Completa

Para cada skill, verificar:

### Estructura OBLIGATORIA (según skill-creator)
- [ ] **Metadata** - Frontmatter completo (name, description, version, scope, auto_invoke)
- [ ] **When to Use** - Sección que define cuándo usar esta skill
- [ ] **Critical Patterns** - Patrones críticos de implementación
- [ ] **Decision Tree** - Árbol de decisiones para redirección a otras skills

### Contenido y Referencias
- [ ] **Archivos Referenciados** - Todos los paths existen en `app/`
- [ ] **Docs Referenciados** - Todos los docs en `docs/` existen
- [ ] **APIs/Versiones** - Coinciden con package.json y código real
- [ ] **Patrones** - Los ejemplos de código funcionan en el proyecto actual
- [ ] **Composables** - Nombres y ubicaciones correctas
- [ ] **Componentes** - Referencias a Nuxt UI actualizadas
- [ ] **Comandos** - Los comandos listados funcionan
- [ ] **Referencias Cruzadas** - Links a otras skills son válidos
- [ ] **Redirecciones** - Si esta skill cubre tema X, ¿redirige a skill específica de X?

---

## Audit Report: Initial Findings (2026-02-03)

### Skill `better-auth` - AUDITADO ✅

**Estado:** Actualizado y corregido

**Hallazgos:**
- ✅ Código real sigue mejores prácticas de Better Auth (confirmado con Context7)
- ✅ `createAccessControl` es la API correcta (no `accessControl`)
- ✅ `useAuthFetch` wrapper es crítico para cookies SSR
- ✅ `authClient.useSession(useAuthFetch)` es el patrón oficial para Nuxt SSR

**Correcciones aplicadas:**
- Actualizado SKILL.md para reflejar código real
- Agregado `useAuthFetch` pattern
- Actualizado troubleshooting con issue #2175
- Reordenados y renumerados patrones (1-9)

### Skill `zod-4` - ACTUALIZADO ✅

**Estado:** Migración completada

**Cambios en código real:**
- `app/utils/user.schema.ts` - Migrado a API Zod 4
- `shared/config/env.schema.ts` - Migrado a API Zod 4
- `app/plugins/validate-env.server.ts` - Refactorizado para eliminar duplicación

**Breaking changes aplicados:**
- `z.string().email()` → `z.email()`
- `z.string().url()` → `z.url()`
- Mensajes de error: `, 'msg')` → `{ error: 'msg' }`

### Skill `conasin` - REVISADO ⚠️

**Estado:** Referencias válidas, pero FALTA estructura

**Verificación:**
- ✅ Todos los docs referenciados existen en `docs/`
- ✅ Stack tecnológico coincide con package.json
- ✅ Estructura de carpetas es correcta

**⚠️ FALTA (detectado post-auditoría):**
- ❌ No tiene sección "When to Use"
- ❌ No tiene árbol de decisiones
- ❌ No redirige a `better-auth` para temas de auth/middlewares

### Hallazgo CRÍTICO sobre Estructura de Skills

**Problema identificado:** Ninguna skill del proyecto tiene:
1. Sección "When to Use" (obligatoria según skill-creator)
2. Árboles de decisión que redirijan a otras skills
3. Mapeo de preguntas → skills específicas

**Skills afectadas:**
- `conasin` - Skill principal debería redirigir a otras skills
- `better-auth` - Debería tener "When to Use"
- `typescript`, `zod-4`, `context7-docs` - Todas faltan estructura

**Acción requerida:**
- Agregar "When to Use" a todas las skills
- Crear árboles de decisión en skills principales (especialmente `conasin`)
- Establecer redirecciones: ¿Pregunta X? → Skill Y

---

## Notas sobre el Tool `skill` No Funcionando

**Problema identificado:** El tool `skill` (que invoca skills por nombre) falla con:
```
Error: Skill "conasin" not found. Available skills: none
```

**Solución temporal:** Leer archivos directamente con tool `read`:
```typescript
// ❌ NO funciona:
skill({ name: "conasin" })

// ✅ Funciona:
read({ filePath: "/home/joshrm/Documentos/proyectos/peruintercorp/conasin/conasin-frontend/skills/conasin/SKILL.md" })
```

**Acción recomendada:** Registrar este issue para investigar por qué el sistema de skills no carga las skills locales del proyecto.
