# Constelaciones candidatas — para elegir a dónde viajar

Estudio de decisión, no de implementación. **No hay viaje acá**: no hay cámara, no hay foco, no hay
contenido de nodo. Sólo la pregunta de a qué constelación se viaja.

Página: `index.html` (servida desde la raíz del repo, puerto 4403).
Capturas: `captures/candidatas-1280.png` y `captures/candidatas-390.png`.

## Cómo está dibujado

Posiciones **J2000** reales, no una forma inventada. **Proyección gnomónica** (plano tangente),
centrada en el centroide de las estrellas de cada figura: es la única proyección en la que las
líneas rectas del cielo siguen siendo rectas en el dibujo. Orientación de carta celeste: **norte
arriba, este a la izquierda**. Un solo factor de escala para los dos ejes, así que la figura no se
deforma.

Los radios de cada estrella salen de su **magnitud aparente V**, normalizada dentro de la figura
(la más brillante se lleva el núcleo mayor). Las seis figuras están dibujadas a escala angular
distinta y cada cuadro lleva **barra de grados propia**: el tamaño relativo se compara mirando.

Lo que **no** se inventó: ninguna pluma, ningún arco de cola, ninguna séptima estrella. Donde la
figura habitual necesita un trazo que el cielo no tiene, está dicho en la tarjeta.

## Las seis, medidas

| Candidata | Nodos | Enlaces | Silueta reconocible | Extensión angular | Escala propuesta | Acento propio |
|---|---:|---:|---|---|---|---|
| **Sagitta** | 4 | 3 | **no** | 4,41° × 2,04° | 0,55× | ninguno |
| **Delphinus** | 5 | 5 | parcial | 3,27° × 4,83° | 0,50× | ninguno |
| **Crux** | 5 | 3 | **sí** | 4,16° × 5,99° | 0,60× | ámbar de señal |
| **Lyra** | 5 | 5 | **sí** | 4,45° × 6,12° | 0,75× | ninguno |
| **Corvus** | 6 | 6 | parcial | 5,95° × 8,57° | 0,90× | ámbar de señal (η) |
| **Cygnus** | 5 | 4 | parcial | 16,49° × 17,30° | 1,30× | ámbar de señal |

«Escala» se mide contra el bounding box de la figura actual del hero v1: **184 × 182** dentro de un
cuadro de 480 × 300 (38 % × 61 %).

«Silueta reconocible» es un juicio sobre el diagrama, no sobre el cielo:

- **Crux** — tres trazos; el cruce se reconoce y se redibuja de memoria.
- **Lyra** — el paralelogramo se lee, y Vega queda fuera de él como nodo principal.
- **Sagitta** — las cuatro estrellas caen casi en línea recta: se lee como guion, no como flecha.
  La punta y las plumas habría que dibujarlas, y eso ya no sería la constelación.
- **Delphinus** — el rombo se lee; el delfín necesita la cola, que cuelga 3,5° del rombo.
- **Corvus** — el cuadrilátero se lee; el cuervo no. η queda a 0,6° de δ y se lee como extremo
  engrosado.
- **Cygnus** — se lee como trazo y como cruz; como cisne no. Albireo cae 16,2° más abajo que Sadr.

## Recomendación (del agente, discutible)

El criterio no es cuál es más linda en el cielo, sino cuál sobrevive a los dos trabajos que la pieza
le va a pedir: **leerse como marca chica** y **sostener varios nodos con contenido**, incluida una
secuencia de parte 1 / parte 2.

1. **Lyra** — el paralelogramo se lee a cualquier tamaño y Vega queda fuera de él como nodo
   principal: la figura trae la jerarquía hecha, sin inventar un «centro» para la marca. Cinco nodos
   y cinco enlaces cierran un anillo, así que dos vecinos pueden ser parte 1 y parte 2 sin romper la
   figura. Vega es la quinta estrella más brillante del cielo. **Contra:** la diferencia de brillo
   (4,3 magnitudes) es tan grande que las otras cuatro casi desaparecen a tamaño de logo.
2. **Crux** — la silueta más reproducible de las seis; cinco estrellas, tres de primera magnitud y ninguna
   más débil que 3,6.
   **Contra:** tres enlaces son pocos para colgar cinco nodos de contenido, y la cruz es emblema de
   varias banderas (Australia, Nueva Zelanda, Brasil): no es territorio visual libre.
3. **Corvus** — seis nodos y seis enlaces, la mayor capacidad de las seis para una secuencia sin
   nodos de relleno; el cuadrilátero sostiene la lectura mientras el resto se explica. **Contra:**
   se lee como cometa o barrilete, no como cuervo.

