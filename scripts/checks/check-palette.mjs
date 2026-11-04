#!/usr/bin/env node
/** Focused, local-only palette contract. All evidence is written beside this file.
 * Serves only the study and its engine modules; no repository-wide static server.
 * Run: node dist-motion-verify/wu120-paleta/verify.mjs
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';

const OUT = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(OUT, '../..');
const STUDY = 'design-studies/v1/';
const sha = data => createHash('sha256').update(data).digest('hex');
const load = name => readFile(resolve(ROOT, name));
const save = (name, data) => writeFile(resolve(OUT, name), data);
const tracked = ['index.html', 'v1.css', 'v1.mjs', 'hero-field.mjs', 'poster-sky.png', 'scene-constelacion2.mjs'];
const sources = Object.fromEntries(await Promise.all(tracked.map(async name => [name, await load(STUDY + name)])));
const normalizeHtml = html => html.replace(' data-ground="dark"', '').replace(/  <div class="grounds"[\s\S]*?<\/div>\n/, '');
let baseline;
try { baseline = JSON.parse(await readFile(resolve(OUT, 'baseline.json'), 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = { htmlWithoutGroundControl: normalizeHtml(sources['index.html'].toString()),
    hashes: Object.fromEntries(['poster-sky.png', 'scene-constelacion2.mjs'].map(name => [name, sha(sources[name])])) };
  await save('baseline.json', JSON.stringify(baseline, null, 2) + '\n');
}
const report = { command: 'node dist-motion-verify/wu120-paleta/verify.mjs', errors: [], checks: {}, inventories: {}, captures: [], contrast: [], motion: {}, noJs: {} };
const check = (name, condition, detail) => { report.checks[name] = { pass: !!condition, detail }; };
const css = sources['v1.css'].toString(), runtime = sources['v1.mjs'].toString(), consumer = sources['hero-field.mjs'].toString();
const expectedRoles = { '--deep': '#0A1114', '--bg': '#10191C', '--surface': '#182A30', '--ink': '#E4EEEA', '--text': '#E4EEEA', '--muted': '#ACC3C1', '--accent': '#94CCBB' };
report.roles = Object.fromEntries(Object.keys(expectedRoles).map(role => [role, css.match(new RegExp(`${role}:\\s*(#[\\da-f]{6})`, 'i'))?.[1].toUpperCase() ?? null]));
check('page role palette', Object.entries(expectedRoles).every(([role, value]) => report.roles[role] === value), report.roles);
check('no ground controls or paper import', !/class="grounds"|class="ground"|ground-label/.test(sources['index.html'].toString()) && !/paper|grounds/.test(runtime) && !/import .*paper|dark, paper|paper:/.test(consumer), 'Single dark consumer; no toggle/label/paper import.');
check('copy order and signature unchanged', normalizeHtml(sources['index.html'].toString()) === baseline.htmlWithoutGroundControl, 'Exact HTML comparison with only the ground attribute/control removed.');
for (const [name, hash] of Object.entries(baseline.hashes)) check(`${name} unchanged`, sha(sources[name]) === hash, sha(sources[name]));
const pageFamily = new Set(['#0A1114','#10191C','#182A30','#E4EEEA','#ACC3C1','#94CCBB','#183039','#244C5B','#346E7B','#4D9199','#73B7B0','#A8D3BA','#D5E5CF']);
const emissionFamily = new Set([...pageFamily, '#060B0D', '#EAF3E6']);
for (const name of ['v1.css', 'v1.mjs', 'hero-field.mjs', 'scene-constelacion2.mjs']) {
  const lines = sources[name].toString().split('\n');
  report.inventories[name] = lines.flatMap((line, i) => [...line.matchAll(/#[\da-f]{6}\b/gi)].map(match => ({ hex: match[0].toUpperCase(), line: i + 1, context: line.trim() })));
}
const blueRule = css.match(/html\[data-shadow-study='B'\] \.signature \{([^}]+)\}/)?.[1] ?? '';
check('CSS contains only family plus explicit B shadow step', report.inventories['v1.css'].every(item => pageFamily.has(item.hex) || item.hex === '#1D3242') && (css.match(/#1D3242/g) ?? []).length === 2 && (blueRule.match(/#1D3242/g) ?? []).length === 2, report.inventories['v1.css']);
check('B shadow isolated from accent', /var\(--deep\) 24px/.test(blueRule) && /var\(--deep\) calc\(100% - 24px\)/.test(blueRule) && !/accent/.test(blueRule) && /searchParams.get\('shadow-study'\)==='B'/.test(runtime), 'Only the signature background changes; 24px deep buffer, no accent gradient.');
const maskOnly = line => /palette:\s*\[\s*'#000000'\s*,\s*'#FFFFFF'\s*\]/.test(line);
check('modules contain only family or non-rendered binary masks', ['v1.mjs', 'hero-field.mjs'].every(name => report.inventories[name].every(item => pageFamily.has(item.hex) || maskOnly(item.context))), 'Black/white scratch masks encode coverage; they are never page inks.');
check('emission own extended ramp', report.inventories['scene-constelacion2.mjs'].every(item => emissionFamily.has(item.hex)), [...new Set(report.inventories['scene-constelacion2.mjs'].map(item => item.hex))]);
check('one accent definition and preserved node uses', (css.match(/--accent:\s*#94CCBB\b/g) ?? []).length === 1 && !/--accent:\s*(?!#94CCBB\b)#[\da-f]{6}/i.test(css) && /\.node-controls \.node-lit \{ filter: drop-shadow\(0 0 3px var\(--accent\)\)/.test(css), 'Accent roles are checked in the live CSSOM below.');
try { await access(resolve(ROOT, STUDY, 'scene-constelacion2-papel.mjs')); report.paperScene = 'Unused file retained: worker policy prohibits deletion; parent action required.'; }
catch (error) { if (error.code !== 'ENOENT') throw error; report.paperScene = 'Deleted.'; }
const failures = () => Object.entries(report.checks).filter(([, value]) => !value.pass).map(([name]) => name);
if (failures().length) {
  report.phase = 'RED';
  await save('red.json', JSON.stringify(report, null, 2) + '\n');
  console.error('RED:', failures().join('; '));
  process.exitCode = 1;
} else {
  const types = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(ROOT, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    const local = relative(ROOT, file);
    if (!(local.startsWith(STUDY) || local.startsWith('scripts/scene-src/')) || !types[extname(file)]) { res.writeHead(403).end(); return; }
    try { const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] }).end(data); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/${STUDY}`;
  let browser;
  const watch = page => {
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) report.errors.push({ kind: m.type(), message: m.text() }); });
    page.on('pageerror', e => report.errors.push({ kind: 'pageerror', message: String(e) }));
    page.on('requestfailed', r => report.errors.push({ kind: 'requestfailed', url: r.url(), message: r.failure()?.errorText }));
    page.on('response', r => { if (r.status() >= 400) report.errors.push({ kind: 'http', url: r.url(), status: r.status() }); });
  };
  const ready = async (page, variant) => { await page.goto(url + (variant === 'B' ? '?shadow-study=B' : '')); await page.waitForFunction(() => document.querySelector('[data-stage]').dataset.painted === 'true'); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(350); };
  const digestCanvases = async page => sha(await page.evaluate(() => [...document.querySelectorAll('.stage canvas')].map(c => c.toDataURL()).join('|')));
  const diagnostics = page => page.evaluate(async () => (await import('./v1.mjs')).fieldDiagnostics());
  const screenshot = async (page, name, fullPage = false) => { await page.screenshot({ path: resolve(OUT, name), fullPage }); report.captures.push(name); };
  // Every rendered text node, not a curated selector list. Composite all ancestor
  // background colors (including alpha). Hero and header get a separate raster
  // measurement because a first opaque ancestor cannot describe a layered sky.
  const textPairs = () => {
    const parse = s => { const v = s.match(/[\d.]+/g)?.map(Number) ?? [0,0,0,0]; return [...v.slice(0,3), v[3] ?? 1]; };
    const over = (a,b) => a.slice(0,3).map((v,i) => v*a[3]+b[i]*(1-a[3])).concat(1);
    const hex = c => '#' + c.slice(0,3).map(v => Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
    const luma = c => c.slice(0,3).map(v => { v /= 255; return v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4; }).reduce((a,v,i) => a+v*[.2126,.7152,.0722][i],0);
    const ratio = (a,b) => (Math.max(luma(a),luma(b))+.05)/(Math.min(luma(a),luma(b))+.05);
    const rows = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, el = node.parentElement, text = node.textContent.trim();
      if (!text || !el || el.closest('script,style,template,.sr-only')) continue;
      const cs = getComputedStyle(el), range = document.createRange(); range.selectNodeContents(node);
      if (cs.visibility !== 'visible' || !range.getClientRects().length) continue;
      const chain = []; for(let p=el;p;p=p.parentElement) chain.unshift(p);
      let bg = [0,0,0,1]; for(const p of chain) bg = over(parse(getComputedStyle(p).backgroundColor),bg);
      const fg = over(parse(cs.color), bg), px = parseFloat(cs.fontSize), weight = Number(cs.fontWeight);
      rows.push({ text: text.slice(0,100), element: el.tagName.toLowerCase()+'.'+el.className,
        foreground: hex(fg), background: hex(bg), fontPx:px, weight, threshold:px>=24||(px>=18.6667&&weight>=700)?3:4.5,
        ratio:ratio(fg,bg), layered:!!el.closest('.hero,.top,.signature') });
    }
    for (const el of document.querySelectorAll('.limits li')) {
      const cs=getComputedStyle(el,'::before');
      if(cs.content!=='none') rows.push({text:'— (::before)',element:'.limits li::before',foreground:hex(parse(cs.color)),background:hex(parse(getComputedStyle(document.body).backgroundColor)),fontPx:parseFloat(cs.fontSize),threshold:4.5,ratio:ratio(parse(cs.color),parse(getComputedStyle(document.body).backgroundColor))});
    }
    const root=getComputedStyle(document.documentElement), bg=parse(getComputedStyle(document.body).backgroundColor);
    // Resolve hex custom property through a real computed color, not parse(rgb).
    const c=document.createElement('span');c.style.color=root.getPropertyValue('--accent');document.body.append(c);
    const a=parse(getComputedStyle(c).color);c.remove();
    rows.push({text:'selection text',element:'::selection',foreground:hex(bg),background:hex(a),threshold:4.5,ratio:ratio(bg,a)});
    return rows;
  };
  const structure = () => {
    const clean = value => value.replace(/\s+/g,' ').trim();
    const body = clean(document.body.innerText), signature = document.querySelector('.signature');
    const headings=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h=>({level:Number(h.tagName[1]),text:clean(h.textContent)}));
    const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
    const glosses=[['L1–L4','Las cuatro líneas de servicio'],['O0–O3','Niveles de evidencia'],['OTel','(OpenTelemetry)'],['peer','(dispositivo o entorno conectado a la red)'],['SCIM','(provisión de usuarios desde el proveedor de identidad)'],['Magi','el plano de control propuesto']].map(([token,gloss])=>({token,delta:body.indexOf(gloss)-body.indexOf(token),present:body.includes(token)&&body.includes(gloss)}));
    const li=document.querySelector('.limits li'), p=document.querySelector('.line-body p');
    return { headings, oneH1:headings.filter(h=>h.level===1).length===1, orderedHeadings:headings.every((h,i)=>!i||h.level-headings[i-1].level<=1),
      noGroundControls:!document.querySelector('.grounds,.ground,.ground-label'),
      signatureIsLast:document.querySelector('main').nextElementSibling===signature&&clean(signature.textContent)==='Alguien tiene que vigilar a las máquinas.'&&signature.children.length===1&&(body.match(/Alguien tiene que vigilar a las máquinas\./g)||[]).length===1&&body.endsWith('Alguien tiene que vigilar a las máquinas.'),
      noReadouts:!(/\bDPR\s?\d|\d+(\.\d+)?\s?ms\b|\bframe\s\d|escala\s×|celda\s\d|canvas\s\d+\s×|din[aá]mico\s\d/.test(body)),
      glosses, levelsDefined:body.includes('O2 O1 más red e identidad')&&body.includes('O3 O2 más exportación PROV/RO-Crate'),
      limitsInBody:!!li.closest('.line-body')&&!li.closest('small,aside,figcaption')&&getComputedStyle(li).fontSize===getComputedStyle(p).fontSize&&['license.netbird.io','no hay air-gapped con licencia','un solo inquilino','son sólo Enterprise'].every(t=>body.includes(t)),
      prohibitions:!/en producción|Magi en prod|sin egreso|egreso de datos|decide solo|sin aprobaci[oó]n|\bdesde\s+\d|€|\$\s?\d|\bprecio\b|GDPR|RGPD|reglamento europeo|EU AI Act|Cusco/.test(body)&&body.includes('No hay ISO ni SOC 2')&&(body.match(/ISO|SOC 2/g)||[]).length===2,
      hiddenCanvases:[...document.querySelectorAll('canvas')].every(c=>c.getAttribute('aria-hidden')==='true'), decorativeSvgHidden:document.querySelector('[data-constellation]').getAttribute('aria-hidden')==='true',
      textEquivalent:document.querySelector('#node-help').textContent.length>40, nativeUtilityButtons:[...document.querySelectorAll('.hero-utility button')].every(b=>b.tagName==='BUTTON'),
      duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i), inlineStyles:document.querySelectorAll('[style]').length,
      overflow:document.documentElement.scrollWidth>innerWidth,
      nodes:[...document.querySelectorAll('[data-node]')].map(n=>({role:n.getAttribute('role'),tabindex:n.getAttribute('tabindex'),label:n.getAttribute('aria-label'),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})) };
  };
  try {
    browser=await chromium.launch(); report.browser=browser.version();
    for(const variant of ['A','B']) for(const [width,height] of [[1280,900],[390,844]]) {
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page=await context.newPage();watch(page);await ready(page,variant);
      const prefix=`${variant}-${width}x${height}`;
      check(`explicit variant ${prefix}`, await page.evaluate(() => document.documentElement.dataset.shadowStudy === 'B') === (variant === 'B'), 'A default; B only via ?shadow-study=B.');
      await screenshot(page,`${prefix}.png`);await screenshot(page,`${prefix}-full.png`,true);
      await page.locator('.signature').screenshot({path:resolve(OUT,`${prefix}-shadow.png`)});report.captures.push(`${prefix}-shadow.png`);
      const s=await page.evaluate(structure);report[`structure${variant}${width}`]=s;
      await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(500);
      const liveFirst=await digestCanvases(page);await page.waitForTimeout(750);const liveSecond=await digestCanvases(page);
      check(`live field ${prefix}`,liveFirst!==liveSecond,{first:liveFirst,second:liveSecond});
      check(`structure ${prefix}`,  s.oneH1&&s.orderedHeadings&&s.noGroundControls&&s.signatureIsLast&&s.noReadouts&&s.glosses.every(g=>g.present&&g.delta>=0&&g.delta<=260)&&s.levelsDefined&&s.limitsInBody&&s.prohibitions&&s.hiddenCanvases&&s.decorativeSvgHidden&&s.textEquivalent&&s.nativeUtilityButtons&&!s.duplicateIds.length&&!s.inlineStyles&&!s.overflow&&s.nodes.length===35&&s.nodes.every(n=>n.role==='button'&&n.tabindex==='0'&&n.label&&n.width>=24&&n.height>=24), s);
      report.contrast.push(...(await page.evaluate(textPairs)).map(pair=>({...pair,variant,viewport:width,state:'base'})));
      report[`accentRules${variant}${width}`]=await page.evaluate(()=>[...document.styleSheets].flatMap(sheet=>{
        const visit=rules=>[...rules].flatMap(rule=>[...(rule.style&&/--accent|--line/.test(rule.style.cssText)?[{selector:rule.selectorText,declarations:rule.style.cssText}]:[]),...(rule.cssRules?visit(rule.cssRules):[])]);
        return visit(sheet.cssRules);
      }));
      // Freeze through the page's own accessible pause control, then sample the
      // entire hero-title and wordmark rectangles without their glyphs. This
      // conservatively includes the gaps between lines, not only glyph pixels.
      await page.locator('.field-pause').click();await page.evaluate(()=>window.scrollTo(0,0));
      const boxes=await page.evaluate(()=>['.hero-title','.wordmark'].map(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect(),cs=getComputedStyle(el);return {selector,x:r.x,y:r.y,width:r.width,height:r.height,color:cs.color,fontPx:parseFloat(cs.fontSize)};}));
      await page.evaluate(()=>{document.querySelector('.hero-copy').style.visibility='hidden';document.querySelector('.wordmark').style.visibility='hidden';});
      const background=await page.screenshot();
      await page.evaluate(()=>{document.querySelector('.hero-copy').removeAttribute('style');document.querySelector('.wordmark').removeAttribute('style');});
      const raster=await page.evaluate(async({png,boxes})=>{
        const image=new Image();image.src=png;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,image.width,image.height).data;
        const luma=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
        return boxes.map(box=>{const ink=box.color.match(/[\d.]+/g).slice(0,3).map(Number),fg=luma(ink);let worst=Infinity,pixel=null;
          for(let y=Math.max(0,Math.floor(box.y));y<Math.min(image.height,Math.ceil(box.y+box.height));y++)for(let x=Math.max(0,Math.floor(box.x));x<Math.min(image.width,Math.ceil(box.x+box.width));x++) {const at=(y*image.width+x)*4,c=[data[at],data[at+1],data[at+2]],bg=luma(c),ratio=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);if(ratio<worst){worst=ratio;pixel={x,y,rgb:c};}}
          return {text:box.selector+' (whole background rectangle, without glyphs)',element:box.selector,foreground:box.color,background:pixel,ratio:worst,threshold:box.fontPx>=24?3:4.5,method:'Actual screenshot composite; every pixel of full text box, including whitespace.'};});
      },{png:'data:image/png;base64,'+background.toString('base64'),boxes});
      report.contrast.push(...raster.map(pair=>({...pair,variant,viewport:width,state:'layered-raster'})));
      // Sample the signature's complete background rectangle, including the
      // experiment's gradient, with its glyphs temporarily transparent.
      await page.locator('.signature').scrollIntoViewIfNeeded();
      await page.addStyleTag({content:'.signature p { color: transparent !important; }'}).then(async style=>{
        const png=await page.locator('.signature').screenshot();
        const measured=await page.evaluate(async png=>{
          const image=new Image();image.src=png;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
          const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
          const ink=[228,238,234],fg=lum(ink);let worst=Infinity,rgb;
          // Leave a 3px guard around the crop: fractional CSS edges can include
          // the accent border or a neighboring section in a locator screenshot.
          for(let y=3;y<c.height-3;y++)for(let x=3;x<c.width-3;x++){const at=(y*c.width+x)*4,pixel=[pixels[at],pixels[at+1],pixels[at+2]],bg=lum(pixel),r=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);if(r<worst){worst=r;rgb=pixel;}}
          return {text:'signature (whole background, without glyphs)',element:'.signature p',foreground:'#E4EEEA',background:rgb,ratio:worst,threshold:3,method:'Every pixel of padded signature background; 3px crop-edge guard excludes border/neighbor antialiasing.'};
        },'data:image/png;base64,'+png.toString('base64'));
        report.contrast.push({...measured,variant,viewport:width,state:'signature-raster'});await style.evaluate(el=>el.remove());
      });
      check(`no accent descendants in B plane ${prefix}`,await page.locator('.signature').evaluate(el=>[...el.querySelectorAll('*')].every(n=>getComputedStyle(n).color!=='rgb(148, 204, 187)')&&!el.querySelector('a,button,[data-node]')),'Only the original signature text, no marks or controls.');
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.locator('.field-pause').click();
      const node=page.locator('[data-node="0"]');await node.focus();await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
      const activated=await node.getAttribute('aria-pressed');
      report.contrast.push(...(await page.evaluate(textPairs)).map(pair=>({...pair,variant,viewport:width,state:'node-active'})));
      await page.keyboard.press('Escape');await page.waitForTimeout(1400);
      await node.focus();await page.keyboard.press('Space');await page.waitForTimeout(1500);
      await page.locator('.field-reset').click();await page.waitForTimeout(1400);
      check(`keyboard Enter Space Escape reset ${prefix}`, activated==='true'&&(await diagnostics(page)).active===-1&&await node.evaluate(el=>document.activeElement===el),'Enter activates; Escape resets; Space activates; reset restores focus.');
      await page.keyboard.press('Tab'); // Establish genuine keyboard modality after the pointer reset.
      await page.locator('.contact').focus();
      const focus=await page.locator('.contact').evaluate(el=>{const cs=getComputedStyle(el);return {visible:el.matches(':focus-visible'),outline:cs.outlineColor,width:cs.outlineWidth};});
      check(`contact focus ${prefix}`, focus.visible&&focus.outline==='rgb(148, 204, 187)'&&focus.width==='2px',focus);
      await page.locator('.contact').hover();
      report.contrast.push(...(await page.evaluate(textPairs)).filter(p=>p.element==='a.contact').map(pair=>({...pair,variant,viewport:width,state:'contact-hover'})));
      await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement.blur());
      await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(400);
      const first=await digestCanvases(page);await page.waitForTimeout(750);const second=await digestCanvases(page);
      check(`offscreen pause ${prefix}`, first===second,{first,second});
      await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(500);
      await page.locator('.field-pause').click();await page.waitForTimeout(200);
      const pausedFirst=await digestCanvases(page);await page.waitForTimeout(750);const pausedSecond=await digestCanvases(page);
      check(`manual pause ${prefix}`, pausedFirst===pausedSecond&&(await diagnostics(page)).paused,{first:pausedFirst,second:pausedSecond});
      check(`worker error ${prefix}`, !(await diagnostics(page)).emissionError,'No swallowed emission worker error.');
      await page.locator('.field-pause').click(); // Resume before testing reduced motion independently.
      await page.waitForTimeout(300);
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&document.querySelector('.field-pause').hidden);
      await page.waitForTimeout(500);
      const reducedFirst=await digestCanvases(page);await page.waitForTimeout(750);const reducedSecond=await digestCanvases(page);
      report.motion[prefix]={reducedHash:reducedSecond,diagnostics:await diagnostics(page)};
      check(`reduced still ${prefix}`,reducedFirst===reducedSecond&&!(await diagnostics(page)).paused&&!await page.locator('.field-pause').isVisible(),{first:reducedFirst,second:reducedSecond});
      await screenshot(page,`${prefix}-reduced.png`);
      await context.close();
      const noJsContext=await browser.newContext({viewport:{width,height},javaScriptEnabled:false});
      const noJs=await noJsContext.newPage();watch(noJs);await noJs.goto(url);await noJs.locator('.poster').evaluate(el=>el.decode());
      report.noJs[prefix]=await noJs.locator('.poster').evaluate(el=>({complete:el.complete,width:el.naturalWidth,height:el.naturalHeight,visible:getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).opacity!=='0'}));
      check(`no-JS poster ${prefix}`,report.noJs[prefix].complete&&report.noJs[prefix].visible&&report.noJs[prefix].width===2531,report.noJs[prefix]);
      await screenshot(noJs,`${prefix}-nojs.png`);await noJsContext.close();
    }
    for(const width of [1280,390]) {
      const key=width===1280?'1280x900':'390x844';
      check(`same scene A/B ${width}`,report.motion[`A-${key}`].reducedHash===report.motion[`B-${key}`].reducedHash,'Byte-identical canvas stack in the fixed reduced-motion still.');
    }
    const narrow=await browser.newContext({viewport:{width:320,height:640},reducedMotion:'reduce'});
    const narrowPage=await narrow.newPage();watch(narrowPage);await ready(narrowPage,'A');
    for(const width of [320,360,960]) {
      await narrowPage.setViewportSize({width,height:900});await narrowPage.waitForTimeout(500);
      check(`no horizontal overflow ${width}`,await narrowPage.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Fresh check at previous-pass alternate widths.');
    }
    await narrowPage.goto(url+'?shadow-study=C');
    check('unknown variant stays A',await narrowPage.evaluate(()=>document.documentElement.dataset.shadowStudy!=='B'),'Only explicit B activates the extra step.');await narrow.close();
    report.variantContrast=Object.fromEntries(['A','B'].map(variant=>{
      const pairs=report.contrast.filter(p=>p.variant===variant&&!(p.layered&&p.state!=='signature-raster'));
      const minimum=pairs.reduce((a,b)=>a.ratio<b.ratio?a:b);
      return [variant,{observations:pairs.length,minimum:minimum.ratio,minimumPair:minimum,failures:pairs.filter(p=>!Number.isFinite(p.ratio)||p.ratio<p.threshold)}];
    }));
    const minimum=report.contrast.filter(p=>!p.layered).reduce((a,b)=>a.ratio<b.ratio?a:b);
    report.contrastSummary={observations:report.contrast.length,uniquePairs:[...new Set(report.contrast.map(p=>`${p.foreground}|${JSON.stringify(p.background)}|${p.threshold}`))].length,minimum:minimum.ratio,minimumPair:minimum,failures:report.contrast.filter(p=>!p.layered&&(!Number.isFinite(p.ratio)||p.ratio<p.threshold))};
    check('all measured text pairs pass AA',!report.contrastSummary.failures.length,report.contrastSummary);
    check('zero console/page/network errors',!report.errors.length,report.errors);
  } catch(error) { report.errors.push({kind:'verification',message:error.stack}); check('verification completed',false,error.message); }
  finally { await browser?.close();await new Promise(resolve=>server.close(resolve)); }
  report.phase=failures().length?'FAIL':'GREEN';
  await save('report.json',JSON.stringify(report,null,2)+'\n');
  const inventory=Object.entries(report.inventories).map(([name,items])=>`### ${name}\n\n| hex | líneas |\n| --- | --- |\n`+[...new Set(items.map(i=>i.hex))].map(hex=>`| ${hex} | ${items.filter(i=>i.hex===hex).map(i=>i.line).join(', ')} |`).join('\n')).join('\n\n');
  const pairs=report.contrast.filter(p=>p.state==='base'&&!p.layered);
  const distinct=[...new Map(pairs.map(p=>[`${p.foreground}|${p.background}|${p.threshold}`,p])).values()];
  const accentRules=report.accentRulesA1280??[];
  await save('ACCENTS.md',`# Acento · todas las reglas activas o declaradas en v1.css\n\nÚnica definición: #94CCBB. Se incluyen aliases --line/--line-strong (alfa del mismo acento), incluso reglas de componentes que hoy no tienen nodos en el DOM. No se cargan acentos.css ni paletas.css desde index.html.\n\n| selector | declaraciones |\n| --- | --- |\n${accentRules.map(rule=>`| ${rule.selector} | ${rule.declarations} |`).join('\n')}\n\nLa emisión incluye #94CCBB como paso de su propia rampa extendida. No hay color de acento literal en v1.mjs; sus nodos usan las reglas CSS anteriores.\n`);
  await save('CHECKLIST.md',`# v1 · paleta de página, un solo suelo\n\nVerificación: \`node dist-motion-verify/wu120-paleta/verify.mjs\`. Chromium ${report.browser}.\nLa fuente de cada veredicto es report.json; no se reutilizan PASS de WU114.\n\n## Roles presentes en CSS\n\n| rol | hex |\n| --- | --- |\n${Object.entries(report.roles).map(([k,v])=>`| ${k} | ${v} |`).join('\n')}\n\nEl suelo de sección es #10191C; el campo lejano, velo del hero y firma usan #0A1114; la banda y placas usan #182A30. Texto principal y títulos comparten #E4EEEA; metadatos #ACC3C1. El acento sigue #94CCBB: selección, foco, marcas/códigos/cejas, enlace de contacto, anillos y resplandor de nodos; líneas divisorias usan su alfa, sin segundo acento. Todas las reglas de acento, incluidas las líneas divisorias por alias, están enumeradas en ACCENTS.md; también en accentRulesA1280, accentRulesA390 y sus equivalentes B de report.json.\n\n## Reglas observadas\n\n| regla | resultado | evidencia |\n| --- | --- | --- |\n${Object.entries(report.checks).map(([name,result])=>`| ${name} | ${result.pass?'PASS':'FAIL'} | report.checks[${JSON.stringify(name)}] |`).join('\n')}\n\nLa regla anterior de **control de suelo se retira**, no se marca PASS: papel está descartado, no existen selector ni etiqueta ni dos botones ni estados aria-pressed del suelo. Se verifica en su lugar su ausencia. Los nodos SVG conservan role=button, teclado y objetivos ≥24 px; los controles de pausa y retorno siguen siendo botones nativos.\n\n## Contraste\n\n${Object.entries(report.variantContrast??{}).map(([v,c])=>`**${v}: ${c.minimum.toFixed(2)}:1 mínimo; ${c.failures.length} fallos; ${c.observations} observaciones ópticas/no escénicas.**`).join('\n\n')}\n\n${report.contrastSummary?`Mínimo observado A/B **${report.contrastSummary.minimum.toFixed(2)}:1**, **${report.contrastSummary.failures.length} fallos**, ${report.contrastSummary.observations} observaciones en 1280×900 y 390×844 (base, nodo activo, retorno, enlace hover, selección y hero/cabecera rasterizados).`: 'Medición incompleta; consultar report.errors.'}\nSe recorren todos los nodos de texto visibles del DOM, con composición de fondos ancestrales y umbral AA por tamaño/peso. La columna layered no es contraste óptico: para hero y wordmark se mide además cada píxel de toda su caja sin glifos sobre una captura del compuesto real. Para firma se mide toda la superficie sin glifos, con una guarda de 3px en el borde del recorte para excluir la línea y la sección vecina. report.json conserva todas las observaciones sin redondear. No se afirma el mínimo histórico de 4.76:1 como resultado actual.\n\n| texto | suelo efectivo | umbral | ratio (base no escénica) | ejemplo |\n| --- | --- | --- | --- | --- |\n${distinct.map(p=>`| ${p.foreground} | ${p.background} | ${p.threshold} | ${p.ratio.toFixed(2)}:1 | ${p.element} |`).join('\n')}\n\n## Inventario literal de hex (entrada index.html y módulos activos)\n\n${inventory}\n\nLa emisión aporta **su propia rampa extendida**: #060B0D → #0A1114 → #10191C → #183039 → #244C5B → #346E7B → #4D9199 → #73B7B0 → #94CCBB → #A8D3BA → #D5E5CF → #EAF3E6. Sus extremos son pasos adicionales de la misma familia, no excepciones cromáticas ni acentos nuevos. No se remapea ni modifica la emisión.\nLos hex #000000 y #FFFFFF en hero-field.mjs son máscaras binarias de cobertura del rasterizador (canales de trabajo): nunca tintas del compuesto visible. La única adición experimental es #1D3242, dos paradas del mismo degradado B sobre la firma: sólo interpola con #0A1114, tras un colchón de 24px que lo separa del borde. A no lo activa. Ningún segundo acento en el consumidor. Los estudios históricos acentos/paletas no se importan en index.html y no forman parte de esta entrada. La variante B necesita JS para activar el atributo; sin JS ambas URLs conservan A.\n\n## Conservación y límites\n\n- HTML cotejado exactamente contra baseline.json descontando sólo atributo y grupo del suelo: copia, orden, firma y SVG sin cambios.\n- Hashes de póster y emisión cotejados contra baseline.json. Póster sólo cielo, sin regenerarlo ni agregar constelación. El SVG preexistente sigue en HTML, también sin JS; no se resuelve aquí esa decisión abierta.\n- Archivo de papel: ${report.paperScene}\n- Capturas: ${report.captures.map(name=>'\`'+name+'\`').join(', ')}.\n- **Revisión visual:** consultar VISUAL.md, escrito sólo después de abrir las capturas. El verificador no afirma haberlas visto.\n`);
  console.log(JSON.stringify({phase:report.phase,failures:failures(),contrast:report.contrastSummary&&{minimum:report.contrastSummary.minimum,failures:report.contrastSummary.failures.length,observations:report.contrastSummary.observations},errors:report.errors,captures:report.captures},null,2));
  process.exitCode=failures().length?1:0;
}
