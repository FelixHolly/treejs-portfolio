import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { WorksService } from "../../../core/content/works.service";
import { RevealDirective } from "../../../directives/reveal.directive";
import { FramedImageComponent } from "../../../shared/framed-image/framed-image.component";
import { RoomLabelComponent } from "../../../shared/room-label/room-label.component";
import { WallLabelComponent } from "../../../shared/wall-label/wall-label.component";

@Component({
  selector: "app-works",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, RoomLabelComponent, FramedImageComponent, WallLabelComponent],
  templateUrl: "./works.component.html",
  styleUrl: "./works.component.scss",
})
export class WorksComponent {
  private readonly works = inject(WorksService).works();

  readonly commissions = computed(() => this.works.filter((work) => work.kind === "commission"));
  readonly studies = computed(() => this.works.filter((work) => work.kind === "study"));
}
