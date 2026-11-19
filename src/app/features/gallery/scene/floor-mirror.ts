import {
  DepthTexture,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  PerspectiveCamera,
  Plane,
  Scene,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { MIRROR_STRENGTH, StoneFloor } from "./floor";

type Shader = NonNullable<WebGLRenderer["info"]["programs"]>[number];

/** The mirror image's share of the picture's height, and the most rows it is given: it is shown dim and blurred. */
const IMAGE = { share: 0.5, rows: 540 } as const;
/** Seconds the mirror image takes to come up once it can be drawn, so it never arrives in one frame. */
const COME_UP = 0.7;
/** The lens the image is taken through sees this far, well past the fog, so its slanted far side cuts nothing off. */
const FAR = 2000;

const UP = new Vector3(0, 1, 0);
const UNDER_FLOOR = new Matrix4().makeScale(1, -1, 1);
const LEFT_TO_RIGHT = new Matrix4().makeScale(-1, 1, 1);

/** The size of the mirror image for a picture of `width` by `height` pixels. */
export function mirrorImageSize(width: number, height: number): [width: number, height: number] {
  const rows = Math.max(Math.min(Math.round(height * IMAGE.share), IMAGE.rows), 1);
  return [Math.max(Math.round((rows * width) / Math.max(height, 1)), 1), rows];
}

/**
 * Slants the near side of `projection` onto `plane` (in the camera's own space, facing away from it), so nothing short
 * of the plane is drawn. Returns the scale by which the depth buffer then measures distance from the plane.
 */
export function obliqueNear(projection: Matrix4, plane: Vector4): number {
  const m = projection.elements;
  const corner = new Vector4(
    (Math.sign(plane.x) + m[8]) / m[0],
    (Math.sign(plane.y) + m[9]) / m[5],
    -1,
    (1 + m[10]) / m[14],
  );
  const scale = 2 / plane.dot(corner);
  m[2] = plane.x * scale;
  m[6] = plane.y * scale;
  m[10] = plane.z * scale + 1;
  m[14] = plane.w * scale;
  return scale;
}

/**
 * Draws the room a second time from under the floor, small, for the floor to show as a faint mirror image.
 * It draws only when asked to, inside a frame that is being drawn anyway, and holds nothing while it is off.
 */
export class FloorMirror {
  private readonly eye = new PerspectiveCamera();
  private readonly plane = new Plane();
  private readonly size = new Vector2();
  private target?: WebGLRenderTarget;
  private on = false;
  /** Shaders for drawing into the image, compiling in the background; it is not drawn until they are ready. */
  private compiling: Shader[] = [];
  private warmedFor = -1;
  private drawn = false;

  constructor(private readonly floor: StoneFloor) {
    this.eye.matrixAutoUpdate = false;
  }

  get enabled(): boolean {
    return this.on;
  }

  /** Switching it off takes the image out of the floor at once and frees it. */
  set enabled(on: boolean) {
    if (on === this.on) return;
    this.on = on;
    if (!on) this.release();
  }

  /** Call before drawing a frame with `camera`. True while it has more to do over the next frames: shaders to ready, or the image to bring up. */
  render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, seconds: number): boolean {
    if (!this.on) return false;
    if (!renderer.extensions.has("EXT_color_buffer_float")) {
      this.enabled = false;
      return false;
    }

    const target = this.sized(renderer);
    if (scene.children.length !== this.warmedFor) this.warm(renderer, scene, target);
    if (!this.ready(renderer)) return true;

    this.aim(camera);
    const { mirror } = this.floor;
    // The floor would be reading the image it is being drawn into, and from below there is nothing of it to see
    this.floor.visible = false;
    renderer.setRenderTarget(target);
    renderer.render(scene, this.eye);
    renderer.setRenderTarget(null);
    this.floor.visible = true;

    if (!this.drawn) {
      this.drawn = true;
      mirror.mirrorMap.value = target.texture;
      mirror.mirrorDepth.value = target.depthTexture;
    }
    mirror.mirrorSize.value.copy(this.size);
    mirror.mirrorLens.value.set(camera.projectionMatrix.elements[0] / 2, camera.projectionMatrix.elements[5] / 2);
    mirror.mirrorTexel.value = 1.5 / target.height;
    mirror.mirrorStrength.value = Math.min(mirror.mirrorStrength.value + (MIRROR_STRENGTH * seconds) / COME_UP, MIRROR_STRENGTH);
    return mirror.mirrorStrength.value < MIRROR_STRENGTH;
  }

  dispose(): void {
    this.enabled = false;
  }

  private sized(renderer: WebGLRenderer): WebGLRenderTarget {
    const { x, y } = renderer.getDrawingBufferSize(this.size);
    const [width, height] = mirrorImageSize(x, y);
    this.target ??= new WebGLRenderTarget(width, height, {
      type: HalfFloatType,
      minFilter: LinearMipmapLinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: true,
      depthTexture: new DepthTexture(width, height),
    });
    this.target.setSize(width, height);
    return this.target;
  }

  /** Puts the eye where the camera's reflection in the floor is, looking at the room through the floor. */
  private aim(camera: PerspectiveCamera): void {
    camera.updateMatrixWorld();
    // Turned left to right as well: a view that is only upside down would draw every surface inside out
    this.eye.matrix.copy(camera.matrixWorld).premultiply(UNDER_FLOOR).multiply(LEFT_TO_RIGHT);
    this.eye.matrixWorldNeedsUpdate = true;
    this.eye.updateMatrixWorld();

    this.eye.fov = camera.fov;
    this.eye.aspect = camera.aspect;
    this.eye.near = camera.near;
    this.eye.far = FAR;
    this.eye.updateProjectionMatrix();

    // Cut off at the floor itself: any higher, and the eye would see into the next room under the foot of a wall
    this.plane.set(UP, 0).applyMatrix4(this.eye.matrixWorldInverse);
    const { normal, constant } = this.plane;
    this.floor.mirror.mirrorScale.value = obliqueNear(
      this.eye.projectionMatrix,
      new Vector4(normal.x, normal.y, normal.z, constant),
    );
    this.eye.projectionMatrixInverse.copy(this.eye.projectionMatrix).invert();
  }

  // Drawn into the image, every material needs a shader of its own; made on the spot they would freeze the walk
  private warm(renderer: WebGLRenderer, scene: Scene, target: WebGLRenderTarget): void {
    const known = new Set(renderer.info.programs);
    renderer.setRenderTarget(target);
    renderer.compile(scene, this.eye);
    renderer.setRenderTarget(null);
    this.compiling.push(...(renderer.info.programs ?? []).filter((shader) => !known.has(shader)));
    this.warmedFor = scene.children.length;
  }

  /** Readies one finished shader at most, so no frame pays for them all; true once none is left. */
  private ready(renderer: WebGLRenderer): boolean {
    const next = this.compiling[0];
    if (!next) return true;
    const gl = renderer.getContext();
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    // A browser that cannot say whether a shader is finished waits for it here instead
    if (!parallel || gl.getProgramParameter(next.program, parallel.COMPLETION_STATUS_KHR)) {
      next.getUniforms();
      this.compiling.shift();
    }
    return this.compiling.length === 0;
  }

  private release(): void {
    const { mirror } = this.floor;
    mirror.mirrorStrength.value = 0;
    mirror.mirrorMap.value = null;
    mirror.mirrorDepth.value = null;
    this.target?.depthTexture?.dispose();
    this.target?.dispose();
    this.target = undefined;
    this.compiling = [];
    this.warmedFor = -1;
    this.drawn = false;
  }
}
