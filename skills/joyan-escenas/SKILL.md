---
name: joyan-escenas
description: >
  Flujo para diseñar, probar y entregar escenas del motor de puntos de Joyan antes y después de tocar código.
  Trigger: crear o mejorar una escena, portar una imagen al motor, preparar referencias para otro agente.
license: MIT
metadata:
  author: JoyanLabs
  version: "1.0"
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

## 2 · Del boceto al motor

El pipeline **mide tinta**, así que el arte fuente va **en tinta sobre claro**:

- Fondo **transparente** se mide como tinta: aplanalo sobre blanco o el campo sale entero entintado.
- La **paleta la pone la escena**, no el archivo. No hace falta que el SVG traiga color.
- Si la escena tiene suelo claro, **no** se invierte dos veces: la paleta claro→oscuro se usa tal cual y la
  inversión, si hace falta, vive **una sola vez en el consumidor**.

Pasos: `convert()` → `applyTreatment()` → `serializeScene()` → renderer. Nunca se dibujan puntos a mano
para "representar" el motor: o lo dibuja el motor o no es evidencia.

## 3 · Animación

- Todo término animado debe ser **2π-periódico** en `t/T`, con fase por elemento.
- Los eventos raros llevan **envolvente explícita** (subida → sostén → bajada) que valga **cero** en los dos
  extremos del loop. Sin envolvente, el loop tiene un salto.
- Estado (estelas, historiales) **no** converge solo: si el loop cierra con memoria, hay que decidir si se
  calienta dos ciclos o si se mide la continuidad en secuencia continua, no comparando dos renders.
- La animación va por **tiempo en segundos**, no por contador de frames: si el pintado baja, se saltean
  frames; si va por contador, el loop se estira.

## 4 · Medición obligatoria

| Qué | Cómo | Umbral |
|---|---|---|
| Legibilidad | capturas 1280 y 390, miradas | se entiende en 3 s |
| Contraste | por par texto/fondo realmente usado | ≥ 4,5:1 |
| Determinismo | dos corridas del generador | byte-idénticas |
| Coste | frame dinámico en Node y en navegador | ≤ presupuesto de cadencia |
| Saturación | celdas en tono máximo | < 5 % |
| Sin JS | captura con scripting off | nunca un rectángulo vacío |

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

Un encargo de escena se entrega con: el **boceto**, la **regla de los tres segundos**, los **umbrales** de
§4, las **fuentes y licencias** de los assets, y qué **no** se toca. Sin eso, el agente inventa — y lo que
inventa no es verificable.
