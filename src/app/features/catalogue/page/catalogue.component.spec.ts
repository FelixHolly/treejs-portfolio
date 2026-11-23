import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Event, NavigationEnd, provideRouter, Router, Scroll } from "@angular/router";
import { Subject } from "rxjs";
import { PlaceService } from "../../../core/place/place.service";
import { ViewEnvironment } from "../../../core/view-mode/view-environment";
import { EmailService } from "../../../core/email/email.service";
import { FakeViewEnvironment } from "../../../core/view-mode/fake-view-environment";
import { FakeScrollGlide } from "../../../shared/scroll/fake-scroll-glide";
import { ScrollGlide } from "../../../shared/scroll/scroll-glide";
import { CatalogueComponent } from "./catalogue.component";

const SITE_TITLE = "Felix Hollndonner, Technical Lead and Full-Stack Developer";

describe("CatalogueComponent", () => {
  let fixture: ComponentFixture<CatalogueComponent>;
  let place: PlaceService;
  let environment: FakeViewEnvironment;
  let glide: FakeScrollGlide;
  /** What the router reports to the page; in the app its Scroll events come once a navigation has ended. */
  let routerEvents: Subject<Event>;

  beforeEach(async () => {
    environment = new FakeViewEnvironment();
    glide = new FakeScrollGlide();
    routerEvents = new Subject();
    // The page's own observer would move the place on its own schedule while a spec is setting it.
    spyOn(window, "IntersectionObserver").and.returnValue(
      jasmine.createSpyObj<IntersectionObserver>("IntersectionObserver", ["observe", "unobserve", "disconnect"]),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ViewEnvironment, useValue: environment },
        { provide: ScrollGlide, useValue: glide },
        { provide: EmailService, useValue: jasmine.createSpyObj<EmailService>("EmailService", ["sendContactEmail"]) },
      ],
    });
    spyOnProperty(TestBed.inject(Router), "events").and.returnValue(routerEvents);
    place = TestBed.inject(PlaceService);
    fixture = TestBed.createComponent(CatalogueComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  describe("the tab title", () => {
    it("is the site's own at the entrance", () => {
      expect(document.title).toBe(SITE_TITLE);
    });

    const rooms: [string, string][] = [
      ["developer", "The Developer - Felix Hollndonner"],
      ["works", "The Works - Felix Hollndonner"],
      ["visitors-book", "Visitors' Book - Felix Hollndonner"],
      ["correspondence", "Correspondence - Felix Hollndonner"],
    ];

    for (const [current, title] of rooms) {
      it(`names the room once "${current}" is the place`, () => {
        place.current.set(current);
        fixture.detectChanges();

        expect(document.title).toBe(title);
      });
    }

    it("names a work while the place is still the one the gallery left behind", () => {
      place.current.set("works/kuechenschelle");
      fixture.detectChanges();

      expect(document.title).toBe("Küchenschelle - Felix Hollndonner");
    });

    it("returns to the site's own when the reader scrolls back up to the entrance", () => {
      place.current.set("works");
      fixture.detectChanges();
      place.current.set("entrance");
      fixture.detectChanges();

      expect(document.title).toBe(SITE_TITLE);
    });

    it("is the site's own again once the reader leaves for a page without a title", () => {
      place.current.set("correspondence");
      fixture.detectChanges();
      expect(document.title).toBe("Correspondence - Felix Hollndonner");

      fixture.destroy();

      expect(document.title).toBe(SITE_TITLE);
    });
  });

  describe("following a link to a section", () => {
    let walk: jasmine.Spy<FakeScrollGlide["to"]>;
    let scrollTo: jasmine.Spy;

    beforeEach(() => {
      walk = spyOn(glide, "to").and.callThrough();
      scrollTo = spyOn(window, "scrollTo");
    });

    /** As the router does after a navigation; `position` is only set for Back and Forward. */
    function led(anchor: string | null, position: [number, number] | null = null, scroll?: "manual"): void {
      routerEvents.next(new Scroll(new NavigationEnd(1, "/", "/"), position, anchor, scroll));
    }

    const anchored = (id: string) => document.getElementById(id)!;
    const topOf = (id: string) => anchored(id).getBoundingClientRect().top + window.scrollY;
    const marginOf = (id: string) => parseFloat(getComputedStyle(anchored(id)).scrollMarginTop);

    for (const id of ["home", "about", "projects", "works", "visitors-book", "contact"]) {
      it(`glides to "${id}" and rests with it clear of the fixed navbar, by the 5.5rem its stylesheet sets aside`, () => {
        led(id);

        expect(marginOf(id)).toBe(88);
        expect(walk).toHaveBeenCalledTimes(1);
        expect(glide.target).toBeCloseTo(topOf(id) - 88, 3);
        expect(scrollTo).withContext("a glide, not a jump").not.toHaveBeenCalled();
      });
    }

    it("rests a work under the larger margin its own article asks for", () => {
      led("works-kuechenschelle");

      expect(marginOf("works-kuechenschelle")).toBe(96);
      expect(glide.target).toBeCloseTo(topOf("works-kuechenschelle") - 96, 3);
    });

    it("keeps aiming at the section while the page above it still grows", () => {
      led("contact");
      const before = glide.target!;

      const late = document.createElement("div");
      late.style.height = "240px";
      anchored("about").before(late);

      expect(glide.target).toBeCloseTo(before + 240, 3);
      late.remove();
    });

    it("jumps there at once for a reader who asked for less motion", () => {
      environment.reducedMotion = true;

      led("contact");

      expect(walk).not.toHaveBeenCalled();
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo.calls.mostRecent().args[0].behavior).toBe("instant");
      expect(scrollTo.calls.mostRecent().args[0].top).toBeCloseTo(topOf("contact") - 88, 3);
    });

    it("leaves Back and Forward to the browser, which puts the page back where it was", () => {
      led("contact", [0, 400]);

      expect(walk).not.toHaveBeenCalled();
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it("gives a glide still under way up when the reader goes Back or Forward, or it would carry the page off again", () => {
      led("contact");

      window.dispatchEvent(new PopStateEvent("popstate"));

      expect(glide.active).toBeFalse();
    });

    it("stays put when a navigation names no anchor, one this page does not have, or asks the router not to scroll", () => {
      led(null);
      led("attic");
      led("contact", null, "manual");
      routerEvents.next(new NavigationEnd(2, "/#contact", "/#contact"));

      expect(walk).not.toHaveBeenCalled();
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it("leaves the glide under way alone when the same link is followed again, and sets off afresh once the reader has broken it off", async () => {
      led("contact");
      led("contact");
      expect(walk).toHaveBeenCalledTimes(1);

      await glide.interrupt();
      led("contact");

      expect(walk).toHaveBeenCalledTimes(2);
    });

    it("lets a second link take over from a glide still under way", () => {
      led("contact");
      const contact = glide.target!;

      led("about");

      expect(walk).toHaveBeenCalledTimes(2);
      expect(glide.target).toBeLessThan(contact);
    });

    it("ends a glide still under way when the reader leaves the page, so it cannot scroll the next one", () => {
      led("contact");
      expect(glide.active).toBeTrue();

      fixture.destroy();

      expect(glide.active).toBeFalse();
    });
  });
});
