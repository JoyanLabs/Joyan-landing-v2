# dither-look-spike

> **Estado (2026-10-10):** spike histórico CERRADO; no va a `main` tal cual.
> Iteración local validada: [ODD canónico](./dither-iteration.md) y
> [plan local](../../docs/PLAN-ITERACION-DITHER.md). Integración real en `main` pendiente.
> **Origen:** pedido del usuario — «verificá si podemos integrar de mejor forma ese
> efecto de las escenas del dithering y si podemos colocar otras cosas».
> **Objetivo real:** sacar evidencia para después escribir el plan ordenado de la
> iteración que sí va a `main`. Este spike no es el entregable; el aprendizaje lo es.

## Por qué existe este spike (hallazgos de la exploración previa)

Verificado leyendo el repo de referencia y el nuestro:

- `github.com/bas3line/ascii` = npm `ascii.rest@0.2.1`, **MIT**, TypeScript, **cero
  dependencias y sin WebGL**. Cada pieza es `default(options) => frame(t, env) =>
  string`: una grilla de exactamente `cols × rows` caracteres, determinista por `t`.
  Es la misma ley que nuestros films (`seek(t)`), sobre una grilla de caracteres.
- Las **escenas** que le gustaron (night-coast, storm-plains, kyoto-dusk) se pintan
  «cell by cell on a square grid, then drawn as a halftone: every cell is a dot whose
  size is its brightness, ordered-dithered so gradients read as texture, in the palette
  colour nearest its hue» (`src/pieces/night-coast.ts:1-10`).
  Receta exacta: rampa de puntos `" ·•●"` (4 pasos) × **Bayer 4×4**, más
  **compensación de color** (punto chico se pinta más brillante, punto grande más
  oscuro), y el color sale de una **LUT de cubo RGB de 32 pasos** con distancia
  ponderada (0.3R, 0.5G, 0.2B).
- Nosotros ya tenemos **3 de las 4 piezas**: tabla Bayer (`lib.js:160`), campo en
  grilla (`lib.js:307` `ditherField`) y un pipeline determinista `seek(t)`.
  Falta: (1) la rampa de tamaño de punto, (2) la cuantización de color por celda con
  compensación, (3) un modelo de escena que produzca **tono continuo** (ruido/fbm)
  en lugar de hairlines planos.
- **Trampa ya conocida:** `render.mjs:290` dejó de snapear a paleta porque
  re-cuantizar borraba la grilla (un hairline al 20 % de alpha cae en luminancia 60,
  debajo de cualquier umbral de bone). La técnica de la referencia **no cae ahí**
  porque ditea *nivel* con offset Bayer y después compensa color por tamaño de punto,
  en vez de umbralar luminancia contra una paleta fija. Ese es el punto central del spike.
- `GUIA-MOTION.md` lección 5: **promedio por celda mata las líneas finas** → el
  oráculo ya se corrigió a máximo por celda. El dither de punto hereda ese problema y
  tiene que resolverlo.

## Restricciones que el spike NO puede romper

- Sin JavaScript de cliente nuevo por el look: el arte sigue **horneado** (MP4/PNG).
  Presupuesto de `check-iteration-3`: delta de JS de cliente ≤ 22 KiB.
- Paleta limitada a tokens. **Ámbar reservado** (portón / vivo): una celda sólo puede
  caer en la rampa ámbar si el pixel de origen ya es ámbar.
- Determinismo y costura: `seek(t)` puro, sin `Math.random`, **sin dither temporal**
  (si no, se rompen la costura del loop y el check `costura` del oráculo).
- Preview: `docs/DESIGN.md` manda; si el spike contradice el manual, se actualiza el
  manual con la justificación, no se ignora.

## Tareas

- [x] **T1 · Pase de dither horneado sobre F1** (Spike A) — CERRADA
      Nuevo `scripts/motion-src/dither.js` (funciones puras: muestreo por celda con
      media+máximo, cuantización a paleta con compensación, tinta de punto) y bandera
      `--dither` en `render.mjs`, aplicada **después** del acumulador de motion blur y
      **a la resolución de salida** (el encoder no debe reescalar, o el halftone se
      ablanda). Evidencia: F1 con dither a 960 de ancho, veredicto de `probe.mjs`,
      contact sheet y tira a ancho de teléfono.
- [x] **T2 · Decidir el look con evidencia** (A/B) — CERRADA. Veredicto: **no**.

