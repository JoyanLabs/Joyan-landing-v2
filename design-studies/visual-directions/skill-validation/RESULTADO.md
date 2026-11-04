# Resultado — «El confín», validación en frío

**Estado: PARCIAL. Parada válida del experimento en §2; no hay escena final.**

La skill permite completar el boceto, pero no prescribe cómo llevar un campo procedural animado por capas por su pipeline obligatorio de imagen. Se detuvo la implementación en lugar de completar la receta por costumbre. No se observó un fallo del motor ni se afirma que este no admita escenas procedurales.

## Encargo y método

- Escena: «El confín»; pocos nodos, casi estáticos, deriva lenta, sin interacción; destino footer.
- Sin assets externos. El SVG es un boceto propio de composición, no arte final ni salida del motor.
- Método único: `skills/joyan-escenas/SKILL.md`, versión declarada 1.0.
- Se preservaron el motor, las escenas aprobadas y el untracked preexistente `odd/tasks/i16-validacion-skill.md`. Ese archivo no se abrió.
- No se leyeron `odd/tasks/*`, `docs/*`, otras skills ni historiales. Solo la skill indicada, `package.json` y el código permitido de las APIs del motor; no se leyeron módulos de escenas aprobadas.
- No se hicieron instalaciones, delegaciones, staging ni commits.

## Secuencia observada

1. Se leyó completa la skill, sin usar otra receta.
2. Se inspeccionaron estado de trabajo, `package.json` y disponibilidad de Node/navegadores. Se encontró `/usr/bin/chromium`; `package.json` no ofrece una tarea de capturas ni declara Playwright/Puppeteer.
3. **§1:** se creó `sketch.svg` antes de inspeccionar las APIs del motor. Base blanca para el boceto de tinta; estructura de horizonte bajo; sujeto de cinco contornos aislados. No se añadió capa de eventos. El recorrido lento es intención pendiente, no una animación implementada.
4. Se capturó a **390 × 320** con Chromium y se abrió `sketch-390.png` antes de continuar. La primera captura falló por longitud del socket; el reintento con temporal relativo produjo un PNG de **2762 bytes**.
5. Revisión visual cualitativa del boceto: cinco contornos distinguibles sobre un horizonte bajo, mucho espacio libre arriba. No pretende medir una respuesta humana cronometrada de tres segundos. No se perdió un contorno a 390 px.
6. **§2:** se buscaron las firmas. `convert(input, options)` en `from-image.mjs:85` decodifica imagen local; `applyTreatment` está en `overlays.mjs:598`; `serializeScene` en `image-pipeline.mjs:655` requiere `scene.converted`; `renderFrame(scene, frame)` en `engine.mjs:523` evalúa `scene.field(x, y, time)`.
7. Se constató que la skill no define el paso de campo procedural por capas a los datos de conversión/serialización, ni una alternativa procedural. **Parada.** No se convirtió el boceto en arte final, no se fabricó el objeto interno y no se saltó directamente al renderer. §§3–6 se analizaron documentalmente para registrar huecos, no se ejecutaron como pruebas de una escena inexistente.

## Veredicto por fila de §4

La numeración corresponde al orden de las seis filas originales; la tabla de la skill no trae identificadores propios.

| Nº | Fila / umbral de la skill | Veredicto | Número observado y evidencia |
|---|---|---|---|
| 1 | Legibilidad: capturas 1280 y 390; se entiende en 3 s | **NO MEDIBLE** | **0/2** capturas finales del motor. Hay **1** captura del boceto a **390 × 320** (`sketch-390.png`), revisada, pero no sustituye las capturas de escena ni acredita 3 s. |
| 2 | Contraste: pares texto/fondo usados ≥ 4,5:1 | **NO MEDIBLE** | **0** pares de texto/fondo final evaluados; razón **N/D**. No se implementó el footer ni se recibió su texto. El boceto no se usa para atribuir contraste al resultado final. |
| 3 | Determinismo: dos corridas byte-idénticas | **NO MEDIBLE** | **0/2** corridas de generador de escena; bytes/hashes **N/D**. No existe generador procedural derivado de la skill. No se compara el SVG consigo mismo. |
| 4 | Coste: frame dinámico Node y navegador ≤ presupuesto de cadencia | **NO MEDIBLE** | **0** frames medidos en ambos entornos. Mediana, p90, media, p95 y peor: **N/D**. El presupuesto en ms/fps tampoco está fijado por la skill ni el encargo; no se inventó un límite ni una aserción. |
| 5 | Saturación: celdas en tono máximo < 5 % | **NO MEDIBLE** | **0** frames evaluados; fracción **N/D**, **no 0 %**. Sin escena/celdas generadas no hay denominador válido. |
| 6 | Sin JS: captura con scripting off; nunca rectángulo vacío | **NO MEDIBLE** | **0** capturas de escena con scripting off. Existe navegador, pero no página ni poster generado por el motor tras la parada. El SVG del boceto no se presenta como fallback. |

**Total: 0 PASS, 0 FAIL de escena, 6 NO MEDIBLE.** No significa que el motor pase o falle: no se alcanzó una escena medible. El hallazgo es de suficiencia del flujo de la skill para este encargo.

## Entregables presentes y no alcanzados

