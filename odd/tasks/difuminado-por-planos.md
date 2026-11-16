# Difuminado por planos al enfocar — I-17

El difuminado de capas al enfocar un nodo fue lo que más gustó de la pieza, pero hoy es una primera versión:
no es un sistema. La estética aprobada pide **riqueza de capas** —el plano del nodo se afirma, los intermedios
se atenúan, el más lejano se desenfoca— y **prohíbe resolverlo ocultando capas**. Falta el protocolo de
medición y la verificación.

## Specs

- **S1** (`docs/ESTETICA-CONSTELACION.md` §Capas y foco). «Los nodos tienen que existir en **varias capas de
  profundidad**.»
- **S2**. «Al enfocar: el plano del nodo **se afirma**; los planos intermedios **siguen visibles** con un
  tratamiento distinto (atenuado/desaturado suave); el plano **más lejano** recibe el desenfoque.»
- **S3**. «Prohibido resolverlo ocultando capas: la gracia es ver que hay mundo detrás.»
- **S4**. «**Retención de luminancia de cada plano trasero al enfocar: ≥ 40 %.** Piso de aceptación incorporado
  por el encargo de `scene-iteration`; **no es un resultado medido ni una capacidad certificada** de la pieza
  actual. Antes de implementar, fijar en el manifiesto el protocolo reproducible: luminancia WCAG linealizada,
  comparación foco/base por plano, mismo estado de emisión y correspondencia de máscaras bajo la cámara.
  Entregar ambas mediciones, razón, máscaras y capturas; la opacidad CSS no sustituye la luminancia medida.»
- **S5** (`docs/ISSUES.md` I-17). «hay que volverlo parte del lenguaje. Umbrales, curva y reduced-motion por
  documento.»

## Protocolo de medición (cierra el pendiente de S4)

1. **Estado base:** `t = STILL_SECONDS`, sin nodo enfocado.
2. **Estado foco:** nodo N enfocado con la transición **terminada** (no a mitad).
3. **Máscara por plano:** píxeles donde `alpha > 0,5` del plano, tomados del mismo render.
4. **Luminancia:** WCAG relativa, linealizada (sRGB → lineal → `0,2126R + 0,7152G + 0,0722B`), promediada sobre
   la máscara. **No** la `luma()` del motor, **no** la opacidad CSS.
5. **Retención** = `luminancia_foco / luminancia_base` por plano trasero. Umbral **≥ 0,40**.
6. **Correspondencia de máscaras:** la cámara cambia entre estados; se mide cada plano en **su propio** espacio
   de máscara, no proyectando una máscara sobre el otro render.
7. **Se reportan:** ambas luminancias, la razón, las máscaras y las capturas de los dos estados.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|---|---|---|---|---|
| T1 | Medir la retención actual por plano (sin tocar el render) y publicar las máscaras | S4 | worker | — |
| T2 | Implementar el tratamiento de foco por plano (afirmar / atenuar / desenfocar) sin ocultar | S1-S3 | worker | feat(design-system) |
| T3 | Re-medir con el protocolo y verificar contraste, foco visible y reduced-motion | S2-S5 | inline | — |

## Evidencia

### T1 · Medición del estado previo — 2026-11-05

`scripts/checks/check-plane-retention.mjs --label before`, Chromium 153, `design-studies/v1/`. Estados: base en
`t = STILL_SECONDS` (1,667 s) y foco por la ruta real de la pieza (`activate()`), transición de 1200 ms
terminada, emisión fijada al mismo still en los dos estados.

| plano | base | foco | razón | umbral | veredicto |
|---|---|---|---|---|---|
| cielo @1280 | 0,0048 | 0,0042 | 0,865 | ≥0,40 | PASS |
| lavado @1280 | 0,2135 | 0,2986 | 1,399 | ≥0,40 | PASS |
| cielo @390 | 0,0047 | 0,0041 | 0,870 | ≥0,40 | PASS |
| lavado @390 | 0,2097 | 0,2183 | 1,041 | ≥0,40 | PASS |
| nodo far | 0,8075 | 0,8065 | 0,999 | ≥0,40 | PASS |
| nodo mid | 0,7867 | 0,8029 | 1,021 | ≥0,40 | PASS |
| nodo near | 0,7453 | 0,8051 | 1,080 | ≥0,40 | PASS |

**Hallazgo:** la pieza **ya cumplía** el piso de 0,40 antes de tocar nada. El pendiente de la estética no era
un incumplimiento: era la falta de protocolo y de medición. Se dice así y no se presenta la mejora como un
salto numérico.

### T2 · El tratamiento como sistema — 2026-11-05

`design-studies/v1/v1.css` y `v1.mjs`. Una escalera declarada por plano con cuatro variables
(`--plane-ink`, `--plane-tone`, `--plane-blur`, `--plane-rings`): el plano del nodo afirma (1 / 1 / 0 px),
el intermedio atenúa y desatura suave (0,96 / 0,6 / 0 px), el más lejano toma el desenfoque (0,9 / 0,42 /
0,8 px). **Ningún paso llega a cero**, no se recorta ninguna capa, el anillo de foco nunca se atenúa
(`opacity: 1` bajo puntero o teclado) y `prefers-reduced-motion` aplica el estado final sin animación.
El desempate del orden de profundidad resuelve hacia el plano más profundo del stack, para que el desenfoque
nunca caiga en el plano más cercano.

### T3 · Re-medición independiente — 2026-11-05

Corrida del orquestador (`--label verify`): **exit 0**, mismos números que la corrida del worker dentro de
ruido de medición (cielo 0,865 · lavado 1,398 · nodo mid 1,053 · nodo near 1,107). Contraste de la copia:
peor 9,93:1 a 1280 y 12,92:1 a 390 (umbral 4,5). Foco de teclado visible en los dos anchos. Reduced-motion
idéntico a los 400 ms. Ningún plano oculto: alfa máximo > 0 en todos.

## Log

- **L1** (2026-11-05, verbatim): «vake sobre los issues que comentas que faltan me gustaria trabajarlos y tambien
  trabajar en mejorar y validar correctamente la skill de joyan escenas antes de pasarle a angie las tareas ,
  osea todo debe de estar listo lo que anotamos para que angiue pruebe trabajando en una escena , sonbre images
  y eso no te preocupes eso sera en otra sesion no aqui solo queria el promt para hacerlo con el contexto del
  proyecto , bueno vamos sigamos con tu recomendacion continuemos»
- **Decisión del orquestador:** el protocolo de S4 se fija acá antes de implementar, porque la estética exige
  fijarlo antes y no había quedado cerrado.
