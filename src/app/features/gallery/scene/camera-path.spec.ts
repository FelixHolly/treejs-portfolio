import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { buildPoses, buildWaypoints, CameraPath, Framing, Pose } from "./camera-path";
import { PageFraming, SceneWork } from "./gallery-view";
import { DOOR, DOOR_XS, EYE, fieldOfView, HALF_DEPTH, HANG_Z, pieceSlots, ROTUNDA } from "./layout";

const WORKS: SceneWork[] = [
  { slug: "a", kind: "commission", images: [1, 2, 3].map((n) => ({ src: `a${n}`, portrait: false })) },
  { slug: "b", kind: "study", images: [{ src: "b", portrait: true }] },
  { slug: "c", kind: "study", images: [{ src: "c", portrait: true }] },
];

const BAND: PageFraming["statueBand"] = [0.4, 0.88];
const frame = (aspect: number, labelShare: number, statueBand = BAND): Framing => ({ aspect, labelShare, statueBand });

const FRAMINGS: [string, Framing][] = [
  ["1440x900 beside a label", frame(1.6, 0.377)],
  ["1920x1080 beside a label", frame(16 / 9, 0.3)],
  ["1024x768 beside a label", frame(4 / 3, 0.42)],
  ["900x1200 at the label cap", frame(0.75, 0.6)],
  ["850x1000 with labels over the scene", frame(0.85, 0)],
  ["a phone", frame(390 / 664, 0, [0.42, 0.7])],
  ["a phone held sideways", frame(750 / 342, 0, [0.52, 0.86])],
  ["an ultrawide", frame(3.5, 0.2)],
];

function pathFor(works: SceneWork[], framing: Framing): { path: CameraPath; poses: Pose[] } {
  const slots = pieceSlots(works);
  const poses = buildPoses(slots, framing);
  return { path: new CameraPath(poses, buildWaypoints(slots.length)), poses };
}

/** True when a point is inside the rotunda, the enfilade, or the doorway joining them. */
function insideBuilding(point: Vector3): boolean {
  const inRotunda = Math.hypot(point.x - ROTUNDA.x, point.z) < ROTUNDA.radius - 0.2;
  const inEnfilade = point.x > 4.8 && point.x < 55.6 && Math.abs(point.z) < HALF_DEPTH - 0.15;
  return inRotunda || inEnfilade;
}

function throughADoor(point: Vector3): boolean {
  return DOOR_XS.some((x) => Math.abs(point.x - x) < 0.25) ? Math.abs(point.z) < DOOR.width / 2 - 0.2 : true;
}

describe("buildPoses", () => {
  it("gives one pose per stop: five rooms plus one per work", () => {
    expect(pathFor(WORKS, FRAMINGS[0][1]).poses.length).toBe(8);
    expect(pathFor([], FRAMINGS[0][1]).poses.length).toBe(5);
    expect(pathFor([WORKS[0]], FRAMINGS[0][1]).poses.length).toBe(6);
  });

  for (const [name, framing] of FRAMINGS) {
    it(`keeps every stop inside the building at ${name}`, () => {
      for (const [index, pose] of pathFor(WORKS, framing).poses.entries()) {
        for (const value of [...pose.position.toArray(), ...pose.target.toArray()]) {
          expect(Number.isFinite(value)).withContext(`stop ${index}`).toBeTrue();
        }
        expect(insideBuilding(pose.position)).withContext(`stop ${index} at ${pose.position.toArray()}`).toBeTrue();
      }
    });
  }

  it("stands each work stop square to the hanging wall, in front of its own piece", () => {
    const slots = pieceSlots(WORKS);
    const poses = buildPoses(slots, frame(1.6, 0));

    slots.forEach((slot, index) => {
      const pose = poses[3 + index];
      expect(pose.target.z).toBe(HANG_Z);
      expect(pose.position.x).toBeCloseTo(slot.centre.x, 6);
      expect(pose.target.x).toBeCloseTo(pose.position.x, 6);
    });
  });

  it("stands further back and off to the right when a label takes part of the screen", () => {
    const slots = pieceSlots(WORKS);
    const open = buildPoses(slots, frame(1.6, 0))[3];
    const beside = buildPoses(slots, frame(1.6, 0.4))[3];

    expect(beside.position.z).toBeGreaterThan(open.position.z);
    expect(beside.position.x).toBeGreaterThan(slots[0].centre.x);
  });
});

