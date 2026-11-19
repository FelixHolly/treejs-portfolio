import { AdditiveBlending, Box3, Color, DoubleSide, MathUtils, Mesh, Object3D, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { DOOR, DOOR_XS, ROTUNDA } from "./layout";
import { PieceTarget, PointedLevels } from "./picking";

const WARM = 0xffc480;
const HALO = 9.5;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 tint;
  uniform float strength;
  uniform float rising;
  varying vec2 vUv;
  void main() {
    float round = 1.0 - clamp(distance(vUv, vec2(0.5)) * 2.0, 0.0, 1.0);
    float fall = mix(round * round, mix(1.0, 0.12, vUv.y), rising);
    gl_FragColor = vec4(tint, fall * strength);
    #include <colorspace_fragment>
  }
`;

// Light painted on rather than computed. The falloff is worked out per pixel instead of read from a
// gradient image, whose rounding shows as coloured specks once the visitor stands close to it.
export function glow(shape: "pool" | "rising", strength = 0): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      tint: { value: new Color(WARM) },
      strength: { value: strength },
      rising: { value: shape === "rising" ? 1 : 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
}

// Light the hall would have without paying for more lamps: a glow behind the statue, and warmth in
// the doorway to Room I spilling onto the floor, so the way on is the brightest thing but the lion.
export class RotundaAtmosphere {
  readonly objects: Object3D[] = [];
  private readonly halo = glow("pool");
  private readonly doorway = glow("rising");
  private readonly spill = glow("pool");

  constructor() {
    // Behind the statue on the hall's axis, far enough inside that the curved wall never cuts it.
    const halo = new Mesh(new PlaneGeometry(HALO, HALO), this.halo);
    halo.rotation.y = Math.PI / 2;
    halo.position.set(ROTUNDA.x + ROTUNDA.radius - 2.6, 3.3, 0);

    const doorway = new Mesh(new PlaneGeometry(DOOR.width, DOOR.height), this.doorway);
    doorway.rotation.y = Math.PI / 2;
    doorway.position.set(DOOR_XS[0], DOOR.height / 2, 0);

    const spill = new Mesh(new PlaneGeometry(DOOR.width * 2.4, DOOR.width * 1.6), this.spill);
    spill.rotation.x = -Math.PI / 2;
    spill.rotation.z = Math.PI / 2;
    spill.position.set(DOOR_XS[0] - 1.8, 0.006, 0);

    this.objects.push(halo, doorway, spill);
  }

  /** `lionLevel` runs 0..1 as the lights come up; everything fades as the visitor walks on. */
  update(progress: number, lionLevel: number): void {
    const here = MathUtils.clamp(1 - progress / 0.6, 0, 1);
    // Gone before the visitor walks through where it hangs
    this.set(this.halo, 0.34 * lionLevel * MathUtils.clamp(1 - progress / 0.45, 0, 1));
    this.set(this.doorway, 0.2 * here);
    this.set(this.spill, 0.25 * here);
  }

  private set(material: ShaderMaterial, strength: number): void {
    material.uniforms["strength"].value = strength;
  }
}

/** The light pointing adds: how strong at its middle, how far past the piece it spreads, and how far in front of it it hangs. */
const POINTED = { strength: 0.18, spread: 1.5, clear: 0.02 } as const;

// A little more light on the piece under the pointer: one painted pool per stop, dark and undrawn until pointed at.
export class PointedLight {
  readonly objects: Object3D[] = [];
  private readonly pools = new Map<number, Mesh<PlaneGeometry, ShaderMaterial>>();
  private readonly levels = new PointedLevels();

  constructor(targets: readonly PieceTarget[]) {
    const bounds = new Map<number, { box: Box3; round: boolean }>();
    for (const target of targets) {
      const known = bounds.get(target.stop);
      if (known) known.box.union(target.box);
      else bounds.set(target.stop, { box: target.box.clone(), round: !!target.round });
    }

    for (const [stop, { box, round }] of bounds) {
      const size = box.getSize(new Vector3());
      const centre = box.getCenter(new Vector3());
      const pool = new Mesh(new PlaneGeometry((round ? size.z : size.x) * POINTED.spread, size.y * POINTED.spread), glow("pool"));
      // What hangs on the wall is lit from the room; the statue from where the arriving visitor stands
      if (round) {
        pool.rotation.y = -Math.PI / 2;
        pool.position.set(box.min.x - POINTED.clear, centre.y, centre.z);
      } else {
        pool.position.set(centre.x, centre.y, box.max.z + POINTED.clear);
      }
      pool.visible = false;
      this.pools.set(stop, pool);
      this.objects.push(pool);
    }
  }

  point(stop: number | null): void {
    this.levels.point(stop);
  }

  /** True while a pool is still brightening or dimming. */
  update(seconds: number): boolean {
    return this.levels.update(seconds, (stop, level) => {
      const pool = this.pools.get(stop);
      if (!pool) return;
      pool.visible = level > 0;
      pool.material.uniforms["strength"].value = POINTED.strength * level;
    });
  }
}
