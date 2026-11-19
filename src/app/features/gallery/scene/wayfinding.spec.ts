import { Color, CylinderGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene, Vector3, WebGLRenderer } from "three";
import { buildPoses, buildWaypoints, CameraPath, Pose } from "./camera-path";
import { OPEN_BAND, SceneWork } from "./gallery-view";
import {
  DESK,
  DOOR,
  DOOR_XS,
  END_WALL_X,
  EYE,
  fieldOfView,
  HALF_DEPTH,
  HANG_Z,
  LECTERN,
  MEDALLION,
  pieceSlots,
  ROTUNDA,
  SKILL_PLAQUES,
  SKILL_WALL,
  WALL_THICKNESS,
} from "./layout";
import { ROOM_NAME_ASPECT } from "./textures";
import { NAME_SIZE, NameSite, nameShows, nameSites, roomNames, Stretch } from "./wayfinding";

const ROOMS = [
  { numeral: "I", name: "The Developer" },
  { numeral: "II", name: "The Works" },
  { numeral: "III", name: "Visitors' Book" },
  { numeral: "IV", name: "Correspondence" },
];
const WORKS: SceneWork[] = [
  { slug: "a", kind: "commission", images: [1, 2, 3].map((n) => ({ src: `a${n}`, portrait: false })) },
  { slug: "b", kind: "study", images: [{ src: "b", portrait: true }] },
  { slug: "c", kind: "study", images: [{ src: "c", portrait: true }] },
  { slug: "d", kind: "self-portrait", images: [{ src: "d", portrait: false }] },
];
const SLOTS = pieceSlots(WORKS);

interface Screen {
  name: string;
  aspect: number;
  labelShare: number;
}
const DESKTOPS: Screen[] = [
  { name: "the owner's window", aspect: 1288 / 654, labelShare: 0.44 },
  { name: "a laptop", aspect: 1440 / 790, labelShare: 0.41 },
  { name: "full HD", aspect: 1920 / 969, labelShare: 0.29 },
];
const SCREENS: Screen[] = [
  ...DESKTOPS,
  { name: "a narrow window with the widest label", aspect: 1000 / 800, labelShare: 0.6 },
  { name: "an ultrawide screen", aspect: 3440 / 1300, labelShare: 0.2 },
  { name: "a tablet held upright", aspect: 768 / 1024, labelShare: 0 },
  { name: "a phone", aspect: 390 / 664, labelShare: 0 },
];
/** The stop before each room's door, by the room's place in walking order: the walk into the room is the leg after it. */
const LEG_INTO = [0, 2, SLOTS.length + 3, SLOTS.length + 4];
/** As far as the pointer may turn the visitor's head at a stop, in radians (`LOOK.yaw` in the scene). */
const LOOK_YAW = 0.06;

function posesFor(screen: Screen): Pose[] {
  return buildPoses(SLOTS, { aspect: screen.aspect, labelShare: screen.labelShare, statueBand: OPEN_BAND });
}

function cameraAt(pose: Pose, screen: Screen, yaw = 0): PerspectiveCamera {
  const camera = new PerspectiveCamera(fieldOfView(screen.aspect), screen.aspect, 0.1, 80);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.rotateY(yaw);
  camera.updateMatrixWorld(true);
  return camera;
}

/** How strongly a name shows to this camera, by the rule its shader follows. */
function seen(camera: PerspectiveCamera, site: NameSite): number {
  const ends = [-1, 1].map((side) => site.at.clone().addScaledVector(site.halfSpan, side));
  if (ends.some((end) => end.clone().applyMatrix4(camera.matrixWorldInverse).z > 0)) return 0;
  const heading = camera.getWorldDirection(new Vector3()).x;
  const aside = Math.max(...ends.map((end) => Math.abs(end.project(camera).x)));
  return nameShows(heading, site.at.x - camera.position.x, aside, site.stretch);
}

/** The four corners of a name's lettering. */
function corners(site: NameSite): Vector3[] {
  return [-1, 1].flatMap((side) =>
    [-1, 1].map((up) => site.at.clone().addScaledVector(site.halfSpan, side).setY(site.at.y + (up * NAME_SIZE.height) / 2)),
  );
}

