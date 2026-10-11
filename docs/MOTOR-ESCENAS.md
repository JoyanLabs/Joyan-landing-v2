# MOTOR DE ESCENAS DE PUNTOS

Método del motor propio de escenas de puntos de Joyan: qué dibuja, cómo se
escribe una escena, cómo se hornea y qué se adoptó —y qué no— de la librería
`ascii.rest` que se usa como referencia en el laboratorio `/lab/ascii`.

> Estado: **laboratorio aislado**. Ninguna página real importa este motor y la
> landing sigue con **cero** JavaScript de escenas en runtime. Este documento
> describe el motor y su método; no autoriza despliegue, cambio de hero ni
> adopción de marca.

---

## 1. Dónde vive

| Archivo | Qué es |
| --- | --- |
| `scripts/scene-src/engine.mjs` | El motor. Puro: sin DOM, sin canvas, sin `Math.random`, sin tiempo real. |
| `scripts/scene-src/scenes/joyan-night-coast.mjs` | Nuestra escena: costa nocturna con faro. Es **datos**, no código de dibujo. |
| `scripts/scene-src/scenes/index.mjs` | Registro de escenas. Añadir una escena es un módulo y una línea. |
| `scripts/scene-src/bake.mjs` | Horneado por Node: PNG (y MP4 opcional) con el mismo motor, sin navegador. |
| `scripts/scene-src/baked/` | El PNG horneado (y el MP4 opcional de la tubería), generados por `bake.mjs`. |
| `scripts/scene-src/adoption-ledger.json` | El registro de adopción: qué código de `ascii.rest` está adaptado, de qué archivo upstream viene y qué mejoramos. |
| `scripts/scene-src/ascii.rest-LICENSE` | El aviso MIT de la librería, conservado en este repositorio. |
| `src/lib/scene-runtime.ts` | El runtime del laboratorio: monta canvas, 12 fps, pausa, limpieza. |
| `src/components/joyan/SceneCanvas.astro` | Una escena nuestra, en vivo o horneada, con su pie de texto real. |
| `scripts/check-scene-engine.mjs` | La comprobación: arte, determinismo, igualdad Node/canvas y navegador. |

El motor es **el mismo archivo** para las dos salidas. Eso no es un detalle de
organización: es la condición que hace honesto un hero híbrido (horneado por
defecto, vivo al interactuar). Si el PNG y el canvas los dibujara código
distinto, serían dos parecidos y no la misma pieza.

---

## 2. El lenguaje visual, como código

- **Celdas cuadradas.** Una celda es una unidad en los dos ejes (`CELL = 1`). La
  escena se autora en una rejilla de 200 × 100 y se entrega a
  `DELIVERY_CELL = 8` píxeles cuadrados por celda (1600 × 800), tanto en el canvas
  como en el PNG. WU15 entregaba 4 píxeles por celda (800 × 400): a esa
  resolución el punto más pequeño caía dentro de cuatro píxeles y salía un
  cuadrado duro de 2 × 2, sin antialiasing en ningún sitio.
- **Rampa de puntos.** Exactamente `" ·•●"`: vacío, punto, punto medio, punto
  lleno. Nunca arte de glifos ASCII: el runtime no dibuja texto (la comprobación
  falla si aparece `fillText`, `ctx.font` o similar) y la rampa se usa como
  carácter solo para inspección y pruebas (`frameChars`).
- **La máscara es una elección (WU17).** El disco es **una** máscara entre once:
  hay también cuadrado, cuadrado redondeado, rombo, triángulo, hexágono, anillo,
  cruz, rayado, grano sin forma y un modo de glifo, y todas se resuelven desde la
  misma escalera de cobertura medida. El motor las expone por
  `maskFor(forma, paso, w, h, rampa, geometría)` y `renderFrame`/`rasterize`
  aceptan un objeto de opciones (forma, rampa, dither, geometría de celda,
  densidad); las opciones por defecto son el disco de WU16 sobre celdas 1:1 con
  Bayer 4 × 4, así que la escena y el horneado no cambian. El catálogo, su
  derivación, su coste y a qué paso se leen están en §12.
- **El punto es un disco redondo y antialiaseado.** Cada píxel de la celda
  recibe **el área exacta** del disco que cae dentro de él (`quadrantArea` /
  `discAreaIn`: el área bajo el arco y la inclusión-exclusión en los cuatro
  vértices), no una cuenta de submuestras. Las formas cerradas cuadran: un disco
  de radio 2 en una celda de 4 px cubre su píxel de esquina 0.31515 y su píxel de
  eje 0.91315. El antialiasing es real en cada paso: el paso más pequeño tiene al
  menos tres coberturas distintas y su esquina nunca es más clara que su borde.
- **Curva de cobertura medida.** Cada paso de la rampa tiene un área de tinta
  real. `COVERAGE = [0, 0.2344, 0.4844, 0.8125]` es la escalera que la máscara
  supersampleada de WU15 **midió** en su celda de entrega; se conserva como
  objetivo y ahora la máscara la alcanza **exactamente en cualquier tamaño de
  celda** (medido 0.234400 / 0.484400 / 0.812500 a 4, 8 y 16 px por celda, frente
  a la deriva 0.2422 / 0.5117 / 0.7930 de la versión anterior a 8 px). De esa
  escalera se **derivan** los radios (`DOT_RADIUS`, en unidades de celda):
  `[0, 0.2731, 0.3927, 0.5103]`, por bisección sobre el área exacta del disco
  recortado, no por una fracción asumida de la celda. El mayor es el disco
  inscrito (0.5) más el 2 % que pide la escalera medida, y el raster recorta lo
  que cae fuera de la celda. La escalera de tono (`ladder`) se deriva de esa
  medición: la curva que traduce luminancia a paso es la misma curva que dibuja
  los puntos.
- **Dither ordenado.** Matriz de Bayer 4 × 4. Un nivel entre dos peldaños de la
  escalera se reparte **espacialmente** entre esos dos pasos vecinos: nunca salta
  más lejos. Un nivel justo en un peldaño dibuja ese paso en las 16 celdas del
  bloque; el punto medio reparte 8 y 8.
- **Una paleta indexada por escena.** La escena declara su paleta `#rrggbb` y el
  índice de su fondo (`ground`). Todos los píxeles que se pintan son una mezcla
  fondo → color de paleta: ningún color fuera de la paleta puede aparecer, y la
  comprobación lo verifica píxel a píxel en Node y en el canvas.
- **Compensación de paleta.** Dos mecanismos, y los dos son medibles:
  1. El campo se **normaliza contra el rango de la propia paleta** (de
     `groundTone` a `maxTone`), así una paleta oscura no se colapsa en el paso 0.
  2. Por celda, el motor elige la entrada de paleta cuyo **tono renderizado**
     —color × cobertura del punto + fondo asomando— se acerca más a lo que pidió
     el campo, ponderando también el error de croma. Un punto pequeño se lleva a
     una tinta más clara y un punto grande a una más oscura; una tinta oscura
     sobre fondo oscuro no es un fallo de dibujo, es una selección resuelta.
- **Ruido determinista.** `hashNoise(x, y, seed)` es una función pura de las
  coordenadas y la semilla (enteros, `Math.imul`): la misma celda da el mismo
  número en Node y en cualquier navegador, sin `Math.random` y sin estado
  acumulado. Es lo que permite reproducir un fotograma byte a byte.
- **Tono en un solo espacio.** Todo el cálculo de tono ocurre en un espacio de
  pantalla (luma `0.2126 R + 0.7152 G + 0.0722 B` sobre canales 0…1), no en luz
  lineal. Es una limitación declarada (ver §8).

---

## 3. Cómo se escribe una escena

Una escena es un objeto con pocas claves y una función:

