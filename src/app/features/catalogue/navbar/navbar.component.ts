import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { ViewSwitchComponent } from "../../../shared/view-switch/view-switch.component";
import { NavItemsComponent } from "./nav-items/nav-items.component";

@Component({
  selector: "app-navbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NavItemsComponent, ViewSwitchComponent],
  templateUrl: "./navbar.component.html",
})
export class NavbarComponent {
  readonly isOpen = signal(false);
}
