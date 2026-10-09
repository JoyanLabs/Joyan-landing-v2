/**
 * Bake-time halftone: no DOM, clock or renderer state. Identical source frames
 * must keep identical dots, especially where the film closes its loop.
 */
export const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Only existing tokens: ink-950/900/800, plomo-500/400, bone-100/50.
// Keeping the actual brand greys matters more than evenly spaced RGB steps.
export const GREY_RAMP = [
  '#0b0b0c', '#121214', '#1a1a1d', '#6e6e73', '#8a8a90', '#e8e6e1', '#f4f2ed',
];
// These are shades of the reserved accent, never a general-purpose warm ramp.
export const AMBER_RAMP = [
  '#4c350a', '#805906', '#b37c03', '#ffb000', '#ffc440', '#ffd780', '#ffebbf',
];

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const GREYS = GREY_RAMP.map(rgb);
const AMBERS = AMBER_RAMP.map(rgb);
const INK = GREYS[0];
const BONE = GREYS.at(-1);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Source art layers #ffb000 over ink with varying alpha. Channel ratios keep
// those darker variants eligible without ever assigning amber to neutral art.
const amberWeight = (r, g, b) => (r >= 96 && r > b * 1.8 && g > b * 1.1 && g <= r ? 1 : 0);

/** Mutate and return an RGBA frame at its delivery resolution. */
export function ditherImageData(data, width, height, {
  cell = 8, detailKeep = 0.35, ditherAmount = 0.9, compensate = 0.35, deadZone = 0.04,
} = {}) {
  if (!(data instanceof Uint8ClampedArray) || !Number.isInteger(width) || width < 0 ||
      !Number.isInteger(height) || height < 0 || data.length !== width * height * 4) {
    throw new TypeError('expected a Uint8ClampedArray of width * height * 4 bytes');
  }
  // Fractional or zero cells cannot tile an RGBA buffer; reject rather than
  // silently shifting the grid (or hanging the bake on a zero increment).
  if (!Number.isInteger(cell) || cell < 1) throw new RangeError('cell must be a positive integer');
  if (![detailKeep, ditherAmount, compensate, deadZone].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) {
    throw new RangeError('detailKeep, ditherAmount, compensate and deadZone must be in 0..1');
  }

  for (let y0 = 0, cy = 0; y0 < height; y0 += cell, cy++) {
    for (let x0 = 0, cx = 0; x0 < width; x0 += cell, cx++) {
      const x1 = Math.min(x0 + cell, width);
      const y1 = Math.min(y0 + cell, height);
      const count = (x1 - x0) * (y1 - y0);
      let sumLum = 0, maxLum = 0, maxAmber = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          sumLum += lum;
          maxLum = Math.max(maxLum, lum);
          maxAmber = Math.max(maxAmber, amberWeight(r, g, b));
        }
      }
      const meanLum = sumLum / count;
      // A 1px bright stroke gets diluted by the mean (GUIA-MOTION lesson 5).
      // Retaining part of the peak keeps it visible without making the whole
      // cell as bright as its brightest pixel.
      const tone = meanLum + (maxLum - meanLum) * detailKeep;
      // A gate is a legend mark even when only one source pixel is amber.
      const ramp = maxAmber > 0 ? AMBERS : GREYS;
      const levels = ramp.length - 1;
      const q = tone * levels + (BAYER8[cy & 7][cx & 7] / 64 - 0.5) * ditherAmount;
      // Ink-950 itself sits just above 0.04 luminance: preserve its literal
      // ground as well as suppressing tones below the configurable floor.
      const inkLum = (0.2126 * INK[0] + 0.7152 * INK[1] + 0.0722 * INK[2]) / 255;
      const step = tone < deadZone || maxLum <= inkLum ? 0 : clamp(Math.round(q), 0, levels);
      const fraction = step / levels;
      const radiusSquared = (cell / 2) ** 2 * fraction;
      const centerX = x0 + cell / 2, centerY = y0 + cell / 2;

      // Small dots borrow brightness from bone; large dots borrow darkness
      // from ink. This compensates discrete area steps without changing area.
      const k = (1 - fraction) * compensate;
      const target = fraction <= 0.5 ? BONE : INK;
      const color = ramp[step].map((v, ch) => clamp(v + (target[ch] - v) * k, 0, 255));
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          let covered = 0;
          if (step > 0) {
            // Fixed subpixel centres replace canvas AA, so edge coverage has
            // no dependency on a browser's rasterizer or the capture time.
            for (let sy = 0; sy < 4; sy++) {
              for (let sx = 0; sx < 4; sx++) {
                const dx = x + (sx + 0.5) / 4 - centerX;
                const dy = y + (sy + 0.5) / 4 - centerY;
                if (dx * dx + dy * dy <= radiusSquared) covered++;
              }
            }
          }
          const coverage = covered / 16;
          const i = (y * width + x) * 4;
          for (let ch = 0; ch < 3; ch++) data[i + ch] = INK[ch] + (color[ch] - INK[ch]) * coverage;
          // The baked film is an opaque ink surface, not a transparent overlay.
          data[i + 3] = 255;
        }
      }
    }
  }
  return data;
}
