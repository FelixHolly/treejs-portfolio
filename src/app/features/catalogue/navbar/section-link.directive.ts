import { afterNextRender, Directive, DOCUMENT, inject, Injector } from "@angular/core";
import { RouterLink } from "@angular/router";

/**
 * On a router link to a section of the page: following it also hands focus to that section's heading,
 * so a screen reader and the Tab key carry on from where the link led. The page scrolls there on its own.
 */
@Directive({
  selector: "a[routerLink][appSectionLink]",
  host: { "(click)": "follow($event)" },
})
export class SectionLinkDirective {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly link = inject(RouterLink, { self: true });

  protected follow(click: MouseEvent): void {
    // A click that opens another tab leaves this page, and its focus, where they were
    if (click.button !== 0 || click.ctrlKey || click.shiftKey || click.altKey || click.metaKey) return;

    // Once the click has run its course: a menu holding the link closes first, and closing hands focus to its button
    afterNextRender(() => this.focusHeading(), { injector: this.injector });
  }

  private focusHeading(): void {
    const { fragment } = this.link;
    const section = fragment ? this.document.getElementById(fragment)?.closest("section") : null;
    const heading = section?.querySelector<HTMLElement>("h1, h2");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}
