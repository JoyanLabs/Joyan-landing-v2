> **Este documento NO es la copia aprobada.** El texto de la página se rehace: se consideró demasiado
> estricto en su regla de "todo debe estar mencionado". Se conserva como **referencia** por dos cosas que sí
> se van a usar: el **mapa A1–A20 de fuente por afirmación** y la **lista de prohibiciones**. No copiar el
> texto tal cual.

# v1 · Copia y estructura

**Estado:** propuesta de copy — al 2026-10-25. Cada afirmación apunta a un archivo; si no tiene archivo, no entra.
**Fuentes:** `joyan-projects/PARA-SESION-LANDING.md`, `joyan-projects/PARA-EQUIPO-RESUMEN.md` (reescrito lector-primero, corte 2026-10-25), `joyan-projects/PARA-VICTOR-P1-DOCUMENTOS.md` y los archivos citados en la tabla.
**Etiquetas de estado que usa este documento** (tomadas de las fuentes): *propuesta (2026-10-25)* · *hecho verificado documentalmente al 2026-10-25* · *decisión aceptada (2026-10-25)* · *pendiente*.

> **Pendiente de decisión:** el reemplazo del sustantivo «estudio» está en revisión. Hasta que se decida, el copy dice **JoyanLabs** sin sustantivo y describe la actividad como *propuesta de posicionamiento*, no como definición.

## 0 · Glosario mínimo (para que el copy no dependa de jerga)

| Término | Qué significa en el texto |
|---|---|
| JoyanLabs | La marca. Se usa sin sustantivo hasta que se decida el reemplazo. |
| cuaderno | El repositorio `joyan-projects`: investigación, propuestas y registros. |
| gate | Verificador automático que corre en CI sobre los documentos; no decide criterio. |
| ADR | Registro de decisión de arquitectura; tiene autoridad sobre las propuestas. |
| L1–L4 | Las cuatro líneas de servicio, en orden. |
| A0–A5 | La escalera de oferta. |
| S1–S7 | Servicios. |
| D1–D3 | Modos de entrega. |
| O0–O3 | Niveles de evidencia. |
| Magi | El plano de control propuesto: identidad, autorización y evidencia. **Sin MVP.** |
| OTel | OpenTelemetry. |
| peer / SCIM | Dispositivo o entorno conectado a la red / provisión de usuarios desde el proveedor de identidad. Ambos requieren licencia Enterprise de NetBird. |
| PR nudge | Agente que comenta en cada pull request con hallazgos citados, en vez de un resumen genérico. |
| SBOM | Inventario de los componentes de software que entran en un sistema; se firma para que se pueda verificar. |
| PROV/RO-Crate | Formato de exportación de evidencia: PROV describe quién hizo qué y cuándo; RO-Crate lo empaqueta con sus archivos y metadatos. |

## 1 · Mapa de afirmaciones

