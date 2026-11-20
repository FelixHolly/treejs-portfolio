import { Mesh, Vector3 } from "three";
import { buildArchitecture, createPalette } from "./building";
import { CASING_TOP } from "./fabric";
import { StoneFloor } from "./floor";
import {
  BENCH,
  DOOR,
  DOOR_CASING,
  DOOR_XS,
  END_WALL_X,
  HALF_DEPTH,
  LECTERN,
  PEDESTAL_RADIUS,
  ROTUNDA,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from "./layout";
import { buildShading, CORNERS, GroundShadow, groundShadows, HALL_FACES } from "./shading";

/** The hall's gold inlay: its inner edge, and how high it lies above the floor. */
const INLAY = { inner: 3.3, y: 0.004 } as const;

interface Painted {
  at: Vector3;
  /** How dark the patch is at this corner, and how far out from its dark edge the corner lies (0 to 1). */
  strength: number;
  out: number;
}

function painted(): Painted[] {
  const { geometry } = buildShading();
  const position = geometry.getAttribute("position");
  const shade = geometry.getAttribute("shade");
  // The mesh holds single-precision numbers; rounded, they compare with the layout's own
  const exact = (value: number) => Math.round(value * 1e5) / 1e5;
  return Array.from({ length: position.count }, (_, index) => ({
    at: new Vector3(exact(position.getX(index)), exact(position.getY(index)), exact(position.getZ(index))),
    strength: exact(shade.getX(index)),
    out: shade.getY(index),
  }));
}

/** Lying on the floor; a patch on a wall starts at the floor's own height instead. */
const onFloor = (corner: Painted) => corner.at.y > 0 && corner.at.y < 0.01;
const inHall = (corner: Painted) => corner.at.x < DOOR_XS[0] - WALL_THICKNESS / 2 + 0.01;
const fromMiddle = (corner: Painted, shadow: GroundShadow) => Math.hypot(corner.at.x - shadow.x, corner.at.z - shadow.z);

describe("groundShadows", () => {
  const [pedestal, lectern, bench] = groundShadows();

  it("grounds the statue's drum, the lectern and the bench where the layout stands them", () => {
    expect([pedestal.x, pedestal.z]).toEqual([ROTUNDA.x, 0]);
    expect([lectern.x, lectern.z]).toEqual([LECTERN.x, LECTERN.z]);
    expect([bench.x, bench.z]).toEqual([BENCH.x, BENCH.z]);
  });

  it("starts the drum's shadow under its lowest step and ends it short of the gold inlay", () => {
    const foot = pedestal.foot as { radius: number };

    expect(foot.radius).toBeCloseTo(PEDESTAL_RADIUS + 0.2, 6);
    expect(foot.radius + pedestal.spread).toBeGreaterThan(foot.radius + 1);
    expect(foot.radius + pedestal.spread).toBeLessThan(INLAY.inner);
  });

  it("keeps the lectern's own to the dark close under its foot, inside the furniture's wider shadow", () => {
    const foot = lectern.foot as { radius: number };

    expect(foot.radius).toBeGreaterThan(0.2);
    expect(foot.radius + lectern.spread).toBeLessThan(0.75);
  });

  it("gives the bench a shadow of its own shape", () => {
    expect(bench.foot).toEqual({ halfWidth: 1.2, halfDepth: 0.3 });
  });

  it("leaves every one of them a shade, not a hole", () => {
    for (const shadow of groundShadows()) {
      expect(shadow.strength).toBeGreaterThan(0.3);
      expect(shadow.strength).toBeLessThan(0.7);
    }
  });
});

describe("buildShading", () => {
  it("is one mesh, so all the painted shade costs one draw", () => {
    const shading = buildShading();

    expect(shading).toBeInstanceOf(Mesh);
    expect(shading.children.length).toBe(0);
    expect(shading.geometry.getAttribute("position").count % 3).toBe(0);
  });

  it("is laid over what is there without hiding it or writing depth, before the painted light", () => {
    const { material, renderOrder } = buildShading();

    expect(material.transparent).toBeTrue();
    expect(material.depthWrite).toBeFalse();
    expect(renderOrder).toBeLessThan(0);
    expect(material.fragmentShader).toContain("vec4(0.0, 0.0, 0.0, dark)");
  });

  it("thins out with the room's fog, so it never darkens the fog itself", () => {
    const { material } = buildShading();

    expect(material.fog).toBeTrue();
    expect(material.uniforms["fogNear"]).toBeDefined();
    expect(material.fragmentShader).toContain("1.0 - smoothstep(fogNear, fogFar, vFogDepth)");
  });

  it("works out its falloff per pixel, with no image to show its rounding", () => {
    const { material } = buildShading();

    expect(Object.keys(material.uniforms).some((name) => /map|texture/i.test(name))).toBeFalse();
    expect(material.fragmentShader).toContain("near * near");
  });

  it("is nowhere darker than the darkest thing it shades, and has gone at every patch's far edge", () => {
    const darkest = Math.max(...groundShadows().map((shadow) => shadow.strength), ...Object.values(CORNERS).map((corner) => corner.strength));

    for (const corner of painted()) {
      expect(corner.strength).toBeGreaterThanOrEqual(0);
      expect(corner.strength).toBeLessThanOrEqual(darkest);
      expect([0, 1]).toContain(corner.out);
    }
  });

  it("stays inside the building", () => {
    for (const { at } of painted()) {
      expect(at.x).toBeGreaterThanOrEqual(ROTUNDA.x - ROTUNDA.radius - 1e-6);
      expect(at.x).toBeLessThanOrEqual(END_WALL_X);
      expect(Math.abs(at.z)).toBeLessThanOrEqual(ROTUNDA.radius + 1e-6);
      expect(at.y).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeLessThanOrEqual(WALL_HEIGHT);
    }
  });

  it("lies on the floor above both slabs of it and under the gold inlay, which stays crisp", () => {
    const heights = new Set(painted().filter(onFloor).map((corner) => corner.at.y));

    for (const height of heights) {
      expect(height).toBeGreaterThan(0.001);
      expect(height).toBeLessThan(INLAY.y);
    }
    expect(heights.size).toBeGreaterThan(1);
  });

  describe("under what stands on the floor", () => {
    it("is full at each foot's edge and gone at its reach", () => {
      for (const shadow of groundShadows()) {
        const reach = "radius" in shadow.foot ? shadow.foot.radius + shadow.spread : undefined;
        if (reach === undefined) continue;
        const ring = painted().filter((corner) => onFloor(corner) && corner.strength === shadow.strength && fromMiddle(corner, shadow) < reach + 1e-6);

        expect(ring.length).toBeGreaterThan(0);
        for (const corner of ring) {
          const far = fromMiddle(corner, shadow);
          expect(far).toBeCloseTo(corner.out === 0 ? reach - shadow.spread : reach, 4);
        }
      }
    });

    it("covers the bench's whole foot and rounds its corners", () => {
      const bench = groundShadows()[2];
      const foot = bench.foot as { halfWidth: number; halfDepth: number };
      const near = painted().filter(
        (corner) =>
          onFloor(corner) &&
          Math.abs(corner.at.x - bench.x) <= foot.halfWidth + bench.spread + 1e-6 &&
          Math.abs(corner.at.z - bench.z) <= foot.halfDepth + bench.spread + 1e-6,
      );
      const gone = near.filter((corner) => corner.out === 1 && corner.strength === bench.strength);
      const beyondFoot = (corner: Painted) =>
        Math.hypot(
          Math.max(Math.abs(corner.at.x - bench.x) - foot.halfWidth, 0),
          Math.max(Math.abs(corner.at.z - bench.z) - foot.halfDepth, 0),
        );

      expect(gone.length).toBeGreaterThan(8);
      for (const corner of gone) expect(beyondFoot(corner)).toBeCloseTo(bench.spread, 4);
      const inside = near.filter((corner) => corner.out === 0 && corner.strength === bench.strength);
      expect(Math.max(...inside.map((corner) => Math.abs(corner.at.x - bench.x)))).toBeCloseTo(foot.halfWidth, 4);
      expect(Math.max(...inside.map((corner) => Math.abs(corner.at.z - bench.z)))).toBeCloseTo(foot.halfDepth, 4);
    });
  });

  describe("in the corners of the hall", () => {
    const ring = () => painted().filter((corner) => inHall(corner) && Math.hypot(corner.at.x - ROTUNDA.x, corner.at.z) > ROTUNDA.radius - CORNERS.floor.reach - 1e-6);

    it("runs round the wall's foot, on the floor and up the wall", () => {
      const corners = ring();

      expect(corners.some((corner) => onFloor(corner) && corner.out === 1)).toBeTrue();
      expect(Math.max(...corners.map((corner) => corner.at.y))).toBeCloseTo(CORNERS.foot.reach, 6);
    });

    it("stands just off the wall, corner for corner with its flat faces, so it never dips behind one", () => {
      const onWall = ring().filter((corner) => corner.at.y > 0.01);
      const angles = new Set(onWall.map((corner) => Math.atan2(corner.at.z, corner.at.x - ROTUNDA.x).toFixed(3)));

      for (const corner of onWall) {
        const far = Math.hypot(corner.at.x - ROTUNDA.x, corner.at.z);
        expect(far).toBeLessThan(ROTUNDA.radius);
        expect(far).toBeGreaterThan(ROTUNDA.radius - 0.01);
      }
      expect(angles.size).toBe(HALL_FACES + 1);
    });

    it("is left open at the door to Room I", () => {
      const inDoorway = ring().filter((corner) => corner.at.x > ROTUNDA.x && Math.abs(corner.at.z) <= DOOR.width / 2 + 1e-6);

      for (const corner of inDoorway) expect(corner.strength).toBe(0);
    });
  });

  describe("in the corners of the rooms", () => {
    const rooms = () => painted().filter((corner) => !inHall(corner));

    it("darkens the floor along both long walls and the wall above it", () => {
      for (const side of [-1, 1]) {
        const along = rooms().filter((corner) => Math.abs(corner.at.z - side * HALF_DEPTH) < 0.01 && corner.out === 0);

        expect(along.some(onFloor)).toBeTrue();
        expect(along.some((corner) => corner.at.y === WALL_HEIGHT)).toBeTrue();
        expect(Math.min(...along.map((corner) => corner.at.x))).toBeCloseTo(DOOR_XS[0] + WALL_THICKNESS / 2, 4);
        expect(Math.max(...along.map((corner) => corner.at.x))).toBeCloseTo(END_WALL_X - WALL_THICKNESS / 2, 4);
      }
    });

    it("stops the shade under the ceiling above every door's casing", () => {
      expect(WALL_HEIGHT - CORNERS.head.reach).toBeGreaterThan(CASING_TOP);
    });

    it("hangs nothing in a doorway", () => {
      const inDoorway = rooms().filter(
        (corner) =>
          corner.at.y > 0.01 &&
          corner.at.y < DOOR.height &&
          Math.abs(corner.at.z) < DOOR.width / 2 &&
          DOOR_XS.some((x) => Math.abs(corner.at.x - x) < WALL_THICKNESS),
      );

      expect(inDoorway).toEqual([]);
    });

    it("lets the floor's shade run out before a doorway, so nobody steps over a dark bar", () => {
      const onThreshold = rooms().filter(
        (corner) =>
          onFloor(corner) &&
          Math.abs(corner.at.z) < DOOR.width / 2 &&
          DOOR_XS.some((x) => Math.abs(corner.at.x - x) < WALL_THICKNESS / 2 + CORNERS.floor.reach + 1e-6),
      );
      const atJamb = rooms().filter(
        (corner) => onFloor(corner) && Math.abs(Math.abs(corner.at.z) - (DOOR.width / 2 + DOOR_CASING.width)) < 1e-4 && Math.abs(corner.at.x - DOOR_XS[1]) < 2,
      );

      expect(onThreshold).toEqual([]);
      expect(atJamb.length).toBeGreaterThan(0);
      for (const corner of atJamb) expect(corner.strength).toBe(0);
    });

    it("shades the end wall across its whole width", () => {
      const face = END_WALL_X - WALL_THICKNESS / 2;
      const end = rooms().filter((corner) => Math.abs(corner.at.x - face) < 0.01 && corner.out === 0 && corner.at.y === WALL_HEIGHT);

      expect(Math.min(...end.map((corner) => corner.at.z))).toBe(-HALF_DEPTH);
      expect(Math.max(...end.map((corner) => corner.at.z))).toBe(HALF_DEPTH);
    });
  });
});

describe("the building's floor", () => {
  it("is one stone under the hall and the rooms, and carries the painted shade once", () => {
    const palette = createPalette();
    const building = buildArchitecture(palette);
    const floors: Mesh[] = [];
    let shadings = 0;
    building.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh && mesh.material === palette.floor) floors.push(mesh);
      if (object.name === "shading") shadings += 1;
    });

    expect(palette.floor).toBeInstanceOf(StoneFloor);
    expect(floors.length).toBe(2);
    expect(shadings).toBe(1);
  });
});
