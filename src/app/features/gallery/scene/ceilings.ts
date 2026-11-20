import { STONE } from "./fabric";
import { CORNICE, HALF_DEPTH, LAYLIGHT, RoomSpan, roomSpans, WALL_HEIGHT } from "./layout";
import { blend, scaled, Stonework, tone, Tones, WallFace } from "./stonework";

/** A ceiling is painted, not lit: dark towards the walls, a little paler round the glass it is lit from. */
const CEILING = { far: tone(0x17171a), near: tone(0x26262b) } as const;
/** The sides of a laylight's well, from its foot at the ceiling up to the glass. */
const WELL = { foot: tone(0x2c2d32), head: tone(0x474a51) } as const;
/** Panes about this size, the bars between them, and how far the panes hang under the dark they are set in. */
const PANE = { size: 1.25, bar: 0.05, lift: 0.012 } as const;
/** Room II's beams: how many bays they part its ceiling into, their size, and how far a bay's glass stops short of them. */
export const BEAMS = { bays: 7, width: 0.34, drop: 0.3, margin: 0.66 } as const;
/** A beam's underside, and its sides from the walls to the middle of the room, where the glass lights them. */
const BEAM_TONES = { under: tone(0x141417), dim: tone(0x1c1c20), lit: tone(0x303137) } as const;

const GLASS_Y = WALL_HEIGHT + LAYLIGHT.well;

/** A stretch of glazed opening along a room, across the middle of its ceiling. */
export interface Well {
  from: number;
  to: number;
}

/** The same small unevenness from pane to pane on every visit. */
function uneven(column: number, row: number): number {
  const mixed = Math.sin(column * 12.9898 + row * 78.233) * 43758.5453;
  return 0.93 + 0.14 * (mixed - Math.floor(mixed));
}

/** The glazed openings of a room with a long laylight, one to a bay where beams part the ceiling. */
export function wells(span: RoomSpan): Well[] {
  if (span.feature !== "beams") return [{ from: span.from + LAYLIGHT.inset, to: span.to - LAYLIGHT.inset }];
  const bay = (span.to - span.from) / BEAMS.bays;
  return Array.from({ length: BEAMS.bays }, (_, index) => ({
    from: span.from + index * bay + BEAMS.margin,
    to: span.from + (index + 1) * bay - BEAMS.margin,
  }));
}

/** Where Room II's beams cross its ceiling. */
export function beams(span: RoomSpan): number[] {
  if (span.feature !== "beams") return [];
  const bay = (span.to - span.from) / BEAMS.bays;
  return Array.from({ length: BEAMS.bays - 1 }, (_, index) => span.from + (index + 1) * bay);
}

function level(plaster: Stonework, fromX: number, toX: number, fromZ: number, toZ: number, y: number, tones: Tones): void {
  plaster.soffit([fromX, y, fromZ], [toX, y, fromZ], [toX, y, toZ], [fromX, y, toZ], tones);
}

/** A well's four sides and its glass: panes paler along the middle of the room, in dark bars. */
function glazedWell(plaster: Stonework, { from, to }: Well): void {
  const half = LAYLIGHT.halfWidth;
  const length = to - from;
  const sides: [x: number, z: number, out: [number, number], run: number][] = [
    [from, -half, [0, 1], length],
    [to, half, [0, -1], length],
    [from, half, [1, 0], half * 2],
    [to, -half, [-1, 0], half * 2],
  ];
  for (const [x, z, out, run] of sides) {
    new WallFace(plaster, x, z, out).rect(0, run, WALL_HEIGHT, GLASS_Y, 0, [WELL.foot, WELL.foot, WELL.head, WELL.head]);
  }

  level(plaster, from, to, -half, half, GLASS_Y, STONE.bar);
  const columns = Math.max(Math.round(length / PANE.size), 1);
  const rows = Math.max(Math.round((half * 2) / PANE.size), 1);
  const [wide, deep] = [(length - PANE.bar * (columns + 1)) / columns, (half * 2 - PANE.bar * (rows + 1)) / rows];
  const middle = (from + to) / 2;
  const glow = (x: number, z: number) => (1 - 0.3 * (z / half) ** 2) * (1 - 0.22 * ((x - middle) / (length / 2)) ** 2);

  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const [x, z] = [from + PANE.bar + column * (wide + PANE.bar), -half + PANE.bar + row * (deep + PANE.bar)];
      const pane = scaled(STONE.glass, uneven(column + Math.round(from * 7), row));
      const at = (px: number, pz: number) => scaled(pane, glow(px, pz));
      level(plaster, x, x + wide, z, z + deep, GLASS_Y - PANE.lift, [at(x, z), at(x + wide, z), at(x + wide, z + deep), at(x, z + deep)]);
    }
  }
}

/** A beam across the room under the ceiling, from one cornice to the other. */
function beam(plaster: Stonework, x: number): void {
  const [half, reach, foot] = [BEAMS.width / 2, HALF_DEPTH - CORNICE.reach + 0.02, WALL_HEIGHT - BEAMS.drop];
  const { under, dim, lit } = BEAM_TONES;
  level(plaster, x - half, x + half, -reach, reach, foot, under);
  for (const [at, z, out] of [[x - half, -reach, [-1, 0]], [x + half, reach, [1, 0]]] as const) {
    const side = new WallFace(plaster, at, z, out);
    side.rect(0, reach, foot, WALL_HEIGHT, 0, [dim, lit, lit, dim]);
    side.rect(reach, reach * 2, foot, WALL_HEIGHT, 0, [lit, dim, dim, lit]);
  }
}

/** One room's ceiling: the plaster round its glass, the glass itself, and whatever beams cross it. */
function ceiling(plaster: Stonework, span: RoomSpan): void {
  const half = LAYLIGHT.halfWidth;
  const { far, near } = CEILING;
  level(plaster, span.from, span.to, -HALF_DEPTH, -half, WALL_HEIGHT, [far, far, near, near]);
  level(plaster, span.from, span.to, half, HALF_DEPTH, WALL_HEIGHT, [near, near, far, far]);

  const glazed = wells(span);
  const edges = [span.from, ...glazed.flatMap((well) => [well.from, well.to]), span.to];
  for (let gap = 0; gap < edges.length; gap += 2) {
    level(plaster, edges[gap], edges[gap + 1], -half, half, WALL_HEIGHT, blend(far, near, 0.8));
  }
  for (const well of glazed) glazedWell(plaster, well);
  for (const x of beams(span)) beam(plaster, x);
}

export function buildCeilings(plaster: Stonework): void {
  for (const span of roomSpans()) ceiling(plaster, span);
}
