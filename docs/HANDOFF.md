# Handoff — Joyan landing · lenguaje de la constelación

**Fecha de corte:** 2026-11-03 · **Estado:** árbol commiteado y publicado en `origin/test/motion-graphics`;
plan vigente = **lenguaje de la constelación primero** (aprobado 2026-10-29); delegación a **Angie** preparada.
Este documento reemplaza al handoff del 2026-10-25. Se lee antes de tocar nada.

---

## 1 · Qué cambió desde el handoff anterior

| Cambio | Fecha | Detalle |
|---|---|---|
| **Cambio de plan** | 10-29 | En vez de cerrar la página, se **afina el lenguaje** y después se construyen las piezas con él. El texto queda fuera de alcance: **todo lo escrito hasta ahora se descarta**, incluida la copia (`odd/tasks/plan-lenguaje-constelacion.md`) |
| **Arquitectura nueva** | 10-29 | La página **no tiene secciones hacia abajo**: el hero es la página y se navega **interactuando con nodos en planos de profundidad**. Las secciones pasan a ser **planos del campo**, no bloques apilados. El mapa de ocho secciones queda como referencia de método |
| **Paleta cerrada** | 10-30 | La oscura actual: base `#020405`, tinta `#B4CABE`. La B (capas visibles) y las dos claras (C, D) **rechazadas**. El papel se replantea más adelante |
| **Tipografía decidida** | 10-29 | **Michroma** sólo en h1, **Archivo** en h2/póster y lectura (`docs/DECISION-TIPOGRAFIA.md`) |
| **WU108 cerrado** | 10-28 | Motor vuelto a primitiva de suelo oscuro; contrato pineado en `check-engine-surface.mjs` (5/5) |
| **WU117 cerrado** | 10-28 | Perfil `joyan-sol` pineado al repo |
| **Constelación volumétrica entregada** | 10-30/31 | Capas, paralaje 0,18/0,52/1,00, 35/35 nodos accionables, profundidad de campo real, cadencia de blur 2,1× mejorada |
| **Hallazgos de la v1 cerrados** | 10-28 | WU119: rótulo «suelo», CTA `mailto:hello@joyan.dev`, frase de L4 propagada; queda una iteración de papel abierta (§4) |
| **Repo preparado para delegar** | 11-03 | Todo el trabajo del 10-25 en adelante commiteado en rebanadas revisables y pusheado; HANDOFF/ISSUES al día |

## 2 · Qué está verificado hoy (medido, no reportado)

| Pieza | Estado | Evidencia |
|---|---|---|
| Capas del hero (cielo, lavado, figura, viñeta, núcleos) | Aprobado | 4–8 tonos, halo 4,2–7,4 %, viñeta 1,000/0,928/0,773 — `docs/ESTETICA-CONSTELACION.md` |
| Paralaje en 3 planos | Aprobado | cielo 0,18 / lavado 0,52 / figura 1,00 |
| Nodos accionables | Aprobado | 35/35 por click/tap/teclado en 3 anchos × 2 suelos, foco 2,5 px |
| Transición al enfocar | Aprobado | 1200 ms interrumpible, vuelta a los 7000 ms, `Escape`; reduced-motion con corte |
| Profundidad de campo real | Aprobado | cielo 6 px, lavado 2,5 px, figura 0 px; misma curva que la cámara; medido por computed style |
| Cadencia del blur | Aprobado | 18,1 ms medios en 1440 papel (era 38,4; 2,1×): blur horneado en dos extremos + crossfade; 768/390 en 16,67 ms |
| Póster / LCP | Hecho | 53.931 bytes, LCP en 6/6 casos |
| Motor: bayer2 + densidad + contrato | Verificado | `check-engine-dither.mjs` 12/12, `check-engine-surface.mjs` 5/5 |
| Auditoría del motor (WU19) | Verificado | `docs/AUDITORIA-ESCENAS.md`; cada número se re-mide en `scripts/check-audit.mjs` |

## 3 · Plan vigente y colas de trabajo

### Trabajo nuestro (afinar antes de que Angie produzca en serio)

1. **I-16 · Validar la skill `joyan-escenas` en frío.** Un agente **sin el historial de iteración** debe poder
   producir una escena usable siguiéndola. Si falla, se corrige la skill, no se improvisa la escena.
   Es el **prerrequisito** de las tareas de Angie.
2. **Difuminado de capas al enfocar como sistema.** Primera versión hecha; es lo que más gustó y hay que
   volverlo parte del lenguaje (`docs/ESTETICA-CONSTELACION.md` manda: lo que no esté ahí no es lenguaje).
3. **Jueces sobre la constelación** (bloque A1 del plan de lenguaje): no corridos todavía.
4. **Papel replanteado.** Rechazado por manchas pardas; el recorte del lavado dejó el campo de puntos de papel
   casi invisible. El dial está en la amplitud del lavado (hoy 0,0298) y la densidad de tinta.

### Tareas delegadas a Angie (referencia + contrato)

