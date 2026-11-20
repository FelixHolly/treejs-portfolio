import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, WebGLRenderer } from "three";
import { loadLion } from "../../../../../shared/scene/lion";
import { MOTES } from "./hero-atmosphere";
import { FRAME, HeroScene, STATUE } from "./hero-scene";
import { LIFT, TURN } from "./hero-view";

const FRAME_MS = 16;
/** The longest stride the scene counts in full. */
const STRIDE_MS = 250;

// Drawn for real, on a small canvas: what is pinned here is when the scene asks for frames, which only its own loop knows.
describe("HeroScene", () => {
  const canDraw = !!document.createElement("canvas").getContext("webgl2");
  let canvas: HTMLCanvasElement;
  let scene: HeroScene | undefined;
  let ready: jasmine.Spy;
  let lost: jasmine.Spy;
  let cancelLoad: jasmine.Spy;
  let stand: Parameters<typeof loadLion>[1] | undefined;
  let deliver: (lion: Group) => void;
  let fail: () => void;
  let frames: Map<number, FrameRequestCallback>;
  let now: number;

  const inner = () => scene as unknown as { camera: PerspectiveCamera; renderer: WebGLRenderer };
  /** The camera's place on its arc round the statue, in radians. */
  const turned = () => Math.atan2(-inner().camera.position.z, -inner().camera.position.x);

  function step(ms = FRAME_MS, count = 1): void {
    for (let index = 0; index < count; index++) {
      now += ms;
      const due = [...frames.values()];
      frames.clear();
      for (const frame of due) frame(now);
    }
  }

  function wait(seconds: number): void {
    step(STRIDE_MS, Math.round((seconds * 1000) / STRIDE_MS));
  }

  async function until(condition: () => boolean): Promise<void> {
    for (let tries = 0; tries < 400 && !condition(); tries++) await new Promise((resolve) => setTimeout(resolve, 5));
  }

  function lion(): Group {
    const body = new Mesh(new BoxGeometry(1, STATUE.height, 1), new MeshStandardMaterial());
    body.castShadow = true;
    return new Group().add(body);
  }

  /** Opens the scene on a display of that pace, watched to the end so that every frame asked for after is the scene's own. */
  function open(displayMs = FRAME_MS): void {
    scene = new HeroScene(canvas, { assets: { dracoPath: "draco/", lionModel: "lion.glb" }, onReady: ready, onLost: lost }, (_assets, where, onReady, onFail) => {
      stand = where;
      deliver = onReady;
      fail = onFail;
      return cancelLoad;
    });
    step(displayMs, 30);
  }

  async function unveil(): Promise<void> {
    deliver(lion());
    await until(() => frames.size > 0);
    step();
  }

  beforeEach(() => {
    if (!canDraw) pending("needs WebGL");
    canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:96px;height:64px";
    document.body.appendChild(canvas);
    ready = jasmine.createSpy("onReady");
    lost = jasmine.createSpy("onLost");
    cancelLoad = jasmine.createSpy("cancelLoad");
    stand = undefined;

    frames = new Map();
    now = 1000;
    let nextFrame = 1;
    spyOn(window, "requestAnimationFrame").and.callFake((frame) => {
      frames.set(nextFrame, frame);
      return nextFrame++;
    });
    spyOn(window, "cancelAnimationFrame").and.callFake((id) => void frames.delete(id));
    spyOn(performance, "now").and.callFake(() => now);
  });

  afterEach(() => {
    scene?.dispose();
    scene = undefined;
    canvas.remove();
  });

  describe("before the statue has come", () => {
    beforeEach(() => open());

    it("stands it on the gallery's plinth, at the gallery's height and turn", () => {
      expect(stand).toEqual({ height: 2.7, at: [0, 1, 0], yaw: Math.PI - 0.35 });
    });

    it("draws nothing and says nothing", () => {
      scene!.setPointer(0.5, 0);
      scene!.setScroll(0.2);

      expect(frames.size).toBe(0);
      expect(ready).not.toHaveBeenCalled();
      expect(lost).not.toHaveBeenCalled();
    });

    it("is lost when the statue cannot be fetched, and says so once", () => {
      fail();
      canvas.dispatchEvent(new Event("webglcontextlost"));

      expect(lost).toHaveBeenCalledTimes(1);
      expect(ready).not.toHaveBeenCalled();
    });

    it("comes up all the same when its shaders cannot be made ahead of the first frame", async () => {
      spyOn(inner().renderer, "compileAsync").and.throwError("no compiling ahead");

      await unveil();

      expect(ready).toHaveBeenCalledTimes(1);
      expect(lost).not.toHaveBeenCalled();
    });
  });

  describe("once the statue stands", () => {
    beforeEach(async () => {
      open();
      await unveil();
    });

    it("is ready after its first frame, and says so once", () => {
      expect(ready).toHaveBeenCalledTimes(1);

      step(FRAME_MS, 10);

      expect(ready).toHaveBeenCalledTimes(1);
    });

    it("leaves the canvas alone when asked to fit the size it already has", () => {
      const refit = spyOn(inner().renderer, "setDrawingBufferSize").and.callThrough();

      scene!.resize(0.3);
      scene!.resize(0.4);

      expect(refit).not.toHaveBeenCalled();
    });

    it("follows the canvas when it changes size, without stretching the picture", () => {
      canvas.style.width = "120px";
      canvas.style.height = "60px";

      scene!.resize(0.3);

      expect(canvas.width).toBe(Math.floor(120 * Math.min(window.devicePixelRatio, 2)));
      expect(inner().camera.aspect).toBe(2);
    });

    it("draws again in the same breath, so the canvas a resize has emptied is never shown", () => {
      const draw = spyOn(inner().renderer, "render").and.callThrough();
      canvas.style.width = "120px";

      scene!.resize(0.3);

      expect(draw).toHaveBeenCalledTimes(1);
    });

    it("draws no more than a full-HD window's pixels twice over, however large the canvas", () => {
      canvas.style.width = "3000px";
      canvas.style.height = "2000px";

      scene!.resize(0.3);

      expect(canvas.width * canvas.height).toBeLessThanOrEqual(1920 * 1080 * 2);
      expect(canvas.width / canvas.height).toBeCloseTo(1.5, 2);
    });

    it("is lost when the graphics context goes", () => {
      canvas.dispatchEvent(new Event("webglcontextlost"));

      expect(lost).toHaveBeenCalledTimes(1);
    });
  });

  describe("on a screen of two pixels to the point", () => {
    beforeEach(async () => {
      spyOnProperty(window, "devicePixelRatio").and.returnValue(2);
      open();
      await unveil();
    });

    it("fills the canvas at the screen's own pixel ratio", () => {
      expect(canvas.width).toBe(192);
      expect(canvas.height).toBe(128);
    });

    it("steps the pixel ratio down when frames are late, and is lost only when they stay late at the lowest", () => {
      step(60, 40);
      expect(canvas.width).toBe(96);
      expect(lost).not.toHaveBeenCalled();

      step(60, 40);

      expect(lost).toHaveBeenCalledTimes(1);
    });

    it("settles at the lowest ratio, and is not lost, for frames that are late but still watchable", () => {
      step(30, 400);

      expect(canvas.width).toBe(96);
      expect(lost).not.toHaveBeenCalled();
    });

    it("does not hold the stumbles of its own start against the device", () => {
      step(60, 14);
      step(FRAME_MS, 200);

      expect(canvas.width).toBe(192);
      expect(lost).not.toHaveBeenCalled();
    });

    it("keeps its ratio through a hitch or two among quick frames", () => {
      step(FRAME_MS, 80);
      step(240);
      step(FRAME_MS, 80);
      step(240);
      step(FRAME_MS, 80);

      expect(canvas.width).toBe(192);
      expect(lost).not.toHaveBeenCalled();
    });
  });

  // Time passes here in the longest strides the scene counts in full. The display is opened at that pace too,
  // so the strides are its own and are not held against the scene.
  describe("as time passes", () => {
    beforeEach(async () => {
      open(STRIDE_MS);
      await unveil();
    });

    afterEach(() => expect(lost).not.toHaveBeenCalled());

    it("starts from where the still picture was taken, whatever the mouse and the scroll already ask", () => {
      scene!.setPointer(1, 1);
      scene!.setScroll(0.5);

      step(FRAME_MS, 40);

      expect(inner().camera.position.toArray()).toEqual([-FRAME.back, FRAME.eye, -0]);
    });

    it("then walks round towards the mouse and the scroll, and comes to rest there", () => {
      scene!.setPointer(1, -1);
      scene!.setScroll(0.5);

      wait(8);

      expect(turned()).toBeCloseTo(TURN.pointer + TURN.scroll / 2, 3);
      expect(inner().camera.position.y).toBeCloseTo(FRAME.eye - LIFT, 3);
      expect(Math.hypot(inner().camera.position.x, inner().camera.position.z)).toBeCloseTo(FRAME.back, 6);
    });

    it("walks back when the mouse returns to the middle", () => {
      scene!.setPointer(-1, 0);
      wait(8);
      expect(turned()).toBeCloseTo(-TURN.pointer, 3);

      scene!.setPointer(0, 0);
      wait(8);

      expect(turned()).toBeCloseTo(0, 3);
    });

    it("keeps drawing while the dust drifts, and stops once the visitor has been still for a minute", () => {
      wait(MOTES.idleAfter - 1);
      expect(frames.size).toBe(1);

      wait(MOTES.settles + 2);

      expect(frames.size).toBe(0);
    });

    it("draws again as soon as the visitor stirs", () => {
      wait(MOTES.idleAfter + MOTES.settles + 2);
      expect(frames.size).toBe(0);

      scene!.setPointer(0.2, 0);
      expect(frames.size).toBe(1);

      wait(MOTES.idleAfter + MOTES.settles + 2);
      scene!.setScroll(0.1);
      expect(frames.size).toBe(1);
    });

    it("draws nothing while paused, and carries on after", () => {
      scene!.setPaused(true);
      expect(frames.size).toBe(0);

      scene!.setPointer(0.4, 0);
      scene!.setScroll(0.3);
      expect(frames.size).toBe(0);

      scene!.setPaused(false);
      expect(frames.size).toBe(1);
    });
  });

  describe("taken down", () => {
    it("asks for no more frames, gives the graphics context back, and is not thereby lost", async () => {
      open();
      await unveil();

      scene!.dispose();
      scene!.setPointer(1, 0);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(frames.size).toBe(0);
      expect(cancelLoad).toHaveBeenCalledTimes(1);
      expect(canvas.getContext("webgl2")?.isContextLost()).toBeTrue();
      expect(lost).not.toHaveBeenCalled();
      scene = undefined;
    });

    it("waits for shaders still being made before it lets the renderer go, and stays down after", async () => {
      open();
      const released = spyOn(inner().renderer, "forceContextLoss").and.callThrough();
      deliver(lion());

      scene!.dispose();
      scene = undefined;
      expect(released).not.toHaveBeenCalled();
      await until(() => released.calls.any());

      expect(released).toHaveBeenCalledTimes(1);
      expect(frames.size).toBe(0);
      expect(ready).not.toHaveBeenCalled();
      expect(lost).not.toHaveBeenCalled();
    });
  });
});
