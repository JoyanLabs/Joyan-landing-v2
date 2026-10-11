# Plan · Iteración de dither y motion a `main`

> **Estado actual (2026-10-10):** cierre local WU10 histórico; WU12 añade ahora una
> escena visible en modo normal con evidencia del writer. Cierre ODD/commit pendiente del padre.
> **No integrado en `main`; branding e integración real siguen pendientes.**
> **Rama de origen:** `test/motion-graphics`; los 14 commits y +3 817 / −238 en 49 archivos
> describían el inventario inicial, no el árbol actual.
> **Este documento decide el orden y el corte. No decide el arte.**
> Fuentes: `docs/GUIA-MOTION.md` (método y aprendizaje), `odd/tasks/dither-look-spike.md`
> (registro del spike), `docs/DESIGN.md` (contrato visual), y la dirección canónica en
> `joyanlabs-plan` (`docs/JOYAN_DIRECTION_2026.md`, `docs/landing/LANDING_AUDIT_2026-08-09.md`).

---

## 1. Objetivo y no-objetivos

**Objetivo.** Llevar a `main` el efecto de halftone ordenado —la prueba está cerrada y
funciona— integrado en las superficies donde aporta, con assets generados por nosotros y
sin arte genérico, cortado en candidatos revisables.

**No-objetivos, explícitos:**

- **Aplicar el dither encima de los cinco films de argumento.** Probado y rechazado con
  evidencia a 1:1 (pierde el ámbar reservado, rompe los trazos, entrama todo el frame,
  +34 % de bytes). Esos films se quedan como están.
- **JavaScript de cliente para el look.** Todo horneado. El presupuesto de
  `check-iteration-3.mjs:78` (22 KiB de delta gzip contra
  `.artifacts/iteration-2-client-js.json`, 91 905 bytes de base) no se toca.
- **Adoptar `ascii.rest` como dependencia.** Es la referencia técnica, no el producto:
  su arte es de otro y sus piezas son genéricas para nosotros. La técnica se reimplementó.
- **Renombrar nada de marca.** Tagline, casing de MAGI, identidad de Lanza y
  `Powered by MAGI · Built by Joyan` siguen pendientes de branding y no entran acá.
- **Generar assets en build time.** `docs/DESIGN.md` manda pre-horneado y commiteado;
  meter Playwright en el camino de deploy es un cambio de política, no un detalle.

---

## 2. Dónde estamos, y las dos cosas que condicionan todo

### 2.1 La rama mezcla dos cosas que la secuencia canónica quiere separadas

