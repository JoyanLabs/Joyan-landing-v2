# HUECOS — qué se pudo ejecutar de v1.2/v1.3 y qué no

Regla de esta corrida: **si la skill no lo dice, es hueco**, no se resuelve por costumbre. Cada hueco lleva
qué decidí yo, con qué evidencia, y qué le falta a la skill para que otro agente no tenga que decidirlo.

## Las ocho enmiendas

### 1. §2B — contrato espacial/tonal de `field(x, y, time)` → **SÍ, con dos huecos**

Ejecutable: `field` recibe celdas enteras y devuelve un escalar en el espacio tonal del motor
(`tone = groundTone + ink·(maxTone − groundTone)`). Lo implementé tal cual y el campo y el motor no
divergen: el póster sale del mismo `renderFrame`/`rasterize`.

Huecos:

- **La fórmula nombra `groundTone` y `maxTone` sin decir de dónde salen.** §2B no menciona
  `sceneMetrics()`, `hexToRgb()` ni `luma()`, que es donde el motor calcula esos dos números. Decidí usar
  `sceneMetrics(scene)` (la misma fuente que normaliza `renderFrame`) y no recalcular con `hexToRgb` a mano.
  Un agente que no lea `engine.mjs` va a inventar el cálculo y puede desincronizarse.
- **`x`/`y` en `[0, cols-1]` no se cumple con `density > 1`.** `renderFrame` llama
  `scene.field(x * density, y * density, time)` y reduce `cols`/`rows` por el mismo factor: con
  `density: 2`, `frame.cols = 100` pero el campo recibe valores hasta 198. §2B no menciona `density` ni
  dice qué contrato vale entonces. Mi escena indexa tablas por `scene.cols` y por eso **sólo funciona con
  `density: 1`**; cualquiera que use `density` con esta receta indexa fuera de rango.

### 2. §2B — receta de póster con `rasterize`, póster visible por defecto, canvas sólo tras pintura válida → **SÍ, con tres huecos**

Ejecutable: `renderFrame` → `rasterize` → PNG (`bake-poster.mjs`, `poster.png` 1600×800) y en la página el
`<img>` del póster es lo que se ve; el canvas se destapa recién después de pintar.

Huecos:

- **No dice cómo se codifica el PNG.** `bake.mjs` del repo usa `sharp`; §2B sólo dice «`rasterize()` → PNG».
  Usé `sharp` (dependencia del repo) con opciones fijas para que el archivo sea repetible.
- **No dice qué frame es el póster.** Elegí la mitad del ciclo (`p = 0,5`, frame 180), donde el acento está
  en su sostén. `posterFrame` existe en las escenas del laboratorio, pero no está en el contrato de §2B.
- **«Pintura válida» no está definida.** Decidí que lo es un `getImageData` posterior al `putImageData`
  cuyo hash coincide con el `rasterize` de Node; es lo único que prueba que hubo pintura y no un `try`
  vacío.

### 3. §3 — adaptador `T = cycleFrames / fps` y envolvente de evento cero en los dos extremos → **SÍ**

Verificable y verificado: `T = 360/30 = 12 s`, `eventEnvelope(0) = eventEnvelope(1) = 0`,
`head(0) = head(1) = −0,80`, celdas encendidas en el frame 0 y en el 359 = **0**, y **0** celdas con
`|Δpaso| ≥ 2` entre frames consecutivos del ciclo (incluido el cierre).

Hueco: **§3 no dice cómo se observa el «cero»**. Mi primer intento asertó «todo el campo ≤ peldaño 1 en
los extremos» y falló: el nodo **en sombra** llega a peldaño 2 y eso es legítimo (la sombra existe). El
criterio tuve que elegirlo yo: cero = ninguna celda encendida (peldaño ≥ 3) y ninguna en el último
peldaño. La skill debería nombrar el criterio observable, no sólo el matemático.

### 4. §4 — benchmark pineado (60 + 240, buffers reutilizados, resolución nativa, frame frío aparte) → **SÍ, con dos huecos**

Ejecutado con un único `bench.mjs` para las dos superficies: Node 12,23 ms de mediana, navegador 12,10 ms
(con `putImageData`), ambas por debajo de 16,67 ms, con media/p95/peor reportados.

Huecos:

