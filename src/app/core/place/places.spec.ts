import { catalogueAnchor, placeFromHash, roomOf, ROOMS, SKILLS, titleFor, workPlace } from "./places";

const SLUGS = ["kuechenschelle", "reloo"];
const TITLES = { kuechenschelle: "Küchenschelle", reloo: "ReLoo" };
const SITE_TITLE = "Felix Hollndonner, Full-Stack Developer";

describe("places", () => {
  it("lists the five rooms in walking order", () => {
    expect(ROOMS.map((room) => room.id)).toEqual(["entrance", "developer", "works", "visitors-book", "correspondence"]);
    expect(ROOMS.map((room) => room.numeral)).toEqual(["", "I", "II", "III", "IV"]);
  });

  it("gives every room an everyday word for the catalogue's navigation, beside its museum name", () => {
    expect(ROOMS.map((room) => room.plain)).toEqual(["Home", "About", "Work", "References", "Contact"]);
    expect(ROOMS.map((room) => room.name)).toEqual(["Entrance", "The Developer", "The Works", "Visitors' Book", "Correspondence"]);
  });

  describe("placeFromHash", () => {
    const cases: [string, string | null][] = [
      ["#developer", "developer"],
      ["#developer/skills", "developer/skills"],
      ["developer/skills", "developer/skills"],
      ["#developer%2Fskills", "developer/skills"],
      ["#developer/", null],
      ["#developer/portrait", null],
      ["#works/skills", null],
      ["#skills", null],
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
    expect(catalogueAnchor("developer/skills")).toBe("about");
    expect(catalogueAnchor("works")).toBe("projects");
    expect(catalogueAnchor("correspondence")).toBe("contact");
    expect(catalogueAnchor(workPlace("reloo"))).toBe("works-reloo");
    expect(catalogueAnchor("nowhere")).toBe("home");
  });

  it("puts every work in Room II and unknown places at the entrance", () => {
    expect(roomOf("works/kuechenschelle").numeral).toBe("II");
    expect(roomOf("developer/skills").id).toBe("developer");
    expect(roomOf("developer/portrait").id).toBe("entrance");
    expect(roomOf("visitors-book").numeral).toBe("III");
    expect(roomOf("nowhere").id).toBe("entrance");
  });

  it("keeps the skills as a place inside Room I and not a room of their own", () => {
    expect(SKILLS).toEqual({ id: "developer/skills", room: "developer", name: "Skills" });
    expect(ROOMS.some((room) => (room.id as string) === SKILLS.id)).toBeFalse();
    expect(placeFromHash("#" + SKILLS.id, SLUGS)).toBe(SKILLS.id);
    expect(placeFromHash("#" + catalogueAnchor(SKILLS.id), SLUGS)).toBe("developer");
  });

  it("round-trips a work place through both hash styles", () => {
    const place = workPlace("kuechenschelle");

    expect(placeFromHash("#" + place, SLUGS)).toBe(place);
    expect(placeFromHash("#" + catalogueAnchor(place), SLUGS)).toBe(place);
  });

  describe("titleFor", () => {
    it("keeps the site's own title at the entrance, as index.html has it", () => {
      expect(titleFor("entrance", TITLES)).toBe(SITE_TITLE);
    });

    const rooms: [string, string][] = [
      ["developer", "The Developer - Felix Hollndonner"],
      ["developer/skills", "Skills - Felix Hollndonner"],
      ["works", "The Works - Felix Hollndonner"],
      ["visitors-book", "Visitors' Book - Felix Hollndonner"],
      ["correspondence", "Correspondence - Felix Hollndonner"],
    ];

    for (const [place, title] of rooms) {
      it(`names the tab "${title}" in the room "${place}"`, () => {
        expect(titleFor(place, TITLES)).toBe(title);
      });
    }

    it("names the tab after the work at a work's place, in either hash style", () => {
      expect(titleFor(workPlace("kuechenschelle"), TITLES)).toBe("Küchenschelle - Felix Hollndonner");
      expect(titleFor("works-reloo", TITLES)).toBe("ReLoo - Felix Hollndonner");
    });

    for (const place of ["nowhere", "", "home", "DEVELOPER", "works/greenwave", "works/", "works/constructor", "developer/", "developer/portrait", "skills"]) {
      it(`falls back to the site's own title at the unknown place "${place}"`, () => {
        expect(titleFor(place, TITLES)).toBe(SITE_TITLE);
      });
    }

    it("needs no work titles to name a room", () => {
      expect(titleFor("works", {})).toBe("The Works - Felix Hollndonner");
      expect(titleFor(workPlace("reloo"), {})).toBe(SITE_TITLE);
    });
  });
});
