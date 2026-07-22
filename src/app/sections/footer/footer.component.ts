import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { RevealDirective } from "../../directives/reveal.directive";

@Component({
  selector: "app-footer",
  standalone: true,
  imports: [RouterLink, RevealDirective],
  templateUrl: "./footer.component.html",
  styleUrls: ["./footer.component.scss"],
})
export class FooterComponent {
  year: string;

  constructor() {
    this.year = new Date().getFullYear().toString();
  }
}
