import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { WorksService } from "../../../core/content/works.service";
import { RevealDirective } from "../../../shared/reveal/reveal.directive";
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

  /** A phone screenshot stays readable at a phone's width, so where a commission has one it leads. */
  readonly commissions = computed(() =>
    this.works
      .filter((work) => work.kind === "commission")
      .map((work) => {
        const phone = work.detailImages?.find((image) => image.orientation === "portrait");
        return { work, phoneLed: !!phone, lead: phone ?? work.images[0], others: phone ? work.images : work.images.slice(1) };
      }),
  );
  readonly plainFramed = computed(() => this.works.filter((work) => work.kind !== "commission"));
}
