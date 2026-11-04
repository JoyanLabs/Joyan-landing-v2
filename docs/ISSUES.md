# Backlog de issues — Joyan landing

**Estado al 2026-11-03.** Actualizado sobre el plan del 2026-10-25 después del cambio de rumbo del 10-29
(lenguaje de la constelación primero). Cada issue se piensa como **una sesión de trabajo**. Un issue no se
cierra por "hecho": se cierra por **criterio de aceptación verificado**. Si la investigación cambia el
alcance, se reescribe el issue antes de seguir.

**Delegación a Angie:** issues marcados **[Angie]**. Ella trabaja con la skill `joyan-escenas` + la escena de
referencia (constelación volumétrica) + `docs/ESTETICA-CONSTELACION.md`. Sus dos tareas arrancan **después de
que I-16 valide la skill**.

---

## A · Fundaciones (bloquean el puerto a `src/`, sin fecha hoy)

### I-01 · Un solo dueño para la inversión y el bake — **abierta**
Hoy la regla de inversión vive en el módulo del estudio y el pipeline de bake/parche duplica `scene-runtime`
y `public-sequence` (y le falta `pagehide`). El póster horneado tiene que seguir siendo el LCP.
**Aceptación.** La regla de nivel vive en `scripts/scene-src` (testeable en Node); el bake/parche en un único
módulo de `src/lib`; cero copias. **Depende de.** nada. **Tamaño.** 1 PR mediana.

### I-02 · Revertir los campos prestados del motor — **CERRADA 2026-10-28 (WU108)**
`minTone` y `groundMode` revertidos; contrato de primitiva de suelo oscuro pineado en
`scripts/check-engine-surface.mjs` (5/5); diferencial contra HEAD 16/16 byte-idéntico. Evidencia:
`odd/tasks/puerto-v1-a-src.md` §Evidencia T1.

### I-03 · Contratos del sitio en el puerto — **abierta**
`WU20_BUILT_PAGES` (seis HTML exactos), `WU20_PAGE_CONTRACT` y `LANDING_FROZEN_HASHES` se mueven **en el mismo
commit y re-midiendo**, nunca en silencio. **Depende de.** I-01. **Tamaño.** 1 PR chica, re-pin ruidoso.

### I-04 · Presupuesto del puerto — **abierta**
~21,3 KiB de JS nuevo contra 13,5 KiB de holgura del pin; con el papel descartado, el chunk perezoso ya no es
necesario, pero el total sigue sin entrar. **Aceptación.** Delta medido bajo el tope **o** límite re-negociado
explícitamente. **Depende de.** I-01. **Tamaño.** 1 PR mediana.

---

## B · La escena del hero (lenguaje de la constelación)

### I-05 · Profundidad real por capas — **en gran parte cubierta; queda la medición de aceptación**
La constelación volumétrica entregó 3 planos con paralaje 0,18/0,52/1,00, escala compensada y profundidad de
campo real (cielo 6 px / lavado 2,5 px / figura 0 px), auditada por juez ciego. Queda el **A/B de legibilidad
del polvo** del criterio original (nodos por franja de profundidad; la capa lejana no baja del umbral).
**Tamaño.** 1 sesión de medición.

### I-06 · Resplandor de los nodos — **abierta**
Halo aditivo vs bloom vs caída exponencial; ninguna celda llega a tono 1; contraste ≥ 4,5:1 sobre la zona
iluminada. **Depende de.** I-05. **Tamaño.** 1 PR chica.

### I-07 · Apertura inmersiva — **abierta**
≤ 2 s, sin bloquear lectura; estado final correcto sin JS y con reduced-motion. **Depende de.** I-05.

### I-08 · Constelación sin JavaScript — **abierta**
Hornear la constelación (líneas + nodos) en el póster de build con las mismas coordenadas de la escena.
**Aceptación.** Con JS desactivado la figura está; el póster no duplica lógica.

### I-17 · Difuminado de capas al enfocar como sistema — **nueva, abierta**
La primera versión del difuminado fue lo que más gustó de la pieza; hay que volverlo parte del lenguaje
(`docs/ESTETICA-CONSTELACION.md` manda). Umbrales, curva y reduced-motion por documento.

