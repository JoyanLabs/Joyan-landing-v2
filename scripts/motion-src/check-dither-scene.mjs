#!/usr/bin/env node
/** Local Chromium acceptance; uses the existing external motion toolchain. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { loadPlaywright } from './render.mjs';
import { SCENE } from './render-dither-scene.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const out = resolve(root, 'dist-motion-verify/wu12');
const red = process.argv.includes('--red');
const base = 'http://127.0.0.1:4321';
const failures = [], views = [], controls = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const hash = data => createHash('sha256').update(data).digest('hex');
const { width: W, height: H, cell: CELL, agent, gate } = SCENE;
const overlap = (a,b) => a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
function layout(box) {
  const scale = Math.max(box.width/W, box.height/H);
  return { scale, x:box.x+(box.width-W*scale)/2, y:box.y+(box.height-H*scale)/2 };
}
function envelopes(box) {
  const p = layout(box);
  return [agent, { ...gate,radius:gate.flare }].map(s => {
    const r = s.radius + 2*CELL;
    return { x:p.x+(s.x-r)*p.scale, y:p.y+(s.y-r)*p.scale, width:2*r*p.scale, height:2*r*p.scale };
  });
}
async function recognize(buffer, box) {
  const { data,info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject:true });
  const p = layout(box);
  const sample = (s,mask) => {
    const r = (s.radius ?? s.half)*p.scale, cx=p.x+s.x*p.scale, cy=p.y+s.y*p.scale;
    const bins=[0,0,0,0]; let sum=0,n=0,amber=0,ink=0,bright=0;
    for(let y=Math.max(0,Math.floor(cy-r));y<Math.min(info.height,Math.ceil(cy+r));y++) {
      for(let x=Math.max(0,Math.floor(cx-r));x<Math.min(info.width,Math.ceil(cx+r));x++) {
        const dx=(x+.5-cx)/r,dy=(y+.5-cy)/r;
        if(!mask(dx,dy)) continue;
        const i=(y*info.width+x)*3, rr=data[i],g=data[i+1],b=data[i+2];
        const lum=.2126*rr+.7152*g+.0722*b; sum+=lum; n++;
        if(lum>35) { bright++; bins[(dx<0?1:0)+(dy<0?2:0)]++; }
        if(lum<24) ink++;
        if(rr-b>20 && rr>g && g>b) amber++;
      }
    }
    return { mean:sum/Math.max(1,n), n,bins,amber,ink,bright };
  };
  const rim=sample(agent,(x,y)=>x*x+y*y>.69**2 && x*x+y*y<.94**2);
  const hollow=sample(agent,(x,y)=>x*x+y*y<.55**2 && Math.abs(x)>.32);
  const block=sample(agent,(x,y)=>Math.abs(x)<.20 && Math.abs(y)<.23);
  const diamond=sample(gate,(x,y)=>Math.abs(x)+Math.abs(y)<.85);
  const problems=[];
  if(rim.bins.some(n=>n<4) || rim.mean<hollow.mean+5) problems.push('unrecognizable ring');
  if(block.mean<hollow.mean+8 || block.bright<4) problems.push('unrecognizable block');
  if(diamond.amber<10) problems.push('absent amber gate');
  if(rim.ink<10 || rim.bright<10) problems.push('absent dot/ink contrast');
  return { rim,hollow,block,diamond,problems };
}
await mkdir(out,{recursive:true});
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
try {
  for(const locale of ['es','en']) for(const [width,height] of [[390,844],[768,1024],[1440,900]]) {
    for(const reducedMotion of ['no-preference','reduce']) {
      const label=`${locale}-${width}-${reducedMotion}`;
      const page=await browser.newPage({viewport:{width,height},reducedMotion});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
      page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
      const response=await page.goto(`${base}/${locale==='en'?'en':''}`,{waitUntil:'networkidle'});
      await page.evaluate(()=>document.fonts.ready);
      const baseline=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
      if(red) {
        views.push({label,...baseline,sceneCount:await page.locator('#dither-scene').count()});
        check(await page.locator('#dither-scene').count()===1,`${label}: missing new visible #dither-scene`);
        await page.close(); continue;
      }
      check(response.status()===200,`${label}: HTTP ${response.status()}`);
      const expectedOverflow=width===390?(locale==='es'?488:442):width;
      check(baseline.documentWidth===expectedOverflow,`${label}: document overflow changed from ${expectedOverflow} to ${baseline.documentWidth}`);
      await page.screenshot({path:resolve(out,`${label}-hero.png`)});
      await page.evaluate(()=>{location.hash='dither-scene';});
      await page.locator('#dither-scene').waitFor({state:'visible'});
      await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.querySelector('#dither-scene').scrollIntoView({block:'start',behavior:'instant'});});
      await page.waitForTimeout(250);
      const measure=()=>page.evaluate(()=>{
        const el=document.querySelector('#dither-scene'),v=el.querySelector('video'),img=el.querySelector('img');
        const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
        const sty=e=>{const s=getComputedStyle(e);return {display:s.display,opacity:s.opacity,objectFit:s.objectFit};};
        return {box:rect(v),frame:rect(el.querySelector('[data-dither-frame]')),video:sty(v),poster:sty(img),natural:[img.naturalWidth,img.naturalHeight],posterLoaded:img.complete,
          time:v.currentTime,duration:v.duration,readyState:v.readyState,paused:v.paused,currentSrc:v.currentSrc,
          adjacent:el.previousElementSibling?.id,documentWidth:document.documentElement.scrollWidth,
          content:[document.querySelector('header'),...document.querySelectorAll('main h1,main h2,main p,main a')].map(rect).filter(r=>r.width>0&&r.height>0)};
      });
      let v=await measure();
      const before=v.time;
      await page.waitForTimeout(1250);
      v=await measure();
      const advance=(v.time-before+15)%15;
      let loop;
      if (reducedMotion === 'no-preference') {
        await page.locator('#dither-scene video').evaluate(async video => {
          video.currentTime = 14.6;
          await new Promise(ok => video.addEventListener('seeked', ok, { once: true }));
          await video.play();
        });
        await page.waitForTimeout(1000);
        loop = await page.locator('#dither-scene video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
        check(!loop.paused && loop.time < 2, `${label}: native loop did not wrap`);
      }
      check(v.adjacent==='top',`${label}: scene not immediately after hero`);
      check(v.frame.x>=0 && v.frame.x+v.frame.width<=width+.5,`${label}: new surface overflows horizontally`);
      check(v.documentWidth===baseline.documentWidth,`${label}: per-surface overflow delta`);
      check(v.natural[0]===W&&v.natural[1]===H&&v.posterLoaded,`${label}: accurate poster unavailable`);
      if(reducedMotion==='no-preference') {
        check(v.video.display!=='none'&&v.readyState>=2&&!v.paused&&advance>.5,`${label}: native video did not advance`);
        check(Math.abs(v.duration-15)<.05,`${label}: loop length is not 15s`);
      } else check(v.video.display==='none'&&v.poster.display!=='none',`${label}: reduced motion did not expose poster`);
      // Freeze at the documented support beat for repeatable visual inspection;
      // playback evidence above is collected before any verifier seek/pause.
      await page.locator('#dither-scene video').evaluate(async v=>{
        v.pause(); v.currentTime=7.8;
        if(v.readyState<2 || Math.abs(v.currentTime-7.8)>.05) await new Promise(ok=>v.addEventListener('seeked',ok,{once:true}));
      });
      await page.waitForTimeout(200);
      const projected=envelopes(v.frame),pitch=CELL*layout(v.frame).scale;
      for(const b of projected) {
        check(b.x>=v.frame.x&&b.x+b.width<=v.frame.x+v.frame.width&&b.y>=v.frame.y&&b.y+b.height<=v.frame.y+v.frame.height,`${label}: full semantic envelope cropped`);
        check(b.y>=0&&b.y+b.height<=height,`${label}: scene outside hash viewport`);
        check(!v.content.some(c=>overlap(b,c)),`${label}: semantic body intersects copy/CTA/header`);
      }
      const shot=await page.screenshot({path:resolve(out,`${label}.png`)});
      const recognition=await recognize(shot,v.frame);
      check(!recognition.problems.length,`${label}: ${recognition.problems.join(', ')}`);
      // Existing below-hero reveals hide unvisited sections in a naive
      // full-page capture. Visit them before inspecting overall placement.
      const scroll = await page.evaluate(() => scrollY);
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < pageHeight; y += height * .75) {
        await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y);
        await page.waitForTimeout(100);
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(700);
      await page.screenshot({path:resolve(out,`${label}-full.png`),fullPage:true});
      await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), scroll);
      await page.waitForTimeout(100);
      await page.evaluate(()=>{document.querySelectorAll('#dither-scene video,#dither-scene img').forEach(e=>e.style.opacity='0');});
      const hidden=await recognize(await page.screenshot(),v.frame);
      check(hidden.problems.length>=3,`${label}: hidden-art negative control falsely accepted`);
      controls.push({label,rejected:hidden.problems});
      check(!errors.length,`${label}: ${errors.join('; ')}`);
      views.push({label,baseline,overflowDelta:v.documentWidth-baseline.documentWidth,pitch,advance,loop,...v,projected,recognition,errors});
      await page.close();
    }
  }
  if(!red) {
    // No JS does NOT disable native autoplay; report the measured behavior.
    for(const reducedMotion of ['no-preference','reduce']) {
      const page=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false,reducedMotion});
      await page.goto(`${base}/#dither-scene`,{waitUntil:'networkidle'});
      const read=()=>page.locator('#dither-scene video').evaluate(v=>({time:v.currentTime,display:getComputedStyle(v).display,paused:v.paused}));
      const a=await read(); await page.waitForTimeout(1200); const b=await read();
      views.push({label:`no-js-${reducedMotion}`,before:a,after:b,advance:(b.time-a.time+15)%15});
      check(reducedMotion==='reduce'?b.display==='none':!b.paused&&b.time!==a.time,`no-js ${reducedMotion}: native contract failed`);
      await page.close();
    }
    const source = { frames: 0, unique: new Set(), amberOutsideGate: 0, offBrand: 0, badCorners: 0, beatChanges: Array(15).fill(0) };
    let previous;
    for (let frame = 0; frame < 450; frame++) {
      const png = await readFile(resolve(root, 'dist-motion-wu12/frames', `f${String(frame).padStart(4, '0')}.png`));
      source.unique.add(hash(png));
      const pixels = await sharp(png).removeAlpha().raw().toBuffer();
      if (previous && !pixels.equals(previous)) source.beatChanges[Math.floor(frame / 30)]++;
      previous = pixels;
      for (let i = 0; i < pixels.length; i += 3) {
        const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
        const neutral = Math.max(r,g,b) - Math.min(r,g,b) <= 7;
        if (!neutral) {
          const hue = 60 * (g-b) / (r-b);
          if (!(r>g && g>b && hue>=30 && hue<=50)) source.offBrand++;
          const x = (i/3)%W, y = Math.floor(i/3/W);
          if (Math.abs(x-gate.x)>gate.flare+2*CELL || Math.abs(y-gate.y)>gate.flare+2*CELL) source.amberOutsideGate++;
        }
      }
      for (let y = 0; y+CELL<=H; y+=CELL) for (let x = 0; x+CELL<=W; x+=CELL) {
        const i = (y*W+x)*3;
        if (pixels[i]!==11 || pixels[i+1]!==11 || pixels[i+2]!==12) source.badCorners++;
      }
      source.frames++;
    }
    check(!source.offBrand && !source.amberOutsideGate && !source.badCorners, '450-frame source bitmap palette/cell/gate rule failed');
    check(source.unique.size>300 && source.beatChanges.every(n=>n>0), 'fresh source lacks meaningful multi-beat motion');
    views.push({label:'source-bitmaps', ...source, unique:source.unique.size});
    const poster=await readFile(resolve(root,'public/assets/dither/scene-dither.png'));
    const movie=await readFile(resolve(root,'public/assets/motion/harness-tones-dither.mp4'));
    const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,nb_frames,avg_frame_rate,duration','-of','json',resolve(root,'public/assets/motion/harness-tones-dither.mp4')],{encoding:'utf8'});
    check(probe.status===0,'ffprobe failed');
    const stream=JSON.parse(probe.stdout).streams[0];
    check(stream.codec_name==='h264'&&stream.nb_frames==='450'&&stream.width===W&&stream.height===H&&stream.avg_frame_rate==='30/1','new encode contract failed');
    check(movie.length<=300*1024&&poster.length<=80*1024,'new asset budgets exceeded');
    for(const [path,data] of [['assets/dither/scene-dither.png',poster],['assets/motion/harness-tones-dither.mp4',movie]]) {
      check(data.equals(await readFile(resolve(root,'dist',path))),`dist ${path} differs`);
      check(data.equals(Buffer.from(await (await fetch(`${base}/${path}`)).arrayBuffer())),`live ${path} differs`);
    }
    views.push({label:'delivery',stream,movie:{bytes:movie.length,sha256:hash(movie)},poster:{bytes:poster.length,sha256:hash(poster)}});
    const inventory = spawnSync('git', ['ls-files', 'public/assets/motion'], { cwd: root, encoding: 'utf8' });
    check(inventory.status === 0, 'protected film inventory unavailable');
    const originalFilms = inventory.stdout.trim().split('\n')
      .filter(path => path !== 'public/assets/motion/harness-tones-dither.mp4');
    check(originalFilms.length === 10, 'original ten-encode inventory changed');
    const protectedPaths = [
      ...originalFilms, 'package.json', 'pnpm-lock.yaml', '.artifacts/iteration-2-client-js.json',
      'public/assets/dither/hero-dither.png', 'public/assets/brand/og-default.png', 'scripts/dither-src/og-tone.png',
      'scripts/motion-src/render.mjs', 'scripts/motion-src/dither.js', 'scripts/motion-src/lib.js',
      'scripts/motion-src/composition.html', 'scripts/motion-src/scenes/J1.js',
      ...['F1','F2','F3','F4','F5'].map(id => `scripts/motion-src/films/${id}.js`),
      'src/lib/i18n/es.ts', 'src/lib/i18n/en.ts', 'src/assets/styles/tailwind.css',
      'src/components/joyan/MotionFigure.astro', 'src/components/joyan/SectionFilm.astro',
    ];
    const preservation = [];
    for (const path of protectedPaths) {
      const committed = spawnSync('git', ['show', `HEAD:${path}`], { cwd: root, maxBuffer: 4*1024*1024 });
      check(committed.status === 0, `${path}: protected HEAD unavailable`);
      const current = await readFile(resolve(root, path));
      const unchanged = committed.stdout.equals(current);
      check(unchanged, `${path}: protected bytes changed`);
      preservation.push({ path, unchanged, sha256: hash(current) });
    }
    check(preservation.find(p => p.path==='public/assets/dither/hero-dither.png').sha256==='b9c1ad1b6bb68ba8dc813fb329e0e25b67fbf393d4ad5e8c3aa2ad9d9041ec18', 'protected hero hash changed');
    check(preservation.find(p => p.path==='public/assets/brand/og-default.png').sha256==='a49aabb8334ae756eb207996dc3e83fe343676fcac0400e9e32358886961921e', 'protected OG hash changed');
    await writeFile(resolve(out,'preservation.json'),JSON.stringify(preservation,null,2)+'\n');
    views.push({ label: 'preservation', paths: preservation.length, unchanged: preservation.every(p => p.unchanged), originalEncodes: originalFilms.length });
  }
} catch(error) { failures.push(error.stack); }
finally { await browser.close(); }
const report={phase:red?'RED':'GREEN',views,controls,failures};
await writeFile(resolve(out,`${red?'red':'green'}.json`),JSON.stringify(report,null,2)+'\n');
await writeFile(resolve(out,`${red?'red':'green'}.log`),failures.length?failures.join('\n')+'\n':`PASS ${views.length} cases; hidden-art controls ${controls.length}\n`);
await appendFile(resolve(out,'check-attempts.jsonl'),JSON.stringify(report)+'\n');
console.log(JSON.stringify({ phase: report.phase, views: views.map(({ content, ...view }) => view), controls, failures },null,2));
assert.equal(failures.length,0,failures.join('\n'));
