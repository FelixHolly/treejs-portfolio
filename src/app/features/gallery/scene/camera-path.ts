import { CatmullRomCurve3, MathUtils, Vector3 } from "three";
import { DESK, DOOR_XS, EYE, FOV, HANG_Z, LECTERN, MEDALLION, PieceSlot } from "./layout";

export interface Pose {
  position: Vector3;
  target: Vector3;
}

const HALF_FOV = MathUtils.degToRad(FOV / 2);
/** Below this aspect ratio the label sits over the scene, not beside it, so pieces stay centred. */
const SIDE_BY_SIDE = 1.2;
const REFERENCE_ASPECT = 1.45;
const SIDE_SHIFT = 0.3;
const LOOK_AHEAD = 6;

function standBack(distance: number, aspect: number, limit: number): number {
  return Math.min(distance * Math.max(1, REFERENCE_ASPECT / aspect), limit);
}

function sideShift(distance: number, aspect: number): number {
  return aspect >= SIDE_BY_SIDE ? SIDE_SHIFT * distance * Math.tan(HALF_FOV) * aspect : 0;
}

/** Stands square to the hanging wall, shifted so the piece sits left of the label. */
function wallPose(x: number, y: number, distance: number, aspect: number): Pose {
  const back = standBack(distance, aspect, 7.3);
  const shift = sideShift(back, aspect);
  return { position: new Vector3(x + shift, EYE, HANG_Z + back), target: new Vector3(x + shift, y, HANG_Z) };
}

/** Looks at a free-standing object from a given spot; `side` moves the object left (+) or right (-) of centre. */
function objectPose(from: Vector3, object: Vector3, aspect: number, side: number, maxBack: number): Pose {
  const forward = new Vector3(object.x - from.x, 0, object.z - from.z);
  const distance = forward.length();
  forward.normalize();
  const back = standBack(distance, aspect, distance * maxBack);
  const right = new Vector3(-forward.z, 0, forward.x);
  const shift = (sideShift(back, aspect) / SIDE_SHIFT) * side;

  return {
    position: new Vector3(object.x - forward.x * back, from.y, object.z - forward.z * back),
    target: object.clone().addScaledVector(right, shift),
  };
}

/** One camera pose per stop: entrance, developer, works overview, each work, visitors' book, correspondence. */
export function buildPoses(slots: readonly PieceSlot[], aspect: number): Pose[] {
  return [
    objectPose(new Vector3(-4.2, 1.7, -0.7), new Vector3(0, 2.3, 0), aspect, -0.42, 1.1),
    wallPose(MEDALLION.x, 1.95, 3.7, aspect),
    { position: new Vector3(16.6, EYE, 3.3), target: new Vector3(27.8, 1.8, HANG_Z) },
    ...slots.map((slot) => wallPose(slot.centre.x, slot.centre.y, slot.distance, aspect)),
    objectPose(new Vector3(38.2, EYE, 1.6), new Vector3(LECTERN.x, 1.1, LECTERN.z), aspect, 0.3, 1.6),
    objectPose(new Vector3(46.5, EYE, 1.7), new Vector3(DESK.x, 0.95, DESK.z), aspect, 0.3, 1.6),
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

  get stopCount(): number {
    return this.poses.length;
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
