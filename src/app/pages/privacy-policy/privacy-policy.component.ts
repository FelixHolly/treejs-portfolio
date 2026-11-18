import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-privacy-policy",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: "./privacy-policy.component.html",
  styleUrl: "./privacy-policy.component.scss",
})
export class PrivacyPolicyComponent {}
