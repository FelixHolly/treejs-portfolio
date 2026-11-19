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
    scene = jasmine.createSpyObj<GalleryView>("GalleryView", ["setProgress", "jumpTo", "setPointer", "pointAt", "pointAway", "click", "resize", "setPaused", "setFilmHeld", "post", "dispose"]);
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
        "Skills",
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

    it("makes Room I's first label the about text: greeting, bio, where the developer is based", () => {
      const label = element.querySelector('[data-stop="1"] [data-label]')!;

      expect(label.querySelector("h3")?.textContent?.trim()).toBe(DEVELOPER.greeting);
      for (const paragraph of DEVELOPER.bio) expect(label.textContent).toContain(paragraph);
      expect(label.textContent).toContain(DEVELOPER.location);
      expect(label.textContent).toContain(DEVELOPER.viennaLine);
    });

    it("leaves the skills to their own stop: the about label has no line listing the stack", () => {
      const label = element.querySelector('[data-stop="1"] [data-label]')!;
      const bio = DEVELOPER.bio.join(" ");

      for (const tool of DEVELOPER.skills.flatMap((group) => [...group.tools]).filter((tool) => !bio.includes(tool))) {
        expect(label.textContent).withContext(tool).not.toContain(tool);
      }
      expect(Array.from(label.querySelectorAll("p")).some((line) => line.textContent!.includes("TypeScript"))).toBeFalse();
    });

    it("ends the about label with the way on to the skills, named by their own title and not the room's", () => {
      const controls = element.querySelectorAll('[data-stop="1"] [data-label] *');
      const last = controls[controls.length - 1].closest("button");

      expect(last?.classList.contains("onward")).toBeTrue();
      expect(last?.textContent?.trim()).toBe("Continue to Skills");
    });

    it("keeps the skills label short: a heading, one sentence and the way on to Room II", () => {
      const label = element.querySelector('[data-stop="2"] [data-label]')!;
      const seen = Array.from(label.children).filter((child) => !child.classList.contains("sr-only"));

      expect(label.querySelector("app-room-label")).toBeNull();
      expect(seen.map((child) => child.tagName)).toEqual(["H3", "P", "DIV"]);
      expect(label.querySelector("h3")?.textContent?.trim()).toBe("Skills");
      expect(label.querySelector("p")?.textContent?.trim()).toBe(
        "The tools behind the works in the next room, grouped by where they sit in an application.",
      );
      expect(label.querySelector(".onward")?.textContent?.trim()).toBe("Continue to Room II, The Works");
    });

    it("lists the four groups and their tools in the skills label for those who cannot see the wall", () => {
      const hidden = element.querySelector('[data-stop="2"] [data-label] .sr-only')!;
      const groups = Array.from(hidden.querySelectorAll(":scope > ul > li"));

      expect(groups.length).toBe(4);
      expect(groups.map((group) => group.firstChild?.textContent?.trim())).toEqual(DEVELOPER.skills.map((group) => group.area));
      expect(groups.map((group) => Array.from(group.querySelectorAll("ul > li")).map((tool) => tool.textContent!.trim()))).toEqual(
        DEVELOPER.skills.map((group) => [...group.tools]),
      );
      expect(hidden.closest("[aria-hidden]")).toBeNull();
    });

    it("says nothing else about the tools where the wall can be seen", () => {
      const label = element.querySelector('[data-stop="2"] [data-label]')!;
      const seen = Array.from(label.children)
        .filter((child) => !child.classList.contains("sr-only"))
        .map((child) => child.textContent)
        .join(" ");

      for (const tool of DEVELOPER.skills.flatMap((group) => [...group.tools])) expect(seen).withContext(tool).not.toContain(tool);
    });

    it("summarises the wall and offers a jump to each work", () => {
      const room = element.querySelector('[data-stop="3"]')!;

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
        "Continue to Skills",
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
      const foot = element.querySelector('[data-stop="5"] .label-foot')!;

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
    it("is started after the first paint with the collection and assets", async () => {
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
      expect(options?.portrait).toBe(DEVELOPER.portrait.src);
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

    it("is given one skill area for each plaque on Room I's wall, none with more tools than a plaque has lines", async () => {
      await open();

      expect(options?.skills.length).toBe(SKILL_PLAQUES.count);
      expect(options?.skills).toBe(DEVELOPER.skills);
      expect(options?.skills.map((group) => group.area)).toEqual(["Frontend", "Backend", "Data and operations", "Quality"]);
      expect(options?.skills[0].tools).toEqual(["Angular", "TypeScript", "RxJS", "NgRx Signals", "SCSS and Tailwind", "Three.js"]);
      expect(Math.max(...(options?.skills ?? []).map((group) => group.tools.length))).toBe(SKILL_PLAQUES.lines);
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
      element.querySelector<HTMLButtonElement>('[data-stop="4"] .view-switch')!.click();
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
      element.querySelectorAll<HTMLButtonElement>('[data-stop="3"] button')[2].click();

      expect(document.activeElement?.textContent?.trim()).toBe("ReLoo");
    });

    it("walks on from a label's foot to the next stop, focuses its heading and leaves a history entry", () => {
      element.querySelector<HTMLButtonElement>('[data-stop="1"] .onward')!.click();

      expect(scrollTo.calls.mostRecent().args[0].top).toBeGreaterThan(0);
      expect(scrollTo.calls.mostRecent().args[0].behavior).toBe("smooth");
      expect(document.activeElement?.textContent?.trim()).toBe("Skills");
      expect(location.hash).toBe("#developer/skills");
    });

    it("walks on from the skills into Room II", () => {
      element.querySelector<HTMLButtonElement>('[data-stop="2"] .onward')!.click();

      expect(document.activeElement?.textContent?.trim()).toBe("The Works");
      expect(location.hash).toBe("#works");
    });

    it("walks to the skills when their address is typed, and to the portrait from the floor plan's Room I", () => {
      history.replaceState(null, "", "#developer/skills");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      const skills = scrollTo.calls.mostRecent().args[0].top;

      element.querySelectorAll<HTMLButtonElement>("app-floor-plan button")[1].click();

      expect(skills).toBeGreaterThan(0);
      expect(scrollTo.calls.mostRecent().args[0].top).toBeLessThan(skills);
      expect(document.activeElement?.textContent?.trim()).toBe("The Developer");
    });

    it("stays in Room I at the skills: the plan and the caption keep the room, the live region adds the stop", () => {
      arriveAt(2);

      expect(element.querySelector("app-floor-plan [aria-current]")?.textContent).toContain("Room I, The Developer");
      expect(element.querySelector("app-floor-plan .caption")?.textContent?.trim()).toBe("Room I · The Developer");
      expect(element.querySelector("[aria-live]")?.textContent?.trim()).toBe("Room I, The Developer, Skills");
      expect(TestBed.inject(PlaceService).current()).toBe("developer/skills");
      expect(location.hash).toBe("#developer/skills");
    });

    it("walks on from the last work into Room III", () => {
      element.querySelector<HTMLButtonElement>('[data-stop="7"] .onward')!.click();

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

      arriveAt(8);
      expect(element.querySelector(".hud .to-letter")).not.toBeNull();

      arriveAt(9);
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
      element.querySelector<HTMLElement>('[data-stop="8"]')!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

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
      const stop = element.querySelector('[data-stop="7"]')!;

      expect(stop.querySelector("h3")?.textContent?.trim()).toBe("This Gallery");
      expect(stop.querySelector(".room-number")?.textContent?.trim()).toBe("Self-portrait");
      expect(stop.classList.contains("stop--hop")).toBeTrue();
      expect(element.querySelector('[data-stop="8"] h2')?.textContent?.trim()).toBe("Visitors' Book");
    });

    it("fits on the wall of Room II with the works before it, a metre short of the wall to Room III", () => {
      const slots = pieceSlots(options!.works);
      const last = slots[slots.length - 1];

      expect(last.slug).toBe("this-gallery");
      expect(last.centre.x + last.span / 2).toBeLessThan(DOOR_XS[2] - WALL_THICKNESS / 2 - 1);
    });

    it("links to its code and not to a live site, since the visitor is standing in it", () => {
      const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('[data-stop="7"] a'));

      expect(links.length).toBe(1);
      expect(links[0].textContent).toContain("View the code");
      expect(links[0].getAttribute("href")).toBe("https://github.com/FelixHolly/treejs-portfolio");
      expect(links[0].target).toBe("_blank");
      expect(links[0].rel).toContain("noopener");
    });

    it("is walked to from the Room II list, which leaves its own address behind for Back", () => {
      element.querySelectorAll<HTMLButtonElement>('[data-stop="3"] button')[3].click();

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
      fixture.componentInstance.activeIndex.set(7);
      fixture.detectChanges();

      expect(element.querySelector("app-floor-plan [aria-current]")?.textContent).toContain("Room II, The Works");
      expect(element.querySelector("[aria-live]")?.textContent?.trim()).toBe("Room II, The Works");
      expect(element.querySelector(".stop--active h3")?.textContent?.trim()).toBe("This Gallery");
    });

    it("opens a closer look at its three pictures, each described", async () => {
      element.querySelector<HTMLButtonElement>('[data-stop="7"] .view-switch')!.click();
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
      return element.querySelector('[data-stop="3"] .grid-subtext')?.textContent?.trim();
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
        expect(element.querySelectorAll('[data-stop="3"] li').length).toBe(works.length);
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
      expect(document.title).toBe("Skills - Felix Hollndonner");

      arriveAt(3);
      expect(document.title).toBe("The Works - Felix Hollndonner");

      arriveAt(4);
      expect(document.title).toBe("Küchenschelle - Felix Hollndonner");

      arriveAt(9);
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

    it("opens at the skills when their address is the one shared", async () => {
      history.replaceState(null, "", "#developer/skills");

      await open();

      expect(scrollTo).toHaveBeenCalledTimes(1);
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
        const foot = element.querySelector('[data-stop="4"] .label-foot')!;

        expect(Array.from(foot.querySelectorAll("button")).map((button) => button.textContent!.trim())).toEqual([
          "Closer look",
          "Pause the film",
          "Next: WheelWallet",
        ]);
      });

      it("offers it only for the work that has a film", () => {
        expect(element.querySelectorAll(".film-toggle").length).toBe(1);
        for (const stop of [5, 6, 7]) {
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
        element.querySelector<HTMLButtonElement>('[data-stop="4"] .view-switch')!.click();
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
        element.querySelector<HTMLButtonElement>('[data-stop="4"] .view-switch')!.click();
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
      const late = jasmine.createSpyObj<GalleryView>("GalleryView", ["setProgress", "jumpTo", "setPointer", "pointAt", "pointAway", "click", "resize", "setPaused", "setFilmHeld", "post", "dispose"]);
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
      const late = jasmine.createSpyObj<GalleryView>("GalleryView", ["setProgress", "jumpTo", "setPointer", "pointAt", "pointAway", "click", "resize", "setPaused", "setFilmHeld", "post", "dispose"]);
      factory.and.returnValue(new Promise<GalleryView>((resolve) => (deliver = resolve)));
      fixture.destroy();
      element.remove();

      fixture = TestBed.createComponent(GalleryComponent);
      element = fixture.nativeElement;
      document.body.appendChild(element);
      fixture.detectChanges();
      await fixture.whenStable();
      await sceneStarted();
      element.querySelector<HTMLButtonElement>('[data-stop="4"] .view-switch')!.click();
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
      expect(element.querySelector('[data-stop="4"] .label-foot .view-switch')).not.toBeNull();
    });

    it("offers the control for the one film the scene plays, not for a second work's", async () => {
      const film = { src: "assets/works/other.webm", description: "Another film." };
      const works = WORKS.map((work, index): Work => (index === 1 ? { ...work, film } : work));
      collection = works;
      await open();

      expect(element.querySelectorAll(".film-toggle").length).toBe(1);
      expect(element.querySelector('[data-stop="4"] .film-toggle')).not.toBeNull();
    });

    it("plays nothing and offers no control to a visitor who asked for less motion", async () => {
      environment.reducedMotion = true;
      await open();

      expect(options?.films).toBeFalse();
      expect(control()).toBeNull();
      expect(element.querySelector('[data-stop="4"] .label-foot .view-switch')).not.toBeNull();
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

  describe("pointing at a piece with the mouse", () => {
    beforeEach(() => open());

    const main = () => element.querySelector("main")!;
    const labelText = (stop: number) => element.querySelector(`[data-stop="${stop}"] [data-label] p`)!;
    const dialog = () => element.querySelector("dialog")!;

    function mouse(type: string, target: Element, at: [number, number] = [200, 150], pointerType = "mouse"): void {
      target.dispatchEvent(new PointerEvent(type, { pointerType, bubbles: true, button: 0, clientX: at[0], clientY: at[1] }));
    }

    function clickAt(target: Element, at: [number, number] = [200, 150], pointerType = "mouse"): void {
      mouse("pointerdown", target, at, pointerType);
      mouse("click", target, at, pointerType);
    }

    function pointed(stop: number | null): void {
      options!.onPointed(stop);
      fixture.detectChanges();
    }

    async function chosen(stop: number): Promise<void> {
      options!.onChosen(stop);
      fixture.detectChanges();
      await fixture.whenStable();
    }

    it("tells the scene where the mouse is while it is over the bare scene", () => {
      const width = document.documentElement.clientWidth;

      mouse("pointermove", main(), [width / 4, window.innerHeight / 2]);

      expect(scene.pointAt).toHaveBeenCalledOnceWith(-0.5, 0);
      expect(scene.pointAway).not.toHaveBeenCalled();
    });

    it("counts the empty stretch of a stop and the canvas itself as the scene", () => {
      mouse("pointermove", element.querySelector('[data-stop="3"]')!);
      mouse("pointermove", element.querySelector("canvas")!);

      expect(scene.pointAt).toHaveBeenCalledTimes(2);
    });

    it("points away once the mouse is over a label's text, a control or the header", () => {
      for (const target of [labelText(1), element.querySelector(".plaque")!, element.querySelector(".wordmark")!, element.querySelector("h1")!]) {
        scene.pointAway.calls.reset();
        mouse("pointermove", target);

        expect(scene.pointAway).withContext(target.className || target.tagName).toHaveBeenCalledTimes(1);
      }
      expect(scene.pointAt).not.toHaveBeenCalled();
    });

    it("points away when the mouse leaves the window", () => {
      document.documentElement.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));

      expect(scene.pointAway).toHaveBeenCalledTimes(1);
    });

    it("ignores touch altogether", () => {
      mouse("pointermove", main(), [200, 150], "touch");
      clickAt(main(), [200, 150], "touch");

      expect(scene.pointAt).not.toHaveBeenCalled();
      expect(scene.pointAway).not.toHaveBeenCalled();
      expect(scene.click).not.toHaveBeenCalled();
    });

    it("shows a pointer cursor while the scene reports a piece under the mouse, and the usual one otherwise", () => {
      expect(element.classList.contains("cursor-pointer")).toBeFalse();

      pointed(6);
      expect(element.classList.contains("cursor-pointer")).toBeTrue();

      pointed(null);
      expect(element.classList.contains("cursor-pointer")).toBeFalse();
    });

    it("shows the same cursor over the piece the visitor already stands at", () => {
      arriveAt(1);
      pointed(1);

      expect(element.classList.contains("cursor-pointer")).toBeTrue();
    });

    it("keeps the canvas out of the way of assistive technology and the Tab key", () => {
      const canvas = element.querySelector("canvas")!;

      expect(canvas.getAttribute("aria-hidden")).toBe("true");
      expect(canvas.hasAttribute("tabindex")).toBeFalse();
      expect(canvas.getAttribute("role")).toBeNull();
    });

    it("passes a click on the bare scene to the scene, at the place it happened", () => {
      const width = document.documentElement.clientWidth;

      clickAt(main(), [width * 0.75, window.innerHeight * 0.25]);

      // A click happens at whole pixels
      expect(scene.click).toHaveBeenCalledTimes(1);
      expect(scene.click.calls.mostRecent().args[0]).toBeCloseTo(0.5, 2);
      expect(scene.click.calls.mostRecent().args[1]).toBeCloseTo(-0.5, 2);
    });

    it("leaves clicks on labels, their controls and the header to them", () => {
      clickAt(labelText(1));
      clickAt(element.querySelector(".wordmark")!);
      element.querySelector<HTMLButtonElement>('[data-stop="3"] .work-list button')!.click();

      expect(scene.click).not.toHaveBeenCalled();
    });

    it("does not take the end of a text selection for a click: a press that began in a label, or travelled", () => {
      mouse("pointerdown", labelText(1), [600, 300]);
      mouse("click", main(), [400, 300]);

      mouse("pointerdown", main(), [400, 300]);
      mouse("click", main(), [440, 300]);

      expect(scene.click).not.toHaveBeenCalled();
    });

    it("needs a fresh press for every click", () => {
      mouse("pointerdown", main());
      mouse("click", main());
      mouse("click", main());

      expect(scene.click).toHaveBeenCalledTimes(1);
    });

    it("walks to a chosen piece exactly as the controls do: the scroll, the heading's focus and a history entry", async () => {
      arriveAt(3);
      scrollTo.calls.reset();

      await chosen(6);

      expect(scrollTo).toHaveBeenCalled();
      expect(scrollTo.calls.mostRecent().args[0].behavior).toBe("smooth");
      expect(document.activeElement).toBe(element.querySelector('[data-stop="6"] h3'));
      expect(location.hash).toBe("#works/reloo");
      expect(dialog().open).toBeFalse();
    });

    it("walks to the skills when their plaques are chosen from the portrait", async () => {
      arriveAt(1);
      scrollTo.calls.reset();

      await chosen(2);

      expect(scrollTo).toHaveBeenCalled();
      expect(document.activeElement).toBe(element.querySelector('[data-stop="2"] h3'));
    });

    it("opens the closer look when the visitor already stands at the chosen work, with focus on its close button", async () => {
      arriveAt(4);
      scrollTo.calls.reset();

      await chosen(4);

      expect(dialog().open).toBeTrue();
      expect(dialog().querySelector("h2")?.textContent?.trim()).toBe("Küchenschelle");
      expect(document.activeElement?.closest("dialog")).toBe(dialog());
      expect(document.activeElement?.tagName).toBe("BUTTON");
      expect(scrollTo).not.toHaveBeenCalled();
      expect(scene.pointAway).toHaveBeenCalled();

      dialog().close();
    });

    it("opens no closer look for a work the visitor is not standing at", async () => {
      arriveAt(4);

      await chosen(5);

      expect(dialog().open).toBeFalse();
      expect(document.activeElement).toBe(element.querySelector('[data-stop="5"] h3'));
    });

    it("does nothing when a piece without a closer look is chosen from its own stop", async () => {
      arriveAt(2);
      scrollTo.calls.reset();

      await chosen(2);

      expect(scrollTo).not.toHaveBeenCalled();
      expect(dialog().open).toBeFalse();
    });

    it("enters the gallery when the statue is chosen at the entrance, and walks back to it from anywhere else", async () => {
      await chosen(0);
      expect(document.activeElement).toBe(element.querySelector('[data-stop="1"] h2'));

      arriveAt(1);
      scrollTo.calls.reset();
      await chosen(0);

      expect(scrollTo.calls.mostRecent().args[0].top).toBe(0);
      expect(document.activeElement).toBe(element.querySelector('[data-stop="0"] h1'));
    });

    it("ignores a stop the route does not have", async () => {
      await chosen(99);

      expect(scrollTo).not.toHaveBeenCalled();
    });

    describe("while the closer look is open", () => {
      beforeEach(async () => {
        arriveAt(4);
        element.querySelector<HTMLButtonElement>('[data-stop="4"] .view-switch')!.click();
        fixture.detectChanges();
        await fixture.whenStable();
        scrollTo.calls.reset();
        scene.pointAway.calls.reset();
      });

      afterEach(() => dialog().close());

      it("points at nothing and passes no click on", () => {
        mouse("pointermove", main());
        clickAt(main());

        expect(scene.pointAt).not.toHaveBeenCalled();
        expect(scene.pointAway).toHaveBeenCalledTimes(1);
        expect(scene.click).not.toHaveBeenCalled();
      });

      it("ignores a piece the scene still reports as chosen", async () => {
        await chosen(6);
        await chosen(4);

        expect(scrollTo).not.toHaveBeenCalled();
        expect(dialog().querySelector("h2")?.textContent?.trim()).toBe("Küchenschelle");
      });
    });
  });

  describe("a room's title over the walk", () => {
    const card = () => element.querySelector<HTMLElement>("app-room-title")!;
    const lettering = () => [card().querySelector(".numeral")?.textContent, card().querySelector(".name")?.textContent];
    const shown = () => card().classList.contains("shown");
    const labelsShowing = () => element.querySelectorAll(".stop--active").length;

    /** Reports the scroll position `share` of the way from one stop's label to the next one's, as `arriveAt` does for a stop. */
    function stride(from: number, share: number): void {
      const box = (index: number) => element.querySelector(`[data-stop="${index}"] [data-label]`)!.getBoundingClientRect();
      const left = from === 0 ? 0 : box(from).bottom - 0.4 * window.innerHeight;
      const reached = box(from + 1).top - 0.6 * window.innerHeight;
      scrollY ??= spyOnProperty(window, "scrollY");
      scrollY.and.returnValue(left + (reached - left) * share);
      window.dispatchEvent(new Event("scroll"));
      fixture.detectChanges();
    }

    function wait(ms: number): void {
      jasmine.clock().tick(ms);
      fixture.detectChanges();
    }

    describe("for a visitor who walks", () => {
      beforeEach(async () => {
        await open();
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date(2026, 0, 1));
      });

      afterEach(() => jasmine.clock().uninstall());

      it("lies over the scene and under the header, out of reach of assistive technology, the Tab key and the mouse", () => {
        expect(card().getAttribute("aria-hidden")).toBe("true");
        expect(card().querySelector("a, button, [tabindex]")).toBeNull();
        expect(getComputedStyle(card()).pointerEvents).toBe("none");
        expect(Number(getComputedStyle(card()).zIndex)).toBeLessThan(Number(getComputedStyle(element.querySelector(".hud")!).zIndex));
        expect(shown()).toBeFalse();
      });

      it("shows Room II's on the walk from the skills, with no label beside it, and has gone before the label comes", () => {
        arriveAt(2);
        expect(shown()).toBeFalse();
        expect(labelsShowing()).toBe(1);

        stride(2, 0.2);
        expect(shown()).toBeFalse();

        stride(2, 0.5);
        expect(shown()).toBeTrue();
        expect(lettering()).toEqual(["II", "The Works"]);
        expect(labelsShowing()).toBe(0);

        wait(2000);
        arriveAt(3);
        expect(shown()).toBeFalse();
        expect(element.querySelector(".stop--active")?.getAttribute("data-stop")).toBe("3");
      });

      it("shows the room walked back into", () => {
        arriveAt(3);
        stride(2, 0.5);

        expect(shown()).toBeTrue();
        expect(lettering()).toEqual(["I", "The Developer"]);
      });

      it("shows nothing between the stops of one room, nor on the way back into the hall", () => {
        arriveAt(1);
        stride(1, 0.5);
        expect(shown()).toBeFalse();
        expect(labelsShowing()).toBe(1);

        arriveAt(1);
        stride(0, 0.5);
        expect(shown()).toBeFalse();
      });

      it("on a jump across the rooms holds every label from the start, and titles only the room the jump ends in", () => {
        const last = fixture.componentInstance.last;
        element.querySelector<HTMLButtonElement>(".to-letter")!.click();
        fixture.detectChanges();
        const letter = element.querySelector<HTMLElement>(`[data-stop="${last}"] [data-label]`)!;

        expect(labelsShowing()).toBe(0);
        // The letter's heading took the focus as the walk set off, which alone would show its label
        expect(letter.contains(document.activeElement)).toBeTrue();
        expect(getComputedStyle(letter).opacity).toBe("0");
        expect(getComputedStyle(letter).pointerEvents).toBe("none");

        for (let from = 0; from < last - 1; from++) {
          stride(from, 0.5);
          expect(shown()).withContext(`stride ${from}`).toBeFalse();
        }
        stride(last - 1, 0.5);
        expect(lettering()).toEqual(["IV", "Correspondence"]);
        expect(shown()).toBeTrue();

        arriveAt(last);
        expect(shown()).toBeTrue();
        expect(labelsShowing()).toBe(0);

        wait(1700);
        expect(shown()).toBeTrue();
        expect(labelsShowing()).toBe(0);
        expect(getComputedStyle(letter).opacity).toBe("0");

        wait(100);
        expect(shown()).toBeFalse();
        expect(labelsShowing()).toBe(1);
        expect(letter.classList.contains("!opacity-0")).toBeFalse();
        expect(letter.contains(document.activeElement)).toBeTrue();
      });

      it("lets the labels show again when a jump is broken off on the way", () => {
        element.querySelector<HTMLButtonElement>(".to-letter")!.click();
        arriveAt(4);
        expect(labelsShowing()).toBe(0);

        window.dispatchEvent(new Event("scrollend"));
        fixture.detectChanges();
        expect(shown()).toBeFalse();
        expect(element.querySelector(".stop--active")?.getAttribute("data-stop")).toBe("4");
      });
    });

    it("is not shown on arriving at an address deep in the gallery", async () => {
      history.replaceState(null, "", "#visitors-book");
      scrollTo.and.callThrough();

      await open();

      expect(fixture.componentInstance.activeIndex()).toBe(fixture.componentInstance.last - 1);
      expect(shown()).toBeFalse();
      expect(card().textContent?.trim()).toBe("");
      expect(labelsShowing()).toBe(1);
    });

    it("is left out for a visitor who asked for less motion: the page cuts straight to the stop and its label", async () => {
      environment.reducedMotion = true;
      await open();
      jasmine.clock().install();

      arriveAt(2);
      stride(2, 0.45);
      expect(shown()).toBeFalse();
      stride(2, 0.6);
      expect(shown()).toBeFalse();
      expect(labelsShowing()).toBe(1);

      element.querySelector<HTMLButtonElement>(".to-letter")!.click();
      fixture.detectChanges();
      expect(labelsShowing()).toBe(1);
      arriveAt(fixture.componentInstance.last);
      wait(2000);
      jasmine.clock().uninstall();

      expect(shown()).toBeFalse();
      expect(card().textContent?.trim()).toBe("");
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
