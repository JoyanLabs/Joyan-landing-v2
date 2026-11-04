# Puerto de la v1 a `src/`

Continuación del handoff `docs/HANDOFF.md` (corte 2026-10-25). Rama `test/motion-graphics`. Perfil `joyan-sol` activo:
worker `openai/gpt-6.1-sol` high, verify `nan/deepseek-v4-flash` high, orquestador `nan/deepseek-v4-flash` high.

## Specs

Cada spec cita el handoff aprobado en la sesión anterior. No se agregan requisitos no pedidos.

- **S1 · Campos del motor (WU108).** «Revertir `minTone` y `groundMode` de `engine.mjs` **antes** de que `src/` importe
  escenas: no tienen consumidor de producto, y dejarlos obliga a una segunda re-medida ruidosa del pin.»
- **S2 · Presupuesto del puerto (WU104).** «~**21,3 KiB** de JS nuevo contra **13,5 KiB** de holgura del pin.
  Mitigación acordada: **una emisión** en la primera carga, **papel como chunk perezoso** al usar el toggle, y
  **unificar el template duplicado** del generador (las dos emisiones son el mismo código dos veces).»
- **S3 · Contratos del sitio (WU105).** «Rompen si se portan sin tocarlos: `WU20_BUILT_PAGES` (exactamente seis HTML),
  `WU20_PAGE_CONTRACT` (camino único por `JoyanComingHero.astro`, sin importar `scene-runtime`), `LANDING_FROZEN_HASHES`
  (cinco chunks byte a byte). Se mueven **en el mismo commit y re-midiendo**, nunca en silencio.»
- **S4 · Un solo dueño (WU106).** «Hoy hay tres verdades bifurcadas: la regla de inversión vive en el módulo del
  estudio; el pipeline de bake/parche duplica `scene-runtime` y `public-sequence` (y le falta `pagehide`); y
  `scene-runtime` es contractualmente de laboratorio. Además el **póster horneado tiene que seguir siendo el LCP** y
  el módulo diferirse.»
- **S5 · 60 fps sostenidos (WU101).** «No está establecido: 52,83 / 59,82 / 54,05 fps en tres ventanas, con hueco de
  267 ms. Falta medir varios ciclos por suelo, incluida la ventana de la fugaz, con distribución y frames omitidos,
  escritorio y móvil/DPR 3, y fijar umbral.»
- **S6 · Superficie, costura y reproducibilidad (WU107/109/102).** «Sin readouts instrumentales en la página real;
  cadenas por `src/lib/i18n` y no dentro del módulo; `pagehide` para liberar; metadata real (canonical, hreflang,
  robots).» · «El contrato 6e está **rojo** (2,04× la mediana). Hipótesis: compara dos renders independientes cuando
  la página viva lleva historial continuo. Medir continuidad en **secuencia continua** a través del wrap, no relajar
  el umbral.» · «La evidencia y los contratos **no viajan en un commit**: `dist-motion*` está ignorado, no hay gate en
  `package.json` ni en CI, las sondas fijan `/home/joshrm` y el generador lee un SVG de `~/Descargas`.»
- **S7 · Decisiones abiertas de la página (WU119).** Requieren decisión del usuario, no del implementador:
  (1) la página no tiene CTA ni contacto porque el mazo no los tiene — ¿qué destino?; (2) la placa en papel queda
  pálida por construcción; (3) sin JS falta la constelación (el póster es sólo el cielo); (4) el toggle rotula
  «FONDO» como grupo, que no es el término del sistema («suelo»).

## Constraints

- Rama `test/motion-graphics` con la maqueta y el motor **sin commitear**: el árbol trae el spike completo. Un commit
  ahora arrastraría todo junto; WU102 (S6) es el que arregla eso. WU108 se entrega como cambio de árbol verificado.
- La medición de tiempo de pared es ruidosa con la máquina cargada: se afirma sobre mediana y p90.
- `EVENT_WINDOWS` es un objeto de fases normalizadas, no un array de segundos.
- La paleta `paper` del pipeline ya va de crema a tinta: **no** se le pasa `groundMode:'light'` (doble inversión).
- Perfiles: **prohibido** `opencode-go` (el proveedor ya no existe). Solo `nan/*` y `openai/*`.
- RDD está desactivado en este clone por decisión del usuario.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|---|---|---|---|---|
| T1 | Revertir `minTone` y `groundMode` del motor y verificar que el suelo oscuro queda byte-idéntico | S1 | inline | hecho en árbol (sin commit: WU102) |
| T2 | Presupuesto del puerto: una emisión, papel perezoso, template unificado | S2 | worker | — |
| T3 | Mover los contratos del sitio y re-medir en el mismo cambio | S3 | worker + verify | — |
| T4 | Puerto efectivo de la v1 a `src/` | S2-S3 | worker + verify | — |
| T5 | Un solo dueño de inversión y bake; póster como LCP | S4 | worker + verify | — |
| T6 | Medir 60 fps sostenidos y fijar umbral | S5 | worker | — |
| T7 | Superficie, costura 6e y reproducibilidad | S6 | worker | — |
| T8 | Cerrar las decisiones abiertas de la página | S7 | decisión del usuario | — |

