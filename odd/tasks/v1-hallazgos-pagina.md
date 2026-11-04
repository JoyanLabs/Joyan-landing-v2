# Hallazgos abiertos de la v1

Los cuatro puntos que WU119 dejó abiertos más dos defectos que el re-chequeo de esta sesión destapó.
Superficie: `design-studies/v1/` (maqueta aislada, `noindex`). No se toca `src/`.

Rama `test/motion-graphics`. Perfil `joyan-sol`: worker `openai/gpt-6.1-sol` high.

## Specs

- **S1 · Rótulo del control.** El grupo se rotula «**suelo**», no «fondo»: `docs/PLAN-SISTEMA-VISUAL.md`
  llama «suelo» al estado de superficie (oscuro / papel) y el copy del sistema no usa «fondo» para eso.
  Texto accesible del grupo y visible, coherentes; los botones siguen diciendo «oscuro» y «papel».
- **S2 · CTA y contacto.** La página no tiene hoy ninguna vía de contacto. Se usa el contacto que el
  repositorio ya declara en `src/pages/index.astro` (`contactEmail="hello@joyan.dev"`): un enlace
  `mailto:hello@joyan.dev` al final del cuerpo, antes de la firma. **Prohibido** inventar precios, pilotos,
  formularios, teléfonos ni agendas; **prohibido** el ámbar de marca (reservado a gates y estados vivos).
  El enlace debe pasar contraste 4,5:1 en ambos suelos y tener foco visible.
- **S3 · Placa en papel.** «la placa en papel queda pálida por construcción»: radios y rampa se pensaron
  para emisión sobre negro. La figura tiene que leerse como **tinta sobre papel**, no como mancha: hoy el
  lavado de la escena se lee como dos manchas pardas a los lados. Se corrige el tratamiento de la placa en
  suelo papel (tinta más densa, lavado que no ensucie). No se cambia la geometría ni los centros de la
  escena: los dos suelos siguen siendo la misma figura.
- **S4 · Constelación sin JS.** «Sin JS falta la constelación (el póster es sólo el cielo)». Con JavaScript
  desactivado la placa debe mostrar el cielo **y** la constelación. La solución no puede depender de JS.
- **S5 · Frase rota de L4.** El cuerpo de L4 dice hoy «evidencia que una acción con su autorización», frase
  sin verbo. El mazo aprobado (`docs/V1-COPIA.md` §2, L4) dice «evidencia que **vincula cada acción con su
  autorización**». Se copia el mazo, no se reescribe.
- **S6 · Lo que no se puede romper.** Las ocho reglas de `dist-motion-verify/wu114-v1/check-rules.mjs` siguen
  en PASS: firma al final y sin atribución, cero lecturas instrumentales, siglas glosadas en primer uso, los
  tres límites de L3 en el cuerpo, prohibiciones del mazo, estructura y accesibilidad, control de suelo con
  `aria-pressed`, y contraste medido ≥4,5:1 en ambos suelos (mínimo actual 4,76). Cero errores de consola.

## Constraints

- Evidencia en `dist-motion-verify/wu114-v1/` (ignorada por git). No se commitea nada: el árbol ya trae la
  maqueta sin commitear y sacarla de ahí es WU102.
- Visual: no estilos inline, no `any`, componentes bajo 200 líneas.
- El servidor de trabajo es `python3 -m http.server 4403 --bind 0.0.0.0 --directory .` desde la raíz del
  repo: una página que importe `scripts/scene-src/*` **sólo** funciona desde ahí.
- Prohibido `opencode-go` en cualquier perfil.

## Tasks

| ID | Tarea | Specs | Commit |
|---|---|---|---|
| T1 | Rotular el grupo del control como «suelo» | S1 | ninguno (árbol) |
| T2 | CTA de contacto con `mailto:hello@joyan.dev` | S2 | ninguno |
| T3 | Placa en papel: tinta legible, lavado sin mancha | S3 | ninguno |
| T4 | Constelación visible sin JS | S4 | ninguno |
| T5 | Corregir la frase de L4 según el mazo | S5 | ninguno |
| T6 | Re-verificar las ocho reglas y contrastes | S6 | ninguno |

