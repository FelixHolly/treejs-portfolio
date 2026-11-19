import { provideLocationMocks } from "@angular/common/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { PlaceService } from "../../../../core/place/place.service";
import { SectionLinkDirective } from "../section-link.directive";
import { NavItemsComponent } from "./nav-items.component";

describe("NavItemsComponent", () => {
  let fixture: ComponentFixture<NavItemsComponent>;
  let element: HTMLElement;
  let place: PlaceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideLocationMocks()] });
    place = TestBed.inject(PlaceService);
    fixture = TestBed.createComponent(NavItemsComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  const links = () => Array.from(element.querySelectorAll("a"));
  /** A link's own words, without the note the current row carries. */
  const label = (link: HTMLAnchorElement) => link.childNodes[0].textContent?.trim();
  const current = () => Array.from(element.querySelectorAll<HTMLAnchorElement>("[aria-current='location']"));

  describe("in the header", () => {
    it("names the four rooms in plain words, in walking order, on the anchors old links use", () => {
      expect(links().map(label)).toEqual(["About", "Work", "References", "Contact"]);
      expect(links().map((link) => link.getAttribute("href"))).toEqual([
        "/#about",
        "/#projects",
        "/#visitors-book",
        "/#contact",
      ]);
    });

    it("leaves the way home to the wordmark beside it", () => {
      expect(element.querySelector('a[href="/#home"]')).toBeNull();
    });

    it("marks nothing while the visitor is at the entrance", () => {
      expect(current()).toEqual([]);
    });

    for (const [where, href] of [
      ["developer", "/#about"],
      ["works", "/#projects"],
      ["works/kuechenschelle", "/#projects"],
      ["visitors-book", "/#visitors-book"],
      ["correspondence", "/#contact"],
    ]) {
      it(`marks the room of "${where}" as current, and only that one`, () => {
        place.current.set(where);
        fixture.detectChanges();

        expect(current().map((link) => link.getAttribute("href"))).toEqual([href]);
        expect(current()[0].classList.contains("nav-active")).toBeTrue();
      });
    }

    it("spells nothing beside the current link: the rule under it is the mark", () => {
      place.current.set("works");
      fixture.detectChanges();

      expect(element.querySelector(".nav-here")).toBeNull();
      expect(element.querySelector("ul")?.classList.contains("nav-ul--sheet")).toBeFalse();
    });
  });

  describe("in the phone menu", () => {
    beforeEach(() => {
      fixture.componentRef.setInput("sheet", true);
      fixture.detectChanges();
    });

    it("lists the way home first, then the four rooms", () => {
      expect(links().map(label)).toEqual(["Home", "About", "Work", "References", "Contact"]);
      expect(links()[0].getAttribute("href")).toBe("/#home");
    });

    it("lays the links out as rows at least 48px tall", () => {
      expect(element.querySelector("ul")?.classList.contains("nav-ul--sheet")).toBeTrue();
      for (const link of links()) {
        expect(link.getBoundingClientRect().height).withContext(label(link)!).toBeGreaterThanOrEqual(48);
      }
    });

    it("marks Home as current at the entrance", () => {
      expect(current().map(label)).toEqual(["Home"]);
    });

    for (const [where, name] of [
      ["developer", "About"],
      ["works/reloo", "Work"],
      ["visitors-book", "References"],
      ["correspondence", "Contact"],
    ]) {
      it(`says "You are here" beside ${name} at "${where}", for eyes only`, () => {
        place.current.set(where);
        fixture.detectChanges();

        const notes = Array.from(element.querySelectorAll(".nav-here"));
        expect(current().map(label)).toEqual([name]);
        expect(notes.length).toBe(1);
        expect(notes[0].textContent).toBe("You are here");
        expect(notes[0].getAttribute("aria-hidden")).toBe("true");
        expect(notes[0].closest("a")).toBe(current()[0]);
      });
    }
  });

  it("never falls back to a museum name", () => {
    fixture.componentRef.setInput("sheet", true);
    fixture.detectChanges();

    expect(element.textContent).not.toMatch(/Entrance|Developer|Works|Visitors|Correspondence/);
  });

  it("makes every link a section link, so following one also moves focus there", () => {
    const sectionLinks = fixture.debugElement.queryAll(By.directive(SectionLinkDirective));

    expect(sectionLinks.length).toBe(links().length);
  });

  it("tells the navbar when a link is followed so the phone menu can close", () => {
    let clicks = 0;
    fixture.componentInstance.linkClick.subscribe(() => clicks++);

    links()[0].click();

    expect(clicks).toBe(1);
  });
});
