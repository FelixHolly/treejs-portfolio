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

    expect(ids).toEqual(["works-kuechenschelle", "works-wheelwallet", "works-reloo"]);
    expect(element.querySelector("#projects")).not.toBeNull();
    expect(element.querySelector("#works")).not.toBeNull();
  });

  it("hangs the commission as a gilded triptych and the studies in plain frames", () => {
    expect(element.querySelectorAll("#works-kuechenschelle .frame--gilded").length).toBe(3);
    expect(element.querySelectorAll("#works-wheelwallet .frame--plain").length).toBe(1);
    expect(element.querySelectorAll("#works-reloo .frame--gilded").length).toBe(0);
  });

  it("links out only from the commission", () => {
    const hrefs = Array.from(element.querySelectorAll("a")).map((link) => link.getAttribute("href"));

    expect(hrefs).toEqual(["https://kuechenschelle.at"]);
  });

  it("no longer mentions the retired GreenWave project", () => {
    expect(element.textContent).not.toContain("GreenWave");
  });
});
