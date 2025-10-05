import { Component, EventEmitter, Output } from "@angular/core";

@Component({
  selector: "app-nav-items",
  templateUrl: "./nav-items.component.html",
  styleUrl: "./nav-items.component.scss",
})
export class NavItemsComponent {
  @Output() onClick = new EventEmitter<void>();

  navLinks = [
    { id: "home", name: "Home", href: "#home" },
    { id: "about", name: "About", href: "#about" },
    { id: "projects", name: "Projects", href: "#projects" },
    { id: "contact", name: "Contact", href: "#contact" },
  ];
}
