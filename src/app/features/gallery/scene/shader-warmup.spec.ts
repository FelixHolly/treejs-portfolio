import {
  BoxGeometry,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SpotLight,
  WebGLRenderer,
} from "three";
import { ShaderWarmup } from "./shader-warmup";

// Drawn for real: what is pinned here is how three.js keys and reuses its shaders, which no fake would know.
describe("ShaderWarmup", () => {
  const canDraw = !!document.createElement("canvas").getContext("webgl2");
  let renderer: WebGLRenderer;
  let scene: Scene;
  let camera: PerspectiveCamera;
  let light: SpotLight;

  const shaders = () => renderer.info.programs?.length ?? 0;
  const draw = () => renderer.render(scene, camera);
  const box = (material: MeshLambertMaterial | MeshStandardMaterial | MeshBasicMaterial, x = 0) => {
    const mesh = new Mesh(new BoxGeometry(), material);
    mesh.position.set(x, 0.5, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  /** Compiles for the light with its shadow off, the way the scene does, and leaves the light as it was. */
  const warmWithoutShadow = (root: Scene | Mesh = scene, warmup = new ShaderWarmup(renderer, scene, camera)) => {
    light.castShadow = false;
    warmup.add(root);
    light.castShadow = true;
    return warmup;
  };
  const finish = async (warmup: ShaderWarmup) => {
    for (let frame = 0; frame < 500 && !warmup.done(); frame++) await new Promise((resolve) => setTimeout(resolve, 5));
  };

  beforeEach(() => {
    if (!canDraw) pending("needs WebGL");
    renderer = new WebGLRenderer({ canvas: document.createElement("canvas") });
    renderer.setSize(32, 32, false);
    renderer.shadowMap.enabled = true;

    scene = new Scene();
    camera = new PerspectiveCamera(50, 1, 0.1, 50);
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 0, 0);
    light = new SpotLight(0xffffff, 50);
    light.position.set(2, 5, 2);
    light.castShadow = true;

    const floor = new Mesh(new PlaneGeometry(8, 8), new MeshStandardMaterial());
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(light, light.target, floor, box(new MeshLambertMaterial(), -1), box(new MeshBasicMaterial(), 1));
    draw();
  });

  afterEach(() => {
    renderer?.dispose();
    renderer?.forceContextLoss();
  });

  it("shows why it is needed: dropping a shadow compiles every lit material again, on the spot", () => {
    const before = shaders();

    light.castShadow = false;
    draw();

    expect(shaders() - before).toBe(2);
  });

  it("compiles a shader for each lit material and none for an unlit one", () => {
    const before = shaders();

    warmWithoutShadow();

    expect(shaders() - before).toBe(2);
  });

  it("goes on drawing with the shaders it had while the new ones are made", () => {
    warmWithoutShadow();
    const afterWarmup = shaders();

    draw();

    expect(shaders()).toBe(afterWarmup);
  });

  it("leaves the frame that drops the shadow nothing to compile", async () => {
    const warmup = warmWithoutShadow();
    await finish(warmup);
    const ready = shaders();

    light.castShadow = false;
    draw();

    expect(warmup.done()).toBeTrue();
    expect(shaders()).toBe(ready);
  });

  it("readies no more than one shader a call", () => {
    const warmup = warmWithoutShadow();

    expect(warmup.done()).toBeFalse();
  });

  it("compiles in one pass, with one stand-in for each lit material however many surfaces share it", () => {
    const shared = new MeshLambertMaterial({ flatShading: true });
    scene.add(box(shared, -2), box(shared, 2));
    draw();
    const compile = spyOn(renderer, "compile").and.callThrough();

    warmWithoutShadow();

    expect(compile).toHaveBeenCalledTimes(1);
    expect(compile.calls.mostRecent().args[0].children.length).toBe(3);
    expect(compile.calls.mostRecent().args[0].parent).toBeNull();
  });

  it("takes in a part of the scene that arrives while it is still at work", async () => {
    const warmup = warmWithoutShadow();
    const stone = new DataTexture(new Uint8Array([200, 180, 140, 255]), 1, 1);
    stone.needsUpdate = true;
    const statue = box(new MeshStandardMaterial({ map: stone }), 3);
    scene.add(statue);
    draw();
    const before = shaders();

    warmWithoutShadow(statue, warmup);
    expect(shaders() - before).toBe(1);

    await finish(warmup);
    const ready = shaders();
    light.castShadow = false;
    draw();

    expect(shaders()).toBe(ready);
  });

  it("has nothing to wait for where nothing is lit", () => {
    const unlit = new Scene();
    unlit.add(box(new MeshBasicMaterial()));
    const before = shaders();
    const warmup = new ShaderWarmup(renderer, scene, camera);

    warmup.add(unlit);

    expect(warmup.done()).toBeTrue();
    expect(shaders()).toBe(before);
  });

  it("uploads nothing of its own", () => {
    const before = { ...renderer.info.memory };

    warmWithoutShadow();
    draw();

    expect(renderer.info.memory).toEqual(before);
  });
});
