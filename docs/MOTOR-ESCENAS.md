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
  `DELIVERY_CELL = 4` píxeles cuadrados por celda (800 × 400), tanto en el canvas
  como en el PNG.
- **Rampa de puntos.** Exactamente `" ·•●"`: vacío, punto, punto medio, punto
  lleno. Nunca arte de glifos ASCII: el runtime no dibuja texto (la comprobación
  falla si aparece `fillText`, `ctx.font` o similar) y la rampa se usa como
  carácter solo para inspección y pruebas (`frameChars`).
- **Curva de cobertura medida.** Cada paso de la rampa tiene un área de tinta
  real. La constante `COVERAGE = [0, 0.24, 0.5, 0.79]` es la intención autoral y
  la comprobación exige que coincida (tolerancia 0.03) con la cobertura que la
  máscara de puntos **pinta de verdad** (medida: `[0, 0.2344, 0.4844, 0.8125]`).
  La escalera de tono (`ladder`) se deriva de esa medición, no de un reparto
  lineal de pasos: por eso la curva que traduce luminancia a paso es la misma
  curva que dibuja los puntos.
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
| `joyan-night-coast.png` (800 × 400) | 9.554 B | `144d9fe24640f0c6eb7e047beddd95070e83181c021f394bf23b1bb5cce9cf8a` |
| `joyan-night-coast.mp4` (10 s, 120 fotogramas, CRF 32) | 70.483 B | `a139813cbeaf35edac7d9425d9c833de7f85b530b3110935cfd364dfa2aa9151` |

Determinismo comprobado: dos horneados seguidos del PNG dan el mismo sha256, y
dos codificaciones seguidas del MP4 también (byte-deterministas en esta máquina y
esta versión de `ffmpeg`; el contenedor no es un oráculo portable). El hash que
**sí** es portable es el de los píxeles: `d634a9a9716c92e949dcc25dca35cdb3e9cfd694fd1a4bc4d0a438de7582916b`,
que es el del fotograma póster del motor y debe coincidir con el del PNG
descomprimido. (Estos números son de la pasada de corrección; los de la primera
pasada de WU15 están en `dist-motion-verify/wu15/green.json`.)

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
   `9554c122dad5695476adaca798f5552129c69ba178c691a1ea354e07633d8a56` en los dos
   caminos (re-medido tras la corrección de ruido y periodicidad).

Además, el PNG horneado se descomprime y su hash de píxeles debe ser el mismo que
el del raster del fotograma póster: es decir, lo horneado **es** el fotograma que
el runtime dibuja bajo `prefers-reduced-motion`. Eso es lo que hace honesto el
hero híbrido: la imagen por defecto y el canvas vivo son el mismo arte.

---

## 7. Costes medidos y presupuesto

| Concepto | Medido |
| --- | --- |
| Chunk de la librería (ocho montajes de la página: dos piezas, seis escenas y este panel) | 25.256 B gzip, **un** chunk (no es un número por panel) |
| Nuestro motor + escena + runtime | 8.821 B sin comprimir / **4.274 B gzip**, como módulo ejecutable en línea en la página del laboratorio |
| PNG horneado | 9.554 B (no envía ningún script) |
| Total del laboratorio | 29.530 B gzip (chunk 25.256 + en línea 4.274) |
| Tope del laboratorio | 31.578 B gzip (medido + 2.048 B de margen; regla: margen ≤ 4.096 B) |
| Landing | Los cinco chunks originales **byte a byte** idénticos: 109.818 B gzip |

Notas de contabilidad:

