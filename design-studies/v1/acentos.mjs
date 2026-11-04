import { measurements, GROUND, contrast } from './acentos-colors.mjs';
const root = document.querySelector('#comparisons');
const number = n => n.toFixed(2).replace('.', ',');
const ready = [];
for (const v of measurements()) {
  const section = document.createElement('section');
  section.className = 'variant';
  section.id = v.id;
  section.dataset.accent = v.id;
  section.setAttribute('aria-labelledby', `${v.id}-title`);
  section.innerHTML = `
    <header class="variant-heading">
      <h2 id="${v.id}-title"><span class="variant-number">${v.id.toUpperCase()} · ${v.id === 'v0' ? 'Control' : 'Candidato ' + v.id.slice(1)}</span>${v.name}</h2>
      <p class="accent-hex"><span class="accent-chip" aria-hidden="true"></span>${v.accent}</p>
    </header>
    <iframe class="scene-frame" title="${v.id.toUpperCase()} · ${v.name}: hero real interactivo" src="index.html"></iframe>
    <div class="variant-detail">
      <p class="variant-reading">${v.reading}</p>
      <div class="ui-sample" aria-label="Muestra UI sobre ${GROUND}">
        <p class="ui-eyebrow">Origen / Arequipa</p>
        <code class="ui-code">S1–AQ / 017</code>
        <a class="ui-link" href="#${v.id}-verdict">Explorar el origen</a>
        <button class="ui-focus" type="button" aria-label="Probar foco de ${v.name}">Probar foco</button>
      </div>
      <p class="ui-note">Texto (etiqueta, ID y enlace): <code>${v.ui}</code>. Anillo de foco: <code>${v.accent}</code>, sólido de 2 px, con separación de 4 px sobre <code>${GROUND}</code>. Vista de anillo siempre visible; al enfocar con teclado crece a 3 px / separación 6 px. Texto del botón <code>#EAF3E6</code>: ${number(contrast('#EAF3E6'))}:1.</p>
      <dl class="measurements">
        <div><dt>Texto UI · mínimo 4,5</dt><dd><strong>${number(v.textRatio)}:1</strong>${v.ui}</dd></div>
        <div><dt>Foco · mínimo 3,0</dt><dd><strong>${number(v.ringRatio)}:1</strong>${v.accent}</dd></div>
        <div><dt>Tono HSL / Δ ámbar</dt><dd><strong>${number(v.hue)}°</strong>Δ ${number(v.amberDistance)}°</dd></div>
        <div><dt>Acento original como texto</dt><dd><strong>${number(v.rawTextRatio)}:1</strong>${v.rawTextRatio >= 4.5 ? 'PASA ≥ 4,5' : 'FALLA < 4,5'}</dd></div>
      </dl>
      <p class="variant-verdict" id="${v.id}-verdict"><strong>Veredicto.</strong> ${v.verdict} ${v.id === 'v2' ? `Δ de tono ${number(v.amberDistance)}° respecto al ámbar (${number(v.amberHue)}°).` : v.id === 'v3' ? `Original: ${number(v.rawTextRatio)}:1; texto aclarado: ${number(v.textRatio)}:1.` : `Texto y foco: ${number(v.textRatio)}:1.`}</p>
    </div>`;
  const frame = section.querySelector('iframe');
  ready.push(new Promise((resolve, reject) => {
    frame.addEventListener('load', async () => {
      try {
        const doc = frame.contentDocument;
        doc.documentElement.dataset.accentPreview = '';
        doc.documentElement.dataset.accent = v.id;
        const style = doc.createElement('link');
        style.rel = 'stylesheet';
        style.href = 'acentos.css';
        const loaded = new Promise((res, rej) => { style.onload = res; style.onerror = rej; });
        doc.head.append(style);
        await loaded;
        // Wait for the real runtime, not a substitute still or a new field.
        while (doc.querySelector('[data-stage]')?.dataset.painted !== 'true') {
          await new Promise(res => setTimeout(res, 50));
        }
        section.dataset.ready = 'true';
        resolve();
      } catch (error) { reject(error); }
    }, { once: true });
  }));
  root.append(section);
}
Promise.all(ready).then(() => { document.documentElement.dataset.ready = 'true'; }).catch(() => {
  document.documentElement.dataset.ready = 'error';
  const message = document.createElement('p');
  message.className = 'study-footer';
  message.textContent = 'No se pudo cargar una vista. Recarga la página antes de comparar los acentos.';
  root.prepend(message);
});
