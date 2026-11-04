/** Study tokens, not a change to the approved palette. WCAG uses linear sRGB. */
export const GROUND = '#060B0D';
export const NOMINAL_BASE = '#020405';
export const BRAND_AMBER = '#F59E0B';
export const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
export function luminance(hex) {
  return rgb(hex).map(v => {
    v /= 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
export function contrast(a, b = GROUND) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (hi + .05) / (lo + .05);
}
export function hue(hex) {
  const [r, g, b] = rgb(hex).map(v => v / 255), hi = Math.max(r, g, b), lo = Math.min(r, g, b), d = hi - lo;
  if (!d) return 0;
  return ((hi === r ? (g - b) / d : hi === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360;
}
export function hueDistance(a, b = BRAND_AMBER) {
  const delta = Math.abs(hue(a) - hue(b));
  return Math.min(delta, 360 - delta);
}
export const VARIANTS = [
  { id: 'v0', name: 'Actual', accent: '#94CCBB', ui: '#94CCBB', core: '#EAF3E6',
    reading: 'El control frío. Anillos celadón; núcleos blancos, tal como están hoy.',
    verdict: 'Pasa contraste; conserva el verde que molesta en las secciones. Control, no propuesta cálida.' },
  { id: 'v1', name: 'Terracota mineral', accent: '#B4643C', ui: '#B4643C', core: '#B4643C',
    reading: 'Temperatura volcánica en la figura, sin teñir el cielo ni el lavado.',
    verdict: 'Pasa texto y foco sin aclarar el tono, con margen de texto estrecho. La conservaría: mineral y separada del ámbar.' },
  { id: 'v2', name: 'Ocre andino', accent: '#A98A50', ui: '#A98A50', core: '#A98A50',
    reading: 'La alternativa próxima al ámbar, incluida sólo para poder descartarla a la vista.',
    verdict: 'Pasa contraste, pero no la reserva de marca: demasiado próxima al ámbar. Descartaría.' },
  { id: 'v3', name: 'Cobre apagado', accent: '#8E5A44', ui: '#A57159', core: '#8E5A44',
    reading: 'El cobre original queda en la figura y el foco. Para texto se prueba una tinta compañera más clara.',
    verdict: 'El cobre original falla como texto. Sólo viable con tinta UI aclarada; alternativa sobria para la escena.' },
];
export const measurements = () => VARIANTS.map(v => ({
  ...v, ground: GROUND, textRatio: contrast(v.ui), ringRatio: contrast(v.accent),
  rawTextRatio: contrast(v.accent), hue: hue(v.accent), amberHue: hue(BRAND_AMBER),
  amberDistance: hueDistance(v.accent),
}));
