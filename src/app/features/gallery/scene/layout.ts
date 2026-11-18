import { SceneWork } from "./gallery-view";

/** The building in metres. Visitors walk along +X; works hang on the wall at HANG_Z. */
export const FOV = 50;
export const EYE = 1.65;
export const HANG_Z = -4;
export const HALF_DEPTH = 4;
export const WALL_HEIGHT = 5.2;
export const WALL_THICKNESS = 0.4;
export const DOOR = { width: 2.4, height: 3.3 } as const;
export const ROTUNDA = { radius: 5, height: 7.5, plinthHeight: 0.9, lionHeight: 2.7 } as const;
export const ENFILADE = { from: 5, to: 53 } as const;
export const DOOR_XS = [5.2, 15.6, 36, 44.4] as const;
export const END_WALL_X = 52.8;
export const MEDALLION = { x: 10.4, y: 2.05, radius: 0.78 } as const;
export const LECTERN = { x: 40.4, z: -1.3 } as const;
export const DESK = { x: 48.8, z: -1.6 } as const;
export const BENCH = { x: 24, z: 3.2 } as const;

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
const STUDY = { x: 29.6, step: 4.2, y: 1.9 } as const;

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
