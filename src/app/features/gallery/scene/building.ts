import {
  BackSide,
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
} from "three";
import { StoneFloor } from "./floor";
import {
  BENCH,
  DOOR,
  DOOR_XS,
  END_WALL_X,
  ENFILADE,
  HALF_DEPTH,
  PEDESTAL_RADIUS,
  ROTUNDA,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from "./layout";
import { buildShading, HALL_FACES } from "./shading";
import { brushedTexture, walnutTexture, writtenPageTexture } from "./textures";

export interface Palette {
  wall: Material;
  wallInside: Material;
  ceiling: Material;
  floor: StoneFloor;
  gold: Material;
  bone: Material;
  dark: Material;
  wood: Material;
  pedestal: Material;
  walnut: Material;
  /** Brushed, for the larger metal surfaces. */
  brass: Material;
  paper: Material;
  /** A sheet somebody has written on. */
  page: Material;
}

export function createPalette(): Palette {
  // One texture as colour and as relief, so the scene's own clean-up, which frees `map`, frees both
  const grain = walnutTexture();

  return {
    wall: new MeshLambertMaterial({ color: 0x646362 }),
    wallInside: new MeshLambertMaterial({ color: 0x646362, side: BackSide }),
    // Unlit: a ceiling only ever faces the dark half of the ambient light and would render pure black
    ceiling: new MeshBasicMaterial({ color: 0x1b1b1f }),
    floor: new StoneFloor(),
    gold: new MeshStandardMaterial({ color: 0xc7a44a, roughness: 0.38, metalness: 0.65 }),
    bone: new MeshLambertMaterial({ color: 0xe8e5de }),
    dark: new MeshLambertMaterial({ color: 0x1c1a19 }),
    wood: new MeshLambertMaterial({ color: 0x5a4030 }),
    pedestal: new MeshStandardMaterial({ color: 0x33312e, roughness: 0.6, metalness: 0 }),
    walnut: new MeshStandardMaterial({ map: grain, bumpMap: grain, bumpScale: 0.25, roughness: 0.6, metalness: 0 }),
    brass: new MeshStandardMaterial({ color: 0xbd9a45, map: brushedTexture(), roughness: 0.5, metalness: 0.7 }),
    paper: new MeshStandardMaterial({ color: 0xd8d2c3, roughness: 0.92, metalness: 0 }),
    page: new MeshStandardMaterial({ map: writtenPageTexture(), roughness: 0.92, metalness: 0 }),
  };
}

export function slab(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: Material,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** A stepped drum of dark stone with one gold line let into it; round, so the statue can stand turned on it. */
function pedestal(palette: Palette): Group {
  const group = new Group();
  const top = ROTUNDA.plinthHeight;
  const drum = (radius: number, height: number, y: number, material: Material) => {
    const mesh = new Mesh(new CylinderGeometry(radius, radius, height, 64), material);
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  group.add(
    drum(PEDESTAL_RADIUS + 0.2, 0.18, 0.09, palette.pedestal),
    drum(PEDESTAL_RADIUS, top - 0.26, 0.18 + (top - 0.26) / 2, palette.pedestal),
    drum(PEDESTAL_RADIUS + 0.1, 0.08, top - 0.04, palette.pedestal),
    drum(PEDESTAL_RADIUS + 0.006, 0.014, top - 0.2, palette.gold),
  );
  return group;
}

function rotunda(palette: Palette): Group {
  const group = new Group();
  const { radius, height } = ROTUNDA;
  // CylinderGeometry starts its sweep at +Z; the door to Room I faces +X, a quarter turn on.
  const gap = Math.asin(DOOR.width / 2 / radius);

  const wall = new Mesh(
    new CylinderGeometry(radius, radius, height, HALL_FACES, 1, true, Math.PI / 2 + gap, Math.PI * 2 - gap * 2),
    palette.wallInside,
  );
  wall.position.y = height / 2;

  const lintelHeight = height - DOOR.height;
  const lintel = new Mesh(
    new CylinderGeometry(radius, radius, lintelHeight, 8, 1, true, Math.PI / 2 - gap, gap * 2),
    palette.wallInside,
  );
  lintel.position.y = DOOR.height + lintelHeight / 2;

  const ceiling = new Mesh(new CircleGeometry(radius, 48), palette.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;

  const floor = new Mesh(new CircleGeometry(radius, 72), palette.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  const inlay = new Mesh(new RingGeometry(3.3, 3.34, 96), palette.gold);
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = 0.004;

  group.position.x = ROTUNDA.x;
  group.add(wall, lintel, ceiling, floor, inlay, pedestal(palette));
  return group;
}

function crossWall(x: number, palette: Palette): Group {
  const group = new Group();
  const sideDepth = HALF_DEPTH - DOOR.width / 2;
  const sideZ = DOOR.width / 2 + sideDepth / 2;
  const headHeight = WALL_HEIGHT - DOOR.height;

  group.add(
    slab(WALL_THICKNESS, WALL_HEIGHT, sideDepth, x, WALL_HEIGHT / 2, -sideZ, palette.wall),
    slab(WALL_THICKNESS, WALL_HEIGHT, sideDepth, x, WALL_HEIGHT / 2, sideZ, palette.wall),
    slab(WALL_THICKNESS, headHeight, DOOR.width, x, DOOR.height + headHeight / 2, 0, palette.wall),
  );

  for (const face of [-1, 1]) {
    const faceX = x + face * (WALL_THICKNESS / 2 + 0.012);
    const jambHeight = DOOR.height + 0.12;
    group.add(
      slab(0.024, jambHeight, 0.12, faceX, jambHeight / 2, -(DOOR.width / 2 + 0.06), palette.gold),
      slab(0.024, jambHeight, 0.12, faceX, jambHeight / 2, DOOR.width / 2 + 0.06, palette.gold),
      slab(0.024, 0.12, DOOR.width + 0.24, faceX, DOOR.height + 0.06, 0, palette.gold),
    );
  }
  return group;
}

export function buildArchitecture(palette: Palette): Group {
  const building = new Group();
  const length = ENFILADE.to - ENFILADE.from;
  const midX = (ENFILADE.from + ENFILADE.to) / 2;

  // Starts in the doorway's depth and a hair above the hall's own floor, so the two never flicker where they meet
  const floorFrom = ENFILADE.from - 0.15;
  const floor = new Mesh(new PlaneGeometry(END_WALL_X - floorFrom, HALF_DEPTH * 2 + 0.4), palette.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((floorFrom + END_WALL_X) / 2, 0.001, 0);
  floor.receiveShadow = true;

  const ceiling = new Mesh(new PlaneGeometry(length, HALF_DEPTH * 2 + 0.4), palette.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(midX, WALL_HEIGHT, 0);

  building.add(floor, ceiling, rotunda(palette), buildShading());

  for (const side of [-1, 1]) {
    const z = side * HALF_DEPTH;
    building.add(
      slab(length, WALL_HEIGHT, 0.2, midX, WALL_HEIGHT / 2, z + side * 0.1, palette.wall),
      slab(length, 0.03, 0.02, midX, 4.5, z - side * 0.012, palette.gold),
      slab(length, 0.16, 0.03, midX, 0.08, z - side * 0.016, palette.dark),
    );
  }

  for (const x of DOOR_XS) building.add(crossWall(x, palette));
  building.add(slab(WALL_THICKNESS, WALL_HEIGHT, HALF_DEPTH * 2, END_WALL_X, WALL_HEIGHT / 2, 0, palette.wall));

  building.add(
    slab(2.4, 0.08, 0.6, BENCH.x, 0.45, BENCH.z, palette.wood),
    slab(0.08, 0.42, 0.5, BENCH.x - 1, 0.21, BENCH.z, palette.wood),
    slab(0.08, 0.42, 0.5, BENCH.x + 1, 0.21, BENCH.z, palette.wood),
  );
  return building;
}
