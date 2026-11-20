import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { buildWaypoints } from "./camera-path";
import { wells } from "./ceilings";
import { Daylight, buildTopLight, SHAFT, shaftLevel, TOP_LIGHT } from "./daylight";
import { CORNICE, dadoHeight, DOME, DOOR, DOOR_XS, END_WALL_X, EYE, HALF_DEPTH, LAYLIGHT, PEDESTAL_RADIUS, ROTUNDA, roomSpans, WALL_HEIGHT } from "./layout";
import { buildShading } from "./shading";

interface Patch {
  corners: Vector3[];
  strength: number;
  soft: number;
  rows: [number, number];
}

/** The painted patches, each from the six corners of its two triangles. */
function patches(): Patch[] {
  const { geometry } = buildTopLight();
  const [position, uv, wash] = ["position", "uv", "wash"].map((name) => geometry.getAttribute(name));
  const exact = (value: number) => Math.round(value * 1e5) / 1e5;
  return Array.from({ length: position.count / 6 }, (_, patch) => {
    const at = [0, 1, 2, 5].map((corner) => patch * 6 + corner);
    return {
      corners: at.map((index) => new Vector3(exact(position.getX(index)), exact(position.getY(index)), exact(position.getZ(index)))),
      strength: exact(wash.getX(at[0])),
      soft: exact(wash.getY(at[0])),
      rows: [exact(uv.getY(at[0])), exact(uv.getY(at[2]))],
    };
  });
}

const lying = (patch: Patch) => patch.corners.every((corner) => corner.y < 0.01);
const middle = (patch: Patch) => patch.corners.reduce((sum, corner) => sum.add(corner), new Vector3()).divideScalar(4);

