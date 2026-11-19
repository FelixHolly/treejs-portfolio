import { Color, ShaderMaterial, Texture, Vector2 } from "three";
import { coverFit } from "./textures";

/**
 * How the portrait is toned, so any photograph sits in the palette like a painted one.
 * The catalogue's `.picture--toned` does the same in CSS; change the two together.
 */
export const PORTRAIT_TONE = {
  /** 1 keeps the photograph's colour, 0 leaves it monochrome. */
  saturation: 0.6,
  /** The warm light the picture is tinted with, and how much of it (0 to 1). */
  tint: 0xffdcae,
  warmth: 0.6,
  /** Overall brightness; the works' pictures hang at the same level. */
  level: 0.73,
  /** How much darker the corners are than the middle, and how far out (0 middle, 1 corner) that begins. */
  edge: 0.5,
  edgeFrom: 0.42,
} as const;

const UNHUNG = 0x1b1b1f;

const VERTEX = /* glsl */ `
  uniform vec2 crop;
  uniform vec2 cropFrom;
  varying vec2 vUv;
  varying vec2 vMapUv;
  void main() {
    vUv = uv;
    vMapUv = uv * crop + cropFrom;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 tint;
  uniform vec3 unhung;
  uniform float hung;
  uniform float saturation;
  uniform float warmth;
  uniform float level;
  uniform float edge;
  uniform float edgeFrom;
  varying vec2 vUv;
  varying vec2 vMapUv;
  void main() {
    vec3 colour = texture2D(map, vMapUv).rgb;
    float grey = dot(colour, vec3(0.2126, 0.7152, 0.0722));
    colour = mix(vec3(grey), colour, saturation) * mix(vec3(1.0), tint, warmth);
    float fromMiddle = length(vUv - 0.5) / 0.7071;
    colour *= level * (1.0 - edge * smoothstep(edgeFrom, 1.0, fromMiddle));
    gl_FragColor = vec4(mix(unhung, colour, hung), 1.0);
    #include <colorspace_fragment>
  }
`;

/** The portrait's surface: dark until its picture is hung, then the picture toned warm and muted with a soft dark edge. */
export function portraitMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      map: { value: null },
      crop: { value: new Vector2(1, 1) },
      cropFrom: { value: new Vector2(0, 0) },
      tint: { value: new Color(PORTRAIT_TONE.tint) },
      unhung: { value: new Color(UNHUNG) },
      hung: { value: 0 },
      saturation: { value: PORTRAIT_TONE.saturation },
      warmth: { value: PORTRAIT_TONE.warmth },
      level: { value: PORTRAIT_TONE.level },
      edge: { value: PORTRAIT_TONE.edge },
      edgeFrom: { value: PORTRAIT_TONE.edgeFrom },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
}

/** Hangs the photograph, cropped to the frame's proportions from its top like the works' pictures. */
export function hangPortrait(material: ShaderMaterial, picture: Texture, frameAspect: number, imageAspect?: number): void {
  coverFit(picture, frameAspect, imageAspect);
  material.uniforms["crop"].value.copy(picture.repeat);
  material.uniforms["cropFrom"].value.copy(picture.offset);
  material.uniforms["map"].value = picture;
  material.uniforms["hung"].value = 1;
}
