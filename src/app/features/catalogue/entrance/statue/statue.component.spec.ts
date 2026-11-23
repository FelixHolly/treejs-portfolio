import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ViewEnvironment } from "../../../../core/view-mode/view-environment";
import { FakeViewEnvironment } from "../../../../core/view-mode/fake-view-environment";
import { HERO_SCENE_FACTORY } from "./hero-scene.factory";
import { HeroSceneFactory, HeroView, HeroViewOptions } from "./scene/hero-view";
import { StatueComponent } from "./statue.component";

/** The statue as the entrance holds it: in a band of its own, under something as tall as the name. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatueComponent],
  template: `
    <div style="height: 120px"></div>
    <app-entrance-statue style="display: block; height: 400px; --lion: 300px" />
  `,
})
class EntranceStandInComponent {}

describe("StatueComponent", () => {
  let fixture: ComponentFixture<EntranceStandInComponent>;
  let element: HTMLElement;
  let environment: FakeViewEnvironment;
  let scene: jasmine.SpyObj<HeroView>;
  let factory: jasmine.Spy<HeroSceneFactory>;
  let options: HeroViewOptions | undefined;
  /** What the factory hands back; a spec may replace it to make the scene late, or fail. */
  let make: () => Promise<HeroView>;
  let sighted: IntersectionObserverCallback | undefined;
  let sight: jasmine.SpyObj<IntersectionObserver>;
  let resized: ResizeObserverCallback | undefined;
  let sizes: jasmine.SpyObj<ResizeObserver>;
  let idle: IdleRequestCallback | undefined;
  let cancelIdle: jasmine.Spy;

  const canvas = () => element.querySelector("canvas");
  const picture = () => element.querySelector("picture");
  const band = () => element.querySelector<HTMLElement>("app-entrance-statue")!;
  /** How far the page must scroll, having scrolled `already`, for the band to have left the window. */
  const reach = (already = 0) => band().getBoundingClientRect().bottom + already;
  /** How far down the canvas the band begins: the ceiling the dust is kept under. */
  const ceiling = () => (band().getBoundingClientRect().top - canvas()!.getBoundingClientRect().top) / canvas()!.getBoundingClientRect().height;
  const flush = () => new Promise((resolve) => setTimeout(resolve));

  /** The statue's band scrolls into or out of view. */
  function see(visible: boolean): void {
    sighted!([{ isIntersecting: visible } as IntersectionObserverEntry], sight);
  }

  /** The browser has a moment to spare. */
  function settle(): void {
    idle!({ didTimeout: false, timeRemaining: () => 40 });
  }

  function render(): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: ViewEnvironment, useValue: environment },
        { provide: HERO_SCENE_FACTORY, useValue: factory },
      ],
    });
    fixture = TestBed.createComponent(EntranceStandInComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  }

  async function comeAlive(): Promise<void> {
    render();
    await fixture.whenStable();
    see(true);
    settle();
    await flush();
    fixture.detectChanges();
  }

  function scrollTo(y: number): void {
    scrollY.and.returnValue(y);
    window.dispatchEvent(new Event("scroll"));
  }

  function movePointer(clientX: number, clientY: number, pointerType = "mouse"): void {
    window.dispatchEvent(new PointerEvent("pointermove", { pointerType, clientX, clientY }));
  }

  let scrollY: jasmine.Spy;
  let hidden: jasmine.Spy;

  function hideTab(isHidden: boolean): void {
    hidden.and.returnValue(isHidden);
    document.dispatchEvent(new Event("visibilitychange"));
  }

  beforeEach(() => {
    environment = new FakeViewEnvironment();
    options = undefined;
    sighted = resized = idle = undefined;
    scene = jasmine.createSpyObj<HeroView>("HeroView", ["setPointer", "setScroll", "resize", "setPaused", "dispose"]);
    make = () => Promise.resolve(scene);
    factory = jasmine.createSpy("factory").and.callFake((_canvas: HTMLCanvasElement, received: HeroViewOptions) => {
      options = received;
      return make();
    });

    sight = jasmine.createSpyObj<IntersectionObserver>("IntersectionObserver", ["observe", "disconnect"]);
    spyOn(window, "IntersectionObserver").and.callFake(function (callback: IntersectionObserverCallback) {
      sighted = callback;
      return sight;
    } as never);
    sizes = jasmine.createSpyObj<ResizeObserver>("ResizeObserver", ["observe", "disconnect"]);
    spyOn(window, "ResizeObserver").and.callFake(function (callback: ResizeObserverCallback) {
      resized = callback;
      return sizes;
    } as never);
    spyOn(window, "requestIdleCallback").and.callFake((callback) => {
      idle = callback;
      return 7;
    });
    cancelIdle = spyOn(window, "cancelIdleCallback");
    scrollY = spyOnProperty(window, "scrollY").and.returnValue(0);
    hidden = spyOnProperty(document, "hidden").and.returnValue(false);
  });

  describe("the still picture", () => {
    beforeEach(render);

    it("is in the page from the first render, kept dark until it has loaded", () => {
      expect(picture()).not.toBeNull();
      expect(picture()!.classList.contains("lion--ready")).toBeFalse();

      element.querySelector("img")!.dispatchEvent(new Event("load"));
      fixture.detectChanges();

      expect(picture()!.classList.contains("lion--ready")).toBeTrue();
    });

    it("describes the statue for screen readers, and is fetched ahead of everything below it", () => {
      const img = element.querySelector("img")!;

      expect(img.getAttribute("alt")).toBe("Statue of a Viennese lion, the Vienna Löwe");
      expect(img.getAttribute("fetchpriority")).toBe("high");
      expect(img.getAttribute("loading")).toBe("eager");
    });

    it("offers an upright window a squarer picture, and each window a width that suits it", () => {
      const [upright, wide] = Array.from(element.querySelectorAll("source"));

      expect(upright.media).toBe("(max-aspect-ratio: 1/1)");
      expect(upright.srcset).toBe("assets/lion-hall-tall-800.webp 800w, assets/lion-hall-tall-1200.webp 1200w");
      expect(wide.media).toBe("");
      expect(wide.srcset).toBe("assets/lion-hall-1200.webp 1200w, assets/lion-hall-1800.webp 1800w, assets/lion-hall-2400.webp 2400w");
      expect(upright.sizes).toBeTruthy();
      expect(wide.sizes).toBeTruthy();
    });

    it("is taken away when it cannot be loaded, leaving the band empty", () => {
      element.querySelector("img")!.dispatchEvent(new Event("error"));
      fixture.detectChanges();

      expect(picture()).toBeNull();
      expect(element.querySelector("img")).toBeNull();
    });
  });

  describe("where the statue stays a picture", () => {
    const stills: [string, () => void][] = [
      ["in a browser without WebGL", () => (environment.webgl = false)],
      ["for a visitor who asked for less motion", () => (environment.reducedMotion = true)],
      ["for a visitor who is saving data", () => (environment.dataSaver = true)],
      ["on a device without a mouse, where a download cannot be told from a metered one", () => (environment.finePointer = false)],
    ];

    for (const [where, arrange] of stills) {
      it(`has no canvas and loads no scene ${where}`, async () => {
        arrange();
        render();
        await fixture.whenStable();

        expect(canvas()).toBeNull();
        expect(picture()).not.toBeNull();
        expect(factory).not.toHaveBeenCalled();
        expect(window.IntersectionObserver).not.toHaveBeenCalled();
        expect(window.requestIdleCallback).not.toHaveBeenCalled();
      });
    }
  });

  describe("when the live scene is loaded", () => {
    it("has a canvas waiting, hidden from assistive technology and not yet shown", async () => {
      render();
      await fixture.whenStable();

      expect(canvas()!.getAttribute("aria-hidden")).toBe("true");
      expect(canvas()!.classList.contains("live--on")).toBeFalse();
      expect(factory).not.toHaveBeenCalled();
    });

    it("waits for the browser to fall idle, even with the statue on screen", async () => {
      render();
      await fixture.whenStable();

      see(true);
      expect(factory).not.toHaveBeenCalled();

      settle();
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("gives the browser a few seconds at most to fall idle", async () => {
      render();
      await fixture.whenStable();

      expect(window.requestIdleCallback).toHaveBeenCalledOnceWith(jasmine.any(Function), { timeout: 2500 });
    });

    it("waits for the statue to be on screen, even with the browser idle", async () => {
      render();
      await fixture.whenStable();

      settle();
      see(false);
      expect(factory).not.toHaveBeenCalled();

      see(true);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("waits for the page to have loaded before it asks about idleness at all", async () => {
      const readyState = spyOnProperty(document, "readyState").and.returnValue("interactive");
      render();
      await fixture.whenStable();
      see(true);

      expect(window.requestIdleCallback).not.toHaveBeenCalled();

      readyState.and.returnValue("complete");
      window.dispatchEvent(new Event("load"));
      settle();

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("loads a moment after the page where the browser cannot say when it is idle", () => {
      const spied = window.requestIdleCallback;
      Object.defineProperty(window, "requestIdleCallback", { value: undefined, configurable: true, writable: true });
      jasmine.clock().install();
      try {
        render();
        see(true);
        jasmine.clock().tick(599);
        expect(factory).not.toHaveBeenCalled();

        jasmine.clock().tick(1);

        expect(factory).toHaveBeenCalledTimes(1);
      } finally {
        jasmine.clock().uninstall();
        Object.defineProperty(window, "requestIdleCallback", { value: spied, configurable: true, writable: true });
      }
    });

    it("is given the canvas and where the statue's model and its decoder are", async () => {
      await comeAlive();

      expect(factory).toHaveBeenCalledOnceWith(canvas()!, jasmine.objectContaining({ assets: { dracoPath: "assets/draco/", lionModel: "assets/models/vienna-lowe.glb" } }));
    });

    it("is loaded once, however often the statue leaves the screen and returns", async () => {
      await comeAlive();

      see(false);
      see(true);
      see(false);
      see(true);

      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("the swap", () => {
    it("keeps the picture in front until the scene has drawn the statue, then shows the scene over it", async () => {
      await comeAlive();
      expect(canvas()!.classList.contains("live--on")).toBeFalse();

      options!.onReady();
      fixture.detectChanges();

      expect(canvas()!.classList.contains("live--on")).toBeTrue();
      expect(picture()).not.toBeNull();
    });

    it("tells the scene at once how far the page has scrolled and where the dust's ceiling is", async () => {
      scrollY.and.returnValue(150);

      await comeAlive();

      expect(scene.setScroll).toHaveBeenCalledOnceWith(150 / reach(150));
      expect(scene.resize).toHaveBeenCalledOnceWith(ceiling());
      expect(scene.setPaused).toHaveBeenCalledOnceWith(false);
    });
  });

  describe("falling back to the picture", () => {
    it("takes the canvas away when the scene cannot be made", async () => {
      make = () => Promise.reject(new Error("no WebGL after all"));

      await comeAlive();

      expect(canvas()).toBeNull();
      expect(picture()).not.toBeNull();
    });

    it("takes the scene down and the canvas away when the scene says it is lost", async () => {
      await comeAlive();
      options!.onReady();
      fixture.detectChanges();

      options!.onLost();
      fixture.detectChanges();

      expect(scene.dispose).toHaveBeenCalledTimes(1);
      expect(canvas()).toBeNull();
      expect(picture()).not.toBeNull();
    });

    it("stops listening once the scene is lost", async () => {
      await comeAlive();
      options!.onLost();
      scene.setScroll.calls.reset();
      scene.setPointer.calls.reset();
      scene.setPaused.calls.reset();

      scrollTo(200);
      movePointer(10, 10);
      hideTab(true);

      expect(scene.setScroll).not.toHaveBeenCalled();
      expect(scene.setPointer).not.toHaveBeenCalled();
      expect(scene.setPaused).not.toHaveBeenCalled();
      expect(sight.disconnect).toHaveBeenCalled();
      expect(sizes.disconnect).toHaveBeenCalled();
    });

    it("does not try again when a lost scene's statue comes back on screen", async () => {
      await comeAlive();
      options!.onLost();

      see(false);
      see(true);

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("takes down a scene lost before it was handed over", async () => {
      let hand!: (scene: HeroView) => void;
      make = () => new Promise((resolve) => (hand = resolve));
      await comeAlive();

      options!.onLost();
      hand(scene);
      await flush();

      expect(scene.dispose).toHaveBeenCalledTimes(1);
      expect(scene.setPaused).not.toHaveBeenCalled();
    });
  });

  describe("following the visitor", () => {
    beforeEach(comeAlive);

    it("reports the mouse from -1 at the window's left and top to 1 at its right and bottom", () => {
      movePointer(0, 0);
      expect(scene.setPointer).toHaveBeenCalledWith(-1, -1);

      movePointer(window.innerWidth, window.innerHeight);
      expect(scene.setPointer).toHaveBeenCalledWith(1, 1);

      movePointer(window.innerWidth / 2, window.innerHeight / 4);
      expect(scene.setPointer).toHaveBeenCalledWith(0, -0.5);
    });

    it("leaves a finger or a pen out of it: a touch that scrolls must not swing the statue", () => {
      movePointer(0, 0, "touch");
      movePointer(40, 90, "pen");

      expect(scene.setPointer).not.toHaveBeenCalled();
    });

    it("reports the scroll as a share of the way to where the statue's band has left the window", () => {
      scene.setScroll.calls.reset();
      const whole = reach();

      scrollTo(whole / 2);
      expect(scene.setScroll).toHaveBeenCalledOnceWith(0.5);

      scrollTo(whole * 3);
      expect(scene.setScroll).toHaveBeenCalledWith(1);
    });

    it("re-fits the scene when its canvas or its band changes size, with the dust kept below the band's top", () => {
      scene.resize.calls.reset();
      scene.setScroll.calls.reset();
      scrollY.and.returnValue(100);

      resized!([], sizes);

      expect(sizes.observe).toHaveBeenCalledWith(canvas()!);
      expect(sizes.observe).toHaveBeenCalledWith(band());
      expect(scene.resize).toHaveBeenCalledOnceWith(ceiling());
      expect(scene.setScroll).toHaveBeenCalledOnceWith(100 / reach(100));
    });

    it("lays the picture out with the band's top a good way down it, so there is a ceiling to keep the dust under", () => {
      expect(canvas()!.getBoundingClientRect().height).toBe(600);
      expect(ceiling()).toBeCloseTo(0.69 - 200 / 600, 3);
    });
  });

  describe("resting", () => {
    beforeEach(async () => {
      await comeAlive();
      scene.setPaused.calls.reset();
    });

    it("pauses the scene while the statue is off screen, and wakes it on return", () => {
      see(false);
      expect(scene.setPaused).toHaveBeenCalledOnceWith(true);

      see(true);
      expect(scene.setPaused).toHaveBeenCalledWith(false);
    });

    it("pauses the scene while the tab is hidden, and wakes it on return", () => {
      hideTab(true);
      expect(scene.setPaused).toHaveBeenCalledOnceWith(true);

      hideTab(false);
      expect(scene.setPaused).toHaveBeenCalledWith(false);
    });

    it("stays paused when the tab returns with the statue still scrolled away", () => {
      see(false);
      hideTab(true);
      scene.setPaused.calls.reset();

      hideTab(false);

      expect(scene.setPaused).toHaveBeenCalledOnceWith(true);
    });
  });

  describe("when the page is left", () => {
    it("takes the scene down and stops listening", async () => {
      await comeAlive();

      fixture.destroy();
      scrollTo(300);
      movePointer(5, 5);

      expect(scene.dispose).toHaveBeenCalledTimes(1);
      expect(scene.setScroll).toHaveBeenCalledTimes(1);
      expect(scene.setPointer).not.toHaveBeenCalled();
      expect(sight.disconnect).toHaveBeenCalled();
      expect(sizes.disconnect).toHaveBeenCalled();
    });

    it("takes down a scene that arrives after the page has gone", async () => {
      let hand!: (scene: HeroView) => void;
      make = () => new Promise((resolve) => (hand = resolve));
      await comeAlive();

      fixture.destroy();
      hand(scene);
      await flush();

      expect(scene.dispose).toHaveBeenCalledTimes(1);
      expect(scene.setScroll).not.toHaveBeenCalled();
    });

    it("no longer waits for the browser to fall idle", async () => {
      render();
      await fixture.whenStable();

      fixture.destroy();

      expect(cancelIdle).toHaveBeenCalledOnceWith(7);
      expect(factory).not.toHaveBeenCalled();
    });
  });
});
