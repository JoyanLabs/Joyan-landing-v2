import { hexToRgb, renderFrame, tone } from '../../../../scripts/scene-src/engine.mjs';

// Recipe 2B: scalar ink per cell, never a handwritten dot raster.
// Original procedural composition. No imported art, assets or external licences.
export const CELL = 8;
export const PERIOD_SECONDS = 24;
const palette = ['#020405', '#263E3A', '#657F75', '#B4CABE'];
const groundTone = tone(hexToRgb(palette[0]));
const span = tone(hexToRgb(palette.at(-1))) - groundTone;
const nodes = [
  { u: 0.172, v: 0.594, phase: 0.3, radius: 1.1 },
  { u: 0.405, v: 0.494, phase: 2.1, radius: 1.4 },
  { u: 0.682, v: 0.553, phase: 3.8, radius: 1.15 },
  { u: 0.854, v: 0.663, phase: 5.2, radius: 0.95 },
];
// A memo of a PURE time function, not accumulated animation history.
let cachedTime;
let positions;
function positionsAt(time) {
  if (time !== cachedTime) {
    const phase = 2 * Math.PI * time / PERIOD_SECONDS;
    positions = nodes.map((node) => ({
      x: node.u * 160 + 0.7 * Math.sin(phase + node.phase),
      y: node.v * 96 + 0.35 * Math.cos(phase + node.phase),
      radius: node.radius,
    }));
    cachedTime = time;
  }
  return positions;
}

export const scene = {
  id: 'el-confin-run-2', label: 'El confín',
  cols: 160, rows: 96, fps: 30, cycleFrames: 720,
  palette, ground: 0,
  field(x, y, time) {
    // Structure: two sparse contour layers, low in an otherwise empty sky.
    const u = x / 160;
    const horizon = 96 * (0.675 + 0.10 * (2 * u - 1) ** 2);
    const edge = (y - horizon) / 0.62;
    const echo = (y - horizon - 5.1) / 0.9;
    let ink = 0.17 * Math.exp(-edge * edge / 2)
      + 0.065 * Math.exp(-echo * echo / 2);
    // Subject: four nearly still kernels with sub-cell periodic drift.
    for (const node of positionsAt(time)) {
      const d2 = (x - node.x) ** 2 + (y - node.y) ** 2;
      ink += 0.72 * Math.exp(-d2 / (2 * node.radius ** 2))
        + 0.075 * Math.exp(-d2 / (2 * (node.radius * 2.4) ** 2));
    }
    return groundTone + Math.min(1, ink) * span;
  },
};

export const renderConfine = (index) => renderFrame(scene, index);
