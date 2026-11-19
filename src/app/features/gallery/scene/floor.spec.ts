import {
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderLib,
  WebGLProgramParametersWithUniforms,
  WebGLRenderer,
} from "three";
import { MIRROR_STRENGTH, StoneFloor, stoneTexture } from "./floor";

function pixels(): { data: Uint8ClampedArray; size: number } {
  const canvas = stoneTexture().image as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d context");
  return { data: context.getImageData(0, 0, canvas.width, canvas.height).data, size: canvas.width };
}

describe("stoneTexture", () => {
  it("is small, repeats in both directions and is read as plain numbers, not as a colour", () => {
    const texture = stoneTexture();
    const canvas = texture.image as HTMLCanvasElement;

    expect(canvas.width * canvas.height).toBeLessThanOrEqual(256 * 256);
    expect(texture.wrapS).toBe(RepeatWrapping);
    expect(texture.wrapT).toBe(RepeatWrapping);
    expect(texture.colorSpace).toBe(NoColorSpace);
  });

  it("clouds the stone both lighter and darker around a middle grey, and only a little", () => {
    const { data, size } = pixels();
    const greys = Array.from({ length: size * size }, (_, index) => data[index * 4]);
    const mean = greys.reduce((sum, grey) => sum + grey, 0) / greys.length;

    expect(mean).toBeGreaterThan(112);
    expect(mean).toBeLessThan(144);
    expect(Math.min(...greys)).toBeLessThan(mean - 8);
    expect(Math.max(...greys)).toBeGreaterThan(mean + 8);
    expect(Math.min(...greys)).toBeGreaterThan(40);
    expect(Math.max(...greys)).toBeLessThan(230);
  });

  it("meets itself at its edges, so no seam shows where it repeats", () => {
    const { data, size } = pixels();
    const grey = (x: number, y: number) => data[(y * size + x) * 4];
    const step = (ax: number, ay: number, bx: number, by: number) => Math.abs(grey(ax, ay) - grey(bx, by));
    let across = 0;
    let inside = 0;
    for (let along = 0; along < size; along++) {
      across += step(size - 1, along, 0, along) + step(along, size - 1, along, 0);
      inside += step(size / 2 - 1, along, size / 2, along) + step(along, size / 2 - 1, along, size / 2);
    }

    expect(across / (size * 2)).toBeLessThan(inside / (size * 2) + 1.5);
  });

  it("comes out the same on every visit", () => {
    expect(Array.from(pixels().data.slice(0, 4000))).toEqual(Array.from(pixels().data.slice(0, 4000)));
  });
});

describe("StoneFloor", () => {
  const compiled = (floor: StoneFloor) => {
    const shader = {
      uniforms: {},
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
    } as WebGLProgramParametersWithUniforms;
    floor.onBeforeCompile(shader);
    return shader;
  };

  it("is the dark, fairly smooth stone the floor was, lit like everything else", () => {
    const floor = new StoneFloor();

    expect(floor).toBeInstanceOf(MeshStandardMaterial);
    expect(floor.color.getHex()).toBe(0x2b2b30);
    expect(floor.roughness).toBeLessThan(0.5);
    expect(floor.metalness).toBe(0);
  });

  it("holds its clouding as its map, which the scene's clean-up frees with it", () => {
    expect(new StoneFloor().map).toBeTruthy();
  });

  it("mirrors nothing until it is handed an image", () => {
    const { mirror } = new StoneFloor();

    expect(mirror.mirrorStrength.value).toBe(0);
    expect(mirror.mirrorMap.value).toBeNull();
    expect(mirror.mirrorDepth.value).toBeNull();
  });

  it("never gives back more than a fifth of what it mirrors", () => {
    expect(MIRROR_STRENGTH).toBeGreaterThanOrEqual(0.1);
    expect(MIRROR_STRENGTH).toBeLessThanOrEqual(0.2);
  });

  it("hands the shader its own mirror settings, so a change shows without compiling again", () => {
    const floor = new StoneFloor();
    const shader = compiled(floor);

    for (const [name, uniform] of Object.entries(floor.mirror)) expect(shader.uniforms[name]).toBe(uniform);
  });

  it("finds every place in three's shader it writes into", () => {
    const { vertexShader, fragmentShader } = compiled(new StoneFloor());

    expect(vertexShader).toContain("vFloorWorld = ");
    expect(fragmentShader).not.toContain("#include <map_fragment>");
    expect(fragmentShader).toContain("diffuseColor.rgb *=");
    expect(fragmentShader).toContain("roughnessFactor = clamp(");
    expect(fragmentShader.indexOf("mirrorStrength > 0.0")).toBeLessThan(fragmentShader.indexOf("#include <opaque_fragment>"));
    expect(fragmentShader.indexOf("mirrorStrength > 0.0")).toBeGreaterThan(fragmentShader.indexOf("vec3 outgoingLight"));
  });

  it("lays the stone out in the building's metres, so two slabs of floor are one stone", () => {
    expect(compiled(new StoneFloor()).fragmentShader).toContain("texture2D(map, vFloorWorld.xz");
  });

  it("is told apart from a plain material that happens to have the same settings", () => {
    expect(new StoneFloor().customProgramCacheKey()).not.toBe(new MeshStandardMaterial().customProgramCacheKey());
  });

  it("compiles and draws", () => {
    if (!document.createElement("canvas").getContext("webgl2")) pending("needs WebGL");
    const renderer = new WebGLRenderer({ canvas: document.createElement("canvas") });
    renderer.setSize(16, 16, false);
    const failed = jasmine.createSpy("shader error");
    renderer.debug.onShaderError = failed;
    const scene = new Scene();
    const slab = new Mesh(new PlaneGeometry(4, 4), new StoneFloor());
    slab.rotation.x = -Math.PI / 2;
    scene.add(slab);
    const camera = new PerspectiveCamera(50, 1, 0.1, 50);
    camera.position.set(0, 1.6, 3);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    expect(failed).not.toHaveBeenCalled();
    expect(renderer.info.render.triangles).toBe(2);
    renderer.dispose();
    renderer.forceContextLoss();
  });
});
