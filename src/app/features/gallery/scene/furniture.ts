import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  PlaneGeometry,
  SphereGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { glow } from "./atmosphere";
import { Palette, slab } from "./building";
import { DESK, HANG_Z, LECTERN, LETTERBOX } from "./layout";
import { lampshadeTexture } from "./textures";

/** The height of the writing desk's top surface; the envelope in `post.ts` rests on it. */
export const DESK_TOP = 0.795;

type Axis = "x" | "y" | "z";
const AXES: Record<Axis, { along: number; across: [number, number] }> = {
  x: { along: 0, across: [1, 2] },
  y: { along: 1, across: [0, 2] },
  z: { along: 2, across: [0, 1] },
};
/** How many times the grain texture repeats in a metre, across the grain and along it. */
const GRAIN = { across: 2.9, along: 0.85 } as const;

/** Runs the wood's grain along `axis` at one scale, so a leg and a table top look cut from the same board. */
function grained<Geometry extends BufferGeometry>(geometry: Geometry, axis: Axis): Geometry {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const { along, across } = AXES[axis];
  const [first, second] = across;

  for (let index = 0; index < position.count; index++) {
    // A face shows the grain across whichever of the two other axes it lies along
    const faces = Math.abs(normal.getComponent(index, first)) > Math.abs(normal.getComponent(index, second));
    const width = position.getComponent(index, faces ? second : first);
    uv.setXY(index, width * GRAIN.across, position.getComponent(index, along) * GRAIN.along);
  }
  return geometry;
}

