import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { PlaceService } from "../../../core/place/place.service";
import { ViewSwitchComponent } from "../../../shared/view-switch/view-switch.component";
import { GalleryDoorComponent } from "./gallery-door.component";
import { NavItemsComponent } from "./nav-items/nav-items.component";
import { SectionLinkDirective } from "./section-link.directive";

@Component({
  selector: "app-navbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GalleryDoorComponent, NavItemsComponent, RouterLink, SectionLinkDirective, ViewSwitchComponent],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss",
})
export class NavbarComponent {
  private readonly document = inject(DOCUMENT);
  private readonly place = inject(PlaceService);
  private readonly menu = viewChild.required<ElementRef<HTMLDialogElement>>("menu");
  private readonly pageTop = viewChild.required<ElementRef<HTMLElement>>("pageTop");

  readonly menuOpen = signal(false);
  /** True once the page has left its top edge: phones then get a lower bar. */
  readonly slim = signal(false);
  /** At the letter there is nowhere for "Write to me" to lead. */
  readonly atLetter = computed(() => this.place.current() === "correspondence");

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      // Watching a mark at the top of the page leave the screen costs nothing per scrolled frame
      const observer = new IntersectionObserver((entries) => this.slim.set(!entries[entries.length - 1].isIntersecting));
      observer.observe(this.pageTop().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  skipToMain(event: Event): void {
    event.preventDefault();
    this.document.getElementById("main")?.focus();
  }

  openMenu(): void {
    this.menu().nativeElement.showModal();
    this.menuOpen.set(true);
  }

  closeMenu(): void {
    this.menu().nativeElement.close();
  }
}
