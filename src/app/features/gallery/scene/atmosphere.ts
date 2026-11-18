import { AdditiveBlending, Color, DoubleSide, MathUtils, Mesh, Object3D, PlaneGeometry, ShaderMaterial } from "three";
import { DOOR, DOOR_XS, ROTUNDA } from "./layout";

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
