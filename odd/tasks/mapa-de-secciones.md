# Mapa de secciones (investigación externa)

Base: investigación externa sin usar el material del repo, para no heredar el sesgo del mazo. Fuentes al final.

## El hallazgo que resuelve el problema de la copia

El error no fue «hablar de lo que tenemos»: fue usar **etiquetas de estado y disclaimers** como sustituto de
prueba. La práctica documentada para una empresa sin casos públicos no es ocultar la etapa ni listar lo que falta,
sino reemplazar la prueba social por **arquitectura de credibilidad** (marco SCOPE):

- **S · Nombrar la situación.** Describir la realidad del visitante con precisión tal que se sienta entendido.
  Sustituye al «gente como yo ya lo usa».
- **C · Claridad del mecanismo.** Explicar exactamente cómo funciona, paso por paso. Sustituye al «ya lo resolvieron».
- **O/P/E · Especificidad, consistencia y transparencia.** Cifras puntuales y verificables, presentación cuidada,
  comunicación sin nada que esconder.

Regla que se desprende: **la credibilidad viene de la especificidad del mecanismo, no del inventario de
capacidades.** Y lo honesto etiquetado sube la credibilidad en vez de bajarla: «From our private beta» funciona
porque explica por qué no hay logo pagando; una etiqueta «pendiente» en cada servicio no explica nada y lee como
producto inacabado.

Corolario de estructura: cada sección **responde una sola pregunta** que el visitante se hace, en el orden en que
se la hace. La prueba va en el medio de la escalera; el riesgo va al lado del pedido, al final.

## Orden y mapa propuesto

Ruta del visitante: **entender → validar → explorar → confiar → actuar.** Ocho secciones, ni una más sin trabajo.

| # | Sección | Trabajo único | Tipo de titular | Prueba que carga |
|---|---|---|---|---|
| 1 | Hero + campo | ¿Qué es esto y para quién? | Afirmación con tensión | El mecanismo en una frase que se pueda repetir |
| 2 | Qué construimos | ¿Cómo funciona, exactamente? | Afirmación | Mecanismo desarmado en tres piezas, no una lista de servicios |
| 3 | Un flujo completo | ¿Cómo se ve en la práctica? | Recorrido | Un caso narrado de punta a punta: agente actúa → persona aprueba → queda registro |
| 4 | Dónde no delegamos | ¿Qué se queda de mi lado? | Postura | El límite dicho como criterio, no como advertencia legal |
| 5 | Qué vas a poder reconstruir | ¿Qué gano concretamente? | Promesa medible | Niveles de evidencia explicados como capacidad futura concreta |
| 6 | Territorios (escena del motor) | ¿Es un sistema o tres tarjetas? | Tensión | Inferencia, trazabilidad y seguridad como un solo sistema vivo |
| 7 | Por qué existe esto | ¿Quiénes son y por qué les creo? | Historia vivida | El problema que vivimos nosotros, no un CV |
| 8 | Contacto | ¿Qué hago ahora? | Invitación | Un pedido único; el riesgo y lo que pasa después, al lado |

Reglas del mapa:
- Máximo **ocho**; si una sección no responde una pregunta distinta, se fusiona o se va.
- La **prueba va antes que el precio del cambio**: nunca pedir contacto antes de haber mostrado mecanismo y flujo.
- Ninguna sección se define por lo que le falta a la empresa.

## Reglas del hero (campo a sangre con puntos)

- El titular responde «qué es esto y para quién» en **una frase repetible**; si el visitante no puede repetirla, falló.
- Longitud: **≤ 90 caracteres** en el titular; entrada de **≤ 220**. Medida de la entrada 60–70 caracteres.
- Contraste medido **sobre cualquier celda** del campo, no sobre el promedio: **≥ 4,5:1** para texto normal y
  **≥ 3:1** para texto grande. El velo se dimensiona contra el peor caso, no contra el centro calmo.
- Escala tipográfica con salto extremo (**≥ 10:1** entre titular y cuerpo) para que el hero no dependa de la imagen.
- El campo puede ser el fondo, nunca el argumento: nada de readouts instrumentales sobre la página.