| Entregable pedido | Estado |
|---|---|
| `sketch.svg`, revisado a 390 px | Presente, junto con `sketch-390.png`. |
| Módulo ESM que importe el motor real | **No alcanzado**: no se inventó la rama procedural omitida en §2. No hay módulo vacío que aparente ser evidencia. |
| `check-skill.mjs` | **No alcanzado**: no hay generador/frame; además falta el presupuesto necesario para afirmar sobre mediana/p90. No se escribió un chequeo verde vacuo. |
| Capturas finales 1280, 390 y sin JS | **No alcanzadas**. No se confunden con la captura previa del boceto. |
| `RESULTADO.md` | Este informe. |
| `HUECOS.md` | Diez huecos, cada uno con qué ocurrió, qué se hizo y enmienda propuesta. |

También se añade `.gitignore` local para excluir los residuos de Chromium. Perfil, configuración, caché y temporales permanecen dentro de la única superficie autorizada. No se borraron ni se leyeron sus bases de datos; no son parte de la evidencia a versionar.

## Captura: comandos exactos y resultados

Ejecutados en primer plano. La primera orden parte de la raíz del repositorio; la segunda cambia su directorio de trabajo dentro de la superficie autorizada. No se usó el perfil personal del navegador.

### Intento 1 — FAIL ambiental

```sh
HOME="$PWD/design-studies/visual-directions/skill-validation" TMPDIR="$PWD/design-studies/visual-directions/skill-validation" XDG_CONFIG_HOME="$PWD/design-studies/visual-directions/skill-validation" XDG_CACHE_HOME="$PWD/design-studies/visual-directions/skill-validation" chromium --headless --no-sandbox --disable-gpu --disable-background-networking --disable-component-update --disable-sync --disable-breakpad --disable-crash-reporter --disable-dev-shm-usage --no-first-run --no-default-browser-check --user-data-dir="$PWD/design-studies/visual-directions/skill-validation/browser-profile" --screenshot="$PWD/design-studies/visual-directions/skill-validation/sketch-390.png" --window-size=390,320 "file://$PWD/design-studies/visual-directions/skill-validation/sketch.svg"
```

Salida observada: código **134**, `FATAL ... Socket path too long` para el `SingletonSocket` temporal. No produjo la captura válida.

### Intento 2 — PASS de captura del boceto, no de escena

```sh
cd design-studies/visual-directions/skill-validation && HOME="$PWD" TMPDIR=. XDG_CONFIG_HOME="$PWD" XDG_CACHE_HOME="$PWD" chromium --headless --no-sandbox --disable-gpu --disable-background-networking --disable-component-update --disable-sync --disable-breakpad --disable-crash-reporter --disable-dev-shm-usage --no-first-run --no-default-browser-check --user-data-dir="$PWD/browser-profile" --screenshot="$PWD/sketch-390.png" --window-size=390,320 "file://$PWD/sketch.svg"
```

Salida observada: código **0**, `2762 bytes written to file .../sketch-390.png`. Se abrió después la imagen con la herramienta de lectura y se revisó a su tamaño nativo de **390 × 320**.

`--no-sandbox` se usó solo en Chromium aislado con un SVG local propio, sin abrir URLs externas; no es una recomendación para navegación general.

## Inspección final del árbol

- `git diff --check`: salida vacía, código **0**. Solo comprueba diffs tracked; **no valida** por sí solo los archivos nuevos de esta entrega.
- `git status --short`: solo aparecen el directorio nuevo de esta entrega y el untracked preexistente `odd/tasks/i16-validacion-skill.md`; no se observan cambios tracked.
- `git status --short --untracked-files=all -- design-studies/visual-directions/skill-validation`: aparecen exactamente los **5** artefactos previstos de esta parada (`.gitignore`, `HUECOS.md`, `RESULTADO.md`, `sketch-390.png`, `sketch.svg`). Los residuos locales del navegador no aparecen como entregables gracias al ignore local.

## Disciplina de pruebas y límites

No hubo cambio de comportamiento ni implementación del motor: se produjo un boceto e informes de una parada. **RED/GREEN no aplicable** a esos artefactos pasivos. El fallo de arranque de Chromium no se presenta como RED de una prueba de escena. No se ejecutaron pruebas Node de determinismo, saturación ni rendimiento, ni se atribuyen resultados que no se observaron. La comprobación proporcional realizada fue abrir y revisar la captura real del boceto antes de §2 y contrastar las firmas permitidas.

## Trazabilidad solicitada: T1 → S1 y S4

- **S1:** evidencia de validación en frío hasta §2, con §1 ejecutado y una parada explícita en el primer callejón sin salida. **No se acredita ejecución completa del flujo ni escena final.**
- **S4:** registro de los diez huecos del método y propuestas de enmienda en `HUECOS.md`, distinguiendo observaciones documentales de ejecución real.
- Se usan los identificadores S1/S4 suministrados por el encargo. Por la restricción del experimento **no se leyó el feature doc**; no se certifica cumplimiento de subcriterios normativos no proporcionados. El orquestador debe contrastar esa trazabilidad con el documento.

## Próximo paso propuesto, no ejecutado

Que el dueño de la skill defina la rama procedural y el presupuesto de cadencia. Luego repetir la validación en frío con esa versión; no continuar este intento apoyándose en conocimiento tácito ni aprobar una escena sin mediciones.
