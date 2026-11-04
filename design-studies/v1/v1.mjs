/** Layered viewport consumer: cached sky, sparse 12 Hz emission, compositor
 * camera/focus. The lab modules and their palettes are never modified. */
import { EMISSIONS, material, emissionPlanes, figureTransform, cameraFor, PARALLAX,
  TRANSITION_MS, RETURN_MS, STILL_SECONDS, NODE_PLANES, NODE_RATES, nodePlane } from './hero-field.mjs';
const stage=document.querySelector('[data-stage]'), canvas=document.querySelector('[data-sky]');
const ctx=canvas.getContext('2d',{alpha:false}), washCanvas=document.querySelector('[data-wash]');
const washCtx=washCanvas.getContext('2d'), svg=document.querySelector('[data-constellation]');
// The far sky has a pre-baked 6 px endpoint, mixed at half strength to retain
// detail. The middle wash stays live; its gentle desaturation is cached in a
// worker LUT, never a full-surface CSS filter.
function focusCopy(el){const copy=document.createElement('canvas');copy.className=el.className+' focus-copy';copy.setAttribute('aria-hidden','true');el.after(copy);return copy;}
const skyFocus=focusCopy(canvas);
const skyFocusCtx=skyFocus.getContext('2d',{alpha:false,willReadFrequently:true});
const controls=document.querySelector('[data-node-controls]'), vignette=document.querySelector('[data-vignette]');
const status=document.querySelector('[data-node-status]'), reset=document.querySelector('.field-reset');
const pause=document.querySelector('.field-pause');
// A stays the default; B is a deliberate, shareable layout-only experiment.
if(new URL(location.href).searchParams.get('shadow-study')==='B')document.documentElement.dataset.shadowStudy='B';
const motion=matchMedia('(prefers-reduced-motion: reduce)'), NS='http://www.w3.org/2000/svg';
const { NODES_PX, RINGS, LINKS_PX }=EMISSIONS.dark;
const ground='dark';
let width,height,f,sky,wash,focusedWash,worker,busy=false,generation=0;
let camera={x:0,y:0,zoom:1},transition=null,raf=0,active=-1,returnLeft=0;
let visible=true,hidden=false,paused=false,ready=false,hovered=-1,lastTime=null,clock=0,lastEmission=0;
let animations=[],textAnimations=[],textVersion=0;
const headline=document.querySelector('h1'), originalHeadline=headline.textContent;
const placeholders=NODE_PLANES.map(name=>document.querySelector(`template[data-placeholder="${name}"]`).content.textContent);
function letters(text){const fragment=document.createDocumentFragment();
  // Keep words as wrapping units; characters animate, not the line boxes.
  text.split(/(\s+)/).forEach(word=>{const span=document.createElement('span');span.className='hero-phrase';
    for(const char of word){const letter=document.createElement('span');letter.className='hero-letter';letter.textContent=char;span.append(letter);}fragment.append(span);});
  headline.replaceChildren(fragment);
}
function swapHeadline(index){
  const text=index<0?originalHeadline:placeholders[nodePlane(index)],version=++textVersion;
  textAnimations.forEach(a=>a.cancel());textAnimations=[];
  if(motion.matches){headline.textContent=text;return;}
  if(headline.textContent===text)return;
  const animate=enter=>[...headline.querySelectorAll('.hero-letter')].map((el,i)=>el.animate(
    enter?[{filter:'blur(5px)',opacity:0},{filter:'blur(0px)',opacity:1}]:[{filter:'blur(0px)',opacity:1},{filter:'blur(5px)',opacity:0}],
    {duration:180,delay:i*8,fill:'both',easing:'ease-in-out'}));
  if(!headline.querySelector('.hero-letter'))letters(headline.textContent);
  textAnimations=animate(false);if(!canRun())textAnimations.forEach(a=>a.pause());
  Promise.all(textAnimations.map(a=>a.finished)).then(()=>{
    if(version!==textVersion)return;letters(text);textAnimations=animate(true);
    if(!canRun())textAnimations.forEach(a=>a.pause());
    return Promise.all(textAnimations.map(a=>a.finished)).then(()=>{if(version===textVersion){textAnimations.forEach(a=>a.cancel());textAnimations=[];}});
  }).catch(()=>{});
}
const cache=new Map(), diagnostics={layers:PARALLAX,durationMs:TRANSITION_MS,signalCycleMs:12000,frames:[],dynamicFrames:[]};
const figure=document.createElementNS(NS,'g');figure.setAttribute('data-figure-camera','');
while(svg.firstChild)figure.append(svg.firstChild);svg.append(figure);
const stars=figure.querySelector('.stars').cloneNode(true),near=document.createElementNS(NS,'g');
near.setAttribute('data-core-camera','');stars.setAttribute('aria-hidden','true');near.append(stars);controls.append(near);
figure.querySelector('.stars').setAttribute('visibility','hidden');
const signal=document.createElementNS(NS,'circle');signal.setAttribute('class','signal');signal.setAttribute('r','1.7');
signal.setAttribute('opacity','0');figure.append(signal);
const nodeStars=[...stars.children];
const nodePlanes=NODE_PLANES.map(name=>{const group=document.createElementNS(NS,'g');group.setAttribute('class','node-plane');group.dataset.nodePlane=name;near.append(group);return group;});
nodeStars.forEach((star,i)=>{star.dataset.star=String(i);star.setAttribute('aria-hidden','true');nodePlanes[nodePlane(i)].append(star);});
stars.remove();
const linkIndices=LINKS_PX.map(edge=>edge.map(point=>NODES_PX.findIndex(n=>n[0]===point[0]&&n[1]===point[1])));
function planeCamera(plane,c=camera){const rate=NODE_RATES[plane];return {x:c.x*rate,y:c.y*rate,zoom:1+(c.zoom-1)*rate};}
function localPoint(index){const [x,y]=NODES_PX[index],c=planeCamera(nodePlane(index));return [(x*c.zoom+(c.x+(c.zoom-1)*f.x)/f.scale-camera.x/f.scale-(camera.zoom-1)*f.x/f.scale)/camera.zoom,
  (y*c.zoom+(c.y+(c.zoom-1)*f.y)/f.scale-camera.y/f.scale-(camera.zoom-1)*f.y/f.scale)/camera.zoom];}
