export interface Room {
  /** Place id of the room, also its stop in the gallery */
  id: string;
  numeral: "" | "I" | "II" | "III" | "IV";
  name: string;
  /** Section id of the room on the flat catalogue page */
  catalogueId: string;
}

export const ROOMS = [
  { id: "entrance", numeral: "", name: "Entrance", catalogueId: "home" },
  { id: "developer", numeral: "I", name: "The Developer", catalogueId: "about" },
  { id: "works", numeral: "II", name: "The Works", catalogueId: "projects" },
  { id: "visitors-book", numeral: "III", name: "Visitors' Book", catalogueId: "visitors-book" },
  { id: "correspondence", numeral: "IV", name: "Correspondence", catalogueId: "contact" },
] as const satisfies readonly Room[];

const WORK_PLACE = /^works[/-](.+)$/;

export function workPlace(slug: string): string {
  return `works/${slug}`;
}

/** Resolves any hash either view has used (gallery stops, catalogue sections, old links) to a place id. */
export function placeFromHash(hash: string, workSlugs: readonly string[]): string | null {
  let id: string;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return null;
  }

  const room = ROOMS.find((candidate) => candidate.id === id || candidate.catalogueId === id);
  if (room) return room.id;

  const slug = WORK_PLACE.exec(id)?.[1];
  return slug && workSlugs.includes(slug) ? workPlace(slug) : null;
}

export function roomOf(place: string): Room {
  if (WORK_PLACE.test(place)) return ROOMS[2];
  return ROOMS.find((room) => room.id === place) ?? ROOMS[0];
}

/** The anchor on the flat page that shows the same place. */
export function catalogueAnchor(place: string): string {
  const slug = WORK_PLACE.exec(place)?.[1];
  return slug ? `works-${slug}` : roomOf(place).catalogueId;
}
