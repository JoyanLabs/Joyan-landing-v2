/**
 * J1 — a harness with actual surfaces, not hairlines pretending to have tone.
 * One side light models the band; one amber diamond waits on a person.
 * This paints continuous colour only. dither.js owns every dot at bake time.
 *
 * CARRY:
 *   reveal → agent     the lit band stays; its recessed ring receives light
 *   agent → support    the ring and block stay; the embedded support lights
 *   support → release  the band/support stay while the waiting gate flares
 *   release → work     the same gate dims; the released ring regains light
 *   work → return      every surface stays while the side light sweeps home
 *
 * The gate opens by losing its blocking light, not by spawning another mark.
 */
export const meta = {
  id: 'J1', file: 'harness-tones', mode: 'canvas',
  width: 1920, height: 1080, duration: 15, fps: 30,
  focal: { x: 990, y: 530 }, title: 'J1 · harness tones',
  quiet: [[1.9, 2.3], [4.6, 5], [7.8, 8.2], [10.6, 11], [12.1, 12.5]],
  hits: [0.6, 3, 6, 7.1, 9, 9.75, 11.6, 12.75],
  camera: [[0, 1, 990, 530], [15, 1, 990, 530]],
  // 3 / 3 / 3 / 0.75 / 3 / 2.25 s: the long looks establish the band,
  // working ring and supporting piece. The clipped release is a decision,
  // not another inspection. Work gets a full look; the return is brisker.
  beats: [
    { key: 'reveal', t0: 0, t1: 3 },
    { key: 'agent', t0: 3, t1: 6 },
    { key: 'support', t0: 6, t1: 9 },
    { key: 'release', t0: 9, t1: 9.75 },
    { key: 'work', t0: 9.75, t1: 12.75 },
    { key: 'return', t0: 12.75, t1: 15 },
  ],
};

// A horizontal semantic pair fits the shared ES/EN space above the kicker.
// Keep complete bodies (and maximum glow) apart; the local checker measures
// production-resampled stencil cells, not an assumed half-cell expansion.
export const AGENT = { x: 885, y: 80, radius: 58 };
export const GATE = { x: 1085, y: 80, half: 32, glow: 32, flare: 8 };

const mix = (a, b, p) => a + (b - a) * p;
const ease = (t, a, b) => {
  const p = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return p * p * (3 - 2 * p);
};
const wrap = (x, period) => ((x % period) + period) % period;

function hash(x, y) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise(x, y, period) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(wrap(ix, period), iy), b = hash(wrap(ix + 1, period), iy);
  const c = hash(wrap(ix, period), iy + 1), d = hash(wrap(ix + 1, period), iy + 1);
  return mix(mix(a, b, sx), mix(c, d, sx), sy);
}

function fbm(x, y, period) {
  let sum = 0, weight = 0.5;
  for (let i = 0; i < 4; i++) {
    sum += noise(x, y, period) * weight;
    x *= 2; y *= 2; period *= 2; weight *= 0.5;
  }
  return sum / 0.9375;
}

function polygon(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
}