**Descartadas, con razón:** Sagitta (era la propuesta de la dirección y es la que peor sobrevive al
diagrama: cuatro estrellas en un asta casi recta); Delphinus (la cola cuelga 3,5° y adelgaza la
lectura); Cygnus (16,5° × 17,3° no caben en un cuadro y el travesaño es asimétrico: la más imponente
en escena, la más difícil como identificador).

Nada de esto promete capacidades del producto ni declara que la constelación *significa* el
proyecto: la elección es visual y geométrica. El nombre interno del producto no se publica.

## Qué no se pudo verificar

- **El juego de enlaces de las cartas oficiales.** Los enlaces de estos diagramas salen de la
  geometría —la figura tal como se dibuja habitualmente— pero no se leyó la carta del IAU de cada
  constelación. Donde eso cambia la lectura está dicho en la tarjeta.
- **Sagitta: qué extremo es la punta.** Las cuatro estrellas caen casi en línea recta: los tres
  tramos del asta miden 2,85°, 1,81° y 0,58° (de punta a punta), y el diagrama dibuja el asta, sin
  decidir cuál extremo es la punta.
- **Crux: ε.** La quinta estrella se une a δ, la más próxima (1,83°). Las cartas la colocan dentro
  del cruce; acá no se inventa un segundo enlace para «cerrarlo».
- **Cygnus: la lista tenía ε dos veces.** «Gienah, δ, ε Cyg»: Gienah *es* ε Cyg (hoy Aljanah). Se
  agregó **β Albireo** (292,68° / +27,96°, IAU-CSN) para tener cinco estrellas distintas y cerrar el
  brazo sur. Este agregado es una decisión, no un dato pedido.
- **Lyra: ζ y δ dobles.** ζ es una pareja de 44″: se usa ζ¹ (18h44m46,4s). Lyra tiene δ¹ y δ²: se
  usa δ² (18h54m30,3s), la visible de 4,2.

Ninguna coordenada fue inventada: las 30 estrellas de las seis figuras están en la tabla de abajo
con su fuente.

Cada tarjeta lleva, además de la silueta, una línea **como marca**: qué gesto de la figura serviría
para identificar algo, sin prometer ninguna capacidad ni declarar que la constelación *significa* el
proyecto.

## Qué se ve en las capturas

- `captures/candidatas-1280.png` (1280 × 4557) — tres columnas. Fila 1: Sagitta, Delphinus, Crux.
  Fila 2: Lyra, Corvus, Cygnus. Debajo, la recomendación con los tres finalistas y las tres
  descartadas, la tabla de las seis y las fuentes. Las seis figuras tienen **el mismo peso visual**
  dentro de cuadros del mismo tamaño, y la barra de grados de cada una delata la diferencia real de
  escala: Sagitta se dibuja a 59,8 px/°, Cygnus a 9,1 px/°.
- `captures/candidatas-390.png` (390 × 8768) — una columna; el diagrama ocupa el ancho completo,
  las cinco filas de la ficha se leen como una lista y la tabla pierde la columna de extensión
  (ya dicha en cada tarjeta) para entrar en el ancho del teléfono.

Lo que dicen las dos capturas, mirándolas: **Crux y Lyra** son las dos que se leen de un golpe a
cualquier tamaño; **Corvus** se lee como cuadrilátero con dos apéndices, con ε pegada a α y η pegada
a δ; **Delphinus** muestra el rombo y una cola larga que se lleva la mirada; **Cygnus** llena el
cuadro y se lee como cruz; **Sagitta** se lee como un guion quebrado — que es exactamente el motivo
por el que la recomendación no la elige.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La página de decisión. |
| `candidatas.css` | Hoja propia; una sola tinta fría, hairlines, sin cajas. |
| `datos-constelaciones.mjs` | Las 30 estrellas con RA/Dec J2000, magnitud, fuente, enlaces por figura y el texto de cada tarjeta. |
| `construir-figuras.mjs` | Proyección gnomónica + polvo determinista → SVG. |
| `figuras.generated.mjs` | Generado; el HTML no calcula geometría. |
| `render.mjs` | Monta las tarjetas y la tabla desde los dos módulos de arriba. |
| `capturas.mjs` | Playwright sobre el 4403; guarda las dos capturas. |

Reproducir: `node construir-figuras.mjs` (regenera los SVG desde las coordenadas) y
`node capturas.mjs` (necesita el servidor de la raíz del repo en 4403).

## Coordenadas por figura

Todas J2000. Fuente `IAU-CSN`: IAU Catalog of Star Names (WGSN), 2022-04-04.
Fuente `Wikipedia`: artículo de la estrella, valores Gaia DR2/DR3 citados allí.

#### Sagitta — 4 nodos, 3 enlaces · gnomónica centrada en 296,7° / 18,39° · 4,41° × 2,04°

