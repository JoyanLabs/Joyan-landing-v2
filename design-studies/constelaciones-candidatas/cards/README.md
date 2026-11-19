# Tarjetas de constelación — el flujo, no las 88

Cuatro tarjetas renderizadas con el motor real y el flujo que las produce. Las otras 84 constelaciones del
catálogo quedan como **dato de almacén**: no hay tarjeta, no hay página, no hay promesa.

| id    | nombre    | glosa (significado) | figura          | tarjeta                                        |
|-------|-----------|---------------------|-----------------|------------------------------------------------|
| `Ori` | Orion     | Orión               | 23 nodos · 24 segmentos | `capturas/Ori.png`                     |
| `Lyr` | Lyra      | La Lira             | 6 nodos · 7 segmentos   | `capturas/Lyr.png`                     |
| `Cru` | Crux      | La Cruz del Sur     | 4 nodos · 2 segmentos   | `capturas/Cru.png`                     |
| `Sge` | Sagitta   | La Flecha           | 4 nodos · 3 segmentos   | `capturas/Sge.png` (cuarta, sin código) |

Las tres primeras muestran rango: muchos nodos, media, pocos. La cuarta existe para probar una sola cosa: que
**agregar una constelación no toca el renderer**.

## Cómo se corre

El servidor de la raíz del repo en el 4403 ya sirve el estudio (`http://localhost:4403/`). Para una tarjeta:

```sh
node design-studies/constelaciones-candidatas/cards/capture.mjs Ori \
  --out design-studies/constelaciones-candidatas/cards/capturas/Ori.png
```

`capture.mjs` acepta cualquier `id` del catálogo y `--base <url de card.html>` si el servidor no está en 4403.
La galería de revisión es `cards/index.html` (por HTTP, no `file://`: son módulos ES).

El chequeo (levanta su propio servidor efímero, no toca el 4403):

```sh
timeout 180 node scripts/checks/check-cards.mjs
```

## Agregar una constelación: sólo el id

`Sge` se renderizó con la misma orden, sin editar `data.mjs`, `field.mjs`, `card.mjs` ni `capture.mjs`. La única
entrada es el `id` del catálogo. El chequeo lo fija de dos maneras: renderiza `Sge` y además exige que **ningún
archivo del flujo contenga un id entrecomillado** (los comentarios no cuentan; la prueba es sobre el código).
Las reglas de derivación —proyección, planos, magnitud, encuadre— son funciones del dato, no una tabla.

## Los archivos del flujo

```
design-studies/constelaciones-candidatas/cards/
├── data.mjs      catálogo + nombres → objeto de constelación del modelo (sin entradas por constelación)
├── field.mjs     cinco capas por el motor: renderFrame + rasterize → RGBA, nodos en px, tiempos y medidas
├── card.html     la tarjeta: canvas del campo, capa SVG de enlaces, bloque de texto vacío
├── card.css      la tipografía de la casa (Michroma / Archivo / mono), una sola tinta, sin marco ni sombra
├── card.mjs      monta el canvas, dibuja los enlaces de v1 congelados y llena el texto desde el dato
├── capture.mjs   Chromium: un id → un PNG determinista (una línea JSON de resultado)
├── index.html    galería de revisión de las cuatro tarjetas
└── capturas/     los cuatro PNG (1440 × 900)
scripts/checks/check-cards.mjs   la prueba de aceptación
```

Las piezas que se **reusan, no se reescriben**: `scripts/scene-src/constellation.mjs` (las cinco capas y el
vocabulario de enlaces), `scripts/scene-src/engine.mjs` (`renderFrame`, `rasterize`, dither, paleta, máscaras),
`design-studies/v1/link-behaviours.mjs` (la escalera de enlaces de la vara: **0,8 / 1,1 / 1,5 px** y sus
opacidades 0,55 / 0,75 / 1,00), `datos/catalogo-88.json` y `datos/nombres-88.mjs`.

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

Cada tarjeta se renderiza **dos veces en procesos separados** (dos navegadores, dos servidores efímeros) y se
compara el sha256 del PNG. Salida de la última corrida:

```
Ori  e163e2ad39b62f4bc1f7eaff1f6a350cb030e1dd96951af67c4d857fc3c4b265
Lyr  f1bc8726382f74933c3f339d227b318679be2bb4a45101ecffc91942f5fb4296
Cru  f0108d5f85e20ba867d6202a2f4c7add30e06d084b051d31a0372662b7592197
Sge  dcfdc4596e72c17f0f990547815bfe46655d650cf6ce801acc8b02e061c87fa7
```

