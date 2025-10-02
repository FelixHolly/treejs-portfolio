import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-privacy-policy",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./privacy-policy.component.html",
  styleUrl: "./privacy-policy.component.scss",
})
export class PrivacyPolicyComponent {
  currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
