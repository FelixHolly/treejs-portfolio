import {
  BoxGeometry,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  ShaderLib,
  WebGLProgramParametersWithUniforms,
  WebGLRenderer,
} from "three";
import { Gilt, SHEEN } from "./gilt";

describe("Gilt", () => {
  const compiled = (gilt: Gilt) => {
    const shader = {
      uniforms: {},
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
    } as WebGLProgramParametersWithUniforms;
    gilt.onBeforeCompile(shader);
    return shader;
  };

  it("is the gallery's gold, a metal lit like everything else", () => {
    const gilt = new Gilt();

    expect(gilt).toBeInstanceOf(MeshStandardMaterial);
    expect(gilt.color.getHex()).toBe(0xc7a44a);
    expect(gilt.roughness).toBeCloseTo(0.38, 6);
    expect(gilt.metalness).toBeCloseTo(0.65, 6);
  });

  it("glints until it is told not to, and again when it is told to", () => {
    const gilt = new Gilt();
    const { uniforms } = compiled(gilt);

    expect(gilt.glints).toBeTrue();
    expect(uniforms["giltSheen"].value).toBe(SHEEN);

    gilt.glints = false;
    expect(gilt.glints).toBeFalse();
    expect(uniforms["giltSheen"].value).toBe(0);

    gilt.glints = true;
    expect(uniforms["giltSheen"].value).toBe(SHEEN);
  });

  it("gives back less than half its own colour at the glint's brightest", () => {
    expect(SHEEN).toBeGreaterThan(0.2);
    expect(SHEEN).toBeLessThan(0.5);
  });

  it("adds the glint to the light it already has, just before the colour is written out", () => {
    const { fragmentShader } = compiled(new Gilt());
    const glint = fragmentShader.indexOf("giltSheen > 0.0");

    expect(fragmentShader).toContain("uniform float giltSheen;");
    expect(glint).toBeGreaterThan(fragmentShader.indexOf("vec3 outgoingLight"));
    expect(glint).toBeLessThan(fragmentShader.indexOf("#include <opaque_fragment>"));
    expect(fragmentShader).toContain("outgoingLight += diffuseColor.rgb * giltSheen");
  });

  it("works the glint out from where the visitor stands, so it moves as they do", () => {
    const { fragmentShader } = compiled(new Gilt());

    expect(fragmentShader).toContain("reflect(-normalize(vViewPosition), normal)");
    expect(fragmentShader).toContain("inverseTransformDirection");
  });

  it("is told apart from a plain material that happens to have the same settings", () => {
    expect(new Gilt().customProgramCacheKey()).not.toBe(new MeshStandardMaterial().customProgramCacheKey());
  });

  it("compiles and draws", () => {
    if (!document.createElement("canvas").getContext("webgl2")) pending("needs WebGL");
    const renderer = new WebGLRenderer({ canvas: document.createElement("canvas") });
    renderer.setSize(16, 16, false);
    const failed = jasmine.createSpy("shader error");
    renderer.debug.onShaderError = failed;
    const scene = new Scene();
    scene.add(new Mesh(new BoxGeometry(1, 1, 1), new Gilt()), new HemisphereLight(0xffffff, 0x222222, 2));
    const camera = new PerspectiveCamera(50, 1, 0.1, 50);
    camera.position.set(1, 1.6, 3);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    expect(failed).not.toHaveBeenCalled();
    expect(renderer.info.render.triangles).toBe(12);
    renderer.dispose();
    renderer.forceContextLoss();
  });
});
