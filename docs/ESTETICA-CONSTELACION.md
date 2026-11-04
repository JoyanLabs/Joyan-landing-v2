# Estética de la constelación

**Estado: aprobada por la dirección (2026-10-29).** «Definitivamente esta es la estética que me gusta… podemos
mejorar e iterar pero esto es exactamente lo que me gusta.» Este documento existe para que la pasada siguiente
**no la aplane**: fija las capas, la composición, el movimiento y los umbrales medidos. Lo que no está acá no es
parte del lenguaje todavía.

## Qué es

Una escena de puntos a sangre completa, leída como **materia impresa con profundidad**: capas apiladas que se
mueven a velocidades distintas, un campo de puntos que es material y no textura, y una figura —constelación de
nodos y enlaces— que es a la vez la imagen y el control. El negro no es fondo: es la caja negra.

## Las capas, en orden (no se reordena)

| # | Capa | Rol | Movimiento |
|---|---|---|---|
| 1 | Cielo de puntos | Material de fondo; densidad y tamaño de punto por campo de ruido | Paralaje **0,18** |
| 2 | Lavado / halo | Da atmósfera y profundidad; nunca un degradado radial genérico | Paralaje **0,52** |
| 3 | Figura: enlaces + nodos | Es la imagen y el control | Paralaje **1,00** |
| 4 | Viñeta | Cierra los bordes, devuelve la mirada al centro | fija |
| 5 | Núcleos de estrella | Dos escalones de núcleo, siempre encima de todo | fija |

**Regla dura:** el campo de ruido puede ser una capa *más*, debajo. Nunca el sustituto de estas. Cuando se
reemplazaron las capas por un campo uniforme, la escena se aplanó y hubo que reconstruirla.

## Paleta oscura (aprobada)

- Base `#020405` · luminancia relativa 0,0011.
- Tinta del campo `#B4CABE` · luminancia 0,5566.
- Luminancia media del campo en el hero: **4–6 %** — el campo promedia oscuro; el brillo se concentra en puntos
  de tamaño variable, no en un velo teal.
- Paleta de escena: **siete tonos**. En el hero deben verse **4–8 tonos distinguibles** según viewport.
- Viñeta: centro **1,000** · borde lateral **0,928** · esquina **0,773**.

## Paleta clara: **sin resolver**

La dirección no está conforme: «la clara o de papel no me está gustando, quizás debamos plantear mejor la paleta
clara para que se note bien». Está **abierta** y no se considera parte del lenguaje aprobado. Ver el plan.

## Composición: los umbrales que hacen que se lea

Medidos sobre el compuesto, descontando el grano, con el protocolo reproducible de abajo. Los umbrales de
relaciones se conservan: **no se altera la pieza aprobada para forzar su cumplimiento**. La calibración actual
revela discrepancias entre esas metas y la pieza; no se certifican como capacidades existentes.

| Regla | Umbral |
|---|---|
| Intensidad media en la zona del titular (calma), oscuro | **0,040 – 0,047** (recalibrado; ver evidencia) |
| Denso / calma | **≥ 1,8** |
| Bolsillo alrededor de la figura / anillo que la rodea | **≤ 0,70** (la figura se lee limpia) |
| Anillo denso / calma | **≥ 1,5** (la mirada va a la figura) |
| Salto de densidad entre bandas de 8 px | **≤ 0,06** (sin costuras rectangulares) |
| Banda vacía | **< 15 %** de la ventana |
| Peldaños de punto distintos | **≥ 3** (el ruido cambia el tamaño, no sólo la opacidad) |
| Contraste del titular, peor celda | **≥ 4,5:1** |

Nada cuadrado: sin marco, sin borde, sin caja visible; las capas sangran por los cuatro lados.

## Movimiento y vida

- **Entrada:** sin animación (**0 ms**). Se elimina la promesa de ≈1,06 s; no se desvanece ni retrasa el póster.
  Decode → 250 ms → compuesto terminado sigue siendo la entrega inicial; ese tiempo de preparación **no** es
  duración de entrada. El póster no cambia y se verifica como LCP en los seis casos.
