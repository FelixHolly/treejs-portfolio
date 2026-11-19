import { QUALITY_LADDER, QualityController, QualityTier } from "./quality";

const FAST = 1 / 60;
const [MIRRORING, ...PLAIN] = QUALITY_LADDER;
const [SHARPEST, , , LOWEST_RATIO, SHADOWLESS] = PLAIN;
const LAST = PLAIN.length - 1;

/** Watches the tiers below the mirroring one, where every step is about the pace alone, unless given the whole `ladder`. */
function watch(startAt = 0, ladder: readonly QualityTier[] = PLAIN) {
  const steps: QualityTier[] = [];
  const tooSlow = jasmine.createSpy("tooSlow");
  const controller = new QualityController(ladder, startAt, (tier) => steps.push(tier), tooSlow);

  /** One frame, drawn at the tier's ratio or at what the display has if that is less. */
  const frame = (seconds: number, displayRatio = 2) =>
    controller.frame(seconds, Math.min(displayRatio, controller.tier.pixelRatio));
  const frames = (count: number, seconds: number, displayRatio = 2) => {
    for (let index = 0; index < count; index++) frame(seconds, displayRatio);
  };
  /** Lets the scene run for `duration` seconds at `seconds` a frame. */
  const run = (seconds: number, duration: number, displayRatio = 2) =>
    frames(Math.ceil(duration / seconds), seconds, displayRatio);
  const watchDisplay = (...beats: number[]) => beats.forEach((beat) => controller.displayFrame(beat));

  return { controller, steps, tooSlow, frame, frames, run, watchDisplay };
}

describe("QUALITY_LADDER", () => {
  it("brings the pixel ratio down first and takes the statue's shadow last", () => {
    expect(PLAIN.map((tier) => tier.pixelRatio)).toEqual([2, 1.5, 1.25, 1, 1]);
    expect(PLAIN.map((tier) => tier.statueShadow)).toEqual([true, true, true, true, false]);
  });

  it("mirrors the room in the floor at the top only, and gives nothing else up with it", () => {
    expect(QUALITY_LADDER.map((tier) => tier.reflections)).toEqual([true, false, false, false, false, false]);
    expect({ ...MIRRORING, reflections: false }).toEqual(SHARPEST);
  });
});

