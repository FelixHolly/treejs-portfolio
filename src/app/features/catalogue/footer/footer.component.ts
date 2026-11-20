import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { RevealDirective } from "../../../shared/reveal/reveal.directive";

@Component({
  selector: "app-footer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.scss",
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