| # | Afirmación publicable | Fuente |
|---|---|---|
| A1 | *Propuesta de posicionamiento (2026-10-25):* JoyanLabs construye y opera plataformas de agentes; el laboratorio es el primer campo de validación y no equivale a una plataforma terminada. | `PARA-EQUIPO-RESUMEN.md` §2 |
| A2 | No es una agencia a medida, ni un SaaS terminado, ni un chatbot; los servicios se sostienen por separado sin esperar a Magi. | `PARA-EQUIPO-RESUMEN.md` §2 |
| A3 | Cuatro líneas en orden L1→L4. | `odd/HANDOFF.md` §3; `magi/README.md` |
| A4 | *Hecho verificado documentalmente al 2026-10-25:* L1 probado · L2 especificado · L3 piezas listas sin entrega · L4 sin producto. | `magi/README.md`; `PARA-EQUIPO-RESUMEN.md` §3 |
| A5 | L1 en un cliente real de software: se reorganizó la integración continua, la escalera completa pasó a servidor propio y quedó en **0 minutos facturables, medido**. | `PARA-EQUIPO-RESUMEN.md` §3 |
| A6 | El hueco de L4: OTel GenAI registra actividad y consumo, **no aprobación humana**; el costo se reconstruye fuera del estándar. | `magi/docs/reference/evidence-core.md` |
| A7 | *Propuesta:* dos canales de aprobación —humana para lo irreversible, automática con política firmada y versionada para lo reintentable— y la traza dice cuál se usó. **No hay política firmada operativa acreditada.** | `magi/docs/reference/evidence-core.md` |
| A8 | Escalera A0–A5 y qué es vendible hoy según la propuesta (A4 no: sin MVP). «Vendible» no autoriza precio, piloto ni venta. | `odd/proposals/2026-10-25-catalogo-de-servicios.md`; `PARA-EQUIPO-RESUMEN.md` §4 |
| A9 | Servicios S1–S7 y entregas D1–D3; modo y dato se eligen por servicio. | catálogo §2-3; resumen §5 |
| A10 | Tres modos de Magi (cliente, híbrido, SaaS); la evidencia es siempre del cliente. | `odd/proposals/2026-10-25-modelo-de-oferta.md` §2 |
| A11 | Niveles O0–O3 y regla propuesta: O1 al pasar por el gateway, O2 en D3, O3 aparte. No son capacidades entregadas. | catálogo §11; resumen §5 |
| A12 | Límites de L3: la licencia Enterprise valida contra `license.netbird.io` (no hay air-gapped con licencia), cada instalación self-hosted es de **un solo inquilino**, peers y SCIM son Enterprise. | resumen §5; catálogo (licencias y contratos) |
| A13 | **Cero certificaciones.** Postura demostrable no es certificación ni cumplimiento del cliente. | `PARA-EQUIPO-RESUMEN.md` §6 |
| A14 | Magi sin MVP y sin clientes entregados; E1 es un experimento aislado con modelo falso. | resumen §6 |
| A15 | `joyan-kit` y `joyan-inference` son esqueletos; nada desplegado; capacidad y rendimiento vendibles desconocidos. | resumen §6 |
| A16 | Mercado poblado: ~USD 420 M de ARR y 44 % de equipos con revisor de IA; la diferencia no es «mejor código». | `odd/knowledge/mercado-agentes-de-revision.md` |
| A17 | Marco: Perú, Ley 31814 y Reglamento DS 115-2025-PCM. | `odd/knowledge/marco-legal-ia-peru-chile-ue.md` |
| A18 | Un artefacto, un lugar y un índice; una definición no acredita implementación y un experimento no acredita entrega. | `joyan-bastion/docs/adr/0010-marco-de-trabajo-y-flujo.md` |
| A19 | A5 es seguridad con socios: hay relación con un contacto técnico de ciberseguridad, **no** acuerdo firmado. | resumen §4 |
| A20 | Conversaciones comerciales: dos iniciales —software contable en Cusco e industrial/minería— sin propuesta enviada ni precio acordado. | resumen §8; `odd/knowledge/documentos-para-entrega.md` |

## 2 · Copia por bloque

### Hero
> **JoyanLabs**
> Construye y opera plataformas de agentes. El laboratorio es el primer campo de validación: lo que se
> entrega a un cliente ya corrió acá.

- *Fuente:* A1. Etiqueta interna: **propuesta de posicionamiento**, no definición cerrada.
- Sin sustantivo corporativo hasta que se decida.

### L1 · Diagnóstico y desbloqueo — *probado*
> Un diagnóstico acotado que cierra con un acta: qué vimos, qué medimos y qué **no** podemos hacer.
> En un cliente real de desarrollo de software, reorganizar la integración continua dejó la escalera
> completa en **0 minutos facturables**, medido.
- *Fuente:* A4, A5. **Cero épica:** el número es la prueba.

### L2 · Integración con agentes — *especificado*
> Piezas concretas dentro de tus sistemas. El molde es el **PR nudge**: un agente que comenta en cada
> pull request con hallazgos citados, en vez de un resumen genérico. La lógica de negocio, las decisiones
> sobre datos y las aprobaciones quedan de tu lado.
- *Fuente:* A4, A9 (S4).

### L3 · Confianza e identidad — *piezas listas, sin entrega*
> Red de confianza cero, identidad centralizada y seguridad operada. Con tres límites dichos de frente:
> la licencia Enterprise valida contra `license.netbird.io` (**no hay air-gapped con licencia**); cada
> instalación self-hosted es de **un solo inquilino**; y **peer** y **SCIM** son sólo Enterprise.
- *Fuente:* A4, A12. Los límites van en el cuerpo del texto, no en letra chica.

### L4 · Trazabilidad y auditoría de IA — *el diferencial, sin producto*
> Las convenciones GenAI de **OTel** registran qué hizo el agente y cuánto consumió. **No registran quién
> lo autorizó.** Queremos construir ese vínculo: evidencia que **vincula cada acción con su autorización**, con dos
> canales —humana para lo irreversible, automática con política firmada para lo reintentable— y la traza
> diciendo cuál se usó. **La evidencia es del cliente.** Todavía no hay producto.
- *Fuente:* A6, A7, A10, A11.

### Evidencia · O0 a O3
> No entregamos lo mismo a todos. **O0** sin evidencia nuestra verificable, declarado por escrito ·
> **O1** inferencia: modelo, tokens, costo, latencia y hash del artefacto · **O2** O1 más red e
> identidad: quién entró, desde dónde y qué intentó salir · **O3** O2 más exportación PROV/RO-Crate con
> hash firmado y revisión periódica.
- *Fuente:* A11. Regla propuesta, no capacidad entregada.

