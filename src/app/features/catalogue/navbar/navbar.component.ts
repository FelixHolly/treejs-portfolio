import { ChangeDetectionStrategy, Component, inject, signal, DOCUMENT } from "@angular/core";

import { RouterLink } from "@angular/router";
import { ViewSwitchComponent } from "../../../shared/view-switch/view-switch.component";
import { NavItemsComponent } from "./nav-items/nav-items.component";

@Component({
  selector: "app-navbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavItemsComponent, RouterLink, ViewSwitchComponent],
  templateUrl: "./navbar.component.html",
})
export class NavbarComponent {
  private readonly document = inject(DOCUMENT);

  readonly isOpen = signal(false);

  skipToMain(event: Event): void {
    event.preventDefault();
    this.document.getElementById("main")?.focus();
  }
}