function wholeOnScreen(camera: PerspectiveCamera, site: NameSite): boolean {
  return corners(site).every((corner) => {
    const point = corner.project(camera);
    return Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && point.z < 1;
  });
}

describe("nameShows", () => {
  const stretch: Stretch = { begins: 10, full: 9, lastFull: 3, ends: 2 };

  it("shows a name in full to a visitor walking on, within its stretch, with the name before them", () => {
    expect(nameShows(1, 6, 0, stretch)).toBe(1);
    expect(nameShows(0.5, 9, 0.8, stretch)).toBe(1);
    expect(nameShows(0.2, 3, 0.3, stretch)).toBe(1);
  });

  it("shows nothing to a visitor standing square to a piece, however the pointer turns their head", () => {
    expect(nameShows(0, 6, 0, stretch)).toBe(0);
    expect(nameShows(Math.sin(LOOK_YAW), 6, 0, stretch)).toBe(0);
    expect(nameShows(-0.8, 6, 0, stretch)).toBe(0);
  });

  it("comes up as the visitor nears it and has gone before they stand beside it", () => {
    expect(nameShows(1, 12, 0, stretch)).toBe(0);
    expect(nameShows(1, 10, 0, stretch)).toBe(0);
    expect(nameShows(1, 9.5, 0, stretch)).toBeCloseTo(0.5, 6);
    expect(nameShows(1, 2.5, 0, stretch)).toBeCloseTo(0.5, 6);
    expect(nameShows(1, 2, 0, stretch)).toBe(0);
    expect(nameShows(1, -4, 0, stretch)).toBe(0);
  });

  it("goes before it reaches the side of the screen, so it never shows cut off", () => {
    expect(nameShows(1, 6, 0.8, stretch)).toBe(1);
    expect(nameShows(1, 6, 0.89, stretch)).toBeCloseTo(0.5, 6);
    expect(nameShows(1, 6, 0.98, stretch)).toBe(0);
    expect(nameShows(1, 6, 3, stretch)).toBe(0);
  });

  it("never leaves the range 0 to 1, and only ever changes smoothly", () => {
    let last = nameShows(1, 12, 0, stretch);
    for (let shortBy = 12; shortBy >= 0; shortBy -= 0.05) {
      const level = nameShows(1, shortBy, 0, stretch);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
      expect(Math.abs(level - last)).toBeLessThan(0.1);
      last = level;
    }
  });
});

