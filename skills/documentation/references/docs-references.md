# Referencias a Documentación del Proyecto

Este skill mantiene la consistencia entre documentación técnica (docs/) y skills de IA (skills/).

## Principio Clave

**TODO documento en docs/ DEBE estar asociado a un skill.**

## Mapeo Docs-Skills

| Documento | Skill Asociado | Tipo | Prioridad |
|-----------|----------------|------|-----------|
| ARCHITECTURE.md | conasin, nestjs | Arquitectura | Alta |
| PORTS_ADAPTERS.md | nestjs | Patrón | Alta |
| BETTER_AUTH.md | better-auth | Integración | Alta |
| ROUTE_PROTECTION.md | better-auth | Guía (duplicada) | Media |
| INNGEST.md | inngest | Integración | Alta |
| PRISMA_WORKFLOW.md | prisma | Flujo de trabajo | Alta |
| EMAIL.md | email-mailtrap | Servicio | Media |
| DOCKER_DEPLOYMENT.md | conasin | Operaciones | Media |
| DOCKER_BEST_PRACTICES.md | conasin | Referencia | Baja |
| SETUP.md | conasin | Guía inicio | Media |
| POSTGIS.md | prisma | Técnico | Baja |

## Convenciones

### Al crear un nuevo documento:

1. **Verificar que no existe**
   ```bash
   grep -r "{tema}" docs/
   ```

2. **Identificar skill relacionado**
   - Funcionalidad específica → Skill del contexto
   - Patrón/arquitectura → nestjs/conasin
   - Integración externa → Skill del servicio
   - Operaciones/DevOps → conasin

3. **Agregar referencia en skill**
   En `skills/{skill}/SKILL.md` agregar a sección Resources:
   ```markdown
   - **[{Título}](../../docs/{archivo}.md)** - {Descripción}
   ```

4. **Actualizar este archivo**
   Agregar entrada a la tabla de mapeo.

5. **Ejecutar skill-sync**
   ```bash
   ./skills/skill-sync/assets/sync.sh
   ```

### Estructura de referencias en skills

Cada skill que tenga documentación asociada debe incluir en su SKILL.md:

```markdown
## Resources

- **Documentación**: Ver [docs/{archivo}.md](../../docs/{archivo}.md) para guía completa
- **Patrones de Código**: Ver [assets/](assets/) para ejemplos copy-pasteable
```

## Documentos Huérfanos (Sin skill)

Los siguientes documentos necesitan asociación a skills:

- [ ] PORTS_ADAPTERS.md → Agregar a nestjs/SKILL.md
- [ ] DOCKER_DEPLOYMENT.md → Agregar a conasin/SKILL.md
- [ ] DOCKER_BEST_PRACTICES.md → Agregar a conasin/SKILL.md
- [ ] POSTGIS.md → Agregar a prisma/SKILL.md

## Documentos Duplicados (Necesitan consolidación)

- [ ] ROUTE_PROTECTION.md → Consolidar en BETTER_AUTH.md (70% duplicado)
- [ ] ARCHITECTURE.md (sección Puertos) → Referenciar a PORTS_ADAPTERS.md

## Formato de Fechas

Todos los documentos deben usar: `YYYY-MM-DD`

Ejemplo correcto: `2026-02-02`

## Tamaño Máximo

Documentos > 15KB deben dividirse o consolidarse.

Verificar con:
```bash
ls -lh docs/*.md | awk '{print $5, $9}'
```
