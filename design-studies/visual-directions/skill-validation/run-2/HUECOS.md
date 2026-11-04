# Huecos observados — joyan-escenas 1.1, segunda corrida

Método: sólo `skills/joyan-escenas/SKILL.md`, leído completo antes del trabajo. No se consultaron ODD, `docs/`, otras skills ni la corrida anterior. Esto es una exploración, no una propuesta de cambiar el motor. Las enmiendas siguientes son propuestas para el orquestador; no se editó la skill.

## H1 · El requisito independiente no tiene un camino de ejecución (§1, §4, §7)

- **Qué pasó:** pude producir y mirar el boceto, pero soy quien lo hizo. No hubo una persona ajena a la iteración: **0 evaluadores independientes**, **0 ensayos cronometrados**. Además, «El confín» es un nombre abstracto: no está definido si hay que reconocer ese nombre o describir cuatro presencias sobre un horizonte.
- **Qué hice:** mantuve la autoevaluación de composición separada del umbral de tres segundos. Legibilidad quedó **NO MEDIBLE**, no PASS y tampoco FAIL. No pedí ayuda a otro agente ni inventé una observación humana.
- **Enmienda propuesta:** incluir como prerrequisito un evaluador independiente y una consigna ciega concreta: mostrar cada captura sin nombre ni explicación durante 3 s y registrar literalmente su respuesta. Definir antes qué descripciones del sujeto son aceptables. Si no hay evaluador, permitir entregar la evidencia técnica con legibilidad pendiente, sin aprobar la escena.

## H2 · Falta el contrato espacial y tonal completo del campo (§2B)

- **Qué pasó:** el ejemplo dice «tinta 0..1», pero no aclara las unidades de `x/y` ni si el escalar es tinta relativa o luminancia absoluta. Leyendo el motor permitido comprobé que recibe coordenadas de celda enteras y normaliza el valor contra la luminancia del suelo y el máximo de la paleta.
- **Qué hice:** usé `x/cols`, `y/rows` para componer, y devolví `groundTone + ink * (maxTone - groundTone)`. La paleta mantiene el suelo más oscuro. No invertí nada ni cambié el motor.
- **Enmienda propuesta:** añadir al ejemplo que `x ∈ [0, cols-1]`, `y ∈ [0, rows-1]` y que el escalar comparte el espacio tonal del motor, no es una fracción relativa independiente de la paleta. Mostrar la transformación de una tinta relativa, usando `tone` y `hexToRgb` reales.

## H3 · Se exige un póster sin mostrar cómo hornearlo (§2B, §4)

- **Qué pasó:** `renderFrame` devuelve peldaños e índices; el ejemplo no llega a píxeles ni a un archivo que pueda usar un `<img>` con scripting desactivado. Tampoco se da el adaptador de pintura del navegador.
- **Qué hice:** seguí las exportaciones del motor: `renderFrame → rasterize`. Escribí `bake-poster.mjs` con `sharp` ya disponible y un adaptador de canvas con `ImageData/putImageData`. El póster y el canvas tienen el mismo SHA-256 RGBA nativo.
- **Enmienda propuesta:** incluir una receta mínima de horneado y navegador con `rasterize`, tamaño de celda explícito, imagen visible por defecto y canvas visible sólo después de una pintura válida. No pedir una retícula de puntos alternativa.

## H4 · «Esperar por estado» no define un protocolo (§4, §6.5)

- **Qué pasó:** la skill da el puerto correcto, pero no una señal de finalización ni el método para obtener las capturas 1280/390/no-JS. La advertencia sobre `waitForFunction` puede confundirse con prohibir una espera que sí consulta estado; un timeout de seguridad no es lo mismo que dormir para sincronizar.
- **Qué hice:** construí un verificador CDP sin dependencias nuevas. Espera `Page.loadEventFired` y luego `data-state=ready` más `data-hash`, con `MutationObserver`, sin `sleep`, `setTimeout` ni pausas de duración fija. Para no-JS espera el evento de carga de la página y sus imágenes. El servidor 4403 sólo expone los archivos de esta corrida y los dos módulos del motor necesarios.
- **Enmienda propuesta:** definir una señal `ready/error` estándar y proporcionar un runner pequeño; distinguir sincronización por estado de un límite de seguridad. Establecer cómo terminar si falla una importación: un éxito que nunca llega no debe dejar una promesa esperando indefinidamente.

