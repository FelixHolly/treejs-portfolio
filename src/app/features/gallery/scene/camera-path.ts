import { CatmullRomCurve3, MathUtils, Vector3 } from "three";
import { DESK, DOOR_XS, EYE, FOV, HANG_Z, LECTERN, MEDALLION, PieceSlot } from "./layout";

export interface Pose {
  position: Vector3;
  target: Vector3;
}

/** How the page frames the scene: its proportions and the share of its width a side label covers. */
export interface Framing {
  aspect: number;
  /** 0 when labels sit over the scene instead of beside it. */
  labelShare: number;
}

const TAN_HALF_FOV = Math.tan(MathUtils.degToRad(FOV / 2));
const LOOK_AHEAD = 6;
/** A piece fills at most this much of the width left free beside the label. */
const FILL = 0.84;
const FARTHEST = 7.3;
const OVERVIEW = { x: 16.6, z: 3.3 } as const;

function halfWidth(distance: number, aspect: number): number {
  return distance * TAN_HALF_FOV * aspect;
}

/** Stands square to the hanging wall, far enough back to fit the piece into the space beside the label. */
function wallPose(x: number, y: number, span: number, nearest: number, framing: Framing): Pose {
  const toFit = span / (FILL * (1 - framing.labelShare) * 2 * TAN_HALF_FOV * framing.aspect);
  const back = MathUtils.clamp(toFit, nearest, FARTHEST);
  const shift = framing.labelShare * halfWidth(back, framing.aspect);
  return { position: new Vector3(x + shift, EYE, HANG_Z + back), target: new Vector3(x + shift, y, HANG_Z) };
}

/** Looks at a free-standing object from a given spot; `offset` moves it left (+) or right (-) by a share of the half width. */
function objectPose(from: Vector3, object: Vector3, offset: number, framing: Framing, maxBack: number): Pose {
  const forward = new Vector3(object.x - from.x, 0, object.z - from.z);
  const distance = forward.length();
  forward.normalize();
  const back = Math.min(distance * Math.max(1, 1.45 / framing.aspect), distance * maxBack);
  const right = new Vector3(-forward.z, 0, forward.x);

  return {
    position: new Vector3(object.x - forward.x * back, from.y, object.z - forward.z * back),
    target: object.clone().addScaledVector(right, offset * halfWidth(back, framing.aspect)),
  };
}

/** From the door of Room II, turned so the whole hanging wall reads left of the label where it can. */
function overviewPose(slots: readonly PieceSlot[], framing: Framing): Pose {
  const depth = OVERVIEW.z - HANG_Z;
  const bearing = (x: number) => Math.atan((x - OVERVIEW.x) / depth);
  const offCentre = (share: number) => Math.atan(share * framing.aspect * TAN_HALF_FOV);

  const first = slots[0];
  const last = slots[slots.length - 1];
  const leftEdge = first ? first.centre.x - first.span / 2 : 20;
  const rightEdge = last ? last.centre.x + last.span / 2 : 30;

  // Keep the last work clear of the label, but never push the first one off the left edge.
  const heading = Math.min(
    bearing(rightEdge) - offCentre(1 - 2 * framing.labelShare - 0.06),
    bearing(leftEdge) + offCentre(0.92),
  );
  return {
    position: new Vector3(OVERVIEW.x, EYE, OVERVIEW.z),
    target: new Vector3(OVERVIEW.x + depth * Math.tan(heading), 1.8, HANG_Z),
  };
}

/** One camera pose per stop: entrance, developer, works overview, each work, visitors' book, correspondence. */
export function buildPoses(slots: readonly PieceSlot[], framing: Framing): Pose[] {
  const wide = framing.aspect >= 1.2;

  return [
    objectPose(new Vector3(-4.2, 1.7, -0.7), new Vector3(0, wide ? 2.3 : 3, 0), wide ? -0.42 : 0, framing, 1.1),
    wallPose(MEDALLION.x, 1.95, MEDALLION.radius * 2 + 0.6, 3.4, framing),
    overviewPose(slots, framing),
    ...slots.map((slot) => wallPose(slot.centre.x, slot.centre.y, slot.span, slot.distance, framing)),
    objectPose(new Vector3(38.2, EYE, 1.6), new Vector3(LECTERN.x, 1.1, LECTERN.z), framing.labelShare, framing, 1.6),
    objectPose(new Vector3(46.5, EYE, 1.7), new Vector3(DESK.x, 0.95, DESK.z), framing.labelShare, framing, 1.6),
  ];
}

/** Points the route passes between stops, so the camera rounds the lion and walks through each door. */
export function buildWaypoints(workCount: number): Vector3[][] {
  const door = (index: number) => new Vector3(DOOR_XS[index], EYE, 0);
  const waypoints: Vector3[][] = Array.from({ length: workCount + 5 }, () => []);

  waypoints[0] = [new Vector3(0.3, EYE, -2.8), new Vector3(3.7, EYE, -0.9), door(0)];
  waypoints[1] = [door(1)];
  waypoints[workCount + 2] = [door(2)];
  waypoints[workCount + 3] = [door(3)];
  return waypoints;
}

export class CameraPath {
  private readonly curve: CatmullRomCurve3;
  private readonly stopPoints: number[] = [];
  private readonly lastPoint: number;
  private readonly tangent = new Vector3();
  private readonly ahead = new Vector3();

  constructor(
    private readonly poses: readonly Pose[],
    waypoints: readonly Vector3[][],
  ) {
    const points: Vector3[] = [];
    poses.forEach((pose, index) => {
      this.stopPoints.push(points.length);
      points.push(pose.position, ...(waypoints[index] ?? []));
    });
    this.curve = new CatmullRomCurve3(points, false, "centripetal");
    this.lastPoint = points.length - 1;
  }

  /** Writes the camera pose at `progress` stops along the route into `out`. */
  sample(progress: number, out: Pose): void {
    const last = this.poses.length - 1;
    const clamped = MathUtils.clamp(progress, 0, last);
    const from = Math.min(Math.floor(clamped), Math.max(last - 1, 0));
    const to = Math.min(from + 1, last);
    const fraction = clamped - from;

    const point = MathUtils.lerp(this.stopPoints[from], this.stopPoints[to], fraction);
    const t = this.lastPoint === 0 ? 0 : point / this.lastPoint;
    this.curve.getPoint(t, out.position);
    out.target.lerpVectors(this.poses[from].target, this.poses[to].target, MathUtils.smoothstep(fraction, 0, 1));

    // Mid-stride the visitor looks where they are going; short hops along one wall keep facing it.
    const stride = this.poses[from].position.distanceTo(this.poses[to].position);
    const forward = Math.sin(Math.PI * fraction) * 0.8 * Math.min(1, stride / 8);
    if (forward > 0) {
      this.curve.getTangent(t, this.tangent);
      this.ahead.copy(out.position).addScaledVector(this.tangent, LOOK_AHEAD);
      this.ahead.y = out.position.y - 0.05;
      out.target.lerp(this.ahead, forward);
    }
  }
}
