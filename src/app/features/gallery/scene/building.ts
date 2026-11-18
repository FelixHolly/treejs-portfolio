import {
  BackSide,
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
} from "three";
import { BENCH, DOOR, DOOR_XS, END_WALL_X, ENFILADE, HALF_DEPTH, ROTUNDA, WALL_HEIGHT, WALL_THICKNESS } from "./layout";

export interface Palette {
  wall: Material;
  wallInside: Material;
  ceiling: Material;
  floor: Material;
  gold: Material;
  bone: Material;
  dark: Material;
  wood: Material;
  stone: Material;
}

export function createPalette(): Palette {
  return {
    wall: new MeshLambertMaterial({ color: 0x5f5f6a }),
    wallInside: new MeshLambertMaterial({ color: 0x5f5f6a, side: BackSide }),
    ceiling: new MeshLambertMaterial({ color: 0x1d1d21 }),
    floor: new MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.42, metalness: 0 }),
    gold: new MeshStandardMaterial({ color: 0xc7a44a, roughness: 0.38, metalness: 0.65 }),
    bone: new MeshLambertMaterial({ color: 0xe8e5de }),
    dark: new MeshLambertMaterial({ color: 0x1c1a19 }),
    wood: new MeshLambertMaterial({ color: 0x5a4030 }),
    stone: new MeshLambertMaterial({ color: 0x6a675f }),
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

function rotunda(palette: Palette): Group {
  const group = new Group();
  const { radius, height, plinthHeight } = ROTUNDA;
  // CylinderGeometry starts its sweep at +Z; the door to Room I faces +X, a quarter turn on.
  const gap = Math.asin(DOOR.width / 2 / radius);

  const wall = new Mesh(
    new CylinderGeometry(radius, radius, height, 72, 1, true, Math.PI / 2 + gap, Math.PI * 2 - gap * 2),
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

  const cornice = new Mesh(new TorusGeometry(radius - 0.03, 0.025, 8, 96), palette.gold);
  cornice.rotation.x = Math.PI / 2;
  cornice.position.y = 4.9;

  const plinth = new Mesh(new CylinderGeometry(1.2, 1.32, plinthHeight, 48), palette.stone);
  plinth.position.y = plinthHeight / 2;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const band = new Mesh(new TorusGeometry(1.215, 0.015, 8, 64), palette.gold);
  band.rotation.x = Math.PI / 2;
  band.position.y = plinthHeight - 0.06;

  group.add(wall, lintel, ceiling, cornice, plinth, band);
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

  // Gold architrave on both faces of the doorway
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

/** Walls, floor, doors and fixed furniture of the whole building. */
export function buildArchitecture(palette: Palette): Group {
  const building = new Group();
  const length = ENFILADE.to - ENFILADE.from;
  const midX = (ENFILADE.from + ENFILADE.to) / 2;

  const floor = new Mesh(new PlaneGeometry(64, 12), palette.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(24, 0, 0);
  floor.receiveShadow = true;

  const ceiling = new Mesh(new PlaneGeometry(length, HALF_DEPTH * 2 + 0.4), palette.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(midX, WALL_HEIGHT, 0);

  building.add(floor, ceiling, rotunda(palette));

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