## H5 · El presupuesto de coste está fijado, el protocolo no (§4, §6.4)

- **Qué pasó:** no está fijado si «frame dinámico» incluye campo, raster, subida al canvas, composición, inicialización o calentamiento; tampoco número de muestras, percentiles, resolución ni reutilización de buffers. Esas elecciones cambian lo que significa un PASS de 16,67 ms.
- **Qué hice:** declaré 60 frames de calentamiento y 240 muestras dinámicas, percentil por rango más cercano, buffer reutilizado y resolución nativa 1280×768 en ambos viewports. Node mide `renderFrame+rasterize`; Chromium añade `putImageData`. Reporté el primer frame por separado. La mediana/p90 pasa, aunque el frío y algunos máximos exceden el presupuesto. No afirmo medir presentación final/composición de GPU.
- **Enmienda propuesta:** pinear esas decisiones en una receta de benchmark, distinguir coste de CPU de presentación visible y reportar frío por separado. Conservar la aserción sobre mediana/p90 y los informes de media/p95/peor ya presentes en 1.1.

## H6 · El chequeo de saturación necesita una definición ejecutable (§4)

- **Qué pasó:** no se da la exportación del peldaño máximo ni una pauta para elegir los tiempos del ciclo. Usar el máximo *observado* sería incorrecto: aquí ningún frame alcanza el peldaño máximo real. Una escena vacía también podría dar un falso verde.
- **Qué hice:** conté `step === RAMP.length - 1` sobre las 15.360 celdas, en **todos los 720 frames enteros**. Resultado: 0 %. Comprobé 397 celdas no vacías en el frame 0 y un control deliberadamente saturado que da 100 %.
- **Enmienda propuesta:** añadir ese índice del máximo real, exigir que se declaren los tiempos muestreados y un control de escena no vacía. Para ciclos de este tamaño, proponer el barrido de todos los índices discretos. No confundir una falta de peldaños máximos con una ausencia de contenido.

## H7 · La adaptación móvil queda a criterio del implementador (§1, §4)

- **Qué pasó:** la skill exige mirar el boceto a 390 y capturar la escena a 1280/390, pero no fija altura, relación de aspecto, escala/crop ni densidad. El boceto es 390×320; la retícula elegida es 160×96. A 390 el motor completo queda en 390×234, centrado dentro de una captura 390×320.
- **Qué hice:** conservé las cuatro presencias y el horizonte completo, sin recorte ni rediseño móvil; mantuve celdas cuadradas y escala proporcional. Hay 405 píxeles distintos del suelo en la captura viva móvil. Ese número demuestra contenido, **no** su legibilidad.
- **Enmienda propuesta:** pedir que boceto y entrega declaren su relación de aspecto y la política móvil antes de aprobar composición; capturar ese mismo encuadre sobre el suelo final. No convertir la mera existencia de píxeles en un umbral perceptual inventado.

## Hallazgo del verificador, NO defecto atribuido a la skill

La primera ejecución del navegador rechazó la diferencia entre los PNG móviles de `<img>` y `<canvas>`. Esa igualdad exacta después del reescalado **no está exigida por §4** y era una sobreaserción mía. Se corrigió el verificador para comprobar identidad RGBA nativa del póster y canvas frente al motor y contenido visible sin JS. Se conserva el dato: 1.646 canales distintos, diferencia máxima 38/255 entre las capturas reescaladas. No se alteró la escena ni se inventó una tolerancia para declararla igual.

## Enmiendas 1.1 que sí funcionaron

- La captura CLI del boceto funcionó con directorio actual corto, `TMPDIR=.` y perfil local.
- La receta 2B se pudo ejecutar sin `scene.converted` y sin dibujar puntos a mano.
- El suelo oscuro más bajo de la paleta no colapsó a cero.
- `T=cycleFrames/fps=24 s` y las fases `2πt/T` dieron periodicidad directa del campo, no sólo equivalencia causada por el módulo del adaptador.
- Se pudo separar el payload determinista de las métricas de tiempo variables; dos procesos dieron bytes idénticos.
- El umbral mediana/p90 evitó reinterpretar un frame frío o un máximo aislado como fallo global.
- La evidencia de navegador importó el motor desde 4403 y capturó con scripting realmente desactivado.
