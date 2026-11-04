---
name: joyan-escenas
description: >
  Flujo para diseñar, probar y entregar escenas del motor de puntos de Joyan antes y después de tocar código.
  Trigger: crear o mejorar una escena, portar una imagen al motor, preparar referencias para otro agente.
license: MIT
metadata:
  author: JoyanLabs
  version: "1.2"
  scope: [root]
  auto_invoke: "Creando o mejorando escenas del motor de puntos"
---

# Escenas del motor de puntos

Este skill captura lo aprendido iterando: **cómo probar antes de generar**, qué assets hacen falta, qué
licencias mirar y qué errores ya nos costaron una tarde.

## 1 · Antes de tocar el motor: boceto

Nunca se empieza por el campo procedural. Se empieza por un **boceto barato** que responda la pregunta
visual, y se descarta sin culpa.

1. **Boceto en SVG** (líneas o contornos): sirve para decidir composición y escala, no textura.
2. **Regla de los tres segundos:** si el boceto no se entiende sin texto, la escena no está pensada.
3. **Una capa por decisión.** Base, estructura, sujeto, recorrido, eventos. Si una capa no se justifica
   sola, sobra.
4. **Se mira el boceto en 390 px antes de seguir.** Lo que se pierde en móvil no se recupera en el motor.
   Captura real, no a ojo: Chromium CLI con perfil y temporales aislados y **cortos** (un `Socket path too long`
   mata la corrida desde rutas absolutas largas: corré desde el directorio del estudio con `TMPDIR=.`).
   Boceto y entrega **declaran su relación de aspecto y su política móvil** (escala proporcional, sin crop) antes
   de aprobar la composición; la captura final usa ese mismo encuadre.

```bash
chromium --headless --disable-gpu --no-sandbox --user-data-dir=./browser-profile \
  --screenshot=sketch-390.png --window-size=390,320 file://"$PWD"/sketch.svg
```

## 2 · Del boceto al motor

El pipeline **mide tinta**, así que el arte fuente va **en tinta sobre claro**:

- Fondo **transparente** se mide como tinta: aplanalo sobre blanco o el campo sale entero entintado.
- El blanco del boceto/arte de entrada es **composición**, no suelo: el motor es una **primitiva de suelo
  oscuro** (contrato WU108, pineado) y normaliza contra el tono del suelo de la paleta. Un suelo claro es
cosa del consumidor (una sola inversión), no una opción del motor.
- La **paleta la pone la escena**, no el archivo. No hace falta que el SVG traiga color.

Hay **dos recetas**, y se elige antes de escribir código:

### 2A · Escena desde imagen

`convert()` → `applyTreatment()` → `serializeScene()` → renderer. Módulos reales:
`convert` en `scripts/scene-src/from-image.mjs`, `applyTreatment` en `overlays.mjs`, `serializeScene` en
`image-pipeline.mjs`, `renderFrame` en `engine.mjs`. Nunca se dibujan puntos a mano para "representar" el
motor: o lo dibuja el motor o no es evidencia.

### 2B · Escena procedural por capas (sin imagen)

No existe `scene.converted`: el campo va directo. Escena mínima que `renderFrame(scene, frame)` acepta:

```js
import { renderFrame } from '../../../scripts/scene-src/engine.mjs';

const scene = {
  id: 'mi-escena', label: 'Mi escena',
  cols: 200, rows: 100, fps: 30, cycleFrames: 360,   // ciclo de 12 s
  palette: ['#020405', '#B4CABE' /* ...tonos de la escena */],
  ground: 0,                                          // ÍNDICE del tono de suelo (el más oscuro)
  field(x, y, time) {                                 // motor discretiza él: capa = tinta por celda, nunca píxeles
    // x e y son CELDAS ENTERAS en [0, cols-1] / [0, rows-1]; normalizá vos si querés fracción.
    // El escalar comparte el ESPACIO TONAL del motor (no es una fracción libre):
    //   tone = groundTone + ink * (maxTone - groundTone)   con ink 0..1 relativo a esta paleta
    // Devolver [r,g,b] también vale; el motor usa luma() y cuantifica.
    return /* tone o [r,g,b] */;
  },
};
const frame = renderFrame(scene, index);              // { steps, indices, time, cols, rows }
```

El motor discretiza él: la capa declara **tinta por celda**, nunca píxeles. Ejecutable de referencia:
`design-studies/visual-directions/lab/scene-constelacion2.mjs`. Si el suelo NO es el tono más oscuro de la
paleta, la normalización colapsa a paso 0 por diseño (contrato, no bug).

**Del campo al píxel** (`renderFrame` devuelve peldaños e índices, no imagen): horneá el póster con
`rasterize()` (mismo motor) → PNG para el `<img>` del fallback sin JS. En el navegador, pintá el canvas con
`ImageData/putImageData`; el póster debe ser visible por defecto y el canvas sólo después de una pintura
válida. Póster y canvas comparten el mismo motor: nunca dos verdades.

## 3 · Animación

