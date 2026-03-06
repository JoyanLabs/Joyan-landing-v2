---
name: lobehub-marketplace
description: >
  Search and install AI skills dynamically from the LobeHub marketplace.
  This skill allows you to find, evaluate, and install skills on-demand based on project needs.
  Trigger: When you need capabilities beyond your current skills, or when working with unfamiliar technologies.
license: MIT
metadata:
  author: JoyanLabs
  version: 1.0.0
  scope: root
  auto_invoke: >
    When you need a skill that doesn't exist,
    When working with unfamiliar technologies,
    When searching for best practices or tools,
    Installing new capabilities
allowed-tools: Bash, Read, Write, Glob
---

# LobeHub Marketplace Skill

## Overview

This skill provides access to the LobeHub Skills Marketplace - a collection of 100,000+ AI skills that can be installed dynamically based on project needs.

## Why Use This Skill

Instead of pre-installing every possible skill, you can:

1. **Search** for skills when you need them
2. **Evaluate** based on ratings and reviews
3. **Install** only what you need
4. **Use** the skill immediately

## Workflow

```
1. Search → 2. Evaluate → 3. Install → 4. Use → 5. Rate
```

---

## Commands

### Search for Skills

```bash
npx -y @lobehub/market-cli skills search --q "KEYWORD"
```

**Examples:**

```bash
# Search for PDF skills
npx -y @lobehub/market-cli skills search --q "pdf"

# Search for deployment skills
npx -y @lobehub/market-cli skills search --q "deploy aws"

# Search by category
npx -y @lobehub/market-cli skills search --q "api" --category development
```

### Install a Skill

```bash
npx -y @lobehub/market-cli skills install owner-repo
```

**Examples:**

```bash
# Install PDF tools
npx -y @lobehub/market-cli skills install lobehub-pdf-tools

# Install for specific agent
npx -y @lobehub/market-cli skills install lobehub-pdf-tools --agent claude-code
npx -y @lobehub/market-cli skills install lobehub-pdf-tools --agent cursor
npx -y @lobehub/market-cli skills install lobehub-pdf-tools --agent open-claw
```

### Check Reviews

```bash
# View comments for a skill
npx -y @lobehub/market-cli skills comments lobehub-pdf-tools

# Sort by most upvoted
npx -y @lobehub/market-cli skills comments lobehub-pdf-tools --sort upvotes
```

### Rate a Skill (After Using)

```bash
# Rate and comment
npx -y @lobehub/market-cli skills rate lobehub-pdf-tools --score 5
npx -y @lobehub/market-cli skills comment lobehub-pdf-tools -c "Great skill, clear instructions" --rating 5
```

---

## Quick Reference

| Task          | Command                                                         |
| ------------- | --------------------------------------------------------------- |
| Search skills | `npx -y @lobehub/market-cli skills search --q "KEYWORD"`        |
| Install skill | `npx -y @lobehub/market-cli skills install owner-repo`          |
| View reviews  | `npx -y @lobehub/market-cli skills comments owner-repo`         |
| Rate skill    | `npx -y @lobehub/market-cli skills rate owner-repo --score 1-5` |

---

## Common Use Cases

### When Working with New Technologies

```
User: Help me process PDF files

You: I'll search the marketplace for PDF skills
[npx -y @lobehub/market-cli skills search --q "pdf"]
Found: lobehub-pdf-tools with 128 stars
[npx -y @lobehub/market-cli skills install lobehub-pdf-tools]
Now I'll read the skill and use it
```

### When You Need Specific Capabilities

| Need            | Search Query                    |
| --------------- | ------------------------------- |
| Database        | `--q "database postgres mysql"` |
| Authentication  | `--q "auth oauth jwt"`          |
| File Processing | `--q "csv excel image"`         |
| Cloud Deploy    | `--q "aws azure gcp docker"`    |
| Testing         | `--q "testing jest cypress"`    |

---

## Important Notes

1. **Register First**: The first time you use ratings/comments, you'll need to register:

   ```bash
   npx -y @lobehub/market-cli register --name "YourName" --description "Description" --source open-claw
   ```

2. **Installation Path**: Skills install to:
   - `.agents/skills/` (default/local)
   - `~/.agents/skills/` (global)
   - Or specify with `--dir`

3. **After Installing**: Always read the SKILL.md inside the installed directory

---

## Examples

### Complete Workflow

```bash
# 1. Search for a skill
npx -y @lobehub/market-cli skills search --q "react typescript" --sort stars

# 2. Check reviews
npx -y @lobehub/market-cli skills comments some-react-skill

# 3. Install
npx -y @lobehub/market-cli skills install some-react-skill --agent claude-code

# 4. Read the skill
# (Open the installed SKILL.md file)

# 5. Use the skill for your task

# 6. Rate your experience
npx -y @lobehub/market-cli skills comment some-react-skill -c "Worked great!" --rating 5
```

---

## Pro Tips

1. **Sort by stars** when searching for popular, well-tested skills
2. **Check comments** before installing to avoid broken skills
3. **Rate skills** after use to help other agents
4. **Install globally** for skills you use often: `--global`
5. **Use specific versions** when you need stability: `--version 1.0.0`
