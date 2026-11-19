import { WORKS } from "../../core/content/works.content";
import { buildStops } from "./stops";

describe("buildStops", () => {
  it("walks entrance, the portrait, the skills, works, each work, visitors' book, correspondence", () => {
    expect(buildStops(WORKS).map((stop) => stop.place)).toEqual([
      "entrance",
      "developer",
      "developer/skills",
      "works",
      "works/kuechenschelle",
      "works/wheelwallet",
      "works/reloo",
      "works/this-gallery",
      "visitors-book",
      "correspondence",
    ]);
  });

  it("keeps every work stop in Room II and hands it its work", () => {
    const works = buildStops(WORKS).filter((stop) => stop.kind === "work");

    expect(works.map((stop) => stop.room.numeral)).toEqual(["II", "II", "II", "II"]);
    expect(works.map((stop) => stop.work?.slug)).toEqual(["kuechenschelle", "wheelwallet", "reloo", "this-gallery"]);
  });

  it("makes Room I two stops, and names only the second, which is not the room itself", () => {
    const stops = buildStops(WORKS);

    expect(stops.slice(1, 3).map((stop) => stop.room.numeral)).toEqual(["I", "I"]);
    expect(stops[1].room).toBe(stops[2].room);
    expect(stops[1].place).toBe(stops[1].room.id);
    expect(stops.map((stop) => stop.title)).toEqual([undefined, undefined, "Skills", ...stops.slice(3).map(() => undefined)]);
  });

  it("gives every stop a place of its own", () => {
    const places = buildStops(WORKS).map((stop) => stop.place);

    expect(new Set(places).size).toBe(places.length);
  });

  it("still has its six stops when nothing hangs", () => {
    const stops = buildStops([]);

    expect(stops.map((stop) => stop.kind)).toEqual(["entrance", "developer", "skills", "works", "visitors-book", "correspondence"]);
    expect(stops.every((stop) => stop.work === undefined)).toBeTrue();
  });
});
