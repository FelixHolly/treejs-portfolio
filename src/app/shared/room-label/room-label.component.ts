import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
  selector: "app-room-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "room-label" },
  template: `
    <p class="room-number">Room {{ numeral() }}</p>
    <h2 class="head-text">{{ title() }}</h2>
    <span class="room-rule" aria-hidden="true"></span>
  `,
})
export class RoomLabelComponent {
  readonly numeral = input.required<string>();
  readonly title = input.required<string>();
}
