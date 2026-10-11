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
| Nuestro motor + escena + runtime | 9.663 B sin comprimir / **4.623 B gzip**, como módulo ejecutable en línea en la página del laboratorio |
| PNG horneado | 41.906 B a 1600 × 800 (no envía ningún script) |
| Total del laboratorio | 29.879 B gzip (chunk 25.256 + en línea 4.623) |
| Tope del laboratorio | 31.927 B gzip (medido + 2.048 B de margen; regla: margen ≤ 4.096 B) |
| Landing | Los cinco chunks originales **byte a byte** idénticos: 109.818 B gzip |
| Atlas de sprites (celda ya mezclada por paso y tinta) | 9,5 ms por fotograma de 200 × 100 a 8 px por celda frente a 12,2 ms de la mezcla píxel a píxel, en esta máquina y **con salida byte a byte idéntica** |

Notas de contabilidad:

- El límite de 16 KiB configurado en `astro.config.ts` para el canvas de MAGI hace
  que nuestro módulo (9.663 B) **no** genere un chunk nuevo: se emite como módulo
  ejecutable en línea de la página del laboratorio, y la contabilidad lo cuenta en
  `lab.inlineGzip`. Por eso `scripts/check-iteration-3.mjs` (sección 7) mide ahora
  el conjunto ejecutable del laboratorio como **chunk + módulo en línea**; el
  conjunto de la landing sigue siendo solo chunks y su invariante no se movió.
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
| Máscaras de puntos analíticas y sus radios | Área exacta del disco por píxel (`quadrantArea`/`discAreaIn`) y radios resueltos por bisección desde la escalera de cobertura medida. Ni cuenta de submuestras ni glifos: es la pieza que WU16 añadió y la razón de que los puntos se lean como puntos. |
| Escalera de cobertura | La que midió la máscara de WU15, conservada como objetivo; el motor la alcanza en cualquier tamaño de celda. |
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
- El MP4 es salida de tubería y **no** se sirve en ninguna página.
- Nada de esto autoriza despliegue en la landing, cambio de hero ni adopción de
  marca.

---

## 10. Comprobaciones

```bash
node scripts/scene-src/bake.mjs                  # horneado (PNG), solo Node
node scripts/scene-src/bake.mjs --mp4            # + bucle corto
pnpm build                                       # 14 páginas
node scripts/check-scene-engine.mjs              # arte + geometría del punto + registro + igualdad + navegador
node scripts/check-ascii-runtime.mjs --out dist-motion-verify/wu16/lab
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
