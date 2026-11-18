import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { ViewModeService } from "../../core/view-mode/view-mode.service";

@Component({
  selector: "app-view-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "inline-flex" },
  template: `
    @if (target() === "catalogue" || viewMode.galleryAvailable()) {
      <button type="button" class="view-switch" (click)="viewMode.switchTo(target())">
        {{ target() === "gallery" ? "Enter the gallery" : "Read the catalogue" }}
      </button>
    }
  `,
})
export class ViewSwitchComponent {
  protected readonly viewMode = inject(ViewModeService);
  protected readonly target = computed(() => (this.viewMode.active() === "gallery" ? "catalogue" : "gallery"));
}