describe("buildTopLight", () => {
  it("is one mesh, so all the light from above costs one draw", () => {
    const light = buildTopLight();

    expect(light).toBeInstanceOf(Mesh);
    expect(light.children.length).toBe(0);
    expect(light.geometry.getAttribute("position").count % 6).toBe(0);
  });

  it("adds light over what is there without hiding it or writing depth, and never changes", () => {
    const { material } = buildTopLight();

    expect(material.blending).toBe(AdditiveBlending);
    expect(material.transparent).toBeTrue();
    expect(material.depthWrite).toBeFalse();
    expect(Object.keys(material.uniforms).filter((name) => !name.startsWith("fog"))).toEqual(["tint"]);
  });

  it("is laid over the painted shade and under everything painted after it", () => {
    const light = buildTopLight();

    expect(light.renderOrder).toBeGreaterThan(buildShading().renderOrder);
    expect(light.renderOrder).toBeLessThan(0);
  });

  it("thins out with the room's fog, so a far room's light never glows through it", () => {
    const { material } = buildTopLight();

    expect(material.fog).toBeTrue();
    expect(material.uniforms["fogNear"]).toBeDefined();
    expect(material.fragmentShader).toContain("1.0 - smoothstep(fogNear, fogFar, vFogDepth)");
  });

  it("is pale and a shade cool, and faint: the rooms stay dark", () => {
    const tint = buildTopLight().material.uniforms["tint"].value as { r: number; g: number; b: number };

    expect(tint.b).toBeGreaterThanOrEqual(tint.r);
    expect(tint.b - tint.r).toBeLessThan(0.1);
    for (const strength of Object.values(TOP_LIGHT)) {
      expect(strength).toBeGreaterThan(0.05);
      expect(strength).toBeLessThan(0.2);
    }
    for (const patch of patches()) expect(patch.strength).toBeLessThan(0.2);
  });

  it("stays inside the building, a hair off the surface it lies on", () => {
    for (const patch of patches()) {
      for (const corner of patch.corners) {
        expect(corner.x).toBeGreaterThan(ROTUNDA.x - ROTUNDA.radius);
        expect(corner.x).toBeLessThan(END_WALL_X);
        expect(Math.abs(corner.z)).toBeLessThanOrEqual(HALF_DEPTH);
        expect(corner.y).toBeGreaterThan(0.001);
        expect(corner.y).toBeLessThan(WALL_HEIGHT);
      }
    }
  });

  it("washes both long walls of every room between the panelled base and the cornice", () => {
    for (const span of roomSpans()) {
      for (const side of [-1, 1]) {
        const onWall = patches().filter(
          (patch) => !lying(patch) && patch.corners.every((corner) => Math.abs(corner.z - side * HALF_DEPTH) < 0.01) && Math.abs(middle(patch).x - (span.from + span.to) / 2) < 0.01,
        );

        expect(onWall.length).withContext(`room from ${span.from}, side ${side}`).toBe(1);
        const ys = onWall[0].corners.map((corner) => corner.y);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(dadoHeight(span));
        expect(Math.max(...ys)).toBeLessThan(WALL_HEIGHT - CORNICE.drop);
        expect(Math.min(...onWall[0].corners.map((corner) => corner.x))).toBeCloseTo(span.from, 4);
        expect(Math.max(...onWall[0].corners.map((corner) => corner.x))).toBeCloseTo(span.to, 4);
      }
    }
  });

  it("falls fullest on a wall about where the pictures hang, not up under the cornice", () => {
    const [onWall] = patches().filter((patch) => !lying(patch));
    const [low, high] = onWall.rows;
    const ys = onWall.corners.map((corner) => corner.y);
    const fullest = Math.min(...ys) + ((0.5 - low) / (high - low)) * (Math.max(...ys) - Math.min(...ys));

    expect(high).toBe(1);
    expect(fullest).toBeGreaterThan(1.4);
    expect(fullest).toBeLessThan(2.6);
  });

  it("leaves the walls beside a door their light and keeps it off the door's casing", () => {
    const acrossRoom = patches().filter((patch) => !lying(patch) && new Set(patch.corners.map((corner) => corner.x)).size === 1);

    expect(acrossRoom.length).toBe(roomSpans().length * 4);
    for (const patch of acrossRoom) {
      expect(Math.min(...patch.corners.map((corner) => Math.abs(corner.z)))).toBeGreaterThan(DOOR.width / 2 + 0.24);
    }
  });

  it("lays a pool of light on the floor under every stretch of glass, wider than the glass and inside the room", () => {
    const pools = patches().filter(lying);

    for (const span of roomSpans()) {
      for (const well of wells(span)) {
        const xs = (patch: Patch) => patch.corners.map((corner) => corner.x);
        const under = pools.filter(
          (patch) => Math.min(...xs(patch)) < well.from && Math.max(...xs(patch)) > well.to && Math.max(...patch.corners.map((corner) => Math.abs(corner.z))) > LAYLIGHT.halfWidth,
        );

        expect(under.length).withContext(`well from ${well.from}`).toBe(1);
        expect(middle(under[0]).z).toBe(0);
        expect(Math.min(...xs(under[0]))).toBeGreaterThanOrEqual(span.from - 1e-6);
        expect(Math.max(...xs(under[0]))).toBeLessThanOrEqual(span.to + 1e-6);
      }
    }
  });

  it("lets the next room's light fall through every door onto the floor before it", () => {
    const pools = patches().filter(lying);

    for (const x of DOOR_XS) {
      const before = pools.filter((patch) => {
        const xs = patch.corners.map((corner) => corner.x);
        return Math.max(...xs) > x && Math.max(...xs) < x + 1.5 && Math.min(...xs) < x - 2 && Math.min(...xs) > x - 4;
      });

      expect(before.length).withContext(`door at ${x}`).toBe(1);
      expect(middle(before[0]).x).toBeLessThan(x);
      expect(Math.max(...before[0].corners.map((corner) => Math.abs(corner.z)))).toBeGreaterThan(DOOR.width / 2);
    }
  });

  it("faces every patch into its room: up from the floor, and off each wall towards the room's middle", () => {
    const spans = roomSpans();

    for (const patch of patches()) {
      const [a, b, , d] = patch.corners;
      const faces = b.clone().sub(a).cross(d.clone().sub(a)).normalize();
      const closesRoom = new Set(patch.corners.map((corner) => corner.x)).size === 1;
      const room = spans.find((span) => a.x > span.from - 0.1 && a.x < span.to + 0.1);
      const inwards = lying(patch)
        ? new Vector3(0, 1, 0)
        : closesRoom
          ? new Vector3(room && a.x < (room.from + room.to) / 2 ? 1 : -1, 0, 0)
          : new Vector3(0, 0, -Math.sign(a.z));

      expect(faces.dot(inwards)).toBeCloseTo(1, 4);
    }
  });
});

