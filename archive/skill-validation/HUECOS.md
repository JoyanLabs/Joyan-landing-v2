# Huecos del flujo — validación en frío de «El confín»

## Alcance y criterio de parada

Método único: `skills/joyan-escenas/SKILL.md`, versión declarada 1.0. Se leyó completa y se ejecutó §1 antes de inspeccionar las APIs del motor para §2. No se leyeron `odd/tasks/*`, `docs/*`, otras skills ni historiales. Las ubicaciones de código de abajo se obtuvieron buscando las firmas permitidas, no siguiendo documentación externa.

**Parada efectiva: §2, hueco 4.** Los huecos posteriores son observaciones documentales sobre la skill ya leída, no pruebas ejecutadas de animación, rendimiento o fallback. No se afirma que el motor sea incapaz de escenas procedurales: falta la ruta en el método que debía guiar a un agente nuevo.

## 1. §7 pide recibir un boceto, pero §1 manda producirlo

- **Qué pasó:** §7 dice que el encargo debe traer el boceto y que sin él se inventa; este encargo pide crearlo como primer entregable. No había boceto recibido.
- **Qué hice:** seguí la autorización expresa del encargo y §1: creé `sketch.svg`. No usé una referencia de escenas anteriores.
- **Enmienda propuesta:** distinguir «encargo de exploración: el agente produce y revisa el boceto» de «encargo de implementación: se recibe un boceto aprobado». Indicar quién aprueba la regla de tres segundos y cuándo se puede continuar.

## 2. §1.4 pide mirar a 390 px, sin indicar herramienta ni ejecución aislada

- **Qué pasó:** `package.json` no expone un comando de capturas ni declara Playwright/Puppeteer. El entorno sí tiene `/usr/bin/chromium`. El primer intento de captura falló con `Socket path too long` al situar también el temporal en una ruta absoluta larga dentro de la superficie autorizada.
- **Qué hice:** usé el CLI real de Chromium, no una herramienta de capturas inventada. Aislé HOME, configuración, caché, perfil y temporales dentro de esta carpeta para no usar un perfil personal. Reintenté desde esta carpeta con `TMPDIR=.`; Chromium produjo `sketch-390.png` de 390 × 320, que abrí y miré antes de inspeccionar el motor. Los comandos exactos están en `RESULTADO.md`. No hice instalaciones. Los residuos locales del navegador quedan ignorados, no borrados ni inspeccionados.
- **Enmienda propuesta:** dar un comando soportado para revisar SVG y para capturar la página, un directorio de perfil/temporales, las dimensiones completas y un mecanismo de preparación por estado. Documentar la limitación de longitud del socket y un directorio de ejecución apropiado.

## 3. §2 enumera funciones, pero no sus módulos ni los objetos que intercambian

- **Qué pasó:** la skill nombra cuatro etapas sin imports ni ejemplo de sus entradas y salidas. Una importación desde `engine.mjs` no basta para disponer del pipeline completo.
- **Qué hice:** busqué únicamente las firmas autorizadas en `scripts/scene-src/`. Encontré `convert` en `from-image.mjs:85`, `applyTreatment` en `overlays.mjs:598`, `serializeScene` en `image-pipeline.mjs:655` y `renderFrame` en `engine.mjs:523`. No leí escenas aprobadas ni una receta histórica.
- **Enmienda propuesta:** incluir imports exactos y un ejemplo mínimo de composición con el contrato de retorno de cada etapa, sin obligar al agente a descubrir la arquitectura por búsqueda.

## 4. BLOQUEANTE: §2 no tiene rama para un campo procedural por capas

- **Qué pasó:** el encargo exige un campo procedural sin assets externos. §2 prescribe sin alternativa `convert() → applyTreatment() → serializeScene() → renderer`. La firma y cuerpo inmediato de `convert(input, options)` decodifican una imagen local y llaman a `convertRgba`; `serializeScene(scene)` accede a `scene.converted.colorMode` y `scene.converted.levels8`. En cambio `renderFrame` evalúa `scene.field(x, y, time)`. La skill no explica cómo un campo procedural llega a los datos `converted`, ni cómo se conserva su movimiento en esa serialización.
- **Qué hice:** paré antes de implementar la escena. No convertí el boceto de composición en textura final; no lo hice pasar por un campo procedural; no fabriqué `scene.converted`; no omití silenciosamente las tres etapas para llamar directamente al renderer. No generé un módulo ni un chequeo de escena ficticios.
- **Enmienda propuesta:** separar explícitamente dos recetas. Para imagen: el pipeline actual, con hidratación y renderer. Para procedural: contrato mínimo de escena/capas, suelo/paleta, función de campo, tratamiento compatible, tiempo y renderer; aclarar si se omiten conversión/serialización, se hornea un poster o existe otra serialización. Incluir un ejemplo ejecutable que importe el motor real. Corresponde al dueño de la skill decidir esa ruta; no se implementó una propuesta durante esta auditoría.

## 5. §2 no distingue arte claro de entrada y suelo oscuro del motor

