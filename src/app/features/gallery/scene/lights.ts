import { HemisphereLight, MathUtils, Object3D, SpotLight } from "three";
import { FIRST_WORK_STOP } from "./film";
import { DESK, HANG_Z, LECTERN, MEDALLION, PieceSlot, PORTRAIT, ROTUNDA, SKILL_PLAQUES } from "./layout";

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
const AMBER = 0xffd9a0;

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
  // From over the arriving visitor's left shoulder, and a cool edge from behind on the other side
  private readonly lionKey = spot([ROTUNDA.x - 4.4, 6.6, -3.6], [ROTUNDA.x, 2.5, 0], 0.44, AMBER);
  private readonly lionRim = spot([ROTUNDA.x + 1.6, 4.6, 4.8], [ROTUNDA.x, 2.6, 0], 0.46, COOL);

  constructor(slots: readonly PieceSlot[]) {
    const firstPiece = FIRST_WORK_STOP;
    const overview = firstPiece - 1;
    const visitorsBook = firstPiece + slots.length;

    this.lionKey.penumbra = 1;
    this.lionKey.castShadow = true;
    this.lionKey.shadow.mapSize.set(1024, 1024);
    this.lionKey.shadow.bias = -0.0006;
    this.objects.push(new HemisphereLight(0xd8d6d2, 0x1a1a1e, 1.9));
    this.addLight(this.lionKey);
    this.addLight(this.lionRim);

    this.addPiece(spot([MEDALLION.x - 2.8, 4.8, MEDALLION.z], [MEDALLION.x, MEDALLION.y, MEDALLION.z], 0.5), [1, 2], 2, 80, 0.5, 0.38);
    this.addPiece(spot([PORTRAIT.x, 4.9, HANG_Z + 3.2], [PORTRAIT.x, PORTRAIT.y, HANG_Z], 0.5), [1], 1, 95, 0.5, 0.4);
    this.addPiece(spot([SKILL_PLAQUES.x, 4.9, HANG_Z + 3.2], [SKILL_PLAQUES.x, SKILL_PLAQUES.y, HANG_Z], 0.62), [2], 2, 110, 0.66, 0.56);

    slots.forEach((slot, index) => {
      const commission = slot.frames.length > 1 || slot.frames[0].gilded;
      this.addPiece(
        spot([slot.centre.x, 4.9, HANG_Z + 3.2], [slot.centre.x, slot.centre.y, HANG_Z], 0.62),
        [overview, firstPiece + index],
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
    this.lionKey.intensity = 560 * lionLevel * atEntrance;
    this.lionRim.intensity = 330 * lionLevel * atEntrance;

    for (const piece of this.pieces) {
      let lit = 0;
      for (const stop of piece.stops) lit = Math.max(lit, nearness(progress, stop, 1.6));
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

  /** The lowest tier of quality lights the statue without a shadow. */
  setStatueShadow(cast: boolean): void {
    this.lionKey.castShadow = cast;
  }
}
