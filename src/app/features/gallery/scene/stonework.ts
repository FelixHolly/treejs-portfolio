import { BufferGeometry, Color, Float32BufferAttribute } from "three";

export type Point = readonly [x: number, y: number, z: number];
/** A colour as the renderer works with it: linear red, green and blue. */
export type Tone = readonly [r: number, g: number, b: number];
export type Tones = Tone | readonly [Tone, Tone, Tone, Tone];
/** A corner of a moulding's outline: how far it stands off the wall, and how high. */
export type Step = readonly [off: number, y: number];
export type Place = readonly [run: number, off: number, y: number];
/** What a moulding is painted with: one tone, or for each piece of its outline a tone or one for either edge. */
export type Paint = Tone | ((low: Step, high: Step) => Tone | readonly [low: Tone, high: Tone]);

export function tone(hex: number, scale = 1): Tone {
  const { r, g, b } = new Color(hex);
  return [r * scale, g * scale, b * scale];
}

export function scaled([r, g, b]: Tone, scale: number): Tone {
  return [r * scale, g * scale, b * scale];
}

export function blend(from: Tone, to: Tone, share: number): Tone {
  return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share, from[2] + (to[2] - from[2]) * share];
}

function isTone(tones: Tone | readonly Tone[]): tones is Tone {
  return typeof tones[0] === "number";
}

/** For a cornice: what faces down and out has only the floor's own light on it, and unlifted would be one black band. */
export function lifted(base: Tone, lift: number): Paint {
  return ([lowOff, lowY], [highOff, highY]) => scaled(base, highOff > lowOff && highY > lowY ? lift : 1);
}

function edgeTones(paint: Paint, low: Step, high: Step): readonly [low: Tone, high: Tone] {
  const tones = typeof paint === "function" ? paint(low, high) : paint;
  return isTone(tones) ? [tones, tones] : tones;
}

const TWO_TRIANGLES = [0, 1, 2, 0, 2, 3] as const;

function facing(a: Point, b: Point, c: Point): Point {
  const [ux, uy, uz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const [vx, vy, vz] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const normal: Point = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const length = Math.hypot(...normal) || 1;
  return [normal[0] / length, normal[1] / length, normal[2] / length];
}

/**
 * Collects the building's fixed surfaces as coloured faces, to be drawn as one mesh however many there are.
 * A face is seen from the side its corners run anticlockwise on.
 */
export class Stonework {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];

  /** `normals` rounds a face that is one flat piece of a curve; without them it is lit as the flat piece it is. */
  quad(a: Point, b: Point, c: Point, d: Point, tones: Tones, normals?: readonly [Point, Point, Point, Point]): void {
    const corners = [a, b, c, d];
    const flat = facing(a, b, d);
    for (const index of TWO_TRIANGLES) {
      const corner = corners[index];
      const normal = normals ? normals[index] : flat;
      const tone = isTone(tones) ? tones : tones[index];
      this.positions.push(corner[0], corner[1], corner[2]);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.colors.push(tone[0], tone[1], tone[2]);
    }
  }

  /** A level face seen from below, such as a ceiling: its corners in any order round it. */
  soffit(a: Point, b: Point, c: Point, d: Point, tones: Tones): void {
    if (facing(a, b, d)[1] < 0) this.quad(a, b, c, d, tones);
    else this.quad(a, d, c, b, isTone(tones) ? tones : [tones[0], tones[3], tones[2], tones[1]]);
  }

  get triangles(): number {
    return this.positions.length / 9;
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(this.colors, 3));
    return geometry;
  }
}

/** A sunk panel: how far its field lies behind the face round it, and how wide the slope down to it is. */
export interface Sinking {
  depth: number;
  slope: number;
}

/** One upright face of a wall. `run` is measured from its left end as seen by someone facing it, `off` towards them. */
export class WallFace {
  private readonly along: readonly [x: number, z: number];

  /** `x` and `z` are the face's left end at the floor; `out` is the way it faces, one step along x or z. */
  constructor(
    private readonly stone: Stonework,
    private readonly x: number,
    private readonly z: number,
    private readonly out: readonly [x: number, z: number],
  ) {
    this.along = [out[1], -out[0]];
  }

  at(run: number, off: number, y: number): Point {
    return [this.x + this.along[0] * run + this.out[0] * off, y, this.z + this.along[1] * run + this.out[1] * off];
  }