## Evidencia por tarea

### T1 · Campos del motor (WU108) — verificado 2026-10-28

- **Cambio:** `scripts/scene-src/engine.mjs` vuelve a normalizar contra `groundTone` y deja de leer
  `options.groundMode`; `minTone` sale de `sceneMetrics`. El docblock de `renderFrame` declara ahora el
  contrato: es una **primitiva de suelo oscuro** y la inversión/normalización es del consumidor.
- **RED → GREEN:** `scripts/check-engine-surface.mjs` (nuevo, Node puro, 5/5). En rojo antes del cambio:
  «sceneMetrics does not expose minTone» y «renderFrame ignores a groundMode option». El golden del camino
  oscuro ejercita los cinco peldaños (71/93/81/70/69) y quedó pinneado.
- **Contrato pineado:** sobre paleta papel (suelo = tono más claro) `renderFrame` colapsa a paso 0. Es el
  comportamiento del motor **commiteado** (HEAD), no una regresión: verificado por render diferencial.
- **Diferencial contra HEAD:** 4 dithers × 4 frames del camino oscuro = **16/16 byte-idénticos**.
- **Motor:** `check-engine-dither.mjs` 12/12.
- **Consumidores revisados:** `design-studies/v1/v1.mjs` y `hibrido.mjs` ya calculaban `minTone` desde su
  propia paleta y usan `rasterize` con niveles propios (líneas 158/366), así que el suelo papel no cambia.
  `unicornio/build-unicornio.mjs` pasaba `groundMode: 'dark'` en ambos tratamientos: opción muerta retirada.
  `gpu-spike/spike.mjs` leía `metrics.minTone`: ahora lo deriva de `metrics.tones`.

## Log

- **L1** (2026-10-28, verbatim): «revisa el handooff de lo pendiente a trabajar en esta nueva session tenemos que cambiar
  los modelos con los que trabajamos para crear un nuevo perfil de gentle para trabajar esto restante de la pagina asi
  que revisa cual podemos usar y en que efforts para que salga bien esta pagina»
- **L2** (verbatim): «vale crea in script para ejecutarlo o para que tu lo ejecutes o me pidas la password por esa
  ventana de dialogo y otra cosa no es necesario que bajes efforts para ahorrar porque este perfil tiene que ser bueno
  bueno aprovecha glm y ferpsek que son buenos modelos pero aprovechenos tambien estos de gpt para la pagina para el
  codigo y buen gusto dale vamos»
- **L3** (verbatim): «vale mira no uses de opencode go que ya no tenemos solo de nan el deepsek flash , usa el derpsek
  flash y glm flash de nan y combinas con gpt para lo fuerte para lo demas puro nan para orquestador glm o derpsek es
  igual pon deepsek»
- **L4** (verbatim): «vale pero el effrt del orwuestador porque ko en hight ponle high»
- **L5** (verbatim): «ya esta activo procedamos entonces con la session y las tareas o ya lo marcas para que lo iunice
  en una session nueva y ya actualizas lo que ya hicimos porfa»
- **Decisión:** perfil `joyan-sol` registrado y pineado al repo; WU117 (implementador con modelo más potente) queda
  cerrado por este cambio, con autorización explícita del usuario.
- **Evidencia previa:** maqueta `design-studies/v1/` verificada 8/8 (WU114); mazo auditado (WU112); cuarto escenario
  con fuente (WU115). No se re-mide salvo que se toque lo que lo produjo.
- **2026-10-28 · T1 cerrada.** WU108 revertido y verificado (ver «Evidencia por tarea»). WU117 (implementador con
  modelo más potente) queda cerrado por el perfil `joyan-sol`.
- **Hallazgo:** el árbol trae la maqueta y el motor sin commitear; por eso T1 se entrega verificado pero **sin
  commit**. Sacarlo de ahí es WU102 (T7), no una decisión de esta tarea.
