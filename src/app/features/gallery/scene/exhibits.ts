import {
  BackSide,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Texture,
  TubeGeometry,
  Vector3,
} from "three";
import { Palette, slab } from "./building";
import { glow } from "./atmosphere";
import { FrameSlot, HANG_Z } from "./layout";

/** What a frame puts round its picture: the mat's width, the moulding's, and how far the moulding stands off the wall. */
function frameProfile(slot: FrameSlot): { mat: number; bar: number; depth: number } {
  const large = slot.width > 2;
  return {
    mat: slot.gilded ? (large ? 0.12 : 0.09) : 0.07,
    bar: slot.gilded ? (large ? 0.09 : 0.06) : 0.035,
    depth: 0.07,
  };
}

export interface FramedPicture<Surface extends Material = MeshBasicMaterial> {
  group: Group;
  /** The picture itself; its texture arrives later. */
  picture: Mesh<PlaneGeometry, Surface>;
  slot: FrameSlot;
}

export function framedPicture(slot: FrameSlot, palette: Palette, plainFrame: MeshLambertMaterial): FramedPicture;
export function framedPicture<Surface extends Material>(
  slot: FrameSlot,
  palette: Palette,
  plainFrame: MeshLambertMaterial,
  surface: Surface,
): FramedPicture<Surface>;
export function framedPicture(
  slot: FrameSlot,
  palette: Palette,
  plainFrame: MeshLambertMaterial,
  surface: Material = new MeshBasicMaterial({ color: 0x1b1b1f, toneMapped: false }),
): FramedPicture<Material> {
  const { mat, bar, depth } = frameProfile(slot);
  const material = slot.gilded ? palette.gold : plainFrame;
  const innerWidth = slot.width + mat * 2;
  const innerHeight = slot.height + mat * 2;

  const group = new Group();
  group.position.set(slot.x, slot.y, HANG_Z + depth / 2 + 0.005);
  group.add(
    slab(innerWidth + bar * 2, bar, depth, 0, innerHeight / 2 + bar / 2, 0, material),
    slab(innerWidth + bar * 2, bar, depth, 0, -(innerHeight / 2 + bar / 2), 0, material),
    slab(bar, innerHeight, depth, -(innerWidth / 2 + bar / 2), 0, 0, material),
    slab(bar, innerHeight, depth, innerWidth / 2 + bar / 2, 0, 0, material),
  );

  const board = new Mesh(new PlaneGeometry(innerWidth, innerHeight), palette.bone);
  board.position.z = -depth / 2 + 0.01;

  const picture = new Mesh(new PlaneGeometry(slot.width, slot.height), surface);
  picture.position.z = -depth / 2 + 0.018;

  group.add(board, picture);
  return { group, picture, slot };
}

/** A little under full white, so the picture sits in the room's light rather than glowing out of it. */
export function hang(picture: FramedPicture["picture"], map: Texture): void {
  picture.material.map = map;
  picture.material.color.set(0xdedede);
  picture.material.needsUpdate = true;
}

/** The picture light: how far its hood stands above the frame and out from it, and the hood's own size. */
const PICTURE_LIGHT = { rise: 0.1, reach: 0.12, hood: 0.03, tilt: 0.1, share: 0.44, longest: 1.25 } as const;
/** Its light on the mat: how strong it is right under the lamp, and how far across and down the mat it has gone. */
const WASH = { strength: 0.42, across: 1.7, down: 0.6 } as const;

/**
 * A brass picture light arching over a frame, to be added to the frame's own group.
 * Its light on the mat is painted on: it lies behind the picture, so only the mat takes it.
 */
export function pictureLight(slot: FrameSlot, palette: Palette): Group {
  const { mat, bar, depth } = frameProfile(slot);
  const { rise, reach, hood, tilt } = PICTURE_LIGHT;
  const innerWidth = slot.width + mat * 2;
  const innerHeight = slot.height + mat * 2;
  const top = innerHeight / 2 + bar;
  const length = Math.min((innerWidth + bar * 2) * PICTURE_LIGHT.share, PICTURE_LIGHT.longest);
  const light = new Group();

  const trough = new CylinderGeometry(hood, hood, length, 12, 1, false, 0, Math.PI);
  const lamp = new Group();
  lamp.position.set(0, top + rise, depth / 2 + reach);
  lamp.rotation.x = tilt;
  const shell = new Mesh(trough, palette.gold);
  const lining = new Mesh(trough, new MeshBasicMaterial({ color: 0xffe3ab, side: BackSide, toneMapped: false }));
  const tube = new Mesh(
    new CylinderGeometry(0.008, 0.008, length - 0.05, 8),
    new MeshBasicMaterial({ color: 0xfff6dd, toneMapped: false }),
  );
  // A half cylinder opens sideways as built; turned onto its side its open half faces down
  for (const part of [shell, lining, tube]) part.rotation.z = Math.PI / 2;
  tube.position.y = 0.008;
  lamp.add(shell, lining, tube);

  const arms = length > 0.8 ? [-length * 0.28, length * 0.28] : [0];
  for (const x of arms) {
    const sweep = new CatmullRomCurve3([
      new Vector3(x, top - 0.02, -depth / 2 + 0.012),
      new Vector3(x, top + rise * 0.7, -depth / 2 + 0.02),
      new Vector3(x, top + rise + 0.035, depth / 2 + reach * 0.4),
      new Vector3(x, top + rise + 0.02, depth / 2 + reach - 0.004),
    ]);
    light.add(
      new Mesh(new TubeGeometry(sweep, 10, 0.006, 6), palette.gold),
      slab(0.05, 0.014, 0.03, x, top + 0.007, -depth / 2 + 0.015, palette.gold),
    );
  }

  const wash = new Mesh(new PlaneGeometry(innerWidth, innerHeight), glow("pool", WASH.strength));
  const uv = wash.geometry.getAttribute("uv");
  // The glow fades from the middle of its own square; this sets that middle under the lamp, on the mat's top edge
  for (let index = 0; index < uv.count; index++) {
    uv.setXY(index, 0.5 + (uv.getX(index) - 0.5) / WASH.across, 0.5 - (1 - uv.getY(index)) / (WASH.down * 2));
  }
  wash.position.z = -depth / 2 + 0.014;
  wash.name = "wash";

  light.add(lamp, wash);
  return light;
}

/** A lettered board in a thin gold frame. Unlit, so it reads the same in a pool of light as beside one. */
export function letteredBoard(x: number, y: number, width: number, height: number, lettering: Texture, palette: Palette): Group {
  const bar = 0.028;
  const group = new Group();
  group.position.set(x, y, HANG_Z + 0.02);

  const face = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: lettering, toneMapped: false }));
  face.position.z = 0.012;
  group.add(
    face,
    slab(width + bar * 2, bar, 0.04, 0, height / 2 + bar / 2, 0, palette.gold),
    slab(width + bar * 2, bar, 0.04, 0, -(height / 2 + bar / 2), 0, palette.gold),
    slab(bar, height, 0.04, -(width / 2 + bar / 2), 0, 0, palette.gold),
    slab(bar, height, 0.04, width / 2 + bar / 2, 0, 0, palette.gold),
  );
  return group;
}

export function envelope(palette: Palette): Group {
  const group = new Group();
  const seal = new Mesh(new CylinderGeometry(0.016, 0.016, 0.004, 18), palette.gold);
  seal.position.y = 0.005;
  group.add(slab(0.23, 0.006, 0.16, 0, 0, 0, palette.bone), slab(0.23, 0.001, 0.002, 0, 0.0036, -0.02, palette.dark), seal);
  return group;
}
