// The building in metres. Visitors walk along +X; works hang on the wall at HANG_Z.
import { SceneWork } from "./gallery-view";

const FOV = { landscape: 50, portrait: 66 } as const;

/** The camera's vertical field of view in degrees. An upright screen sees little to either side, so it gets a wider lens. */
export function fieldOfView(aspect: number): number {
  const upright = Math.min(Math.max((1 - aspect) / 0.45, 0), 1);
  return FOV.landscape + (FOV.portrait - FOV.landscape) * upright;
}
export const EYE = 1.65;
export const HANG_Z = -4;
export const HALF_DEPTH = 4;
export const WALL_HEIGHT = 5.2;
export const WALL_THICKNESS = 0.4;
export const DOOR = { width: 2.4, height: 3.3 } as const;
export const ENFILADE = { from: 5, to: 64.6 } as const;
/** The round entrance hall, centred at `x` so its east wall meets the enfilade. The statue stands at its centre. */
export const ROTUNDA = { x: -2.5, radius: 7.5, height: 14, plinthHeight: 1, lionHeight: 2.7 } as const;
/** The statue faces the arriving visitor, turned a little towards the side they walk past it on. */
export const LION_YAW = Math.PI - 0.35;
/** The drum the statue stands on, wide enough for the statue's base at any turn. */
export const PEDESTAL_RADIUS = 1.4;
export const DOOR_XS = [5.2, 18.4, 47.6, 56] as const;
export const END_WALL_X = 64.4;
/** The hall's dome, which rises to the hall's full height: where its cornice runs, and the round opening at its crown. */
export const DOME = { springing: 10.9, oculus: 1.5 } as const;
/** A door's stone surround: its architrave's width, how far that stands off the wall, and the frieze and shelf over it. */
export const DOOR_CASING = { width: 0.24, proud: 0.1, frieze: 0.2, shelf: 0.1 } as const;
/** The panelled base of every wall, up to the top of the rail that caps it; nothing hangs lower. Room III's is `tall`. */
export const DADO = { height: 0.56, tall: 1.16, skirting: 0.14 } as const;
/** The cornice under a room's ceiling: how far down the wall it begins and how far out it reaches. */
export const CORNICE = { drop: 0.46, reach: 0.32 } as const;
/** The glazed opening in a room's ceiling: half its width, how far short of the room's ends it stops, how deep its well is. */
export const LAYLIGHT = { halfWidth: 1.25, inset: 1.5, well: 0.42 } as const;
/** The tall window that ends the enfilade, on its axis in the last wall. */
export const END_WINDOW = { width: 1.7, sill: 1 } as const;

export type RoomFeature = "plain" | "beams" | "panelled" | "window";

/** A room of the enfilade between the faces of the walls that close it, and the one thing that sets it apart. */
export interface RoomSpan {
  from: number;
  to: number;
  feature: RoomFeature;
}

const ROOM_FEATURES: readonly RoomFeature[] = ["plain", "beams", "panelled", "window"];

/** How high a room's panelled base stands. */
export function dadoHeight(span: RoomSpan): number {
  return span.feature === "panelled" ? DADO.tall : DADO.height;
}

export function roomSpans(): RoomSpan[] {
  return DOOR_XS.map((door, index) => ({
    from: door + WALL_THICKNESS / 2,
    to: (DOOR_XS[index + 1] ?? END_WALL_X) - WALL_THICKNESS / 2,
    feature: ROOM_FEATURES[index],
  }));
}

/** The portrait hangs first in Room I, near the door from the hall; the picture's own size, without mat and frame. */
export const PORTRAIT = { x: 7.7, y: 1.72, width: 1, height: 1.25 } as const;
/** The skill plaques further along Room I, hung `columns` to a row in a block around `x` and `y`. A plaque is `head`, a `line` for each of `lines` tools, and `foot` tall. */
export const SKILL_PLAQUES = { x: 13.4, y: 1.85, count: 4, columns: 2, lines: 6, width: 1.36, gap: 0.14, head: 0.236, line: 0.133, foot: 0.077 } as const;
export const SKILL_PLAQUE_HEIGHT = SKILL_PLAQUES.head + SKILL_PLAQUES.line * SKILL_PLAQUES.lines + SKILL_PLAQUES.foot;
const SKILL_ROWS = Math.ceil(SKILL_PLAQUES.count / SKILL_PLAQUES.columns);
/** The width and height of the whole block of plaques. */
export const SKILL_WALL = {
  width: SKILL_PLAQUES.columns * SKILL_PLAQUES.width + (SKILL_PLAQUES.columns - 1) * SKILL_PLAQUES.gap,
  height: SKILL_ROWS * SKILL_PLAQUE_HEIGHT + (SKILL_ROWS - 1) * SKILL_PLAQUES.gap,
} as const;

