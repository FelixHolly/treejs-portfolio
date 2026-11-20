import {
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
import { buildCeilings } from "./ceilings";
import { Fabric, newFabric } from "./fabric";
import { StoneFloor } from "./floor";
import { Gilt } from "./gilt";
import { buildHall } from "./hall";
import { BENCH, END_WALL_X, ENFILADE, HALF_DEPTH, PEDESTAL_RADIUS, ROTUNDA } from "./layout";
import { buildRooms } from "./rooms";
import { buildShading } from "./shading";
import { Stonework } from "./stonework";
import { brushedTexture, walnutTexture, writtenPageTexture } from "./textures";

export interface Palette {
  /** Walls and everything built onto them, each face in its own tone. */
  masonry: Material;
  /** Ceilings and the dome, painted in their tones and not lit. */
  plaster: Material;
  floor: StoneFloor;
  gold: Gilt;
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
    masonry: new MeshLambertMaterial({ vertexColors: true }),
    // Unlit: a ceiling only ever faces the dark half of the ambient light and would render pure black
    plaster: new MeshBasicMaterial({ vertexColors: true }),
    floor: new StoneFloor(),
    gold: new Gilt(),
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

/** The hall's floor with its gold inlay, and the statue's drum in the middle of it. */
function hallFloor(palette: Palette): Group {
  const group = new Group();

  const floor = new Mesh(new CircleGeometry(ROTUNDA.radius, 72), palette.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  const inlay = new Mesh(new RingGeometry(3.3, 3.34, 96), palette.gold);
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = 0.004;

  group.position.x = ROTUNDA.x;
  group.add(floor, inlay, pedestal(palette));
  return group;
}

export function buildArchitecture(palette: Palette): Group {
  const building = new Group();

  // Starts in the doorway's depth and a hair above the hall's own floor, so the two never flicker where they meet
  const floorFrom = ENFILADE.from - 0.15;
  const floor = new Mesh(new PlaneGeometry(END_WALL_X - floorFrom, HALF_DEPTH * 2 + 0.4), palette.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((floorFrom + END_WALL_X) / 2, 0.001, 0);
  floor.receiveShadow = true;

  // All that stands still is five meshes however much of it there is: the hall apart from the rooms, so that
  // from most of the rooms the hall is out of sight and not drawn
  const rooms = newFabric();
  const hall: Fabric = { masonry: new Stonework(), plaster: new Stonework(), gilt: rooms.gilt };
  buildHall(hall);
  buildRooms(rooms);
  buildCeilings(rooms.plaster);
  const laid: [name: string, stone: Stonework, material: Material][] = [
    ["hall-masonry", hall.masonry, palette.masonry],
    ["hall-plaster", hall.plaster, palette.plaster],
    ["rooms-masonry", rooms.masonry, palette.masonry],
    ["rooms-plaster", rooms.plaster, palette.plaster],
    ["gilt", rooms.gilt, palette.gold],
  ];
  const fixed = laid.map(([name, stone, material]) => {
    const mesh = new Mesh(stone.geometry(), material);
    mesh.name = name;
    return mesh;
  });

  building.add(floor, hallFloor(palette), ...fixed, buildShading());
  building.add(
    slab(2.4, 0.08, 0.6, BENCH.x, 0.45, BENCH.z, palette.wood),
    slab(0.08, 0.42, 0.5, BENCH.x - 1, 0.21, BENCH.z, palette.wood),
    slab(0.08, 0.42, 0.5, BENCH.x + 1, 0.21, BENCH.z, palette.wood),
  );
  return building;
}
