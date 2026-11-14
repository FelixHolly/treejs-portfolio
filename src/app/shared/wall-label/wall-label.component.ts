import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { Work } from "../../core/content/work.model";
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
}
