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

  describe("what a work is, before what it looks like", () => {
    const articles = () => Array.from(element.querySelectorAll<HTMLElement>("article"));
    const before = (first: Element, second: Element) => !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

    it("names every work's kind and title before its first picture, once, in one label", () => {
      for (const article of articles()) {
        const title = article.querySelector("h3")!;
        const picture = article.querySelector("img")!;

        expect(before(article.querySelector(".room-number")!, title)).withContext(article.id).toBeTrue();
        expect(before(title, picture)).withContext(article.id).toBeTrue();
        expect(article.querySelectorAll("h3").length).withContext(article.id).toBe(1);
        expect(article.querySelectorAll("app-wall-label").length).withContext(article.id).toBe(1);
        expect(article.querySelector("app-wall-label")!.contains(picture)).withContext(article.id).toBeTrue();
      }
    });

    it("puts the rest of each label after its pictures", () => {
      for (const article of articles()) {
        const pictures = Array.from(article.querySelectorAll("app-wall-label img"));

        expect(before(pictures[pictures.length - 1], article.querySelector("dl")!)).withContext(article.id).toBeTrue();
      }
    });

    it("sums the commission up in one line under its title, in the words of its label, said once", () => {
      const commission = element.querySelector<HTMLElement>("#works-kuechenschelle")!;
      const lead = commission.querySelector("h3 + .lead")!;

      expect(lead.textContent).toContain("A server-rendered recipe site with search and filters");
      expect(before(lead, commission.querySelector("img")!)).toBeTrue();
      expect(commission.textContent).not.toContain("What I built");
      expect(commission.textContent!.split("A server-rendered recipe site").length).toBe(2);
    });

    it("keeps the commission's problem, role and outcome in its label", () => {
      const terms = Array.from(element.querySelectorAll("#works-kuechenschelle dt")).map((term) => term.textContent);

      expect(terms).toEqual(["The problem", "My role", "Outcome"]);
    });
  });

  describe("the commission's pictures", () => {
    const pictures = () => element.querySelector<HTMLElement>("#works-kuechenschelle .pictures")!;
    const row = () => pictures().querySelector<HTMLElement>(".picture-row")!;

    it("leads with the phone view, which stays readable at a phone's width", () => {
      const lead = pictures().querySelector<HTMLImageElement>(".lead-picture img")!;

      expect(lead.alt).toBe("The Küchenschelle home page on a phone");
      expect(pictures().firstElementChild?.classList).toContain("lead-picture");
      expect(pictures().querySelector(".lead-picture .picture--portrait")).not.toBeNull();
    });

    it("lines the other views up in one row, each still a picture with its description and caption", () => {
      const images = Array.from(row().querySelectorAll("img"));

      expect(images.map((image) => image.alt)).toEqual([
        "Küchenschelle home page with the headline Kochen, wie's daheim schmeckt and a portrait of the host",
        "A Küchenschelle recipe page with ingredients, steps and the embedded video",
        "The Küchenschelle recipe index with search, filters and 1082 recipes found",
      ]);
      expect(Array.from(row().querySelectorAll("figcaption")).map((caption) => caption.textContent?.trim())).toEqual([
        "Fig. I · Home",
        "Fig. II · Recipe",
        "Fig. III · Index",
      ]);
    });

    it("shows every picture of the commission exactly once", () => {
      const sources = Array.from(pictures().querySelectorAll("img")).map((image) => image.getAttribute("src"));

      expect(sources.length).toBe(4);
      expect(new Set(sources).size).toBe(4);
    });

    it("makes the row a named group the keyboard can reach and scroll", () => {
      expect(row().tabIndex).toBe(0);
      expect(row().getAttribute("role")).toBe("group");
      expect(row().getAttribute("aria-label")).toBe("More pictures of Küchenschelle");
      expect(row().querySelector("a, button")).toBeNull();
    });

    it("moves the row sideways by scrolling alone, with nothing advancing it", () => {
      const style = getComputedStyle(row());

      if (style.display !== "contents") {
        expect(style.overflowX).toBe("auto");
        expect(style.scrollSnapType).toContain("x");
      }
      expect(element.querySelector("[aria-roledescription='carousel'], [aria-live]")).toBeNull();
    });
  });

  describe("the links out", () => {
    const name = (link: Element) => link.textContent!.replace(/\s+/g, " ").trim();

    it("offers the commission's live site as its one filled button", () => {
      const links = Array.from(element.querySelectorAll("#works-kuechenschelle app-wall-label a"));

      expect(links.map(name)).toEqual(["Visit the live site of Küchenschelle (opens in a new tab)"]);
      expect(links[0].className).toBe("plaque");
      expect(links[0].querySelector("svg")).not.toBeNull();
    });

    it("offers the self-portrait's code as a quieter outlined button", () => {
      const links = Array.from(element.querySelectorAll("#works-this-gallery a"));

      expect(links.map(name)).toEqual(["View the code of This Gallery (opens in a new tab)"]);
      expect(links[0].className).toBe("quiet-action");
    });

    it("gives the unfinished studies no link", () => {
      expect(element.querySelector("#works-wheelwallet a, #works-reloo a")).toBeNull();
    });
  });

  describe("the unfinished studies", () => {
    it("get the compact label with their frame beside it, and the finished works do not", () => {
      for (const id of ["works-wheelwallet", "works-reloo"]) {
        const label = element.querySelector(`#${id} app-wall-label`)!;

        expect(label.classList).withContext(id).toContain("wall-label--compact");
        expect(label.classList).withContext(id).toContain("label--beside");
        expect(label.querySelector(".role dt")?.textContent).withContext(id).toBe("My role");
      }
      for (const id of ["works-kuechenschelle", "works-this-gallery"]) {
        const label = element.querySelector(`#${id} app-wall-label`)!;

        expect(label.classList).withContext(id).not.toContain("wall-label--compact");
        expect(label.classList).withContext(id).not.toContain("label--beside");
        expect(label.querySelector(".role")).withContext(id).toBeNull();
      }
    });

    it("still say what the problem is and what is built", () => {
      for (const id of ["works-wheelwallet", "works-reloo"]) {
        const terms = Array.from(element.querySelectorAll(`#${id} dt`)).map((term) => term.textContent);

        expect(terms).withContext(id).toEqual(["The problem", "What I built", "My role"]);
        expect(element.querySelector(`#${id}`)!.textContent).withContext(id).toContain("In progress, not yet released.");
      }
    });
  });

  it("hangs the commission in gilded frames and every other work in one plain frame", () => {
    expect(element.querySelectorAll("#works-kuechenschelle .frame--gilded").length).toBe(4);
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
      expect(details.querySelector("summary")?.textContent?.trim()).toBe("Read the case study");
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
