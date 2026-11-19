import { Box3, Ray, Vector3 } from "three";
import { FIRST_WORK_STOP } from "./film";
import {
  DESK,
  DOOR,
  DOOR_XS,
  HALF_DEPTH,
  HANG_Z,
  LECTERN,
  LETTERBOX,
  PieceSlot,
  PORTRAIT,
  ROTUNDA,
  SKILL_PLAQUE_HEIGHT,
  SKILL_PLAQUES,
  skillPlaqueSlots,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from "./layout";

/** Something a visitor can point at, as the plain shape a ray is tested against, and the stop it belongs to. */
export interface PieceTarget {
  stop: number;
  box: Box3;
  /** Tested as the ellipsoid that fills the box: a statue has no corners. */
  round?: boolean;
}

/** A board on the hanging wall: its middle, and its size. */
export interface WallRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What mat and moulding add round a picture, and how far a hung piece stands off the wall. */
const SURROUND = 0.18;
const PROUD = 0.1;
/** The statue seen as an egg: half its length along the hall, half its width across it, and half its height with the base under it. */
const STATUE = { along: 0.95, across: 0.8, tall: 1.5 } as const;
/** The lectern with its book, and the desk with what stands on it. */
const LECTERN_BOX = { half: 0.42, height: 1.36 } as const;
const DESK_BOX = { halfWidth: 0.8, halfDepth: 0.45, height: 1.25 } as const;

function onWall({ x, y, width, height }: WallRect, surround = 0): Box3 {
  return new Box3(
    new Vector3(x - width / 2 - surround, y - height / 2 - surround, HANG_Z),
    new Vector3(x + width / 2 + surround, y + height / 2 + surround, HANG_Z + PROUD),
  );
}

function standing(x: number, z: number, halfWidth: number, halfDepth: number, height: number): Box3 {
  return new Box3(new Vector3(x - halfWidth, 0, z - halfDepth), new Vector3(x + halfWidth, height, z + halfDepth));
}

/** Every piece a visitor can point at, by the stop where they stand in front of it. `nameBoard` is Room III's, when it hangs. */
export function pieceTargets(slots: readonly PieceSlot[], nameBoard?: WallRect): PieceTarget[] {
  const visitorsBook = FIRST_WORK_STOP + slots.length;
  const statue = new Box3().setFromCenterAndSize(
    new Vector3(ROTUNDA.x, ROTUNDA.plinthHeight + ROTUNDA.lionHeight / 2, 0),
    new Vector3(STATUE.along * 2, STATUE.tall * 2, STATUE.across * 2),
  );

  return [
    { stop: 0, box: statue, round: true },
    { stop: 1, box: onWall(PORTRAIT, SURROUND) },
    ...skillPlaqueSlots().map((plaque) => ({
      stop: 2,
      box: onWall({ ...plaque, width: SKILL_PLAQUES.width, height: SKILL_PLAQUE_HEIGHT }),
    })),
    ...slots.flatMap((slot, work) => slot.frames.map((frame) => ({ stop: FIRST_WORK_STOP + work, box: onWall(frame, SURROUND) }))),
    { stop: visitorsBook, box: standing(LECTERN.x, LECTERN.z, LECTERN_BOX.half, LECTERN_BOX.half, LECTERN_BOX.height) },
    ...(nameBoard ? [{ stop: visitorsBook, box: onWall(nameBoard) }] : []),
    { stop: visitorsBook + 1, box: standing(DESK.x, DESK.z, DESK_BOX.halfWidth, DESK_BOX.halfDepth, DESK_BOX.height) },
    { stop: visitorsBook + 1, box: onWall(LETTERBOX) },
  ];
}

/** The walls between the rooms, each with its doorway left open: what hangs behind one cannot be pointed at. */
export function partitionWalls(): Box3[] {
  const half = WALL_THICKNESS / 2;
  const jamb = DOOR.width / 2;
  return DOOR_XS.flatMap((x) => [
    new Box3(new Vector3(x - half, 0, -HALF_DEPTH), new Vector3(x + half, WALL_HEIGHT, -jamb)),
    new Box3(new Vector3(x - half, 0, jamb), new Vector3(x + half, WALL_HEIGHT, HALF_DEPTH)),
    new Box3(new Vector3(x - half, DOOR.height, -jamb), new Vector3(x + half, WALL_HEIGHT, jamb)),
  ]);
}

const point = new Vector3();
const centre = new Vector3();
const radii = new Vector3();
const from = new Vector3();
const along = new Vector3();

function distanceToBox(ray: Ray, box: Box3): number {
  return ray.intersectBox(box, point) ? point.distanceTo(ray.origin) : Infinity;
}

// The ellipsoid is a unit sphere once the ray is measured in the box's own half-sizes
function distanceToEllipsoid(ray: Ray, box: Box3): number {
  box.getCenter(centre);
  box.getSize(radii).multiplyScalar(0.5);
  from.copy(ray.origin).sub(centre).divide(radii);
  along.copy(ray.direction).divide(radii);
  const a = along.lengthSq();
  const b = from.dot(along);
  const root = b * b - a * (from.lengthSq() - 1);
  if (root < 0) return Infinity;
  const near = (-b - Math.sqrt(root)) / a;
  const far = (-b + Math.sqrt(root)) / a;
  if (far < 0) return Infinity;
  return Math.max(near, 0);
}

/** The stop of the nearest piece the ray meets, or null when it meets none, or a wall first. */
export function stopHit(ray: Ray, targets: readonly PieceTarget[], walls: readonly Box3[]): number | null {
  let nearest = Infinity;
  let stop: number | null = null;
  for (const target of targets) {
    const distance = target.round ? distanceToEllipsoid(ray, target.box) : distanceToBox(ray, target.box);
    if (distance < nearest) {
      nearest = distance;
      stop = target.stop;
    }
  }
  if (stop === null) return null;
  return walls.some((wall) => distanceToBox(ray, wall) < nearest) ? null : stop;
}

/** How long a piece takes to brighten under the pointer, and to dim again, in seconds. */
const BRIGHTEN = 0.15;

/** How far each pointed-at stop has brightened, 0..1; only the one under the pointer rises. */
export class PointedLevels {
  private readonly levels = new Map<number, number>();
  private pointed: number | null = null;

  point(stop: number | null): void {
    this.pointed = stop;
    if (stop !== null && !this.levels.has(stop)) this.levels.set(stop, 0);
  }

  /** Moves every level on by `seconds` and reports each to `apply`. True while any is still on its way. */
  update(seconds: number, apply: (stop: number, level: number) => void): boolean {
    let moving = false;
    for (const [stop, level] of this.levels) {
      const goal = stop === this.pointed ? 1 : 0;
      const step = seconds / BRIGHTEN;
      const next = goal > level ? Math.min(level + step, goal) : Math.max(level - step, goal);
      apply(stop, next);
      if (next === 0 && goal === 0) this.levels.delete(stop);
      else this.levels.set(stop, next);
      moving ||= next !== goal;
    }
    return moving;
  }
}
