/**
 * Projects showcase component featuring a 3D phone model with dynamic screen textures.
 *
 * Architecture:
 * - Loads a cyberpunk phone 3D model and dynamically swaps screen textures for each project
 * - Uses OrbitControls for user interaction and programmatic rotation animations
 * - Implements proper texture disposal to prevent memory leaks during texture swaps
 *
 * Performance optimizations:
 * - Screen material uses toneMapped: false to preserve original texture colors
 * - DRACO compression for model loading
 * - UV coordinate manipulation to correctly align screen textures
 */
import {AfterViewInit, Component, ElementRef, HostListener, inject, OnDestroy, ViewChild,} from "@angular/core";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  TextureLoader,
  Clock,
  ClampToEdgeWrapping,
  SRGBColorSpace,
  LinearFilter,
  Material,
  BufferGeometry,
  Object3D,
} from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import { ProjectService } from "../../services/project.service";
import { Project } from "../../models/project.model";
import { ThreeSceneService } from "../../services/three-scene.service";
import { environment } from "../../../environments/environment";

/**
 * Animation timing and easing configuration.
 *
 * Uses cubic ease-out (power 3) for natural deceleration.
 * 90-degree rotation (PI/2) reveals phone screen to user on project change.
 */
const PROJECT_ANIMATION = {
    ROTATION_DURATION: 1.2,
    ROTATION_START: 0,
    ROTATION_END: Math.PI / 2,
    EASE_POWER: 3,
} as const;

// Model constants
const MODEL_CONFIG = {
    SCALE: 20,
    BODY_COLOR: 0x555555,
    BODY_ROUGHNESS: 0.2,
    BODY_METALNESS: 0.4,
} as const;

// Camera constants
const CAMERA_CONFIG = {
    FOV: 50,
    NEAR: 0.1,
    FAR: 1000,
    POSITION: [0, 0, 5] as const,
} as const;

@Component({
    selector: "app-projects",
    standalone: true,
    templateUrl: "./projects.component.html",
    styleUrls: ["./projects.component.scss"],
})
export class ProjectsComponent implements AfterViewInit, OnDestroy {
    protected readonly Math = Math;
    private projectService = inject(ProjectService);
    private threeSceneService = inject(ThreeSceneService);

    @ViewChild("canvas", {static: true})
    canvasRef!: ElementRef<HTMLCanvasElement>;

    selectedProjectIndex = 0;
    screenMesh?: Mesh;
    scene = new Scene();
    loadingProgress = 0;
    isLoading = true;
    camera!: PerspectiveCamera;
    renderer!: WebGLRenderer;
    controls!: OrbitControls;
    textureLoader = new TextureLoader();
    animationId: number = 0;

    private model?: Object3D;
    private clock = new Clock();
    private isRotating = true;
    private rotationElapsed = 0;
    private dracoLoader?: DRACOLoader;

    myProjects: Project[] = [];

    constructor() {
        this.myProjects = this.projectService.getProjects();
    }

    get currentProject(): Project {
        return this.myProjects[this.selectedProjectIndex];
    }

    handleNavigation(direction: "previous" | "next"): void {
        this.selectedProjectIndex =
            direction === "previous"
                ? (this.selectedProjectIndex - 1 + this.myProjects.length) %
                this.myProjects.length
                : (this.selectedProjectIndex + 1) % this.myProjects.length;

        this.resetRotation();
        this.updateTexture();
    }

    ngAfterViewInit() {
        this.setupRenderer();
        this.setupCamera();
        this.setupSceneLights();
        this.setupControls();
        this.loadModel();
        this.animate();
    }

    private setupRenderer() {
        const canvas = this.canvasRef.nativeElement;
        this.renderer = new WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    private setupCamera() {
        const canvas = this.canvasRef.nativeElement;
        this.camera = new PerspectiveCamera(
            CAMERA_CONFIG.FOV,
            canvas.clientWidth / canvas.clientHeight,
            CAMERA_CONFIG.NEAR,
            CAMERA_CONFIG.FAR,
        );
        this.camera.position.set(...CAMERA_CONFIG.POSITION);
    }

    private setupSceneLights() {
        this.scene.add(new AmbientLight(0xffffff, 0.5));
        const light = new DirectionalLight(0xffffff, 1);
        light.position.set(5, 10, 7.5);
        this.scene.add(light);
    }

    private setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = false;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minPolarAngle = Math.PI / 3;
    }

