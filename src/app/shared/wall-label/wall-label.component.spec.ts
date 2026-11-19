import { ChangeDetectionStrategy, Component } from "@angular/core";
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

  it("labels a self-portrait as one, with its outcome and a link to its code alone", () => {
    render({ ...COMMISSION, kind: "self-portrait", href: undefined });

    expect(element.querySelector(".room-number")?.textContent?.trim()).toBe("Self-portrait");
    expect(element.textContent).toContain("It shipped.");
    expect(Array.from(element.querySelectorAll("a")).map((link) => link.getAttribute("href"))).toEqual(["https://example.com/code"]);
    expect(element.querySelector("a")?.textContent).toContain("View the code");
  });

  it("names the kind afresh when another work is shown in the same label", () => {
    render(BARE_STUDY);
    fixture.componentRef.setInput("work", COMMISSION);
    fixture.detectChanges();

    expect(element.querySelector(".room-number")?.textContent?.trim()).toBe("Commission");
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

  describe("on the gallery's wall, with no options set", () => {
    const WALL_LINK = "inline-flex items-center gap-2 min-h-6 text-gold hover:text-bone transition-colors";

    beforeEach(() => render(COMMISSION));

    it("keeps its one arrangement: kind, title, year and materials, the four entries, then the links", () => {
      expect(Array.from(element.children).map((child) => child.tagName)).toEqual(["P", "H3", "P", "DL", "P"]);
      expect(Array.from(element.querySelectorAll("dt")).map((term) => term.textContent)).toEqual([
        "The problem",
        "What I built",
        "My role",
        "Outcome",
      ]);
      expect(Array.from(element.querySelectorAll("dd")).map((detail) => detail.textContent)).toEqual([
        "A problem.",
        "A thing.",
        "Sole developer.",
        "It shipped.",
      ]);
    });

    it("carries none of the page's classes, so nothing on the wall changes size", () => {
      expect(element.className).toBe("block");
      expect(element.querySelector(".lead, .meta, .actions, .role, .plaque, .quiet-action")).toBeNull();
      expect(element.querySelector("h3 + p")?.className).toBe("mt-3 font-mono text-xs uppercase tracking-[0.2em] text-stone leading-relaxed");
      expect(element.querySelector("dl + p")?.className).toBe("mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm");
      for (const term of Array.from(element.querySelectorAll("dt"))) {
        expect(term.className).toBe("font-mono text-[0.7rem] uppercase tracking-[0.18em] text-stone");
      }
    });

    it("keeps both links as small text links", () => {
      const links = Array.from(element.querySelectorAll("a"));

      const expected = WALL_LINK.split(" ").sort();

      for (const link of links) expect(Array.from(link.classList).sort()).toEqual(expected);
      expect(links.length).toBe(2);
      expect(getComputedStyle(element).display).toBe("block");
    });
  });

  describe("on a page", () => {
    function renderOnPage(work: Work, options: { lead?: boolean; compact?: boolean } = {}): void {
      fixture = TestBed.createComponent(WallLabelComponent);
      fixture.componentRef.setInput("work", work);
      fixture.componentRef.setInput("placement", "page");
      fixture.componentRef.setInput("lead", options.lead ?? false);
      fixture.componentRef.setInput("compact", options.compact ?? false);
      fixture.detectChanges();
      element = fixture.nativeElement;
    }

    it("makes the live site a filled button with the code as its outlined neighbour, each named in full", () => {
      renderOnPage(COMMISSION);
      const [live, code] = Array.from(element.querySelectorAll("a"));

      expect(live.className).toBe("plaque");
      expect(code.className).toBe("quiet-action");
      expect(live.textContent?.replace(/\s+/g, " ").trim()).toBe("Visit the live site of Piece (opens in a new tab)");
      expect(code.textContent?.replace(/\s+/g, " ").trim()).toBe("View the code of Piece (opens in a new tab)");
      expect(parseFloat(getComputedStyle(code).minHeight)).toBeGreaterThanOrEqual(44);
    });

    it("sets its entry headings no smaller than 12px", () => {
      renderOnPage(COMMISSION);

      for (const term of Array.from(element.querySelectorAll("dt"))) {
        expect(parseFloat(getComputedStyle(term).fontSize)).toBeGreaterThanOrEqual(12);
      }
    });

    it("opens with what was built when asked to lead with it, and does not say it twice", () => {
      renderOnPage(COMMISSION, { lead: true });

      expect(element.querySelector("h3 + .lead")?.textContent).toBe("A thing.");
      expect(Array.from(element.querySelectorAll("dt")).map((term) => term.textContent)).toEqual(["The problem", "My role", "Outcome"]);
      expect(element.textContent?.split("A thing.").length).toBe(2);
    });

    it("lists what was built with the other entries when it does not lead", () => {
      renderOnPage(COMMISSION);

      expect(element.querySelector(".lead")).toBeNull();
      expect(element.textContent).toContain("What I built");
    });

    it("marks the role as the entry a compact label folds away", () => {
      renderOnPage(BARE_STUDY, { compact: true });

      expect(element.classList).toContain("wall-label--compact");
      expect(element.querySelector(".role dt")?.textContent).toBe("My role");
      expect(element.querySelectorAll(".role").length).toBe(1);
    });
  });
});

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WallLabelComponent],
  template: `<app-wall-label placement="page" [work]="work"><img alt="A picture" src="data:," /></app-wall-label>`,
})
class PictureHostComponent {
  readonly work = COMMISSION;
}

describe("WallLabelComponent with a picture projected into it", () => {
  it("places the picture after the title and before the rest of the label", () => {
    const fixture = TestBed.createComponent(PictureHostComponent);
    fixture.detectChanges();
    const label: HTMLElement = fixture.nativeElement.querySelector("app-wall-label");

    expect(Array.from(label.children).map((child) => child.tagName)).toEqual(["P", "H3", "IMG", "P", "DL", "P"]);
    expect(label.querySelectorAll("h3").length).toBe(1);
  });
});
