# Constelación volumétrica e interactiva

Primera pieza del rediseño. El hero dejó de ser un cuadro, pero al hacerlo a sangre **se aplanaron las capas**
que le daban volumen: la paleta de siete tonos, los halos, la viñeta y la jerarquía de estrellas quedaron
reemplazadas por un campo de ruido uniforme. Esta pieza devuelve el volumen y convierte los **nodos de la
constelación en la interacción**: al tocar un nodo la escena cambia y el conjunto se mueve con profundidad.

Se construye pieza por pieza: primero hero/constelación, después header, después footer, después las secciones
que defina el mapa de estructura. La copia del cuerpo queda **descartada y congelada**: no se extiende ni se
corrige en esta pieza.

## Specs

- **S1 · Volumen recuperado.** El hero vuelve a estar compuesto por capas, no por un campo plano: (a) la
  **paleta de siete tonos** de la escena, con al menos cuatro tonos distinguibles en el hero; (b) el **halo o
  lavado** del cielo; (c) la **viñeta**; (d) la **jerarquía de estrellas** con sus dos escalones de núcleo. El
  campo de ruido puede seguir existiendo, pero **no puede reemplazar** esas capas: es una capa más, la última.
- **S2 · Los nodos son la interacción.** Cada nodo de la constelación es un objetivo accionable. Al activarlo
  (click, tap o teclado) la escena **cambia de estado**: se reencuadra hacia ese nodo y su grupo de enlaces, con
  un desplazamiento de cámara (paneo y acercamiento), y la escena vuelve sola al estado inicial por tiempo o por
  una acción explícita. Nada de saltos: la transición es continua y se puede interrumpir.
- **S3 · Sensación volumétrica.** Las capas se mueven a **velocidades distintas** (paralaje): cielo lejano,
  medio y figura cercana no se desplazan igual. Es lo que produce profundidad sin WebGL.
- **S4 · Affordance real.** Un nodo se nota accionable antes de tocarlo: crece y se enciende al pasar el puntero,
  cambia el cursor, y es alcanzable por teclado con foco visible. Debe existir una forma accesible de anunciar
  qué hace (texto alternativo o control equivalente), sin lecturas instrumentales en pantalla.
- **S5 · Nada cuadrado.** La escena ocupa la ventana completa sin marco ni borde; las capas sangran por los cuatro
  lados y el recorte nunca muestra una caja.
- **S6 · Rendimiento y ciclo de vida.** Objetivo ≤ 16,67 ms por frame en escritorio y móvil; el campo se detiene
  fuera de pantalla, en `pagehide` y con `prefers-reduced-motion` (still de primera clase). Sin WebGL.
- **S7 · Lo que no se rompe.** Control de suelo con `aria-pressed`, firma última y mencionada una vez, póster sin
  JS con la constelación visible, y los módulos de escena **byte-idénticos** a sus pares de `lab/`.
- **S8 · Lo que no se toca.** La copia del cuerpo queda congelada: no se reescribe, no se corrige y no se amplía.
  El mapa de secciones y la copia nueva llegan en otra pieza, con su propia aprobación.

## Constraints

- Servidor: `python3 -m http.server 4403 --bind 0.0.0.0 --directory .` desde la raíz. LAN: `192.168.0.86:4403`.
- Playwright: `/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs`.
- No se toca `scripts/scene-src/engine.mjs` (estado cerrado tras WU108). No WebGL. Sin dependencias nuevas.
- Los primitivos de la escena ya existen: `baseTone`, `toneColor`, `vignette`, `forEachDynamicCell`, `NODES`,
  `LINKS`, `RINGS`, escalones de núcleo y la paleta. Se consumen; no se reimplementan.
- Evidencia en `dist-motion-verify/wu114-v1/` (ignorada por git). Sin commits.

## Tasks

| ID | Tarea | Specs |
|---|---|---|
| T1 | Devolver las capas: paleta, halo, viñeta, jerarquía de estrellas | S1 |
| T2 | Paralaje entre capas al mover la escena | S3 |
| T3 | Nodo accionable: reencuadre con transición continua e interrumpible | S2 |
| T4 | Affordance: hover, cursor, teclado, foco visible, anuncio accesible | S4 |
| T5 | Sangrado sin caja y verificación de que nada recorta en rectángulo | S5 |
| T6 | Medir coste por frame y ciclo de vida | S6 |
| T7 | Re-verificar invariantes; copia del cuerpo intacta | S7, S8 |

