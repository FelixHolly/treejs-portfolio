import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { routes } from "./app.routes";

describe("routes", () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  it("opens the catalogue at the root", async () => {
    await harness.navigateByUrl("/");

    expect(harness.routeNativeElement?.querySelector("h1")?.textContent?.trim()).toBe("Felix Hollndonner");
  });

  it("keeps the privacy policy reachable", async () => {
    await harness.navigateByUrl("/privacy-policy");

    expect(router.url).toBe("/privacy-policy");
    expect(harness.routeNativeElement?.querySelector("main h1")?.textContent).toContain("Privacy Policy");
  });

  for (const gone of ["/terms-conditions", "/no-such-page", "/works/kuechenschelle"]) {
    it(`sends the unknown address ${gone} back to the catalogue`, async () => {
      await harness.navigateByUrl(gone);

      expect(router.url).toBe("/");
    });
  }
});
