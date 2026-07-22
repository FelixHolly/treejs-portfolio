/**
 * About section component featuring an antique cartographer's globe.
 *
 * The globe is a gold wireframe sphere (meridians and parallels) over a
 * graphite core — no external textures or globe libraries, so it renders
 * instantly, works offline, and stays inside the Stone & Gold palette.
 *
 * Performance strategy:
 * - Uses IntersectionObserver for lazy initialization (defers WebGL context creation)
 * - Globe only initializes when section becomes visible, reducing initial page load
 */
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
} from "@angular/core";
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  SRGBColorSpace,
  Mesh,
  Group,
  SphereGeometry,
  MeshBasicMaterial,
  LineLoop,
  LineBasicMaterial,
  BufferGeometry,
  Vector3,
} from "three";
import { ButtonComponent } from "../../components/button/button.component";
import { RevealDirective } from "../../directives/reveal.directive";

/**
 * Globe rendering configuration.
 *
 * Fixed 326x326 size provides consistent appearance across devices.
 * Rotation speed calibrated for subtle, non-distracting animation.
 * The wireframe segment counts ARE the drawing: widthSegments become
 * meridians, heightSegments become parallels.
 */
const GLOBE_CONFIG = {
  SIZE: 326,
  CAMERA_FOV: 45,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 100,
  CAMERA_Z: 30,
  RADIUS: 10,
  ROTATION_SPEED: 0.0015,
  GOLD: 0xc7a44a,
  CORE: 0x1b1b1f,
  MAX_PIXEL_RATIO: 2,
} as const;

@Component({
  selector: "app-about",
  standalone: true,
  imports: [ButtonComponent, RevealDirective],
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.scss"],
})
export class AboutComponent implements AfterViewInit, OnDestroy {
  @ViewChild("globeCanvas", { static: true })
  canvasRef!: ElementRef<HTMLDivElement>;

  stats = {
    experience: 3,
    projects: 5,
    satisfaction: 100,
    techStack: 10,
  };

  private animationId = 0;
  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private globe?: Group;
  private observer?: IntersectionObserver;
  private isGlobeInitialized = false;

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.globe) {
      this.scene?.remove(this.globe);
    }

    if (this.scene) {
      this.scene.traverse((object) => {
        // Meshes and the graticule's line rings both hold GPU resources
        const drawable = object as Mesh;
        if (drawable.geometry || drawable.material) {
          drawable.geometry?.dispose();
          if (drawable.material) {
            if (Array.isArray(drawable.material)) {
              drawable.material.forEach((mat) => mat.dispose());
            } else {
              drawable.material.dispose();
            }
          }
        }
      });
      this.scene.clear();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      const canvas = this.renderer.domElement;
      canvas.remove();
    }
  }

  /**
   * Configures lazy loading for the 3D globe using IntersectionObserver.
   *
   * The observer is disconnected after first trigger since we only need
   * one-time initialization (globe persists once created).
   */
  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.isGlobeInitialized) {
            this.isGlobeInitialized = true;
            this.init3DGlobe();
            // Disconnect after init to free up observer resources
            this.observer?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    this.observer.observe(this.canvasRef.nativeElement);
  }

  /**
   * Builds the gold graticule as clean line rings: parallels are latitude
   * circles, meridians are great circles rotated about the axis — the
   * drawing of an antique cartographer's globe, not a triangulated mesh.
   */
  private buildGraticule(): Group {
    const graticule = new Group();
    const radius = GLOBE_CONFIG.RADIUS;
    const segments = 96;
    const material = new LineBasicMaterial({
      color: GLOBE_CONFIG.GOLD,
      transparent: true,
      opacity: 0.55,
    });

    const ring = (points: Vector3[]) =>
      new LineLoop(new BufferGeometry().setFromPoints(points), material);

    // Parallels every 15° of latitude (skipping the poles)
    for (let lat = -75; lat <= 75; lat += 15) {
      const phi = (lat * Math.PI) / 180;
      const y = radius * Math.sin(phi);
      const r = radius * Math.cos(phi);
      const points: Vector3[] = [];
      for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
      }
      graticule.add(ring(points));
    }

    // Meridians every 15° of longitude: great circles about the axis
    for (let lng = 0; lng < 180; lng += 15) {
      const points: Vector3[] = [];
      for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new Vector3(radius * Math.cos(theta), radius * Math.sin(theta), 0));
      }
      const meridian = ring(points);
      meridian.rotation.y = (lng * Math.PI) / 180;
      graticule.add(meridian);
    }

    return graticule;
  }

  private init3DGlobe(): void {
    this.renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    this.renderer.setSize(GLOBE_CONFIG.SIZE, GLOBE_CONFIG.SIZE);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GLOBE_CONFIG.MAX_PIXEL_RATIO));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.canvasRef.nativeElement.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    const camera = new PerspectiveCamera(
      GLOBE_CONFIG.CAMERA_FOV,
      1,
      GLOBE_CONFIG.CAMERA_NEAR,
      GLOBE_CONFIG.CAMERA_FAR
    );
    camera.position.z = GLOBE_CONFIG.CAMERA_Z;

    // Graphite core occludes the far-side lines so the sphere reads as solid
    const core = new Mesh(
      new SphereGeometry(GLOBE_CONFIG.RADIUS * 0.99, 48, 32),
      new MeshBasicMaterial({ color: GLOBE_CONFIG.CORE }),
    );

    this.globe = new Group();
    this.globe.add(core, this.buildGraticule());
    // A cartographer's tilt
    this.globe.rotation.z = 0.41;
    this.scene.add(this.globe);

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (this.globe) {
        this.globe.rotation.y += GLOBE_CONFIG.ROTATION_SPEED;
      }
      if (this.renderer && this.scene) {
        this.renderer.render(this.scene, camera);
      }
    };
    animate();
  }
}
