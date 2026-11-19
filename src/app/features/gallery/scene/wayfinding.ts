import { BackSide, CylinderGeometry, MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry, RepeatWrapping, Texture, Vector3, Vector4 } from "three";
import { DOOR, DOOR_XS, END_WALL_X, HALF_DEPTH, HANG_Z, ROTUNDA, WALL_THICKNESS } from "./layout";
import { ROOM_NAME_ASPECT, roomNameTexture } from "./textures";

export interface RoomName {
  numeral: string;
  name: string;
}

export const NAME_SIZE = { width: 2.6, height: 2.6 / ROOM_NAME_ASPECT, y: 1.8, offWall: 0.02 } as const;

/** The wall a name is lettered on: the hall's curved one, one the visitor walks along, or one they walk towards. */
type Wall = "hall" | "side" | "facing";

/**
 * The stretch of the walk a name shows over, in metres the visitor is still short of it along the rooms:
 * it comes up from `begins` to `full` and goes again from `lastFull` to `ends`.
 */
export interface Stretch {
  begins: number;
  full: number;
  lastFull: number;
  ends: number;
}

// A name read from across a room comes up ten metres off, and has gone before the visitor stands beside
// it, where it would only be seen aslant. A side wall's shows in passing.
const STRETCHES: Record<Wall, Stretch> = {
  hall: { begins: 10.5, full: 9, lastFull: 3.4, ends: 2.4 },
  side: { begins: 1.7, full: 1.3, lastFull: 0.4, ends: -0.3 },
  facing: { begins: 10.5, full: 9, lastFull: 3.6, ends: 2.8 },
};
/** Walking on down the rooms the visitor's gaze has this much of +X in it; standing at a piece, none. */
const WALKING = { from: 0.07, to: 0.2 } as const;
/** How near the side of the screen (1) from its middle (0) the nearer end of a name may come: it has gone before it would show cut off. */
const ASIDE = { full: 0.8, gone: 0.98 } as const;

/**
 * How strongly (0 to 1) a name shows to a visitor `shortBy` metres short of it, whose unit gaze has `heading` as its part
 * along the rooms, with the name's outer end `aside` of the screen's middle. The lettering's shader works out the same.
 */
export function nameShows(heading: number, shortBy: number, aside: number, stretch: Stretch): number {
  return (
    MathUtils.smoothstep(heading, WALKING.from, WALKING.to) *
    (1 - MathUtils.smoothstep(shortBy, stretch.full, stretch.begins)) *
    MathUtils.smoothstep(shortBy, stretch.ends, stretch.lastFull) *
    (1 - MathUtils.smoothstep(aside, ASIDE.full, ASIDE.gone))
  );
}

export interface NameSite {
  wall: Wall;
  /** The middle of the lettering. */
  at: Vector3;
  /** From its middle to one end, along the wall. */
  halfSpan: Vector3;
  stretch: Stretch;
}

const CASING = 0.12;
/** In the hall, how far along the wall from the door's middle the name is centred: clear of the door, on the side the visitor faces coming round the statue. */
const HALL_OFFSET = 2.8;

/**
 * Where each room is named, in walking order: beside the door to Room I in the hall; on the wall the
 * visitor turns past on the way to Room II's door; and for the two short rooms on the wall they walk towards.
 */
export function nameSites(): NameSite[] {
  const inside = ROTUNDA.radius - NAME_SIZE.offWall;
  const hallAngle = HALL_OFFSET / ROTUNDA.radius;
  const beforeSecondDoor = DOOR_XS[1] - WALL_THICKNESS / 2 - 0.3 - NAME_SIZE.width / 2;
  const besideLastDoor = -(DOOR.width / 2 + CASING + HALF_DEPTH) / 2;
  const site = (wall: Wall, x: number, z: number, alongX: number, alongZ: number): NameSite => ({
    wall,
    at: new Vector3(x, NAME_SIZE.y, z),
    halfSpan: new Vector3(alongX, 0, alongZ).multiplyScalar(NAME_SIZE.width / 2),
    stretch: STRETCHES[wall],
  });

  return [
    site("hall", ROTUNDA.x + inside * Math.cos(hallAngle), inside * Math.sin(hallAngle), -Math.sin(hallAngle), Math.cos(hallAngle)),
    site("side", beforeSecondDoor, HANG_Z + NAME_SIZE.offWall, 1, 0),
    site("facing", DOOR_XS[3] - WALL_THICKNESS / 2 - NAME_SIZE.offWall, besideLastDoor, 0, 1),
    site("facing", END_WALL_X - WALL_THICKNESS / 2 - NAME_SIZE.offWall, 0, 0, 1),
  ];
}