- **Serie de las cuatro escenas** (`docs/ESCENAS-SERIE.md`): el nudo, la máquina habitada, la llave, el registro.
  Regla que manda: cada escena se entiende en tres segundos y sin una sola palabra. Empieza **después** de I-16.
- **I-10 · Arequipa, de mapa a constelación**: datos con licencia (OSM/ODbL u otras), CSV/GeoJSON reducido y
  versionado, y una escena que se lea como Arequipa y no como textura.

Angie trabaja con la **skill `joyan-escenas`** + la **escena de referencia terminada y verificada**
(la constelación volumétrica) y lee `docs/ESTETICA-CONSTELACION.md` antes de dibujar nada.

### Vuelven cuando se toque `src/` (fundaciones del puerto, sin fecha)

- **WU104 · Presupuesto:** ~21,3 KiB de JS nuevo contra 13,5 KiB de holgura del pin.
- **WU105 · Contratos del sitio:** `WU20_BUILT_PAGES`, `WU20_PAGE_CONTRACT`, `LANDING_FROZEN_HASHES` se mueven
  en el mismo commit y re-midiendo, nunca en silencio.
- **WU106 · Un solo dueño** de inversión y bake; el póster sigue siendo el LCP.
- **WU101/I-12 · 60 fps sostenidos** medidos en la página, con distribución y umbral fijado.
- **WU107 · Superficie**, **WU109 · costura 6e**, **WU102 · reproducibilidad** (la evidencia del 10-25 ya viaja
  en commits; `dist-motion*` sigue ignorado a propósito).

## 4 · Decisiones ya tomadas (no reabrir sin motivo)

Además de la tabla del handoff anterior (look propio, no WebGPU, firma, notas fuera, escenarios rotulados,
conversaciones sin publicar, celda entera + `pixelated`, Ley 31814):

| Tema | Decisión | Por qué |
|---|---|---|
| Plan | Lenguaje de la constelación primero | Las piezas se construyen con el vocabulario ya aprobado |
| Estructura | Sin secciones apiladas: planos del campo | Navegación por nodos y profundidad |
| Texto | Descartado hasta nuevo aviso | Se piensa después del lenguaje |
| Paleta | Oscura cerrada (`#020405` / `#B4CABE`) | Las otras tres candidatas rechazadas |
| Tipografía | Michroma (h1) + Archivo (resto) | Jerarquía que se lee (probada a dos escalas) |
| Serie de escenas | Cuatro escenas, campo por celda, sin color para separar masas | `docs/ESCENAS-SERIE.md` |

## 5 · Trampas conocidas (las que siguen vivas)

1. **Un escritor por archivo.** Dos tareas que tocan el mismo módulo van en serie.
2. **`EVENT_WINDOWS` es un objeto de fases normalizadas**, no un array de segundos.
3. **Doble inversión.** La paleta `paper` del pipeline ya va de crema a tinta: **no** se le pasa
   `groundMode:'light'`. La inversión vive en el consumidor, una sola vez.
4. **El motor es una primitiva de suelo oscuro** (WU108, contrato pineado). Sobre paleta papel colapsa a paso 0
   **por diseño**; la normalización es del consumidor.
5. **Sondas de póster desactualizadas** (`wu93/wu94/wu97`): esperan `data-warm="both"`, no `[data-register]`.
6. **Presupuesto de tiempo por contrato.** La suite completa tarda ~10 min; no se corre en bucle.
7. **Ruido del host.** Se afirma sobre mediana y p90; la media se reporta, no se usa para decidir.
8. **Nunca se empieza por el campo procedural.** Boceto barato primero (skill `joyan-escenas`, §1).
9. **WU19 #7 (textura en zonas planas)** sigue abierto y requiere decisión humana: tocarlo re-mide el pin.

## 6 · Cómo verificar

```bash
# motor: dithers y densidad (12/12)
node scripts/check-engine-dither.mjs
# contrato de suelo oscuro (5/5)
node scripts/check-engine-surface.mjs
# auditoría del motor: los números del doc se re-miden
node scripts/check-audit.mjs

# servidores de estudio: 4402 sirve design-studies/visual-directions
# 4403 sirve la RAÍZ del repo (necesario para páginas que importan el motor)
python3 -m http.server 4402 --bind 0.0.0.0 --directory design-studies/visual-directions
python3 -m http.server 4403 --bind 0.0.0.0 --directory .
```

**Nota:** una página que importa `scripts/scene-src/*` **sólo funciona desde 4403**. Desde 4402 el canvas
sale negro — no es un bug del render.

## 7 · Contexto de orquestación

- Perfil **`joyan-sol`** pineado a este repo (`.git/gentle-ai/profile-pin.json`): orquestador y verify
  `nan/deepseek-v4-flash` **high**; worker `openai/gpt-6.1-sol` **high**; explore `nan/glm5.3-flash` high;
  jueces `glm5.3-flash` y `qwen3.8-flash`. **`opencode-go` prohibido** (proveedor inexistente).
- Alta idempotente vía `scripts/setup-joyan-sol-profile.py` (con backup; el store está protegido por guard).
- El pin rige para sesiones nuevas; la sesión corriente adopta el perfil en `/gentle:profiles`.
