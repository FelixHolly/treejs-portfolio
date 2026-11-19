export interface Room {
  /** Place id of the room, also its stop in the gallery */
  id: string;
  numeral: "" | "I" | "II" | "III" | "IV";
  name: string;
  /** The everyday word for the room, for navigation a visitor should not have to decode */
  plain: string;
  /** Section id of the room on the flat catalogue page */
  catalogueId: string;
}

export const ROOMS = [
  { id: "entrance", numeral: "", name: "Entrance", plain: "Home", catalogueId: "home" },
  { id: "developer", numeral: "I", name: "The Developer", plain: "About", catalogueId: "about" },
  { id: "works", numeral: "II", name: "The Works", plain: "Work", catalogueId: "projects" },
  { id: "visitors-book", numeral: "III", name: "Visitors' Book", plain: "References", catalogueId: "visitors-book" },
  { id: "correspondence", numeral: "IV", name: "Correspondence", plain: "Contact", catalogueId: "contact" },
] as const satisfies readonly Room[];

/** A stop inside a room that has an address and a tab title of its own. */
export const SKILLS = { id: "developer/skills", room: "developer", name: "Skills" } as const;
const ALCOVES = [SKILLS] as const;

/** The tab title wherever no room or work names it; index.html carries the same text for the first paint. */
export const BASE_TITLE = "Felix Hollndonner, Full-Stack Developer";

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
  if (ALCOVES.some((alcove) => alcove.id === id)) return id;

  const slug = WORK_PLACE.exec(id)?.[1];
  return slug && workSlugs.includes(slug) ? workPlace(slug) : null;
}

export function roomOf(place: string): Room {
  if (WORK_PLACE.test(place)) return ROOMS[2];
  const id = ALCOVES.find((alcove) => alcove.id === place)?.room ?? place;
  return ROOMS.find((room) => room.id === id) ?? ROOMS[0];
}

/** `workTitles` is keyed by slug. A place or work it cannot name gets the site's own title rather than a guess. */
export function titleFor(place: string, workTitles: Readonly<Record<string, string>>): string {
  const slug = WORK_PLACE.exec(place)?.[1];
  // Only a numbered room names the tab: the entrance stands for the whole site
  const room = ROOMS.find((candidate) => candidate.numeral && candidate.id === place);
  const alcove = ALCOVES.find((candidate) => candidate.id === place);
  const name = slug && Object.hasOwn(workTitles, slug) ? workTitles[slug] : (alcove?.name ?? room?.name);
  return name ? `${name} - Felix Hollndonner` : BASE_TITLE;
}

/** The anchor on the flat page that shows the same place. */
export function catalogueAnchor(place: string): string {
  const slug = WORK_PLACE.exec(place)?.[1];
  return slug ? `works-${slug}` : roomOf(place).catalogueId;
}
