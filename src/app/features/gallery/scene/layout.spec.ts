import { SceneWork } from "./gallery-view";
import {
  DESK,
  DOOR,
  DOOR_XS,
  END_WALL_X,
  ENFILADE,
  EYE,
  fieldOfView,
  HALF_DEPTH,
  LECTERN,
  LETTERBOX,
  MEDALLION,
  PEDESTAL_RADIUS,
  pieceSlots,
  ROOM_ONE_X,
  ROTUNDA,
  SKILL_PLAQUE_HEIGHT,
  SKILL_PLAQUES,
  SKILL_WALL,
  skillPlaqueSlots,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from "./layout";

const landscape = (src: string) => ({ src, portrait: false });
const portrait = (src: string) => ({ src, portrait: true });

const COMMISSION: SceneWork = { slug: "a", kind: "commission", images: [landscape("a1"), landscape("a2"), landscape("a3")] };
const STUDY_B: SceneWork = { slug: "b", kind: "study", images: [portrait("b1")] };
const STUDY_C: SceneWork = { slug: "c", kind: "study", images: [landscape("c1")] };
const SELF_PORTRAIT: SceneWork = { slug: "d", kind: "self-portrait", images: [landscape("d1"), landscape("d2")] };
/** Room II is sized for these shapes; the real content is checked against it in the gallery's own spec. */
const REAL: SceneWork[] = [COMMISSION, STUDY_B, { ...STUDY_B, slug: "c" }, SELF_PORTRAIT];

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

  it("hangs a self-portrait like a study: its first image alone, in a plain frame", () => {
    const [slot] = pieceSlots([SELF_PORTRAIT]);
    const [study] = pieceSlots([STUDY_C]);

    expect(slot.frames.map((frame) => frame.src)).toEqual(["d1"]);
    expect(slot.frames[0].gilded).toBeFalse();
    expect(slot).toEqual({ ...study, slug: "d", frames: [{ ...study.frames[0], src: "d1" }] });
  });

  it("keeps a collection shaped like the real one inside Room II without overlaps, a metre of wall to spare", () => {
    const edges = pieceSlots(REAL).map((slot) => [slot.centre.x - slot.span / 2, slot.centre.x + slot.span / 2]);

    expect(edges.length).toBe(4);
    expect(edges[0][0]).toBeGreaterThan(DOOR_XS[1] + WALL_THICKNESS / 2);
    expect(edges[3][1]).toBeLessThan(DOOR_XS[2] - WALL_THICKNESS / 2 - 1);
    for (let index = 1; index < edges.length; index++) {
      expect(edges[index][0]).withContext(`piece ${index}`).toBeGreaterThan(edges[index - 1][1]);
    }
  });

  it("hangs the commission and the two studies at the same places whatever hangs after them", () => {
    const [commission, first, second] = pieceSlots(REAL);

    expect(commission).toEqual(pieceSlots([COMMISSION])[0]);
    expect(commission.frames[0].x).toBe(21.6);
    expect(first.centre.x).toBe(32.6);
    expect(second.centre.x).toBeCloseTo(36.8, 6);
  });

  it("hangs a wide frame further from the piece before it than a narrow one, edge included", () => {
    const nearEdgeAfterStudy = (next: SceneWork) => {
      const [before, after] = pieceSlots([STUDY_B, next]);
      return after.centre.x - after.span / 2 - before.centre.x;
    };

    expect(nearEdgeAfterStudy(STUDY_C)).toBeGreaterThan(nearEdgeAfterStudy(STUDY_B) + 1);
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

  it("hangs Room I's four plaques two by two between its doors, centred in the room under its frieze", () => {
    const slots = skillPlaqueSlots();
    const xs = slots.map((slot) => slot.x);
    const ys = slots.map((slot) => slot.y);

    expect(ROOM_ONE_X).toBeCloseTo((DOOR_XS[0] + DOOR_XS[1]) / 2, 6);
    expect(slots.length).toBe(4);
    expect(slots.length).toBe(SKILL_PLAQUES.count);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(ROOM_ONE_X, 6);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(SKILL_PLAQUES.y, 6);
    expect(Math.min(...xs) - SKILL_PLAQUES.width / 2).toBeGreaterThan(DOOR_XS[0] + 1);
    expect(Math.max(...xs) + SKILL_PLAQUES.width / 2).toBeLessThan(DOOR_XS[1] - 1);
    expect(Math.max(...xs) - Math.min(...xs) + SKILL_PLAQUES.width).toBeCloseTo(SKILL_WALL.width, 6);
    expect(Math.max(...ys) - Math.min(...ys) + SKILL_PLAQUE_HEIGHT).toBeCloseTo(SKILL_WALL.height, 6);
  });

  it("reads the plaques like a page: two in the upper row, left then right, and two straight under them", () => {
    const [first, second, third, fourth] = skillPlaqueSlots();

    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBe(first.y);
    expect(third.y).toBeLessThan(first.y);
    expect(third.x).toBe(first.x);
    expect(fourth.x).toBe(second.x);
    expect(fourth.y).toBe(third.y);
  });

  it("leaves the same gap between the plaques across and down, never overlapping", () => {
    const [first, second, third] = skillPlaqueSlots();

    expect(second.x - first.x - SKILL_PLAQUES.width).toBeCloseTo(SKILL_PLAQUES.gap, 6);
    expect(first.y - third.y - SKILL_PLAQUE_HEIGHT).toBeCloseTo(SKILL_PLAQUES.gap, 6);
    expect(SKILL_PLAQUES.gap).toBeGreaterThan(0.08);
  });

  it("makes every plaque tall enough for six tools, the block around eye height, off the floor and well under the frieze", () => {
    expect(SKILL_PLAQUES.lines).toBe(6);
    expect(SKILL_PLAQUE_HEIGHT).toBeCloseTo(SKILL_PLAQUES.head + 6 * SKILL_PLAQUES.line + SKILL_PLAQUES.foot, 6);
    expect(SKILL_PLAQUES.y - SKILL_WALL.height / 2).toBeGreaterThan(0.6);
    expect(SKILL_PLAQUES.y + SKILL_WALL.height / 2).toBeLessThan(WALL_HEIGHT - 2);
    expect(Math.abs(SKILL_PLAQUES.y - EYE)).toBeLessThan(0.35);
  });

  it("hangs the seal on the wall beside the door to Room II, clear of the door and the corner", () => {
    expect(MEDALLION.x).toBeLessThan(DOOR_XS[1]);
    expect(DOOR_XS[1] - MEDALLION.x).toBeLessThan(0.5);
    expect(MEDALLION.z + MEDALLION.radius).toBeLessThan(-DOOR.width / 2 - 0.2);
    expect(MEDALLION.z - MEDALLION.radius).toBeGreaterThan(-HALF_DEPTH);
  });

  it("stands the lectern and the writing desk in the middle of their own rooms", () => {
    expect(LECTERN.x).toBeCloseTo((DOOR_XS[2] + DOOR_XS[3]) / 2, 0);
    expect(DESK.x).toBeCloseTo((DOOR_XS[3] + END_WALL_X) / 2, 0);
    expect(DOOR_XS[3] - DOOR_XS[2]).toBeCloseTo(END_WALL_X - DOOR_XS[3], 6);
  });

  it("runs the enfilade's side walls just past the end wall, so the corners close", () => {
    expect(ENFILADE.to).toBeGreaterThan(END_WALL_X);
    expect(ENFILADE.to - END_WALL_X).toBeLessThan(0.5);
  });

  it("mounts the letterbox on the wall over the writing desk, its slot within the box", () => {
    expect(LETTERBOX.x).toBe(DESK.x);
    expect(LETTERBOX.y - LETTERBOX.height / 2).toBeGreaterThan(1.3);
    expect(LETTERBOX.y + LETTERBOX.height / 2).toBeLessThan(2.6);
    expect(LETTERBOX.slotRise).toBeLessThan(LETTERBOX.height / 2);
  });
});
