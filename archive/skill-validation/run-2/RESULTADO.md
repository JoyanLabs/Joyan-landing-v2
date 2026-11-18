# El confín — validación en frío, corrida 2

**Skill:** `skills/joyan-escenas/SKILL.md`, versión 1.1. **Encargo:** exploración, receta 2B, footer sin texto ni interacción, cuatro presencias casi estáticas y deriva lenta. Sin arte ni assets externos. **Resultado técnico:** cuatro filas PASS; contraste exento y legibilidad independiente pendiente. **No equivale a una aprobación visual completa.**

Todos los enlaces siguientes son relativos a esta corrida. No se consultó la corrida anterior, `odd/tasks/*`, `docs/*` ni otras skills. No se modificó el motor, la constelación aprobada ni la serie de escenas. El documento ODD indicado por el encargo quedó deliberadamente sin leer por la restricción experimental; la cobertura S1/S4 aquí se limita al encargo delegado, sin afirmar criterios adicionales que no fueron visibles.

## Veredicto por fila de §4

| Fila | Veredicto | Número y evidencia | Alcance |
|---|---|---|---|
| Legibilidad | **NO MEDIBLE** | 0 observadores independientes, 0 ensayos cronometrados. Capturas [1280](scene-1280.png) y [390](scene-390.png); [boceto real a 390](sketch-390.png). | Revisé personalmente las tres imágenes; no soy ajeno a la iteración. No afirmo reconocer el sujeto en ≤3 s. H1. |
| Contraste | **NO MEDIBLE — NO APLICA** | 0 pares texto/fondo visibles. La página no tiene texto sobre la escena. | Exención explícita de §4, no fallo ni ratio inventada para los puntos. |
| Determinismo | **PASS** | 2 procesos Node independientes, 10 frames pineados, **160.849 bytes idénticos**. SHA-256 del payload: `d706bf295b5693e41da7e3970282ba7c97088636534a2c6cbbee7337cd5fcbc0`. | [sample-a.json](sample-a.json), [sample-b.json](sample-b.json), [chequeo](check-skill.mjs). Payload con `frameChars` íntegros y hash del RGBA, sin tiempos. |
| Coste | **PASS** | Node mediana/p90 **10,124 / 11,427 ms**. Chromium 1280: **14,300 / 14,800 ms**. Chromium 390: **14,400 / 15,000 ms**. Todos ≤16,67 ms. | 240 frames dinámicos medidos tras 60 de calentamiento, por entorno/viewport. Detalle abajo. |
| Saturación | **PASS** | **0 / 15.360 = 0 %**, máximo entre **720 frames**, por debajo de 5 %. El primero de los peores empatados es frame 0. Hay 397 celdas no vacías en ese frame. | [node-results.json](node-results.json). Cuenta el último peldaño real, no el máximo encontrado. Control negativo: 100 % con campo saturado. |
| Sin JS | **PASS** | [captura real 390×320 sin scripting](scene-390-no-js.png), **584 píxeles distintos del suelo**, módulo no ejecutado. Póster **1280×768** horneado por el motor. | `Emulation.setScriptExecutionDisabled(value=true)`, carga de imágenes completa. [browser-results.json](browser-results.json), [póster](poster.png), [horneador](bake-poster.mjs). |

Los PASS de coste se refieren a este equipo y al camino medido de CPU. No certifican 60 presentaciones físicas por segundo ni rendimiento de un teléfono por simular un viewport de 390 px.

## Orden seguido

1. **§1:** escribí [sketch.svg](sketch.svg) en tinta sobre blanco: horizonte bajo y cuatro contornos separados, sin conexiones. Capturé con Chromium a 390×320 y lo miré antes de programar el campo. No se usó el SVG como entrada del motor.
2. **§2:** elegí 2B antes de escribir la escena. [scene.mjs](scene.mjs) importa el motor real. Declara campo por capas, paleta propia con suelo oscuro `#020405`, 160×96 celdas, `ground=0`, `fps=30`, `cycleFrames=720`. Sólo el motor discretiza y pinta los puntos. No se leyeron escenas de referencia fuera de la superficie permitida.
3. **§3:** período **24 s**; desplazamientos de cada nodo de amplitud **0,7 celdas X / 0,35 Y**, con fases por elemento. No hay eventos ni historiales; el memo del cálculo de posiciones es una caché pura del tiempo. El navegador convierte segundos de `performance.now()` en índice de frame: salta índices si se demora, no alarga el ciclo. La URL de verificación fija el frame 0 después de medir, para capturar por estado.
4. **§4:** chequeo Node, horneado del frame 0, página mínima servida desde 4403, capturas por estado en 1280 y 390 y una tercera con scripting desactivado. No hubo esperas de duración fija.
5. **§5–7:** no hubo que solicitar assets, licencias ni imagen fuente. Se respetó un escritor por archivo. Los huecos están en [HUECOS.md](HUECOS.md), sin cambiar la skill ni completar en silencio sus reglas.

## Coste detallado (ms)

