---
name: git-guidelines
description: >
  Guías para Git y GitHub: mensajes de commit, descripciones de PR, y templates de proyecto.
  Usa GitHub CLI (gh) cuando esté disponible, con confirmación antes de comandos remotos.
  Verifica actualización de rama base antes de push.
  Guarda archivos de PR en .opencode/pr-bodies/ para persistencia.
  Trigger: Cuando el usuario pide crear commit, mensaje de commit, descripción de PR, o trabajar con templates de GitHub.
license: MIT
metadata:
  author: conasin-team
  version: "2.2"
  scope: [root]
  auto_invoke: "Creando commits, PRs, o usando templates de GitHub"
---

## When to Use

- Antes de ejecutar `git commit`
- Cuando el usuario dice "haz el commit", "sugiere mensaje de commit"
- Cuando el usuario pide crear/generar descripción de PR
- Cuando hay cambios staged listos para commitear
- Cuando hay commits listos para crear PR
- Cuando se quiere usar GitHub CLI (`gh`) para automatizar workflows

## Critical Patterns

### Detección de GitHub CLI

**SIEMPRE verificar primero si `gh` está disponible:**

```bash
# Verificar si gh está instalado
command -v gh >/dev/null 2>&1 && echo "gh disponible" || echo "gh no disponible"
```

- Si `gh` está disponible → Usar comandos `gh` para automatizar
- Si `gh` NO está disponible → Sugerir comandos manuales con git

### Regla de Oro: Confirmación antes de Comandos Remotos

**⚠️ SIEMPRE pedir confirmación explícita antes de ejecutar comandos que modifican el repositorio remoto:**

| Comando | Requiere Confirmación |
|---------|----------------------|
| `git push` | ✅ Sí |
| `gh pr create` | ✅ Sí |
| `gh pr merge` | ✅ Sí |
| `gh release create` | ✅ Sí |
| `git commit` | ❌ No (local) |
| `git add` | ❌ No (local) |

**Flujo de confirmación:**
1. Mostrar el comando exacto que se ejecutará
2. Esperar confirmación del usuario (sí/no)
3. Solo ejecutar si el usuario confirma

### Convenciones de Commit

**SIEMPRE seguir estas reglas estrictas:**

| Regla | Ejemplo Correcto | Ejemplo Incorrecto |
|-------|-----------------|-------------------|
| Máx 100 caracteres | `feat(users): add email validation` | `feat(users): add email validation for new user registration form` |
| Sin mayúscula inicial | `fix(auth): handle token expiry` | `fix(auth): Handle token expiry` |
| Sin punto final | `docs(readme): update setup steps` | `docs(readme): update setup steps.` |
| Tipo en minúscula | `feat:` / `fix:` / `docs:` | `Feat:` / `Fix:` / `Docs:` |
| Scope opcional en minúscula | `feat(users):` | `feat(Users):` |

**Tipos permitidos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Formato:** `<type>[optional scope]: <description>`

### Generando Mensaje de Commit

1. Analizar los archivos staged/modificados con `git diff --cached --stat` o `git status`
2. Determinar el tipo de cambio:
   - Nueva funcionalidad → `feat`
   - Corrección de bug → `fix`
   - Documentación → `docs`
   - Cambios de formato → `style`
   - Refactor sin cambio de comportamiento → `refactor`
   - Mejora de performance → `perf`
   - Tests → `test`
   - Mantenimiento/config → `chore`
3. Identificar el scope si es claro (ej: `users`, `auth`, `api`)
4. Escribir descripción breve (≤100 chars total) en lowercase sin punto final
5. Si es necesario, agregar cuerpo del commit (no afecta las reglas anteriores)

**Ejemplos válidos:**
```
feat(auth): add password reset endpoint
fix(users): validate email format
refactor(api): extract validation logic
docs(readme): add deployment steps
chore(deps): update dependencies
test(users): add unit tests for component
```

### Generando Descripción de PR

#### Opción A: Usando GitHub CLI + Template (preferido)

**Flujo completo con template `docs/PR_TEMPLATE.md`:**

