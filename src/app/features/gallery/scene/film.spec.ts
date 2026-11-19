import { FILM_REACH, filmPlacement, filmShouldPlay, FIRST_WORK_STOP } from "./film";
import { SceneWork } from "./gallery-view";

const work = (slug: string, film?: string): SceneWork => ({
  slug,
  kind: "study",
  images: [{ src: `${slug}.webp`, portrait: false }],
  film,
});

describe("filmPlacement", () => {
  it("places the film at its work's stop, after the entrance, Room I's two stops and the overview", () => {
    expect(FIRST_WORK_STOP).toBe(4);
    expect(filmPlacement([work("a", "a.webm"), work("b")], true)).toEqual({ work: 0, stop: 4, src: "a.webm" });
    expect(filmPlacement([work("a"), work("b"), work("c", "c.webm")], true)).toEqual({ work: 2, stop: 6, src: "c.webm" });
  });

  it("shows only the first film when more than one work has one", () => {
    expect(filmPlacement([work("a"), work("b", "b.webm"), work("c", "c.webm")], true)?.src).toBe("b.webm");
  });

  it("places nothing when no work has a film", () => {
    expect(filmPlacement([work("a"), work("b")], true)).toBeUndefined();
    expect(filmPlacement([], true)).toBeUndefined();
  });

  it("places nothing when films are not allowed", () => {
    expect(filmPlacement([work("a", "a.webm")], false)).toBeUndefined();
  });

  it("treats an empty source as no film", () => {
    expect(filmPlacement([work("a", "")], true)).toBeUndefined();
  });
});

describe("filmShouldPlay", () => {
  it("plays while the visitor stands at the stop", () => {
    expect(filmShouldPlay(3, 3, false)).toBeTrue();
  });

  it("keeps playing a quarter of a stop either side, and no further", () => {
    expect(filmShouldPlay(3 - FILM_REACH, 3, false)).toBeTrue();
    expect(filmShouldPlay(3 + FILM_REACH, 3, false)).toBeTrue();
    expect(filmShouldPlay(3 - FILM_REACH - 0.01, 3, false)).toBeFalse();
    expect(filmShouldPlay(3 + FILM_REACH + 0.01, 3, false)).toBeFalse();
  });

  it("does not play at the entrance, the overview or the next work", () => {
    for (const progress of [0, 1, 2, 2.5, 3.5, 4, 8]) {
      expect(filmShouldPlay(progress, 3, false)).withContext(`at ${progress}`).toBeFalse();
    }
  });

  it("never plays while held, even at the stop", () => {
    expect(filmShouldPlay(3, 3, true)).toBeFalse();
    expect(filmShouldPlay(3.1, 3, true)).toBeFalse();
  });

  it("reaches a quarter of a stop", () => {
    expect(FILM_REACH).toBe(0.25);
  });
});
