import { SceneWork } from "./gallery-view";

/** Stops before the first work: entrance, portrait, skills and the overview of the works. */
export const FIRST_WORK_STOP = 4;
/** How far from its stop, in stops, a film keeps playing. */
export const FILM_REACH = 0.25;

export interface FilmPlacement {
  /** The work's place in the hanging order, which is also its slot's. */
  work: number;
  stop: number;
  src: string;
}

/** One film at a time keeps a single decoder running: the first work that has one gets it. */
export function filmPlacement(works: readonly SceneWork[], allowed: boolean): FilmPlacement | undefined {
  const work = allowed ? works.findIndex((candidate) => !!candidate.film) : -1;
  const src = works[work]?.film;
  return src ? { work, stop: FIRST_WORK_STOP + work, src } : undefined;
}

export function filmShouldPlay(progress: number, stop: number, held: boolean): boolean {
  return !held && Math.abs(progress - stop) <= FILM_REACH;
}
