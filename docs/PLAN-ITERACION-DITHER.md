# Plan · Iteración de dither y motion a `main`

> **Estado:** plan propuesto, sin aprobar. No hay nada implementado por este documento.
> **Rama de origen:** `test/motion-graphics` (14 commits sobre `main`, +3 817 / −238 en 49 archivos).
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
`JOYAN_DIRECTION_2026.md:1720` es nuestra propia disciplina. **D5 dejó de ser «en qué
orden» y pasó a ser «qué nos protege ahora».**

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
| Thumbs de bitácora | El schema tiene `dither` (`src/content.config.ts:97`), `JournalEntryRow.astro:57-61` lo renderiza, **no hay ningún asset** | **Sí, recomendado** | Ya está diseñado y a medio construir; hoy no se usa. Es la superficie más natural que quedó sin usar. |
| OG | `public/assets/brand/og-default.png`, 5 177 B, desde `hardware-board.svg` + wordmark | **Sí, recomendado** | Costo cero en runtime y es lo primero que se ve al compartir. |
| Mark animado en SVG | No existe | **Opcional** | La referencia exporta un loop como SVG animado para READMEs. Costo cero en la página. Buen candidato para el README del repo. |
| Textura L1 (shell) | SVG inline en `PageLayout.astro:25-26` | **No** | Es global y vive detrás de todo. Riesgo alto, valor bajo. |
| Figura de MAGI | Canvas de partículas + SVG inline informativo | **No** | Ya funciona y el SVG es informativo, no decorativo. |
| Sección Proyectos (falta) | No existe (`GUIA-MOTION.md:533`) | **Decisión aparte** | Es contenido nuevo. Si existe, es el lugar natural para una escena grande. |

**Recomendación:** entrar por las tres de bajo riesgo y alto payoff —poster del hero,
thumbs de bitácora y OG— y dejar el film del hero y Proyectos como decisión separada.

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

**Recomendación:** la 2 con la deuda escrita, si lo que querés es ver el efecto en `main`
pronto; la 3 si te importa más la trazabilidad. La 1 es la más correcta y la más lenta.

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
3. **Consumo junto con su asset por superficie.** Poster, thumbs y OG son tres candidatos
   independientes: cada uno es una superficie, con su PNG y su entrada de contrato.
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
apagado no hay candidatos que cortar, así que los binarios landean con la rama. Se deja
anotado por qué existía, no como trabajo pendiente.

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

**Consecuencia que cambia otro work unit:** por debajo de ~400 px CSS de ancho mostrado el efecto
deja de leerse como trama. WU7 (thumbs de bitácora) tiene que decidir **primero** si esos thumbs
van a ser lo bastante grandes, o si no van ditherizados. Un thumb de 192 px con celda 14 son 14
puntos de ancho: no es una trama, es un accidente.

**Nota de método:** esto se resolvió con **un solo render** de J1 sin dither (77,7 s) más
aplicar el `dither.js` real desde Node con cada celda, en vez de un render por candidato. La
derivación se validó contra el frame real de `dist-motion-j1`: **764 px de 518 400 (0,147 %)**
difieren, con 588 por encima de 32/255 y delta máximo 117. Es la cota esperable —el remuestreo lo
hace un resampler distinto al del browser, y el dither es un umbral, así que una diferencia mínima
de origen voltea un punto—, y la grilla y la estructura de celdas son idénticas por construcción.
**También evitó el cuarto refactor del renderer** que un worker propuso para abaratar stills: para
tres candidatos, tres renders costaban menos riesgo que otra cirugía sobre ese archivo.

- **Checks corridos:** recortes a 1:1 con `crop=` y sin `scale`, y vistas simuladas escaladas
exactamente como las presenta el CSS. `node --check` del script de derivación.
- **Deuda declarada:** el script de derivación es **scratch y no se commitea**, así que la
vía reproducible es el comando documentado, un render por celda:
`node scripts/motion-src/render.mjs --film J1 --out <dir> --blur 1 --out-width 960 --crf 34 --av1-width 0 --dither --dither-cell N`.
Se eligió velocidad sobre reproducibilidad acá, y se dice en vez de disimularlo.

### WU6 · Poster del hero con tono

- **Superficies:** la fuente de escena, `scripts/generate-dither.mjs` si se extiende, y los
  presupuestos de bytes de `check-iteration-2.mjs`.
- **Aceptación:** PNG de 2 colores con la paleta de tokens, dimensiones intrínsecas
  declaradas (sin CLS), ≤80 KiB, contraste ≥4.5:1 en cualquier región que toque contenido,
  y **ámbar sólo si significa portón o vivo**.
- **Checks:** `pnpm generate:dither` imprime `PASS`; `pnpm check` en verde; mirada a 1:1 en
  los tres anchos.

### WU7 · Thumbs de bitácora

- **Problema:** el schema tiene `dither` (`src/content.config.ts:97`), la fila lo renderiza
  (`JournalEntryRow.astro:57-61`), **no hay assets** y `DitherFigure.astro` **no tiene
  ningún importador**. O sea: contrato sin implementación y componente muerto.
- **Superficies:** `src/components/joyan/JournalEntryRow.astro`,
  `src/components/joyan/DitherFigure.astro`, `src/content.config.ts`, `public/assets/dither/`,
  `docs/DESIGN.md`.
- **Aceptación:** cada entrada con thumb tiene su asset; alternativa textual localizada
  para ES/EN; presupuesto de bytes por thumb **y del total de la página de bitácora**
  declarado; `DitherFigure` pasa a tener importadores o se elimina, pero no queda muerto.
- **Decisión colgante:** si los thumbs van en la lista o sólo en el detalle — es una
  decisión de peso de página, y hoy hay filas que además linkean a detalle.

### WU8 · OG

- **Superficies:** `public/assets/brand/og-default.png`, `scripts/generate-dither.mjs`,
  `docs/DESIGN.md`.
- **Aceptación:** ≤100 KiB, 1200×628, wordmark compuesto preservando la paleta exacta.
- **Checks:** `pnpm generate:dither` `PASS` y `pnpm check`.

### WU9 · Encuadre vertical del hero (D4)

- **Entrega:** un encuadre vertical propio para el hero en mobile, o la deuda declarada.
- **Aceptación:** a 390 px el sujeto no queda cruzado por el titular ni por el CTA.
- **Checks:** captura a 390, 768 y 1440 leyendo el sujeto, no sólo el layout.

### WU10 · Cerrar el estado de prueba

- **Entrega:** `docs/GUIA-MOTION.md` deja de decir «Estado: PRUEBA. No está integrada a
  `main`» cuando efectivamente esté integrado; el registro del spike se cierra; el espejo
  en memoria se actualiza.
- **Aceptación:** el documento y el repositorio dicen lo mismo.

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
| **Sin gate automático**, el copy de PR A puede llegar a `main` sin la revisión de branding que exige `JOYAN_DIRECTION_2026.md:1720` | Es la decisión D5, y ahora es la que más pesa. Si no se decide, el corte por defecto **excluye el copy**. |
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
