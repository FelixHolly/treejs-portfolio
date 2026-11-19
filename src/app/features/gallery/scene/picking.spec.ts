import { Box3, Ray, Vector3 } from "three";
import { buildPoses } from "./camera-path";
import { FIRST_WORK_STOP } from "./film";
import { OPEN_BAND, SceneWork } from "./gallery-view";
import { DESK, DOOR_XS, EYE, HANG_Z, LECTERN, LETTERBOX, pieceSlots, PORTRAIT, ROTUNDA, skillPlaqueSlots } from "./layout";
import { partitionWalls, pieceTargets, PieceTarget, PointedLevels, stopHit } from "./picking";

const WORKS: SceneWork[] = [
  { slug: "commission", kind: "commission", images: ["a", "b", "c"].map((src) => ({ src, portrait: false })) },
  { slug: "study", kind: "study", images: [{ src: "d", portrait: true }] },
  { slug: "self", kind: "self-portrait", images: [{ src: "e", portrait: false }] },
];
const BOARD = { x: LECTERN.x, y: 2.2, width: 2.3, height: 1.2 };

function ray(from: [number, number, number], to: [number, number, number]): Ray {
  const origin = new Vector3(...from);
  return new Ray(origin, new Vector3(...to).sub(origin).normalize());
}

describe("picking a piece", () => {
  const slots = pieceSlots(WORKS);
  const targets = pieceTargets(slots, BOARD);
  const walls = partitionWalls();
  const poses = buildPoses(slots, { aspect: 1.97, labelShare: 0.38, statueBand: OPEN_BAND });
  const visitorsBook = FIRST_WORK_STOP + WORKS.length;
  const eye = (stop: number) => poses[stop].position.toArray();
  const hit = (from: [number, number, number], to: [number, number, number]) => stopHit(ray(from, to), targets, walls);

  it("gives every stop but the overview of the works something to point at", () => {
    const stops = new Set(targets.map((target) => target.stop));

    expect([...stops].sort((a, b) => a - b)).toEqual([0, 1, 2, 4, 5, 6, visitorsBook, visitorsBook + 1]);
  });

  it("keeps the list short: a shape for each frame, plaque and piece of furniture, and one for the statue", () => {
    expect(targets.length).toBe(1 + 1 + 4 + 5 + 2 + 2);
    expect(targets.filter((target) => target.round).map((target) => target.stop)).toEqual([0]);
  });

  it("leaves the names board out where no names hang", () => {
    expect(pieceTargets(slots).length).toBe(targets.length - 1);
  });

  it("finds each work's picture from the overview of Room II", () => {
    slots.forEach((slot, work) => {
      const [frame] = slot.frames;
      expect(hit(eye(3), [frame.x, frame.y, HANG_Z])).withContext(slot.slug).toBe(FIRST_WORK_STOP + work);
    });
  });

  it("counts a commission's companions as the commission", () => {
    for (const frame of slots[0].frames) expect(hit(eye(FIRST_WORK_STOP), [frame.x, frame.y, HANG_Z])).toBe(FIRST_WORK_STOP);
  });

  it("finds the portrait and every skill plaque from where the visitor stands in Room I", () => {
    expect(hit(eye(1), [PORTRAIT.x, PORTRAIT.y, HANG_Z])).toBe(1);
    for (const plaque of skillPlaqueSlots()) expect(hit(eye(1), [plaque.x, plaque.y, HANG_Z])).toBe(2);
    expect(hit(eye(2), [PORTRAIT.x, PORTRAIT.y, HANG_Z])).toBe(1);
  });

  it("finds the lectern and its board of names, the desk and its letterbox", () => {
    expect(hit(eye(visitorsBook), [LECTERN.x, 1, LECTERN.z])).toBe(visitorsBook);
    expect(hit(eye(visitorsBook), [BOARD.x + 1, BOARD.y, HANG_Z])).toBe(visitorsBook);
    expect(hit(eye(visitorsBook + 1), [DESK.x, 0.7, DESK.z])).toBe(visitorsBook + 1);
    expect(hit(eye(visitorsBook + 1), [LETTERBOX.x, LETTERBOX.y, HANG_Z])).toBe(visitorsBook + 1);
  });

  it("finds nothing on empty wall, floor or ceiling", () => {
    expect(hit(eye(3), [29.5, 1.9, HANG_Z])).toBeNull();
    expect(hit(eye(3), [24.4, 0, HANG_Z])).toBeNull();
    expect(hit(eye(1), [PORTRAIT.x, 4.6, HANG_Z])).toBeNull();
  });

  it("finds the statue by its body and not by the corners of the box round it", () => {
    const top = ROTUNDA.plinthHeight + ROTUNDA.lionHeight;

    expect(hit(eye(0), [ROTUNDA.x, ROTUNDA.plinthHeight + 1.3, 0])).toBe(0);
    expect(hit(eye(0), [ROTUNDA.x, top - 0.05, 1])).toBeNull();
    expect(hit(eye(0), [ROTUNDA.x, ROTUNDA.plinthHeight + 0.05, -1])).toBeNull();
    expect(hit(eye(0), [ROTUNDA.x, 0.5, 0])).toBeNull();
  });

  it("finds nothing through a wall", () => {
    const [first] = slots[0].frames;
    const fromRoomOne: [number, number, number] = [12, EYE, -3];

    expect(hit(fromRoomOne, [first.x, first.y, HANG_Z + 0.05])).toBeNull();
    expect(hit([DOOR_XS[2] + 2, EYE, -3.2], [slots[2].frames[0].x, 1.9, HANG_Z + 0.05])).toBeNull();
    expect(hit([ROTUNDA.x - 6, EYE, 0], [PORTRAIT.x, PORTRAIT.y, HANG_Z + 0.05])).toBeNull();
  });

  it("finds a piece seen through an open doorway", () => {
    expect(hit([14, EYE, 3.4], [slots[0].frames[0].x + 0.9, 1.95, HANG_Z + 0.05])).toBe(FIRST_WORK_STOP);
    expect(hit([DOOR_XS[0] + 3, EYE, 0], [ROTUNDA.x, ROTUNDA.plinthHeight + 1.3, 0])).toBe(0);
  });

  it("takes the nearest of two pieces that lie along one ray", () => {
    const box = (x: number) => new Box3(new Vector3(x, 0, -1), new Vector3(x + 1, 2, 1));
    const two: PieceTarget[] = [
      { stop: 9, box: box(8) },
      { stop: 7, box: box(4) },
    ];

    expect(stopHit(ray([0, 1, 0], [10, 1, 0]), two, [])).toBe(7);
    expect(stopHit(ray([12, 1, 0], [0, 1, 0]), two, [])).toBe(9);
  });

  it("lets a wall hide a piece behind it but not one in front of it", () => {
    const piece: PieceTarget[] = [{ stop: 3, box: new Box3(new Vector3(4, 0, -1), new Vector3(5, 2, 1)) }];
    const wall = (x: number) => [new Box3(new Vector3(x, 0, -4), new Vector3(x + 0.4, 5, 4))];

    expect(stopHit(ray([0, 1, 0], [10, 1, 0]), piece, wall(2))).toBeNull();
    expect(stopHit(ray([0, 1, 0], [10, 1, 0]), piece, wall(7))).toBe(3);
  });

  it("finds nothing behind the visitor", () => {
    expect(hit(eye(1), [PORTRAIT.x, PORTRAIT.y, 12])).toBeNull();
  });
});