- **«El frame frío se reporta aparte» no define qué es frío.** En Node tomé la primera llamada del proceso
  (30,58 ms, incluye construir máscaras y sprites). En el navegador, el primer pintado de la página mide
  **≈1,35 s** — es arranque del canvas, no un frame (el frame real de ese primer pintado es 12,7 + 2,3 ms,
  medido con un probe aparte). Los dos números no son comparables y la skill no dice cuál vale.
- **No dice si `renderFrame` y `rasterize` se miden juntos o separados.** Medí el total (lo que paga el
  póster) y reporté el desglose como diagnóstico.

### 5. §4 — saturación ejecutable (último peldaño, barrido, control no vacío, control 100 %) → **SÍ, con dos huecos**

Ejecutado: barrido de los 360 índices, peor frame 168 → **0,67 %** (< 5 %); control de escena no vacía
38,14 % de celdas con tinta; control saturado **100,00 %**.

Huecos:

- **«El último peldaño de la rampa» hay que leerlo de `COVERAGE`** (`COVERAGE.length − 1`, = 4), no de la
  paleta, que aquí tiene 10 tonos. La skill dice «rampa», pero el número que hay que usar no se nombra.
- **El control saturado no dice cómo se construye.** Tuve que armar una escena mínima cuyo campo devuelve
  `maxTone` en todas las celdas (8×8, `cycleFrames: 1`).

### 6. §4 — señal `data-state="ready"`/`"error"` + hash, espera por estado con timeout de seguridad → **SÍ, con dos huecos**

Ejecutado: `data-state="ready"` + `data-hash`; `error-demo.html` deja `data-state="error"` con el mensaje
de la importación fallida; la espera es por atributo con tope de 20 s (nunca colgó).

Huecos:

- **No dice de qué es el hash ni con qué algoritmo.** Elegí sha256 del RGBA **leído del canvas después de
  pintar**, que además cruza Node↔navegador (`c9667532…cd05` en los dos). Con un hash del PNG no se podría
  comparar entre `sharp` y el navegador.
- **Con scripting off la señal se queda en `loading` para siempre**, aunque el póster esté visible. Un
  consumidor que espere por `ready` (un script de captura, un test de integración) no lo recibe nunca y no
  tiene forma de saber que la página está bien. La skill no dice qué debe exponer el fallback sin JS —
  `browser-nojs.png` demuestra el hueco: la imagen está bien y el estado miente.

### 7. §4 — protocolo de evaluador ciego → **SÍ como protocolo; la fila queda PENDIENTE**

Consigna literal, criterio de aceptación definido antes, y las cuatro capturas listas en `RESULTADO.md`.
Esta corrida **no certifica legibilidad** y por lo tanto **no aprueba la escena**.

Hueco: **«definir antes qué descripciones del sujeto son aceptables» no dice dónde se registra ni con
cuántas capturas se evalúa.** Lo dejé escrito en `RESULTADO.md` (tiene que viajar con el encargo) y decidí
mostrar 1280 y 390 por separado, con la de sin-JS como control opcional.

### 8. §1 — aspecto y política móvil declarados antes de aprobar, y todo comando de navegador con `timeout` → **NO tal cual (el comando recorta), sí con una corrección**

El `timeout` se cumplió siempre. **El comando de §1, copiado tal cual, recorta el boceto**: abre el SVG
como documento, lo pinta a su tamaño intrínseco (1600×800) dentro de un viewport de 390×320 y la captura
sólo ve la esquina superior izquierda (`sketch-390.png` de 1151 bytes: una raya y nada más). Es
exactamente lo contrario de la política móvil que §1 manda declarar.

Corrección mínima, dentro del archivo del boceto: declarar la raíz SVG con `width="100%" height="100%"` +
`viewBox` + `preserveAspectRatio="xMidYMid meet"`. Con eso el mismo comando escala en vez de recortar
(`sketch-390x320.png`: letterbox, sin recorte) y a `--window-size=390,195` da el encuadre exacto 2:1.

Huecos del comando:

- **La altura `320` del `--window-size` es una suposición oculta** sobre el aspecto del boceto. §1 pide
  declarar el aspecto y a la vez fija una ventana, así que los dos requisitos se contradicen para cualquier
  cosa que no sea 390×320.
- **`chromium` no está en el PATH de esta máquina.** Tuve que usar
  `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`. La skill nombra el binario como si
  existiera.
- **`TMPDIR=.` deja basura.** Chrome crea `org.chromium.Chromium.XXXXXX/` en el directorio del estudio; no
  estaba en el `.gitignore` de la corrida y se ve como archivo sin seguimiento. Agregué `org.chromium.*` al
  `.gitignore` de `run-3/`. (Y el aviso del socket es real: con `TMPDIR` absoluto a este directorio, Chrome
  aborta con `FATAL … Socket path too long`; lo reproduje.)

