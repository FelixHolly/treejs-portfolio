import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, ShaderMaterial, UniformsLib, UniformsUtils } from "three";
import {
  BENCH,
  DOOR,
  DOOR_XS,
  END_WALL_X,
  HALF_DEPTH,
  LECTERN,
  PEDESTAL_RADIUS,
  ROTUNDA,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from "./layout";

const VERTEX = /* glsl */ `
  #include <fog_pars_vertex>
  attribute vec2 shade;
  varying vec2 vShade;
  void main() {
    vShade = shade;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

// Black laid over what is there, which darkens it the way a shadow does. It thins out with the fog, or far
// off it would darken the fog itself. The falloff is worked out per pixel, as the painted light's is.
const FRAGMENT = /* glsl */ `
  #include <fog_pars_fragment>
  varying vec2 vShade;
  void main() {
    float near = 1.0 - clamp(vShade.y, 0.0, 1.0);
    float dark = vShade.x * near * near;
    #ifdef USE_FOG
      dark *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor = vec4(0.0, 0.0, 0.0, dark);
  }
`;

type Point = readonly [x: number, y: number, z: number];

/** Heights above the floor at which painted shade lies, under the hall's inlay and the furniture's own shadows. */
const ON_FLOOR = { corners: 0.002, contact: 0.003 } as const;
/** How far a painted shade stands off a wall. */
const OFF_WALL = 0.004;

/** A soft shadow on the floor around something standing on it: full at its `foot`, gone `spread` beyond it. */
export interface GroundShadow {
  x: number;
  z: number;
  /** Half the width and depth of what stands there; a round foot has `radius` instead. */
  foot: { halfWidth: number; halfDepth: number } | { radius: number };
  /** How far past the foot the shadow spreads. */
  spread: number;
  strength: number;
}

/**
 * What the building itself grounds: the statue's drum, the lectern's foot and the bench. The lectern's and the
 * desk's wide, faint shadows are the furniture's own; this adds the dark close under the lectern's foot.
 */
export function groundShadows(): GroundShadow[] {
  return [
    { x: ROTUNDA.x, z: 0, foot: { radius: PEDESTAL_RADIUS + 0.2 }, spread: 1.35, strength: 0.62 },
    { x: LECTERN.x, z: LECTERN.z, foot: { radius: 0.27 }, spread: 0.3, strength: 0.5 },
    { x: BENCH.x, z: BENCH.z, foot: { halfWidth: 1.2, halfDepth: 0.3 }, spread: 0.4, strength: 0.5 },
  ];
}

/** Where the walls meet the floor and the ceiling: how far the shade reaches from the corner, and how dark it is in it. */
export const CORNERS = {
  floor: { reach: 1.15, strength: 0.42 },
  foot: { reach: 0.95, strength: 0.34 },
  head: { reach: 1.5, strength: 0.5 },
} as const;

/** Collects flat patches of shade; each corner carries how dark the patch is there and how far out from its dark edge. */
class Shade {
  private readonly positions: number[] = [];
  private readonly shades: number[] = [];

  /** A four-cornered patch: `a` to `b` is its dark edge, `d` and `c` lie out from them where it has gone. */
  quad(a: Point, b: Point, c: Point, d: Point, strengthA: number, strengthB = strengthA): void {
    this.corner(a, strengthA, 0);
    this.corner(b, strengthB, 0);
    this.corner(c, strengthB, 1);
    this.corner(a, strengthA, 0);
    this.corner(c, strengthB, 1);
    this.corner(d, strengthA, 1);
  }

  /** A patch of even darkness, for under a thing's foot. */
  fill(a: Point, b: Point, c: Point, strength: number): void {
    for (const point of [a, b, c]) this.corner(point, strength, 0);
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("shade", new Float32BufferAttribute(this.shades, 2));
    return geometry;
  }

  private corner(point: Point, strength: number, out: number): void {
    this.positions.push(...point);
    this.shades.push(strength, out);
  }
}

const ROUND_STEPS = 48;

function around(shade: Shade, shadow: GroundShadow): void {
  const { x, z, foot, spread, strength } = shadow;
  const on = (dx: number, dz: number): Point => [x + dx, ON_FLOOR.contact, z + dz];

  if ("radius" in foot) {
    const at = (angle: number, radius: number) => on(Math.cos(angle) * radius, Math.sin(angle) * radius);
    for (let step = 0; step < ROUND_STEPS; step++) {
      const [from, to] = [step, step + 1].map((each) => (each / ROUND_STEPS) * Math.PI * 2);
      shade.quad(at(from, foot.radius), at(to, foot.radius), at(to, foot.radius + spread), at(from, foot.radius + spread), strength);
    }
    return;
  }

  const { halfWidth: w, halfDepth: d } = foot;
  shade.fill(on(w, d), on(-w, -d), on(-w, d), strength);
  shade.fill(on(w, d), on(w, -d), on(-w, -d), strength);
  for (const side of [-1, 1]) {
    shade.quad(on(-w, side * d), on(w, side * d), on(w, side * (d + spread)), on(-w, side * (d + spread)), strength);
    shade.quad(on(side * w, -d), on(side * w, d), on(side * (w + spread), d), on(side * (w + spread), -d), strength);
  }
  // A quarter turn round each corner, fanned out from the corner itself
  const steps = ROUND_STEPS / 4;
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const rim = (step: number) => {
      const angle = (step / steps) * (Math.PI / 2);
      return on(sx * (w + Math.cos(angle) * spread), sz * (d + Math.sin(angle) * spread));
    };
    for (let step = 0; step < steps; step++) {
      shade.quad(on(sx * w, sz * d), on(sx * w, sz * d), rim(step + 1), rim(step), strength);
    }
  }
}

/** The hall's wall is built of this many flat faces, from one jamb of the door to Room I round to the other. */
export const HALL_FACES = 72;

/** The hall is round: its corner with the floor is a ring, left open where the door to Room I stands. */
function hallCorners(shade: Shade): void {
  const { x, radius } = ROTUNDA;
  const door = Math.asin(DOOR.width / 2 / radius);
  const sweep = Math.PI * 2 - door * 2;
  // Face for face with the wall: a rounder ring would dip behind the wall's flat faces and show through in stripes
  const angle = (face: number) => Math.PI / 2 + door + (face / HALL_FACES) * sweep;
  // Gone at the door's jamb, and back in full a door's width further round
  const beside = (face: number) => Math.min((Math.min(face, HALL_FACES - face) / HALL_FACES) * sweep / (door * 2), 1);
  const at = (face: number, r: number, y: number): Point => [x + Math.sin(angle(face)) * r, y, Math.cos(angle(face)) * r];
  const { floor, foot } = CORNERS;
  const wall = radius - OFF_WALL;

  for (let face = 0; face < HALL_FACES; face++) {
    const next = face + 1;
    shade.quad(
      at(face, radius, ON_FLOOR.corners),
      at(next, radius, ON_FLOOR.corners),
      at(next, radius - floor.reach, ON_FLOOR.corners),
      at(face, radius - floor.reach, ON_FLOOR.corners),
      floor.strength * beside(face),
      floor.strength * beside(next),
    );
    shade.quad(
      at(face, wall, 0),
      at(next, wall, 0),
      at(next, wall, foot.reach),
      at(face, wall, foot.reach),
      foot.strength * beside(face),
      foot.strength * beside(next),
    );
  }
}

type Corner = keyof typeof CORNERS;

/**
 * One corner of a straight wall that runs `along` an axis at `wallAt` and faces `faces` (+1 or -1) across it, between
 * `from` and `to`. `fromShare` and `toShare` thin the shade out towards an end, where a door stands.
 */
function wallCorner(
  shade: Shade,
  corner: Corner,
  along: "x" | "z",
  wallAt: number,
  faces: number,
  [from, to]: readonly [number, number],
  [fromShare, toShare]: readonly [number, number] = [1, 1],
): void {
  const { reach, strength } = CORNERS[corner];
  const point = (run: number, y: number, off: number): Point =>
    along === "x" ? [run, y, wallAt + faces * off] : [wallAt + faces * off, y, run];
  const [dark, gone] =
    corner === "floor"
      ? [(run: number) => point(run, ON_FLOOR.corners, 0), (run: number) => point(run, ON_FLOOR.corners, reach)]
      : corner === "foot"
        ? [(run: number) => point(run, 0, OFF_WALL), (run: number) => point(run, reach, OFF_WALL)]
        : [(run: number) => point(run, WALL_HEIGHT, OFF_WALL), (run: number) => point(run, WALL_HEIGHT - reach, OFF_WALL)];

  shade.quad(dark(from), dark(to), gone(to), gone(from), strength * fromShare, strength * toShare);
}

/** Half the opening a door leaves in a wall's foot, its casing included, and where the floor's shade beside it is back in full. */
const BESIDE_DOOR = { jamb: DOOR.width / 2 + 0.12, full: DOOR.width / 2 + 1.1 } as const;

function roomCorners(shade: Shade): void {
  const first = DOOR_XS[0] + WALL_THICKNESS / 2;
  const last = END_WALL_X - WALL_THICKNESS / 2;
  const across = [-HALF_DEPTH, HALF_DEPTH] as const;

  for (const side of [-1, 1]) {
    for (const corner of ["floor", "foot", "head"] as const) {
      wallCorner(shade, corner, "x", side * HALF_DEPTH, -side, [first, last]);
    }
  }
  for (const corner of ["floor", "foot", "head"] as const) wallCorner(shade, corner, "z", last, -1, across);

  const { jamb, full } = BESIDE_DOOR;
  DOOR_XS.forEach((x, index) => {
    for (const faces of [-1, 1]) {
      // The first door's other face is the hall's, which is round and shaded as a ring
      if (index === 0 && faces < 0) continue;
      const face = x + (faces * WALL_THICKNESS) / 2;
      wallCorner(shade, "head", "z", face, faces, across);
      for (const side of [-1, 1]) {
        wallCorner(shade, "foot", "z", face, faces, [side * jamb, side * HALF_DEPTH]);
        wallCorner(shade, "floor", "z", face, faces, [side * full, side * HALF_DEPTH]);
        wallCorner(shade, "floor", "z", face, faces, [side * jamb, side * full], [0, 1]);
      }
    }
  });
}

/** Every painted shadow the building has, as one mesh: the corners of its rooms and the ground under what stands in them. */
export function buildShading(): Mesh<BufferGeometry, ShaderMaterial> {
  const shade = new Shade();
  hallCorners(shade);
  roomCorners(shade);
  for (const shadow of groundShadows()) around(shade, shadow);

  const material = new ShaderMaterial({
    uniforms: UniformsUtils.clone(UniformsLib.fog),
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    fog: true,
  });
  const mesh = new Mesh(shade.geometry(), material);
  // Before the painted light and the lettering, which lie over a shadow and not under it
  mesh.renderOrder = -1;
  mesh.name = "shading";
  return mesh;
}
