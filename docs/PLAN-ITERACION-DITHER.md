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

### 2.2 La rama entera no puede ser un candidato de review — y eso es una restricción de diseño

El preflight nativo de review falló con `lens_context_budget_exceeded` en `phase:
preflight`: la evidencia de las lentes excede el presupuesto de contexto, la evidencia
inmutable **nunca se trunca**, y «retrying this exact candidate cannot succeed». No se creó
autoridad, no se mutó nada. La continuación que da el proveedor es textual: partirlo en
**una secuencia encadenada de candidatos más chicos**, cada uno bajo el presupuesto.

Consecuencia que cambia el diseño de la iteración: **el corte en candidatos es una
restricción previa, no un trámite posterior.** Se diseña junto con el cambio.

**Hipótesis, no hecho probado:** que el peso sean los binarios (`public/assets/motion/`,
10 MP4, ~860 KB, el mayor `harness-outcome.mp4` de 198 422 bytes) más los 3 817 renglones
de texto. No está medido. **El primer candidato de la secuencia sirve justamente para
medirlo** (sección 4).

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

1. **De menor a mayor.** El primer candidato es el más chico posible y sirve para **medir
   el presupuesto real** de las lentes. Hoy no lo conocemos: sólo sabemos que la rama
   entera no entra.
2. **Binarios separados del código.** Un candidato puede ser sólo assets. Los assets
   pueden landear *antes* que su consumo: assets sin consumidor no rompen nada, y así los
   candidatos de código no cargan ~860 KB de MP4.
3. **Consumo junto con su asset por superficie.** Poster, thumbs y OG son tres candidatos
   independientes: cada uno es una superficie, con su PNG y su entrada de contrato.
4. **Cada candidato actualiza los checkers en su propio commit**, nunca en un commit
   aparte: `check-iteration-2.mjs` valida existencia, tamaño (≤300 KiB por film, `:1364`), unicidad
   dentro de su sección, orden AV1-antes-de-H.264 y los atributos del `<video>`
   (bloque del contrato de films, `:1349-1486`), más los presupuestos de PNG de dither (80/100 KiB, `:695-696`).
5. **Si un candidato no entra, se corta otra vez.** No se pide una excepción al
   presupuesto: se parte.

**Prohibido por diseño:** un candidato que sea «toda la rama», y un candidato que junte
dos superficies para ahorrar viajes.

---

## 5. Work units

Cada uno con superficies permitidas, criterios de aceptación y checks. **Ninguno está
empezado.** El orden es el de la tabla.

### WU1 · El plan y los docs de método (candidato de calibración)

- **Entrega:** este documento; `docs/GUIA-MOTION.md` con la sección de dither ya escrita
  (está en la rama); `odd/tasks/dither-look-spike.md` como registro.
- **Por qué primero:** es el candidato más chico posible. **Su review mide el presupuesto**
  y con eso se calibran todos los demás.
- **Aceptación:** los documentos describen lo que el código hace; cero referencias a
  archivos o mediciones que no existan.

### WU2 · `render.mjs` testable en proceso

- **Problema:** `render.mjs` no exporta ningún helper y ejecuta `main()` sin condición, así
  que la prueba que el repo ya usa para F3 y F5 —buscar `t` en orden inverso y comparar
  byte a byte— **no se puede correr** sobre una escena canvas. Es la deuda de
  `GUIA-MOTION.md:422`.
- **Superficies:** `scripts/motion-src/render.mjs`, más un script de prueba nuevo en
  `scripts/motion-src/`.
- **Aceptación:** `main()` sólo corre cuando el módulo es el punto de entrada; existe una
  prueba de independencia de orden para la escena raster; **y un control negativo** que
  demuestra que la prueba falla con una escena que hereda estado entre frames (el bug real
  que tuvo F3, `GUIA-MOTION.md:151-156`).
- **Checks:** re-renderizar J1 debe dar el **mismo sha256 conocido**
  (`6ab891ce4c367cfe041f203072534196afb5e3e93383242c55a36532fee6cc1c`), prueba de orden en
  verde, control negativo en rojo.
- **Riesgo:** tocar el renderer toca todo. Por eso el criterio es una identidad
  byte a byte, no una inspección visual.

### WU3 · Los binarios de films que ya existen

- **Entrega:** `public/assets/motion/*` (5 stems × {AV1, H.264}) landea solo, en su propio
  candidato.
- **Aceptación:** cada archivo ≤300 KiB, sin cambios de contenido respecto de lo que hoy
  está en la rama.
- **Checks:** `pnpm check:iteration-2` en verde.
- **Nota:** va antes que el código que los consume sólo si el consumo no existe todavía;
  si ya está wireado en `src/`, este candidato tiene que incluir esos componentes o la
  rama queda rota en el medio.

### WU4 · Reparar el drift de `docs/DESIGN.md`

- **Problema:** el contrato cita archivos que no existen: `public/assets/motion/el-caret.mp4`
  (`:278`, `:295`), `motion-src/film.mjs`, y tres figuras SVG inline
  (`OperationFlowFigure`/`SignalTraceFigure`/`CooperativeRingFigure`, `:100`, `:294`). Un
  contrato que miente es peor que no tener contrato, y lo que se revisa contra él.
- **Superficies:** `docs/DESIGN.md` únicamente.
- **Aceptación:** toda ruta citada existe en el árbol; la tabla de assets coincide con
  `public/`; el changelog registra el cambio.

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
| El presupuesto de las lentes es más chico de lo esperado y ni un candidato entra | WU1 existe para medirlo primero. Si ni el plan entra, el problema es el repo, no el corte, y hay que hablarlo antes de escribir una línea. |
| El supuesto de que los binarios son el peso del candidato es una hipótesis | No se actúa sobre ella: se mide con WU1. |
| Cambiar el renderer rompe films que ya funcionan | WU2 tiene como criterio una identidad sha256, no una inspección visual. |
| El look no sobrevive al ancho de mobile | M1 (WU5) y D4 existen exactamente por esto, y van antes de dibujar los assets finales. |
| El copy de la rama se cuela a `main` sin revisión de branding | Es la decisión D5. Si no se decide, el corte de la sección 4 tendría que excluir el copy por defecto. |

## 8. Cómo se cierra

- **Gate técnico:** `pnpm check` y `pnpm build` en verde en cada candidato
  (`.github/workflows/ci.yml:36-42`).
- **Gate de arte:** cualquier film nuevo pasa `probe.mjs` con veredicto `accepted`, y
  cualquier asset visual se mira **a 1:1** en los tres anchos.
- **Gate de review:** un candidato por vez, de menor a mayor, y la review es de vos: cada
  START abre su envelope de consentimiento y lo decidís vos. `push`, PR y merge también.
- **Cierre:** cuando `main` tenga el efecto y este documento esté cumplido o explícitamente
  diferido, la rama `test/motion-graphics` se archiva con su registro.
