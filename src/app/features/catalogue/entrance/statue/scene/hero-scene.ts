import {
  ACESFilmicToneMapping,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  HemisphereLight,
  Material,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SpotLight,
  SRGBColorSpace,
  Texture,
  Vector2,
  WebGLRenderer,
} from "three";
import { loadLion } from "../../../../../shared/scene/lion";
import { QualityController, QualityTier } from "../../../../../shared/scene/quality";
import { Motes, PaintedLight } from "./hero-atmosphere";
import { HeroView, HeroViewOptions, levelFor, liftFor, turnFor } from "./hero-view";

const BACKGROUND = 0x141417;
/** A full-HD window's pixels twice over, which keeps the canvas as sharp as the still it replaces on a 2x screen. */
const MAX_DRAWN_PIXELS = 1920 * 1080 * 2;
/** The statue's shadow is drawn once and never again, which leaves the pixel ratio as the one thing to step down. */
const LADDER: readonly QualityTier[] = [2, 1.5, 1.25, 1].map((pixelRatio) => ({ pixelRatio, statueShadow: true, reflections: false }));
/** Bare frames watched at the start for the display's own pace, the fastest any quality could reach. */
const DISPLAY_FRAMES = 20;
/** One frame moves the scene on by no more than this, however long the page stalled. */
const STALL_SECONDS = 0.25;

/** The statue and its plinth, as the gallery's hall stands them. */
export const STATUE = { height: 2.7, plinth: 1, drum: 1.4, yaw: Math.PI - 0.35 } as const;
/** The picture's frame: the visitor's eye, how far back it is, and the height its `tall` metres at the statue are centred on. */
export const FRAME = { eye: 1.65, back: 7, aim: 3.2, tall: 6.24 } as const;
/** Higher is a quicker walk round the statue towards where the mouse and the scroll ask. */
const EASE = 2.4;
/** The scene first holds the still picture's pose, in seconds, then eases into following the visitor. */
const HOLD = { from: 0.9, to: 2.4 } as const;

const AMBER = 0xffd9a0;
const COOL = 0x9fb2d0;
const KEY = { from: [-4.4, 6.6, -3.6], to: [0, 2.5, 0], angle: 0.44, strength: 560 } as const;
const RIM = { from: [1.6, 4.6, 4.8], to: [0, 2.6, 0], angle: 0.46, strength: 330 } as const;
const AMBIENT = 1.9;

function spot(from: readonly [number, number, number], to: readonly [number, number, number], angle: number, color: number): SpotLight {
  const light = new SpotLight(color, 0, 18, angle, 0.75, 2);
  light.position.set(...from);
  light.target.position.set(...to);
  return light;
}

