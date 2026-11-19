import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CaseStudySection } from "../../core/content/work.model";
import { CaseStudyComponent } from "./case-study.component";

const SECTIONS: CaseStudySection[] = [
  { heading: "How it is built", text: "One app serves both sites." },
  { heading: "In numbers", text: "About 2,500 tests." },
];

describe("CaseStudyComponent", () => {
  let fixture: ComponentFixture<CaseStudyComponent>;
  let element: HTMLElement;

  function render(sections: CaseStudySection[], headingLevel?: 3 | 4): void {
    fixture = TestBed.createComponent(CaseStudyComponent);
    fixture.componentRef.setInput("sections", sections);
    if (headingLevel) fixture.componentRef.setInput("headingLevel", headingLevel);
    fixture.detectChanges();
    element = fixture.nativeElement;
  }

  it("renders every section in order, each a real heading over its paragraph", () => {
    render(SECTIONS);

    const sections = Array.from(element.querySelectorAll("section"));

    expect(sections.map((section) => section.querySelector("h3")?.textContent)).toEqual(["How it is built", "In numbers"]);
    expect(sections.map((section) => section.querySelector("p")?.textContent)).toEqual([
      "One app serves both sites.",
      "About 2,500 tests.",
    ]);
    expect(sections.every((section) => section.firstElementChild?.tagName === "H3")).toBeTrue();
  });

  it("uses third-level headings unless told it sits under one", () => {
    render(SECTIONS);

    expect(element.querySelectorAll("h3").length).toBe(2);
    expect(element.querySelectorAll("h4").length).toBe(0);
  });

  it("steps its headings down a level on request, keeping their text", () => {
    render(SECTIONS, 4);

    expect(element.querySelectorAll("h3").length).toBe(0);
    expect(Array.from(element.querySelectorAll("h4")).map((heading) => heading.textContent)).toEqual([
      "How it is built",
      "In numbers",
    ]);
  });

  it("follows a change of sections", () => {
    render(SECTIONS);

    fixture.componentRef.setInput("sections", [SECTIONS[1]]);
    fixture.detectChanges();

    expect(Array.from(element.querySelectorAll("h3")).map((heading) => heading.textContent)).toEqual(["In numbers"]);
  });

  it("renders nothing for an empty account", () => {
    render([]);

    expect(element.children.length).toBe(0);
  });
});