- **Idle:** los planos dinámicos de la emisión se evalúan a **12 Hz**, en un worker de módulo con Canvas 2D
  (`OffscreenCanvas`, sin WebGL). Se conserva el cielo estático; respiración de halos, parpadeo y luz errante
  proceden de `forEachDynamicCell(t)`, no de ruido nuevo ni de desplazar la composición. La LUT sólo cachea las
  decisiones de color/dither del motor (2048 niveles de tono × 16 fases Bayer); nunca congela el tiempo.
- **Traza discreta:** una señal recorre el enlace existente **48** (índice desde cero), de nodo 17 a nodo 0.
  Ciclo **12.000 ms**; espera 3000 ms, viaje **2400 ms**, resto en reposo. Intensidad `sin(πq)²` durante el viaje:
  aparece en origen, sigue el enlace, desaparece en destino. La misma cámara mueve el enlace y la señal.
- **Transición al enfocar:** **1200 ms**, zoom **1,28×**, curva `p³(10−15p+6p²)`, reversible e interrumpible.
- **Profundidad de campo:** cielo **0 → 6 px**, lavado **0 → 2,5 px**, figura/núcleos **0 px**.
  Dos extremos por plano horneados en Canvas 2D, no filtros CSS vivos (`filter: none`). Cielo por reconstrucción;
  lavado vivo a 12 Hz, con difuminado recurrente en worker. Se difumina **antes** de reducir las copias a la mitad.
  Sólo se recorta overscan (cielo 160 → 112 %) y transparencia (lavado: rectángulo de emisión + 8 px por lado).
  WAAPI: 61 claves de la curva de cámara, 1200 ms, opacidad actual al interrumpir. Cielo nítido 1 y copia 0 → 1;
  lavado nítido 1 → 0 y copia 0 → 1. Sin desaturación. Cruce de extremos, no radio gaussiano continuo.
  Conserva la graduación visual, pero **todavía no cumple el presupuesto a 1440**.
- **Vuelta sola:** tras **7000 ms de tiempo visible y no pausado**, o `Escape`; vuelta de 1200 ms. El reloj no
  avanza en pausa, fuera de pantalla, pestaña oculta ni `pagehide`.
- **Pausar campo:** congela reloj, señal, emisión, cámara, foco y cuenta de retorno. Cambia a `Reanudar campo`
  y `aria-pressed=true`. Una activación en pausa selecciona el nodo pero espera a reanudar para mover la cámara;
  no salta al destino. Resultados del worker pendientes no pueden repintar una pausa ni otro suelo.
- **`prefers-reduced-motion`:** sin worker ni rAF; el still aprobado de **100/60 s** se conserva. Enfocar aplica
  cámara y opacidades de foco finales instantáneamente; no hay retorno automático que cambie el still sin intervención.
  El control de pausa se oculta porque no hay movimiento que pausar.
- **Ciclo de vida:** se detiene fuera de pantalla, en pestaña oculta y `pagehide`; reanuda sin recuperar tiempo perdido.

## Interacción

- Los **nodos son la interacción**: click, tap y teclado. 35 centros, 52 enlaces.
- Áreas de impacto **26 × 26 CSS px**, independientes del tamaño visual de estrella. En zonas superpuestas,
  click/tap se asigna al centro más próximo en coordenadas inversas de cámara (no al último hermano SVG).
  El teclado conserva el destino explícito de cada uno de los 35 botones. El verificador prueba los 35 centros.
- Affordance antes de tocar: crece y se enciende al pasar el puntero, cambia el cursor, foco visible de **2,5 px**.
- Anuncio accesible, sin lecturas instrumentales en pantalla.
- **Idea aprobada a desarrollar:** nodos en **capas traseras** — la escena tiene profundidad navegable, no una
  sola capa de nodos.

## El puente con el negocio (aprobado como dirección)

La escena no es decoración: **es la caja negra**. Operar sin trazabilidad es mirar una caja negra que hace cosas
que no se ven. Recorrer un nodo es **seguir una traza**: qué actor actuó, desde qué capa, con qué autorización.
Inferencia, trazabilidad y control se muestran como **un sistema con profundidad**, no como tres tarjetas.

Esto es criterio de diseño, no copy: ninguna de estas ideas se escribe en la página hasta que exista el texto.

## Lo que no es esta estética

- Campo uniforme de puntos de borde a borde (papel pintado).
- Degradado radial de SaaS, glow, glassmorphism.
- Tarjetas con borde y sombra, grid de tarjetas iguales, cajas contenedoras.
- Readouts instrumentales sobre la página (frame, ms, DPR, escala).
- Amarillo/ámbar de marca fuera de gates y estados vivos.
- Manchas opacas sobre papel (leen como clip art).

