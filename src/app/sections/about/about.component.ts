// about.component.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
} from "@angular/core";
import * as THREE from "three";
import Globe from "three-globe";
import { ButtonComponent } from "../../components/button/button.component";

// Globe constants
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

// Location markers
const LOCATIONS = [
  { lat: 45.3, lng: 14.4, text: "Rijeka, Croatia", color: "white", size: 15 },
  { lat: 36.1699, lng: -115.1398, text: "Las Vegas, USA", color: "white", size: 15 },
] as const;

@Component({
  selector: "app-about",
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.scss"],
})
export class AboutComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("globeCanvas", { static: true })
  canvasRef!: ElementRef<HTMLDivElement>;

  stats = {
    experience: 3,
    projects: 5,
    satisfaction: 100,
    techStack: 10,
  };

  private animationId: number = 0;
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private globe?: Globe;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.init3DGlobe();
  }

  ngOnDestroy(): void {
    // Cancel animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Dispose globe
    if (this.globe) {
      this.scene?.remove(this.globe as any);
    }

    // Dispose scene
    if (this.scene) {
      this.scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;
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

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      const canvas = this.renderer.domElement;
      canvas.remove();
    }
  }

  private init3DGlobe(): void {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    this.renderer.setSize(GLOBE_CONFIG.SIZE, GLOBE_CONFIG.SIZE);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GLOBE_CONFIG.MAX_PIXEL_RATIO));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvasRef.nativeElement.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
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
    this.scene.add(new THREE.AmbientLight(0xffffff, 1));
    this.scene.add(new THREE.DirectionalLight(0xffffff, 0.6));

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
