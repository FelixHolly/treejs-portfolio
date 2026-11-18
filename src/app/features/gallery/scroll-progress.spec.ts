import { labelShareOf, LabelSpan, neighbourStop, progressFromScroll, scrollTargetFor } from "./scroll-progress";

const VH = 1000;
// Entrance fills the first screen; later labels are 400px tall with a screen of floor between them.
const SPANS: LabelSpan[] = [
  { top: 0, bottom: 1000 },
  { top: 2100, bottom: 2500 },
  { top: 3600, bottom: 4000 },
];

describe("progressFromScroll", () => {
  it("stands at the entrance only while the page is unscrolled, then sets off at once", () => {
    expect(progressFromScroll(0, SPANS, VH)).toBe(0);
    expect(progressFromScroll(40, SPANS, VH)).toBeGreaterThan(0);
    expect(progressFromScroll(40, SPANS, VH)).toBeLessThan(0.01);
  });

  it("glides between stops, monotonically, easing in and out", () => {
    const samples = [0, 330, 750, 1170, 1500].map((y) => progressFromScroll(y, SPANS, VH));

    expect(samples[0]).toBe(0);
    expect(samples[4]).toBe(1);
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    expect(samples[2]).toBeCloseTo(0.5, 5);
    expect(samples[1]).toBeLessThan(0.25);
    expect(samples[3]).toBeGreaterThan(0.75);
  });

  it("holds at a stop for as long as its label crosses the middle of the screen", () => {
    expect(progressFromScroll(1500, SPANS, VH)).toBe(1);
    expect(progressFromScroll(1800, SPANS, VH)).toBe(1);
    expect(progressFromScroll(2100, SPANS, VH)).toBe(1);
    expect(progressFromScroll(2101, SPANS, VH)).toBeGreaterThan(1);
  });

  it("stays on the last stop to the end of the page", () => {
    expect(progressFromScroll(3600, SPANS, VH)).toBe(2);
    expect(progressFromScroll(99999, SPANS, VH)).toBe(2);
  });

  it("copes with overscroll, an unmeasured page and a single stop", () => {
    expect(progressFromScroll(-200, SPANS, VH)).toBe(0);
    expect(progressFromScroll(500, [], VH)).toBe(0);
    expect(progressFromScroll(5000, [SPANS[0]], VH)).toBe(0);
  });

  it("never returns NaN when labels sit so close that their holds overlap", () => {
    const crowded: LabelSpan[] = [
      { top: 0, bottom: 400 },
      { top: 450, bottom: 850 },
      { top: 900, bottom: 1300 },
    ];

    for (let y = -100; y <= 1500; y += 25) {
      const progress = progressFromScroll(y, crowded, 400);
      expect(Number.isFinite(progress)).withContext(`scrollY ${y}`).toBeTrue();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(2);
    }
  });
});

describe("scrollTargetFor", () => {
  it("centres a label that fits the screen", () => {
    expect(scrollTargetFor({ top: 2100, bottom: 2500 }, VH, 96)).toBe(1800);
  });

  it("pins a label taller than the screen under the header", () => {
    expect(scrollTargetFor({ top: 2100, bottom: 3300 }, VH, 96)).toBe(2004);
  });

  it("never asks for a negative scroll position", () => {
    expect(scrollTargetFor({ top: 50, bottom: 150 }, VH, 96)).toBe(0);
  });

  it("lands inside the stop's hold range, so arriving there shows that stop", () => {
    const target = scrollTargetFor(SPANS[1], VH, 96);

    expect(progressFromScroll(target, SPANS, VH)).toBe(1);
  });
});

describe("labelShareOf", () => {
  it("is the label's width plus gutter as a share of the page", () => {
    expect(labelShareOf(922, 1440, 24)).toBeCloseTo((1440 - 922 + 24) / 1440, 6);
  });

  it("is zero below 900px, where labels lie over the scene", () => {
    expect(labelShareOf(400, 899, 24)).toBe(0);
    expect(labelShareOf(209, 850, 24)).toBe(0);
  });

  it("is zero while nothing has been measured", () => {
    expect(labelShareOf(undefined, 1440, 24)).toBe(0);
  });

  it("is capped, so a wide label can never push the camera out of the room", () => {
    expect(labelShareOf(100, 1000, 24)).toBe(0.6);
    expect(labelShareOf(5000, 1000, 24)).toBe(0);
  });
});

describe("neighbourStop", () => {
  it("steps to the adjacent stop when standing at one", () => {
    expect(neighbourStop(3, 3, 1)).toBe(4);
    expect(neighbourStop(3, 3, -1)).toBe(2);
    expect(neighbourStop(3.01, 3, 1)).toBe(4);
  });

  it("finishes the stride when between stops", () => {
    expect(neighbourStop(2.4, 2, 1)).toBe(3);
    expect(neighbourStop(2.6, 3, 1)).toBe(3);
  });

  it("turns back to the stop just left when between stops", () => {
    expect(neighbourStop(2.4, 2, -1)).toBe(2);
    expect(neighbourStop(2.6, 3, -1)).toBe(2);
  });

  it("reports stops beyond either end so the caller can let the page scroll", () => {
    expect(neighbourStop(0, 0, -1)).toBe(-1);
    expect(neighbourStop(7, 7, 1)).toBe(8);
  });
});
