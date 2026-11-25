import { TestBed } from "@angular/core/testing";
import { glideDuration, glideEase, GlideOutcome, ScrollGlide } from "./scroll-glide";

const INTENT = ["wheel", "touchstart", "touchmove", "pointerdown", "keydown"];

describe("ScrollGlide", () => {
  const root = document.documentElement;
  let glide: ScrollGlide;
  /** Where the faked window stands; `window.scrollTo` moves it and nothing else does. */
  let position: number;
  let scrollTo: jasmine.Spy;
  let pending: Map<number, FrameRequestCallback>;
  /** True while the glide's own code runs: a frame asked for at any other time is another spec's leftover, and goes to the browser. */
  let gliding: boolean;
  let listen: jasmine.Spy;
  let unlisten: jasmine.Spy;

  beforeEach(() => {
    position = 0;
    pending = new Map();
    gliding = false;
    // Counted down from zero: the browser's own handles are all above it
    let handle = 0;
    const browserFrame = window.requestAnimationFrame.bind(window);
    const browserCancel = window.cancelAnimationFrame.bind(window);
    spyOnProperty(window, "scrollY").and.callFake(() => position);
    spyOnProperty(root, "scrollHeight").and.returnValue(100_000);
    scrollTo = spyOn(window, "scrollTo").and.callFake(((options: ScrollToOptions) => {
      position = options.top ?? position;
    }) as typeof window.scrollTo);
    spyOn(window, "requestAnimationFrame").and.callFake((callback) => {
      if (!gliding) return browserFrame(callback);
      pending.set(--handle, callback);
      return handle;
    });
    spyOn(window, "cancelAnimationFrame").and.callFake((id) => (id < 0 ? void pending.delete(id) : browserCancel(id)));
    listen = spyOn(window, "addEventListener").and.callThrough();
    unlisten = spyOn(window, "removeEventListener").and.callThrough();
    glide = TestBed.inject(ScrollGlide);
    const to = glide.to.bind(glide);
    spyOn(glide, "to").and.callFake((...asked) => own(() => to(...asked)));
  });

  afterEach(() => {
    glide.cancel();
    root.style.removeProperty("scroll-snap-type");
  });

  function own<T>(run: () => T): T {
    const within = gliding;
    gliding = true;
    try {
      return run();
    } finally {
      gliding = within;
    }
  }

  /** Runs the one frame the glide has asked for, at `at` milliseconds on the frame clock. */
  function frame(at: number): void {
    expect(pending.size).withContext("frames asked for").toBe(1);
    const [[id, callback]] = pending;
    pending.delete(id);
    own(() => callback(at));
  }

  const tops = () => scrollTo.calls.allArgs().map(([options]) => (options as ScrollToOptions).top!);
  const act = (type: string, init: object = {}, on: EventTarget = document.body) =>
    on.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), init));
  const key = (init: KeyboardEventInit = {}) =>
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true, ...init }));
  const captures = (options: unknown) => options === true || (options as AddEventListenerOptions | undefined)?.capture === true;
  /** What is still listened for on the window: every listener added for one of the five and not taken off again from the same phase. */
  const listening = () =>
    listen.calls
      .allArgs()
      .filter(([type]) => INTENT.includes(type))
      .filter(
        ([type, listener, options]) =>
          !unlisten.calls.allArgs().some(([gone, same, from]) => gone === type && same === listener && captures(from) === captures(options)),
      )
      .map(([type]) => type as string);

  describe("how long it takes", () => {
    const measured: [pixels: number, chrome: number][] = [
      [1289, 605],
      [6292, 1322],
      [8706, 1487],
    ];

    for (const [pixels, chrome] of measured) {
      it(`is within 2% of the ${chrome} ms desktop Chrome took over ${pixels} px`, () => {
        expect(Math.abs(glideDuration(pixels) - chrome) / chrome).toBeLessThan(0.02);
      });
    }

    it("grows with the square root of the distance, whichever way the page goes", () => {
      expect(glideDuration(400)).toBeCloseTo(16.7 * 20, 6);
      expect(glideDuration(1600)).toBeCloseTo(2 * glideDuration(400), 6);
      expect(glideDuration(-1600)).toBe(glideDuration(1600));
    });

    it("is never under a quarter of a second, so a short hop still reads as a movement", () => {
      expect(glideDuration(0)).toBe(250);
      expect(glideDuration(100)).toBe(250);
      expect(glideDuration(224)).toBe(250);
      expect(glideDuration(226)).toBeGreaterThan(250);
    });

    it("is never over a second and a half, however far the page has to go", () => {
      expect(glideDuration(8067)).toBeLessThan(1500);
      expect(glideDuration(8069)).toBe(1500);
      expect(glideDuration(1_000_000)).toBe(1500);
    });

    it("is counted on the frame clock from the first frame, not in frames", async () => {
      const outcome = glide.to(() => 1600);

      frame(5000);
      frame(5000 + 667);
      expect(position).toBeLessThan(1600);
      expect(glide.active).toBeTrue();

      frame(5000 + 668);
      expect(position).toBe(1600);
      expect(glide.active).toBeFalse();
      expect(pending.size).toBe(0);
      expect(await outcome).toBe("arrived");
    });

    it("takes as long over three frames as over three hundred", async () => {
      const few = glide.to(() => 1600);
      for (const at of [0, 334, 668]) frame(at);
      expect(await few).toBe("arrived");
      expect(scrollTo).toHaveBeenCalledTimes(3);

      position = 0;
      scrollTo.calls.reset();
      const many = glide.to(() => 1600);
      for (let at = 0; at < 668; at += 2.5) frame(at);
      expect(glide.active).toBeTrue();
      frame(668);
      expect(await many).toBe("arrived");
    });
  });

  describe("the pace", () => {
    const shares = Array.from({ length: 201 }, (_, index) => index / 200);

    it("starts at nothing, ends on the whole way and never goes back", () => {
      const eased = shares.map(glideEase);

      expect(eased[0]).toBeCloseTo(0, 5);
      expect(eased[200]).toBeCloseTo(1, 5);
      for (let index = 1; index < eased.length; index++) {
        expect(eased[index]).withContext(`at ${shares[index]}`).toBeGreaterThanOrEqual(eased[index - 1]);
      }
    });

    it("eases in and out: slower than an even pace at both ends, faster in between", () => {
      expect(glideEase(0.05)).toBeLessThan(0.05 / 2);
      expect(1 - glideEase(0.95)).toBeLessThan(0.05 / 2);
      expect(glideEase(0.3) - glideEase(0.2)).toBeGreaterThan(0.1 * 2);
    });

    it("follows desktop Chrome's own smooth scroll, measured over 6292 px, to within 2% of the way", () => {
      const chrome: [time: number, way: number][] = [
        [0.11, 0.04],
        [0.19, 0.17],
        [0.26, 0.464],
        [0.34, 0.666],
        [0.49, 0.855],
        [0.65, 0.942],
        [0.8, 0.983],
        [0.95, 0.999],
      ];

      for (const [time, way] of chrome) expect(Math.abs(glideEase(time) - way)).withContext(`at ${time}`).toBeLessThan(0.02);
    });

    it("moves the page one way only, down as well as up", async () => {
      const down = glide.to(() => 3000);
      for (let at = 0; at <= 920; at += 20) frame(at);
      expect(await down).toBe("arrived");
      const downward = tops();
      expect(downward.every((top, index) => index === 0 || top >= downward[index - 1])).toBeTrue();
      expect(new Set(downward).size).withContext("a new position nearly every frame").toBeGreaterThan(downward.length - 3);

      scrollTo.calls.reset();
      const up = glide.to(() => 0);
      for (let at = 0; at <= 920; at += 20) frame(at);
      expect(await up).toBe("arrived");
      const upward = tops();
      expect(upward.every((top, index) => index === 0 || top <= upward[index - 1])).toBeTrue();
      expect(upward[upward.length - 1]).toBe(0);
    });
  });

  describe("every step", () => {
    it("is set outright and at once, whatever a stylesheet says about smooth scrolling", () => {
      void glide.to(() => 900);
      for (const at of [0, 100, 200, 600]) frame(at);

      expect(scrollTo).toHaveBeenCalledTimes(4);
      for (const [options] of scrollTo.calls.allArgs()) expect((options as ScrollToOptions).behavior).toBe("instant");
    });

    it("lands exactly on the target, to the last fraction of a pixel", async () => {
      position = 0.1;
      const outcome = glide.to(() => 1289.37);

      for (const at of [0, 300, 700]) frame(at);

      expect(await outcome).toBe("arrived");
      expect(scrollTo.calls.mostRecent().args[0]).toEqual({ top: 1289.37, behavior: "instant" });
    });

    it("keeps to whole pixels on the way and never steps past either end", async () => {
      for (const [from, to] of [
        [0.4, 1289.37],
        [1289.37, 0.4],
      ]) {
        position = from;
        scrollTo.calls.reset();
        const outcome = glide.to(() => to);
        for (let at = 0; glide.active && at <= 2000; at += 8) frame(at);
        expect(await outcome).toBe("arrived");

        const [low, high] = [Math.min(from, to), Math.max(from, to)];
        const onTheWay = tops().slice(0, -1);
        expect(onTheWay.every((top) => top === from || Number.isInteger(top))).withContext(`from ${from}`).toBeTrue();
        expect(onTheWay.every((top) => top >= low && top <= high)).withContext(`from ${from}`).toBeTrue();
        expect(tops().every((top, index, all) => index === 0 || (to > from ? top >= all[index - 1] : top <= all[index - 1]))).toBeTrue();
        expect(position).toBe(to);
      }
    });

    it("tells the caller the position it has just set, in the same frame", () => {
      const seen: [told: number, standing: number][] = [];
      void glide.to(
        () => 900,
        (top) => seen.push([top, position]),
      );

      for (const at of [0, 150, 300, 600]) frame(at);

      expect(seen.length).toBe(4);
      expect(seen.map(([told]) => told)).toEqual(tops());
      expect(seen.every(([told, standing]) => told === standing)).toBeTrue();
      expect(seen[3][0]).toBe(900);
    });

    it("asks for the target afresh, so one that moves on the way is followed and landed on", async () => {
      let target = 1000;
      const outcome = glide.to(() => target);
      const duration = glideDuration(1000);

      frame(0);
      frame(duration / 2);
      expect(position).toBe(Math.floor(1000 * glideEase(0.5)));

      target = 1400;
      frame(duration / 2);
      expect(position).toBe(Math.floor(1400 * glideEase(0.5)));

      frame(duration);
      expect(position).toBe(1400);
      expect(await outcome).withContext("in the time first set").toBe("arrived");
    });

    it("stops at the page's end when the target lies beyond it, and eases into that", async () => {
      spyOnProperty(window, "innerHeight").and.returnValue(600);
      spyOnProperty(root, "clientHeight").and.returnValue(600);
      const outcome = glide.to(() => 200_000);

      frame(0);
      frame(750);
      expect(position).toBe(Math.floor(99_400 * glideEase(0.5)));
      frame(1500);

      expect(position).toBe(99_400);
      expect(await outcome).toBe("arrived");
    });

    it("never aims above the top of the page", async () => {
      position = 300;
      const outcome = glide.to(() => -50);

      frame(0);
      frame(300);

      expect(position).toBe(0);
      expect(await outcome).toBe("arrived");
    });

    it("takes no further step once its own caller has cancelled it from a step", async () => {
      const outcome = glide.to(
        () => 900,
        () => glide.cancel(),
      );

      frame(0);

      expect(await outcome).toBe("interrupted");
      expect(pending.size).toBe(0);
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it("hands over cleanly when its caller begins another glide from a step", async () => {
      let second: Promise<GlideOutcome> | undefined;
      const first = glide.to(
        () => 900,
        () => (second ??= glide.to(() => 300)),
      );

      frame(0);

      expect(await first).toBe("interrupted");
      expect(pending.size).withContext("one glide, one frame").toBe(1);
      expect(listening()).toEqual(INTENT);
      frame(100);
      frame(500);
      expect(position).toBe(300);
      expect(await second).toBe("arrived");
      expect(listening()).toEqual([]);
    });

    for (const [what, failing] of [
      ["step", () => glide.to(() => 900, () => { throw new Error("the scene broke"); })],
      ["target", () => glide.to(() => { throw new Error("the scene broke"); })],
    ] as const) {
      it(`lets go of the page when its caller's ${what} throws, instead of holding it for a glide that will never end`, async () => {
        const outcome = failing();
        expect(glide.active).toBeTrue();

        expect(() => frame(0)).toThrowError("the scene broke");

        expect(await outcome).toBe("interrupted");
        expect(glide.active).toBeFalse();
        expect(pending.size).toBe(0);
        expect(listening()).toEqual([]);
        expect(root.style.scrollSnapType).toBe("");
      });
    }
  });

  describe("when the visitor takes over", () => {
    for (const type of INTENT) {
      it(`gives way at once to a ${type}`, async () => {
        const outcome = glide.to(() => 2000);
        frame(0);
        frame(200);
        const stoodAt = position;

        act(type);

        expect(glide.active).toBeFalse();
        expect(await outcome).toBe("interrupted");
        expect(pending.size).withContext("frames still asked for").toBe(0);
        expect(position).toBe(stoodAt);
        expect(listening()).toEqual([]);
      });
    }

    it("listens for all five, and only while it is under way", async () => {
      expect(listening()).toEqual([]);

      const outcome = glide.to(() => 500);
      expect(listening()).toEqual(INTENT);

      frame(0);
      frame(400);
      expect(await outcome).toBe("arrived");
      expect(listening()).toEqual([]);
    });

    describe("with a key", () => {
      /** As the gallery listens: on the window, in the bubble phase, from before any glide. */
      let onKey: (event: Event) => void;
      const pageKeys = (event: Event) => onKey(event);

      beforeEach(() => {
        onKey = () => undefined;
        window.addEventListener("keydown", pageKeys);
      });

      afterEach(() => window.removeEventListener("keydown", pageKeys));

      it("carries on when the page handled the key itself: a walking key held down or pressed again asks for the walk under way", () => {
        onKey = (event) => event.preventDefault();
        const outcome = jasmine.createSpy("outcome");
        void glide.to(() => 2000).then(outcome);
        frame(0);
        frame(200);
        const stoodAt = position;

        key();
        key({ repeat: true });
        key({ repeat: true });

        expect(glide.active).toBeTrue();
        frame(400);
        expect(position).toBeGreaterThan(stoodAt);
        expect(outcome).not.toHaveBeenCalled();
      });

      it("gives way when the page left the key to the browser, which may scroll with it or move the focus", async () => {
        const outcome = glide.to(() => 2000);
        frame(0);

        key({ key: "Tab" });

        expect(await outcome).toBe("interrupted");
        expect(pending.size).toBe(0);
      });

      it("lets the press that replaces a glide begin the next, which no listener of either ends", async () => {
        const outcomes: Promise<GlideOutcome>[] = [glide.to(() => 2000)];
        frame(0);
        frame(200);
        const stoodAt = position;
        onKey = (event) => {
          event.preventDefault();
          outcomes.push(glide.to(() => 4000));
        };

        key();

        expect(await outcomes[0]).toBe("interrupted");
        expect(outcomes.length).toBe(2);
        expect(glide.active).withContext("the glide the press began").toBeTrue();
        frame(1000);
        expect(position).toBeCloseTo(stoodAt, 6);
        frame(2500);
        expect(position).toBe(4000);
        expect(await outcomes[1]).toBe("arrived");
      });

      it("ends a glide begun from a key handler below the window that left the key to the browser, and keeps one whose handler prevented it", () => {
        const control = document.createElement("div");
        document.body.append(control);
        let prevent = false;
        control.addEventListener("keydown", (event) => {
          if (prevent) event.preventDefault();
          void glide.to(() => 2000);
        });
        const pressed = () => control.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));

        pressed();
        expect(glide.active).withContext("the key counts as a takeover").toBeFalse();

        prevent = true;
        pressed();
        expect(glide.active).toBeTrue();
        control.remove();
      });

      it("lets the press begin the next glide where the page only starts listening once a glide is under way", async () => {
        const first = glide.to(() => 2000);
        frame(0);
        let second: Promise<GlideOutcome> | undefined;
        const late = () => (second = glide.to(() => 4000));
        window.addEventListener("keydown", late);

        key();
        window.removeEventListener("keydown", late);

        expect(await first).toBe("interrupted");
        expect(glide.active).toBeTrue();
        frame(1000);
        frame(2500);
        expect(await second).toBe("arrived");
      });
    });

    it("carries on under a mouse pressed on a button or a link, which works the control and does not reach for the page", () => {
      const button = document.createElement("button");
      const link = document.createElement("a");
      link.append(document.createElement("span"));
      document.body.append(button, link);
      const press = (on: Element, pointerType: string) => on.dispatchEvent(new PointerEvent("pointerdown", { pointerType, bubbles: true }));
      void glide.to(() => 2000);
      frame(0);

      press(button, "mouse");
      press(link.firstElementChild!, "mouse");
      expect(glide.active).toBeTrue();

      press(document.body, "mouse");
      expect(glide.active).withContext("a mouse pressed on the page itself").toBeFalse();

      void glide.to(() => 2000);
      press(button, "touch");
      expect(glide.active).withContext("a finger, wherever it lands, may begin a scroll").toBeFalse();
      button.remove();
      link.remove();
    });

    it("lets a click begin the next glide too: the press before it has already ended the last", async () => {
      const first = glide.to(() => 2000);
      frame(0);

      act("pointerdown");
      const second = glide.to(() => 4000);
      act("click");

      expect(await first).toBe("interrupted");
      expect(glide.active).toBeTrue();
      frame(0);
      frame(1500);
      expect(await second).toBe("arrived");
    });
  });

  describe("a new glide", () => {
    it("replaces the one under way, which is told it was interrupted, and sets off from where the page stands", async () => {
      const first = glide.to(() => 2000);
      frame(0);
      frame(300);
      const stoodAt = position;
      expect(stoodAt).toBeGreaterThan(0);

      const second = glide.to(() => 100);

      expect(await first).toBe("interrupted");
      expect(pending.size).withContext("one glide, one frame").toBe(1);
      expect(listening()).toEqual(INTENT);
      frame(1000);
      expect(position).toBeCloseTo(stoodAt, 6);
      frame(2500);
      expect(position).toBe(100);
      expect(await second).toBe("arrived");
    });

    it("can be cancelled by its caller", async () => {
      const outcome = glide.to(() => 2000);
      frame(0);

      glide.cancel();

      expect(await outcome).toBe("interrupted");
      expect(pending.size).toBe(0);
      expect(listening()).toEqual([]);
      expect(glide.active).toBeFalse();
    });
  });

  describe("the page's own snapping", () => {
    it("is held off for the length of the glide, or every step near a snap point would be pulled back to it", async () => {
      const outcome = glide.to(() => 500);
      expect(root.style.scrollSnapType).toBe("none");

      frame(0);
      expect(root.style.scrollSnapType).toBe("none");
      frame(400);

      expect(await outcome).toBe("arrived");
      expect(root.style.scrollSnapType).toBe("");
    });

    it("comes back as it was when the glide is interrupted or replaced", () => {
      root.style.scrollSnapType = "y mandatory";

      void glide.to(() => 500);
      void glide.to(() => 900);
      expect(root.style.scrollSnapType).toBe("none");

      act("wheel");
      expect(root.style.scrollSnapType).toBe("y mandatory");
    });

    it("is back before the caller hears that the glide arrived", async () => {
      const outcome = glide.to(() => 500).then(() => root.style.scrollSnapType);

      frame(0);
      frame(400);

      expect(await outcome).toBe("");
    });
  });

  it("is ended with everything it holds when the app is torn down", async () => {
    const outcome = glide.to(() => 2000);
    frame(0);

    TestBed.resetTestingModule();

    expect(await outcome).toBe("interrupted");
    expect(pending.size).toBe(0);
    expect(listening()).toEqual([]);
    expect(root.style.scrollSnapType).toBe("");
  });
});
