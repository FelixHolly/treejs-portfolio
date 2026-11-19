import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { KIND_LABEL, Work } from "../../core/content/work.model";
import { ArrowOutIconComponent } from "../icons/arrow-out.icon";

@Component({
  selector: "app-wall-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArrowOutIconComponent],
  host: { class: "block" },
  templateUrl: "./wall-label.component.html",
})
export class WallLabelComponent {
  readonly work = input.required<Work>();
  readonly kindLabel = computed(() => KIND_LABEL[this.work().kind]);
}
