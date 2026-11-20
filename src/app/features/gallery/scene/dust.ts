import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, MathUtils, Points, ShaderMaterial, Vector2, Vector3 } from "three";
import { ROTUNDA } from "./layout";

/** Gone `thinsBy` stops towards Room I; settles over `settles` seconds after `idleAfter` idle ones, back over `wakes`; a mote fades from `clear` to `near` metres off the camera. */
export const DUST = { motes: 44, thinsBy: 0.4, idleAfter: 60, settles: 4, wakes: 1.5, near: 0.6, clear: 2 } as const;
/** A mote sinks `rate` metres a second through `drop` metres about where it hangs, then begins again at the top. */
export const FALL = { rate: 0.014, drop: 0.6 } as const;
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
    // Sinking on for as long as the visitor stays, the cloud would end up under the floor: a mote falls a short way, over and over
    float fallen = fract(t * ${(FALL.rate / FALL.drop).toFixed(5)});
    vec3 drifted = position + vec3(sin(t * 0.61) * 0.11, sin(t * 0.43) * 0.05 + (0.5 - fallen) * ${FALL.drop.toFixed(2)}, cos(t * 0.37) * 0.11);
    vec4 seen = modelViewMatrix * vec4(drifted, 1.0);
    gl_Position = projectionMatrix * seen;
    gl_PointSize = max(mote.y * halfHeight * projectionMatrix[1][1] / -seen.z, 3.0);
    // Walked through, a mote would swell into a blob: it fades out as the camera comes up to it
    float clearOfCamera = smoothstep(${DUST.near.toFixed(2)}, ${DUST.clear.toFixed(2)}, -seen.z);
    // Dark at the foot of its fall and at the top, so it is never seen to jump between them
    float midFall = smoothstep(0.0, 0.1, fallen) * (1.0 - smoothstep(0.9, 1.0, fallen));
    vLight = mote.z * level * clearOfCamera * midFall * (0.7 + 0.3 * sin(t * 1.7));
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

export interface DustMoment {
  /** How far the statue's lights have risen, 0 to 1. */
  rise: number;
  /** Where the visitor is on the route, in stops. */
  progress: number;
  /** How awake the dust is, 0 to 1: see `dustPresence`. */
  presence: number;
  reducedMotion: boolean;
  /** False once quality has stepped down. */
  allowed: boolean;
}

/** How much of the dust shows, 0 to 1: it comes up with the lights and thins as the visitor walks away from the statue. */
export function dustLevel({ rise, progress, presence, reducedMotion, allowed }: DustMoment): number {
  if (reducedMotion || !allowed) return 0;
  const atEntrance = MathUtils.clamp(1 - progress / DUST.thinsBy, 0, 1);
  return MathUtils.clamp(rise, 0, 1) * atEntrance * MathUtils.clamp(presence, 0, 1);
}

/** The dust's presence `seconds` on: it settles once the visitor has done nothing for a minute, and wakes when they stir. */
export function dustPresence(presence: number, idle: number, seconds: number): number {
  const step = idle < DUST.idleAfter ? seconds / DUST.wakes : -seconds / DUST.settles;
  return MathUtils.clamp(presence + step, 0, 1);
}

// Dust motes in the statue's key light, for as long as the visitor is at the entrance and doing something.
// Settled, or with the visitor elsewhere, it asks for no frames, so a still hall goes back to drawing nothing.
export class Dust {
  readonly objects: Points<BufferGeometry, ShaderMaterial>[] = [];
  /** The statue's level before its lights come up, taken from the first frame. */
  private dark?: number;
  private time = 0;
  private idle = 0;
  private presence = 1;

  /** `reducedMotion` is the one case with no dust at all, and nothing made for it. */
  constructor(private readonly reducedMotion: boolean) {
    if (reducedMotion) return;

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
    points.visible = false;
    this.objects.push(points);
  }

  /** The visitor moved the mouse, scrolled or pressed a key. */
  stir(): void {
    this.idle = 0;
  }

  /** `lionLevel` runs up to 1 as the lights rise; `allowed` is false once quality has stepped down. True while the dust needs frames. */
  update(seconds: number, progress: number, lionLevel: number, allowed: boolean): boolean {
    const [points] = this.objects;
    if (!points) return false;
    const dark = (this.dark ??= lionLevel);
    const rise = (lionLevel - dark) / Math.max(1 - dark, 0.0001);
    const moment = { rise, progress, reducedMotion: this.reducedMotion, allowed };
    // Where no dust could show, time stands still for it: the minute is counted at the entrance only
    if (dustLevel({ ...moment, presence: 1 }) <= 0) {
      points.visible = false;
      return false;
    }

    this.time += seconds;
    this.idle += seconds;
    this.presence = dustPresence(this.presence, this.idle, seconds);
    const level = dustLevel({ ...moment, presence: this.presence });
    points.visible = level > 0;
    points.material.uniforms["time"].value = this.time;
    points.material.uniforms["level"].value = level;
    return level > 0;
  }

  dispose(): void {
    for (const points of this.objects) {
      points.geometry.dispose();
      points.material.dispose();
    }
  }
}
