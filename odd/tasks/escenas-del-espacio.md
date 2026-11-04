# Escenas del espacio — propuesta para revisar

Antes de implementar: cómo se organiza el mundo, cuántas escenas hay, qué capas puede tener cada una, cómo se
viaja entre ellas y en qué orden se construyen. Nada de esto está implementado todavía.

## Principio: es un lugar, no una página

Lo que hacen bien las referencias no es «varias secciones lindas», es **una sola cámara en un espacio continuo**:
sin cortes, sin carga de nivel, sin cambio de página. *Universe Atlas* recorre 43 órdenes de magnitud «en la misma
escena, sin cortes»; *Cosmos* dice «no hay selector de nivel, todo es la misma escena a distinto zoom». *Portal-Verse*
es la versión mínima: se toca un portal y la cámara entra a otro sistema, sin scroll.

Traducido a Joyan: **las escenas son regiones del mismo campo**, no páginas. Se viaja moviendo la cámara.

## Gramática de capas (fija)

Toda escena se compone con el mismo vocabulario ya aprobado, y lo que cambia es su *carácter*, no su orden:

| # | Capa | Qué puede variar por escena |
|---|---|---|
| 1 | Cielo de puntos | densidad, paso de punto, tono |
| 2 | Lavado | dirección (aclara u oscurece), velocidad de deriva |
| 3 | Figura en **hasta 3 planos** | topología de nodos, cantidad por plano |
| 4 | Viñeta | intensidad (7 % lateral / 23 % esquina es el actual) |
| 5 | Núcleos | jerarquía de dos escalones, tamaño |

Más **un acento cromático por escena**, que vive sólo en los núcleos de esa escena y nunca en estados de UI.

Cada escena se declara en un manifiesto chico (capas, tono, topología, comportamiento ambiente). Eso es lo que
después permite reutilizar la pieza en otro lado sin reescribirla.

## Inventario propuesto: 5 escenas + 1 capa de navegación

| # | Escena | Qué dice | Topología de nodos | Tono | Qué la distingue |
|---|---|---|---|---|---|
| **S0** | **Nebulosa** (hero) | La caja negra: el espacio donde se trabaja | 35 nodos en 3 planos (actual) | frío petróleo→celadón | La aprobada. Punto de entrada. |
| **S1** | **Arequipa** | El origen: de dónde somos | Contorno de la ciudad en **60–90 nodos**, tamaño del punto por altura | **cálido mineral** | Silueta reconocible; los volcanes como núcleos mayores |
| **S2** | **Estratosfera** | La operación: capas que se atraviesan | Nodos en **estratos horizontales** | frío denso | Campo horizontal, sin figura vertical; se desciende por capas |
| **S3** | **La traza** | El registro: qué autorizó qué | **Cadena**: un camino que se enciende nodo a nodo | un solo acento encendido sobre campo apagado | Una sola ruta iluminada; el resto del campo, en sombra |
| **S4** | **Confín** (footer) | El borde: mirar desde afuera | Pocos nodos, casi estáticos | frío, muy bajo | Deriva lenta; sin interacción salvo el contacto |

La **capa de navegación** no es una escena: es el estado de «zoom out» donde las cinco aparecen como puntos y se
elige a dónde viajar.

## La escena Arequipa (la idea que más me gusta)

Está bien fundada: *Cities as Stars* hace exactamente esto —aplica la estética de mapas estelares a la geografía de
una ciudad— y *TopoLines* convierte la **altura del terreno** en el tamaño de cada punto.

Propuesta concreta:
- Se toma la silueta real de Arequipa (distrito o ciudad, a definir) desde un GeoJSON/OSM, se simplifica a
  **60–90 puntos** y se convierte en la figura de la escena.
- **El tamaño de cada nodo es la altura del terreno**: los tres volcanes (Misti, Chachani, Pichu Pichu) quedan como
  los núcleos más grandes y brillantes, y la ciudad se lee como un campo de puntos con relieve.
- Los enlaces entre nodos siguen las vías principales, no un grafo arbitrario.
- Al tocar un nodo se acerca a un distrito, y desde ahí se puede **subir a la estratosfera** (S2) — que es el salto
  a otro tipo de vista que pediste, no otro espacio sino otra escala.
