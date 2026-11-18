# RESULTADO — validación en frío de `skills/joyan-escenas` v1.3 (run-3)

Escena de prueba: **«La traza»** (el registro: qué autorizó qué). Una cadena de nueve nodos donde una
sola ruta se enciende nodo a nodo, con un único acento encendido sobre un campo apagado; el resto del
campo queda en sombra. Uso final: ilustración de sección. Sin assets externos: campo procedural por capas.

Método: **sólo la skill**, en su orden. Todo lo que la skill no dijo se anotó en `HUECOS.md` en vez de
resolverse por costumbre.

Marco declarado antes de aprobar la composición (§1):

- **Relación de aspecto: 2:1** (1600×800; entrega 200×100 celdas a 8 px = 1600×800).
- **Política móvil:** escala proporcional al ancho del contenedor, sin recorte ni reencuadre. A 390 px el
  dibujo completo mide 390×195 y nada del sujeto sale del marco.
- El boceto y la página lo declaran (`data-aspect-ratio`, `data-mobile-policy`), y `check-skill.mjs` lo
  verifica en el marcado.

## Veredicto por fila de §4

| Fila (§4) | Veredicto | Número | Evidencia |
|---|---|---|---|
| **Legibilidad** | **PENDIENTE** | — | No certificable por quien itera. Consigna ciega y capturas listas más abajo. La escena **no se aprueba** sin este paso. |
| **Contraste** | OK | **16,26 : 1** | Único par texto/fondo realmente usado: `--ink #dceaea` sobre `--paper #05080a` (leyenda de la página). La escena no trae texto. Medido con luminancia WCAG linealizada; con la `luma()` de pantalla del motor daría 12,03:1 (ver hueco C). |
| **Determinismo** | OK | `DIGEST 09be0798…624d` | Dos procesos independientes de `check-skill.mjs` (frames pineados 0, 90, 180, 270, 359 + RGBA del póster): todas las líneas sin tiempos **byte-idénticas**. Dos bakes independientes: `png-sha256 bf11cfc4…886a` idéntico. Y el canvas del navegador produce el mismo hash que Node: `c9667532…cd05`. |
| **Coste (Node)** | OK | **mediana 12,23 ms · p90 12,85 ms** | media 12,29 · p95 13,12 · peor 14,19 · **frío 30,58 ms** aparte. Protocolo pineado: 60 frames de calentamiento + 240 muestras, buffer RGBA reutilizado, resolución nativa 1600×800, `renderFrame`+`rasterize`. Presupuesto 16,67 ms. |
| **Coste (navegador)** | OK | **mediana 12,10 ms · p90 13,00 ms** | media 12,27 · p95 13,40 · peor 14,50 · frío 15,20 · el navegador añade `putImageData`. Mismo protocolo y mismo `bench.mjs`. |
| **Saturación** | OK | **0,67 %** | Peor frame del barrido completo del ciclo (360 índices): frame 168 → 134/20000 celdas en el último peldaño (4). **Control de escena no vacía:** el póster tiene 7627/20000 celdas con tinta (38,14 %). **Control saturado:** campo a `maxTone` → 64/64 = **100,00 %**. |
| **Sin JS** | OK | póster, no un rectángulo | `browser-nojs.png` (scripting off): 1280×720, 935 colores, 1,5 % de píxeles encendidos, **diferencia media 0,4/255** contra el póster horneado por el mismo motor. `data-state` en JS: `ready`; con scripting off el fallback visible es el póster (la señal se queda en `loading`: ver hueco 6). |

Filas extra que las enmiendas v1.2/v1.3 vuelven medibles (no son de §4, pero son la prueba de las
enmiendas 1, 3, 6 y 8):

| Fila | Veredicto | Número / evidencia |
|---|---|---|
| §3 adaptador y loop | OK | `T = 360/30 = 12 s`; `envolvente(0) = 0`, `envolvente(1) = 0`; `head(0) = -0,80`, `head(1) = -0,80`; celdas encendidas: frame 0 = **0**, frame 359 = **0**, póster = 294 (peldaño 4: 134). |
| §3 continuidad | OK | **0** celdas con `|Δpaso| ≥ 2` entre frames consecutivos del ciclo, incluido el cierre 359→0 (se mide la secuencia, no dos renders independientes). |
| §1 boceto | OK | `viewBox 0 0 1600 800` + `width/height 100 %` (necesario: ver enmienda 8), captura `sketch-390.png` 390×195 sin recorte. |
| Motor Node↔canvas | OK | El hash de un `getImageData` posterior al `putImageData` del canvas = hash del `rasterize` de Node (`c9667532…cd05`). Póster y canvas son **la misma** obra, no dos parecidas. |
| §2B póster/canvas | OK | El canvas arranca `hidden` y el póster visible; sólo después de una pintura válida se oculta el póster y aparece el canvas. |

## Comandos ejecutados (todos con timeout)