## Evidencia (2026-10-28, worker `gentle-ai-worker` + verificación del orquestador)

| Task | Estado | Evidencia |
|---|---|---|
| T1 · Rótulo «suelo» | hecho | `index.html:18` «Suelo»; el grupo se localiza por ese nombre accesible |
| T2 · CTA | hecho | `index.html:277` `mailto:hello@joyan.dev`; contraste 10,94:1 oscuro / 5,13:1 papel; foco 2 px sólido; verde, no ámbar |
| T3 · Placa en papel | hecho (1ª pasada) | manchas laterales eliminadas: amplitud media del campo 0,15033 → 0,02979 (−80,19 %); NODES/LINKS **byte-idénticos** entre suelos (35 centros, 52 enlaces) |
| T4 · Constelación sin JS | hecho | SVG estático en el HTML: 35 centros y 52 enlaces presentes con JS desactivado, en ambos tamaños |
| T5 · Frase de L4 | hecho | `index.html:142` «…evidencia que **vincula cada acción con su autorización**…» |
| T6 · Ocho reglas | hecho | `check-rules.mjs` 8/8 PASS, 70 pares de contraste, mínimo **4,76** (papel), cero errores; `check-engine-surface` 5/5 |

Verificación independiente del orquestador (no se aceptó el auto-reporte): cero `style="` en el HTML, NODES y
LINKS iguales entre los dos módulos de escena, 8/8 reglas y 5/5 motor re-ejecutados a mano, y capturas
`390x844-{dark,paper}.png`, `390x844-nojs-{dark,paper}.png` y `contact-{dark,paper}-focus.png` miradas.

**Queda abierto (iteración):** el recorte del lavado dejó el campo de puntos de papel casi invisible — el
suelo oscuro se lee como material (emite), el papel quedó como dibujo de línea. Hay que recuperar el punto
sin volver a la mancha: el dial está en la amplitud del lavado (hoy 0,0298) y en la densidad de tinta.

## Log

- **L1** (2026-10-28, verbatim): «vale resolvamos estos hallazgos, sobre los doc que aun faltan dejalos para
  aladirlos despues , resuelve lo que encontraste le parece que son algunas cosas que quedaron pendientrs de
  los hallazgos de los jueces que hicimos revisa eso que tenemos que resolverlo y tambien levanta la pagina
  para ver el avance y tambien resolvamos esto e iremos iterando para mejorar quiero poder ver la pagina desde
  mi ted local osea mi celular asi que verificas eso vamos dale»
- **L2 · Decisión de contacto:** se usa `hello@joyan.dev`, el valor que `src/pages/index.astro:115` ya declara
  como `contactEmail`. No se inventa un destino nuevo. Si el destino debe ser otro (formulario, agenda,
  dominio distinto), se corrige en una línea.
- **L3 · Hallazgo de esta sesión:** WU118 quedó marcado como hecho («corregido en el mazo») pero la frase rota
  de L4 **sigue en la maqueta** (`design-studies/v1/index.html:94`). El mazo sí está bien; faltó propagarlo.
- **Evidencia base (antes de tocar nada):** `probe.json` + `probe-prev.json`; `check-rules.mjs` 8/8 PASS,
  mínimo de contraste 4,76, cero errores. Servidor LAN verificado en `192.168.0.86:4403`.
- **L4 · WU19 #7 sigue abierto:** «textura en zonas planas» (P3, pares planos 0,7760) está documentado en
  `docs/AUDITORIA-ESCENAS.md` y **no se reabrió**: es dither del motor, y tocarlo re-mide el pin que WU104 y
  WU108 están tratando de no mover. Requiere decisión humana, no se cierra por omisión.
- **L5 · Hallazgo de método:** el worker amplió el probe y el checker para construir su RED. El orquestador
  re-ejecutó ambos y verificó además, por fuera del checker, la geometría entre suelos y la ausencia de
  estilos inline, para que el PASS no dependa sólo del instrumento que el propio worker escribió.
