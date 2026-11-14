import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from "@angular/core";

const ROOMS = [
  { id: "home", name: "Entrance", room: "" },
  { id: "about", name: "The Developer", room: "I" },
  { id: "projects", name: "The Works", room: "II" },
  { id: "visitors-book", name: "Visitors' Book", room: "III" },
  { id: "contact", name: "Correspondence", room: "IV" },
] as const;

@Component({
  selector: "app-nav-items",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./nav-items.component.html",
})
export class NavItemsComponent {
  readonly linkClick = output<void>();
  readonly rooms = ROOMS;
  readonly activeId = signal<string>("home");

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      // A room is current while it crosses a band around the upper third of the viewport.
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) this.activeId.set(entry.target.id);
          }
        },
        { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
      );

      for (const room of ROOMS) {
        const section = document.getElementById(room.id);
        if (section) observer.observe(section);
      }
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
