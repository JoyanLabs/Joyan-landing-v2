/** Viewport consumer of the unchanged lab emissions. The engine owns every
 * dot mask, dither rung and palette compensation; no substitute noise field. */
import { rasterize, stepFor, compensate, sceneMetrics, hexToRgb, tone } from '../../scripts/scene-src/engine.mjs';
import * as dark from './scene-constelacion2.mjs';
export const EMISSIONS = { dark };
export const HERO_BASES = { dark: '#0A1114' };
// Page endpoints; the immutable emission keeps its own extended ramp.
export const HERO_INKS = { dark: '#E4EEEA' };
export const PARALLAX = { sky: .18, wash: .52, figure: 1 };
// Preserve all authored centres in the base view; depth changes their response
// to the same camera, not the emission's geometry or palette.
export const NODE_PLANES = ['far', 'mid', 'near'];
export const NODE_RATES = [.78, .89, 1];
export const nodePlane = index => index % NODE_PLANES.length;
export const TRANSITION_MS = 1200;
export const RETURN_MS = 7000;
export const STILL_SECONDS = 100 / 60;
export function figureTransform(width, height) {
  const mobile = width <= 620, sw = width * (mobile ? 1.2 : 1), sh = height * (mobile ? .5 : .8);
  const scale = Math.min(sw / 480, sh / 300);
  return { scale, x: width * (mobile ? -.02 : .19) + (sw - scale * 480) / 2,
    y: height * (mobile ? .49 : .12) + (sh - scale * 300) / 2 };
}
export function cameraFor(index, width, height) {
  if (index < 0) return { x: 0, y: 0, zoom: 1 };
  const group = [...new Set(dark.RINGS.filter(r => r.includes(index)).flat())];
  const point = dark.NODES_PX[index];
  const centre = group.reduce((a, i) => a.map((v, k) => v + dark.NODES_PX[i][k] / group.length), [0, 0]);
  const f = figureTransform(width, height), zoom = 1.28;
  const aim = point.map((v, k) => v * .65 + centre[k] * .35);
  return { x: width * (width <= 620 ? .56 : .75) - (f.x + aim[0] * f.scale) * zoom,
    y: height * (width <= 620 ? .74 : .52) - (f.y + aim[1] * f.scale) * zoom, zoom };
}
const planes = new Map();
export function emissionPlanes(ground, seconds = STILL_SECONDS, dynamic = new Float32Array(480 * 300)) {
  if (seconds === STILL_SECONDS && planes.has(ground)) return planes.get(ground);
  dynamic.fill(0);
  // This is the lab's own halo + twinkle + event composition, not a new halo.
  EMISSIONS[ground].forEachDynamicCell(seconds, (at, x, y, amount) => { dynamic[at] = amount; });
  if (seconds === STILL_SECONDS) planes.set(ground, dynamic);
  return dynamic;
}
/** Sparse animated wash. Palette/dither/masks still belong to the engine.
 * Cache the expensive colour decisions, not time: the emission is evaluated at
 * 12 Hz, independently of the 60 Hz camera/compositor. No full-field reraster. */
