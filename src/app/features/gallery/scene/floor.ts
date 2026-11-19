import {
  CanvasTexture,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  Texture,
  Vector2,
  WebGLProgramParametersWithUniforms,
} from "three";

/** How much of what it mirrors the floor gives back where the visitor looks along it; looking down it gives back less. */
export const MIRROR_STRENGTH = 0.18;

/**
 * How high above the floor the thing mirrored at a spot `reach` metres into the view stands, from the mirror image's
 * `depth` there, the camera's height and the `scale` `obliqueNear` returned. The floor's shader works out the same.
 */
export function mirroredHeight(depth: number, reach: number, eyeHeight: number, scale: number): number {
  const rise = (2 * depth * reach) / scale;
  return rise / Math.max(1 - rise / eyeHeight, 0.02);
}

const STONE = { size: 256, clouds: 90, veins: 9 } as const;

/** Numbers from 0 to 1 that come out the same on every visit. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clouds and a few veins in grey around the middle, to lighten and darken the stone's own colour. It tiles. */
export function stoneTexture(): CanvasTexture {
  const { size } = STONE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (context) {
    const random = seeded(67);
    context.fillStyle = "#808080";
    context.fillRect(0, 0, size, size);
    // Everything is drawn again one tile over on every side, so what crosses an edge comes back in at the other
    const wraps = [-size, 0, size];

    for (let cloud = 0; cloud < STONE.clouds; cloud++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 18 + random() * 62;
      const tone = random() < 0.5 ? "255, 255, 255" : "0, 0, 0";
      const strength = 0.05 + random() * 0.09;
      for (const dx of wraps) {
        for (const dy of wraps) {
          const blot = context.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
          blot.addColorStop(0, `rgba(${tone}, ${strength})`);
          blot.addColorStop(1, `rgba(${tone}, 0)`);
          context.fillStyle = blot;
          context.fillRect(x + dx - radius, y + dy - radius, radius * 2, radius * 2);
        }
      }
    }

    for (let vein = 0; vein < STONE.veins; vein++) {
      const fromX = random() * size;
      const fromY = random() * size;
      const heading = random() * Math.PI * 2;
      const length = 70 + random() * 150;
      const sway = 4 + random() * 10;
      const phase = random() * Math.PI * 2;
      context.strokeStyle = `rgba(255, 255, 255, ${0.05 + random() * 0.07})`;
      context.lineWidth = 0.8 + random() * 1.4;
      for (const dx of wraps) {
        for (const dy of wraps) {
          context.beginPath();
          for (let along = 0; along <= length; along += 6) {
            const aside = Math.sin(along / 23 + phase) * sway;
            context.lineTo(
              fromX + dx + Math.cos(heading) * along - Math.sin(heading) * aside,
              fromY + dy + Math.sin(heading) * along + Math.cos(heading) * aside,
            );
          }
          context.stroke();
        }
      }
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

const VERTEX_PARS = /* glsl */ `
  varying vec3 vFloorWorld;
`;

const VERTEX_MAIN = /* glsl */ `
  vFloorWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

const FRAGMENT_PARS = /* glsl */ `
  uniform sampler2D mirrorMap;
  uniform sampler2D mirrorDepth;
  uniform float mirrorStrength;
  uniform vec2 mirrorSize;
  uniform vec2 mirrorLens;
  uniform float mirrorScale;
  uniform float mirrorTexel;
  varying vec3 vFloorWorld;
`;

// Laid out in the building's metres, not on each slab's own corners, so the hall's disc and the rooms' strip
// are one stone. Two sizes of the same clouds, one turned against the other, never line up twice the same way.
const STONE_FRAGMENT = /* glsl */ `
  float broad = texture2D(map, vFloorWorld.xz * 0.047).r;
  float fine = texture2D(map, mat2(0.8, -0.6, 0.6, 0.8) * vFloorWorld.xz * 0.21 + 0.37).r;
  float stone = (broad * 0.62 + fine * 0.38 - 0.5) * 2.0;
  diffuseColor.rgb *= 1.0 + stone * 0.9;
`;

const POLISH_FRAGMENT = /* glsl */ `
  roughnessFactor = clamp(roughnessFactor - stone * 0.16, 0.2, 1.0);
`;

// The image is taken from below the floor and turned left to right. What stands high above the floor is
// mirrored fainter and blurred wider, and drawn out towards the visitor, as worn stone smears what it shows.
const MIRROR_FRAGMENT = /* glsl */ `
  if (mirrorStrength > 0.0) {
    vec2 at = vec2(1.0 - gl_FragCoord.x / mirrorSize.x, gl_FragCoord.y / mirrorSize.y);
    float reach = vViewPosition.z;
    float rise = 2.0 * texture2D(mirrorDepth, at).r * reach / mirrorScale;
    float height = rise / max(1.0 - rise / cameraPosition.y, 0.02);
    float beyond = reach * (1.0 + height / cameraPosition.y);
    vec2 blur = clamp(mirrorLens * (0.02 + 0.13 * height) / beyond, vec2(mirrorTexel), vec2(0.06));
    // Each sample is itself blurred to the gaps between the samples, or the twelve would show as twelve images
    float coarse = max(log2(blur.x / mirrorTexel), 0.0);

    vec3 mirrored = vec3(0.0);
    for (int tap = 0; tap < 12; tap++) {
      float turn = float(tap) * 2.39996;
      float spread = sqrt((float(tap) + 0.5) / 12.0);
      mirrored += textureLod(mirrorMap, at + vec2(cos(turn), sin(turn) * 2.2) * spread * blur, coarse).rgb;
    }
    float grazing = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 3.0);
    float given = mirrorStrength * mix(0.55, 1.0, grazing) * (1.0 + stone * 0.6) / (1.0 + 0.22 * height);
    outgoingLight += mirrored / 12.0 * given;
  }
`;

/**
 * Dark polished stone: clouded and veined, and able to show a dim, blurred mirror image of the room,
 * which `FloorMirror` draws and hands over. Without one it is plain stone.
 */
export class StoneFloor extends MeshStandardMaterial {
  readonly mirror = {
    mirrorMap: { value: null as Texture | null },
    mirrorDepth: { value: null as Texture | null },
    mirrorStrength: { value: 0 },
    /** The size in pixels of the picture the floor itself is drawn into. */
    mirrorSize: { value: new Vector2(1, 1) },
    /** Half the lens's scale across and up: a metre one metre off covers this much of the mirror image. */
    mirrorLens: { value: new Vector2(1, 1) },
    mirrorScale: { value: 1 },
    /** The least blur, in the mirror image's own pixels, that keeps its coarse grid from showing. */
    mirrorTexel: { value: 0 },
  };

  constructor() {
    super({ color: 0x2b2b30, roughness: 0.42, metalness: 0, map: stoneTexture() });
  }

  override onBeforeCompile(shader: WebGLProgramParametersWithUniforms): void {
    Object.assign(shader.uniforms, this.mirror);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_PARS}`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace("#include <map_fragment>", STONE_FRAGMENT)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n${POLISH_FRAGMENT}`)
      .replace("#include <opaque_fragment>", `${MIRROR_FRAGMENT}\n#include <opaque_fragment>`);
  }

  override customProgramCacheKey(): string {
    return "stone-floor";
  }
}