```js
export const miEscena = {
  id: 'mi-escena',
  label: 'una línea legible para el pie',
  cols: 200, rows: 100,          // rejilla
  fps: 12,                       // techo del laboratorio
  cycleFrames: 360,              // 30 s: el bucle cierra exacto
  posterFrame: 30,               // el fotograma estático y el que se hornea
  palette: ['#0b0b0c', /* ... */],
  ground: 0,                     // índice del fondo
  groundHex: '#0b0b0c',
  params: { /* lo que se documenta abajo */ },
  field(x, y, t) { /* devuelve [r, g, b] en 0..1 (o un número: gris) */ },
};
```

Reglas prácticas:

1. **El `field` habla la paleta.** Si compones con los colores de la propia
   paleta (mezclas entre entradas), la compensación aterriza en la entrada
   buscada; si inventas colores, el motor aproxima.
2. **Todo tiene que ser periódico en `LOOP_SECONDS`, y eso se mide en el `field`.**
   Cada término animado debe cerrar sobre la duración del bucle: una sinusoide con
   un período que la divida (6, 7.5, 15, 30 s aquí), **o** un desplazamiento de
   retícula que recorra un número entero de *wraps* del ruido. Comparar
   `renderFrame(0)` con `renderFrame(cycleFrames)` no demuestra nada: el índice de
   fotograma se envuelve con un módulo, así que esas dos llamadas son la misma por
   construcción. La comprobación evalúa el `field` en `t=0` y en
   `t=LOOP_SECONDS`, canal a canal, y exige que la costura no sea peor que un paso
   de fotograma normal:
   - costura medida: **máx 2.83e-15 / media 8.58e-17** (tolerancia 1e-6);
   - referencia de fotogramas adyacentes: **máx 0.0988 / media 0.00599**;
   - costura de la animación (fotograma 359 → 0): máx 0.0938 / media 0.00567, es
     decir **más suave** que un paso normal;
   - a nivel de píxel renderizado: **1.345 celdas** cambian en la costura frente a
     **1.453** en un par adyacente.
   Antes de la corrección la misma medición daba máx 0.378 / media 0.0181: un
   salto visible cada 30 s.
3. **Los parámetros declarados se usan.** No dejes una clave en `params` que
   nadie lee: el documento y el código dejarían de coincidir.
4. **Los desplazamientos de retícula van en unidades de retícula, no en píxeles.**
   `driftLattice = (t / LOOP_SECONDS) * WRAP` deja el desplazamiento total en
   exactamente `WRAP` al final del bucle, que es lo que hace que el ruido vuelva
   al mismo punto de la retícula. Si lo expresas en píxeles y luego multiplicas por
   la escala, el cierre depende del redondeo.
5. **Un fondo oscuro se lee por silueta.** Lo que queda delante del cielo debe ser
   más oscuro que la bruma, y el borde iluminado es lo que lo hace legible.

---

## 4. Los parámetros de `joyan-night-coast`

Seis grupos, todos en fracciones de rejilla o segundos. Debajo están las
constantes del bucle, que son las que hacen que la escena cierre (si cambias una,
la comprobación de periodicidad lo dice):

| Constante | Valor | Qué controla |
| --- | --- | --- |
| `LOOP_SECONDS` | `30` | Duración del bucle; `cycleFrames` se deriva de ella. |
| `CLOUD_SCALE` | `0.055` | Celdas por unidad de retícula en las nubes. |
| `CLOUD_WRAP` | `11` | *Wrap* de retícula en x: la deriva total del bucle es exactamente este número, así que las nubes vuelven al mismo punto. |
| `CHOP_RATE` | `0.6` | Filas de retícula por segundo que se desplaza el chop del agua. |
| `CHOP_WRAP` | `18` | *Wrap* de retícula en y del chop: `0.6 × 30 = 18`, así que el agua también cierra. |
| `TWINKLE_PERIOD` | `6` | Período del parpadeo (cinco ciclos por bucle). |

| Parámetro | Valor | Qué controla |
| --- | --- | --- |
| `horizon` | `0.62` | Fila donde el cielo se vuelve mar (fracción de filas). |
| `moon.x`, `moon.y` | `0.75`, `0.16` | Centro del disco lunar, en fracciones de la rejilla. |
| `moon.radius` | `3.6` | Radio del disco, en celdas. |
| `moon.glow` | `0.95` | Cuánto halo y cuánta bruma aporta la luna. |
| `stars.count` | `140` | Cuántas estrellas hay. |
| `stars.seed` | `20261010` | Semilla: decide **cuáles** celdas tienen estrella. |
| `stars.twinkle` | `0.3` | Profundidad del parpadeo (período 6 s). |
| `sea.swell` | `3.6` | Cuántas filas puede desplazar el ruido a una cresta. |
| `sea.bands` | `7` | Crestas a lo ancho del agua visible. |
| `sea.period` | `7.5` | Bucle de la marejada, en segundos (divide `LOOP_SECONDS`). |
| `tower.x` | `0.265` | Centro de la base del faro (fracción de columnas). |
| `tower.height` | `0.4` | Altura del faro, fracción de filas desde la loma. |
| `tower.width` | `2.6` | Ancho máximo de la torre, en celdas. |
| `beam.period` | `15` | Una vuelta completa del haz cada 15 s (dos por `LOOP_SECONDS`). |
| `beam.spread` | `1.5` | Semi-ancho del cono, en celdas (se abre con la distancia). |
| `beam.reach` | `0.86` | Alcance del haz antes de apagarse. |
| `beam.flare` | `0.55` | Cuánto se aviva la lámpara cuando el haz mira al espectador. |

La paleta es de 12 entradas construida con los tokens del proyecto —`#0b0b0c`
(ink), `#f4f2ed` (bone) y el ámbar reservado `#ffb000` para la lámpara y el haz—
más interpolaciones entre ellos. El ámbar aparece **solo** en la lámpara y en su
haz, que es lo que significa "vivo" en este sistema; cualquier uso decorativo del
ámbar en una superficie real sigue necesitando una decisión de marca.

---

## 5. Cómo se hornea

```bash
node scripts/scene-src/bake.mjs                 # PNG del fotograma póster
node scripts/scene-src/bake.mjs --mp4           # + bucle corto (10 s, 12 fps)
node scripts/scene-src/bake.mjs --scene <id> --cell 6 --mp4 --frames 240
```

- El PNG sale de `rasterize()` en Node: **sin navegador y sin canvas**. Opciones
  fijas (`compressionLevel: 9`, sin filtrado adaptativo) para que la salida se
  repita.
- El MP4 se alimenta a `ffmpeg` local por `stdin`, fotograma a fotograma (nunca
  se retiene la secuencia en memoria): `libx264`, `-crf 32`, `yuv420p`,
  `+faststart`.
- Salida en `scripts/scene-src/baked/`. El PNG se sirve a través de la
  importación de activos del componente (`?url&no-inline`), y la comprobación
  exige que la copia publicada sea **byte a byte** idéntica al archivo horneado.
  El MP4 es salida de la tubería: hoy no se sirve en ninguna página.

Costes medidos en esta unidad (ver §7 para el presupuesto):

| Artefacto | Tamaño | sha256 |
| --- | --- | --- |
| `joyan-night-coast.png` (1600 × 800) | 41.906 B | `5c2f8f3dedc0858d3762f40a5f44386f556653bd19b5542efcaec9c678da7a49` |
| `joyan-night-coast.mp4` (10 s, 120 fotogramas, CRF 32) | 219.412 B | `655f45bbd77d1f40303a413038e43470ae66d0a30be38a16b1186ffcf99456d2` |

