# Skill lista y encargo de prueba para Angie

Dejar `skills/joyan-escenas` **mejorada y validada de verdad** y el encargo de la escena de prueba listo, para
que Angie pueda probar el flujo trabajando en una escena sin depender de nosotros.

## Specs

- **S1.** «trabajar en mejorar y validar correctamente la skill de joyan escenas antes de pasarle a angie las tareas»
- **S2.** «osea todo debe de estar listo lo que anotamos para que angiue pruebe trabajando en una escena»
- **S3.** «sonbre images y eso no te preocupes eso sera en otra sesion no aqui» — el brief de imágenes queda
  fuera de alcance: ya está escrito y no se trabaja acá.
- **S4.** «vamos sigamos con tu recomendacion continuemos» — la recomendación del orquestador: cerrar el
  lenguaje antes del puerto, y verificar la skill antes de delegar.

## Contexto

I-16 (2026-11-03) validó la skill en dos corridas y publicó las enmiendas v1.2. Pero **v1.2 nunca se probó**:
las enmiendas nuevas (receta de póster, señal `ready`/`error`, benchmark pineado, saturación ejecutable,
protocolo de evaluador ciego, política móvil) se escribieron después de la única corrida exitosa, que corrió
sobre v1.1. Una skill cuyo último cambio nadie ejecutó sigue siendo una hipótesis.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|---|---|---|---|---|
| T1 | Registrar las dos skills de escenas en las tablas de `AGENTS.md` (descubribilidad) | S1, S2 | inline | chore(skills) |
| T2 | Tercera corrida en frío sobre v1.2: comprobar que las enmiendas nuevas se pueden ejecutar | S1 | worker | feat(skills) |
| T3 | Enmendar lo que destape T2 y fijar la versión final | S1 | inline | feat(skills) |
| T4 | Encargo de prueba para Angie: escena, insumos, umbrales y entregable | S2 | inline | docs(skills) |
| T5 | Cerrar la referencia que Angie necesita (escena aprobada + cómo se mide) | S2 | inline | docs |
| T6 | I-17 · difuminado de capas al enfocar como sistema | S4 | worker | feat(design-system) |
| T7 | I-18 · jueces ciegos sobre la constelación | S4 | jueces | docs |

## Evidencia

(por completar)

## Log

- **L1** (2026-11-05, verbatim): «vake sobre los issues que comentas que faltan me gustaria trabajarlos y tambien
  trabajar en mejorar y validar correctamente la skill de joyan escenas antes de pasarle a angie las tareas ,
  osea todo debe de estar listo lo que anotamos para que angiue pruebe trabajando en una escena , sonbre images
  y eso no te preocupes eso sera en otra sesion no aqui solo queria el promt para hacerlo con el contexto del
  proyecto , bueno vamos sigamos con tu recomendacion continuemos»