describe("shaftLevel", () => {
  const [from, by] = SHAFT.leaves;

  it("comes up with the statue's lights", () => {
    expect(shaftLevel(0, 0, true)).toBe(0);
    expect(shaftLevel(0, 0.3, true)).toBeCloseTo(0.3, 6);
    expect(shaftLevel(0, 1, true)).toBe(1);
    expect(shaftLevel(0, 1.4, true)).toBe(1);
  });

  it("stays whole while the visitor rounds the statue and is gone before they reach Room I", () => {
    expect(shaftLevel(from, 1, true)).toBe(1);
    expect(shaftLevel((from + by) / 2, 1, true)).toBeCloseTo(0.5, 6);
    expect(shaftLevel(by, 1, true)).toBe(0);
    expect(shaftLevel(1, 1, true)).toBe(0);
    expect(shaftLevel(6, 1, true)).toBe(0);
    expect(by).toBeLessThan(1);
  });

  it("is nothing once quality has stepped down", () => {
    expect(shaftLevel(0, 1, false)).toBe(0);
  });
});

describe("Daylight", () => {
  type Shaft = Mesh<CylinderGeometry, ShaderMaterial>;
  let daylight: Daylight;
  let shaft: Shaft;

  beforeEach(() => {
    daylight = new Daylight();
    shaft = daylight.objects.find((object) => object.name === "shaft") as Shaft;
  });

  it("is the rooms' top light and the hall's shaft, and nothing else", () => {
    expect(daylight.objects.map((object) => object.name)).toEqual(["top-light", "shaft"]);
  });

  it("stands the shaft on the statue's own axis, from the floor to the dome's opening and no higher", () => {
    const { radiusTop, radiusBottom, height } = shaft.geometry.parameters;

    expect([shaft.position.x, shaft.position.z]).toEqual([ROTUNDA.x, 0]);
    expect(shaft.position.y).toBeCloseTo(height / 2, 6);
    expect(height).toBe(ROTUNDA.height);
    expect(radiusTop).toBe(DOME.oculus);
    expect(radiusBottom).toBe(SHAFT.foot);
    expect(radiusBottom).toBeGreaterThan(radiusTop);
  });

  it("tells the shader the same column it gives the mesh", () => {
    const { foot, shape } = shaft.material.uniforms;
    const { radiusTop, radiusBottom, height } = shaft.geometry.parameters;

    expect((foot.value as Vector3).toArray()).toEqual([ROTUNDA.x, 0, 0]);
    expect((shape.value as Vector3).toArray()).toEqual([radiusBottom, radiusTop, height]);
  });

  it("is wide enough to hold the statue's drum, and leaves the visitor's way round it outside", () => {
    const atEye = SHAFT.foot - ((SHAFT.foot - DOME.oculus) * EYE) / shaft.geometry.parameters.height;
    const nearest = Math.min(...buildWaypoints(4)[0].map((point) => Math.hypot(point.x - ROTUNDA.x, point.z)));

    expect(SHAFT.foot).toBeGreaterThan(PEDESTAL_RADIUS + 0.2);
    expect(nearest - atEye).toBeGreaterThan(0.4);
  });

  it("adds its light over the hall in one draw, both sides of its skin at once, and writes no depth", () => {
    const { material } = shaft;

    expect(material.blending).toBe(AdditiveBlending);
    expect(material.transparent).toBeTrue();
    expect(material.depthWrite).toBeFalse();
    expect(material.side).toBe(DoubleSide);
    expect(material.forceSinglePass).toBeTrue();
  });

  it("is dark and not drawn until it is first told the lights are up", () => {
    expect(shaft.visible).toBeFalse();
    expect(shaft.material.uniforms["strength"].value).toBe(0);
  });

  it("shows the shaft at the entrance as bright as the lights have risen", () => {
    daylight.update(0, 0.3, true);
    const dim = shaft.material.uniforms["strength"].value as number;
    daylight.update(0, 1, true);

    expect(shaft.visible).toBeTrue();
    expect(shaft.material.uniforms["strength"].value).toBe(SHAFT.strength);
    expect(dim).toBeCloseTo(SHAFT.strength * 0.3, 6);
  });

  it("stops drawing the shaft once the visitor has left the hall, and draws it again when they come back", () => {
    daylight.update(0, 1, true);
    daylight.update(2, 1, true);
    expect(shaft.visible).toBeFalse();

    daylight.update(0.1, 1, true);
    expect(shaft.visible).toBeTrue();
  });

  it("drops the shaft when quality steps down", () => {
    daylight.update(0, 1, true);
    daylight.update(0, 1, false);

    expect(shaft.visible).toBeFalse();
    expect(shaft.material.uniforms["strength"].value).toBe(0);
  });

  it("thins the shaft above the statue, where the page sets its name over it", () => {
    const [from, to] = SHAFT.thinsOver;
    // Through the middle of the column on a sight line that climbs: the most it can add behind the name
    const behindName = SHAFT.strength * SHAFT.thin * (4 / 3) * SHAFT.foot * 1.2;

    expect(from).toBeLessThan(ROTUNDA.plinthHeight + ROTUNDA.lionHeight);
    expect(to).toBeLessThan(ROTUNDA.plinthHeight + ROTUNDA.lionHeight + 1);
    expect(SHAFT.thin).toBeLessThan(0.5);
    expect(behindName).toBeLessThan(0.08);
  });

  describe("drawn", () => {
    const SIZE = 256;
    let renderer: WebGLRenderer;
    let target: WebGLRenderTarget;
    let scene: Scene;

    /** How much light a pixel of the picture holds, 0 to 255; `across` and `up` are counted from its middle. */
    function lightAt(camera: PerspectiveCamera, across: number, up: number): number {
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);
      const pixel = new Uint8Array(4);
      renderer.readRenderTargetPixels(target, SIZE / 2 + across, SIZE / 2 + up, 1, 1, pixel);
      renderer.setRenderTarget(null);
      return pixel[0];
    }

    function lookingFrom(x: number, y: number, at: Vector3): PerspectiveCamera {
      const camera = new PerspectiveCamera(50, 1, 0.1, 80);
      camera.position.set(x, y, 0);
      camera.lookAt(at);
      camera.updateMatrixWorld();
      return camera;
    }

    beforeEach(() => {
      if (!document.createElement("canvas").getContext("webgl2")) pending("needs WebGL");
      renderer = new WebGLRenderer({ canvas: document.createElement("canvas") });
      renderer.setClearColor(0x000000, 1);
      target = new WebGLRenderTarget(SIZE, SIZE);
      const floor = new Mesh(new PlaneGeometry(60, 60), new MeshBasicMaterial({ color: 0x000000 }));
      floor.rotation.x = -Math.PI / 2;
      scene = new Scene();
      scene.add(floor, shaft);
      daylight.update(0, 1, true);
      // Several times its own strength, so that eight bits can tell its parts apart
      shaft.material.uniforms["strength"].value = 0.25;
    });

    afterEach(() => {
      target?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    });

    it("is brightest through its middle, fades to its edge and adds nothing beside it", () => {
      const level = lookingFrom(ROTUNDA.x - 9, 1.6, new Vector3(ROTUNDA.x, 1.6, 0));
      // A metre at the column's middle is this many pixels across
      const metre = SIZE / 2 / (9 * Math.tan((25 * Math.PI) / 180));
      const radius = SHAFT.foot - ((SHAFT.foot - DOME.oculus) * 1.6) / ROTUNDA.height;
      const at = (share: number) => lightAt(level, Math.round(radius * share * metre), 0);

      expect(at(0)).toBeGreaterThan(at(0.5));
      expect(at(0.5)).toBeGreaterThan(at(0.85));
      expect(at(0.85)).toBeGreaterThan(0);
      expect(at(1.3)).toBe(0);
      expect(at(-0.5)).toBeCloseTo(at(0.5), -1);
    });

    it("is thinner above the statue than beside it", () => {
      const level = lookingFrom(ROTUNDA.x - 9, 3.4, new Vector3(ROTUNDA.x, 3.4, 0));
      const metre = SIZE / 2 / (9 * Math.tan((25 * Math.PI) / 180));
      const [beside, above] = [lightAt(level, 0, Math.round(-2 * metre)), lightAt(level, 0, Math.round(2.4 * metre))];

      expect(above).toBeLessThan(beside * 0.7);
      expect(above).toBeGreaterThan(0);
    });

    it("lands on the floor without an edge along the far rim of its foot", () => {
      const rim = new Vector3(ROTUNDA.x + SHAFT.foot, 0, 0);
      const down = lookingFrom(ROTUNDA.x - 4, 3, rim);
      const [inside, outside] = [lightAt(down, 0, -3), lightAt(down, 0, 3)];

      expect(inside).toBeGreaterThan(0);
      expect(Math.abs(outside - inside)).toBeLessThan(Math.max(inside * 0.35, 3));
    });

    it("draws top light and shaft together without a shader error", () => {
      const failed = jasmine.createSpy("shader error");
      renderer.debug.onShaderError = failed;
      scene.add(...daylight.objects);

      renderer.render(scene, lookingFrom(ROTUNDA.x - 6, EYE, new Vector3(ROTUNDA.x, 3, 0)));

      expect(failed).not.toHaveBeenCalled();
      expect(renderer.info.render.calls).toBe(3);
    });
  });
});
