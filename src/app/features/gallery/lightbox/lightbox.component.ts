import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { Work } from "../../../core/content/work.model";
import { CaseStudyComponent } from "../../../shared/case-study/case-study.component";
import { FramedImageComponent } from "../../../shared/framed-image/framed-image.component";
import { WorkFilmComponent } from "../../../shared/work-film/work-film.component";

@Component({
  selector: "app-lightbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseStudyComponent, FramedImageComponent, WorkFilmComponent],
  templateUrl: "./lightbox.component.html",
  styleUrl: "./lightbox.component.scss",
})
export class LightboxComponent {
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");

  readonly work = signal<Work | null>(null);
  readonly closed = output<void>();
  readonly images = computed(() => {
    const work = this.work();
    return work ? [...work.images, ...(work.detailImages ?? [])] : [];
  });

  constructor() {
    // Clicking the dimmed backdrop closes too; Escape and the close button cover the keyboard.
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  open(work: Work): void {
    this.work.set(work);
    // Opening after the pictures are rendered lets the dialog put focus on its close button
    afterNextRender(() => this.dialog().nativeElement.showModal(), { injector: this.injector });
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  forget(): void {
    this.work.set(null);
    this.closed.emit();
  }
}
