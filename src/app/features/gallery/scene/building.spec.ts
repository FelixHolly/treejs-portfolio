import { BufferGeometry, Intersection, Mesh, Raycaster, Vector3 } from "three";
import { Corner, corners, luminance } from "./corners";
import { buildArchitecture, createPalette, Palette } from "./building";
import { STONE } from "./fabric";
import {
  CORNICE,
  DADO,
  dadoHeight,
  DOME,
  DOOR,
  DOOR_XS,
  END_WALL_X,
  END_WINDOW,
  EYE,
  HALF_DEPTH,
  HANG_Z,
  ROTUNDA,
  roomSpans,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from "./layout";

type Part = Mesh<BufferGeometry>;

const EAST = new Vector3(1, 0, 0);
const UP = new Vector3(0, 1, 0);

/** The first thing of `parts` a line of sight meets, seen only from the side it faces. */
function seen(parts: Part[], from: Vector3, towards: Vector3): Intersection | undefined {
  return new Raycaster(from, towards.clone().normalize()).intersectObjects(parts)[0];
}

describe("buildArchitecture", () => {
  let palette: Palette;
  let masonry: Part[];
  let plaster: Part[];
  let gilt: Part;
  let stone: Corner[];
  let painted: Corner[];
  let meshes: number;

  beforeAll(() => {
    palette = createPalette();
    const building = buildArchitecture(palette);
    const named = (name: string) => building.getObjectByName(name) as Part;
    masonry = [named("hall-masonry"), named("rooms-masonry")];
    plaster = [named("hall-plaster"), named("rooms-plaster")];
    gilt = named("gilt");
    stone = masonry.flatMap((part) => corners(part.geometry));
    painted = plaster.flatMap((part) => corners(part.geometry));
    meshes = 0;
    building.traverse((object) => {
      if ((object as Mesh).isMesh) meshes += 1;
    });
  });

  it("draws all that stands still as five meshes, in lit stone, painted plaster and gold", () => {
    for (const part of masonry) expect(part.material).toBe(palette.masonry);
    for (const part of plaster) expect(part.material).toBe(palette.plaster);
    expect(gilt.material).toBe(palette.gold);
  });

  it("is fewer meshes in all than the walls alone used to be", () => {
    expect(meshes).toBeLessThan(18);
  });

  it("keeps the hall apart from the rooms, so that whichever is out of sight is not drawn", () => {
    const [hallStone, roomStone] = masonry;
    const [hallPlaster, roomPlaster] = plaster;
    for (const part of [...masonry, ...plaster]) part.geometry.computeBoundingBox();

    for (const hall of [hallStone, hallPlaster]) expect(hall.geometry.boundingBox?.max.x).toBeLessThanOrEqual(ROTUNDA.x + ROTUNDA.radius + 1e-4);
    for (const rooms of [roomStone, roomPlaster]) expect(rooms.geometry.boundingBox?.min.x).toBeGreaterThanOrEqual(ROTUNDA.x + ROTUNDA.radius - 1e-4);
  });

  it("stays within a few thousand triangles for the whole building", () => {
    const count = (part: Part) => part.geometry.getAttribute("position").count / 3;

    const all = [...masonry, ...plaster, gilt].reduce((sum, part) => sum + count(part), 0);

    expect(all).toBeGreaterThan(3000);
    expect(all).toBeLessThan(8000);
  });

  it("colours its stone and plaster face by face, which their materials are told to use", () => {
    expect(palette.masonry.vertexColors).toBeTrue();
    expect(palette.plaster.vertexColors).toBeTrue();
    for (const part of [...masonry, ...plaster]) expect(part.geometry.getAttribute("color").count).toBe(part.geometry.getAttribute("position").count);
  });

  describe("the rooms", () => {
    it("closes each room with a wall on either long side, seen from inside it", () => {
      for (const span of roomSpans()) {
        const middle = new Vector3((span.from + span.to) / 2, 2.5, 0);

        for (const side of [-1, 1]) {
          const wall = seen(masonry, middle, new Vector3(0, 0, side));
          expect(wall?.point.z).withContext(`room from ${span.from}`).toBeCloseTo(side * HALF_DEPTH, 4);
        }
      }
    });

    it("leaves every doorway open on the enfilade's axis, all the way to the glass of the last wall", () => {
      const from = new Vector3(ROTUNDA.x + 2, EYE, 0);

      expect(seen(masonry, from, EAST)).toBeUndefined();
      expect(seen(plaster, from, EAST)?.point.x).toBeGreaterThan(END_WALL_X - WALL_THICKNESS / 2);
    });

    it("stands the walls between the rooms beside every doorway and over it", () => {
      const beside = seen(masonry, new Vector3(ROTUNDA.x + 2, EYE, DOOR.width / 2 + 0.6), EAST);
      const over = seen(masonry, new Vector3(DOOR_XS[0] + 1, DOOR.height + 0.8, 0), EAST);

      expect(beside?.point.x).toBeLessThan(DOOR_XS[0]);
      expect(over?.point.x).toBeGreaterThan(DOOR_XS[1] - WALL_THICKNESS);
      expect(over?.point.x).toBeLessThan(DOOR_XS[1]);
    });

    it("builds nothing into a doorway that a visitor would walk into", () => {
      const inWay = stone.filter(
        ({ at }) => at.y < DOOR.height - 0.001 && Math.abs(at.z) < DOOR.width / 2 - 0.001 && DOOR_XS.some((x) => Math.abs(at.x - x) < WALL_THICKNESS / 2 + 0.3),
      );

      expect(inWay).toEqual([]);
    });

    it("keeps the hanging wall plain between its panelled base and its cornice, so the pictures stay the focus", () => {
      for (const span of roomSpans()) {
        const [foot, head] = [dadoHeight(span), WALL_HEIGHT - CORNICE.drop];
        const builtOn = stone.filter(
          ({ at }) => at.x > span.from + 0.5 && at.x < span.to - 0.5 && at.z < HANG_Z + 0.4 && at.y > foot + 0.001 && at.y < head - 0.001,
        );

        expect(builtOn).withContext(`room from ${span.from}`).toEqual([]);
        for (const y of [foot + 0.05, EYE, 3, head - 0.05]) {
          for (const share of [0.1, 0.35, 0.6, 0.9]) {
            const wall = seen(masonry, new Vector3(span.from + (span.to - span.from) * share, y, 0), new Vector3(0, 0, -1));
            expect(wall?.point.z).withContext(`room from ${span.from} at ${y}`).toBeCloseTo(HANG_Z, 5);
          }
        }
      }
    });

    it("panels the foot of every wall, taller in Room III than in the others", () => {
      const spans = roomSpans();
      const panelled = spans.find((span) => span.feature === "panelled");
      const offWall = (from: number, to: number) =>
        stone.filter(({ at }) => at.x > from - 0.01 && at.x < to + 0.01 && at.z > HANG_Z + 0.001 && at.z < HANG_Z + 0.08 && at.y < 2);

      for (const span of spans) {
        const top = Math.max(...offWall(span.from, span.to).map(({ at }) => at.y));
        expect(top).withContext(`room from ${span.from}`).toBeLessThanOrEqual(dadoHeight(span));
        expect(top).withContext(`room from ${span.from}`).toBeGreaterThan(dadoHeight(span) - 0.12);
      }
      expect(panelled && dadoHeight(panelled)).toBe(DADO.tall);
      expect(DADO.tall).toBeGreaterThan(DADO.height * 1.8);
    });

    it("runs a cornice under every ceiling that reaches out into the room", () => {
      for (const span of roomSpans()) {
        const middle = (span.from + span.to) / 2;
        const lip = seen(masonry, new Vector3(middle, WALL_HEIGHT - 0.03, 0), new Vector3(0, 0, -1));

        expect(lip?.point.z).withContext(`room from ${span.from}`).toBeCloseTo(HANG_Z + CORNICE.reach, 4);
      }
    });

    it("gives each room walls of its own graphite, a shade apart from its neighbours'", () => {
      const tones = roomSpans().map((span) => {
        const wall = seen(masonry, new Vector3((span.from + span.to) / 2, 2.5, 0), new Vector3(0, 0, -1));
        const face = wall?.face;
        const color = (wall?.object as Part).geometry.getAttribute("color");
        return face ? [color.getX(face.a), color.getY(face.a), color.getZ(face.a)] : [];
      });

      expect(new Set(tones.map((tone) => tone.map((part) => part.toFixed(4)).join())).size).toBe(4);
      for (const tone of tones) {
        for (let part = 0; part < 3; part++) expect(Math.abs(tone[part] - STONE.wall[part])).toBeLessThan(0.02);
      }
    });

    it("ends the enfilade in a window: pale glass over a stone apron, in the last room only", () => {
      const glass = painted.filter(({ at, normal }) => at.x > END_WALL_X - WALL_THICKNESS && normal.x === -1);
      const elsewhere = painted.filter(({ at, normal }) => at.x > ROTUNDA.x + ROTUNDA.radius + 1 && at.x < END_WALL_X - 1 && normal.y === 0 && at.y < WALL_HEIGHT - 1);
      const apron = seen(masonry, new Vector3(END_WALL_X - 3, 0.5, 0), EAST);

      expect(glass.length).toBeGreaterThan(0);
      expect(Math.min(...glass.map(({ at }) => at.y))).toBe(END_WINDOW.sill);
      expect(Math.max(...glass.map(({ at }) => at.y))).toBe(DOOR.height);
      expect(Math.max(...glass.map(({ at }) => Math.abs(at.z)))).toBeCloseTo(END_WINDOW.width / 2, 6);
      expect(Math.max(...glass.map(({ tone }) => luminance(tone)))).toBeGreaterThan(luminance(STONE.bar) * 10);
      expect(elsewhere).toEqual([]);
      expect(apron?.point.x).toBeLessThan(END_WALL_X - WALL_THICKNESS / 2 + 0.05);
      expect(apron?.point.x).toBeGreaterThan(END_WALL_X - WALL_THICKNESS / 2 - 0.05);
    });
  });

  describe("the hall", () => {
    const inHall = (corner: Corner) => corner.at.x < ROTUNDA.x + ROTUNDA.radius - 0.01 || Math.hypot(corner.at.x - ROTUNDA.x, corner.at.z) < ROTUNDA.radius - 1;
    const fromAxis = (at: Vector3) => Math.hypot(at.x - ROTUNDA.x, at.z);

    it("stands a round wall about the statue, seen from inside it", () => {
      for (const turn of [0.4, 1.9, 3.1, 4.4, 5.6]) {
        const wall = seen(masonry, new Vector3(ROTUNDA.x, 5, 0), new Vector3(Math.sin(turn), 0, Math.cos(turn)));

        expect(wall && fromAxis(wall.point)).withContext(`turn ${turn}`).toBeGreaterThan(ROTUNDA.radius - 0.03);
        expect(wall && fromAxis(wall.point)).withContext(`turn ${turn}`).toBeLessThanOrEqual(ROTUNDA.radius);
      }
    });

    it("springs a dome from a ring cornice above everything the statue's lights reach", () => {
      const dome = painted.filter(inHall);
      const lip = seen(masonry, new Vector3(ROTUNDA.x, DOME.springing, 0), new Vector3(0, 0, 1));

      expect(DOME.springing).toBeGreaterThan(ROTUNDA.plinthHeight + ROTUNDA.lionHeight + 5);
      expect(Math.min(...dome.map(({ at }) => at.y))).toBeCloseTo(DOME.springing + 0.1, 4);
      for (const { at } of dome) expect(fromAxis(at)).toBeLessThanOrEqual(ROTUNDA.radius + 1e-4);
      expect(lip && ROTUNDA.radius - fromAxis(lip.point)).toBeGreaterThan(0.4);
    });

    it("opens the dome over the statue: from its plinth the way up is clear to the sky", () => {
      const overStatue = seen(plaster, new Vector3(ROTUNDA.x, ROTUNDA.plinthHeight, 0), UP);
      const beside = seen(plaster, new Vector3(ROTUNDA.x + DOME.oculus + 1.5, ROTUNDA.plinthHeight, 0), UP);

      expect(overStatue?.point.y).toBeGreaterThan(ROTUNDA.height + 0.5);
      expect(beside?.point.y).toBeLessThan(ROTUNDA.height);
      expect(beside?.point.y).toBeGreaterThan(DOME.springing);
      expect(DOME.oculus).toBeLessThan(ROTUNDA.radius / 3);
    });

    it("shows a paler sky through the opening than anything it paints on the dome", () => {
      const dome = painted.filter((corner) => inHall(corner) && corner.at.y < ROTUNDA.height - 0.01);
      const sky = painted.filter((corner) => inHall(corner) && corner.at.y > ROTUNDA.height + 0.5);

      expect(Math.min(...sky.map(({ tone }) => luminance(tone)))).toBeGreaterThan(Math.max(...dome.map(({ tone }) => luminance(tone))) * 3);
    });

    it("paints the dome palest at the rim of its opening, where the sky's light catches it", () => {
      const onDome = painted.filter((corner) => inHall(corner) && corner.normal.y < -0.05 && corner.at.y <= ROTUNDA.height + 1e-4);
      const rim = onDome.filter(({ at }) => at.y > ROTUNDA.height - 1e-4);
      const below = onDome.filter(({ at }) => at.y < ROTUNDA.height - 1e-4);

      expect(rim.length).toBeGreaterThan(0);
      for (const { at } of rim) expect(fromAxis(at)).toBeCloseTo(DOME.oculus, 4);
      expect(Math.min(...rim.map(({ tone }) => luminance(tone)))).toBeGreaterThan(Math.max(...below.map(({ tone }) => luminance(tone))));
    });

    it("keeps dome and cornice dark, for the page sets its name over them", () => {
      // About #242424: the shaft's light comes on top of it, and the eyebrow over both has to stay at 4.5 to 1
      const limit = 0.0185;
      const dome = painted.filter((corner) => inHall(corner) && corner.at.y < ROTUNDA.height - 0.01);
      const high = stone.filter((corner) => inHall(corner) && corner.at.y > DOME.springing - 1);

      for (const { tone } of dome) expect(luminance(tone)).toBeLessThan(limit);
      for (const { tone, normal } of high) {
        if (normal.y >= 0) expect(luminance(tone)).toBeLessThan(luminance(STONE.wall) * 0.6);
      }
    });

    it("lets the flat portal to Room I stand clear of the curve at both its jambs", () => {
      const jamb = seen(masonry, new Vector3(ROTUNDA.x, 1.5, DOOR.width / 2 + 0.1), EAST);
      const wallThere = ROTUNDA.x + Math.sqrt(ROTUNDA.radius ** 2 - (DOOR.width / 2 + 0.1) ** 2);

      expect(jamb?.point.x).toBeLessThan(wallThere - 0.03);
      expect(jamb?.face?.normal.x).toBeCloseTo(-1, 6);
    });
  });

  describe("the gilding", () => {
    it("runs a gold line under the cornice of both long walls, from one end of every room to the other", () => {
      const lines = corners(gilt.geometry).filter(({ at }) => at.y > DOOR.height + 1);

      for (const span of roomSpans()) {
        for (const side of [-1, 1]) {
          const line = lines.filter(({ at }) => Math.sign(at.z) === side && at.x > span.from - 0.01 && at.x < span.to + 0.01);
          expect(Math.min(...line.map(({ at }) => at.x))).toBeCloseTo(span.from, 4);
          expect(Math.max(...line.map(({ at }) => at.x))).toBeCloseTo(span.to, 4);
          for (const { at } of line) expect(at.y).toBeLessThan(WALL_HEIGHT - CORNICE.drop);
        }
      }
    });

    it("lines every door, on both its faces, close beside the opening", () => {
      const fillets = corners(gilt.geometry).filter(({ at }) => at.y < DOOR.height + 0.1);

      for (const x of DOOR_XS) {
        for (const face of [-1, 1]) {
          const here = fillets.filter(({ at }) => Math.sign(at.x - x) === face && Math.abs(at.x - x) < 0.6);
          expect(here.length).withContext(`door at ${x}, face ${face}`).toBeGreaterThan(0);
          for (const { at } of here) {
            const beside = Math.abs(at.z) - DOOR.width / 2;
            const over = at.y - DOOR.height;
            expect(Math.max(beside, over)).toBeGreaterThan(0);
            expect(Math.max(beside, over)).toBeLessThan(0.05);
          }
        }
      }
    });
  });
});
