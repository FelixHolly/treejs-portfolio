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

interface HeroSizes {
  deskScale: number;
  deskPosition: [number, number, number];
  deskRotation: [number, number, number];
}

// Animation constants
const HERO_ANIMATION = {
  ROTATION_FACTOR: 0.3,
  ROTATION_SPEED: 0.1,
  MOBILE_ROTATION_SPEED: 0.002,
  MOBILE_BREAKPOINT: 800,
} as const;

// Renderer constants
const RENDERER_CONFIG = {
  MAX_PIXEL_RATIO: 2,
  TONE_MAPPING_EXPOSURE: 1,
} as const;

// Shadow constants
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
  private animationId: number = 0;
  private dracoLoader?: DRACOLoader;

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

    const ambientLight = new AmbientLight(0xffffff, 1.5);
    const directionalLight = new DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = SHADOW_CONFIG.MAP_SIZE;
    directionalLight.shadow.mapSize.height = SHADOW_CONFIG.MAP_SIZE;
    directionalLight.shadow.camera.near = SHADOW_CONFIG.CAMERA_NEAR;
    directionalLight.shadow.camera.far = SHADOW_CONFIG.CAMERA_FAR;
    this.scene.add(ambientLight, directionalLight);

    this.loadModel();

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

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

        const box = new Box3().setFromObject(model);
        const center = new Vector3();
        box.getCenter(center);
        model.position.sub(center);

        group.position.set(
          ...(this.sizes.deskPosition.map((v, i) => (i === 1 ? v + 3 : v)) as [
            number,
            number,
            number,
          ]),
        );
        group.rotation.set(...this.sizes.deskRotation);
        group.scale.setScalar(this.sizes.deskScale);

        model.traverse((child) => {
          if ((child as Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.modelObject = group;
        this.scene.add(group);
        this.isLoading = false;
      },
      (xhr) => {
        if (xhr.total > 0) {
          this.loadingProgress = Math.min((xhr.loaded / xhr.total) * 100, 100);
        }
      },
      (error) => {
        console.error("Failed to load model:", error);
        this.isLoading = false;
        // Error will be caught by global error handler
        throw new Error(`Failed to load 3D model: ${error}`);
      },
    );
  }

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
    deskScale: 2.7,
    deskPosition: [0, -4, 0],
    deskRotation: [0, 0, 0],
  };
}
