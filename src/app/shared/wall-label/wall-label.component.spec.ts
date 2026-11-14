import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Work } from "../../core/content/work.model";
import { WallLabelComponent } from "./wall-label.component";

const IMAGE = { src: "assets/works/reloo.webp", alt: "A screen", caption: "Fig.", orientation: "portrait" } as const;

const COMMISSION: Work = {
  slug: "piece",
  title: "Piece",
  kind: "commission",
  year: "2026",
  materials: ["Angular", "Java"],
  role: "Sole developer.",
  problem: "A problem.",
  built: "A thing.",
  outcome: "It shipped.",
  href: "https://example.com",
  repo: "https://example.com/code",
  images: [IMAGE],
};

const BARE_STUDY: Work = {
  slug: "sketch",
  title: "Sketch",
  kind: "study",
  year: "2025",
  materials: [],
  role: "Alone.",
  problem: "A question.",
  built: "A draft.",
  images: [IMAGE],
};

describe("WallLabelComponent", () => {
  let fixture: ComponentFixture<WallLabelComponent>;
  let element: HTMLElement;

  function render(work: Work): void {
    fixture = TestBed.createComponent(WallLabelComponent);
    fixture.componentRef.setInput("work", work);
    fixture.detectChanges();
    element = fixture.nativeElement;
  }

  it("labels a commission with its outcome and both links opening safely in a new tab", () => {
    render(COMMISSION);

    expect(element.querySelector(".room-number")?.textContent).toContain("Commission");
    expect(element.textContent).toContain("It shipped.");

    const links = Array.from(element.querySelectorAll("a"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["https://example.com", "https://example.com/code"]);
    for (const link of links) {
      expect(link.target).toBe("_blank");
      expect(link.rel).toContain("noopener");
    }
  });

  it("renders a study without links, outcome or empty nodes", () => {
    render(BARE_STUDY);

    expect(element.querySelector(".room-number")?.textContent).toContain("Study");
    expect(element.querySelectorAll("a").length).toBe(0);
    expect(element.textContent).not.toContain("Outcome");
    const empty = Array.from(element.querySelectorAll("p, dd, dt")).filter((node) => !node.textContent?.trim());
    expect(empty.length).toBe(0);
  });

  it("shows the year alone when a work lists no materials", () => {
    render(BARE_STUDY);

    const line = element.querySelector("h3 + p")?.textContent?.replace(/\s+/g, " ").trim();
    expect(line).toBe("2025");
  });

  it("separates the year and each material", () => {
    render(COMMISSION);

    const line = element.querySelector("h3 + p")?.textContent?.replace(/\s+/g, " ").trim();
    expect(line).toBe("2026 · Angular · Java");
  });

  it("shows only the live link when there is no repository", () => {
    render({ ...COMMISSION, repo: undefined });

    expect(element.querySelectorAll("a").length).toBe(1);
    expect(element.querySelector("a")?.textContent).toContain("Visit the live site");
  });
});
