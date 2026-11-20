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
| `bake.mjs` | El horneado: `material()` (celda 5, sobremuestreo 1,6) para el cielo, `material()` transparente (retícula 480 × 300, celda 3, alfa `smoothstep(amount / 0,035)`) para el lavado, su versión desaturada un 10 %, y la viñeta. También la emisión de la atmósfera (LUT de 16 × 2048, la de v1). |
| `emission.mjs` | El worker de la emisión: una `OffscreenCanvas` de 1 440 × 900, la atmósfera del instante, `transferToImageBitmap`. |
| `live.mjs` | La escena: compone las hojas, dibuja la figura SVG, mueve la cámara, cruza las opacidades y expone `window.__live` para que el chequeo mida. |
| `capture.mjs` | Una captura por estado: `reposo`, `mitad`, `foco`, `puntero-a`, `puntero-b`. |
| `capturas/` | Los PNG de `Ori` en los cinco estados. |

## Los siete puntos del mecanismo, y dónde se miden

1. **Capas.** Cielo horneado con `material()` + `stepFor(level, x, y, 'bayer4')` + `compensate` +
   `rasterize`, celda 5 y sobremuestreo 1,6; lavado horneado sobre la retícula del motor (480 × 300)
   a celda 3, `transparent`, alfa `smoothstep(amount / 0,035)`; `focusedWash` desaturado un 10 %. La
   figura es **SVG vectorial** (nodos + aristas) en `viewBox 0 0 480 300`: el motor no pinta ni un
   nodo. → caso **a**.
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
   horneado; una sola petición en vuelo y descarte por `generation`. **La cámara no deriva sola.** →
   caso de apoyo.
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

## Lo que esta escena NO copia de v1

- La **emisión** (el cielo, la atmósfera, la paleta) es la de la constelación del catálogo, no la de
  la vara: v1 tiene su propio cielo analítico y su propia banda; acá el material sale de la receta de
  capas del catálogo. El mecanismo es el mismo; el material es el del sujeto.
- El grupo de foco: v1 usa sus anillos (`RINGS`); el catálogo no trae anillos y trae enlaces, así que
  el grupo es el nodo y sus vecinos por enlace.
- El recorte de la cámara usa 20 px de margen en los cuatro lados (v1 deja 100 px arriba y abajo por
  su barra de navegación): con la cota de v1 los recortes serían imposibles para las figuras del
  catálogo y `destination()` caería en su respaldo de centrar, que sí deja planos fuera del marco.