### T1 — evidencia

| Medición | Hairline (baseline) | Con dither |
|---|---|---|
| Render F1, 450 frames, `--blur 1`, 960 px, crf 34 | 33,8 s | 78,5 s |
| Tamaño H.264 | 105 KB | **141 KB (+34 %)** |
| `probe.mjs` | accepted | accepted |
| `costura` | — | **0.0/255, 0 celdas >24/255** |
| `carry` | — | 0.93 |

- Determinismo probado: mismo buffer dos veces → salida byte-idéntica; la salida es
  el buffer de entrada.
- `detailKeep` probado con **control negativo**: con `detailKeep: 0` una línea
  brillante de 1 px **sí** queda en celda vacía, con el valor por defecto **no**.
- La costura del loop sobrevive el dither exactamente (`0.0/255`): era el riesgo
  central y no se materializó.

### T2 — veredicto: el dither no es un post-proceso para estos films

Mirado a **1:1** (no en la tira de 360 px, que *reduce* la grilla de puntos y
confunde aliasing con ruido real):

1. **El ámbar desaparece.** En el recorte queda una fila de puntos claros donde el
   baseline tiene las cuatro fichas ámbar. Causa: el peso ámbar se promedia por
   celda, y una ficha ámbar es un hairline de 1-2 px dentro de una celda de 8 px →
   peso ≈ 0,03, nunca supera el umbral `> 0.5`. El color reservado se pierde, y con
   él la única marca de «portón» de la leyenda.
2. **Hairlines degradados a cúmulos de puntos.** Los rectángulos y el anillo dejan de
   ser formas y pasan a ser «puntos un poco más brillantes».
3. **Piso de tinta:** la auditoría de píxeles del recorte da dominancia de grises
   11/12 (41 912 / 48 922 de 129 600 px) contra un fondo de gris 11 puro (94 492) en
   el baseline. O sea: el pase agrega una trama de puntos casi invisible en **todo**
   el frame, incluso donde no hay nada. Eso es lo que explica el +34 % de bytes.
4. La causa de fondo, que es la lección real: **nuestros films son diagramas de
   hairline sobre ink plano; casi no tienen tono**. Un halftone describe tono. Donde
   no hay tono, sólo puede inventar una trama. La referencia funciona porque sus
   escenas son fotográficas: miles de celdas con gradiente de iluminación, fbm y
   perspectiva.

**Decisión:** los cinco films de argumento se quedan como están. El dither necesita
contenido **autorado con tono**, no arte de trazos. Eso es T3, y es la prueba que sí
puede funcionar. Dos defectos de `dither.js` quedan anotados para T3 (no se tocan
antes de tener la escena, para no tunear a ciegas): zona muerta de tinta (celdas bajo
un piso de tono quedan ink puro) y ámbar por **máximo** de la celda en lugar de por
mayoría.

- [x] **T3 · Escena Joyan propia con la técnica completa** (Spike B) — CERRADA
      "Nuevo `scripts/motion-src/scenes/J1.js`: modelo de escena con hash entero + fbm,
      campo de tono continuo, y el dither de T1 (reuso, no copia). Contenido de la
      marca (banda del harness, agente, portón ámbar), no un faro ajeno. Requiere que
      `composition.html` hospede una escena raster además de SVG (se mantiene **un
      solo punto de entrada**).

### T3 — evidencia

`scripts/motion-src/scenes/J1.js` + modo canvas en `composition.html` + resolución a
`scenes/` en `render.mjs`/`probe.mjs` (por existencia, no por nombre).

Histograma de celdas a `t = 7,8 s` (el keyframe más iluminado): **71,57 % step 0**,
**1,08 % rampa ámbar**, **0,20 % top step**. A 1:1 (recortes `crop=` sin `scale`) el
look está aprobado: slab con gradientes por cara, anillo del agente, portón ámbar
como campo de puntos.

Primera versión **rechazada** (92,7 % frames quietos, plateau + 1,5 s de aire muerto
antes de la costura). Segunda versión **accepted**:

```text
  ok   cadence is varied (not uniform)    beat ratio 4.00x (want >= 4), CV 0.40
  ok   there is real stillness            64.9% dead-still frames (want >= 12%)
  ok   beats carry into each other        carry 0.92 across 10 boundaries
  ok   subject keeps a focus              0 empty outside rests, 0 out of frame, 0 dissolved
  ok   loop is seamless                   max cell delta 0.0/255, 0 cells differing by >24/255
  ok   film covers its declared duration  450 frames / 15.00s

  accepted   carry 0.92
```

