/**
 * Monta las tarjetas. El dato no se reescribe acá: se lee de
 * `datos-constelaciones.mjs` (estrellas y procedencia) y de
 * `figuras.generated.mjs` (SVG ya proyectado por `construir-figuras.mjs`).
 */

import { CANDIDATAS } from './datos-constelaciones.mjs';
import { FIGURAS } from './figuras.generated.mjs';

const dos = (n) => String(n).padStart(2, '0');
const mag = (n) => n.toFixed(2).replace('.', ',');
const grad = (n) => String(n).replace('.', ',');

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function estrellas(figura) {
  return figura.estrellas
    .map((e) => {
      // Sin nombre propio, la designación Bayer ya es el nombre: no se repite.
      const etiqueta = e.nombre.startsWith(e.bayer) ? esc(e.nombre) : `${esc(e.bayer)} ${esc(e.nombre)}`;
      return `<span class="star-item"><span class="bayer">${etiqueta}</span> <span class="mag">${mag(e.mag)}</span></span>`;
    })
    .join('');
}

function card(figura, i) {
  const g = FIGURAS[figura.id];
  const silueta = figura.silueta;
  return `
<article class="card" id="c-${figura.id}">
  <p class="idx mono">${dos(i + 1)}</p>
  <div class="diagram">${g.svg}</div>
  <h2 class="name">${esc(figura.nombre)} <span class="abbr mono">${esc(figura.abbr)}</span></h2>
  <p class="gloss">${esc(figura.significado)} <span class="sep">·</span> ${esc(figura.cultura)}</p>
  <p class="why">${esc(figura.porQue)}</p>
  <dl class="specs">
    <dt>figura</dt><dd>${g.nodos} nodos · ${g.enlaces} enlaces</dd>
    <dt>como marca</dt><dd>${esc(figura.marca)}</dd>
    <dt>escala</dt><dd>${esc(figura.escala)}</dd>
    <dt>entrada</dt><dd>${esc(figura.entrada)}</dd>
    <dt>acento</dt><dd>${esc(figura.acento)}</dd>
    <dt>ambiente</dt><dd>${esc(figura.ambiente)}</dd>
    <dt>silueta</dt><dd><span class="lee" data-lee="${silueta.lee}">${silueta.lee}</span> — ${esc(silueta.nota)}</dd>
  </dl>
  <p class="estrellas mono">${estrellas(figura)}</p>
  <p class="nota"><span class="nota-label mono">nota</span>${esc(figura.notas)}</p>
</article>`;
}

document.getElementById('grid').innerHTML = CANDIDATAS.map(card).join('');

document.getElementById('tabla').innerHTML = CANDIDATAS.map((c) => {
  const g = FIGURAS[c.id];
  return `<tr><th scope="row">${esc(c.nombre)}</th><td>${g.nodos}</td><td>${g.enlaces}</td>
    <td><span class="lee" data-lee="${c.silueta.lee}">${c.silueta.lee}</span></td>
    <td class="mono">${grad(g.ext.anchoGrados)}° × ${grad(g.ext.altoGrados)}°</td></tr>`;
}).join('');

// La chispa del enlace `pulse` es la animación de ambiente: con movimiento
// reducido no se reproduce — queda el enlace sólido y el diagrama quieto.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  for (const svg of document.querySelectorAll('svg')) svg.pauseAnimations?.();
}
