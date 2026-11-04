import { material, emissionPlanes, figureTransform, EMISSIONS, STILL_SECONDS, cameraFor, PARALLAX } from './hero-field.mjs';
import { rasterize, stepFor } from '../../scripts/scene-src/engine.mjs';
import { rgb } from './paletas-palettes.mjs';
const {NODES_PX,LINKS_PX,baseTone,vignette}=EMISSIONS.dark;
const cache=new Map();
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const sheet=data=>{const c=canvas(data.width,data.height);c.getContext('2d').putImageData(new ImageData(data.pixels,data.width,data.height),0,0);return c;};
function original(width,height){
 const key=`${width}:${height}`;if(cache.has(key))return cache.get(key);
 const cols=Math.ceil(width*1.6/5),rows=Math.ceil(height*1.6/5);
 const sky=material('dark',cols,rows,5,(x,y)=>baseTone((x/cols*1.6-.3)*480,(y/rows*1.6-.3)*300));
 const dynamic=emissionPlanes('dark',STILL_SECONDS);
 const wash=material('dark',480,300,3,(x,y)=>baseTone(x,y)+dynamic[y*480+x],true,(x,y)=>{const a=Math.min(1,dynamic[y*480+x]/.035);return a*a*(3-2*a);});
 const data={sky,wash,dynamic};cache.set(key,data);return data;
}
function skySheet(data,p){
 if(p.id==='A')return sheet(data);
 const frame={...data,cols:data.width/5,rows:data.height/5};
 if(!p.light)return sheet({...data,pixels:rasterize(frame,{palette:p.palette,ground:0},5)});
 // Preserve sky coordinates and dot pitch. Tone is now discrete ink mass:
 // each of the three nonzero geometric rungs gets a darker opaque ink.
 const steps=Uint8Array.from(data.steps,(_,at)=>{
  const x=at%frame.cols,y=Math.floor(at/frame.cols);
  const density=baseTone((x/frame.cols*1.6-.3)*480,(y/frame.rows*1.6-.3)*300);
  // Paper must deposit enough area to read: same field and pitch, a new
  // density-to-ink transfer, spatially dithered between three size rungs.
  return Math.min(3,stepFor(Math.min(.63,density*1.8+.10),x,y,'bayer4'));
 });
 const indices=steps.slice(),result=sheet({...data,pixels:rasterize({...frame,steps,indices},{palette:[p.base,...p.inks],ground:0},5)});
 result.steps=steps;return result;
}
function washSheet(data,p,dynamic){
 if(p.id==='A')return sheet(data);
 const pixels=new Uint8ClampedArray(data.pixels.length);
 for(let y=0;y<data.height;y++)for(let x=0;x<data.width;x++){
  const at=(y*data.width+x)*4,cell=Math.floor(y/3)*480+Math.floor(x/3);
  if(p.light){
   // Same authored inverse-square support, but a positive paper reserve.
   // Smooth bright stock, not a continuous dark density film.
   const a=Math.min(.84,dynamic[cell]*4.4),c=rgb(p.wash);
   pixels.set([...c,Math.round(255*a)],at);
  }else{
   const c=rgb(p.palette[data.indices[cell]]);
   pixels.set([...c,data.pixels[at+3]],at);
  }
 }
 return sheet({...data,pixels});
}
export function renderPanel(el,p){
 const width=Math.round(el.clientWidth),height=Math.round(el.clientHeight),f=figureTransform(width,height);
 const data=original(width,height),sky=skySheet(data.sky,p),wash=washSheet(data.wash,p,data.dynamic);
 const layers={};for(const name of ['sky','wash','figure','vignette','cores','veil']){
  const c=canvas(width,height);c.className=`plane plane-${name}`;c.setAttribute('aria-hidden','true');el.prepend(c);layers[name]=c;
 }
 // CSS z-order, independent of DOM insertion order.
 const s=layers.sky.getContext('2d');s.imageSmoothingEnabled=false;s.drawImage(sky,-width*.3,-height*.3,width*1.6,height*1.6);
 layers.wash.getContext('2d').drawImage(wash,f.x,f.y,480*f.scale,300*f.scale);
 const v=canvas(Math.ceil(width/4),Math.ceil(height/4)),vc=v.getContext('2d'),im=vc.createImageData(v.width,v.height);
 const base=rgb(p.light?p.ink:p.veil);
 for(let y=0;y<v.height;y++)for(let x=0;x<v.width;x++)im.data.set([...base,Math.round((1-vignette(x/v.width*480,y/v.height*300))*255*(p.light?.12:1))],(y*v.width+x)*4);
 vc.putImageData(im,0,0);layers.vignette.getContext('2d').drawImage(v,0,0,width,height);
 const line=layers.figure.getContext('2d');line.translate(f.x,f.y);line.scale(f.scale,f.scale);line.beginPath();
 for(const [a,b] of LINKS_PX){line.moveTo(...a);line.lineTo(...b);}
 line.strokeStyle=p.veil;line.globalAlpha=p.light?.90:.35;line.lineWidth=3/f.scale;line.stroke();
 line.strokeStyle=p.figure;line.globalAlpha=p.light?.95:.65;line.lineWidth=.7/f.scale;line.stroke();
 const core=layers.cores.getContext('2d');core.translate(f.x,f.y);core.scale(f.scale,f.scale);
 NODES_PX.forEach(([x,y],i)=>{core.beginPath();core.arc(x,y,i%3===0?1.7:1.4,0,Math.PI*2);core.fillStyle=p.cores;core.fill();core.beginPath();core.arc(x,y,2,0,Math.PI*2);core.strokeStyle=p.light?p.figure:'#94CCBB';core.globalAlpha=.62;core.lineWidth=.7/f.scale;core.stroke();core.globalAlpha=1;});
 const veil=layers.veil.getContext('2d'),mobile=width<=620,tablet=width<=960;
 const stops=mobile?[.52,.65]:tablet?[.62,.78]:[.56,.68];
 const g=veil.createLinearGradient(0,0,mobile?0:width,mobile?height:0),c=rgb(p.veil).join(',');
 g.addColorStop(0,`rgba(${c},.82)`);g.addColorStop(stops[0],`rgba(${c},.82)`);g.addColorStop(stops[1],`rgba(${c},0)`);g.addColorStop(1,`rgba(${c},0)`);veil.fillStyle=g;veil.fillRect(0,0,width,height);
 const visibleSky=new Set();
 for(let y=0;y<data.sky.height/5;y++)for(let x=0;x<data.sky.width/5;x++){
  const px=-width*.3+(x+.5)*5/data.sky.width*width*1.6,py=-height*.3+(y+.5)*5/data.sky.height*height*1.6;
  if(px>=0&&px<width&&py>=0&&py<height)visibleSky.add((sky.steps||data.sky.steps)[y*(data.sky.width/5)+x]);
 }
 const rungSet=new Set(visibleSky);
 // Only count cells that land in the viewport and deposit nonzero alpha.
 if(!p.light)for(let at=0;at<data.wash.steps.length;at++){
  const x=at%480,y=Math.floor(at/480),offset=((y*3+1)*1440+x*3+1)*4;
  if(f.x+x*f.scale>=0&&f.x+x*f.scale<width&&f.y+y*f.scale>=0&&f.y+y*f.scale<height&&data.wash.pixels[offset+3]>0)rungSet.add(data.wash.steps[at]);
 }
 const rungs=[...rungSet].filter(s=>s>0);
 const state={el,p,width,height,f,layers,rungs,skyRungs:[...visibleSky].filter(s=>s>0),focus:false};return state;
}
export function composite(state,{figure=false,halo=true}={}){
 const {width,height,layers}=state,c=canvas(width,height),ctx=c.getContext('2d');
 for(const name of ['sky',...(halo?['wash']:[]),...(figure?['figure']:[]),'vignette',...(figure?['cores']:[]),'veil'])ctx.drawImage(layers[name],0,0);
 return c;
}
export function focusPanel(state,on,reduced){
 const {width,height,layers}=state,to=cameraFor(on?17:-1,width,height);state.focus=on;
 for(const [name,rate] of Object.entries({...PARALLAX,cores:1})){
  const el=layers[name];el.getAnimations().forEach(a=>a.cancel());
  const from=state.camera||{x:0,y:0,zoom:1};
  const keys=Array.from({length:61},(_,i)=>{const t=i/60,e=t*t*t*(10+t*(-15+6*t));
   const value=k=>from[k]+(to[k]-from[k])*e;
   return {offset:t,transform:`translate(${value('x')*rate}px,${value('y')*rate}px) scale(${1+(value('zoom')-1)*rate})`};});
  el.animate(reduced?[keys.at(-1),keys.at(-1)]:keys,{duration:reduced?0:1200,fill:'forwards'});
 }
 state.camera=to;
}
