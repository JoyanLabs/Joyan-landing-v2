/**
 * LA EMISIÓN DE REPOSO — 12 Hz en un worker, con `OffscreenCanvas`.
 * ============================================================================
 * El cielo horneado no se vuelve a calcular nunca; lo que se emite es la capa de
 * atmósfera del instante, con la misma LUT de v1 (`bake.mjs`, `dynamicWash`).
 * Una sola petición en vuelo (`busy` en `live.mjs`) y descarte por `generation`:
 * un cuadro que llega después de un foco o de un rebuild no puede repintar un
 * estado que ya no existe.
 *
 * El worker NO conoce la constelación hasta que se la mandan: la recibe una vez
 * y la conserva, porque `constellationLayers` cachea el layout POR objeto y
 * reenviarla por mensaje construiría una constelación nueva cada 83 ms.
 */

import { dynamicWash } from './bake.mjs';

let material = null;
let key = null;
let canvas = null;
let context = null;

self.onmessage = ({ data }) => {
  const started = performance.now();
  // La ventana del espacio viaja con la petición y entra en la clave del
  // material: cambiar de id puede cambiar de encuadre, y un material del
  // encuadre viejo no puede repintar el cuadro nuevo.
  const clave = `${data.id}:${data.ventana ? `${data.ventana.x},${data.ventana.y}` : '0,0'}`;
  if (!material || key !== clave) {
    material = dynamicWash(data.constellation, { ...data.grid, ventana: data.ventana });
    key = clave;
    canvas = new OffscreenCanvas(material.width, material.height);
    context = canvas.getContext('2d');
  }
  material.update(data.seconds, data.focused);
  context.putImageData(new ImageData(material.pixels, material.width, material.height), 0, 0);
  const bitmap = canvas.transferToImageBitmap();
  self.postMessage({ bitmap, generation: data.generation, cost: performance.now() - started }, [bitmap]);
};
