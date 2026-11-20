# Proceso determinista de escenas

Cada escena se compone en **etapas** con entradas, salidas y verificación propias. Ninguna etapa se dibuja a
mano: o la produce el motor o no es evidencia. Este documento reemplaza la idea de una skill: un procedimiento
que convierte gusto en umbrales produce mínimos; un proceso con etapas medibles produce lo mismo dos veces.

**Corte: 2026-11-05.** Base canónica: `design-studies/v1/`. Banco de pruebas actual:
`design-studies/constelaciones-candidatas/cards/`.

## Las etapas

| # | Etapa | Entrada | Salida | Verificación |
|---|---|---|---|---|
| 0 | **Sujeto** | id del catálogo (88 constelaciones, J2000) o una imagen simplificada | lista de nodos y enlaces con sus coordenadas | conteo contra el dato; ningún trazo inventado |
| 1 | **Geometría** | nodos y enlaces + ventana | encuadre, proyección, plano por nodo, magnitud | todos los nodos dentro del cuadro; la figura se lee a 390 |
| 2 | **Capas** | encuadre + receta de capas | cielo, lavado, figura (3 planos), viñeta, núcleos | las cinco capas presentes; una ausente falla |
| 3 | **Isométrico** | capas + separación por plano | cada plano desplazado y escalado en Z, con su sombra | la profundidad se ve sin animación; el plano enfocado se afirma |
| 4 | **Dither** | el campo compuesto | peldaños e índices por celda | `renderFrame` + `rasterize`; paleta de siete tonos |
| 5 | **Enlaces** | enlaces + planos | trazos con la escalera 0,8 / 1,1 / 1,5 px y pulso | la escalera crece de lejos a cerca; ningún enlace invisible |
| 6 | **Datos** | nombre, significado, conteos | tipografía y firma de la pieza | sin promesas de producto; atribución de la fuente |
| 7 | **Verificación** | la pieza | números y capturas | no-plana, reproducibilidad byte a byte, comparación con la vara |

## Las reglas que no se negocian en ninguna etapa

1. **Cinco capas o no es escena.** Falta una y el chequeo falla con el nombre del faltante.
2. **La profundidad se ve quieta.** El isométrico tiene que leerse en una captura, no sólo al interactuar.
3. **Nada de campos parejos.** Un campo uniforme se nombra como uniforme y falla; ya pasó dos veces.
4. **El piso de percepción manda.** Un trazo por debajo de un píxel de dispositivo al tercio de su opacidad no
   es sutil: no está. Ya pasó con los enlaces.
5. **Reproducibilidad.** Dos procesos separados, mismo PNG byte a byte. Si no, no es un proceso.
6. **La comparación con la vara es obligatoria.** Cumplir umbrales no aprueba una pieza; la vara es
   `design-studies/v1/` y se compara al mismo tamaño.

## Etapa 3: el isométrico

Es la que separa una tarjeta de una escena. Hoy las tarjetas componen las capas y las funden; la vara las separa
en profundidad y por eso tiene cuerpo.

- Cada plano se desplaza en Z y se **escala compensada** (`(perspectiva + z) / perspectiva`) para que lo lejano
  no se encoja de más.
- El desplazamiento es **por plano**, no por nodo: los nodos de un plano comparten altura.
- Al enfocar, el plano del sujeto **se afirma** y los otros se atenúan y se desenfocan; nunca se ocultan.
- El orden de pintado va de atrás hacia adelante y no se reordena.
- Con `prefers-reduced-motion`, el estado final se aplica sin animación.

## Medido en la etapa 3

- Pila de **8 planos** (cielo, lavado, figura far/mid/near, núcleos far/mid/near), pintada una sola vez de atrás
  hacia adelante; el desplazamiento es por plano y la escala es compensada con `(P+z)/P` (P = 6000).
- Estado enfocado: el sujeto pesa **1,00** sin desenfoque, el vecino **0,84** y el plano a dos pasos **0,62**;
  retención mínima medida **0,69**, ningún plano oculto.
- La diferencia entre reposo y enfocado es real y se verifica: **45,1 % de celdas** y **11,5 % de píxeles**
  cambian. Un isométrico que no cambia nada ahora **falla** el chequeo.
- Coste: campo 600–680 ms por tarjeta (antes 191); las 88 serían ≈ 95 s con navegador frío, ≈ 58 s caliente.
- **Lo que el isométrico NO arregló**: la nebulosa sigue siendo polvo colocado, no emisión continua. Le dio
  plano y foco, no material. Eso vive en la receta de capas (`CAPAS` en `cards/data.mjs`), no acá.


