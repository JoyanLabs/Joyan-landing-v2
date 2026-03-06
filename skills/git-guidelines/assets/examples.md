# Ejemplos de Uso: Git Guidelines con GitHub CLI

Este archivo muestra ejemplos prácticos de cómo la skill de `git-guidelines` interactúa con `gh` CLI.

## Escenario 1: Verificar disponibilidad de gh

```bash
# Verificar si gh está instalado
$ command -v gh >/dev/null 2>&1 && echo "gh disponible" || echo "gh no disponible"
gh disponible

# Verificar autenticación
$ gh auth status
github.com
  ✓ Logged in to github.com as usuario (keyring)
  ✓ Git operations for github.com configured to use ssh protocol.
  ✓ Token: gho_************************************
```

## Escenario 2: Crear un commit

**Usuario:** "quiero hacer un commit"

**AI:**
```bash
# 1. Analizar cambios staged
$ git diff --cached --stat
 skills/git-guidelines/SKILL.md | 204 +++++++++++++++++++++++++++++++--
 1 file changed, 192 insertions(+), 12 deletions(-)

# 2. Sugerir mensaje (siguiendo convenciones)
Sugerencia de commit:
  feat(git-guidelines): add gh cli support with confirmation flow

# 3. Ejecutar commit (no requiere confirmación - es local)
$ git commit -m "feat(git-guidelines): add gh cli support with confirmation flow"
[feat/skills 1234567] feat(git-guidelines): add gh cli support with confirmation flow
 1 file changed, 192 insertions(+), 12 deletions(-)
```

## Escenario 3: Crear un PR con gh CLI

**Usuario:** "crea el PR"

**AI:**
```bash
# 1. Verificar información del repo
$ gh repo view --json name,defaultBranch
{
  "name": "conasin-frontend",
  "defaultBranch": "main"
}

# 2. Verificar si ya existe PR
$ gh pr view --json title,number,state 2>/dev/null || echo "No existe PR"
No existe PR

# 3. Analizar cambios
$ git log main..HEAD --oneline
abc1234 feat(git-guidelines): add gh cli support with confirmation flow

def5678 docs: update skill documentation

$ git diff main...HEAD --stat
 .opencode/skills/git-guidelines/SKILL.md        | 204 ++++++++++++++++++++
 .opencode/skills/git-guidelines/assets/...     |  50 ++++++++++++++++++++
 2 files changed, 254 insertions(+)

# 4. Generar descripción usando el template docs/PR_TEMPLATE.md
$ cat > /tmp/pr-body.md << 'EOF'
# PR: feat(git-guidelines): integrate GitHub CLI with confirmation flow

## 🎯 Resumen

Integra soporte para GitHub CLI (gh) en la skill de git-guidelines, agregando
confirmación obligatoria antes de comandos que modifican el repositorio remoto.

---

## Frontend (`conasin-frontend`)

### Nuevas funcionalidades:
- ✨ **GitHub CLI Integration** - Detección automática y uso de `gh`
- 🔄 **Confirmation Flow** - Confirmación obligatoria antes de push/PR create
- 📝 **Template Integration** - Uso de `docs/PR_TEMPLATE.md` con `--body-file`

### Archivos clave:

| Archivo | Cambio |
|---------|--------|
| `SKILL.md` | Nueva sección de gh CLI y decision tree |
| `assets/examples.md` | Ejemplos prácticos de uso |

---

## ✅ Testing

- [ ] Build exitoso
- [ ] Tests unitarios pasando
- [ ] Flujo verificado end-to-end

---

## 🔗 Links relacionados

- Branch: feat/skills
- Base: main
EOF

# 5. SOLICITAR CONFIRMACIÓN
⚠️ Se creará el PR con el siguiente comando:

   gh pr create --base main \
     --title "feat(git-guidelines): integrate GitHub CLI with confirmation flow" \
     --body-file /tmp/pr-body.md

   ¿Ejecutar? (sí/no)

# 6. Usuario confirma con "sí"

# 7. Ejecutar comando (usando el template generado)
$ gh pr create --base main --title "..." --body-file /tmp/pr-body.md
https://github.com/DIGITALIZART-STUDIO/conasin-frontend/pull/25

✅ PR #25 creado exitosamente con template docs/PR_TEMPLATE.md
```

## Escenario 4: Push con confirmación

**Usuario:** "haz push"

