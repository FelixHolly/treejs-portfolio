import { AdditiveBlending, Color, MathUtils, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial, SpotLight, Vector3 } from "three";
import { FIRST_WORK_STOP } from "./film";
import { DESK, DOOR_XS, HANG_Z, LECTERN, PieceSlot, PORTRAIT, SKILL_PLAQUE_HEIGHT, SKILL_PLAQUES, skillPlaqueSlots } from "./layout";
import { WallRect } from "./picking";

/** What a picture keeps of its brightness while the lamp over it is off: 0 is black, 1 as bright as lit. */
export const LAMP_OFF_LEVEL = 0.3;
/** Seconds a lamp takes to come on, and the seconds from one lamp to the next along the wall. */
export const LAMP_TIMING = { ramp: 0.35, stagger: 0.22 } as const;
/** How far short of a room's doorway, in metres, the visitor walking towards it sets its lamps off. */
export const LAMP_REACH = 1.2;
/** What the glass of a fitting keeps of its lit colour while it is off. */
const UNLIT_GLASS = 0.12;
/** How far off the wall a veil hangs: just in front of a framed picture, and of a lettered board. */
const FACE = { picture: 0.027, board: 0.036 } as const;
/** The reading lamp stands at the near end of the desk, this far before the desk's middle. */
const READING_LAMP = 0.55;

/** A room as its lamps see it. */
export interface LampRoom {
  /** Where its doorway stands along the building, in metres. */
  door: number;
  /** Its first and last stop. */
  first: number;
  last: number;
  /** How many lamps hang in it, counted from the doorway. */
  lamps: number;
}

/** Where the camera is: on the route in stops, and along the building in metres. */
export interface Whereabouts {
  progress: number;
  x: number;
}

function comeOn(seconds: number): number {
  return MathUtils.smoothstep(seconds / LAMP_TIMING.ramp, 0, 1);
}

/**
 * Decides when each room's lamps come on, from where the visitor walks alone: once, the lamp nearest the doorway first.
 * A room stays lit for the visit, so every room up to the visitor's own is lit and only the way on is ever dark.
 */
export class LampCascade {
  /** Seconds since each room was switched on; undefined while it is dark. */
  private readonly since: (number | undefined)[];

  /** `lit` rooms, counted from the first, are lit from the start: all of them for visitors who asked for less motion. */
  constructor(
    private readonly rooms: readonly LampRoom[],
    lit = 0,
  ) {
    this.since = rooms.map((_, index) => (index < lit ? Infinity : undefined));
  }

  /** How many rooms are lit or coming on, counted from the first. */
  get lit(): number {
    return this.since.filter((since) => since !== undefined).length;
  }

  /** The visitor was set down at a place without walking there: the rooms up to it are lit, with no show. */
  arrive(at: Whereabouts): void {
    this.rooms.forEach((room, index) => {
      if (this.reached(room, at)) this.since[index] = Infinity;
    });
  }

  /**
   * Moves on by `seconds` with the camera at `at`, bound for `heading` on the route. A dark room the walk goes on past
   * is lit at once, before it is seen; one the camera reaches gets its show. True while a lamp is coming on.
   */
  update(seconds: number, at: Whereabouts, heading: number): boolean {
    let coming = false;
    this.rooms.forEach((room, index) => {
      const since = this.since[index];
      if (since !== undefined) this.since[index] = since + seconds;
      else if (heading > room.last) this.since[index] = Infinity;
      else if (this.reached(room, at)) this.since[index] = 0;
      coming ||= (this.since[index] ?? Infinity) < (room.lamps - 1) * LAMP_TIMING.stagger + LAMP_TIMING.ramp;
    });
    return coming;
  }

  /** How far a lamp has come on, 0 to 1. */
  level(room: number, lamp: number): number {
    const since = this.since[room];
    return since === undefined ? 0 : comeOn(since - lamp * LAMP_TIMING.stagger);
  }

  /** On the stride into the room, or past it, and within reach of its doorway. */
  private reached(room: LampRoom, at: Whereabouts): boolean {
    return at.progress > room.first - 1 && at.x >= room.door - LAMP_REACH;
  }
}

/** One lamp: where along the wall it hangs, and the flat things it lights that have no light of their own to turn down. */
export interface LampSite {
  x: number;
  pictures: readonly WallRect[];
  /** How far off the wall their faces stand, in metres. */
  face: number;
}

export interface LampRoomPlan {
  door: number;
  first: number;
  last: number;
  /** In the order they come on: nearest the doorway first. */
  sites: LampSite[];
}

function site(x: number, pictures: readonly WallRect[] = [], face: number = FACE.picture): LampSite {
  return { x, pictures, face };
}

