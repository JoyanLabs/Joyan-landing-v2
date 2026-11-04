import { PALETTES } from './paletas-palettes.mjs';
import { renderPanel, focusPanel } from './paletas-render.mjs';
import { measurePanel } from './paletas-measure.mjs';
const rail=document.querySelector('.comparison');
// Reuse the exact existing hero copy rather than inventing a palette-specific
// headline. The study never writes to, loads the runtime of, or links back into
// the approved page. Cloned text cannot import scripts or styles.
const source=new DOMParser().parseFromString(await(await fetch('./index.html')).text(),'text/html');
const copy=source.querySelector('.hero-copy');
const states=[];let focused=false,ready=false;
for(const p of PALETTES){
 const article=document.createElement('article');article.className='candidate';article.id=`candidate-${p.id}`;article.dataset.palette=p.id;article.setAttribute('aria-labelledby',`name-${p.id}`);
 article.innerHTML=`<div class="render"><div class="reserved-utility" aria-hidden="true"></div></div>
 <section class="measurements" aria-label="Paleta y medidas de ${p.id}">
  <div class="candidate-heading"><h2 id="name-${p.id}">${p.id} · ${p.name}</h2><button class="depth" type="button" aria-pressed="false">Comparar profundidad</button></div>
  <dl class="palette-strip">${[['base','Base'],['dot','Tinta de punto'],['wash','Lavado'],['figure','Figura'],['cores','Núcleos']].map(([key,label])=>`<div><dt><span class="swatch swatch-${key}" aria-hidden="true"></span>${label}</dt><dd>${p[key==='dot'?'ink':key]}</dd></div>`).join('')}</dl>
  <dl class="numbers" aria-live="polite"><div><dt>Midiendo el compuesto…</dt><dd>—</dd></div></dl>
  <p class="verdict">${p.verdict}</p><p class="note">${p.note}</p><p class="note">Vista base fija · <span class="size"></span> · cifras calculadas en este navegador, no valores de la tabla de color.</p>
 </section>`;
 const clone=copy.cloneNode(true),title=clone.querySelector('h1');
 const replacement=document.createElement('h2');replacement.className=title.className;replacement.innerHTML=title.innerHTML;title.replaceWith(replacement);
 article.querySelector('.render').prepend(clone);rail.append(article);
}
function numbers(state){
 const m=measurePanel(state);state.measurement=m;
 state.el.closest('article').querySelector('.numbers').innerHTML=[
  ['Titular · peor celda (≥ 4,5)',`${m.headlineWorstCell.toFixed(2)}:1`],
  ['Campo / stock · media',`${m.fieldStockContrast.toFixed(3)}:1`],
  ['Peldaños de punto · planos (≥ 3)',`${m.rungs}`],
  ['Halo / entorno',m.haloDirection==='brighter'?'Más claro':'Más oscuro'],
 ].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
 state.el.closest('article').querySelector('.size').textContent=`${state.width} × ${state.height} px · cielo: ${m.skyRungs.length} peldaños; conjunto: ${m.rungs}`;
 return m;
}
function build(){
 ready=false;states.length=0;
 for(const p of PALETTES){const el=document.querySelector(`#candidate-${p.id} .render`);el.querySelectorAll('canvas').forEach(c=>c.remove());states.push(renderPanel(el,p));}
 states.forEach(numbers);if(focused)states.forEach(s=>focusPanel(s,true,true));ready=true;
}
function focus(){
 focused=!focused;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 states.forEach(s=>focusPanel(s,focused,reduced));
 document.querySelectorAll('.depth').forEach(b=>{b.setAttribute('aria-pressed',String(focused));b.textContent=focused?'Volver a vista base':'Comparar profundidad';});
}
document.querySelectorAll('.depth').forEach(b=>b.addEventListener('click',focus));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&focused)focus();});
await document.fonts.ready;build();
let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(build,180);});
window.paletteStudy={get ready(){return ready;},measure:()=>states.map(numbers),states,focus};