## Técnicas anti-caja (para que la página no sea un stack de rectángulos)

1. **Retícula con líneas nombradas**: `[full-start] … [content-start] repeat(12, 1fr) [content-end] … [full-end]`,
   con los hijos por defecto en `content` y sangrado opt-in en `full`. Permite que una sección rompa el contenedor
   sin trucos de márgenes negativos.
2. **Asimetría real**: columnas de ancho desigual; el peso se reparte por tensión, no por simetría.
3. **Planos que se solapan**: una pieza del motor se superpone al bloque siguiente y lo interrumpe; el texto rodea
   la figura en vez de quedar al lado.
4. **Escala y peso variables**: cada ítem recibe tratamiento proporcional a su peso narrativo. Prohibido el grid de
   tarjetas iguales, los bordes de tarjeta y las sombras de tarjeta.
5. **Cortes a sangre**: entre secciones, una franja del motor ocupa toda la ventana y vuelve al contenido denso.

Cuándo falla: el sangrado indiscriminado y las superposiciones sin jerarquía producen ruido y bajan la lectura; el
plano solapado necesita un borde de contraste o un cambio de suelo para saber dónde termina.

## Lo que no se hace

- Etiquetas de estado por servicio («probado», «especificado», «sin entrega», «sin MVP»).
- Grid de tarjetas iguales con borde y sombra.
- Preloader con contador, carrera de logos vacía, testimonios inventados, «coming soon».
- Pedir el contacto antes de mostrar mecanismo y flujo.
- Listas de siglas sin glosa en el primer uso.
- Ilustraciones genéricas de SaaS para representar conceptos que el motor puede mostrar de verdad.

## Fuentes

- Estructura por decisión y orden de secciones: <https://www.missingpiecestudio.co/blog/agency-website-design-best-practices-for-high-converting-websites>
- Cada sección responde una pregunta, en orden; prueba en el medio y riesgo junto al pedido: <https://torn.studio/en/insights/how-to-structure-a-landing-page-that-converts>
- Plan de secciones por pregunta de decisión: <https://www.vasuyashii.com/blog/landing-page-for-website-development-leads-full-section-plan>
- Sitemap de estudio y trabajo como artefacto central: <https://neutrino.website/agency-studio/>
- Credibilidad sin prueba social (marco SCOPE): <https://heycatch.ai/blog/how-to-build-homepage-credibility-without-social-proof>
- Sustitutos honestos de prueba en etapa temprana: <https://proofshow.com/blog/what-to-put-on-your-landing-page-before-you-have-any-customers> · <https://landingdoctors.com/guides/social-proof-swipe-file-few-customers>
- Credibilidad de startup (prueba, especificidad, consistencia, transparencia): <https://www.sitesgo.com/blog/startup-website-credibility-guide> · <https://tribedesignworks.com/blog/startup-homepage-design-structure>
- Asimetría y escala: <https://www.andrew-brundle.com/articles/asymmetric-website-design-layouts.php> · <https://chrislemke.github.io/website_designs/designs/Editorial_Magazine_Layout.html>
- Retícula full-bleed con líneas nombradas: <https://developer.chrome.com/docs/modern-web-guidance/guides/css/css-layout>
- Sin grid de tarjetas uniformes / tratamiento por peso narrativo: <https://github.com/breadboard-ai/breadboard/blob/main/spikes/ea-refinement/skills/editorial-skill.md>
- Contraste de texto sobre imagen o video: <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html> · <https://www.accessarmada.com/blog/i-need-an-accessible-hero/>

## Decisiones abiertas para el usuario

1. ¿Este mapa de ocho secciones es el que querés, o hay que mover alguna pieza?
2. Las secciones 3 y 7 necesitan material que hoy no existe en la maqueta: un flujo narrado y una historia de
   origen. ¿Se escriben con lo que hay, o me pasás el material?
3. ¿La copia actual se retira ya (página sólo con hero y marcadores) o queda visible mientras construimos?
