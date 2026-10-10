/**
 * OG1 — static social card, authored at 1200×628, not a crop of J1.
 * A recessed working ring and one waiting gate sit above the wordmark field.
 * The lower bevel anchors the card; the centre stays literal ink for JOYAN.
 * Continuous tones only: the browser-free generator owns the halftone.
 */
export const meta = {
  id: 'OG1', file: 'og-tones', mode: 'canvas',
  width: 1200, height: 628, duration: 1, fps: 1,
};

function polygon(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
}

export function build(canvas) {
  const ctx = canvas.getContext('2d');
  // No clock, noise or accumulated state. Every seek repaints the full card.
  return () => {
    ctx.clearRect(0, 0, meta.width, meta.height);
    ctx.fillStyle = '#0b0b0c';
    ctx.fillRect(0, 0, meta.width, meta.height);

    const band = ctx.createLinearGradient(100, 36, 1030, 192);
    band.addColorStop(0, '#1a1a1d');
    band.addColorStop(0.48, '#121214');
    band.addColorStop(1, '#0b0b0c');
    ctx.fillStyle = band;
    polygon(ctx, [[96, 40], [1064, 40], [1112, 192], [144, 192]]);
    ctx.fill();

    const rim = ctx.createLinearGradient(162, 52, 298, 180);
    rim.addColorStop(0, '#e8e6e1');
    rim.addColorStop(0.45, '#8a8a90');
    rim.addColorStop(1, '#6e6e73');
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(230, 116, 68, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b0b0c';
    ctx.beginPath(); ctx.arc(230, 116, 44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8e6e1';
    ctx.fillRect(210, 96, 40, 40);

    // One complete amber diamond, without a diffuse full-card glow.
    const gate = ctx.createLinearGradient(402, 78, 478, 154);
    gate.addColorStop(0, '#ffd780');
    gate.addColorStop(0.5, '#ffb000');
    gate.addColorStop(1, '#805906');
    ctx.fillStyle = gate;
    polygon(ctx, [[440, 78], [478, 116], [440, 154], [402, 116]]);
    ctx.fill();

    // A broad relief surface, not hairlines or a second texture/noise layer.
    const bevel = ctx.createLinearGradient(520, 462, 940, 628);
    bevel.addColorStop(0, '#0b0b0c');
    bevel.addColorStop(0.48, '#6e6e73');
    bevel.addColorStop(0.72, '#8a8a90');
    bevel.addColorStop(1, '#121214');
    ctx.fillStyle = bevel;
    polygon(ctx, [[416, 584], [1000, 462], [1120, 536], [536, 628], [416, 628]]);
    ctx.fill();
    ctx.fillStyle = '#1a1a1d';
    polygon(ctx, [[1000, 462], [1120, 536], [1120, 572], [1000, 498]]);
    ctx.fill();
  };
}

export default { meta, build };
