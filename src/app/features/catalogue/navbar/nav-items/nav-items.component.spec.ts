import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { PlaceService } from "../../../../core/place/place.service";
import { NavItemsComponent } from "./nav-items.component";

describe("NavItemsComponent", () => {
  let fixture: ComponentFixture<NavItemsComponent>;
  let element: HTMLElement;
  let place: PlaceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    place = TestBed.inject(PlaceService);
    fixture = TestBed.createComponent(NavItemsComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it("lists the five rooms in walking order, keeping the old anchors alive", () => {
    const links = Array.from(element.querySelectorAll("a"));

    expect(links.map((link) => link.textContent!.trim())).toEqual([
      "Entrance",
      "The Developer",
      "The Works",
      "Visitors' Book",
      "Correspondence",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/#home",
      "/#about",
      "/#projects",
      "/#visitors-book",
      "/#contact",
    ]);
  });

  it("starts at the entrance, which carries no room numeral", () => {
    expect(element.querySelector("[aria-current]")?.textContent?.trim()).toBe("Entrance");
    expect(element.querySelector(".nav-room")).toBeNull();
  });

  for (const [current, href, numeral] of [
    ["developer", "/#about", "I"],
    ["works", "/#projects", "II"],
    ["works/kuechenschelle", "/#projects", "II"],
    ["visitors-book", "/#visitors-book", "III"],
    ["correspondence", "/#contact", "IV"],
  ]) {
    it(`marks the room of "${current}" as current with numeral ${numeral}`, () => {
      place.current.set(current);
      fixture.detectChanges();

      const marked = element.querySelectorAll("[aria-current='location']");
      expect(marked.length).toBe(1);
      expect(marked[0].getAttribute("href")).toBe(href);
      expect(element.querySelector(".nav-room")?.textContent?.trim()).toBe(numeral);
    });
  }

  it("tells the navbar when a link is followed so the mobile menu can close", () => {
    let clicks = 0;
    fixture.componentInstance.linkClick.subscribe(() => clicks++);
    const link = element.querySelector("a")!;
    link.addEventListener("click", (event) => event.preventDefault());

    link.click();

    expect(clicks).toBe(1);
  });
});
