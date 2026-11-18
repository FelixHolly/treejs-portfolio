import { catalogueAnchor, placeFromHash, roomOf, ROOMS, workPlace } from "./places";

const SLUGS = ["kuechenschelle", "reloo"];

describe("places", () => {
  it("lists the five rooms in walking order", () => {
    expect(ROOMS.map((room) => room.id)).toEqual(["entrance", "developer", "works", "visitors-book", "correspondence"]);
    expect(ROOMS.map((room) => room.numeral)).toEqual(["", "I", "II", "III", "IV"]);
  });

  describe("placeFromHash", () => {
    const cases: [string, string | null][] = [
      ["#developer", "developer"],
      ["developer", "developer"],
      ["#about", "developer"],
      ["#home", "entrance"],
      ["#projects", "works"],
      ["#works", "works"],
      ["#contact", "correspondence"],
      ["#visitors-book", "visitors-book"],
      ["#works/kuechenschelle", "works/kuechenschelle"],
      ["#works-reloo", "works/reloo"],
      ["#works%2Freloo", "works/reloo"],
      ["#works/greenwave", null],
      ["#works/", null],
      ["#main", null],
      ["", null],
      ["#", null],
      ["#%E0%A4%A", null],
      ["#DEVELOPER", null],
    ];

    for (const [hash, place] of cases) {
      it(`reads "${hash}" as ${place}`, () => {
        expect(placeFromHash(hash, SLUGS)).toBe(place);
      });
    }
  });

  it("maps every place to the catalogue section that shows it", () => {
    expect(catalogueAnchor("entrance")).toBe("home");
    expect(catalogueAnchor("developer")).toBe("about");
    expect(catalogueAnchor("works")).toBe("projects");
    expect(catalogueAnchor("correspondence")).toBe("contact");
    expect(catalogueAnchor(workPlace("reloo"))).toBe("works-reloo");
    expect(catalogueAnchor("nowhere")).toBe("home");
  });

  it("puts every work in Room II and unknown places at the entrance", () => {
    expect(roomOf("works/kuechenschelle").numeral).toBe("II");
    expect(roomOf("visitors-book").numeral).toBe("III");
    expect(roomOf("nowhere").id).toBe("entrance");
  });

  it("round-trips a work place through both hash styles", () => {
    const place = workPlace("kuechenschelle");

    expect(placeFromHash("#" + place, SLUGS)).toBe(place);
    expect(placeFromHash("#" + catalogueAnchor(place), SLUGS)).toBe(place);
  });
});
