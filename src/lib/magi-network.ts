/**
 * MAGI network data model (docs/DESIGN.md — Motion guide).
 *
 * The static diagram (AgentNetworkDiagram.astro) and the optional canvas
 * overlay (MagiParticleCanvas.astro) share one coordinate system: the 480x300
 * viewBox grid. Nodes, edges and particles live here so the model is the
 * single source of truth for both renderers: 7 nodes, 6 edges, 30 normal
 * amber particles across three depth layers, a 24-particle low-end fallback,
 * and a static bone reference layer on the node anchors. All values are
 * deterministic so the first frame is identical across builds.
 */

export const MAGI_DEPTH = {
  BACK: 0,
  MID: 1,
  FRONT: 2,
} as const;

export type MagiDepth = (typeof MAGI_DEPTH)[keyof typeof MAGI_DEPTH];

export const MAGI_TONE = {
  AMBER: 'amber',
  BONE: 'bone',
} as const;

export type MagiTone = (typeof MAGI_TONE)[keyof typeof MAGI_TONE];

export interface MagiNode {
  /** Stable identifier, mirrored by the static SVG. */
  id: string;
  /** X coordinate on the 480x300 grid. */
  x: number;
  /** Y coordinate on the 480x300 grid. */
  y: number;
  /** Visual radius on the grid. */
  radius: number;
}

export interface MagiEdge {
  /** Index into `nodes` — origin node. */
  from: number;
  /** Index into `nodes` — destination node. */
  to: number;
}

export interface MagiParticle {
  /** Index into `edges` — the edge this particle travels. */
  edge: number;
  /** Position along the edge, 0 (origin) .. 1 (destination). */
  progress: number;
  /** Progress per second; depth layers move at different speeds. */
  speed: number;
  /** Depth layer: 0 back, 1 mid, 2 front. Drives size and parallax offset. */
  depth: MagiDepth;
  /** Particle tone; normal particles are amber, the reference layer is bone. */
  tone: MagiTone;
  /** Head radius on the 480x300 grid. */
  radius: number;
  /** Per-particle alpha; front particles read brightest. */
  opacity: number;
}

export interface MagiNetwork {
  width: number;
  height: number;
  nodes: MagiNode[];
  edges: MagiEdge[];
  particles: MagiParticle[];
}

interface LayerSpec {
  depth: MagiDepth;
  count: number;
  radius: number;
  opacity: number;
  minSpeed: number;
  maxSpeed: number;
}

/**
 * Deterministic per-layer particle builder: particles cycle the six edges,
 * spread initial progress by the golden ratio, and step speed in five fixed
 * increments, so the first frame and the motion feel are stable across builds.
 */
function buildLayerParticles(layer: LayerSpec): MagiParticle[] {
  const particles: MagiParticle[] = [];
  for (let i = 0; i < layer.count; i += 1) {
    const speed = layer.minSpeed + ((i % 5) / 4) * (layer.maxSpeed - layer.minSpeed);
    particles.push({
      edge: i % 6,
      progress: (i * 0.618033988749895) % 1,
      speed,
      depth: layer.depth,
      tone: MAGI_TONE.AMBER,
      radius: layer.radius,
      opacity: layer.opacity,
    });
  }
  return particles;
}

const LAYER_SPECS: readonly LayerSpec[] = [
  { depth: MAGI_DEPTH.BACK, count: 10, radius: 1.3, opacity: 0.45, minSpeed: 0.14, maxSpeed: 0.2 },
  { depth: MAGI_DEPTH.MID, count: 10, radius: 1.9, opacity: 0.7, minSpeed: 0.2, maxSpeed: 0.26 },
  { depth: MAGI_DEPTH.FRONT, count: 10, radius: 2.5, opacity: 0.95, minSpeed: 0.26, maxSpeed: 0.34 },
];

const FALLBACK_LAYER_SPECS: readonly LayerSpec[] = [
  { depth: MAGI_DEPTH.BACK, count: 8, radius: 1.3, opacity: 0.4, minSpeed: 0.12, maxSpeed: 0.18 },
  { depth: MAGI_DEPTH.MID, count: 8, radius: 1.9, opacity: 0.6, minSpeed: 0.18, maxSpeed: 0.24 },
  { depth: MAGI_DEPTH.FRONT, count: 8, radius: 2.5, opacity: 0.85, minSpeed: 0.24, maxSpeed: 0.32 },
];