```bash
# 1. Verificar si existe PR para la rama actual
gh pr view --json number,title,state 2>/dev/null || echo "No existe PR"

# 2. Analizar cambios para completar el template
BRANCH=$(git branch --show-current)
BASE="main"  # o detectar rama base (develop, main, master)
COMMITS=$(git log ${BASE}..HEAD --oneline)
FILES=$(git diff ${BASE}...HEAD --stat)

# 3. Crear directorio para PR bodies si no existe
mkdir -p .opencode/pr-bodies

# 4. Generar descripción basada en el template y guardar en archivo
#    Usar .opencode/pr-bodies/ para persistir hasta el siguiente PR
PR_BODY_FILE=".opencode/pr-bodies/pr-${BASE}-$(date +%s).md"
cat > ${PR_BODY_FILE} << 'EOF'
# PR: [TÍTULO_GENERADO_AUTOMÁTICAMENTE]

## 🎯 Resumen

[Breve descripción generada basada en los commits y archivos cambiados]

---

## Frontend (`conasin-frontend`)

### Nuevas funcionalidades:
[Generar lista con iconos según el tipo de cambio:
- 📧/📝/🔄/🔐/🗃️/⚡/🐛/✨/♻️/🧪 - Descripción de cada cambio]

### Archivos clave:

| Archivo | Cambio |
|---------|--------|
[Tabla generada desde git diff --stat]

---

## ✅ Testing

- [ ] Build exitoso
- [ ] Tests unitarios pasando
- [ ] Flujo verificado end-to-end

---

## 🔗 Links relacionados

- Branch: ${BRANCH}
- Base: ${BASE}
EOF

# 5. Crear PR usando el template file (SIEMPRE con confirmación previa)
echo "Body del PR guardado en: ${PR_BODY_FILE}"
gh pr create --base ${BASE} --title "<type>(<scope>): <descripción>" --body-file ${PR_BODY_FILE}

# 6. Ver PR creado
gh pr view --web
```

**Comandos gh útiles:**

```bash
# Verificar si existe PR
gh pr view --json number,title,state,url

# Ver archivos de PR bodies guardados
ls -la .opencode/pr-bodies/

# Crear PR desde template
gh pr create --base develop --title "feat(users): add validation" --body-file .opencode/pr-bodies/pr-develop-1234567890.md

# Ver PR en navegador
gh pr view --web

# Listar PRs abiertos
gh pr list --state open
```

#### Opción B: Manual (cuando gh no está disponible)

Usar el template en `docs/PR_TEMPLATE.md` como base:

1. Obtener lista de commits: `git log <base-branch>..HEAD --oneline`
2. Obtener archivos cambiados: `git diff <base-branch>...HEAD --stat`
3. Estructurar la descripción siguiendo el template:
   - Título descriptivo con emoji apropiado
   - Resumen breve (1-2 líneas)
   - Frontend: listar funcionalidades nuevas con iconos
   - Archivos clave: tabla con archivos y descripción de cambios
   - Backend: cambios (si aplica)
   - Variables de entorno (si aplica)
   - Checklist de testing
   - Links relacionados (si existen)

**Iconos por categoría:**
| Icono | Uso |
|-------|-----|
| 🎯 | Resumen/Objetivo |
| 📧 | Email/Notificaciones |
| 📝 | Logs/Documentación |
| 🔄 | Async/Workflows |
| 🔐 | Seguridad/Auth |
| 🗃️ | Base de datos |
| 🎨 | UI/Frontend |
| ⚡ | Performance |
| 🐛 | Bugfix |
| ✨ | Nueva feature |
| ♻️ | Refactor |
| 🧪 | Tests |

**IMPORTANTE:** La descripción del PR NO tiene límite de caracteres (a diferencia del commit). Usar formato markdown completo del template.

### Verificar actualización de la rama base antes de Push

**SIEMPRE verificar si la rama base está actualizada antes de hacer push:**

```bash
# Detectar rama base (develop, main, o master)
BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')

# Verificar si hay cambios nuevos en la rama base
git fetch origin ${BASE_BRANCH} --quiet

AHEAD=$(git rev-list HEAD..origin/${BASE_BRANCH} --count)
BEHIND=$(git rev-list origin/${BASE_BRANCH}..HEAD --count)

if [ $AHEAD -gt 0 ]; then
    echo -e "⚠️  Tu rama está $AHEAD commits ATRÁS de ${BASE_BRANCH}"
    echo ""
    echo "¿Quieres actualizar tu rama antes de hacer push?"
    echo "  1. Sí, hacer rebase (git rebase origin/${BASE_BRANCH})"
    echo "  2. No, continuar con push"
    read -r choice
    case $choice in
        1) git rebase origin/${BASE_BRANCH} ;;
        *) echo "Continuando con push..." ;;
    esac
else
    echo "✅ Tu rama está actualizada con ${BASE_BRANCH}"
fi

# Proceder con push
git push -u origin $(git branch --show-current)
```