- El límite de 16 KiB configurado en `astro.config.ts` para el canvas de MAGI hace
  que nuestro módulo (8.821 B) **no** genere un chunk nuevo: se emite como módulo
  ejecutable en línea de la página del laboratorio, y la contabilidad lo cuenta en
  `lab.inlineGzip`. Por eso `scripts/check-iteration-3.mjs` (sección 7) mide ahora
  el conjunto ejecutable del laboratorio como **chunk + módulo en línea**; el
  conjunto de la landing sigue siendo solo chunks y su invariante no se movió.
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
procedencia se declara en **tres grupos**, y el comprobador falla si dejan de ser
distinguibles: si reaparece cualquier constante de mezcla de la librería
(`0x27d4eb2d`, `0x165667b1`, `0x85ebca6b`, `0xc2b2ae35`, `374761393`,
`668265263`, `2246822519`, `3266489917`, `1274126177`) o cualquier import de
`ascii.rest`, y si el código no nombra el material publicado que usa.

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
| Escalera de cobertura | Derivada de la máscara de puntos medida, no de un reparto lineal de pasos. |
| Selección de paleta | Búsqueda explícita del mínimo error de tono renderizado. |
| Máscaras de puntos, escena, paleta, horneado y comprobaciones | Todo escrito aquí. |

Una primera versión de este documento afirmaba que el ruido era simplemente
"nuestro" mientras compartía el juego de constantes y la estructura de la
librería. Esa afirmación era falsa y queda corregida: hoy el motor usa otra
construcción y el comprobador impide que vuelva la anterior.

**Lo que rechazamos deliberadamente:** su catálogo de escenas (peso: el cierre de
recetas depende del punto de entrada y no cabe), su arte y sus paletas como si
fueran nuestras, cualquier activo vendorizado, y la reutilización sin atribución.

**Licencia.** No se copió ninguna línea de `ascii.rest`. La idea no tiene dueño, y
el material publicado de 8.1 tampoco; si en el futuro se adaptara código literal
de esa librería, habría que conservar su aviso MIT (copyright © 2026 bas3line) y
la atribución. Hoy el paquete instalado conserva su propio `LICENSE` y el
laboratorio mantiene el crédito bas3line · MIT y el enlace a la fuente.

---

## 9. Qué **no** está medido

- El modelo de tono es un espacio de pantalla (luma sobre sRGB), no luz lineal, y
  el motor **no** tiene gestión de color: no hay garantía colorimétrica.
- El antialiasing de los puntos es por supermuestreo (4 × 4 por píxel), no
  analítico.
- No se midieron CPU, tiempo de fotograma, LCP ni CLS del panel en vivo; los
  números de carga de la galería de la librería son de WU14 y de un solo host.
- No hay comparación perceptiva ni de fidelidad entre nuestro motor y el de la
  librería: la comparación es visual y de coste.
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
node scripts/check-scene-engine.mjs              # arte + periodicidad + igualdad + navegador
node scripts/check-ascii-runtime.mjs --out dist-motion-verify/wu15/correction/lab
pnpm check                                       # astro check + eslint + iteration-2/3
```

`scripts/check-scene-engine.mjs` cubre: rampa de solo puntos, celdas 1:1,
cobertura medida contra la autoral, escalera de tono y dither ordenado,
determinismo (repetición, avance real y **periodicidad medida en el `field`**),
procedencia (que no vuelvan las constantes de la librería ni un import de
`ascii.rest`, y que el material publicado esté nombrado), índices dentro de la
paleta, todos los píxeles como mezcla fondo → paleta, PNG idéntico al raster del
póster, igualdad Node/canvas por SHA-256, pausa fuera de pantalla y con la
pestaña oculta, fotograma estático bajo movimiento reducido con un control
etiquetado con la verdad, limpieza en `pagehide`, ausencia de peticiones
externas, y capturas a 390/768/1440.

Evidencia: `dist-motion-verify/wu15/` (RED conservado, `green.json`, registros y
capturas), `dist-motion-verify/wu15/independent/` (lo que midió el verificador
independiente, intacto) y `dist-motion-verify/wu15/correction/` (la pasada de
corrección: RED de 11 fallos y su GREEN). Los árboles `wu13/` y `wu14/` se leen
como entrada y no se reescriben.
