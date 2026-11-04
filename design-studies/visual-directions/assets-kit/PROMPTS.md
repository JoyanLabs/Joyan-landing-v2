# Prompts — imaginario de Marea mineral

Kit de generación de imágenes para Angie, escrito para producir material coherente con el sistema de color de Joyan: la misma familia mineral, el mismo grano, la misma luz, sin importar el encuadre. Once prompts, un bloque de estilo fijo y un bloque negativo.

Las instrucciones están en español. Los prompts van en inglés, en lenguaje natural, porque es lo que mejor entienden los generadores de imagen actuales y porque así no se pierde nada en la traducción. Nada de sopa de parámetros: la imagen se describe, no se configura.

## Tabla de contenidos

- [Cómo se usa](#cómo-se-usa)
- [Bloque de estilo](#bloque-de-estilo)
- [La figura](#la-figura)
- [Familia 1 — La figura femenina](#familia-1--la-figura-femenina)
- [Familia 2 — Manos, objetos, instrumentos](#familia-2--manos-objetos-instrumentos)
- [Familia 3 — Atmósferas y espacios](#familia-3--atmósferas-y-espacios)
- [Bloque negativo](#bloque-negativo)
- [Consistencia entre imágenes](#consistencia-entre-imágenes)
- [Advertencias honestas](#advertencias-honestas)

## Cómo se usa

1. Pegar el **bloque de estilo** y, cuando el prompt lleve persona, el **descriptor de figura**, tal como están escritos. No parafrasear: la repetición literal es lo que mantiene la serie parecida.
2. Pegar el prompt de la familia que se necesite y generar **cuatro candidatos**.
3. Elegir uno, guardarlo con el número de prompt en el nombre del archivo (`p03-a`, `p03-b`…), y descartar el resto. Una imagen elegida sin su número se vuelve imposible de repetir.

## Bloque de estilo

Se pega al inicio de **todos** los prompts, textual. Después de esta sección se referencia como `[STYLE BLOCK]`.

```text
Mineral teal and celadón palette on a deep ink ground or on a warm paper ground, halftone dot texture and fine film grain across the frame, soft directional light from one side, matte surfaces with no specular highlights, restrained contrast with open shadows, quiet cinematic mood, photographic, 35 mm, natural color response, no text or graphic overlays.
```

## La figura

Descriptor único para todas las variantes con persona. Después se referencia como `[FIGURE]`.

```text
An adult woman in her late thirties, a systems engineer who also runs the observation bench: short dark hair tied back, no makeup, thin wire glasses, a plain charcoal work shirt with the sleeves rolled up, calm and attentive, hands occupied with the work rather than posed for the camera.
```

Es una persona con oficio, no un personaje. Lo que la hace creíble es que está haciendo algo con las manos y mirando el trabajo, no la cámara.

## Familia 1 — La figura femenina

### P01 · Plano medio en el borde del taller

```text
[STYLE BLOCK] A medium shot of [FIGURE] standing at the end of a long workbench at the edge of a dark room, a wide screen beside her showing a dense field of pale dots that fades into shadow, one hand flat on the bench, her attention on the field rather than on us, the light coming from the screen at a low angle and leaving the far side of the room in deep quiet shadow. Deep ink ground, no other light source, plenty of empty air on one side of the frame.
```

**Aspect ratio:** 16:9 — hero
**Para qué sirve:** Apertura del hero. Da la persona y la escena en un solo plano, y deja aire a un lado para el titular.

### P02 · Manos y rostro en detalle

```text
[STYLE BLOCK] A close detail of [FIGURE] reading a printed sheet of trace plots, only her hands and the lower half of her face in frame, the sheet held slightly tilted toward the light, her eyes moving down the page, the paper picking up warm light while the room behind stays in ink shadow. The plots read as dot density, not as legible text.
```

**Aspect ratio:** 3:2 — editorial
**Para qué sirve:** Editorial y bloques de método. Concentra la mirada en el gesto de leer, sin enseñar una cara completa que después haya que justificar.

### P03 · Silueta ancha contra el campo de puntos

```text
[STYLE BLOCK] A wide shot of [FIGURE] seen as a small dark silhouette standing off-centre in front of a wall of softly glowing halftone dots, the dot field brightest at its centre and dissolving into the ink ground at the edges, her body calm and upright, no gesture toward the camera. The figure occupies a small part of the frame; the field is the subject and the silence around her is part of the image.
```

**Aspect ratio:** 16:9 — hero
**Para qué sirve:** Hero alternativo y fondos de sección. Es la imagen que mejor explica el sistema: la escena emite, la persona observa.

### P04 · Tres cuartos de espaldas

```text
[STYLE BLOCK] A three-quarter back view of [FIGURE], over her shoulder we see the screen she is working on, its light on the edge of her face and the rim of her glasses, the rest of her in dark matte shadow against a deep ink ground, one hand raised slightly as if about to make an adjustment. Quiet, unposed, no sense of performance.
```

**Aspect ratio:** 4:5 — retrato
**Para qué sirve:** Retrato editorial y columnas laterales. La espalda sostiene el texto sin pedir protagonismo.

### P05 · Mesa de papel, luz de día

```text
[STYLE BLOCK] [FIGURE] seated at a plain desk on the warm paper ground, daylight from a tall window falling across printed pages and a pencil in her hand, she is comparing two sheets, brow slightly drawn, the paper absorbing the light instead of glowing. Warm paper palette, soft shadow, no screen in the frame.
```

**Aspect ratio:** 3:2 — editorial
**Para qué sirve:** Cuerpo de la página, que va sobre papel. Muestra la misma persona en el otro suelo del sistema, sin pantalla de por medio.

## Familia 2 — Manos, objetos, instrumentos

### P06 · Manos sobre una pantalla

```text
[STYLE BLOCK] A pair of adult hands resting at the edge of a screen in a dark room, the screen's pale dot field lighting the knuckles and the tendons from below, short unpolished nails, a thin cuff of charcoal cloth at the wrist, everything else in ink shadow. No face, no jewellery, no visible interface chrome on the screen.
```

**Aspect ratio:** 3:2 — editorial
**Para qué sirve:** Ilustra inferencia y decisión con una imagen sin rostro. Reutilizable en varias secciones.

### P07 · Un dispositivo en la mesa de trabajo

```text
[STYLE BLOCK] A single closed device on a workbench, a machined matte metal case the size of a small book with softly rounded edges and one pale indicator dot, sitting on a worn wooden surface next to a coil of cable and a folded cloth. Warm daylight from the left, shallow depth of field, nothing branded, no ports or labels legible, the object calm and finished rather than prototyped.
```

**Aspect ratio:** 3:2 — editorial
**Para qué sirve:** Seguridad y límites. Un objeto cerrado, sin promesas de producto ni marcas inventadas.

### P08 · Una traza impresa

```text
[STYLE BLOCK] A printed trace sheet lying on a warm paper surface, seen slightly from above: a plot made of dot density that darkens where something happened, faint printer texture, the ink sitting in the paper rather than on it, a pencil mark and one small annotation in the margin, no legible words anywhere. Soft raking daylight, fine film grain.
```

**Aspect ratio:** 3:2 — editorial
**Para qué sirve:** Trazabilidad. Muestra un registro que se puede seguir, sin inventar datos ni cifras.

## Familia 3 — Atmósferas y espacios

### P09 · Sala oscura con campo de puntos

```text
[STYLE BLOCK] An empty dark room where a large field of halftone dots glows softly on one wall, brightest in the centre and dissolving into the ink ground at the edges, a long empty bench in the foreground, no people, no furniture clutter, the right third of the frame almost completely dark and open. Calm, patient, nothing happening yet.
```

**Aspect ratio:** 16:9 — hero
**Para qué sirve:** Fondo de sección oscura con zona limpia para texto. Es el suelo del hero, sin figura.

### P10 · Escritorio de papel con marcas de tinta

```text
[STYLE BLOCK] An overhead view of a warm paper desk surface: a few printed sheets arranged slightly out of alignment, soft ink marks and dot densities bleeding into the paper, a pencil, an eraser, a closed notebook, one empty area of clean paper occupying the upper half of the frame. Even soft daylight, matte everything, no people, no legible text.
```

**Aspect ratio:** 3:2 — editorial
**Para qué sirve:** Fondo de sección de papel. El área limpia es donde va el titular.

### P11 · Pasillo de luz suave

```text
[STYLE BLOCK] A quiet corridor of pale plaster with light falling through a side opening, the floor in soft shadow, a door open at the far end letting in one band of daylight, no people, dust faintly visible in the light. Restrained contrast, warm paper tones at the lit end and ink tones in the shadow, nothing institutional or corporate.
```

**Aspect ratio:** 3:2 — editorial
**Para qué sirve:** Transición entre capítulos o cierre de sección. Da profundidad sin contar una historia concreta.

## Bloque negativo

Se pega en el campo negativo de la herramienta. Cubre lo que este sistema no debe producir nunca.

```text
neon green or purple aurora gradients, holographic iridescence spread across the image, glowing robot eyes, humanoid robots, hooded hacker silhouettes with green code on screens, matrix rain of falling characters, cyberpunk city, hypersexualized women, doll-like or plastic faces, heavy beauty retouching, stock-photo smiling team around a laptop, purple and blue "AI" gradient meshes, lens flare and bloom glow, cartoon or cel-shaded rendering, glossy 3D plastic look, oversaturated color, text, logos, watermarks, brand marks, dashboard mockups with invented metrics, extra fingers, warped hands.
```

Ninguna de estas cosas es un accidente de generación: son atajos visuales que ya significan otra cosa. Un ojo robótico que brilla no comunica observación, comunica amenaza; una lluvia de caracteres no comunica trazabilidad, comunica película de los noventa.

## Consistencia entre imágenes

- **Un descriptor, cinco encuadres.** `[FIGURE]` se repite literal. Lo único que cambia entre P01 y P05 es el encuadre y la luz, nunca la persona.
- **La línea de paleta es idéntica siempre.** El bloque de estilo no se reescribe ni se "adapta" al prompt de turno.
- **Un suelo por serie.** O tinta o papel, decidido antes de generar. Las dos series no se mezclan en la misma página sin un motivo.
- **Cuatro candidatos por prompt, uno elegido.** Se guarda el número del prompt y el candidato en el nombre del archivo.
- **Semilla fija si la herramienta lo permite.** Al repetir una variante de la misma familia, mantener la semilla y cambiar solo el texto del encuadre.
- **Revisar la temperatura de la piel.** Es lo primero que se escapa: una piel demasiado cálida rompe la familia aunque el fondo esté bien.
- **Rechazar lo que trae texto.** Cualquier candidato con palabras legibles, cifras, gráficos de interfaz o marcas se descarta, aunque el resto sea bueno.

## Advertencias honestas

- **Toda imagen generada necesita revisión humana antes de publicarse.** El prompt no garantiza ni el tono ni el detalle: solo reduce el espacio de error.
- **No hay cesión de derechos por parte del sistema.** El uso, la licencia de la herramienta y la responsabilidad sobre la imagen son de quien la publica. Este kit no otorga ni reclama derechos sobre nada.
- **No presentar una imagen generada como una persona real.** La mujer de P01–P05 es un arquetipo de oficio, no una empleada, una fundadora ni una clienta. No se la nombra, no se la cita y no se la presenta como parte del equipo.
- **Una imagen no puede inventar un servicio ni una promesa de Joyan.** Nada de certificaciones, sellos, métricas, precios ni capacidades que la dirección no haya decidido y escrito. Si un candidato mete un panel con números o un logotipo de cliente, se descarta: la imagen ilustra un criterio, no anuncia un producto.
- **La tipografía no se genera.** Michroma se compone, no se pide a un generador. Si un candidato trae letras, se recorta o se descarta.

---

**Versión**: 1.0
**Última actualización**: 2026-10-22
**Mantenedor**: JoyanLabs
**Skill asociado**: [documentation](../../../skills/documentation/SKILL.md)

---

## Anexo · Prompts con imagen de referencia

Patrón adoptado de [OnePromptDesign](https://onepromptdesign.com/) (catálogo de prompts de imagen). Resuelve el caso más útil para Joyan: **alguien trae una imagen y hay que llevarla a nuestra paleta sin copiar sus objetos**.

Se pega en inglés, igual que el bloque de estilo. `[STYLE BLOCK]` se mantiene literal.

### A · Recolorear una referencia (misma estructura, nuestros colores)

```text
Use the uploaded reference image strictly as the visual reference. Recreate the same structure, composition, tonal hierarchy, texture character and atmospheric depth. Apply the selected colors using the same spatial flow and transition logic as the reference, moving from deep ink shadow into a soft celadón light. Palette: ink #10191C, petroleum #183039, deep teal #244C5B, teal #346E7B, celadón #94CCBB, bone #D5E5CF, paper #F2EFE7. Preserve the texture treatment across the composition without introducing objects, typography or unrelated forms. [STYLE BLOCK]
```

### B · Tomar el clima, no los objetos (estilo sin copiar)

```text
Use the uploaded reference image as a visual-style and composition reference only. Create a NEW image with the same lighting, grain, glow, atmosphere, depth, spacing and hierarchy. Do not copy the reference image's objects by default. Palette: ink #10191C, petroleum #183039, deep teal #244C5B, teal #346E7B, celadón #94CCBB, bone #D5E5CF, paper #F2EFE7. [STYLE BLOCK]
```

### C · Textura de fondo para una sección

```text
A calm abstract surface in a single mineral family: dark ink ground lifting into a narrow band of celadón light, fine stippled halftone grain, matte, no glow bloom, no objects, no text. Palette: #10191C #183039 #244C5B #346E7B #94CCBB #D5E5CF. Generous empty area on one side for a headline. [STYLE BLOCK]
```

### Qué mirar de ese catálogo y qué no

- **Sirve**: la disciplina de describir estructura, jerarquía tonal, textura y acabado por separado; y la instrucción explícita de **no copiar los objetos** de la referencia.
- **No sirve**: sus estilos de moda (risograph pop, neón, plush). Son ajenos a Joyan y están en nuestro bloque negativo.
- **Regla propia**: si una referencia no se puede describir como *luz, densidad y material*, no entra. Nuestro sistema no imita ilustraciones: mide tinta.
