/**
 * MAGI network data model (docs/DESIGN.md — Motion guide).
 *
 * The static diagram (AgentNetworkDiagram.astro) and the optional canvas
 * overlay (MagiParticleCanvas.astro) share one coordinate system: the 480x300
 * viewBox grid. Nodes, edges and particles live here so the model is the
 * single source of truth for both renderers: 7 nodes, 6 edges, 12 particles.
 */

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
  /** Progress per second; 0.2-0.3 keeps one crossing under five seconds. */
  speed: number;
}

export interface MagiNetwork {
  width: number;
  height: number;
  nodes: MagiNode[];
  edges: MagiEdge[];
  particles: MagiParticle[];
}

/**
 * Seven nodes: the MAGI hub at the grid center plus six satellite agents at
 * the exact anchors the static diagram uses. Six edges connect the hub to
 * every satellite. Twelve particles travel those edges with deterministic
 * initial progress so the first frame is consistent across builds.
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
  particles: [
    { edge: 0, progress: 0.08, speed: 0.28 },
    { edge: 1, progress: 0.22, speed: 0.22 },
    { edge: 2, progress: 0.37, speed: 0.31 },
    { edge: 3, progress: 0.51, speed: 0.24 },
    { edge: 4, progress: 0.64, speed: 0.29 },
    { edge: 5, progress: 0.78, speed: 0.26 },
    { edge: 0, progress: 0.55, speed: 0.19 },
    { edge: 1, progress: 0.71, speed: 0.27 },
    { edge: 2, progress: 0.12, speed: 0.23 },
    { edge: 3, progress: 0.83, speed: 0.3 },
    { edge: 4, progress: 0.05, speed: 0.21 },
    { edge: 5, progress: 0.43, speed: 0.25 },
  ],
};
