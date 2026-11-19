import {
  Camera,
  Group,
  Material,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  Scene,
  WebGLRenderer,
} from "three";

type Shader = NonNullable<WebGLRenderer["info"]["programs"]>[number];

function isLit(material: unknown): material is Material {
  return material instanceof MeshLambertMaterial || material instanceof MeshStandardMaterial;
}

/**
 * Changing which lights cast a shadow gives every lit material a new shader, and made on the spot they freeze
 * the walk. This compiles them ahead while the old ones go on drawing. It counts on one shader per material.
 */
export class ShaderWarmup {
  private readonly waiting: Shader[] = [];
  private readonly seen = new Set<Material>();

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: Camera,
  ) {}

  /** Starts compiling what the lit surfaces under `root` need with the scene's lights as they are at this moment. */
  add(root: Object3D): void {
    const known = new Set(this.renderer.info.programs);
    const standIns = new Group();
    root.traverse((object) => {
      const { isMesh, geometry, material } = object as Mesh;
      if (!isMesh || !isLit(material) || this.seen.has(material)) return;
      this.seen.add(material);
      standIns.add(new Mesh(geometry, material));
    });
    // Stand-ins of lit surfaces only: what is compiled here for an unlit one it would draw with at once, ready or not
    this.renderer.compile(standIns, this.camera, this.scene);
    this.waiting.push(...(this.renderer.info.programs ?? []).filter((shader) => !known.has(shader)));
  }

  /** Call once a frame. Readies one shader at most, so no frame pays for them all; true once none is left. */
  done(): boolean {
    const next = this.waiting[0];
    if (!next) return true;
    const gl = this.renderer.getContext();
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    // A browser that cannot say whether a shader is finished waits for it here instead
    if (!parallel || gl.getProgramParameter(next.program, parallel.COMPLETION_STATUS_KHR)) {
      next.getUniforms();
      this.waiting.shift();
    }
    return this.waiting.length === 0;
  }
}
