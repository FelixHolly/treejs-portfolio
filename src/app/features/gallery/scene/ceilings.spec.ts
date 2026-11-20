import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, Raycaster, Triangle, Vector3 } from "three";
import { luminance } from "./corners";
import { BEAMS, beams, buildCeilings, wells } from "./ceilings";
import { STONE } from "./fabric";
import { HALF_DEPTH, LAYLIGHT, RoomSpan, roomSpans, WALL_HEIGHT } from "./layout";
import { Stonework } from "./stonework";

const GLASS = WALL_HEIGHT + LAYLIGHT.well;
const middleOf = (span: { from: number; to: number }) => (span.from + span.to) / 2;

describe("wells", () => {
  const spans = roomSpans();
  const beamed = spans.find((span) => span.feature === "beams") as RoomSpan;

  it("gives a room one long laylight, stopping short of both its ends", () => {
    for (const span of spans.filter((room) => room.feature !== "beams")) {
      const [well, ...more] = wells(span);

      expect(more).toEqual([]);
      expect(well.from - span.from).toBeCloseTo(LAYLIGHT.inset, 6);
      expect(span.to - well.to).toBeCloseTo(LAYLIGHT.inset, 6);
      expect(well.to - well.from).toBeGreaterThan(LAYLIGHT.halfWidth * 2);
    }
  });

  it("is narrower than the room, so the glass lights the middle and leaves the walls to the lamps", () => {
    expect(LAYLIGHT.halfWidth).toBeLessThan(HALF_DEPTH / 2);
    expect(LAYLIGHT.well).toBeGreaterThan(0.2);
  });

  it("gives the room with beams one to each bay, with a beam between every two", () => {
    const glazed = wells(beamed);
    const across = beams(beamed);

    expect(glazed.length).toBe(BEAMS.bays);
    expect(across.length).toBe(BEAMS.bays - 1);
    across.forEach((x, index) => {
      expect(x - glazed[index].to).toBeGreaterThan(BEAMS.width / 2 + 0.3);
      expect(glazed[index + 1].from - x).toBeGreaterThan(BEAMS.width / 2 + 0.3);
    });
    expect(glazed[0].from).toBeGreaterThan(beamed.from);
    expect(glazed[BEAMS.bays - 1].to).toBeLessThan(beamed.to);
  });

  it("spaces the beams evenly from wall to wall", () => {
    const across = [beamed.from, ...beams(beamed), beamed.to];
    const bays = across.slice(1).map((x, index) => x - across[index]);

    for (const bay of bays) expect(bay).toBeCloseTo((beamed.to - beamed.from) / BEAMS.bays, 6);
  });

  it("crosses no other room with a beam", () => {
    for (const span of spans.filter((room) => room.feature !== "beams")) expect(beams(span)).toEqual([]);
  });
});

describe("buildCeilings", () => {
  let overhead: Mesh<BufferGeometry>;

  /** What is seen looking straight up from the floor at `x` and `z`: how high it is, and how bright. */
  function above(x: number, z: number): { y: number; light: number } | undefined {
    const [hit] = new Raycaster(new Vector3(x, 0, z), new Vector3(0, 1, 0)).intersectObject(overhead);
    if (!hit?.face || !hit.barycoord) return undefined;
    const color = overhead.geometry.getAttribute("color");
    const { a, b, c } = hit.face;
    const tone = Triangle.getInterpolatedAttribute(color as BufferAttribute, a, b, c, hit.barycoord, new Vector3());
    return { y: hit.point.y, light: luminance([tone.x, tone.y, tone.z]) };
  }

  beforeAll(() => {
    const plaster = new Stonework();
    buildCeilings(plaster);
    overhead = new Mesh(plaster.geometry(), new MeshBasicMaterial());
  });

  it("closes every room overhead, from wall to wall and end to end", () => {
    for (const span of roomSpans()) {
      for (const along of [0.01, 0.2, 0.5, 0.77, 0.99]) {
        for (const across of [-0.98, -0.5, 0.03, 0.4, 0.98]) {
          const seen = above(span.from + (span.to - span.from) * along, across * HALF_DEPTH);

          expect(seen).withContext(`room from ${span.from}, ${along} along, ${across} across`).toBeDefined();
          expect(seen?.y).toBeGreaterThanOrEqual(WALL_HEIGHT - BEAMS.drop - 1e-6);
          expect(seen?.y).toBeLessThanOrEqual(GLASS + 1e-6);
        }
      }
    }
  });

  it("sets the glass above the ceiling, at the head of its well", () => {
    for (const span of roomSpans()) {
      for (const well of wells(span)) {
        const pane = above(middleOf(well) + 0.3, 0.6);
        const beside = above(middleOf(well), LAYLIGHT.halfWidth + 0.5);

        expect(pane?.y).withContext(`well from ${well.from}`).toBeGreaterThan(WALL_HEIGHT + LAYLIGHT.well - 0.05);
        expect(beside?.y).withContext(`well from ${well.from}`).toBeCloseTo(WALL_HEIGHT, 5);
      }
    }
  });

  it("makes the glass the palest thing overhead, and its bars the darkest", () => {
    const [span] = roomSpans();
    const [well] = wells(span);
    const pane = above(middleOf(well) + 0.3, 0.6);
    const bar = above(middleOf(well) + 0.3, 0);
    const ceiling = above(middleOf(well), LAYLIGHT.halfWidth + 0.5);

    expect(pane?.light).toBeGreaterThan((ceiling?.light ?? 0) * 4);
    expect(bar?.light).toBeLessThan(ceiling?.light ?? 0);
    expect(bar?.light).toBeCloseTo(luminance(STONE.bar), 6);
  });

  it("keeps the glass pale and not bright: under a third of white", () => {
    const color = overhead.geometry.getAttribute("color");
    let brightest = 0;
    for (let index = 0; index < color.count; index++) brightest = Math.max(brightest, luminance([color.getX(index), color.getY(index), color.getZ(index)]));

    expect(brightest).toBeLessThan(0.3);
    expect(brightest).toBeGreaterThan(0.1);
  });

  it("paints the ceiling darker towards the walls than beside the glass", () => {
    const [span] = roomSpans();
    const x = middleOf(span);

    expect(above(x, HALF_DEPTH - 0.6)?.light).toBeLessThan(above(x, LAYLIGHT.halfWidth + 0.1)?.light ?? 0);
  });

  it("hangs Room II's beams under its ceiling from wall to wall, and no beam anywhere else", () => {
    for (const span of roomSpans()) {
      const across = beams(span);
      for (const x of across) {
        for (const z of [2.6, HALF_DEPTH - 0.02, -(HALF_DEPTH - 0.02)]) expect(above(x, z)?.y).toBeCloseTo(WALL_HEIGHT - BEAMS.drop, 5);
      }
      if (!across.length) expect(above(middleOf(span), 2.6)?.y).toBeCloseTo(WALL_HEIGHT, 5);
    }
  });

  it("faces everything level downwards, to be seen from the floor", () => {
    const normal = overhead.geometry.getAttribute("normal");
    for (let index = 0; index < normal.count; index++) expect(normal.getY(index)).toBeLessThanOrEqual(0);
  });
});
