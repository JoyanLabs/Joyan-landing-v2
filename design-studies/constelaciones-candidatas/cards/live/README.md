# La escena viva — la tarjeta que dejó de ser una imagen

La tarjeta quieta de `cards/` compone las cinco capas y las funde en un PNG. Esta pieza
conserva **la misma entrada** —un id del catálogo— y **la misma pila de ocho planos**
(`cards/isometric.mjs` → `STACK`), pero cada plano es una lámina propia: el puntero los
mueve a velocidades distintas, un clic lleva la cámara al nodo y el plano más lejano se
desenfoca. `?id=Ori` y `?id=Sge` son la misma página; no hay una rama por constelación.

```
design-studies/constelaciones-candidatas/cards/live/index.html?id=Ori
```

Con el servidor del repo en el 4403:

```
http://127.0.0.1:4403/design-studies/constelaciones-candidatas/cards/live/index.html?id=Ori
```

## Qué hace

| Gesto | Efecto |
|---|---|
| mover el puntero | paralaje por capa: cielo **0,18** · lavado **0,52** · figura **1,00** |
| clic en un nodo | la cámara va a su plano (zoom **1,28**, tasas de v1), el sujeto se afirma, el intermedio se atenúa, el más lejano se desenfoca |
| `Escape` o clic en el fondo | vuelve a la vista completa |
| `prefers-reduced-motion` | sin animación: el estado final se aplica de una vez, el puntero no mueve nada |
| `?still=1` | congela el pulso en el instante de la pieza (`CARD.p`) para capturas reproducibles |
| `?focus=<n>` | abre ya enfocado, para capturar el estado final |

La transición es interrumpible: un `Escape` a mitad de camino arranca desde la cámara y
los pesos que hay en ese instante, no desde el destino anterior.

## Por qué la profundidad se ve

La etapa 3 de la tarjeta separaba los planos, pero la separación no se leía: 30 px entre
`figura:far` y `figura:mid`, escala casi plana y **sin desenfoque de la figura**. Acá:

- **Z real**: paso de **90 px** entre planos vecinos de la figura; el cielo en −4 pasos
  (−360 px) y el lavado en −3 (−270 px).
- **Deriva**: 0,80 px de pantalla por px de Z → **72 px** entre planos vecinos. Las
  proyecciones medidas del mismo punto dan **38,3–98,0 px** entre vecinos y **196,0 px**
  entre `far` y `near` (la escala diferencia además de la deriva).
- **Escala compensada**: `(P + z − zFar) / P` con P = 1 000 px → **1,000 / 1,090 / 1,180**
  para `far / mid / near`. El ancla es el bolsillo de la figura (`figurePocket`), así el
  plano cercano crece alrededor de la figura y no la saca del cuadro. El cielo y el lavado
  conservan la densidad de la lámina del modelo (escala 1) y su profundidad se lee en el
  desplazamiento, el desenfoque y el paralaje.
- **Profundidad de campo quieta**: desenfoque de reposo de **2,6 px** en `far`, **1,1** en
  `mid`, **0,45** en `near`; el cielo y el lavado a 0,5 / 0,35. Lo lejano se lee como fondo
  sin tocar nada.
- **Foco**: el sujeto pesa 1 y no se desenfoca; el intermedio 0,82; el más lejano desde el
  sujeto pesa 0,55 y pasa a **4,0 px** de desenfoque. La escalera y el desempate (`back` =
  el plano profundo) son los de `design-studies/v1/`.
- **Enlaces**: el trazo de la vara (0,8 / 1,1 / 1,5 px) abierto en profundidad (×1,0 / ×1,3
  / ×1,6) y atenuado con el peso de su plano. El pulso es `link-behaviours.mjs`, sin copia.
- **Halos**: cada nodo tiene su núcleo y su halo en el grupo SVG de su plano; el grupo lleva
  la misma transformación, opacidad y desenfoque que la lámina de ese plano.

## Cómo se hornea

`bake.mjs` construye **una lámina por plano** con las mismas láminas del modelo que usa la
tarjeta (`planeSheets`, exportado por `cards/field.mjs`):

1. muestrea la lámina con la pose de reposo del plano (desplazamiento + escala);
2. el cielo y el lavado se muestrean con **wrap** (`point`), porque son medios de cuadro
   completo y sin wrap un plano escalado por debajo de 1 dejaría un borde recto de ground;
3. la viñeta multiplica a los planos del marco, nunca a los núcleos;
4. `renderFrame` decide peldaño y paleta; la lámina se vuelve RGBA **transparente** con la
   máscara de cobertura medida del motor (alfa = cobertura, RGB = la tinta elegida).

La lámina mide 1 728 × 1 080 (margen 144 / 90 px) para que el paralaje y la cámara no
descubran un borde. El horneado de los ocho planos mide **~560 ms** en el navegador de la
verificación.

## Lo medido (Ori, 1440 × 900)

`timeout 180 node scripts/checks/check-cards-live.mjs` — 19 casos:

| Caso | Número |
|---|---|
| (a) profundidad quieta | vecinos **38,3–98,0 px** · `far→near` **196,0 px** · escalas 1,000 / 1,090 / 1,180 |
| (b) el clic cambia la composición | **12,7 % del cuadro** y **95,3 % de la tinta** cambian · media 5,0 · pico 247 |
| (c) el desenfoque existe | nitidez del plano lejano **1,61 → 1,11** (varianza del laplaciano, **−31 %**) · 2,6 → 4,0 px |
| (d) el paralaje existe | cielo **7,9 px** &lt; lavado **22,8 px** &lt; figura **43,8 px** (tasas 0,18 / 0,52 / 1,00) |
| (e) reproducibilidad | primer cuadro en dos procesos: **785a2fac…** = **785a2fac…** |
| reduced motion | mismo nodo, **0,000 %** de píxeles distintos del estado animado; puntero inmóvil |

Los casos (b) y (c) se miden sobre las capturas reales, no sobre el estado declarado. Para
(c) se aísla la lámina del plano que el foco manda al fondo —una medición, no la pieza que
se publica— y se calcula la varianza del laplaciano sobre la tinta.

## Capturas

En `capturas/`, producidas con `capture.mjs` y abiertas antes de entregar:

- `Ori-reposo.png` — la profundidad quieta.
- `Ori-transicion.png` — la mitad de la transición de foco (`seekFocus(nodo, 0,5)`).
- `Ori-foco.png` — el foco terminado (sujeto cerca, fondo desenfocado).
- `Ori-puntero-a.png` / `Ori-puntero-b.png` — dos posiciones de puntero, mismo instante.

```
node design-studies/constelaciones-candidatas/cards/live/capture.mjs Ori \
  --state reposo --out .../capturas/Ori-reposo.png
```

Estados: `reposo`, `transicion`, `foco`, `puntero-a`, `puntero-b`; `--node <n>` elige el
nodo y `--base <url>` apunta a otro servidor.

## Juicio contra la vara

Comparado con `design-studies/v1/` al mismo tamaño: la pieza ya tiene lo que la vara tiene
—cámara que responde, planos que se separan, fondo que se va de foco, pulso en los
enlaces— y lo que la tarjeta no tenía: profundidad de campo quieta y paralaje. La figura
sigue siendo más escasa y más dibujada por el dither del modelo que la de v1, y el fondo
es más parejo que la banda de nebulosa de la vara: son límites de la receta de capas del
catálogo, no de esta escena. El foco recorta los bordes del encuadre a propósito (la
figura ocupa casi todo el alto; exigir todos los nodos dentro anulaba el acercamiento,
medido); `Escape` vuelve a la vista completa.
