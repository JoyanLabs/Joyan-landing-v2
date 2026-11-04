# Plan del sistema visual

De identidad a entrega, con qué prueba cada fase y qué decisión humana la cierra.
Estado al escribir: fase 0 casi cerrada, fase 1 sin empezar.

## Por qué existe este documento

Las últimas semanas avanzamos por pruebas sueltas: un atlas de color, una comparación de suelos, una página de muestra. Cada pieza fue útil, pero sin un mapa es imposible saber si el conjunto alcanza o si estamos puliendo una parte mientras el resto sigue sin decidir.

Este plan ordena eso. Cada fase responde **una pregunta distinta**, deja **un entregable concreto** y se cierra con **una decisión humana**. Una fase no empieza si la anterior no está decidida, salvo que la decisión sea explícitamente "seguimos con la hipótesis actual y revisamos al final".

## Fase 0 — Identidad

**Pregunta:** ¿Qué hace reconocible a Joyan cuando no hay animación?

**Estado:** casi cerrada.

**Decidido:**
- Dirección cromática **H1 Marea mineral**: siete escalones de petróleo a celadón.
- Dos suelos con física distinta: el oscuro emite, el papel absorbe.
- Suelo de la página: **híbrido** — portada oscura, cuerpo de papel.
- El punto redondo como material; Michroma como firma.
- Narrativa: construir con máquinas sin delegar el juicio. Territorios: inferencia, trazabilidad, seguridad.

**Entregado:**
- `design-studies/visual-directions/assets-kit/PALETA.md` — tokens, roles, contrastes medidos, CSS y JSON.
- `design-studies/visual-directions/assets-kit/PROMPTS.md` — bloque de estilo, descriptor de figura, once prompts, bloque negativo.
- Rodaja vertical en tres suelos: `slice-negro`, `slice-papel`, `slice-hibrido`.

**Falta decidir:** la **tipografía de lectura**. Hoy el cuerpo usa la sans del sistema. Michroma sola no sostiene párrafos.

**Cierra cuando:** los tokens y el suelo están aprobados y hay una display elegida con una muestra comparada.

## Fase 1 — Sistema

**Pregunta:** ¿El lenguaje se puede repetir sin que yo improvise cada sección?

**Entregable:** reglas escritas más un muestrario de componentes en el navegador.

1. **Tipografía:** escala modular, jerarquías, medida de línea, comportamiento de Michroma en tamaños chicos.
2. **Retícula y espacio:** unidad base, márgenes, cuándo se rompe la retícula.
3. **Componentes:** enlace de texto, acción principal, antetítulo numerado, bloque de figura con epígrafe, póster editorial, cita, tabla simple.
4. **Reglas del punto:** radio y densidad por viewport, modos de dither disponibles (`bayer4`, `bayer8`, `blue`, `none`, y evaluar `bayer2` coarse), cuándo el punto es material y cuándo es adorno.
5. **Movimiento:** una sola escena protagonista, contenido siempre legible, `prefers-reduced-motion` como estado de primera clase.

**Cómo se verifica:** muestrario navegable, contraste de cada par en uso, revisión en 390/768/1440, y una prueba de "fuera de contexto": cada componente debe funcionar en una página cualquiera.

**Cierra cuando:** puedo construir una sección nueva sin inventar decisiones de color, tipo o espacio.

## Fase 2 — Página real

**Pregunta:** ¿La identidad aguanta una página entera, con movimiento y contenido de verdad?

**Entregable:** la página *próximamente* bilingüe, sobre el suelo híbrido.

1. **Reveal sobre papel:** el arco actual emite luz; sobre papel tiene que **absorber tinta**. Es otra lógica, no un cambio de color.
2. **Escena con densidad en runtime:** el re-escalado de móvil hoy son dos archivos estáticos; en producción tiene que ser una regla.
3. **Sección de territorios:** acá entra la idea de diagrama que vimos en las skills isométricas y en *Neon Diagrams*: explicar inferencia → trazabilidad → seguridad como un sistema, no como tres tarjetas.
4. **Imágenes generadas:** con el kit de prompts, revisadas una por una.
5. **Metadatos y OG** con la identidad nueva.
6. **Copy bilingüe** definitivo.

**Cómo se verifica:** LCP y CLS en Chromium, capturas en Firefox de escritorio y móvil, `prefers-reduced-motion`, versión sin JavaScript, contraste medido sobre la composición real, y una tablet física.

**Cierra cuando:** una persona ajena puede decir qué hace Joyan sin que se lo expliquemos, y la página no promete nada que no esté decidido.

## Fase 3 — Verificación y presupuesto

**Pregunta:** ¿Podemos entregar esto sin que se degrade la próxima vez?

**Entregable:** los chequeos actualizados y los presupuestos re-medidos.

- Presupuesto de JavaScript y CSS en gzip, con el límite de la landing intacto o re-negociado de forma explícita.
- Generadores deterministas: repetir el comando devuelve los mismos bytes.
- Gate de alcance ajustado a la página nueva.
- Verificación independiente antes de cada commit de unidad.

## Fase 4 — Entrega

**Pregunta:** ¿Cómo llega esto a `main` sin arrastrar meses de historia?

**Entregable:** una rama corta desde `main`, commits por unidad de trabajo, PR con alcance declarado.

- La PR #14 actual transporta sólo herramientas y documentación: no incluye nada de este rediseño.
- El material de estudio (`design-studies/`) no va a `main` como producto: se archiva o se convierte en documentación de diseño.
- Los worktrees temporales se limpian después de rescatar lo que valga.

## Lo que estamos probando, y cómo sabemos que falla

| Fase | Hipótesis | Se refuta si |
| --- | --- | --- |
| 0 | La calidez mineral y los dos suelos dan identidad sin recurrir al código visual de IA. | La página se ve como cualquier landing oscura con acento turquesa. |
| 1 | El sistema alcanza para construir secciones nuevas sin improvisar. | Cada sección nueva exige una decisión de color o de tipo que no está escrita. |
| 2 | El híbrido sostiene el relato: portada que emite, cuerpo que documenta. | La transición se siente como dos páginas pegadas o el cuerpo pierde tensión. |
| 2 | El diagrama de territorios explica mejor que tres tarjetas. | Se lee como decoración o exige una leyenda para entenderse. |
| 3 | Los presupuestos aguantan con el motor y las imágenes. | Hay que subir el límite por tercera vez sin poder explicar por qué. |

## Lo que no vamos a probar

- **Tríadas y tétradas** con tres acentos de igual peso: ya sabemos que nos devuelven a la dispersión que rechazamos.
- **ASCII literal en la portada:** pelea con Michroma y con el punto redondo. Queda para 404 o loader.
- **Dithering de superficies 3D (Dither3D):** es una técnica para mallas; nuestro hero es 2D. Se toma el principio de densidad estable, no el código.
- **Generar tipografía con imágenes:** Michroma se compone, no se genera.

## Riesgos abiertos

- **Tipografía:** sin display elegida, la identidad depende sólo del color y del punto.
- **Navegador:** Firefox se verifica con capturas manuales; no hay matriz automatizada.
- **Evidencia dispersa:** parte del material histórico vive en `dist-motion-verify/` (ignorado por Git) y ya se perdió por sobrescritura. Lo que importe tiene que quedar en `docs/`.
- **Alcance:** las imágenes generadas y el diagrama son las dos piezas con más probabilidad de desviar la entrega.