/**
 * Seven nodes: the MAGI hub at the grid center plus six satellite agents at
 * the exact anchors the static diagram uses. Six edges connect the hub to
 * every satellite. Thirty normal particles travel those edges (ten per depth
 * layer) with deterministic initial progress.
 */
export const MAGI_NETWORK: MagiNetwork = {
  width: 480,
  height: 300,
  nodes: [
    { id: 'magi', x: 240, y: 150, radius: 52 },
    { id: 'sat-1', x: 390, y: 150, radius: 11 },
    { id: 'sat-2', x: 315, y: 72, radius: 11 },
    { id: 'sat-3', x: 165, y: 72, radius: 11 },
    { id: 'sat-4', x: 90, y: 150, radius: 11 },
    { id: 'sat-5', x: 165, y: 228, radius: 11 },
    { id: 'sat-6', x: 315, y: 228, radius: 11 },
  ],
  edges: [
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 0, to: 3 },
    { from: 0, to: 4 },
    { from: 0, to: 5 },
    { from: 0, to: 6 },
  ],
  particles: LAYER_SPECS.flatMap(buildLayerParticles),
};

/** Bounded 24-particle workload for low-end devices (eight per depth layer). */
export const MAGI_FALLBACK_PARTICLES: readonly MagiParticle[] = FALLBACK_LAYER_SPECS.flatMap(buildLayerParticles);

export interface MagiBoneMark {
  /** X coordinate on the 480x300 grid. */
  x: number;
  /** Y coordinate on the 480x300 grid. */
  y: number;
  /** Visual radius on the grid. */
  radius: number;
  /** Static alpha of the mark. */
  opacity: number;
  /** Bone tone — the reference layer never travels. */
  tone: MagiTone;
}

/**
 * Static bone reference layer: one mark per node anchor so the moving amber
 * particles read against the diagram structure. Drawn by the canvas overlay
 * at fixed positions; the static SVG remains the no-JS/reduced-motion
 * renderer.
 */
export const MAGI_BONE_REFERENCE: readonly MagiBoneMark[] = [
  { x: 240, y: 150, radius: 3, opacity: 0.5, tone: MAGI_TONE.BONE },
  { x: 390, y: 150, radius: 2.4, opacity: 0.4, tone: MAGI_TONE.BONE },
  { x: 315, y: 72, radius: 2.4, opacity: 0.4, tone: MAGI_TONE.BONE },
  { x: 165, y: 72, radius: 2.4, opacity: 0.4, tone: MAGI_TONE.BONE },
  { x: 90, y: 150, radius: 2.4, opacity: 0.4, tone: MAGI_TONE.BONE },
  { x: 165, y: 228, radius: 2.4, opacity: 0.4, tone: MAGI_TONE.BONE },
  { x: 315, y: 228, radius: 2.4, opacity: 0.4, tone: MAGI_TONE.BONE },
];

/**
 * Pre-rendered amber radial glow sprite (docs/DESIGN.md — Motion guide): a
 * soft radial-gradient dot painted once on an offscreen canvas and reused via
 * drawImage, so the loop never pays for shadowBlur. Returns null when the 2D
 * context lacks the required APIs, in which case the renderer falls back to a
 * plain arc head.
 */
export function createMagiGlowSprite(ctx: CanvasRenderingContext2D): HTMLCanvasElement | null {
  if (typeof ctx.createRadialGradient !== 'function' || typeof ctx.drawImage !== 'function') {
    return null;
  }
  const size = 64;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const spriteCtx = sprite.getContext('2d');
  if (!spriteCtx) return null;
  const gradient = spriteCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 176, 0, 0.9)');
  gradient.addColorStop(0.35, 'rgba(255, 176, 0, 0.45)');
  gradient.addColorStop(1, 'rgba(255, 176, 0, 0)');
  spriteCtx.fillStyle = gradient;
  spriteCtx.fillRect(0, 0, size, size);
  return sprite;
}

/** Paints the static bone reference layer (grid coordinates; caller scales). */
export function drawMagiBoneReference(ctx: CanvasRenderingContext2D): void {
  for (const mark of MAGI_BONE_REFERENCE) {
    ctx.fillStyle = '#F4F2ED';
    ctx.globalAlpha = mark.opacity;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, mark.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