describe("the walls between the rooms", () => {
  it("stand at every door with the doorway left open", () => {
    const walls = partitionWalls();

    for (const x of DOOR_XS) {
      const through = ray([x - 2, EYE, 0], [x + 2, EYE, 0]);
      const beside = ray([x - 2, EYE, 2.5], [x + 2, EYE, 2.5]);
      const above = ray([x - 2, 4, 0], [x + 2, 4, 0]);
      const blocked = (line: Ray) => walls.some((wall) => line.intersectsBox(wall));

      expect(blocked(through)).withContext(`door at ${x}`).toBeFalse();
      expect(blocked(beside)).toBeTrue();
      expect(blocked(above)).toBeTrue();
    }
  });
});

describe("PointedLevels", () => {
  let levels: PointedLevels;
  let seen: Record<number, number>;
  const step = (seconds: number) => levels.update(seconds, (stop, level) => (seen[stop] = level));

  beforeEach(() => {
    levels = new PointedLevels();
    seen = {};
  });

  it("has nothing to do until something is pointed at", () => {
    expect(step(0.016)).toBeFalse();
    expect(seen).toEqual({});
  });

  it("brightens the pointed piece over about 150 milliseconds and then rests", () => {
    levels.point(4);

    expect(step(0.075)).toBeTrue();
    expect(seen[4]).toBeCloseTo(0.5, 5);
    expect(step(0.075)).toBeFalse();
    expect(seen[4]).toBe(1);
    expect(step(0.016)).toBeFalse();
  });

  it("dims it again once the pointer leaves, and then forgets it", () => {
    levels.point(4);
    step(0.2);
    levels.point(null);

    expect(step(0.075)).toBeTrue();
    expect(seen[4]).toBeCloseTo(0.5, 5);
    expect(step(0.1)).toBeFalse();
    expect(seen[4]).toBe(0);

    seen = {};
    expect(step(0.016)).toBeFalse();
    expect(seen).toEqual({});
  });

  it("dims one piece while the next brightens", () => {
    levels.point(4);
    step(0.2);
    levels.point(5);
    step(0.05);

    expect(seen[4]).toBeCloseTo(2 / 3, 5);
    expect(seen[5]).toBeCloseTo(1 / 3, 5);
  });

  it("picks a piece up from where it had dimmed to when the pointer comes back", () => {
    levels.point(4);
    step(0.2);
    levels.point(null);
    step(0.075);
    levels.point(4);
    step(0.03);

    expect(seen[4]).toBeCloseTo(0.7, 5);
  });
});