/** Where each plaque's middle hangs on the wall, read like a page: left to right, then the row below. */
export function skillPlaqueSlots(): { x: number; y: number }[] {
  const { x, y, count, columns, width, gap } = SKILL_PLAQUES;
  return Array.from({ length: count }, (_, index) => ({
    x: x + ((index % columns) - (columns - 1) / 2) * (width + gap),
    y: y + ((SKILL_ROWS - 1) / 2 - Math.floor(index / columns)) * (SKILL_PLAQUE_HEIGHT + gap),
  }));
}
export const LECTERN = { x: 52, z: -3.25 } as const;
export const DESK = { x: 60.2, z: -3.2 } as const;
/** The brass letterbox on the wall above the writing desk; `slotRise` is the slot's height above its middle. */
export const LETTERBOX = { x: DESK.x, y: 1.98, width: 0.62, height: 0.78, depth: 0.2, slotRise: 0.2 } as const;
export const BENCH = { x: 31.8, z: 3.45 } as const;

export interface FrameSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  gilded: boolean;
  src: string;
}

/** The portrait's frame, gilded like the commission's. */
export function portraitSlot(src: string): FrameSlot {
  return { ...PORTRAIT, gilded: true, src };
}

export interface PieceSlot {
  slug: string;
  frames: FrameSlot[];
  centre: { x: number; y: number };
  /** Width of the whole hanging, frames included. */
  span: number;
  /** The closest the camera stands to it. */
  distance: number;
}

const COMMISSION = { x: 24.4, y: 1.95, width: 2.4, height: 1.5, outerHalf: 1.41 } as const;
const COMPANION = { offset: 2.5, rise: 0.56, width: 1.12, height: 0.7, outerHalf: 0.71 } as const;
// Far enough along that a plain frame never shows beside the commission's label. A wide frame takes
// the longer step, or its near edge would show beside the label of the piece before it.
const PLAIN = { x: 35.4, y: 1.9, step: 4.2, wideStep: 5.8 } as const;

/** Hangs the works along Room II: a commission with its companions stacked beside it, then every other work in a plain frame. */
export function pieceSlots(works: readonly SceneWork[]): PieceSlot[] {
  let lastPlain: number | undefined;

  return works.map((work) => {
    if (work.kind === "commission") {
      const [main, ...rest] = work.images;
      const companions = rest.slice(0, 2);
      const frames: FrameSlot[] = [
        { x: COMMISSION.x, y: COMMISSION.y, width: COMMISSION.width, height: COMMISSION.height, gilded: true, src: main.src },
        ...companions.map((image, index) => ({
          x: COMMISSION.x + COMPANION.offset,
          y: companions.length === 1 ? COMMISSION.y : COMMISSION.y + (index === 0 ? COMPANION.rise : -COMPANION.rise),
          width: COMPANION.width,
          height: COMPANION.height,
          gilded: true,
          src: image.src,
        })),
      ];
      const left = COMMISSION.x - COMMISSION.outerHalf;
      const right = companions.length
        ? COMMISSION.x + COMPANION.offset + COMPANION.outerHalf
        : COMMISSION.x + COMMISSION.outerHalf;
      return {
        slug: work.slug,
        frames,
        centre: { x: (left + right) / 2, y: COMMISSION.y },
        span: right - left,
        distance: 4.4,
      };
    }

    const image = work.images[0];
    const x = lastPlain === undefined ? PLAIN.x : lastPlain + (image.portrait ? PLAIN.step : PLAIN.wideStep);
    lastPlain = x;
    const [width, height] = image.portrait ? [0.72, 1.52] : [1.5, 0.94];
    return {
      slug: work.slug,
      frames: [{ x, y: PLAIN.y, width, height, gilded: false, src: image.src }],
      centre: { x, y: PLAIN.y },
      span: width + 0.3,
      distance: 3.3,
    };
  });
}
