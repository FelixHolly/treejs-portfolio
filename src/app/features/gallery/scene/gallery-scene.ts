import {
  ACESFilmicToneMapping,
  BackSide,
  Color,
  CylinderGeometry,
  Fog,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { RotundaAtmosphere } from "./atmosphere";
import { buildArchitecture, createPalette, Palette } from "./building";
import { buildPoses, buildWaypoints, CameraPath, Pose } from "./camera-path";
import { FramedPicture, framedPicture, lectern, letterbox, medallion, nameBoard, writingDesk } from "./exhibits";
import { GalleryView, GalleryViewOptions, OPEN_BAND, PageFraming } from "./gallery-view";
import {
  DOOR,
  DOOR_XS,
  fieldOfView,
  HALF_DEPTH,
  HANG_Z,
  LECTERN,
  LETTERBOX,
  MEDALLION,
  pieceSlots,
  PieceSlot,
  PLATE,
  ROOM_ONE_X,
  ROTUNDA,
} from "./layout";
import { GalleryLights } from "./lights";
import { loadLion } from "./lion";
import { sectionPlateTexture } from "./plate";
import { Post } from "./post";
import { coverFit, inscriptionTexture, nameBoardTexture } from "./textures";

const BACKGROUND = 0x141417;
const MAX_PIXEL_RATIO = 2;
/** Higher is a quicker glide towards the scroll position. */
const GLIDE = 4.5;
const LOOK = { yaw: 0.06, pitch: 0.035, ease: 6 } as const;
const INTRO_MS = 2200;
const EMPTY_PLINTH_LEVEL = 0.3;
const SLOW = { frames: 60, fps: 30 } as const;
const ROOM_INSCRIPTIONS = ["Room I", "Room II", "Room III", "Room IV"] as const;
/** The board of names above the visitors' book: its width, and the height each name adds. */
const NAME_BOARD = { width: 2.3, line: 0.31, margin: 0.17, bottom: 1.6 } as const;

export class GalleryScene implements GalleryView {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(fieldOfView(1), 1, 0.1, 80);
  private readonly palette: Palette = createPalette();
  private readonly plainFrame = new MeshLambertMaterial({ color: 0x2c2c33 });
  private readonly slots: PieceSlot[];
  private readonly pictures: FramedPicture[] = [];
  private readonly plate: FramedPicture;
  private readonly lights: GalleryLights;
  private readonly atmosphere = new RotundaAtmosphere();
  private readonly pose: Pose = { position: new Vector3(), target: new Vector3() };
  private readonly pointer = new Vector2();
  private readonly look = new Vector2();
  private readonly cancelLion: () => void;

  private path!: CameraPath;
  private mail!: Post;
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
  private measuredFrames = 0;
  private measuredSeconds = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: GalleryViewOptions,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    this.scene.background = new Color(BACKGROUND);
    this.scene.fog = new Fog(BACKGROUND, 9, 36);

    this.slots = pieceSlots(options.works);
    this.lights = new GalleryLights(this.slots);
    this.plate = framedPicture({ ...PLATE, gilded: true, src: "" }, this.palette, this.plainFrame);
    this.lionLevel = EMPTY_PLINTH_LEVEL;

    this.scene.add(buildArchitecture(this.palette), ...this.lights.objects, ...this.atmosphere.objects);
    this.furnish();
    void this.inscribe();

    this.cancelLion = loadLion(
      options.assets,
      (lion) => void this.unveil(lion),
      () => this.raiseLights(),
    );

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
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
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
    this.cancelLion();

    this.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        (material as Material & { map?: Texture | null }).map?.dispose();
        material.dispose();
      }
    });
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
    const seconds = Math.min(Math.max(now - this.lastFrame, 0) / 1000, 0.25);
    this.lastFrame = now;

    const gap = this.target - this.progress;
    const gliding = Math.abs(gap) > 0.0004;
    this.progress = gliding ? this.progress + gap * (1 - Math.exp(-seconds * GLIDE)) : this.target;

    const looking = this.look.distanceToSquared(this.pointer) > 0.000004;
    if (looking) this.look.lerp(this.pointer, 1 - Math.exp(-seconds * LOOK.ease));

    const rising = this.advanceIntro(now);
    const posting = this.mail.update(now);

    this.path.sample(this.progress, this.pose);
    this.camera.position.copy(this.pose.position);
    this.camera.lookAt(this.pose.target);
    this.camera.rotateY(-this.look.x * LOOK.yaw);
    this.camera.rotateX(-this.look.y * LOOK.pitch);
    this.lights.update(this.progress, this.lionLevel);
    this.atmosphere.update(this.progress, this.lionLevel);
    this.renderer.render(this.scene, this.camera);

    this.running = gliding || looking || rising || posting;
    this.measure(seconds);
    if (this.running) this.invalidate();
  };

  private async unveil(lion: Group): Promise<void> {
    try {
      await this.renderer.compileAsync(lion, this.camera, this.scene);
    } catch {
      // A failed precompile only means the statue's first frame compiles on the spot.
    }
    if (this.disposed) return;
    this.scene.add(lion);
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

  private measure(seconds: number): void {
    if (this.measuredFrames >= SLOW.frames || !this.running || seconds <= 0) return;
    this.measuredFrames += 1;
    this.measuredSeconds += seconds;
    if (this.measuredFrames === SLOW.frames && this.measuredFrames / this.measuredSeconds < SLOW.fps) {
      this.options.onSlow();
    }
  }

  private furnish(): void {
    const poses = buildPoses(this.slots, { aspect: 1.6, labelShare: 0.38, statueBand: OPEN_BAND });
    const visitorsBook = poses[poses.length - 2].position;
    const correspondence = poses[poses.length - 1].position;

    const desk = writingDesk(this.palette, correspondence);
    this.mail = new Post(this.palette, desk);
    this.scene.add(
      medallion(this.palette),
      this.plate.group,
      lectern(this.palette, visitorsBook),
      desk,
      letterbox(this.palette),
      this.mail.envelope,
    );

    for (const slot of this.slots) {
      for (const frame of slot.frames) {
        const picture = framedPicture(frame, this.palette, this.plainFrame);
        this.pictures.push(picture);
        this.scene.add(picture.group);
      }
    }
  }

  /** The screenshots are fetched once the visitor leaves the entrance, not before. */
  private requestPictures(): void {
    if (this.picturesRequested || Math.max(this.progress, this.target) < 0.3) return;
    this.picturesRequested = true;

    const loader = new TextureLoader();
    const anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    for (const { picture, slot } of this.pictures) {
      loader.load(slot.src, (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = anisotropy;
        coverFit(texture, slot.width / slot.height);
        picture.material.map = texture;
        picture.material.color.set(0xdedede);
        picture.material.needsUpdate = true;
        this.invalidate();
      });
    }
  }

  /** Wall lettering uses the page's fonts, so it waits for them. */
  private async inscribe(): Promise<void> {
    try {
      await Promise.all([
        document.fonts.load('500 160px "Boska"'),
        document.fonts.load('italic 400 60px "Boska"'),
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
    monogram.position.set(MEDALLION.x - 0.04, MEDALLION.y, MEDALLION.z - 0.03);
    monogram.rotation.y = -Math.PI / 2;
    this.scene.add(monogram);

    const friezeText = this.options.frieze.join("  ·  ").toUpperCase();
    const friezeLettering = lettering(
      inscriptionTexture({ text: friezeText, font: '500 84px "Boska", Georgia, serif', color: "#c7a44a", width: 4096, height: 134, spacing: "0.3em" }),
    );
    for (const side of [-1, 1]) {
      const frieze = new Mesh(new PlaneGeometry(9.2, 0.3), friezeLettering);
      frieze.position.set(ROOM_ONE_X, 4.12, side * (HALF_DEPTH - 0.02));
      if (side === 1) frieze.rotation.y = Math.PI;
      this.scene.add(frieze);
    }

    const engraved = new Mesh(
      new PlaneGeometry(0.46, 0.1),
      lettering(
        inscriptionTexture({ text: "LETTERS", font: '500 120px "Boska", Georgia, serif', color: "#2a2114", width: 1024, height: 220, spacing: "0.3em" }),
      ),
    );
    engraved.position.set(LETTERBOX.x, LETTERBOX.y + 0.02, HANG_Z + LETTERBOX.depth + 0.004);
    this.scene.add(engraved);

    this.plate.picture.material.map = sectionPlateTexture(this.options.anatomy);
    this.plate.picture.material.color.set(0xffffff);
    this.plate.picture.material.needsUpdate = true;

    const names = this.options.visitors;
    if (names.length) {
      const height = NAME_BOARD.margin * 2 + NAME_BOARD.line * names.length;
      const lettered = nameBoardTexture(names, NAME_BOARD.width / height);
      this.scene.add(nameBoard(LECTERN.x, NAME_BOARD.bottom + height / 2, NAME_BOARD.width, height, lettered, this.palette));
    }

    ROOM_INSCRIPTIONS.forEach((text, index) => {
      const texture = inscriptionTexture({
        text: text.toUpperCase(),
        font: '400 40px "JetBrains Mono", monospace',
        color: "#c7a44a",
        width: 1024,
        height: 96,
        spacing: "0.4em",
      });
      const y = DOOR.height + 0.46;

      if (index === 0) {
        // The rotunda wall is curved, so its lettering follows the curve; seen from inside it must be mirrored back.
        texture.wrapS = RepeatWrapping;
        texture.repeat.x = -1;
        const arc = 1.15 / ROTUNDA.radius;
        const material = lettering(texture);
        material.side = BackSide;
        const band = new Mesh(
          new CylinderGeometry(ROTUNDA.radius - 0.03, ROTUNDA.radius - 0.03, 0.216, 24, 1, true, Math.PI / 2 - arc, arc * 2),
          material,
        );
        band.position.set(ROTUNDA.x, y, 0);
        this.scene.add(band);
        return;
      }

      const plate = new Mesh(new PlaneGeometry(2.3, 0.216), lettering(texture));
      plate.position.set(DOOR_XS[index] - 0.215, y, 0);
      plate.rotation.y = -Math.PI / 2;
      this.scene.add(plate);
    });

    this.invalidate();
  }
}
