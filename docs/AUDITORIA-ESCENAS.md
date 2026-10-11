# AUDITORÍA DE ESCENAS DE PUNTOS (WU19)

Auditoría completa del motor de escenas, del pipeline imagen→escena y de los
overlays, medida con los modelos que ya tenemos — no con impresiones. Cada
hallazgo lleva: **el número medido**, **el fichero de evidencia**, la **prioridad**
(P1 = defecto real que estropea la conversión; P2 = mejora de calidad medible;
P3 = pulido o documentación) y **si quedó resuelto esta ronda**. Los números de
esta página se re-miden en `scripts/check-audit.mjs` y la comprobación falla si el
documento se separa de lo que el código mide realmente. Nota de evidencia: el RED
de esta unidad se registró en `wu19/audit/red.json` y esa copia fue sustituida por
la corrida final verde (un directorio `--out` reutilizado); la lista de fallos
sobrevive en el registro del ejecutor y la falsabilidad del chequeo quedó probada
cuando la verificación independiente cambió un dígito del documento en una copia
descartable y el chequeo falló en la línea exacta.

**Método.** Todo número de esta auditoría se recalcula en Node desde los módulos
del motor (`scripts/scene-src/`): la escalera de cobertura se mide sobre las
máscaras reales, el prefiltro se mide sobre la región de rayado de la diana de
calibración, la ganancia sobre los percentiles de las celdas entintadas, la
aurora sobre el campo compuesto celda a celda en la rejilla de 200 × 100, y el
juego de pasos sobre fotogramas renderizados por el propio motor. Las capturas y
los recortes de zoom están en `dist-motion-verify/wu19/` y se han mirado a ojo
además de medidos; donde el ojo y el número no dicen lo mismo, se dice.

## Resumen de hallazgos

| # | Hallazgo | Número medido | Prioridad | Estado |
| --- | --- | --- | --- | --- |
| 1 | Aliasing del rayado fino contra la retícula | CV 0,8145 → **0,3519** con prefiltro | P1 | **Resuelto esta ronda** |
| 2 | Arte escaso y claro cae en el peldaño vacío | p90 0,395, pasos `19452/490/58/0` → ganancia 2,944 y `18827/554/370/175/74` | P1 | **Resuelto esta ronda** |
| 3 | La escalera termina en 0,8125: ningún brillo llega al punto lleno | quinto peldaño a **1,0**, radio 0,7071; 63 celdas del póster suben de paso | P1 | **Resuelto esta ronda** |
| 4 | Paleta de imágenes poco profunda (8 pedidas) | 15 entradas reales y error tonal 0,0078 (antes 7 y 0,0174) | P2 | **Resuelto esta ronda** |
| 5 | Aurora en bloques que puede sumergir al sujeto | lavado 0,2833 → **0,0930** de la rejilla; mancha 1193 → **117** celdas | P2 | **Resuelto esta ronda** |
| 6 | Profundidad de paleta de la librería: 30 frente a nuestras 7–10 | librería **30**, nuestra extracción **15**, paleta aurora con nombre **10** | P2 | Parcialmente (ver 6b) |
| 7 | Textura en zonas planas | gris plano al 50 %: pasos 0/2/3, pares planos 0,8822 | P3 | Pendiente (documentado) |
| 8 | Paso y escala de presentación | celda de entrega **8 px**, rejilla 200 × 100 (laboratorio 160 × 80) | P3 | Sin cambio (medido) |

## 1. Aliasing: el defecto que la diana de calibración destapó — P1, resuelto esta ronda

El cuadrante de rayado fino diagonal de nuestra diana de calibración
(`scripts/scene-src/local-inputs.mjs`, dibujo nuestro) convertía mal: el periodo
del rayado (~2,03 celdas) cae en la frecuencia de Nyquist de la retícula y las
celdas alternan golpe/agua, de modo que una zona de tono uniforme se leía como un
bloque de dither dominante. Medido: coeficiente de variación del tono en la
región del rayado **0,8145**, con celdas vecinas a 0 y a 0,79.

Arreglo: **prefiltro gaussiano acoplado al paso de la rejilla** (σ = 0,75 × paso,
tres pasadas de caja, alfa premultiplicado) aplicado antes de la medición por
celda (`image-pipeline.mjs`, `prefilterRgba`; `--prefilter none` lo desactiva y
reproduce WU18 byte a byte). Después: CV **0,3519**, tono medio conservado
(0,3190 → 0,3177). El degradado liso de control queda intacto (tono medio
idéntico a cuatro decimales, mismas inversiones de monotonía).

