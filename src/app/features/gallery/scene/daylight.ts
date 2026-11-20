import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MathUtils,
  Mesh,
  Object3D,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from "three";
import { wells } from "./ceilings";
import { CORNICE, dadoHeight, DOME, DOOR, DOOR_CASING, DOOR_XS, END_WINDOW, HALF_DEPTH, LAYLIGHT, ROTUNDA, RoomSpan, roomSpans, WALL_HEIGHT } from "./layout";
import { Point } from "./stonework";

/** The light that comes in from above: pale, a shade cooler than the lamps. */
const PALE = 0xe4e7ee;

const WASH_VERTEX = /* glsl */ `
  #include <fog_pars_vertex>
  attribute vec2 wash;
  varying vec2 vUv;
  varying vec2 vWash;
  void main() {
    vUv = uv;
    vWash = wash;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

// It thins out with the fog, as the painted shade does, or a far room's light would glow through it.
// The falloff is worked out per pixel: a gradient image would show its rounding on a wall this dark.
const WASH_FRAGMENT = /* glsl */ `
  #include <fog_pars_fragment>
  uniform vec3 tint;
  varying vec2 vUv;
  varying vec2 vWash;
  void main() {
    float across = sin(clamp(vUv.y, 0.0, 1.0) * 3.14159265);
    float ends = smoothstep(0.0, vWash.y, vUv.x) * smoothstep(0.0, vWash.y, 1.0 - vUv.x);
    float light = vWash.x * across * across * ends;
    #ifdef USE_FOG
      light *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor = vec4(tint, light);
    #include <colorspace_fragment>
  }
