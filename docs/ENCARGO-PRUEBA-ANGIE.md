# Encargo de prueba — una escena para Angie

Este documento es el encargo completo para que **Angie produzca una escena sola**, siguiendo el flujo, sin
que nadie le explique el proyecto de viva voz. Es también la prueba final del método: si el encargo no alcanza,
el que está mal es el documento.

**Corte: 2026-11-05.** Skill: `skills/joyan-escenas/SKILL.md` (v1.4). Referencias vivas de la receta procedural:
`design-studies/visual-directions/skill-validation/run-3/scene-traza.mjs`.

---

## Qué tenés que producir

**«El nudo» — la escena del diagnóstico.** Primera de la serie de cuatro.

> Un acueducto en tres tramos. En el del medio, cinco o siete piezas demasiado juntas: puntos tan densos que se
> leen como mancha. Detrás, agua quieta; delante, cauce vacío. El nudo gira y **se destraba**; el agua arranca
> en oleadas y llena el canal. Termina con las piezas ordenadas a los costados.
>
> *Conclusión buscada:* «eso estaba trabado y ahora fluye».

Lectura completa de la serie: `docs/ESCENAS-SERIE.md`.

## Reglas que mandan

1. **Cada escena se entiende en tres segundos y sin una sola palabra.** Si necesita texto, la escena está mal
   pensada.
2. **Solo puntos.** La densidad es la única herramienta de peso; no se usa color para separar masas.
3. **La geometría sale del campo, no de una imagen importada.** Es la receta **2B** (procedural por capas), no
   la 2A.
4. **Lo humano es mínimo** (2–3 puntos) y la arquitectura es grande: la escala es el argumento.
5. **Prohibido:** robots, candados, medallas, engranajes, flechas. La tecnología se sugiere por comportamiento.
6. **Silencio:** donde no pasa nada, el campo baja a casi cero. El vacío es parte del dibujo.
7. **Encaje en la serie:** 16:9, cámara fija, mismo horizonte, luz fría de un lado, sin brillos especulares.

## Insumos

| Qué | Dónde |
|---|---|
| Método completo | `skills/joyan-escenas/SKILL.md` (v1.4) — leelo entero antes de empezar |
| Lenguaje visual aprobado | `docs/ESTETICA-CONSTELACION.md` |
| Motor real | `scripts/scene-src/engine.mjs` (`renderFrame`, `rasterize`, `sceneMetrics`, `COVERAGE`) |
| Escena de referencia con movimiento y eventos | `design-studies/visual-directions/skill-validation/run-3/scene-traza.mjs` |
| Serie completa | `docs/ESCENAS-SERIE.md` |

**No leas** `design-studies/visual-directions/skill-validation/` (corridas previas con hallazgos) ni
`odd/tasks/`: la prueba consiste en trabajar con el método, no con el historial.

## Manifiesto de encuadre (completalo antes de escribir código)

| Campo | Valor |
|---|---|
| Relación de aspecto | 16:9 |
| Resolución de entrega | 1600×900 (celda 8 px → retícula 200×112 o equivalente; declarala) |
| Política móvil | escala proporcional, sin recorte; el horizonte y el nudo quedan completos a 390 |
| `posterFrame` | el frame que mejor lea el nudo destrabado; anotalo |
| Uso final | ilustración de sección |
| Ciclo | declaralo (`cycleFrames` y `fps` → `T` en segundos) |

## Entregables

Todo en `design-studies/visual-directions/series/nudo/`:

1. `sketch.svg` — boceto previo, con `viewBox`, `data-aspect-ratio` y `data-mobile-policy`, más
   `sketch-390.png` capturado a 390.
2. `scene-nudo.mjs` — la escena 2B importando el motor real.
3. `bake-poster.mjs` + `poster.png` — fallback horneado con el mismo motor.
4. `check-skill.mjs` — las filas de la tabla de medición que Node puede medir, con sus aserciones.
5. `index.html` — página mínima con `data-state`/`data-hash`, póster visible por defecto.
6. `verify-browser.mjs` — verificador por estado, con `timeout`.
7. Capturas `1280`, `390` y **sin JS**.
8. `RESULTADO.md` — veredicto por fila con número y evidencia.
9. `HUECOS.md` — lo que el método no te dijo y tuviste que resolver vos.

## Tabla de medición (umbrales)

| Qué | Umbral |
|---|---|
| Legibilidad | reconocible sin texto en 3 s, por alguien que no participó |
| Contraste (si hay texto encima) | ≥ 4,5:1 con luminancia WCAG |
| Determinismo | dos corridas independientes, byte-idénticas |
| Coste | mediana y p90 ≤ 16,67 ms en Node y en navegador |
| Saturación | < 5 % de celdas en el último peldaño, con control no vacío y control al 100 % |
| Sin JS | nunca un rectángulo vacío; el póster es el fallback |
| Loop | envolvente cero en los dos extremos; continuidad medida en secuencia, no entre renders |

## Cómo se considera terminada

Una escena está terminada cuando **todas las filas de la tabla tienen veredicto**, no cuando se ve linda. Si
una fila no se puede medir, se entrega como pendiente con su razón: eso es un resultado válido. **La legibilidad
la certifica otra persona**, no quien hizo la escena.

## Qué no se toca

`scripts/scene-src/*` (el motor), la constelación aprobada, `docs/`, `odd/tasks/`, y las otras tres escenas de
la serie. Si el motor no alcanza, se anota como hueco: no se modifica.

## Qué nos tenés que devolver

1. La escena verificada con su tabla completa.
2. `HUECOS.md`: qué le faltó al método, qué te hizo perder tiempo, qué tuviste que decidir sin criterio.
3. Si tocaste algo fuera de `series/nudo/`, decilo explícitamente.

Los huecos son el resultado más valioso de esta prueba: si el flujo se rompe, se corrige el flujo, no se
improvisa la escena.
