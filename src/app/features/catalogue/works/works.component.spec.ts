import { ComponentFixture, TestBed } from "@angular/core/testing";
import { WorksComponent } from "./works.component";

describe("WorksComponent", () => {
  let fixture: ComponentFixture<WorksComponent>;
  let element: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(WorksComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it("shows every work at once, each reachable by its own anchor", () => {
    const ids = Array.from(element.querySelectorAll("article")).map((article) => article.id);

    expect(ids).toEqual(["works-kuechenschelle", "works-wheelwallet", "works-reloo", "works-this-gallery"]);
    expect(element.querySelector("#projects")).not.toBeNull();
    expect(element.querySelector("#works")).not.toBeNull();
  });

  it("hangs the commission as a gilded triptych and every other work in one plain frame", () => {
    expect(element.querySelectorAll("#works-kuechenschelle .frame--gilded").length).toBe(3);
    for (const id of ["works-wheelwallet", "works-reloo", "works-this-gallery"]) {
      expect(element.querySelectorAll(`#${id} .frame--plain`).length).withContext(id).toBe(1);
      expect(element.querySelectorAll(`#${id} .frame--gilded`).length).withContext(id).toBe(0);
    }
  });

  it("hangs the self-portrait with the studies, labelled as what it is", () => {
    const grid = element.querySelector(".plain-frames")!;
    const labels = Array.from(grid.querySelectorAll("article")).map(
      (article) => `${article.id}: ${article.querySelector(".room-number")?.textContent?.trim()}`,
    );

    expect(labels).toEqual(["works-wheelwallet: Study", "works-reloo: Study", "works-this-gallery: Self-portrait"]);
    expect(element.querySelector("#works-kuechenschelle .room-number")?.textContent?.trim()).toBe("Commission");
  });

  it("shows the self-portrait's one wide picture of the entrance, described for those who cannot see it", () => {
    const pictures = element.querySelectorAll<HTMLImageElement>("#works-this-gallery img");

    expect(pictures.length).toBe(1);
    expect(pictures[0].getAttribute("src")).toContain("assets/works/this-gallery-entrance.webp");
    expect(pictures[0].alt).toContain("entrance of this gallery");
    expect(element.querySelector("#works-this-gallery .picture--portrait")).toBeNull();
    expect(element.querySelector("#works-this-gallery figcaption")?.textContent?.trim()).toBe("Self-portrait · Entrance");
  });

  it("gives a wide picture a wider frame than an upright one", () => {
    expect(element.querySelector("#works-this-gallery app-framed-image")?.classList).toContain("plain-frame--wide");
    expect(element.querySelector("#works-reloo app-framed-image")?.classList).not.toContain("plain-frame--wide");
  });

  it("links to the commission's live site and the self-portrait's code, and nowhere else", () => {
    const links = Array.from(element.querySelectorAll("a")).map((link) => `${link.closest("article")?.id} ${link.getAttribute("href")}`);

    expect(links).toEqual([
      "works-kuechenschelle https://kuechenschelle.at",
      "works-this-gallery https://github.com/FelixHolly/treejs-portfolio",
    ]);
  });

  describe("how the commission was built", () => {
    let details: HTMLDetailsElement;

    beforeEach(() => {
      details = element.querySelector<HTMLDetailsElement>("#works-kuechenschelle details")!;
    });

    it("sits under the commission's label, closed until asked for, behind a native summary", () => {
      const label = element.querySelector("#works-kuechenschelle app-wall-label")!;

      expect(details.open).toBeFalse();
      expect(details.firstElementChild?.tagName).toBe("SUMMARY");
      expect(details.querySelector("summary")?.textContent?.trim()).toBe("How it was built");
      expect(label.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(label.contains(details)).toBeFalse();
    });

    it("draws its disclosure mark as an icon hidden from assistive technology", () => {
      expect(details.querySelector("summary svg[aria-hidden='true']")).not.toBeNull();
    });

    it("opens from the summary without any script of its own", () => {
      details.querySelector("summary")!.click();

      expect(details.open).toBeTrue();
    });

    it("holds the four parts of the account under headings one level below the work's title", () => {
      expect(element.querySelector("#works-kuechenschelle app-wall-label h3")?.textContent).toBe("Küchenschelle");
      expect(Array.from(details.querySelectorAll("h4")).map((heading) => heading.textContent)).toEqual([
        "How it is built",
        "From video to recipe",
        "Two decisions",
        "In numbers",
      ]);
      expect(details.querySelectorAll("h3").length).toBe(0);
      expect(details.textContent).toContain("about nine euros a month");
    });

    it("offers the film above the account, with controls and a poster, never playing or loading by itself", () => {
      const video = details.querySelector("video")!;
      const account = details.querySelector("app-case-study")!;

      expect(video.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(video.controls).toBeTrue();
      expect(video.muted).toBeTrue();
      expect(video.autoplay).toBeFalse();
      expect(video.paused).toBeTrue();
      expect(video.preload).toBe("none");
      expect(video.hasAttribute("playsinline")).toBeTrue();
      expect(video.getAttribute("src")).toBe("assets/works/kuechenschelle-film.webm");
      expect(video.getAttribute("poster")).toBe("assets/works/kuechenschelle-home.webp");
      expect(video.getAttribute("aria-label")).toContain("kuechenschelle.at");
    });

    it("does not make the wall label any longer", () => {
      const label = element.querySelector("#works-kuechenschelle app-wall-label")!;

      expect(label.textContent).not.toContain("How it is built");
      expect(label.querySelector("video")).toBeNull();
    });

    it("adds nothing to works that have no account or film", () => {
      expect(element.querySelectorAll("details").length).toBe(1);
      expect(element.querySelectorAll("video").length).toBe(1);
      expect(element.querySelector(".plain-frames app-case-study")).toBeNull();
    });
  });

  it("no longer mentions the retired GreenWave project", () => {
    expect(element.textContent).not.toContain("GreenWave");
  });
});