### Etapa 3 en vivo (2026-11-05)

La profundidad **se ve quieta**, no sólo al interactuar: **72 px** entre planos vecinos (38,3–98,0 px según el
nodo) y **196 px** de la figura más lejana a la más cercana, con escala compensada 1,000 / 1,090 / 1,180 y
profundidad de campo quieta de 2,6 / 1,1 / 0,45 px. Al enfocar, el plano lejano pierde **31 % de nitidez** y el
sujeto se afirma. Paralaje medido entre dos posiciones de puntero: **7,9 / 22,8 / 43,8 px** (cielo, lavado,
figura).

**Lección de esta etapa, para no repetirla:** haber implementado el isométrico no fue haberlo logrado. Lo
primero se verifica en el código; lo segundo, en una captura que alguien mire. El primer intento pasó el chequeo
y se leía plano.

## Estado de cada etapa (2026-11-05)

| Etapa | Estado | Dónde |
|---|---|---|
| 0-2 | Funcionando | `cards/data.mjs`, `cards/field.mjs` |
| 3 · Isométrico | **Aprobada por la dirección** (2026-11-05) | `cards/isometric.mjs`: pila de 8 planos, `(P+z)/P`, pose por plano, foco con la cámara de v1 |
| 4-5 | Funcionando | `cards/field.mjs`, `link-behaviours.mjs` |
| 6 | Funcionando | `cards/card.mjs` |
| 7 | Funcionando | `scripts/checks/check-cards.mjs` (57 casos: reproducibilidad **por estado**, enfocado ≠ reposo por hash y por píxel) |


## Estado de validación (2026-11-05)

**Validado por la dirección:** el **efecto de desplazamiento e interacción** es el correcto. Al hacer click en un
nodo la cámara se mueve, el plano del sujeto se afirma, los otros se atenúan y el más lejano se desenfoca; el
puntero no mueve nada. Ese mecanismo queda **aprobado** y no se reabre.

**Pendiente de validación completa:** el **material**. Estado al 2026-11-05:

- **Grano: igualado.** La nebulosa se produce con `material()` del motor y su alfa es la **máscara de cobertura
  del peldaño**, no una opacidad continua. Alfa de la hoja: **7 valores**, todos pertenecientes a la escalera de
  celda 3. Cero celdas en el peldaño de cobertura total (eran 1 048 y formaban parches sólidos), cero celdas
  pintadas sin atmósfera detrás (eran 5 193 porque el tono del cielo decidía el peldaño). 3 peldaños usados y
  **6,1 %** de tinta contra **2 peldaños y 6,5 %** de la banda de la vara.
- **Cobertura: igualada (2026-11-05).** `washCloud` dejó de ser un campo de probabilidad y ahora devuelve el
  **tono** que el motor convierte en peldaños, como la vara. Medido con la misma regla en los dos lados:
  **0,997 dentro de la banda** y **0,089 fuera** (la vara: 0,910 / 0,243). La celda del lavado pasó a **5** sobre
  **288×180** (= 1440×900 dibujado 1:1), porque a celda 3 el peldaño más chico leía como cruz y a celda 5 lee
  redondo, como la vara. Peldaños usados: 2 en ambos; tinta compuesta 6,4 % contra 7,0 %.
- **El nudo: conseguido.** Se implementó como en la vara, con un **evento luminoso** (`BAND_EVENT`): una luz que
  recorre el eje de la propia banda en un camino cerrado, con la estela de la vara (`tau` 0,70 s) y envolvente
  que vale exactamente cero en los dos extremos del ciclo. Medido: el nudo está **un peldaño por encima del
  cuerpo**, viaja (442 celdas de recorrido, 61 posiciones) y el contraste de tono queda en **1,307 contra 1,303**
  de la vara (+0,2 %). Luminancia del cuadro 4,04–4,34 % y calma 0,0403–0,0457 en todo el ciclo.
- **Lo que sigue distinto, y por qué:** la **huella** de nuestra banda es 27,7 % del cuadro contra 14,8 % de la
  vara, y su **cuerpo** está en nivel 0,318 contra 0,223. La causa está medida y no es el dither: **nuestro cielo
  es 2,5× más oscuro que el de la vara** (1,72 % contra 4,28 % fuera de su banda), así que el campo de 4–6 %
  obliga a que el cuerpo sea el doble. Angostar la banda se probó y no entra: con cuerpo de la vara el campo cae
  a 2,62 %. **Decisión pendiente:** subir la luminancia del cielo, o aceptar el cuerpo actual.

