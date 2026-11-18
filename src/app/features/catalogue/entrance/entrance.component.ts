import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { NgOptimizedImage } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ArrowDownIconComponent } from "../../../shared/icons/arrow-down.icon";

type LionState = "loading" | "ready" | "failed";

@Component({
  selector: "app-entrance",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, ArrowDownIconComponent],
  templateUrl: "./entrance.component.html",
  styleUrl: "./entrance.component.scss",
})
export class EntranceComponent {
  readonly lion = signal<LionState>("loading");
}