describe("QualityController", () => {
  describe("where it starts", () => {
    it("starts at the top, where costly effects are allowed", () => {
      const { controller } = watch(0, QUALITY_LADDER);

      expect(controller.tier).toBe(MIRRORING);
      expect(controller.allowsCostlyEffects).toBeTrue();
    });

    it("starts lower when the visit has already settled there, and allows no costly effects", () => {
      const { controller } = watch(1, QUALITY_LADDER);

      expect(controller.tier).toBe(SHARPEST);
      expect(controller.allowsCostlyEffects).toBeFalse();
    });

    it("keeps to the ladder when asked to start beyond either end", () => {
      expect(watch(99).controller.tier).toBe(SHADOWLESS);
      expect(watch(-1).controller.tier).toBe(SHARPEST);
    });
  });

  describe("when it steps", () => {
    it("leaves quality alone while frames are fast", () => {
      const { steps, tooSlow, run } = watch();

      run(FAST, 60);

      expect(steps).toEqual([]);
      expect(tooSlow).not.toHaveBeenCalled();
    });

    it("leaves quality alone at a pace inside the limit and steps just beyond it", () => {
      const inside = watch();
      const beyond = watch();

      inside.run(0.021, 30);
      beyond.run(0.023, 30);

      expect(inside.steps).toEqual([]);
      expect(beyond.steps.length).toBeGreaterThan(0);
    });

    it("steps after a second of slow frames, once the first four have been left out", () => {
      const { steps, frames, frame } = watch();

      // 4 left out, then 34 frames of 30 ms are the first to add up to a second
      frames(37, 0.03);
      expect(steps).toEqual([]);

      frame(0.03);
      expect(steps).toEqual([PLAIN[1]]);
    });

    it("waits for eight frames however slow they are", () => {
      const { steps, frames, frame } = watch();

      frames(4 + 7, 0.2);
      expect(steps).toEqual([]);

      frame(0.2);
      expect(steps.length).toBe(1);
    });

    it("judges a new tier on frames of its own: none carried over, the first four left out again", () => {
      const { steps, frames, frame } = watch();

      // An eighth of a second a frame: eight of them make the second
      frames(4 + 8, 0.125);
      expect(steps.length).toBe(1);

      frames(4 + 7, 0.125);
      expect(steps.length).toBe(1);

      frame(0.125);
      expect(steps.length).toBe(2);
    });

    it("never steps back up", () => {
      const { controller, steps, frames, run } = watch();

      frames(4 + 34, 0.03);
      run(FAST, 300);

      expect(steps).toEqual([PLAIN[1]]);
      expect(controller.tier).toBe(PLAIN[1]);
      expect(controller.allowsCostlyEffects).toBeFalse();
    });

    it("reports the tier it hands to its listener", () => {
      const { controller, steps, run } = watch();

      run(0.05, 3);

      expect(steps.length).toBeGreaterThan(0);
      expect(controller.tier).toBe(steps[steps.length - 1]);
    });
  });

  describe("how far it steps", () => {
    it("takes the tiers one at a time when the pace is only a little off", () => {
      const { steps, tooSlow, run } = watch();

      run(0.025, 60);

      expect(steps).toEqual(PLAIN.slice(1));
      expect(tooSlow).not.toHaveBeenCalled();
    });

    it("lands on the ratio the pace can afford", () => {
      const { steps, run } = watch();

      // 50 ms where 22 would do: 44% of the pixels, a ratio of 1.33
      run(0.05, 1.5);

      expect(steps).toEqual([PLAIN[2]]);
    });

    it("drops every ratio at once when the pace is far off, but the shadow in a step of its own", () => {
      const { steps, run } = watch();

      run(0.25, 3.5);
      expect(steps).toEqual([LOWEST_RATIO]);

      run(0.25, 3.5);
      expect(steps).toEqual([LOWEST_RATIO, SHADOWLESS]);
    });

    it("passes over tiers that would not lower what the display already draws", () => {
      const { steps, run } = watch();

      run(0.025, 1.5, 1.25);

      expect(steps).toEqual([LOWEST_RATIO]);
    });

    it("takes the shadow straight away where the ratio cannot come down", () => {
      const { steps, run } = watch();

      run(0.025, 1.5, 1);

      expect(steps).toEqual([SHADOWLESS]);
    });

    it("counts a ratio that drops fewer than 15% of the pixels as no step", () => {
      const { steps, run } = watch();

      // 1.5 after 1.6 would drop 12%
      run(0.025, 1.5, 1.6);

      expect(steps).toEqual([PLAIN[2]]);
    });
  });

  describe("the mirroring floor", () => {
    it("goes first and alone, however far off the pace is", () => {
      const { controller, steps, run } = watch(0, QUALITY_LADDER);

      run(0.25, 3.5);

      expect(steps).toEqual([SHARPEST]);
      expect(controller.allowsCostlyEffects).toBeFalse();
    });

    it("goes even where the display leaves no pixel ratio to bring down", () => {
      const { steps, run } = watch(0, QUALITY_LADDER);

      run(0.025, 1.5, 1);

      expect(steps).toEqual([SHARPEST]);
    });

    it("costs nothing else when the pace recovers without it", () => {
      const { controller, steps, frames, run } = watch(0, QUALITY_LADDER);

      frames(4 + 34, 0.03);
      run(FAST, 300);

      expect(steps).toEqual([SHARPEST]);
      expect(controller.tier.pixelRatio).toBe(MIRRORING.pixelRatio);
    });

    it("is followed by the ratios when the pace stays off without it", () => {
      const { steps, tooSlow, run } = watch(0, QUALITY_LADDER);

      run(0.025, 60);

      expect(steps).toEqual(PLAIN);
      expect(tooSlow).not.toHaveBeenCalled();
    });
  });

  describe("what it leaves out", () => {
    it("leaves out the four frames after settle()", () => {
      const { controller, steps, frames } = watch();

      for (let rest = 0; rest < 500; rest++) {
        controller.settle();
        frames(4, 0.2);
      }

      expect(steps).toEqual([]);
    });

    it("keeps what it has seen across a rest, so short bursts add up", () => {
      const { controller, steps, frames } = watch();

      // Each burst: 4 left out, 6 counted
      frames(10, 0.1);
      expect(steps).toEqual([]);

      controller.settle();
      frames(10, 0.1);
      expect(steps.length).toBe(1);
    });

    it("takes one long frame for a hitch, not for the pace", () => {
      const { steps, frames, frame } = watch();

      // 20 ms is inside the limit; with the hitch counted the second would average 26 ms
      for (let second = 0; second < 30; second++) {
        frames(38, 0.02);
        frame(0.25);
      }

      expect(steps).toEqual([]);
    });

    it("does not let one stall stand in for a second of frames", () => {
      const { steps, frames, frame, run } = watch();

      run(FAST, 2);
      frame(1.2);
      frames(3, 0.033);
      run(FAST, 2);

      expect(steps).toEqual([]);
    });

    it("counts a machine that stalls on every frame as slow all the same", () => {
      const { steps, tooSlow, run } = watch();

      run(3, 120);

      expect(steps).toEqual([LOWEST_RATIO, SHADOWLESS]);
      expect(tooSlow).toHaveBeenCalledTimes(1);
    });
  });

  describe("the display's own pace", () => {
    const beats = (seconds: number) => Array.from({ length: 20 }, () => seconds);

    it("does not step when the display itself shows thirty frames a second", () => {
      const { steps, tooSlow, run, watchDisplay } = watch();

      watchDisplay(...beats(1 / 30));
      run(1 / 30, 60);

      expect(steps).toEqual([]);
      expect(tooSlow).not.toHaveBeenCalled();
    });

    it("still steps on such a display when frames are late for it", () => {
      const inside = watch();
      const beyond = watch();
      inside.watchDisplay(...beats(1 / 30));
      beyond.watchDisplay(...beats(1 / 30));

      inside.run(0.04, 30);
      beyond.run(0.05, 30);

      expect(inside.steps).toEqual([]);
      expect(beyond.steps.length).toBeGreaterThan(0);
    });

    it("holds a slow display to its own pace before telling the visitor", () => {
      const inside = watch(LAST);
      const beyond = watch(LAST);
      inside.watchDisplay(...beats(1 / 30));
      beyond.watchDisplay(...beats(1 / 30));

      inside.run(0.04, 30);
      beyond.run(0.05, 30);

      expect(inside.tooSlow).not.toHaveBeenCalled();
      expect(beyond.tooSlow).toHaveBeenCalledTimes(1);
    });

    it("does not take one stray short beat for the display's pace", () => {
      const { steps, run, watchDisplay } = watch();

      watchDisplay(...beats(1 / 30), 1 / 60);
      run(1 / 30, 30);

      expect(steps).toEqual([]);
    });

    it("takes long beats for a busy start, not for a slow display", () => {
      const { steps, run, watchDisplay } = watch();

      watchDisplay(...beats(0.1), 1 / 60, 1 / 60);
      run(1 / 30, 30);

      expect(steps.length).toBeGreaterThan(0);
    });

    it("asks no more of a faster display than of a 60 Hz one", () => {
      const inside = watch();
      const beyond = watch();
      inside.watchDisplay(...beats(1 / 120));
      beyond.watchDisplay(...beats(1 / 120));

      inside.run(0.02, 30);
      beyond.run(0.025, 30);

      expect(inside.steps).toEqual([]);
      expect(beyond.steps.length).toBeGreaterThan(0);
    });

    it("judges by the 60 Hz limit when the display was never watched", () => {
      const { steps, run } = watch();

      run(1 / 30, 30);

      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe("telling the visitor", () => {
    it("tells only at the lowest tier, after every step, and only once", () => {
      const { controller, steps, tooSlow, run } = watch();
      const tiersWhenTold: QualityTier[] = [];
      tooSlow.and.callFake(() => tiersWhenTold.push(controller.tier));

      run(0.05, 120);

      expect(steps).toEqual([PLAIN[2], LOWEST_RATIO, SHADOWLESS]);
      expect(tiersWhenTold).toEqual([SHADOWLESS]);
    });

    it("tells nobody while the lowest tier keeps a pace of 35 ms or better", () => {
      const inside = watch(LAST);
      const beyond = watch(LAST);

      inside.run(0.034, 60);
      beyond.run(0.036, 60);

      expect(inside.tooSlow).not.toHaveBeenCalled();
      expect(beyond.tooSlow).toHaveBeenCalledTimes(1);
    });

    it("does not call a steady thirty frames a second too slow", () => {
      const { tooSlow, run } = watch(LAST);

      run(1 / 30, 120);

      expect(tooSlow).not.toHaveBeenCalled();
    });

    it("has nowhere left to step at the lowest tier", () => {
      const { steps, run } = watch(LAST);

      run(0.2, 60);

      expect(steps).toEqual([]);
    });

    it("needs a full second there too before it tells", () => {
      const { tooSlow, frames, frame } = watch(LAST);

      frames(4 + 7, 0.125);
      expect(tooSlow).not.toHaveBeenCalled();

      frame(0.125);
      expect(tooSlow).toHaveBeenCalledTimes(1);
    });
  });
});
