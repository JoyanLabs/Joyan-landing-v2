# La escena viva — el mecanismo de v1 con la figura del catálogo

`cards/live/` renderiza **una** constelación del catálogo (`?id=Ori`, o la primera del catálogo si no
se pasa id) con la misma escena de `design-studies/v1/`, no con una interpretación libre de ella.
La vara es el mecanismo: cielo y lavado **horneados por el motor**, figura **vectorial**, blur del
cielo horneado, `filter` CSS vivo en los planos de nodos, cruce de foco por **opacidades WAAPI**, y
un puntero que **no mueve nada**.

## Qué hace cada archivo

| Archivo | Rol |
|---|---|
| `index.html` | El cuadro (1 440 × 900) y la pila: `sky-camera` → `wash-camera` → `lines` → `vignette` → `node-controls`, más la copia y los controles. |
| `live.css` | La escalera de planos de v1 (tinta 1 / 0,96 / 0,9 · tono 1 / 0,6 / 0,42 · blur 0 / 0 / 0,8 px), los enlaces, la selección a 1,12 y el `data-instant` que apaga transiciones CSS en una captura. |
| `depth.mjs` | El modelo puro: mundo 480 × 300, tasas de plano, cámara de foco (zoom 1,28 · mira 0,65 nodo + 0,35 centroide · recorte al marco), escalera de tratamientos, registro de tiempo de v1. |
| `bake.mjs` | El horneado: `material()` (celda 5, sobremuestreo 1,6) para el cielo, `material()` transparente (retícula 288 × 180, **celda 5**, alfa = **máscara de cobertura del peldaño**) para el lavado, su versión desaturada un 10 %, y la viñeta. También la emisión de la atmósfera (LUT de 16 × 2048, la de v1). La celda del lavado es la de la banda de v1 —su cielo, dibujado 1:1— y no la de su hoja de lavado (celda 3, dibujada a 0,8): a celda 3 el peldaño más chico de la escalera es una cruz, a celda 5 es un punto redondo. 288 × 5 = 1 440 px, así que la hoja sigue llegando al canvas píxel por píxel. |
| `emission.mjs` | El worker de la emisión: una `OffscreenCanvas` de 1 440 × 900, la atmósfera del instante, `transferToImageBitmap`. |
| `live.mjs` | La escena: compone las hojas, dibuja la figura SVG, mueve la cámara, cruza las opacidades y expone `window.__live` para que el chequeo mida. |
| `capture.mjs` | Una captura por estado: `reposo`, `mitad`, `foco`, `puntero-a`, `puntero-b`. |
| `nebula-compare.mjs` | La nebulosa contra la vara: hornea las dos con la misma llamada del motor, recorta la misma ventana de 240 × 160 px, la amplía ×2 con vecino más cercano y escribe `capturas/nebulosa-2x-*.png`. Imprime peldaños usados, fracción de tinta de las dos y la tinta **renderizada** de las dos ventanas compuestas, que es la única cifra comparable entre una hoja transparente y una opaca. |
| `capturas/` | Los PNG de `Ori` en los cinco estados, y la comparación de grano (`nebulosa-comparacion-2x.png`: nuestra nebulosa a la izquierda, la de v1 a la derecha). |

## Los siete puntos del mecanismo, y dónde se miden

1. **Capas.** Cielo horneado con `material()` + `stepFor(level, x, y, 'bayer4')` + `compensate` +
   `rasterize`, celda 5 y sobremuestreo 1,6; lavado horneado sobre 288 × 180 a celda 5,
   `transparent`, con el alfa tomado **sólo** de la máscara de cobertura del peldaño: la nebulosa son
   puntos de la escalera —el tamaño del punto y su densidad en el Bayer— y no una opacidad continua.
   El TONO de la atmósfera lo pone el modelo (`WASH` en `scripts/scene-src/constellation.mjs`): es
   una retícula llena, la banda pinta ≥ 90 % de sus posiciones como la de v1, y el borde está donde
   el tono baja del primer peldaño. `focusedWash` desaturado un 10 %. La figura es **SVG vectorial**
   (nodos + aristas) en `viewBox 0 0 480 300`: el motor no pinta ni un nodo. Las dos láminas llegan
   al canvas 1:1 y en un desplazamiento entero, así el dither no se remuestrea. →
   casos **a**, **h**, **i**, **j** y **k**.
2. **Blur.** Cielo enfocado horneado (`blur(6px)` + downsample ×2, una vez por rebuild); lavado sin
   blur; planos de nodos con `filter` CSS vivo y la escalera focus/middle/back. Cruce de opacidades
   por WAAPI: `sky.focus-copy` 0 → 0,5 y lavado 1 → 0,94, **61 keyframes en 1 200 ms**, curva
   `p³(10−15p+6p²)`. → casos **b** y **d**.
3. **Puntero.** No hay paralaje por puntero. El único `pointermove` de la escena llama `hover()`:
   clase `node-lit` y radio del core. Nada de transformar planos, cámara ni geometría: si el puntero
   moviera una capa, el caso **c** falla.