Evidencia: `dist-motion-verify/wu19/prefilter/target-before-160x80-cell8.png` y
`…-after…` (completas), `target-before-hatch-zoom3x.png` y `…-after…` (recortes
de zoom de la región de rayado), `dist-motion-verify/wu19/image-pipeline/node`
(clave `wu19.prefilter`), `dist-motion-verify/wu19/audit/`. Nuestra marca, medida
con el pipeline actual (prefiltro + ganancia): **1480** celdas entintadas de
12.800, fracción **0,1156**, ganancia registrada 1,2481 — es la medida que la
superficie del laboratorio muestra junto a las entradas.

Honesto: los trazos más finos que una celda se suavizan — el p90 de tinta de
nuestra marca baja de 0,946 a ~0,64 sin ganancia — y el hallazgo 2 recupera
buena parte de esa pérdida. No medimos una pérdida de detalle por debajo de la
celda porque, por construcción, ya no puede representarse.

## 2. Tono mapeado: el arte escaso y claro caía en el peldaño vacío — P1, resuelto esta ronda

El unicornio (fixture local, nunca distribuido) medía p90 de celdas entintadas
**0,395** y reparto de pasos **19452/490/58/0**: casi todo en la celda vacía, ni
un solo punto lleno. Arreglo: **auto-ganancia por imagen**
(`ganancia = clamp(0,75 / p90, 1, 3,5)`, registrada en `scene.params.gain` y en la
serialización). El fixture queda en ganancia 2,944 y reparto
**18827/554/370/175/74**: los cinco pasos en uso. El arte ya oscuro (nuestra
marca) y el rango completo (un degradado) se quedan en ganancia 1,000 — la regla
decide, no un refuerzo incondicional.

Evidencia: `dist-motion-verify/wu19/prefilter/unicorn-before-200x100-cell8.png` y
`…-after…` (el fixture solo existe en local), tabla del §14.2 de
`docs/MOTOR-ESCENAS.md`, `dist-motion-verify/wu19/image-pipeline/node`
(clave `wu19.autoGain`).

## 3. Resolución de rampa: la escalera terminaba en 0,8125 — P1, resuelto esta ronda

El punto más grande de WU16 cubre 0,8125 de la celda: un brillo nunca llegaba a
un punto lleno. La escalera gana un **quinto peldaño a cobertura completa 1,0**
con radio **0,7071** de celda (la media diagonal: el disco que llega a las
esquinas, cuyo recorte ES la celda). Radios re-derivados:
`[0, 0,2732, 0,3927, 0,5103, 0,7071]`. El anillo no puede cubrir una celda
entera (su agujero crece con él), así que en ese peldaño resuelve a su pico
medido y lo declara (`shapeCoverageCap`).

Esto cambia la escena entregada: en el póster de `joyan-night-coast` **63 celdas**
(luna, corazón de la lámpara, pintura hueso) suben al paso completo, y el bake se
re-horneó: PNG 41.906 → **43.235 B** (`16310df3…`), raster del póster
`2808ffc7…` → **`bd1c708d…`**, MP4 re-codificado (350.674 B). El bake sigue siendo
exactamente el raster del motor y Node/canvas siguen de acuerdo hash a hash.

Lo que se ve y no se disimula: a cobertura 1,0 un disco que cubre la celda entera
**es** la celda, así que los brillos saturados del paso 5 se leen como **celdas
completas (cuadrados)** en el raster a escala de píxel — la luna y el corazón de
la lámpara del póster lo muestran (`scripts/scene-src/baked/joyan-night-coast.png`);
a tamaño mostrado, con remuestreo del navegador, el efecto se suaviza, pero a 1:1
es un cuadrado, no un punto. Es el coste geométrico honesto de la saturación; si
la página única lo juzga demasiado duro, la alternativa medida sería limitar la
escalera entregada a ~0,9 o enmascarar el quinto peldaño con una forma redondeada
(el catálogo ya sabe resolver cualquiera de las dos cosas).

Evidencia: `dist-motion-verify/wu19/scene-engine/`, `dist-motion-verify/wu19/shape-study/`,
`scripts/scene-src/baked/`.

## 4. Paleta por defecto poco profunda para imágenes — P2, resuelto esta ronda

La extracción median-cut pedía 8 entradas; ahora pide **16** (la deduplicación
devuelve las que la imagen realmente tiene). Calidad medida como error tonal
medio por celda contra la paleta extraída, sobre un degradado liso: **0,0174 con
8 pedidas (7 entradas) → 0,0078 con 16 pedidas (15 entradas)**. En un line art
casi monocromo la profundidad no cambia nada — para fotografía y degradados, sí.

Evidencia: `dist-motion-verify/wu19/image-pipeline/node` (clave `wu19.palette`).

## 5. Overlays: la aurora en bloques que podía sumergir al sujeto — P2, resuelto esta ronda

