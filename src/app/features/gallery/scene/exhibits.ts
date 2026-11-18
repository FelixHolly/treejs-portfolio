import { CircleGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, TorusGeometry } from "three";
import { Palette, slab } from "./building";
import { DESK, FrameSlot, HANG_Z, LECTERN, MEDALLION } from "./layout";

export interface FramedPicture {
  group: Group;
  /** The picture itself; its texture arrives later. */
  picture: Mesh<PlaneGeometry, MeshBasicMaterial>;
  slot: FrameSlot;
}

export function framedPicture(slot: FrameSlot, palette: Palette, plainFrame: MeshLambertMaterial): FramedPicture {
  const large = slot.width > 2;
  const mat = slot.gilded ? (large ? 0.12 : 0.09) : 0.07;
  const bar = slot.gilded ? (large ? 0.09 : 0.06) : 0.035;
  const depth = 0.07;
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

  const picture = new Mesh(
    new PlaneGeometry(slot.width, slot.height),
    new MeshBasicMaterial({ color: 0x1b1b1f, toneMapped: false }),
  );
  picture.position.z = -depth / 2 + 0.018;

  group.add(board, picture);
  return { group, picture, slot };
}

/** The FH monogram as a wall relief; the lettering is added once the fonts are ready. */
export function medallion(palette: Palette): Group {
  const group = new Group();
  group.position.set(MEDALLION.x, MEDALLION.y, HANG_Z + 0.03);

  const outer = new Mesh(new TorusGeometry(MEDALLION.radius, 0.022, 10, 96), palette.gold);
  const inner = new Mesh(new TorusGeometry(MEDALLION.radius - 0.12, 0.008, 8, 96), palette.gold);
  const field = new Mesh(new CircleGeometry(MEDALLION.radius - 0.02, 64), new MeshLambertMaterial({ color: 0x26262c }));
  field.position.z = -0.015;

  group.add(outer, inner, field);
  return group;
}

/** A lectern with the open visitors' book, turned to face the visitor's stop. */
export function lectern(palette: Palette, towards: { x: number; z: number }): Group {
  const group = new Group();
  group.position.set(LECTERN.x, 0, LECTERN.z);
  group.rotation.y = Math.atan2(towards.x - LECTERN.x, towards.z - LECTERN.z);

  const top = new Group();
  top.position.y = 1.08;
  top.rotation.x = 0.38;
  top.add(slab(0.74, 0.04, 0.52, 0, 0, 0, palette.wood), slab(0.64, 0.024, 0.44, 0, 0.032, 0, palette.wood));

  for (const side of [-1, 1]) {
    const page = new Mesh(new PlaneGeometry(0.3, 0.4), palette.bone);
    page.rotation.x = -Math.PI / 2;
    page.rotation.y = side * 0.06;
    page.position.set(side * 0.155, 0.05, 0);
    top.add(page);
  }
  top.add(slab(0.012, 0.004, 0.46, 0, 0.052, 0.02, palette.gold));

  group.add(slab(0.5, 0.06, 0.5, 0, 0.03, 0, palette.wood), slab(0.26, 1.02, 0.26, 0, 0.55, 0, palette.wood), top);
  return group;
}

/** The writing desk with the letter on it. */
export function writingDesk(palette: Palette, towards: { x: number; z: number }): Group {
  const group = new Group();
  group.position.set(DESK.x, 0, DESK.z);
  group.rotation.y = Math.atan2(towards.x - DESK.x, towards.z - DESK.z);

  group.add(slab(1.5, 0.05, 0.78, 0, 0.77, 0, palette.wood));
  for (const x of [-0.69, 0.69]) {
    for (const z of [-0.33, 0.33]) group.add(slab(0.06, 0.745, 0.06, x, 0.3725, z, palette.wood));
  }

  const sheets: [number, number, number][] = [
    [-0.05, 0.08, 0.12],
    [0.12, -0.02, -0.2],
  ];
  sheets.forEach(([x, z, turn], index) => {
    const sheet = new Mesh(new PlaneGeometry(0.3, 0.42), palette.bone);
    sheet.rotation.x = -Math.PI / 2;
    sheet.rotation.z = turn;
    sheet.position.set(x, 0.797 + index * 0.002, z);
    group.add(sheet);
  });

  const inkwell = new Mesh(new CylinderGeometry(0.035, 0.045, 0.06, 20), palette.gold);
  inkwell.position.set(0.52, 0.825, -0.22);
  const pen = slab(0.2, 0.008, 0.008, 0.36, 0.802, 0.1, palette.gold);
  pen.rotation.y = 0.5;

  group.add(inkwell, pen);
  return group;
}
