import { Color, Vector3 } from "three";
import { corners } from "./corners";
import { blend, onRound, ringSweep, scaled, Step, Stonework, Tone, tone, WallFace } from "./stonework";

const GREY: Tone = [0.5, 0.5, 0.5];
const DARK: Tone = [0.1, 0.1, 0.1];

describe("tone", () => {
  it("is a colour as the renderer works with it, not as it is written", () => {
    const { r, g, b } = new Color(0x646362);

    expect(tone(0x646362)).toEqual([r, g, b]);
    expect(tone(0xffffff)).toEqual([1, 1, 1]);
    expect(tone(0x808080)[0]).toBeLessThan(0.25);
  });

  it("can be dimmed, lifted and blended", () => {
    expect(scaled([0.2, 0.4, 0.6], 0.5)).toEqual([0.1, 0.2, 0.3]);
    expect(tone(0xffffff, 0.5)).toEqual([0.5, 0.5, 0.5]);
    expect(blend([0, 0, 0], [1, 0.5, 0], 0.5)).toEqual([0.5, 0.25, 0]);
    expect(blend(GREY, [0.25, 0.25, 0.25], 0)).toEqual(GREY);
    expect(blend(GREY, [0.25, 0.25, 0.25], 1)).toEqual([0.25, 0.25, 0.25]);
  });
});