## Protocolo de medición (calibración de la pieza aprobada)

Implementación reproducible: `dist-motion-verify/wu114-v1/depth-composition.mjs`; salida
`depth-composition.json` y `depth-field-{390,768,1440}-{dark,paper}.png`.

1. **Estado:** Chromium headless, DPR 1, viewport **390×844, 768×1024, 1440×900**. Suelos oscuro y papel.
   `prefers-reduced-motion: reduce`, cámara base, emisión fija en 100/60 s, fuentes y canvas listos.
2. **Compuesto de campo:** captura PNG de la ventana completa, con cielo, lavado, viñeta y velo de legibilidad.
   Se ocultan texto, header, utilidades, enlaces y núcleos **sólo durante la medición**. No hay grano superpuesto.
   Este compuesto mide el material detrás de la figura; no cuenta estrellas o letras como densidad del campo.
3. **Transferencia de intensidad:** canales sRGB de 8 bits divididos por 255, **sin linealización gamma**.
   `Y′ = 0,2126 R′ + 0,7152 G′ + 0,0722 B′`; `I = Y′` en oscuro, `I = 1−Y′` en papel.
   Es intensidad de imagen en [0,1], **no** tono del emisor, luminancia relativa WCAG ni diferencia respecto
   a un fondo vacío. Para contraste sí se usa luminancia WCAG linealizada, evaluada por `hero-optics.mjs`.
4. **Calma:** media de I de los píxeles cuyo **centro** cae en el rectángulo DOM de `h1` antes de ocultarlo.
5. **Máscara bolsillo:** elipse de centro igual al centro del bounding box de los **35 centros de núcleo**;
   radios iguales a la mitad de sus spans x/y. Se incluyen centros de píxel con
   `r²=((x−cx)/rx)²+((y−cy)/ry)² ≤ 1`. **Anillo:** `1 < r² ≤ 2,25` (radios externos 1,5×).
   Ambas máscaras se recortan a la ventana; no se rellenan muestras fuera de pantalla. Cada razón divide las
   medias de las máscaras, no las sumas de sus áreas.
6. **Denso:** rejilla de tiles completos **16×16 px**, origen (0,0); se excluye cualquier tile que intersecte
   el rectángulo del titular. Media del **10 % superior** de las medias restantes, redondeando hacia arriba.
   Denso/calma y anillo/calma dividen por la misma media de calma.
7. **Bandas:** grupos no superpuestos de **8 px**, desde (0,0), tanto filas a ancho completo como columnas a
   alto completo. Se descarta el último grupo incompleto. Costura = máximo salto absoluto entre dos medias
   contiguas, tomando el peor eje. **Vacía:** media de I **< 0,02**; longitud máxima de bandas vacías
   consecutivas × 8, dividida por altura o ancho de ventana según eje; se informa el peor eje.
8. **Peldaños de punto:** cantidad de pasos no nulos distintos del `steps` del motor sobre el cielo estático
   de 480×300 celdas (`material`, celda 3). No es un histograma de colores de screenshot ni k-means que fuerce
   tres grupos. Se observan **3** en ambos suelos.

### Recalibración explícita, no retoque visual

El rango anterior de calma **0,08–0,12** no describía la imagen oscura aprobada. El juez B midió **0,04210,
0,04450, 0,04418** (`judge-b/measurements.json`, 390/768/1440). Con el protocolo anterior la pieza actual mide
**0,042108 / 0,044324 / 0,044151**. Se fija **0,040–0,047** como banda de regresión de la pieza aprobada:
redondeo exterior de esas observaciones con aproximadamente 0,002 de margen. **No se aclara ni oscurece** el
campo para cumplir el número viejo. Papel mide **0,097892 / 0,097025 / 0,096984** y queda como referencia,
no como paleta aprobada ni como nueva banda normativa.

