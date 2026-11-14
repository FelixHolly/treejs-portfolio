import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { NgOptimizedImage } from "@angular/common";
import { ArrowDownIconComponent } from "../../../shared/icons/arrow-down.icon";

type LionState = "loading" | "ready" | "failed";

@Component({
  selector: "app-entrance",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, ArrowDownIconComponent],
  templateUrl: "./entrance.component.html",
  styleUrl: "./entrance.component.scss",
})
export class EntranceComponent {
  readonly lion = signal<LionState>("loading");
}