| estrella | RA (J2000) | Dec (J2000) | mag | fuente |
|---|---|---|---|---|
| α Sham | 19h40m05.8s | +18°00′50″ | 4,39 | IAU-CSN |
| β Sge | 19h41m02.9s | +17°28′34″ | 4,38 | Wikipedia (Gaia DR2/DR3) |
| γ Sge | 19h58m45.4s | +19°29′32″ | 3,47 | Wikipedia (Gaia DR2/DR3) |
| δ Sge | 19h47m23.3s | +18°32′04″ | 3,82 | Wikipedia (Gaia DR2/DR3) |

#### Delphinus — 5 nodos, 5 enlaces · gnomónica centrada en 310,02° / 14,61° · 3,27° × 4,83°

| estrella | RA (J2000) | Dec (J2000) | mag | fuente |
|---|---|---|---|---|
| α Sualocin | 20h39m38.3s | +15°54′43″ | 3,86 | IAU-CSN |
| β Rotanev | 20h37m32.9s | +14°35′42″ | 3,64 | IAU-CSN |
| γ Del | 20h46m39.5s | +16°07′27″ | 4,04 | Wikipedia (Gaia DR2/DR3) |
| δ Del | 20h43m27.5s | +15°04′28″ | 4,43 | Wikipedia (Gaia DR2/DR3) |
| ε Aldulfin | 20h33m12.8s | +11°18′12″ | 4,03 | IAU-CSN |

#### Crux — 5 nodos, 3 enlaces · gnomónica centrada en 187,11° / −59,84° · 4,16° × 5,99°

| estrella | RA (J2000) | Dec (J2000) | mag | fuente |
|---|---|---|---|---|
| α Acrux | 12h26m35.9s | −63°05′57″ | 1,33 | IAU-CSN |
| β Mimosa | 12h47m43.3s | −59°41′20″ | 1,25 | IAU-CSN |
| γ Gacrux | 12h31m10.0s | −57°06′48″ | 1,59 | IAU-CSN |
| δ Imai | 12h15m08.7s | −58°44′56″ | 2,75 | IAU-CSN |
| ε Ginan | 12h21m21.6s | −60°24′04″ | 3,59 | IAU-CSN |

#### Lyra — 5 nodos, 5 enlaces · gnomónica centrada en 282,31° / 35,88° · 4,45° × 6,12°

| estrella | RA (J2000) | Dec (J2000) | mag | fuente |
|---|---|---|---|---|
| α Vega | 18h36m56.3s | +38°47′01″ | 0,03 | IAU-CSN |
| β Sheliak | 18h50m04.8s | +33°21′46″ | 3,60 | IAU-CSN |
| γ Sulafat | 18h58m56.6s | +32°41′22″ | 3,25 | IAU-CSN |
| δ² Lyr | 18h54m30.3s | +36°53′55″ | 4,28 | Wikipedia (Gaia DR2/DR3) |
| ζ¹ Lyr | 18h44m46.4s | +37°36′18″ | 4,37 | Wikipedia (Gaia DR2/DR3) |

#### Corvus — 6 nodos, 6 enlaces · gnomónica centrada en 185,47° / −20,19° · 5,95° × 8,57°

| estrella | RA (J2000) | Dec (J2000) | mag | fuente |
|---|---|---|---|---|
| α Alchiba | 12h08m24.8s | −24°43′44″ | 4,02 | IAU-CSN |
| β Kraz | 12h34m23.2s | −23°23′48″ | 2,65 | IAU-CSN |
| γ Gienah | 12h15m48.4s | −17°32′31″ | 2,58 | IAU-CSN |
| δ Algorab | 12h29m51.9s | −16°30′56″ | 2,94 | IAU-CSN |
| ε Crv | 12h10m07.5s | −22°37′11″ | 3,02 | Wikipedia (Gaia DR2/DR3) |
| η Crv | 12h32m04.2s | −16°11′46″ | 4,31 | Wikipedia (Gaia DR2/DR3) |

#### Cygnus — 5 nodos, 4 enlaces · gnomónica centrada en 303,09° / 38,78° · 16,49° × 17,30°

| estrella | RA (J2000) | Dec (J2000) | mag | fuente |
|---|---|---|---|---|
| α Deneb | 20h41m25.9s | +45°16′49″ | 1,25 | IAU-CSN |
| β Albireo | 19h30m43.3s | +27°57′35″ | 3,37 | IAU-CSN |
| γ Sadr | 20h22m13.7s | +40°15′24″ | 2,23 | IAU-CSN |
| δ Fawaris | 19h44m58.5s | +45°07′51″ | 2,90 | IAU-CSN |
| ε Aljanah | 20h46m12.7s | +33°58′13″ | 2,48 | IAU-CSN |