describe("Stonework", () => {
  it("makes a face of two triangles, seen from the side its corners run anticlockwise on", () => {
    const stone = new Stonework();

    stone.quad([0, 0, 0], [2, 0, 0], [2, 1, 0], [0, 1, 0], GREY);
    const made = corners(stone.geometry());

    expect(stone.triangles).toBe(2);
    expect(made.length).toBe(6);
    for (const corner of made) expect(corner.normal).toEqual(new Vector3(0, 0, 1));
  });

  it("paints a face one tone, or each corner its own", () => {
    const stone = new Stonework();

    stone.quad([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [GREY, GREY, DARK, DARK]);
    const made = corners(stone.geometry());

    for (const corner of made) expect(corner.tone[0]).toBeCloseTo(corner.at.y === 0 ? 0.5 : 0.1, 6);
  });

  it("rounds a face that is given normals of its own", () => {
    const stone = new Stonework();
    const lean: [number, number, number] = [0.6, 0, 0.8];

    stone.quad([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], GREY, [lean, lean, lean, lean]);

    for (const corner of corners(stone.geometry())) expect(corner.normal).toEqual(new Vector3(0.6, 0, 0.8));
  });

  it("turns a ceiling to face down whichever way round its corners are given, and its tones with it", () => {
    for (const order of [[0, 1, 2, 3], [3, 2, 1, 0]]) {
      const stone = new Stonework();
      const square: [number, number, number][] = [[0, 3, 0], [1, 3, 0], [1, 3, 1], [0, 3, 1]];
      const tones: Tone[] = [GREY, DARK, DARK, GREY];
      const [a, b, c, d] = order.map((index) => square[index]);
      const [ta, tb, tc, td] = order.map((index) => tones[index]);

      stone.soffit(a, b, c, d, [ta, tb, tc, td]);

      for (const corner of corners(stone.geometry())) {
        expect(corner.normal).toEqual(new Vector3(0, -1, 0));
        expect(corner.tone[0]).toBeCloseTo(corner.at.x === 0 ? 0.5 : 0.1, 6);
      }
    }
  });
});

describe("WallFace", () => {
  /** A wall's face, the way it looks, and the way `run` goes for someone facing it: to their right. */
  const FACES: [out: [number, number], right: [number, number]][] = [
    [[0, 1], [1, 0]],
    [[0, -1], [-1, 0]],
    [[1, 0], [0, -1]],
    [[-1, 0], [0, 1]],
  ];

  it("measures along the wall to the right of whoever faces it, off it towards them, and up", () => {
    for (const [out, right] of FACES) {
      const face = new WallFace(new Stonework(), 10, 20, out);

      expect(face.at(0, 0, 0)).toEqual([10, 0, 20]);
      expect(face.at(3, 0, 0)).toEqual([10 + right[0] * 3, 0, 20 + right[1] * 3]);
      expect(face.at(0, 0.5, 2)).toEqual([10 + out[0] * 0.5, 2, 20 + out[1] * 0.5]);
    }
  });

  it("lays a flat piece that looks the way the wall does", () => {
    for (const [out] of FACES) {
      const stone = new Stonework();
      new WallFace(stone, 0, 0, out).rect(1, 2, 0, 3, 0.1, GREY);

      for (const corner of corners(stone.geometry())) expect(corner.normal).toEqual(new Vector3(out[0], 0, out[1]));
    }
  });

  it("runs a moulding whose underside looks down, whose front looks at the room and whose top looks up", () => {
    for (const [out] of FACES) {
      const stone = new Stonework();
      const ledge: Step[] = [[0, 1], [0.2, 1], [0.2, 1.1], [0, 1.1]];
      new WallFace(stone, 0, 0, out).sweep(0, 4, ledge, GREY);
      const made = corners(stone.geometry());
      const faces = [0, 6, 12].map((first) => made[first].normal);

      expect(stone.triangles).toBe(6);
      expect(faces[0]).toEqual(new Vector3(0, -1, 0));
      expect(faces[1]).toEqual(new Vector3(out[0], 0, out[1]));
      expect(faces[2]).toEqual(new Vector3(0, 1, 0));
    }
  });

  it("paints each piece of a moulding as it is told to, from its lower edge to its upper", () => {
    const stone = new Stonework();
    new WallFace(stone, 0, 0, [0, 1]).sweep(0, 1, [[0, 0], [0, 1], [0, 2]], ([, low]) => (low === 0 ? GREY : [DARK, GREY]));
    const made = corners(stone.geometry());

    for (const corner of made.slice(0, 6)) expect(corner.tone).toEqual(GREY);
    for (const corner of made.slice(6)) expect(corner.tone[0]).toBeCloseTo(corner.at.y === 1 ? 0.1 : 0.5, 6);
  });

  it("stands a block on the wall with five faces, each looking away from its middle", () => {
    for (const [out] of FACES) {
      const stone = new Stonework();
      const face = new WallFace(stone, 0, 0, out);
      face.block(1, 2, 0.5, 1.5, 0, 0.3, GREY);
      const middle = new Vector3(...face.at(1.5, 0.15, 1));
      const made = corners(stone.geometry());

      expect(stone.triangles).toBe(10);
      for (const corner of made) expect(corner.normal.dot(corner.at.clone().sub(middle))).toBeGreaterThan(0);
      expect(made.some((corner) => corner.normal.equals(new Vector3(-out[0], 0, -out[1])))).toBeFalse();
    }
  });

  it("sinks a panel behind the face round it, its upper slope in shade and its lower one catching the light", () => {
    const stone = new Stonework();
    new WallFace(stone, 0, 0, [0, 1]).panel(0, 2, 0, 1, 0.03, { depth: 0.02, slope: 0.05 }, GREY);
    const made = corners(stone.geometry());
    const field = made.filter((corner) => corner.normal.z === 1);
    const slopes = made.filter((corner) => corner.normal.z !== 1);

    expect(stone.triangles).toBe(10);
    for (const corner of field) expect(corner.at.z).toBeCloseTo(0.01, 6);
    expect(Math.min(...field.map((corner) => corner.at.x))).toBeCloseTo(0.05, 6);
    expect(Math.max(...field.map((corner) => corner.at.y))).toBeCloseTo(0.95, 6);
    for (const corner of field) expect(corner.tone[0]).toBeCloseTo(corner.at.y > 0.5 ? 0.31 : 0.5, 6);
    for (const corner of slopes) expect(corner.normal.z).toBeGreaterThan(0);
    expect(slopes.some((corner) => corner.normal.y < -0.3)).toBeTrue();
    expect(slopes.some((corner) => corner.normal.y > 0.3)).toBeTrue();
    expect(slopes.filter((corner) => corner.normal.y < -0.3).every((corner) => corner.at.y > 0.9)).toBeTrue();
  });
});

describe("ringSweep", () => {
  const round = { x: -2, radius: 5 };
  const turns = Array.from({ length: 9 }, (_, step) => (step / 8) * Math.PI);

  it("puts a turn of nothing at +Z and a quarter turn at +X, measured off the wall towards the middle", () => {
    expect(onRound(round, 0, 0, 1)).toEqual([-2, 1, 5]);
    expect(onRound(round, Math.PI / 2, 1, 0)[0]).toBeCloseTo(2, 6);
    expect(onRound(round, Math.PI / 2, 1, 0)[2]).toBeCloseTo(0, 6);
  });

  it("stands a wall round the inside, every face of it looking at the middle", () => {
    const stone = new Stonework();
    ringSweep(stone, round, turns, [[0, 0], [0, 3]], GREY);
    const made = corners(stone.geometry());

    expect(stone.triangles).toBe(16);
    for (const corner of made) {
      const inward = new Vector3(round.x - corner.at.x, 0, -corner.at.z).normalize();
      expect(Math.hypot(corner.at.x - round.x, corner.at.z)).toBeCloseTo(5, 4);
      expect(corner.normal.dot(inward)).toBeCloseTo(1, 4);
    }
  });

  it("is seen from inside: its faces run anticlockwise for someone standing in the middle", () => {
    const stone = new Stonework();
    ringSweep(stone, round, turns, [[0, 0], [0, 3]], GREY);
    const [a, b, c] = corners(stone.geometry());
    const wound = b.at.clone().sub(a.at).cross(c.at.clone().sub(a.at));

    expect(wound.dot(new Vector3(round.x - a.at.x, 0, -a.at.z))).toBeGreaterThan(0);
  });

  it("rounds from face to face but keeps the outline's own corners sharp", () => {
    const stone = new Stonework();
    ringSweep(stone, round, turns, [[0, 2], [0.5, 2], [0.5, 2.4]], GREY);
    const made = corners(stone.geometry());
    const under = made.filter((corner) => corner.at.y === 2 && corner.normal.y !== 0);
    const front = made.filter((corner) => corner.normal.y === 0);

    for (const corner of under) expect(corner.normal).toEqual(new Vector3(0, -1, 0));
    expect(new Set(front.map((corner) => corner.normal.x.toFixed(3))).size).toBeGreaterThan(4);
  });

  it("shades a piece from the tone of its lower edge to that of its upper", () => {
    const stone = new Stonework();
    ringSweep(stone, round, turns, [[0, 0], [0, 3]], () => [DARK, GREY]);

    for (const corner of corners(stone.geometry())) expect(corner.tone[0]).toBeCloseTo(corner.at.y === 0 ? 0.1 : 0.5, 6);
  });
});
