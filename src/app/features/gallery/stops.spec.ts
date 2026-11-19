import { WORKS } from "../../core/content/works.content";
import { buildStops } from "./stops";

describe("buildStops", () => {
  it("walks entrance, developer, works, each work, visitors' book, correspondence", () => {
    expect(buildStops(WORKS).map((stop) => stop.place)).toEqual([
      "entrance",
      "developer",
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

  it("still has its five rooms when nothing hangs", () => {
    const stops = buildStops([]);

    expect(stops.map((stop) => stop.kind)).toEqual(["entrance", "developer", "works", "visitors-book", "correspondence"]);
    expect(stops.every((stop) => stop.work === undefined)).toBeTrue();
  });
});
