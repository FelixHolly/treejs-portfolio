import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NgOptimizedImage } from "@angular/common";
import { WorkImage } from "../../core/content/work.model";

@Component({
  selector: "app-framed-image",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  host: { class: "block" },
  templateUrl: "./framed-image.component.html",
  styleUrl: "./framed-image.component.scss",
})
export class FramedImageComponent {
  readonly image = input.required<WorkImage>();
  readonly variant = input<"gilded" | "plain">("gilded");
  readonly sizes = input("(min-width: 1024px) 50vw, 100vw");
}
