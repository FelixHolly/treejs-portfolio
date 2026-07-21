/**
 * Projects showcase component: each project hangs as a painting in a gilded frame.
 *
 * The frame is built procedurally (no model file): gold frame bars, a bone
 * matting board, and a canvas plane textured with the project screenshot.
 * Museum lighting (warm key, cool rim) matches the hero scene.
 *
 * On project change the painting swings from profile to face the visitor,
 * and the canvas texture is swapped with proper GPU disposal.
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
  SRGBColorSpace,
  Material,
  Group,
  PlaneGeometry,
  BoxGeometry,
} from "three";
import { ProjectService } from "../../services/project.service";
import { Project } from "../../models/project.model";
import { ThreeSceneService } from "../../services/three-scene.service";

/**
 * Swing animation: the framed piece starts turned away and eases to face
 * the viewer (cubic ease-out), like a panel being hung.
 */
const PROJECT_ANIMATION = {
    SWING_DURATION: 1.2,
    SWING_START: -Math.PI / 3,
    EASE_POWER: 3,
} as const;

/** Roman numerals for exhibit labels; portfolios stay well under 40 entries. */
function toRoman(n: number): string {
    const table: [number, string][] = [
        [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
    ];
    let out = "";
    for (const [value, glyph] of table) {
        while (n >= value) {
            out += glyph;
            n -= value;
        }
    }
    return out;
}

/**
 * Frame proportions in world units. Canvas aspect (~0.47) matches the
 * portrait project screenshots; matting and bars wrap around it.
 */
const FRAME_CONFIG = {
    CANVAS_WIDTH: 1.47,
    CANVAS_HEIGHT: 3.1,
    MAT_BORDER: 0.2,
    BAR_THICKNESS: 0.16,
    BAR_DEPTH: 0.14,
    GOLD: 0xc7a44a,
    MAT_COLOR: 0xe8e5de,
} as const;

// Camera constants
const CAMERA_CONFIG = {
    FOV: 50,
    NEAR: 0.1,
    FAR: 1000,
    POSITION: [0, 0, 4.2] as const,
} as const;

@Component({
    selector: "app-projects",
    standalone: true,
    templateUrl: "./projects.component.html",
    styleUrls: ["./projects.component.scss"],
})
export class ProjectsComponent implements AfterViewInit, OnDestroy {
    private projectService = inject(ProjectService);
    private threeSceneService = inject(ThreeSceneService);

    @ViewChild("canvas", {static: true})
    canvasRef!: ElementRef<HTMLCanvasElement>;

    selectedProjectIndex = 0;
    scene = new Scene();
    isLoading = true;
    camera!: PerspectiveCamera;
    renderer!: WebGLRenderer;
    textureLoader = new TextureLoader();
    animationId = 0;

    private frameGroup?: Group;
    private canvasMesh?: Mesh;
    private clock = new Clock();
    private isRotating = true;
    private rotationElapsed = 0;

    myProjects: Project[] = [];

    constructor() {
        this.myProjects = this.projectService.getProjects();
    }

    get currentProject(): Project {
        return this.myProjects[this.selectedProjectIndex];
    }

    /** Carousel position in gallery-plaque language, e.g. "Exhibit II / III". */
    get exhibitLabel(): string {
        return `Exhibit ${toRoman(this.selectedProjectIndex + 1)} / ${toRoman(this.myProjects.length)}`;
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
        this.buildFrame();
        this.updateTexture();
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
        this.renderer.outputColorSpace = SRGBColorSpace;
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

    /** Museum lighting to match the hero: warm key, dim ambient, cool rim. */
    private setupSceneLights() {
        this.scene.add(new AmbientLight(0xe8e5de, 0.6));

        const keyLight = new DirectionalLight(0xffd9a0, 2.0);
        keyLight.position.set(4, 6, 6);
        this.scene.add(keyLight);

        const rimLight = new DirectionalLight(0x8fa3bf, 0.7);
        rimLight.position.set(-6, 2, -4);
        this.scene.add(rimLight);
    }

    /**
     * Builds the gilded frame: canvas plane front and center, bone matting
     * board behind it, and four gold bars around the matting's edge.
     */
    private buildFrame(): void {
        const {CANVAS_WIDTH: w, CANVAS_HEIGHT: h, MAT_BORDER: m, BAR_THICKNESS: t, BAR_DEPTH: d} = FRAME_CONFIG;

        const group = new Group();

        const goldMaterial = new MeshStandardMaterial({
            color: FRAME_CONFIG.GOLD,
            metalness: 0.85,
            roughness: 0.35,
        });
        const matMaterial = new MeshStandardMaterial({
            color: FRAME_CONFIG.MAT_COLOR,
            roughness: 0.9,
        });

        // Matting board behind the canvas
        const mat = new Mesh(new PlaneGeometry(w + 2 * m, h + 2 * m), matMaterial);
        mat.position.z = -0.01;
        group.add(mat);

        // Canvas plane; texture is applied in updateTexture()
        this.canvasMesh = new Mesh(
            new PlaneGeometry(w, h),
            new MeshBasicMaterial({color: 0x1b1b1f, toneMapped: false}),
        );
        this.canvasMesh.position.z = 0.001;
        group.add(this.canvasMesh);

        // Gold bars wrap the matting: horizontal bars span the full outer width
        const outerW = w + 2 * m + 2 * t;
        const horizontal = new BoxGeometry(outerW, t, d);
        const vertical = new BoxGeometry(t, h + 2 * m, d);

        const top = new Mesh(horizontal, goldMaterial);
        top.position.y = (h + 2 * m + t) / 2;
        const bottom = new Mesh(horizontal, goldMaterial);
        bottom.position.y = -(h + 2 * m + t) / 2;
        const left = new Mesh(vertical, goldMaterial);
        left.position.x = -(w + 2 * m + t) / 2;
        const right = new Mesh(vertical, goldMaterial);
        right.position.x = (w + 2 * m + t) / 2;
        group.add(top, bottom, left, right);

        group.rotation.y = PROJECT_ANIMATION.SWING_START;
        this.frameGroup = group;
        this.scene.add(group);
    }

    private animate = () => {
        this.animationId = requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();

        if (this.isRotating && this.frameGroup) {
            this.rotationElapsed += delta;
            const t = Math.min(this.rotationElapsed / PROJECT_ANIMATION.SWING_DURATION, 1);
            const easedT = 1 - Math.pow(1 - t, PROJECT_ANIMATION.EASE_POWER);
            this.frameGroup.rotation.y = PROJECT_ANIMATION.SWING_START * (1 - easedT);

            if (t >= 1) this.isRotating = false;
        }

        this.renderer.render(this.scene, this.camera);
    };

    /**
     * Swaps the canvas texture for the selected project.
     *
     * Disposes the previous material and its texture before assigning the new
     * one — each undisposed swap leaks GPU memory.
     */
    private updateTexture(): void {
        if (!this.canvasMesh) return;

        const texture = this.textureLoader.load(this.currentProject.texture, () => {
            texture.colorSpace = SRGBColorSpace;

            const oldMaterial = this.canvasMesh!.material as Material | Material[];
            const materials = Array.isArray(oldMaterial) ? oldMaterial : [oldMaterial];
            materials.forEach((material) => {
                if (material instanceof MeshBasicMaterial && material.map) {
                    material.map.dispose();
                }
                material.dispose();
            });

            this.canvasMesh!.material = new MeshBasicMaterial({
                map: texture,
                toneMapped: false,
            });
            this.isLoading = false;
        });
    }

    private resetRotation(): void {
        if (this.frameGroup) {
            this.frameGroup.rotation.y = PROJECT_ANIMATION.SWING_START;
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

        this.threeSceneService.disposeScene(this.scene);

        if (this.renderer) {
            this.threeSceneService.disposeRenderer(this.renderer);
        }
    }
}
