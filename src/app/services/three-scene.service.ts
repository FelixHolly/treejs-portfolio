import {Injectable} from "@angular/core";
import {Material, Mesh, Object3D, Scene, WebGLRenderer} from "three";

/**
 * Service to help manage Three.js resources and prevent memory leaks
 */
@Injectable({
  providedIn: "root",
})
export class ThreeSceneService {
  /**
   * Properly dispose of Three.js scene and all its resources
   */
  disposeScene(scene: Scene): void {
    scene.traverse((object: Object3D) => {
      if (!(object as Mesh).isMesh) return;

      const mesh = object as Mesh;

      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => this.disposeMaterial(material));
        } else {
          this.disposeMaterial(mesh.material);
        }
      }
    });

    scene.clear();
  }

  /**
   * Dispose of a material and its associated textures
   */
  private disposeMaterial(material: Material): void {
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
  disposeRenderer(renderer: WebGLRenderer): void {
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