Determinismo comprobado: dos horneados seguidos del PNG dan el mismo sha256, y
dos codificaciones seguidas del MP4 también (byte-deterministas en esta máquina y
esta versión de `ffmpeg`; el contenedor no es un oráculo portable). El hash que
**sí** es portable es el de los píxeles: `2808ffc730c273c700b1dc85d56e6dc76a24583e44009e3e110049dc14c5f3fe`,
que es el del fotograma póster del motor y debe coincidir con el del PNG
descomprimido. (Los números de WU15 a 4 px por celda — PNG 9.554 B, pixel sha
`d634a9a9…` — están en `dist-motion-verify/wu15/green.json`; los de WU16, en
`dist-motion-verify/wu16/`.)

---

## 6. Una pieza, dos salidas: la prueba

El requisito es falsable y por eso se comprueba así:

1. El runtime publica en el host **qué fotograma dibujó** (`data-scene-frame`),
   que es información real, no un gancho de prueba.
2. En el navegador se lee ese índice y se hashean los píxeles del canvas
   (SHA-256) en el mismo bloque síncrono, así que ningún `requestAnimationFrame`
   puede colarse entre la lectura y el hash.
3. En Node se calcula `rasterize(renderFrame(scene, frame))` para **ese mismo**
   índice y se hashea con SHA-256.
4. La comprobación exige igualdad exacta. Observado para el fotograma 0:
   `34a76821c2d5c8098df81ca4044cc2484cb6a6ca91d4e04fa38db5ee06a3725e` en los dos
   caminos (medido en WU16 sobre un canvas de 1600 × 800, 8 px por celda). El
   hash de WU15 (`9554c122…`, 800 × 400, 4 px por celda) ya no aplica: cambió la
   geometría del punto y la resolución de entrega, y la igualdad se vuelve a
   comprobar, no se arrastra.

Además, el PNG horneado se descomprime y su hash de píxeles debe ser el mismo que
el del raster del fotograma póster: es decir, lo horneado **es** el fotograma que
el runtime dibuja bajo `prefers-reduced-motion`. Eso es lo que hace honesto el
hero híbrido: la imagen por defecto y el canvas vivo son el mismo arte.

---

## 7. Costes medidos y presupuesto

| Concepto | Medido |
| --- | --- |
| Chunk de la librería (ocho montajes de la página: dos piezas, seis escenas y este panel) | 25.256 B gzip, **un** chunk (no es un número por panel) |
| Nuestro motor + escena + catálogo de formas + pipeline de imagen + overlays + runtime + tableros | 33.296 B sin comprimir / **12.787 B gzip**, en **un chunk** compartido por las tres rutas del laboratorio |
| PNG horneado | 41.906 B a 1600 × 800 (no envía ningún script) |
| Total del laboratorio | 38.211 B gzip (librería 25.256 + motor 12.787 + tres chunks de entrada de 56 B; 0 B en línea) |
| Tope del laboratorio | 40.259 B gzip (medido + 2.048 B de margen; regla: margen ≤ 4.096 B) |
| Landing | Los cinco chunks originales **byte a byte** idénticos: 109.818 B gzip (delta 17.913 frente al fixture intacto) |
| Atlas de sprites (celda ya mezclada por paso y tinta) | 9,5 ms por fotograma de 200 × 100 a 8 px por celda frente a 12,2 ms de la mezcla píxel a píxel, en esta máquina y **con salida byte a byte idéntica** |

Notas de contabilidad:

- Hasta WU16 el límite de 16 KiB configurado en `astro.config.ts` mantenía el
  motor como **módulo en línea** de una sola página. WU17 añade una segunda ruta
  de laboratorio (`/lab/shapes`) y WU18 una tercera (`/lab/image`), así que el
  bundler comparte el motor entre las tres y pasa a ser un **chunk**: el
  conjunto ejecutable del laboratorio sigue siendo chunk + en línea, pero el en
  línea es ahora 0 B. La **atribución** de la comprobación deja de ser "una
  página concreta" y pasa a ser "toda página que alcanza el chunk es
  `/lab/**`", con los mismos controles negativos: un chunk de laboratorio
  alcanzable desde una página real es fuga y falla, y si no hay ninguna página de
  laboratorio la atribución falla cerrada.
- **Qué es y qué no es.** Este motor no es un vídeo: no hay códec, ni MP4
  servido, ni activo externo. El panel vivo es un canvas que la página pinta
  fotograma a fotograma con `renderFrame()` + `rasterize()`, y el panel horneado
  es ese mismo raster escrito a PNG por Node. Solo el J1 de la sección 01 es un
  vídeo.
- El pie de la página del laboratorio **cita los números medidos** y las dos
  comprobaciones fallan si el texto y el bundle dejan de coincidir. Es a
  propósito: obliga a re-medir en lugar de inventar.
- Si cambias el motor, la escena o el runtime: vuelve a hornear
  (`node scripts/scene-src/bake.mjs`) y actualiza los números del pie y los dos
  topes (`LAB_MEASURED_GZIP` / `LAB_CAP_GZIP` en
  `scripts/check-ascii-runtime.mjs` y en la sección 7 de
  `scripts/check-iteration-3.mjs`). Si no lo haces, las comprobaciones fallan.

---

## 8. Procedencia: qué es estándar, qué aprendimos y qué es nuestro

`ascii.rest@0.4.0` (MIT, bas3line) se leyó como referencia, y la comparación del
laboratorio usa sus escenas de verdad, importadas como hojas locales. La
procedencia se declara en **cuatro grupos**, y el comprobador falla si dejan de
ser distinguibles: si aparece material de la librería que el **registro de
adopción** no declara, si una entrada del registro nombra código que ya no está,
si falta el aviso MIT conservado en el repositorio, o si el código no nombra el
material publicado que usa.

### 8.0 Registro de adopción (la frontera de licencia)