## Log

- **L1** (2026-10-28, verbatim): «a ver veo que ahora si esta en todo el hero pero se perdieron las capas que le
  daban volumen a la escena , la paleta y los diferentes tonos que le daban brillo , eso con respecto al hero con
  respecto a todo lo demas esta todo mal la verdad , creo que debemos de descartar todo ese texto todo lo que
  tengas con eso creo que tomaste muy literal lo que tenemos , la landing debe de mostrar un poco lo que queremos
  ser no lo que somos ahora que uan no terminamos cosas , mira primero quiero solucionar sobre las escenas del
  motor donde mostraremos cosas que usen el motor asi que vamos a construir piezas por piezas , el hero , el
  header el footer , vamos a definir que secciones habran etc para construir piezas con el motor para darle vida
  y tambien importante no hacer cuadrada la pagina esta muuy simple . mira me gusta mucho lo de la constelacion
  creoq ue podemos empezar ahi me gusta mucho y es mas podemos aprovechar los nodos par cambiar la escena al
  ahacer click que se sienta volumetrico inmersivo mover la scenea etc asi que vamos a construiior eso y en
  paralelo investigaras una buena estructura para landing descartando todo esto que sea un agente ciego para que
  no agarre cosas que no nos interesas ni sesgos de la info que tenemos ok»
- **Decisión:** la copia actual queda **descartada**. El encuadre «lo que tenemos y lo que nos falta» se abandona;
  la landing pasa a mostrar **lo que queremos ser**. No se reescribe copia hasta tener el mapa de secciones.
- **Decisión:** se construye por piezas, empezando por la constelación; el header y el footer vienen después, y
  las secciones cuando exista el mapa.
- **Primer intento falló** tras 84 llamadas (dos veces reiniciado el árbol). Lección: correr la unidad con
  verificación propia por paso y snapshot antes de relanzar.
- **Evidencia verificada por el orquestador (2026-10-29):**
  - **Capas de vuelta:** tonos distinguibles 4–8 por viewport y suelo (histograma medido), halo presente
    (quitar el lavado cambia 4,2–7,4 % de los píxeles), viñeta con centro 1,000 / borde lateral 0,928 /
    esquina 0,7726 (−7,2 % y −22,7 %).
  - **Paralaje real:** cielo 0,18 · lavado 0,52 · figura 1,00 (una translación de 100 px mueve 18/52/100 px).
  - **Nodos:** 35/35 accionables en 3 anchos y 2 suelos, por click, tap y teclado, con foco visible de 2,5 px;
    transición de 1200 ms interrumpible sin salto, vuelta automática a los 7000 ms, `Escape` explícito;
    `prefers-reduced-motion` usa corte, sin bucle.
  - **Póster:** de **1.029.893 bytes a 53.931** (−94,8 %), conservando los tres paneles y ocho tonos; sigue siendo
    el LCP en los seis casos (148–212 ms observados).
  - `check-rules` 8/8 · `check-engine-surface` 5/5 · escenas byte-idénticas a `lab/` · copia del cuerpo intacta
    (+0/−0 líneas fuera del hero). Contraste peor caso: 9,51 oscuro / 4,65 papel.
- **Abierto 1 · Cadencia en papel.** En 768 y 1440 el suelo papel no sostiene 60 fps: intervalo rAF medio
  **19,2 ms (33,3 p90)** y **36,2 ms (50,0 p90)** respectivamente. El coste por frame del callback es 0,16–0,20 ms,
  así que el problema no es el JS sino la composición/rastreo de una capa grande, y hay que separarlo del ruido del
  entorno headless. Objetivo S6 **no cumplido** en ese suelo.
- **Abierto 2 · El lavado en papel vuelve a leerse como mancha.** Restaurar el volumen trajo el halo, y en papel los
  bancos de lavado se ven otra vez como manchas pardas. Es la tensión de siempre: sin lavado el papel se aplana;
  con lavado se ensucia. Se resuelve con textura de grano y no con manchas opacas, o con un lavado que viva solo en
  las altas luces.
- **Pendiente de decisión del usuario:** ¿la copia actual se ve en el celular mientras construimos, o se retira ya
  y la página queda sólo con hero + marcadores de sección hasta tener el mapa?