**AI:**
```bash
# 1. Verificar rama actual
$ git branch --show-current
feat/skills

# 2. Verificar commits pendientes
$ git log origin/feat/skills..HEAD --oneline
abc1234 feat(git-guidelines): add gh cli support with confirmation flow

# 3. SOLICITAR CONFIRMACIÓN
⚠️ Se ejecutará:
   git push -u origin feat/skills

   Commits a publicar: 1
   ¿Ejecutar? (sí/no)

# 4. Usuario confirma con "sí"

# 5. Ejecutar
$ git push -u origin feat/skills
Enumerating objects: 15, done.
Delta compression using up to 8 threads
Writing objects: 100% (15/15), 3.45 KiB | 1.15 MiB/s, done.
To github.com:DIGITALIZART-STUDIO/conasin-frontend.git
 * [new branch]      feat/skills -> feat/skills
branch 'feat/skills' set up to track 'origin/feat/skills'.
```

## Escenario 5: Fallback sin gh CLI

**Usuario:** "crea el PR"

**AI:**
```bash
# 1. Verificar disponibilidad
$ command -v gh >/dev/null 2>&1 && echo "gh disponible" || echo "gh no disponible"
gh no disponible

# 2. Modo fallback - análisis con git
$ git log main..HEAD --oneline
abc1234 feat(git-guidelines): add gh cli support

$ git diff main...HEAD --stat
 .opencode/skills/git-guidelines/SKILL.md | 204 ++++++++++++++++++++

# 3. Sugerir acciones manuales
⚠️ GitHub CLI no está disponible.

Aquí está la información para crear el PR manualmente:

**Título sugerido:**
```
feat(git-guidelines): integrate GitHub CLI with confirmation flow
```

**Descripción sugerida (copia y pega en GitHub):**
```markdown
## Summary
Integra soporte para GitHub CLI (gh) en la skill de git-guidelines.

## Cambios
- 🎯 Detección automática de gh CLI
- 🔄 Flujo con confirmación para comandos remotos

## Commits
- abc1234 feat(git-guidelines): add gh cli support
```

# 4. Sugerir push con confirmación
⚠️ Para publicar cambios:
   git push -u origin feat/skills
   
   ¿Ejecutar? (sí/no)
```

## Escenario 6: Ver PR existente

**Usuario:** "muestra el PR actual"

**AI:**
```bash
# Usar gh para obtener información (no modifica nada - no requiere confirmación)
$ gh pr view --json number,title,state,url,author
{
  "author": {
    "login": "usuario"
  },
  "number": 25,
  "state": "OPEN",
  "title": "feat(git-guidelines): integrate GitHub CLI",
  "url": "https://github.com/DIGITALIZART-STUDIO/conasin-frontend/pull/25"
}

✅ PR #25 está ABIERTO

Título: feat(git-guidelines): integrate GitHub CLI
URL: https://github.com/DIGITALIZART-STUDIO/conasin-frontend/pull/25
```

## Escenario 7: Usar Template File Directamente

**Usuario:** "crea PR usando el template"

**AI:**
```bash
# 1. Verificar que el template existe
$ ls -la docs/PR_TEMPLATE.md
-rw-r--r-- 1 user user 2300 Feb  4 10:00 docs/PR_TEMPLATE.md

# 2. Analizar cambios para completar el template
$ git log main..HEAD --oneline
abc1234 feat(auth): add email verification

def5678 feat(users): update user profile

$ git diff main...HEAD --stat
app/components/AuthForm.vue    | 45 +++++++++++
app/composables/useAuth.ts    | 12 +++-
2 files changed, 54 insertions(+), 3 deletions(-)

# 3. Crear archivo de body del PR basado en el template
cat > /tmp/pr-body.md << 'EOF'
# PR: feat(auth): add email verification and user profile update

## 🎯 Resumen

Implementa verificación de email para nuevos usuarios y permite actualizar
el perfil de usuario con validaciones mejoradas.

---

## Frontend (`conasin-frontend`)

### Nuevas funcionalidades:
- 🔐 **Email Verification** - Componente para verificar email con token
- 📝 **User Profile Update** - Formulario para actualizar perfil de usuario
- 🎨 **UI Components** - Nuevos componentes de formulario reutilizables

### Archivos clave:

| Archivo | Cambio |
|---------|--------|
| `AuthForm.vue` | Nuevo componente de formulario con validación |
| `useAuth.ts` | Composable con métodos de autenticación |

---

## ✅ Testing

- [ ] Build exitoso
- [ ] Tests unitarios pasando
- [ ] Flujo verificado end-to-end

---

## 🔗 Links relacionados

- Branch: feat/auth-email-verification
- Base: main
EOF

# 4. Generar título del PR
Título: "feat(auth): add email verification and user profile update"

# 5. SOLICITAR CONFIRMACIÓN
⚠️ Se creará el PR usando el template docs/PR_TEMPLATE.md:

   Comando a ejecutar:
   gh pr create --base main \
     --title "feat(auth): add email verification and user profile update" \
     --body-file /tmp/pr-body.md

   El body del PR se ha generado basado en docs/PR_TEMPLATE.md
   
   ¿Ejecutar? (sí/no)

# 6. Usuario confirma con "sí"

# 7. Crear PR con el template
$ gh pr create --base main --title "..." --body-file /tmp/pr-body.md
https://github.com/DIGITALIZART-STUDIO/conasin-frontend/pull/26

✅ PR #26 creado exitosamente usando el template docs/PR_TEMPLATE.md
```

