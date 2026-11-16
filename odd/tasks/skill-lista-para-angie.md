# Skill lista y encargo de prueba para Angie

Dejar `skills/joyan-escenas` **mejorada y validada de verdad** y el encargo de la escena de prueba listo, para
que Angie pueda probar el flujo trabajando en una escena sin depender de nosotros.

## Specs

- **S1.** «trabajar en mejorar y validar correctamente la skill de joyan escenas antes de pasarle a angie las tareas»
- **S2.** «osea todo debe de estar listo lo que anotamos para que angiue pruebe trabajando en una escena»
- **S3.** «sonbre images y eso no te preocupes eso sera en otra sesion no aqui» — el brief de imágenes queda
  fuera de alcance: ya está escrito y no se trabaja acá.
- **S4.** «vamos sigamos con tu recomendacion continuemos» — la recomendación del orquestador: cerrar el
  lenguaje antes del puerto, y verificar la skill antes de delegar.

## Contexto

I-16 (2026-11-03) validó la skill en dos corridas y publicó las enmiendas v1.2. Pero **v1.2 nunca se probó**:
las enmiendas nuevas (receta de póster, señal `ready`/`error`, benchmark pineado, saturación ejecutable,
protocolo de evaluador ciego, política móvil) se escribieron después de la única corrida exitosa, que corrió
sobre v1.1. Una skill cuyo último cambio nadie ejecutó sigue siendo una hipótesis.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|---|---|---|---|---|
| T1 | Registrar las dos skills de escenas en las tablas de `AGENTS.md` (descubribilidad) | S1, S2 | inline | chore(skills) |
| T2 | Tercera corrida en frío sobre v1.2: comprobar que las enmiendas nuevas se pueden ejecutar | S1 | worker | feat(skills) |
| T3 | Enmendar lo que destape T2 y fijar la versión final | S1 | inline | feat(skills) |
| T4 | Encargo de prueba para Angie: escena, insumos, umbrales y entregable | S2 | inline | docs(skills) |
| T5 | Cerrar la referencia que Angie necesita (escena aprobada + cómo se mide) | S2 | inline | docs |
| T6 | I-17 · difuminado de capas al enfocar como sistema | S4 | worker | feat(design-system) |
| T7 | I-18 · jueces ciegos sobre la constelación | S4 | jueces | docs |

## Evidencia

### T1 · Registro de skills — 2026-11-05

`./skills/skill-sync/assets/sync.sh` regeneró la tabla Auto-invoke de `AGENTS.md` e incorporó `joyan-escenas`
y `scene-iteration`, que **no aparecían**; se agregaron además a la tabla de Skills Disponibles con su ruta.
Sin esto, un agente nuevo no encuentra la skill.

### T2 · Tercera corrida en frío (v1.3, escena «La traza») — 2026-11-05

Worker sin historial, escena distinta de la anterior y con eventos (la cadena que se enciende).
`design-studies/visual-directions/skill-validation/run-3/`.

| Fila §4 | Veredicto | Número |
|---|---|---|
| Legibilidad | **PASS** (evaluador ciego) | «secuencia de nodos conectados... un camino con un recorrido claro» |
| Contraste | OK | 16,26:1 (WCAG); 12,03:1 con `luma()` del motor |
| Determinismo | OK | digest de líneas idéntico en 2 procesos; PNG idéntico en 2 bakes; canvas = Node |
| Coste Node | OK | mediana 12,23 · p90 12,85 · peor 14,19 · frío 30,58 ms |
| Coste navegador | OK | mediana 12,10 · p90 13,00 · peor 14,50 · frío 15,20 ms |
| Saturación | OK | 0,67 % (peor frame 168: 134/20000); controles 38,14 % y 100,00 % |
| Sin JS | OK | póster 1600×800, diff media 0,4/255, nunca vacío |

**La corrida encontró que la enmienda de §1 fallaba**: el comando de captura **recortaba** un boceto 2:1
(390×320 sobre un SVG 2:1). Es el tipo de defecto que sólo aparece ejecutando.

### T3 · Enmiendas v1.4 — 2026-11-05

12 huecos confirmados y corregidos en `skills/joyan-escenas/SKILL.md`:

1. §1 · el SVG declara `viewBox` + `width/height 100%` + `preserveAspectRatio`, y aspecto/política móvil van
   como `data-aspect-ratio`/`data-mobile-policy`; se documenta el recorte medido.
2. §1 · `chromium` no está en PATH: se resuelve con `command -v`; `TMPDIR=.` deja `org.chromium.*`.
3. §2B · la ruta del import se declara y se verifica con un `node -e`.
4. §2B · `groundTone`/`maxTone` salen de `sceneMetrics()`, no se inventan; aviso de `density > 1`.
5. §2B · coste de `field()`: tablas precomputadas y memo por `time` (medido: inline cuesta +12,42 ms).
6. §2B · póster con `sharp` y `scene.posterFrame` pineado; «pintura válida» definida.
7. §4 · contraste con luminancia WCAG (se reportan las dos).
8. §4 · «frame frío» = primera llamada del proceso; el primer pintado no es comparable.
9. §4 · el último peldaño se lee de la cobertura exportada, nunca del máximo observado.
10. §4 · hash = sha256 del `getImageData`; sin JS la señal queda en `loading` por diseño.
11. §4 · los servidores no están levantados por defecto: comando explícito.
12. §7 · manifiesto de encuadre obligatorio en el encargo.

### T4 · Encargo de prueba — 2026-11-05

`docs/ENCARGO-PRUEBA-ANGIE.md`: escena «El nudo», manifiesto de encuadre, insumos, reglas, tabla de medición,
qué no se toca y qué devolver. Es la prueba final del método: si el encargo no alcanza, el que está mal es el
documento.

## Log

- **L1** (2026-11-05, verbatim): «vake sobre los issues que comentas que faltan me gustaria trabajarlos y tambien
  trabajar en mejorar y validar correctamente la skill de joyan escenas antes de pasarle a angie las tareas ,
  osea todo debe de estar listo lo que anotamos para que angiue pruebe trabajando en una escena , sonbre images
  y eso no te preocupes eso sera en otra sesion no aqui solo queria el promt para hacerlo con el contexto del
  proyecto , bueno vamos sigamos con tu recomendacion continuemos»
- **2026-11-05 · T1–T4 cerradas.** Skills registradas en `AGENTS.md`; tercera corrida en frío sobre «La traza»
  con las 8 enmiendas puestas a prueba (una falló y se corrigió); v1.4 publicada con 12 huecos; encargo de
  Angie listo. La legibilidad la certificó un evaluador ciego, no el autor.
