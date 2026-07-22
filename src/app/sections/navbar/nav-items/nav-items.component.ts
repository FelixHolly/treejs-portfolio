import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  signal,
} from "@angular/core";

/**
 * Gallery wayfinding: a scroll-spy watches the page's sections and marks
 * the visitor's current room in the nav, gold text plus the room numeral
 * beneath the active link (Home is the entrance and carries no numeral).
 */
@Component({
  selector: "app-nav-items",
  templateUrl: "./nav-items.component.html",
  styleUrl: "./nav-items.component.scss",
})
export class NavItemsComponent implements AfterViewInit, OnDestroy {
  @Output() linkClick = new EventEmitter<void>();

  navLinks = [
    { id: "home", name: "Home", href: "#home", room: "" },
    { id: "about", name: "About", href: "#about", room: "I" },
    { id: "projects", name: "Projects", href: "#projects", room: "II" },
    { id: "contact", name: "Contact", href: "#contact", room: "IV" },
  ];

  activeId = signal("home");

  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    // A section is "current" while it crosses a band around the upper
    // third of the viewport, the way a visitor reads the nearest wall.
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.activeId.set(entry.target.id);
          }
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
    );

    this.navLinks.forEach((link) => {
      const section = document.getElementById(link.id);
      if (section) this.observer!.observe(section);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
