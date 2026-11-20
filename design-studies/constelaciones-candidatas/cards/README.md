# Tarjetas de constelación — el flujo, no las 88

Cuatro tarjetas renderizadas con el motor real y el flujo que las produce, cada una en **dos estados**: en
reposo y con un nodo enfocado. Las otras 84 constelaciones del catálogo quedan como **dato de almacén**: no hay
tarjeta, no hay página, no hay promesa.

| id    | nombre    | glosa (significado) | figura          | tarjeta (reposo)                          | tarjeta (enfocado)                          |
|-------|-----------|---------------------|-----------------|-------------------------------------------|---------------------------------------------|
| `Ori` | Orion     | Orión               | 23 nodos · 24 segmentos | `capturas/Ori.png`                | `capturas/Ori-enfocado.png`                 |
| `Lyr` | Lyra      | La Lira             | 6 nodos · 7 segmentos   | `capturas/Lyr.png`                | `capturas/Lyr-enfocado.png`                 |
| `Cru` | Crux      | La Cruz del Sur     | 4 nodos · 2 segmentos   | `capturas/Cru.png`                | `capturas/Cru-enfocado.png`                 |
| `Sge` | Sagitta   | La Flecha           | 4 nodos · 3 segmentos   | `capturas/Sge.png` (sin código)   | `capturas/Sge-enfocado.png`                 |

Las tres primeras muestran rango: muchos nodos, media, pocos. La cuarta existe para probar una sola cosa: que
**agregar una constelación no toca el renderer**. El estado enfocado es el primer nodo del catálogo (vive en el
plano lejano), así el caso prueba que el sujeto se afirma sin reordenar la escalera.

## Cómo se corre

El servidor de la raíz del repo en el 4403 ya sirve el estudio (`http://localhost:4403/`). Para una tarjeta:

```sh
node design-studies/constelaciones-candidatas/cards/capture.mjs Ori \
  --out design-studies/constelaciones-candidatas/cards/capturas/Ori.png

node design-studies/constelaciones-candidatas/cards/capture.mjs Ori \
  --out design-studies/constelaciones-candidatas/cards/capturas/Ori-enfocado.png --focus 0
```

`capture.mjs` acepta cualquier `id` del catálogo, `--focus <nodo>`, `--reduced` (pide
`prefers-reduced-motion: reduce`) y `--base <url de card.html>` si el servidor no está en 4403. La galería de
revisión es `cards/index.html` (por HTTP, no `file://`: son módulos ES) y muestra los dos estados de cada pieza.

El chequeo (levanta su propio servidor efímero, no toca el 4403):

```sh
timeout 180 node scripts/checks/check-cards.mjs
```

## Los archivos del flujo

```
design-studies/constelaciones-candidatas/cards/
├── data.mjs       catálogo + nombres → objeto de constelación del modelo (sin entradas por constelación)
├── isometric.mjs  etapa 3: la pila de planos, la escala compensada, los pesos y el muestreo en Z
├── field.mjs      cinco capas por el motor, separadas por plano: renderFrame + rasterize → RGBA
├── card.html      la tarjeta: canvas del campo, capa SVG de enlaces, bloque de texto vacío
├── card.css       la tipografía de la casa (Michroma / Archivo / mono), una sola tinta, sin marco ni sombra
├── card.mjs       monta el canvas, dibuja los enlaces de v1 congelados y llena el texto desde el dato
├── capture.mjs    Chromium: un id (y un estado) → un PNG determinista (una línea JSON de resultado)
├── index.html     galería de revisión: las cuatro tarjetas en sus dos estados
└── capturas/      los ocho PNG (1440 × 900)
scripts/checks/check-cards.mjs   la prueba de aceptación (57 casos)
```

Las piezas que se **reusan, no se reescriben**: `scripts/scene-src/constellation.mjs` (las cinco capas y el
vocabulario de enlaces), `scripts/scene-src/engine.mjs` (`renderFrame`, `rasterize`, dither, paleta, máscaras),
`design-studies/v1/link-behaviours.mjs` (la escalera de enlaces de la vara: **0,8 / 1,1 / 1,5 px** y sus
opacidades 0,55 / 0,75 / 1,00), `datos/catalogo-88.json` y `datos/nombres-88.mjs`.

## El isométrico (etapa 3)

Hasta la etapa 2 las cinco capas se fundían en un solo compuesto: había cielo, lavado, figura y núcleos, pero
todos a la misma altura. `isometric.mjs` declara una **pila de ocho planos** y `field.mjs` la recorre una vez,
de atrás hacia adelante. Cada plano recibe:

| plano        | z (px) | escala (reposo) | desplazamiento (reposo) | peso | desenfoque |
|--------------|--------|-----------------|-------------------------|------|------------|
| `cielo`      | −100,8 | 1,041           | −5,0 / −8,6 px          | 0,95 | 0,15 px    |
| `lavado`     | −67,2  | 1,047           | −9,6 / −16,5 px         | 0,96 | 0,6 px     |
| `figura:far` | −56,0  | 1,049           | −15,4 / −26,5 px        | 0,97 | 0          |
| `figura:mid` | 0      | 1,058           | 0 / 0                   | 1,00 | 0          |
| `figura:near`| +56,0  | 1,068           | +15,4 / +26,5 px        | 1,00 | 0          |
| `núcleos:far`| −45,9  | 1,051           | −12,6 / −21,7 px        | 0,98 | 0          |
| `núcleos:mid`| +10,1  | 1,060           | +2,8 / +4,8 px          | 1,00 | 0          |
|`núcleos:near`| +66,1  | 1,070           | +18,2 / +31,3 px        | 1,00 | 0          |

- **La escala es la fórmula de la etapa**, no una afinidad inventada: `escala(z) = (perspectiva + z) /
  perspectiva` con `perspectiva = 6 000 px`, y la pila se normaliza por su plano más profundo con el **piso de
  cobertura mínimo** que hace que la lámina del cielo cubra el cuadro (1,041 en reposo, 1,028 en foco). Sin ese
  piso, un plano escalado por debajo de 1 abre un borde recto de ground — el seam que las reglas de composición
  prohíben. La escala de un plano respecto de otro es exactamente la fórmula; lo que se ancla es la pila.
- **El desplazamiento es por plano, no por nodo**: los nodos de un plano comparten pose, altura y peso (el
  chequeo lo mide nodo por nodo). El eje es axonométrico (`0,50 / 0,86`): lo lejano sube a la izquierda y lo
  cercano baja a la derecha — 61 px entre el plano lejano y el cercano. Las tasas de paralaje son las de la
  vara: cielo 0,18 · lavado 0,52 · figura 1,00.
- **Orden de pintado**: la pila declarada, de atrás hacia adelante y sin reordenar. La viñeta cierra el cuadro
  entre la figura y los núcleos — como compone el modelo («siempre encima de todo») — y cada grupo de núcleos
  va de atrás hacia adelante. Los núcleos viajan **en su plano** (+0,18 pasos), por el defecto que la vara
  corrigió en WU150: un resplandor en otra altura se separa de su estrella.
- **El muestreo respeta el material**: el cielo y el lavado son una retícula de estrellas y se remuestrean al
  vecino más cercano (interpolar una estrella la reparte entre cuatro celdas, el motor no encuentra peldaño y la
  apaga — medido: bilineal cuesta un 19 % de la luz del cuadro); la figura y los núcleos son un campo continuo y
  se remuestrean bilineales, para no escalonar el halo.
- **Enfocado**: la escalera de v1, con la afirmación en primer plano. El plano del sujeto se adelanta 14 px
  (`affirm`), pesa 1,00 y no lleva desenfoque; el vecino baja a 0,84 y el plano a dos pasos, a 0,62 — ningún
  plano se oculta (mínimo 0,62) y la retención de luz medida va de 0,69 a 1,20. La atmósfera se va al fondo
  (cielo 0,72 · lavado 0,80, con 0,9 / 0,5 px de desenfoque). La cámara de v1 se aplica a la tarjeta: zoom 1,09
  y un corrimiento de −50 / +12 px, con la tasa del sujeto en 1,00 y las de v1 para el resto (0,89 / 0,78;
  cielo y lavado conservan 0,18 / 0,52).
- **`prefers-reduced-motion`**: la tarjeta no anima. El estado se calcula entero al cargar y se pinta de una
  vez; el chequeo captura el estado enfocado con `reducedMotion: 'reduce'` y exige el **mismo PNG byte a byte**.

## Qué se deriva y qué se toma tal cual

- **Proyección**: gnomónica sobre el centroide de las estrellas (la misma de `construir-figuras.mjs`); las
  rectas del cielo siguen rectas. Norte arriba, este a la izquierda.
- **Nodos y segmentos**: una coordenada distinta = un nodo; cada par consecutivo = un segmento, deduplicado.
  Para las 88, el dibujo coincide exactamente con los conteos que el catálogo declara (767 nodos, 743
  segmentos); el chequeo lo exige para las cuatro renderizadas.
