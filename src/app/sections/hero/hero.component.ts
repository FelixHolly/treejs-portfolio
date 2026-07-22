/**
 * Hero section component featuring an interactive 3D model.
 *
 * Implements mouse-following rotation on desktop and auto-rotation on mobile.
 * Uses DRACO compression for optimized model loading and proper WebGL resource cleanup.
 *
 * Performance considerations:
 * - Pixel ratio capped at 2x to prevent excessive rendering on high-DPI displays
 * - ACES tone mapping for photorealistic color grading
 * - Progressive loading with visual feedback via loadingProgress
 */
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  Object3D,
  Mesh,
  Box3,
  Vector3,
  Group,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { ThreeSceneService } from "../../services/three-scene.service";
import { environment } from "../../../environments/environment";

/**
 * Responsive sizing configuration for the 3D model across different breakpoints.
 */
interface HeroSizes {
  deskScale: number;
  deskPosition: [number, number, number];
  deskRotation: [number, number, number];
}

/**
 * Animation configuration constants.
 *
 * ROTATION_FACTOR: Multiplier for mouse position to rotation angle - keeps movement subtle
 * ROTATION_SPEED: Interpolation factor for smooth rotation (0-1 range, lower = smoother)
 * MOBILE_ROTATION_SPEED: Constant rotation speed for mobile auto-rotation
 * MOBILE_BREAKPOINT: Width threshold for switching between interactive and auto-rotation modes
 */
const HERO_ANIMATION = {
  ROTATION_FACTOR: 0.3,
  ROTATION_SPEED: 0.1,
  MOBILE_ROTATION_SPEED: 0.002,
  MOBILE_BREAKPOINT: 800,
} as const;

/**
 * Renderer performance configuration.
 *
 * MAX_PIXEL_RATIO: Capped at 2 to balance quality and performance on high-DPI displays (e.g., Retina)
 * Prevents unnecessary GPU load on 3x or 4x pixel ratio devices
 */
const RENDERER_CONFIG = {
  MAX_PIXEL_RATIO: 2,
  TONE_MAPPING_EXPOSURE: 1,
} as const;

/**
 * Opening sequence: the gallery lights come up once the statue is ready.
 * Target intensities match the museum lighting rig; the ramp eases over
 * INTRO_MS with a cubic ease-out, skipped under prefers-reduced-motion.
 */
const LIGHT_TARGETS = {
  AMBIENT: 0.5,
  KEY: 2.4,
  RIM: 0.9,
} as const;

const INTRO_MS = 2200;

/**
 * Shadow quality configuration.
 *
 * MAP_SIZE: 2048x2048 shadow map provides good quality without excessive memory usage
 * Higher values (4096) offer diminishing returns for the file size cost
 */
const SHADOW_CONFIG = {
  MAP_SIZE: 2048,
  CAMERA_NEAR: 0.5,
  CAMERA_FAR: 50,
} as const;

@Component({
  selector: "app-hero",
  standalone: true,
  templateUrl: "./hero.component.html",
  styleUrls: ["./hero.component.scss"],
})
export class HeroComponent implements OnInit, AfterViewInit, OnDestroy {
  private threeSceneService = inject(ThreeSceneService);

