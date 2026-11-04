# I-16 · Validación en frío de la skill `joyan-escenas`

Un agente **sin el historial de iteración** debe poder producir una escena usable siguiendo **sólo**
`skills/joyan-escenas/SKILL.md`. Un flujo que no se probó no es un método: es una hipótesis con formato de
documento. Si el flujo falla, **se corrige la skill, no se improvisa la escena**.

## Specs

Cada spec cita `docs/ISSUES.md` I-16 verbatim.

- **S1.** «Una escena nueva producida **solo** con la skill, verificada con su tabla de medición»
- **S2.** «más una lista de los huecos encontrados en el flujo publicada como enmiendas a la skill»
- **S3.** «Si el flujo falla, se corrige la skill, no se improvisa la escena»
- **S4.** «Si una persona o agente **sin el historial de iteración** puede producir una escena usable
  siguiéndola; qué pasos faltan o sobran; si la tabla de medición alcanza para decidir sin nosotros; qué
  trampas nuevas aparecen al usarla en frío»

## Escena de prueba: «El confín» (S4)

Elegida del inventario aprobado (`odd/tasks/escenas-del-espacio.md`) porque es la más chica y **no** forma
parte de la serie de cuatro que es tarea de Angie. Encargo según §7 de la propia skill:

- **Boceto:** lo produce el agente (SVG, regla de los tres segundos).
- **Escena:** pocos nodos, casi estáticos; deriva lenta; sin interacción. Uso final: cierre de página (footer).
- **Umbrales:** los de la tabla §4 de la skill (contraste ≥ 4,5:1, determinismo byte-idéntico, coste ≤
  presupuesto de cadencia, saturación < 5 %, sin JS nunca un rectángulo vacío).
- **Fuentes y licencias:** sin assets externos; campo procedural declarado por capas.
- **Qué no se toca:** el motor (`scripts/scene-src/*`), la constelación aprobada, la serie de cuatro escenas,
  y nada dentro de `docs/` ni `odd/tasks/` (el agente no lee el historial).

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|---|---|---|---|---|
| T1 | Producción en frío por worker sin historial: boceto → escena → tabla de medición → reporte de huecos | S1, S4 | worker | — |
| T2 | Verificación del orquestador: re-correr los checks del worker y mirar las capturas | S1 | inline | — |
| T3 | Enmiendas a la skill con los huecos confirmados | S2, S3 | inline | feat(skills) |

## Evidencia

### T1a · Primera corrida en frío (skill v1.0) — FALLA VÁLIDA, parada en §2

- Worker sin historial (`design-studies/visual-directions/skill-validation/`, raíz): produjo el boceto
  (revisado a 390 px con captura real de Chromium) y **paró en §2** con el bloqueante documentado: la skill
  no tiene rama para campos procedurales — `convert()` sólo decodifica imágenes (`from-image.mjs:85`) y
  `serializeScene` exige `scene.converted` (`image-pipeline.mjs:655`), mientras `renderFrame` evalúa
  `scene.field(x, y, time)` (`engine.mjs:523`). 10 huecos numerados en `HUECOS.md`, veredicto §4:
  6× NO MEDIBLE. No se improvisó nada: la parada fue el resultado correcto.

### T1b · Segunda corrida en frío (skill v1.1 enmendada) — ESCENA PRODUCIDA

- Worker nuevo, sin historial, sin leer la corrida 1 (`skill-validation/run-2/`): siguió la receta 2B
  nueva y produjo la escena completa. `check-skill.mjs`, `bake-poster.mjs` y `verify-browser.mjs`
  re-corridos por el orquestador: **exit 0 los tres**.
- §4: determinismo **PASS** (dos procesos, 160.849 bytes idénticos en 10 frames), coste **PASS** (Node
  10,1/11,4 ms mediana/p90; Chromium 14,3–15,0 ms), saturación **PASS** (0 % en 720 frames, control
  saturado 100 %), sin JS **PASS** (póster del mismo motor, 584 px distintos del suelo), contraste **no
  aplica** (escena sin texto).
- Huecos restantes H1–H7 en `run-2/HUECOS.md`; las enmiendas que funcionaron están listadas al final.

### T2 · Verificación del orquestador

- Bloqueante de la corrida 1 verificado contra el código del motor (firmas citadas arriba).
- Los tres chequeos de run-2 re-ejecutados por el orquestador: verde.

### T3 · Enmiendas y evaluador ciego (skill v1.2)

- H1–H7 publicados como enmiendas v1.2 (`skills/joyan-escenas/SKILL.md`): protocolo de evaluador
  independiente ciego, contrato espacial/tonal del campo (`x/y` en celdas, escalar en espacio tonal del
  motor), horneado de póster con `rasterize`, señal `data-state=ready/error` + hash, benchmark pineado
  (60 calentamiento + 240 muestras, frío aparte), saturación ejecutable con control no vacío, política
  móvil declarada antes de aprobar composición.
- **Evaluador ciego (jd-judge-a, sin contexto):** «cuatro grupos de puntos brillantes flotando... una
  línea de puntitos tenues hace una curva suave abajo, como una loma u horizonte»; composición
  reconocible, sin texto. Coincide con el sujeto aceptable definido antes de la prueba → **legibilidad
  PASS** (marginal: vacío dominante, que es el diseño del confín).

## Log

- **L1** (2026-11-03, verbatim): «dale si arranquemos esta s prerequisitos dale» — arranca I-16, prerrequisito
  de las tareas de Angie (serie de escenas e I-10 Arequipa).
- **2026-11-03 · T1–T3 cerradas.** Corrida 1: skill v1.0 falla en frío (bloqueante procedural, 10 huecos).
  Corrida 2 con v1.1: escena producida y §4 verificada (T2 incluida). Enmiendas v1.2 + evaluador ciego
  cierran la legibilidad. I-16 queda cerrada; la escena de run-2 queda como segunda referencia procedural.
