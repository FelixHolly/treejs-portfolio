import { Location } from "@angular/common";
import { provideLocationMocks, SpyLocation } from "@angular/common/testing";
import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Router, Scroll } from "@angular/router";
import { filter, firstValueFrom } from "rxjs";
import { AppComponent } from "./app.component";
import { appConfig } from "./app.config";
import { EmailService } from "./core/email/email.service";
import { FakeViewEnvironment } from "./core/view-mode/fake-view-environment";
import { ViewEnvironment } from "./core/view-mode/view-environment";
import { HERO_SCENE_FACTORY } from "./features/catalogue/entrance/statue/hero-scene.factory";
import { FakeScrollGlide } from "./shared/scroll/fake-scroll-glide";
import { ScrollGlide } from "./shared/scroll/scroll-glide";

// The app with the router it really has: the catalogue's links scroll only because that router still says where each one led.
describe("the app as configured", () => {
  let glide: FakeScrollGlide;
  let walk: jasmine.Spy<FakeScrollGlide["to"]>;
  let scrollTo: jasmine.Spy;
  let router: Router;
  let host: HTMLElement;

  /** The router's word on where a navigation led, which it gives a moment after the navigation has ended. */
  const led = () => firstValueFrom(router.events.pipe(filter((event) => event instanceof Scroll)));
  const restOf = (id: string) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY - 88;

  /** Starts the app the way the browser does, on a phone so that the catalogue is the view, at the address given. */
  async function start(address: string): Promise<void> {
    (TestBed.inject(Location) as SpyLocation).setInitialPath(address);
    router = TestBed.inject(Router);
    const arrived = led();
    TestBed.inject(ApplicationRef).bootstrap(AppComponent, host);
    await arrived;
  }

  async function follow(fragment: string): Promise<void> {
    const arrived = led();
    await router.navigate(["/"], { fragment });
    await arrived;
  }

  beforeEach(() => {
    const environment = new FakeViewEnvironment();
    environment.finePointer = false;
    glide = new FakeScrollGlide();
    walk = spyOn(glide, "to").and.callThrough();
    scrollTo = spyOn(window, "scrollTo");
    // Angular announces development mode on every bootstrap
    spyOn(console, "log");
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        // The app must not rewrite the test runner's own address
        provideLocationMocks(),
        { provide: ViewEnvironment, useValue: environment },
        { provide: ScrollGlide, useValue: glide },
        { provide: HERO_SCENE_FACTORY, useValue: () => new Promise(() => undefined) },
        { provide: EmailService, useValue: jasmine.createSpyObj<EmailService>("EmailService", ["sendContactEmail"]) },
      ],
    });
    host = document.body.appendChild(document.createElement("app-root"));
  });

  afterEach(() => host.remove());

  it("has the catalogue glide to the section a followed link names, and the router move nothing by itself", async () => {
    await start("/");
    expect(document.querySelector("app-catalogue")).not.toBeNull();
    expect(walk).not.toHaveBeenCalled();

    await follow("contact");

    expect(walk).toHaveBeenCalledTimes(1);
    expect(glide.target).toBeCloseTo(restOf("contact"), 3);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("glides to the same section again when its link is followed from elsewhere on the page", async () => {
    await start("/");
    await follow("projects");
    await glide.arrive();

    await follow("projects");

    expect(walk).toHaveBeenCalledTimes(2);
    expect(glide.target).toBeCloseTo(restOf("projects"), 3);
  });

  it("lands an old deep link on its room once the lazy page has rendered", async () => {
    await start("/#projects");

    expect(walk).toHaveBeenCalledTimes(1);
    expect(glide.target).toBeCloseTo(restOf("projects"), 3);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
