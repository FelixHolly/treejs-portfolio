import { provideLocationMocks } from "@angular/common/testing";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, RouterLink } from "@angular/router";
import { SectionLinkDirective } from "./section-link.directive";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SectionLinkDirective],
  template: `
    <a id="to-about" routerLink="/" fragment="about" appSectionLink>About</a>
    <a id="to-works" routerLink="/" fragment="works" appSectionLink>Work</a>
    <a id="to-attic" routerLink="/" fragment="attic" appSectionLink>Attic</a>
    <a id="to-top" routerLink="/" appSectionLink>Top</a>
    <section id="about">
      <p>Room I</p>
      <h2>The Developer</h2>
      <h2>A second heading</h2>
    </section>
    <section id="projects">
      <span id="works"></span>
      <h2>The Works</h2>
    </section>
    <div id="attic"><h2>Not in a section</h2></div>
  `,
})
class PageComponent {}

describe("SectionLinkDirective", () => {
  let fixture: ComponentFixture<PageComponent>;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideLocationMocks()] });
    fixture = TestBed.createComponent(PageComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
    // A click the router leaves to the browser must not navigate the test runner itself
    element.addEventListener("click", (event) => event.preventDefault());
  });

  afterEach(() => fixture.destroy());

  const link = (id: string) => element.querySelector<HTMLAnchorElement>(`#${id}`)!;
  const heading = (text: string) => Array.from(element.querySelectorAll("h2")).find((h2) => h2.textContent === text)!;

  function click(id: string, init: MouseEventInit = {}): void {
    link(id).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }));
  }

  it("hands focus to the heading of the section a followed link leads to", async () => {
    click("to-about");
    await fixture.whenStable();

    expect(document.activeElement).toBe(heading("The Developer"));
    expect(heading("The Developer").getAttribute("tabindex")).toBe("-1");
  });

  it("finds the section from an anchor that sits inside it", async () => {
    click("to-works");
    await fixture.whenStable();

    expect(document.activeElement).toBe(heading("The Works"));
  });

  it("waits for the click to run its course, so a menu holding the link can close first", async () => {
    link("to-about").focus();

    click("to-about");

    expect(document.activeElement).toBe(link("to-about"));
    await fixture.whenStable();
    expect(document.activeElement).toBe(heading("The Developer"));
  });

  it("leaves the scrolling to the router", async () => {
    const focus = spyOn(heading("The Developer"), "focus").and.callThrough();

    click("to-about");
    await fixture.whenStable();

    expect(focus).toHaveBeenCalledOnceWith({ preventScroll: true });
  });

  const elsewhere: [string, MouseEventInit][] = [
    ["the control key", { ctrlKey: true }],
    ["the command key", { metaKey: true }],
    ["the shift key", { shiftKey: true }],
    ["the alt key", { altKey: true }],
    ["the middle button", { button: 1 }],
  ];

  for (const [how, init] of elsewhere) {
    it(`leaves focus where it was when the link is opened elsewhere with ${how}`, async () => {
      link("to-about").focus();

      click("to-about", init);
      await fixture.whenStable();

      expect(document.activeElement).toBe(link("to-about"));
      expect(heading("The Developer").hasAttribute("tabindex")).toBeFalse();
    });
  }

  for (const id of ["to-attic", "to-top"]) {
    it(`does nothing for "${id}", which leads to no section`, async () => {
      link(id).focus();

      click(id);
      await fixture.whenStable();

      expect(document.activeElement).toBe(link(id));
    });
  }
});