Qué lo hace determinista: un solo instante congelado (`CARD.p = 0,375`, cuadro 135 de 360 a 12 fps), nada de
`Math.random` ni de reloj, `renderFrame` con dither ordenado fijo, fuentes locales con `font-display: block` y
espera de `document.fonts.ready`, captura a DPR 1 con `deviceScaleFactor: 1`, y ninguna animación en la página
(la única espera son dos `requestAnimationFrame` para que el canvas esté compuesto). El navegador de la prueba
es Chromium **153.0.8010.12** (Playwright del cache del proyecto). Las capturas de `capturas/` se hicieron
contra el servidor 4403 y el chequeo usa uno efímero propio: los hashes son los mismos, así que el origen HTTP
tampoco cambia los bytes.

## Coste medido (una corrida fría, esta máquina)

- Por tarjeta: campo **205–230 ms** (capas 160–173 · dither 19–25 · raster 25–33); enlaces SVG ≈ 1 ms;
  captura 56–63 ms; proceso completo con navegador **857–997 ms** (mediana de las tres, dos corridas).
- Coste marginal de capa (motor caliente): cielo ≈ 15–20 ms · lavado ≈ 26–31 ms · figura ≈ 24–34 ms ·
  núcleos ≈ 23–32 ms. Las cinco capas se construyen en una sola pasada; quitar cualquiera cambia el compuesto
  (el chequeo lo mide píxel a píxel).
- 88 tarjetas: **≈ 75–88 s** si cada una abre su navegador, **≈ 23–26 s** con el navegador ya abierto
  (campo + enlaces + captura ≈ 262–294 ms). El cuello no es el motor: es el arranque del navegador.

## Juicio visual contra la vara (`design-studies/v1/`)

Comparadas al mismo ancho y lado a lado:

- **Tienen cuerpo, no quedaron planas.** El campo tiene cinco peldaños de punto, 9,3 % de celdas con tinta, una
  banda diagonal de densidad decreciente que atraviesa la figura, y un bolsillo de copia oscuro (tono 0,020
  contra 0,075 del bolsillo de la figura). La figura se lee por silueta: los nodos llevan núcleo y halo en su
  mismo plano, y los enlaces afinan por plano (0,8 / 1,1 / 1,5 px).
- **La diferencia honesta es la textura de la atmósfera.** La nebulosa de v1 es una emisión continua que el
  dither convierte en una superficie casi llena; el modelo de constelaciones compone cielo y lavado con puntos
  colocados estocásticamente, así que a la misma fracción de tinta se lee como *campo de estrellas* y no como
  *nebulosa*. Es una diferencia del modelo, no un aplanamiento de la tarjeta: no hay capa omitida.
- **La figura pesa menos que la de v1** por contenido, no por render: v1 es una red de 35 nodos apiñada en un
  paño chico; Ori son 23 nodos repartidos en una constelación real y Cru son 4. La lectura es de silueta.
- Lo que se corrigió dentro de esta unidad: los primeros intentos eran una alfombra (≈ 20 % de celdas con
  tinta, moteado uniforme, copia sobre polvo). Se resolvió con los datos de capa —concentrar la banda, bajar el
  lavado— hasta 9,3 % con banda direccional y calma oscura. Los números están arriba.

## Límites y decisiones

- No hay interacción: la tarjeta es un still. El `trace` de v1 (el enlace se dibuja mientras la señal lo
  recorre) se apaga con `edge: -1` porque congelado a mitad de camino deja un trazo cortado que se lee como
  error. Quedan `depth` (peso por plano) y `pulse` (el cometa de ambiente), congelados en el instante.
- El pulso es el de la vara: colas largas y tenues primero, cabeza corta y brillante al final, en segmentos del
  enlace.
- La mono es la pila del sistema (la misma de `v1.css`). Los hashes reproducen en esta máquina y este
  Chromium; para reproducir en otra máquina habría que fijar también la mono.
- La tarjeta no mide su composición con `compositionMetrics`: ese protocolo mide la pieza aprobada a
  1280 × 900 con una zona calma de titular. Acá la calma es el bloque de copia y se mide con las capas del
  layout, como dice `field.mjs`.
- Las capturas son PNG de 1440 × 900 (≈ 115–160 KB). Las figuras son convención de carta, no una definición de
  la IAU; el dato y su licencia viven en `datos/`.
