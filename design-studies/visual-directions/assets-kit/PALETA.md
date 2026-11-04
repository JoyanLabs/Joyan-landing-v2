# Paleta — Marea mineral (H1)

Sistema de color de Joyan para la dirección elegida: siete escalones de petróleo a celadón sobre dos suelos, uno oscuro donde la escena emite luz y uno de papel donde la tinta la absorbe.

## Tabla de contenidos

- [Resumen ejecutivo](#resumen-ejecutivo)
- [Los dos suelos](#los-dos-suelos)
- [Tokens de rol](#tokens-de-rol)
- [Valores exactos](#valores-exactos)
- [Contraste medido](#contraste-medido)
- [Los siete escalones no son siete colores de interfaz](#los-siete-escalones-no-son-siete-colores-de-interfaz)
- [Emparejamiento luz / papel](#emparejamiento-luz--papel)
- [Reglas de proporción](#reglas-de-proporción)
- [CSS para copiar](#css-para-copiar)
- [JSON para copiar](#json-para-copiar)
- [Notas finales](#notas-finales)

## Resumen ejecutivo

La interfaz usa **cinco tokens por suelo**: fondo, superficie, texto, texto secundario y señal. La **rampa de siete escalones** pertenece a la imagen —el motor de puntos, las escenas, los degradados de densidad— no a la interfaz. Son dos vocabularios distintos que comparten familia cromática: el rol dice dónde puede aparecer algo; el escalón dice qué tan iluminado está un punto de la escena.

Todos los valores de este documento están medidos y en uso. La tarea de esta pieza no es proponer color, sino fijar el que ya existe para que Angie, el motor de puntos y la landing hablen del mismo sitio. Ningún hexadecimal fue ajustado, redondeado ni "mejorado" al transcribirlo: si algo parece dudoso, está anotado al final y el valor se dejó intacto.

La página será un hero oscuro con cuerpo de papel. Eso no significa "modo oscuro con secciones claras": significa que cada sección declara su suelo y se comporta en consecuencia, y que la transición entre ambos es un acontecimiento de la página, no un accidente de scroll.

## Los dos suelos

**Suelo oscuro.** Es el suelo de la observación. Fondo de tinta profunda, la escena de puntos emite luz sobre él, el texto se lee como luz sobre materia. Aquí vive el hero y los momentos donde la máquina está haciendo algo y queremos verlo.

**Suelo de papel.** Es el suelo del documento. Fondo de papel cálido, la tinta absorbe, la escena de puntos se lee como una impresión y no como una emisión. Aquí vive el cuerpo: explicación, método, territorios, notas.

Reglas duras:

- Un bloque declara un suelo y no mezcla el otro dentro. Nada de tarjetas oscuras flotando en el cuerpo de papel.
- Los tokens de un suelo no cruzan al otro. El texto de papel sobre fondo oscuro no se usa, y el texto claro sobre papel tampoco.
- La rampa de un suelo no se usa en el otro. Son el mismo recorrido visto con distinta física: emitir o absorber.

## Tokens de rol

Cinco roles por suelo. La columna "puede" describe el uso previsto; la columna "no puede" es la parte que evita el desorden.

| Rol | Puede | No puede |
| --- | --- | --- |
| **fondo** | El campo completo de una sección; el área mayor de la página; la base bajo la escena de puntos. | Ser color de texto. Ser relleno de un bloque pequeño (para eso está superficie). |
| **superficie** | Bloques elevados: panel, cita, tabla, bloque de código, cabecera de tabla, ficha de dato. | Ser el fondo de una sección entera: el escalón respecto al fondo es corto y como campo pierde sentido. Ser color de texto. |
| **texto** | Titulares, cuerpo, cualquier texto que deba leerse de corrido. | Ir sobre un escalón de la rampa. Ir sobre la parte más densa de la escena sin una zona limpia detrás. |
| **texto secundario** | Pies de figura, notas, metadatos, antetítulos, numeración de sección, texto de apoyo. | Párrafos principales o frases que el lector deba retener. Sustituir a texto por comodidad. |
| **señal** | Enlaces, foco de teclado, índice activo, subrayados, un trazo, un borde, un punto. Dosis pequeñas. | Rellenar bloques grandes. Dos zonas de señal contiguas compitiendo. Ser el color por defecto de un párrafo. |

La **señal** es un acento, no una marca de agua: aparece cuando algo está activo, señalado o vivo, y desaparece cuando no lo está. Si una pantalla necesita dos señales para explicarse, el problema es de jerarquía, no de color.

## Valores exactos

### Suelo oscuro

| Token | Valor | Uso |
| --- | --- | --- |
| fondo | `#10191C` | campo de la sección, base de la escena |
| superficie | `#182A30` | paneles y bloques elevados |
| texto | `#E4EEEA` | titulares y cuerpo |
| texto secundario | `#ACC3C1` | pies, notas, metadatos |
| señal | `#94CCBB` | enlaces, foco, índice activo |

Rampa de escena, de sombra a luz:

| Escalón | Valor | Lectura |
| --- | --- | --- |
| 1 | `#183039` | sombra profunda, casi indistinguible del fondo |
| 2 | `#244C5B` | sombra |
| 3 | `#346E7B` | sombra media |
| 4 | `#4D9199` | medio |
| 5 | `#73B7B0` | medio alto |
| 6 | `#A8D3BA` | luz |
| 7 | `#D5E5CF` | luz máxima, borde iluminado |

### Suelo de papel

| Token | Valor | Uso |
| --- | --- | --- |
| fondo | `#F2EFE7` | campo de la sección |
| superficie | `#E4E0D6` | paneles y bloques elevados |
| texto | `#15191A` | titulares y cuerpo |
| texto secundario | `#4B5658` | pies, notas, metadatos |
| señal | `#1C6B61` | enlaces, foco, índice activo |

Rampa de escena, de sombra a luz:

| Escalón | Valor | Lectura |
| --- | --- | --- |
| 1 | `#1B2B2C` | tinta densa |
| 2 | `#2A4342` | tinta |
| 3 | `#3B5B59` | tinta media |
| 4 | `#547674` | medio |
| 5 | `#7C9895` | medio claro |
| 6 | `#ADC0BB` | claro |
| 7 | `#D8DFDA` | casi papel |

La rampa de papel no es la de oscuro aclarada: recorre el mismo camino de color con la lógica invertida del medio. Se lee como impresión, con los puntos claros comiendo papel en lugar de encenderlo.

## Contraste medido

Medido por la dirección del proyecto, no recalculado aquí. Se cita tal cual porque es el dato de origen del sistema.

| Suelo | Combinación | Contraste |
| --- | --- | --- |
| oscuro | texto sobre fondo | 15.04:1 |
| oscuro | texto secundario sobre fondo | 9.62:1 |
| oscuro | señal sobre fondo | 9.86:1 |
| papel | texto sobre fondo | 15.41:1 |
| papel | texto secundario sobre fondo | 6.59:1 |
| papel | señal sobre fondo | 5.50:1 |

Dos consecuencias que se siguen de la tabla, sin añadir cálculos nuevos: en el suelo oscuro los cinco tokens tienen margen de sobra, así que el límite ahí es de composición, no de legibilidad. En papel la señal es la combinación más justa del sistema, y por eso se reserva para marcas cortas y textos breves en lugar de párrafos.

## Los siete escalones no son siete colores de interfaz

Este es el punto que más se malinterpreta al heredar una rampa de una escena.

- La rampa modela la imagen. Un escalón es una posición en el relieve de luz: dónde está un punto del campo de puntos, no qué función cumple un elemento.
- No se asigna un escalón a un botón, a un enlace ni a un estado. Los estados se hacen con los cinco roles.
- La rampa **oscura es decorativa**. Puede iluminar un fondo, un borde, una figura, el motor de puntos. **Nunca se usa como color de texto pequeño**: el escalón 7 sobre el fondo parece texto, pero no es texto.
- La rampa de papel tampoco es tipografía. Es tinta: manchas, densidades, marcas impresas.
- Fuera de la escena, como mucho dos escalones planos a la vez. Una rampa repartida en la interfaz deja de ser una imagen y se convierte en una paleta de siete colores, que es exactamente lo que este sistema no es.

Si alguien necesita un séptimo color de interfaz, la respuesta correcta es casi siempre superficie o texto secundario, no un escalón.

## Emparejamiento luz / papel

El mismo escalón de la escena, leído en los dos suelos. Sirve para pasar una imagen de un suelo al otro sin cambiar de familia.

| Escalón | Suelo oscuro (emite) | Suelo de papel (absorbe) |
| --- | --- | --- |
| 1 — sombra profunda | `#183039` | `#1B2B2C` |
| 2 — sombra | `#244C5B` | `#2A4342` |
| 3 — sombra media | `#346E7B` | `#3B5B59` |
| 4 — medio | `#4D9199` | `#547674` |
| 5 — medio alto | `#73B7B0` | `#7C9895` |
| 6 — luz | `#A8D3BA` | `#ADC0BB` |
| 7 — luz máxima | `#D5E5CF` | `#D8DFDA` |

Roles equivalentes entre suelos:

| Uso | Suelo oscuro | Suelo de papel |
| --- | --- | --- |
| campo | `#10191C` | `#F2EFE7` |
| bloque elevado | `#182A30` | `#E4E0D6` |
| lectura | `#E4EEEA` | `#15191A` |
| apoyo | `#ACC3C1` | `#4B5658` |
| acento | `#94CCBB` | `#1C6B61` |

Los acentos **no** son el mismo color con otro brillo: el de papel es más profundo y más verde porque tiene que sobrevivir sobre un campo claro. No se intercambian.

## Reglas de proporción

La proporción es lo que hace que el sistema se lea como material y no como plantilla.

1. **La mayor parte de la página es fondo y texto.** Si se fotografía una sección en miniatura, debe dominar un solo color de campo y una masa de texto. Todo lo demás es excepción.
2. **Superficie en bloques, no en franjas.** Un panel, una cita, una tabla. Nunca una sección entera alternativa que convierta la página en un damero.
3. **La señal en dosis pequeñas.** Un acento visible por pantalla es lo normal; dos es el máximo razonable, y no compitiendo. El acento gana fuerza por escasez.
4. **La rampa solo dentro de la imagen.** El motor de puntos, las figuras, los fondos de escena. No en botones, no en gráficos de datos de interfaz, no en iconos de estado.
5. **El texto siempre en zona limpia.** Sobre una escena de puntos, el titular se apoya en la zona de menor densidad o en un degradado de densidad vacío. Ni opacidad ni velo: se compone el campo para que el texto respire.
6. **Un suelo por sección.** El cambio de oscuro a papel marca un cambio de capítulo. Si aparece dos veces en la misma pantalla, ya no marca nada.
7. **El borde no es un color de la paleta.** Las separaciones se resuelven con espacio, alineación y densidad de puntos antes que con líneas de color.

## CSS para copiar

Propiedades personalizadas listas para pegar. La rampa se indexa de 1 a 7 en orden sombra → luz; en los archivos de estudio la misma rampa aparece indexada como r0–r6.

```css
/* Joyan — Marea mineral (H1) */

.suelo-oscuro {
  --fondo: #10191C;
  --superficie: #182A30;
  --texto: #E4EEEA;
  --texto-secundario: #ACC3C1;
  --senal: #94CCBB;

  /* rampa de escena: solo imagen, nunca texto */
  --rampa-1: #183039;
  --rampa-2: #244C5B;
  --rampa-3: #346E7B;
  --rampa-4: #4D9199;
  --rampa-5: #73B7B0;
  --rampa-6: #A8D3BA;
  --rampa-7: #D5E5CF;

  background: var(--fondo);
  color: var(--texto);
}

.suelo-papel {
  --fondo: #F2EFE7;
  --superficie: #E4E0D6;
  --texto: #15191A;
  --texto-secundario: #4B5658;
  --senal: #1C6B61;

  /* rampa de escena: solo imagen, nunca texto */
  --rampa-1: #1B2B2C;
  --rampa-2: #2A4342;
  --rampa-3: #3B5B59;
  --rampa-4: #547674;
  --rampa-5: #7C9895;
  --rampa-6: #ADC0BB;
  --rampa-7: #D8DFDA;

  background: var(--fondo);
  color: var(--texto);
}
```

## JSON para copiar

Mismos valores, con las llaves que ya usan los archivos de estudio, para pegar en otra herramienta sin retipear hexadecimales.

```json
{
  "direccion": "Marea mineral (H1)",
  "suelo-oscuro": {
    "fondo": "#10191C",
    "superficie": "#182A30",
    "texto": "#E4EEEA",
    "texto-secundario": "#ACC3C1",
    "senal": "#94CCBB",
    "rampa": [
      "#183039",
      "#244C5B",
      "#346E7B",
      "#4D9199",
      "#73B7B0",
      "#A8D3BA",
      "#D5E5CF"
    ],
    "lectura": "Luz sobre fondo oscuro: la escena emite."
  },
  "suelo-papel": {
    "fondo": "#F2EFE7",
    "superficie": "#E4E0D6",
    "texto": "#15191A",
    "texto-secundario": "#4B5658",
    "senal": "#1C6B61",
    "rampa": [
      "#1B2B2C",
      "#2A4342",
      "#3B5B59",
      "#547674",
      "#7C9895",
      "#ADC0BB",
      "#D8DFDA"
    ],
    "lectura": "Tinta sobre papel: la escena absorbe."
  },
  "contraste-medido": {
    "oscuro": { "texto": "15.04:1", "secundario": "9.62:1", "senal": "9.86:1" },
    "papel": { "texto": "15.41:1", "secundario": "6.59:1", "senal": "5.50:1" }
  }
}
```

## Notas finales

Ningún valor fue cambiado. Lo que sigue son observaciones de uso, para que la dirección decida con el dato a la vista.

1. **La superficie oscura es un paso muy corto desde el fondo.** Como campo no se distingue; como bloque sí, y funciona bien cuando el bloque tiene contenido propio. Consecuencia práctica: los límites entre fondo y superficie deben venir del espacio y de la densidad, no de esperar que el contraste haga el trabajo.
2. **La señal de papel es la combinación más justa del sistema.** 5.50:1 sobre fondo basta para texto normal, pero es poco margen. Se reserva para marcas cortas y etiquetas breves, y se mantiene sobre el fondo antes que sobre la superficie: sobre la superficie el margen se reduce y aquí no se ha recalculado.
3. **El escalón 7 de la rampa oscura es más claro que el texto secundario.** Un borde muy iluminado junto a un pie de figura compite con él. Los dos escalones altos conviene mantenerlos lejos de los bloques de texto.
4. **Hay un token de línea en los archivos de estudio que no forma parte de este kit.** Se usa para separaciones internas de las muestras. Aquí no se documenta como parte de la paleta: si el sistema necesita una línea, la decisión sigue abierta y no es una invención de esta pieza.

---

**Versión**: 1.0
**Última actualización**: 2026-10-22
**Mantenedor**: JoyanLabs
**Skill asociado**: [documentation](../../../skills/documentation/SKILL.md)