/** A `radius` of 0 leaves the edges square, for parts whose edges never catch the light. */
function board(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: Material,
  radius = 0.008,
  segments = 1,
): Mesh {
  const geometry = radius > 0 ? new RoundedBoxGeometry(width, height, depth, segments, radius) : new BoxGeometry(width, height, depth);
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

function plank(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  palette: Palette,
  axis: Axis,
  radius = 0.008,
  segments = 1,
): Mesh {
  const mesh = board(width, height, depth, x, y, z, palette.walnut, radius, segments);
  grained(mesh.geometry, axis);
  return mesh;
}

/** Turned on a lathe: `profile` lists the radius at each height, foot first. */
function turned(profile: readonly (readonly [radius: number, height: number])[], segments: number, material: Material): Mesh<LatheGeometry> {
  return new Mesh(new LatheGeometry(profile.map(([radius, height]) => new Vector2(radius, height)), segments), material);
}

/** Its origin is its foot, not its middle. */
function taperedLeg(top: number, foot: number, height: number, material: Material): Mesh {
  const geometry = new CylinderGeometry(top * Math.SQRT1_2, foot * Math.SQRT1_2, height, 4, 1).toNonIndexed();
  // Four flat sides square to the desk; a cylinder's own normals would shade them as a round post
  geometry.rotateY(Math.PI / 4);
  geometry.computeVertexNormals();
  geometry.translate(0, height / 2, 0);
  return new Mesh(geometry, material);
}

/**
 * A flat-sided solid: `outline` drawn anticlockwise in x and y, pushed `depth` along z about z = 0.
 * Every point of the outline must be in plain sight of its first, which it is fanned out from.
 */
function prism(outline: readonly (readonly [x: number, y: number])[], depth: number): BufferGeometry {
  const front = depth / 2;
  const points: number[] = [];
  const corner = (index: number, z: number) => points.push(outline[index][0], outline[index][1], z);

  for (let index = 1; index < outline.length - 1; index++) {
    for (const each of [0, index, index + 1]) corner(each, front);
    for (const each of [0, index + 1, index]) corner(each, -front);
  }
  outline.forEach((_, index) => {
    const next = (index + 1) % outline.length;
    corner(index, -front);
    corner(next, -front);
    corner(next, front);
    corner(index, -front);
    corner(next, front);
    corner(index, front);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** A soft shadow painted on the floor, where a real one would cost a shadow map for every lamp. */
function contactShadow(width: number, depth: number, strength: number): Mesh {
  const material = glow("pool", strength);
  material.blending = NormalBlending;
  material.uniforms["tint"].value.set(0x000000);
  const shadow = new Mesh(new PlaneGeometry(width, depth), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  return shadow;
}

const COLUMN: readonly (readonly [number, number])[] = [
  [0.15, 0.095],
  [0.176, 0.108],
  [0.176, 0.128],
  [0.15, 0.142],
  [0.112, 0.158],
  [0.098, 0.186],
  [0.11, 0.2],
  [0.11, 0.214],
  [0.078, 0.236],
  [0.094, 0.3],
  [0.097, 0.38],
  [0.08, 0.51],
  [0.06, 0.68],
  [0.054, 0.806],
  [0.074, 0.822],
  [0.074, 0.842],
  [0.056, 0.856],
  [0.062, 0.89],
  [0.108, 0.936],
  [0.108, 0.95],
];

const BOOK = { page: 0.3, depth: 0.42, steps: 8 } as const;

/** How high an open book's pages stand, from the gutter (0) to the fore-edge (1). */
function pageRise(t: number): number {
  return 0.007 + 0.017 * Math.sin(Math.PI * Math.sqrt(t)) * (1 - 0.35 * t);
}

function openBook(palette: Palette): Group {
  const book = new Group();
  const { page, depth, steps } = BOOK;

  const side: [number, number][] = [
    [0, 0],
    [page, 0],
  ];
  for (let step = steps; step >= 0; step--) side.push([(page * step) / steps, pageRise(step / steps)]);
  const block = prism(side, depth);

  for (const hand of [-1, 1]) {
    const pages = new Mesh(block, palette.paper);
    if (hand < 0) pages.rotation.y = Math.PI;

    const sheet = new PlaneGeometry(page - 0.012, depth - 0.016, steps, 1);
    sheet.rotateX(-Math.PI / 2);
    const position = sheet.getAttribute("position");
    for (let index = 0; index < position.count; index++) {
      const fromGutter = (hand * position.getX(index)) / page + 0.5;
      position.setY(index, pageRise(fromGutter) + 0.0008);
    }
    sheet.computeVertexNormals();
    const written = new Mesh(sheet, palette.page);
    written.position.x = (hand * page) / 2;

    book.add(pages, written);
  }

  const ribbon = slab(0.009, 0.002, depth + 0.05, 0, pageRise(0) + 0.002, 0.025, palette.gold);
  book.add(slab(page * 2 + 0.036, 0.014, depth + 0.024, 0, -0.007, 0, palette.dark), ribbon);
  return book;
}

export function lectern(palette: Palette, towards: { x: number; z: number }): Group {
  const group = new Group();
  group.position.set(LECTERN.x, 0, LECTERN.z);
  group.rotation.y = Math.atan2(towards.x - LECTERN.x, towards.z - LECTERN.z);

  const column = turned(COLUMN, 18, palette.walnut);
  const uv = column.geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index++) uv.setXY(index, uv.getX(index) * 2, uv.getY(index) * 0.75);

  const top = new Group();
  top.position.y = 1.08;
  top.rotation.x = 0.38;
  const book = openBook(palette);
  book.position.set(0, 0.03, -0.012);
  top.add(
    plank(0.74, 0.032, 0.54, 0, 0, 0, palette, "x", 0.012, 2),
    plank(0.62, 0.034, 0.42, 0, -0.03, 0, palette, "x", 0.012),
    plank(0.22, 0.05, 0.2, 0, -0.06, 0, palette, "x", 0),
    plank(0.7, 0.042, 0.026, 0, 0.034, 0.25, palette, "x", 0.01),
    book,
  );

  group.add(
    contactShadow(1.5, 1.5, 0.55),
    plank(0.52, 0.055, 0.52, 0, 0.0275, 0, palette, "x", 0.012),
    plank(0.4, 0.04, 0.4, 0, 0.075, 0, palette, "z", 0.012),
    column,
    plank(0.25, 0.034, 0.25, 0, 0.966, 0, palette, "x"),
    plank(0.17, 0.08, 0.17, 0, 1.008, 0, palette, "y", 0),
    top,
  );
  return group;
}

const LEG = { x: 0.69, z: 0.33, size: 0.06, foot: 0.034, block: 0.125, sabot: 0.07 } as const;
const APRON = { height: 0.11, thickness: 0.022, inset: 0.006 } as const;

export function writingDesk(palette: Palette, towards: { x: number; z: number }): Group {
  const group = new Group();
  group.position.set(DESK.x, 0, DESK.z);
  group.rotation.y = Math.atan2(towards.x - DESK.x, towards.z - DESK.z);

  const thickness = 0.034;
  const under = DESK_TOP - thickness;
  const top = plank(1.5, thickness, 0.78, 0, DESK_TOP - thickness / 2, 0, palette, "x", 0.012, 2);
  top.name = "desk-top";

  const leather = new MeshStandardMaterial({ color: 0x1f2522, roughness: 0.7, metalness: 0 });
  const blotter = { width: 1.04, depth: 0.5, rule: 0.03 };
  group.add(contactShadow(2.4, 1.7, 0.5), top, slab(blotter.width, 0.0012, blotter.depth, 0, DESK_TOP + 0.0002, 0.02, leather));
  for (const side of [-1, 1]) {
    const across = blotter.width - blotter.rule * 2;
    const down = blotter.depth - blotter.rule * 2;
    group.add(
      slab(across, 0.0004, 0.004, 0, DESK_TOP + 0.001, 0.02 + (side * down) / 2, palette.gold),
      slab(0.004, 0.0004, down, (side * across) / 2, DESK_TOP + 0.001, 0.02, palette.gold),
    );
  }

  const apronY = under - APRON.height / 2;
  const reach = LEG.size / 2 - APRON.inset - APRON.thickness / 2;
  for (const side of [-1, 1]) {
    group.add(
      plank((LEG.x - LEG.size / 2) * 2, APRON.height, APRON.thickness, 0, apronY, side * (LEG.z + reach), palette, "x", 0),
      plank(APRON.thickness, APRON.height, (LEG.z - LEG.size / 2) * 2, side * (LEG.x + reach), apronY, 0, palette, "z", 0),
    );
  }

  const taper = under - LEG.block - LEG.sabot;
  for (const x of [-LEG.x, LEG.x]) {
    for (const z of [-LEG.z, LEG.z]) {
      const leg = taperedLeg(LEG.size, LEG.foot + 0.004, taper, palette.walnut);
      grained(leg.geometry, "y");
      leg.position.set(x, LEG.sabot, z);
      const sabot = taperedLeg(LEG.foot + 0.012, LEG.foot, LEG.sabot, palette.gold);
      sabot.position.set(x, 0, z);
      group.add(
        plank(LEG.size, LEG.block, LEG.size, x, under - LEG.block / 2, z, palette, "y", 0),
        plank(LEG.size + 0.008, 0.012, LEG.size + 0.008, x, under - LEG.block - 0.004, z, palette, "x", 0),
        leg,
        sabot,
      );
    }
  }

  const front = LEG.z + reach + APRON.thickness / 2;
  const pull = turned(
    [
      [0.0001, 0],
      [0.017, 0],
      [0.017, 0.003],
      [0.006, 0.006],
      [0.006, 0.012],
      [0.013, 0.02],
      [0.012, 0.027],
      [0.0001, 0.03],
    ],
    10,
    palette.gold,
  );
  pull.rotation.x = Math.PI / 2;
  pull.position.set(0, apronY, front + 0.009);
  group.add(
    slab(0.596, APRON.height - 0.016, 0.004, 0, apronY, front - 0.001, palette.dark),
    plank(0.58, APRON.height - 0.032, 0.014, 0, apronY, front + 0.003, palette, "x", 0.004),
    pull,
  );

  const sheets: [number, number, number, Material][] = [
    [-0.05, 0.08, 0.12, palette.paper],
    [0.12, -0.02, -0.2, palette.page],
  ];
  sheets.forEach(([x, z, turn, material], index) => {
    const sheet = new Mesh(new PlaneGeometry(0.3, 0.42), material);
    sheet.rotation.x = -Math.PI / 2;
    sheet.rotation.z = turn;
    sheet.position.set(x, DESK_TOP + 0.002 + index * 0.002, z);
    group.add(sheet);
  });

  const inkwell = turned(
    [
      [0.0001, 0],
      [0.04, 0],
      [0.045, 0.006],
      [0.045, 0.026],
      [0.032, 0.04],
      [0.022, 0.044],
      [0.022, 0.052],
      [0.028, 0.056],
      [0.028, 0.061],
      [0.012, 0.066],
      [0.0001, 0.067],
    ],
    12,
    palette.gold,
  );
  inkwell.position.set(0.52, DESK_TOP, -0.22);

  const pen = new Group();
  const barrel = new Mesh(new CylinderGeometry(0.0035, 0.0055, 0.15, 6), palette.dark);
  const nib = new Mesh(new CylinderGeometry(0.0005, 0.0035, 0.032, 6), palette.gold);
  nib.position.y = 0.091;
  pen.add(barrel, nib);
  pen.rotation.set(0, 0.5, Math.PI / 2);
  pen.position.set(0.3, DESK_TOP + 0.009, -0.12);

  const lamp = deskLamp(palette);
  lamp.position.set(-0.54, DESK_TOP, -0.2);
  group.add(inkwell, pen, lamp);
  return group;
}

const SHADE = { foot: 0.33, height: 0.14, wide: 0.15, narrow: 0.075 } as const;

/** A lit reading lamp; its light on the desk is painted on rather than computed. */
function deskLamp(palette: Palette): Group {
  const lamp = new Group();
  const { foot, height, wide, narrow } = SHADE;

  const base = turned(
    [
      [0.0001, 0],
      [0.086, 0],
      [0.09, 0.004],
      [0.09, 0.011],
      [0.072, 0.019],
      [0.062, 0.022],
      [0.03, 0.034],
      [0.016, 0.042],
      [0.011, 0.056],
    ],
    20,
    palette.brass,
  );
  const stem = turned(
    [
      [0.011, 0.056],
      [0.011, 0.118],
      [0.019, 0.132],
      [0.021, 0.146],
      [0.012, 0.162],
      [0.0085, 0.2],
      [0.0085, 0.298],
      [0.014, 0.306],
      [0.014, 0.314],
      [0.006, 0.322],
      [0.006, 0.36],
    ],
    10,
    palette.gold,
  );

  const cone = new CylinderGeometry(narrow, wide, height, 32, 1, true);
  const shade = new Mesh(cone, new MeshBasicMaterial({ map: lampshadeTexture(), toneMapped: false }));
  const lining = new Mesh(cone, new MeshBasicMaterial({ color: 0xffedc4, side: BackSide, toneMapped: false }));
  const bulb = new Mesh(new SphereGeometry(0.03, 10, 6), new MeshBasicMaterial({ color: 0xfff7e0, toneMapped: false }));
  for (const lit of [shade, lining, bulb]) lit.position.y = foot + height / 2;

  const rim = (radius: number, y: number) => {
    const band = new Mesh(new CylinderGeometry(radius + 0.0015, radius + 0.0025, 0.007, 28, 1, true), palette.gold);
    band.position.y = y;
    return band;
  };
  const rod = new Mesh(new CylinderGeometry(0.003, 0.003, height, 6), palette.gold);
  rod.position.y = foot + height / 2 + 0.02;
  const finial = new Mesh(new SphereGeometry(0.011, 8, 6), palette.gold);
  finial.position.y = foot + height + 0.022;

  const pool = new Mesh(new PlaneGeometry(1.1, 0.8), glow("pool", 0.5));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.22, 0.008, 0.14);

  lamp.add(base, stem, shade, lining, bulb, rim(wide, foot + 0.0035), rim(narrow, foot + height - 0.0035), rod, finial, pool);
  return lamp;
}

/** The letterbox's flap: how far above the slot its hinge sits, how long it is and how far below level it hangs. */
const FLAP = { rise: 0.066, length: 0.08, open: 0.45 } as const;
const BOX_DOOR = { y: -0.215, width: 0.46, height: 0.3, bar: 0.03, proud: 0.012 } as const;

/** A brass letterbox on the wall above the writing desk; its lettering is added once the fonts are ready. */
export function letterbox(palette: Palette): Group {
  const { width, height, depth, slotRise } = LETTERBOX;
  const face = depth / 2;
  const group = new Group();
  group.position.set(LETTERBOX.x, LETTERBOX.y, HANG_Z + face);

  const eaves = width / 2 + 0.045;
  const roof = new Mesh(
    prism(
      [
        [-eaves, 0],
        [eaves, 0],
        [0, 0.095],
      ],
      depth + 0.06,
    ),
    palette.gold,
  );
  roof.position.set(0, height / 2 + 0.028, 0.03);

  // Held open like an awning, so the slot under it shows and the envelope passes beneath
  const flap = new Group();
  flap.position.set(0, slotRise + FLAP.rise, face + 0.014);
  flap.rotation.x = FLAP.open;
  const barrel = new Mesh(new CylinderGeometry(0.008, 0.008, 0.47, 8), palette.gold);
  barrel.rotation.z = Math.PI / 2;
  flap.add(barrel, board(0.45, 0.006, FLAP.length, 0, 0, FLAP.length / 2, palette.gold, 0.003));

  const door = BOX_DOOR;
  const railY = door.height / 2 - door.bar / 2;
  const stileX = door.width / 2 - door.bar / 2;
  const proud = face + door.proud / 2;
  const escutcheon = new Mesh(new CylinderGeometry(0.024, 0.026, 0.006, 16), palette.gold);
  const keyhole = new Mesh(new CylinderGeometry(0.0065, 0.0065, 0.002, 12), palette.dark);
  for (const round of [escutcheon, keyhole]) round.rotation.x = Math.PI / 2;
  escutcheon.position.set(0.13, door.y, face + 0.003);
  keyhole.position.set(0.13, door.y + 0.004, face + 0.0065);

  group.add(
    slab(width + 0.05, height + 0.05, 0.012, 0, 0, -face + 0.006, palette.gold),
    board(width, height, depth, 0, 0, 0, palette.brass, 0.014, 2),
    board(width + 0.07, 0.03, depth + 0.05, 0, height / 2 + 0.014, 0.025, palette.gold, 0.008),
    roof,
    board(width + 0.04, 0.026, depth + 0.03, 0, -height / 2 - 0.012, 0.015, palette.gold, 0.008),
    board(0.5, 0.12, 0.01, 0, slotRise + 0.018, face + 0.004, palette.gold, 0.004),
    slab(0.42, 0.03, 0.004, 0, slotRise, face + 0.0085, palette.dark),
    flap,
    slab(door.width + 0.012, door.height + 0.012, 0.002, 0, door.y, face + 0.001, palette.dark),
    slab(door.width - door.bar * 2 + 0.004, door.height - door.bar * 2 + 0.004, 0.003, 0, door.y, face + 0.0015, palette.brass),
    board(door.width, door.bar, door.proud, 0, door.y + railY, proud, palette.gold, 0.004),
    board(door.width, door.bar, door.proud, 0, door.y - railY, proud, palette.gold, 0.004),
    board(door.bar, door.height - door.bar * 2, door.proud, -stileX, door.y, proud, palette.gold, 0.004),
    board(door.bar, door.height - door.bar * 2, door.proud, stileX, door.y, proud, palette.gold, 0.004),
    escutcheon,
    keyhole,
    slab(0.004, 0.014, 0.002, 0.13, door.y - 0.006, face + 0.0065, palette.dark),
  );

  for (const y of [door.y + 0.085, door.y - 0.085]) {
    const hinge = new Mesh(new CylinderGeometry(0.007, 0.007, 0.05, 8), palette.gold);
    hinge.position.set(-door.width / 2 - 0.004, y, face + door.proud);
    group.add(hinge);
  }
  return group;
}