export function build(canvas) {
  let ctx = canvas.getContext('2d');
  // Smooth interpolation keeps the noise a shading field, not a second screen.
  const texture = document.createElement('canvas');
  texture.width = 480; texture.height = 270;
  const tx = texture.getContext('2d');
  const pixels = tx.createImageData(texture.width, texture.height);
  const period = 16;
  const lastTime = meta.duration - 1 / meta.fps;
  const slab = document.createElement('canvas');
  slab.width = canvas.width; slab.height = canvas.height;
  const light = slab.getContext('2d');

  return (t) => {
    const time = wrap(t, meta.duration);
    // Separate landed moves leave short rests, never a multi-second plateau.
    // All light returns by the penultimate sample; the fixed camera never moves.
    const home = ease(time, 12.65, lastTime - 1 / meta.fps);
    const reveal = (0.65 * ease(time, 0, 1.9) + 0.35 * ease(time, 2.3, 3.35)) * (1 - home);
    const agent = ease(time, 2.85, 4.6) * (1 - home);
    const supported = ease(time, 5.85, 7.05) * (1 - home);
    const waiting = ease(time, 7.1, 7.8) * (1 - ease(time, 9.3, 9.85));
    const flare = ease(time, 8.9, 9.2) * (1 - ease(time, 9.2, 9.65));
    const released = ease(time, 9.65, 10.6) * (1 - home);
    const working = released * (0.5 + 0.5 * ease(time, 11, 12.1));
    const inspection = agent;
    // The side light gives small embedded pieces a frame-scale consequence.
    // Its excursions land between events; the gradients themselves stay.
    const shadow = 0.75 * ease(time, 1.6, 1.9) * (1 - ease(time, 2.3, 2.85))
      + ease(time, 2.85, 4.35) * (1 - ease(time, 4.9, 5.9))
      + ease(time, 5.9, 7.1) * (1 - ease(time, 7.1, 7.8))
      + ease(time, 8.2, 8.9) * (1 - ease(time, 9.65, 10.6))
      + ease(time, 11, 11.9) * (1 - ease(time, 12.4, 12.75));
    const drift = 0;
    for (let y = 0; y < texture.height; y++) {
      for (let x = 0; x < texture.width; x++) {
        const v = 7 + fbm(x / 30 + drift, y / 30, period) * 9;
        const i = (y * texture.width + x) * 4;
        pixels.data[i] = v; pixels.data[i + 1] = v;
        pixels.data[i + 2] = v + 1; pixels.data[i + 3] = 255;
      }
    }
    tx.putImageData(pixels, 0, 0);
    // Reset the entire surface; seeking in any order must reproduce the frame.
    ctx.resetTransform(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(texture, 0, 0, canvas.width, canvas.height);

    // A separate light mask reveals the existing face gradients, not grey fades.
    light.resetTransform(); light.globalCompositeOperation = 'source-over';
    light.clearRect(0, 0, slab.width, slab.height);
    const surface = ctx;
    ctx = light;
    // Parallel projected edges, with no perspective vanishing point.
    const top = ctx.createLinearGradient(560, 258, 1420, 300);
    top.addColorStop(0, '#f4f2ed'); top.addColorStop(0.3, '#e8e6e1'); top.addColorStop(1, '#6e6e73');
    polygon(ctx, [[560, 300], [612, 258], [1472, 258], [1420, 300]]);
    ctx.fillStyle = top; ctx.fill();
    const side = ctx.createLinearGradient(1420, 300, 1472, 730);
    side.addColorStop(0, '#6e6e73'); side.addColorStop(1, '#1a1a1d');
    polygon(ctx, [[1420, 300], [1472, 258], [1472, 688], [1420, 730]]);
    ctx.fillStyle = side; ctx.fill();

    const face = ctx.createLinearGradient(560, 300, 1420, 730);
    face.addColorStop(0, '#e8e6e1');
    face.addColorStop(0.4, `rgb(${150 + inspection * 18},${150 + inspection * 18},155)`);
    face.addColorStop(1, '#343438');
    ctx.beginPath(); ctx.rect(560, 300, 860, 430); ctx.rect(640, 380, 680, 270);
    ctx.fillStyle = face; ctx.fill('evenodd');
    ctx.save(); ctx.clip('evenodd');
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.14;
    ctx.drawImage(texture, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    const sweep = ctx.createLinearGradient(560, 0, 1472, 0);
    const edge = 0.2 + reveal * 1.2;
    sweep.addColorStop(0, 'rgba(0,0,0,1)');
    sweep.addColorStop(Math.min(1, edge), 'rgba(0,0,0,1)');
    sweep.addColorStop(Math.min(1, edge + 0.15), `rgba(0,0,0,${0.18 + reveal * 0.82})`);
    sweep.addColorStop(1, `rgba(0,0,0,${0.18 + reveal * 0.82})`);
    ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, slab.width, slab.height);
    ctx = surface; ctx.globalAlpha = 1 - shadow * 0.55;
    ctx.drawImage(slab, 0, 0);
    // A smaller body needs its rim light, especially through the fixed scrim.
    // Waiting still dims it; release restores the same continuous tone model.
    ctx.globalAlpha = 0.25 + agent * (0.75 - waiting * 0.15);

    // Scale the whole ring/block together so the semantic proportions survive.
    ctx.save();
    ctx.translate(AGENT.x, AGENT.y); ctx.scale(AGENT.radius / 120, AGENT.radius / 120);
    ctx.translate(-900, -520);
    // A shaded rim and recessed centre make the working ring a body, not a stroke.
    const disc = ctx.createRadialGradient(860, 478, 8, 900, 520, 120);
    disc.addColorStop(0, '#e8e6e1'); disc.addColorStop(0.68, '#8a8a90');
    disc.addColorStop(0.88, '#6e6e73'); disc.addColorStop(1, '#121214');
    ctx.beginPath(); ctx.arc(900, 520, 120, 0, Math.PI * 2); ctx.fillStyle = disc; ctx.fill();
    const hollow = ctx.createRadialGradient(884, 500, 16, 900, 520, 82);
    hollow.addColorStop(0, '#121214'); hollow.addColorStop(0.8, '#1a1a1d'); hollow.addColorStop(1, '#343438');
    ctx.beginPath(); ctx.arc(900, 520, 82, 0, Math.PI * 2); ctx.fillStyle = hollow; ctx.fill();
    ctx.globalAlpha = 0.25 + agent * 0.75;
    const block = ctx.createLinearGradient(872, 490, 928, 550);
    block.addColorStop(0, '#f4f2ed'); block.addColorStop(1, '#8a8a90');
    ctx.fillStyle = block; ctx.fillRect(872 + working * 16, 490, 56, 60);
    ctx.restore();

    // A rectangular supporting piece remains embedded in the lower band.
    ctx.globalAlpha = 0.25 + supported * 0.75;
    const support = ctx.createLinearGradient(734, 663, 890, 711);
    support.addColorStop(0, '#e8e6e1'); support.addColorStop(1, '#6e6e73');
    ctx.fillStyle = support; ctx.fillRect(734, 663, 156, 48);

    // The sole amber source owns its spill. A fast flare releases the dimmed
    // ring; the gate remains physically present after its light stops blocking.
    ctx.globalAlpha = 0.25 + waiting * 0.75 + flare * 0.2;
    const radius = GATE.glow + flare * GATE.flare;
    const glow = ctx.createRadialGradient(GATE.x, GATE.y, GATE.half / 4, GATE.x, GATE.y, radius);
    glow.addColorStop(0, `rgba(255,176,0,${0.76 + waiting * 0.2})`);
    glow.addColorStop(0.5, 'rgba(255,176,0,0.35)'); glow.addColorStop(1, 'rgba(255,176,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(GATE.x - radius, GATE.y - radius, radius * 2, radius * 2);
    const gateScale = GATE.half / 48;
    const gate = ctx.createLinearGradient(GATE.x - 34 * gateScale, GATE.y - 40 * gateScale,
      GATE.x + 36 * gateScale, GATE.y + 40 * gateScale);
    gate.addColorStop(0, '#ffd780'); gate.addColorStop(1, '#b37c03');
    polygon(ctx, [[GATE.x, GATE.y - GATE.half], [GATE.x + GATE.half, GATE.y],
      [GATE.x, GATE.y + GATE.half], [GATE.x - GATE.half, GATE.y]]);
    ctx.fillStyle = gate; ctx.fill();
    ctx.globalAlpha = 1;
  };
}

export default { meta, build };