  /** A flat piece parallel to the wall; its corner tones run from bottom left round to top left. */
  rect(from: number, to: number, bottom: number, top: number, off: number, tones: Tones): void {
    this.stone.quad(this.at(from, off, bottom), this.at(to, off, bottom), this.at(to, off, top), this.at(from, off, top), tones);
  }

  /** Any flat four-cornered piece, its corners anticlockwise as seen from the side it faces. */
  quad(a: Place, b: Place, c: Place, d: Place, tones: Tones): void {
    this.stone.quad(this.at(...a), this.at(...b), this.at(...c), this.at(...d), tones);
  }

  /**
   * A moulding of one outline run along the wall. The outline is traced from its foot outwards, up and back to
   * the wall, so every piece of it faces the room.
   */
  sweep(from: number, to: number, outline: readonly Step[], paint: Paint): void {
    for (let step = 0; step < outline.length - 1; step++) {
      const [low, high] = [outline[step], outline[step + 1]];
      const [lowTone, highTone] = edgeTones(paint, low, high);
      this.stone.quad(this.at(from, ...low), this.at(to, ...low), this.at(to, ...high), this.at(from, ...high), [
        lowTone,
        lowTone,
        highTone,
        highTone,
      ]);
    }
  }

  /** A block standing from `off` to `proud` of the wall. It has no back: that side is never seen. */
  block(from: number, to: number, bottom: number, top: number, off: number, proud: number, tint: Tone): void {
    this.rect(from, to, bottom, top, proud, tint);
    this.sweep(from, to, [[off, bottom], [proud, bottom]], tint);
    this.sweep(from, to, [[proud, top], [off, top]], tint);
    this.stone.quad(this.at(from, off, bottom), this.at(from, proud, bottom), this.at(from, proud, top), this.at(from, off, top), tint);
    this.stone.quad(this.at(to, proud, bottom), this.at(to, off, bottom), this.at(to, off, top), this.at(to, proud, top), tint);
  }

  /** A panel sunk into a face standing `off` the wall. Its field is painted darker towards the top, where the slope over it shades it. */
  panel(from: number, to: number, bottom: number, top: number, off: number, { depth, slope }: Sinking, tint: Tone): void {
    const [left, right, low, high, back] = [from + slope, to - slope, bottom + slope, top - slope, off - depth];
    const side = scaled(tint, 0.8);
    const shade = scaled(tint, 0.62);
    this.stone.quad(this.at(from, off, top), this.at(left, back, high), this.at(right, back, high), this.at(to, off, top), tint);
    this.stone.quad(this.at(from, off, bottom), this.at(to, off, bottom), this.at(right, back, low), this.at(left, back, low), tint);
    this.stone.quad(this.at(from, off, bottom), this.at(left, back, low), this.at(left, back, high), this.at(from, off, top), side);
    this.stone.quad(this.at(to, off, bottom), this.at(to, off, top), this.at(right, back, high), this.at(right, back, low), side);
    this.rect(left, right, low, high, back, [tint, tint, shade, shade]);
  }
}

/** A round wall seen from inside: where its middle stands along the building, and its radius. */
export interface Round {
  x: number;
  radius: number;
}

/** A place on a round wall: `turn` round its middle from +Z towards +X, `off` the wall towards the middle, and how high. */
export function onRound(round: Round, turn: number, off: number, y: number): Point {
  return [round.x + Math.sin(turn) * (round.radius - off), y, Math.cos(turn) * (round.radius - off)];
}

/**
 * A moulding of one outline run round the inside of a round wall, through the `turns` given. It is rounded from
 * one flat face to the next, so the faces do not show; the outline's own corners stay sharp.
 */
export function ringSweep(stone: Stonework, round: Round, turns: readonly number[], outline: readonly Step[], paint: Paint): void {
  for (let step = 0; step < outline.length - 1; step++) {
    const [low, high] = [outline[step], outline[step + 1]];
    const [lowTone, highTone] = edgeTones(paint, low, high);
    const [inwards, upwards] = [high[1] - low[1], low[0] - high[0]];
    const length = Math.hypot(inwards, upwards) || 1;
    const normal = (turn: number): Point => [(-Math.sin(turn) * inwards) / length, upwards / length, (-Math.cos(turn) * inwards) / length];

    for (let face = 0; face < turns.length - 1; face++) {
      const [left, right] = [turns[face + 1], turns[face]];
      stone.quad(
        onRound(round, left, ...low),
        onRound(round, right, ...low),
        onRound(round, right, ...high),
        onRound(round, left, ...high),
        [lowTone, lowTone, highTone, highTone],
        [normal(left), normal(right), normal(right), normal(left)],
      );
    }
  }
}