### I-18 · Jueces sobre la constelación — **nueva, abierta (bloque A1 del plan de lenguaje)**
Dos jueces ciegos + hallazgos resueltos con medición. Aún no corridos sobre la pieza final.

### I-19 · Papel replanteado — **nueva, abierta**
La paleta clara/papel fue rechazada (manchas pardas) y el recorte del lavado dejó el campo de puntos de papel
casi invisible. El dial está en la amplitud del lavado (hoy 0,0298) y la densidad de tinta. **No es bloqueante**
del plan vigente: sólo si vuelve a pedirse un suelo claro.

---

## C · Estructura y escenas

### I-09 · Estructura de la página — **resuelta por decisión 10-29**
La página no tiene secciones hacia abajo: el hero es la página y se navega por nodos en planos de profundidad.
`odd/tasks/mapa-de-secciones.md` queda como referencia de método (arquitectura de credibilidad, marco SCOPE),
no como estructura obligatoria.

### I-10 · Arequipa: de mapa a constelación — **abierta · [Angie]**
Datos con **licencia escrita** (OSM/ODbL exige atribución y comparte; evaluar HOT/AGSL y
`microsoft/SouthAmericaBuildingFootprints`), recorte de la ciudad, cuántos edificios entran en 480×300, y de
contornos a puntos con el pipeline actual. **Aceptación.** CSV/GeoJSON reducido y versionado con su licencia,
y una escena que se lea como Arequipa y no como textura. **Arranca después de I-16.**

### I-11 · Contacto por interacción — **abierta**
La interacción no puede ser el único camino al contacto; foco de teclado y contraste intactos.
**Depende de.** I-09/I-10.

### I-20 · Serie de las cuatro escenas — **nueva, abierta · [Angie]**
`docs/ESCENAS-SERIE.md` convierte la pauta de dirección de arte en decisiones construibles: el nudo, la
máquina habitada, la llave, el registro. Regla que manda: **cada escena se entiende en tres segundos y sin una
sola palabra**. Campo por celda, densidad como única herramienta de jerarquía, ciclo propio por escena.
**Aceptación.** Cuatro escenas verificadas con la tabla de medición de la skill; una reunión de lectura en frío
por escena. **Arranca después de I-16.**

---

## D · Calidad, verificación y entrega

### I-12 · Sostener 60 fps, medido en la página — **abierta**
Tres ventanas dieron 52,8 / 59,8 / 54,1 fps con hueco de 267 ms (medición 10-25). La cadencia del blur mejoró
2,1× (18,1 ms medios en 1440 papel) pero el contrato de la página no se volvió a medir. **Aceptación.** Umbral
explícito cumplido en ambos viewports o un objetivo honesto declarado.

### I-13 · Verificador y gate — **abierta**
Ningún verificador debe depender de un tiempo fijo; hay un subconjunto rápido en `package.json` o CI.

### I-14 · Jueces sobre la página final — **abierta** (se cubre en parte con I-18 sobre la pieza)

### I-15 · Delegación a Angie — **preparada 11-03**
Repo commiteado y publicado, handoff al día, escena de referencia verificada (constelación volumétrica),
issues marcados. Lo que aún la bloquea: **I-16**.

### I-16 · Validar la skill `joyan-escenas` — **abierta · nuestro, prerrequisito de las de Angie**
La skill está escrita pero **no probada**. Una escena nueva producida **solo** con la skill, verificada con su
tabla de medición, más la lista de huecos publicada como enmiendas a la skill. Si el flujo falla, se corrige la
skill, no se improvisa la escena. **Depende de.** I-01 (motor con un solo dueño, en su parte de estudio ya
cumplida). **Tamaño.** 1 sesión de validación + 1 PR a la skill.

### I-21 · WU19 #7 — textura en zonas planas — **nueva, abierta, requiere decisión humana**
Pares planos 0,7760 (P3, documentado en `docs/AUDITORIA-ESCENAS.md`). Es dither del motor: tocarlo re-mide el
pin que WU104/WU108 cuidan. No se cierra por omisión.
