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
| 3 | La escalera termina en 0,8125: ningún brillo llega al punto lleno | quinto peldaño a **1,0**, radio 0,7071; 63 celdas del póster suben de paso | P1 | Resuelto en WU19; **revisado en WU22**: el peldaño completo leía como cuadrado y queda en el **disco inscrito** (π/4 ≈ **0,7854**, radio **0,5000**) |
| 4 | Paleta de imágenes poco profunda (8 pedidas) | 15 entradas reales y error tonal 0,0078 (antes 7 y 0,0174) | P2 | **Resuelto esta ronda** |
| 5 | Aurora en bloques que puede sumergir al sujeto | lavado 0,2833 → **0,0930** de la rejilla; mancha 1193 → **117** celdas | P2 | **Resuelto esta ronda** |
| 6 | Profundidad de paleta de la librería: 30 frente a nuestras 7–10 | librería **30**, nuestra extracción **15**, paleta aurora con nombre **10** | P2 | Parcialmente (ver 6b) |
| 7 | Textura en zonas planas | gris plano al 50 %: pasos 0/2/3, pares planos 0,8822 (0,7760 re-medido en WU22 con el tope de tono) | P3 | Pendiente (documentado) |
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

### 3b. Corrección WU22: el peldaño completo era un cuadrado — recapado al disco inscrito

El propio hallazgo 3 lo anunció y el usuario lo confirmó a ojo: el quinto peldaño
de WU19 (radio 0,7071, la media diagonal) es el círculo circunscrito, cuyo
recorte a la celda ES la celda — cada brillo saturado se pintaba como un
**cuadrado**. WU22 recapúa la escalera al **disco inscrito**, cobertura
π/4 ≈ **0,7854**: los peldaños interiores de WU19 se reescalan a la nueva tapa
(cada uno × π/4) y los radios se re-derivan:
`[0, 0,1841, 0,3804, 0,6381, 0,7854]` → radios
`[0, 0,2421, 0,3480, 0,4507, 0,5000]`. La consecuencia se declara honestamente:
**los brillos culminan ahora en el disco inscrito** — la celda más brillante es
un punto grande y redondo, no la celda entera de tinta. Las comprobaciones
(`check-scene-engine`, `check-image-pipeline`) fallan si una celda pintada es un
cuadrado completo: la masa de esquina del último peldaño debe ser la de un disco
(en 8 px por celda, las cuatro esquinas quedan a cero, como corresponde a un
disco de radio 0,5).

Re-horneado WU22: PNG 43.235 → **35.270 B** (`6ae11f51…`), raster del póster
`bd1c708d…` → **`e6844efc…`**, MP4 re-codificado (**323.910 B**, `d11398bb…`),
y el fallback de la marca `coming-hero.png` re-horneado también
(38.615 → **31.561 B**, `a0ae3011…`). El bake sigue siendo exactamente el raster
del motor y Node/canvas siguen de acuerdo hash a hash.

## 3c. El núcleo blanco del unicornio: tope de tono por imagen — WU22, resuelto

El usuario lo señaló a ojo: los trazos densos del cuerpo del unicornio se leían
como "todo punteado de blanco". Medido: la auto-ganancia normaliza el tono de
TODO el dibujo (en la rejilla del hero, 160 × 80, ganancia medida 3,235; la
auditoría registró 2,944 a 200 × 100), así que el núcleo denso de trazos
superpuestos satura: las celdas del núcleo denso (celdas cuya vecindad 5 × 5 es
≥ 50 % entintada) que caían en el último peldaño eran **65 de 663 entintadas** —
y con el peldaño completo de WU19 cada una era una celda blanca completa.

La solución es un **tope de tono por imagen** (rodilla 0,6 → techo 0,86 sobre el
nivel ganado; los niveles por debajo de la rodilla no se tocan): el cuerpo
conserva gradación (puntos grandes en varios peldaños) en vez de un solo peldaño
quemado, y las zonas raras conservan su ganancia. Medido antes/después sobre el
mismo fixture y receta:

| Métrica | Sin tope | Con tope |
| --- | --- | --- |
| Celdas del último peldaño en el núcleo denso | 65 | **34** (47,7 % menos) |
| p90 entintado tras el tope (legibilidad de zonas raras) | 0,750 | **0,667** |

Recortes antes/después del núcleo (mirados a ojo además de medidos):
`dist-motion-verify/wu22/white-core/` (antes: masa blanca continua; después:
puntos redondos con gradación — honestamente, el núcleo sigue siendo denso:
es la densidad del trazo del dibujo, no una saturación del motor).

## 3d. La familia de barridos y la paleta de página — WU22

El barrido que el usuario vio en `/lab/image` se convirtió en familia: `glimmer`
(suavizado: banda más ancha y baja, con preservación del sujeto), **`wash`**
(lavado de color: banda ancha que cruza la escena entera con un tono que viaja
entre dos colores de la aurora adaptada) y **`shimmer`** (banda estrecha
brillante con chispa por hash, periódica por construcción). Medido sobre el
unicornio con la paleta de página (30 tiempos del bucle, 160 × 80):

| Barrido | Celdas > 0,12 de tono | Empuje máximo | Empuje medio en el sujeto | Empuje medio en el fondo | Sujeto/fondo |
| --- | --- | --- | --- | --- | --- |
| `glimmer` (WU22) | 24,32 % | 0,303 | 0,0586 | 0,0683 | 0,858 |
| `wash` | 28,67 % | **0,176** | 0,0517 | 0,0762 | **0,679** |
| `shimmer` | 8,15 % | 0,336 | 0,0190 | 0,0221 | 0,860 |

Re-medido en WU32 (la aurora y el wash se re-afinan para que el sujeto se lea,
§WU32): la aurora afinada mide ahora lavado **0,0418** de la rejilla (antes
0,0930), mayor mancha **42** celdas (antes 117) y retención del sujeto
**0,9700** (antes 0,9643). La textura plana se re-mide con la puerta de
escasez del auto-ganancia: **0,9331** de pares planos a ganancia 1 (el gain
1,5 de WU19 ya no se aplica a un input denso, §WU32).

