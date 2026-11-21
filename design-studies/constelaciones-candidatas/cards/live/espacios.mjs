/**
 * LOS ESPACIOS — una plantilla, seis cielos.
 * ============================================================================
 * 《docs/PROCESO-ESCENAS.md》, §Validación de la dirección, camino recomendado
 * paso 1: la escena viva aprobada es una PLANTILLA y «la atmósfera importada
 * acepta parámetros de encuadre sin reescribir su receta». Este registro es la
 * forma que tiene esa frase: una entrada por constelación con el trozo de la
 * hoja que le toca y el aire que respira.
 *
 * UN ESPACIO SON TRES COSAS, y ninguna es una receta nueva:
 *
 *   ventana  {x, y} en unidades del mundo (480 × 300, 3 px por unidad). Es de
 *            DÓNDE se lee la hoja: el cielo sigue siendo `baseTone` de la vara
 *            sobre el mismo sobremuestreo 1,6 y el lavado sigue siendo la misma
 *            retícula 480 × 300 con la misma LUT de 16 peldaños y el mismo
 *            bayer4. Desplazar la lectura mueve la BANDA de la vara de sitio
 *            dentro del cuadro; no la reescribe.
 *   clima    un hex oscuro que se mezcla un 14 % con el ground (`CLIMA_MEZCLA`
 *            en `bake.mjs`) y tiñe la viñeta y el fondo de la página. Es un
 *            tinte, no un color nuevo: lo vigila `validarEspacio` (cromaN ≤ 48
 *            y media de canal ≤ 48, o sea: ningún color de UI ni de figura puede
 *            colarse disfrazado de clima) y lo mide el caso 3 de
 *            `check-escenas-variantes` (el campo compuesto sigue en 4–6 % y el
 *            clima no lo mueve más de un 6 %).
 *   nombre   cómo se llama el sitio, para que la comparación se pueda contar.
 *
 * LOS LÍMITES NO SON INVENTADOS: los fija la sangre que ya existe. `paintSky`
 * recorta la hoja en `-width * .24` y el canvas del cielo es 112 % del cuadro con
 * `inset: -6 %`, así que el cuadro lee la hoja de 1 440 × 900 desde la celda
 * 432,270 de una hoja de 2 305 × 1 440 y puede desplazarse ±140 × ±88 unidades
 * del mundo sin salirse de ella (`skyFrame().ventanaLimite`). Y los ejes son
 * múltiplos de 4 CELDAS: el paso del bayer4 depende de `(x % 4, y % 4)`, así que
 * otro valor pondría la lámina horneada y el cuadro del worker de 12 Hz en fases
 * distintas del dither.
 *
 * EL QUE NO DECLARA, NO SE QUEDA FUERA: `espacioPara` devuelve `ESPACIO_DEFECTO`
 * —la ventana 0,0 y `clima: null`—, que es exactamente la escena que se hornea
 * hoy, byte a byte. Las otras ochenta y pico constelaciones del catálogo siguen
 * abriendo igual.
 *
 * El registro se valida a sí mismo al cargarse: una entrada rota NO puede
 * convertirse en una escena silenciosamente distinta, lanza con el campo, el
 * valor y la cota en el mensaje.
 */

import { CARD } from '../data.mjs';
import {
  CLIMA_MEZCLA, SIN_ESPACIO, VENTANA_CELDAS, skyFrame, ventanaValida,
} from './bake.mjs';

/** El id con el que se mide el espacio por defecto: la referencia de la casa. */
export const ID_DEFECTO = 'Ori';

/** El límite canónico del registro: el del cuadro de la pieza. */
export const LIMITE_VENTANA = skyFrame(CARD.width, CARD.height).ventanaLimite;

/** Las cotas del clima. Un clima es un ground sesgado, no un color de la carta. */
export const CLIMA_CROMA_MAX = 48;
export const CLIMA_MEDIA_MAX = 48;
export const CLIMA_MEDIA_MIN = 10;

/**
 * LOS SEIS ESPACIOS. Cada uno dice dónde está su banda y qué aire tiene.
 * Las ventanas están repartidas por la hoja a propósito: la pareja más cercana
 * de este registro deja la banda a más de 300 px de la otra en el cuadro, y el
 * caso 2b del chequeo lo exige (mínimo 48 px).
 */
