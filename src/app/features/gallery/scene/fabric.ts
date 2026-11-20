import { DOOR, DOOR_CASING, HALF_DEPTH, WALL_THICKNESS } from "./layout";
import { scaled, Stonework, Tone, tone, WallFace } from "./stonework";

/** What the building is made of, each to be drawn as one mesh: lit stone, painted plaster overhead, and gilding. */
export interface Fabric {
  masonry: Stonework;
  plaster: Stonework;
  gilt: Stonework;
}

export function newFabric(): Fabric {
  return { masonry: new Stonework(), plaster: new Stonework(), gilt: new Stonework() };
}

/** Graphite walls, the paler stone of the door surrounds, and the pale glass overhead with its dark bars. */
export const STONE = {
  wall: tone(0x646362),
  trim: tone(0x8b8983),
  glass: tone(0x6a6e75),
  bar: tone(0x0e0e10),
} as const;

/** Gilding takes its colour from its own material; this only fills the place a tone is asked for. */
export const GILT: Tone = [1, 1, 1];

/** A wall's own graphite, a shade cooler or warmer from room to room. */
export const ROOM_WALLS: readonly Tone[] = [tone(0x616265), tone(0x646362), tone(0x666360), tone(0x69645e)];

/** An opening in the middle of a wall's face, how far its surround stands off the wall, and the surround's stone. */
export interface Opening {
  middle: number;
  width: number;
  height: number;
  proud: number;
  stone: Tone;
}

export function doorOpening(proud: number = DOOR_CASING.proud, stone: Tone = STONE.trim): Opening {
  return { middle: HALF_DEPTH, width: DOOR.width, height: DOOR.height, proud, stone };
}

/** How far the inner band of an architrave is set back from the outer, and how wide it is. */
const INNER = { width: 0.15, back: 0.03 } as const;
const PLINTH = { height: 0.26, proud: 0.025, wider: 0.015 } as const;
/** The gold line let into the architrave beside the opening. */
const FILLET = { width: 0.022, proud: 0.008, off: 0.012 } as const;
/** The shelf over the frieze and the moulding under it: how far each oversails the casing, and stands off it. */
const SHELF = { wider: 0.09, proud: 0.1, bed: 0.045, bedWider: 0.03, bedProud: 0.03, friezeBack: 0.04 } as const;

/** How high a casing stands from the floor to the top of its shelf. */
export const CASING_TOP = DOOR.height + DOOR_CASING.width + DOOR_CASING.frieze + DOOR_CASING.shelf;

/**
 * The stone surround of an opening: an architrave in two bands on plinth blocks, a frieze and a shelf over it,
 * and a gold line beside the opening. `gilt` is the same face as `face`, laid in gold.
 */
export function casing(face: WallFace, gilt: WallFace, { middle, width, height, proud, stone: trim }: Opening): void {
  const [left, right] = [middle - width / 2, middle + width / 2];
  const band = DOOR_CASING.width;
  const inner = proud - INNER.back;
  const head = height + band;
  const frieze = head + DOOR_CASING.frieze;
  const span = (a: number, b: number): [number, number] => [Math.min(a, b), Math.max(a, b)];

  for (const [jamb, hand] of [[left, -1], [right, 1]] as const) {
    const [near, far] = [jamb + hand * INNER.width, jamb + hand * band];
    face.block(...span(jamb, near), PLINTH.height, height, 0, inner, trim);
    face.block(...span(near, far), PLINTH.height, head, 0, proud, trim);
    face.block(...span(jamb, far + hand * PLINTH.wider), 0, PLINTH.height, 0, proud + PLINTH.proud, scaled(trim, 0.9));
    const line = jamb + hand * FILLET.off;
    gilt.block(...span(line, line + hand * FILLET.width), PLINTH.height, height + FILLET.off, inner, inner + FILLET.proud, GILT);
  }
  face.block(left - INNER.width, right + INNER.width, height, height + INNER.width, 0, inner, trim);
  face.block(left - INNER.width, right + INNER.width, height + INNER.width, head, 0, proud, trim);
  gilt.block(left - FILLET.off, right + FILLET.off, height + FILLET.off, height + FILLET.off + FILLET.width, inner, inner + FILLET.proud, GILT);

  face.block(left - band, right + band, head, frieze, 0, proud - SHELF.friezeBack, trim);
  face.block(left - band - SHELF.bedWider, right + band + SHELF.bedWider, frieze - SHELF.bed, frieze, 0, proud + SHELF.bedProud, trim);
  face.block(left - band - SHELF.wider, right + band + SHELF.wider, frieze, frieze + DOOR_CASING.shelf, 0, proud + SHELF.proud, trim);
}

/**
 * The lining of the doorway through the wall at `x`, between the casings on its two faces. It is paler towards
 * the room the visitor is walking into, as if that room's light fell into it.
 */
export function doorReveal(masonry: Stonework, x: number): void {
  const [west, east] = [x - WALL_THICKNESS / 2, x + WALL_THICKNESS / 2];
  const [half, height, depth] = [DOOR.width / 2, DOOR.height, east - west];
  const [dim, lit] = [scaled(STONE.wall, 0.75), scaled(STONE.wall, 1.2)];

  new WallFace(masonry, west, -half, [0, 1]).rect(0, depth, 0, height, 0, [dim, lit, lit, dim]);
  new WallFace(masonry, east, half, [0, -1]).rect(0, depth, 0, height, 0, [lit, dim, dim, lit]);
  masonry.soffit([west, height, -half], [east, height, -half], [east, height, half], [west, height, half], [dim, lit, lit, dim]);
}
