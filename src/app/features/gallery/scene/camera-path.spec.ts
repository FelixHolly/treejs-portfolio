import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { buildPoses, buildWaypoints, CameraPath, Framing, Pose } from "./camera-path";
import { PageFraming, SceneWork } from "./gallery-view";
import {
  DOOR,
  DOOR_XS,
  END_WALL_X,
  EYE,
  fieldOfView,
  HALF_DEPTH,
  HANG_Z,
  MEDALLION,
  pieceSlots,
  ROTUNDA,
  SKILL_PLAQUES,
  skillPlaqueHeight,
  skillPlaqueXs,
  WALL_THICKNESS,
} from "./layout";

const WORKS: SceneWork[] = [
  { slug: "a", kind: "commission", images: [1, 2, 3].map((n) => ({ src: `a${n}`, portrait: false })) },
  { slug: "b", kind: "study", images: [{ src: "b", portrait: true }] },
  { slug: "c", kind: "study", images: [{ src: "c", portrait: true }] },
  { slug: "d", kind: "self-portrait", images: [{ src: "d", portrait: false }] },
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
  const inEnfilade = point.x > 4.8 && point.x < END_WALL_X - WALL_THICKNESS / 2 && Math.abs(point.z) < HALF_DEPTH - 0.15;
  return inRotunda || inEnfilade;
}

function throughADoor(point: Vector3): boolean {
  return DOOR_XS.some((x) => Math.abs(point.x - x) < 0.25) ? Math.abs(point.z) < DOOR.width / 2 - 0.2 : true;
}

