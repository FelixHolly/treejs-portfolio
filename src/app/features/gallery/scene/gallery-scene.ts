import {
  ACESFilmicToneMapping,
  Color,
  Fog,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { ROOMS } from "../../../core/place/places";
import { RotundaAtmosphere } from "./atmosphere";
import { buildArchitecture, createPalette, Palette } from "./building";
import { buildPoses, buildWaypoints, CameraPath, Pose } from "./camera-path";
import { FramedPicture, framedPicture, hang, medallion, letteredBoard, pictureLight } from "./exhibits";
import { filmPlacement, FilmPlacement, filmShouldPlay } from "./film";
import { FilmScreen } from "./film-screen";
import { FloorMirror } from "./floor-mirror";
import { lectern, letterbox, writingDesk } from "./furniture";
import { GalleryView, GalleryViewOptions, OPEN_BAND, PageFraming } from "./gallery-view";
import {
  fieldOfView,
  FrameSlot,
  HANG_Z,
  LECTERN,
  LETTERBOX,
  MEDALLION,
  pieceSlots,
  PieceSlot,
  portraitSlot,
  SKILL_PLAQUE_HEIGHT,
  SKILL_PLAQUES,
  skillPlaqueSlots,
} from "./layout";
import { GalleryLights } from "./lights";
import { loadLion } from "./lion";
import { hangPortrait, portraitMaterial } from "./portrait";
import { QUALITY_LADDER, QualityController, QualityTier } from "./quality";
import { ShaderWarmup } from "./shader-warmup";
import { Post } from "./post";
import { coverFit, inscriptionTexture, nameBoardTexture, plaqueTexture } from "./textures";
import { roomNames } from "./wayfinding";

const BACKGROUND = 0x141417;
const MAX_PIXEL_RATIO = 2;
/** A full-HD window at that ratio; beyond it the cost keeps growing and the picture does not. */
const MAX_DRAWN_PIXELS = 1920 * 1080 * MAX_PIXEL_RATIO ** 2;
/** Bare frames watched at the start for the display's own pace, the fastest any quality could reach. */
const DISPLAY_FRAMES = 20;
/** Higher is a quicker glide towards the scroll position. */
const GLIDE = 4.5;
const LOOK = { yaw: 0.06, pitch: 0.035, ease: 6 } as const;
const INTRO_MS = 2200;
const EMPTY_PLINTH_LEVEL = 0.3;
/** The board of names above the visitors' book: its width, and the height each name adds. */
const NAME_BOARD = { width: 2.3, line: 0.31, margin: 0.17, bottom: 1.6 } as const;

function displayRatio(width: number, height: number): number {
  return Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO, Math.sqrt(MAX_DRAWN_PIXELS / (width * height)));
}

// What this visit has already stepped down to: a scene opened again starts there instead of stumbling again.
let reached = QUALITY_LADDER[0];

export class GalleryScene implements GalleryView {
  private readonly renderer: WebGLRenderer;
  private readonly quality: QualityController;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(fieldOfView(1), 1, 0.1, 80);
  private readonly palette: Palette = createPalette();
  private readonly plainFrame = new MeshLambertMaterial({ color: 0x2c2c33 });
  private readonly slots: PieceSlot[];
  private readonly pictures: FramedPicture[] = [];
  private readonly portrait: FramedPicture<ShaderMaterial>;
  private readonly lights: GalleryLights;
  private readonly atmosphere = new RotundaAtmosphere();
  private readonly mirror = new FloorMirror(this.palette.floor);
  private readonly pose: Pose = { position: new Vector3(), target: new Vector3() };
  private readonly pointer = new Vector2();
  private readonly look = new Vector2();
  private readonly cancelLion: () => void;
  private readonly filmPlace?: FilmPlacement;

  private path!: CameraPath;
  private mail!: Post;
  private film?: FilmScreen;
  private filmHeld = false;
  private progress = 0;
  private target = 0;
  private lionLevel: number;
  private introStart: number | null = null;
  private picturesRequested = false;
  private rafId = 0;
  private lastFrame = 0;
  private running = false;
  private paused = false;
  private disposed = false;
  private compiled = false;
  /** What the graphics card held after the last frame; a change means that frame paid for an upload. */
  private held: number[] = [];
  /** Shaders for a hall without the statue's shadow, compiling in the background until it can be dropped. */
  private shadowless?: ShaderWarmup;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: GalleryViewOptions,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.quality = new QualityController(
      QUALITY_LADDER,
      QUALITY_LADDER.indexOf(reached),
      (tier) => this.applyQuality(tier),
      () => options.onSlow(),
    );
    if (!options.reducedMotion) this.watchDisplay(DISPLAY_FRAMES);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    this.scene.background = new Color(BACKGROUND);
    this.scene.fog = new Fog(BACKGROUND, 9, 36);

