# La pieza completa — constelaciones como identificador de proyecto

Reemplaza el enfoque de la skill por una **pieza de referencia rica**: varias constelaciones en el mismo campo,
capas reales, enlaces vivos y cámara que viaja entre ellas. De esta pieza salen después las reglas y el workflow
reproducible, no al revés.

## Specs

- **S1.** «no me gusto nada el resultado de la skill quizas no debamos de hacer una skill si no trabajar en un
  worflow mejor desarrollado determinista en algunas partes o no se algo diferente»
- **S2.** «este motor nos puede servir para mas cosas tambien o bueno varias cosas no solo web»
- **S3.** «con respecto a el desenfoque todos me parecen muy similares quizas con algun ejemplo diferente»
- **S4.** «las lineas que unen las estrellas quizas podria no todo el tiempo estar solidas me refiero a que podemos
  jugar con eso tambien»
- **S5.** «sobre las capas de la escena a eso me referia que la skill por ejemplo no genero ninguna capa de nada
  solo algo plano»
- **S6.** «me interesa interactuar luego con todo este campo estelar osea otra constelacion podria estar mas alla y
  deberia el movimiento moverse hasta ahi»
- **S7.** «estas lineas arman la constelacion , luego otra constelacion en la lejania puede tambien tener su
  animacion y cuando accedaos a ella cambie a algo diferente o cuando interactuemos con las estrellas»
- **S8.** «quizas algunos nodos de estrellas tienen que ver porque cuando seleccione en 1 me hable de algo y en el
  de alado sea una segunda parte o algo diferente»
- **S9.** «una constelacion puede referenciar a un proyecto por ejemplo busca algunas constelaciones que tengan que
  ver con alguna Lanza porque tenemos un proyecto lanza relacionado a dispositivos de seguimiento lorawan y
  agentes de ia y alguna plataforma de visualizaciond e la data de esto entonces me imagino que la constelacion
  hace referencia al proyecto osea la escogemos y ese puede ser hasta como su pqeueño logo o identificador visual ,
  luego en la constelacion cada estrella cuando interactue con ella puedo ver algo sobre el proyecto»
- **S10.** «trabajar el eemplo completo mas completo para luego pensar en el worflow reproducioble o reglas»
- **S11.** «la escena con capas del unicornio donde estabas probando eso del difuinado ahi las escenas el fondo
  espacial como esas nebuloass eso le daba cuerpo y con la interaccion se sentia profundo aqui comoo dices ese
  capo es tplano y esta gfeo»
- **S12.** «el resultado de la escena de el unicorio de joyan es la que me gusto mas y esas cosas las quiero siento
  qeua qui retrocedimos»
- **S13.** «la constelacion del unicornio que creamos ese me gusto ver tambien como se hizo lo de los nodos y eso
  ese estilo bajo eso queria iterar»
- **S14.** «como recomiendes osea como lo que stabamos viendo y trabajando en design studies v1 creo que era el
  ejemplo no ? tambien levantalo para que te peuda validar que eso es a lo que me refiero»

## Requisito corregido: la vara es el híbrido de v1

La pieza nueva **retrocedió** respecto de dos referencias ya aprobadas. La vara no son umbrales sueltos, es la
receta concreta del hero v1 (y del estudio del unicornio):

| Qué | Referencia | Números |
|---|---|---|
| Sujeto con **masa** | unicornio: silueta de un tercio del cuadro; v1: nebulosa + núcleos grandes | — |
| Campo **escaso y con estructura** | overlay de estrellas del unicornio | densidad **0,045**, `keep 0,7` |
| **Bolsillo tranquilo** alrededor de la figura | v1 | ≤ **0,70** frente al anillo |
| **Anillo denso** que devuelve la mirada | v1 | ≥ **1,5** frente a la calma |
| **Denso / calma** | v1 | ≥ **1,8** |
| Salto de densidad entre bandas | v1 | ≤ **0,06** |
| Intensidad en la zona calma | v1 | **0,040 – 0,047** |
| Viñeta | v1 | **1,000 / 0,928 / 0,773** |

**Decisión (L4):** se construye el **híbrido** —cuerpo atmosférico con masa + figura de estrellas y enlaces por
encima—, que es la receta que v1 ya aplica. Genghe no necesita otra idea: necesita recuperar la composición.
Comparación de las tres piezas: `design-studies/COMPARAR.html`.

## Decisión de método

La conclusión de I-16 es que un procedimiento **convierte gusto en umbrales**, y un umbral produce mínimos: las
escenas salieron correctas y vacías. Por eso: **primero la pieza, después las reglas**. La skill
`joyan-escenas` queda congelada; no se borra hasta que exista el reemplazo.

## Investigación: constelaciones de la lanza