describe("buildPoses", () => {
  it("gives one pose per stop: five rooms plus one per work", () => {
    expect(pathFor(WORKS, FRAMINGS[0][1]).poses.length).toBe(9);
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

  for (const [name, framing] of FRAMINGS) {
    it(`stands every stop in its own room at ${name}`, () => {
      const { poses } = pathFor(WORKS, framing);
      const wall = WALL_THICKNESS / 2;
      const rooms = [
        ...WORKS.map(() => [DOOR_XS[1], DOOR_XS[2]]),
        [DOOR_XS[2], DOOR_XS[3]],
        [DOOR_XS[3], END_WALL_X],
      ];

      rooms.forEach(([west, east], index) => {
        const { x } = poses[3 + index].position;
        expect(x).withContext(`stop ${3 + index}`).toBeGreaterThan(west + wall);
        expect(x).withContext(`stop ${3 + index}`).toBeLessThan(east - wall);
      });
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

  it("keeps the wide last frame out of sight from in front of the study before it, on a short wide screen", () => {
    // 1288x654, where the label and its gutter take 44% of the width
    const framing = frame(1288 / 654, 0.44);
    const slots = pieceSlots(WORKS);
    const study = buildPoses(slots, framing)[5];
    const wide = slots[3];
    const camera = new PerspectiveCamera(fieldOfView(framing.aspect), framing.aspect, 0.1, 80);
    camera.position.copy(study.position);
    camera.lookAt(study.target);
    // As far as the scene turns when the mouse rests at the right edge of the screen
    camera.rotateY(-0.06);
    camera.updateMatrixWorld();

    const nearEdge = new Vector3(wide.centre.x - wide.span / 2, wide.centre.y, HANG_Z).project(camera);

    expect(nearEdge.x).toBeGreaterThan(1);
  });
});

describe("the Room I pose", () => {
  // Window sizes with the share of the width the label and its gutter take, as the page measures it
  const WINDOWS: [string, Framing][] = [
    ["1288x654", frame(1288 / 654, 0.44)],
    ["1440x790", frame(1440 / 790, 0.42)],
    ["1920x969", frame(1920 / 969, 0.3)],
    ["1024x768", frame(1024 / 768, 0.45)],
    ...FRAMINGS.filter(([, framing]) => framing.labelShare > 0 && framing.aspect > 1),
  ];
  const HEIGHT = skillPlaqueHeight(4);
  /** The header's share of the height of the shortest window the gallery is checked at. */
  const HEADER = 84 / 654;

  function cameraAt(framing: Framing, yaw = 0): PerspectiveCamera {
    const pose = buildPoses(pieceSlots(WORKS), framing)[1];
    const camera = new PerspectiveCamera(fieldOfView(framing.aspect), framing.aspect, 0.1, 80);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    camera.rotateY(yaw);
    camera.updateMatrixWorld();
    return camera;
  }

  /** The corners of the whole row of plaques, as shares of the screen from its left and top. */
  function rowOnScreen(camera: PerspectiveCamera): { left: number; right: number; top: number; bottom: number } {
    const xs = skillPlaqueXs();
    const corner = (x: number, y: number) => new Vector3(x, y, HANG_Z).project(camera);
    const topLeft = corner(xs[0] - SKILL_PLAQUES.width / 2, SKILL_PLAQUES.y + HEIGHT / 2);
    const bottomRight = corner(xs[xs.length - 1] + SKILL_PLAQUES.width / 2, SKILL_PLAQUES.y - HEIGHT / 2);
    return { left: (topLeft.x + 1) / 2, right: (bottomRight.x + 1) / 2, top: (1 - topLeft.y) / 2, bottom: (1 - bottomRight.y) / 2 };
  }

  for (const [name, framing] of WINDOWS) {
    it(`shows all three plaques left of the label and under the header at ${name}`, () => {
      const row = rowOnScreen(cameraAt(framing));

      expect(row.left).toBeGreaterThan(0.02);
      expect(row.right).toBeLessThan(1 - framing.labelShare);
      expect(row.top).toBeGreaterThan(HEADER + 0.03);
      expect(row.bottom).toBeLessThan(0.9);
    });

    it(`sets the row in the middle of the space the label leaves at ${name}`, () => {
      const row = rowOnScreen(cameraAt(framing));

      expect((row.left + row.right) / 2).toBeCloseTo((1 - framing.labelShare) / 2, 1);
    });

  }

  // An ultrawide sees the whole room, the far wall with it
  for (const [name, framing] of WINDOWS.filter(([, window]) => window.aspect < 3)) {
    it(`keeps the seal on the far wall out of sight at ${name}, however the mouse turns the view`, () => {
      for (const yaw of [0, -0.06]) {
        const camera = cameraAt(framing, yaw);
        const nearEdge = new Vector3(MEDALLION.x, MEDALLION.y, MEDALLION.z - MEDALLION.radius - 0.05).project(camera);

        expect(nearEdge.x).withContext(`yaw ${yaw}`).toBeGreaterThan(1);
      }
    });
  }

  it("letters the tools at least 15 px tall in the owner's 1288x654 window", () => {
    const row = rowOnScreen(cameraAt(WINDOWS[0][1]));
    const pixelsPerMetre = ((row.bottom - row.top) * 654) / HEIGHT;

    // A tool's capital letters stand about 0.43 of its line high
    expect(pixelsPerMetre * SKILL_PLAQUES.line * 0.43).toBeGreaterThan(15);
  });

  it("stands square to the wall in front of the row, in Room I", () => {
    const pose = buildPoses(pieceSlots(WORKS), frame(1.6, 0))[1];

    expect(pose.position.x).toBeCloseTo(SKILL_PLAQUES.x, 6);
    expect(pose.target.x).toBeCloseTo(pose.position.x, 6);
    expect(pose.target.z).toBe(HANG_Z);
    expect(pose.position.x).toBeGreaterThan(DOOR_XS[0]);
    expect(pose.position.x).toBeLessThan(DOOR_XS[1]);
  });
});

describe("the entrance pose", () => {
  // The statue's crown and front paws stand this far towards the arriving visitor from its middle.
  const crown = new Vector3(ROTUNDA.x - 0.7, ROTUNDA.plinthHeight + ROTUNDA.lionHeight, 0);
  const feet = new Vector3(ROTUNDA.x - 0.9, ROTUNDA.plinthHeight, 0);
  const farthest = ROTUNDA.radius - 0.5;

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
    expect(sample(path, 99).position.distanceTo(poses[poses.length - 1].position)).toBeLessThan(1e-6);
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

  it("never snaps its view: the look direction turns smoothly along the whole route", () => {
    const { path, poses } = pathFor(WORKS, FRAMINGS[0][1]);
    const yawAt = (progress: number) => {
      const { position, target } = sample(path, progress);
      return Math.atan2(target.z - position.z, target.x - position.x);
    };

    let previous = yawAt(0);
    for (let progress = 0.0005; progress <= poses.length - 1; progress += 0.0005) {
      const yaw = yawAt(progress);
      const turn = Math.abs(Math.atan2(Math.sin(yaw - previous), Math.cos(yaw - previous)));
      expect(turn).withContext(`progress ${progress.toFixed(4)}`).toBeLessThan(0.02);
      previous = yaw;
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