A 200 × 100 la aurora de WU18 se leía en manchas grandes (~33 celdas de dither
por mancha vista en pantalla; medido como estructura conexa: **un lavado de 1.193
celdas**) y teñía el **28,33 %** de la rejilla por encima de 0,12 de tono,
restando contraste al sujeto (retención 0,8562). Afinado sin perder el efecto que
el usuario aplaudió («los colores y efectos y capas me gustó mucho»): 3 octavas,
retícula más fina, amplitud 0,92 → 0,55, y **mezcla que preserva el sujeto** (una
celda brillante retiene hasta 0,55 más de sí misma). Después: lavado **0,2833 →
0,0930** de la rejilla, mayor mancha **1193 → 117 celdas**, contraste del sujeto
retenido **0,8562 → 0,9650**. La periodicidad sigue siendo por construcción
(costura de campo 4,36e−15; costura renderizada 192 celdas contra un máximo paso
adyacente de 198 medido sobre los 360 pares del ciclo).

Evidencia: `dist-motion-verify/wu19/audit/aurora-before.json` y `…-after.json`
(constantes de HEAD frente a las afinadas, misma métrica y misma composición),
`dist-motion-verify/wu19/audit/`, capturas de `/lab/image` en la pasada de
comprobación completa.

## 6. Profundidad de paleta: librería 30, nuestras 7–10 — P2, parcialmente resuelta

La librería declara **30 entradas** por escena (20 usadas en el fotograma 0 de
`night-coast`); nuestras paletas con nombre tienen 7 (ink, paper) y 10 (aurora), y
la extracción por defecto rinde ahora hasta 15. Lo que una paleta más profunda
compra, medido: más niveles de tono por zona (el error tonal medio baja a la
mitad, hallazgo 4) y transiciones más suaves en degradados; lo que no compra:
resolución espacial — esa la pone la escalera (hallazgo 3). **6b, pendiente:**
nuestras escenas *autoradas* siguen en 12 entradas; una paleta autorada de 16–24
entradas es mejora candidata para la página única, con el coste de serialización
medido antes de adoptarla.

Evidencia: `dist-motion-verify/wu19/image-pipeline/node` (clave `comparison`).

## 7. Textura en zonas planas — P3, pendiente (documentado)

Un gris plano al 50 % (entre los peldaños 0,4844 y 0,8125) se reparte entre los
pasos 0/2/3 (fracciones 0,5722 / 0,0535 / 0,3743) con una fracción de pares
planos de **0,8822**: el Bayer 4 × 4 ordena el tránsito y la textura es la
esperable de un dither ordenado, no un defecto, pero en zonas planas grandes el
patroncito se nota a 8 px de paso. **Pendiente** para la página única: evaluar
`bayer8` o blue-noise como dither por defecto de las conversiones fotográficas
(nuestro tile azul ya existe y se mide en el catálogo), con el coste de frame
medido antes de adoptarlo.

Evidencia: `dist-motion-verify/wu19/audit/` (clave `flat`).

## 8. Paso y escala de presentación — P3, sin cambio (medido)

Celda de entrega **8 px por celda**, rejilla 200 × 100 en el motor (el
laboratorio de imagen convierte a 160 × 80 y el estudio ofrece 1/2/4 de
densidad). A 8 px el paso más pequeño mantiene borde redondo y tres coberturas
distintas; por debajo, la librería y nosotros nos aproximamos (es el límite de
cualquier máscara). Sin cambio esta ronda; es el dato que la página única
necesita para elegir paso según ancho.

Evidencia: `dist-motion-verify/wu19/audit/` (clave `pitch`), tablas del §12 de
`docs/MOTOR-ESCENAS.md`.

## Lo que queda, en prioridad, para la página única

1. **P2** — Paleta autorada más profunda (16–24 entradas) y dither por defecto de
   conversiones fotográficas (bayer8 o blue-noise), con coste de frame y de
   serialización medidos antes de adoptarlos (hallazgos 6b y 7).
2. **P2** — La página única debe elegir paso de presentación por ancho real
   (hallazgo 8): la textura plana y el tamaño de punto se leen distinto a 1,5 y a
   4 CSS px por celda; las capturas de `dist-motion-verify/wu19/` a 390/1440 y
   los recortes de zoom son el material de decisión.
3. **P3** — El arte escaso sigue siendo escaso: la ganancia normaliza el tono,
   no la cobertura (94 % de celdas vacías en el fixture). Para la página única,
   pensar la composición para que el sujeto llene marco o aceptar la escasez como
   estética (la causa es el sujeto, no el motor).
4. **P3** — El compromiso del prefiltro (trazos sub-celda suavizados) aceptado
   esta ronda; si algún arte lo sufre, un prefiltro anisótropo o por-regiones es
   la siguiente prueba, no un retroceso.
5. **P3** — El quinto peldaño pinta los brillos saturados como celdas cuadradas
   a escala de píxel (hallazgo 3). La página única decide: aceptarlo como
   saturación de medio tono, limitar la escalera a ~0,9 o enmascarar el peldaño
   con forma redondeada; las tres opciones son medibles con el catálogo actual.