## Escenario 8: Verificar rama base antes de Push

**Usuario:** "haz push"

**AI:**
```bash
# 1. Detectar rama base
$ BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
$ echo $BASE_BRANCH
develop

# 2. Fetch y verificar actualización
$ git fetch origin develop --quiet
$ AHEAD=$(git rev-list HEAD..origin/develop --count)
$ BEHIND=$(git rev-list origin/develop..HEAD --count)
$ echo "AHEAD=$AHEAD, BEHIND=$BEHIND"
AHEAD=3, BEHIND=0

# 3. Verificar commits nuevos en la rama base
$ git log HEAD..origin/develop --oneline
def1234 fix(users): resolve session timeout issue
abc5678 feat(api): add rate limiting
ghi8901 docs: update api documentation

# 4. SOLICITAR ACCIÓN DEL USUARIO
⚠️  Tu rama está 3 commits ATRÁS de develop

Nuevos commits en develop:
- def1234 fix(users): resolve session timeout issue
- abc5678 feat(api): add rate limiting
- ghi8901 docs: update api documentation

¿Qué deseas hacer?
  1. Actualizar con rebase (git rebase origin/develop)
  2. Continuar con push (sin actualizar)
  
Selecciona opción (1 o 2):

# 5. Usuario selecciona opción 1 (rebase)
$ git rebase origin/develop
Successfully rebased and updated refs/heads/feat/skills.

# 6. Verificar estado después del rebase
$ git status
On branch feat/skills
Your branch is ahead of 'origin/feat/skills' by 6 commits.
  (use "git push" to publish your local commits)

# 7. Confirmar push
✅ Tu rama está actualizada con develop

⚠️ Se ejecutará:
   git push -u origin feat/skills
   
   Commits a publicar: 6 (incluyendo los 3 nuevos de develop)
   
   ¿Ejecutar? (sí/no)

# 8. Usuario confirma con "sí"
$ git push -u origin feat/skills
Enumerating objects: 150, done.
Delta compression using up to 12 threads
Writing objects: 100% (150/150), 25.4 KiB | 1.2 MiB/s, done.
To github.com:DIGITALIZART-STUDIO/conasin-frontend.git
   abc1234..def9999  feat/skills -> feat/skills
branch 'feat/skills' set up to track 'origin/feat/skills'.

✅ Push completado exitosamente
```

**Variante - Rama ya actualizada:**

```bash
# Caso cuando la rama base no tiene cambios nuevos
$ AHEAD=$(git rev-list HEAD..origin/develop --count)
$ echo $AHEAD
0

# Output amigable
✅ Tu rama está actualizada con develop

⚠️ Se ejecutará:
   git push -u origin feat/skills
   
   ¿Ejecutar? (sí/no)
```

## Resumen de Comandos por Categoría

### Información (no requieren confirmación)
- `gh auth status`
- `gh pr view`
- `gh pr list`
- `gh repo view`
- `git log`, `git diff`, `git status`

### Acciones (SIEMPRE requieren confirmación)
- `gh pr create`
- `gh pr merge`
- `gh release create`
- `git push`
- `git push --force` ⚠️⚠️⚠️

## Plantilla de Confirmación

```
⚠️ Acción requiere confirmación

Comando a ejecutar:
   <comando>

Impacto: <descripción del impacto>

¿Ejecutar? (sí/no)
```
