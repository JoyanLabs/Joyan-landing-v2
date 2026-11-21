**Palanca cerrada:** la paleta por constelación deja de teñir el fondo; los colores son los de la vara.

### Paso 1 ejecutado: variantes de espacio (2026-11-05)

La plantilla ahora tiene **espacios**: registro `espacios.mjs` con ventana (dónde mira la hoja sobremuestreada
del material importado) y clima (tinte del ground al 14 %) para Ori, Lyr, Cru, Sge, Cyg y Sco. La receta del
material no se toca — la variante es de encuadre y clima, no de receta. Medido: seis bandas en posiciones
distintas (pareja más cercana a 112 px), siete hashes de cielo distintos para la misma figura, campo
4,52–4,66 % (dentro de 4–6 %), climas con Δ 0,67–1,30 % (un clima fuerte de prueba da 9,31 % y el caso lo
detecta). Reproducibilidad por espacio en dos procesos; el espacio por defecto reproduce la escena anterior
byte a byte. El runner `check-cards-live` se re-ancló a hornear con el espacio real de la constelación
(26/26). Las 88 capturas viejas se regeneraron.

**Nota de dirección pendiente:** el clima es muy discreto a simple vista (Δ 0,67–1,30 %). La palanca es
`CLIMA_MEZCLA` en `bake.mjs` (0,14 → ~0,22); decisión de la dirección, no se movió sin autorización.


## Validación de la dirección (2026-11-05) y el camino que queda

**Aprobado:** «la escena viva es correcta». El material importado de v1 + la figura del catálogo + la
interacción es **la escena a reproducir**. La página de VALIDAR quedó obsoleta para este fin: comparaba
materiales cuando ya no hay dos materiales.

**El flujo a reproducir** no es «copiar v1»: es esta escena como **plantilla con variantes**, de modo que cada
constelación viva en un espacio propio:

| Dimensión | Qué varía | Ejemplo |
|---|---|---|
| Figura | nodos y enlaces del sujeto (constelación o imagen→grafo) | Ori ≠ Crux ≠ Arequipa |
| Fondo | atmósfera distinta por espacio, siempre con dithering | banda direccional / nube / vacío con polvo |
| Efectos y capas | qué capas hay, qué se mueve, qué se desenfoca | eventos, estela, profundidad por plano |
| Clima | acento cromático propio del espacio, nunca estado de UI | el eco de Al-Rumḥ |

**Estado del blur:** el desenfoque por planos al enfocar es de la pieza aprobada y todavía **no está montado
en esta escena** (el tratamiento por plano existe; falta integrarlo con el foco del catálogo). Es la próxima
pieza de la plantilla.

**Salidas:** el mismo flujo produce **escenas vivas y assets** (PNG en alta, póster del mismo campo), con el
mismo proceso determinista.

**Camino recomendado (orden):**
1. **Variante de fondo** por espacio (la atmósfera importada acepta parámetros: dónde está la banda, su dirección y su densidad — sin reescribir su receta).
2. **Blur por planos al enfocar**, integrado con la cámara (el que aprobó la dirección en v1).
3. **Salida asset**: el mismo campo a PNG de alta.
4. **Variante por constelación**: las 88, cada una con su espacio.

## Log

- **L1** (2026-11-05, verbatim): «vale esta gneila si esta bien osea veo que esta es como una primera parte del
  proceso , y para que tenga mas atmosfera con la nebulosa de v1 falta lo de esa vista isometrica sigamos tu
  recomendacion de seguir hasta que igualen a esa interaccion de v1 documentando las etapas del proceso para
  hacerlo reproducibnle»
