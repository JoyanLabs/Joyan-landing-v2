# Guía de Motion Graphics

> **Estado:** PRUEBA. La rama `test/motion-graphics` contiene este trabajo.
> No está integrada a `main` y no tiene aprobación formal de review.
> **Última actualización:** 2026-10-01

Este documento explica **cómo se hicieron** los films de la landing y, sobre
todo, **qué se aprendió por el camino**. Los films se pueden regenerar desde el
código; las lecciones no se regeneran solas.

La referencia de contrato visual (qué color significa qué, presupuestos,
reglas de accesibilidad) está en [`DESIGN.md`](./DESIGN.md). Este archivo es la
guía de método.

---

## Tabla de contenidos

- [Qué es esto](#qué-es-esto)
- [El pipeline](#el-pipeline)
- [Cómo reproducirlo](#cómo-reproducirlo)
- [El oráculo](#el-oráculo)
- [Los cinco films](#los-cinco-films)
- [Lo aprendido](#lo-aprendido)
- [Los errores que cometí](#los-errores-que-cometí)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Qué haría distinto](#qué-haría-distinto)
- [Pendientes](#pendientes)

---

## Qué es esto

La landing tiene cinco films de 15 s. Cada uno **afirma algo que Joyan dice en
serio**, con una fuente canónica:

| Film | Afirmación | Fuente |
|---|---|---|
| `harness-outcome` | Dos agentes idénticos producen el mismo resultado; solo el que tiene alrededor lo que lo sostiene sale bien | `plan/…/HARNESS_ENGINEERING.md` §1 — *6× de diferencia con el mismo modelo* |
| `action-gates` | Solo la acción irreversible se detiene, y espera a una persona | ibidem §5 — *un gate sobre todo es cuello de botella; sobre nada, nadie mira* |
| `harness-assembly` | El harness se arma alrededor del agente y **una banda entera nunca llega** | ibidem §4 — *el bloque de control es el que suele faltar* |
| `signal-freshness` | Las señales envejecen; la más vieja deja de fingir que está actual | dirección §5 + el copy de frescura |
| `knowledge-cycle` | Un pulso recorre el ciclo del conocimiento y vuelve transformado, detenido dos veces | `plan/…/decision-flow.mmd` |

El origen de la dirección visual está en el trabajo previo del equipo, no acá:
`pantallo/docs/style/style-directions.html` (tres composiciones originales con
animación por estado) y el piloto Archify en
`plan/docs/research/2026-09-07-visual-artifacts.md`. De ahí sale el principio que
gobierna todo lo demás:

> *Tres composiciones originales para comparar **jerarquía y movimiento**, no
> tres paletas del mismo tablero.*

---

## El pipeline

Cuatro archivos en `scripts/motion-src/`:

```
lib.js            el vocabulario: movimientos, paleta, cámara, primitivas
films/F1..F5.js   los cinco guiones, uno por film
composition.html  una sola página; el film es un parámetro (?film=FN)
render.mjs        recorre el reloj, captura, codifica
probe.mjs         el oráculo
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
mkdir -p ~/.cache/joyan-motion && cd ~/.cache/joyan-motion
npm init -y && npm i -D playwright && npx playwright install chromium
```

`MOTION_TOOLCHAIN` lo apunta a otro lado si vivís el toolchain en otro lugar.

---

## Cómo reproducirlo

```bash
# 1. dist/_astro/*.woff2 tiene que existir: el renderer copia de ahí las
#    tipografías de marca a scripts/motion-src/.
pnpm build

# 2. Renderizar y verificar. El oráculo tiene que decir "accepted".
for F in F1 F2 F3 F4 F5; do
  node scripts/motion-src/render.mjs --film $F --out dist-motion --blur 5 \
    --out-width 960 --crf 34 --av1-width 960 --av1-crf 46
  node scripts/motion-src/probe.mjs --film $F --frames dist-motion/frames
done

# 3. Recién entonces, a public/.
cp dist-motion/*.mp4 public/assets/motion/
```

`--blur 5` es motion blur real: cada frame es el promedio en luz lineal de cinco
capturas sub-frame repartidas en un obturador de 180°. F5 se renderiza **sin
blur** a propósito (ver [Lo aprendido](#lo-aprendido)).

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
| **costura** | si el último frame es igual al primero | en un video de fondo el empalme se ve en cada loop |

Estado actual:

```
F1 carry 0.54 · F2 0.49 · F3 0.66 · F4 0.51 · F5 0.48   → los 5 accepted
```

**El oráculo encontró cosas que yo no había visto.** No es decoración del
proceso: tres de los que_importantes errores de esta rama los detectó él.

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

Esto se verifica explícitamente: buscar F3 y F5 en órdenes opuestos tiene que
dar SVG byte-idéntico.

### 2. El motion blur baja el carry, y hay que decidirlo

F5 con blur 3 daba carry 0.44 y sin blur daba 0.48. Tiene sentido: difuminar
reduce la superposición entre frames, que es justamente lo que el oráculo mide.

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
un escalón de calidad, no un costo doble.

### 4. El CRF no es comparable entre encoders

Comparar "AV1 crf 36" contra "H.264 crf 34" no dice nada: cada encoder tiene su
escala. Hay que buscar el CRF que iguala tamaño y recién ahí comparar
calidad. La primera medición de AV1 salió *más grande* que H.264 y era porque
estaba mal configurado.

Ojo también: un intento de medir con VMAF dio ~23 para todas las resoluciones y
la alta puntuaba **peor** que la baja. Eso era un grafo mal armado, no un
resultado. **No decidir sobre una medición rota**; comparar el detalle a ojo.

### 5. Las métricas del oráculo también se rompen

Dos veces el oráculo dio verde/rojo por la métrica y no por el film:

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

Cinco films correctos y cero visitantes entendían nada. Dos arreglos:

- **El copy nombra la imagen**: cada sección lleva dos líneas, *qué se ve
  literalmente* y *qué significa para vos*, en idioma de visitante y sin jerga
  interna. El checker las exige en ES y EN.
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
estuviera el log.

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
  viven en `es.ts` y `en.ts`, con paridad verificada.

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

## Pendientes

- **La sección Proyectos** no se agregó. Es contenido nuevo y quedó fuera de
  este commit.
- **Audio.** Los films son mudos, como los de `escoaabierto.com`. Es una
  decisión, no un olvido.
- **La revisión quedó inconclusa.** Dos motivos, ambos externos al código:
  un candidato demasiado grande, y un intento anterior que se atascó pidiendo
  autorizar un re-scope por una vía que el facade no soporta. Los CRÍTICOS que
  encontró están corregidos y verificados; lo que falta es el veredicto.
- **Los diagrams técnicos densos** que se imaginaron para el detalle de bitácora
  no se hicieron. Falta decidir si esa superficie existe.