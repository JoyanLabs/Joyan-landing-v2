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

## Estado de cada etapa (2026-11-05)

| Etapa | Estado | Dónde |
|---|---|---|
| 0-2 | Funcionando | `cards/data.mjs`, `cards/field.mjs` |
| 3 · Isométrico | **Funcionando** (2026-11-05) | `cards/isometric.mjs`: pila de 8 planos, `(P+z)/P`, pose por plano, foco con la cámara de v1 |
| 4-5 | Funcionando | `cards/field.mjs`, `link-behaviours.mjs` |
| 6 | Funcionando | `cards/card.mjs` |
| 7 | Funcionando | `scripts/checks/check-cards.mjs` (57 casos: reproducibilidad **por estado**, enfocado ≠ reposo por hash y por píxel) |

## Log

- **L1** (2026-11-05, verbatim): «vale esta gneila si esta bien osea veo que esta es como una primera parte del
  proceso , y para que tenga mas atmosfera con la nebulosa de v1 falta lo de esa vista isometrica sigamos tu
  recomendacion de seguir hasta que igualen a esa interaccion de v1 documentando las etapas del proceso para
  hacerlo reproducibnle»
