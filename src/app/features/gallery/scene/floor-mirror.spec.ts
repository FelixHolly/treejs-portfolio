import {
  BoxGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Scene,
  SpotLight,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { mirroredHeight, MIRROR_STRENGTH, StoneFloor } from "./floor";
import { FloorMirror, mirrorImageSize, obliqueNear } from "./floor-mirror";

const EYE_HEIGHT = 1.65;

/** A camera standing in the room, and the eye under the floor that takes its mirror image, cut off at the floor. */
function eyes() {
  const camera = new PerspectiveCamera(50, 1.8, 0.1, 80);
  camera.position.set(3, EYE_HEIGHT, 2);
  camera.lookAt(9, 0.9, -3);
  camera.updateMatrixWorld();

  const eye = new PerspectiveCamera(50, 1.8, 0.1, 2000);
  eye.matrixAutoUpdate = false;
  eye.matrix.copy(camera.matrixWorld).premultiply(new Matrix4().makeScale(1, -1, 1)).multiply(new Matrix4().makeScale(-1, 1, 1));
  eye.matrixWorldNeedsUpdate = true;
  eye.updateMatrixWorld();
  eye.updateProjectionMatrix();

  const { normal, constant } = new Plane(new Vector3(0, 1, 0), 0).applyMatrix4(eye.matrixWorldInverse);
  const scale = obliqueNear(eye.projectionMatrix, new Vector4(normal.x, normal.y, normal.z, constant));
  const seen = (point: Vector3) => point.clone().applyMatrix4(eye.matrixWorldInverse).applyMatrix4(eye.projectionMatrix);
  return { camera, eye, scale, seen };
}

describe("mirrorImageSize", () => {
  it("is half the picture's height", () => {
    expect(mirrorImageSize(1440, 790)).toEqual([720, 395]);
  });

  it("stops growing at 540 rows however large the picture is, and keeps its shape", () => {
    expect(mirrorImageSize(2576, 1308)).toEqual([1063, 540]);
    expect(mirrorImageSize(3840, 1938)).toEqual([1070, 540]);
  });

  it("is never empty", () => {
    expect(mirrorImageSize(0, 0)).toEqual([1, 1]);
    expect(mirrorImageSize(1, 3000)).toEqual([1, 540]);
  });
});

describe("obliqueNear", () => {
  it("draws what stands on the floor from the floor up: the floor itself is the nearest thing there is", () => {
    const { seen } = eyes();

    expect(seen(new Vector3(8, 0, -2)).z).toBeCloseTo(-1, 5);
    expect(seen(new Vector3(8, 1.2, -2)).z).toBeGreaterThan(-1);
    expect(seen(new Vector3(8, 1.2, -2)).z).toBeLessThan(1);
  });

  it("cuts off whatever reaches below the floor", () => {
    const { seen } = eyes();

    expect(seen(new Vector3(8, -0.3, -2)).z).toBeLessThan(-1);
  });

  it("leaves where things appear untouched", () => {
    const { eye, seen } = eyes();
    const plain = new PerspectiveCamera(eye.fov, eye.aspect, eye.near, eye.far);
    plain.updateProjectionMatrix();
    const point = new Vector3(7, 2, -1);
    const expected = point.clone().applyMatrix4(eye.matrixWorldInverse).applyMatrix4(plain.projectionMatrix);

    expect(seen(point).x).toBeCloseTo(expected.x, 6);
    expect(seen(point).y).toBeCloseTo(expected.y, 6);
  });

  it("cuts nothing off at the far side of what the camera can see above the floor", () => {
    const { eye, seen } = eyes();
    const plain = new PerspectiveCamera(eye.fov, eye.aspect, eye.near, 80);
    plain.updateProjectionMatrix();
    const unproject = plain.projectionMatrixInverse;
    let checked = 0;

    for (const x of [-0.98, -0.4, 0, 0.5, 0.98]) {
      for (const y of [-0.98, -0.3, 0.2, 0.98]) {
        for (const z of [0.9, 0.99, 0.9999]) {
          const point = new Vector3(x, y, z).applyMatrix4(unproject).applyMatrix4(eye.matrixWorld);
          if (point.y <= 0) continue;
          checked += 1;
          expect(seen(point).z).toBeLessThan(1);
        }
      }
    }
    expect(checked).toBeGreaterThan(15);
  });
});

describe("mirroredHeight", () => {
  it("tells from the mirror image's depth how high above the floor the mirrored thing stands", () => {
    const { camera, scale, seen } = eyes();
    const under = new Vector3(camera.position.x, -EYE_HEIGHT, camera.position.z);

    for (const height of [0.05, 0.4, 1.8, 4.5]) {
      const thing = new Vector3(8.5, height, -2.5);
      // The spot of floor the thing is mirrored in lies on the line from the eye under the floor to the thing
      const spot = under.clone().lerp(thing, EYE_HEIGHT / (EYE_HEIGHT + height));
      const reach = -spot.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const depth = (seen(thing).z + 1) / 2;

      expect(mirroredHeight(depth, reach, EYE_HEIGHT, scale)).toBeCloseTo(height, 3);
    }
  });

  it("takes what lies on the floor for no height at all", () => {
    expect(mirroredHeight(0, 6, EYE_HEIGHT, 3)).toBe(0);
  });

  it("stays finite where the image shows nothing but the far dark", () => {
    const height = mirroredHeight(1, 30, EYE_HEIGHT, 2);

    expect(Number.isFinite(height)).toBeTrue();
    expect(height).toBeGreaterThan(100);
  });
});

// Drawn for real: what is pinned here is what three.js draws and holds, which no fake would know.
describe("FloorMirror", () => {
  const canDraw = !!document.createElement("canvas").getContext("webgl2");
  let renderer: WebGLRenderer;
  let scene: Scene;
  let camera: PerspectiveCamera;
  let floor: StoneFloor;
  let mirror: FloorMirror;
  let draws: jasmine.Spy;

  const held = () => renderer.info.memory.textures;
  /** Frames at sixty a second until the mirror asks for no more; returns how many it took. */
  const settle = async () => {
    for (let frame = 1; frame <= 400; frame++) {
      if (!mirror.render(renderer, scene, camera, 1 / 60)) return frame;
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    return Infinity;
  };

  beforeEach(() => {
    if (!canDraw) pending("needs WebGL");
    renderer = new WebGLRenderer({ canvas: document.createElement("canvas") });
    renderer.setSize(64, 36, false);
    if (!renderer.extensions.has("EXT_color_buffer_float")) pending("needs a float image to draw into");

    scene = new Scene();
    camera = new PerspectiveCamera(50, 64 / 36, 0.1, 80);
    camera.position.set(0, EYE_HEIGHT, 5);
    camera.lookAt(0, 0.5, 0);
    floor = new StoneFloor();
    const slab = new Mesh(new PlaneGeometry(10, 10), floor);
    slab.rotation.x = -Math.PI / 2;
    const box = new Mesh(new BoxGeometry(), new MeshLambertMaterial({ color: 0xff0000 }));
    box.position.y = 0.5;
    const light = new SpotLight(0xffffff, 50);
    light.position.set(2, 5, 2);
    scene.add(slab, box, light, light.target);

    mirror = new FloorMirror(floor);
    renderer.render(scene, camera);
    draws = spyOn(renderer, "render").and.callThrough();
  });

  afterEach(() => {
    mirror?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  });

  describe("while it is off", () => {
    it("starts off", () => {
      expect(mirror.enabled).toBeFalse();
    });

    it("draws nothing, holds nothing and asks for no frame", () => {
      const before = held();

      expect(mirror.render(renderer, scene, camera, 1 / 60)).toBeFalse();

      expect(draws).not.toHaveBeenCalled();
      expect(held()).toBe(before);
      expect(floor.mirror.mirrorStrength.value).toBe(0);
    });
  });

  describe("while it is on", () => {
    beforeEach(() => {
      mirror.enabled = true;
    });

    it("draws the room once for every frame it is asked to, never by itself", async () => {
      await settle();
      draws.calls.reset();

      mirror.render(renderer, scene, camera, 1 / 60);
      mirror.render(renderer, scene, camera, 1 / 60);

      expect(draws).toHaveBeenCalledTimes(2);
      expect(draws.calls.allArgs().every(([drawn]) => drawn === scene)).toBeTrue();
    });

    it("draws it from the camera's place under the floor, and hands the picture back to the screen", async () => {
      await settle();
      draws.calls.reset();

      mirror.render(renderer, scene, camera, 1 / 60);

      const eye = draws.calls.mostRecent().args[1] as PerspectiveCamera;
      const at = new Vector3().setFromMatrixPosition(eye.matrixWorld);
      expect(at.x).toBeCloseTo(camera.position.x, 6);
      expect(at.y).toBeCloseTo(-camera.position.y, 6);
      expect(at.z).toBeCloseTo(camera.position.z, 6);
      expect(eye.matrixWorld.determinant()).toBeGreaterThan(0);
      expect(renderer.getRenderTarget()).toBeNull();
    });

    it("keeps the floor out of its own mirror image and shows it again afterwards", async () => {
      const shown: boolean[] = [];
      draws.and.callFake(() => shown.push(floor.visible));

      await settle();

      expect(shown.length).toBeGreaterThan(0);
      expect(shown.every((visible) => !visible)).toBeTrue();
      expect(floor.visible).toBeTrue();
    });

    it("gives the floor an image and its depth, half the picture's size", async () => {
      await settle();

      const image = floor.mirror.mirrorMap.value?.image as { width: number; height: number };
      expect([image.width, image.height]).toEqual(mirrorImageSize(64, 36));
      expect(floor.mirror.mirrorDepth.value).toBeTruthy();
      expect(floor.mirror.mirrorSize.value.toArray()).toEqual([64, 36]);
      expect(floor.mirror.mirrorScale.value).toBeGreaterThan(0);
    });

    it("follows the picture when its size changes", async () => {
      await settle();
      renderer.setSize(128, 72, false);

      mirror.render(renderer, scene, camera, 1 / 60);

      const image = floor.mirror.mirrorMap.value?.image as { width: number; height: number };
      expect([image.width, image.height]).toEqual(mirrorImageSize(128, 72));
      expect(floor.mirror.mirrorSize.value.toArray()).toEqual([128, 72]);
    });

    it("brings the image up over most of a second, never in one frame", async () => {
      const strengths: number[] = [];
      for (let frame = 0; frame < 400; frame++) {
        const more = mirror.render(renderer, scene, camera, 1 / 60);
        if (draws.calls.count() > 0) strengths.push(floor.mirror.mirrorStrength.value);
        if (!more) break;
        await new Promise((resolve) => setTimeout(resolve, 2));
      }

      expect(strengths[0]).toBeGreaterThan(0);
      expect(strengths[0]).toBeLessThan(MIRROR_STRENGTH / 20);
      expect(strengths.length).toBeGreaterThan(30);
      expect(strengths.length).toBeLessThan(60);
      expect(strengths[strengths.length - 1]).toBe(MIRROR_STRENGTH);
    });

    it("asks for frames only until the image is up: a still gallery then draws nothing", async () => {
      expect(mirror.render(renderer, scene, camera, 1 / 60)).toBeTrue();

      expect(await settle()).toBeLessThan(400);

      expect(mirror.render(renderer, scene, camera, 1 / 60)).toBeFalse();
      expect(mirror.render(renderer, scene, camera, 0)).toBeFalse();
    });

    it("readies the shaders for drawing into the image before it draws with them", async () => {
      const shaders = () => renderer.info.programs?.length ?? 0;
      const before = shaders();

      mirror.render(renderer, scene, camera, 1 / 60);

      expect(shaders()).toBeGreaterThan(before);
      const warmed = shaders();
      await settle();
      expect(shaders()).toBe(warmed);
    });

    it("readies the shaders of what joins the scene later, and keeps its image meanwhile", async () => {
      await settle();
      const shaders = renderer.info.programs?.length ?? 0;
      const image = floor.mirror.mirrorMap.value;
      const arrival = new Mesh(new BoxGeometry(), new MeshBasicMaterial({ color: 0x00ff00 }));
      renderer.compile(arrival, camera, scene);
      const forTheScreen = (renderer.info.programs?.length ?? 0) - shaders;
      scene.add(arrival);

      mirror.render(renderer, scene, camera, 1 / 60);

      expect(renderer.info.programs?.length).toBe(shaders + forTheScreen * 2);
      expect(floor.mirror.mirrorMap.value).toBe(image);
      expect(floor.mirror.mirrorStrength.value).toBe(MIRROR_STRENGTH);
      expect(await settle()).toBeLessThan(400);
    });
  });

  describe("switched off again", () => {
    let before: number;

    beforeEach(async () => {
      before = held();
      mirror.enabled = true;
      await settle();
      draws.calls.reset();
    });

    it("takes the image out of the floor at once", () => {
      mirror.enabled = false;

      expect(floor.mirror.mirrorStrength.value).toBe(0);
      expect(floor.mirror.mirrorMap.value).toBeNull();
      expect(floor.mirror.mirrorDepth.value).toBeNull();
    });

    it("frees what it held and draws no more", () => {
      expect(held()).toBeGreaterThan(before);

      mirror.enabled = false;

      expect(held()).toBe(before);
      expect(mirror.render(renderer, scene, camera, 1 / 60)).toBeFalse();
      expect(draws).not.toHaveBeenCalled();
      expect(held()).toBe(before);
    });

    it("comes up again from nothing when switched back on", async () => {
      mirror.enabled = false;
      mirror.enabled = true;

      expect(mirror.render(renderer, scene, camera, 1 / 60)).toBeTrue();
      expect(floor.mirror.mirrorStrength.value).toBeLessThan(MIRROR_STRENGTH / 20);
      await settle();
      expect(floor.mirror.mirrorStrength.value).toBe(MIRROR_STRENGTH);
    });

    it("is switched off by dispose", () => {
      mirror.dispose();

      expect(mirror.enabled).toBeFalse();
      expect(held()).toBe(before);
    });
  });
});
