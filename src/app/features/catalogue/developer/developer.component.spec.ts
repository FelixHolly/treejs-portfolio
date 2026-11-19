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

  it("hangs the section drawing with the content's storeys, from the roof down", () => {
    const plate = element.querySelector("app-section-plate")!;

    expect(plate.querySelector("canvas")).not.toBeNull();
    expect(texts("app-section-plate dt")).toEqual(DEVELOPER.anatomy.map((storey) => storey.caption));
    expect(texts("app-section-plate li")).toEqual(DEVELOPER.anatomy.flatMap((storey) => [...storey.tools]));
    expect(plate.querySelector("figcaption")?.textContent?.trim()).toBe("Plate I · Section through a web application");
  });

  it("keeps the greeting and the bio after the plate, under the old #about anchor", () => {
    const plate = element.querySelector("app-section-plate")!;
    const greeting = element.querySelector("h3")!;

    expect(element.querySelector("section")?.id).toBe("about");
    expect(greeting.textContent?.trim()).toBe(DEVELOPER.greeting);
    expect(plate.compareDocumentPosition(greeting) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const paragraph of DEVELOPER.bio) expect(element.textContent).toContain(paragraph);
  });

  it("still names every material on the frieze and where the developer is based", () => {
    for (const material of DEVELOPER.frieze) expect(texts(".whitespace-nowrap")).toContain(material);
    expect(element.textContent).toContain(DEVELOPER.location);
  });
});
