import { CatmullRomCurve3, MathUtils, Vector3 } from "three";
import { PageFraming } from "./gallery-view";
import { DESK, DOOR_XS, EYE, fieldOfView, HANG_Z, LECTERN, PieceSlot, PLATE, ROTUNDA } from "./layout";

export interface Pose {
  position: Vector3;
  target: Vector3;
}

/** How the page frames the scene: its proportions and where its text lies. */
export interface Framing extends PageFraming {
  aspect: number;
}

/** How far down the route the walking visitor looks, in metres. */
const LOOK_AHEAD = 4;
/** A piece fills at most this much of the width left free beside the label. */
const FILL = 0.84;
const FARTHEST = 6.9;
/** Length samples taken between neighbouring points of the route. */
const SAMPLES_PER_POINT = 24;
const OVERVIEW = { x: 16.6, z: 3 } as const;
/** The statue as the arriving visitor meets it: its width, how far its head and front paws stand out towards them, and how near they may come. */
const STATUE = { width: 2.3, head: 0.7, paws: 0.9, nearest: 4, wallGap: 0.5 } as const;

/** Half the height of what the camera sees one metre away. */
function lens(aspect: number): number {
  return Math.tan(MathUtils.degToRad(fieldOfView(aspect) / 2));
}

function halfWidth(distance: number, aspect: number): number {
  return distance * lens(aspect) * aspect;
}

/** Stands square to the hanging wall, far enough back to fit the piece into the space beside the label. */
function wallPose(x: number, y: number, span: number, nearest: number, framing: Framing): Pose {
  const toFit = span / (FILL * (1 - framing.labelShare) * 2 * lens(framing.aspect) * framing.aspect);
  const back = MathUtils.clamp(toFit, nearest, FARTHEST);
  const shift = framing.labelShare * halfWidth(back, framing.aspect);
  return { position: new Vector3(x + shift, EYE, HANG_Z + back), target: new Vector3(x + shift, y, HANG_Z) };
}

/** Faces the statue down the hall's axis, from where it fills the band the entrance text leaves free. */
function statuePose(framing: Framing): Pose {
  const [top, bottom] = framing.statueBand;
  const tan = lens(framing.aspect);
  const crown = ROTUNDA.plinthHeight + ROTUNDA.lionHeight - EYE;
  const feet = ROTUNDA.plinthHeight - EYE;

  // From `back` metres away: the tilt that puts the statue's crown at the top of the band, and where its feet then fall
  const tiltFrom = (back: number) => Math.atan(crown / (back - STATUE.head)) - Math.atan((1 - 2 * top) * tan);
  const feetFrom = (back: number) => (1 - Math.tan(Math.atan(feet / (back - STATUE.paws)) - tiltFrom(back)) / tan) / 2;

  const farthest = ROTUNDA.radius - STATUE.wallGap;
  const nearest = Math.min(Math.max(STATUE.nearest, STATUE.width / (FILL * 2 * tan * framing.aspect)), farthest);
  let back = nearest;
  // Step back until the feet clear the bottom of the band. Where the hall is too small for that, the
  // head still stays under the name and the feet run on behind the plaques.
  if (feetFrom(nearest) > bottom) {
    let tooClose = nearest;
    back = farthest;
    for (let step = 0; step < 16; step++) {
      const between = (tooClose + back) / 2;
      if (feetFrom(between) > bottom) tooClose = between;
      else back = between;
    }
  }

  return {
    position: new Vector3(ROTUNDA.x - back, EYE, 0),
    target: new Vector3(ROTUNDA.x, EYE + back * Math.tan(tiltFrom(back)), 0),
  };
}