/** Every room's lamps: one over the portrait, the plaques, each column of frames and the board of names, and two at the desk. */
export function lampPlan(slots: readonly PieceSlot[], nameBoard?: WallRect): LampRoomPlan[] {
  const visitorsBook = FIRST_WORK_STOP + slots.length;
  const plaques = skillPlaqueSlots().map((plaque) => ({ ...plaque, width: SKILL_PLAQUES.width, height: SKILL_PLAQUE_HEIGHT }));

  const columns = new Map<number, WallRect[]>();
  for (const frame of slots.flatMap((slot) => slot.frames)) columns.set(frame.x, [...(columns.get(frame.x) ?? []), frame]);
  const works = [...columns].sort(([a], [b]) => a - b).map(([x, pictures]) => site(x, pictures));

  return [
    { door: DOOR_XS[0], first: 1, last: 2, sites: [site(PORTRAIT.x, [PORTRAIT]), site(SKILL_PLAQUES.x, plaques, FACE.board)] },
    { door: DOOR_XS[1], first: FIRST_WORK_STOP - 1, last: visitorsBook - 1, sites: works },
    { door: DOOR_XS[2], first: visitorsBook, last: visitorsBook, sites: [site(LECTERN.x, nameBoard ? [nameBoard] : [], FACE.board)] },
    { door: DOOR_XS[3], first: visitorsBook + 1, last: visitorsBook + 1, sites: [site(DESK.x - READING_LAMP), site(DESK.x)] },
  ];
}

interface Lamp {
  x: number;
  spots: SpotLight[];
  /** The unlit parts of a fitting, which show its light: a lining, a tube, a shade. */
  glass: { material: MeshBasicMaterial; lit: Color }[];
  /** The light it throws, painted on. */
  glows: { material: ShaderMaterial; lit: number }[];
  /** Black laid over its pictures, which are unlit and would shine on in the dark. */
  veil: MeshBasicMaterial;
  veils: Mesh[];
  shown?: number;
}

const place = new Vector3();

/** The rooms' lamps as the scene holds them: the spotlights, the fittings and the veils that each lamp's level drives. */
export class Lamps {
  /** The veils, for the scene to hang. */
  readonly objects: Object3D[] = [];
  private readonly cascade: LampCascade;
  private readonly rooms: { door: number; lamps: Lamp[] }[];

  /** `lit` rooms, counted from the first, are lit from the start. */
  constructor(plan: readonly LampRoomPlan[], lit: number) {
    this.cascade = new LampCascade(
      plan.map(({ door, first, last, sites }) => ({ door, first, last, lamps: sites.length })),
      lit,
    );
    this.rooms = plan.map(({ door, sites }) => ({
      door,
      lamps: sites.map((site) => {
        const veil = new MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, toneMapped: false });
        const veils = site.pictures.map((picture) => {
          const mesh = new Mesh(new PlaneGeometry(picture.width, picture.height), veil);
          mesh.position.set(picture.x, picture.y, HANG_Z + site.face);
          return mesh;
        });
        this.objects.push(...veils);
        return { x: site.x, spots: [], glass: [], glows: [], veil, veils };
      }),
    }));
    this.show();
  }

  /** Takes over what stands under `root`: each spotlight aimed into a room and each fitting named "lamp" joins the lamp nearest to it along the wall. */
  adopt(root: Object3D): void {
    root.traverse((object) => {
      if (object instanceof SpotLight) {
        this.nearest(object.target.getWorldPosition(place).x)?.spots.push(object);
      } else if (object.name === "lamp") {
        const lamp = this.nearest(object.getWorldPosition(place).x);
        if (lamp) object.traverse((part) => this.fit(lamp, part));
      }
    });
    this.show(true);
  }

  get lit(): number {
    return this.cascade.lit;
  }

  arrive(at: Whereabouts): void {
    this.cascade.arrive(at);
    this.show();
  }

  /** Call once a frame, after the lights have set their own strengths: a lamp scales what its spotlights were given. True while a lamp is coming on. */
  update(seconds: number, at: Whereabouts, heading: number): boolean {
    const coming = this.cascade.update(seconds, at, heading);
    this.show();
    this.each((lamp, level) => {
      for (const spot of lamp.spots) spot.intensity *= level;
    });
    return coming;
  }

  private show(again = false): void {
    this.each((lamp, level) => {
      if (level === lamp.shown && !again) return;
      lamp.shown = level;
      for (const { material, lit } of lamp.glass) material.color.copy(lit).multiplyScalar(MathUtils.lerp(UNLIT_GLASS, 1, level));
      for (const { material, lit } of lamp.glows) material.uniforms["strength"].value = lit * level;
      lamp.veil.opacity = (1 - LAMP_OFF_LEVEL) * (1 - level);
      for (const veil of lamp.veils) veil.visible = level < 1;
    });
  }

  private each(visit: (lamp: Lamp, level: number) => void): void {
    this.rooms.forEach((room, index) => room.lamps.forEach((lamp, order) => visit(lamp, this.cascade.level(index, order))));
  }

  private fit(lamp: Lamp, part: Object3D): void {
    const material = (part as Mesh).material;
    if (material instanceof MeshBasicMaterial) {
      lamp.glass.push({ material, lit: material.color.clone() });
    } else if (material instanceof ShaderMaterial && material.blending === AdditiveBlending && material.uniforms["strength"]) {
      lamp.glows.push({ material, lit: material.uniforms["strength"].value as number });
    }
  }

  /** The lamp of the room `x` lies in that hangs nearest to it; none before the first doorway, where the hall is always lit. */
  private nearest(x: number): Lamp | undefined {
    const room = this.rooms.filter(({ door }) => door <= x).pop();
    return room?.lamps.reduce<Lamp | undefined>((best, lamp) => (best && Math.abs(best.x - x) <= Math.abs(lamp.x - x) ? best : lamp), undefined);
  }
}
