# Jueces ciegos sobre la constelación — I-18

Dos jueces ciegos (`jd-judge-a`, `jd-judge-b`) sobre la misma evidencia, sin verse entre sí y sin poder
arreglar nada. Contrato: `docs/ESTETICA-CONSTELACION.md`. Evidencia: capturas `after-*` en
`dist-motion-verify/wu130-planes/` y `RETENTION-after.md`.

**Limitación que ambos declararon:** juzgaron capturas estáticas y reportes, **no la pieza viva**. No pueden
verificar paralaje, idle a 12 Hz, transición de 1200 ms, traza del enlace, vuelta a los 7000 ms ni pausa.

## Resuelto en esta sesión

| Hallazgo | Juez | Qué era | Arreglo |
|---|---|---|---|
| **JD-B-001** (alto) | B | El anillo de foco «nunca atenuado» era falso: `opacity: 1` en un hijo **no cancela** la opacidad del grupo padre, así que en los planos `middle`/`back` el anillo seguía atenuado | El grupo ya **no lleva opacidad**; la atenuación vive en el cuerpo de la estrella (`.node-plane g > :not(.ring)`), y el anillo queda fuera. Re-medido: todo PASS |
| **JD-B-004** (bajo) | B | Columnas de percentiles mal rotuladas en `RETENTION-*.md`: decían «p50 base / foco» y contenían p50/p95 del mismo estado | Rótulo corregido a «p50 / p95 base» y «p50 / p95 foco» |

## Abiertos — requieren decisión de dirección

1. **JD-A-001 (importante) · El desenfoque del plano trasero casi no se percibe.** El contrato pide desenfoque
   al plano más lejano y, para la cámara, escala 0→6 px (cielo) y 0→2,5 px (lavado). La escalera aplica
   **0,8 px** al plano `back`: a 1:1 la diferencia se lee como atenuación, no como pérdida de nitidez.
   *Decisión:* subir el radio del escalón (y re-medir coste) o aceptar que el peso del efecto es la
   atenuación y corregir el contrato.
2. **JD-A-002 + JD-B-003 (importante) · El contrato dice dos cosas distintas sobre el foco.** «Movimiento y
   vida» fija figura/núcleos en **0 px** con desenfoque horneado y **sin filtros vivos**; «Capas y foco» pide
   atenuar/desaturar planos intermedios y desenfocar el más lejano, que es lo que hace `filter` vivo.
   Además, al enfocar un nodo lejano el desenfoque cae sobre el plano **más cercano**: el código lo resuelve
   como profundidad de campo *centrada en el nodo*, pero el documento no relativiza la frase al nodo.
   *Decisión:* qué significa «el plano más lejano» (¿del stack o del nodo enfocado?) y qué superficies admite
   cada especificación.
3. **JD-A-003 (menor) · El cielo conserva media copia nítida en foco** (`opacity: .5`), así que el extremo
   0→6 px se percibe a la mitad.
4. **JD-A-004 (menor) · El header dibuja una línea de 1 px de borde a borde** sobre una escena que prohíbe
   «marco, borde o caja visible».
5. **JD-A-006 (menor) · El anillo de 2,5 px tiene baja percepción a 1:1** contra el núcleo encendido. Ya no se
   atenúa (JD-B-001), pero sigue siendo sutil.
6. **JD-A-007 (menor) · A 390, el foco deja la constelación pegada a los bordes** y los controles pisan la
   esquina inferior.
7. **JD-B-002 (medio) · Cobertura de la medición de retención.** Los tres planos de nodo se midieron sólo a
   1280 y siempre enfocando el nodo 0; no hay planos de nodo medidos a 390 ni con otros planos seleccionados.
   El umbral se cumple en lo medido; lo que falta es cobertura antes de llamarlo certificación general.
8. **JD-B-005 (informativo) · Números normativos sin medición identificable** en el documento: siete tonos,
   4–8 tonos distinguibles, viñeta 1,000/0,928/0,773 y el 4–6 % de luminancia media (que el propio documento
   aclara que mide intensidad sRGB, no WCAG). Marcar cada uno como medido o no medido.
9. **JD-A-005 (vigilancia) · El lavado sube en foco** (0,2135 → 0,2986 de media) y aparecen manchas suaves que
   rozan el glow genérico prohibido. No es incumplimiento hoy; es zona a vigilar.

## Lo que los jueces confirmaron bien

- Los planos **no se aplanan** al enfocar: retención 0,865–1,107, todos ≥ 0,40, ningún plano oculto.
- No hay readouts instrumentales, ni tarjetas con borde y sombra, ni campo uniforme, ni ámbar fuera de gates.
- Contraste del texto: 9,93:1 (1280) y 12,92–14,39:1 (390), sobre el umbral 4,5:1.
- Reduced-motion aplica el foco sin animación, idéntico a los 400 ms.

## Log

- **L1** (2026-11-05, verbatim): «vake sobre los issues que comentas que faltan me gustaria trabajarlos y tambien
  trabajar en mejorar y validar correctamente la skill de joyan escenas antes de pasarle a angie las tareas ,
  osea todo debe de estar listo lo que anotamos para que angiue pruebe trabajando en una escena , sonbre images
  y eso no te preocupes eso sera en otra sesion no aqui solo queria el promt para hacerlo con el contexto del
  proyecto , bueno vamos sigamos con tu recomendacion continuemos»
