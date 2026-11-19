import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ViewModeService } from "../../../core/view-mode/view-mode.service";

/** Beside the shared view switch because that one's label is fixed: on a phone the gallery is the heavy view and is named as such. */
@Component({
  selector: "app-gallery-door",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "inline-flex", "[class.hidden]": "!viewMode.galleryAvailable()" },
  template: `
    @if (viewMode.galleryAvailable()) {
      <button
        type="button"
        class="inline-flex items-center min-h-11 px-4 bg-graphite border border-stone/50 rounded-sm font-mono text-xs uppercase tracking-[0.15em] whitespace-nowrap text-stone transition-colors hover:border-stone hover:text-bone"
        (click)="viewMode.switchTo('gallery')"
      >
        Walk the 3D gallery
      </button>
    }
  `,
})
export class GalleryDoorComponent {
  protected readonly viewMode = inject(ViewModeService);
}
