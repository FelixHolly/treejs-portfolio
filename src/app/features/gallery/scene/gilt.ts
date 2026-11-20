import { MeshStandardMaterial, WebGLProgramParametersWithUniforms } from "three";

/** The sheen at its fullest, as a share of the gilding's own colour. */
export const SHEEN = 0.42;

const FRAGMENT_PARS = /* glsl */ `
  uniform float giltSheen;
`;

// Gilding with nothing to mirror looks painted. It mirrors one soft band of light just ahead of the visitor,
// so a glint runs along a frame as they pass, dimmer where the gilding is in the dark.
const SHEEN_FRAGMENT = /* glsl */ `
  if (giltSheen > 0.0) {
    vec3 mirrored = inverseTransformDirection(reflect(-normalize(vViewPosition), normal), viewMatrix);
    float ahead = mirrored.x - 0.22;
    float band = exp(-ahead * ahead / 0.02) * smoothstep(-0.5, 0.0, mirrored.y) * (1.0 - smoothstep(0.3, 0.8, mirrored.y));
    float lit = mix(0.3, 1.0, clamp(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)) * 6.0, 0.0, 1.0));
    outgoingLight += diffuseColor.rgb * giltSheen * band * lit;
  }
`;

/** Gold leaf: the gallery's gold, with a glint that moves over it as the visitor does. */
export class Gilt extends MeshStandardMaterial {
  private readonly sheen = { value: SHEEN };

  constructor() {
    super({ color: 0xc7a44a, roughness: 0.38, metalness: 0.65 });
  }

  /** The glint is the first thing to go when quality steps down. */
  set glints(on: boolean) {
    this.sheen.value = on ? SHEEN : 0;
  }

  get glints(): boolean {
    return this.sheen.value > 0;
  }

  override onBeforeCompile(shader: WebGLProgramParametersWithUniforms): void {
    shader.uniforms["giltSheen"] = this.sheen;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace("#include <opaque_fragment>", `${SHEEN_FRAGMENT}\n#include <opaque_fragment>`);
  }

  override customProgramCacheKey(): string {
    return "gilt";
  }
}
