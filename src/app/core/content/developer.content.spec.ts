import { DEVELOPER } from "./developer.content";

describe("DEVELOPER", () => {
  it("groups the skills into three areas, the visitor's side of the stack first", () => {
    expect(DEVELOPER.skills.map((group) => group.area)).toEqual(["Frontend", "Backend", "Data and operations"]);
  });

  it("lists the tools of each area in the order they are lettered", () => {
    expect(DEVELOPER.skills.map((group) => [...group.tools])).toEqual([
      ["Angular", "TypeScript", "NgRx", "Tailwind"],
      ["Java", "Spring Boot"],
      ["PostgreSQL", "Docker"],
    ]);
  });

  it("leaves no area empty and names no tool twice", () => {
    const tools = DEVELOPER.skills.flatMap((group) => [...group.tools]);

    expect(DEVELOPER.skills.every((group) => group.tools.length > 0)).toBeTrue();
    expect(new Set(tools).size).toBe(tools.length);
  });

  it("still letters the frieze, every word of it a tool from one of the areas", () => {
    const tools: string[] = DEVELOPER.skills.flatMap((group) => [...group.tools]);

    expect(DEVELOPER.frieze.length).toBeGreaterThan(0);
    for (const material of DEVELOPER.frieze) expect(tools).toContain(material);
  });

  it("keeps the about text: a greeting, two paragraphs, and where the developer is based", () => {
    expect(DEVELOPER.greeting).toBe("Hi, I'm Felix");
    expect(DEVELOPER.bio.length).toBe(2);
    expect(DEVELOPER.location.length).toBeGreaterThan(0);
    expect(DEVELOPER.viennaLine.length).toBeGreaterThan(0);
  });
});
