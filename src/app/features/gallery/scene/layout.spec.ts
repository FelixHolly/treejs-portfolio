import { SceneWork } from "./gallery-view";
import {
  DESK,
  DOOR,
  DOOR_XS,
  ENFILADE,
  fieldOfView,
  HALF_DEPTH,
  LETTERBOX,
  MEDALLION,
  PEDESTAL_RADIUS,
  pieceSlots,
  PLATE,
  ROOM_ONE_X,
  ROTUNDA,
  WALL_HEIGHT,
} from "./layout";

const landscape = (src: string) => ({ src, portrait: false });
const portrait = (src: string) => ({ src, portrait: true });

const COMMISSION: SceneWork = { slug: "a", kind: "commission", images: [landscape("a1"), landscape("a2"), landscape("a3")] };
const STUDY_B: SceneWork = { slug: "b", kind: "study", images: [portrait("b1")] };
const STUDY_C: SceneWork = { slug: "c", kind: "study", images: [landscape("c1")] };

describe("pieceSlots", () => {
  it("hangs a commission as one large gilded frame with two companions stacked beside it", () => {
    const [slot] = pieceSlots([COMMISSION]);
    const [main, upper, lower] = slot.frames;

    expect(slot.frames.map((frame) => frame.src)).toEqual(["a1", "a2", "a3"]);
    expect(slot.frames.every((frame) => frame.gilded)).toBeTrue();
    expect(main.width).toBeGreaterThan(upper.width * 2);
    expect(upper.x).toBe(lower.x);
    expect(upper.x).toBeGreaterThan(main.x + main.width / 2);
    expect(upper.y).toBeGreaterThan(main.y);
    expect(lower.y).toBeLessThan(main.y);
  });

  it("centres a lone companion and ignores images beyond the third", () => {
    const [two] = pieceSlots([{ ...COMMISSION, images: [landscape("a1"), landscape("a2")] }]);
    const [many] = pieceSlots([{ ...COMMISSION, images: [landscape("1"), landscape("2"), landscape("3"), landscape("4")] }]);

    expect(two.frames[1].y).toBe(two.frames[0].y);
    expect(many.frames.length).toBe(3);
  });

  it("gives a commission with a single image a narrower span", () => {
    const [alone] = pieceSlots([{ ...COMMISSION, images: [landscape("a1")] }]);
    const [group] = pieceSlots([COMMISSION]);

    expect(alone.frames.length).toBe(1);
    expect(alone.span).toBeLessThan(group.span);
    expect(alone.centre.x).toBe(alone.frames[0].x);
  });

  it("hangs studies further along in plain frames, portrait or landscape", () => {
    const [, b, c] = pieceSlots([COMMISSION, STUDY_B, STUDY_C]);

    expect(b.frames[0].gilded).toBeFalse();
    expect(b.frames[0].height).toBeGreaterThan(b.frames[0].width);
    expect(c.frames[0].width).toBeGreaterThan(c.frames[0].height);
    expect(c.centre.x).toBeGreaterThan(b.centre.x + 3);
  });

  it("keeps the real collection inside Room II without overlaps", () => {
    const slots = pieceSlots([COMMISSION, STUDY_B, STUDY_C]);
    const edges = slots.map((slot) => [slot.centre.x - slot.span / 2, slot.centre.x + slot.span / 2]);

    expect(edges[0][0]).toBeGreaterThan(15.8);
    expect(edges[2][1]).toBeLessThan(38.8);
    expect(edges[1][0]).toBeGreaterThan(edges[0][1]);
    expect(edges[2][0]).toBeGreaterThan(edges[1][1]);
    expect(ENFILADE.to).toBeGreaterThan(edges[2][1]);
  });

  it("returns nothing for an empty collection", () => {
    expect(pieceSlots([])).toEqual([]);
  });
});

describe("fieldOfView", () => {
  it("is the same lens on every screen that is wider than tall", () => {
    expect(fieldOfView(1)).toBe(50);
    expect(fieldOfView(16 / 9)).toBe(50);
    expect(fieldOfView(3.5)).toBe(50);
  });

  it("widens on an upright screen, most on a phone", () => {
    const tablet = fieldOfView(768 / 1024);
    const phone = fieldOfView(390 / 664);

    expect(tablet).toBeGreaterThan(50);
    expect(phone).toBeGreaterThan(tablet);
    expect(fieldOfView(0.5)).toBe(66);
  });

  it("stays between its two lenses however odd the screen", () => {
    for (const aspect of [0, 0.01, 0.2, 0.55, 0.99, 1.01, 50, Infinity]) {
      expect(fieldOfView(aspect)).withContext(`aspect ${aspect}`).toBeGreaterThanOrEqual(50);
      expect(fieldOfView(aspect)).withContext(`aspect ${aspect}`).toBeLessThanOrEqual(66);
    }
  });
});

describe("the building", () => {
  it("joins the hall's east wall to the first room", () => {
    expect(ROTUNDA.x + ROTUNDA.radius).toBe(ENFILADE.from);
    expect(DOOR_XS[0]).toBeGreaterThan(ENFILADE.from);
    expect(DOOR_XS[0] - ENFILADE.from).toBeLessThan(0.5);
  });

  it("leaves room to walk round the statue's drum", () => {
    expect(ROTUNDA.radius - PEDESTAL_RADIUS).toBeGreaterThan(4);
    expect(ROTUNDA.height).toBeGreaterThan(ROTUNDA.plinthHeight + ROTUNDA.lionHeight + 2);
  });

  it("hangs Room I's drawing between its two doors, under the ceiling", () => {
    expect(PLATE.x - PLATE.width / 2).toBeGreaterThan(DOOR_XS[0] + 1);
    expect(PLATE.x + PLATE.width / 2).toBeLessThan(DOOR_XS[1] - 1);
    expect(PLATE.y + PLATE.height / 2).toBeLessThan(WALL_HEIGHT - 1);
    expect(ROOM_ONE_X).toBeCloseTo((DOOR_XS[0] + DOOR_XS[1]) / 2, 6);
  });

  it("hangs the seal on the wall beside the door to Room II, clear of the door and the corner", () => {
    expect(MEDALLION.x).toBeLessThan(DOOR_XS[1]);
    expect(DOOR_XS[1] - MEDALLION.x).toBeLessThan(0.5);
    expect(MEDALLION.z + MEDALLION.radius).toBeLessThan(-DOOR.width / 2 - 0.2);
    expect(MEDALLION.z - MEDALLION.radius).toBeGreaterThan(-HALF_DEPTH);
  });

  it("mounts the letterbox on the wall over the writing desk, its slot within the box", () => {
    expect(LETTERBOX.x).toBe(DESK.x);
    expect(LETTERBOX.y - LETTERBOX.height / 2).toBeGreaterThan(1.3);
    expect(LETTERBOX.y + LETTERBOX.height / 2).toBeLessThan(2.6);
    expect(LETTERBOX.slotRise).toBeLessThan(LETTERBOX.height / 2);
  });
});
