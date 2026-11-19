import { Work } from "../../core/content/work.model";
import { Room, ROOMS, SKILLS, workPlace } from "../../core/place/places";

export type StopKind = "entrance" | "developer" | "skills" | "works" | "work" | "visitors-book" | "correspondence";

export interface GalleryStop {
  place: string;
  room: Room;
  kind: StopKind;
  /** Set where a stop is one of several in its room and goes by a name of its own. */
  title?: string;
  work?: Work;
}

/** The route in walking order. The 3D scene lays out its camera poses in this same order. */
export function buildStops(works: readonly Work[]): GalleryStop[] {
  const [entrance, developer, worksRoom, visitorsBook, correspondence] = ROOMS;

  return [
    { place: entrance.id, room: entrance, kind: "entrance" },
    { place: developer.id, room: developer, kind: "developer" },
    { place: SKILLS.id, room: developer, kind: "skills", title: SKILLS.name },
    { place: worksRoom.id, room: worksRoom, kind: "works" },
    ...works.map((work): GalleryStop => ({ place: workPlace(work.slug), room: worksRoom, kind: "work", work })),
    { place: visitorsBook.id, room: visitorsBook, kind: "visitors-book" },
    { place: correspondence.id, room: correspondence, kind: "correspondence" },
  ];
}
