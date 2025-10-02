import { Injectable, OnDestroy } from "@angular/core";
import * as THREE from "three";

/**
 * Service to help manage Three.js resources and prevent memory leaks
 */
@Injectable({
  providedIn: "root",
})
export class ThreeSceneService implements OnDestroy {
  /**
   * Properly dispose of Three.js scene and all its resources
   */
  disposeScene(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      // Dispose geometry
      if (object.geometry) {
        object.geometry.dispose();
      }

      // Dispose material(s)
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => this.disposeMaterial(material));
        } else {
          this.disposeMaterial(object.material);
        }
      }
    });

    scene.clear();
  }

  /**
   * Dispose of a material and its associated textures
   */
  private disposeMaterial(material: THREE.Material): void {
    // Dispose textures
    Object.keys(material).forEach((key) => {
      const value = (material as any)[key];
      if (value && typeof value === "object" && "minFilter" in value) {
        value.dispose();
      }
    });

    material.dispose();
  }

  /**
   * Dispose of renderer
   */
  disposeRenderer(renderer: THREE.WebGLRenderer): void {
    renderer.dispose();
    renderer.forceContextLoss();
  }

  ngOnDestroy(): void {
    // Service cleanup if needed
  }
}