    private animate = () => {
        this.animationId = requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();

        if (this.isRotating && this.model) {
            this.rotationElapsed += delta;
            const t = Math.min(this.rotationElapsed / PROJECT_ANIMATION.ROTATION_DURATION, 1);
            const easedT = 1 - Math.pow(1 - t, PROJECT_ANIMATION.EASE_POWER);
            this.model.rotation.y =
                PROJECT_ANIMATION.ROTATION_START + (PROJECT_ANIMATION.ROTATION_END - PROJECT_ANIMATION.ROTATION_START) * easedT;

            if (t >= 1) this.isRotating = false;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };

    private loadModel(): void {
        const loader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath(environment.assets.dracoPath);
        loader.setDRACOLoader(this.dracoLoader);

        loader.load(
            environment.assets.models.projectPhone,
            (gltf: any) => {
                this.model = gltf.scene;
            if (!this.model) return;

            this.model.position.set(0, 0, 0);
            this.model.scale.set(MODEL_CONFIG.SCALE, MODEL_CONFIG.SCALE, MODEL_CONFIG.SCALE);
            this.model.rotation.set(0, PROJECT_ANIMATION.ROTATION_START, 0);
            this.scene.add(this.model);

            this.resetRotation();

            this.model.traverse((child) => {
                if ((child as Mesh).isMesh) {
                    const mesh = child as Mesh;

                    if (mesh.name === "screen") {
                        // UV coordinate transformation to align texture with model's screen geometry
                        // The +2 X-offset compensates for the model's UV layout where screen UVs
                        // are offset in the texture atlas. Without this, textures would appear
                        // on the wrong part of the phone or be completely misaligned.
                        // This is model-specific and should be adjusted if using a different phone model.
                        const uv = (mesh.geometry as BufferGeometry).attributes["uv"];
                        for (let i = 0; i < uv.count; i++) {
                            uv.setXY(i, uv.getX(i) + 2, uv.getY(i));
                        }
                        uv.needsUpdate = true;
                        this.screenMesh = mesh;
                        this.updateTexture();
                    }

                    if (mesh.name === "body") {
                        // Replace default material with custom PBR material for realistic phone body
                        mesh.material = new MeshStandardMaterial({
                            color: MODEL_CONFIG.BODY_COLOR,
                            roughness: MODEL_CONFIG.BODY_ROUGHNESS,
                            metalness: MODEL_CONFIG.BODY_METALNESS,
                        });
                    }
                }
            });
            this.isLoading = false;
        },
        (xhr) => {
            if (xhr.total > 0) {
                this.loadingProgress = Math.min((xhr.loaded / xhr.total) * 100, 100);
            }
        },
        (error) => {
            console.error("Failed to load 3D model:", error);
            this.isLoading = false;
        });
    }

    private updateTexture(): void {
        if (!this.screenMesh) return;

        const texture = this.textureLoader.load(this.currentProject.texture, () => {
            texture.flipY = false;
            texture.wrapS = ClampToEdgeWrapping;
            texture.wrapT = ClampToEdgeWrapping;
            texture.colorSpace = SRGBColorSpace;
            texture.minFilter = LinearFilter;
            texture.magFilter = LinearFilter;

            const oldMaterial = this.screenMesh!.material as
                | Material
                | Material[];

            if (Array.isArray(oldMaterial)) {
                oldMaterial.forEach((m) => {
                    if (m instanceof MeshBasicMaterial && m.map) {
                        m.map.dispose();
                    }
                    m.dispose();
                });
            } else {
                if (oldMaterial instanceof MeshBasicMaterial && oldMaterial.map) {
                    oldMaterial.map.dispose();
                }
                oldMaterial.dispose();
            }

            this.screenMesh!.material = new MeshBasicMaterial({
                map: texture,
                toneMapped: false,
            });
            this.screenMesh!.material.needsUpdate = true;
        });
    }

    private resetRotation(): void {
        if (this.model) {
            this.model.rotation.y = PROJECT_ANIMATION.ROTATION_START;
            this.rotationElapsed = 0;
            this.clock.start();
            this.isRotating = true;
        }
    }

    @HostListener("window:resize")
    onResize(): void {
        const canvas = this.canvasRef.nativeElement;
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.animationId);

        if (this.controls) {
            this.controls.dispose();
        }

        this.threeSceneService.disposeScene(this.scene);

        if (this.dracoLoader) {
            this.dracoLoader.dispose();
        }

        if (this.renderer) {
            this.threeSceneService.disposeRenderer(this.renderer);
        }
    }
}
