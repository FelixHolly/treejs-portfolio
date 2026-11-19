import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, MathUtils, Points, ShaderMaterial, Vector2, Vector3 } from "three";
import { ROTUNDA } from "./layout";

/** How the dust comes and goes, in seconds after the statue's lights have risen, and how far a visitor walks before it is gone. */
export const DUST = { motes: 44, fadesFrom: 3.5, gone: 8, leaving: 0.6, walkedOn: 0.05 } as const;
/** The statue's key light, as `lights.ts` hangs it: the motes drift in its beam, the only place dust would show. */
const BEAM = { from: [ROTUNDA.x - 4.4, 6.6, -3.6], to: [ROTUNDA.x, 2.5, 0], angle: 0.44, near: 0.58, far: 1.04, fill: 0.55 } as const;
const WARM = 0xffd9a0;
const STRENGTH = 0.42;

const VERTEX = /* glsl */ `
  uniform float time;
  uniform float level;
  uniform float halfHeight;
  attribute vec4 mote;
  varying float vLight;
  void main() {
    float t = time * mote.w + mote.x;
    vec3 drifted = position + vec3(sin(t * 0.61) * 0.11, sin(t * 0.43) * 0.05 - 0.014 * time * mote.w, cos(t * 0.37) * 0.11);
    vec4 seen = modelViewMatrix * vec4(drifted, 1.0);
    gl_Position = projectionMatrix * seen;
    gl_PointSize = max(mote.y * halfHeight * projectionMatrix[1][1] / -seen.z, 3.0);
    vLight = mote.z * level * (0.7 + 0.3 * sin(t * 1.7));
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 tint;
  varying float vLight;
  void main() {
    float soft = 1.0 - clamp(length(gl_PointCoord - 0.5) * 2.0, 0.0, 1.0);
    gl_FragColor = vec4(tint, soft * soft * vLight);
    #include <colorspace_fragment>
  }
`;

/** The same scatter every time, so a spec and a screenshot can count on it. */
function scatter(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function motes(): BufferGeometry {
  const random = scatter(7);
  const from = new Vector3(...BEAM.from);
  const axis = new Vector3(...BEAM.to).sub(from);
  const length = axis.length();
  axis.normalize();
  const side = new Vector3(0, 1, 0).cross(axis).normalize();
  const up = axis.clone().cross(side);
  const positions = new Float32Array(DUST.motes * 3);
  const traits = new Float32Array(DUST.motes * 4);

  for (let index = 0; index < DUST.motes; index++) {
    const reach = length * MathUtils.lerp(BEAM.near, BEAM.far, random());
    const off = Math.sqrt(random());
    const radius = reach * Math.tan(BEAM.angle) * BEAM.fill * off;
    const turn = random() * Math.PI * 2;
    from
      .clone()
      .addScaledVector(axis, reach)
      .addScaledVector(side, Math.cos(turn) * radius)
      .addScaledVector(up, Math.sin(turn) * radius)
      .toArray(positions, index * 3);
    // Phase, size in metres, how much of the beam's light reaches it, and its own pace
    traits.set([random() * 40, MathUtils.lerp(0.02, 0.05, random()), 1 - 0.7 * off * off, MathUtils.lerp(0.6, 1.2, random())], index * 4);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("mote", new BufferAttribute(traits, 4));
  return geometry;
}

/** How much of the dust shows, 0..1: `rise` follows the lights up, `risen` counts the seconds since they got there. */
export function dustLevel(rise: number, risen: number): number {
  return MathUtils.clamp(rise, 0, 1) * (1 - MathUtils.smoothstep(risen, DUST.fadesFrom, DUST.gone));
}

// Dust motes in the statue's key light for the first seconds after it comes up, and never again:
// once settled the points are taken down, so a still hall goes back to drawing nothing.
export class Dust {
  readonly objects: Points<BufferGeometry, ShaderMaterial>[] = [];
  private state: "waiting" | "drifting" | "settled";
  /** The statue's level before its lights come up, taken from the first frame. */
  private dark?: number;
  private time = 0;
  private risen = 0;
  private leaving = false;
  private level = 0;

  /** `shown` is false where dust has no place: reduced motion, a lower quality tier, a second look in one visit. */
  constructor(shown: boolean) {
    this.state = shown ? "waiting" : "settled";
    if (!shown) return;

    const points = new Points(
      motes(),
      new ShaderMaterial({
        uniforms: {
          tint: { value: new Color(WARM).multiplyScalar(STRENGTH) },
          time: { value: 0 },
          level: { value: 0 },
          halfHeight: { value: 400 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    const size = new Vector2();
    points.onBeforeRender = (renderer) => {
      points.material.uniforms["halfHeight"].value = renderer.getDrawingBufferSize(size).y / 2;
    };
    this.objects.push(points);
  }

  get settled(): boolean {
    return this.state === "settled";
  }

  /** `lionLevel` runs up to 1 as the lights rise; `allowed` is false once quality has stepped down. True while the dust needs frames. */
  update(seconds: number, progress: number, lionLevel: number, allowed: boolean): boolean {
    if (this.state === "settled") return false;
    const dark = (this.dark ??= lionLevel);
    const away = progress > DUST.walkedOn || !allowed;

    if (this.state === "waiting") {
      if (away) return this.settle();
      if (lionLevel <= dark) return false;
      this.state = "drifting";
    }

    this.time += seconds;
    if (lionLevel >= 1) this.risen += seconds;
    this.leaving ||= away;
    const rise = (lionLevel - dark) / Math.max(1 - dark, 0.0001);
    this.level = this.leaving ? this.level - seconds / DUST.leaving : dustLevel(rise, this.risen);
    if (this.risen >= DUST.gone || (this.leaving && this.level <= 0)) return this.settle();

    const { uniforms } = this.objects[0].material;
    uniforms["time"].value = this.time;
    uniforms["level"].value = this.level;
    return true;
  }

  private settle(): false {
    this.state = "settled";
    for (const points of this.objects) {
      points.removeFromParent();
      points.geometry.dispose();
      points.material.dispose();
    }
    this.objects.length = 0;
    return false;
  }
}
