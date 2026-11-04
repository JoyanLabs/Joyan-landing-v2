# Decisión tipográfica de Joyan

## Decisión

Estado: decidido por la dirección del proyecto y aplicado como variante.
Michroma + Archivo reemplaza la recomendación anterior de Instrument Serif + Archivo; su revisión queda registrada abajo.

| Nivel | Familia y peso | Tamaño y medida |
|---|---|---|
| Titulares (h1) | Michroma 400 | Techo de 80 px, antes 92 px; tracking −0.03 em; móvil: `clamp(30px, 7.6vw, 52px)`. |
| Firma | Michroma 400 | Tamaño actual: no medido. |
| Subtítulos (h2) y póster | Archivo 500 | `clamp(26px, 3vw, 42px)`. |
| Lectura | Archivo 400 | 17 px; medida ~60ch. |

Michroma no se usa como texto de lectura ni en subtítulos.

## Revisión

- Recomendación anterior del agente padre: Instrument Serif 400 para titulares y Archivo 400 para lectura; Michroma quedaba como firma a ~20 px, wordmark, etiquetas pequeñas en mayúsculas y footer; etiquetas/métricas funcionales en monospace.
- Se probó para separar «criterio», mediante el contraste y los terminales de la serif, de «máquina», ya expresada por el motor de puntos. Archivo separaba la lectura del gesto del titular.
- Instrument Serif resolvía mejor el ancho: 13,41 em frente a 23,93 em en Michroma. Se aplicó como variante recomendada, pendiente de confirmación humana, no como decisión final.
- El registro anterior advertía del riesgo de que el cuerpo perdiera presencia bajo el display serif y señalaba que los acentos en mayúsculas de Instrument Serif se apiñaban a 40 px; se recomendó no bajar el cuerpo de 17 px ni usar líneas de display enteramente en mayúsculas. Eran riesgos de la recomendación anterior, no motivos para descalificar la serif.
- Tamaños históricos de esa variante, no vigentes: escritorio `clamp(52px,7.4vw,112px)`; bajo 900 px `clamp(46px,11.4vw,74px)`.
- Tras ver ambas familias aplicadas, la dirección eligió Michroma: es la voz de la máquina y la dirección la prefiere.
- Con Michroma también en h2 (24–38 px), la jerarquía se aplana y los subtítulos se ensanchan; restringida a h1 + firma, el sistema vuelve a leerse. Observación en capturas a 1440 y 390.
- La recomendación de Instrument Serif + Archivo queda revertida. Instrument Serif sigue como opción no adoptada si se busca una voz más editorial.

## Por qué

- Michroma cuesta ancho: la frase ocupa 23,93 em, frente a 13,41 em en Instrument Serif, 17,86 em en Archivo y 18,67 em en Space Grotesk.
- A 92 px, su línea más ancha ocupa 737 px de una columna de 900 px: 81,9 %. A 80 px queda cerca del 70 %.
- El coste compositivo se controla bajando el techo de 92 px a 80 px y limitando Michroma a h1 + firma; Archivo asume subtítulos y lectura.
- La altura de x no basta para decidir: Archivo supera a Space Grotesk, pero no a Michroma ni a la sans del sistema. No se mantiene la generalización anterior de que Archivo tenga la «mayor altura de x».

## Qué se probó y qué se descartó

La anchura corresponde a la misma frase, medida desde los archivos de fuente.
La altura de x es la proporción de tinta de «x» a 1000 px.
La última medida compara la línea más ancha a 92 px con una columna de 900 px.
Se conservan los números de la tabla anterior; las cifras ajenas al brief son históricas. Su comprobación en esta revisión: no medido.

