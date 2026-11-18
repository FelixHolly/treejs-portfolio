import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { ViewModeService } from "../../core/view-mode/view-mode.service";

@Component({
  selector: "app-view-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "inline-flex" },
  template: `
    @if (target() === "catalogue" || viewMode.galleryAvailable()) {
      <button type="button" class="view-switch" [attr.aria-label]="label()" (click)="viewMode.switchTo(target())">
        <span [class.max-sm:hidden]="compact()">{{ target() === "gallery" ? "Enter the" : "Read the" }}&nbsp;</span>{{ target() }}
      </button>
    }
  `,
})
export class ViewSwitchComponent {
  protected readonly viewMode = inject(ViewModeService);

  /** Shortens the label to one word on narrow screens, for tight spots like the gallery header. */
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly target = computed(() => (this.viewMode.active() === "gallery" ? "catalogue" : "gallery"));
  protected readonly label = computed(() => (this.target() === "gallery" ? "Enter the gallery" : "Read the catalogue"));
}
