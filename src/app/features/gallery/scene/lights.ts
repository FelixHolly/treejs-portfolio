import { HemisphereLight, MathUtils, Object3D, SpotLight } from "three";
import { DESK, HANG_Z, LECTERN, MEDALLION, PieceSlot } from "./layout";

interface PieceLight {
  light: SpotLight;
  /** Stops from which this piece should read as lit. */
  stops: number[];
  /** The stop where the visitor stands in front of it and the beam tightens. */
  focus: number;
  full: number;
  wide: number;
  tight: number;
}

type Point = [number, number, number];

const WARM = 0xffe7c2;
const COOL = 0x9fb2d0;

function spot(from: Point, to: Point, angle: number, color = WARM): SpotLight {
  const light = new SpotLight(color, 0, 18, angle, 0.75, 2);
  light.position.set(...from);
  light.target.position.set(...to);
  return light;
}

function nearness(progress: number, stop: number, reach: number): number {
  return MathUtils.clamp(1 - Math.abs(progress - stop) / reach, 0, 1);
}

/** Museum lighting: a dim ambient wash and one spotlight per piece that brightens as the visitor nears it. */
export class GalleryLights {
  readonly objects: Object3D[] = [];
  private readonly pieces: PieceLight[] = [];
  private readonly lionKey = spot([-3.4, 6.8, -3.2], [0, 2.2, 0], 0.5);
  private readonly lionRim = spot([3.6, 5.2, 3.4], [0, 2.4, 0], 0.6, COOL);

  constructor(slots: readonly PieceSlot[]) {
    const firstPiece = 3;
    const visitorsBook = firstPiece + slots.length;

    this.lionKey.castShadow = true;
    this.lionKey.shadow.mapSize.set(1024, 1024);
    this.lionKey.shadow.bias = -0.0006;
    this.objects.push(new HemisphereLight(0xd8d2c4, 0x1a1a1e, 1.9));
    this.addLight(this.lionKey);
    this.addLight(this.lionRim);

    this.addPiece(spot([MEDALLION.x, 4.8, -1.2], [MEDALLION.x, MEDALLION.y, HANG_Z], 0.5), [1], 1, 80, 0.5, 0.38);

    slots.forEach((slot, index) => {
      const commission = slot.frames.length > 1 || slot.frames[0].gilded;
      this.addPiece(
        spot([slot.centre.x, 4.9, HANG_Z + 3.2], [slot.centre.x, slot.centre.y, HANG_Z], 0.62),
        [2, firstPiece + index],
        firstPiece + index,
        commission ? 110 : 75,
        commission ? 0.66 : 0.44,
        commission ? 0.56 : 0.32,
      );
    });

    this.addPiece(
      spot([LECTERN.x - 0.3, 4.7, LECTERN.z + 1.8], [LECTERN.x, 1, LECTERN.z], 0.6),
      [visitorsBook],
      visitorsBook,
      110,
      0.62,
      0.5,
    );
    this.addPiece(
      spot([DESK.x - 0.2, 4.7, DESK.z + 1.6], [DESK.x, 0.8, DESK.z], 0.62),
      [visitorsBook + 1],
      visitorsBook + 1,
      110,
      0.64,
      0.52,
    );
  }

  /** `lionLevel` runs 0..1 as the lights come up on the statue. */
  update(progress: number, lionLevel: number): void {
    const atEntrance = 0.35 + 0.65 * nearness(progress, 0, 1.6);
    this.lionKey.intensity = 230 * lionLevel * atEntrance;
    this.lionRim.intensity = 90 * lionLevel * atEntrance;

    for (const piece of this.pieces) {
      const lit = Math.max(...piece.stops.map((stop) => nearness(progress, stop, 1.6)));
      piece.light.intensity = piece.full * (0.3 + 0.7 * lit);
      piece.light.angle = MathUtils.lerp(piece.wide, piece.tight, nearness(progress, piece.focus, 1));
    }
  }

  private addLight(light: SpotLight): void {
    this.objects.push(light, light.target);
  }

  private addPiece(light: SpotLight, stops: number[], focus: number, full: number, wide: number, tight: number): void {
    this.addLight(light);
    this.pieces.push({ light, stops, focus, full, wide, tight });
  }
}
