import {AfterViewInit, Component, ElementRef, HostListener, inject, OnDestroy, ViewChild,} from "@angular/core";
import * as THREE from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {NgForOf, NgIf} from "@angular/common";
import { ProjectService } from "../../services/project.service";
import { Project } from "../../models/project.model";
import { ThreeSceneService } from "../../services/three-scene.service";
import { environment } from "../../../environments/environment";

@Component({
    selector: "app-projects",
    standalone: true,
    templateUrl: "./projects.component.html",
    styleUrls: ["./projects.component.scss"],
    imports: [NgForOf, NgIf],
})
export class ProjectsComponent implements AfterViewInit, OnDestroy {
    private projectService = inject(ProjectService);
    private threeSceneService = inject(ThreeSceneService);

    @ViewChild("canvas", {static: true})
    canvasRef!: ElementRef<HTMLCanvasElement>;

    selectedProjectIndex = 0;
    screenMesh?: THREE.Mesh;
    scene = new THREE.Scene();
    camera!: THREE.PerspectiveCamera;
    renderer!: THREE.WebGLRenderer;
    controls!: OrbitControls;
    textureLoader = new THREE.TextureLoader();
    animationId: number = 0;

    private model?: THREE.Object3D;
    private clock = new THREE.Clock();
    private isRotating = true;
    private rotationElapsed = 0;
    private readonly rotationDuration = 1.2;
    private readonly rotationStart = 0;
    private readonly rotationEnd = Math.PI / 2;
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
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    private setupCamera() {
        const canvas = this.canvasRef.nativeElement;
        this.camera = new THREE.PerspectiveCamera(
            50,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000,
        );
        this.camera.position.set(0, 0, 5);
    }

    private setupSceneLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const light = new THREE.DirectionalLight(0xffffff, 1);
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
            const t = Math.min(this.rotationElapsed / this.rotationDuration, 1);
            const easedT = 1 - Math.pow(1 - t, 3);
            this.model.rotation.y =
                this.rotationStart + (this.rotationEnd - this.rotationStart) * easedT;

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

        loader.load(environment.assets.models.projectPhone, (gltf: any) => {
            this.model = gltf.scene;
            if (!this.model) return;

            this.model.position.set(0, 0, 0);
            this.model.scale.set(20, 20, 20);
            this.model.rotation.set(0, this.rotationStart, 0);
            this.scene.add(this.model);

            this.resetRotation();

            this.model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;

                    if (mesh.name === "screen") {
                        const uv = (mesh.geometry as THREE.BufferGeometry).attributes["uv"];
                        for (let i = 0; i < uv.count; i++) {
                            uv.setXY(i, uv.getX(i) + 2, uv.getY(i));
                        }
                        uv.needsUpdate = true;
                        this.screenMesh = mesh;
                        this.updateTexture();
                    }

                    if (mesh.name === "body") {
                        mesh.material = new THREE.MeshStandardMaterial({
                            color: 0x555555,
                            roughness: 0.2,
                            metalness: 0.4,
                        });
                    }
                }
            });
        });
    }

    private updateTexture(): void {
        if (!this.screenMesh) return;

        const texture = this.textureLoader.load(this.currentProject.texture, () => {
            texture.flipY = false;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;

            const oldMaterial = this.screenMesh!.material as
                | THREE.Material
                | THREE.Material[];
            if (Array.isArray(oldMaterial)) oldMaterial.forEach((m) => m.dispose());
            else oldMaterial.dispose();

            this.screenMesh!.material = new THREE.MeshBasicMaterial({map: texture});
            this.screenMesh!.material.needsUpdate = true;
        });
    }

    private resetRotation(): void {
        if (this.model) {
            this.model.rotation.y = this.rotationStart;
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

        // Dispose controls
        if (this.controls) {
            this.controls.dispose();
        }

        // Properly dispose of all Three.js resources
        this.threeSceneService.disposeScene(this.scene);

        if (this.dracoLoader) {
            this.dracoLoader.dispose();
        }

        if (this.renderer) {
            this.threeSceneService.disposeRenderer(this.renderer);
        }
    }
}