### Escalera · A0 a A5
> **A0** diagnóstico · **A1** asesoría · **A2** agentes concretos · **A3** entornos de trabajo ·
> **A4** Magi, el plano de control — **sin MVP, no vendible hoy** · **A5** ciberseguridad con socios.
- *Fuente:* A8, A19. «Vendible» no autoriza precio ni piloto.

### Lo que no hacemos
> No un revisor de código más: el mercado ya está poblado (~USD 420 M de ARR, 44 % de los equipos usa un
> revisor de IA). Nuestra diferencia no es «mejor código»: es **quién autorizó, con qué evidencia y a qué
> costo**. Tampoco agencia a medida, ni plataforma completa antes de contrastar mercado.
- *Fuente:* A2, A16.

### Confianza declarada
> **Cero certificaciones.** No hay ISO ni SOC 2. Lo que sí hay: confianza cero, identidad centralizada,
> artefactos firmados, SBOM y evidencia exportable. Se demuestra; no se certifica.
- *Fuente:* A13. Es el bloque que más credibilidad compra y el que más tienta a inflar.

### Escenarios (en lugar de "conversaciones")
> **Escenario típico de A0.** Una empresa de software contable migra de escritorio a nube y quiere usar IA
> para acelerar. No se le vende una plataforma: se le vende un diagnóstico acotado que cierra con un acta
> de alcance y criterios de aceptación congelados. Después, si el caso lo justifica, soporte de
> herramientas, agentes o entorno gestionado.
- *Fuente:* `PARA-SESION-LANDING.md` anexo + A8 (A0) + los escenarios de §6.
- **Se presenta como escenario, nunca como cliente.** No se nombra a nadie y no se publican las dos
  conversaciones iniciales: leerían como ventas y no lo son.
- El **resultado medido de L1** (0 minutos facturables) se publica sin nombrar al cliente y sólo con su OK.

### Cierre
> Un artefacto, un lugar y un índice. Una definición no acredita implementación; un experimento no
> acredita entrega.
- *Fuente:* A18.

### Firma
**Decisión tomada:** «**Alguien tiene que vigilar a las máquinas.**» · sin `no fate`.

- Es **firma de marca**, no afirmación: no sostiene ningún hecho y no se usa como argumento de venta.
- **No se explica en la página.** Explicar una firma la convierte en nota al pie.
- Tampoco se le atribuye origen cinematográfico: va sin cita, sin dueño y sin aclaración.

## 3 · Prohibiciones (checklist antes de publicar)

| Tentación | ¿Puede entrar? |
|---|---|
| Sugerir ISO 27001 / SOC 2 | **No** |
| Sugerir Magi en producción o con clientes | **No** |
| Agentes que deciden solos | **No**: la aprobación siempre existe |
| «Sin egreso de datos» como garantía universal | **No**: depende de modo y licencia |
| Precios, «desde X» | **No**: no hay precio decidido |
| Reglamento europeo citado como propio | **No**: marco es Ley 31814 + DS 115-2025-PCM |
| O2/O3 completos a un cliente aislado | **No**: la licencia exige conexión |
| Nombres de clientes o conversaciones como ventas | **No** |

## 4 · Números

Los que aparecen están en fuentes: **0 minutos facturables** (caso L1, medido), ~USD 420 M de ARR y 44 % de equipos (mercado), O0–O3, A0–A5, L1–L4. **No hace falta que me pases ninguno.** Si el copy pide otro —clientes, pilotos, ahorros— lo pido antes de escribirlo: no se estima.

## 5 · Lectura en frío (antes de cerrar)

Se le da el copy a alguien sin contexto y se le pregunta: **¿qué entendió y qué haría?**

**Falla si pregunta** qué es Magi, qué es L4, qué es «el gate», qué son O2/O3 o qué significa self-hosted de un solo inquilino. Por eso el glosario de §0 y las glosas dentro del texto: cada sigla aparece definida la primera vez.

## 6 · Notas fechadas y escenarios típicos

### Qué eran las notas fechadas

Cuatro notas del **camino propio** (jul–ago 2026): qué se estaba explorando, con fecha, área y estado
(`exploring` / `in-progress`). **No hablaban de clientes** y no eran un blog: no tenían autores, comentarios
ni feed. Una nota nueva exigía tres cosas: una fecha, un área y un estado, más un párrafo honesto de algo
hecho, probado o aprendido. Si el tema era un cliente, no entraba sin su permiso.

**Quedan fuera de la v1** por dos razones ya dichas: el material vive en el repo de la página vieja, y una
entrada menciona clientes. No se reutilizan.

### Qué las reemplaza: escenarios típicos

**Definición operativa:** un escenario describe **un flujo de trabajo**, no un cliente. Responde cuatro
cosas: qué rol toma el agente, **dónde aprueba una persona**, qué evidencia queda, y qué **no** se delega.
Se rotula siempre como escenario y no implica que lo hayamos entregado.

