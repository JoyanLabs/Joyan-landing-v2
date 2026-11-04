import { composite } from './paletas-render.mjs';
import { luminance, contrast, rgb } from './paletas-palettes.mjs';
import { EMISSIONS } from './hero-field.mjs';
/** Measure the actual Canvas 2D composite, not palette endpoints. Same code
 * supplies the visible numbers and the independent Playwright assertions. */
export function measurePanel(state){
 const {el,p,width,height,f,rungs}=state;
 const data=composite(state,{figure:true}).getContext('2d').getImageData(0,0,width,height).data;
 const field=composite(state).getContext('2d').getImageData(0,0,width,height).data;
 const noHalo=composite(state,{halo:false}).getContext('2d').getImageData(0,0,width,height).data;
 const box=el.querySelector('.hero-title').getBoundingClientRect(),origin=el.getBoundingClientRect();
 const rect={x:box.x-origin.x,y:box.y-origin.y,w:box.width,h:box.height};
 const text=luminance(rgb(p.text));let worst=Infinity,worstPixel=Infinity;
 // Conservative whole-title rectangle, including spaces between glyphs.
 // Each 5px cell's mean WCAG luminance is tested; pixel minimum is also saved.
 for(let y=Math.max(0,Math.floor(rect.y));y<Math.min(height,rect.y+rect.h);y+=5)for(let x=Math.max(0,Math.floor(rect.x));x<Math.min(width,rect.x+rect.w);x+=5){
  let sum=0,n=0;
  for(let yy=y;yy<Math.min(y+5,height,rect.y+rect.h);yy++)for(let xx=x;xx<Math.min(x+5,width,rect.x+rect.w);xx++){
   const at=(yy*width+xx)*4,l=luminance(data.subarray(at,at+3));sum+=l;n++;worstPixel=Math.min(worstPixel,contrast(text,l));
  }
  worst=Math.min(worst,contrast(text,sum/n));
 }
 let total=0,near=0,around=0,nNear=0,nAround=0,delta=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const at=(y*width+x)*4,l=luminance(field.subarray(at,at+3));total+=l;
  const px=(x-f.x)/f.scale,py=(y-f.y)/f.scale;
  // Local halo skirts: nearest-node distances in original scene cells.
  if(px<110||px>365||py<15||py>265)continue;
  const d=Math.sqrt(Math.min(...EMISSIONS.dark.NODES_PX.map(([nx,ny])=>(px-nx)**2+(py-ny)**2)));
  if(d>=3&&d<=12){near+=l;nNear++;delta+=l-luminance(noHalo.subarray(at,at+3));}
  if(d>=22&&d<=30){around+=l;nAround++;}
 }
 const mean=total/(width*height),stock=luminance(rgb(p.id==='A'?'#060B0D':p.base));
 const local=near/nNear-around/nAround;
 return {id:p.id,width,height,headlineWorstCell:worst,headlineWorstPixel:worstPixel,fieldMeanLuminance:mean,stockLuminance:stock,fieldStockContrast:contrast(mean,stock),rungs:rungs.length,rungValues:rungs,skyRungs:state.skyRungs,
  haloDirection:local>0?'brighter':'darker',haloNearLuminance:near/nNear,haloSurroundLuminance:around/nAround,haloPairedDelta:delta/nNear,
  headlineRect:rect,protocol:'DPR-independent Canvas composite, fixed 100/60 s; WCAG linear luminance. Title: worst 5×5 cell across its full DOM box, including links/cores, no glyph pixels. Field: full viewport mean without text/figure/cores, including wash/vignette/veil, versus solid effective stock. Halo: nearest-node skirts 3–12 cells versus surroundings 22–30; paired delta removes wash at identical pixels. Rungs: distinct nonzero steps rasterized across the dotted planes (sky + wash for A/B; sky for C/D). skyRungs is reported separately; not a color histogram.'};
}