La dirección canónica define una secuencia de PRs (issue #13, umbrella):

| PR | Contenido | Estado en la rama |
|---|---|---|
| A | Corrección narrativa y base segura | **Parcialmente hecho** (`529a264` copy, i18n) |
| B | Arquitectura de información (secciones nuevas, Lanza, CTA configurable, paridad ES/EN) | **No hecho** |
| C | Copy aprobado por branding y pulido visual, **incluye «refinamiento de dither/motion»** | **Adelantado en la rama** (`16ac030`, `073c3db`, `1bea6ce`, `b905575`, `3efa702`…) |
| D | CTA comercial / design partner | **No hecho** |

O sea: **nuestro trabajo es PR C, y está adelantado respecto de A y B.** Además
`JOYAN_DIRECTION_2026.md:1720` dice «No implementar copy definitivo hasta revisión de
branding». Esto no es un detalle de proceso: es la decisión más grande de este plan, y
está en la sección 3 como **D5**.

### 2.2 La rama entera nunca fue revisada, y quedó así por decisión explícita

El preflight nativo de review falló con `lens_context_budget_exceeded` en `phase:
preflight`: la evidencia de las lentes excede el presupuesto de contexto, la evidencia
inmutable **nunca se trunca**, y «retrying this exact candidate cannot succeed». No se creó
autoridad y no se mutó nada. El proveedor ofrecía dos continuaciones: reducir el alcance, o
que el dueño del repo apague el switch.

Se eligió la segunda. Lo que sigue es el registro de qué pasó, qué implica y qué deja de
aplicar, porque el corte de la sección 4 ya no se apoya en un presupuesto nativo.

**Y es terminal por candidato, no transitorio.** El `next_action` fue `stop`, y el modo de
falla es monótono: verifiqué con dos
preflights consecutivos que el `base-ref` es el mismo (`2d13d13`, o sea `main`), que el
`base_tree` es el mismo, y que el árbol del candidato **sólo avanzó** —un path más entre una
corrida y la otra—. Un superconjunto de un rango que ya excede el presupuesto también lo
excede, así que reintentar era ejecutar a sabiendas algo declarado imposible.

**Consecuencia elegida por el humano:** RDD quedó **desactivado para este clon**
(`gentle-ai review mode disable --scope clone` → `clone-local: off`, `global: unset`). No hay
receipt y no va a haberlo: la entrega se decide por política ordinaria, y `commit`, `push`,
PR y merge son decisiones del dueño del repo. El override es local al clon, así que ningún
otro repositorio lo hereda.

**Lo que NO cambia, y ahora importa más:** sin gate automático, lo único que impide que
material de PR A (el copy narrativo) llegue a `main` sin la revisión de branding que pide
`JOYAN_DIRECTION_2026.md:1720` sigue siendo la política del dueño: WU10 añade un gate
**local de rutas**, no una barrera automática de CI ni aprobación semántica. **D5 sigue
siendo «qué nos protege ahora».**

**Lo que sí cambia:** el corte en candidatos deja de ser una imposición del presupuesto
nativo y vuelve a ser lo que es en el resto del repo — una cuestión de **carga de revisión
humana**. Sigue valiendo partir por unidad de trabajo y mantener los binarios separados del
código (es lo que dicen los skills `work-unit-commits` y `chained-pr` del propio proyecto),
pero ya no hay ningún número que medir, y la regla «cada recorte en su propio rango» era
mecánica del facade: sin RDD no hace falta una rama por slice.

**Hipótesis que queda sin medir, y ya sin forma de medirla:** que el peso del candidato sean
los binarios (`public/assets/motion/`, 10 MP4, ~860 KB, el mayor `harness-outcome.mp4` de
198 422 bytes) más los 3 817 renglones de texto. Queda anotado porque explica **por qué la
rama no era revisable como unidad**, no porque haya que actuar sobre él.

---

## 3. Decisiones a tomar

Cada una con la evidencia que la sostiene y una recomendación. Las que digan **(decisión
tuya)** no las puedo tomar yo.

### D1 · ¿A qué superficies va el dither? **(decisión tuya)**

Inventario real de figuras de la página, que es la lista de candidatas:

| Superficie | Estado hoy | ¿Dither? | Por qué |
|---|---|---|---|
| Poster del hero | `public/assets/dither/hero-dither.png`, Bayer 8×8 desde SVG, 2 colores, 7 256 B | **Sí, recomendado** | Es lo que ven no-JS, reduced-motion y conexión lenta. Cambiarlo a una escena con tono es el payoff más grande por el riesgo más chico, y no agrega nada al runtime. |
| Film del hero | `harness-outcome` (F1), 1280 AV1 + 960 H.264 | **No reemplazar** | F1 es **donde se enseña la leyenda** (anillo+bloque, rect en banda, rombo ámbar). Cambiarlo por una escena rompe eso. Alternativa: que J1 sea un segundo panel, no el fondo. |
| Films de sección (4) | `action-gates`, `harness-assembly`, `signal-freshness`, `knowledge-cycle` | **No** | Veredicto de T2, con evidencia a 1:1. |
| Thumbs de bitácora | WU7 retiró campo, consumidor y componente sin importadores, sin añadir assets | **No — la medición lo descarta** | WU5: por debajo de ~400 px CSS mostrados el efecto deja de leerse como trama; a 192 px son ~14 puntos de ancho. Se retira el contrato, no se deja una promesa opcional. |
| OG | `public/assets/brand/og-default.png`, 5 177 B, desde `hardware-board.svg` + wordmark | **Sí, recomendado** | Costo cero en runtime y es lo primero que se ve al compartir. |
| Mark animado en SVG | No existe | **Opcional** | La referencia exporta un loop como SVG animado para READMEs. Costo cero en la página. Buen candidato para el README del repo. |
| Textura L1 (shell) | SVG inline en `PageLayout.astro:25-26` | **No** | Es global y vive detrás de todo. Riesgo alto, valor bajo. |
| Figura de MAGI | Canvas de partículas + SVG inline informativo | **No** | Ya funciona y el SVG es informativo, no decorativo. |
| Sección Proyectos (falta) | No existe (`GUIA-MOTION.md:533`) | **Decisión aparte** | Es contenido nuevo. Si existe, es el lugar natural para una escena grande. |

**Recomendación inicial (histórica):** poster, thumbs y OG. **Alcance tras WU5:**
poster y OG; WU7 limpia el contrato de thumbs rechazado por la medición.
El film del hero y Proyectos siguen siendo decisiones separadas.

### D2 · ¿Dónde se genera el tono: escena procedural propia o arte SVG?

Lo que existe: `scripts/dither-src/*.svg` (art SVG de 2 valores) horneado con
`scripts/generate-dither.mjs` a PNG de 2 colores, con presupuestos de bytes y `PASS/FAIL`.
Y lo nuevo: `scripts/motion-src/scenes/J1.js`, una escena procedural con tono continuo que
tira a MP4 o PNG vía el pase de dither.

**Recomendación:** las superficies nuevas salen de **escenas procedurales propias**
(`scenes/`), no de arte SVG. Un halftone necesita tono y el SVG de trazos no lo tiene: es
exactamente el hallazgo del spike. El generador SVG existente se queda para el OG si
conviene, pero la escena es el camino.

### D3 · ¿Cuál es la densidad de celda?

Hoy `cell = 8 px` a 960 de ancho, elegido a ojo. Los tres anchos reales de presentación
son ~390 (mobile), ~768 (tablet) y ~1440 (desktop), y el film es 16:9 mostrado con
`object-cover`: en mobile eso es un recorte duro.

**Recomendación:** no decidirlo leyendo esto. Es una tarea de medición (sección 5, M1):
renderizar la misma escena con celda 4/6/8/10 contra los tres anchos y elegir por
legibilidad a 390 × costo en bytes a 1440.

### D4 · El recorte vertical del hero

Hallazgo medido en la página: los films son 16:9 y en un viewport de 390×844 con
`object-cover` se ve un pedazo chico del frame; **los anillos del film cruzan por detrás del
titular**, uno justo sobre la palabra «CONECTADOS». Se lee, pero no está compuesto para ese
recorte.

**Recomendación:** autorar un encuadre vertical aparte para el hero en mobile, en vez de
recortar el 16:9. La referencia que originó esto lo dice explícito: *reframe per format,
don't crop a 16:9 render to vertical*. Si no se hace en esta iteración, se declara como
deuda visible y no se disimula.

### D5 · ¿Se respeta la secuencia A→B→C? **(decisión tuya, la más grande)**

Tres caminos:

1. **Respetar la secuencia.** A (narrativa) y B (arquitectura de información) landean
   antes; el motion y el dither entran como C, con el copy ya aprobado por branding.
   Alineado con la dirección canónica. Cuesta tiempo y obliga a sacar de `main` el copy de
   la rama hasta que branding lo revise.
2. **Landear C primero, como excepción declarada.** El motion es visual y no depende del
   copy definitivo; se puede argumentar que adelantarlo no contradice a §19 («la base
   visual puede mantenerse»). Pero contradice el orden de la secuencia y hay que dejarlo
   escrito como excepción, no como descuido.
3. **Separar la rama: sacar de acá todo lo que no sea motion.** El copy narrativo se va a
   su propio PR (A) y esta rama se queda con lo visual. Es la opción que más trabajo de
   corte tiene y la que deja la historia más limpia.

**Recomendación histórica:** la 2 con la deuda escrita; la 3 por trazabilidad; la 1
respeta la secuencia. **Cierre local autorizado:** WU10 excluye mecánicamente rutas de
copy, sin descartar contenido ni reescribir historia. `529a264` queda protegido para
branding; `16ac030` y `1bea6ce` también tocan i18n y son rechazados, sin excepción para
labels. La elección de integración real sigue pendiente; un PASS de rutas no la decide.

---

## 4. El corte en candidatos

Reglas de diseño del corte, derivadas de la restricción de 2.2:

1. **De menor a mayor.** El primer recorte es el más chico posible, para que la revisión
   humana pueda empezar por algo que se lee de una sentada. Sin RDD no hay presupuesto
   nativo que medir, así que la regla «cada recorte en su propio rango» —que era mecánica
   del facade— ya no aplica: los slices son **commits o PRs encadenados**, no ramas.
2. **Binarios separados del código.** Un candidato puede ser sólo assets. Los assets
   pueden landear *antes* que su consumo: assets sin consumidor no rompen nada, y así los
   candidatos de código no cargan ~860 KB de MP4.
3. **Consumo junto con su asset por superficie.** Poster y OG son candidatos
   independientes, con su PNG y contrato. Los thumbs eran una candidata histórica;
   WU5 los descartó y WU7 retira su API sin añadir assets.
4. **Cada candidato actualiza los checkers en su propio commit**, nunca en un commit
   aparte: `check-iteration-2.mjs` valida existencia, tamaño (≤300 KiB por film, `:1364`), unicidad
   dentro de su sección, orden AV1-antes-de-H.264 y los atributos del `<video>`
   (bloque del contrato de films, `:1349-1486`), más los presupuestos de PNG de dither (80/100 KiB, `:695-696`).
5. **Si un slice crece de más, se parte otra vez.** Ningún slice se justifica por «ahorrar
   viajes»: un slice que no se lee de una sentada no es un slice.

**Prohibido por diseño:** un candidato que sea «toda la rama», y un candidato que junte
dos superficies para ahorrar viajes.

---

## 5. Work units

Cada uno con superficies permitidas, criterios de aceptación y checks. El orden es el de
la tabla, salvo donde el estado diga otra cosa. El estado y la evidencia de cada uno se
registran acá mismo: este documento es la fuente de verdad de la iteración.

### WU1 · El plan y los docs de método — **HECHO**

- **Entrega:** este documento; `docs/GUIA-MOTION.md` con la sección de dither ya escrita
  (está en la rama); `odd/tasks/dither-look-spike.md` como registro.
- **Por qué primero:** es el recorte más chico posible —unos 340 renglones de texto, cero
  binarios, nada de `src/`—, se revisa de una sentada, y fija el tono del corte para los
  demás. Con RDD apagado ya no hay presupuesto que medir; hecho igual como primer recorte.
- **Aceptación:** los documentos describen lo que el código hace; cero referencias a
  archivos o mediciones que no existan. **Relajada por WU4**, que encontró una referencia
  falsa en `GUIA-MOTION.md`.

### WU2 · `render.mjs` testable en proceso — **HECHO** (`9535e04`)

- **Problema:** `render.mjs` no exportaba ningún helper y hacía el parseo de `argv`, la
  resolución del film y todas las constantes derivadas **a nivel de módulo**, así que
  importarlo disparaba un render completo. Por eso la prueba que el repo ya invocaba para
  F3 y F5 —buscar `t` en orden inverso y comparar byte a byte— **no existía como script**:
  no había forma de reusar el setup de página sin copiarlo.
- **Entrega:** el setup detrás de una frontera exportada y `main()` sólo cuando el módulo es
  el punto de entrada (con el caso de symlink resuelto, no supuesto); y
  `scripts/motion-src/check-determinism.mjs`, gate **local**, deliberadamente fuera de
  `package.json` y de CI porque Playwright no es dependencia del repo.
- **Aceptación cumplida:** J1 pasa directo, inverso, directo-otra-vez y carga nueva; el
  control negativo falla como debe; y el MP4 de J1 re-renderizado da el sha256
  `6ab891ce…` idéntico al de tres corridas previas, una de ellas de un verificador
  independiente. Comportamiento intacto, probado y no afirmado.
- **Lo que el gate no cubre, declarado:** el control negativo es **a nivel del comparador**,
  no de una escena rota servida por `composition.html`. Los controles son tres (markup-only,
  visible, raster-only) y cubren las tres clasificaciones. **Actualizado por WU11:** el gate
  pasó a reportar el digest del markup **y** el del raster pintado en cada tiempo, así que la
  pregunta «¿esto se ve?» dejó de ser una inferencia (ver WU11).
- **Riesgo materializado:** tocar el renderer era el riesgo, y el criterio byte a byte lo
  contuvo. En cambio destapó un defecto que no era el suyo.

### WU3 · Los binarios de films que ya existen — **SUBSUMIDO, no se hace**

Existía para que los ~860 KB de MP4 no engordaran un candidato de review nativo. Con RDD
apagado perdió ese propósito original. No autoriza landear toda la rama mezclada:
D5/WU10 siguen separando el copy. Se conserva como antecedente, no como tarea pendiente.

### WU4 · Reparar el drift de la documentación — **HECHO**

- **Problema, tal como se encontró:** el contrato citaba archivos que no existen
  —`public/assets/motion/el-caret.mp4` (`docs/DESIGN.md:278`, `:295`), `motion-src/film.mjs`,
  y tres figuras SVG inline (`OperationFlowFigure`/`SignalTraceFigure`/`CooperativeRingFigure`,
  `:100`, `:294`)—. Y WU2 destapó una segunda mentira, en el documento de método: la
  afirmación de que «buscar F3 y F5 en órdenes opuestos tiene que dar SVG byte-idéntico»
  (entonces `docs/GUIA-MOTION.md:155-156`), que era **falsa para F5** y que nadie más podía
  comprobar porque no existía script que la corriera. Un contrato que miente es peor que no
  tener contrato, y es contra lo que se revisa.
- **Lo que se hizo:** auditoría de **todas** las rutas citadas en los dos documentos, no sólo
  de las conocidas. **84 citas, 10 faltantes antes; 88 citas, 0 faltantes después.** Se
  reemplazaron las referencias locales falsas y se conservó la procedencia externa como
  descripción explícitamente no disponible, sin inventar rutas locales. Cada afirmación de
  verificación del documento de método ahora nombra un comando que la corre, o dice
  claramente que fue una observación de una sola vez que el repo no puede reproducir. La
  afirmación sobre F3/F5 se corrigió con el resultado medido, no se borró. `DESIGN.md` sumó
  el changelog 1.5.
- **Evidencia:** `pnpm check` en verde —astro 0 errores, ESLint ok, iteration-2 **309
  passed / 0 failed**, iteration-3 **469 passed / 0 failed**—. `git diff --stat -- public/`
  vacío.
- **Propiedad que quedó probada de yapa:** `pnpm check` invoca `generate-dither.mjs`, que
  reescribe los dos PNG commiteados. Los sha256 antes y después son idénticos
  (`8f972ada…` y `08a7e850…`): **los assets de dither commiteados son reproducibles desde las
  fuentes commiteadas**. No estaba probado, y era una condición para poder confiar en
  cualquier regeneración futura de assets.
- **Referencias del plan re-apuntadas** a las posiciones nuevas: Proyectos `:533`, densos
  `:549`, limitación del renderer `:491`, corrección F3/F5 `:174-185` (comando en `:181`).

### WU5 · M1 · Medir la densidad de celda — **HECHO**: la constante actual está mal para las secciones

**La celda se había elegido como un número en píxeles de fuente, y es la unidad equivocada.** Nada
se muestra a 1:1: el hero es `object-cover` a sangre y **magnifica** (una fuente 16:9 en un
viewport más alto se agranda), mientras que las figuras de sección son cajas acotadas y
**encogen**. Medido con un browser real, no leído del stylesheet:

| presentación | caja CSS | fuente | escala |
|---|---|---|---|
| hero @390×844 | 390×936 | 1280×720 | **×1,30** |
| hero @768×1024 | 768×1024 | 1280×720 | **×1,42** |
| hero @1440×900 | 1440×900 | 1280×720 | **×1,25** |
| sección @390 | 340×191 | 960×540 | **×0,35** |
| sección @768 | 718×404 | 960×540 | **×0,75** |
| sección @1440 | 476×268 | 960×540 | **×0,50** |

Y el **pitch mostrado en px CSS** que sale de eso (el número que importa):

| presentación | celda 4 | 5 | 6 | 8 | 12 | 16 | 20 |
|---|---|---|---|---|---|---|---|
| hero @390 | 5,2 | 6,5 | 7,8 | 10,4 | 15,6 | 20,8 | 26,0 |
| hero @768 | 5,7 | 7,1 | 8,5 | 11,4 | 17,1 | 22,8 | 28,4 |
| hero @1440 | 5,0 | 6,3 | 7,5 | 10,0 | 15,0 | 20,0 | 25,0 |
| sección @390 | 1,4 | 1,8 | 2,1 | **2,8** | 4,2 | 5,7 | 7,1 |
| sección @768 | 3,0 | 3,7 | 4,5 | **6,0** | 9,0 | 12,0 | 15,0 |
| sección @1440 | 2,0 | 2,5 | 3,0 | **4,0** | 6,0 | 7,9 | 9,9 |

**Lo que se ve, mirando a 1:1 las vistas simuladas** (hojas en
`dist-motion-verify/wu5/SHEET-*.png`):

- **Hero:** celda 4 y 5 se leen como una **grilla gris densa**, no como una trama de puntos;
  celda 6 y 8 se leen como un screen deliberado. O sea que **la celda 8 actual del hero está
  bien** (pitch 10–11,4). Mi sospecha inicial de que era demasiado gruesa era falsa.
- **Secciones:** al revés. Celda 6 y 8 son **papilla gris** — la celda 8 da 2,8–4,0 px y a esa
  escala la trama deja de leerse como trama. Celda 12 anda, **celda 16 es la que mejor lee**.
- **Tensión real en mobile:** a 340 px de ancho la figura **no puede** ser a la vez un sujeto
  legible y un screen legible. Celda 16 da pitch 5,7 (lectura marginal), celda 20 da 7,1 pero
  convierte el slab en un mosaico de ~48 puntos y el anillo del agente en cuatro puntos.

**Decisión:** la constante se expresa como **pitch mostrado objetivo (6–8 px CSS)**, no como
píxeles de fuente, y de ahí se deriva por presentación: `celda = objetivo × anchoFuente ÷
anchoMostrado`. En concreto: **hero celda 6** en el encode de 1280 (pitch 7,5; la 8 sigue siendo
aceptable) y **secciones celda 14–16**, no 8. La regla se escribe en `docs/DESIGN.md` como parte
del contrato de assets cuando se construya el primer asset.

**Conclusión que cierra el asunto, y que sólo apareció al mirar las vistas del browser**
(hojas en `dist-motion-verify/wu5/SHEET-real-*.png`):

| presentación | celda 6 | 8 | 12 | 16 | 20 |
|---|---|---|---|---|---|
| hero @1440 (pitch) | **7,5** | 10,0 | 15,0 | 20,0 | 25,0 |
| sección @1440 (pitch) | 3,0 | 4,0 | 5,9 | **7,9** | 9,9 |
| sección @390 (pitch) | 2,1 | 2,8 | 4,3 | 5,7 | **7,1** |

- **Hero: celda 6.** Con 4 los puntos casi no se individualizan —es una malla fina—; con 6 los
  puntos se leen y el gradiente del halo sigue suave; con 8 es gruesa pero funciona.
- **Sección: celda 16, no 8.** Con 6 y 8 el slab se lee como **alambre gris desenfocado**, no
  como trama. Con 12 ya lee, con 16 lee mejor, con 20 empieza a perder detalle.
- **La conclusión de fondo, que es la que cambia el plan: a ~340-480 px de ancho mostrado una
  figura no puede ser a la vez un sujeto legible y una trama legible.** No es un problema de
  constante; es que **el efecto necesita superficie**. Consecuencia: los thumbs de bitácora
  (192 px) y los posters de las figuras de sección **no van ditherizados**. El dither queda para
  las superficies grandes, el poster del hero y el OG. Eso **reduce** el alcance de D1, que es
  justo lo que uno quiere que haga una medición.

**Nota de método:** la medición es un script **commiteado** —`scripts/motion-src/measure-density.mjs`—,
no una hoja suelta. Lee las cajas reales de la página viva con `pnpm dev`, deriva la escala por
presentación, captura los stills por el **mismo** `captureFrame` que usa el renderer, y simula la
presentación con una instancia **real de Chromium**, así que las imágenes de decisión llevan el
filtro del browser y no el de ffmpeg. Uso: `--measure-only` primero (escribe `measurement.json` y
la tabla de pitch), después la corrida normal (stills, vistas simuladas y `stills.json`).

**Dos correcciones entraron antes de que esto contara como evidencia.** El script reemplazaba la
caja medida del hero por el viewport, y el video del hero es **más alto que la ventana** (390×936
en un viewport de 390×844), así que reportaba el pitch de mobile como 7,0 cuando la escala pintada
es 1,3006 y el pitch real con celda 6 es **7,8**. Y el set de candidatas terminaba en celda 12,
que excluye justo el rango que las secciones necesitan.

- **Checks corridos:** `node --check` de los dos archivos; la tabla de pitch contra las cajas
medidas del browser; vistas simuladas por Chromium real; y el sha256 de regresión del refactor
que hizo falta para reusar la captura (`6ab891ce…`, idéntico).
- **Trabajo rescatado, no confiado:** el script y la extracción de `captureFrame` los escribió una
corrida de worker que **murió antes de reportar** y dejó el árbol sucio. Se mantienen porque
pasaron la prueba, no porque su autor los haya declarado buenos. Ver el commit `0dd68f3`.

### WU6 · Poster del hero con tono — **HECHO** (`1f95d7d`)

- **Entrega:** `public/assets/dither/hero-dither.png` es ahora un still de `J1` por el mismo
  `captureFrame` que usan los films: **1600×900, 38 entradas de paleta, 11 916 bytes** contra el
  presupuesto intacto de 80 KiB, con **89 % de los píxeles en el suelo de ink** (el negro es
  negro). sha256 `d1dd3cc0…`. Builder local nuevo: `scripts/motion-src/render-poster.mjs`.
- **Celda 7, por la regla de WU5**, no copiando el número del film: la fuente del poster es 1600
  y la del film 1280, así que el mismo número no es el mismo pitch. Pitch mostrado: **6,56** @390,
  **7,96** @768, **7,00** @1440, los tres dentro del objetivo 6–8.
- **Entregable extra que el unit destapó, y es el motivo de su forma:** el builder **no puede** ser
  un modo de `generate-dither.mjs`, porque `pnpm check` corre ese generador y Playwright no es
  dependencia del repo: un asset que necesita browser no se puede regenerar desde ahí. Así que el
  hero **sale** de la lista de assets de ese generador y el OG se queda. **La trampa que esto
  cierra:** si el hero se quedaba, el siguiente `pnpm check` **pisaba el poster nuevo con el viejo
  de 2 colores**, y el unit parecía hecho mientras se deshacía. Probado, no afirmado: el sha256
  del poster es idéntico antes y después de un `pnpm check` completo, y el del OG también.
- **La aserción del checker se re-apuntó, no se debilitó.** `check-iteration-2.mjs` pedía «a lo
  sumo dos colores ink/bone», que es justo la regla que cambió. Ahora pide que cada entrada de la
  paleta sea neutra (spread ≤7) o ámbar en la ventana de hue del accent (30–50°), con todos los
  presupuestos y dimensiones intactos y la aserción de 2 colores del OG sin tocar. Es un check
  **más estricto** que el anterior, y se demostró que puede fallar: teal, púrpura, rojo, amarillo,
  paleta vacía y spread 8 son rechazados; spread 7 y ámbar, aceptados.
- **Checks:** `pnpm check` en verde —136 archivos, 0 errores, 0 warnings, 25 hints; iteration-2
  **309 passed / 0 failed**; iteration-3 **469 passed / 0 failed**— y `pnpm generate:dither`
  `PASS` para el OG.
- **Caveat declarado:** la paleta es metadata y **no puede localizar el ámbar en el espacio**. El
  uso reservado del ámbar lo verifica la revisión del raster, no el checker.

### WU7 · Thumbs de bitácora — **GREEN verificado de forma independiente** (`7a802eb`)

- **Problema inicial (histórico):** el schema tenía `dither` (`src/content.config.ts:97`), la fila lo renderizaba
  (`JournalEntryRow.astro:57-61`), **no hay assets** y `DitherFigure.astro` **no tiene ningún
  importador**. O sea: contrato sin implementación y componente muerto.
- **Lo resolvió WU5:** a 192 px de ancho mostrado, el dither **no se lee como trama**. Poblarlo
  sería producir un accidente con presupuesto de bytes. Así que el work unit cambia de
  «implementar» a **«limpiar la promesa muerta»**.
- **Aceptación autorizada:** eliminar campo, `<img>` y componente sin importadores;
  sustituir la cobertura opcional por regresiones de retiro. La alternativa textual ya
  existe: resumen y enlace de detalle localizado en ES/EN, sin nuevo copy ni i18n.
- **Implementación:** campo/consumidor retirados y componente sin importadores
  eliminado por el orquestador mediante patch exacto validado. Controles de schema,
  acceso, importación y frontmatter (string/null/false/undefined) rechazan reintroducción.
  RED inicial483/3, parcial485/1 por componente presente y GREEN final486/0;
  catorce controles (11 rechazos,3 aceptaciones) sin rebajar la cobertura.
- **Verificación independiente:** build13páginas; check Astro151archivos,
  0errores/0warnings/26hints, ESLintPASS, iteration-2 323/0, iteration-3 486/0.
  DOM parseado:11filas y6detalles ES/EN conservan resumen, metadatos y enlaces
  localizados, sin thumbs.47archivos protegidos y10encodes intactos;5chunks
  JS idénticos,109,818 B gzip,delta0. OG conserva `a49aabb…`; assets public/dist
  iguales. Evidencia en `dist-motion-verify/wu7/`; sin tests interactivos nuevos.
  El enlace externo conserva fuente/i18n, pero no tiene ejercicio runtime porque
  ninguna entrada semilla declara un enlace externo.
- **Fuera de alcance:** nuevos thumbs en lista o detalle requieren otra decisión;
  no queda una promesa opcional de dither en el contrato actual.

### WU8 · OG — **GREEN observado** (2026-10-09; commit `1aab883`)

- **Entrega:** OG1 estático independiente de J1, compuesto para1200×628, no hero
  reescalado. `render-og.mjs` local hornea `scripts/dither-src/og-tone.png`
  lossless60,861 B; `pnpm generate:dither` sigue como único escritor del OG final,
  sin browser/CI/deps nuevas. `ditherImageData` puro, celda16 y máscara JOYAN intacta.
- **Asset:**64colores neutros (spread≤7)/ámbar (hue30–50),6,571 B≤100KiB;
  sha256 `a49aabb8334ae756eb207996dc3e83fe343676fcac0400e9e32358886961921e`.
  Ámbar sólo en portón x402–477/y67–156;48,187 píxeles alpha≥128 exactos bone.
  Campo central208–415 ink fuera de la máscara; PNG codificado/decodificado idéntico.
- **RED/GREEN:** OG viejo2colores falla antes de generar; checker323/0 después.
  Controles negativos de paleta, dimensiones, presupuesto y máscara pasan;
  gate `.0001` sale1 y conserva hash. Builder dos veces (seek/repeat/carga nueva)
  y generador dos veces idénticos. Vistas nativa/600×314/400×209 inspeccionadas;
  celda16 da pitch8/5.33px, más denso a400 pero marca/portón distintos.
- **Checks:** build13páginas; check Astro0errores/0warnings/26hints, ESLintPASS,
  iteration-2 323/0, iteration-3 469/0. Meta OG1200×628 en13HTML, sin img en página;
  PNG public/dist iguales. WU9/films/hash hero `b9c1ad1b…` intactos y cinco chunks
  JS idénticos (109,818 B gzip). Evidencia ignorada: `dist-motion-verify/wu8/`.
- **Verificación independiente:** generador PASS y hash intacto; presupuesto
  mínimo falla como debe sin cambiar píxeles; iteration-2 323/0; máscara, previews,
  meta de13páginas y preservación WU9/chunks PASS. El probe sintético sin archivos
  confirmó rojo/teal/púrpura → grises/ink, no validación de la fuente.
- **Límite:** fontconfig/librsvg conserva la portabilidad previa del wordmark;
  paleta no prueba posición, verificación raster sí. No hay guard pre-dither de
  cromaticidad/opacidad para fuentes futuras: revisar el arte fuente cuando cambie.
  Amarillo → ámbar sigue como evidencia estructural, no probe ejecutado. Sin defecto
  demostrado del asset actual. Sin oráculo de película para este still estático;
  no se afirma integración en main; el orquestador mantiene el espejo ODD.

### WU9 · Encuadre del hero (D4) — **GREEN observado en reduced-motion** (`bed795f`)

- **Registro (2026-10-09):** se autorizó `Hero.astro` y un build fresco. El campo de
  sujetos abre sólo el scrim del poster bajo reduced-motion; el piso de máscara opaca
  restaura el scrim direccional original antes del texto (140px;160px entre640–1023px).
  F1 y los cinco films/binarios de producción siguen intactos; cero JS/dependencias nuevas.
  El orquestador conserva el cierre y el espejo canónico `odd/tasks/dither-iteration.md`.
- **RED preservado:** `red/` mantiene seis fallas iniciales de recorte; `red-resume/`
  reproduce cuatro fallas desktop (rim22/255, rombo15.197/255) del candidato compacto.
  `aperture-green/` y `accepted/` conservan fallas del harness: la captura del elemento
  desplazaba el viewport antes de comparar el header sticky. Se restaura y se verifica
  ahora el scroll original; no se bajó ningún umbral ni se ensayó otra estética al cerrar.
- **Composición final única:** agente `(885,80), r58`, portón `(1085,80), half32`,
  glow32 + flare8; anillo/bloque proporcionales, rampas y beat sheet originales.
  El slab queda como fondo. Diámetros13.81/7.62 pitches, no sujetos miniaturizados.
- **Corrección de prueba:** media celda y el hueco anterior7.167px eran insuficientes.
  Stencils opacos nativos pasan por el resize real de `captureFrame`; el checker redondea
  todas las celdas tocadas y añade una celda de guarda para AA/filtro. `dither.js` escribe
  sólo dentro de su celda. Bounds actuales (right/bottom exclusivos): anillo
  x679–798/y7–126; glow completo x861–952/y21–112; **separación63px ≥celda7**.
  Son medidas del Chromium/toolchain actual; dos stills7.8/9.2s **no** prueban todo
  el film halftone ni todos los navegadores. No se recicla el oráculo nativo como esa prueba.
- **GREEN actual:**
  `node scripts/motion-src/check-poster-framing.mjs --out dist-motion-verify/wu9/final-green --require-page-clear`
  pasa **12 contextos** ES/EN×390×844,768×1024,1440×900×JS/no-JS, sobre `dist` nuevo,
  sin interceptar el asset público. Cover/viewport completos, cero intersecciones con
  header/kicker/H1/lead/CTA/nota. Img `cover`, `50% 50%`; video `display:none`.
  Se conserva ≥4 píxeles con lift≥24/255 por feature, más cuadrantes del anillo,
  contraste medio con el hueco y mínimos CSS80/40/16px para anillo/rombo/bloque.
  Desktop obtiene picos **122.144/206.064/194.086**. Se inspeccionaron seis capturas
  reales y el closeup nativo. Los pares JS/no-JS son byte-idénticos.
- **Protección/controles:** comparación all-bone contra el mismo scrim con máscaras
  totalmente opacas, conservando su composición: **delta0 en los12 contextos**.
  Quitar la máscara cambiaba redondeos fuera del campo; no se toleraron deltas para
  aprobar. Recorte, texto intersectado, separación cerrada, ink-only, sujetos al5%
  y máscaras transparentes se rechazan. La protección no se confundió con brillo mínimo.
- **Normal F1:** `node dist-motion-verify/wu9/check-normal.mjs after` compara con
  `normal-baseline.json`: seis snapshots CSS/atributos idénticos, incluidos scrim y62%;
  cinco chunks JS idénticos, **109 818 B gzip, delta0**. `pnpm build` PASS y poster
  `dist/public` byte-idéntico. No se afirma una medición de reproducción/LCP/CLS.
- **Asset/check final:** 1600×900, celda7, **38 colores,11 407 B ≤80 KiB**, sha256
  `b9c1ad1b6bb68ba8dc813fb329e0e25b67fbf393d4ad5e8c3aa2ad9d9041ec18`.
  Poster/OG conservan hashes tras `pnpm check`: Astro142 archivos,0 errores/0 warnings,
  26 hints; ESLint PASS; iteration-2 309/0, iteration-3 469/0. Determinismo J1 PASS.
- **Oráculo fresco:** `animation-aperture-final/`,450 frames1920×1080, **blur1 sin
  halftone**, generado sin borrar nada. Probe accepted: carry0.83/CV0.66/stillness69.3%,
  cero empty/out-of-frame/haze, seam delta0; PNG inicial/final byte-idénticos.
  No se generó otro encode; no se prueba seam codificado ni animación halftone entregada.
- **Evidencia final:** `final-green/{es,en}-{390,768,1440}.png`, los seis
  `-no-js.png`, `framing.json`, `hashes.json`, poster/closeup y controles bajo
  `dist-motion-verify/wu9/`. Historial RED y trials preservado en `EVIDENCE.md`.
- **Límite explícito:** no-JS por sí solo no fuerza un poster: autoplay nativo sigue
  sin JS. El GREEN no cubre reconocimiento del fallback de carga/codec sin preferencia
  de movimiento; ese caso conserva el scrim original. No se afirma cobertura universal
  de estados estáticos ni se modifican otras unidades pendientes.

### WU10 · Cierre local comprobado; integración en `main` **PENDIENTE**

- **Entrega local:** `node scripts/check-delivery-scope.mjs --base <rev> --head <rev>`
  (defaults `main`/`HEAD`), `--self-test` y `--help`; Node sin dependencias, fuera de
  package/CI. Sólo compara commits, no prueba el worktree ni aprueba branding/publicación.
- **Contrato:** allowlist visual explícita; copy (i18n/config/pages/Markdown de contenido),
  rutas desconocidas, tipo cambiado, argumentos/refs/registros inválidos y rango vacío
  fallan cerrado. `git diff --name-status -z` inspecciona ambos lados de rename/copy;
  desde copy hacia docs también bloquea. JSON escapado; refs resueltos a commits sin shell.
  `DitherFigure.astro` sólo admite eliminación. No hay excepción automática de labels.
- **RED/GREEN:** primer clasificador por directorios aceptaba indebidamente narrativa,
  desconocidos y rename; 59/22 → allowlist estricta y scores NUL correctos → **81/0**.
- **Controles reales** (exit1 = rechazo esperado; exit0 = PASS de rutas):
  `654e22c..529a264` exit1 (config/i18n/terms); `main..HEAD` exit1 (copy y desconocidos);
  `a702ef0..HEAD` exit0 (17 rutas WU9/WU8/WU7); `HEAD..HEAD` exit1 (vacío).
  En la captura previa al commit del gate, `main` resuelve a `2d13d13` y `HEAD` a
  `7a802eb`; el positivo es **sólo un slice**,
  no prueba que toda la rama sea copy-free ni que esté lista para `main`.
- **Evidencia:** logs RED, negativos deliberados y GREEN bajo `dist-motion-verify/wu10/`;
  assets, diez encodes, i18n y baseline `.artifacts` preservados. Espejo ODD del padre.
- **Verificación final independiente:** build13páginas; check Astro152archivos,
  0errores/0warnings/26hints, ESLintPASS, iteration-2 323/0, iteration-3 486/0.
  Gate81/0; framing12contextos Chromium ES/EN con/sin JS en reduced-motion,
  errores0/pageErrors0/delta de contenido0. F1normal6vistas y5chunks intactos;
  OG/meta13páginas y bitácora11filas/6detalles PASS;47archivos/10encodes intactos.
  Capturas: `dist-motion-verify/wu9/wu10-final-framing/`.
- **Fallo de bookkeeping conservado:** el helper histórico WU8-preserve sale1
  sólo por hash ODD autorizado desactualizado; sus aserciones posteriores no corrieron.
  El baseline no se cambió; pruebas independientes de assets/F1/JS/bitácora pasan.
  La primera invocación de framing con salida en wu10 fue rechazada antes de capturar;
  la ruta autorizada wu9 pasó, sin modificar el guard para ocultar el fallo.
- **Aceptación restante:** integrar realmente en `main` tras revisión/decisión humana;
  sólo entonces retirar «no integrado». El cierre local no certifica producción ni
  cierra esa condición. Firefox/Safari, anchos intermedios, scroll/fallbacks de carga,
  guard futuro del tono OG/fontconfig y nuevo encode no están verificados.

### WU12 · Escena original visible en normal — **writer verificado; cierre del padre pendiente**

El alcance anterior (poster reducido y OG estático) **no** daba un nuevo efecto
visible mientras F1 se reproducía. El usuario aceptó explícitamente este panel
adicional; no sustituye F1 ni ditheriza los cinco films de argumento.

- `Hero.astro` conserva su markup/estilos de F1 y monta `DitherScene.astro` después
  de `#top`. URL directa: `http://127.0.0.1:4321/#dither-scene` y `/en#dither-scene`.
  Div decorativo, sin copy/i18n, overlay ni sexto figure; componentes189/59 líneas.
- Builder local nuevo: `render-dither-scene.mjs`, sin cambios al J1 compartido ni
  helpers. Reencuadra sus superficies y amplía el par semántico dentro de la banda
  antes del dither.450 frames frescos,15s/30fps,960×540,celda8,blur1;382 PNG únicos.
- H.264286,342 B≤300KiB,CRF41; poster7.8s de6,735 B≤80KiB,37colores, píxeles
  lossless. No AV1. CRF34 dio505,228 B; otros intentos CRF40 fallaron seam/budget y
  quedan registrados. Primer/último source idénticos; seam codificado MAE0.815/255,
  max26, no identidad pixel. Flags, hashes y límites: [DESIGN WU12](./DESIGN.md#wu12--visible-normal-mode-j1-surface-2026-10-10).
- RED real antes de escribir UI:12 fallas por escena ausente, `wu12/red.json` y
  `red.log`. GREEN en la preview del padre con build fresco: ES/EN×390/768/1440×
  normal/reducido; errores0, cuerpos completos, reconocimiento y copy/CTA libres.
 12 controles con arte oculto rechazan la escena, no sólo buscan un nodo DOM.
- Cajas390×420,768×432,960×540; pitch6.22/6.4/8 CSSpx. Móvil recorta los laterales
  **de la banda**, no anillo/bloque/portón/flare. Sin banda vacía900px ni máscara
  global. Video readyState4,avanza~1.26s y hace wrap14.6→~0.60s; CSS reduce muestra
  poster. No-JS normal **sigue reproduciendo** (~1.21s); reduce/no-JS oculto en0.
- Los450 bitmaps pasan celdas/paleta/ámbar espacial. Public/dist/preview idénticos.
  `wu12/preservation.json`:31 rutas protegidas,10 encodes,posterWU9,OG y deps
  idénticos a HEAD; no JS/deps nuevas. Seis snapshotsF1 y cincochunks109,818Bgzip
  intactos, baseline sin reset. WU9 regresión12contextos/textdelta0.
- `pnpm build`13páginas; `pnpm check` Astro0errores/0warnings/26hints, ESLintPASS,
  iteration-2 **345/0**, iteration-3 **486/0**. Primer check343/2 detectó que un
  comentario no es separación DOM; luego345/0+485/1 encontró el regex de retiro
  `.dither` coincidiendo con una clase CSS nueva. Se nombró `scene-surface`, sin
  tocar ni relajar el checker de retiro ni su contrato. Scope self-test RED96/2→98/0;
  se autoriza únicamente el componente exacto nuevo, sin ampliar prefijos.
- Capturas viewport, hero y full-page en `dist-motion-verify/wu12/`; full-page visita
  antes las secciones con reveals existentes. Inspección visual real: puntos,
  anillo/bloque, puerta, ubicación y crop; no sólo bounding boxes.
- Límites: Chromium/tres anchos; no Firefox/Safari, LCP/CLS ni fallback universal.
  Overflow previo488ES/442EN a390 sigue intacto, delta0. El oracle histórico de
  J1 nativo no valida estas coordenadas reencuadradas: la prueba nueva es del
  render/delivery/player, no reciclada del spike. No instalado `ascii.rest`.
  El padre conserva reconciliación ODD, decisión de cierre/commit e integración.

### WU11 · Restaurar la pureza de `seek(t)` en F1 y F5 — **HECHO** (`19b0d7c`)

Lo encontró WU2, que no lo buscaba. Medido con el gate, en los cinco films, **antes**:

| | F1 | F2 | F3 | F4 | F5 |
|---|---|---|---|---|---|
| Independencia de orden | **FAIL** (`t=0`) | PASS | PASS | PASS | **FAIL** (`t=3`) |

**Después: los cinco en PASS.**

- **Causas reales:** en `F5.js:157-158` el reset de la salida temprana ponía `opacity: '0'` a los
  ecos de punta pero **no reescribía sus coordenadas**, que sólo se escribían más adelante
  (`:195-196`); en `F1.js:212-214`, `place()` escribía el `opacity` del grupo y **después**
  hacía `if (presence < 0.01) return`, así que el radio del anillo y el halo quedaban con los
  valores de la búsqueda anterior.
- **La severidad se midió, no se inferió.** Se extendió el gate para reportar el digest del
  markup **y** el del raster pintado, y clasificar la divergencia como `visible` o
  `markup-only`. Resultado: **las dos eran `markup-only`**. O sea que nunca hubo nada mal que
  un visitante pudiera ver; lo que estaba roto era el contrato, y con él la posibilidad de
  re-renderizar un tramo suelto —que es justo lo que va a pedir la iteración sobre assets, y
  lo que recomienda el método de referencia—.
- **F5:** los 450 frames hacia adelante quedaron byte-idénticos.
- **F1:** seis frames **sí** cambiaron, y el arreglo se acepta igual porque el número que
  importa estaba mal elegido en la primera versión de este WU. La medición: como máximo
  **264 píxeles de 2 073 600** (0,013 %) con delta máximo **4/255**, y cinco de los seis
  frames por debajo de 2/255. Todos sobre el agente que se desvanece. Y lo decisivo: **el
  MP4 codificado del film arreglado es byte-idéntico al del baseline** con los mismos flags
  (`ebe9d19f226c54e9`, 107 697 bytes). El encoder se come la diferencia entera.
- **El criterio de aceptación se corrigió:** exigía identidad de frames. **Estaba mal.** Lo que
  recibe el que mira es la salida codificada, así que ése es el listón: identidad del MP4. Con
  identidad de frames el WU se habría rechazado a sí mismo por una diferencia que no llega a
  ninguna pantalla.
- **Los assets commiteados no se re-renderizan, a propósito:** la salida codificada es la
  misma, así que re-encodear sólo puede agregar drift de encoder. **Inferencia marcada:** la
  identidad del MP4 se probó a `--blur 1`, que es lo que se renderizó; el asset commiteado es
  de `--blur 5`, y a más blur la diferencia sólo puede achicarse porque el blur promedia
  subframes. Así que el asset no cambia, pero eso es inferencia: probarlo costaría veinte
  minutos de render y el riesgo de re-encodear, y ninguna de las dos cosas compra nada.
- **El oráculo sigue aceptando** F1 con los frames nuevos (`carry 0.54`, el valor que ya
  documentaba `GUIA-MOTION.md`).

---

## 6. Lo que este plan difiere, explícitamente

- **Los cinco films de argumento**, con dither encima: rechazado con evidencia.
- **La sección Proyectos** (`GUIA-MOTION.md:533`): contenido nuevo, fuera.
- **Los diagramas técnicos densos** para el detalle de bitácora (`GUIA-MOTION.md:549`):
  sigue sin decidirse si esa superficie existe.
- **Audio**, `D2` de la dirección: los films siguen mudos. Es una decisión, no un olvido.
- **La adopción de `ascii.rest`**, como dependencia o como piezas: sólo como referencia
  técnica.
- **Los tres PRs no visuales** (A, B, D) y todo lo de branding pendiente.

## 7. Riesgos

| Riesgo | Cómo se maneja |
|---|---|
| El supuesto de que los binarios son el peso del candidato es una hipótesis | No se actúa sobre ella: queda anotado como explicación de por qué la rama no era revisable como unidad. |
| **Sin gate de pipeline**, el copy de PR A puede llegar a `main` sin branding | WU10 aporta proof local de rutas, no CI ni aprobación semántica. D5 sigue pendiente; el corte por defecto **excluye copy**. |
| Cambiar el renderer rompe films que ya funcionan | WU2 tiene como criterio una identidad sha256, no una inspección visual. |
| El look no sobrevive al ancho de mobile | M1 (WU5) y D4 existen exactamente por esto, y van antes de dibujar los assets finales. |
| El copy de la rama se cuela a `main` sin revisión de branding | Es la decisión D5. Si no se decide, el corte de la sección 4 tendría que excluir el copy por defecto. |

## 8. Cómo se cierra

- **Gate técnico:** `pnpm check` y `pnpm build` en verde en cada candidato
  (`.github/workflows/ci.yml:36-42`).
- **Gate de arte:** cualquier film nuevo pasa `probe.mjs` con veredicto `accepted`, y
  cualquier asset visual se mira **a 1:1** en los tres anchos.
- **Gate de review:** desactivado para este clon por decisión explícita del dueño. La
  revisión pasa a ser humana y por política ordinaria: un slice por vez, de menor a mayor.
  Sin línea de base común no hay receipt, así que la trazabilidad de esta iteración son los
  commits y este documento. `commit`, `push`, PR y merge los decidís vos.
- **Cierre:** cuando `main` tenga el efecto y este documento esté cumplido o explícitamente
  diferido, la rama `test/motion-graphics` se archiva con su registro.