function light(index,on){
  nodeStars[index].classList.toggle('node-lit',on);
  nodeStars[index].querySelector('.core').setAttribute('r',String((index%3===0?1.7:1.4)*(on?1.65:1)));
}
// 26 CSS px hit squares; overlapping squares route to the nearest authored
// centre, not the last SVG sibling. Stars keep their original visual radii.
function region(index){const [x,y]=NODES_PX[index],r=13/f.scale;return `M${x-r} ${y-r}h${2*r}v${2*r}h${-2*r}Z`;}
function nearest(event,fallback){
  if(!event.detail && event.type==='click')return fallback;
  let best=fallback,distance=Infinity;
  NODES_PX.forEach(([x,y],i)=>{const point=new DOMPoint(x,y).matrixTransform(nodePlanes[nodePlane(i)].getScreenCTM());
    const d=(event.clientX-point.x)**2+(event.clientY-point.y)**2;if(d<distance){distance=d;best=i;}});return best;
}
function hover(i){if(hovered>=0)light(hovered,hovered===active);hovered=i;if(i>=0)light(i,true);}
const targets=NODES_PX.map((_,i)=>{
  const target=document.createElementNS(NS,'path');
  for(const [name,value] of Object.entries({role:'button',tabindex:'0','data-node':i,'aria-pressed':'false','aria-label':`Acercarse al nodo ${i+1} y sus enlaces`}))target.setAttribute(name,value);
  target.addEventListener('click',e=>activate(nearest(e,i)));
  target.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();activate(i);}});
  target.addEventListener('pointermove',e=>hover(nearest(e,i)));target.addEventListener('pointerenter',e=>hover(nearest(e,i)));
  target.addEventListener('pointerleave',()=>hover(-1));target.addEventListener('focus',()=>hover(i));target.addEventListener('blur',()=>hover(-1));
  target.dataset.depth=NODE_PLANES[nodePlane(i)];nodePlanes[nodePlane(i)].append(target);return target;
});
function sheet(data){const c=document.createElement('canvas');c.width=data.width;c.height=data.height;c.getContext('2d').putImageData(new ImageData(data.pixels,data.width,data.height),0,0);return c;}
function bake(){
  const key=`${ground}:${width}:${height}`;if(cache.has(key))return cache.get(key);
  const e=EMISSIONS[ground],cols=Math.ceil(width*1.6/5),rows=Math.ceil(height*1.6/5);
  const skyData=material(ground,cols,rows,5,(x,y)=>e.baseTone((x/cols*1.6-.3)*480,(y/rows*1.6-.3)*300));
  const dynamic=emissionPlanes(ground);
  const washData=material(ground,480,300,3,(x,y)=>e.baseTone(x,y)+dynamic[y*480+x],true,
    (x,y)=>{const a=Math.min(1,dynamic[y*480+x]/.035);return a*a*(3-2*a);});
  const histogram=new Array(skyData.palette.length).fill(0);
  for(let y=Math.ceil(rows*.3/1.6);y<rows*1.3/1.6;y++)for(let x=Math.ceil(cols*.3/1.6);x<cols*1.3/1.6;x++){const at=y*cols+x;if(skyData.steps[at])histogram[skyData.indices[at]]++;}
  const softData={...washData,pixels:washData.pixels.slice()};
  for(let i=0;i<softData.pixels.length;i+=4){const p=softData.pixels,y=p[i]*.213+p[i+1]*.715+p[i+2]*.072;
    for(let k=0;k<3;k++)p[i+k]=Math.round(p[i+k]*.9+y*.1);}
  const result={sky:sheet(skyData),wash:sheet(washData),focusedWash:sheet(softData),histogram,palette:skyData.palette};cache.set(key,result);return result;
}
function transform(rate,c=camera){return {x:c.x*rate,y:c.y*rate,zoom:1+(c.zoom-1)*rate};}
function paintWash(source=active<0?wash:focusedWash){
  // One upload, one draw. No full-size intermediate or recurring blur bake.
  washCtx.clearRect(0,0,washCanvas.width,washCanvas.height);washCtx.drawImage(source,8,8,480*f.scale,300*f.scale);
}
function paintSky(){
  const started=performance.now(),sw=width*1.12,sh=height*1.12;
  canvas.width=Math.ceil(sw);canvas.height=Math.ceil(sh);
  skyFocus.width=Math.ceil(sw/2);skyFocus.height=Math.ceil(sh/2);
  // Crop only unused overscan, retaining the original sheet's world coordinates.
  ctx.drawImage(sky,-width*.24,-height*.24,width*1.6,height*1.6);
  // Blur at full resolution BEFORE downsampling, avoiding fractional-kernel
  // aliasing and blocky focus. The large scratch surface is not composited.
  const blurred=document.createElement('canvas');blurred.width=sky.width;blurred.height=sky.height;
  const c=blurred.getContext('2d');c.filter='blur(6px)';c.drawImage(sky,0,0);
  skyFocusCtx.drawImage(blurred,width*.24,height*.24,sw,sh,0,0,skyFocus.width,skyFocus.height);
  // Force the deferred Canvas 2D raster into the one-off measurement.
  skyFocusCtx.getImageData(0,0,1,1);
  diagnostics.focusBakeMs=performance.now()-started;
}
function paint(){
  if(!ready)return;const started=performance.now();
  const tx=camera.x/f.scale+(camera.zoom-1)*f.x/f.scale,ty=camera.y/f.scale+(camera.zoom-1)*f.y/f.scale;
  const value=`translate(${tx} ${ty}) scale(${camera.zoom})`;figure.setAttribute('transform',value);near.setAttribute('transform',value);
  nodePlanes.forEach((plane,i)=>{const c=planeCamera(i),scale=c.zoom/camera.zoom;
    const x=(c.x+(c.zoom-1)*f.x)/f.scale,y=(c.y+(c.zoom-1)*f.y)/f.scale;
    plane.setAttribute('transform',`translate(${(x-tx)/camera.zoom} ${(y-ty)/camera.zoom}) scale(${scale})`);});
  figure.querySelector('.links').setAttribute('d',linkIndices.map(([a,b])=>`M${localPoint(a).join(' ')}L${localPoint(b).join(' ')}`).join(' '));
  diagnostics.transforms={sky:transform(PARALLAX.sky),wash:transform(PARALLAX.wash),figure:{...camera}};
  stage.dataset.painted='true';diagnostics.frames.push(performance.now()-started);if(diagnostics.frames.length>600)diagnostics.frames.shift();
  performance.measure('joyan:camera-frame',{start:started,end:performance.now()});
}
function rebuild(){
  ({width,height}=stage.getBoundingClientRect());f=figureTransform(width,height);
  generation++;const baked=bake();({sky,wash,focusedWash}=baked);diagnostics.histogram=baked.histogram;diagnostics.palette=baked.palette;
  paintSky();
  washCanvas.width=Math.ceil(480*f.scale+16);washCanvas.height=Math.ceil(300*f.scale+16);
  paintWash();
  vignette.width=Math.ceil(width/4);vignette.height=Math.ceil(height/4);
  const vctx=vignette.getContext('2d'),pixels=vctx.createImageData(vignette.width,vignette.height),base=EMISSIONS[ground].toneColor(0).map(v=>Math.round(v*255));
  for(let y=0;y<vignette.height;y++)for(let x=0;x<vignette.width;x++){const at=(y*vignette.width+x)*4;pixels.data.set(base,at);pixels.data[at+3]=Math.round((1-EMISSIONS[ground].vignette(x/vignette.width*480,y/vignette.height*300))*255);}
  vctx.putImageData(pixels,0,0);targets.forEach((target,i)=>target.setAttribute('d',region(i)));
  ready=true;camera=destination(active);transition=null;clock=0;lastEmission=0;signal.setAttribute('opacity','0');
  setOptics(camera,true);paint();start();
}
const ease=p=>p*p*p*(10+p*(-15+6*p));
function setOptics(to,instant=false){
  // Read opacity only at an interaction boundary, including interruption.
  const opacities=[skyFocus,washCanvas].map(el=>Number(getComputedStyle(el).opacity));
  animations.forEach(a=>a.cancel());stage.dataset.focused=String(active>=0);
  if(instant)paintWash();
  animations=[skyFocus,washCanvas].flatMap((el,i)=>{
    const rate=i?PARALLAX.wash:PARALLAX.sky,from=transform(rate),end=transform(rate,to),focus=i?(active<0?1:.94):(active<0?0:.5);
    const keys=Array.from({length:61},(_,k)=>{const p=ease(k/60),v=key=>from[key]+(end[key]-from[key])*p;
      return {offset:k/60,transform:`translate(${v('x')}px,${v('y')}px) scale(${v('zoom')})`,opacity:opacities[i]+(focus-opacities[i])*p};});
    const options={duration:instant?0:TRANSITION_MS,fill:'both'};
    const focusKeys=keys.map(({offset,opacity})=>({offset,opacity})),cameraKeys=keys.map(({offset,transform})=>({offset,transform}));
    const frames=k=>instant?[k.at(-1),k.at(-1)]:k;
    const pair=[el.animate(frames(focusKeys),options),el.parentElement.animate(frames(cameraKeys),options)];
    // Sky retains half its sharp detail; the live wash never disappears.
    if(active<0)pair.forEach(a=>{a.onfinish=()=>a.cancel();});
    if(!canRun()&&!instant)pair.forEach(a=>a.pause());return pair;
  });
}
function canRun(){return ready&&visible&&!hidden&&!document.hidden&&!paused&&!motion.matches;}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0;lastTime=null;[...animations,...textAnimations].forEach(a=>a.pause());}
function start(){if(raf||!canRun())return;lastTime=null;[...animations,...textAnimations].forEach(a=>{if(a.playState==='paused')a.play();});raf=requestAnimationFrame(tick);}
function animateEmission(){
  // The emission's own dynamic planes run off the UI thread. Only one request
  // may be in flight; stale results cannot repaint a paused/hidden/rebuilt still.
  if(busy)return;
  if(!worker){
    const source=`import { dynamicMaterial } from ${JSON.stringify(new URL('./hero-field.mjs',import.meta.url).href)};
      const cache=new Map(),canvas=new OffscreenCanvas(1440,900),ctx=canvas.getContext('2d');
      onmessage=({data:d})=>{const start=performance.now();let live=cache.get(d.ground);
        if(!live){live=dynamicMaterial(d.ground);cache.set(d.ground,live);}
        const frame=live.update(d.seconds,d.focused);ctx.putImageData(new ImageData(frame.pixels,1440,900),0,0);
        const bitmap=canvas.transferToImageBitmap();
        postMessage({bitmap,generation:d.generation,cost:performance.now()-start},[bitmap]);};`;
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(url,{type:'module'});URL.revokeObjectURL(url);
    worker.onmessage=({data})=>{busy=false;diagnostics.dynamicFrames.push(data.cost);if(diagnostics.dynamicFrames.length>120)diagnostics.dynamicFrames.shift();
      if(data.generation===generation&&canRun()){
        const start=performance.now();paintWash(data.bitmap);
        performance.measure('joyan:dynamic-frame',{start,end:performance.now()});
      }data.bitmap.close();};
    worker.onerror=()=>{busy=false;worker.terminate();worker=null;diagnostics.emissionError=true;};
  }
  busy=true;worker.postMessage({ground,generation,focused:active>=0,width:Math.ceil(width),height:Math.ceil(height),f,seconds:STILL_SECONDS+clock/1000});
}
function eventFrame(){
  // One trace along an existing edge, 2.4 s travel in a 12 s cycle; no random path.
  const edge=active<0?48:Math.max(0,linkIndices.findIndex(pair=>pair.includes(active)));
  const q=(clock%12000-3000)/2400,[a,b]=linkIndices[edge].map(localPoint);
  diagnostics.trace={edge,from:linkIndices[edge][0],to:linkIndices[edge][1],plane:active<0?null:NODE_PLANES[nodePlane(active)]};
  signal.setAttribute('opacity',q>0&&q<1?String(Math.sin(Math.PI*q)**2):'0');
  signal.setAttribute('cx',String(a[0]+(b[0]-a[0])*Math.max(0,Math.min(1,q))));signal.setAttribute('cy',String(a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,q))));
}
function tick(now){
  raf=0;if(!canRun())return;const dt=lastTime===null?0:now-lastTime;lastTime=now;clock+=dt;
  if(returnLeft>0){returnLeft-=dt;if(returnLeft<=0)activate(-1);}
  if(transition){transition.elapsed+=dt;const p=Math.min(1,transition.elapsed/TRANSITION_MS),e=ease(p);
    for(const key of ['x','y','zoom'])camera[key]=transition.from[key]+(transition.to[key]-transition.from[key])*e;
    paint();if(p===1)transition=null;
  }
  if(clock-lastEmission>=1000/12){animateEmission();lastEmission=clock;}
  eventFrame();if(!raf)raf=requestAnimationFrame(tick);
}
function destination(index){
  const c=cameraFor(index,width,height);if(index<0)return c;
  const rate=NODE_RATES[nodePlane(index)],result={x:c.x/rate,y:c.y/rate,zoom:1+(c.zoom-1)/rate};
  // Frame the entire navigable depth stack, not just the selected star. The
  // camera may affirm a node but must not carry the other planes off-screen.
  const mobile=width<=620,bounds=[[20,width-20],[mobile?height*.53:100,height-100]];
  for(const [axis,key] of ['x','y'].entries()){
    const origin=axis?f.y:f.x;let lo=-Infinity,hi=Infinity;
    NODES_PX.forEach((point,i)=>{const r=NODE_RATES[nodePlane(i)],z=1+(result.zoom-1)*r,p=(origin+point[axis]*f.scale)*z;
      lo=Math.max(lo,(bounds[axis][0]-p)/r);hi=Math.min(hi,(bounds[axis][1]-p)/r);});
    result[key]=lo<=hi?Math.max(lo,Math.min(hi,result[key])):(lo+hi)/2;
  }
  return result;
}
function activate(index){
  const previous=active;active=index;generation++;
  const focusPlane=index<0?-1:nodePlane(index),others=[0,1,2].filter(i=>i!==focusPlane).sort((a,b)=>Math.abs(b-focusPlane)-Math.abs(a-focusPlane)||a-b);
  nodePlanes.forEach((plane,i)=>plane.dataset.treatment=index<0?'base':i===focusPlane?'focus':i===others[0]?'back':'middle');
  nodeStars.forEach((star,i)=>star.classList.toggle('node-selected',i===index));
  diagnostics.navigation={from:previous,to:index,plane:index<0?null:NODE_PLANES[focusPlane],placeholder:index<0?'base':NODE_PLANES[focusPlane]};
  swapHeadline(index);stage.dataset.activeNode=String(index);returnLeft=index<0||motion.matches?0:RETURN_MS;
  targets.forEach((t,i)=>{t.setAttribute('aria-pressed',String(i===index));light(i,i===index||i===hovered);});
  const group=new Set(RINGS.filter(r=>r.includes(index)).flat());nodeStars.forEach((s,i)=>s.classList.toggle('node-related',group.has(i)));
  reset.hidden=index<0;status.textContent=index<0?'Vista completa de la constelación.':`Nodo ${index+1}. Acercamiento a su grupo de enlaces. Escape para volver.`;
  const to=destination(index);setOptics(to,motion.matches);
  if(motion.matches){camera=to;transition=null;paint();}
  else transition={from:{...camera},to,elapsed:0};start();
}
reset.addEventListener('click',()=>{const previous=active;activate(-1);targets[previous]?.focus();});
document.querySelector('.hero').addEventListener('keydown',e=>{if(e.key==='Escape')activate(-1);});
pause.hidden=motion.matches;pause.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Reanudar campo':'Pausar campo';if(paused)stop();else start();});
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else stop();},{threshold:.01}).observe(stage);
addEventListener('pagehide',()=>{hidden=true;stop();});addEventListener('pageshow',()=>{hidden=false;start();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
motion.addEventListener('change',()=>{stop();pause.hidden=motion.matches;if(motion.matches){camera=destination(active);transition=null;returnLeft=0;swapHeadline(active);rebuild();}else start();});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{stop();cache.clear();rebuild();},120);});
const poster=document.querySelector('.poster');poster.decode().catch(()=>{}).then(()=>requestAnimationFrame(()=>setTimeout(()=>{rebuild();stage.dataset.activeNode='-1';},250)));
export const fieldDiagnostics=()=>({...diagnostics,camera:{...camera},active,running:!!raf,clock,paused});
