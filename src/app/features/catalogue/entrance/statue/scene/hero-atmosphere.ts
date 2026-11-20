import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  MathUtils,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";

const WARM = 0xffc480;
const PALE = 0xfff0d8;

/** A slanting column: from `top` to `foot`, each a height and then metres to the visitor's right, `width` metres wide at its foot and `neck` of that at its top. */
interface Column {
  top: readonly [y: number, z: number];
  foot: readonly [y: number, z: number];
  width: number;
  neck: number;
}

/** In metres, but for its strength. */
const HALO = { size: 8, behind: 3, y: 3.1, strength: 0.34 } as const;
// The shaft slants in over the visitor's left shoulder as the key light does, which also keeps it off the
// middle above the statue, where the page sets its small type.
export const SHAFT = { top: [7.4, -4], foot: [2.9, 0.3], width: 2.2, neck: 0.5, behind: 1.2, strength: 0.09 } as const;
/** Dust, in metres and seconds; `ahead` and `behind` are measured from the statue's middle, towards the visitor and away. */
export const MOTES = {
  top: [4.9, -0.7],
  foot: [1.5, 0.25],
  width: 3.8,
  neck: 0.7,
  motes: 52,
  sinks: 0.016,
  ahead: 0.7,
  behind: 2.4,
  idleAfter: 60,
  settles: 4,
  wakes: 1.5,
  strength: 0.6,
} as const;