- **Qué pasó:** la skill explica tinta sobre claro y habla de «si la escena tiene suelo claro» sin advertir el contrato de primitiva de suelo oscuro que el encargo identifica como WU108. Son conceptos distintos: el fondo blanco del boceto/arte de entrada no determina el suelo del renderer. El cálculo en `renderFrame` usa `maxTone - groundTone`.
- **Qué hice:** mantuve el blanco solo en el boceto de composición; no inferí soporte de suelo claro, no invertí una salida ni modifiqué el motor. No ejecuté una prueba de paleta clara.
- **Enmienda propuesta:** declarar el suelo oscuro como contrato del motor y distinguirlo del fondo de entrada. Si se ofrece suelo claro, describir el consumidor/inversión admitido y el resultado esperado, sin presentarlo como una paleta intercambiable sin restricciones.

## 6. §3 no conecta segundos con la API que recibe frames

- **Qué pasó:** §3 exige tiempo en segundos y periodicidad, pero no ofrece adaptador. `renderFrame(scene, frame)` discretiza el índice y calcula `time = index / scene.fps`; `scene.field` recibe ese tiempo. La skill tampoco escribe la conversión explícita de fase normalizada de `EVENT_WINDOWS` a segundos.
- **Qué hice:** constaté la firma y el cálculo, sin crear una animación ni afirmar continuidad. Respeté la advertencia de que `EVENT_WINDOWS` no son segundos; esta composición no pide eventos.
- **Enmienda propuesta:** mostrar un adaptador de reloj real a índice, definir `T = cycleFrames / fps` y usar `sin(2π * t / T + fase)` o equivalente en cada término animado. Dar un ejemplo de ventanas normalizadas y una prueba de continuidad en secuencia, diferenciada de determinismo.

## 7. §4, coste: falta un presupuesto numérico y qué trabajo se cronometra

- **Qué pasó:** «≤ presupuesto de cadencia» no aporta fps objetivo ni milisegundos. Tampoco fija resolución, calentamiento, muestras o si frame incluye `renderFrame`, rasterización y/o pintado. §6.4 sí pide mediana/p90 y reportar media/p95/peor, pero sin presupuesto no se pueden escribir aserciones con un límite derivado de la skill.
- **Qué hice:** no elegí 16,67 ms, 33,33 ms u otro límite por costumbre. No ejecuté un benchmark sin escena ni declaré aserciones de mediana/p90 que no existen.
- **Enmienda propuesta:** poner el presupuesto numérico o declararlo como dato obligatorio del encargo, junto con carga medida, dimensiones, muestras y calentamiento. Definir expresamente las aserciones de mediana y p90 y el reporte de media/p95/peor, tanto en Node como en navegador.

## 8. §4, determinismo y saturación: falta fijar la unidad y cobertura temporal del chequeo

- **Qué pasó:** «dos corridas del generador» no identifica comando ni artefacto byte-comparable en una escena procedural. «Celdas en tono máximo < 5 %» no fija qué frames del loop cubrir ni define el tono máximo como peldaño de rampa frente a índice de paleta.
- **Qué hice:** no comparé dos objetos vacíos ni reporté 0 % por ausencia de celdas. No confundí determinismo con continuidad. No hay resultados numéricos de estas filas.
- **Enmienda propuesta:** fijar la representación canónica y las entradas de dos ejecuciones independientes. Para saturación, definir el peldaño máximo, el denominador, el conjunto de tiempos/eventos y exigir < 0,05 para cada frame cubierto, informando el peor. Dar el comando Node reproducible de la receta procedural.

## 9. §4, legibilidad y contraste: falta el contexto observable del footer

- **Qué pasó:** «se entiende en 3 s» no define qué debe reconocerse ni quién lo confirma. El encargo solo especifica uso final footer, sin texto/fondo realmente integrados. La skill no dice cómo tratar una escena sin texto al medir contraste.
- **Qué hice:** anoté una revisión cualitativa del boceto: cinco contornos aislados sobre horizonte bajo, con mucho vacío; no la presenté como una prueba humana cronometrada ni como legibilidad del motor. No inventé texto, pares cromáticos ni una razón de contraste.
- **Enmienda propuesta:** declarar el criterio de reconocimiento y observador, y distinguir revisión de boceto de validación final a 1280/390. Pedir el texto/contexto real o definir explícitamente «no aplica» para escenas sin texto, manteniendo el contraste del footer integrado como requisito separado.

## 10. §4, navegador y sin JS: falta la receta de entrega y fallback

- **Qué pasó:** se piden capturas y un resultado nunca vacío sin JS, pero no hay punto de entrada, página/comando de servicio, señal de preparación, mecanismo de deshabilitar scripting ni receta para insertar un poster generado por el motor. Tampoco se vincula el fallback al mismo frame/paleta que el render vivo.
- **Qué hice:** solo abrí el SVG local en el navegador que sí existe. Tras la parada en §2 no fabriqué una página de escena ni entregué el boceto como fallback del motor. Las capturas finales 1280/390/sin JS no existen; esto no se atribuye a ausencia de navegador.
- **Enmienda propuesta:** incluir una página mínima soportada y su comando de apertura/servicio, una señal de estado listo, capturas con scripting desactivado y fallback horneado con el mismo motor. Explicar que un canvas vacío sin JS no cumple aunque el chequeo Node pase.
