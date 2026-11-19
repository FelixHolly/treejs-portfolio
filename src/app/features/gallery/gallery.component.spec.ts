import { provideLocationMocks } from "@angular/common/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { DEVELOPER } from "../../core/content/developer.content";
import { Work } from "../../core/content/work.model";
import { WORKS } from "../../core/content/works.content";
import { WorksService } from "../../core/content/works.service";
import { PlaceService } from "../../core/place/place.service";
import { ViewEnvironment } from "../../core/view-mode/view-environment";
import { ViewModeService } from "../../core/view-mode/view-mode.service";
import { EmailService } from "../../services/email.service";
import { LetterComponent } from "../../shared/letter/letter.component";
import { FakeViewEnvironment } from "../../testing/fake-view-environment";
import { GALLERY_SCENE_FACTORY } from "./gallery-scene.factory";
import { GalleryComponent } from "./gallery.component";
import { GallerySceneFactory, GalleryView, GalleryViewOptions } from "./scene/gallery-view";
import { DOOR_XS, pieceSlots, SKILL_PLAQUES, WALL_THICKNESS } from "./scene/layout";

const SITE_TITLE = "Felix Hollndonner, Full-Stack Developer";

/** Lets the first paint, the deferred scene start and its promise all run. */
function sceneStarted(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(() => setTimeout(resolve, 0), 0)));
}

// Chrome drops history calls once a page makes too many in a few seconds, so the address is only reset when a spec changed it.
function clearHash(): void {
  if (location.hash) history.replaceState(null, "", location.pathname);
}

