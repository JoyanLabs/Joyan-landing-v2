/**
 * Capturas de revisión del catálogo. Requiere el servidor de la raíz del repo
 * en el puerto 4403 (`curl` primero; no se levanta nada acá).
 *
 *   node capturas-catalogo.mjs
 *
 * Además de las tres imágenes imprime los números que importan: cuánto tarda
 * en quedar montado, cuántos elementos hay en el DOM, y si el buscador y los
 * filtros devuelven lo que dicen.
 */
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const SITIO = 'http://localhost:4403/design-studies/constelaciones-candidatas/catalogo.html';
const OUT = new URL('./captures/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function abrir(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(String(e)));
  const t0 = Date.now();
  await page.goto(SITIO, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cat-item .cat-fig');
  const montado = Date.now() - t0;
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const medida = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll('.cat-fig')];
    return {
      figuras: document.querySelectorAll('.cat-item').length,
      paths: document.querySelectorAll('.cat-fig path').length,
      circulos: document.querySelectorAll('.cat-fig circle').length,
      elementos: document.querySelector('.cat-wrap').querySelectorAll('*').length,
      alto: document.documentElement.scrollHeight,
      // el halo y el núcleo tienen que caer dentro del cuadro de cada figura
      fuera: svgs.filter((s) => {
        const caja = s.getBoundingClientRect();
        const puntos = [...s.querySelectorAll('.core')].map((c) => c.getBoundingClientRect());
        return puntos.some((p) => p.left < caja.left - 1 || p.right > caja.right + 1 || p.top < caja.top - 1 || p.bottom > caja.bottom + 1);
      }).length,
    };
  });
  return { page, errores, montado, medida };
}

// 1280 — la grilla completa
{
  const { page, errores, montado, medida } = await abrir(1280, 900);
  await page.screenshot({ path: OUT + 'catalogo-1280.png', fullPage: true });

  // buscador: «Ori» tiene que dejar Orión sola
  await page.fill('#q', 'Ori');
  await page.waitForTimeout(120);
  const busca = await page.evaluate(() => ({
    cuenta: document.getElementById('count').textContent,
    visibles: [...document.querySelectorAll('.cat-item')].filter((i) => !i.hidden).map((i) => i.querySelector('.cat-abbr').textContent),
  }));
  await page.screenshot({ path: OUT + 'catalogo-buscador.png', fullPage: true });

  // filtros: hemisferio sur + 10 o más nodos, y el cruce con el buscador vacío
  await page.fill('#q', '');
  await page.click('.filtro[data-grupo="hem"] button[data-v="sur"]');
  const sur = await page.evaluate(() => ({
    cuenta: document.getElementById('count').textContent,
    visibles: [...document.querySelectorAll('.cat-item')].filter((i) => !i.hidden).length,
  }));
  await page.click('.filtro[data-grupo="size"] button[data-v="10+"]');
  const surGrandes = await page.evaluate(() => ({
    cuenta: document.getElementById('count').textContent,
    abbrs: [...document.querySelectorAll('.cat-item')].filter((i) => !i.hidden).map((i) => i.querySelector('.cat-abbr').textContent),
  }));
  await page.click('#limpiar');
  const limpio = await page.evaluate(() => document.getElementById('count').textContent);

  console.log(`catalogo-1280.png · montado ${montado}ms · ${JSON.stringify(medida)} · errores: ${errores.length ? errores.join(' | ') : 'ninguno'}`);
  console.log(`  buscador «Ori» → ${JSON.stringify(busca)}`);
  console.log(`  filtro sur → ${JSON.stringify(sur)}`);
  console.log(`  sur + 10 o más → ${JSON.stringify(surGrandes)}`);
  console.log(`  limpiar → ${JSON.stringify(limpio)}`);
  await page.close();
}

// 390 — el mismo catálogo en el teléfono
{
  const { page, errores, montado, medida } = await abrir(390, 844);
  await page.screenshot({ path: OUT + 'catalogo-390.png', fullPage: true });
  console.log(`catalogo-390.png · montado ${montado}ms · ${JSON.stringify(medida)} · errores: ${errores.length ? errores.join(' | ') : 'ninguno'}`);
  await page.close();
}

await browser.close();
