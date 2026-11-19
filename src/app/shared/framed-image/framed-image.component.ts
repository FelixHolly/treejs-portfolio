import { booleanAttribute, ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NgOptimizedImage } from "@angular/common";
import { WorkImage } from "../../core/content/work.model";

/** A work's picture, or any other that brings at least its source and its description. */
export type FramedImage = Pick<WorkImage, "src" | "alt"> & Partial<WorkImage>;

@Component({
  selector: "app-framed-image",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  host: { class: "block" },
  templateUrl: "./framed-image.component.html",
  styleUrl: "./framed-image.component.scss",
})
export class FramedImageComponent {
  readonly image = input.required<FramedImage>();
  /** The picture's proportions as CSS `aspect-ratio`, where it is neither a screen nor a phone. */
  readonly aspect = input<string>();
  /** Tones a photograph warm and muted with a soft dark edge, as the gallery's portrait shader does. */
  readonly toned = input(false, { transform: booleanAttribute });
  readonly variant = input<"gilded" | "plain">("gilded");
  readonly sizes = input("(min-width: 1024px) 50vw, 100vw");
}
