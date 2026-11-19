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

  it("no longer mentions the retired GreenWave project", () => {
    expect(element.textContent).not.toContain("GreenWave");
  });
});