/** From the door of Room II, turned so the whole hanging wall reads left of the label where it can. */
function overviewPose(slots: readonly PieceSlot[], framing: Framing): Pose {
  const depth = OVERVIEW.z - HANG_Z;
  const bearing = (x: number) => Math.atan((x - OVERVIEW.x) / depth);
  const offCentre = (share: number) => Math.atan(share * framing.aspect * lens(framing.aspect));

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
  return [
    statuePose(framing),
    wallPose(PLATE.x, PLATE.y - 0.15, PLATE.width + 0.75, 3.4, framing),
    overviewPose(slots, framing),
    ...slots.map((slot) => wallPose(slot.centre.x, slot.centre.y, slot.span, slot.distance, framing)),
    wallPose(LECTERN.x, 1.3, 3, 4.2, framing),
    wallPose(DESK.x, 1.25, 3.4, 4.4, framing),
  ];
}

/** Points the route passes between stops, so the camera rounds the lion and walks through each door. */
export function buildWaypoints(workCount: number): Vector3[][] {
  const door = (index: number) => new Vector3(DOOR_XS[index], EYE, 0);
  const waypoints: Vector3[][] = Array.from({ length: workCount + 5 }, () => []);

  // Round the statue on the side it faces, then squared up to the doorway before stepping through
  waypoints[0] = [
    new Vector3(ROTUNDA.x - 3.4, EYE, -1.9),
    new Vector3(ROTUNDA.x + 0.1, EYE, -3.1),
    new Vector3(ROTUNDA.x + 3.2, EYE, -1.7),
    new Vector3(DOOR_XS[0] - 2.7, EYE, -0.3),
    new Vector3(DOOR_XS[0] - 1.2, EYE, 0),
    door(0),
  ];
  waypoints[1] = [door(1)];
  waypoints[workCount + 2] = [door(2)];
  waypoints[workCount + 3] = [door(3)];
  return waypoints;
}

export class CameraPath {
  private readonly curve: CatmullRomCurve3;
  /** How far along the route each stop lies, in metres; between stops the visitor walks at an even pace. */
  private readonly stopLengths: number[];
  private readonly length: number;
  private readonly ahead = new Vector3();

  constructor(
    private readonly poses: readonly Pose[],
    waypoints: readonly Vector3[][],
  ) {
    const points: Vector3[] = [];
    const stopPoints: number[] = [];
    poses.forEach((pose, index) => {
      stopPoints.push(points.length);
      points.push(pose.position, ...(waypoints[index] ?? []));
    });
    this.curve = new CatmullRomCurve3(points, false, "centripetal");
    // A whole number of samples per point, so every stop falls exactly on one
    this.curve.arcLengthDivisions = Math.max(points.length - 1, 1) * SAMPLES_PER_POINT;
    const lengths = this.curve.getLengths();
    this.length = lengths[lengths.length - 1];
    this.stopLengths = stopPoints.map((point) => lengths[point * SAMPLES_PER_POINT]);
  }

  /** Writes the camera pose at `progress` stops along the route into `out`. */
  sample(progress: number, out: Pose): void {
    const last = this.poses.length - 1;
    const clamped = MathUtils.clamp(progress, 0, last);
    const from = Math.min(Math.floor(clamped), Math.max(last - 1, 0));
    const to = Math.min(from + 1, last);
    const fraction = clamped - from;

    const walked = MathUtils.lerp(this.stopLengths[from], this.stopLengths[to], fraction);
    this.curve.getPointAt(this.length > 0 ? walked / this.length : 0, out.position);
    out.target.lerpVectors(this.poses[from].target, this.poses[to].target, MathUtils.smoothstep(fraction, 0, 1));

    // Mid-stride the visitor looks where they are going; short hops along one wall keep facing it.
    const stride = this.poses[from].position.distanceTo(this.poses[to].position);
    const forward = Math.sin(Math.PI * fraction) * 0.8 * Math.min(1, stride / 8);
    if (forward > 0 && this.length > 0) {
      // Looking at a point further down the route turns the head into a bend before the feet follow,
      // so a doorway is faced squarely on the way in.
      this.curve.getPointAt(Math.min((walked + LOOK_AHEAD) / this.length, 1), this.ahead);
      this.ahead.y = out.position.y - 0.05;
      // Fades out where the route ends, so the last metre does not snap back to the stop's own view
      out.target.lerp(this.ahead, forward * Math.min(1, this.ahead.distanceTo(out.position) / LOOK_AHEAD));
    }
  }
}