4. **Interacción.** Clic en un cuadrado de 26 CSS px, Enter/Space en los nodos
   `role=button tabindex=0`, Tab resalta, `Escape` vuelve, botón de reset, pausa/reanudar y vuelta
   automática a los 7 000 ms. → caso **e**.
5. **Foco.** Escalera de planos por distancia (el más lejano toma el blur de 0,8 px), `node-selected`
   a escala 1,12, cámara zoom 1,28 con mira 0,65 nodo + 0,35 centroide de su grupo de enlaces
   dividida por la tasa del plano y recortada para que **ningún plano salga del marco**; enlaces con
   `focusMix` (el grupo sólido, el resto a `FOCUS_FADE`). → casos **d** y **g**.
6. **Reposo.** Emisión a 12 Hz (83,3 ms) por worker con `OffscreenCanvas`, sin recalcular el cielo
   horneado; una sola petición en vuelo y descarte por `generation`. La emisión usa la misma LUT por
   paso de dither que el horneado: el grano de la atmósfera viva es el mismo que el de la lámina, no
   un degradé. **La cámara no deriva sola.** → caso de apoyo, y la mitad viva del caso **i**.
7. **Reducido.** Sin rAF, sin worker, sin transiciones; el estado final de una vez y el still en el
   cuadro **100 de 720** (1,666… s), que es también la fase de los enlaces. → caso **f**.

## El chequeo

```bash
# desde la raíz del repo
timeout 180 node scripts/checks/check-cards-live.mjs
```

Abre la página con Chromium, mueve el puntero, hace clic, mueve la cámara y mide: hashes de las
láminas en dos procesos, píxeles apagados al ocultar el SVG, filtros computados, nitidez (varianza del
laplaciano), matrices de los planos, keyframes de las animaciones y milisegundos del reloj de la
página. Nada de esto busca nombres en el código.

El grano de la nebulosa se mide además sobre las láminas del motor: el conjunto de valores de alfa
—tiene que ser el de la escalera de cobertura y nada más—, la máscara de cada celda (ningún gradiente
adentro), el peldaño de cobertura total (que sería una mancha, no un punto), la nebulosa de v1
horneada con la misma llamada y medida en la misma ventana, y el canvas contra la lámina píxel por
píxel, que es lo que prueba que el dither no se remuestrea al dibujar. Casos **h**, **i**, **j** y
**k**.

La COBERTURA se mide sobre la región de atmósfera del modelo: la forma de la banda a la mitad de su
propio pico, con el bolsillo de la figura y el de la copia descontados, tiene que quedar pintada en
≥ 90 %; fuera de ella ≤ 10 %. La vara se mide igual, con una región que sale del tono de su emisión
y no de lo que ya pintó: su banda llena 0,91 de sus posiciones y deja 0,24 fuera (su polvo). La
nuestra llena 0,997 y deja 0,089: el campo fuera de la banda sigue vacío. → caso **a**.

## Las capturas

```bash
cd design-studies/constelaciones-candidatas/cards/live
for s in reposo mitad foco puntero-a puntero-b; do
  timeout 90 node capture.mjs Ori --state "$s" --out "capturas/Ori-$s.png"
done
```

`reposo` es determinista byte a byte en dos procesos (`still=1` congela el reloj en el cuadro 100).
`mitad` y `foco` usan `seekFocus`, que aplica el estado sin reloj. `puntero-a` y `puntero-b` ponen el
cursor sobre dos nodos distintos: las dos capturas son idénticas **salvo el nodo iluminado**.

El grano de la nebulosa se compara contra la vara con el recorte ampliado ×2 de las dos:

```bash
timeout 180 node nebula-compare.mjs Ori
```

Escribe `capturas/nebulosa-2x-Ori.png` (la nuestra), `capturas/nebulosa-2x-vara.png` (la de v1) y
`capturas/nebulosa-comparacion-2x.png`, las dos en la misma ventana de 240 × 160 px y al mismo
aumento. La lámina de v1 se hornea llamando a su `hero-field.mjs` como lo llama `v1.mjs`: la vara es
de sólo lectura. Las cifras que el script imprime —peldaños usados, fracción de tinta de cada lámina y
tinta renderizada de cada ventana compuesta— son las mismas que mide el caso **j** del chequeo.

## Lo que esta escena NO copia de v1

- La **emisión** (el cielo, la atmósfera, la paleta) es la de la constelación del catálogo, no la de
  la vara: v1 tiene su propio cielo analítico y su propia banda; acá el material sale de la receta de
  capas del catálogo. El mecanismo es el mismo; el material es el del sujeto.
- El grupo de foco: v1 usa sus anillos (`RINGS`); el catálogo no trae anillos y trae enlaces, así que
  el grupo es el nodo y sus vecinos por enlace.
- El recorte de la cámara usa 20 px de margen en los cuatro lados (v1 deja 100 px arriba y abajo por
  su barra de navegación): con la cota de v1 los recortes serían imposibles para las figuras del
  catálogo y `destination()` caería en su respaldo de centrar, que sí deja planos fuera del marco.