| Candidata | Qué es | Por qué sirve | Fuente |
|---|---|---|---|
| **Genghe** (梗河, «Celestial Lance») | Asterismo chino en Boötes, **3 estrellas** casi en línea recta, al norte de Arturo. Regía «la ventaja militar del emperador» | Es literalmente *la lanza*. Tres estrellas casi alineadas: se lee como una lanza mínima y funciona como marca | All Skies Encyclopaedia, *Genghe* |
| **Al-Rumḥ** (الرُّمْح, «la lanza») | Asterismo árabe también en Boötes; nombre IAU adoptado en 2026 para 34 Boötis | Comparte cielo y sentido con Genghe; refuerza la lectura | All Skies Encyclopaedia, *Alrumh* |
| **Honores Friderici** | Constelación **obsoleta** con forma de espada (Bode, 1787) | Precedente de arma como figura celeste; hoy no existe | Ridpath, *Obsolete Constellations* |
| **Sagitta** | La Flecha (no lanza), 4 estrellas, pequeña y tenue | Alternativa si se prefiere «proyectil» a «lanza» | Wikipedia / Chandra |

**Recomendación:** **Genghe** como identificador visual (tres estrellas, línea casi recta, «lanza celeste»), con
**Al-Rumḥ** como eco en el mismo cielo. Nota de precisión: son **asterismos y nombres estelares**, no
constelaciones IAU; el documento lo dice así y no lo disfraza.

## Arquitectura propuesta

**El motor no sabe nada de web.** Una constelación es **dato**; el renderer es una salida.

```js
constellation = {
  id: 'genghe', name: 'Genghe', meaning: 'Celestial Lance',
  provenance: { culture: 'chino', source: 'All Skies Encyclopaedia', official: false },
  project: { id: 'lanza', label: 'Lanza' },     // el proyecto que identifica
  cycle: { fps: 30, frames: 360 },
  palette: { ground: 0, stops: ['#020405', /* … */] },
  nodes: [{ id, x, y, plane, magnitude, content: { title, line, partOf } }],
  links: [{ from, to, behaviour, phase }],
  camera: { home, focus: { [nodeId]: { x, y, scale } }, travel: { [nodeId]: 'constelacion-destino' } },
}
```

**Capas (el stack no es opcional):** cielo de puntos · lavado · figura en **3 planos** · viñeta · núcleos.
Una escena sin las cinco no es una escena: es un campo. Esto es lo que la skill no pedía y por eso salió plano.

**Conductas de enlace** (las cuatro, elegidas por el usuario):

| Conducta | Comportamiento |
|---|---|
| `breathe` | El trazo se enciende y se apaga por tramos, 2π-periódico con fase por enlace |
| `trace` | La línea se dibuja de origen a destino cuando algo la recorre (progreso 0→1) |
| `depth` | Opacidad y grosor por plano: los lejanos apenas se leen, sin animación |
| `focus` | Sólo el grupo del nodo activo queda sólido; el resto se desvanece |

**Viaje:** las constelaciones viven en el **mismo campo**, en coordenadas lejanas. La cámara viaja; no hay
página nueva ni corte. Al llegar, cambia el clima (acento y densidad) y la constelación destino tiene **su
propia animación**.

**Nodos con secuencia:** `content.partOf` permite que dos nodos vecinos sean «parte 1» y «parte 2» del mismo
relato sin inventar una estructura nueva.

**Salidas (S2):** el mismo `renderFrame` produce canvas (web), PNG de alta y —más adelante— video horneado.
Se separa `engine` (biblioteca) de `page` (consumidor).

## Restricciones y riesgos

- **Marca.** `docs/DESIGN.md` dice que el primer producto vertical **no se publica con su nombre hasta que
  branding lo apruebe**. La constelación puede ser el identificador visual, pero el nombre «Lanza» queda como
  **identificador interno** hasta esa aprobación. La pieza no publica el nombre.
- **Copy.** El texto se había descartado el 10-29. S8 lo reintroduce: los nodos muestran algo. Hasta que exista
  copy aprobado, el contenido es **provisional y marcado como tal**; no se inventan capacidades del producto.
- **El motor no se toca sin re-medir.** `renderFrame` es primitiva de suelo oscuro (WU108).
- **Provenance visible.** Si la constelación identifica un proyecto, su origen cultural se declara; no se
  presenta como constelación oficial.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|---|---|---|---|---|