    this.slots = pieceSlots(options.works);
    this.filmPlace = filmPlacement(options.works, options.films);
    this.lights = new GalleryLights(this.slots);
    this.lionLevel = EMPTY_PLINTH_LEVEL;
    this.portrait = framedPicture(portraitSlot(options.portrait), this.palette, this.plainFrame, portraitMaterial());

    this.scene.add(buildArchitecture(this.palette), ...this.lights.objects, ...this.atmosphere.objects);
    this.furnish();
    void this.inscribe();

    this.cancelLion = loadLion(
      options.assets,
      (lion) => void this.unveil(lion),
      () => this.raiseLights(),
    );

    this.lights.setStatueShadow(this.quality.tier.statueShadow);
    this.mirror.enabled = this.quality.allowsCostlyEffects;
    this.resize({ labelShare: 0, statueBand: OPEN_BAND });
    // Shaders compile in the background; a blocking first render would freeze the page for most of a second.
    this.renderer.compileAsync(this.scene, this.camera).finally(() => {
      this.compiled = true;
      this.invalidate();
    });
  }

  setProgress(progress: number): void {
    this.target = progress;
    this.requestPictures();
    this.invalidate();
  }

  jumpTo(progress: number): void {
    this.target = progress;
    this.progress = progress;
    this.requestPictures();
    this.invalidate();
  }

  setPointer(x: number, y: number): void {
    if (this.options.reducedMotion) return;
    this.pointer.set(x, y);
    this.invalidate();
  }

  resize(framing: PageFraming): void {
    const [width, height] = this.canvasSize();
    this.renderer.setDrawingBufferSize(width, height, this.pixelRatio(width, height));
    this.quality.settle();
    this.camera.aspect = width / height;
    this.camera.fov = fieldOfView(this.camera.aspect);
    this.camera.updateProjectionMatrix();
    this.path = new CameraPath(
      buildPoses(this.slots, { aspect: this.camera.aspect, ...framing }),
      buildWaypoints(this.slots.length),
    );
    this.invalidate();
  }

  post(): void {
    this.mail.send(performance.now(), this.options.reducedMotion);
    this.invalidate();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.film?.pause();
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      this.running = false;
    } else {
      this.invalidate();
    }
  }

  setFilmHeld(held: boolean): void {
    this.filmHeld = held;
    this.invalidate();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.cancelLion();
    this.film?.dispose();
    this.mirror.dispose();

    this.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        (material as Material & { map?: Texture | null }).map?.dispose();
        material.dispose();
      }
    });
    (this.portrait.picture.material.uniforms["map"].value as Texture | null)?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  /** Renders only while something is changing; a still gallery costs nothing. */
  private invalidate(): void {
    if (this.rafId || this.paused || this.disposed || !this.compiled) return;
    if (!this.running) this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    this.rafId = 0;
    if (this.disposed) return;
    const elapsed = Math.max(now - this.lastFrame, 0) / 1000;
    const seconds = Math.min(elapsed, 0.25);
    this.lastFrame = now;
    const warming = this.shadowless !== undefined;
    if (this.shadowless?.done()) {
      this.shadowless = undefined;
      this.lights.setStatueShadow(false);
    }
    // Before drawing: a step down empties the canvas, and this frame fills it again
    this.measure(elapsed, warming);

    const gap = this.target - this.progress;
    const gliding = Math.abs(gap) > 0.0004;
    this.progress = gliding ? this.progress + gap * (1 - Math.exp(-seconds * GLIDE)) : this.target;

    const looking = this.look.distanceToSquared(this.pointer) > 0.000004;
    if (looking) this.look.lerp(this.pointer, 1 - Math.exp(-seconds * LOOK.ease));

    const rising = this.advanceIntro(now);
    const posting = this.mail.update(now);
    const filming = this.runFilm();

    this.path.sample(this.progress, this.pose);
    this.camera.position.copy(this.pose.position);
    this.camera.lookAt(this.pose.target);
    this.camera.rotateY(-this.look.x * LOOK.yaw);
    this.camera.rotateX(-this.look.y * LOOK.pitch);
    this.lights.update(this.progress, this.lionLevel);
    this.atmosphere.update(this.progress, this.lionLevel);
    const mirroring = this.mirror.render(this.renderer, this.scene, this.camera, seconds);
    this.renderer.render(this.scene, this.camera);

    this.running = gliding || looking || rising || posting || filming || mirroring;
    if (this.running) this.invalidate();
  };

  private canvasSize(): [width: number, height: number] {
    return [this.canvas.clientWidth || window.innerWidth, this.canvas.clientHeight || window.innerHeight];
  }

  private pixelRatio(width: number, height: number): number {
    return Math.min(displayRatio(width, height), this.quality.tier.pixelRatio);
  }

  private watchDisplay(frames: number, before?: number): void {
    requestAnimationFrame((now) => {
      if (this.disposed) return;
      if (before !== undefined) this.quality.displayFrame((now - before) / 1000);
      if (frames > 1) this.watchDisplay(frames - 1, now);
    });
  }

  private applyQuality(tier: QualityTier): void {
    reached = tier;
    this.mirror.enabled = tier.reflections;
    const [width, height] = this.canvasSize();
    const ratio = this.pixelRatio(width, height);
    if (ratio !== this.renderer.getPixelRatio()) this.renderer.setDrawingBufferSize(width, height, ratio);
    if (!tier.statueShadow) this.warmShadowless(this.scene);
  }

  // Only the compiling sees the light without its shadow; the hall keeps it until those shaders are ready
  private warmShadowless(root: Scene | Group): void {
    this.shadowless ??= new ShaderWarmup(this.renderer, this.scene, this.camera);
    this.lights.setStatueShadow(false);
    this.shadowless.add(root);
    this.lights.setStatueShadow(true);
  }

  private runFilm(): boolean {
    if (!this.film || !this.filmPlace) return false;
    if (filmShouldPlay(this.progress, this.filmPlace.stop, this.filmHeld)) this.film.play();
    else this.film.pause();
    return this.film.playing;
  }

  private async unveil(lion: Group): Promise<void> {
    try {
      await this.renderer.compileAsync(lion, this.camera, this.scene);
    } catch {
      // A failed precompile only means the statue's first frame compiles on the spot.
    }
    if (this.disposed) return;
    this.scene.add(lion);
    if (this.shadowless) this.warmShadowless(lion);
    this.renderer.shadowMap.needsUpdate = true;
    this.raiseLights();
  }

  private raiseLights(): void {
    if (this.options.reducedMotion) {
      this.lionLevel = 1;
    } else {
      this.introStart = performance.now();
    }
    this.invalidate();
  }

  private advanceIntro(now: number): boolean {
    if (this.introStart === null) return false;
    const t = Math.min((now - this.introStart) / INTRO_MS, 1);
    this.lionLevel = EMPTY_PLINTH_LEVEL + (1 - EMPTY_PLINTH_LEVEL) * (1 - Math.pow(1 - t, 3));
    if (t >= 1) this.introStart = null;
    return t < 1;
  }

  /** A frame that followed a rest, an upload or shader work paid for that, so it is kept out of the pace. */
  private measure(seconds: number, warming: boolean): void {
    const { memory, programs } = this.renderer.info;
    const held = [memory.textures, memory.geometries, programs?.length ?? 0];
    const uploaded = held.some((count, kind) => count !== this.held[kind]);
    this.held = held;
    if (this.running && !uploaded && !warming) this.quality.frame(seconds, this.renderer.getPixelRatio());
    else this.quality.settle();
  }

  private furnish(): void {
    const poses = buildPoses(this.slots, { aspect: 1.6, labelShare: 0.38, statueBand: OPEN_BAND });
    const visitorsBook = poses[poses.length - 2].position;
    const correspondence = poses[poses.length - 1].position;

    const desk = writingDesk(this.palette, correspondence);
    this.mail = new Post(this.palette, desk);
    this.portrait.group.add(pictureLight(this.portrait.slot, this.palette));
    this.scene.add(
      this.portrait.group,
      medallion(this.palette),
      lectern(this.palette, visitorsBook),
      desk,
      letterbox(this.palette),
      this.mail.envelope,
    );

    this.slots.forEach((slot, work) => {
      slot.frames.forEach((frame, index) => {
        const picture = framedPicture(frame, this.palette, this.plainFrame);
        // One lamp lights a column of frames: only the top one carries it
        const topmost = !slot.frames.some((other) => other.x === frame.x && other.y > frame.y);
        if (frame.gilded && topmost) picture.group.add(pictureLight(frame, this.palette));
        this.pictures.push(picture);
        this.scene.add(picture.group);
        if (index === 0 && work === this.filmPlace?.work) {
          this.film = new FilmScreen(
            picture.picture,
            this.filmPlace.src,
            frame.width / frame.height,
            () => this.invalidate(),
            () => this.options.onFilmLost(),
          );
        }
      });
    });
  }

  /** The screenshots are fetched once the visitor leaves the entrance, not before. */
  private requestPictures(): void {
    if (this.picturesRequested || Math.max(this.progress, this.target) < 0.3) return;
    this.picturesRequested = true;

    const loader = new TextureLoader();
    const anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    const fetch = (slot: FrameSlot, hangIt: (texture: Texture) => void) => {
      loader.load(slot.src, (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = anisotropy;
        hangIt(texture);
        this.invalidate();
      });
    };

    for (const { picture, slot } of this.pictures) {
      fetch(slot, (texture) => {
        coverFit(texture, slot.width / slot.height);
        if (picture === this.film?.picture) this.film.hangStill(texture);
        else hang(picture, texture);
      });
    }
    const { picture, slot } = this.portrait;
    fetch(slot, (texture) => hangPortrait(picture.material, texture, slot.width / slot.height));
  }

  /** Wall lettering uses the page's fonts, so it waits for them. */
  private async inscribe(): Promise<void> {
    try {
      await Promise.all([
        document.fonts.load('500 160px "Boska"'),
        document.fonts.load('400 40px "JetBrains Mono"'),
      ]);
    } catch {
      // Lettering falls back to the system serif and monospace.
    }
    if (this.disposed) return;

    const lettering = (texture: Texture) =>
      new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });

    const monogram = new Mesh(
      new PlaneGeometry(0.92, 0.54),
      lettering(
        inscriptionTexture({ text: "FH", font: '500 250px "Boska", Georgia, serif', color: "#e8e5de", width: 560, height: 330, spacing: "0.12em" }),
      ),
    );
    monogram.position.set(MEDALLION.x - 0.04, MEDALLION.y, MEDALLION.z + 0.03);
    monogram.rotation.y = -Math.PI / 2;
    this.scene.add(monogram);

    const engraved = new Mesh(
      new PlaneGeometry(0.46, 0.1),
      lettering(
        inscriptionTexture({ text: "LETTERS", font: '500 120px "Boska", Georgia, serif', color: "#2a2114", width: 1024, height: 220, spacing: "0.3em" }),
      ),
    );
    engraved.position.set(LETTERBOX.x, LETTERBOX.y + 0.02, HANG_Z + LETTERBOX.depth + 0.004);
    this.scene.add(engraved);

    const plaqueSlots = skillPlaqueSlots();
    this.options.skills.slice(0, SKILL_PLAQUES.count).forEach((group, index) => {
      const lettered = plaqueTexture(group.area, group.tools, SKILL_PLAQUES.lines, SKILL_PLAQUES.width / SKILL_PLAQUE_HEIGHT);
      const { x, y } = plaqueSlots[index];
      this.scene.add(letteredBoard(x, y, SKILL_PLAQUES.width, SKILL_PLAQUE_HEIGHT, lettered, this.palette));
    });

    const names = this.options.visitors;
    if (names.length) {
      const height = NAME_BOARD.margin * 2 + NAME_BOARD.line * names.length;
      const lettered = nameBoardTexture(names, NAME_BOARD.width / height);
      this.scene.add(letteredBoard(LECTERN.x, NAME_BOARD.bottom + height / 2, NAME_BOARD.width, height, lettered, this.palette));
    }

    this.scene.add(...roomNames(ROOMS.filter((room) => room.numeral)));

    this.invalidate();
  }
}
