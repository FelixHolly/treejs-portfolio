import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { KIND_LABEL, Work } from "../../core/content/work.model";
import { ArrowOutIconComponent } from "../icons/arrow-out.icon";

const WALL_LINK = "inline-flex items-center gap-2 min-h-6 text-gold hover:text-bone transition-colors";

@Component({
  selector: "app-wall-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArrowOutIconComponent],
  host: {
    class: "block",
    "[class.wall-label--page]": "onPage()",
    "[class.wall-label--compact]": "compact()",
  },
  templateUrl: "./wall-label.component.html",
  styleUrl: "./wall-label.component.scss",
})
export class WallLabelComponent {
  readonly work = input.required<Work>();
  /** On the gallery's wall a label has a height to keep; on a page it has room for a reading column and buttons. */
  readonly placement = input<"wall" | "page">("wall");
  /** Opens with what was built, straight under the title, instead of listing it further down. */
  readonly lead = input(false, { transform: booleanAttribute });
  /** On narrow screens the picture sits beside a shorter label, for works that should take less room. */
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly kindLabel = computed(() => KIND_LABEL[this.work().kind]);
  protected readonly onPage = computed(() => this.placement() === "page");
  protected readonly liveClass = computed(() => (this.onPage() ? "plaque" : WALL_LINK));
  protected readonly codeClass = computed(() => (this.onPage() ? "quiet-action" : WALL_LINK));
}
