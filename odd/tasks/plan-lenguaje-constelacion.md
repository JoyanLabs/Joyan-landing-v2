# Plan — el lenguaje de la constelación

Cambio de plan aprobado (2026-10-29): en vez de cerrar la página, **afinamos el lenguaje** y después construimos
las piezas con él. El motor de constelación pasa a ser el vocabulario visual del sitio. El texto queda fuera de
alcance hasta nuevo aviso: **todo lo escrito hasta ahora se descarta**, incluidos los ejemplos de copia.

**Decisión de arquitectura (2026-10-29):** la página **no tiene secciones hacia abajo**. El hero es la página, y
se navega **interactuando con nodos en distintas capas de profundidad**, que revelan contenido. Esto reemplaza al
mapa de ocho secciones (`odd/tasks/mapa-de-secciones.md` queda como referencia de método, no como estructura
obligatoria): las secciones pasan a ser **planos del campo**, no bloques apilados.

Referencia del lenguaje: `docs/ESTETICA-CONSTELACION.md` (aprobada). Lo que no esté ahí, no es parte del lenguaje.

## Estado de hoy

| Pieza | Estado | Evidencia |
|---|---|---|
| Capas del hero (cielo, lavado, figura, viñeta, núcleos) | Hecho y aprobado | 4–8 tonos, halo 4,2–7,4 %, viñeta 1,000/0,928/0,773 |
| Paralaje | Hecho y aprobado | 0,18 / 0,52 / 1,00 |
| Nodos accionables (click, tap, teclado) | Hecho y aprobado | 35/35 en 3 anchos × 2 suelos, foco 2,5 px |
| Transición al enfocar + vuelta | Hecho y aprobado | 1200 ms interrumpible, vuelta 7000 ms, `Escape` |
| Difuminado de capas al enfocar | Primera versión, **a desarrollar** | Es lo que más gustó: hay que volverlo un sistema |
| Paleta oscura | Aprobada | base `#020405`, tinta `#B4CABE`, campo 4–6 % |
| Paleta clara / papel | **Rechazada, hay que replantearla** | Manchas pardas; se aplana sin lavado |
| Póster / LCP | Hecho | 53.931 bytes, LCP en 6/6 casos |
| Texto | **Descartado** | Se piensa después; no se escribe nada nuevo |
| Jueces sobre la pieza | **No corridos** | Se proponen abajo (bloque A1) |

## Fase A · Consolidar el lenguaje

- **A1 · Jueces.** Pasada ciega doble sobre la pieza actual, con el criterio de siempre: hallazgos con número.
  Debe cubrir: composición de capas, jerarquía tipográfica sobre el campo, affordance de los nodos, accesibilidad
  real (lector de pantalla, no sólo teclado), y si el gesto de difuminado comunica profundidad o sólo desenfoque.
- **A2 · Paleta clara.** Replantear desde cero, no retocar la actual. Condición de aceptación: que el suelo claro
  se reconozca como **decisión** y no como «modo claro»; el punto tiene que verse sobre papel sin lavado opaco.
  Opciones a comparar en el navegador, una al lado de la otra, antes de elegir.
- **A3 · Cadencia en papel.** Hoy no sostiene 60 fps en 768 y 1440 (rAF 19,2 / 36,2 ms con callback de 0,2 ms).
  Aislar si es composición del canvas o del entorno headless, y luego decidir la técnica.

## Fase B · Profundidad navegable (el corazón del trabajo)

- **B1 · Nodos en capas traseras.** La escena tiene más de un plano de nodos. Se puede avanzar hacia atrás: los
  nodos lejanos se acercan, los cercanos salen de foco. Es la idea que la dirección pidió construir, y con la
  decisión de arriba pasa a ser **la navegación de toda la página**.
- **B2 · Difuminado como sistema.** Convertir el desenfoque del click en **profundidad de campo**: un plano
  enfocado, los otros con desenfoque graduado por distancia. Movimiento de cámara y foco acoplados. **Hoy no
existe** (el juez A midió `skyFilter: none`); es P1.
- **B3 · Traza.** Recorrer un nodo es seguir una traza: qué actuó, desde qué capa, con qué autorización. Sin
  escribir copy: la estructura de los datos y el recorrido visual.
- **B4 · Vida.** Deriva ambiente continua, respiración del campo y eventos discretos (una señal que recorre un
  enlace). **Hoy la escena está inmóvil** (0 px cambiados en 3 s); es P1. Nada de aleatoriedad sin sentido: cada
  movimiento tiene que significar algo.

## Fase A2 · Paletas

Revisión pedida por la dirección: «revisar las paletas para ver si puedo aplicar alguna mejora». Objetivo doble:
(a) **afinar la oscura**, que está aprobada pero tiene tres capas por debajo del umbral de visibilidad;
(b) **replantear la clara**, hoy rechazada. Se comparan candidatas renderizadas en el navegador, una al lado de
la otra, con los mismos umbrales de `docs/ESTETICA-CONSTELACION.md`. Prohibido elegir por captura de una sola
opción: se elige comparando.

## Fase C · Piezas

- **C1 · Header** como pieza propia: no una barra, una capa del sistema.
- **C2 · Footer**: firma, contacto, suelo.
- **C3 · Secciones**: esperan el mapa aprobado (`odd/tasks/mapa-de-secciones.md`).

## Fase D · Texto

Descartado. Cuando se retome: mapa de secciones aprobado primero, después escritura. Prohibido reutilizar los
textos actuales.

## Fase E · Puerto a `src/`

Sigue en pie y sin empezar: WU104 (presupuesto), WU105 (contratos del sitio), WU106 (un solo dueño, póster LCP),
WU101 (60 fps sostenidos), WU107/109/102 (superficie, costura, reproducibilidad).

## Deudas registradas

- WU19 #7 «textura en zonas planas» (P3): documentada, tocarla es dither del motor y re-mide el pin.
- Lavado en papel: se resuelve dentro de A2, no por separado.
- Performance medida en Chromium headless: falta hardware físico (móvil real) antes de dar por buena la cadencia.
- La pieza actual no ha pasado jueces ni revisión de accesibilidad con lector de pantalla real.

## Cómo se avanza

Una pieza por vez, con verificación propia y capturas miradas antes de pasar a la siguiente. Un cambio que rompa
un umbral de `docs/ESTETICA-CONSTELACION.md` no entra, aunque se vea lindo.