/** A column's two ends in the scene, where the visitor looks along +X and their right is +Z. */
function ends(column: Column, x: number): [top: Vector3, foot: Vector3] {
  return [new Vector3(x, ...column.top), new Vector3(x, ...column.foot)];
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const POOL = /* glsl */ `
  uniform vec3 tint;
  uniform float strength;
  varying vec2 vUv;
  void main() {
    float round = 1.0 - clamp(distance(vUv, vec2(0.5)) * 2.0, 0.0, 1.0);
    gl_FragColor = vec4(tint, round * round * strength);
    #include <colorspace_fragment>
  }
`;

const BEAM = /* glsl */ `
  uniform vec3 tint;
  uniform float strength;
  varying vec2 vUv;
  void main() {
    // Narrow where it enters, wide where it lands; it gathers and thins slowly, so neither end shows as an edge
    float across = abs(vUv.x - 0.5) * 2.0 / mix(1.0, ${SHAFT.neck.toFixed(2)}, vUv.y);
    float body = 1.0 - smoothstep(0.0, 1.0, across);
    float along = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
    gl_FragColor = vec4(tint, body * body * along * strength);
    #include <colorspace_fragment>
  }
`;

const MOTE_VERTEX = /* glsl */ `
  uniform float time;
  uniform float level;
  uniform float halfHeight;
  uniform float ceiling;
  uniform vec3 top;
  uniform vec3 fall;
  uniform vec3 side;
  attribute vec4 mote;
  attribute vec3 trait;
  varying float vLight;
  void main() {
    float t = time * trait.y + mote.w;
    // Each mote sinks the length of the column and starts again at its top, dark at both ends so the turn is not seen
    float sunk = fract(mote.x + time * trait.y * ${(MOTES.sinks / Math.hypot(MOTES.top[0] - MOTES.foot[0], MOTES.top[1] - MOTES.foot[1])).toFixed(5)});
    float reach = mix(${MOTES.neck.toFixed(2)}, 1.0, sunk) * ${(MOTES.width / 2).toFixed(2)};
    vec3 drifted = top + fall * sunk + side * (mote.y * reach) + vec3(mote.z, 0.0, 0.0)
      + vec3(sin(t * 0.61) * 0.11, sin(t * 0.43) * 0.05, cos(t * 0.37) * 0.11);
    vec4 seen = modelViewMatrix * vec4(drifted, 1.0);
    gl_Position = projectionMatrix * seen;
    gl_PointSize = max(trait.x * halfHeight * projectionMatrix[1][1] / -seen.z, 3.0);
    float turning = smoothstep(0.0, 0.12, sunk) * (1.0 - smoothstep(0.84, 1.0, sunk));
    float underCeiling = 1.0 - smoothstep(ceiling - 0.08, ceiling, gl_Position.y / gl_Position.w);
    vLight = trait.z * level * turning * underCeiling * (0.7 + 0.3 * sin(t * 1.7));
  }
`;

const MOTE_FRAGMENT = /* glsl */ `
  uniform vec3 tint;
  varying float vLight;
  void main() {
    float soft = 1.0 - clamp(length(gl_PointCoord - 0.5) * 2.0, 0.0, 1.0);
    gl_FragColor = vec4(tint, soft * soft * vLight);
    #include <colorspace_fragment>
  }
`;

function painted(fragmentShader: string, tint: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { tint: { value: new Color(tint) }, strength: { value: 0 } },
    vertexShader: VERTEX,
    fragmentShader,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
}

// Light painted on rather than computed, as in the gallery's hall: a warm glow behind the statue and a pale
// shaft falling on it from above. Both face the visitor, who never walks far enough round to see them edge on.
export class PaintedLight {
  readonly objects: Mesh<PlaneGeometry, ShaderMaterial>[];
  private readonly halo = painted(POOL, WARM);
  private readonly shaft = painted(BEAM, PALE);

  constructor() {
    const halo = new Mesh(new PlaneGeometry(HALO.size, HALO.size), this.halo);
    halo.rotation.y = -Math.PI / 2;
    halo.position.set(HALO.behind, HALO.y, 0);

    const [top, foot] = ends(SHAFT, SHAFT.behind);
    const shaft = new Mesh(new PlaneGeometry(SHAFT.width, top.distanceTo(foot)), this.shaft);
    shaft.rotation.y = -Math.PI / 2;
    shaft.rotation.z = Math.atan2(foot.z - top.z, top.y - foot.y);
    shaft.position.copy(top).add(foot).multiplyScalar(0.5);

    this.objects = [halo, shaft];
  }

  /** `level` is 1 with the statue fully lit. */
  setLevel(level: number): void {
    this.halo.uniforms["strength"].value = HALO.strength * level;
    this.shaft.uniforms["strength"].value = SHAFT.strength * level;
  }
}

/** The same scatter every time, so a spec and a screenshot can count on it. */
function scatter(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** How awake the dust is `seconds` on, 0 to 1: it settles once the visitor has done nothing for a minute, and wakes when they stir. */
export function motePresence(presence: number, idle: number, seconds: number): number {
  const step = idle < MOTES.idleAfter ? seconds / MOTES.wakes : -seconds / MOTES.settles;
  return MathUtils.clamp(presence + step, 0, 1);
}

// Dust in the light round the statue. Settled, it asks for no frames, so a still entrance goes back to drawing nothing.
export class Motes {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  private time = 0;
  private idle = 0;
  private presence = 0;

  constructor() {
    const random = scatter(11);
    const places = new Float32Array(MOTES.motes * 4);
    const traits = new Float32Array(MOTES.motes * 3);
    for (let index = 0; index < MOTES.motes; index++) {
      const off = Math.sqrt(random()) * (random() < 0.5 ? -1 : 1);
      // How far down the column it starts, how far off its axis, how far behind the statue's middle, and its phase
      places.set([random(), off, MathUtils.lerp(-MOTES.ahead, MOTES.behind, random()), random() * 40], index * 4);
      // Its size in metres, its own pace, and how much of the light reaches it
      traits.set([MathUtils.lerp(0.024, 0.06, random()), MathUtils.lerp(0.6, 1.2, random()), 1 - 0.7 * off * off], index * 3);
    }

    const geometry = new BufferGeometry();
    // Every mote is placed by the shader; without a position of its own the geometry could not be drawn
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(MOTES.motes * 3), 3));
    geometry.setAttribute("mote", new BufferAttribute(places, 4));
    geometry.setAttribute("trait", new BufferAttribute(traits, 3));

    const [top, foot] = ends(MOTES, 0);
    this.points = new Points(
      geometry,
      new ShaderMaterial({
        uniforms: {
          tint: { value: new Color(PALE).multiplyScalar(MOTES.strength) },
          time: { value: 0 },
          level: { value: 0 },
          halfHeight: { value: 400 },
          ceiling: { value: 1 },
          top: { value: top },
          fall: { value: foot.clone().sub(top) },
          side: { value: new Vector3(0, top.z - foot.z, foot.y - top.y).normalize() },
        },
        vertexShader: MOTE_VERTEX,
        fragmentShader: MOTE_FRAGMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    const size = new Vector2();
    this.points.onBeforeRender = (renderer) => {
      this.points.material.uniforms["halfHeight"].value = renderer.getDrawingBufferSize(size).y / 2;
    };
    // The shader moves them well away from where the geometry says they are
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /** The visitor moved the mouse or scrolled. */
  stir(): void {
    this.idle = 0;
  }

  /** Dust shows only below `share` of the way down the picture, 0 to 1: above it the page sets type, which a bright speck would cross. */
  setCeiling(share: number): void {
    this.points.material.uniforms["ceiling"].value = 1 - 2 * share;
  }

  /** `level` is 1 with the statue fully lit. True while the dust needs frames. */
  update(seconds: number, level: number): boolean {
    this.time += seconds;
    this.idle += seconds;
    this.presence = motePresence(this.presence, this.idle, seconds);
    this.points.visible = this.presence > 0 && level > 0;
    this.points.material.uniforms["time"].value = this.time;
    this.points.material.uniforms["level"].value = this.presence * level;
    return this.presence > 0;
  }
}
