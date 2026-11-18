import { ChangeDetectionStrategy, Component, computed, ElementRef, signal, viewChild } from "@angular/core";
import { Work } from "../../../core/content/work.model";
import { FramedImageComponent } from "../../../shared/framed-image/framed-image.component";

@Component({
  selector: "app-lightbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FramedImageComponent],
  templateUrl: "./lightbox.component.html",
  styleUrl: "./lightbox.component.scss",
})
export class LightboxComponent {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");

  readonly work = signal<Work | null>(null);
  readonly images = computed(() => {
    const work = this.work();
    return work ? [...work.images, ...(work.detailImages ?? [])] : [];
  });

  open(work: Work): void {
    this.work.set(work);
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