| Escenario | Rol del agente | Aprobación humana | Evidencia |
|---|---|---|---|
| **Ingreso documental en un estudio contable** | Clasifica archivos, extrae campos, marca faltantes e inconsistencias | En las excepciones y en el registro final | Traza por documento y enlace a la página rechazada |
| **Soporte de primera línea en servicios financieros** | Responde consultas de rutina y busca información de políticas | El caso se escala cuando sale del guion | Registro de la conversación y de la política aplicada |
| **Mantenimiento predictivo en planta industrial** | Ordena alertas de sensores y propone intervención | La decisión de parar o intervenir es humana | Serie de lecturas y motivo de la propuesta |
| **Admisión de casos de seguridad en farmacovigilancia** | Clasifica notificaciones, extrae campos, detecta duplicados y marca inconsistencias | La declaración a la autoridad la firma una persona designada; el agente no la transmite | Registro del caso: fuente original, campos extraídos, deduplicación y quién validó |

**El cuarto escenario, con la cita exacta.** La EMA exige que un caso válido incluya **al menos un informador identificable**, un paciente identificable, una reacción y un medicamento sospechoso (*Guideline on GVP, Module VI (Rev 2)*, VI.A.1.7). Lo que la norma **no** dice con esas palabras es «quién autorizó la versión final»: eso es **nuestra lectura** del problema —si un agente clasifica, extrae o deduplica datos del caso, la trazabilidad tiene que permitir reconstruir quién validó lo que se declara—. La distinción va explícita en la página: lo que exige el regulador se cita; lo que interpretamos se marca como interpretación.

**Fuente complementaria:** *Reflection paper on the use of artificial intelligence in the medicinal product lifecycle* (EMA, 2024), que trata la gobernanza humana sobre sistemas de IA en ese ciclo.

**Ancla de mercado, con fuente:** en la encuesta 2026 del Banco de Inglaterra, **80 %** de los encuestados
tiene agentes para **apoyo a la decisión**, **46 %** para **ejecución acotada** y sólo **2 %** para autonomía
amplia (Bank of England, *AI in UK financial services*, 2026). Es el dato que sostiene «la aprobación
siempre existe» sin necesidad de adjetivos.

**Cautela de fuentes:** los casos publicados por proveedores (contabilidad, minería) son **cifras
reportadas por quien vende**, no evaluaciones independientes. Se usan como patrón de flujo, nunca como
resultado propio.

**Regla:** si un escenario necesita un número nuestro, no se publica hasta medirlo.

## 7 · Decisiones abiertas para vos

1. **¿La firma de marca se queda?** Como firma, sin sostener hechos.
2. **¿El diario** (`src/data/journal/es/`, cuatro entradas, aprobado como fuente) **entra como sección**?
3. **¿ES primero con cadenas por `src/lib/i18n`** y no dentro del módulo del canvas?
4. **¿El bloque de conversaciones se publica** o queda fuera de la v1?

## 8 · Paleta: decisión

**El acento no se toca.** El acento vigente —`#94CCBB` sobre oscuro— estaba bien y se mantiene tal cual, en
nodos, enlaces y marcas. No se cambia, no se corre de sitio y no se reemplaza.

**Lo que sí se agrega es fondo, no acento.** Para las escenas y los planos de fondo se usa la **familia
tonal del mismo verde**, que ya existe en el sistema:

| Rol | Valor | Uso |
|---|---|---|
| fondo profundo | `#0A1114` | campo lejano de la escena, viñeta |
| fondo | `#10191C` | campo de sección |
| superficie | `#182A30` | bloques, placas |
| rampa de escena (sombra → luz) | `#183039` `#244C5B` `#346E7B` `#4D9199` `#73B7B0` `#A8D3BA` `#D5E5CF` | materia de la escena: banda, nebulosa, polvo, nodos |
| texto | `#E4EEEA` | lectura |
| texto secundario | `#ACC3C1` | pies y metadatos |
| **acento (intacto)** | `#94CCBB` | enlaces, foco, marcas |

Regla: **un acento, una familia tonal.** El color no se amplía con tonos nuevos de otra familia; se profundiza
la que hay. Si en algún momento hace falta más riqueza, se agrega **un paso más en la rampa**, no un color nuevo.

## 9 · Papel: descartado

El suelo de papel (`#F2EFE7` y su rampa) **queda descartado como dirección**. No se usa en la v1, no se
documenta como alternativa y no se ofrece como modo claro.

El **modo claro se vuelve a pensar desde cero** cuando haya una paleta clara que encaje con la identidad; la
que existía era una inversión de la oscura, no una paleta propia. Mientras tanto, la página es de un solo
suelo: oscuro.
