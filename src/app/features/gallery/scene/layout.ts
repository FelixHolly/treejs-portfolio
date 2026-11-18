import { SceneWork } from "./gallery-view";

/** The building in metres. Visitors walk along +X; works hang on the wall at HANG_Z. */
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
export const ENFILADE = { from: 5, to: 56 } as const;
/** The round entrance hall, centred at `x` so its east wall meets the enfilade. The statue stands at its centre. */
export const ROTUNDA = { x: -2.5, radius: 7.5, height: 14, plinthHeight: 1, lionHeight: 2.7 } as const;
/** The statue faces the arriving visitor, turned a little towards the side they walk past it on. */
export const LION_YAW = Math.PI - 0.35;
/** The drum the statue stands on, wide enough for the statue's base at any turn. */
export const PEDESTAL_RADIUS = 1.4;
export const DOOR_XS = [5.2, 15.6, 39, 47.4] as const;
export const END_WALL_X = 55.8;
/** Room I runs from the first door to the second; its frieze is centred between them. */
export const ROOM_ONE_X = 10.4;
/** The FH seal hangs on the far wall of Room I, beside the door to Room II, facing the visitor coming in. */
export const MEDALLION = { x: DOOR_XS[1] - WALL_THICKNESS / 2, y: 2.05, z: -2.3, radius: 0.68 } as const;
/** The framed section drawing in Room I, sized like the commission's main frame. */
export const PLATE = { x: 11.35, y: 1.95, width: 2.4, height: 1.5 } as const;
export const LECTERN = { x: 43.4, z: -3.25 } as const;
export const DESK = { x: 51.6, z: -3.2 } as const;
/** The brass letterbox on the wall above the writing desk; `slotRise` is the slot's height above its middle. */
export const LETTERBOX = { x: DESK.x, y: 1.98, width: 0.62, height: 0.78, depth: 0.2, slotRise: 0.2 } as const;
export const BENCH = { x: 29, z: 3.45 } as const;

export interface FrameSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  gilded: boolean;
  src: string;
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

const COMMISSION = { x: 21.6, y: 1.95, width: 2.4, height: 1.5, outerHalf: 1.41 } as const;
const COMPANION = { offset: 2.5, rise: 0.56, width: 1.12, height: 0.7, outerHalf: 0.71 } as const;
// Far enough along that a study never shows beside the commission's label
const STUDY = { x: 32.6, step: 4.2, y: 1.9 } as const;

/** Hangs the works along Room II: a commission with its companions stacked beside it, then the studies. */
export function pieceSlots(works: readonly SceneWork[]): PieceSlot[] {
  let studies = 0;

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
    const x = STUDY.x + STUDY.step * studies++;
    const [width, height] = image.portrait ? [0.72, 1.52] : [1.5, 0.94];
    return {
      slug: work.slug,
      frames: [{ x, y: STUDY.y, width, height, gilded: false, src: image.src }],
      centre: { x, y: STUDY.y },
      span: width + 0.3,
      distance: 3.3,
    };
  });
}
