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
| Sección Proyectos (falta) | No existe (`GUIA-MOTION.md:457`) | **Decisión aparte** | Es contenido nuevo. Si existe, es el lugar natural para una escena grande. |

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
  no de una escena rota servida por `composition.html`. Y el digest de un film SVG es sobre
  el **SVG serializado**, no sobre píxeles: es más estricto que lo visible, y esa diferencia
  importa (ver WU11).
- **Riesgo materializado:** tocar el renderer era el riesgo, y el criterio byte a byte lo
  contuvo. En cambio destapó un defecto que no era el suyo.

### WU3 · Los binarios de films que ya existen — **SUBSUMIDO, no se hace**

Existía para que los ~860 KB de MP4 no engordaran un candidato de review nativo. Con RDD
apagado no hay candidatos que cortar, así que los binarios landean con la rama. Se deja
anotado por qué existía, no como trabajo pendiente.

### WU4 · Reparar el drift de la documentación

- **Problema, ampliado:** el contrato cita archivos que no existen —`public/assets/motion/el-caret.mp4`
  (`docs/DESIGN.md:278`, `:295`), `motion-src/film.mjs`, y tres figuras SVG inline
  (`OperationFlowFigure`/`SignalTraceFigure`/`CooperativeRingFigure`, `:100`, `:294`)—. Y
  WU2 destapó una segunda mentira, en el documento de método:
  `docs/GUIA-MOTION.md:155-156` afirma que «buscar F3 y F5 en órdenes opuestos tiene que dar
  SVG byte-idéntico», y **F5 no lo cumple** (medido: F3 sí, F5 falla en `t=3`). Era una
  afirmación no verificable por nadie más, hecha cuando no existía script que la corriera.
  Un contrato que miente es peor que no tener contrato, y es contra lo que se revisa.
- **Superficies:** `docs/DESIGN.md` y `docs/GUIA-MOTION.md` únicamente.
- **Aceptación:** toda ruta citada existe en el árbol; toda afirmación de verificación tiene
  un comando que hoy la pueda correr; la tabla de assets coincide con `public/`; la
  afirmación sobre F3/F5 se corrige con el resultado medido, no se borra; el changelog
  registra el cambio.

### WU5 · M1 · Medir la densidad de celda (antes de dibujar nada)

- **Entrega:** la misma escena renderizada con celda 4/6/8/10, medida contra los tres
  anchos reales (~390, ~768, ~1440).
- **Aceptación:** una tabla `celda × ancho → legibilidad (a ojo, a 1:1) × bytes`, y **una
  constante elegida con esa tabla**, escrita en `docs/DESIGN.md` como parte del contrato de
  assets.
- **Checks:** recortes a 1:1 con `crop=` y sin `scale` — un contact sheet reduce la grilla y
  aliasea, y eso ya nos hizo leer mal un resultado una vez (`GUIA-MOTION.md`, método).

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

### WU11 · Restaurar la pureza de `seek(t)` en F1 y F5 — **ABIERTO, es un defecto**

Lo encontró WU2, que no lo buscaba. Medido con el gate nuevo, en los cinco films:

| | F1 | F2 | F3 | F4 | F5 |
|---|---|---|---|---|---|
| Independencia de orden | **FAIL** (`t=0`) | PASS | PASS | PASS | **FAIL** (`t=3`) |

- **Qué está probado:** el estado de atributos se filtra entre búsquedas. En `F1.js:212-214`
  `place()` escribe `transform` y `opacity` del grupo y **después** hace
  `if (presence < 0.01) return`, así que cuando el agente está oculto **no escribe** el `r`
  del anillo ni el `r`/`opacity` del halo: quedan los de la búsqueda anterior. Es el mismo
  modo de falla que `GUIA-MOTION.md:151-156` describe para F3, pero sobrevivió en F1 y F5.
- **Qué NO está probado todavía, y es el primer paso:** que se **vea**. El digest de un film
  SVG es sobre el SVG serializado, y para F1 el `opacity` del grupo sí se escribe antes del
  `return`, así que los atributos filtrados cuelgan de un grupo invisible. **Probablemente
  invisible; inferencia, no medición.** Así que el paso 1 de este WU es comparar **píxeles**
  en el tiempo que diverge, en los dos órdenes, y recién ahí decidir la severidad.
- **Por qué importa aunque no se vea:** el film que se entrega hoy se renderiza siempre hacia
  adelante, así que **no hay defecto visible en el MP4 publicado**. Rompe el contrato
  («`seek(t)` es una función pura del tiempo») y arma una trampa latente: re-renderizar un
  tramo suelto —que es exactamente lo que va a pedir la iteración sobre assets, y lo que
  recomienda el método de referencia— devolvería frames distintos a los del render completo.
- **Superficies:** `scripts/motion-src/films/F1.js`, `scripts/motion-src/films/F5.js`.
- **Aceptación:** el gate da PASS para los cinco films, y el render hacia adelante de F1 y F5
  es **byte-idéntico al asset ya commiteado** — eso es lo que prueba que arreglar la pureza
  no cambia lo que se ve. Si el render cambia, el arreglo no era un arreglo.
- **Riesgo:** re-renderizar F1 con los flags exactos de su asset (`--blur 5`) es lento. Y si
  el asset commiteado no se puede reproducir byte a byte por una razón ajena a este cambio,
  hay que decirlo y no tocar el asset.

---

## 6. Lo que este plan difiere, explícitamente

- **Los cinco films de argumento**, con dither encima: rechazado con evidencia.
- **La sección Proyectos** (`GUIA-MOTION.md:457`): contenido nuevo, fuera.
- **Los diagramas técnicos densos** para el detalle de bitácora (`GUIA-MOTION.md:469-470`):
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
