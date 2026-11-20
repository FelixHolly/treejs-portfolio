import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DEVELOPER } from "../../../core/content/developer.content";
import { DeveloperComponent } from "./developer.component";

describe("DeveloperComponent", () => {
  let fixture: ComponentFixture<DeveloperComponent>;
  let element: HTMLElement;

  const texts = (selector: string) => Array.from(element.querySelectorAll(selector)).map((node) => node.textContent!.trim());

  beforeEach(() => {
    fixture = TestBed.createComponent(DeveloperComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it("no longer shows the monogram", () => {
    expect(element.querySelector(".medallion")).toBeNull();
    expect(element.textContent).not.toContain("Monogram");
    expect(texts("span, p").includes("FH")).toBeFalse();
  });

  it("opens with the greeting and the bio, under the old #about anchor", () => {
    expect(element.querySelector("section")?.id).toBe("about");
    expect(element.querySelector("h3")?.textContent?.trim()).toBe(DEVELOPER.greeting);
    expect(texts("h3 ~ p.grid-subtext")).toEqual([...DEVELOPER.bio]);
  });

  it("lists the skills as text, one group per area in the content's order", () => {
    const groups = Array.from(element.querySelectorAll("[data-skill-group]"));

    expect(groups.map((group) => group.querySelector("h4")?.textContent?.trim())).toEqual(DEVELOPER.skills.map((group) => group.area));
    expect(groups.map((group) => Array.from(group.querySelectorAll("li")).map((tool) => tool.textContent!.trim()))).toEqual(
      DEVELOPER.skills.map((group) => [...group.tools]),
    );
  });

  it("shows four groups: two by two from a tablet up, four across on a wide screen, one to a row on a phone", () => {
    const groups = element.querySelectorAll("[data-skill-group]");
    const grid = groups[0].parentElement!;

    expect(groups.length).toBe(4);
    expect(texts("[data-skill-group] h4")).toEqual(["Backend", "Frontend", "Data and operations", "Quality"]);
    expect(grid.classList.contains("sm:grid-cols-2")).toBeTrue();
    expect(grid.classList.contains("lg:grid-cols-4")).toBeTrue();
    expect(grid.classList.contains("grid-cols-2")).toBeFalse();
  });

  it("lists a group's tools one to a line on a phone, where two columns would break the longest names", () => {
    for (const list of Array.from(element.querySelectorAll("[data-skill-group] ul"))) {
      expect(list.classList.contains("grid-cols-2")).toBeFalse();
      expect(list.classList.contains("min-[480px]:grid-cols-2")).toBeTrue();
      expect(list.classList.contains("sm:grid-cols-1")).toBeTrue();
    }
  });

  it("puts the skills after the about text and gives them a heading of their own for screen readers", () => {
    const bio = element.querySelector("p.grid-subtext")!;
    const heading = Array.from(element.querySelectorAll("h3")).find((node) => node.textContent?.trim() === "Skills")!;

    expect(heading.classList.contains("sr-only")).toBeTrue();
    expect(bio.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.compareDocumentPosition(element.querySelector("[data-skill-group]")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("names every tool exactly once: the long line that repeated the stack is gone", () => {
    const mentions = (text: string, tool: string) => text.split(tool).length - 1;
    const bio = DEVELOPER.bio.join(" ");

    for (const tool of DEVELOPER.skills.flatMap((group) => [...group.tools])) {
      expect(mentions(element.textContent!, tool) - mentions(bio, tool))
        .withContext(tool)
        .toBe(1);
    }
    expect(element.textContent).not.toContain("Materials");
    expect(element.querySelector(".plinth-rule")).toBeNull();
    expect(element.querySelector(".exhibit-caption")).toBeNull();
  });

  it("hangs the portrait, and nothing else: one picture, described by the content's own words", () => {
    const pictures = element.querySelectorAll("img");

    expect(pictures.length).toBe(1);
    expect(pictures[0].alt).toBe("Portrait of Felix Hollndonner");
    expect(pictures[0].alt).toBe(DEVELOPER.portrait.alt);
    expect(pictures[0].getAttribute("src")).toContain(DEVELOPER.portrait.src);
    expect(element.querySelector("canvas, svg")).toBeNull();
  });

  it("leaves the portrait to load when it nears the screen, since Room I starts below the fold", () => {
    const picture = element.querySelector("img")!;

    expect(picture.getAttribute("loading")).toBe("lazy");
    expect(picture.getAttribute("fetchpriority")).not.toBe("high");
  });

  it("frames the portrait in gilt, upright at four to five, toned like the one on the gallery's wall", () => {
    const frame = element.querySelector("app-framed-image")!;
    const picture = frame.querySelector<HTMLElement>(".picture")!;

    expect(frame.querySelector(".frame--gilded")).not.toBeNull();
    expect(frame.querySelector(".mat")).not.toBeNull();
    expect(picture.classList.contains("picture--toned")).toBeTrue();
    expect(picture.style.aspectRatio).toBe("4 / 5");
    expect(frame.querySelector("figcaption")).toBeNull();
  });

  it("stands the portrait beside the greeting and bio from a tablet up and above them on a phone, never full width", () => {
    const frame = element.querySelector("app-framed-image")!;
    const row = frame.parentElement!;
    const text = row.querySelector(".measure")!;

    expect(row.classList.contains("flex-col")).toBeTrue();
    expect(row.classList.contains("md:flex-row")).toBeTrue();
    expect(frame.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(frame.classList.contains("w-64")).toBeTrue();
    expect(frame.classList.contains("md:w-72")).toBeTrue();
    expect(frame.classList.contains("shrink-0")).toBeTrue();
  });

  it("still caps the bio's line length beside the portrait", () => {
    const text = element.querySelector("app-framed-image")!.parentElement!.querySelector(".measure")!;

    expect(text.querySelector("h3")?.textContent?.trim()).toBe(DEVELOPER.greeting);
    expect(Array.from(text.querySelectorAll("p.grid-subtext")).map((line) => line.textContent!.trim())).toEqual([...DEVELOPER.bio]);
  });

  it("still says where the developer is based, after the skills", () => {
    const location = Array.from(element.querySelectorAll("span")).find((node) => node.textContent?.trim() === DEVELOPER.location)!;
    const groups = element.querySelectorAll("[data-skill-group]");

    expect(groups[groups.length - 1].compareDocumentPosition(location) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(element.textContent).toContain(DEVELOPER.viennaLine);
  });
});
