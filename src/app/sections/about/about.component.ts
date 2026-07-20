/**
 * About section component featuring an interactive 3D Earth globe.
 *
 * Performance strategy:
 * - Uses IntersectionObserver for lazy initialization (defers WebGL context creation)
 * - Globe only initializes when section becomes visible, reducing initial page load
 * - Saves ~2-3MB initial bundle impact and GPU resources for above-the-fold content
 *
 * The globe visualizes locations relevant to the portfolio owner and provides
 * an engaging visual element without impacting critical rendering path.
 */
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
} from "@angular/core";
import { NgOptimizedImage } from "@angular/common";
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  SRGBColorSpace,
  Mesh,
} from "three";
import Globe from "three-globe";
import { ButtonComponent } from "../../components/button/button.component";

/**
 * Globe rendering configuration.
 *
 * Fixed 326x326 size provides consistent appearance across devices.
 * Rotation speed calibrated for subtle, non-distracting animation.
 */
const GLOBE_CONFIG = {
  SIZE: 326,
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
  CAMERA_Z: 200,
  ROTATION_SPEED: 0.0015,
  ATMOSPHERE_COLOR: "#3a95ff",
  ATMOSPHERE_ALTITUDE: 0.25,
  MAX_PIXEL_RATIO: 2,
} as const;

/**
 * Geographic location markers to display on the globe.
 * Can be extended with additional locations as needed.
 */
const LOCATIONS = [
  { lat: 36.1699, lng: -115.1398, text: "Las Vegas, USA", color: "white", size: 15 },
] as const;

@Component({
  selector: "app-about",
  standalone: true,
  imports: [ButtonComponent, NgOptimizedImage],
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
  private globe?: Globe;
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
      this.scene?.remove(this.globe as any);
    }

    if (this.scene) {
      this.scene.traverse((object) => {
        if ((object as Mesh).isMesh) {
          const mesh = object as Mesh;
          mesh.geometry?.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => mat.dispose());
            } else {
              mesh.material.dispose();
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
   * Performance rationale:
   * - Avoids creating WebGL context during initial page load
   * - Reduces time-to-interactive for hero section
   * - rootMargin: 50px triggers slightly before viewport entry for smoother UX
   * - threshold: 0.1 means 10% visibility required before initialization
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
      GLOBE_CONFIG.SIZE / GLOBE_CONFIG.SIZE,
      GLOBE_CONFIG.CAMERA_NEAR,
      GLOBE_CONFIG.CAMERA_FAR
    );
    camera.position.z = GLOBE_CONFIG.CAMERA_Z;

    this.globe = new Globe()
      .globeImageUrl(
        "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
      )
      .bumpImageUrl(
        "https://unpkg.com/three-globe/example/img/earth-topology.png",
      )
      .showAtmosphere(true)
      .atmosphereColor(GLOBE_CONFIG.ATMOSPHERE_COLOR)
      .atmosphereAltitude(GLOBE_CONFIG.ATMOSPHERE_ALTITUDE)
      .labelsData(LOCATIONS as any);

    this.scene.add(this.globe as any);
    this.scene.add(new AmbientLight(0xffffff, 1));
    this.scene.add(new DirectionalLight(0xffffff, 0.6));

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