| Entorno | Frío separado | Mediana | p90 | Media | p95 | Peor medido |
|---|---:|---:|---:|---:|---:|---:|
| Node v22.23.4 | 21,295 | 10,124 | 11,427 | 10,426 | 12,356 | 15,423 |
| Chromium 156, viewport 1280×768 | 32,000 | 14,300 | 14,800 | 14,436 | 15,100 | 17,000 |
| Chromium 156, viewport 390×320 | 30,700 | 14,400 | 15,000 | 14,552 | 15,600 | 18,900 |

- Node: `renderFrame + rasterize`, buffer reutilizado, celda de 8 px.
- Navegador: lo mismo más `putImageData`; canvas nativo **1280×768** en ambos viewports. Cada muestra renderiza un índice dinámico; no se midieron simples lecturas del mismo frame.
- Índices de coste: `(i*3) % 720`, 240 muestras; percentiles por rango más cercano.
- El frío y los peores casos quedan visibles aunque excedan 16,67 ms. La aserción indicada por la skill es sobre mediana **y** p90, no sobre todos los frames.
- Las salidas precisas, sin redondear, están en [node-results.json](node-results.json) y [browser-results.json](browser-results.json).

## Determinismo, periodicidad e identidad de las dos salidas

Frames pineados: `0, 1, 90, 180, 270, 360, 450, 540, 630, 719`.

El hash RGBA nativo del frame 0 es `f4afb70b8cd2a7a9044e09c2fa2d45a6e86ca3d682628d0c9c1e98341bd78bb5`. Coincide entre el motor en Node, el PNG horneado decodificado, el buffer del canvas en ambos viewports y la captura de navegador a resolución nativa 1280×768. No hay dibujo alternativo de los puntos.

Salvaguardas adicionales (umbrales locales, no atribuidos a §4):

- Error máximo del campo en `t` frente a `t+24`: **3,775×10⁻¹⁵** en las posiciones/tiempos ensayados.
- Cambio máximo entre `23,999 s` y `0 s`: **4,123×10⁻⁵** de tono, cerca de la unión continua.
- Cambio máximo entre `0 s` y `6 s`: **0,193919**; los `frameChars` difieren, por lo que no es un benchmark de un campo inmóvil.
- Control saturado deliberado: **100 %**, correctamente fuera del límite de 5 %.

La imagen CSS y el canvas CSS a 390 no son píxel-idénticos tras el reescalado del navegador: 1.646 canales distintos, diferencia máxima 38/255. La procedencia e igualdad del raster nativo sí está comprobada; §4 no exige igualdad exacta entre esos dos reescalados. Esto se informa como corrección de una sobreaserción del verificador, no como defecto de la escena ni de la skill.

## Comandos ejecutados y resultados observados

Desde la raíz del repositorio, salvo la orden que hace `cd`:

```bash
cd design-studies/visual-directions/skill-validation/run-2 && TMPDIR=. chromium --headless --disable-gpu --no-sandbox --user-data-dir=./browser-profile --screenshot=sketch-390.png --window-size=390,320 file://"$PWD"/sketch.svg
```

**PASS**, salida `3465 bytes written to file sketch-390.png`; captura mirada antes de §2.

```bash
node design-studies/visual-directions/skill-validation/run-2/check-skill.mjs
```

- **RED inicial:** código 1, `ERR_MODULE_NOT_FOUND` para la escena aún no implementada. Es un RED de disponibilidad del entregable, no una prueba de regresión de un motor defectuoso.
- **GREEN:** código 0 tras implementar 2B, con dos procesos independientes byte-idénticos, saturación y coste dentro del límite.
- **TRIANGULATE:** nueva ejecución con código 0 después de añadir controles de campo saturado y cambio real entre fases; los resultados actuales son los que figuran en la tabla. El hash determinista se mantuvo idéntico.

```bash
node design-studies/visual-directions/skill-validation/run-2/bake-poster.mjs
```

**PASS**, código 0; PNG 1280×768 y metadatos del motor.

```bash
node design-studies/visual-directions/skill-validation/run-2/verify-browser.mjs
```

- **Primera ejecución:** código 1 por mi sobreaserción de igualdad entre capturas móviles reescaladas. No fue un fallo de coste, póster vacío ni requisito de la skill.
- **Ejecución corregida:** código 0; tres capturas reales, coincidencia del raster nativo, scripting desactivado comprobado y coste PASS en ambos viewports. El runner cierra Chromium y el servidor al terminar.

No se ejecutaron suites generales, builds, instaladores, formateadores, commits ni acciones de revisión. Los perfiles aislados `browser-profile/` y `browser-check-profile/` y el log de Chromium son artefactos de ejecución dentro de esta superficie; no son parte del diseño y no se borraron.

## Cobertura y decisión pendiente

- **S1 / T1, segunda corrida:** evidencia de exploración desde boceto propio a 390 hasta escena 2B real y evaluación fría de la skill 1.1. Se documentan pasos ejecutables y decisiones que hubo que completar.
- **S4 / T1, segunda corrida:** matriz completa de §4, chequeo reproducible, medidas Node/navegador y captura sin JS. Queda explícitamente sin certificar la prueba perceptual independiente.
- **Huecos restantes:** H1–H7 en [HUECOS.md](HUECOS.md). El motor no fue un callejón sin salida: la escena se renderiza por la vía real. El único bloqueo de aceptación visual es la falta de observación independiente y de una respuesta esperada definida para este sujeto abstracto.