**Ejemplo de output:**
```bash
# Caso 1: Tu rama está desactualizada
⚠️  Tu rama está 3 commits ATRÁS de develop

¿Quieres actualizar tu rama antes de hacer push?
  1. Sí, hacer rebase (git rebase origin/develop)
  2. No, continuar con push
> 1

# Caso 2: Tu rama está actualizada
✅ Tu rama está actualizada con develop
```

## Commands

### Git Básico (siempre disponible)

```bash
# Ver cambios staged para analizar
git diff --cached --stat
git diff --cached

# Ver commits desde base branch
git log main..HEAD --oneline

# Ver archivos cambiados
git diff main...HEAD --stat

# Ver último commit (para mensaje generado)
git log -1 --pretty=format:"%s"
```

### GitHub CLI (cuando está disponible)

```bash
# === INFORMACIÓN (no requiere confirmación) ===

# Verificar autenticación
gh auth status

# Ver PR actual
gh pr view
gh pr view --json title,number,state,url

# Listar PRs abiertos
gh pr list

# Ver status del repo
gh repo view --json name,defaultBranch

# === ACCIONES (SIEMPRE requieren confirmación) ===

# Crear PR
gh pr create --base main --title "<título>" --body "<descripción>"

# Push con seguimiento
git push -u origin <branch>

# Merge PR
gh pr merge

# Crear release
gh release create <tag>
```

## Decision Tree

```
¿El usuario pide "commit" o "mensaje de commit"?
  → Analizar git diff --cached
  → Generar mensaje ≤100 chars, lowercase, sin punto
  → Sugerir comando: git commit -m "<msg>"
  → Esperar confirmación del usuario

¿El usuario pide "PR" o "descripción de PR"?
  ├─ ¿Está gh disponible?
  │  ├─ SÍ → Usar gh para obtener información
  │  │        → gh pr view (si existe)
  │  │        → gh pr list (para contexto)
  │  │        → Generar título y descripción
  │  │        → Mostrar comando: gh pr create ...
  │  │        → **CONFIRMAR antes de ejecutar**
  │  │
  │  └─ NO → Usar git manual
  │           → git log <base-branch>..HEAD --oneline
  │           → git diff <base-branch>...HEAD --stat
  │           → Generar descripción con template
  │           → Sugerir crear PR manualmente en GitHub
  │
  └─ Mostrar resumen de cambios al usuario
     → Preguntar si desea crear el PR

¿El usuario quiere "push" o "publicar cambios"?
  → Detectar rama base (develop, main, master)
  → Verificar si base está actualizada: git fetch origin <base>
  → Calcular commits behind: git rev-list HEAD..origin/<base> --count
  → Si hay commits behind:
  │  → Mostrar advertencia: "Tu rama está X commits ATRÁS de <base>"
  │  → Preguntar: ¿Actualizar con rebase o continuar?
  │  → Si rebase → git rebase origin/<base>
  │  → Si continuar → Proceder con push
  → Si no hay commits behind:
  │  → Mostrar: "✅ Tu rama está actualizada con <base>"
  → Verificar rama actual
  → Mostrar: git push -u origin <branch>
  → **CONFIRMAR antes de ejecutar**
```

## Flujo de Trabajo Completo

### Ejemplo: Crear un PR con gh CLI

```bash
# 1. Verificar estado
gh auth status
git status

# 2. Analizar cambios (información)
git log main..HEAD --oneline
git diff main...HEAD --stat

# 3. Verificar si ya existe PR
gh pr view --json title,number,state 2>/dev/null || echo "No existe PR aún"

# 4. Generar propuesta de título y descripción (basado en convenciones)
#    [El AI genera el contenido siguiendo el template]

# 5. Mostrar comando propuesto y confirmar
#    "Se creará PR con:
#     gh pr create --base main --title 'feat(scope): descripción' --body '...'
#     ¿Ejecutar? (sí/no)"

# 6. Si confirma → Ejecutar
#    Si no → Mostrar alternativa manual
```

### Ejemplo: Sin gh CLI (modo fallback)

```bash
# 1. Analizar cambios
(git log y git diff comandos...)

# 2. Generar mensaje de commit sugerido
#    "Sugerencia: feat(users): add validation"

# 3. Generar descripción de PR usando template
#    "Copia este texto para crear el PR manualmente en GitHub..."

# 4. Sugerir push con confirmación
#    "Ejecutar: git push -u origin feat/branch
#     ¿Ejecutar? (sí/no)"
```

## Resources

- **Templates**: Ver [references/](references/) para templates de PR e issues
- **GitHub Templates**: Ver `docs/PR_TEMPLATE.md` y `references/docs.md`
- **gh CLI Docs**: https://cli.github.com/manual