| Suelo/ancho | Calma | Denso/calma ≥1,8 | Bolsillo/anillo ≤0,70 | Anillo/calma ≥1,5 | Salto ≤0,06 | Banda vacía <15 % |
|---|---:|---:|---:|---:|---:|---:|
| Oscuro 390 | 0,042108 | 1,781 ❌ | 1,456 ❌ | 1,053 ❌ | 0,04423 | 0 % |
| Oscuro 768 | 0,044324 | 1,635 ❌ | 1,172 ❌ | 1,057 ❌ | 0,00927 | 0 % |
| Oscuro 1440 | 0,044151 | 2,110 | 1,417 ❌ | 1,104 ❌ | 0,01242 | 0 % |
| Papel 390 | 0,097892 | 1,577 ❌ | 1,140 ❌ | 1,111 ❌ | 0,03773 | 0 % |
| Papel 768 | 0,097025 | 1,662 ❌ | 1,058 ❌ | 1,133 ❌ | 0,01555 | 0 % |
| Papel 1440 | 0,096984 | 1,788 ❌ | 1,102 ❌ | 1,209 ❌ | 0,01989 | 0 % |

Estas relaciones **no están certificadas**. Se conservan los objetivos, se publica la discrepancia y se deja
la composición aprobada intacta. El antiguo «4–6 % de luminancia» no se puede confundir con luminancia WCAG:
esta pasada calibra I, no valida ese enunciado histórico como luminancia lineal.

## Evidencia funcional y límites

Ambos jueces entregaron evidencia (`judge-a/`, `judge-b/`): era incorrecto afirmar que B no llegó. Midieron
foco sin filtro y 0 cambios en 3 s. La primera corrección reprodujo ambos fallos y 16 objetivos pequeños en RED;
su GREEN de filtros reales sigue en `depth-*.json`. El presupuesto vuelve a fallar en `focus-baseline.json`:
**ningún intento cumple los tres viajes de 1440 papel**.

Idle final a 3 s, oscuro/papel: **390: 3,787/4,366 %; 768: 3,756/4,087 %; 1440: 5,591/6,131 %**.
`focus-contract.json`: vida también enfocada; pausa y reduced **0 %**; foco reduced instantáneo; interrupción
sin salto; 35 objetivos ≈26×26 px y cielo a sangre en sus 35 destinos. CSS cielo/lavado **none/none**:
6/2,5 px son radios horneados, no estilos computados.

Final: `check-rules` **8/8**, identidades lab **true/true**; motor **5/5 GREEN**; póster LCP **6/6**, 68–124 ms.
Contraste conservador, incluido margen de grano: **9,512:1 oscuro / 4,649:1 papel**; DOM **5,84:1**.
Probe sin errores/advertencias ni estilos inline.

Se retiró el overlay SVG de turbulencia con multiply de papel, no su paleta. Su coste anterior queda medido en
`depth-perf-before.json`; el resultado completo con desenfoque real queda en `depth-perf-after.json`.
En tres viajes de foco a 1440 papel: antes **21,11–21,84 ms media / 33,40 ms p95**; después
**36,67–37,25 ms media / 50,00–50,10 ms p95**. El callback de cámara permanece ≤0,20 ms p95 y la entrega de
emisión al hilo principal ≤2,30 ms p95. Aun anulando filtros sólo en el diagnóstico, queda **18,38–18,63 ms**
media: tampoco se certifica 60 fps de ese modo. Ese historial explica el cambio de técnica; no se borra.

Lavado solo → prehorneado → región/copia reducida: ningún intento cumplió. Se conserva el tercero por
legibilidad; se rechazó reducir antes de difuminar por aliasing. Intentos, capturas, estilos y costes:
`dist-motion-verify/wu114-v1/focus-report.md`. Final media/p95: **1440 oscuro 17,86/33,30 ms;
papel 18,09–18,12/33,30 ms**. 768/390: ≈16,67/16,80 ms. Presupuesto ≤17,5/20; brecha **0,62/13,30 ms**.
Horneado cielo 1440 oscuro/papel **37,4/40,1 ms**; lavado worker **13,2/13,5 ms** a 12 Hz (muestras, no p95).
Callback p95 ≤0,20 ms. **Presupuesto incumplido** en ambos suelos a 1440; no se retira el efecto.

Siguen fuera de esta corrección: rediseño de papel/manchas, cambios de paleta o composición, navegación a nuevos
planos de nodos (B1), lector de pantalla físico y medición en móvil real. La navegación de los 35 nodos existentes
no se presenta como implementación completa de B1.

## Reusabilidad del motor (verificado 2026-10-29)