- **Planos**: capa de dibujo, `i % 3`, **no una distancia**. El catálogo no trae paralajes y no se inventan: la
  tarjeta no afirma qué estrella está más cerca. El enlace toma el plano más lejano de sus dos extremos, la
  regla del modelo.
- **Magnitud**: peso derivado del grado del nodo (más segmentos, más cuerpo) más una sacudida determinista del
  `hashNoise` del motor. No es una magnitud fotométrica y no se presenta como tal.
- **Texto de nodo**: la designación RA/Dec del dato, nunca un nombre propio inventado. No se imprime en la
  tarjeta.
- **Lo que se imprime**: abreviatura IAU, nombre latino (`nombres-88.mjs`, campo `la`), glosa española
  (campo `fuente`, del anexo de Wikipedia que cita a Comellas 1987), conteo de nodos y segmentos, y el crédito
  de datos que la licencia BSD-3 exige conservar.
- **Nada de mitología** ni de copy de producto. El nombre interno del proyecto no aparece: el chequeo lo busca
  en el texto impreso.

### Una desviación declarada del validador

`validateConstellation` exige `provenance.official: false` porque nació para asterismos del proyecto
(`genghe`, `alrumh`). Las 88 del catálogo **son** constelaciones IAU, y el dato dice `official: true`. No se
miente en el dato para pasar un validador escrito para otro caso: `validateCard` filtra esa única regla y el
chequeo comprueba que el validador crudo devuelve **exactamente** esa queja y ninguna otra.

## Reproducibilidad

Cada tarjeta se renderiza **dos veces en procesos separados** (dos navegadores, dos servidores efímeros) en
cada estado, y se compara el sha256 del PNG. Además el chequeo exige que el estado enfocado **no sea el mismo
PNG** que el de reposo: un isométrico que no hace nada no pasa. Salida de la última corrida:

```
Ori · reposo                3b88851dde30f5e20f01a654e2d4451b12c6b723b7d90091fec122c48e7e8382
Ori · enfocado              b2de5e7d818a6b051e8197e25f068414a2878c82ccceb890c0c0940312e6d7d8
Lyr · reposo                e12f78b15d3b9ab700657de5d909530101065abcc07c6247edf5e5c17b72f63c
Lyr · enfocado              f24ec5e8ea54d3fc5dd7179aed96eff9904808bb0c31824d21f016fc11efeec9
Cru · reposo                a261f11d6e38adb934ea4d7db345b7fda3869642d5ea6a933b6e3da91ebe8bec
Cru · enfocado              7a989c4f66704c51edfe8f9d99aec6e49d17d038f073f64e1cc3c0feb0b3f783
Sge · reposo                ef70fc5a48025dbc115615d8c03b8e2f9a68ffaa115511376a11455ab3b02bbb
Sge · enfocado              afb46567d52fe86c7fb2a5b2f266c249f3de875cd6daa83178613ace2c8a8573
Ori · enfocado (reduced)    b2de5e7d818a6b051e8197e25f068414a2878c82ccceb890c0c0940312e6d7d8
```

Qué lo hace determinista: un solo instante congelado (`CARD.p = 0,375`, cuadro 135 de 360 a 12 fps), nada de
`Math.random` ni de reloj, `renderFrame` con dither ordenado fijo, la pila de planos con poses calculadas
(`isometric.mjs` es puro), muestreo bilineal y desenfoque escritos a mano (sin `filter` del navegador), fuentes
locales con `font-display: block` y espera de `document.fonts.ready`, captura a DPR 1 con
`deviceScaleFactor: 1`, y ninguna animación en la página (la única espera son dos `requestAnimationFrame` para
que el canvas esté compuesto). El navegador de la prueba es Chromium **153.0.8010.12** (Playwright del cache
del proyecto). Las capturas de `capturas/` se hicieron contra el servidor 4403 y el chequeo usa uno efímero
propio: los hashes son los mismos, así que el origen HTTP tampoco cambia los bytes.

## Coste medido (una corrida fría, esta máquina)

- Por tarjeta: campo **600–680 ms** (láminas 530–600 · planos 28–34 · dither 15–19 · raster 21–25); enlaces SVG
  ≈ 1 ms; captura 49–54 ms; proceso completo con navegador **1 050–1 100 ms**.
- Las **láminas** son el coste nuevo: el layout del modelo (≈150 ms) más **un layout por plano de figura** para
  pedirle al modelo los núcleos de ese plano (≈110–135 ms cada uno). Se piden así para no duplicar las
  constantes del núcleo (`CORE_INNER` / `CORE_OUTER` son privadas del modelo): es el precio de que los núcleos
  viajen exactos en su plano. El layout se cachea por constelación, así que los dos estados comparten láminas y
  el estado enfocado cuesta sólo la composición (≈95 ms).