/** Built as the gallery's hall builds its own: the two views must show the same drum. */
function pedestal(): Group {
  const stone = new MeshStandardMaterial({ color: 0x33312e, roughness: 0.6, metalness: 0 });
  const gold = new MeshStandardMaterial({ color: 0xc7a44a, roughness: 0.38, metalness: 0.65 });
  const top = STATUE.plinth;
  const drum = (radius: number, height: number, y: number, material: Material) => {
    const mesh = new Mesh(new CylinderGeometry(radius, radius, height, 64), material);
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const group = new Group();
  group.add(
    drum(STATUE.drum + 0.2, 0.18, 0.09, stone),
    drum(STATUE.drum, top - 0.26, 0.18 + (top - 0.26) / 2, stone),
    drum(STATUE.drum + 0.1, 0.08, top - 0.04, stone),
    drum(STATUE.drum + 0.006, 0.014, top - 0.2, gold),
  );
  return group;
}

// The gallery's statue alone in the dark, for the catalogue's first screen. Drawn only while something moves.
export class HeroScene implements HeroView {
  private readonly renderer: WebGLRenderer;
  private readonly quality: QualityController;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly ambient = new HemisphereLight(0xd8d6d2, 0x1a1a1e, AMBIENT);
  private readonly key = spot(KEY.from, KEY.to, KEY.angle, AMBER);
  private readonly rim = spot(RIM.from, RIM.to, RIM.angle, COOL);
  private readonly light = new PaintedLight();
  private readonly motes = new Motes();
  private readonly pointer = new Vector2();
  private readonly drawn = new Vector2();
  private readonly cancelLion: () => void;

  private scroll = 0;
  private turn = 0;
  private lift = 0;
  /** Seconds of drawing since the statue first showed. */
  private shownFor = 0;
  private shown = false;
  private ready = false;
  /** Pending while the statue's shaders are being made. */
  private compiling?: Promise<void>;
  private rafId = 0;
  private lastFrame = 0;
  private running = false;
  private paused = false;
  private lost = false;
  private disposed = false;

  /** `load` fetches the statue; a spec stands a stand-in on the plinth instead. */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: HeroViewOptions,
    load: typeof loadLion = loadLion,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.quality = new QualityController(LADDER, 0, () => this.fit(), () => this.lose());
    this.watchDisplay(DISPLAY_FRAMES);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    canvas.addEventListener("webglcontextlost", this.lose);

    const distance = Math.hypot(FRAME.back, FRAME.aim - FRAME.eye);
    this.camera = new PerspectiveCamera(MathUtils.radToDeg(2 * Math.atan(FRAME.tall / 2 / distance)), 1, 0.5, 40);

    this.key.penumbra = 1;
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.0006;
    this.scene.background = new Color(BACKGROUND);
    this.scene.add(this.ambient, this.key, this.key.target, this.rim, this.rim.target, pedestal(), ...this.light.objects, this.motes.points);
    this.fit();

    this.cancelLion = load(
      options.assets,
      { height: STATUE.height, at: [0, STATUE.plinth, 0], yaw: STATUE.yaw },
      (lion) => void this.unveil(lion),
      this.lose,
    );
  }

  setPointer(x: number, y: number): void {
    this.pointer.set(x, y);
    this.motes.stir();
    this.invalidate();
  }

  setScroll(share: number): void {
    this.scroll = share;
    this.motes.stir();
    this.invalidate();
  }

  resize(ceiling: number): void {
    this.motes.setCeiling(ceiling);
    this.fit();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      this.running = false;
    } else {
      this.invalidate();
    }
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener("webglcontextlost", this.lose);
    this.cancelLion();
    // three.js goes on asking after the shaders it is compiling, and trips over a renderer that has gone meanwhile
    if (this.compiling) void this.compiling.then(() => this.release());
    else this.release();
  }

  private release(): void {
    this.scene.traverse((object) => {
      const { geometry, material } = object as Partial<Mesh<BufferGeometry, Material | Material[]>>;
      geometry?.dispose();
      for (const each of [material ?? []].flat()) {
        for (const value of Object.values(each)) if (value instanceof Texture) value.dispose();
        each.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private fit(): void {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio, this.quality.tier.pixelRatio, Math.sqrt(MAX_DRAWN_PIXELS / (width * height)));
    const { x, y } = this.renderer.getSize(this.drawn);
    if (x === width && y === height && this.renderer.getPixelRatio() === ratio) return;

    this.renderer.setDrawingBufferSize(width, height, ratio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.quality.settle();
    // Resizing empties the canvas, and the next frame would come only after the empty one had been shown
    if (this.shown) this.renderer.render(this.scene, this.camera);
    this.invalidate();
  }

  /** Renders only while something is changing; a still statue costs nothing. */
  private invalidate(): void {
    if (this.rafId || this.paused || this.disposed || !this.ready) return;
    if (!this.running) this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    this.rafId = 0;
    const elapsed = Math.max(now - this.lastFrame, 0) / 1000;
    const seconds = Math.min(elapsed, STALL_SECONDS);
    this.lastFrame = now;
    // While it holds the picture's pose its frames pay for its own start, uploads and all, and say nothing of its pace
    if (this.running && this.shownFor >= HOLD.from) this.quality.frame(elapsed, this.renderer.getPixelRatio());
    else this.quality.settle();
    // Judged too slow, the scene is taken down from inside that call
    if (this.disposed) return;

    this.shownFor += seconds;
    const free = MathUtils.smoothstep(this.shownFor, HOLD.from, HOLD.to);
    const turnTo = turnFor(this.pointer.x, this.scroll) * free;
    const liftTo = liftFor(this.pointer.y) * free;
    const turning = Math.abs(turnTo - this.turn) > 0.0004 || Math.abs(liftTo - this.lift) > 0.0004;
    const eased = turning ? 1 - Math.exp(-seconds * EASE) : 1;
    this.turn += (turnTo - this.turn) * eased;
    this.lift += (liftTo - this.lift) * eased;

    const level = 1 - free * (1 - levelFor(this.scroll));
    const drifting = this.motes.update(seconds, level);
    this.ambient.intensity = AMBIENT * (0.3 + 0.7 * level);
    this.key.intensity = KEY.strength * level;
    this.rim.intensity = RIM.strength * level;
    this.light.setLevel(level);

    this.camera.position.set(-FRAME.back * Math.cos(this.turn), FRAME.eye + this.lift, -FRAME.back * Math.sin(this.turn));
    this.camera.lookAt(0, FRAME.aim, 0);
    this.renderer.render(this.scene, this.camera);

    if (!this.shown) {
      this.shown = true;
      this.options.onReady();
    }
    this.running = turning || drifting || free < 1;
    if (this.running) this.invalidate();
  };

  private async unveil(lion: Group): Promise<void> {
    this.scene.add(lion);
    this.renderer.shadowMap.needsUpdate = true;
    this.compiling = this.precompile();
    await this.compiling;
    this.compiling = undefined;
    this.ready = true;
    this.invalidate();
  }

  // Shaders compile in the background; a blocking first render would freeze the page for most of a second.
  private async precompile(): Promise<void> {
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      // The first frame compiles them on the spot.
    }
  }

  private readonly lose = (): void => {
    if (this.lost || this.disposed) return;
    this.lost = true;
    this.options.onLost();
  };

  private watchDisplay(frames: number, before?: number): void {
    requestAnimationFrame((now) => {
      if (this.disposed) return;
      if (before !== undefined) this.quality.displayFrame((now - before) / 1000);
      if (frames > 1) this.watchDisplay(frames - 1, now);
    });
  }
}
