import { casing, doorOpening, doorReveal, Fabric, GILT, Opening, ROOM_WALLS, STONE } from "./fabric";
import { CORNICE, DADO, dadoHeight, DOOR_CASING, DOOR_XS, END_WINDOW, HALF_DEPTH, RoomSpan, roomSpans, WALL_HEIGHT } from "./layout";
import { lifted, scaled, Sinking, Step, Tone, WallFace } from "./stonework";

const DEPTH = HALF_DEPTH * 2;
/** The panelled base: how far it, its skirting and its capping rail stand off the wall, its stiles, and a panel's most width for its height. */
const WAINSCOT = { proud: 0.03, skirting: 0.05, cap: 0.066, capHeight: 0.1, stile: 0.11, margin: 0.05, widest: 6.5, tallWidest: 1.25 } as const;
const SUNK: Sinking = { depth: 0.018, slope: 0.026 };
/** The gold line a little under the cornice, on the two long walls. */
const PICTURE_RAIL = { y: 4.5, height: 0.03, proud: 0.022 } as const;
/** The last room's window: how far it is set into its wall, the panes it is glazed in, and the stone apron under its sill. */
const WINDOW = { recess: 0.24, columns: 2, rows: 3, bar: 0.05, sill: 0.07, apron: { proud: 0.02, margin: 0.14, foot: 0.2 } } as const;

function wainscot(face: WallFace, from: number, to: number, wall: Tone, height: number): void {
  const { proud, stile, margin } = WAINSCOT;
  const { skirting } = DADO;
  const capFoot = height - WAINSCOT.capHeight;
  face.sweep(from, to, [[WAINSCOT.skirting, 0], [WAINSCOT.skirting, skirting - 0.025], [proud, skirting]], scaled(wall, 0.5));
  // The rail's top slopes back to the wall: it is the one face down here that looks up at the light
  face.sweep(from, to, [[proud, capFoot], [WAINSCOT.cap, capFoot + 0.034], [WAINSCOT.cap, capFoot + 0.062], [0, height]], wall);

  const [low, high] = [skirting + margin, capFoot - margin * 0.8];
  // Low panels lie long; tall ones stand nearly square
  const widest = (high - low) * (height > DADO.height ? WAINSCOT.tallWidest : WAINSCOT.widest);
  const panels = Math.max(Math.round((to - from - stile) / widest), 1);
  const width = (to - from - stile * (panels + 1)) / panels;
  face.rect(from, to, skirting, low, proud, wall);
  face.rect(from, to, high, capFoot, proud, wall);
  for (let panel = 0; panel <= panels; panel++) {
    const left = from + panel * (width + stile);
    face.rect(left, left + stile, low, high, proud, wall);
    if (panel < panels) face.panel(left + stile, left + stile + width, low, high, proud, SUNK, wall);
  }
}

function corniceOutline(): Step[] {
  const foot = WALL_HEIGHT - CORNICE.drop;
  return [
    [0, foot],
    [0.03, foot],
    [0.03, foot + 0.06],
    [0.14, foot + 0.19],
    [0.14, foot + 0.25],
    [0.25, foot + 0.35],
    [0.25, foot + 0.4],
    [CORNICE.reach, foot + 0.4],
    [CORNICE.reach, WALL_HEIGHT],
  ];
}

const CORNICE_LIFT = 1.6;

function piercedWall(face: WallFace, gilt: WallFace, wall: Tone, dado: number, opening: Opening): void {
  const [left, right] = [opening.middle - opening.width / 2, opening.middle + opening.width / 2];
  // In pieces that meet corner to corner: an edge that ended part way along another could let a pixel through
  for (const [from, to] of [[0, left], [right, DEPTH]]) {
    face.rect(from, to, 0, opening.height, 0, wall);
    face.rect(from, to, opening.height, WALL_HEIGHT, 0, wall);
  }
  face.rect(left, right, opening.height, WALL_HEIGHT, 0, wall);
  wainscot(face, 0, left - DOOR_CASING.width, wall, dado);
  wainscot(face, right + DOOR_CASING.width, DEPTH, wall, dado);
  face.sweep(0, DEPTH, corniceOutline(), lifted(wall, CORNICE_LIFT));
  casing(face, gilt, opening);
}