describe("the rooms' names", () => {
  const sites = nameSites();
  const [hall, side, third, fourth] = sites;
  const half = NAME_SIZE.width / 2;

  it("names each room once, in walking order, all at one size", () => {
    const names = roomNames(ROOMS);
    const letterings = names.map((name) => (name.material as MeshBasicMaterial).map?.image as HTMLCanvasElement);

    expect(sites.length).toBe(4);
    expect(names.length).toBe(4);
    expect(new Set(letterings).size).toBe(4);
    for (const lettering of letterings) expect(lettering.width / lettering.height).toBeCloseTo(ROOM_NAME_ASPECT, 6);
    for (const plate of names.slice(1)) {
      expect((plate.geometry as PlaneGeometry).parameters.width).toBe(NAME_SIZE.width);
      expect((plate.geometry as PlaneGeometry).parameters.height).toBeCloseTo(NAME_SIZE.width / ROOM_NAME_ASPECT, 6);
    }
    const band = (names[0].geometry as CylinderGeometry).parameters;
    expect(band.thetaLength * band.radiusTop).toBeCloseTo(NAME_SIZE.width, 6);
    expect(band.height).toBeCloseTo(NAME_SIZE.height, 6);
  });

  it("knows how far each name reaches along its wall, so it can tell when an end nears the side of the screen", () => {
    for (const site of sites) {
      expect(site.halfSpan.length()).toBeCloseTo(NAME_SIZE.width / 2, 6);
      expect(site.halfSpan.y).toBe(0);
    }
    expect(Math.abs(side.halfSpan.x)).toBeCloseTo(half, 6);
    expect(Math.abs(third.halfSpan.z)).toBeCloseTo(half, 6);
    expect(hall.halfSpan.dot(new Vector3(hall.at.x - ROTUNDA.x, 0, hall.at.z))).toBeCloseTo(0, 6);
  });

  it("letters no more names than it is given rooms", () => {
    expect(roomNames(ROOMS.slice(0, 2)).length).toBe(2);
    expect(roomNames([]).length).toBe(0);
  });

  it("sets every name at eye level, large enough to read across a room", () => {
    for (const site of sites) {
      expect(Math.abs(site.at.y - EYE)).toBeLessThan(0.25);
      expect(site.at.y - NAME_SIZE.height / 2).toBeGreaterThan(1.1);
      expect(site.at.y + NAME_SIZE.height / 2).toBeLessThan(2.6);
    }
    expect(NAME_SIZE.width).toBeGreaterThan(2);
  });

  it("letters Room I's name on the hall's wall beside its door, on the side the visitor faces coming round the statue", () => {
    const fromCentre = Math.hypot(hall.at.x - ROTUNDA.x, hall.at.z);
    const doorEdge = Math.asin(DOOR.width / 2 / ROTUNDA.radius) * ROTUNDA.radius;
    const alongWall = Math.atan2(hall.at.z, hall.at.x - ROTUNDA.x) * ROTUNDA.radius;

    expect(hall.wall).toBe("hall");
    expect(fromCentre).toBeCloseTo(ROTUNDA.radius - NAME_SIZE.offWall, 6);
    expect(alongWall - half).toBeGreaterThan(doorEdge + 0.2);
    expect(alongWall + half).toBeLessThan(doorEdge + 3.5);
  });

  it("letters Room II's name on the wall the visitor turns past on the way to its door, clear of the plaques and the seal", () => {
    const plaquesEnd = SKILL_PLAQUES.x + SKILL_WALL.width / 2;

    expect(side.wall).toBe("side");
    expect(side.at.z).toBeCloseTo(HANG_Z + NAME_SIZE.offWall, 6);
    expect(side.at.x).toBeGreaterThan((DOOR_XS[0] + DOOR_XS[1]) / 2);
    expect(side.at.x - half).toBeGreaterThan(plaquesEnd + 0.3);
    expect(side.at.x + half).toBeLessThan(DOOR_XS[1] - WALL_THICKNESS / 2 - 0.2);
    expect(MEDALLION.z - MEDALLION.radius - side.at.z).toBeGreaterThan(0.8);
  });

  it("letters Room III's name on the wall the visitor walks towards, between the corner and the next door's casing", () => {
    expect(third.wall).toBe("facing");
    expect(third.at.x).toBeCloseTo(DOOR_XS[3] - WALL_THICKNESS / 2 - NAME_SIZE.offWall, 6);
    expect(third.at.z - half).toBeGreaterThan(-HALF_DEPTH);
    expect(third.at.z + half).toBeLessThan(-(DOOR.width / 2 + 0.12));
    expect(third.at.x - LECTERN.x).toBeGreaterThan(3);
  });

  it("letters Room IV's name in the middle of the end wall, well clear of the desk and the letterbox", () => {
    expect(fourth.wall).toBe("facing");
    expect(fourth.at.x).toBeCloseTo(END_WALL_X - WALL_THICKNESS / 2 - NAME_SIZE.offWall, 6);
    expect(fourth.at.z).toBe(0);
    expect(fourth.at.z - half - DESK.z).toBeGreaterThan(1.5);
  });

  it("stays well under the gold line along the walls", () => {
    for (const site of sites) expect(site.at.y + NAME_SIZE.height / 2).toBeLessThan(4.5 - 1.5);
  });

  for (const screen of SCREENS) {
    it(`shows no name at any stop on ${screen.name}, wherever the pointer turns the visitor's head`, () => {
      posesFor(screen).forEach((pose, stop) => {
        for (const yaw of [0, LOOK_YAW, -LOOK_YAW]) {
          const camera = cameraAt(pose, screen, yaw);
          sites.forEach((site, room) => expect(seen(camera, site)).withContext(`stop ${stop}, room ${room + 1}`).toBeLessThan(0.002));
        }
      });
    });
  }

  for (const screen of DESKTOPS) {
    const poses = posesFor(screen);
    const path = new CameraPath(poses, buildWaypoints(SLOTS.length));
    const walk = (from: number, to: number) =>
      Array.from({ length: Math.round((to - from) * 200) + 1 }, (_, step) => {
        const pose: Pose = { position: new Vector3(), target: new Vector3() };
        path.sample(from + step / 200, pose);
        return cameraAt(pose, screen);
      });

    it(`shows each room's name whole and in full on the walk through its door on ${screen.name}`, () => {
      sites.forEach((site, room) => {
        const steps = walk(LEG_INTO[room], LEG_INTO[room] + 1);
        const clear = steps.filter((camera) => seen(camera, site) > 0.95 && wholeOnScreen(camera, site));

        expect(clear.length / steps.length).withContext(`room ${room + 1}`).toBeGreaterThan(0.06);
      });
    });

    it(`never shows more than a trace of a name cut off by the side of the screen on ${screen.name}`, () => {
      for (const camera of walk(0, poses.length - 1)) {
        for (const site of sites) {
          if (!wholeOnScreen(camera, site)) expect(seen(camera, site)).toBeLessThan(0.5);
        }
      }
    });

    it(`shows one name at a time all the way along the route on ${screen.name}`, () => {
      for (const camera of walk(0, poses.length - 1)) {
        expect(sites.filter((site) => seen(camera, site) > 0.05).length).toBeLessThanOrEqual(1);
      }
    });
  }
});

