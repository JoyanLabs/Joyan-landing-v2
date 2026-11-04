# Hero inmersivo, papel visible y copia de landing

La maqueta `design-studies/v1/` hoy se lee como una lista de capacidades con etiquetas de estado («probado»,
«especificado», «piezas listas sin entrega», «sin MVP»): parece un producto sin terminar. Y el motor de puntos
vive dentro de un rectángulo chico en vez de ser la página. Esta feature corrige las tres cosas.

Rama `test/motion-graphics`. Sin commits (WU102). No se toca `src/`.

## Specs

### Hero

- **S1 · El campo es la página, no un cuadro.** El motor de puntos ocupa **toda la ventana** del hero, a sangre
  bajo el encabezado; el titular y la entrada se componen **encima**. Se elimina el marco con figura, el borde y
  el pie «El laboratorio»: no hay caja. El canvas cubre el viewport y respeta `dvh` en móvil.
- **S2 · Dirección de arte del campo (referencia medida).** El campo se lee como material impreso, no como
  textura uniforme: el tamaño del punto lo manda un campo de ruido lento, se **intensifica hacia los bordes** y
  el **centro queda calmado** para que el titular lea (*Halftone Field*, CrazyGL). Prohibido el degradado
  genérico radial y el «glow» de SaaS.
- **S3 · El titular manda.** El h1 sigue siendo el elemento más grande y legible del hero, con un velo medido
  detrás (peor caso ≥ 4,5:1 sobre cualquier celda). La composición es asimétrica: texto en un tercio, campo
  abierto en el resto; nunca centrado y simétrico.
- **S4 · Interacción, no adorno.** El puntero agita el campo (radio de influencia con caída suave); en táctil
  el toque hace lo mismo, sin scroll bloqueado. `prefers-reduced-motion` deja un **still** de primera clase, y
  el still tiene que ser bueno, no un frame cualquiera.
- **S5 · Entrada convincente.** Al cargar, el campo **se revela** (los puntos llegan, no aparecen): una sola
  animación de entrada, ≤ 1,2 s, sin bloquear el LCP del póster. Nada de preloader con contador.

### Papel

- **S6 · El papel tiene que notarse.** Referencias: *paper texture* (Gradiently) y *Light Mode Paper Technical*.
  Tres palancas, todas medibles: (a) **grano fino** de papel (fibra sutil, no manchas ni arrugas: las manchas
  leen como clip art); (b) **el campo de puntos se conserva** en papel — tinta más densa y punto más marcado,
  sin volver al lavado que ensuciaba; (c) **marco exterior más oscuro** encuadrando el interior claro, y filetes
  técnicos finos entre secciones. El papel tiene que ser reconocible como decisión, no como «modo claro».

### Copia

- **S7 · Dejar de vender lo que falta.** Fuera las etiquetas de estado por servicio («probado», «especificado»,
  «piezas listas, sin entrega», «sin MVP, no vendible hoy») y el encuadre «esto todavía no está». La página
  lidera con **el problema y el criterio**, no con el inventario. Cada sección responde qué cambia para el
  cliente, no qué nos falta. Se conservan, porque compran credibilidad y son verdad: la banda **«Cero
  certificaciones»** y el límite de L4 (**la evidencia es del cliente; todavía no hay producto**). Prohibido
  lo que el mazo ya prohíbe: certificaciones implícitas, «Magi en producción», autonomía sin aprobación,
  precios, normativa europea como propia, nombres de clientes.
- **S8 · Secciones con jerarquía de landing.** Cada bloque con un rol claro (problema → criterio → cómo se
  trabaja → qué queda registrado → escenarios → confianza declarada → contacto), títulos que dicen algo, y
  medidas de lectura de 60–70 caracteres. Sin listas de siglas sueltas.

### Invariantes

- **S9 · Nada de lo verificado se rompe.** Las ocho reglas de `dist-motion-verify/wu114-v1/check-rules.mjs`
  siguen en PASS (incluida la firma última y sin atribución, cero lecturas instrumentales, siglas glosadas,
  prohibiciones del mazo); contraste ≥ 4,5:1 en ambos suelos; cero errores de consola; `aria-pressed` del
  control de suelo intacto; geometría de la constelación idéntica entre suelos (35 centros, 52 enlaces).
- **S10 · Rendimiento.** Un solo canvas para el hero; sin WebGL (decisión cerrada: no se porta); el póster
  sigue siendo el LCP; el campo se detiene fuera de pantalla y en `pagehide`.

## Referencias (leídas, no inventadas)

- Halftone Field — CrazyGL: <https://crazygl.com/hero/halftone-field> (campo a sangre, ruido por celda,
  contraste hacia los bordes, centro calmo para el titular).
- Dot-matrix blob field hero — Design Lounge: <https://www.designlounge.live/p/hero-dot-matrix-field>
  (campo oscuro a sangre, el puntero lo agita).
- Dither light field hero — Design Lounge: <https://www.designlounge.live/p/hero-dither-light-field>
  (edición diurna, Bayer 8×8 sobre luz de ventana).
- Hero with dither background — Aceternity: <https://ui.aceternity.com/blocks/hero-sections/hero-section-with-dither-background>
- Trionn (Awwwards SOTD 7.42): <https://www.awwwards.com/sites/trionn-2> y arquitectura
  <https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/>
