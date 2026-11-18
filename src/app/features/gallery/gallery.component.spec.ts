import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { PlaceService } from "../../core/place/place.service";
import { ViewEnvironment } from "../../core/view-mode/view-environment";
import { ViewModeService } from "../../core/view-mode/view-mode.service";
import { EmailService } from "../../services/email.service";
import { LetterComponent } from "../../shared/letter/letter.component";
import { FakeViewEnvironment } from "../../testing/fake-view-environment";
import { GALLERY_SCENE_FACTORY } from "./gallery-scene.factory";
import { GalleryComponent } from "./gallery.component";
import { GallerySceneFactory, GalleryView, GalleryViewOptions } from "./scene/gallery-view";

/** Lets the first paint, the deferred scene start and its promise all run. */
function sceneStarted(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(() => setTimeout(resolve, 0), 0)));
}

describe("GalleryComponent", () => {
  let fixture: ComponentFixture<GalleryComponent>;
  let element: HTMLElement;
  let environment: FakeViewEnvironment;
  let scene: jasmine.SpyObj<GalleryView>;
  let factory: jasmine.Spy<GallerySceneFactory>;
  let options: GalleryViewOptions | undefined;
  let scrollTo: jasmine.Spy;

  async function open(sceneFails = false): Promise<void> {
    scene = jasmine.createSpyObj<GalleryView>("GalleryView", ["setProgress", "jumpTo", "setPointer", "resize", "setPaused", "post", "dispose"]);
    factory = jasmine.createSpy("factory").and.callFake((_canvas: HTMLCanvasElement, received: GalleryViewOptions) => {
      options = received;
      return sceneFails ? Promise.reject(new Error("no WebGL")) : Promise.resolve(scene);
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ViewEnvironment, useValue: environment },
        { provide: GALLERY_SCENE_FACTORY, useValue: factory },
        { provide: EmailService, useValue: jasmine.createSpyObj<EmailService>("EmailService", ["sendContactEmail"]) },
      ],
    });
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

  beforeEach(() => {
    environment = new FakeViewEnvironment();
    options = undefined;
    history.replaceState(null, "", location.pathname);
    window.scrollTo({ top: 0, behavior: "instant" });
    scrollTo = spyOn(window, "scrollTo");
  });

  afterEach(() => {
    fixture.destroy();
    element.remove();
    history.replaceState(null, "", location.pathname);
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
        "Visitors' Book",
        "Write to me",
      ]);
    });

    it("hides the canvas from assistive technology", () => {
      expect(element.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("writes the tech frieze as text in Room I as well as on the wall", () => {
      const room = element.querySelector('[data-stop="1"]')!;

      for (const material of ["Angular", "TypeScript", "Spring Boot", "Docker"]) {
        expect(room.textContent).toContain(material);
      }
    });

    it("summarises the wall and offers a jump to each work", () => {
      const room = element.querySelector('[data-stop="2"]')!;

      expect(room.textContent).toContain("One commission and two studies hang on this wall.");
      expect(Array.from(room.querySelectorAll("button")).map((button) => button.textContent!.replace(/\s+/g, " ").replace(" ,", ",").trim())).toEqual([
        "Küchenschelle, Commission",
        "WheelWallet, Study",
        "ReLoo, Study",
      ]);
    });

    it("gives every work a closer look and only the commission a live link", () => {
      const closer = Array.from(element.querySelectorAll("button")).filter((button) => button.textContent?.trim() === "Closer look");

      expect(closer.length).toBe(3);
      expect(Array.from(element.querySelectorAll("app-wall-label a")).map((link) => link.getAttribute("href"))).toEqual([
        "https://kuechenschelle.at",
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
      ]);
      expect(options?.works[1].images[0].portrait).toBeTrue();
      expect(options?.frieze).toContain("Angular");
      expect(options?.visitors).toEqual(["Polyoint AG", "Eurotours"]);
      expect(options?.assets.lionModel).toMatch(/\.glb$/);
      expect(options?.reducedMotion).toBeFalse();
      expect(scene.resize).toHaveBeenCalled();
      expect(scene.jumpTo).toHaveBeenCalledTimes(1);
      expect(scene.jumpTo.calls.mostRecent().args[0]).toBeCloseTo(0, 2);
    });

    it("is given the storeys of Room I's drawing, from the roof down", async () => {
      await open();

      expect(options?.anatomy.length).toBe(4);
      expect(options?.anatomy[0].tools).toContain("Angular");
      expect(options?.anatomy[2].tools).toEqual(["PostgreSQL"]);
      expect(options?.anatomy.every((storey) => storey.caption.length > 0 && storey.tools.length > 0)).toBeTrue();
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

    for (const selector of ["#letter-message", "#letter-name", "app-floor-plan button", ".wordmark", "app-wall-label a"]) {
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
