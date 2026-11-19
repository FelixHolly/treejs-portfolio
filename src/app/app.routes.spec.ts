import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { routes } from "./app.routes";
import { ViewEnvironment } from "./core/view-mode/view-environment";
import { GALLERY_SCENE_FACTORY } from "./features/gallery/gallery-scene.factory";
import { GalleryView } from "./features/gallery/scene/gallery-view";
import { FakeViewEnvironment } from "./testing/fake-view-environment";

describe("routes", () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let environment: FakeViewEnvironment;

  const shown = () =>
    harness.routeNativeElement?.tagName.toLowerCase() === "app-gallery"
      ? "gallery"
      : harness.routeNativeElement?.tagName.toLowerCase() === "app-catalogue"
        ? "catalogue"
        : "other";

  beforeEach(async () => {
    environment = new FakeViewEnvironment();
    const scene = jasmine.createSpyObj<GalleryView>("GalleryView", ["setProgress", "jumpTo", "setPointer", "resize", "setPaused", "setFilmHeld", "dispose"]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: ViewEnvironment, useValue: environment },
        { provide: GALLERY_SCENE_FACTORY, useValue: () => Promise.resolve(scene) },
      ],
    });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  afterEach(() => document.documentElement.classList.remove("gallery-active"));

  it("opens the gallery at the root on a capable desktop", async () => {
    await harness.navigateByUrl("/");

    expect(shown()).toBe("gallery");
    expect(harness.routeNativeElement?.querySelector("h1")?.textContent?.trim()).toBe("Felix Hollndonner");
  });

  it("opens the catalogue at the same address on a phone", async () => {
    environment.finePointer = false;
    environment.size = { width: 390, height: 800 };

    await harness.navigateByUrl("/");

    expect(shown()).toBe("catalogue");
    expect(harness.routeNativeElement?.querySelector("h1")?.textContent?.trim()).toBe("Felix Hollndonner");
  });

  it("lets ?view= force either view", async () => {
    await harness.navigateByUrl("/?view=catalogue");
    expect(shown()).toBe("catalogue");

    environment.finePointer = false;
    await harness.navigateByUrl("/?view=gallery");
    expect(shown()).toBe("gallery");
  });

  it("keeps a stored choice across visits", async () => {
    environment.stored = "catalogue";

    await harness.navigateByUrl("/");

    expect(shown()).toBe("catalogue");
  });

  it("keeps the privacy policy reachable", async () => {
    await harness.navigateByUrl("/privacy-policy");

    expect(router.url).toBe("/privacy-policy");
    expect(harness.routeNativeElement?.querySelector("main h1")?.textContent).toContain("Privacy Policy");
  });

  for (const gone of ["/terms-conditions", "/no-such-page", "/works/kuechenschelle"]) {
    it(`sends the unknown address ${gone} back to the collection`, async () => {
      await harness.navigateByUrl(gone);

      expect(router.url).toBe("/");
    });
  }
});
