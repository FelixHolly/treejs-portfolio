import { Component, EventEmitter, Output } from "@angular/core";
import { NgForOf } from "@angular/common";

@Component({
  selector: "app-nav-items",
  imports: [NgForOf],
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