- Paper texture backgrounds — Gradiently: <https://gradiently.design/guide/paper-texture-background>
- Light Mode Paper Technical — Aura: <https://www.aura.build/skills/e4efe9fe-3656-4594-b0e2-842dec347d1b/light-mode-paper-technical>
- Editorial Luxe — Laarpi: <https://laarpi.com/styles/editorial-luxe>

## Constraints

- Servidor: `python3 -m http.server 4403 --bind 0.0.0.0 --directory .` desde la raíz del repo (la maqueta
  importa `scripts/scene-src/*`, sólo funciona desde ahí). URL de LAN para el celular: `192.168.0.86:4403`.
- Playwright: `/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs`.
- Evidencia en `dist-motion-verify/wu114-v1/` (ignorada por git).
- Sin dependencias nuevas, sin estilos inline, sin WebGL, sin ámbar para el CTA.
- No se toca `scripts/scene-src/engine.mjs` (estado cerrado tras WU108).

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | Hero a sangre: el campo ocupa el viewport, sin caja | S1, S3 |
| T2 | Dirección de arte del campo: ruido, bordes, centro calmo | S2 |
| T3 | Puntero y toque agitan el campo; still de reduced-motion | S4 |
| T4 | Revelado de entrada ≤ 1,2 s sin romper LCP | S5 |
| T5 | Papel: grano fino, campo de puntos conservado, marco más oscuro | S6 |
| T6 | Copia: problema y criterio, fuera etiquetas de estado | S7, S8 |
| T7 | Re-verificar las ocho reglas, contrastes y geometría | S9 |
| T8 | Medir el campo: frames fuera de pantalla, pagehide, coste por frame | S10 |

## Log

- **L1** (2026-10-28, verbatim): «vale mira quedo demasiado simple poco inmersivo parece muy generica las secciones
  y los textos no son para una landing correcta creoque porque pusiste la regal de solo hablar de lo que tenemos
  pero tenemos varias que recien estan cerrando y las mencionas como incompletas , debemos de cambiar eso
  definitivamente y tambien el tema de el motor el uso no quiero que se quede solo en una imagen puesta en un
  cuadrado tiene que ser mucho mas inmersivo el hero me decepciono , podrias investigar y revisar en internet
  referencias para heros , porfavor vuelve a levantar todo que apague la pc y con respecto a la vista de papel
  debemos de hacer que se note mas tambien investiga como y probemos e iteremos»
- **Decisión:** la honestidad del mazo se concentra en dos lugares (banda de cero certificaciones y el límite de
  L4). No se reparte como etiqueta de estado en cada servicio: eso es lo que hacía leer la página como inacabada.
- **Rondas 3 y 4 (verificadas por el orquestador):** campo con profundidad compuesta —calma 0,09–0,11 en la zona
  del titular, bolsillo alrededor de la figura (bolsillo/anillo 0,465), anillo denso que guía, costuras ≤ 0,0459,
  tres peldaños de punto (1,94 / 2,78 / 3,61 px), oscuro que emite (base `#020405`, tinta `#B4CABE`) y papel con
  grano y marco. Sin JS también pasa. Contraste conservador 6,03 oscuro / 4,58 papel; h1 6,99 en ambos.
- **Copia (T6):** diez secciones con jerarquía de landing y títulos que afirman; cero vocabulario de estado
  (grep = 0); conservadas la banda de cero certificaciones y el límite de L4; auditoría afirmación→A1-A20 en el
  reporte del worker. HTML neto **−49 líneas**.
- **Invariante restaurado:** los dos módulos de escena vuelven a ser **byte-idénticos** a sus pares de `lab/`
  (los exports del hero viven en `hero-field.mjs`). Verificado con `cmp` por el orquestador, no sólo por el checker.
- **Pendiente conocido:** el mazo exige permiso del cliente para publicar el caso L1 («0 minutos facturables»);
  esta feature conserva el dato y **no verificó ese permiso**. Es una decisión de publicación, no de diseño.
- **Ronda 1 (verificada):** hero a sangre, campo con ruido, contraste hacia bordes, puntero, revelado 1,06–1,09 s,
  papel con grano y marco oscuro. 8/8 reglas, motor 5/5. Capturas: escritorio convincente, **móvil roto** (banda
  vacía del ~55 % y h1 en el cuarto inferior).
- **Ronda 2 (verificada):** móvil sin banda vacía (2 px), h1 al 25–37,76 % de la ventana, intensidad en la zona
  de texto 0,1626 oscuro / 0,1338 papel, densidad de escritorio limitada a 0,56, pausa fuera del hero, y el
  invariante estudio↔laboratorio restaurado **byte a byte** moviendo los exports a `hero-field.mjs`.
- **Hallazgo de la ronda 2 (abierto, criterio de gusto):** al eliminar la banda vacía se perdió el gradiente con
  centro calmo: el campo quedó como retícula uniforme borde a borde. En oscuro lee como papel pintado de puntos
  antes que como emisión, y el titular convive con la misma densidad que el borde. Falta una dirección de campo
  que conserve profundidad (calmo detrás del texto, denso hacia la constelación) sin volver a dejar huecos.
