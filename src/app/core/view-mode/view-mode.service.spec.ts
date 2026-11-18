import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { FakeViewEnvironment } from "../../testing/fake-view-environment";
import { PlaceService } from "../place/place.service";
import { ViewEnvironment } from "./view-environment";
import { ViewModeService } from "./view-mode.service";

describe("ViewModeService", () => {
  let environment: FakeViewEnvironment;
  let service: ViewModeService;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    environment = new FakeViewEnvironment();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ViewEnvironment, useValue: environment }],
    });
    navigate = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(true);
    service = TestBed.inject(ViewModeService);
  });

  describe("device default", () => {
    it("opens the gallery on a capable desktop", () => {
      expect(service.resolve(null)).toBe("gallery");
    });

    const unsuited: [string, (env: FakeViewEnvironment) => void][] = [
      ["a narrow window", (env) => (env.size = { width: 1023, height: 900 })],
      ["a short window", (env) => (env.size = { width: 1440, height: 699 })],
      ["a touch device", (env) => (env.finePointer = false)],
      ["reduced motion", (env) => (env.reducedMotion = true)],
      ["data saver", (env) => (env.dataSaver = true)],
      ["no WebGL", (env) => (env.webgl = false)],
    ];
    for (const [name, shape] of unsuited) {
      it(`opens the catalogue for ${name}`, () => {
        shape(environment);

        expect(service.resolve(undefined)).toBe("catalogue");
      });
    }

    it("accepts the smallest suitable window exactly", () => {
      environment.size = { width: 1024, height: 700 };

      expect(service.resolve(null)).toBe("gallery");
    });

    it("is decided once, so enlarging the window mid-visit does not swap the view", () => {
      environment.size = { width: 1440, height: 600 };
      expect(service.resolve(null)).toBe("catalogue");

      environment.size = { width: 1440, height: 900 };
      expect(service.resolve(null)).toBe("catalogue");
    });
  });

  describe("explicit wishes", () => {
    it("lets a stored choice beat the device default in both directions", () => {
      environment.stored = "catalogue";
      expect(service.resolve(null)).toBe("catalogue");

      environment.stored = "gallery";
      environment.finePointer = false;
      expect(service.resolve(null)).toBe("gallery");
    });

    it("lets ?view= beat the stored choice and keeps it for the rest of the visit", () => {
      environment.stored = "gallery";

      expect(service.resolve("catalogue")).toBe("catalogue");
      expect(service.resolve(null)).toBe("catalogue");
      expect(environment.stored).toBe("gallery");
    });

    for (const junk of ["", "3d", "GALLERY", "catalogue ", "<script>"]) {
      it(`ignores the unknown request "${junk}"`, () => {
        expect(service.resolve(junk)).toBe("gallery");
      });
    }

    it("ignores a corrupted stored value", () => {
      environment.stored = "true";

      expect(service.resolve(null)).toBe("gallery");
    });

    it("never opens the gallery without WebGL, whatever was asked", () => {
      environment.webgl = false;
      environment.stored = "gallery";

      expect(service.resolve("gallery")).toBe("catalogue");
      expect(service.galleryAvailable()).toBeFalse();
    });
  });

  describe("switching", () => {
    it("remembers the choice and reloads the route at the entrance without a fragment", async () => {
      await service.switchTo("catalogue");

      expect(environment.stored).toBe("catalogue");
      expect(navigate).toHaveBeenCalledOnceWith(["/"], { fragment: undefined, onSameUrlNavigation: "reload" });
      expect(service.resolve(null)).toBe("catalogue");
    });

    it("carries the visitor's place into the catalogue's own anchors", async () => {
      TestBed.inject(PlaceService).current.set("works/reloo");

      await service.switchTo("catalogue");

      expect(navigate.calls.mostRecent().args[1].fragment).toBe("works-reloo");
    });

    it("carries the visitor's place into the gallery as a stop", async () => {
      TestBed.inject(PlaceService).current.set("visitors-book");

      await service.switchTo("gallery");

      expect(navigate.calls.mostRecent().args[1].fragment).toBe("visitors-book");
    });
  });

  describe("a gallery that fails to start", () => {
    it("falls back to the catalogue for the visit without overwriting the stored choice", async () => {
      environment.stored = "gallery";
      TestBed.inject(PlaceService).current.set("developer");

      await service.reportBroken();

      expect(navigate.calls.mostRecent().args[1].fragment).toBe("about");
      expect(environment.stored).toBe("gallery");
      expect(service.galleryAvailable()).toBeFalse();
      expect(service.resolve("gallery")).toBe("catalogue");
    });
  });
});
