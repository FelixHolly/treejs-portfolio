import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { NavItemsComponent } from "./nav-items/nav-items.component";

@Component({
  selector: "app-navbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavItemsComponent],
  templateUrl: "./navbar.component.html",
})
export class NavbarComponent {
  readonly isOpen = signal(false);
}
