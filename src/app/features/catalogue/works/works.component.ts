import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { WorksService } from "../../../core/content/works.service";
import { RevealDirective } from "../../../directives/reveal.directive";
import { CaseStudyComponent } from "../../../shared/case-study/case-study.component";
import { FramedImageComponent } from "../../../shared/framed-image/framed-image.component";
import { RoomLabelComponent } from "../../../shared/room-label/room-label.component";
import { WallLabelComponent } from "../../../shared/wall-label/wall-label.component";
import { WorkFilmComponent } from "../../../shared/work-film/work-film.component";

@Component({
  selector: "app-works",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseStudyComponent, FramedImageComponent, RevealDirective, RoomLabelComponent, WallLabelComponent, WorkFilmComponent],
  templateUrl: "./works.component.html",
  styleUrl: "./works.component.scss",
})
export class WorksComponent {
  private readonly works = inject(WorksService).works();

  readonly commissions = computed(() => this.works.filter((work) => work.kind === "commission"));
  readonly plainFramed = computed(() => this.works.filter((work) => work.kind !== "commission"));
}
