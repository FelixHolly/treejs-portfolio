import { DEVELOPER } from "./developer.content";

describe("DEVELOPER", () => {
  it("groups the skills into four areas, the visitor's side of the stack first", () => {
    expect(DEVELOPER.skills.map((group) => group.area)).toEqual(["Frontend", "Backend", "Data and operations", "Quality"]);
  });

  it("lists the tools of each area in the order they are lettered", () => {
    expect(DEVELOPER.skills.map((group) => [...group.tools])).toEqual([
      ["Angular", "TypeScript", "RxJS", "NgRx Signals", "SCSS and Tailwind", "Three.js"],
      ["Java", "Spring Boot", "Spring Security", "JPA and Hibernate", "REST APIs", "Python"],
      ["PostgreSQL", "Flyway", "Docker", "GitHub Actions", "Linux servers", "S3"],
      ["Vitest and Jest", "Playwright and Cypress", "JUnit", "Accessibility testing", "Nx monorepos"],
    ]);
  });

  it("leaves no area empty and names no tool twice", () => {
    const tools = DEVELOPER.skills.flatMap((group) => [...group.tools]);

    expect(DEVELOPER.skills.every((group) => group.tools.length > 0)).toBeTrue();
    expect(new Set(tools).size).toBe(tools.length);
  });

  it("fills the areas evenly: five or six tools each, none so long it would be squeezed on its plaque", () => {
    for (const group of DEVELOPER.skills) {
      expect(group.tools.length).withContext(group.area).toBeGreaterThanOrEqual(5);
      expect(group.tools.length).withContext(group.area).toBeLessThanOrEqual(6);
      for (const tool of group.tools) expect(tool.length).withContext(tool).toBeLessThanOrEqual(22);
    }
  });

  it("uses no dash or ampersand to join two tools on one line", () => {
    for (const tool of DEVELOPER.skills.flatMap((group) => [...group.tools])) expect(tool).not.toMatch(/[\u2013\u2014&/]/);
  });

  it("still letters the frieze, every word of it named on one of the plaques", () => {
    const tools: string[] = DEVELOPER.skills.flatMap((group) => [...group.tools]);

    expect(DEVELOPER.frieze.length).toBeGreaterThan(0);
    for (const material of DEVELOPER.frieze) {
      expect(tools.some((tool) => tool.split(" ").includes(material) || tool === material))
        .withContext(material)
        .toBeTrue();
    }
  });

  it("keeps the about text: a greeting, two paragraphs, and where the developer is based", () => {
    expect(DEVELOPER.greeting).toBe("Hi, I'm Felix");
    expect(DEVELOPER.bio.length).toBe(2);
    expect(DEVELOPER.location.length).toBeGreaterThan(0);
    expect(DEVELOPER.viennaLine.length).toBeGreaterThan(0);
  });
});
