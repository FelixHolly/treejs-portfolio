import { casing, doorOpening, Fabric, STONE } from "./fabric";
import { DOME, DOOR, DOOR_CASING, DOOR_XS, HALF_DEPTH, HALL_DOOR_TURN, HALL_FACES, hallTurn, ROTUNDA, WALL_THICKNESS } from "./layout";
import { blend, lifted, ringSweep, Round, scaled, Step, Stonework, Tone, tone, WallFace } from "./stonework";

const HALL: Round = { x: ROTUNDA.x, radius: ROTUNDA.radius };
/** The flat portal stands this far off the wall it is cut through, enough to clear the hall's curve at both jambs. */
const PORTAL_PROUD = 0.2;
/** The flat faces the wall is carried across the door in, above its head. */
const OVER_DOOR = 4;
const SKIRTING: readonly Step[] = [[0.05, 0], [0.05, 0.2], [0, 0.26]];
/** The ring cornice: how far under the dome's springing it begins, how far above it its lip stands, and its reach. */
const RING = { drop: 0.72, lip: 0.1, reach: 0.56 } as const;
/** The dome is dark and seen from far below: few faces round it and few rings up it are enough. */
const DOME_FACES = { round: 40, rings: 8 } as const;
const NECK = { height: 0.9, foot: tone(0x30343b), head: tone(0x5b626c), sky: tone(0x717a88) } as const;
const DOME_FOOT = DOME.springing + RING.lip;

/** The dome's own colours from its foot (0) to the rim of its opening (1): dark all the way, a little paler at either end. */
const DOME_TONES: readonly (readonly [at: number, tone: Tone])[] = [
  [0, tone(0x1f1d1a)],
  [0.1, tone(0x1c1a19)],
  [0.25, tone(0x191818)],
  [0.5, tone(0x161618)],
  [0.8, tone(0x151517)],
  [0.93, tone(0x1b1c20)],
  [1, tone(0x2e3138)],
];

function domeTone(share: number): Tone {
  // Clamped: the rim's own share comes out a hair over one, which would find no stop to end at
  const within = Math.min(Math.max(share, 0), 1);
  const next = Math.max(DOME_TONES.findIndex(([at]) => at >= within), 1);
  const [from, low] = DOME_TONES[next - 1];
  const [to, high] = DOME_TONES[next];
  return blend(low, high, (within - from) / (to - from));
}

/** Darker towards the cornice, in whose shade the wall stands and over which the page sets its name. */
function wallTone(y: number): Tone {
  return scaled(STONE.wall, 1 - 0.45 * (y / (DOME.springing - RING.drop)) ** 2);
}

function turnsRound(): { wall: number[]; door: number[] } {
  const wall = Array.from({ length: HALL_FACES + 1 }, (_, face) => hallTurn(face));
  const end = wall[HALL_FACES];
  const door = Array.from({ length: OVER_DOOR + 1 }, (_, step) => end + (step / OVER_DOOR) * HALL_DOOR_TURN * 2);
  return { wall, door };
}

function drum(masonry: Stonework): void {
  const { wall, door } = turnsRound();
  const head = DOME.springing - RING.drop;
  // In courses, so the shade deepens towards the top as a curve and not as one straight slope
  const courses = [0, DOOR.height, head * 0.55, head * 0.8, head];

  for (let course = 0; course < courses.length - 1; course++) {
    const band: Step[] = [[0, courses[course]], [0, courses[course + 1]]];
    const tones = () => [wallTone(band[0][1]), wallTone(band[1][1])] as const;
    ringSweep(masonry, HALL, wall, band, tones);
    if (course > 0) ringSweep(masonry, HALL, door, band, tones);
  }

  // The skirting dies into the portal's plinth blocks: run to the jambs, its ends would stand in the doorway
  const beside = Math.asin((DOOR.width / 2 + DOOR_CASING.width) / ROTUNDA.radius) - HALL_DOOR_TURN;
  const skirted = [wall[0] + beside, ...wall.slice(1, -1), wall[HALL_FACES] - beside];
  ringSweep(masonry, HALL, skirted, SKIRTING, scaled(STONE.wall, 0.5));

  const outline: Step[] = [
    [0, head],
    [0.07, head],
    [0.07, head + 0.14],
    [0.24, head + 0.34],
    [0.24, head + 0.46],
    [0.44, head + 0.62],
    [0.44, head + 0.7],
    [RING.reach, head + 0.7],
    [RING.reach, DOME_FOOT],
    [0, DOME_FOOT],
  ];
  // No paler than the wall under it, so that it reads by its own shadows and stays dark behind the page's name
  ringSweep(masonry, HALL, [...wall, ...door.slice(1)], outline, lifted(wallTone(head), 2));
}

function dome(plaster: Stonework): void {
  const turns = Array.from({ length: DOME_FACES.round + 1 }, (_, face) => (face / DOME_FACES.round) * Math.PI * 2);
  const crown = Math.acos(DOME.oculus / ROTUNDA.radius);
  const rise = (ROTUNDA.height - DOME_FOOT) / Math.sin(crown);
  const rings: Step[] = Array.from({ length: DOME_FACES.rings + 1 }, (_, ring) => {
    const lean = (ring / DOME_FACES.rings) * crown;
    return [ROTUNDA.radius * (1 - Math.cos(lean)), DOME_FOOT + rise * Math.sin(lean)];
  });
  const share = ([, y]: Step) => Math.asin(Math.min((y - DOME_FOOT) / rise, 1)) / crown;
  ringSweep(plaster, HALL, turns, rings, (low, high) => [domeTone(share(low)), domeTone(share(high))]);

  const [reach, top] = [DOME.oculus + 0.1, ROTUNDA.height + NECK.height];
  ringSweep(plaster, { x: ROTUNDA.x, radius: DOME.oculus }, turns, [[0, ROTUNDA.height], [0, top]], () => [NECK.foot, NECK.head]);
  plaster.soffit([ROTUNDA.x - reach, top, -reach], [ROTUNDA.x + reach, top, -reach], [ROTUNDA.x + reach, top, reach], [ROTUNDA.x - reach, top, reach], NECK.sky);
}

export function buildHall({ masonry, plaster, gilt }: Fabric): void {
  drum(masonry);
  dome(plaster);

  const face = DOOR_XS[0] - WALL_THICKNESS / 2;
  // In the wall's own stone: a paler one would stand behind the statue as a shape of its own
  const opening = doorOpening(PORTAL_PROUD, scaled(STONE.wall, 1.12));
  casing(new WallFace(masonry, face, -HALF_DEPTH, [-1, 0]), new WallFace(gilt, face, -HALF_DEPTH, [-1, 0]), opening);
}
