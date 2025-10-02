import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-terms-conditions",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./terms-conditions.component.html",
  styleUrl: "./terms-conditions.component.scss",
})
export class TermsConditionsComponent {
  currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