Aire muerto: **91 frames (3,03 s) → 19 frames (0,63 s)**, con 3 frames (0,10 s) en el
cierre. Costura `0.0/255` y `f0000 == f0449` byte-idénticos. Tamaño 197 KB.

Reproducibilidad verificada de forma independiente (no por quien lo escribió): dos
corridas completas y separadas del mismo fuente dan **el mismo sha256 en los frames
muestreados y en el MP4 entero** (202 057 bytes). El refactor de resolución se probó
igual: el re-render devuelve ese mismo sha256.

Huecos históricos declarados, no tapados: la pureza por **orden de búsqueda** no se pudo correr
(`render.mjs` no exporta helpers y ejecuta `main()` sin condición), y el
desacuerdo histórico 90/183/197 KB quedó **inconcluso**: no hay snapshots del fuente
en cada iteración, así que no se puede probar que fueran revisiones distintas. Lo que
sí estaba probado entonces es que aquel fuente era reproducible. WU2 añadió después
el gate de determinismo y WU11 corrigió F1/F5; los fallos históricos quedan aquí,
no se reinterpretan como evidencia del árbol actual.

- [x] **T4 · Registrar el aprendizaje** — CERRADA

### T4 — evidencia

Sección nueva «El efecto de dithering» en `docs/GUIA-MOTION.md`: qué es la referencia
(técnica exacta), qué se construyó, las cinco lecciones, la tabla de resultados, lo que
hay que arreglar antes de la iteración de verdad, y cómo se mira una trama de puntos
(1:1 y medición, no contact sheet y ojo).

## Decisión de diseño abierta durante el spike (registro histórico)

¿El dither convive con el contrato «pre-baked, sin canvas salvo MAGI»? El spike
asume **sí** (todo horneado). Si T2 muestra que hace falta algo interactivo, la vía
compatible es una superficie con control explícito del lector copiando la disciplina
de `mount.ts` (pausa por IntersectionObserver, pausa en pestaña oculta, DPR tope 2,
primer frame quieto con `prefers-reduced-motion`). Nuestro `MagiParticleCanvas` ya
hace casi todo eso.

## Restricción de proceso descubierta

La rama entera **no se puede revisar como un solo candidato**: `review.start` ya falló
con `lens_context_budget_exceeded` (30 archivos + 842 KB de binario). Por eso el spike
va en work units chicos y con commits separados; la iteración a `main` se divide por
unidad de trabajo.

## Evidencia

- **Código:** `3efa702` — `feat(motion): add a bake-time ordered-halftone stage and a
tone scene` (5 archivos, +393/−31: `dither.js`, `scenes/J1.js`, `render.mjs`,
`composition.html`, `probe.mjs`). Sin binarios: los MP4 de prueba viven en scratch
(`dist-motion*/`, gitignored).
- **Scratch de T1/T2:** `dist-motion/` (con dither) y `dist-motion-baseline/` (sin).
`dist-motion/crop1to1-dithered.png` y `dist-motion-baseline/crop1to1-baseline.png`
son los recortes 1:1 de `t = 6,5 s` que deciden T2.
- **Scratch de T3:** `dist-motion-j1/` — frames, `assertions.mjs` (las cuatro
propiedades de `dither.js`), `measure.py` (envolvente frame a frame),
`native-7.8.png` y los cinco `boundary-*.png` a 1:1, más `evidence.txt`.
- **Scratch de verificación independiente:** `dist-motion-verify/runA|runB|runC`.
- **Documentación:** `docs/GUIA-MOTION.md`, sección «El efecto de dithering».
- Comandos exactos en `dist-motion-j1/evidence.txt` y en las tablas de arriba.

## Cierre

El spike responde la pregunta que lo originó. Sí se puede construir el efecto acá, y
sí se puede hacer con assets propios. No se puede aplicar sobre los cinco films de
argumento, y eso es un hallazgo, no un fracaso: el halftone necesita tono y esos films
son trazo sobre ink plano. El plan posterior ya ejecutó la iteración local (WU2/5/6/7/8/9)
y WU10 comprobó un gate local de rutas; no modifica esta evidencia ni descarta copy.
El siguiente paso es la verificación final independiente y la decisión de integración:
`main` todavía no contiene esta iteración. Estado vigente en los enlaces del encabezado.

