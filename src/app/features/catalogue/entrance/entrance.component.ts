import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { NgOptimizedImage } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ArrowDownIconComponent } from "../../../shared/icons/arrow-down.icon";
import { ViewSwitchComponent } from "../../../shared/view-switch/view-switch.component";

type LionState = "loading" | "ready" | "failed";

@Component({
  selector: "app-entrance",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, ArrowDownIconComponent, ViewSwitchComponent],
  templateUrl: "./entrance.component.html",
  styleUrl: "./entrance.component.scss",
})
export class EntranceComponent {
  readonly lion = signal<LionState>("loading");
}