describe("GalleryComponent", () => {
  let fixture: ComponentFixture<GalleryComponent>;
  let element: HTMLElement;
  let environment: FakeViewEnvironment;
  let scene: jasmine.SpyObj<GalleryView>;
  let factory: jasmine.Spy<GallerySceneFactory>;
  let options: GalleryViewOptions | undefined;
  /** A hanging other than the real one, for the specs that need it; provided afresh so it cannot outlive its spec. */
  let collection: Work[] | undefined;
  let scrollTo: jasmine.Spy;
  let scrollY: jasmine.Spy | undefined;
  let placeLeftBehind: string | undefined;

  async function open(sceneFails = false): Promise<void> {
    scene = jasmine.createSpyObj<GalleryView>("GalleryView", ["setProgress", "jumpTo", "setPointer", "resize", "setPaused", "setFilmHeld", "post", "dispose"]);
    factory = jasmine.createSpy("factory").and.callFake((_canvas: HTMLCanvasElement, received: GalleryViewOptions) => {
      options = received;
      return sceneFails ? Promise.reject(new Error("no WebGL")) : Promise.resolve(scene);
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        // The page drives the real address bar itself; a router listening to it too would rewrite the URL between specs
        provideLocationMocks(),
        { provide: ViewEnvironment, useValue: environment },
        { provide: GALLERY_SCENE_FACTORY, useValue: factory },
        { provide: EmailService, useValue: jasmine.createSpyObj<EmailService>("EmailService", ["sendContactEmail"]) },
        ...(collection ? [{ provide: WorksService, useValue: { works: () => collection } }] : []),
      ],
    });
    if (placeLeftBehind) TestBed.inject(PlaceService).current.set(placeLeftBehind);
    fixture = TestBed.createComponent(GalleryComponent);
    element = fixture.nativeElement;
    document.body.appendChild(element);
    fixture.detectChanges();
    await fixture.whenStable();
    await sceneStarted();
    fixture.detectChanges();
  }

  function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body): KeyboardEvent {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  }

  /** `window.scrollTo` is stubbed, so a walk never moves the page: this reports the position it would have reached. */
  function arriveAt(index: number): void {
    const label = element.querySelector(`[data-stop="${index}"] [data-label]`)!.getBoundingClientRect();
    scrollY ??= spyOnProperty(window, "scrollY");
    scrollY.and.returnValue(label.top + label.height / 2 - window.innerHeight / 2);
    window.dispatchEvent(new Event("scroll"));
    fixture.detectChanges();
  }

  beforeEach(() => {
    environment = new FakeViewEnvironment();
    options = undefined;
    collection = undefined;
    scrollY = undefined;
    placeLeftBehind = undefined;
    clearHash();
    window.scrollTo({ top: 0, behavior: "instant" });
    scrollTo = spyOn(window, "scrollTo");
  });

  afterEach(() => {
    fixture.destroy();
    element.remove();
    clearHash();
  });

  describe("what is on the page", () => {
    beforeEach(() => open());

    it("renders every stop as real content in walking order, not only inside the canvas", () => {
      const headings = Array.from(element.querySelectorAll("main [data-stop]")).map((section) =>
        section.querySelector("h1, h2, h3")?.textContent?.trim(),
      );

      expect(headings).toEqual([
        "Felix Hollndonner",
        "The Developer",
        "The Works",
        "Küchenschelle",
        "WheelWallet",
        "ReLoo",
        "This Gallery",
        "Visitors' Book",
        "Write to me",
      ]);
    });

    it("hides the canvas from assistive technology", () => {
      expect(element.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("makes Room I's label the about text: greeting, bio, where the developer is based", () => {
      const label = element.querySelector('[data-stop="1"] [data-label]')!;

      expect(label.querySelector("h3")?.textContent?.trim()).toBe(DEVELOPER.greeting);
      for (const paragraph of DEVELOPER.bio) expect(label.textContent).toContain(paragraph);
      expect(label.textContent).toContain(DEVELOPER.location);
      expect(label.textContent).toContain(DEVELOPER.viennaLine);
    });

    it("leaves the skills to the wall: Room I's label has no line listing the stack", () => {
      const label = element.querySelector('[data-stop="1"] [data-label]')!;
      const bio = DEVELOPER.bio.join(" ");

      for (const tool of DEVELOPER.skills.flatMap((group) => [...group.tools]).filter((tool) => !bio.includes(tool))) {
        expect(label.textContent).withContext(tool).not.toContain(tool);
      }
      expect(Array.from(label.querySelectorAll("p")).some((line) => line.textContent!.includes("TypeScript"))).toBeFalse();
    });

    it("ends Room I's label with the way on to Room II", () => {
      const controls = element.querySelectorAll('[data-stop="1"] [data-label] *');
      const last = controls[controls.length - 1].closest("button");

      expect(last?.classList.contains("onward")).toBeTrue();
      expect(last?.textContent?.trim()).toBe("Continue to Room II, The Works");
    });

    it("summarises the wall and offers a jump to each work", () => {
      const room = element.querySelector('[data-stop="2"]')!;

      expect(room.textContent).toContain("One commission, two studies and one self-portrait hang on this wall.");
      expect(Array.from(room.querySelectorAll(".work-list button")).map((button) => button.textContent!.replace(/\s+/g, " ").replace(" ,", ",").trim())).toEqual([
        "Küchenschelle, Commission",
        "WheelWallet, Study",
        "ReLoo, Study",
        "This Gallery, Self-portrait",
      ]);
    });

    it("gives every work a closer look, the commission a live link and the self-portrait its code", () => {
      const closer = Array.from(element.querySelectorAll("button")).filter((button) => button.textContent?.trim() === "Closer look");

      expect(closer.length).toBe(4);
      expect(Array.from(element.querySelectorAll("app-wall-label a")).map((link) => link.getAttribute("href"))).toEqual([
        "https://kuechenschelle.at",
        "https://github.com/FelixHolly/treejs-portfolio",
      ]);
    });

    it("offers the way on at the foot of every label but the entrance and the letter, naming where it leads", () => {
      const waysOn = Array.from(element.querySelectorAll("main [data-stop]")).map(
        (section) => section.querySelector(".onward")?.textContent?.trim() ?? null,
      );

      expect(waysOn).toEqual([
        null,
        "Continue to Room II, The Works",
        "Next: Küchenschelle",
        "Next: WheelWallet",
        "Next: ReLoo",
        "Next: This Gallery",
        "Continue to Room III, Visitors' Book",
        "Continue to Room IV, Correspondence",
        null,
      ]);
    });

    it("draws the way on's arrow as an icon and keeps it beside a work's closer look", () => {
      const waysOn = Array.from(element.querySelectorAll(".onward"));
      const foot = element.querySelector('[data-stop="4"] .label-foot')!;

      expect(waysOn.every((wayOn) => wayOn.querySelector("app-icon-arrow-down svg[aria-hidden='true']"))).toBeTrue();
      expect(Array.from(foot.querySelectorAll("button")).map((button) => button.textContent!.trim())).toEqual([
        "Closer look",
        "Next: ReLoo",
      ]);
    });

    it("carries the letter form and never an email address", () => {
      expect(element.querySelector("#letter-message")).not.toBeNull();
      expect(element.querySelector('a[href^="mailto:"]')).toBeNull();
    });

    it("starts at the entrance: plan, live region and shared place agree", () => {
      expect(element.querySelector(".stop--active")?.getAttribute("data-stop")).toBe("0");
      expect(element.querySelector("app-floor-plan [aria-current]")?.textContent).toContain("Entrance");
      expect(element.querySelector("[aria-live]")?.textContent?.trim()).toBe("Entrance");
      expect(TestBed.inject(PlaceService).current()).toBe("entrance");
    });

    it("shows the entrance text until the visitor walks on", () => {
      expect(element.querySelector(".stop--entrance")?.classList.contains("stop--left")).toBeFalse();

      fixture.componentInstance.setOff.set(true);
      fixture.detectChanges();

      expect(element.querySelector(".stop--entrance")?.classList.contains("stop--left")).toBeTrue();
      expect(element.querySelector('[data-stop="1"]')?.classList.contains("stop--left")).toBeFalse();
    });

    it("offers the arrow keys in its hint in a part a touch screen can drop", () => {
      const hint = element.querySelector(".hint")!;

      expect(hint.textContent).toBe("Scroll, or use the arrow keys, to walk through");
      expect(hint.querySelector(".keys")?.textContent).toBe(", or use the arrow keys,");
    });

    it("tells the app the gallery is on screen and marks the page for scroll snapping", () => {
      expect(TestBed.inject(ViewModeService).active()).toBe("gallery");
      expect(document.documentElement.classList.contains("gallery-active")).toBeTrue();
    });
  });

  describe("the scene", () => {
    it("is started after the first paint with the collection, frieze and assets", async () => {
      await open();

      expect(factory).toHaveBeenCalledTimes(1);
      expect(factory.calls.mostRecent().args[0]).toBe(element.querySelector("canvas")!);
      expect(options?.works.map((work) => `${work.kind}:${work.slug}:${work.images.length}`)).toEqual([
        "commission:kuechenschelle:3",
        "study:wheelwallet:1",
        "study:reloo:1",
        "self-portrait:this-gallery:1",
      ]);
      expect(options?.works[1].images[0].portrait).toBeTrue();
      expect(options?.frieze).toContain("Angular");
      expect(options?.visitors).toEqual(["Polypoint AG", "Eurotours"]);
      expect(options?.assets.lionModel).toMatch(/\.glb$/);
      expect(options?.reducedMotion).toBeFalse();
      expect(options?.works.map((work) => work.film)).toEqual(["assets/works/kuechenschelle-film.webm", undefined, undefined, undefined]);
      expect(options?.films).toBeTrue();
      expect(scene.setFilmHeld.calls.allArgs()).toEqual([[false]]);
      expect(scene.resize).toHaveBeenCalled();
      expect(scene.jumpTo).toHaveBeenCalledTimes(1);
      expect(scene.jumpTo.calls.mostRecent().args[0]).toBeCloseTo(0, 2);
    });

    it("is given one skill area for each plaque on Room I's wall, sized for four tools at most", async () => {
      await open();

      expect(options?.skills.length).toBe(SKILL_PLAQUES.count);
      expect(options?.skills.map((group) => group.area)).toEqual(["Frontend", "Backend", "Data and operations"]);
      expect(options?.skills[0].tools).toEqual(["Angular", "TypeScript", "NgRx", "Tailwind"]);
      expect(Math.max(...(options?.skills ?? []).map((group) => group.tools.length))).toBeLessThanOrEqual(4);
    });

    it("is told where the entrance text leaves room for the statue: under the name, above the foot", async () => {
      await open();

      const { labelShare, statueBand } = scene.resize.calls.mostRecent().args[0];
      const [top, bottom] = statueBand;
      const entrance = element.querySelector<HTMLElement>("[data-label]")!.getBoundingClientRect();
      const name = element.querySelector(".entrance-head")!.getBoundingClientRect();
      const foot = element.querySelector(".entrance-foot")!.getBoundingClientRect();

      expect(labelShare).toBeGreaterThanOrEqual(0);
      expect(labelShare).toBeLessThanOrEqual(0.6);
      expect(top * window.innerHeight).toBeGreaterThan(name.bottom - entrance.top);
      expect(bottom * window.innerHeight).toBeLessThan(foot.bottom - entrance.top);
      expect(bottom).toBeGreaterThan(top);
    });

    it("measures the statue's band the same wherever the page happens to be scrolled", async () => {
      await open();
      const before = scene.resize.calls.mostRecent().args[0].statueBand;

      element.querySelector<HTMLElement>("main")!.style.transform = "translateY(-240px)";
      window.dispatchEvent(new Event("resize"));
      const after = scene.resize.calls.mostRecent().args[0].statueBand;

      expect(after[0]).toBeCloseTo(before[0], 6);
      expect(after[1]).toBeCloseTo(before[1], 6);
    });

    it("posts the envelope once a letter has gone, and not before", async () => {
      await open();
      const letter = fixture.debugElement.query(By.directive(LetterComponent)).componentInstance as LetterComponent;

      expect(scene.post).not.toHaveBeenCalled();
      letter.posted.emit();

      expect(scene.post).toHaveBeenCalledTimes(1);
    });

    it("shows a dismissible notice when the scene reports a slow device", async () => {
      await open();

      options!.onSlow();
      fixture.detectChanges();
      const notice = element.querySelector(".notice")!;
      expect(notice.textContent).toContain("running slowly");
      expect(notice.querySelector("app-view-switch button")?.getAttribute("aria-label")).toBe("Read the catalogue");

      notice.querySelector<HTMLButtonElement>('button[aria-label="Dismiss this notice"]')!.click();
      fixture.detectChanges();
      expect(element.querySelector(".notice")).toBeNull();
    });

    it("falls back to the catalogue when the scene cannot start", async () => {
      const reportBroken = spyOn(ViewModeService.prototype, "reportBroken").and.resolveTo(true);

      await open(true);

      expect(reportBroken).toHaveBeenCalledTimes(1);
    });

    it("follows the mouse for the look-around, ignoring touch", async () => {
      await open();

      window.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientX: 10, clientY: 10 }));
      expect(scene.setPointer).not.toHaveBeenCalled();

      window.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", clientX: window.innerWidth, clientY: 0 }));
      expect(scene.setPointer).toHaveBeenCalledOnceWith(1, -1);
    });

    it("is disposed and the page mark removed when the visitor leaves", async () => {
      await open();

      fixture.destroy();

      expect(scene.dispose).toHaveBeenCalledTimes(1);
      expect(document.documentElement.classList.contains("gallery-active")).toBeFalse();
      press("ArrowDown");
      expect(scrollTo.calls.count()).toBe(0);
    });

    it("is disposed at once if it arrives after the visitor already left", async () => {
      let deliver!: (view: GalleryView) => void;
      await open();
      factory.and.returnValue(new Promise<GalleryView>((resolve) => (deliver = resolve)));
      fixture.destroy();
      element.remove();
      scene.dispose.calls.reset();

      fixture = TestBed.createComponent(GalleryComponent);
      element = fixture.nativeElement;
      document.body.appendChild(element);
      fixture.detectChanges();
      await sceneStarted();
      fixture.destroy();
      deliver(scene);
      await Promise.resolve();
      await Promise.resolve();

      expect(scene.dispose).toHaveBeenCalledTimes(1);
      expect(scene.jumpTo.calls.count()).toBe(1);
    });
  });

  describe("walking with the keyboard", () => {
    beforeEach(() => open());

    for (const key of ["ArrowDown", "PageDown", " "]) {
      it(`steps forward on "${key}" and moves focus to the next stop's heading`, () => {
        const event = press(key);

        expect(event.defaultPrevented).toBeTrue();
        expect(scrollTo).toHaveBeenCalledTimes(1);
        expect(scrollTo.calls.mostRecent().args[0].top).toBeGreaterThan(0);
        expect(scrollTo.calls.mostRecent().args[0].behavior).toBe("smooth");
        expect(document.activeElement?.textContent?.trim()).toBe("The Developer");
      });
    }

    it("leaves the keys alone at the first stop when walking backwards", () => {
      for (const init of [{ key: "ArrowUp" }, { key: "PageUp" }, { key: " ", shiftKey: true }]) {
        expect(press(init.key, init).defaultPrevented).toBeFalse();
      }
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it("jumps to the last and first stop on End and Home", () => {
      press("End");
      expect(document.activeElement?.textContent?.trim()).toBe("Write to me");

      press("Home");
      expect(scrollTo.calls.mostRecent().args[0].top).toBe(0);
      expect(document.activeElement?.textContent?.trim()).toBe("Felix Hollndonner");
    });

    for (const init of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }]) {
      it(`ignores ArrowDown with ${Object.keys(init)[0]}`, () => {
        expect(press("ArrowDown", init).defaultPrevented).toBeFalse();
        expect(scrollTo).not.toHaveBeenCalled();
      });
    }

    for (const selector of ["#letter-message", "#letter-name", "app-floor-plan button", ".wordmark", "app-wall-label a", ".onward", ".to-letter"]) {
      it(`never steals keys from ${selector}`, () => {
        const target = element.querySelector(selector)!;

        expect(press(" ", {}, target).defaultPrevented).toBeFalse();
        expect(press("ArrowDown", {}, target).defaultPrevented).toBeFalse();
        expect(scrollTo).not.toHaveBeenCalled();
      });
    }

    it("stands still while the closer look is open, even with focus on the page body", async () => {
      element.querySelector<HTMLButtonElement>('[data-stop="3"] .view-switch')!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      scrollTo.calls.reset();

      expect(press("ArrowDown").defaultPrevented).toBeFalse();
      expect(scrollTo).not.toHaveBeenCalled();

      element.querySelector("dialog")!.close();
    });

    it("ignores unrelated keys", () => {
      expect(press("a").defaultPrevented).toBeFalse();
      expect(press("Enter").defaultPrevented).toBeFalse();
      expect(scrollTo).not.toHaveBeenCalled();
    });
  });

  describe("wayfinding", () => {
    beforeEach(() => open());

    it("walks to a room from the floor plan and focuses its heading", () => {
      element.querySelectorAll<HTMLButtonElement>("app-floor-plan button")[3].click();

      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(document.activeElement?.textContent?.trim()).toBe("Visitors' Book");
    });

    it("walks to a work from the Room II list", () => {
      element.querySelectorAll<HTMLButtonElement>('[data-stop="2"] button')[2].click();

      expect(document.activeElement?.textContent?.trim()).toBe("ReLoo");
    });

    it("walks on from a label's foot to the next stop, focuses its heading and leaves a history entry", () => {
      element.querySelector<HTMLButtonElement>('[data-stop="1"] .onward')!.click();

      expect(scrollTo.calls.mostRecent().args[0].top).toBeGreaterThan(0);
      expect(scrollTo.calls.mostRecent().args[0].behavior).toBe("smooth");
      expect(document.activeElement?.textContent?.trim()).toBe("The Works");
      expect(location.hash).toBe("#works");
    });

    it("walks on from the last work into Room III", () => {
      element.querySelector<HTMLButtonElement>('[data-stop="6"] .onward')!.click();

      expect(document.activeElement?.textContent?.trim()).toBe("Visitors' Book");
      expect(location.hash).toBe("#visitors-book");
    });

    it("walks to the letter from the header and focuses its heading", () => {
      element.querySelector<HTMLButtonElement>(".hud .to-letter")!.click();

      expect(scrollTo.calls.mostRecent().args[0].top).toBeGreaterThan(0);
      expect(document.activeElement?.textContent?.trim()).toBe("Write to me");
      expect(location.hash).toBe("#correspondence");
    });

    it("offers the letter from the header everywhere but in Room IV itself", () => {
      expect(element.querySelector(".hud .to-letter")?.textContent?.trim()).toBe("Write to me");

      arriveAt(7);
      expect(element.querySelector(".hud .to-letter")).not.toBeNull();

      arriveAt(8);
      expect(element.querySelector(".hud .to-letter")).toBeNull();
      expect(element.querySelector(".hud app-view-switch")).not.toBeNull();
    });

    it("enters from the plaque and returns from the exit and the wordmark", () => {
      element.querySelector<HTMLButtonElement>(".plaque")!.click();
      expect(document.activeElement?.textContent?.trim()).toBe("The Developer");

      element.querySelector<HTMLButtonElement>(".exit .plaque")!.click();
      expect(scrollTo.calls.mostRecent().args[0].top).toBe(0);

      element.querySelector<HTMLButtonElement>(".wordmark")!.click();
      expect(document.activeElement?.textContent?.trim()).toBe("Felix Hollndonner");
    });

    it("moves focus to the content from the skip link without navigating", () => {
      const link = element.querySelector<HTMLAnchorElement>(".skip-link")!;
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });

      link.dispatchEvent(event);

      expect(event.defaultPrevented).toBeTrue();
      expect(document.activeElement?.id).toBe("main");
    });

    it("walks the camera to a stop when focus lands inside its label", () => {
      spyOnProperty(window, "innerHeight").and.returnValue(4000);
      element.querySelector<HTMLElement>('[data-stop="1"]')!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it("leaves the browser's own focus scrolling alone in a label taller than the screen", () => {
      spyOnProperty(window, "innerHeight").and.returnValue(150);
      element.querySelector<HTMLElement>('[data-stop="7"]')!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it("does not re-walk when focus moves within the stop the visitor is at", () => {
      element.querySelector<HTMLElement>('[data-stop="0"] .plaque')!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it("walks to the stop named by a hash typed into the address bar, and ignores unknown ones", () => {
      history.replaceState(null, "", "#works/reloo");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      expect(scrollTo).toHaveBeenCalledTimes(1);

      scrollTo.calls.reset();
      history.replaceState(null, "", "#attic");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it("leaves a history entry on a deliberate jump, so Back returns to the stop before", () => {
      const push = spyOn(history, "pushState").and.callThrough();

      element.querySelectorAll<HTMLButtonElement>("app-floor-plan button")[3].click();

      expect(push).toHaveBeenCalledTimes(1);
      expect(location.hash).toBe("#visitors-book");
    });

    it("adds no history entry when asked to walk to the stop the visitor is already at", () => {
      const push = spyOn(history, "pushState").and.callThrough();

      element.querySelector<HTMLButtonElement>(".wordmark")!.click();

      expect(push).not.toHaveBeenCalled();
    });

    it("walks back to the entrance when Back returns to the address without a hash", () => {
      history.replaceState(null, "", "#works");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      scrollTo.calls.reset();
      fixture.componentInstance.activeIndex.set(2);

      history.replaceState(null, "", location.pathname);
      window.dispatchEvent(new PopStateEvent("popstate"));

      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo.calls.mostRecent().args[0].top).toBe(0);
    });

    it("pauses the scene while the tab is hidden", () => {
      document.dispatchEvent(new Event("visibilitychange"));

      expect(scene.setPaused).toHaveBeenCalledOnceWith(document.hidden);
    });
  });

  describe("the gallery hung in itself", () => {
    beforeEach(() => open());

    it("stands at its own stop in Room II, the last work before the visitors' book", () => {
      const stop = element.querySelector('[data-stop="6"]')!;

      expect(stop.querySelector("h3")?.textContent?.trim()).toBe("This Gallery");
      expect(stop.querySelector(".room-number")?.textContent?.trim()).toBe("Self-portrait");
      expect(stop.classList.contains("stop--hop")).toBeTrue();
      expect(element.querySelector('[data-stop="7"] h2')?.textContent?.trim()).toBe("Visitors' Book");
    });

    it("fits on the wall of Room II with the works before it, a metre short of the wall to Room III", () => {
      const slots = pieceSlots(options!.works);
      const last = slots[slots.length - 1];

      expect(last.slug).toBe("this-gallery");
      expect(last.centre.x + last.span / 2).toBeLessThan(DOOR_XS[2] - WALL_THICKNESS / 2 - 1);
    });

    it("links to its code and not to a live site, since the visitor is standing in it", () => {
      const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('[data-stop="6"] a'));

      expect(links.length).toBe(1);
      expect(links[0].textContent).toContain("View the code");
      expect(links[0].getAttribute("href")).toBe("https://github.com/FelixHolly/treejs-portfolio");
      expect(links[0].target).toBe("_blank");
      expect(links[0].rel).toContain("noopener");
    });

    it("is walked to from the Room II list, which leaves its own address behind for Back", () => {
      element.querySelectorAll<HTMLButtonElement>('[data-stop="2"] button')[3].click();

      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(document.activeElement?.textContent?.trim()).toBe("This Gallery");
      expect(location.hash).toBe("#works/this-gallery");
    });

    it("is walked to when its address is typed, in the gallery's form or the catalogue's", () => {
      for (const hash of ["#works/this-gallery", "#works-this-gallery"]) {
        scrollTo.calls.reset();
        history.replaceState(null, "", hash);
        window.dispatchEvent(new HashChangeEvent("hashchange"));

        expect(scrollTo).withContext(hash).toHaveBeenCalledTimes(1);
        expect(scrollTo.calls.mostRecent().args[0].top).withContext(hash).toBeGreaterThan(0);
      }
    });

    it("keeps the floor plan and the live region in Room II while the visitor stands at it", () => {
      fixture.componentInstance.activeIndex.set(6);
      fixture.detectChanges();

      expect(element.querySelector("app-floor-plan [aria-current]")?.textContent).toContain("Room II, The Works");
      expect(element.querySelector("[aria-live]")?.textContent?.trim()).toBe("Room II, The Works");
      expect(element.querySelector(".stop--active h3")?.textContent?.trim()).toBe("This Gallery");
    });

    it("opens a closer look at its three pictures, each described", async () => {
      element.querySelector<HTMLButtonElement>('[data-stop="6"] .view-switch')!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      const dialog = element.querySelector("dialog")!;
      const pictures = Array.from(dialog.querySelectorAll("img"));

      expect(dialog.open).toBeTrue();
      expect(dialog.querySelector("h2")?.textContent?.trim()).toBe("This Gallery");
      expect(pictures.map((picture) => picture.getAttribute("src")?.split("/").pop())).toEqual([
        "this-gallery-entrance.webp",
        "this-gallery-room-1.webp",
        "this-gallery-room-4.webp",
      ]);
      expect(pictures.every((picture) => picture.alt.length > 10)).toBeTrue();

      dialog.close();
    });
  });

  describe("the summary of the wall", () => {
    const hang = (...kinds: Work["kind"][]): Work[] =>
      kinds.map((kind, index) => ({
        slug: `piece-${index}`,
        title: `Piece ${index}`,
        kind,
        year: "2026",
        materials: [],
        role: "Alone.",
        problem: "A question.",
        built: "A draft.",
        images: [{ src: "assets/works/reloo.webp", alt: "A screen", caption: "Fig.", orientation: "portrait" }],
      }));

    async function summaryOf(works: Work[]): Promise<string | undefined> {
      collection = works;
      await open();
      return element.querySelector('[data-stop="2"] .grid-subtext')?.textContent?.trim();
    }

    const collections: [string, Work[], string][] = [
      ["one work", hang("self-portrait"), "One self-portrait hangs on this wall."],
      ["several of one kind", hang("study", "study", "study"), "Three studies hang on this wall."],
      ["two kinds", hang("study", "self-portrait", "study"), "Two studies and one self-portrait hang on this wall."],
      [
        "three kinds, named in the same order however they hang",
        hang("self-portrait", "study", "commission", "self-portrait", "commission"),
        "Two commissions, one study and two self-portraits hang on this wall.",
      ],
      ["more works than there are number words", hang(...Array<Work["kind"]>(7).fill("study")), "7 studies hang on this wall."],
      ["an empty wall", [], ""],
    ];

    for (const [name, works, sentence] of collections) {
      it(`reads naturally for ${name}`, async () => {
        expect(await summaryOf(works)).toBe(sentence);
        expect(element.querySelectorAll('[data-stop="2"] li').length).toBe(works.length);
      });
    }
  });

  describe("the tab title", () => {
    it("is the site's own at the entrance, even when the visitor left another room behind on an earlier page", async () => {
      placeLeftBehind = "correspondence";

      await open();

      expect(TestBed.inject(PlaceService).current()).toBe("entrance");
      expect(document.title).toBe(SITE_TITLE);
    });
  });

  describe("the tab title", () => {
    beforeEach(() => open());

    it("is the site's own at the entrance", () => {
      expect(document.title).toBe(SITE_TITLE);
    });

    it("names the room or the work the visitor has walked to", () => {
      arriveAt(2);
      expect(document.title).toBe("The Works - Felix Hollndonner");

      arriveAt(3);
      expect(document.title).toBe("Küchenschelle - Felix Hollndonner");

      arriveAt(8);
      expect(document.title).toBe("Correspondence - Felix Hollndonner");
    });

    it("follows the shared place, whoever moves it", () => {
      TestBed.inject(PlaceService).current.set("visitors-book");
      fixture.detectChanges();

      expect(document.title).toBe("Visitors' Book - Felix Hollndonner");
    });

    it("is the site's own again once the visitor leaves the gallery", () => {
      arriveAt(1);
      expect(document.title).toBe("The Developer - Felix Hollndonner");

      fixture.destroy();

      expect(document.title).toBe(SITE_TITLE);
    });
  });

  describe("arriving with a hash", () => {
    it("opens at the named stop without animating", async () => {
      history.replaceState(null, "", "#visitors-book");

      await open();

      expect(scrollTo.calls.first().args[0].behavior).toBe("instant");
      expect(scrollTo.calls.first().args[0].top).toBeGreaterThan(0);
    });

    it("understands the catalogue's older anchors", async () => {
      history.replaceState(null, "", "#contact");

      await open();

      expect(scrollTo).toHaveBeenCalledTimes(1);
    });
  });

  describe("the film in the commission's frame", () => {
    const control = () => element.querySelector<HTMLButtonElement>(".film-toggle");

    describe("when films may play", () => {
      beforeEach(() => open());

      it("offers a way to pause it in the commission's label, between the closer look and the way on", () => {
        const foot = element.querySelector('[data-stop="3"] .label-foot')!;

        expect(Array.from(foot.querySelectorAll("button")).map((button) => button.textContent!.trim())).toEqual([
          "Closer look",
          "Pause the film",
          "Next: WheelWallet",
        ]);
      });

      it("offers it only for the work that has a film", () => {
        expect(element.querySelectorAll(".film-toggle").length).toBe(1);
        for (const stop of [4, 5, 6]) {
          expect(element.querySelector(`[data-stop="${stop}"] .film-toggle`)).withContext(`stop ${stop}`).toBeNull();
        }
      });

      it("pauses the film in the scene and turns into the way to play it again", () => {
        control()!.click();
        fixture.detectChanges();

        expect(scene.setFilmHeld.calls.mostRecent().args).toEqual([true]);
        expect(control()!.textContent!.trim()).toBe("Play the film");

        control()!.click();
        fixture.detectChanges();

        expect(scene.setFilmHeld.calls.mostRecent().args).toEqual([false]);
        expect(control()!.textContent!.trim()).toBe("Pause the film");
      });

      it("says its state in its name alone, with a drawn icon that assistive technology skips", () => {
        expect(control()!.hasAttribute("aria-pressed")).toBeFalse();
        expect(control()!.hasAttribute("aria-label")).toBeFalse();
        expect(control()!.type).toBe("button");
        expect(control()!.querySelector("svg[aria-hidden='true'] path")).not.toBeNull();

        const pauseIcon = control()!.querySelector("path")!.getAttribute("d");
        control()!.click();
        fixture.detectChanges();

        expect(control()!.querySelector("path")!.getAttribute("d")).not.toBe(pauseIcon);
      });

      it("is a target of at least 24 pixels", () => {
        const box = control()!.getBoundingClientRect();

        expect(box.height).toBeGreaterThanOrEqual(24);
        expect(box.width).toBeGreaterThanOrEqual(24);
      });

      it("never steals the walking keys", () => {
        expect(press(" ", {}, control()!).defaultPrevented).toBeFalse();
        expect(press("ArrowDown", {}, control()!).defaultPrevented).toBeFalse();
        expect(scrollTo).not.toHaveBeenCalled();
      });

      it("holds the film while the closer look is open and lets it go when that closes", async () => {
        element.querySelector<HTMLButtonElement>('[data-stop="3"] .view-switch')!.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(scene.setFilmHeld.calls.mostRecent().args).toEqual([true]);

        const dialog = element.querySelector("dialog")!;
        const closed = new Promise((resolve) => dialog.addEventListener("close", resolve, { once: true }));
        dialog.close();
        await closed;

        expect(scene.setFilmHeld.calls.mostRecent().args).toEqual([false]);
      });

      it("keeps a film the visitor paused paused after the closer look closes", async () => {
        control()!.click();
        element.querySelector<HTMLButtonElement>('[data-stop="3"] .view-switch')!.click();
        fixture.detectChanges();
        await fixture.whenStable();

        const dialog = element.querySelector("dialog")!;
        const closed = new Promise((resolve) => dialog.addEventListener("close", resolve, { once: true }));
        dialog.close();
        await closed;

        expect(scene.setFilmHeld.calls.allArgs()).toEqual([[false], [true], [true], [true]]);
      });
    });

    it("tells a scene that arrives late that the visitor already paused the film", async () => {
      let deliver!: (view: GalleryView) => void;
      await open();
      const late = jasmine.createSpyObj<GalleryView>("GalleryView", ["setProgress", "jumpTo", "setPointer", "resize", "setPaused", "setFilmHeld", "post", "dispose"]);
      factory.and.returnValue(new Promise<GalleryView>((resolve) => (deliver = resolve)));
      fixture.destroy();
      element.remove();

      fixture = TestBed.createComponent(GalleryComponent);
      element = fixture.nativeElement;
      document.body.appendChild(element);
      fixture.detectChanges();
      await fixture.whenStable();
      await sceneStarted();
      control()!.click();
      expect(late.setFilmHeld).not.toHaveBeenCalled();

      deliver(late);
      await sceneStarted();

      expect(late.setFilmHeld).toHaveBeenCalledOnceWith(true);
    });

    it("holds the film in a scene that arrives after the closer look was opened", async () => {
      let deliver!: (view: GalleryView) => void;
      await open();
      const late = jasmine.createSpyObj<GalleryView>("GalleryView", ["setProgress", "jumpTo", "setPointer", "resize", "setPaused", "setFilmHeld", "post", "dispose"]);
      factory.and.returnValue(new Promise<GalleryView>((resolve) => (deliver = resolve)));
      fixture.destroy();
      element.remove();

      fixture = TestBed.createComponent(GalleryComponent);
      element = fixture.nativeElement;
      document.body.appendChild(element);
      fixture.detectChanges();
      await fixture.whenStable();
      await sceneStarted();
      element.querySelector<HTMLButtonElement>('[data-stop="3"] .view-switch')!.click();
      fixture.detectChanges();
      await fixture.whenStable();

      deliver(late);
      await sceneStarted();

      expect(late.setFilmHeld).toHaveBeenCalledOnceWith(true);
      element.querySelector("dialog")!.close();
    });

    it("withdraws the control when the scene says the film cannot be played", async () => {
      await open();
      expect(control()).not.toBeNull();

      options!.onFilmLost();
      fixture.detectChanges();

      expect(control()).toBeNull();
      expect(element.querySelector('[data-stop="3"] .label-foot .view-switch')).not.toBeNull();
    });

    it("offers the control for the one film the scene plays, not for a second work's", async () => {
      const film = { src: "assets/works/other.webm", description: "Another film." };
      const works = WORKS.map((work, index): Work => (index === 1 ? { ...work, film } : work));
      collection = works;
      await open();

      expect(element.querySelectorAll(".film-toggle").length).toBe(1);
      expect(element.querySelector('[data-stop="3"] .film-toggle')).not.toBeNull();
    });

    it("plays nothing and offers no control to a visitor who asked for less motion", async () => {
      environment.reducedMotion = true;
      await open();

      expect(options?.films).toBeFalse();
      expect(control()).toBeNull();
      expect(element.querySelector('[data-stop="3"] .label-foot .view-switch')).not.toBeNull();
    });

    it("plays nothing and offers no control to a visitor saving data", async () => {
      environment.dataSaver = true;
      await open();

      expect(options?.films).toBeFalse();
      expect(options?.reducedMotion).toBeFalse();
      expect(control()).toBeNull();
    });

    it("offers no control when no work has a film", async () => {
      const works = WORKS.map((work): Work => ({ ...work, film: undefined }));
      collection = works;
      await open();

      expect(options?.films).toBeTrue();
      expect(options?.works.every((work) => work.film === undefined)).toBeTrue();
      expect(control()).toBeNull();
    });
  });

  describe("reduced motion", () => {
    beforeEach(() => {
      environment.reducedMotion = true;
      return open();
    });

    it("tells the scene and cuts instead of smooth scrolling", () => {
      expect(options?.reducedMotion).toBeTrue();

      press("ArrowDown");

      expect(scrollTo.calls.mostRecent().args[0].behavior).toBe("instant");
    });

    it("never glides the camera from scrolling", () => {
      window.dispatchEvent(new Event("scroll"));

      expect(scene.setProgress).not.toHaveBeenCalled();
    });
  });
});
