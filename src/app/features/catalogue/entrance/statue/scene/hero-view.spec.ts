import { levelFor, LIFT, liftFor, scrollShare, TURN, turnFor } from "./hero-view";

describe("scrollShare", () => {
  it("is nothing at the top of the page and whole once the entrance has scrolled away", () => {
    expect(scrollShare(0, 800)).toBe(0);
    expect(scrollShare(200, 800)).toBe(0.25);
    expect(scrollShare(800, 800)).toBe(1);
  });

  it("stays whole however far the page scrolls on, and nothing when a bounce pulls it above the top", () => {
    expect(scrollShare(5000, 800)).toBe(1);
    expect(scrollShare(-40, 800)).toBe(0);
  });

  it("is nothing for an entrance that has no height yet", () => {
    expect(scrollShare(300, 0)).toBe(0);
  });
});

describe("turnFor", () => {
  it("rests where the still picture was taken from, with the mouse in the middle and the page at its top", () => {
    expect(turnFor(0, 0)).toBe(0);
  });

  it("follows the mouse by a few degrees either way", () => {
    expect(TURN.pointer).toBeLessThan(0.14);
    expect(turnFor(1, 0)).toBeCloseTo(TURN.pointer, 6);
    expect(turnFor(-1, 0)).toBeCloseTo(-TURN.pointer, 6);
    expect(turnFor(0.5, 0)).toBeCloseTo(TURN.pointer / 2, 6);
  });

  it("walks on round the statue as the entrance scrolls away, evenly", () => {
    expect(turnFor(0, 0.5)).toBeCloseTo(TURN.scroll / 2, 6);
    expect(turnFor(0, 1)).toBeCloseTo(TURN.scroll, 6);
  });

  it("adds the two, and goes no further than either's end", () => {
    expect(turnFor(1, 1)).toBeCloseTo(TURN.pointer + TURN.scroll, 6);
    expect(turnFor(3, 4)).toBeCloseTo(TURN.pointer + TURN.scroll, 6);
    expect(turnFor(-3, -1)).toBeCloseTo(-TURN.pointer, 6);
  });
});

describe("liftFor", () => {
  it("sinks the eye as the mouse rises and lifts it as the mouse sinks, by a hand's breadth or two", () => {
    expect(LIFT).toBeLessThan(0.3);
    expect(liftFor(0)).toBe(0);
    expect(liftFor(-1)).toBeCloseTo(-LIFT, 6);
    expect(liftFor(1)).toBeCloseTo(LIFT, 6);
    expect(liftFor(9)).toBeCloseTo(LIFT, 6);
  });
});

describe("levelFor", () => {
  it("leaves the statue fully lit while the entrance is all but at the top", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(0.1)).toBe(1);
  });

  it("takes the light down steadily as the visitor scrolls on", () => {
    const levels = [0.2, 0.35, 0.5, 0.65, 0.8].map(levelFor);

    expect(levels).toEqual([...levels].sort((a, b) => b - a));
    expect(levels[0]).toBeLessThan(1);
    expect(levelFor(0.485)).toBeCloseTo(0.55, 2);
  });

  it("leaves a tenth of the light on a statue that has all but scrolled away, never none", () => {
    expect(levelFor(0.85)).toBeCloseTo(0.1, 6);
    expect(levelFor(1)).toBeCloseTo(0.1, 6);
    expect(levelFor(7)).toBeCloseTo(0.1, 6);
  });
});
