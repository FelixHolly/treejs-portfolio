import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { PlaceService } from "../../../core/place/place.service";
import { ViewEnvironment } from "../../../core/view-mode/view-environment";
import { EmailService } from "../../../core/email/email.service";
import { FakeViewEnvironment } from "../../../core/view-mode/fake-view-environment";
import { CatalogueComponent } from "./catalogue.component";

const SITE_TITLE = "Felix Hollndonner, Full-Stack Developer";

describe("CatalogueComponent", () => {
  let fixture: ComponentFixture<CatalogueComponent>;
  let place: PlaceService;

  beforeEach(async () => {
    // The page's own observer would move the place on its own schedule while a spec is setting it.
    spyOn(window, "IntersectionObserver").and.returnValue(
      jasmine.createSpyObj<IntersectionObserver>("IntersectionObserver", ["observe", "unobserve", "disconnect"]),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ViewEnvironment, useValue: new FakeViewEnvironment() },
        { provide: EmailService, useValue: jasmine.createSpyObj<EmailService>("EmailService", ["sendContactEmail"]) },
      ],
    });
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
});