- 88 tarjetas: **≈ 95 s** si cada una abre su navegador, **≈ 58 s** con el navegador ya abierto (campo + enlaces
  + captura ≈ 655 ms). Antes de la etapa 3 eran ≈ 68 s / ≈ 22 s: el isométrico multiplica el coste de láminas y
  ese es su precio medido, no una impresión.

## Juicio visual contra la vara (`design-studies/v1/`)

Comparadas al mismo ancho (1440 × 900), en reposo y en foco, contra `design-studies/v1/` y contra las capturas
anteriores de las tarjetas:

- **Ganaron profundidad, no sólo movimiento.** El plano de la atmósfera ya no está pegado a la figura: la nube
  queda detrás, blanda (el borde local de la atmósfera baja de 12,4 a 9,5 y la luz media de 7,9 a 7,1 sobre
  255), la figura tiene tres alturas (61 px entre el plano lejano y el cercano, 3 % de escala entre ellos) y al
  enfocar el sujeto se afirma de verdad: peso 1,00 contra 0,62 del plano a dos pasos, y la pieza cambia entre
  reposo y foco en el **36–45 % de las celdas** (5,7–11,5 % de los píxeles con `|Δ| > 0,01`; media 0,004–0,011 de
  luma). Si el isométrico no hiciera nada, el chequeo falla por hash y por delta.
- **La textura de la atmósfera mejoró y se acercó a v1.** El desenfoque de la nube agrupa el polvo en racimos
  (como la emisión continua de la vara leída en puntos) en vez de dejarlo como una alfombra de puntos sueltos.
  No es todavía la nebulosa de v1: sigue siendo polvo colocado, no emisión continua, y a la misma fracción de
  tinta se lee como campo de estrellas con nube, no como superficie. Es una diferencia del modelo
  (`constellationLayers`), no un aplanamiento de la tarjeta.
- **La figura pesa menos que la de v1** por contenido, no por render: v1 es una red de 35 nodos apiñada en un
  paño chico; Ori son 23 nodos repartidos en una constelación real y Cru son 4. La lectura es de silueta y ahora
  también de altura.
- **Lo que todavía falta para estar a la altura de la vara.** (1) La nebulosa: densidad y material, no
  profundidad — se ataca en la receta de capas, no acá. (2) El zoom del foco (1,09) es más suave que el de v1
  (1,28): con la figura pegada al borde derecho del cuadro, un zoom mayor la saca del encuadre; para subirlo hay
  que mover la ventana de figura (`FIGURA` en `data.mjs`), que es una decisión de composición, no del isométrico.
  (3) El encuadre: el nodo más a la derecha queda a ~40 px del borde en reposo (antes ~78 px), así que su halo
  se corta un poco más que en la captura anterior. Es consecuencia del piso de cobertura, no un error del
  orden de pintado.

## Límites y decisiones

- No hay interacción: la tarjeta es un still con **dos estados** elegidos por URL (`?focus=<nodo>`). El `trace`
  de v1 (el enlace se dibuja mientras la señal lo recorre) se apaga con `edge: -1` porque congelado a mitad de
  camino deja un trazo cortado que se lee como error. Quedan `depth` (peso por plano) y `pulse` (el cometa de
  ambiente), congelados en el instante. Con un nodo enfocado, el enlace de un plano atenuado se atenúa con su
  plano (mismo número que la escalera de planos).
- **Desenfoque**: se aplica sobre el TONO antes del dither, no con un `filter` del navegador. Eso lo hace
  determinista y medible, pero un tono escaso desenfocado pierde peldaños: por eso el cielo se queda casi
  nítido en reposo y la figura nunca se desenfoca (su profundidad la llevan peso, altura y escala).
- El pulso es el de la vara: colas largas y tenues primero, cabeza corta y brillante al final, en segmentos del
  enlace.
- La mono es la pila del sistema (la misma de `v1.css`). Los hashes reproducen en esta máquina y este
  Chromium; para reproducir en otra máquina habría que fijar también la mono.
- La tarjeta no mide su composición con `compositionMetrics`: ese protocolo mide la pieza aprobada a
  1280 × 900 con una zona calma de titular. Acá la calma es el bloque de copia y se mide con el tono final
  (ya transformado) del propio flujo.
- Las capturas son PNG de 1440 × 900 (≈ 90–171 KB). Las figuras son convención de carta, no una definición de
  la IAU; el dato y su licencia viven en `datos/`.