export function dynamicMaterial(ground) {
  const e = EMISSIONS[ground], scene = e.constelacion2Scene, metrics = sceneMetrics(scene);
  const tones = scene.palette.map(c => tone(hexToRgb(c))), lo = Math.min(...tones), span = Math.max(...tones)-lo;
  const inks = scene.palette.map(c => hexToRgb(c).map(v=>Math.round(v*255)));
  const masks = metrics.coverage.map((_,step)=>rasterize({cols:1,rows:1,steps:Uint8Array.of(step),indices:Uint8Array.of(1)},
    {palette:['#000000','#FFFFFF'],ground:0},3));
  const levels = 2048, lut = new Uint8Array(16*levels*4), base = new Float32Array(480*300);
  for(let y=0;y<300;y++)for(let x=0;x<480;x++)base[y*480+x]=e.baseTone(x,y);
  for(let b=0;b<16;b++)for(let t=0;t<levels;t++) {
    const color=e.toneColor(t/(levels-1)), level=(tone(color)-lo)/span;
    const step=stepFor(level,b%4,Math.floor(b/4),'bayer4');
    const ink=inks[step?compensate(scene,...color,step,metrics):scene.ground], at=(b*levels+t)*4;
    lut.set([...ink,step],at);
  }
  const focusedLut=lut.slice();
  for(let i=0;i<lut.length;i+=4){const y=lut[i]*.213+lut[i+1]*.715+lut[i+2]*.072;
    for(let k=0;k<3;k++)focusedLut[i+k]=Math.round(lut[i+k]*.9+y*.1);}
  const pixels=new Uint8ClampedArray(1440*900*4), dynamic=new Float32Array(480*300);
  return { pixels, width:1440, height:900, update(seconds, focused=false) {
    const colors=focused?focusedLut:lut;
    pixels.fill(0); emissionPlanes(ground,seconds,dynamic);
    // A 24-second density breath, bounded by the approved emission: no new
    // colour, halo geometry or brighter contrast endpoint. Still remains exact.
    const breath = .96 + .04 * Math.cos((seconds - STILL_SECONDS) * Math.PI / 12);
    for(let at=0;at<dynamic.length;at++) {
      const amount=dynamic[at]; if(amount<=0)continue;
      const x=at%480,y=Math.floor(at/480), t=Math.min(levels-1,Math.max(0,Math.round((base[at]+amount)*(levels-1))));
      const k=(((y%4)*4+x%4)*levels+t)*4, mask=masks[lut[k+3]];
      const a=Math.min(1,amount/.035), alpha=a*a*(3-2*a)*breath;
      for(let yy=0;yy<3;yy++)for(let xx=0;xx<3;xx++) {
        const p=((y*3+yy)*1440+x*3+xx)*4;
        pixels[p]=colors[k];pixels[p+1]=colors[k+1];pixels[p+2]=colors[k+2];pixels[p+3]=Math.round(mask[(yy*3+xx)*4]*alpha);
      }
    }
    return this;
  }};
}
/** Build a dot sheet once. Transparent sheets use the engine's exact alpha
 * masks; all colours come from the emission's toneColor + indexed palette. */
export function material(ground, cols, rows, cell, sample, transparent = false, opacity = () => 1) {
  const e = EMISSIONS[ground], scene = e.constelacion2Scene, metrics = sceneMetrics(scene);
  const tones = scene.palette.map(c => tone(hexToRgb(c))), lo = Math.min(...tones), span = Math.max(...tones) - lo;
  const steps = new Uint8Array(cols * rows), indices = new Uint8Array(cols * rows);
  const histogram = new Array(scene.palette.length).fill(0);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const at = y * cols + x, amount = sample(x, y), color = e.toneColor(amount);
    const level = (tone(color) - lo) / span;
    const step = stepFor(level, x, y, 'bayer4');
    steps[at] = step;
    indices[at] = step ? compensate(scene, ...color, step, metrics) : scene.ground;
    if (step) histogram[indices[at]]++;
  }
  const frame = { cols, rows, steps, indices };
  const pixels = rasterize(frame, scene, cell);
  if (transparent) {
    const inks = scene.palette.map(hexToRgb);
    const masks = metrics.coverage.map((_, step) => rasterize({ cols: 1, rows: 1,
      steps: Uint8Array.of(step), indices: Uint8Array.of(1) }, { palette: ['#000000', '#FFFFFF'], ground: 0 }, cell));
    for (let y = 0; y < rows * cell; y++) for (let x = 0; x < cols * cell; x++) {
      const at = Math.floor(y / cell) * cols + Math.floor(x / cell), offset = (y * cols * cell + x) * 4;
      const mask = masks[steps[at]][((y % cell) * cell + x % cell) * 4];
      const ink = inks[indices[at]];
      for (let k = 0; k < 3; k++) pixels[offset + k] = Math.round(ink[k] * 255);
      pixels[offset + 3] = Math.round(mask * opacity(Math.floor(x / cell), Math.floor(y / cell)));
    }
  }
  return { pixels, width: cols * cell, height: rows * cell, histogram, palette: scene.palette, steps, indices };
}