## Huecos nuevos (fuera de las ocho)

### A. La fuente del rango tonal no está en §2B
`groundTone`/`maxTone` salen de `sceneMetrics()`; el campo tiene que hablar ese espacio. §2B escribe la
fórmula pero no el acceso. Un agente que no abra `engine.mjs` recalcula mal o normaliza dos veces.

### B. `density` contradice el rango declarado
Ver enmienda 1. `renderFrame` multiplica por `density` antes de llamar al campo; §2B no lo menciona y su
contrato de coordenadas deja de valer.

### C. Contraste: la skill no dice qué luminancia
Exige ≥ 4,5:1 (que es WCAG, luminancia **linealizada**) y el motor expone `luma()` de **pantalla**. Para el
mismo par: 16,26:1 con WCAG, 12,03:1 con `luma()`. Las dos pasan, pero un par de 4,6:1 puede fallar según
cuál se use. Usé WCAG y lo reporté; la skill debería nombrarla.

### D. El coste de `field()` no tiene guía
§4 da el presupuesto del **frame**, no del campo, y no dice que el campo se evalúa **por celda y por
frame**. Medido en esta escena (200×100): dos octavas de `layeredNoise()` cuestan la mayor parte del
`renderFrame` (4,40 ms de 12,23 ms totales), y las distancias inline a la cadena (8 segmentos + 9 nodos por
celda) costarían **+12,42 ms** — el frame completo se iría a ~24 ms, por encima del presupuesto. Tuve que
precomputar la geometría estática en tablas.

Y eso abre la pregunta que la skill no contesta: **¿precomputar geometría y memoizar el estado por frame es
compatible con «el campo es una función de (x, y, time)»?** Lo hice (tablas de módulo + memo del estado
animado por `time`) porque el resultado sigue siendo puro, pero es una decisión mía, no de la skill.

### E. Los servidores 4402/4403 se dan por levantados
§4 dice «4402 sirve…, 4403 la raíz del repo» sin decir cómo se levantan, ni que haya que levantarlos. Hoy
no escuchaba nadie en ninguno de los dos. `verify-browser.mjs` levanta su propio servidor estático en 4403
(y lo cierra). El dato de la skill sí es correcto y útil: la página **sólo** funciona desde la raíz del
repo, porque importa `scripts/scene-src/*`.

### F. Las rutas de import del ejemplo de §2B no tienen base declarada
El ejemplo usa `'../../../scripts/scene-src/engine.mjs'`, que es correcto desde
`design-studies/visual-directions/lab/`. Desde `skill-validation/run-3/` hacen falta cuatro niveles
(`../../../../`). §2B no dice desde qué directorio se escribe, y el que copia el ejemplo recibe un 404.

### G. El «ejecutable de referencia» de §2B no es un ejemplo mínimo
`lab/scene-constelacion2.mjs` es un archivo **generado** («do not edit by hand») de otra escena: 35 nodos,
sus anillos, su ruido propio (`vnoise`/`fbm`, no `layeredNoise`) y su calibración. Sirve como muestra de
estilo, no como plantilla de la receta 2B: no ejercita `sceneMetrics()` ni el contrato tonal.

### H. `chromium` no está en PATH
Ver enmienda 8. `verify-browser.mjs` resuelve con `CHROME_BIN` y una lista de candidatos; la skill no
menciona ninguna de las dos cosas.

### I. La señal no describe el fallback sin JS
Ver enmienda 6: `data-state` se queda en `loading` con el póster ya en pantalla.

### J. «Pintura válida» sin definición
Ver enmienda 2. Es justo el punto donde un canvas vacío pasaría por bueno.

### K. El boceto y la entrega no comparten un manifiesto de encuadre
§1 manda declarar aspecto y política móvil, pero no dice **dónde**: lo puse como atributos
(`data-aspect-ratio`, `data-mobile-policy`) en el SVG y en la página, y `check-skill.mjs` los verifica. Si
cada agente lo escribe distinto, no hay nada que verificar.

### L. El póster no tiene frame prescrito
Elegí `p = 0,5`. Nada en §2B impide elegir un frame apagado (frame 0), que daría un póster casi vacío y
pasaría todas las filas de §4 menos la de legibilidad.
