import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CorrespondenceLink } from "../../core/content/correspondence.content";
import { PostscriptComponent } from "./postscript.component";

describe("PostscriptComponent", () => {
  let fixture: ComponentFixture<PostscriptComponent>;

  const LINKS: CorrespondenceLink[] = [
    { label: "LinkedIn", href: "https://example.com/in" },
    { label: "GitHub", href: "https://example.com/git" },
    { label: "Mastodon", href: "https://example.com/toot" },
  ];

  function sentence(links: CorrespondenceLink[], cvHref: string | null = null): string {
    fixture = TestBed.createComponent(PostscriptComponent);
    fixture.componentRef.setInput("links", links);
    fixture.componentRef.setInput("cvHref", cvHref);
    fixture.detectChanges();
    const copy = fixture.nativeElement.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(".sr-only").forEach((hidden) => hidden.remove());
    return copy.textContent!.replace(/\s+/g, " ").trim();
  }

  it("reads as one sentence however many links there are", () => {
    expect(sentence(LINKS.slice(0, 1))).toBe("P.S. You can also find me on LinkedIn.");
    expect(sentence(LINKS.slice(0, 2))).toBe("P.S. You can also find me on LinkedIn or GitHub.");
    expect(sentence(LINKS)).toBe("P.S. You can also find me on LinkedIn, GitHub or Mastodon.");
  });

  it("offers the CV as a download once there is one", () => {
    expect(sentence(LINKS.slice(0, 2), "assets/cv.pdf")).toBe("P.S. You can also download my CV, or find me on LinkedIn or GitHub.");

    const cv = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>("a[download]")!;
    expect(cv.getAttribute("href")).toBe("assets/cv.pdf");
    expect(cv.target).toBe("");
  });

  it("says of every outside link that it opens in a new tab", () => {
    sentence(LINKS);

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>("a"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(LINKS.map((link) => link.href));
    for (const link of links) {
      expect(link.target).toBe("_blank");
      expect(link.rel).toBe("noopener noreferrer");
      expect(link.querySelector(".sr-only")?.textContent).toBe(" (opens in a new tab)");
    }
  });
});
