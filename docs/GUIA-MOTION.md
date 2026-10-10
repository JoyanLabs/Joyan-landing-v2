# Guía de Motion Graphics

> **Estado:** experimento local validado y cierre local WU10 comprobado en `test/motion-graphics`.
> **No está integrado a `main`**; branding, revisión e integración real siguen pendientes.
> **Última actualización:** 2026-10-10 (cierre local, sin certificar producción)

Este documento explica **cómo se hicieron** los films de la landing y, sobre
todo, **qué se aprendió por el camino**. Los films se pueden regenerar desde el
código; las lecciones no se regeneran solas.

La referencia de contrato visual (qué color significa qué, presupuestos,
reglas de accesibilidad) está en [`DESIGN.md`](./DESIGN.md). Este archivo es la
guía de método.

**Cómo leer la evidencia.** Los números históricos, las comparaciones visuales y
los hallazgos de review de abajo son observaciones puntuales de la prueba: el repo
no conserva en archivos versionados los baselines, las capturas ni todos los
scripts ad hoc para repetirlos.
No son gates reproducibles. Donde hay un check actual, se nombra el comando; volver
a correrlo mide el fuente actual, no reconstruye automáticamente aquella medición.

---

## Tabla de contenidos

- [Qué es esto](#qué-es-esto)
- [El pipeline](#el-pipeline)
- [Cómo reproducirlo](#cómo-reproducirlo)
- [El oráculo](#el-oráculo)
- [Los cinco films](#qué-es-esto)
- [Lo aprendido](#lo-aprendido)
- [Los errores que cometí](#los-errores-que-cometí)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Qué haría distinto](#qué-haría-distinto)
- [El efecto de dithering](#el-efecto-de-dithering-prueba-2026-10)
- [Pendientes](#pendientes)

---

## Qué es esto

La landing tiene cinco films de 15 s. Cada uno **afirma algo que Joyan dice en
serio**, con una fuente canónica:

| Film | Afirmación | Fuente |
|---|---|---|
| `harness-outcome` | Dos agentes idénticos producen el mismo resultado; solo el que tiene alrededor lo que lo sostiene sale bien | HARNESS_ENGINEERING, documento externo al repo, §1 — *6× de diferencia con el mismo modelo* |
| `action-gates` | Solo la acción irreversible se detiene, y espera a una persona | ibidem §5 — *un gate sobre todo es cuello de botella; sobre nada, nadie mira* |
| `harness-assembly` | El harness se arma alrededor del agente y **una banda entera nunca llega** | ibidem §4 — *el bloque de control es el que suele faltar* |
| `signal-freshness` | Las señales envejecen; la más vieja deja de fingir que está actual | dirección §5 + el copy de frescura |
| `knowledge-cycle` | Un pulso recorre el ciclo del conocimiento y vuelve transformado, detenido dos veces | decision-flow, diagrama externo al repo |

El origen de la dirección visual está en el trabajo previo del equipo, no acá:
las direcciones de estilo de Pantallo (tres composiciones originales con
animación por estado) y el piloto Archify del informe de artefactos visuales del
2026-09-07 en el repo de planificación. Son fuentes externas: este árbol no las
incluye y no permite verificar esas referencias localmente. De ahí sale el principio que
gobierna todo lo demás:

> *Tres composiciones originales para comparar **jerarquía y movimiento**, no
> tres paletas del mismo tablero.*

---

## El pipeline

El pipeline en `scripts/motion-src/`:

```
lib.js            el vocabulario: movimientos, paleta, cámara, primitivas
films/F1..F5.js   los cinco guiones, uno por film
composition.html  una sola página; el film es un parámetro (?film=FN)
render.mjs        recorre el reloj, captura, codifica
probe.mjs         el oráculo
check-determinism.mjs  el gate local de independencia de orden
```

La idea central: **`seek(t)` es una función pura del tiempo**. No hay `rAF`, no
hay timers, no hay `Math.random` (la textura se genera con un hash
determinista). Buscar el mismo `t` dos veces da el mismo frame, y cambiar algo
es editar una línea y volver a renderizar.

El renderer camina un reloj, mueve el reloj en la página y saca una captura por
frame. ffmpeg arma el MP4.

**Playwright vive afuera del repo, a propósito.** Son ~150 MB de navegador y no
tienen por qué estar en el `pnpm install` de todos:

```bash
(mkdir -p ~/.cache/joyan-motion && cd ~/.cache/joyan-motion &&
  npm init -y && npm i -D playwright && npx playwright install chromium)
```

`MOTION_TOOLCHAIN` lo apunta a otro lado si vivís el toolchain en otro lugar.

---

## Cómo reproducirlo

Desde la raíz del repo, con el toolchain ya instalado:

```bash
# 1. Validar el build. stageFonts() copia las tipografías de marca desde
#    node_modules a scripts/motion-src/, no desde dist/_astro/.
pnpm build

# 2. Renderizar y verificar. El oráculo tiene que decir "accepted".
for F in F1 F2 F3 F4 F5; do
  W=960; B=5
  if [ "$F" = F1 ]; then W=1280; fi
  if [ "$F" = F5 ]; then B=1; fi
  node scripts/motion-src/render.mjs --film $F --out dist-motion --blur $B \
    --out-width $W --crf 34 --av1-width $W --av1-crf 46 || exit 1
  node scripts/motion-src/probe.mjs --film $F --frames dist-motion/frames || exit 1
  # Recién entonces, a public/. El próximo render reemplaza dist-motion.
  cp dist-motion/*.mp4 public/assets/motion/
done
```

`--blur 5` es motion blur real: cada frame es el promedio en luz lineal de cinco
capturas sub-frame repartidas en un obturador de 180°. F5 se renderiza **sin
blur** a propósito (ver [Lo aprendido](#lo-aprendido)). Es una receta de autoría,
no una garantía de MP4 byte-idéntico entre versiones de navegador y encoder.

---

## El oráculo

`probe.mjs` lee los frames renderizados y **rechaza** un film que se lee como un
slideshow. No es un linter: mide cosas que un ojo no puede medir solo.

| Check | Qué está mirando | Por qué importa |
|---|---|---|
| **cadencia** | la razón entre el beat más largo y el más corto | si todos duran lo mismo, es una plantilla por más bonito que sea |
| **quietud** | % de frames realmente muertos | los reposos son los que hacen aterrizar los movimientos |
| **carry** | cuánto de lo que estaba en pantalla sobrevive a cada frontera | si nada sobrevive, es un cambio de slide |
| **foco** | si el sujeto se disuelve en una niebla de frame completo, o sale de cuadro | algo tiene que estar mirando |
| **costura** | celdas muestreadas del último frame contra el primero, con tolerancia >24/255 | en un video de fondo el empalme se ve en cada loop |

Resultado registrado durante la autoría (no recalculado por este documento).
El check actual es `node scripts/motion-src/probe.mjs --film <F> --frames dist-motion/frames`
para F1..F5, inmediatamente después de renderizar cada film como arriba:

```
F1 carry 0.54 · F2 0.49 · F3 0.66 · F4 0.51 · F5 0.48   → los 5 accepted
```

**El oráculo encontró cosas que yo no había visto.** No es decoración del
proceso: tres de los errores importantes de esta rama los detectó él. Es una
observación histórica; el repo no conserva una prueba que reproduzca esos tres
fallos originales.

---

## Lo aprendido

### 1. El loop es un contrato, no una aspiración

Tres reglas que costaron una corrección cada una:

- **El último frame es `t = duración − 1/fps`, no `t = duración`.** Todo lo que
  sea periódico en la duración del film llega 0,016 desviado justo en el frame
  que tiene que igualar a `t=0`. Después el detalle que se me olvidaba: el *breathing*
  del agente es `sin(2π·t/duración)`, que da 0 en `t=duración` y **no** en
  `t=duración−1/fps`. En el borde superior de un círculo eso mueve suficiente
  antialiasing como para que se vea.
- **La cámara tiene que estar quieta antes del último frame.** Si termina de
  asentarse en el último frame, el loop queda abierto.
- **Nada se hereda del frame anterior.** F3 repintaba la banda del hueco solo
  mientras su stroke siguiera siendo `DEAD`. Tras el flash la banda entera se
  quedaba ámbar para siempre: el "sentido" que se veía venía de un bug de
  determinismo. Ahora se escribe el estado actual en cada frame, siempre.

Antes escribí que buscar F3 y F5 en órdenes opuestos «tenía que dar SVG
byte-idéntico». **El check no existía cuando lo afirmé.** Cuando se pudo medir,
F3 pasó y F5 divergió en `t=3`; al correr los cinco, F1 también falló en `t=0`.
F1 y F5 tenían estado heredado en atributos invisibles: ambas divergencias eran
`markup-only`, no diferencias en el raster pintado. Se corrigieron en `19b0d7c`;
el resultado registrado después del arreglo es **PASS en los cinco films**.

Hoy podés correr `node scripts/motion-src/check-determinism.mjs --film <F>`
para F1..F5. Compara SVG serializado **y** RGBA pintado en tiempos muestreados,
en orden directo, inverso, directo otra vez y con una página nueva; no prueba
todos los instantes del film. Necesita el toolchain aislado de Playwright,
es deliberadamente local y no entra en `pnpm check` ni en CI.

### 2. El motion blur baja el carry, y hay que decidirlo

F5 con blur 3 daba carry 0.44 y sin blur daba 0.48. Tiene sentido: difuminar
reduce la superposición entre frames, que es justamente lo que el oráculo mide.
Esos dos valores son una comparación puntual, sin frames baseline conservados
para reproducirla en el repo. Hoy medís cada variante con
`node scripts/motion-src/probe.mjs --film F5 --frames dist-motion/frames` después
de renderizarla con `--blur 3` o `--blur 1`.

En un film de hairlines de 1 px, nitidez ganó. **Regla: el blur es un trade
medible, no un default.** Medilo antes de decidirlo.

### 3. La resolución no se arregla con un super-res

El film se veía blando. La causa no era un upscale: se renderizaba a 1920×1080
nativo y se entregaba en 960×540, o sea un downscale mío, y después el browser
lo estiraba a 1440. Dos downscales encadenados.

Un modelo tipo Real-ESRGAN sobre contenido geométrico plano y hairlines de 1 px
**añade detalle inventado**: suaviza, no restaura. La DGX Spark no aporta nada
acá, porque el detalle no existe en el origen.

Lo que sí sirvió fue **entregar píxeles nativos con mejor códec**: AV1 (SVT) a
1280×720 quedó en 96 KB contra 194 KB del H.264 equivalente — más nítido *y*
más chico. Un browser descarga solo la fuente que puede decodificar, así que es
un escalón de calidad, no un costo doble. Esa comparación fue puntual; hoy
ambos encodes del hero son 1280×720 y los de sección, 960×540. Podés inspeccionar
cada salida con `ffprobe -v error -show_streams -show_format public/assets/motion/harness-outcome.mp4`
(repetí para cada MP4). No hay un runner conservado para repetir el juicio visual
sobre super-res.

### 4. El CRF no es comparable entre encoders

Comparar "AV1 crf 36" contra "H.264 crf 34" no dice nada: cada encoder tiene su
escala. Hay que buscar el CRF que iguala tamaño y recién ahí comparar
calidad. La primera medición de AV1 salió *más grande* que H.264 y era porque
estaba mal configurado.

Ojo también: un intento de medir con VMAF dio ~23 para todas las resoluciones y
la alta puntuaba **peor** que la baja. Eso era un grafo mal armado, no un
resultado. **No decidir sobre una medición rota**; comparar el detalle a ojo.
Son mediciones puntuales: el repo no conserva el grafo VMAF ni los encodes de esa
comparación, así que no puede reproducir esos valores.

### 5. Las métricas del oráculo también se rompen

El oráculo dio verde/rojo por la métrica y no por el film:

- **Promedio por celda mata las líneas finas.** Un trazo de 1,5 px promediado en
  su celda desaparece, y un frame compuesto se leía como vacío. Se cambió a
  **máximo por celda**.
- **Un umbral absoluto de luminancia asume que el film está expuesto como una
  página.** Este film es oscuro a propósito, así que un piso fijo lo declaraba
  vacío. Ahora se mide contra la **mediana del propio frame**: "¿hay algo
  compuesto acá?" sin asumir cuán brillante debería ser.
- **La costura se evaluaba sobre la estadística de máximo**, que es de un solo
  píxel y por lo tanto mide antialiasing. 147 píxeles de 2.073.600 con máximo
  12/255 son invisibles. Ahora pasa por comparación **por celda** (>24/255) y
  reporta las dos cifras, para que el cambio no quede escondido detrás del
  veredicto.

Los fallos de las métricas y los 147 píxeles fueron observaciones puntuales sin
baseline conservado. El oráculo actual se corre con
`node scripts/motion-src/probe.mjs --film <F> --frames dist-motion/frames`;
reporta delta máximo **por celda** y celdas muestreadas con delta >24/255, no
un conteo exhaustivo de píxeles ni identidad byte a byte.

La lección de fondo: **cuando una métrica y lo que uno ve discrepan, primero
sospechá de la métrica** — pero comprobalo contra el frame, no de memoria.

### 6. Una forma por significado, o no hay legibilidad

Cuatro films dibujaban al agente con r=64, r=58 y r=74. El portón era 46 y luego
38. **Nada se trasladaba entre films**, así que cada frame necesitaba su propia
explicación.

Ahora hay **una leyenda** en `lib.js` y **el hero es donde se enseña**:

| Glifo | Significa |
|---|---|
| Anillo con bloque dentro | algo que trabaja |
| Rectángulo en una banda | una pieza que lo sostiene |
| **Rombo ámbar** | un portón: se detiene y espera a una persona |
| Línea sólida que queda | evidencia, lo que se registró |
| La misma, punteada | ya no está actual |

F3 muestra después **el mismo agente con el mismo portón que falta**, y se lee
solo, sin explicación.

### 7. Un film que nadie nombra es decoración

Cinco films correctos y cero visitantes entendían nada — una observación
puntual de lectura, no un estudio de usuarios reproducible en este repo.
Dos arreglos:

- **El copy nombra la imagen**: cada sección lleva dos líneas, *qué se ve
  literalmente* y *qué significa para vos*, en idioma de visitante y sin jerga
  interna. El checker las exige en ES y EN (`pnpm check`).
- **El hero nombra su propio fondo**, que es lo primero que se ve y no decía
  nada.

Son **texto real**: si el film se quita por `prefers-reduced-motion`, el
argumento sigue en pie.

### 8. No dependas del arte para cumplir accesibilidad

El bloom ámbar del film llegaba al titular en su momento más brillante. La
primera versión confiaba en que la composición del film se mantuviera lejos del
texto. Eso es depender del **arte** para cumplir un mínimo de accesibilidad.

El scrim ahora es **opaco en toda la columna de copy**, no solo en su borde
izquierdo. Lo que el film haga, el texto se puede leer igual.

### 9. Astro scopea los estilos: el scrim no se aplicaba

`.hero-backdrop` vive en `MotionFigure.astro`, otro componente. Astro compila los
estilos del componente con un atributo `data-astro-cid-*` que ese elemento **no
tiene**. La regla se compiló y nunca aplicó, y el film pasaba derecho sobre el
titular sin que nada fallara.

Hace falta `:global()` en los dos lados. **Debuggear por CSS scope, no por
valores**: el scrim "no hacía nada" y no había error visible.

### 10. Los errores silenciosos son los caros

`page.on('pageerror')` está en el renderer porque un error de página aparecía
solo como un timeout de 30 s, sin mensaje. Pasó **tres veces** antes de que
estuviera el log. Es un registro puntual: no quedó un caso que reproduzca esos
tres errores en el repo.

---

## Los errores que cometí

Cuatro CRÍTICOS los encontró la revisión, todos introducidos por mí. Los cuatro
son el mismo patrón:

| Error | Por qué se me pasó |
|---|---|
| La guardia de `--out` aceptaba cualquier ruta externa y hacía `rmSync` recursivo: `--out ~/` borraba el home | Probé el valor correcto. No probé el valor equivocado. |
| El acumulador de blur dimensionado a 3 bytes/píxel cuando `getImageData()` da 4 (RGBA) | **Se veía bien.** La porción perdida caía en zona vacía |
| La guardia **fallaba abierta**: si `git` fallaba, `null` se volvía `''` y parecía "cero archivos tracked" | Probé que funcionara *cuando puede leer*. No probé que fallara |
| F3 leía el DOM previo en vez de escribir el estado | El bug **producía** el efecto que yo quería ver |

La lección que se repite: **escribo una guardia que cubre el caso que probé y
omito el que no probé.** Mi verificación siempre fue de un camino feliz.
Son hallazgos históricos de review; el repo no conserva un runner para repetir
las cuatro versiones rotas. Para la pureza actual de F3 está
`node scripts/motion-src/check-determinism.mjs --film F3`; el gate no es un test
de las guardias destructivas del renderer.

---

## Decisiones de diseño

- **Ámbar reservado.** Significa vivo, pendiente de humano, o detenido. Nunca
  decorativo. Por eso cada film lo usa para exactamente una cosa, y por eso el
  borde del texto "qué significa" es ámbar: ata el color a su significado.
- **Films sobre diagramas.** Un diagrama quieto se lee mejor que uno en
  movimiento, pero un diagrama no afirma nada por sí solo. Los films se quedan
  porque cada uno dice algo; el diagrama estático no se usaba para nada.
- **Un solo punto de entrada.** `composition.html?film=FN`: los cinco films los
  renderiza el mismo código, así que no pueden divergir entre sí.
- **El copy va en el locale, no en el componente.** `film.shows` / `film.means`
  viven en `es.ts` y `en.ts`, con paridad verificada por `pnpm check`.

---

## Qué haría distinto

1. **Commits pensados para ser revisables desde el primer día.** Esta rama junta
   cinco cambios distintos: copy, pipeline, hero, films y contrato. La revisión
   rechazó el candidato por tamaño (`lens_context_budget_exceeded`): 30 archivos
   de texto y 842 KB de video binario en un bloque. La próxima iteración divide
   por unidad de trabajo.
2. **Probar los modos de fallo de las guardias.** Escribir el test que mata el
   repo, no solo el que confirma que el render funciona.
3. **Renderizar en ISO antes que en dev server.** El `pageerror` de F5 apareció
   recién en el render; el dev server lo tenía callado.
4. **Menos elementos, más grandes.** La primera versión de F1 tenía la red en
   13 piezas chicas repartidas en un anillo: se leía como rectángulos flotando.
   La versión con dos agentes apilados y un lado vacío se entiende al instante.
   **El tamaño del sujeto es información, no decoración.**
5. **Validar el contraste de las figuras SVG a escala real.** Con un viewBox de
   720 renderizado a ~475 px (escala 0,66), un `font-size: 9` queda en ~6 px
   reales. Ilegible. El piso es 15 unidades, y subir el tamaño sin rehacer el
   layout pone las etiquetas una encima de otra.

---

## El efecto de dithering (prueba 2026-10)

La primera mitad de esta rama probó cinco films de hairline. Después entró otra
pregunta: el efecto de **dithering ordenado** de [`ascii.rest`](https://ascii.rest)
(bas3line, MIT), el que parece una impresión de puntos y no arte ASCII. La
respuesta corta: **el efecto se puede construir acá, y no se puede aplicar encima
de lo que ya teníamos**. Vale la pena entender por qué.

### Qué es la referencia, exactamente

`github.com/bas3line/ascii` es `ascii.rest@0.2.1`: TypeScript, **MIT, cero
dependencias, sin WebGL** según la inspección puntual de esa versión externa;
este repo no conserva un check que reproduzca esa auditoría.
Cada pieza es una función pura del tiempo que devuelve
una grilla de `cols × rows` caracteres — la misma ley que nuestro `seek(t)`, sobre
caracteres en lugar de SVG.

Las escenas que parecen fotos no son ASCII. Se sombrean celda por celda en color y
después se dibujan como halftone: **cada celda es un punto cuyo tamaño es su
brillo**, diteado ordenadamente, en el color de paleta más cercano a su tono. La
receta chica y precisa, en la pieza night-coast de ese proyecto externo (no es
un archivo de esta landing):

- rampa de puntos `" ·•●"`, cuatro pasos;
- **Bayer 4×4** normalizado, con sesgo de centrado `-0,47`;
- **compensación de color**: un punto chico se pinta más brillante y uno grande más
  oscuro, para que el gradiente siga siendo suave entre los escalones del dither;
- color por LUT de cubo RGB de 32 pasos, distancia ponderada `0,3R / 0,5G / 0,2B`;
- geometría por hash entero + value noise/fbm con período envolvente, nunca
  `Math.random`.

### Qué construimos

`scripts/motion-src/dither.js` (nuevo) + `--dither` en `render.mjs`, y
`scripts/motion-src/scenes/J1.js` con modo canvas en `composition.html`.

El dither corre **dentro del bloque que ya promedia los subframes de motion blur**,
después del blur y antes de codificar, y **a la resolución de salida**: si se ditea
a 1920 y después ffmpeg baja a 960, el remuestreo ablanda los puntos y el halftone
se vuelve gris. Por eso, con `--dither`, el `scale=` sale del filtro de ffmpeg y la
variante AV1 no se emite: sería una segunda pasada con otro dither.

### Lo que aprendimos

**1. Un halftone necesita tono, y nuestros films no tienen.** El pase sobre F1
funcionó técnicamente en esa prueba — lo aceptó el oráculo, la costura dio
`0.0/255` y se observó determinismo — pero el resultado no sirve: a 1:1 el ámbar desaparece, los
hairlines se degradan a cúmulos de puntos, y aparece una trama casi invisible en
**todo** el frame, incluso donde no hay nada (auditoría de píxeles: dominancia de
grises 11/12 contra ink 11 puro en el baseline). Eso último explica el **+34 % de
bytes** (141 KB contra 105 KB). La causa no es el algoritmo: es que nuestros films
son diagramas de trazo sobre ink plano. Donde no hay tono, un halftone sólo puede
inventar una trama.

**2. Con tono, el efecto aparece, y el oráculo lo exige de verdad.** `J1` sombrea
un slab iluminado, un disco con borde suave, un portón ámbar con glow y ruido fbm
determinista. A 1:1 se lee como una impresión, no como un diagrama. Histograma de
celdas: **71,6 % en step 0** (hay ink negro real), **1,08 % en la rampa ámbar**,
**0,20 % en el escalón más alto**.

La primera versión fue **rechazada** por el oráculo: 92,7 % de frames quietos. El
diagnóstico medido — diferencias frame a frame con PIL, no a ojo — fue útil y
poco halagador: el film llegaba a ~3 % de píxeles cambiados en t=3 s, se estancaba
ahí, y quedaban **1,5 s de aire muerto** antes de la costura. Era una foto que
respira, no motion graphics.

**3. Los dos contratos se contradecían si no había un golpe corto.** En la prueba
se interpretó la dirección visual como «algo nuevo cada 2 a 4 segundos»; el
`DESIGN.md` actual no exige ese intervalo. El oráculo sí pide
`beat máximo / beat mínimo ≥ 4` (`node scripts/motion-src/probe.mjs --film J1 --frames dist-motion/frames`).
Con beats parejos de 2-4 s el cociente no puede pasar de 2: **la aceptación es
imposible**. Los cinco films ya lo resolvían sin que estuviera escrito — un golpe
corto dentro de un ritmo largo. `J1` quedó en `3 / 3 / 3 / 0,75 / 3 / 2,25 s`
(cociente 4), y el golpe de 0,75 s es el destello del portón, no relleno.

**4. El oráculo mide dos cosas distintas.** El cociente de cadencia sale de la
**beat sheet declarada** en `meta`; el CV y el carry salen de **picos de energía
detectados**. Declarar un golpe no alcanza: tiene que pasar algo en el frame.

**5. El aire muerto es el enemigo, no la quietud.** El oráculo *quiere* al menos
~12 % de frames quietos: los reposos son los que hacen aterrizar los movimientos.
Lo que no tolera es un tramo final quieto. Pasamos de 91 frames de quietud
consecutiva (3,03 s) a **19 frames (0,63 s)**, con 3 frames (0,10 s) en el cierre.

### Resultado histórico del spike (no medición del árbol actual)

| | F1 hairline | F1 con dither | J1 (escena con tono) |
|---|---|---|---|
| H.264 960 px crf34, `--blur 1` | 105 KB | 141 KB | **197 KB** |
| Oráculo | accepted | accepted | **accepted, carry 0,92** |
| Costura | — | 0.0/255 | **0.0/255, f0000 y f0449 byte-idénticos** |
| ¿Sirve el look? | — | **no** | **sí** |

Reproducibilidad observada por un verificador independiente: dos corridas
completas de aquel fuente dieron el **mismo sha256 en los frames muestreados y en el
MP4 entero** (202 057 bytes). Fue una observación puntual, no un gate conservado
de reproducción del encode extremo a extremo.

Los histogramas, la auditoría PIL, el +34 %, las rachas de quietud y la tabla
son mediciones puntuales: el repo no conserva los baselines ni sus scripts ad hoc
para repetir esos números. Para medir el oráculo **actual** de J1, renderizá con
`node scripts/motion-src/render.mjs --film J1 --out dist-motion --blur 1 --out-width 960 --crf 34 --dither --dither-cell 8`
y corré `node scripts/motion-src/probe.mjs --film J1 --frames dist-motion/frames`.
Para pureza de la escena (antes del dither y del encode), el comando es
`node scripts/motion-src/check-determinism.mjs --film J1`. No equivale a comparar
dos MP4 completos. La identidad de extremos se comprueba con
`sha256sum dist-motion/frames/f0000.png dist-motion/frames/f0449.png`;
no presupongas que el resultado de hoy repite el baseline histórico.

### Del spike a la iteración local: estado actual

- **`render.mjs` no se podía testear en proceso; resuelto en `9535e04`.** Antes
no exportaba helpers y ejecutaba `main()` sin condición. Hoy exporta el setup y
sólo corre `main()` cuando es el punto de entrada (también por symlink).
`node scripts/motion-src/check-determinism.mjs --film J1` busca en orden directo,
inverso y directo otra vez, y compara con una carga nueva. El PASS registrado
incluye canvas; el control negativo cubre al comparador, no una escena rota
servida por `composition.html`. La costura byte-idéntica sola nunca probó pureza:
una escena con estado también puede volver al inicio después de un ciclo.
- **Densidad medida en WU5.** `measure-density.mjs` mide cajas reales con Chromium;
el objetivo es pitch mostrado6–8px CSS, no una constante universal de fuente.
La medición descartó thumbs/secciones pequeñas; hero y OG son las superficies elegidas.
- **El ámbar por mayoría de celda era el defecto que borraba el color reservado.**
Ahora la celda es elegible para la rampa ámbar por **máximo**, así que un hairline
ámbar de 1 px sobrevive. El piso de tinta (`deadZone`) es lo que permite que el
negro sea negro.
- **Regla de resolución generalizada** —por existencia, no por nombre— ya aplicada
en los tres lugares. La comparación byte a byte fue una observación puntual
sin baseline ni runner conservados para reproducirla; no es una garantía para
cualquier escena nueva.
- **Superficies candidatas del spike (histórico):** hero, thumbs de bitácora
(entonces el schema tenía `dither`, sin asset), OG y mark SVG para READMEs.
WU5 descartó los thumbs por su ancho mostrado; WU7 retiró campo, consumidor y
componente sin importadores. El resumen y el enlace de detalle localizado son la
alternativa textual; retiro verificado con iteration-3 486/0.
El checker rechaza reintroducciones, no las acepta para que Astro las descarte.
Aplicar el pase a los cinco films de argumento sigue rechazado.
- **Poster WU6/WU9:** `render-poster.mjs` local (Playwright) produce J1 a1600×900,
celda7,11,407B; el generador del proyecto no lo pisa. WU9 reencuadra anillo/bloque y
portón; `check-poster-framing.mjs --require-page-clear` registró12 contextos Chromium
reduced-motion ES/EN×390/768/1440×JS/no-JS. F1 normal y diez encodes no cambiaron.
- **OG WU8:** OG1 independiente,1200×628,celda16,6,571B. `render-og.mjs` local hornea
`og-tone.png`; `pnpm generate:dither` sin browser es el único escritor del PNG final.
Conserva máscara JOYAN y metadata; no es un hero reescalado ni un film.
- **WU10 local:** `node scripts/check-delivery-scope.mjs --self-test` pasa81/0;
`--base a702ef0 --head HEAD` acepta sólo el slice reciente, mientras `main..HEAD` y
el copy `654e22c..529a264` fallan. Prueba de rutas comprometidas, no branding ni entrega.

El plan que convierte todo esto en la iteración que va a `main` —superficies, orden y
corte en candidatos revisables— está en
[`PLAN-ITERACION-DITHER.md`](./PLAN-ITERACION-DITHER.md).

### Método: cómo se mira una trama de puntos

- **A 1:1, nunca en un contact sheet.** Una tira de 360 px sobre un frame de 960
*reduce* la grilla y la aliasea; en la primera revisión eso se leyó como «ruido»
cuando era remuestreo. Los recortes van con `crop=` y sin `scale`.
- **La animación se mide, no se mira.** `%` de píxeles cambiados contra el frame 0
cada 0,5 s, más la racha más larga de frames por debajo de 0,05 % de cambio. Eso
dijo en un minuto lo que el ojo iba a discutir veinte. Fue un análisis puntual
con PIL; el repo no conserva ese script, así que no es un check reproducible.
- **Cuando una métrica y lo que ves discrepan, sospechá primero de la métrica —
pero comprobalo contra los frames.** El «90/183/197 KB» parecía un renderer no
determinista y era el historial de tres revisiones de la escena.

---

## Pendientes

- **La sección Proyectos** no se agregó. Es contenido nuevo y quedó fuera de
  este commit.
- **Audio.** Los films son mudos, como los de `escoaabierto.com`. Es una
  decisión, no un olvido.
- **La revisión quedó inconclusa.** Dos motivos, ambos externos al código:
  un candidato demasiado grande, y un intento anterior que se atascó pidiendo
  autorizar un re-scope por una vía que el facade no soporta. Los CRÍTICOS que
  encontró se registraron como corregidos y verificados en aquella revisión
  puntual; el repo no conserva un runner para repetirla. La falta de veredicto
  es histórica: el gate nativo quedó desactivado para este clon por decisión
  explícita, según el plan, y la revisión ordinaria queda en manos del dueño.
- **Integración real en `main` y branding:** pendientes; no entregar toda la rama.
WU2 ofrece determinismo, WU5 midió densidad, WU6/WU9 cerraron el poster, WU8 el OG y
WU7 retiró thumbs; WU10 cierra la prueba local, no esa condición de integración.
- **Límites de evidencia:** no Firefox/Safari, anchos intermedios, scroll ni reconocimiento
de fallback de carga/codec; no-JS solo no fuerza poster. No prueba nueva de animación
halftone codificada. Para futuras fuentes OG falta guard de cromaticidad/opacidad;
fontconfig/librsvg conserva su caveat de portabilidad. Detalle en el plan.
- **Los diagrams técnicos densos** que se imaginaron para el detalle de bitácora
  no se hicieron. Falta decidir si esa superficie existe.