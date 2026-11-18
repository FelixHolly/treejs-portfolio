import { Vector3 } from "three";
import { buildPoses, buildWaypoints, CameraPath, Framing, Pose } from "./camera-path";
import { SceneWork } from "./gallery-view";
import { DOOR, DOOR_XS, HALF_DEPTH, HANG_Z, pieceSlots, ROTUNDA } from "./layout";

const WORKS: SceneWork[] = [
  { slug: "a", kind: "commission", images: [1, 2, 3].map((n) => ({ src: `a${n}`, portrait: false })) },
  { slug: "b", kind: "study", images: [{ src: "b", portrait: true }] },
  { slug: "c", kind: "study", images: [{ src: "c", portrait: true }] },
];

const FRAMINGS: [string, Framing][] = [
  ["1440x900 beside a label", { aspect: 1.6, labelShare: 0.377 }],
  ["1920x1080 beside a label", { aspect: 16 / 9, labelShare: 0.3 }],
  ["1024x768 beside a label", { aspect: 4 / 3, labelShare: 0.42 }],
  ["900x1200 at the label cap", { aspect: 0.75, labelShare: 0.6 }],
  ["850x1000 with labels over the scene", { aspect: 0.85, labelShare: 0 }],
  ["a phone", { aspect: 390 / 664, labelShare: 0 }],
  ["an ultrawide", { aspect: 3.5, labelShare: 0.2 }],
];

function pathFor(works: SceneWork[], framing: Framing): { path: CameraPath; poses: Pose[] } {
  const slots = pieceSlots(works);
  const poses = buildPoses(slots, framing);
  return { path: new CameraPath(poses, buildWaypoints(slots.length)), poses };
}

/** True when a point is inside the rotunda, the enfilade, or the doorway joining them. */
function insideBuilding(point: Vector3): boolean {
  const inRotunda = Math.hypot(point.x, point.z) < ROTUNDA.radius - 0.2;
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
    const poses = buildPoses(slots, { aspect: 1.6, labelShare: 0 });

    slots.forEach((slot, index) => {
      const pose = poses[3 + index];
      expect(pose.target.z).toBe(HANG_Z);
      expect(pose.position.x).toBeCloseTo(slot.centre.x, 6);
      expect(pose.target.x).toBeCloseTo(pose.position.x, 6);
    });
  });

  it("stands further back and off to the right when a label takes part of the screen", () => {
    const slots = pieceSlots(WORKS);
    const open = buildPoses(slots, { aspect: 1.6, labelShare: 0 })[3];
    const beside = buildPoses(slots, { aspect: 1.6, labelShare: 0.4 })[3];

    expect(beside.position.z).toBeGreaterThan(open.position.z);
    expect(beside.position.x).toBeGreaterThan(slots[0].centre.x);
  });
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

  it("keeps the eye near standing height all the way", () => {
    const { path, poses } = pathFor(WORKS, FRAMINGS[0][1]);

    for (let progress = 0; progress <= poses.length - 1; progress += 0.05) {
      const y = sample(path, progress).position.y;
      expect(y).toBeGreaterThan(1.5);
      expect(y).toBeLessThan(1.85);
    }
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
