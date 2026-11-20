import { provideLocationMocks } from "@angular/common/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { ViewEnvironment } from "../../../core/view-mode/view-environment";
import { ViewModeService } from "../../../core/view-mode/view-mode.service";
import { FakeViewEnvironment } from "../../../core/view-mode/fake-view-environment";
import { SectionLinkDirective } from "../navbar/section-link.directive";
import { EntranceComponent } from "./entrance.component";

describe("EntranceComponent", () => {
  let fixture: ComponentFixture<EntranceComponent>;
  let element: HTMLElement;
  let environment: FakeViewEnvironment;

  beforeEach(() => {
    environment = new FakeViewEnvironment();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideLocationMocks(), { provide: ViewEnvironment, useValue: environment }],
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
      expect(element.querySelector(".eyebrow")?.textContent).toContain("Full-Stack Developer");
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

    it("give the outlined letter a backing of its own, because it lies over the statue", () => {
      const backing = getComputedStyle(actions()[1]).backgroundColor;

      expect(backing).toMatch(/^rgba\(20, 20, 23, 0\.9\d*\)$/);
    });

    it("keep the stack line, on a backing of its own", () => {
      const stack = element.querySelector<HTMLElement>(".stack")!;

      expect(stack.textContent?.trim()).toBe("Angular · TypeScript · Java · Spring Boot");
      expect(getComputedStyle(stack).backgroundColor).toMatch(/^rgba\(20, 20, 23, 0\.9\d*\)$/);
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