| Candidata | Frase (em) | Altura de x | Línea / columna | Resultado y motivo |
|---|---|---|---|---|
| Michroma | 23,93 | 0,563 | 81,9 % | Se conserva como titular y firma; se baja el techo y se restringe su papel por anchura. |
| Space Grotesk | 18,67 | 0,500 | 62.3% | Descartada; el registro anterior indicaba menor tamaño percibido y una voz de producto técnico. |
| Archivo | 17,86 | 0,532 | 58.8% | Se conserva para lectura a 400 y pasa a subtítulos y póster a 500. |
| Instrument Serif | 13,41 | 0,516 | 44,3% | Opción no adoptada; resolvía mejor el ancho y queda disponible para una voz más editorial. |
| sans del sistema | 18.62 | 0,547 | no medido | Control; no se adopta. |

Muestra de cuerpo: 58 palabras, 61–75 caracteres por línea, medida 59ch, interlineado 1,65.
La longitud de línea no es idéntica entre familias a igual 59ch.
El registro anterior atribuyó a Chromium el redondeo de `ch` a píxeles enteros y documentó columnas de 413 px con Instrument Serif a 590 px con Space Grotesk; comprobación actual: no medido.

## Coste

Dos familias en el sistema elegido: Michroma ya estaba; Archivo se suma. Instrument Serif no se incorpora al sistema elegido.

| Archivo de fuente | Payload | Pesos disponibles en el archivo |
|---|---|---|
| Michroma | 17 908 B | Solo 400; monopeso. |
| Archivo | 34 928 B | Variable 100–900. |
| Instrument Serif | 21 032 B | Estático 400; opción no adoptada. |
| Space Grotesk | 22 288 B | Variable 300–700; descartada. |

Los cuatro archivos son OFL 1.1; los textos de licencia están en `design-studies/visual-directions/typo/`.
El payload corresponde a cada archivo, no a una medición de transferencia de la página; transferencia del sistema elegido: no medido.

## Riesgos abiertos

| Riesgo | Restricción o comprobación |
|---|---|
| Michroma es ancha y monopeso. | La jerarquía depende del tamaño y del color; techo de 80 px y uso solo en h1 + firma. |
| Mayúsculas largas en tamaños pequeños. | No usarlas con Michroma. |
| El titular móvil queda en ~30 px, en el límite. | Se prevé subirlo a ~34 px; todavía sin decidir. |
| Se necesita un tercer nivel de jerarquía. | No se resuelve con Michroma; solución: no medido. |
| La medida en ch cambia físicamente entre familias. | Volver a comprobar contra una columna fija en píxeles si el layout deja de ser fluido. |

## Qué implica

- Sustituir la recomendación, no borrar su historia: h1 y firma con Michroma 400; h2 y póster con Archivo 500; lectura con Archivo 400 a 17 px.
- La elección de familias está decidida por la dirección; el posible ajuste móvil a ~34 px sigue abierto.
- La revisión documental no modifica código, fuentes, estilos ni páginas de estudio; no implica cambios de paleta, motor de puntos ni los dos fondos.

## Evidencia

| Evidencia | Ubicación y límite |
|---|---|
| Variante Michroma aplicada | `design-studies/visual-directions/slice-hibrido-michroma.html` y `tipo-michroma.css`. |
| Estudio comparativo | `design-studies/visual-directions/typo/index.html`. |
| Variante de la recomendación anterior | `design-studies/visual-directions/slice-hibrido-tipo.html`. |
| Capturas Michroma | `dist-motion-verify/wu46-michroma-01/`; carpeta ignorada por Git, no es evidencia durable. |
| Capturas del estudio anterior | `dist-motion-verify/wu41-typo-01/`; carpeta ignorada por Git, no es evidencia durable. |

Verificación histórica aportada para el estudio anterior: comprobaciones estructurales 18/18; página sin JavaScript ni estilos inline; HTTP 200 para página, hoja de estilos y cuatro archivos de fuente en `http://127.0.0.1:4402/typo/...`.
Estos resultados se conservan como antecedentes; no se repiten verificaciones de red en esta tarea.
No hay test RED: el cambio es exclusivamente documental.
La verificación de este registro comprueba cifras, tamaños por nivel, revisión, opción serif no adoptada y menos de 200 líneas.
