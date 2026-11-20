import { provideLocationMocks } from "@angular/common/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { ViewEnvironment } from "../../../core/view-mode/view-environment";
import { ViewModeService } from "../../../core/view-mode/view-mode.service";
import { FakeViewEnvironment } from "../../../core/view-mode/fake-view-environment";
import { SectionLinkDirective } from "../navbar/section-link.directive";
import { EntranceComponent } from "./entrance.component";
import { HERO_SCENE_FACTORY } from "./statue/hero-scene.factory";

describe("EntranceComponent", () => {
  let fixture: ComponentFixture<EntranceComponent>;
  let element: HTMLElement;
  let environment: FakeViewEnvironment;

  beforeEach(() => {
    environment = new FakeViewEnvironment();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: ViewEnvironment, useValue: environment },
        // The statue's live scene is its own spec's business; here it never arrives
        { provide: HERO_SCENE_FACTORY, useValue: () => new Promise(() => undefined) },
      ],
    });
    fixture = TestBed.createComponent(EntranceComponent);
  });

  function render(): void {
    fixture.detectChanges();
    element = fixture.nativeElement;
  }

  const actions = () => Array.from(element.querySelectorAll<HTMLAnchorElement>(".actions > a"));
  const door = () => element.querySelector<HTMLButtonElement>(".actions app-gallery-door button");

  describe("the name and the lion", () => {
    beforeEach(render);

    it("shows the name and role on first render, before the lion has loaded", () => {
      expect(element.querySelector("h1")?.textContent?.trim()).toBe("Felix Hollndonner");
      expect(element.querySelector(".eyebrow")?.textContent).toContain("Technical Lead, Full Stack");
      expect(element.querySelector(".lion")?.classList.contains("lion--ready")).toBeFalse();
    });

    it("reveals the lion once its image has loaded", () => {
      element.querySelector("img")!.dispatchEvent(new Event("load"));
      fixture.detectChanges();

      expect(element.querySelector(".lion")?.classList.contains("lion--ready")).toBeTrue();
    });

    it("drops the lion and keeps the text and the actions when the image fails", () => {
      element.querySelector("img")!.dispatchEvent(new Event("error"));
      fixture.detectChanges();

      expect(element.querySelector("picture")).toBeNull();
      expect(element.querySelector("img")).toBeNull();
      expect(element.querySelector("h1")?.textContent?.trim()).toBe("Felix Hollndonner");
      expect(actions().length).toBe(2);
    });

    it("describes the statue for screen readers", () => {
      expect(element.querySelector("img")?.getAttribute("alt")).toContain("Viennese lion");
    });

    it("sets the eyebrow and the name exactly as the static shell in index.html paints them", () => {
      const name = element.querySelector("h1")!;
      const eyebrow = element.querySelector(".eyebrow")!;

      expect(name.className).toBe("font-display font-medium text-bone text-center leading-none text-5xl sm:text-6xl xl:text-8xl");
      expect(eyebrow.className).toBe("eyebrow");
      expect(name.parentElement).toBe(eyebrow.parentElement);
      expect(name.parentElement?.className).toBe("z-10 flex flex-col items-center gap-4 c-space");
      expect(Array.from(name.parentElement!.children)).toEqual([eyebrow, name]);
      expect(element.querySelector("section#home")?.classList.contains("pt-32")).toBeTrue();
    });
  });

  describe("the composition", () => {
    let frame: HTMLIFrameElement | undefined;

    beforeEach(render);
    afterEach(() => {
      frame?.remove();
      frame = undefined;
    });

    const box = (selector: string) => element.querySelector(selector)!.getBoundingClientRect();
    const middle = (rect: DOMRect) => (rect.top + rect.bottom) / 2;
    /** The box of an element's text alone, without its padding. */
    function ink(selector: string): DOMRect {
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(element.querySelector(selector)!);
      return range.getBoundingClientRect();
    }
    /** Where the statue and its plinth fall in the picture: the scene's camera puts them at these shares of its height. */
    function stone(): { statue: DOMRect; plinth: DOMRect } {
      const picture = box(".frame");
      const centre = picture.left + picture.width / 2;
      return {
        statue: new DOMRect(centre - picture.height * 0.11, picture.top + picture.height * 0.39, picture.height * 0.22, picture.height * 0.5),
        plinth: new DOMRect(centre - picture.height * 0.262, picture.top + picture.height * 0.845, picture.height * 0.524, picture.height * 0.125),
      };
    }
    const over = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

    /** Moves the entrance into a window of its own of that size, with the page's styles, so the layout answers to it. */
    async function inWindow(width: number, height: number): Promise<void> {
      frame = document.createElement("iframe");
      frame.style.cssText = `width:${width}px;height:${height}px;border:0`;
      document.body.appendChild(frame);
      const inside = frame.contentDocument!;
      inside.open();
      inside.write("<!doctype html><html><head></head><body style='margin:0'></body></html>");
      inside.close();
      const sheets = Array.from(document.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]')).map((sheet) => inside.head.appendChild(sheet.cloneNode(true)));
      await Promise.all(
        sheets.filter((sheet) => sheet instanceof HTMLLinkElement).map((link) => new Promise((resolve) => ["load", "error"].forEach((event) => link.addEventListener(event, resolve)))),
      );
      inside.body.appendChild(element);
    }

    it("stands the statue in a band of its own under the name", () => {
      const band = box("app-entrance-statue");

      expect(band.height).toBeGreaterThanOrEqual(208);
      expect(box("h1").bottom).toBeLessThanOrEqual(band.top);
    });

    it("lays nothing over the statue or its plinth: the name above them, the foot row below or to either side", () => {
      const { statue, plinth } = stone();

      expect(box(".frame").height).toBeGreaterThan(200);
      expect(box("h1").bottom).toBeLessThanOrEqual(statue.top);
      for (const part of [ink(".stack"), box(".actions a"), box(".plaque-outline")]) {
        expect(over(part, statue)).toBeFalse();
        expect(over(part, plinth)).toBeFalse();
      }
    });

    it("fills at least the screen, so the foot row rests at its bottom", () => {
      expect(box("section#home").height).toBeGreaterThanOrEqual(window.innerHeight);
    });

    it("does not make the page scroll sideways", () => {
      const section = element.querySelector("section#home")!;

      expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth);
    });

    it("reads in order: the name, then the statue's picture, then the foot row", () => {
      const order = Array.from(element.querySelectorAll("h1, app-entrance-statue img, .stack, .actions a")).map((node) => node.tagName);

      expect(order).toEqual(["H1", "IMG", "P", "A", "A"]);
    });

    it("on a phone stacks the foot row under the statue's band: the stack line, then the actions", async () => {
      await inWindow(390, 844);
      const { statue } = stone();

      expect(box("h1").bottom).toBeLessThanOrEqual(statue.top);
      expect(box(".foot").top).toBeGreaterThanOrEqual(box("app-entrance-statue").bottom);
      expect(ink(".stack").bottom).toBeLessThanOrEqual(box(".actions a").top);
      expect(statue.height).toBeGreaterThan(200);
      expect(box("section#home").bottom).toBeLessThanOrEqual(844);
    });

    it("in a window as tall as it is wide sets the foot row on one line under the band", async () => {
      await inWindow(1024, 768);

      expect(box(".foot").top).toBeGreaterThanOrEqual(box("app-entrance-statue").bottom);
      expect(ink(".stack").right).toBeLessThan(box(".actions a").left);
      expect(Math.abs(middle(ink(".stack")) - middle(box(".actions a")))).toBeLessThan(2);
    });

    it("in a wide, low window gives the statue the whole height and parts the foot row round its plinth", async () => {
      await inWindow(1280, 720);
      const { statue, plinth } = stone();
      const [stack, works, letter] = [ink(".stack"), box(".actions a"), box(".plaque-outline")];

      expect(box("h1").bottom).toBeLessThanOrEqual(statue.top);
      expect(box("app-entrance-statue").bottom).toBe(box(".stage").bottom);
      expect(stack.right).toBeLessThanOrEqual(plinth.left);
      expect(works.left).toBeGreaterThanOrEqual(plinth.right);
      expect(Math.abs(middle(stack) - middle(works))).toBeLessThan(2);
      expect(letter.bottom).toBeLessThanOrEqual(box("section#home").bottom);
      for (const part of [stack, works, letter]) expect(over(part, statue)).toBeFalse();
    });
  });

  describe("the actions", () => {
    beforeEach(render);

    it("lead with the works, filled, then the letter, outlined", () => {
      const [works, letter] = actions();

      expect(actions().length).toBe(2);
      expect(works.textContent?.trim()).toBe("View the works");
      expect(works.getAttribute("href")).toBe("/#works");
      expect(works.classList.contains("plaque")).toBeTrue();
      expect(works.classList.contains("plaque-outline")).toBeFalse();
      expect(letter.textContent?.trim()).toBe("Write to me");
      expect(letter.getAttribute("href")).toBe("/#contact");
      expect(letter.classList.contains("plaque")).toBeTrue();
      expect(letter.classList.contains("plaque-outline")).toBeTrue();
    });

    it("are targets of at least 44px each", () => {
      for (const action of actions()) {
        expect(action.getBoundingClientRect().height).withContext(action.textContent!.trim()).toBeGreaterThanOrEqual(44);
      }
    });

    it("are section links, so following one also moves focus to where it leads", () => {
      const sectionLinks = fixture.debugElement.queryAll(By.directive(SectionLinkDirective));

      expect(sectionLinks.map((link) => link.nativeElement)).toEqual(actions());
    });

    it("stand straight on the wall, the stack line and the outlined letter without a backing of their own", () => {
      const stack = element.querySelector<HTMLElement>(".stack")!;

      expect(stack.textContent?.trim()).toBe("Java · Spring Boot · Angular · TypeScript");
      expect(getComputedStyle(stack).backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(getComputedStyle(actions()[1]).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });
  });

  describe("the way into the gallery", () => {
    it("comes third and quietly, named for what it is, and only below the width where the header offers it", () => {
      render();

      expect(door()?.textContent?.trim()).toBe("Walk the 3D gallery");
      expect(door()?.classList.contains("plaque")).toBeFalse();
      expect(door()!.closest("app-gallery-door")?.classList.contains("lg:hidden")).toBeTrue();
      expect(actions()[1].compareDocumentPosition(door()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(element.textContent).not.toContain("Enter the gallery");
    });

    it("switches to the gallery when pressed", () => {
      const switchTo = spyOn(TestBed.inject(ViewModeService), "switchTo").and.resolveTo(true);
      render();

      door()!.click();

      expect(switchTo).toHaveBeenCalledOnceWith("gallery");
    });

    it("is not offered where the browser cannot show a gallery, and leaves no gap among the actions", () => {
      environment.webgl = false;
      render();

      expect(door()).toBeNull();
      expect(actions().length).toBe(2);
      expect(getComputedStyle(element.querySelector(".actions app-gallery-door")!).display).toBe("none");
    });
  });
});