describe("the entrance pose", () => {
  // The statue's crown and front paws stand this far towards the arriving visitor from its middle.
  const crown = new Vector3(ROTUNDA.x - 0.7, ROTUNDA.plinthHeight + ROTUNDA.lionHeight, 0);
  const feet = new Vector3(ROTUNDA.x - 0.9, ROTUNDA.plinthHeight, 0);
  const farthest = ROTUNDA.radius - 0.8;

  const entrance = (framing: Framing): Pose => buildPoses(pieceSlots(WORKS), framing)[0];
  const distance = (pose: Pose): number => ROTUNDA.x - pose.position.x;

  /** Where a point of the hall lands on screen, as a share of the screen's height from the top. */
  function onScreen(pose: Pose, framing: Framing, point: Vector3): number {
    const camera = new PerspectiveCamera(fieldOfView(framing.aspect), framing.aspect, 0.1, 80);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    camera.updateMatrixWorld();
    return (1 - point.clone().project(camera).y) / 2;
  }

  it("faces the statue head-on down the hall's axis, from standing height", () => {
    const pose = entrance(FRAMINGS[0][1]);

    expect(pose.position.z).toBe(0);
    expect(pose.target.z).toBe(0);
    expect(pose.target.x).toBe(ROTUNDA.x);
    expect(pose.position.x).toBeLessThan(ROTUNDA.x - 3.9);
    expect(pose.position.y).toBe(EYE);
  });

  for (const [name, framing] of FRAMINGS) {
    it(`keeps the statue's head exactly under the name at ${name}`, () => {
      expect(onScreen(entrance(framing), framing, crown)).toBeCloseTo(framing.statueBand[0], 3);
    });
  }

  it("fills the band from the name down to the plaques where the hall is deep enough", () => {
    const framing = frame(1440 / 790, 0.4, [0.36, 0.9]);
    const pose = entrance(framing);

    expect(distance(pose)).toBeLessThan(farthest - 0.1);
    expect(onScreen(pose, framing, feet)).toBeCloseTo(0.9, 2);
  });

  it("lets the statue's width set the distance on a narrow screen with height to spare", () => {
    const framing = frame(0.4, 0, [0.05, 0.99]);
    const back = distance(entrance(framing));
    const visibleWidth = 2 * back * Math.tan(MathUtils.degToRad(fieldOfView(0.4) / 2)) * 0.4;

    expect(back).toBeGreaterThan(4.5);
    expect(2.3 / visibleWidth).toBeCloseTo(0.84, 3);
  });

  it("stands further back the less room the text leaves", () => {
    const roomy = distance(entrance(frame(1.8, 0, [0.3, 0.9])));
    const tight = distance(entrance(frame(1.8, 0, [0.3, 0.72])));

    expect(tight).toBeGreaterThan(roomy);
  });

  it("backs up to the far wall when the band is too short, and lets the feet run on behind the plaques", () => {
    const framing = frame(390 / 664, 0, [0.42, 0.5]);
    const pose = entrance(framing);

    expect(distance(pose)).toBeCloseTo(farthest, 6);
    expect(onScreen(pose, framing, crown)).toBeCloseTo(0.42, 3);
    expect(onScreen(pose, framing, feet)).toBeGreaterThan(0.5);
  });

  for (const band of [[0.9, 0.2], [0, 0], [0.5, 0.5], [0, 1], [1.4, 2], [-0.3, 0.1]] as const) {
    it(`still stands inside the hall for a band of ${band.join(" to ")}`, () => {
      const pose = entrance(frame(1.6, 0.3, band));

      for (const value of [...pose.position.toArray(), ...pose.target.toArray()]) expect(Number.isFinite(value)).toBeTrue();
      expect(insideBuilding(pose.position)).toBeTrue();
      expect(distance(pose)).toBeGreaterThanOrEqual(3.99);
    });
  }
});