- Acento cálido sólo acá: es el origen, es la única escena que se permite temperatura.

## Cómo se viaja (3 opciones)

| | Modelo | Cómo se siente | Riesgo |
|---|---|---|---|
| **A** | Viaje por nodo: cada escena tiene un nodo «portal» que lleva a la siguiente | Inmersivo puro, cero UI | Te perdés: no sabés dónde estás ni cuánto falta |
| **B** | Mapa: zoom-out a vista de galaxia, cada escena es un punto | Orientación total | Rompe la inmersión si es una pantalla aparte |
| **C** | **Ambos** (recomendado): portal en cada escena + acceso discreto al mapa | Inmersivo y orientado | Un poco más de trabajo |

La transición en cualquiera de los tres casos es **la misma**: zoom-out → desplazamiento → zoom-in, entre 1,2 y
1,8 s, con el lavado como velo para no ver nunca un frame vacío. Sin corte.

## El acento cálido (lo que pediste sobre «otro tono»)

La paleta aprobada es fría de punta a punta. Sumar calor es lo que puede darle el «mejor aspecto», pero el ámbar de
marca está reservado a gates y estados vivos, así que no puede ser ése. Tres candidatos para el acento de S1:

| | Acento | Hex | Qué transmite |
|---|---|---|---|
| **T1** | Terracota mineral | `#B4643C` | Volcánico, propio de Arequipa; contrasta con el celadón sin competir con el ámbar |
| **T2** | Ocre andino | `#A98A50` | Cálido y seco; **riesgo**: se acerca demasiado al ámbar de marca |
| **T3** | Cobre apagado | `#8E5A44` | Más sobrio; se integra al negro sin gritar |

Recomiendo **T1**, con T3 como variante sobria. T2 lo descartaría por cercanía al ámbar.

## Capas nuevas que hay que investigar antes de construir

1. **Arequipa desde datos reales**: conseguir el GeoJSON del contorno y un modelo de alturas (SRTM) y reducirlo a
   puntos. Es un trabajo de datos, no de diseño, y hay que verlo antes de prometer la silueta.
2. **Estratos**: definir qué es un «estrato» acá (¿bandas de densidad? ¿capas de nodos apiladas en Y?).
3. **La traza**: definir el recorrido de una cadena de autorización en nodos: cuántos pasos, qué se enciende, qué
   se apaga.
4. **La transición entre escenas**: hoy la cámara hace 1,28× en 1200 ms. Viajar entre escenas necesita otro
   rango y otro tiempo.

## Orden de trabajo propuesto

| Paso | Qué | Por qué en ese orden |
|---|---|---|
| **F1** | Cerrar el hero: borrar el estado viejo (h1 placeholder + párrafo con la copia descartada) y dejar el hero coherente | Hoy la página dice dos cosas distintas; no se puede construir encima |
| **F2** | Aprobar este documento (escenas, acento, modelo de viaje) | Todo lo demás depende de esto |
| **F3** | Investigación de datos de Arequipa (contorno + alturas → puntos) | Es el riesgo real de S1; si no sale, cambia la escena |
| **F4** | Implementar **S1 Arequipa** + transición desde S0 | Prueba el sistema de escenas con la idea más propia |
| **F5** | Implementar **S4 Confín** (footer) | Segunda escena: confirma que la gramática se repite |
| **F6** | S2 y S3 | Recién cuando la gramática está probada dos veces |
| **F7** | Mapa de navegación (si elegimos C) | Al final: es orientación, no contenido |

## Decisiones que necesito de vos

1. **¿Las cinco escenas son estas cinco?** ¿Sobra alguna o falta la que tenés en la cabeza?
2. **Arequipa**: ¿el contorno del **distrito**, de la **ciudad entera**, o la **cuenca con los tres volcanes**?
   Y ¿usamos un mapa real o una interpretación libre? (El mapa real da reconocimiento; la interpretación libre, más
   control.)
3. **Acento**: ¿T1 terracota, T3 cobre, o preferís ver los tres renderizados antes de elegir?
4. **Viaje**: ¿A (sólo portales), B (mapa) o C (ambos)?
