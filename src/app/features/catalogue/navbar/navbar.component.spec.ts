import { provideLocationMocks } from "@angular/common/testing";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { PlaceService } from "../../../core/place/place.service";
import { ViewEnvironment } from "../../../core/view-mode/view-environment";
import { ViewModeService } from "../../../core/view-mode/view-mode.service";
import { FakeViewEnvironment } from "../../../testing/fake-view-environment";
import { NavbarComponent } from "./navbar.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavbarComponent],
  template: `
    <app-navbar />
    <main id="main" tabindex="-1">
      <section id="home"><h1>Felix Hollndonner</h1></section>
      <section id="projects"><h2>The Works</h2></section>
      <section id="contact"><h2>Write to me</h2></section>
    </main>
  `,
})
class PageComponent {}

describe("NavbarComponent", () => {
  let fixture: ComponentFixture<PageComponent>;
  let element: HTMLElement;
  let place: PlaceService;
  let environment: FakeViewEnvironment;
  let observer: jasmine.SpyObj<IntersectionObserver>;
  /** Plays the browser's part: reports, oldest first, whether the mark at the top of the page is on screen. */
  let reportPageTop: (...onScreen: boolean[]) => void;

  beforeEach(() => {
    observer = jasmine.createSpyObj<IntersectionObserver>("IntersectionObserver", ["observe", "disconnect"]);
    // A plain function, because the component calls it with `new`
    spyOn(window, "IntersectionObserver").and.callFake(function (callback: IntersectionObserverCallback) {
      reportPageTop = (...onScreen) =>
        callback(
          onScreen.map((isIntersecting) => ({ isIntersecting }) as IntersectionObserverEntry),
          observer,
        );
      return observer;
    });
    environment = new FakeViewEnvironment();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideLocationMocks(), { provide: ViewEnvironment, useValue: environment }],
    });
    place = TestBed.inject(PlaceService);
  });

  afterEach(() => fixture.destroy());

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(PageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement;
    // The menu button only shows below 1024px; these specs must hold whatever the size of the runner's window
    menuButton().style.display = "flex";
  }

  const header = () => element.querySelector("header")!;
  const menu = () => element.querySelector<HTMLDialogElement>("dialog#site-menu")!;
  const menuButton = () => header().querySelector<HTMLButtonElement>("button[aria-controls]")!;
  const closeButton = () => menu().querySelector<HTMLButtonElement>('button[aria-label="Close the menu"]')!;
  const headerLetter = () => header().querySelector<HTMLAnchorElement>("a.bar-write")!;
  const menuLetter = () => menu().querySelector<HTMLAnchorElement>('.sheet-foot a[href="/#contact"]');
  const menuLink = (name: string) =>
    Array.from(menu().querySelectorAll<HTMLAnchorElement>("nav a")).find((link) => link.textContent?.includes(name))!;
  const heading = (text: string) =>
    Array.from(element.querySelectorAll<HTMLElement>("main h1, main h2")).find((h) => h.textContent === text)!;
  const pageOverflow = () => getComputedStyle(document.documentElement).overflowY;

  /** Waits for something the browser does in its own time: a dialog's close event, the end of a transition. */
  async function settled(done: () => boolean): Promise<void> {
    for (let tries = 0; tries < 100 && !done(); tries++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      fixture.detectChanges();
    }
  }
  const closed = () => settled(() => menuButton().getAttribute("aria-expanded") === "false");

  describe("the header", () => {
    beforeEach(render);

    it("leads home from the wordmark, under the full name", () => {
      const wordmark = header().querySelector<HTMLAnchorElement>("a.wordmark")!;

      expect(wordmark.getAttribute("href")).toBe("/#home");
      expect(wordmark.querySelector(".wordmark-full")?.textContent).toBe("Felix Hollndonner");
    });

    it("names the sections in plain words and leaves Home to the wordmark", () => {
      const links = Array.from(header().querySelectorAll('nav[aria-label="Main"] a'));

      expect(links.map((link) => link.textContent?.trim())).toEqual(["About", "Work", "References", "Contact"]);
    });

    it("offers the letter wherever the visitor is, as a target of at least 44px", () => {
      expect(headerLetter().textContent?.trim()).toBe("Write to me");
      expect(headerLetter().getAttribute("href")).toBe("/#contact");
      expect(headerLetter().querySelector(".plaque")).not.toBeNull();
      expect(getComputedStyle(headerLetter()).visibility).toBe("visible");
      expect(headerLetter().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    });

    for (const where of ["entrance", "developer", "works", "works/kuechenschelle", "visitors-book"]) {
      it(`keeps offering it at "${where}"`, () => {
        place.current.set(where);
        fixture.detectChanges();

        expect(headerLetter().classList.contains("bar-write--away")).toBeFalse();
      });
    }

    it("stops offering it at the letter itself, without giving up its room in the bar", async () => {
      const width = headerLetter().getBoundingClientRect().width;

      place.current.set("correspondence");
      fixture.detectChanges();

      expect(headerLetter().classList.contains("bar-write--away")).toBeTrue();
      expect(headerLetter().getBoundingClientRect().width).toBe(width);
      await settled(() => getComputedStyle(headerLetter()).visibility === "hidden");
      expect(getComputedStyle(headerLetter()).visibility).toBe("hidden");
    });

    it("offers it again once the visitor leaves the letter", () => {
      place.current.set("correspondence");
      fixture.detectChanges();
      place.current.set("visitors-book");
      fixture.detectChanges();

      expect(headerLetter().classList.contains("bar-write--away")).toBeFalse();
    });

    it("hands focus to the letter's heading when it is followed", async () => {
      headerLetter().click();
      await fixture.whenStable();

      expect(document.activeElement).toBe(heading("Write to me"));
      expect(TestBed.inject(Router).url).toBe("/#contact");
    });

    it("still skips to the main content", () => {
      const skip = element.querySelector<HTMLAnchorElement>("a.skip-link")!;

      skip.click();

      expect(document.activeElement).toBe(element.querySelector("main"));
    });
  });

  describe("once the page is scrolled", () => {
    beforeEach(render);

    it("starts at full height and watches the mark at the top of the page", () => {
      expect(header().classList.contains("slim")).toBeFalse();
      expect(observer.observe).toHaveBeenCalledOnceWith(element.querySelector(".page-top")!);
    });

    it("turns slim when the mark leaves the screen, and so does the head of the menu", () => {
      reportPageTop(false);
      fixture.detectChanges();

      expect(header().classList.contains("slim")).toBeTrue();
      expect(menu().classList.contains("slim")).toBeTrue();
    });

    it("returns to full height back at the top", () => {
      reportPageTop(false);
      fixture.detectChanges();
      reportPageTop(true);
      fixture.detectChanges();

      expect(header().classList.contains("slim")).toBeFalse();
      expect(menu().classList.contains("slim")).toBeFalse();
    });

    it("goes by the latest report when several arrive at once", () => {
      reportPageTop(true, false);
      fixture.detectChanges();
      expect(header().classList.contains("slim")).toBeTrue();

      reportPageTop(false, true);
      fixture.detectChanges();
      expect(header().classList.contains("slim")).toBeFalse();
    });

    it("stops watching when the page goes away", () => {
      fixture.destroy();

      expect(observer.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("the menu", () => {
    beforeEach(render);

    it("is closed at first, and its button says so and what it opens", () => {
      expect(menu().open).toBeFalse();
      expect(menuButton().getAttribute("aria-expanded")).toBe("false");
      expect(menuButton().getAttribute("aria-controls")).toBe(menu().id);
      expect(menuButton().getAttribute("aria-haspopup")).toBe("dialog");
      expect(menuButton().getAttribute("aria-label")).toBe("Menu");
    });

    it("is a dialog named by its own heading", () => {
      const title = element.querySelector(`#${menu().getAttribute("aria-labelledby")}`);

      expect(title?.textContent).toBe("Menu");
      expect(menu().contains(title)).toBeTrue();
    });

    it("opens as a modal sheet and takes focus into it", () => {
      menuButton().focus();

      menuButton().click();
      fixture.detectChanges();

      expect(menu().open).toBeTrue();
      expect(menu().matches(":modal")).toBeTrue();
      expect(menuButton().getAttribute("aria-expanded")).toBe("true");
      expect(document.activeElement).toBe(closeButton());
    });

    it("holds the page still behind it for as long as it is open", () => {
      expect(pageOverflow()).not.toBe("hidden");

      menuButton().click();
      expect(pageOverflow()).toBe("hidden");

      closeButton().click();
      expect(pageOverflow()).not.toBe("hidden");
    });

    it("lists every section in plain words, the way home included", () => {
      const rows = Array.from(menu().querySelectorAll<HTMLAnchorElement>('nav[aria-label="Main"] a'));

      expect(rows.map((row) => row.childNodes[0].textContent?.trim())).toEqual([
        "Home",
        "About",
        "Work",
        "References",
        "Contact",
      ]);
    });

    it("closes from its close button and gives focus back to the menu button", async () => {
      menuButton().focus();
      menuButton().click();

      closeButton().click();
      await closed();

      expect(menu().open).toBeFalse();
      expect(menuButton().getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(menuButton());
    });

    it("lets Escape through: the browser's cancel is not blocked, and its close gives focus back", async () => {
      menuButton().focus();
      menuButton().click();

      // What the browser does for Escape on a modal dialog: a cancel event, then, unless prevented, close()
      const allowed = menu().dispatchEvent(new Event("cancel", { cancelable: true }));
      menu().close();
      await closed();

      expect(allowed).toBeTrue();
      expect(menuButton().getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(menuButton());
    });

    it("opens again after it was closed", async () => {
      menuButton().click();
      closeButton().click();
      await closed();

      menuButton().click();
      fixture.detectChanges();

      expect(menu().open).toBeTrue();
      expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    });

    it("closes when a link is chosen and goes there, with focus on that section's heading", async () => {
      menuButton().focus();
      menuButton().click();

      menuLink("Work").click();
      expect(menu().open).toBeFalse();
      await fixture.whenStable();
      await closed();

      expect(TestBed.inject(Router).url).toBe("/#projects");
      expect(document.activeElement).toBe(heading("The Works"));
      expect(menuButton().getAttribute("aria-expanded")).toBe("false");
      expect(pageOverflow()).not.toBe("hidden");
    });

    it("puts the letter at its foot as the one filled action, and it closes the menu on the way", async () => {
      menuButton().click();
      fixture.detectChanges();
      expect(menuLetter()?.textContent?.trim()).toBe("Write to me");
      expect(menuLetter()?.classList.contains("plaque")).toBeTrue();
      expect(menuLetter()!.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);

      menuLetter()!.click();
      expect(menu().open).toBeFalse();
      await fixture.whenStable();

      expect(document.activeElement).toBe(heading("Write to me"));
    });

    it("does not offer the letter from the menu while the visitor is at it", () => {
      place.current.set("correspondence");
      fixture.detectChanges();

      expect(menuLetter()).toBeNull();
    });

    it("offers the gallery quietly after the letter, and closes before switching to it", () => {
      const switchTo = spyOn(TestBed.inject(ViewModeService), "switchTo").and.resolveTo(true);
      menuButton().click();
      fixture.detectChanges();
      const door = menu().querySelector<HTMLButtonElement>("app-gallery-door button")!;

      expect(door.textContent?.trim()).toBe("Walk the 3D gallery");
      expect(menuLetter()!.compareDocumentPosition(door) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      door.click();

      expect(switchTo).toHaveBeenCalledOnceWith("gallery");
      expect(menu().open).toBeFalse();
    });
  });

  describe("without WebGL", () => {
    beforeEach(async () => {
      environment.webgl = false;
      await render();
    });

    it("offers no gallery, in the bar or in the menu, and keeps the letter", () => {
      menuButton().click();
      fixture.detectChanges();

      expect(element.querySelector("app-view-switch button")).toBeNull();
      expect(element.querySelector("app-gallery-door button")).toBeNull();
      expect(menuLetter()).not.toBeNull();
    });
  });
});