**`wash` va a la página**: cubre más escena (el efecto "pasa sobre toda la
imagen cambiando el color" que pidió el usuario), su empuje máximo es el más
suave y es el que más respeta el sujeto. La costura de campo de los seis
overlays se verifica por construcción (≤ 1e-6 en t=0 frente a t=30 s).

La **paleta de página** (`joyan-page`, 12 entradas) se construye desde los
tokens del sitio: suelo ink-950 `#0b0b0c`, tinta hueso bone-50 `#f4f2ed`, acento
ámbar `#ffb000`, los verdes/violetas de la aurora adaptados a esa base y un
acento adicional que combina (rosa `#ff5d73`, puente entre el ámbar y el
violeta). Intercambiable en un solo sitio (`PAGE_PALETTE_ID`).
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
retenido **0,8562 → 0,9650** (0,9643 re-medido en WU22 con el tope de tono). La periodicidad sigue siendo por construcción
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
   **Resuelto en WU22 (opción B): la escalera queda limitada al disco inscrito
   (§3b).** Queda pendiente de la página única solo el tono: el núcleo denso del
   fixture sigue siendo denso (es la densidad del trazo, §3c).
6. **P3 (WU22)** — La página única ya está construida (§3c/3d): escena a sangre
   completa, texto arriba-izquierda sobre scrim medido (≥ 12,2:1), copy corto
   registrado con alternativas en el documento de seguimiento, contacto con
   correo y marca de Discord en nuestra estética (invitación pendiente de
   configurar por el usuario). Pendiente: Firefox/Safari y métricas de campo
   (LCP/CLS), que siguen sin medirse.

## WU32 — el warp como desplazamiento con estelas, el sujeto legible y el arco de texto (2026-10-10)

El usuario rechazó los fotogramas de WU31 (`dist-motion-verify/wu32/frames/`,
fotogramas 01–11): la ráfaga se leía como una **mancha gris**, no como
velocidad-luz; los acentos ámbar/rosa se dispersaban como ruido en los bordes
del marco; el crédito `TERMINATOR 2 · SARAH CONNOR` competía con el eyebrow
ámbar; la fila de puntos del pie no se quería; y el unicornio se perdía contra
un campo ruidoso. Cada defecto, medido con los métodos que ya teníamos.

### 1. La mancha gris: el warp re-construido como DESPLAZAMIENTO con ESTELAS

El hallazgo aplicado: un hypersalto funciona porque los puntos se **proyectan
con perspectiva y se dibujan como estelas desde su posición previa**, no
porque brillen más. En nuestro lenguaje de puntos (`scripts/scene-src/overlays.mjs`,
`warpOverlay`):

- **Remuestreo radial**: durante la rampa, la celda lee el campo base AL LO LARGO
  DEL RADIO hacia el centro con un tirón cuadrático en el radio (aceleración
  estilo 1/z): los propios puntos del sujeto se estiran hacia fuera desde el
  centro. El tirón es propiedad de la rampa (`warpRampOverrides`: 20 celdas en
  el radio de esquina al pico de la ráfaga, con inicio suave por smoothstep) y
  es nulo en bucket 0.
- **Estelas**: cada celda muestrea el campo base en varias paradas a lo largo
  de su radio (6 toques) con pesos que crecen hacia la cabeza y una puerta de
  brillo (solo viaja LUZ: el suelo oscuro no se emborrona). Máximo entre toques:
  la estructura se conserva y la energía nunca se acumula.
- **Ritmo dentro de la rampa**: inicio suave (el tirón sigue un smoothstep de
  s), destello en el pico (la ráfaga), convergencia (el settle vuelve a 0; el
  bucket 0 sigue siendo byte-idéntico a la composición pública, medido por
  `check-public-sequence` y `check-scene-engine`).
- **Disciplina de acento**: el ámbar de la onda viajera va montado SOBRE las
  estelas encendidas (la glow se multiplica por el brillo del contenido
  desplazado). Medido sobre la sonda determinista, a nivel RÁSTER:
  **antes** 913 celdas de acento nuevas en los bordes, **647 dispersas**
  (perpendicular > 1,5 celdas de todo radio activo — **70,87 %**); **después**
  **0** celdas de acento nuevas fuera de los radios y del núcleo. El núcleo
  caliente del bloom se encoge (radio gaussiano 0,11 → 0,05 del radio máximo:
  el disco blanco lleno de WU31 era la mancha).

| Métrica de la ráfaga (sonda del checker, 160 × 80) | WU31 | WU32 |
| --- | --- | --- |
| Celdas de estela interiores cambiadas (fuera de radios y bloom) | 2–3 | **912** (re-medido por la verificación independiente; el 390 del registro era de un ajuste intermedio) |
| Acento nuevo en bordes disperso (fracción) | 0,7087 | **0** (0 celdas) |
| Celdas ámbar de la ráfaga (absoluto) | ~1.979 sin puerta | **377**, todas en radios con luz |
| Costura de campo a fin de bucle | ~1e−15 | **1,9e−15** |
| Bucket 0 byte-idéntico a la composición pública | sí | **sí** |
| Coste por fotograma (Node, ráfaga) | — | 37,6 ms (presupuesto 12 fps: 83 ms) |

### 2. El sujeto debe leerse

Método del §5 (celdas del sujeto = cobertura de tinta > 0,4 del campo crudo;
suelo = ≤ 0,1), ahora sobre la geometría RODADA (+18 columnas — la máscara sin
rodar medía un dibujo que no está donde lo puso el render):

| Métrica | WU31 | WU32 |
| --- | --- | --- |
| Contraste sujeto/suelo (fracción de celdas del sujeto que pintan un punto menos las del suelo) | 0,2545 (registro WU31; en `b523efa` reproduce 0,7826 — el valor de referencia era de una iteración anterior) | **0,9170** (sujeto 100 % encendido) |
| Fracción de suelo ruidoso (tono > 0,15 en celdas vacías) | 0,2472 (en `b523efa` reproduce 0,1734) | **0,0392** |

Los cambios, medidos uno a uno: auto-ganancia con objetivo **0,75 → 0,9** y
techo **3,5 → 4,5**, más una **puerta de escasez** (cobertura entintada ≤ 0,25 —
la regla siempre fue «solo arte escaso y claro»; el gradiente de rango completo
vuelve a gain 1, medido), el unicornio queda a **gain 3,882** (antes 3,235).
Estrellas: densidad 0,055 → **0,045**, centelleo 0,9 → **0,8**, y preservación
del sujeto (celda con estructura se conserva). Aurora: mezcla 0,55 → **0,32**,
keep 0,55 → **0,75**, rodilla de preservación 0,55 → **0,08** (los trazos DÉBILES
del unicornio, tono ~0,16, estaban por debajo de la rodilla vieja y se hundían
en el color de la cortina: contraste medido −0,0786 antes del arreglo). Wash:
intensidad 0,4 → **0,24**, keep 0,5 → **0,7**. **Viñeta** radial nueva (última
capa del catálogo): empieza en 0,7 del radio del centro, profundidad 0,55 — una
viñeta por distancia al borde se probó y se rechazó medida: comía las líneas
exteriores del sujeto (contraste 0,0237 → 0,0165). El **tope de tono se queda
en 0,86**: subirlo a 0,92 se midió y se rechazó — debilitaba la guarda WU22 del
núcleo blanco por debajo de su propio corte del 25 % (122 → 102 celdas, 16 %).

Recortes y fotogramas: `dist-motion-verify/wu32/frames/` (04-burst, 05-full,
09-final a 1440; 10-mobile-final a 390), `dist-motion-verify/wu32/poster-after.png`
y `burst-after.png` (Node, render puro). Lo que sigue siendo subjetivo: la
densidad del cuerpo del unicornio es la densidad del trazo del dibujo (§3c) —
el núcleo sigue siendo denso; lo que cambió es que el suelo ya no compite.

### 3. El arco de texto: relojes por carácter, sin salto de caja

- **Un reloj por carácter** (`charDeadline`): cada carácter resuelve en su
  propio instante — franjas de 0,7/len con jitter determinista ±45 % de la
  franja, monótono estricto (bloqueo izquierda→derecha, desigual). Medido en
  vivo: glifos ciclando 27→23→19→14→11→6 mientras la línea se cierra.
- **Los glifos ciclan en el ACENTO** (`DECODE_ACCENT #ffb000`); el texto
  resuelto conserva el tono base (se elimina la ruleta de tres tonos de WU29,
  que leía como ruido).
- **Un solo nodo de texto real** por elemento (los spans son hijos del propio
  elemento; sin duplicados aria-hidden — no hay capas de glitch).
- **Sin salto de caja** (`reserveBox`/`releaseBox`): antes del primer span se
  tiende el texto FINAL y se fija su caja (min-width/min-height); el ancho de
  la caja medido a través del scramble es **constante** (448 px ES/EN a 1440,
  delta **0,00 px**; nombre 576, delta **0,00**). Antes (WU31): la extensión
  del texto saltaba **58 px** al resolverse (`dist-motion-verify/wu32/before-text-extent.json`).
  CLS total 0,0002 (sin cambio). Movimiento reducido: texto final sin scramble
  (medido: 0 spans ciclando).

### 4. Los arreglos de gusto que nombró el usuario

- **Crédito**: 12 px ámbar 0,24em → **10 px plomo-400 (`#8a8a90`) 0,12em**
  (medido en vivo contra el eyebrow: 12 px ámbar 0,3em — la jerarquía queda
  clara). Escala tipográfica final: eyebrow **12 px / ámbar / 0,3em** · nombre
  **Michroma 48 px (72 px ≥ sm)** · línea del destino **15 px** (fase fate,
  crece a 18 px) · línea del vigilante **18 px / bone-100** · crédito **10 px /
  plomo-400 / 0,12em** · nota del pie **12 px / plomo-400** · contacto
  **14 px mono**.
- **La fila de puntos del pie** (svg 104×8 junto a «© Joyan — no fate.») está
  ELIMINADA (el texto del pie y la fila de contacto se quedan; medido en el
  DOM sin JS: `dotRule: false`).

### 5. Presupuestos y límites re-pinados (WU32, nunca en silencio)

Landing **100.083 B gzip en 5 chunks** (delta **8.178** ≤ 22.528 frente al
fixture intacto de 91.905 — margen restante **14.350 B**; los dos chunks client
BYTE-IDÉNTICOS). Lab **43.481 B** bajo tope **45.529 B** (medido + 2.048).
`.artifacts/iteration-2-client-js.json` intacto. **LCP/CLS (método WU28,
Chromium local): LCP 2.340 ms (el h1 `Joyan` en la revelación), CLS 0.0002**.
Sin errores de consola, sin peticiones externas, sin desbordamiento a 390.
Queda abierto: Firefox/Safari, CPU real, y el juicio del usuario sobre la
nueva ráfaga (los fotogramas están en `dist-motion-verify/wu32/frames/`).

## WU33 — la compuerta de contenido retirada; el reveal de semitono medido

Método: cada afirmación con un número, sobre la sonda del checker (conversión de la marca 160 × 80,
rodillo 18, la misma geometría que el render) y sobre el navegador (método WU28, Chromium local).

### 1. El primer pintado (la compuerta retirada)

En el árbol previo (RED preservado en `dist-motion-verify/wu33/first-paint-red.json` + fotogramas), a
~100/400/800 ms el nombre, el eyebrow, el tagline y la escena medían **opacity 0** — la compuerta WU31.
Tras WU33, en las mismas marcas: **opacity 1 en los cuatro** con scripting, sin JavaScript y con
movimiento reducido (muestreo vivo en `dist-motion-verify/wu33/browser-evidence.json`, firstPaint).
**LCP 72 ms** (la imagen del póster, primer pintado) contra **2.340 ms** en WU32 (el h1 al llegar el
reveal): recuperación **2.268 ms**. CLS **0,0036 en el arco completo** (0,0001 con ventana corta en la corrida del ejecutor; se registra el número verificado, que sigue muy bajo el umbral de 0,1). El LCP era el coste de la compuerta; al retirarla se
recupera solo.

### 2. Las dos variantes de la máscara, medidas (el wipe se rechaza con números)

| métrica (mitad de rampa, sonda 160×80) | radial (enviado) | wipe (rechazado) |
| --- | --- | --- |
| celdas resolviéndose por frame | **142,5** | 119,6 |
| nitidez de borde (celdas cambiadas dentro de la banda) | **1,0** | 1,0 |
| sujeto medio-encendido (s50) | **0,167** | 0,417 |
| sujeto al 90 % (s90) | **0,167** | 0,5 |

El radial desde el sujeto gana en la métrica que importa: **el sujeto es reconocible antes de que el
reveal termine** (medio-encendido en el 16,7 % de la rampa; el wipe lo deja a oscuras hasta el 41,7 %).
Ambos son igual de nítidos (el dither Bayer de una celda del frente no deja ruido disperso en ninguna
variante). El centro de la máscara es el centroide entintado del payload: verificado a ≤ 0,12 del
recomputado de forma independiente (coincide a 4 decimales). La costura de campo del estado de máscara
es **2,9e−15** (máscara tiempo-libre); determinismo por render repetido e intercalado byte-idéntico;
estado 0 = todo suelo (0 celdas encendidas); el último estado de máscara difiere del estado asentado en
**0 celdas** (sin salto en la entrega) y el estado asentado es byte-idéntico a la composición base.

### 3. El ritmo medido en vivo (no sumado de constantes)

MutationObserver sobre `data-sequence-phase`, Chromium local, página pública ES:
typing **2.358 ms** · reveal **2.446** · full **333** · fateIn **1.160** · **fate 5.082** ·
scramble **1.668** · **arco total 13.047 ms** (suma de constantes 12.840; desvío vivo +207 ms — el
desvío de WU32 fue ~400 ms). El aguante del destino cumple el «~5 s por frase» del usuario (el defecto
WU32 era 1.900 ms) y el decode es 1,94× más lento que el de WU32 (860 ms). Caja fijada durante cada
decode (sin salto de ancho; CLS 0,0036 en el arco completo, atribuible a los decodificados en el lugar), relojes por carácter, acento solo en glifos ciclando, un solo
nodo de texto — sin cambios de forma frente a WU32.

### 4. La marca de 88 celdas

El pie muestra la conversión de 88 celdas que eligió el usuario (salida del pipeline, `wu23`),
horneada a 2 px/celda (176×176) por la ruta de raster del motor: **1.588 B** comprometidos en
`public/assets/brand/discord-mark-88.png` frente a ~150–200 kB de incrustar 3.360 puntos como markup
(svg inline) o el PNG de 13.353 B a 8 px/celda. Mostrada a 88 px: los puntos leen como textura fina,
la silueta y los ojos inconfundibles (recorte del pie en `dist-motion-verify/wu33/frames/13-footer-mark.png`).
La misma marca en la fila de contacto de `/lab/sequence`.

### 5. Presupuestos re-pinados (nunca en silencio)

Landing **100.882 B gzip en 5 chunks** (delta **8.977** ≤ 22.528 frente al fixture intacto de 91.905 —
margen restante **13.551 B**; los dos chunks client BYTE-IDÉNTICOS; hero entry 2.690 → 2.635 B;
overlays 9.478 → 9.967 B; rampa 556 → 921 B — la máscara entra, la ráfaga retirada sale del grafo).
Lab **44.344 B** bajo tope **46.392 B** (medido + 2.048). `.artifacts/iteration-2-client-js.json`
intacto. Verificaciones: `pnpm build` 6 páginas; `pnpm check` 0 errores (153 + 286 assertions); los
siete checkers verdes con `--out` propio en `dist-motion-verify/wu33/`, salvo `check-ascii-runtime`,
que queda en ROJO por tres afirmaciones de coste medido que viven en `src/pages/lab/ascii.astro` —
fuera de la superficie autorizada de esta unidad (escalado, no silenciado).

### 6. Juicio honesto sobre los fotogramas

La hoja de contactos anclada por fase (`dist-motion-verify/wu33/frames/20..29, 11..13`) muestra: primer
pintado completo (todo el contenido sobre la escena), el reveal con el frente de puntos nítido barriendo
desde el unicornio (bucket 4 ya lo deja medio-encendido con la banda ámbar en el frente), el decode del
destino con los glifos ámbar ciclando, el estado final idéntico al de siempre. El coste visible de
«nunca esconder contenido»: en el primer tramo del reveal el póster se funde mientras la máscara arranca
desde el suelo — se lee como un parpadeo breve a oscuro antes de que el sujeto resuelva (~600 ms,
cubiertos por el crossfade). Queda abierto: Firefox/Safari, CPU real, y el juicio del usuario sobre el
frente ámbar del semitono (0,55 de intensidad pico en la banda de florecimiento).