```bash
# motor + póster (§2B)
TMPDIR=$PWD/tmp timeout 180 node bake-poster.mjs

# las filas de §4 medibles en Node, dos corridas independientes
TMPDIR=$PWD/tmp timeout 180 node check-skill.mjs   # ×2

# señal ready/error, hash cruzado, coste de navegador y capturas
TMPDIR=. timeout 120 node verify-browser.mjs       # ×2

# boceto a 390 px (§1): el comando de la skill, con el binario resuelto a mano
TMPDIR=. timeout 90 <chrome> --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --user-data-dir=./browser-profile --screenshot=sketch-390.png \
  --window-size=390,195 file://"$PWD"/sketch.svg
```

`TMPDIR` va **relativo** y `cwd` es el directorio del estudio: con un `TMPDIR` absoluto largo, Chrome
muere con `FATAL … Socket path too long` exactamente como avisa §1 (reproducido, ver `HUECOS.md`).

## Legibilidad — PENDIENTE (protocolo ciego)

Capturas listas para un evaluador **que no participó** de la iteración:

1. `browser-1280.png` (1280×720)
2. `browser-390.png` (390×260)
3. `browser-nojs.png` (1280×720, scripting off) — opcional, para comprobar el fallback
4. `poster.png` (1600×800, el frame horneado) — opcional

**Consigna (leerla tal cual, sin agregar nada):**

> Te voy a mostrar unas imágenes. Mirá cada una **tres segundos** y decime en una frase **qué ves**.
> No hay respuesta correcta ni incorrecta y no te voy a explicar qué es. Escribí tu respuesta literal.

Mostrar **cada captura sola**, sin nombre de archivo, sin título y sin comentario previo. Registrar la
respuesta literal.

**Descripciones aceptables (definidas ANTES, como pide la fila):** la respuesta es aceptable si nombra
(a) una **cadena / secuencia / serie de puntos o nodos conectados** y (b) **un punto destacado o más
brillante** que el resto. Es aceptable que además diga que la cadena se enciende o que un tramo está
encendido.

No aceptable: no nombra sujeto («puntos», «ruido», «una línea»), o inventa un sujeto que contradice el
inventario («un gráfico de barras», «un mapa»). Si la respuesta es ambigua, no se interpreta: se registra
literal y la escena queda sin aprobar.

**No certifico legibilidad.** En esta corrida la escena se entrega con la fila en PENDIENTE y, por lo
tanto, **sin aprobar**.

Observación de la propia corrida (no es certificación, es lo que ve quien iteró): a 1280 el sujeto se lee
sin texto; a 390 el acento sigue leyéndose pero los nodos de la cola se juntan y el contraste entre el
tramo encendido y el tramo en sombra se acorta. Es exactamente lo que el evaluador ciego tiene que
decidir, y por eso está pendiente.

## Índice de la evidencia

| Archivo | Qué es |
|---|---|
| `sketch.svg` | Boceto (§1): 2:1, una capa por decisión, aspecto y política móvil declarados. |
| `sketch-390.png` | Captura real a 390 px **sin recorte** (390×195). |
| `sketch-390x320.png` | La misma captura con el `--window-size=390,320` literal de la skill: letterbox, tampoco recorta (ver enmienda 8). |
| `scene-traza.mjs` | Módulo ESM de la escena, receta 2B, importa el motor real por ruta relativa. |
| `bake-poster.mjs` / `poster.png` | Póster horneado con `rasterize()` del mismo motor. |
| `check-skill.mjs` | Filas de §4 medibles en Node + las de §1/§3 + controles. Sale 0 si todo pasa. |
| `bench.mjs` | Protocolo de benchmark pineado, compartido por Node y navegador. |
| `index.html` | Página mínima: póster por defecto, canvas tras pintura válida, `data-state`+hash, animación por segundos. |
| `error-demo.html` | Prueba de la señal `data-state="error"` con una importación que falla. |
| `verify-browser.mjs` | Verificador: espera por estado con timeout de seguridad, hash cruzado, coste en navegador, capturas 1280/390/sin JS. |
| `browser-1280.png`, `browser-390.png`, `browser-nojs.png` | Capturas del verificador. |
| `run-a.txt`, `run-b.txt`, `bake-run-a.txt`, `bake-run-b.txt`, `verify-run-a.txt` | Transcripciones de las corridas independientes. |

## Riesgos

- La legibilidad queda pendiente: la escena no está aprobada, sólo medida.
- El coste es holgado en mediana (12,1–12,2 ms) pero el **peor** frame medido está en 14,2–14,5 ms: en una
  máquina más cargada el p90 se acerca al presupuesto. No se ha medido en móvil real.
- `renderFrame` + `rasterize` en el navegador midió 14,00 ms en el diagnóstico y 12,10 ms de mediana en el
  benchmark pineado: la diferencia es el ruido de una corrida headless, no un cambio de camino de código.
- El «frame frío» de la página (≈1,35 s) es arranque del canvas, no un frame: el frame real de ese primer
  pintado es 12,7 + 2,3 ms. La skill no define qué cuenta como frío (hueco 4).