**Umbrales rebasados (y por qué).** El chequeo de las tarjetas medía «alfombra» como cobertura bruta (3–25 % de
celdas con tinta) y eso confundía una **banda densa** con un campo parejo: estaba defendiendo la nube dispersa.
Ahora mide **estructura**: banda llena ≥ 0,90 · fuera limpio ≤ 0,10 · separación ≥ 3× · y un campo uniforme
falla con su nombre. La calma de la copia ya no se compara con un número inventado: se mide **la vara con el
mismo instrumento** (0,2483) y la nuestra queda por debajo, así que el bolsillo no se tocó.

Conclusión: el grano del dithering ya es el de v1; lo que falta es que la atmósfera sea una retícula llena y no
una nube dispersa. La pieza se valida entera cuando eso esté.

**Regla que sale de esto:** una etapa puede estar aprobada en su mecanismo y pendiente en su material. Se
registran por separado; aprobar una no aprueba la otra.


## Regla de reuso (2026-11-05, por intento fallido)

Cuatro iteraciones intentando **reconstruir** la atmósfera del modelo terminaron en un material que la dirección
rechazó de nuevo: «no se parece a las capas de la v1». La lección es de reuso, no de calibración:

**El material de la vara se importa, no se rehace.** `design-studies/v1/hero-field.mjs` ya produce el cielo, el
lavado y la emisión con dithering aprobados; los pasos deterministas para una escena nueva son
**sustituir la figura** (nodos y enlaces del sujeto nuevo) y **heredar todo lo demás** del material de la vara.
Reconstruir capas desde un modelo propio sólo tiene sentido para un look nuevo, no para reproducir el vigente.

## Medición de tiempo por unidad (2026-11-05)

La dirección registró la preocupación: varias iteraciones largas y el resultado no bueno. Cada unidad de este
proceso anota **cuánto duró** y en qué se gastó, para poder mejorar el procedimiento y no sólo el resultado.
La primera medición: la cadena de iteraciones de la atmósfera (grano → cobertura → contraste → evento →
huella) consumió cinco sesiones de worker completas; reusar el material habría sido una.


## Disposición del 2026-11-05: import del material de la vara (T14) — EJECUTADA

**Decisión:** la escena viva del catálogo **hornea cielo y lavado con el material de v1** (`material()`,
`emissionPlanes()`, LUT) sustituyendo **sólo la figura** (nodos y enlaces del catálogo). La dirección marcó
«no se parece a las capas de v1» cuatro veces: la receta propia queda para estudios que busquen un look nuevo.

**Verificación de la igualdad (medida en bake.mjs):** la hoja del cielo importada tiene **0 pasos distintos**
de la que v1 produce (132 768 celdas) y el lavado **0 canales distintos** (5 184 000 valores). El material
importado ES el material de la vara, byte a byte.

**Disposición del runner** (`check-cards-live.mjs`), ejecutada:
- **Re-anclados:** `a` (cobertura con el gobernante de la vara: región del tono de la emisión al FWHM, cobertura
  por la hoja del cielo → **0,910 dentro / 0,243 fuera**, idéntico a la vara), `a-retícula` (cielo celda 5 × 1,6,
  lavado 480×300 a celda 3), `j` (ventana común: la más densa del cielo, llevada al cuadro; tinta renderizada
  **×1,00** contra la vara), `l` (cuerpo 0,223 y nudo 0,587 leídos de la vara misma), `n/o/p` al material importado.
- **Jubilados con registro:** `h` (alfa discreto: el material de v1 usa fade continuo `a·a·(3−2a)`), `i`
  (máscaras del modelo), `m` (precio del cuerpo: 2,62 % si el cuerpo de la vara, medido con la receta propia),
  `q` (presupuesto de la huella: 3,67 % < 4 %). Sus mediciones quedan arriba y en §Estado de validación.

**Resultado:** 26/26 casos en verde. La comparación de la ventana compuesta da **×1,00** contra la vara.

**Palanca cerrada:** la paleta por constelación deja de teñir el fondo; los colores son los de la vara.

## Log

- **L1** (2026-11-05, verbatim): «vale esta gneila si esta bien osea veo que esta es como una primera parte del
  proceso , y para que tenga mas atmosfera con la nebulosa de v1 falta lo de esa vista isometrica sigamos tu
  recomendacion de seguir hasta que igualen a esa interaccion de v1 documentando las etapas del proceso para
  hacerlo reproducibnle»