  @ViewChild("canvas", { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  isLoading = true;
  loadingProgress = 0;
  scene = new Scene();
  mouseX = 0;
  mouseY = 0;
  modelObject?: Object3D;
  sizes!: HeroSizes;

  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private animationId = 0;
  private dracoLoader?: DRACOLoader;

  private ambientLight!: AmbientLight;
  private keyLight!: DirectionalLight;
  private rimLight!: DirectionalLight;
  private introStart = 0;
  private lightsUp = false;
  private readonly reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  ngOnInit(): void {
    const width = window.innerWidth;
    this.sizes = calculateSizes(width);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERER_CONFIG.MAX_PIXEL_RATIO));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = RENDERER_CONFIG.TONE_MAPPING_EXPOSURE;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.camera = new PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(1, -2, 10);
    this.camera.lookAt(0, 0, 0);

    // Museum lighting: dim neutral ambient, warm key light (gallery spot),
    // cool rim light to separate the stone from the dark background.
    // The room starts dark; intensities ramp up when the statue is ready.
    const startBright = this.reducedMotion;
    this.ambientLight = new AmbientLight(0xe8e5de, startBright ? LIGHT_TARGETS.AMBIENT : 0);

    this.keyLight = new DirectionalLight(0xffd9a0, startBright ? LIGHT_TARGETS.KEY : 0);
    this.keyLight.position.set(4, 8, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = SHADOW_CONFIG.MAP_SIZE;
    this.keyLight.shadow.mapSize.height = SHADOW_CONFIG.MAP_SIZE;
    this.keyLight.shadow.camera.near = SHADOW_CONFIG.CAMERA_NEAR;
    this.keyLight.shadow.camera.far = SHADOW_CONFIG.CAMERA_FAR;

    this.rimLight = new DirectionalLight(0x8fa3bf, startBright ? LIGHT_TARGETS.RIM : 0);
    this.rimLight.position.set(-6, 3, -4);

    this.lightsUp = startBright;
    this.scene.add(this.ambientLight, this.keyLight, this.rimLight);

    this.loadModel();

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      this.updateIntroLights();

      if (this.modelObject) {
        if (window.innerWidth < HERO_ANIMATION.MOBILE_BREAKPOINT) {
          this.modelObject.rotation.y -= HERO_ANIMATION.MOBILE_ROTATION_SPEED;
        } else {
          this.modelObject.rotation.y +=
            (this.mouseX * HERO_ANIMATION.ROTATION_FACTOR - this.modelObject.rotation.y) * HERO_ANIMATION.ROTATION_SPEED;
          this.modelObject.rotation.x +=
            (this.mouseY * HERO_ANIMATION.ROTATION_FACTOR - this.modelObject.rotation.x) * HERO_ANIMATION.ROTATION_SPEED;
        }
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Ramps the gallery lights from dark to their targets after the statue
   * loads (cubic ease-out over INTRO_MS). No-op once the ramp completes,
   * and under prefers-reduced-motion the lights start at full.
   */
  private updateIntroLights(): void {
    if (this.lightsUp || !this.introStart) return;

    const t = Math.min((performance.now() - this.introStart) / INTRO_MS, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    this.ambientLight.intensity = LIGHT_TARGETS.AMBIENT * eased;
    this.keyLight.intensity = LIGHT_TARGETS.KEY * eased;
    this.rimLight.intensity = LIGHT_TARGETS.RIM * eased;

    if (t >= 1) this.lightsUp = true;
  }

  /**
   * Loads and configures the 3D GLTF model with DRACO compression.
   *
   * Key operations:
   * 1. Centers the model geometry at its bounding box center for consistent rotation
   * 2. Wraps model in a Group to separate local centering from world positioning
   * 3. Applies responsive sizing based on viewport width
   * 4. Enables shadow casting/receiving for all meshes
   *
   * DRACO compression reduces model file size by ~60-80% with minimal quality loss.
   */
  private loadModel(): void {
    const loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath(environment.assets.dracoPath);
    loader.setDRACOLoader(this.dracoLoader);

    loader.load(
      environment.assets.models.heroModel,
      (gltf) => {
        const model = gltf.scene;
        const group = new Group();
        group.add(model);

        // Center the model at its geometric center for balanced rotation
        // This prevents off-axis rotation artifacts
        const box = new Box3().setFromObject(model);
        const center = new Vector3();
        box.getCenter(center);
        model.position.sub(center);

        // Adjust Y position (+3 offset) to account for model centering
        // Without this, centering would shift the model down unexpectedly
        group.position.set(
          ...(this.sizes.deskPosition.map((v, i) => (i === 1 ? v + 3 : v)) as [
            number,
            number,
            number,
          ]),
        );
        group.rotation.set(...this.sizes.deskRotation);
        group.scale.setScalar(this.sizes.deskScale);

        // Enable shadows on all mesh children for realistic lighting
        model.traverse((child) => {
          if ((child as Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.modelObject = group;
        this.scene.add(group);
        this.isLoading = false;
        // The statue is hung: bring the gallery lights up
        this.introStart = performance.now();
      },
      (xhr) => {
        if (xhr.total > 0) {
          this.loadingProgress = Math.min((xhr.loaded / xhr.total) * 100, 100);
        }
      },
      (error) => {
        console.error("Failed to load model:", error);
        this.isLoading = false;
        // No statue to unveil; light the room so the text is readable
        this.ambientLight.intensity = LIGHT_TARGETS.AMBIENT;
        this.keyLight.intensity = LIGHT_TARGETS.KEY;
        this.rimLight.intensity = LIGHT_TARGETS.RIM;
        this.lightsUp = true;
        // Propagate error to global handler for user-facing notification
        throw new Error(`Failed to load 3D model: ${error}`);
      },
    );
  }

  /**
   * Normalizes mouse position to range [-1, 1] for smooth model rotation.
   *
   * Normalization formula: ((position / viewport_size) - 0.5) * 2
   * - Centers origin at viewport center (0,0)
   * - Maps edges to -1 and 1
   * - Provides consistent rotation behavior across all screen sizes
   */
  @HostListener("document:mousemove", ["$event"])
  onMouseMove(event: MouseEvent): void {
    this.mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    this.mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Critical cleanup to prevent memory leaks in Three.js.
   *
   * WebGL contexts are not garbage collected automatically.
   * Without proper disposal, each component mount/unmount cycle leaks GPU memory,
   * eventually causing browser crashes or severe performance degradation.
   *
   * Cleanup order:
   * 1. Stop animation frame to prevent render loop accessing disposed resources
   * 2. Dispose scene materials, geometries, and textures
   * 3. Dispose loaders (DRACO decoder uses WebAssembly memory)
   * 4. Force WebGL context loss to free GPU memory immediately
   */
  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);

    this.threeSceneService.disposeScene(this.scene);

    if (this.dracoLoader) {
      this.dracoLoader.dispose();
    }

    if (this.renderer) {
      this.threeSceneService.disposeRenderer(this.renderer);
    }
  }

  protected readonly Math = Math;
}

/**
 * Calculates responsive sizing for the 3D model based on viewport width.
 *
 * Breakpoints follow common device classifications:
 * - < 440px: Small mobile (iPhone SE, older Android)
 * - < 768px: Standard mobile (iPhone, most Android phones)
 * - < 1024px: Tablets and large phones
 * - >= 1024px: Desktop and landscape tablets
 *
 * Scale values are empirically tuned to maintain visual balance across devices.
 * Smaller screens use smaller scales to prevent model overflow.
 *
 * TODO: Consider extracting to a responsive utility service for reuse across 3D components.
 */
function calculateSizes(width: number): HeroSizes {
  if (width < 440) {
    return {
      deskScale: 2,
      deskPosition: [0, -4, 0],
      deskRotation: [0, 0, 0],
    };
  }

  if (width < 768) {
    return {
      deskScale: 1.8,
      deskPosition: [0, -4, 0],
      deskRotation: [0, 0, 0],
    };
  }

  if (width < 1024) {
    return {
      deskScale: 2.2,
      deskPosition: [0, -4, 0],
      deskRotation: [0, 0, 0],
    };
  }

  return {
    deskScale: 3.5,
    deskPosition: [0, -4.2, 0],
    deskRotation: [0, 0, 0],
  };
}
