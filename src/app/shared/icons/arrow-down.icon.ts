import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "app-icon-arrow-down",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "inline-flex" },
  template: `
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8 2.5v11M3.5 9 8 13.5 12.5 9" />
    </svg>
  `,
})
export class ArrowDownIconComponent {}
