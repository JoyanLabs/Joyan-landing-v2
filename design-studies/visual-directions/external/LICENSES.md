# Skills externas — origen y licencia

Material descargado **solo para estudio**: se lee, se prueba y se descarta. No entra al build, no se importa desde `src/` ni desde `scripts/`, y no se redistribuye con el producto.

| Carpeta / archivo | Origen | Licencia |
| --- | --- | --- |
| `codemap/` | https://github.com/beadnall/codemap | MIT (Copyright © 2026 Charles Beadnall) |
| `iso-topology/` | https://github.com/MarkovWangRR/iso-topology | Apache 2.0 |
| `anthropic-frontend-design.SKILL.md` | https://github.com/anthropics/skills (`skills/frontend-design`) | Términos completos en el `LICENSE.txt` del repositorio de origen — **no verificada localmente** |
| `anthropic-webapp-testing.SKILL.md` | https://github.com/anthropics/skills (`skills/webapp-testing`) | Ídem: `LICENSE.txt` del origen — **no verificada localmente** |

## Qué se toma y qué no

**Se toma el método:** verificación con navegador real (capturas, consola, estados), auditoría de consistencia, y el concepto de *datos como puntos que recorren aristas*.

**No se toma el estilo:** frosted glass, glow, neón ni diagramas de producto ajenos. Nuestra identidad es la de `docs/DESIGN.md`; estas piezas no la sustituyen.

## Reglas

1. Nada de esta carpeta se copia a `src/` sin reescribirlo en nuestro lenguaje y con su licencia verificada.
2. Los `.git` se eliminaron para no arrastrar historia ajena; si hace falta actualizar, se vuelve a bajar.
3. Si alguna pieza se adopta de verdad, se registra en `scripts/scene-src/adoption-ledger.json` con su licencia, igual que se hizo con `ascii.rest`.