describe("CameraPath", () => {
  const sample = (path: CameraPath, progress: number): Pose => {
    const out: Pose = { position: new Vector3(), target: new Vector3() };
    path.sample(progress, out);
    return out;
  };

  it("passes exactly through every stop's pose", () => {
    const { path, poses } = pathFor(WORKS, FRAMINGS[0][1]);

    poses.forEach((pose, index) => {
      const at = sample(path, index);
      expect(at.position.distanceTo(pose.position)).withContext(`position ${index}`).toBeLessThan(1e-6);
      expect(at.target.distanceTo(pose.target)).withContext(`target ${index}`).toBeLessThan(1e-6);
    });
  });

  it("clamps positions before the entrance and beyond the last room", () => {
    const { path, poses } = pathFor(WORKS, FRAMINGS[0][1]);

    expect(sample(path, -3).position.distanceTo(poses[0].position)).toBeLessThan(1e-6);
    expect(sample(path, 99).position.distanceTo(poses[7].position)).toBeLessThan(1e-6);
  });

  for (const [name, framing] of FRAMINGS) {
    it(`walks the whole route inside the building and through the doors at ${name}`, () => {
      const { path, poses } = pathFor(WORKS, framing);
      let previous = sample(path, 0).position.clone();

      for (let progress = 0; progress <= poses.length - 1; progress += 0.02) {
        const { position, target } = sample(path, progress);
        expect(insideBuilding(position)).withContext(`progress ${progress.toFixed(2)} at ${position.toArray()}`).toBeTrue();
        expect(throughADoor(position)).withContext(`door at progress ${progress.toFixed(2)}`).toBeTrue();
        expect(position.distanceTo(previous)).withContext(`jump at ${progress.toFixed(2)}`).toBeLessThan(1.2);
        expect(position.distanceTo(target)).withContext(`look target at ${progress.toFixed(2)}`).toBeGreaterThan(0.5);
        previous = position.clone();
      }
    });
  }

  it("keeps the eye near standing height along the whole route", () => {
    const { path, poses } = pathFor(WORKS, FRAMINGS[0][1]);

    for (let progress = 0; progress <= poses.length - 1; progress += 0.05) {
      const y = sample(path, progress).position.y;
      expect(y).toBeGreaterThan(1.5);
      expect(y).toBeLessThan(1.85);
    }
  });

  it("rounds the statue instead of walking through it", () => {
    const { path } = pathFor(WORKS, FRAMINGS[0][1]);

    for (let progress = 0; progress <= 1; progress += 0.01) {
      const { position } = sample(path, progress);
      expect(Math.hypot(position.x - ROTUNDA.x, position.z)).withContext(`progress ${progress.toFixed(2)}`).toBeGreaterThan(2.2);
    }
  });

  it("walks through the first door on its middle line, looking down the rooms beyond", () => {
    const { path } = pathFor(WORKS, FRAMINGS[0][1]);
    let atDoor = sample(path, 0);
    for (let progress = 0; progress <= 1; progress += 0.002) {
      const here = sample(path, progress);
      if (Math.abs(here.position.x - DOOR_XS[0]) < Math.abs(atDoor.position.x - DOOR_XS[0])) atDoor = here;
    }
    const heading = Math.atan2(atDoor.target.z - atDoor.position.z, atDoor.target.x - atDoor.position.x);

    expect(Math.abs(atDoor.position.z)).toBeLessThan(0.15);
    expect(Math.abs(heading)).toBeLessThan(0.35);
    expect(atDoor.target.x).toBeGreaterThan(atDoor.position.x + 1);
  });

  it("holds the camera level while walking from the statue to Room I", () => {
    const { path } = pathFor(WORKS, FRAMINGS[0][1]);

    for (const progress of [0.35, 0.5, 0.65]) {
      const { position, target } = sample(path, progress);
      const pitch = Math.atan2(target.y - position.y, Math.hypot(target.x - position.x, target.z - position.z));
      expect(Math.abs(pitch)).withContext(`progress ${progress}`).toBeLessThan(0.12);
    }
  });

  it("looks ahead along the route mid-stride, not back at the stop it left", () => {
    const { path, poses } = pathFor(WORKS, FRAMINGS[0][1]);
    const { position, target } = sample(path, 0.5);
    const towardsNext = poses[1].position.clone().sub(position).setY(0).normalize();
    const looking = target.clone().sub(position).setY(0).normalize();

    expect(looking.dot(towardsNext)).toBeGreaterThan(0.5);
  });

  it("works for an empty collection and for a single work", () => {
    for (const works of [[], [WORKS[1]]]) {
      const { path, poses } = pathFor(works, FRAMINGS[0][1]);
      for (let progress = 0; progress <= poses.length - 1; progress += 0.1) {
        const { position, target } = sample(path, progress);
        expect([...position.toArray(), ...target.toArray()].every(Number.isFinite)).toBeTrue();
        expect(insideBuilding(position)).withContext(`progress ${progress}`).toBeTrue();
      }
    }
  });
});