WU16 cambia la frontera: el usuario autorizó **tomar el código de la librería y
mejorarlo**, no solo sus ideas. Por eso ya no hay una regla de "las constantes de
la librería no pueden aparecer", sino un **registro explícito**:
`scripts/scene-src/adoption-ledger.json` lista cada adaptación con el archivo
upstream del que viene, y el aviso MIT de la librería se conserva en el
repositorio, palabra por palabra, en `scripts/scene-src/ascii.rest-LICENSE`
(copyright © 2026 bas3line, https://github.com/bas3line). El comprobador
`scripts/check-scene-engine.mjs` lo verifica en **las dos direcciones**:

1. una entrada del registro debe existir de verdad en el código (su marcador) y
   nombrar un archivo upstream que existe;
2. el material derivado de la librería que aparezca en el motor (sus constantes
   de mezcla, su desplazamiento de Bayer `- 0.47`, su clave de LUT `31.99`, su
   fuente alojada, `nightCoast`) debe estar declarado — y el propio predicado se
   prueba contra una fuente sintética que lleva una constante sin declarar, para
   que la comprobación no pueda pasar por vacuidad.

| Adoptado | Archivo upstream | Qué mejoramos |
| --- | --- | --- |
| El atlas de celdas: una celda ya mezclada por (paso, tinta), construida una vez y copiada celda a celda | `node_modules/ascii.rest/dist/mount.js` (el atlas de glifos: "cada par (carácter, color) se dibuja una vez en un atlas y se copia a su celda") | La clave es nuestro paso de rampa y nuestra tinta de paleta, no un glifo y un color (sin fuente, sin reserva de slots); el conjunto está acotado por la paleta, así que nada se desaloja ni se vuelve a dibujar; y **el mismo atlas sirve al horneado de Node y al canvas vivo**, así que un blit optimizado no puede hacer que las dos salidas discrepen (la igualdad por hash). Medido: 9,5 ms por fotograma de 200 × 100 a 8 px por celda frente a 12,2 ms, salida idéntica. |

**Lo que rechazamos deliberadamente:** los **glifos de fuente** como forma del
punto. Nuestros puntos son discos analíticos: no dependen de una fuente instalada,
miden lo mismo en cualquier máquina y pueden sostener la escalera de cobertura
medida. Medido en esta máquina con la pila de fuentes de la librería y su tamaño
(`w / 0.6`), fracción de píxeles tocados sobre negro: `·`/`•`/`●` marcan 0.125 / 0.25 /
0.8125 con 4 px por celda, 0.0625 / 0.2188 / 0.5313 con 8, 0.0625 / 0.1563 /
0.4961 con 16, y con su paso real de panel (≈1,5 px por celda) 0,5 / 0,5 / 1,0 —
es decir, la escalera de la librería depende de la fuente y del tamaño. También
rechazamos su catálogo de escenas (peso: el cierre de recetas depende del punto de
entrada y no cabe), su arte y sus paletas como si fueran nuestras, cualquier
activo vendorizado, y la reutilización sin atribución.

### 8.1 Material publicado, usado como está publicado

| Material | Origen publicado | Dónde se usa |
| --- | --- | --- |
| Matriz de dither ordenado 4 × 4 canónica | Bayer (1973) | `BAYER4`; es la misma matriz en cualquier implementación y **no** se tomó de la librería. |
| Coeficientes de luma Rec.709 | ITU-R BT.709 | `luma()` **y** el término de croma de la selección de paleta: una sola convención publicada gobierna los dos. |
| Fade quíntico y mezcla bilineal | Perlin, *improved noise* (2002) | `fade()` y el blend de `latticeNoise`. |

Nada de este grupo es nuestro, y nada de este grupo vino de `ascii.rest`.

### 8.2 Ideas aprendidas de la librería (MIT, bas3line) y reimplementadas

| Idea | Qué reimplementamos |
| --- | --- |
| Rampa de puntos `" ·•●"` como escalera de tono con dither ordenado | Nuestra constante `RAMP`, nuestra escalera derivada de la cobertura **medida** y nuestro dither solo entre peldaños vecinos (la librería redondea `nivel × 3`). |
| Compensación de color por la cobertura del punto | Nuestra minimización del error de tono *renderizado* (color × cobertura + fondo) más un término de croma con Rec.709; la librería usa una ganancia única y un color más cercano. |
| Ruido entero determinista | Nuestro `mix32` y nuestro `latticeNoise`/`layeredNoise`, con otra construcción (ver 8.3). |
| Paleta indexada por escena con fondo declarado | Nuestro contrato de motor: paleta indexada obligatoria, `ground` declarado, rango normalizado contra la propia paleta. |

### 8.3 Nuestro

| Pieza | Por qué es nuestra |
| --- | --- |
| `mix32` | Mezcla de rotación y multiplicación de la **familia publicada** MurmurHash3/SplitMix, pero con **nuestras** constantes (`0x2f1b3d5f`, `0x6a4f9c17`, `0x1d8e5b93`), nuestro orden de carriles y nuestro calendario de desplazamientos (17, rotación 13, 11, 16). |
| `latticeNoise` / `layeredNoise` | Retícula con **envoltura en los dos ejes**, semilla propia por octava y blend de lerps anidados: deliberadamente **no** la forma `noise(x, y, period)` de una sola periodicidad de la librería. |
| Máscaras analíticas y sus tamaños | Área exacta por píxel (disco, anillo, cuartos de disco, recorte de polígonos) y **tamaños resueltos por barrido + bisección** desde la escalera de cobertura medida; ni cuenta de submuestras ni glifos. Es la pieza de WU16 y la de WU17 (las once formas de §12). |
| Escalera de cobertura | La que midió la máscara de WU15, conservada como objetivo; el motor la alcanza en cualquier tamaño de celda y para cualquier máscara. |
| Dithers | La matriz ordenada es material publicado (Bayer, 1973) y se construye con la construcción recursiva publicada; el azulejo de **ruido azul** 16 × 16 (void-and-cluster con kernel entero, sin `exp`, para que Node y el navegador no puedan discrepar) es nuestro. |
| Selección de paleta | Búsqueda explícita del mínimo error de tono renderizado. |
| Escena, paleta, horneado y comprobaciones | Todo escrito aquí. |

Una primera versión de este documento afirmaba que el ruido era simplemente
"nuestro" mientras compartía el juego de constantes y la estructura de la
librería. Esa afirmación era falsa y queda corregida: hoy el motor usa otra
construcción y el comprobador impide que vuelva la anterior.

**Lo que rechazamos deliberadamente:** su catálogo de escenas (peso: el cierre de
recetas depende del punto de entrada y no cabe), su arte y sus paletas como si
fueran nuestras, cualquier activo vendorizado, y la reutilización sin atribución.

**Licencia.** El material adaptado está en el registro de 8.0, con su archivo
upstream, y el aviso MIT de `ascii.rest@0.4.0` (copyright © 2026 bas3line) se
conserva en el repositorio en `scripts/scene-src/ascii.rest-LICENSE`; el paquete
instalado conserva además su propio `LICENSE`, y el laboratorio mantiene el
crédito bas3line · MIT y el enlace a la fuente. Nada de la librería se importa en
tiempo de ejecución desde el motor.

---

## 9. Qué **no** está medido

- El modelo de tono es un espacio de pantalla (luma sobre sRGB), no luz lineal, y
  el motor **no** tiene gestión de color: no hay garantía colorimétrica.
- El antialiasing de los puntos es **analítico** (área exacta del disco por
  píxel); los radios se resuelven por bisección, así que son exactos para esta
  máscara y no una forma cerrada.
- El coste se midió en **Chromium, en una sola máquina y un solo proceso**, con la
  fuente real servida a una página en blanco del mismo origen (§11). No es una
  afirmación general de rendimiento, y no se midieron CPU, LCP ni CLS.
- No hay comparación perceptiva ni de fidelidad entre nuestro motor y el de la
  librería; la comparación de geometría es numérica y de coste, y la de la
  escalera de glifos (§8.0) también.
- Firefox, Safari, programación en segundo plano del sistema operativo y
  restauración por BFCache: sin medir.
- **El coste por forma y por dither (§12.3)** se midió con el sondeo del propio
  laboratorio (`window.__joyanShapeProbe`), solo Chromium, una máquina, 20
  iteraciones y con las máscaras ya resueltas: no incluye el coste de resolverlas
  ni de construir el atlas, y no dice nada de otra máquina ni de otro navegador.
- **La lectura de una forma a paso pequeño (§12.4)** se midió como coberturas
  distintas por píxel, no con usuarios: que el anillo pierda el agujero a 4 px por
  celda es una medida, no un juicio de legibilidad.
- **La estética no está medida en absoluto.** No hay comparación perceptiva entre
  las once formas; el laboratorio existe para que la decida el usuario. Nada de
  §12 autoriza a cambiar el hero ni la escena real.
- El MP4 es salida de tubería y **no** se sirve en ninguna página.
- Nada de esto autoriza despliegue en la landing, cambio de hero ni adopción de
  marca.

---

## 10. Comprobaciones

```bash
node scripts/scene-src/bake.mjs                  # horneado (PNG), solo Node
node scripts/scene-src/bake.mjs --mp4            # + bucle corto
pnpm build                                       # 15 páginas
node scripts/check-scene-engine.mjs              # arte + geometría del punto + registro + igualdad + navegador
node scripts/check-shape-study.mjs               # WU17: catálogo, escalera, geometría, igualdad y coste por forma
node scripts/check-ascii-runtime.mjs --out dist-motion-verify/wu17/lab
pnpm check                                       # astro check + eslint + iteration-2/3
```

`scripts/check-scene-engine.mjs` cubre: rampa de solo puntos, celdas 1:1,
`DELIVERY_CELL >= 8`, la escalera de cobertura medida contra la que pinta la
máscara, **la forma del punto**: para cada paso y para 4, 8 y 16 px por celda,
los píxeles deben coincidir (≤ 0.004) con un disco antialiaseado de referencia
independiente (32 × 32 submuestras escritas en el propio comprobador), con al
menos tres coberturas distintas, esquinas nunca más claras que los ejes y masa
fuera del disco inscrito ≤ 13 %; y los **controles negativos** de esos dos
predicados (un cuadrado de la misma área y el bloque duro 2 × 2 que WU15 pintaba
deben ser rechazados). Además: `DOT_RADIUS` derivado de la escalera medida (radio
resuelto de nuevo por bisección contra la referencia), que el atlas adoptado
reproduzca byte a byte una mezcla píxel a píxel, el **registro de adopción en las
dos direcciones** con el aviso MIT conservado, escalera de tono y dither
ordenado, determinismo (repetición, avance real y **periodicidad medida en el
`field`**), índices dentro de la paleta, todos los píxeles como mezcla fondo →
paleta, PNG idéntico al raster del póster, igualdad Node/canvas por SHA-256, pausa
fuera de pantalla y con la pestaña oculta, fotograma estático bajo movimiento
reducido con un control etiquetado con la verdad, limpieza en `pagehide`, ausencia
de peticiones externas, y capturas a 390/768/1440.

Evidencia de WU16: `dist-motion-verify/wu16/red/` (RED conservado: 29 fallos de
las aserciones nuevas sobre el motor anterior), `green.json` y `captures/`,
`investigation/` (geometría del punto antes/después contra los glifos de la
librería, con recortes ampliados), `sizes/` (§11) y `lab/` (contabilidad del
laboratorio). Los árboles `wu13/` y `wu14/` se leen como entrada y no se
reescriben; la evidencia de WU15 sigue intacta en `dist-motion-verify/wu15/`.

`scripts/check-shape-study.mjs` (WU17) añade: las once máscaras existen y
sostienen la escalera a 8, 4 y 2 px por celda (tolerancia 0,001), la prueba de
geometría de cada nombre (un cuadrado es separable, un disco no tiene masa en las
esquinas, un anillo tiene agujero, un triángulo es asimétrico, el rayado es
invariante en diagonal, el grano no tiene simetría), los cuatro dithers y las dos
geometrías de celda cambian los bytes, igualdad Node/canvas **por forma, por
dither y por geometría** (38 comparaciones), el PNG horneado sigue siendo el
fotograma póster del motor, y un muestreo acotado de tiempo por fotograma por
forma y por dither. Evidencia: `dist-motion-verify/wu17/study/` (RED conservado en
`dist-motion-verify/wu17/red-study-node.log`), con recortes ampliados por forma a
8 y 4 px por celda y capturas a 390/1440/2560.

---

## 11. Tamaño grande: qué rejilla para un hero

Medido en Chromium, una sola máquina y un solo proceso, sirviendo el motor real a
una página en blanco del mismo origen (`dist-motion-verify/wu16/sizes/`; el
control sin pintar da 0 tareas largas, así que las tareas largas que aparecen son
coste del motor). El repintado de un fotograma de 200 × 100 a 8 px por celda
cuesta ~19,6 ms y no produce ninguna tarea larga dentro del bucle de 12 fps.

| Rejilla | Ancho CSS | px por celda en pantalla | backing/pantalla | punto más pequeño | repintado (mediana) |
| --- | --- | --- | --- | --- | --- |
| 200 × 100, celda 8 | 1280 | 6,40 | 1,25× (reduce: nítido) | 3,50 px | 19,6 ms |
| 200 × 100, celda 8 | 1920 | 9,60 | 0,83× | 5,24 px | 19,6 ms |
| 200 × 100, celda 8 | 2560 | 12,80 | 0,63× (amplía 1,6×) | 6,99 px | 20,3 ms |
| 200 × 100, celda 8 | 3840 | 19,20 | 0,42× (amplía 2,4×) | 10,49 px | 19,8 ms |
| 200 × 100, celda 12 | 2560 | 12,80 | 0,94× (≈1:1) | 6,99 px | 24–25 ms |
| 200 × 100, celda 16 | 3840 | 19,20 | 0,83× | 10,49 px | 31,1 ms |
| 320 × 160, celda 8 | 1280–3840 | 4,00–12,00 | 2,00×–0,67× | 2,19–6,56 px | **50,6–51,3 ms** |

Tareas largas en 2,5 s de bucle a 12 fps: **0** con 200 × 100 (cualquier ancho
medido), **~30 de ~51–64 ms** con 320 × 160 (cada fotograma pasa el umbral de
50 ms: ~61 % del presupuesto de 83 ms). El coste activo depende de los píxeles
totales (celda² × celdas), no del ancho CSS: 2560 × 1280 cuesta 2,56× lo que
1600 × 800.

**Recomendación.** Un hero usa **200 × 100 celdas** y elige la celda de entrega
para que el backing store quede cerca del ancho de presentación:

- **1280–1920 px:** celda 8. El raster se reduce (1,25× a 1600 px, 0,83× a 1920),
es nítido, el punto más pequeño mide 3,5–5,2 px de pantalla y cuesta 19,6 ms por
fotograma con cero tareas largas.
- **2560 px:** celda 12 (0,94×, prácticamente 1:1) por 24–25 ms; la celda 8 sigue
siendo redonda pero el navegador la amplía 1,6× y se ve blanda.
- **3840 px:** celda 16 (0,83×) por ~31 ms; con celda 8 la ampliación es 2,4× y el
recorte ampliado lo muestra. Alternativa honesta para ese ancho: limitar el panel
a ~2200–2600 px CSS en vez de estirarlo a 3840.
- **No conviene subir la densidad a 320 × 160 para ganar resolución:** cuesta
2,56× (la mitad del presupuesto de 12 fps), el punto más pequeño baja a 2,2 px de
pantalla a 1280 (por debajo de los ~3 px en que un punto sigue leyéndose como
punto) y la resolución se compra mejor con la celda de entrega, que no cambia la
composición.

**Un límite que conviene decir en voz alta:** el panel del laboratorio mide unos
307 px CSS de ancho, es decir ≈1,54 px de dispositivo por celda para una rejilla
de 200 celdas. A ese paso **ningún** motor dibuja puntos redondos: la librería
rinde sus glifos a ese mismo paso y su textura se embarra igual. Lo que cambió
con WU16 es *cómo* se llega ahí: antes el raster de 800 × 400 se reducía con
`image-rendering: pixelated` (vecino más cercano, que tira el promedio), y ahora
se reduce suavemente desde 1600 × 800. Un punto se lee como punto a partir de
unos 3 px de pantalla por celda, y eso ocurre con la celda 8 desde unos 600 px CSS
de ancho de panel (6,4 px por celda a 1280). El panel del laboratorio es una
superficie de comparación a tamaño pequeño; los tamaños de hero son los de la
tabla.

---

## 12. Catálogo de formas (WU17)

Decisión del usuario tras WU16: los puntos redondos quedan un poco mejor, **pero
los cuadrados también se ven bien y puede haber otras formas**; piden
investigarlo en serio, tener una forma de **probar todas las opciones** y no
cerrarse a los puntos. Este catálogo es la respuesta, y la superficie para
probarlo es `/lab/shapes` (noindex, solo laboratorio, con un tablero fijo que
pinta las once formas a la vez). **La elección estética es del usuario**: lo que
sigue mide qué es comparable y dónde se rompe, no cuál es más bonito.

Nada de esto llega a una página real: la landing sigue con cinco chunks byte a
byte idénticos y ningún JavaScript de motor fuera de `/lab/**`.

### 12.1 Cómo se deriva el tamaño de cada forma

Ninguna forma recibe un radio adivinado. La escalera es la medida en WU16
(`LADDER = [0, 0.2344, 0.4844, 0.8125]`, la fracción de celda que cubre cada
peldaño) y cada forma tiene **un solo escalar** que se resuelve desde ella: un
barrido de 160 pasos hasta 3,0 unidades de celda busca el **primer** cruce
(el anillo no es monótono: su agujero crece), y 30 bisecciones refinan dentro de
ese intervalo. Se devuelve el menor tamaño cuya área exacta alcanza el peldaño;
`maskSize(forma, rampa, geometría, paso)` publica el número y
`maskDerivation(forma)` la frase que dice qué se resuelve.

Lo importante es **cómo se calcula la cobertura de un píxel: como un área
exacta**, nunca como una cuenta de submuestras. Recorte de polígonos
(Sutherland–Hodgman) para cuadrado, rombo, triángulo y hexágono; áreas cerradas
de círculo y rectángulo para disco y anillo; cuartos de disco cerrados para el
cuadrado redondeado; intersecciones de rectángulos para cruz y glifo; bandas
diagonales recortadas para el rayado. De ahí salen dos consecuencias que las
comprobaciones miden en vez de afirmar:

1. **La escalera se sostiene en cualquier paso**, porque la suma de las áreas por
   píxel es el área de la propia forma y no depende de cómo se parta la celda.
   Medido a 8, 4 y 2 px por celda: desviación 0,0000 en las once formas (tolerancia
   0,001). Una máscara muestreada no puede: a 4 px un cuadrado simétrico solo
   alcanza 0,4727 o 0,5166 de celda, nunca el 0,4844 que pide la escalera.
2. **Node y el canvas coinciden por aritmética, no por tolerancia**: no hay
   muestreo que pueda derivar entre los dos.

### 12.2 Las once máscaras

| Máscara | Qué es | Tamaño resuelto (pasos 1 / 2 / 3, unidades de celda) | Prueba geométrica medida a 32 px por celda |
| --- | --- | --- | --- |
| `disc` | disco (la máscara de WU16) | 0,2732 / 0,3927 / 0,5103 | paso 3: esquinas 0 % de los ejes; 2,6 % de masa fuera del disco inscrito; no separable (error 1,000) |
| `square` | cuadrado de eje | 0,2421 / 0,3480 / 0,4507 | paso 3: **separable exactamente** (error 0,000), es su propio producto fila × columna; 10,1 % de masa fuera del disco inscrito |
| `rounded` | cuadrado con esquinas a 0,34 del semilado | 0,2451 / 0,3524 / 0,4564 | paso 3: separable 0,9555 (las esquinas cortadas rompen el producto), relleno de caja 0,9244; en el paso 1 el relleno de caja es 0,9376 |
| `diamond` | rombo | 0,3423 / 0,4921 / 0,6938 | paso 1: fila superior 6,3 % del ancho, relleno de caja 0,6001 (½ de la caja) |
| `triangle` | triángulo isósceles, vértice arriba | 0,3423 / 0,4921 / 0,8876 | paso 3: masa abajo/arriba 1,55 (asimétrico), transpuesta 0,5586 (0,63 a 64 px) |
| `hexagon` | hexágono puntiagudo (un vértice arriba y otro abajo) | 0,3004 / 0,4318 / 0,5641 | paso 1: relleno de caja 0,8334, fila superior 12,5 %, esquinas 0 %, separable 1,000 |
| `ring` | anillo con agujero a 0,30 del radio exterior | 0,2863 / 0,4116 / 0,5578 | paso 3: centro 0,000 con borde 1,000 (hay agujero) |
| `cross` | cruz / más, brazos a 0,42 del semilargo | 0,2972 / 0,4272 / 0,6750 | paso 1: centro y puntas de brazo con tinta (1,00), cuadrantes vacíos (0,00) |
| `hatch` | rayado a 45°, ciclo de trabajo resuelto | 0,2344 / 0,4844 / 0,8125 | paso 3: invariancia diagonal 0,9459 (0,9156 a 16 px, 0,9698 a 64 px). La métrica cuenta pares de píxeles vecinos en diagonal con la misma cobertura, que no es lo mismo que \"la tinta es constante en la diagonal\": 1,000 solo sale de una prueba más estricta (solo píxeles entintados) |
| `grain` | **sin forma**: solo cobertura | = la escalera (no hay tamaño) | paso 1: simetría de transpuesta 0,67 y de giro 0,63; fracción binaria 1,00 |
| `glyph` | glifo de mapa de bits (la ruta del atlas adoptado) | ≈1,0000 (el propio mapa de bits ya lleva la escalera) | paso 1: fracción binaria 1,00; separable 1,00 |

Todas las cifras de la columna de prueba geométrica están medidas a **32 px por
celda** en el paso que se indica, con las métricas de
`scripts/check-shape-study.mjs` (que las vuelve a medir y exige que aparezcan
aquí; ninguna es un literal). Los tamaños resueltos son independientes del paso
de píxeles: se resuelven sobre la celda de referencia de 8 × 8.

`grain` reparte la cobertura del peldaño como un **orden determinista** sobre los
píxeles de la celda (mismo orden en Node y en el navegador), así que no hay forma
que medir: la comprobación lo demuestra por lo que **no** tiene (ninguna simetría)
y por su cobertura exacta. `glyph` es el único caso en el que el tamaño no crece
con la escalera, porque sus tres mapas de bits ya miden 15, 31 y 52 de 64
celdas: el motor lo resuelve igual y lo dice.

### 12.3 Qué cuesta cada opción

Medido con el sondeo del laboratorio (`window.__joyanShapeProbe`), **solo
Chromium, una máquina, 20 iteraciones**, máscaras ya resueltas y en caché: mide
`renderFrame` + `rasterize` + `putImageData` de un fotograma de 200 × 100 a 8 px
por celda (1600 × 800), no la construcción de las máscaras. **No es una
afirmación general de rendimiento.**

| Opción | Mediana (pasada 1) | Mediana (pasada 2) | Mínimo (pasada 1 / 2) |
| --- | --- | --- | --- |
| las once formas | 19,2–19,5 ms | 19,5–19,9 ms | 19,0–19,1 / 19,3–19,6 ms |
| dither `none` | 18,8 ms | 19,1 ms | 18,4 / 18,9 ms |
| dither `bayer4` (por defecto) | 19,4 ms | 19,6 ms | 19,1 / 19,4 ms |
| dither `bayer8` | 19,9 ms | 19,5 ms | 19,6 / 19,2 ms |
| dither `blue` | 19,4 ms | 19,8 ms | 19,2 / 19,4 ms |
| geometría 1:2 (celda 8 → 1600 × 1600) | 27,1 ms | 27,1 ms | 26,6 / 26,6 ms |
| geometría 1:1 (referencia) | 19,5 ms | 19,6 ms | 19,2 / 19,3 ms |

Las dos pasadas son el mismo método en la misma máquina, y están separadas para
enseñar la varianza en vez de esconderla: dentro de una pasada las once formas se
reparten 0,3 ms, y entre pasadas el mismo conjunto se mueve 0,3–0,4 ms **en
bloque**. Por eso **no se afirma ningún orden entre las formas** (ninguna es
medible como más barata): lo único estable en las dos pasadas es que `none` es la
más barata (18,8 / 19,1 ms, sin dither que evaluar) y que el orden entre `bayer4`,
`bayer8` y `blue` **se da la vuelta** (en la pasada 1 `bayer8` 19,9 > `bayer4`
19,4; en la pasada 2 `bayer8` 19,5 < `bayer4` 19,6), así que la diferencia entre
dithers está dentro del ruido.

La forma **no** cuesta: el atlas de sprites construye una celda terminada por
(máscara, paso, tinta) y la copia, así que cambiar de máscara cambia qué se
construye una vez, no cuánto se pinta por celda. Lo que cuesta es el **píxel**: la
celda 1:2 tiene el doble de píxeles y paga 1,39× (27,1 ms frente a 19,5–19,6 ms),
y esa razón sí se repite en las dos pasadas.

### 12.4 A qué paso se lee cada forma

La escalera de cobertura se sostiene a cualquier paso (12.1); lo que se pierde a
paso pequeño es la **forma**. Medido en la celda de entrega de cada opción
(coberturas distintas por píxel en el paso 1):

| px por celda | Coberturas distintas (paso 1, mínimo–máximo) | Formas que colapsan a dos niveles |
| --- | --- | --- |
| 8 | 3 – 13 | ninguna |
| 4 | 2 – 8 | cuadrado y redondeado |
| 2 | 1 – 2 | las once |

Con 4 px por celda la celda tiene 16 píxeles: el disco, el anillo y el triángulo
siguen leyéndose (tienen más coberturas distintas), el cuadrado y el redondeado
se vuelven dos niveles y el glifo se vuelve un bloque de píxeles. Con **2 px**
(4 píxeles por celda) ninguna forma se lee como forma; se lee la cobertura.

Lo que decide si una forma se puede **juzgar**, sin embargo, no es la celda de
entrega sino el paso en pantalla, y eso también está medido (a 1440 px de ancho):
el tablero de resumen muestra 200 celdas en 230 CSS px, es decir **1,15 CSS px por
celda**, y los paneles de prueba **1,55**; a ese paso solo se leen las texturas
(rayado, grano, glifo) y las formas no se distinguen. Por eso `/lab/shapes` tiene
una fila **a escala 1:1** que dibuja el mismo fotograma en una rejilla de 50 × 25
celdas a 8 px por celda y lo muestra a 160 px, es decir **3,2 CSS px por celda**,
que es donde las once formas se comparan de verdad a 1× (o en una pantalla
retina/zoom). Por eso también el tablero de resumen dibuja a 4 px por celda, los
paneles de prueba a 8 px, y WU16 fijó `DELIVERY_CELL = 8` para la escena real.

### 12.5 Las otras perillas

| Perilla | Qué hace | Medido |
| --- | --- | --- |
| Rampa `shape` | cada paso es la forma elegida, con su tamaño resuelto | — |
| Rampa `block` | pasos de **bloques duros** de píxel: cada píxel cae a 0 o 1, sin antialiasing | **no sostiene la escalera**: medias 0,2500 / 0,5625 / 0,9375 a 8 px por celda y 0,2500 / 0,2500 / 1,0000 a 4 px (objetivo 0,2344 / 0,4844 / 0,8125); a 16 px, 0,2500 / 0,5469 / 0,7656. Un bloque duro solo alcanza múltiplos de 1/(px²) |
| Rampa `glyph` | la tabla de glifos (los mapas de bits son 15, 31 y 52 de 64 celdas, y el tamaño se resuelve igual) | **sí sostiene la escalera**: 0,2344 / 0,4844 / 0,8125 a 8, 4 y 2 px por celda (tolerancia 0,001). El 15/64 pertenece a esta rampa, no a `block` |
| Dither `bayer4` | matriz ordenada 4 × 4 | 16 umbrales |
| Dither `bayer8` | matriz ordenada 8 × 8 | 64 umbrales |
| Dither `blue` | azulejo de ruido azul 16 × 16 por void-and-cluster (kernel entero, sin transcendentales) | 189 umbrales |
| Dither `none` | redondea en 0,5 | 1 umbral |
| Celda 1:1 / 1:2 | celda cuadrada o de carácter | +38 % de coste en 1:2 (12.3) |
| Densidad | muestrea la escena cada k celdas (200 × 100, 100 × 50, 50 × 25) | pasos enteros, así que una estrella sigue siendo una estrella |

La **resolución de tono** la fija la escalera de cobertura más el dither: cuatro
peldaños por la escalera, y el dither decide cuántos niveles intermedios se
pueden gastar espacialmente. `bayer8` y el ruido azul pueden resolver medios
tonos más finos porque tienen más umbrales; `none` no resuelve nada entre
peldaños. La rampa `block` reduce la resolución de tono a lo que quepa en píxeles
enteros: a 8 px por celda (64 píxeles) el peldaño 1 (15/64) se alcanza exacto, a 4
px (16 píxeles) solo se alcanzan múltiplos de 1/16.

### 12.6 Recomendación práctica

Las medidas dicen qué es comparable y qué se rompe; **cuál queda mejor es del
usuario**, y el laboratorio existe para que pueda decidirlo sin tocar código.

Compara siempre en la fila **a escala 1:1** (§12.4): el tablero de resumen es una
vista de textura (1,15 CSS px por celda) y a 1× no permite juzgar una forma.

- **Cuadrado** si se busca lectura de píxel / retro: es el único estrictamente
  separable, sus bordes caen en los píxeles y a 8 px por celda conserva el 10 %
  de masa en las esquinas (el bloque se lee como bloque, a propósito).
- **Disco** si se busca lectura de semitono / fotográfica: 2,6 % de masa fuera del
  disco inscrito, esquinas vacías, y es el que mejor aguanta el paso pequeño
  (junto con rombo, triángulo y hexágono, que conservan más coberturas distintas).
- **Anillo, cruz, rayado y glifo** son recursos de textura, no de tono: el anillo
  deja ver el fondo, la cruz y el rayado son direccionales y el glifo da un borde
  duro de mapa de bits. Úsalos cuando el patrón tenga que notarse; a 4 px por
  celda el anillo pierde el agujero y el glifo se vuelve un bloque.
- **`grain`** es la opción "solo cobertura": sin forma que medir, sin simetría,
  útil para comparar contra cualquier forma y para fondos donde no se quiere
  ninguna figura.
- **Dither**: `bayer4` es el de la escena real; `bayer8` y `blue` suavizan medios
  tonos a costa de estructura visible (Bayer) o de un azulejo de 16 × 16 (blue);
  `none` es el control honesto de "sin dither".
- **Geometría de celda**: 1:1 salvo que se compare con tipografía de carácter; la
  celda 1:2 cuesta 1,38× y cambia el ritmo vertical del dibujo.

---

## 13. El pipeline imagen→escena (WU18)

La pregunta del usuario fue **cómo una imagen se convierte en este estilo**. La
respuesta es una cadena corta y medible. El código puro vive en
`scripts/scene-src/image-pipeline.mjs` (sin `sharp`, para que el runtime del
navegador lo importe), el decodificado y la CLI en
`scripts/scene-src/from-image.mjs` (solo Node), y los overlays en
`scripts/scene-src/overlays.mjs`.

### 13.1 La receta, numerada

1. **Decodificar.** `decodeImage()` rasteriza el SVG con el `sharp`/librsvg local
   (a 1024 px de lado mayor por defecto) y lee PNG y JPEG tal cual, a RGBA de
   alfa recto. Se acepta una ruta local, bytes o el propio SVG; **una URL de red
   se rechaza** antes de decodificar (`assertLocalInput`).
2. **Encajar (fit).** Regla declarada: *contain* con margen sobre cada eje,
   `scale = min((1−2·m)·cols/W, (1−2·m)·rows/H)`, arte centrado en
   `(grid − dibujado)/2`. El mismo `scale` multiplica ambos ejes, así que la
   relación de aspecto se conserva **exactamente** (por álgebra, no por
   redondeo) y nada cae fuera del margen. `fitGrid().rule` devuelve la regla en
   palabras y la comprobación la mide como geometría.
3. **Medir.** Un número por celda, con el modo **elegido**, nunca adivinado:
   - `ink`: media ponderada por área de `α·(1 − luma)`; un píxel transparente no
     deposita tinta. Para line art.
   - `luminance`: media de `1 − luma` del píxel compuesto sobre el fondo, de modo
     que la fotografía conserva su propio color. Para fotografías.
   Cada celda guarda además un color representativo, para que el tono de una
   fotografía llegue a la paleta.
4. **Mapear.** La medida **no se vuelve a umbralizar aquí**: la escena emite un
   `field` cuya luma es esa medida y el `stepFor()` del motor recorre la
   **escalera de cobertura medida** con el dither elegido. No hay una segunda
   escalera ni un segundo dither.
5. **Color.** O una paleta con nombre de `IMAGE_PALETTES` (con el fondo declarado
   en el índice 0), o una **extracción** por median cut determinista de la propia
   imagen. La compensación de tono por celda del motor decide después qué entrada
   lleva cada punto.
6. **Emitir.** Un objeto escena (`field`, `palette`, `ground`, geometría) que
   `renderFrame` y `rasterize` aceptan en vivo y en el horneado.
7. **Serializar.** `serializeScene()`/`sceneFromSerialized()` transportan la
   medida ya cuantizada, de modo que el canvas dibuja **esa misma conversión** y
   no una segunda. Es lo que hace que el raster de Node y el canvas tengan el
   mismo hash.
8. **Animar.** Los overlays (`stars`, `aurora`, `grain`, `glimmer`) envuelven el
   `field` de la escena; son periódicos por construcción y se miden sobre el
   `field`, nunca sobre un índice de fotograma.

La CLI, con todas sus banderas documentadas:

```bash
node scripts/scene-src/from-image.mjs --in <fichero> \
  [--mode ink|luminance] [--color levels|rgb] [--palette <id|extract>] \
  [--palette-count N] [--cols N] [--rows N] [--margin f] \
  [--dither bayer4|bayer8|blue|none] [--shape <id>] [--cell px] [--density 1|2|4] \
  [--overlays stars,aurora,grain,glimmer] [--out <dir>] [--png]
```

### 13.2 El fixture: terceros, solo en local

El usuario dio un gist (`dad72f8b8bfc51d112cfe4cc27955fb0`) con tres variantes SVG
de unicornio, **diseño de atrezzo de una película**. Se usa **solo como fixture
de prueba local**: se descarga a `dist-motion-verify/wu18/input/` (ignorado por
git), **no se commitea**, **no se copia a `public/`** y **no se distribuye** en
ningún build. La comprobación falla si el nombre o el código del fixture aparecen
en cualquier página generada o en `public/`. La superficie del laboratorio usa
dibujos **nuestros** (`scripts/scene-src/local-inputs.mjs`) precisamente para que
la duda de derechos no salga del directorio de evidencias; si el usuario confirma
que tiene los derechos, otra unidad puede añadirlo como tercera entrada.

Medidas del fixture (variante `line-transparent`, 2.067 B, decodificada a
1024 × 1024):

| Rejilla | Escala | Dibujado | Celdas con tinta | Fracción | Nivel medio | Máx | Pasos 0/1/2/3 | sha256 del raster (12) | PNG |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 200 × 100 | 0,08984375 | 92 × 92 | 713 | 0,0357 | 0,00949 | 0,68281 | 19452/490/58/0 | `da63f9e930ac` | 13.962 B |
| 100 × 50 | 0,044921875 | 46 × 46 | 270 | 0,0540 | 0,00949 | 0,48436 | 4867/128/5/0 | `3669f24e1bbe` | 3.664 B |
| 50 × 25 | 0,0224609375 | 23 × 23 | 95 | 0,0760 | 0,00949 | 0,37326 | 1224/26/0/0 | `775d68b9bde8` | 1.079 B |

Otras medidas: ida y vuelta por la serialización **mismo hash** que la escena en
vivo (`da63f9e9…`); PNG decodificado mide idéntico (nivel medio 0,00949) y JPEG
decodifica al mismo tamaño con la misma medida dentro de 0,01. El modo `ink` da
nivel medio 0,00949 y el `luminance` 0,4232 (paletas de 7 y 2 entradas): son dos
instrumentos distintos. La extracción por median cut de este dibujo da solo
**4 entradas** (`#060607`…`#0b0b0c`): un line art casi monocromo tiene una paleta
poco profunda por naturaleza, y por eso existe la paleta con nombre.

### 13.3 Overlays periódicos, medidos en el `field`

Cada overlay es una función pura de `(celda, t, color base)`. Los términos
sinusoidales tienen un período que **divide** el bucle (parpadeo de 6 s en 30 s,
cinco ciclos) y cada deriva de retícula recorre un **número entero de wraps**
(aurora 9 en x y 5 en y, grano 21 en y, glimmer 1 barrido). El desplazamiento se
suma a la coordenada **antes** de que el ruido multiplique por su frecuencia, y
`layeredNoise` escala el wrap de cada octava con esa frecuencia, que es lo que
hace que el cierre caiga exacto en la retícula.

| Overlay | Costura máx/medio (`t=0` vs 30 s) | Paso adyacente máx/medio | Celdas que cambian: costura vs adyacente |
| --- | --- | --- | --- |
| stars | 3,39e−15 / 5,05e−17 | 0,0390 / 0,00089 | 84 vs 88 |
| aurora | 5,61e−15 / 1,63e−16 | 0,1088 / 0,00649 | 458 vs 512 |
| grain | 1,34e−15 / 6,33e−17 | 0,0265 / 0,00261 | 66 vs 84 |
| glimmer | 0 / 0 | 0,0184 / 0,00111 | 99 vs 404 |

Dos avisos honestos: el overlay de aurora **necesita una paleta cromática** — con
`--palette ink` sus colores se aproximan a grises y el PNG sale monocromo (evidencia:
`dist-motion-verify/wu18/cli/image-scene[stars+aurora]-8px-density1.png`) mientras
que con `--palette aurora` sale en verde/azul/violeta
(`…/unicorn-aurora[stars+aurora]-8px-density1.png`) —, y a 200 × 100 la aurora se
lee en **bloques de dither grandes** (~33 celdas por mancha con `scaleX = 0,06`),
no como una cortina fina. Se dice, no se disimula.

### 13.4 Comparación honesta con las escenas de la librería

El usuario cree que las escenas de la librería aún se leen mejor. No se discute:
se mide. A la misma rejilla de 200 × 100 y al mismo tamaño mostrado:

| Medida | Librería `night-coast` | Nuestro unicornio convertido |
| --- | --- | --- |
| Entradas de paleta | **30** (20 usadas en el fotograma 0) | **7** |
| Niveles distintos en la rejilla | n/d (4 pasos) | 136 (de 256) |
| Reparto de pasos (0/1/2/3) | 2540 / 10311 / 6739 / 410 | 19452 / 490 / 58 / **0** |
| Celdas planas (pares adyacentes iguales) | 0,5168 | 0,9682 |
| fps | 15 | 12 |

Es decir: **a igual tamaño, el unicornio convertido se lee más pobre y más plano
que las escenas de la librería**, y los números lo dicen sin adornos — solo usa
tres de los cuatro pasos, nunca el punto lleno, el 97 % de las celdas quedan
vacías y su paleta tiene 7 entradas frente a 30. La causa principal es el sujeto
(un dibujo de línea fina cubre el 3,57 % de las celdas, mientras una escena de
paisaje llena el marco) y no el motor; pero el resultado a la misma rejilla es
más escaso, y eso es un dato para la unidad de auditoría que sigue.
`scripts/check-image-pipeline.mjs` mide ambos lados y esta sección se contrasta
contra `dist-motion-verify/wu18/`.

### 13.5 La superficie: `/lab/image`

Ruta noindex que convierte dos dibujos nuestros en el build (frontmatter, mismo
`convert()` que la CLI), embebe la escena **serializada** y ofrece los controles
`input`, `treatment` (plain, stars, aurora, grain, glimmer, all) y `density`
(1/2/4), con un fotograma fijo por defecto y Play para animar. Las seis
tratamientos dan el **mismo hash** en Node y en el canvas (medido por la
comprobación), y la página enlaza las tres rutas de laboratorio. Límites
declarados: no hay conversión arbitraria de un fichero del usuario en el
navegador (la conversión es en Node y el runtime dibuja la conversión embebida);
el fit es *contain* centrado, sin recorte tipo *cover*; y el vídeo queda
explícitamente fuera de esta unidad.