- `scripts/scene-src/engine.mjs` importa **solo** `./shapes.mjs` (local) y tiene **0 referencias a `document`,
  `window` o `globalThis`**: son funciones puras (`sceneMetrics`, `renderFrame`, `rasterize`, `stepFor`,
  `ditherThreshold`, `densityForViewport`, `solveSize`). Corre igual en Node y en el navegador.
- **No hay ninguna referencia a Astro** ni en el motor ni en el runtime del estudio. Astro es el framework del
  sitio, no una dependencia del motor.
- La capa de navegador está **separada**: `design-studies/v1/v1.mjs` tiene 30 referencias a DOM/canvas/rAF. Esa
  es la única parte atada a la página.
- Consecuencia: **sí es reutilizable**. Sirve para cualquier pieza —hero, sección, footer, imagen OG, video
  horneado— y en cualquier stack o sin framework. Lo que falta para que eso sea ordenado es el **puerto**
  (WU105/106): hoy vive en `scripts/`, que es una carpeta de scripts, y debería vivir bajo `src/lib/` con un
  único dueño de la inversión y del bake.

## Paletas: decisión (2026-10-29)

- **Se queda la oscura actual (A).** «Me gusta el contraste de la oscura… parece realmente el espacio y las
  constelaciones.» Es la documentada y guardada.
- **Descartadas:** B (capas visibles) y las dos claras, C y D. «Las demás y las papel no me gustan nada.»
- **La paleta clara no es obligatoria:** «no necesariamente debemos de tener la paleta blanca o al menos escoger
  otros colores». Queda **abierta como exploración de otros colores**, no como un modo claro que hay que
  rescatar.
- **Fricción abierta:** en la oscura hay cosas que no le gustan «de en general», no del hero: **los verdes que
  usan las secciones**. Se resuelve en la pasada de secciones/tipografía, no en la paleta del campo.
- **El objetivo es mejorar la oscura, no cambiarla:** más vida en la nebulosa, más capas, quizás otro tono de
  acento, sin perder el negro de espacio.

## Capas y foco: corrección de rumbo (2026-10-29)

El crossfade actual **hace desaparecer las capas de atrás** («dejé de ver las capas de atrás que se veía bastante
genial cuando hacía click en un nodo»). Lo que se pide es lo contrario: **riqueza de capas**.

- Los nodos tienen que existir en **varias capas de profundidad**.
- Al enfocar: el plano del nodo **se afirma**; los planos intermedios **siguen visibles** con un tratamiento
  distinto (atenuado/desaturado suave); el plano **más lejano** recibe el desenfoque.
- Prohibido resolverlo ocultando capas: la gracia es ver que hay mundo detrás.
- **Retención de luminancia de cada plano trasero al enfocar: ≥ 40 %.** Piso de aceptación incorporado por
  el encargo de `scene-iteration`; **no es un resultado medido ni una capacidad certificada** de la pieza actual.
  Antes de implementar, fijar en el manifiesto el protocolo reproducible: luminancia WCAG linealizada,
  comparación foco/base por plano, mismo estado de emisión y correspondencia de máscaras bajo la cámara.
  Entregar ambas mediciones, razón, máscaras y capturas; la opacidad CSS no sustituye la luminancia medida.
  El protocolo de retención queda por cerrar y verificar independientemente; no se presupone un verificador existente.

## Iteración de escenas

Skill asociado: [scene-iteration](../skills/scene-iteration/SKILL.md). Interrogar con Angie → fundamentar en datos
o referencia medida → proponer manifiesto → implementar → medir → revisión independiente → validación humana
→ registrar. Los números y protocolos normativos permanecen en este documento; el manifiesto registra decisiones,
evidencia, opciones rechazadas y pendientes. Una aprobación visual no certifica un umbral incumplido o sin medir.

## Dónde vive

Skills asociados: [frontend-design](../skills/frontend-design/SKILL.md) y
[scene-iteration](../skills/scene-iteration/SKILL.md). Actualización de la estética aprobada: **2026-10-29**.

`design-studies/v1/` — `hero-field.mjs` (campo compuesto), `v1.mjs` (runtime y cámara), `v1.css` (composición),
`scene-constelacion2*.mjs` (emisión, byte-idéntica a `lab/`). Evidencia y capturas en
`dist-motion-verify/wu114-v1/` (ignorada por git).