- Todo término animado debe ser **2π-periódico** en `t/T`, con fase por elemento.
- Los eventos raros llevan **envolvente explícita** (subida → sostén → bajada) que valga **cero** en los dos
  extremos del loop. Sin envolvente, el loop tiene un salto.
- Estado (estelas, historiales) **no** converge solo: si el loop cierra con memoria, hay que decidir si se
  calienta dos ciclos o si se mide la continuidad en secuencia continua, no comparando dos renders.
- La animación va por **tiempo en segundos**, no por contador de frames: si el pintado baja, se saltean
  frames; si va por contador, el loop se estira.
- Adaptador: `renderFrame(scene, frame)` calcula `time = index / scene.fps` con `index` módulo
  `cycleFrames`. El período en segundos es **`T = cycleFrames / fps`**: cada término animado usa
  `sin(2π·t/T + fase)` o equivalente. `EVENT_WINDOWS` (si la escena los usa) son **fases normalizadas**
  0..1 del ciclo, no segundos.

## 4 · Medición obligatoria

| Qué | Cómo | Umbral |
|---|---|---|
| Legibilidad | capturas 1280 y 390 miradas por un **evaluador independiente** (que no participó de la iteración), consigna ciega: mostrar cada captura sin nombre ni explicación y registrar su respuesta literal. Definir antes qué descripciones del sujeto son aceptables | reconoce el sujeto sin texto en 3 s; sin evaluador, la evidencia técnica se entrega con **legibilidad pendiente** y la escena no se aprueba |
| Contraste | por par texto/fondo realmente usado | ≥ 4,5:1; sin texto en la escena: no aplica |
| Determinismo | dos corridas **independientes** del chequeo Node (mismos frames pineados) | salida byte-idéntica (`frameChars` o PNG) |
| Coste | frame dinámico en Node y en navegador. Benchmark pineado: 60 frames de calentamiento + 240 muestras dinámicas, buffers reutilizados, resolución nativa; Node mide `renderFrame`+`rasterize`, el navegador añade `putImageData`; el frame frío se reporta aparte. Se afirma sobre mediana y p90, se reporta media/p95/peor | ≤ **16,67 ms** (60 fps) salvo presupuesto distinto pineado en el encargo |
| Saturación | peor frame de los índices muestreados del ciclo (para ciclos chicos, barrer todos): celdas con `step === último peldaño de la rampa` / celdas totales. **Control obligatorio de escena no vacía** y un control saturado que dé 100 % | < 5 % |
| Sin JS | captura con scripting off; el fallback es el **póster horneado por el mismo motor**, nunca un canvas vacío. La página expone `data-state="ready"` + hash al estar lista, y `data-state="error"` si una importación falla (un éxito que nunca llega no puede dejar una promesa colgada); «esperar por estado» no prohíbe un timeout de seguridad | nunca un rectángulo vacío |

Para servir en navegador: 4402 sirve `design-studies/visual-directions`, 4403 la raíz del repo (una página
que importa `scripts/scene-src/*` **sólo funciona desde 4403**). Se espera por **estado** (hash o atributo),
nunca por tiempo.

## 5 · Assets: qué generar y qué pedir

- **Fotos o escenas de imagen generada**: sirven como **referencia de luz y materia**, no como arte final.
  Se convierten con el pipeline y se aceptan solo si sobreviven al dither.
- **Contornos SVG para mapas o figuras**: es el mejor camino para formas reconocibles (una ciudad, un
  edificio, una silueta). Para Arequipa: OSM (**ODbL**: atribución y licencia compartida en bases derivadas),
  exportes HOT/AGSL o `microsoft/SouthAmericaBuildingFootprints`.
- **Nunca**: pedirle al generador de imágenes que dibuje la retícula. La retícula la pone el motor; la imagen
  aporta la silueta.

## 6 · Trampas que ya nos costaron tiempo

1. Un **escritor por archivo**: dos agentes sobre el mismo módulo se pisan.
2. `EVENT_WINDOWS` son **fases normalizadas**, no segundos: un parser que asume segundos devuelve cero
   ventanas y la prueba da verde sin cubrir nada.
3. Un test que compara **dos renders independientes** no mide continuidad: mide equivalencia.
4. Medir tiempo de pared con la máquina cargada produce falsos rojos: se afirma sobre **mediana y p90** y se
   reporta media/p95/peor.
5. Un verificador con `waitForFunction` de 30 s **flaquea**: se espera por **estado** (hash o atributo), no
   por tiempo.

## 7 · Para delegar a otro agente

Hay dos encargos, y se nombran:

- **Exploración:** el agente **produce y revisa** el boceto (§1) y sigue la receta 2A o 2B.
- **Implementación:** se recibe un **boceto aprobado** y no se reinterpreta.

En ambos casos el encargo lleva: la **regla de los tres segundos**, los **umbrales** de §4 (con el presupuesto
de coste si no es el pineado), las **fuentes y licencias** de los assets, la **receta elegida** (2A/2B) y qué
**no** se toca. Sin eso, el agente inventa — y lo que inventa no es verificable.
