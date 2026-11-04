# La serie de cuatro escenas — restructura para el motor

Pauta de dirección de arte recibida de la otra sesión. Este documento la convierte en decisiones construibles: qué comparte la serie, qué cambia entre escenas y qué tiene que resolver el motor.

**Regla que manda:** cada escena se entiende en tres segundos y sin una sola palabra. Si necesita texto, la escena está mal pensada.

## Lo que comparten las cuatro

| Elemento | Decisión | Por qué |
| --- | --- | --- |
| Encuadre | 16:9, cámara fija, mismo horizonte | Sin esto se leen como cuatro ilustraciones |
| Material | Solo puntos: la densidad es la única herramienta de peso | Es lo que el motor ya sabe hacer |
| Escala | La arquitectura es grande; lo humano es mínimo (2–3 puntos) | La escala es el argumento |
| Luz | Fría, de un lado, sin brillos especulares | Coherente con el sistema |
| Prohibido | Robots, candados, medallas, engranajes, flechas | La tecnología se sugiere por comportamiento |
| Ritmo | Distinto en cada escena (quietud → destrabe → ritmo → acumulación) | El tempo es la emoción de la serie |

## Las cuatro, como especificación

**1 · El nudo — el diagnóstico.** Acueducto en tres tramos. En el del medio, cinco o siete piezas demasiado juntas: puntos tan densos que se leen como mancha. Detrás, agua quieta; delante, cauce vacío. El nudo gira y **se destraba**; el agua arranca en oleadas y llena el canal. Termina con las piezas ordenadas a los costados.
*Conclusión buscada:* «eso estaba trabado y ahora fluye».

**2 · La máquina habitada — la integración.** Máquina de tres pisos, vista de arriba y de costado, dos tercios del ancho, interior visible. Una estación por piso y **un operario por estación**: cuatro en total, cada uno de dos o tres puntos. Una ficha de trabajo viaja de estación en estación; cada operario la recibe con un gesto breve. La cuarta la deja en una bandeja que se llena.
*Conclusión buscada:* «ahí adentro trabaja alguien».

**3 · La llave — la confianza.** Malla de doce nodos en hexágonos, en perspectiva suave, apagada. Puerta maciza cerrada, sin manija. Una llave de cinco puntos se acerca desde la izquierda, toca el nodo central y la malla **se enciende en cascada**; cuando el último anillo enciende, la puerta gira y se abre hacia adentro. La llave queda, gastada.
*Conclusión buscada:* «con la llave correcta, la red te abre el paso».

**4 · El registro — la trazabilidad.** La máquina de la escena 2, más baja y a la izquierda. Libro abierto grande a la derecha, con ocho fichas ya pegadas y dos sellos esperando. Una ficha recorre la cinta, **recibe un sello en dos tiempos** y se pega. Cuando la página se completa, el ritmo se detiene y el libro se cierra.
*Conclusión buscada:* «cada acción queda en un registro sellado, y el registro es mío».

## Cómo lo resuelve el motor

El motor dibuja un campo por celda y resuelve un frame por instante; eso alcanza para las cuatro si se acepta una regla: **cada escena es un campo, no un dibujo importado**. La densidad sale del campo, nunca de una imagen convertida.

- **Geometría**: cada escena define su propio reparto de zonas (canal, pisos, malla, libro) sobre la misma retícula.
- **Peso**: la densidad de puntos es la única variable de jerarquía; no se usa color para separar masas.
- **Tiempo**: cada escena tiene un ciclo propio; el «giro» es un tramo del ciclo, no un efecto aparte.
- **Silencio**: donde no pasa nada, el campo baja a casi cero. El vacío es parte del dibujo.

## Respuestas a las cuatro preguntas del brief

1. **¿Se lee como el mismo lugar?** Todavía no: hoy no existe ninguna. Con encuadre, horizonte y escala fijos, sí. Es la primera cosa que hay que construir y la primera que hay que verificar.
2. **¿Alguna necesita texto?** Las cuatro pueden entenderse sin texto **si el antes y el después caben en el mismo cuadro**. La 3 es la más frágil: una malla que se enciende puede leerse como «red de datos» y no como «acceso». Se resuelve con la puerta, no con una etiqueta.
3. **¿La 4 comunica registro y no vigilancia?** Solo si el sello es un gesto de papel y el libro se cierra. Si el libro es infinito y las fichas no se detienen, se lee vigilancia.
4. **¿Cuál se puede quitar?** Mi respuesta: **la 1**. Es la más metafórica y la que menos sostiene una promesa; su mensaje —«algo estaba trabado»— es el más débil de los cuatro. Pero es el mejor gancho para una portada, así que la decisión no es estética: es de qué se quiere hablar primero.

## Orden de construcción propuesto

1. **Escena 2** primero: fija el lugar, la escala y la relación máquina/persona que las otras tres reutilizan.
2. **Escena 4**: reutiliza la máquina, así que el costo baja y se comprueba que la serie comparte lugar.
3. **Escena 3**: la más austera y la más difícil de sostener sin texto.
4. **Escena 1**: el movimiento más complejo (quietud → destrabe → caudal).

Cada una se verifica igual: se lee sin texto, en móvil, quieta y animada; si al apagar la animación no queda nada, la escena no está pensada.