describe("the lettering's shader", () => {
  let renderer: WebGLRenderer;
  let scene: Scene;
  const sites = nameSites();
  const SIZE = { width: 320, height: 160 };

  /** How many pixels of the picture the lettering lit. */
  function lit(position: Vector3, yaw: number): number {
    const camera = new PerspectiveCamera(50, SIZE.width / SIZE.height, 0.1, 80);
    camera.position.copy(position);
    camera.rotation.set(0, yaw, 0);
    renderer.render(scene, camera);

    const context = renderer.getContext();
    const pixels = new Uint8Array(SIZE.width * SIZE.height * 4);
    context.readPixels(0, 0, SIZE.width, SIZE.height, context.RGBA, context.UNSIGNED_BYTE, pixels);
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) if (pixels[index] > 24) count += 1;
    return count;
  }
  /** Facing +X is a quarter turn to the right of the camera's own -Z. */
  const ALONG = -Math.PI / 2;

  /** Letters one room's name alone, so nothing else can light the picture. */
  function only(room: number): NameSite {
    scene.add(roomNames(ROOMS)[room]);
    return sites[room];
  }

  beforeEach(() => {
    renderer = new WebGLRenderer({ canvas: document.createElement("canvas") });
    renderer.setSize(SIZE.width, SIZE.height, false);
    scene = new Scene();
    scene.background = new Color(0x000000);
  });

  afterEach(() => {
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      (mesh.material as MeshBasicMaterial).map?.dispose();
      (mesh.material as MeshBasicMaterial).dispose();
    });
    renderer.dispose();
    renderer.forceContextLoss();
  });

  it("draws a name for a visitor walking towards it, and nothing from beyond its stretch of the walk", () => {
    const end = only(3).at;

    expect(lit(new Vector3(end.x - 6, end.y, 0), ALONG)).toBeGreaterThan(60);
    expect(lit(new Vector3(end.x - 14, end.y, 0), ALONG)).toBe(0);
    expect(lit(new Vector3(end.x - 2, end.y, 0), ALONG)).toBe(0);
  });

  it("draws nothing for a visitor standing square to the wall, and the name as soon as they turn to walk on", () => {
    const wall = only(1).at;
    const before = new Vector3(wall.x - 0.8, wall.y, 0);

    expect(lit(before, 0)).toBe(0);
    expect(lit(before, -LOOK_YAW)).toBe(0);
    expect(lit(before, -0.25)).toBeGreaterThan(60);
  });

  it("lets a name go as it nears the side of the screen", () => {
    const end = only(3).at;
    const from = new Vector3(end.x - 6, end.y, 0);

    expect(lit(from, ALONG + 0.55)).toBeLessThan(lit(from, ALONG) * 0.1);
  });
});