| T1 | Modelo de datos de constelación + Genghe y Al-Rumḥ como datos, con procedencia | S7, S9 | worker | feat(engine) |
| T2 | Stack de cinco capas obligatorio y validado (una escena sin capas falla) | S5 | worker | feat(engine) |
| T3 | Las cuatro conductas de enlace, con envolventes 2π-periódicas | S4, S7 | worker | feat(engine) |
| T4 | Segunda constelación en la lejanía + viaje de cámara sin corte | S6, S7 | worker | feat(engine) |
| T5 | Nodos con contenido y secuencia (parte 1 / parte 2) | S8 | worker | feat(engine) |
| T6 | Salida PNG de alta desde el mismo motor | S2 | worker | feat(engine) |
| T7 | Página de la pieza: montaje y capturas de revisión | S1, S10 | inline | — |
| T8 | Rehacer la base con la receta híbrida de v1: masa, campo escaso, bolsillo y anillo | S11-S14 | worker | feat(engine) |
| T9 | Validar la composición: una constelación con campo uniforme **falla** el chequeo | S11 | worker | feat(engine) |

## Evidencia

(por completar)

## Log

- **L1** (2026-11-05, verbatim): «vale mira , no me gusto nada el resultado de la skill quizas no debamos de hacer
  una skill si no trabajar en un worflow mejor desarrollado determinista en algunas partes o no se algo diferente
  ya que bueno este repo es de la pagina pero este motor nos puede servir para mas cosas tambien o bueno varias
  cosas no solo web , pero bueno la skill el resultado no me gusto nada y con respecto a el desenfoque todos me
  parecen muy similares quizas con algun ejemplo diferente y otra cosa las lineas que unen las estrellas quizas
  podria no todo el tiempo estar solidas me refiero a que podemos jugar con eso tambien y otra cosa sobre las capas
  de la escena a eso me referia que la skill por ejemplo no genero ninguna capa de nada solo algo plano , y otra
  cosa me interesa interactuar luego con todo este campo estelar osea otra constelacion podria estar mas alla y
  deberia el movimiento moverse hasta ahi y cosas asi quizas debamos de trabajar el eemplo completo mas completo
  para luego pensar en el worflow reproducioble o reglas»
- **L2** (2026-11-05, verbatim): «si me gusta todo lo quer recomendaste yodo esta bien y tambien mencionar que
  estas lineas arman la constelacion , luego otra constelacion en la lejania puede tambien tener su animacion y
  cuando accedaos a ella cambie a algo diferente o cuando interactuemos con las estrellas tambien o quizas algunos
  nodos de estrellas tienen que ver porque cuando seleccione en 1 me hable de algo y en el de alado sea una segunda
  parte o algo diferente , osea me imagino por ejemplo una constelacion puede referenciar a un proyecto por ejemplo
  busca algunas constelaciones que tengan que ver con alguna Lanza porque tenemos un proyecto lanza relacionado a
  dispositivos de seguimiento lorawan y agentes de ia y alguna plataforma de visualizaciond e la data de esto
  entonces me imagino que la constelacion hace referencia al proyecto osea la escogemos y ese puede ser hasta como
  su pqeueño logo o identificador visual , luego en la constelacion cada estrella cuando interactue con ella puedo
  ver algo sobre el proyecto etc entonce asi cosas asi ytodas tus recomendaciones e investiga mas como podemos
  hacer algo asi»
- **L3** (2026-11-05, verbatim): «vale y mira otra cosa importante que estaba bien en la escena con capas del
  unicornio donde estabas probando eso del difuinado ahi las escenas el fondo espacial como esas nebuloass eso le
  daba cuerpo y con la interaccion se sentia profundo aqui comoo dices ese capo es tplano y esta gfeo , asi que
  debemos de volver a iterara porque el resultado de la escena de el unicorio de joyan es la que me gusto mas y
  esas cosas las quiero siento qeua qui retrocedimos , no es la interaccion que esperaba revisa porfavor la otra
  escena con las capas , ese es el estilo que deseo revislao bien, la constelacion del unicornio que creamos ese me
  gusto ver tambien como se hizo lo de los nodos y eso ese estilo bajo eso queria iterar , y lo de este ejemplo de
  Genghe mm si esta bien hacerlo mejor priomero confirma e si sabes de que es lo que me gusto y si tienes listo
  eso»
- **L4** (2026-11-05, verbatim): «como recomiendes osea como lo que stabamos viendo y trabajando en design studies
  v1 creo que era el ejemplo no ? tambien levantalo para que te peuda validar que eso es a lo que me refiero porfa»
  → se adopta el **híbrido** y se levanta `design-studies/COMPARAR.html` con las tres piezas.

## Lo que ya NO es válido

- **La skill no es el producto.** Queda congelada: produce mínimos, no ambición (conclusión de I-16).
- **Un campo de puntos parejo no es una escena.** Si falta masa, bolsillo o viñeta con presencia, no se entrega
  aunque cumpla la banda de luminancia media. Ese fue exactamente el error de la primera entrega de Genghe.