`;

/** How far a painted light stands off the surface it lies on. */
const OFF = 0.005;
/** How strong the light from above is at its fullest: down a wall, on the floor under glass, through a door, before the end window, and under the dome. */
export const TOP_LIGHT = { wall: 0.12, floor: 0.14, door: 0.15, window: 0.16, hall: 0.1 } as const;
/** How far past the glass over it a pool of light on the floor spreads. */
const POOL_SPREAD = 1.3;
/** The light through a door: how far before the door it lies, how far past it, and its half width as a share of the door's. */
const THROUGH_DOOR = { before: 3.4, past: 1, half: 1.24 } as const;
/** The light before the end window: how far into the room it lies, and how far to either side of the window's middle. */
const BEFORE_WINDOW = { reach: 3.6, half: END_WINDOW.width } as const;
/** The pool under the dome's opening, as wide as it is long. */
const UNDER_DOME = 3;

/** Collects patches of painted light. A patch runs from `a` to `b` along one long edge and from `d` to `c` along the other. */
class Wash {
  private readonly positions: number[] = [];
  private readonly uvs: number[] = [];
  private readonly washes: number[] = [];

  /** `soft` is the share of its length over which the patch fades in from each end; `rows` the part of its width it shows. */
  patch(a: Point, b: Point, c: Point, d: Point, strength: number, soft: number, rows: readonly [number, number] = [0, 1]): void {
    const corners: [Point, number, number][] = [
      [a, 0, rows[0]],
      [b, 1, rows[0]],
      [c, 1, rows[1]],
      [d, 0, rows[1]],
    ];
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const [point, u, v] = corners[index];
      this.positions.push(...point);
      this.uvs.push(u, v);
      this.washes.push(strength, soft);
    }
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(this.uvs, 2));
    geometry.setAttribute("wash", new Float32BufferAttribute(this.washes, 2));
    return geometry;
  }
}

function onFloor(wash: Wash, fromX: number, toX: number, halfZ: number, strength: number, soft: number): void {
  wash.patch([fromX, OFF, halfZ], [toX, OFF, halfZ], [toX, OFF, -halfZ], [fromX, OFF, -halfZ], strength, soft);
}

function wallWashes(wash: Wash, span: RoomSpan): void {
  const { from, to } = span;
  const [foot, head] = [dadoHeight(span), WALL_HEIGHT - CORNICE.drop - 0.02];
  // The patch's own middle lies above the middle of the wall, so more of it falls where the pictures hang than high up
  const rows = [0.24, 1] as const;
  const beside = DOOR.width / 2 + DOOR_CASING.width + 0.12;

  for (const side of [-1, 1]) {
    const z = side * (HALF_DEPTH - OFF);
    const [left, right] = side < 0 ? [from, to] : [to, from];
    wash.patch([left, foot, z], [right, foot, z], [right, head, z], [left, head, z], TOP_LIGHT.wall, 0.12, rows);
  }
  for (const [x, faces] of [[from + OFF, 1], [to - OFF, -1]] as const) {
    for (const side of [-1, 1]) {
      const [near, far] = [side * beside, side * HALF_DEPTH];
      const [left, right] = side * faces < 0 ? [near, far] : [far, near];
      wash.patch([x, foot, left], [x, foot, right], [x, head, right], [x, head, left], TOP_LIGHT.wall, 0.3, rows);
    }
  }
}

/** Every painted light that never changes, as one mesh, so that all of it costs one draw. */
export function buildTopLight(): Mesh<BufferGeometry, ShaderMaterial> {
  const wash = new Wash();

  for (const span of roomSpans()) {
    wallWashes(wash, span);
    for (const well of wells(span)) {
      // Stopped at the room's own walls, or the pool would lie on the next room's floor
      const [from, to] = [Math.max(well.from - POOL_SPREAD, span.from), Math.min(well.to + POOL_SPREAD, span.to)];
      onFloor(wash, from, to, LAYLIGHT.halfWidth + POOL_SPREAD, TOP_LIGHT.floor, Math.min((POOL_SPREAD * 2) / (to - from), 0.5));
    }
    if (span.feature === "window") onFloor(wash, span.to - BEFORE_WINDOW.reach, span.to, BEFORE_WINDOW.half, TOP_LIGHT.window, 0.5);
  }
  // The room beyond a door is the lighter one: its light lies on the floor before the door
  for (const x of DOOR_XS) onFloor(wash, x - THROUGH_DOOR.before, x + THROUGH_DOOR.past, (DOOR.width / 2) * THROUGH_DOOR.half, TOP_LIGHT.door, 0.5);
  onFloor(wash, ROTUNDA.x - UNDER_DOME, ROTUNDA.x + UNDER_DOME, UNDER_DOME, TOP_LIGHT.hall, 0.5);

  const material = new ShaderMaterial({
    uniforms: { ...UniformsUtils.clone(UniformsLib.fog), tint: { value: new Color(PALE) } },
    vertexShader: WASH_VERTEX,
    fragmentShader: WASH_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: true,
  });
  const mesh = new Mesh(wash.geometry(), material);
  // Over the painted shade and under the furniture's own shadows, which darken it as they should
  mesh.renderOrder = -0.5;
  mesh.name = "top-light";
  return mesh;
}

/**
 * The shaft from the dome's opening: its radius at the floor and its strength with the lights up.
 * It thins to `thin` over the heights in `thinsOver`: the page sets its name over it above the statue.
 */
export const SHAFT = {
  foot: 2.6,
  strength: 0.044,
  thin: 0.42,
  thinsOver: [2, 4.2],
  /** The height over which it comes up from the floor it lands on. */
  lands: 0.5,
  /** The share of it the near side of its skin adds; the far side adds the rest. */
  near: 0.3,
  /** The stops between which it goes as the visitor leaves the hall. */
  leaves: [0.5, 0.85],
} as const;

const SHAFT_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const glsl = (value: number) => value.toFixed(3);

// What a hazy column gives back along a line of sight: the line's length through it, weighted towards its middle.
// The far side of its skin adds most, so the statue inside hides that and keeps its darks.
const SHAFT_FRAGMENT = /* glsl */ `
  uniform vec3 tint;
  uniform float strength;
  uniform vec3 foot;
  uniform vec3 shape;
  varying vec3 vWorld;
  void main() {
    vec3 from = cameraPosition - foot;
    vec3 ray = normalize(vWorld - cameraPosition);
    float narrows = (shape.x - shape.y) / shape.z;
    float here = shape.x - narrows * from.y;
    float a = dot(ray.xz, ray.xz) - narrows * narrows * ray.y * ray.y;
    float b = dot(from.xz, ray.xz) + narrows * ray.y * here;
    float c = dot(from.xz, from.xz) - here * here;
    float inside = b * b - a * c;
    float light = 0.0;
    if (inside > 0.0 && a > 0.0) {
      float climb = abs(ray.y) < 0.0001 ? 0.0001 : ray.y;
      float low = -from.y / climb;
      float high = (shape.z - from.y) / climb;
      float near = max(max((-b - sqrt(inside)) / a, min(low, high)), 0.0);
      float far = min((-b + sqrt(inside)) / a, max(low, high));
      if (far > near) {
        float height = from.y + ray.y * (near + far) * 0.5;
        float radius = shape.x - narrows * height;
        float cylinder = dot(ray.xz, ray.xz);
        float middle = dot(from.xz, ray.xz);
        float gone = (cylinder * (far * far * far - near * near * near) / 3.0 + middle * (far * far - near * near) + dot(from.xz, from.xz) * (far - near)) / (radius * radius);
        float through = max(far - near - gone, 0.0);
        float haze = mix(1.0, ${glsl(SHAFT.thin)}, smoothstep(${glsl(SHAFT.thinsOver[0])}, ${glsl(SHAFT.thinsOver[1])}, height)) * smoothstep(0.0, ${glsl(SHAFT.lands)}, height);
        // The far side fades out by its own height: at full strength down to the floor, its rim would show as an edge there
        float skin = gl_FrontFacing ? ${glsl(SHAFT.near)} : ${glsl(1 - SHAFT.near)} * smoothstep(0.0, ${glsl(SHAFT.lands)}, vWorld.y);
        light = skin * strength * through * haze;
      }
    }
    gl_FragColor = vec4(tint, light);
    #include <colorspace_fragment>
  }