/**
 * The last wall's opening is a window: a door's surround, a stone apron under a sill, and above it pale glass in
 * dark bars. `glass` is the same face as `face`, laid in the unlit plaster.
 */
function endWindow(face: WallFace, glass: WallFace, opening: Opening): void {
  const { trim, bar } = STONE;
  const { recess, columns, rows, sill } = WINDOW;
  const [left, right] = [opening.middle - opening.width / 2, opening.middle + opening.width / 2];
  // Its lining is palest next to the glass, which is what lights it
  const [near, far] = [scaled(trim, 0.85), scaled(trim, 1.5)];

  face.sweep(left, right, [[-recess, opening.height], [0, opening.height]], () => [far, near]);
  face.quad([left, 0, 0], [left, -recess, 0], [left, -recess, opening.height], [left, 0, opening.height], [near, far, far, near]);
  face.quad([right, -recess, 0], [right, 0, 0], [right, 0, opening.height], [right, -recess, opening.height], [far, near, near, far]);

  const head = END_WINDOW.sill - sill;
  const { proud, margin, foot } = WINDOW.apron;
  face.rect(left, right, 0, foot, proud, trim);
  face.rect(left, right, head - margin, head, proud, trim);
  face.rect(left, left + margin, foot, head - margin, proud, trim);
  face.rect(right - margin, right, foot, head - margin, proud, trim);
  face.panel(left + margin, right - margin, foot, head - margin, proud, SUNK, trim);
  face.block(left, right, head, END_WINDOW.sill, -recess, opening.proud + 0.03, trim);

  glass.rect(left, right, END_WINDOW.sill, opening.height, -recess, bar);
  const [wide, tall] = [(opening.width - WINDOW.bar * (columns + 1)) / columns, (opening.height - END_WINDOW.sill - WINDOW.bar * (rows + 1)) / rows];
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const [x, y] = [left + WINDOW.bar + column * (wide + WINDOW.bar), END_WINDOW.sill + WINDOW.bar + row * (tall + WINDOW.bar)];
      // Paler towards the sky
      const [low, high] = [scaled(STONE.glass, 0.6 + (0.4 * row) / rows), scaled(STONE.glass, 0.6 + (0.4 * (row + 1)) / rows)];
      glass.rect(x, x + wide, y, y + tall, -recess + 0.008, [low, low, high, high]);
    }
  }
}

function room({ masonry, plaster, gilt }: Fabric, span: RoomSpan, index: number): void {
  const wall = ROOM_WALLS[index];
  const length = span.to - span.from;
  const dado = dadoHeight(span);
  const sides: [x: number, z: number, out: [number, number]][] = [
    [span.from, -HALF_DEPTH, [0, 1]],
    [span.to, HALF_DEPTH, [0, -1]],
  ];

  for (const [x, z, out] of sides) {
    const face = new WallFace(masonry, x, z, out);
    face.rect(0, length, 0, WALL_HEIGHT, 0, wall);
    wainscot(face, 0, length, wall, dado);
    face.sweep(0, length, corniceOutline(), lifted(wall, CORNICE_LIFT));
    const { y, height, proud } = PICTURE_RAIL;
    new WallFace(gilt, x, z, out).block(0, length, y - height / 2, y + height / 2, 0, proud, GILT);
  }

  piercedWall(new WallFace(masonry, span.from, HALF_DEPTH, [1, 0]), new WallFace(gilt, span.from, HALF_DEPTH, [1, 0]), wall, dado, doorOpening());

  const end = new WallFace(masonry, span.to, -HALF_DEPTH, [-1, 0]);
  const endGilt = new WallFace(gilt, span.to, -HALF_DEPTH, [-1, 0]);
  if (span.feature === "window") {
    const opening: Opening = { ...doorOpening(), width: END_WINDOW.width };
    piercedWall(end, endGilt, wall, dado, opening);
    endWindow(end, new WallFace(plaster, span.to, -HALF_DEPTH, [-1, 0]), opening);
  } else {
    piercedWall(end, endGilt, wall, dado, doorOpening());
  }
}

export function buildRooms(fabric: Fabric): void {
  roomSpans().forEach((span, index) => room(fabric, span, index));
  for (const x of DOOR_XS) doorReveal(fabric.masonry, x);
}
