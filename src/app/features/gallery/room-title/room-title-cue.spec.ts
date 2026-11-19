import { buildStops } from "../stops";
import { RoomTitleCue, TITLE_FADE_IN_MS, TITLE_FADE_OUT_MS, TITLE_HOLD_MS, WALK_IDLE_MS } from "./room-title-cue";

const work = (slug: string) => ({ slug }) as Parameters<typeof buildStops>[0][number];
/** Entrance 0; Room I 1 and 2; Room II 3, 4 and 5; Room III 6; Room IV 7. */
const ROOMS = buildStops([work("one"), work("two")]).map((stop) => stop.room);
const STEP = 0.02;

describe("RoomTitleCue", () => {
  let cue: RoomTitleCue;
  /** Every title that came up, in order, as its numeral. */
  let titled: string[];

  function note(): void {
    const numeral = cue.shown() ? cue.room()!.numeral : "";
    if (numeral && titled[titled.length - 1] !== numeral) titled.push(numeral);
    if (!numeral && titled[titled.length - 1] !== "") titled.push("");
  }

  /** Scrolls from where the visitor is to `to` in even steps, `ms` apart. */
  function scroll(from: number, to: number, ms = 16): void {
    const steps = Math.round(Math.abs(to - from) / STEP);
    for (let step = 1; step <= steps; step++) {
      jasmine.clock().tick(ms);
      cue.follow(from + ((to - from) * step) / steps);
      note();
    }
  }

  function standAt(stop: number): void {
    cue = new RoomTitleCue(ROOMS);
    cue.follow(stop);
    titled = [""];
  }

  function rest(ms = TITLE_HOLD_MS + WALK_IDLE_MS): void {
    jasmine.clock().tick(ms);
    note();
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 0, 1));
  });

  afterEach(() => {
    cue.dispose();
    jasmine.clock().uninstall();
  });

  describe("scrolling by hand", () => {
    it("titles Room II once on the walk from the skills through its door", () => {
      standAt(2);
      scroll(2, 3, 40);

      expect(cue.room()?.name).toBe("The Works");
      rest();
      expect(titled).toEqual(["", "II", ""]);
    });

    it("comes up only once the label left behind has scrolled away, holds for the rest of the walk and fades as it ends", () => {
      standAt(2);

      scroll(2, 2.4, 40);
      expect(cue.shown()).toBeFalse();
      scroll(2.4, 2.5, 40);
      expect(cue.shown()).toBeTrue();
      scroll(2.5, 2.98, 200);
      expect(cue.shown()).toBeTrue();
      scroll(2.98, 3, 200);
      expect(cue.shown()).toBeFalse();
    });

    it("shows nothing for a room the visitor is suddenly standing in, as when the scroll bar is dragged there", () => {
      standAt(2);
      cue.follow(6);
      note();
      rest();

      expect(titled).toEqual([""]);
      expect(cue.holdsLabels()).toBeFalse();
    });

    for (const [from, to, numeral] of [
      [0, 1, "I"],
      [2, 3, "II"],
      [5, 6, "III"],
      [6, 7, "IV"],
    ] as const) {
      it(`titles Room ${numeral} through its door`, () => {
        standAt(from);
        scroll(from, to, 40);
        rest();

        expect(titled).toEqual(["", numeral, ""]);
      });
    }

    it("titles the room walked back into", () => {
      standAt(3);
      scroll(3, 2, 40);

      expect(cue.room()?.name).toBe("The Developer");
      rest();
      expect(titled).toEqual(["", "I", ""]);
    });

    it("titles each room once on the way back through all of them", () => {
      standAt(7);
      scroll(7, 0, 40);
      rest();

      expect(titled).toEqual(["", "III", "", "II", "", "I", ""]);
    });

    it("shows nothing on the way into the hall", () => {
      standAt(1);
      scroll(1, 0, 40);
      rest();

      expect(titled).toEqual([""]);
    });

    it("shows nothing between stops of one room", () => {
      standAt(1);
      scroll(1, 2, 40);
      scroll(2, 1, 40);
      standAt(3);
      scroll(3, 5, 40);
      rest();

      expect(titled).toEqual([""]);
      expect(cue.holdsLabels()).toBeFalse();
    });

    it("stays for as long as the visitor lingers in the doorway", () => {
      standAt(2);
      scroll(2, 2.6, 40);
      rest(60_000);

      expect(cue.shown()).toBeTrue();
    });

    it("goes when the visitor turns back for the room they came from", () => {
      standAt(2);
      scroll(2, 2.6, 100);
      scroll(2.6, 2.5, 100);
      rest();

      expect(cue.shown()).toBeFalse();
    });

    it("titles the room just left when the visitor walks back into it", () => {
      standAt(2);
      scroll(2, 3, 40);
      rest();
      scroll(3, 2, 40);
      rest();

      expect(titled).toEqual(["", "II", "", "I", ""]);
    });
  });

  describe("its time on screen", () => {
    /** Milliseconds from the title's coming up to the start of its fade, stepping the clock one at a time. */
    function shownFor(): number {
      let ms = 0;
      while (cue.shown() && ms < 10_000) {
        jasmine.clock().tick(1);
        ms++;
      }
      return ms;
    }

    it("is a second and a half at full strength after its fade in, however fast the doorway is crossed", () => {
      expect(TITLE_FADE_IN_MS).toBe(300);
      expect(TITLE_HOLD_MS - TITLE_FADE_IN_MS).toBe(1500);

      for (const ms of [0, 1, 4, 16]) {
        standAt(2);
        let cameUp: number | undefined;
        for (let progress = 2 + STEP; progress < 3; progress += STEP) {
          jasmine.clock().tick(ms);
          cue.follow(progress);
          if (cue.shown()) cameUp ??= Date.now();
        }
        cue.follow(3);
        shownFor();

        expect(Date.now() - cameUp!).withContext(`${ms} ms a step`).toBe(TITLE_HOLD_MS);
      }
    });

    it("is as long as the walk when the walk is longer, and ends with it", () => {
      standAt(2);
      scroll(2, 2.98, 200);

      expect(cue.shown()).toBeTrue();
      cue.follow(3);
      expect(cue.shown()).toBeFalse();
    });

    it("keeps every label back until its fade begins, and no longer", () => {
      standAt(2);
      scroll(2, 3, 2);

      rest(TITLE_HOLD_MS - 200);
      expect(cue.holdsLabels()).toBeTrue();
      rest(200);
      expect(cue.holdsLabels()).toBeFalse();
    });

    it("keeps its lettering through its fade out, and is empty after it", () => {
      standAt(2);
      scroll(2, 3, 2);
      shownFor();

      expect(cue.shown()).toBeFalse();
      expect(cue.room()?.numeral).toBe("II");
      rest(TITLE_FADE_OUT_MS - 1);
      expect(cue.room()?.numeral).toBe("II");
      rest(1);
      expect(cue.room()).toBeNull();
    });

    it("gives way at once to the title of the next room, which then has its own full time", () => {
      standAt(5);
      scroll(5, 6, 2);
      expect(cue.room()?.numeral).toBe("III");

      rest(400);
      scroll(6, 6.5, 2);
      expect(cue.shown()).toBeTrue();
      expect(cue.room()?.numeral).toBe("IV");

      scroll(6.5, 7, 2);
      rest(TITLE_HOLD_MS - 100);
      expect(cue.shown()).toBeTrue();
      rest(100);
      expect(cue.shown()).toBeFalse();
      expect(titled).toEqual(["", "III", "IV", ""]);
    });

    it("never queues: a run through every room ends on the last one's title alone", () => {
      standAt(0);
      scroll(0, 7, 1);

      expect(cue.room()?.numeral).toBe("IV");
      rest();
      expect(titled).toEqual(["", "I", "II", "III", "IV", ""]);
    });

    it("is not shown again for the room the visitor already stands in", () => {
      standAt(2);
      scroll(2, 3, 2);
      rest(TITLE_HOLD_MS + 100);
      scroll(3, 2.9, 2);
      scroll(2.9, 3, 2);

      expect(cue.shown()).toBeFalse();
      expect(cue.room()?.numeral).toBe("II");
    });
  });

  describe("at rest", () => {
    it("shows nothing where the visitor first stands, at a stop or between two", () => {
      for (const first of [0, 3, 6, 7, 2.5, 5.6]) {
        standAt(first);
        rest();

        expect(cue.shown()).withContext(`${first}`).toBeFalse();
        expect(cue.holdsLabels()).withContext(`${first}`).toBeFalse();
      }
    });

    it("is hidden at every stop once the walk there is over, and holds no label back", () => {
      for (let stop = 1; stop < ROOMS.length; stop++) {
        standAt(stop - 1);
        scroll(stop - 1, stop, 40);
        rest();

        expect(cue.shown()).withContext(`stop ${stop}`).toBeFalse();
        expect(cue.holdsLabels()).withContext(`stop ${stop}`).toBeFalse();
      }
    });
  });

  describe("a walk the page makes itself", () => {
    it("titles only the room it ends in, near the end, however many it passes", () => {
      standAt(0);
      cue.walkTo(7);
      scroll(0, 6.4, 2);

      expect(titled).toEqual([""]);
      scroll(6.4, 7, 2);
      rest();
      expect(titled).toEqual(["", "IV", ""]);
    });

    it("holds every label back from the moment it sets off until the title has gone", () => {
      standAt(0);
      cue.walkTo(7);

      expect(cue.holdsLabels()).toBeTrue();
      scroll(0, 7, 2);
      expect(cue.holdsLabels()).toBeTrue();
      rest(TITLE_HOLD_MS);
      expect(cue.holdsLabels()).toBeFalse();
    });

    it("titles the room of a work walked to from the hall, on the last stride and not at the door passed on the way", () => {
      standAt(0);
      cue.walkTo(5);
      scroll(0, 4.4, 2);

      expect(titled).toEqual([""]);
      scroll(4.4, 5, 2);
      expect(titled).toEqual(["", "II"]);
    });

    it("shows nothing on the way back to the entrance, and holds no label", () => {
      standAt(7);
      cue.walkTo(0);

      expect(cue.holdsLabels()).toBeFalse();
      scroll(7, 0, 2);
      rest();
      expect(titled).toEqual([""]);
    });

    it("shows nothing for a walk within the room", () => {
      standAt(3);
      cue.walkTo(5);
      scroll(3, 5, 2);
      rest();

      expect(titled).toEqual([""]);
    });

    it("titles the room walked back to", () => {
      standAt(7);
      cue.walkTo(1);
      scroll(7, 1, 2);
      rest();

      expect(titled).toEqual(["", "I", ""]);
    });

    it("shows the title on arrival when the last stride was crossed between two frames", () => {
      standAt(0);
      cue.walkTo(7);
      cue.follow(3.1);
      cue.follow(7);
      note();

      expect(titled).toEqual(["", "IV"]);
      rest(TITLE_HOLD_MS - 1);
      expect(cue.holdsLabels()).toBeTrue();
      rest(1);
      expect(titled).toEqual(["", "IV", ""]);
      expect(cue.holdsLabels()).toBeFalse();
    });

    it("lets the labels go again when the walk is broken off short of where it led", () => {
      standAt(0);
      cue.walkTo(7);
      scroll(0, 4, 2);

      expect(cue.holdsLabels()).toBeTrue();
      cue.settle();
      expect(cue.holdsLabels()).toBeFalse();
      expect(titled).toEqual([""]);
    });

    it("gives a broken-off walk up by itself where the browser never says that scrolling ended", () => {
      standAt(0);
      cue.walkTo(7);
      scroll(0, 4, 2);

      rest(WALK_IDLE_MS - 1);
      expect(cue.holdsLabels()).toBeTrue();
      rest(1);
      expect(cue.holdsLabels()).toBeFalse();
    });

    it("is unmoved by a slow frame in the middle of the walk", () => {
      standAt(0);
      cue.walkTo(7);
      scroll(0, 3, 2);
      rest(900);
      scroll(3, 7, 2);
      rest();

      expect(titled).toEqual(["", "IV", ""]);
    });

    it("is the visitor's again once they scroll the other way", () => {
      standAt(3);
      cue.walkTo(7);
      scroll(3, 3.2, 2);
      scroll(3.2, 2.5, 40);

      expect(titled).toEqual(["", "I"]);
    });

    it("is not taken for the visitor's own while the page still scrolls within the label it leaves, whichever way they last walked", () => {
      standAt(3);
      scroll(3, 2, 40);
      rest();
      titled = [""];
      cue.walkTo(3);
      cue.follow(2);
      cue.follow(2);

      expect(cue.holdsLabels()).toBeTrue();
      scroll(2, 3, 2);
      expect(titled).toEqual(["", "II"]);
    });

    it("ignores a stop the route does not have, and a walk asked for before the visitor stands anywhere", () => {
      cue = new RoomTitleCue(ROOMS);
      cue.walkTo(7);
      expect(cue.holdsLabels()).toBeFalse();

      standAt(0);
      cue.walkTo(40);
      expect(cue.holdsLabels()).toBeFalse();
    });
  });
});