const literal = (value: number) => value.toFixed(2);

// A name that does not show is moved off the screen, so for most of the walk it costs no pixels at all
const SHOWS = /* glsl */ `
  vec4 nameEnd = projectionMatrix * viewMatrix * vec4(nameAt + nameHalfSpan, 1.0);
  vec4 nameOtherEnd = projectionMatrix * viewMatrix * vec4(nameAt - nameHalfSpan, 1.0);
  float aside = max(abs(nameEnd.x) / max(nameEnd.w, 0.001), abs(nameOtherEnd.x) / max(nameOtherEnd.w, 0.001));
  float heading = -viewMatrix[0][2];
  float shortBy = nameAt.x - cameraPosition.x;
  vNameShows = smoothstep(${literal(WALKING.from)}, ${literal(WALKING.to)}, heading)
    * (1.0 - smoothstep(nameStretch.y, nameStretch.x, shortBy))
    * smoothstep(nameStretch.w, nameStretch.z, shortBy)
    * (1.0 - smoothstep(${literal(ASIDE.full)}, ${literal(ASIDE.gone)}, aside))
    * step(0.0, min(nameEnd.w, nameOtherEnd.w));
  if (vNameShows <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
`;

/** Unlit lettering that comes and goes by the rule in `nameShows`, worked out in the shader from where the camera is and looks. */
function nameMaterial(lettering: Texture, site: NameSite): MeshBasicMaterial {
  const { begins, full, lastFull, ends } = site.stretch;
  const material = new MeshBasicMaterial({ map: lettering, transparent: true, depthWrite: false, toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms["nameAt"] = { value: site.at };
    shader.uniforms["nameHalfSpan"] = { value: site.halfSpan };
    shader.uniforms["nameStretch"] = { value: new Vector4(begins, full, lastFull, ends) };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 nameAt;\nuniform vec3 nameHalfSpan;\nuniform vec4 nameStretch;\nvarying float vNameShows;",
      )
      .replace("#include <project_vertex>", `#include <project_vertex>\n${SHOWS}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vNameShows;")
      .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.a *= vNameShows;");
  };
  return material;
}

/** The lettered names, one for each of `rooms` in walking order. Call once the page's fonts are ready. */
export function roomNames(rooms: readonly RoomName[]): Mesh[] {
  const { width, height } = NAME_SIZE;

  return nameSites()
    .slice(0, rooms.length)
    .map((site, index) => {
      const lettering = roomNameTexture(rooms[index].numeral, rooms[index].name);
      const material = nameMaterial(lettering, site);

      if (site.wall === "hall") {
        // The hall's wall is curved, so the lettering follows it; seen from inside it must be mirrored back
        lettering.wrapS = RepeatWrapping;
        lettering.repeat.x = -1;
        material.side = BackSide;
        const radius = ROTUNDA.radius - NAME_SIZE.offWall;
        const arc = width / radius;
        const middle = Math.PI / 2 - HALL_OFFSET / ROTUNDA.radius;
        const band = new Mesh(new CylinderGeometry(radius, radius, height, 16, 1, true, middle - arc / 2, arc), material);
        band.position.set(ROTUNDA.x, site.at.y, 0);
        return band;
      }

      const plate = new Mesh(new PlaneGeometry(width, height), material);
      plate.position.copy(site.at);
      if (site.wall === "facing") plate.rotation.y = -Math.PI / 2;
      return plate;
    });
}
