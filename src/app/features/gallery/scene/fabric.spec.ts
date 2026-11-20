import { Corner, corners, luminance } from "./corners";
import { casing, CASING_TOP, doorOpening, doorReveal, ROOM_WALLS, STONE } from "./fabric";
import { DOOR, DOOR_CASING, HALF_DEPTH, WALL_THICKNESS } from "./layout";
import { Stonework, Tone, WallFace } from "./stonework";

/** The door's two jambs along a wall that starts at the origin and faces +Z. */
const [LEFT, RIGHT] = [HALF_DEPTH - DOOR.width / 2, HALF_DEPTH + DOOR.width / 2];

function cased(proud: number = DOOR_CASING.proud, stone: Tone = STONE.trim): { stone: Corner[]; gold: Corner[] } {
  const [masonry, gilt] = [new Stonework(), new Stonework()];
  casing(new WallFace(masonry, 0, 0, [0, 1]), new WallFace(gilt, 0, 0, [0, 1]), doorOpening(proud, stone));
  return { stone: corners(masonry.geometry()), gold: corners(gilt.geometry()) };
}

/** The fronts of the architrave's bands where they cross over the door's head. */
function overHead(stone: Corner[]): Corner[] {
  return stone.filter(({ at, normal }) => normal.z === 1 && at.y > DOOR.height - 1e-6 && at.y < DOOR.height + DOOR_CASING.width + 1e-6);
}

describe("the building's fabric", () => {
  it("keeps to graphite: door surrounds a shade paler than the walls, glass paler again, its bars near black", () => {
    expect(luminance(STONE.trim)).toBeGreaterThan(luminance(STONE.wall));
    expect(luminance(STONE.trim)).toBeLessThan(luminance(STONE.wall) * 2.5);
    expect(luminance(STONE.glass)).toBeGreaterThan(luminance(STONE.wall));
    expect(luminance(STONE.bar)).toBeLessThan(0.01);
  });

  it("has a wall tone for each of the four rooms, none far from the others and none with a hue of its own", () => {
    expect(ROOM_WALLS.length).toBe(4);
    for (const wall of ROOM_WALLS) {
      expect(Math.abs(luminance(wall) - luminance(STONE.wall))).toBeLessThan(0.02);
      expect(Math.max(...wall) - Math.min(...wall)).toBeLessThan(0.03);
    }
  });
});

describe("casing", () => {
  it("frames the opening on three sides and leaves the opening itself clear", () => {
    const inOpening = cased().stone.filter(({ at }) => at.x > LEFT + 1e-6 && at.x < RIGHT - 1e-6 && at.y < DOOR.height - 1e-6);

    expect(inOpening).toEqual([]);
  });

  it("rises from the floor to the top of its shelf", () => {
    const ys = cased().stone.map(({ at }) => at.y);

    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBeCloseTo(CASING_TOP, 5);
    expect(CASING_TOP).toBeGreaterThan(DOOR.height + DOOR_CASING.width);
  });

  it("stands off the wall as far as it is told, its shelf a little further, and never back into the wall", () => {
    for (const proud of [DOOR_CASING.proud, 0.2]) {
      const { stone } = cased(proud);

      expect(Math.max(...overHead(stone).map(({ at }) => at.z))).toBeCloseTo(proud, 5);
      expect(Math.max(...stone.map(({ at }) => at.z))).toBeCloseTo(proud + 0.1, 5);
      expect(Math.min(...stone.map(({ at }) => at.z))).toBe(0);
      for (const { normal } of stone) expect(normal.z).toBeGreaterThanOrEqual(0);
    }
  });

  it("is an architrave of the width the layout gives it, on plinth blocks a little wider", () => {
    const { stone } = cased();
    const bands = overHead(stone);
    const plinths = stone.filter(({ at }) => at.y < 0.2);

    expect(Math.min(...bands.map(({ at }) => at.x))).toBeCloseTo(LEFT - DOOR_CASING.width, 5);
    expect(Math.max(...bands.map(({ at }) => at.x))).toBeCloseTo(RIGHT + DOOR_CASING.width, 5);
    expect(Math.min(...plinths.map(({ at }) => at.x))).toBeLessThan(LEFT - DOOR_CASING.width);
    expect(Math.max(...plinths.map(({ at }) => at.z))).toBeGreaterThan(DOOR_CASING.proud);
  });

  it("is cut from the stone it is given", () => {
    const grey: Tone = [0.2, 0.2, 0.2];

    for (const { tone } of cased(DOOR_CASING.proud, grey).stone) {
      expect(tone[0]).toBeGreaterThan(0.17);
      expect(tone[0]).toBeLessThanOrEqual(0.2 + 1e-6);
    }
  });

  it("lets a thin gold line into the architrave close beside the opening, a hair proud of it", () => {
    const { gold, stone } = cased();
    // The inner band's front, under the frieze, which stands further back again
    const inner = Math.min(...overHead(stone).filter(({ at }) => at.y < DOOR.height + DOOR_CASING.width - 0.01).map(({ at }) => at.z));

    const outer = (corner: Corner) => Math.max(LEFT - corner.at.x, corner.at.x - RIGHT);
    const uprights = gold.filter(({ at }) => at.y < DOOR.height);
    const over = gold.filter(({ at }) => at.y > DOOR.height + 0.02);

    expect(gold.length).toBeGreaterThan(0);
    // The line turns both top corners whole: over the door it reaches as far out as the uprights' outer edges
    expect(Math.max(...over.map(outer))).toBeCloseTo(Math.max(...uprights.map(outer)), 5);
    for (const { at } of gold) {
      const beside = Math.max(LEFT - at.x, at.x - RIGHT, at.y - DOOR.height);
      expect(beside).toBeGreaterThan(0);
      expect(beside).toBeLessThan(0.04);
      expect(at.z).toBeGreaterThanOrEqual(inner);
      expect(at.z - inner).toBeLessThan(0.01);
    }
  });
});

describe("doorReveal", () => {
  const x = 20;
  let lining: Corner[];

  beforeEach(() => {
    const masonry = new Stonework();
    doorReveal(masonry, x);
    lining = corners(masonry.geometry());
  });

  it("lines the doorway through the wall's own thickness, jamb to jamb and up to the door's head", () => {
    expect(lining.length).toBe(18);
    expect(Math.min(...lining.map(({ at }) => at.x))).toBeCloseTo(x - WALL_THICKNESS / 2, 5);
    expect(Math.max(...lining.map(({ at }) => at.x))).toBeCloseTo(x + WALL_THICKNESS / 2, 5);
    expect(Math.max(...lining.map(({ at }) => Math.abs(at.z)))).toBeCloseTo(DOOR.width / 2, 5);
    expect(Math.max(...lining.map(({ at }) => at.y))).toBeCloseTo(DOOR.height, 5);
  });

  it("faces all of it into the doorway", () => {
    for (const { at, normal } of lining) {
      if (normal.y !== 0) expect([normal.y, at.y]).toEqual([-1, 3.3]);
      else expect(normal.z).toBe(-Math.sign(at.z));
    }
  });

  it("is paler towards the room the visitor walks into, as if that room's light fell into it", () => {
    const west = lining.filter(({ at }) => at.x < x);
    const east = lining.filter(({ at }) => at.x > x);

    expect(Math.max(...west.map(({ tone }) => luminance(tone)))).toBeLessThan(Math.min(...east.map(({ tone }) => luminance(tone))));
  });
});
