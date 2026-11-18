# Identidad visual de Joyan: dirección actual

Guía de lectura para adaptar a nuevas piezas el lenguaje visual explorado en la landing. **Corte: 2026-11-05.** Resume decisiones existentes; no constituye un manual de marca integral ni aprueba identidades nuevas para productos.

## Alcance y fuentes

La referencia principal es la [estética de la constelación](ESTETICA-CONSTELACION.md), aprobada como dirección del hero el 2026-10-29. Esa guía conserva también mediciones, cambios históricos y objetivos pendientes: no todo lo que describe es una capacidad verificada. Para encargar imágenes, usar además el [brief de generación](BRIEF-IMAGENES-PRODUCTO.md).

| Estado | Qué significa aquí |
|---|---|
| Aprobado | Dirección oscura de la constelación y elección tipográfica para la landing. |
| Referencia de implementación | Valores y técnicas de una maqueta; no implican que toda interfaz de producto esté aprobada. |
| Abierto | Adaptación a productos, paleta clara, colores generales de secciones y cualquier identidad específica de producto. |

## Concepto visual

La escena evoca espacio profundo, nebulosa y constelaciones, pero se construye como **materia de puntos con profundidad**, no como una fotografía astronómica ni una textura plana. La caja negra, los nodos y sus conexiones pueden sugerir un sistema, relaciones y trazas; son lenguaje visual, no una afirmación sobre capacidades reales de un producto.

- **Profundidad por capas:** cielo de puntos, lavado atmosférico, figura de nodos y enlaces, viñeta y núcleos de luz. La figura tiene jerarquía y convive con capas posteriores visibles.
- **Luz contenida:** la mayor parte del campo permanece oscura; los focos se concentran en puntos y zonas puntuales. Evitar un velo de color uniforme.
- **Dither y densidad:** puntos discretos de tamaños y densidades variables forman volumen, brillo y transiciones tonales. Buscar lectura de material, no ruido digital aleatorio ni una cuadrícula decorativa idéntica en todo el campo.
- **Composición:** espacio negativo y contraste para aislar el sujeto; atmósfera a sangre en la referencia del hero. En producto se puede variar el encuadre sin obligar a repetir el hero.

Las proporciones de paralaje, filtros y demás números del hero pertenecen a esa implementación y no son especificaciones para una imagen generada. Para restricciones y mediciones consultar la fuente principal.

## Color: qué está decidido y qué no

| Referencia | Valores | Estado y uso |
|---|---|---|
| Campo oscuro del hero | `#020405` base; `#B4CABE` tinta | Referencias documentadas de la dirección aprobada. No exigen que cada píxel tenga estos valores. |
| Familia de la emisión del estudio | `#060B0D`, `#0A1114`, `#10191C`, `#183039`, `#244C5B`, `#346E7B`, `#4D9199`, `#73B7B0`, `#94CCBB`, `#A8D3BA`, `#D5E5CF`, `#EAF3E6` | Escala de la implementación en [`scene-constelacion2.mjs`](../design-studies/v1/scene-constelacion2.mjs), no una lista de doce colores obligatorios para una imagen ni tokens de producto. |
| Interfaz de la maqueta v1 | `#10191C` fondo, `#182A30` superficie, `#E4EEEA` texto, `#ACC3C1` texto secundario, `#94CCBB` acento | Valores implementados en [`v1.css`](../design-studies/v1/v1.css); la dirección dejó abiertos algunos verdes de secciones. No declarar esta tabla paleta universal aprobada. |
| Papel y superficies claras | Sin selección final | La dirección clara explorada fue rechazada; no es obligatoria. No usarla como aprobación vigente. |

El documento de estética habla de **siete tonos** como criterio visual; la emisión implementada declara la escala extendida de doce valores indicada arriba. Son referencias de distinta naturaleza: no asumir que el documento describe literalmente el array actual del código. Para imágenes, preservar la familia y jerarquía, no forzar una cuenta de colores.

El ámbar se reserva en la guía de la constelación para gates y estados vivos; no introducirlo como acento decorativo por defecto. El acento existente no debe cambiarse por interpretar que se pidió enriquecer los fondos.

## Tipografía y marca

La [decisión tipográfica](DECISION-TIPOGRAFIA.md) para la landing usa Michroma 400 en titular principal y firma, y Archivo para subtítulos y lectura. Es una referencia aplicable con criterio, no un sistema de interfaz de producto ya validado.

El wordmark vectorial disponible está en [`public/assets/brand/joyan-wordmark-michroma-outlines.svg`](../public/assets/brand/joyan-wordmark-michroma-outlines.svg). Su existencia no establece reglas de uso o licencias para cada pieza. Para imágenes finales con texto o marca precisos, componerlos después con assets verificados en lugar de depender del texto generado por IA.

## Evitar

- Campo homogéneo de estrellas o ruido como reemplazo de capas y composición.
- Glow excesivo, gradientes radiales SaaS genéricos o glassmorphism.
- Colores chillones o nuevos acentos que desplacen la dirección oscura sin aprobación.
- Interfaces ficticias, logotipos deformados o funcionalidades inventadas presentadas como producto real.
- Tratar el papel claro, la serie de escenas o una estructura de página histórica como decisiones universales vigentes.

## Referencias y límites

- [Estética de la constelación](ESTETICA-CONSTELACION.md): dirección aprobada, decisiones y límites técnicos.
- [Decisión tipográfica](DECISION-TIPOGRAFIA.md): roles de Michroma y Archivo y riesgos.
- [Maqueta del hero](../design-studies/v1/index.html): referencia visual del estudio, no página final de producción.
- [Paleta Marea mineral](../design-studies/visual-directions/assets-kit/PALETA.md): estudio histórico útil para rastrear colores; su propuesta de cuerpo papel no representa la decisión posterior.
- [Manual de diseño anterior](../archive/DESIGN.md): contratos de otra etapa de la landing; no tomarlo por sí solo como guía del lenguaje de constelación actual.
- Skills relacionados: [joyan-escenas](../archive/joyan-escenas/SKILL.md) y [scene-iteration](../archive/scene-iteration/SKILL.md).

**Mantenimiento:** revisar este resumen cuando se aprueben decisiones de identidad de producto, color o dirección visual; registrar la decisión y su fuente, sin promover exploraciones a aprobaciones por omisión.
