import { SceneWork } from "./gallery-view";
import { ENFILADE, pieceSlots } from "./layout";

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
    expect(edges[2][1]).toBeLessThan(35.8);
    expect(edges[1][0]).toBeGreaterThan(edges[0][1]);
    expect(edges[2][0]).toBeGreaterThan(edges[1][1]);
    expect(ENFILADE.to).toBeGreaterThan(edges[2][1]);
  });

  it("returns nothing for an empty collection", () => {
    expect(pieceSlots([])).toEqual([]);
  });
});