`;

/** How much of the shaft shows: it comes up with the statue's lights and is gone before the visitor reaches Room I. */
export function shaftLevel(progress: number, lionLevel: number, costly: boolean): number {
  if (!costly) return 0;
  const [from, by] = SHAFT.leaves;
  return MathUtils.clamp(lionLevel, 0, 1) * MathUtils.clamp((by - progress) / (by - from), 0, 1);
}

// Light from above, painted and not computed. The rooms' wash never changes and asks for no frames; the shaft
// on the statue is the costly part and goes with the quality.
export class Daylight {
  readonly objects: Object3D[] = [];
  private readonly shaft: Mesh<CylinderGeometry, ShaderMaterial>;

  constructor() {
    const top = ROTUNDA.height;
    this.shaft = new Mesh(
      new CylinderGeometry(DOME.oculus, SHAFT.foot, top, 48, 1, true),
      new ShaderMaterial({
        uniforms: {
          tint: { value: new Color(PALE) },
          strength: { value: 0 },
          foot: { value: new Vector3(ROTUNDA.x, 0, 0) },
          shape: { value: new Vector3(SHAFT.foot, DOME.oculus, top) },
        },
        vertexShader: SHAFT_VERTEX,
        fragmentShader: SHAFT_FRAGMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        // Both sides in one draw: light only adds up, so the order they are drawn in does not matter
        forceSinglePass: true,
      }),
    );
    this.shaft.position.set(ROTUNDA.x, top / 2, 0);
    this.shaft.name = "shaft";
    this.shaft.visible = false;
    this.objects.push(buildTopLight(), this.shaft);
  }

  /** `lionLevel` runs 0..1 as the lights come up; `costly` is false once quality has stepped down. */
  update(progress: number, lionLevel: number, costly: boolean): void {
    const level = shaftLevel(progress, lionLevel, costly);
    this.shaft.visible = level > 0;
    this.shaft.material.uniforms["strength"].value = SHAFT.strength * level;
  }
}
