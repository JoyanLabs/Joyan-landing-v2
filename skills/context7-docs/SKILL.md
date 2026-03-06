---
name: context7-docs
description: >
  Skill central para consultar documentación actualizada via Context7 MCP.
  Trigger: Cuando necesitas documentación actualizada, ejemplos de código, o buenas prácticas de librerías.
license: MIT
metadata:
  author: conasin-team
  version: "1.0"
  scope: [root]
  auto_invoke: "Buscando documentación o buenas prácticas"
allowed-tools: Read, WebFetch, WebSearch
---

## When to Use

Usa esta skill cuando:
- Necesitas documentación actualizada de librerías externas
- Consultas APIs, métodos o configuraciones específicas
- Verificas mejores prácticas oficiales
- Buscas ejemplos de código actualizados
- Validas si tu implementación sigue estándares actuales

**NO usar esta skill cuando:**
- Trabajas con código específico del proyecto → Usar skills del proyecto (`conasin`, `better-auth`, etc.)
- Necesitas patrones internos de CONASIN → Ver documentación local en `docs/`

---

## Librerías Disponibles

| Tecnología | Context7 ID | Snippets | Score | Uso |
|------------|-------------|----------|-------|-----|
| **NestJS** | `/nestjs/docs.nestjs.com` | 1760 | 79.4 | Controllers, Modules, DI, Guards |
| **Prisma** | `/prisma/docs` | 4691 | 92.1 | Schema, Migrations, Queries, Transactions |
| **Better Auth** | `/llmstxt/better-auth_llms_txt` | 3022 | 81.6 | Auth flows, Plugins, Sessions |
| **Inngest** | `/llmstxt/inngest_llms-full_txt` | 4638 | 91.5 | Functions, Steps, Events |

---

## Cómo Usar

### 1. Resolver ID de librería (si no conoces)

```
mcp context7 resolve-library-id --query "testing framework for typescript" --libraryName "vitest"
```

### 2. Consultar documentación

```
mcp context7 query-docs --libraryId "/nestjs/docs.nestjs.com" --query "custom providers with factory functions"
```

---

## Queries Frecuentes

### NestJS

```bash
# Inyección de dependencias con tokens
--libraryId "/nestjs/docs.nestjs.com"
--query "custom providers dependency injection with interface tokens"

# Guards y autorización
--query "guards execution context and role-based access control"

# Interceptors
--query "interceptors for response transformation and logging"

# Exception filters
--query "exception filters for custom error handling"

# Módulos dinámicos
--query "dynamic modules with forRoot and forRootAsync patterns"
```

### Prisma

```bash
# Transacciones
--libraryId "/prisma/docs"
--query "interactive transactions with rollback and nested writes"

# Relaciones
--query "relations one-to-many and many-to-many with connect"

# Migraciones
--query "migrations with custom SQL and seed data"

# Patrón repositorio
--query "repository pattern with dependency injection best practices"

# Queries raw
--query "raw queries and queryRaw with type safety"
```

### Better Auth

```bash
# Sesiones
--libraryId "/llmstxt/better-auth_llms_txt"
--query "session management with custom storage"

# Plugins
--query "admin plugin roles and permissions setup"

# Integración programática
--query "programmatic API usage without middleware"

# Access Control
--query "access control plugin with custom roles and permissions"
```

### Inngest

```bash
# Funciones con steps
--libraryId "/llmstxt/inngest_llms-full_txt"
--query "creating functions with steps and retries"

# Eventos
--query "sending events and waiting for events with waitForEvent"

# Middleware
--query "middleware for dependency injection in functions"

# Scheduling
--query "cron jobs and scheduled functions"
```

---

## Tips para Queries Efectivas

1. **Sé específico**: "how to implement JWT auth in NestJS" > "authentication"
2. **Incluye contexto**: "NestJS guards with Better Auth sessions"
3. **Una cosa a la vez**: Evita queries combinadas
4. **Usa terminología correcta**: "dependency injection" no "DI"

---

## Alternativas de Context7 IDs

Si el ID principal no da resultados, prueba estas alternativas:

| Tecnología | Alternativas |
|------------|--------------|
| NestJS | `/websites/nestjs`, `/nestjs/nest` |
| Prisma | `/websites/prisma_io`, `/prisma/prisma-examples` |
| Better Auth | `/websites/better-auth`, `/better-auth/better-auth` |
| Inngest | `/websites/inngest`, `/inngest/inngest-js` |

---

## Ejemplo Completo de Workflow

```bash
# 1. No estoy seguro del ID de Zod
mcp context7 resolve-library-id \
  --query "validation library for typescript" \
  --libraryName "zod"

# 2. Obtengo el ID: /zod/... y consulto
mcp context7 query-docs \
  --libraryId "/colinhacks/zod" \
  --query "schema validation with custom error messages and refinements"

# 3. Obtengo snippets de código actualizados
```

---

## Cuándo NO Usar Context7

- Para patrones específicos del proyecto → usar skills locales
- Para convenciones internas → consultar AGENTS.md
- Para código existente → usar Read, Grep, Glob
