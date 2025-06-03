import { Component } from "@angular/core";
import { NavItemsComponent } from "./nav-items/nav-items.component";
import { NgClass } from "@angular/common";

@Component({
  selector: "app-navbar",
  imports: [NavItemsComponent, NgClass],
  templateUrl: "./navbar.component.html",
  styleUrl: "./navbar.component.scss",
})
export class NavbarComponent {
  isOpen = false;
}