export const ESPACIOS = Object.freeze({
  /** Orión, el Cazador: la banda baja a la derecha y él queda sobre el agua. */
  Ori: Object.freeze({
    nombre: 'la ribera',
    ventana: Object.freeze({ x: -40, y: -20 }),
    clima: '#0F2A31',
  }),
  /** Lira, la Lira: la banda sube y se abre como un techo sobre la figura. */
  Lyr: Object.freeze({
    nombre: 'la bóveda',
    ventana: Object.freeze({ x: 28, y: -56 }),
    clima: '#101C2E',
  }),
  /** Cruz del Sur: la banda baja al fondo izquierdo, el cielo queda alto. */
  Cru: Object.freeze({
    nombre: 'el sur bajo',
    ventana: Object.freeze({ x: -88, y: 36 }),
    clima: '#152420',
  }),
  /** Saeta, la Flecha: la banda entra cortando por la derecha, a media altura. */
  Sge: Object.freeze({
    nombre: 'el tiro corto',
    ventana: Object.freeze({ x: 96, y: 12 }),
    clima: '#1D1B26',
  }),
  /** Cisne, volando a favor de la corriente: la banda arriba y a la izquierda. */
  Cyg: Object.freeze({
    nombre: 'la corriente',
    ventana: Object.freeze({ x: 48, y: 60 }),
    clima: '#102A24',
  }),
  /** Escorpión, en el polvo: la banda alta a la derecha, el aire más cálido. */
  Sco: Object.freeze({
    nombre: 'el polvo',
    ventana: Object.freeze({ x: -108, y: -48 }),
    clima: '#211A16',
  }),
});

/** Los ids con espacio declarado, en el orden en que se comparan. */
export const IDS_ESPACIOS = Object.freeze(Object.keys(ESPACIOS));

/** El espacio de quien no declara ninguno: la escena de siempre (0,0, sin clima). */
export const ESPACIO_DEFECTO = SIN_ESPACIO;

const HEX = /^#[0-9a-fA-F]{6}$/;
const rgbDe = (hexString) => [1, 3, 5].map((at) => Number.parseInt(hexString.slice(at, at + 2), 16));

/**
 * Todo lo que está mal en un espacio, NOMBRADO campo por campo. No lanza: el
 * registro quiere decir de una vez el campo, el valor y la cota de cada error.
 * @param {string} id @param {{nombre:string, ventana:{x:number,y:number}, clima:string|null}} espacio
 * @returns {string[]}
 */
export function validarEspacio(id, espacio) {
  if (!espacio || typeof espacio !== 'object') return [`espacio(${id}): no es un objeto {nombre, ventana, clima}`];
  const errores = [];
  if (typeof espacio.nombre !== 'string' || !espacio.nombre.trim()) {
    errores.push(`espacio(${id}).nombre: hace falta un nombre, no «${espacio.nombre}»`);
  }
  errores.push(...ventanaValida(espacio.ventana, LIMITE_VENTANA).map((error) => `espacio(${id}).${error}`));
  const clima = espacio.clima;
  if (clima !== null) {
    if (typeof clima !== 'string' || !HEX.test(clima)) {
      errores.push(`espacio(${id}).clima: tiene que ser null o un hex #rrggbb, no «${clima}»`);
    } else {
      const [r, g, b] = rgbDe(clima);
      const croma = Math.max(r, g, b) - Math.min(r, g, b);
      const media = (r + g + b) / 3;
      if (croma > CLIMA_CROMA_MAX) {
        errores.push(`espacio(${id}).clima: ${clima} tiene croma ${croma}, la cota de un tinte es ${CLIMA_CROMA_MAX}; `
          + 'el clima es un ground sesgado, no un color de la carta');
      }
      if (media > CLIMA_MEDIA_MAX || media < CLIMA_MEDIA_MIN) {
        errores.push(`espacio(${id}).clima: ${clima} tiene media de canal ${media.toFixed(1)}, tiene que estar entre `
          + `${CLIMA_MEDIA_MIN} y ${CLIMA_MEDIA_MAX} (es un ground, no una tinta de figura ni un blanco)`);
      }
    }
  }
  return errores;
}

/** El espacio de un id: el declarado, o el de defecto. Nunca undefined. */
export function espacioPara(id) {
  return ESPACIOS[id] ?? ESPACIO_DEFECTO;
}

/** Si el id trae espacio propio (la página lo reporta: no es lo mismo heredarlo que tenerlo). */
export const tieneEspacio = (id) => Object.prototype.hasOwnProperty.call(ESPACIOS, id);

/** El registro se vigila a sí mismo: roto, no abre. */
const rotos = IDS_ESPACIOS.flatMap((id) => validarEspacio(id, ESPACIOS[id]));
if (rotos.length) {
  throw new Error(`espacios.mjs: ${rotos.length} entrada(s) rotas — ${rotos.join(' | ')}`);
}
if (IDS_ESPACIOS.some((id) => !Number.isInteger(ESPACIOS[id].ventana.x / VENTANA_CELDAS))) {
  throw new Error(`espacios.mjs: las ventanas tienen que ser múltiplo de ${VENTANA_CELDAS} celdas`);
}

/** Lo que pesa el clima, expuesto desde el registro para quien lo lee. */
export { CLIMA_MEZCLA };
