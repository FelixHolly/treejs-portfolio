import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { Room } from "../../../core/place/places";

/** A room's numeral and name over the walk, like a chapter title. The header and the label say the same to assistive technology. */
@Component({
  selector: "app-room-title",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./room-title.component.scss",
  host: { "aria-hidden": "true", "[class.shown]": "shown()" },
  template: `
    @for (room of lettered(); track room.id) {
      <div class="card" animate.enter="arrives" animate.leave="leaves">
        <p class="numeral">{{ room.numeral }}</p>
        <span class="rule"></span>
        <p class="name">{{ room.name }}</p>
      </div>
    }
  `,
})
export class RoomTitleComponent {
  readonly room = input<Room | null>(null);
  readonly shown = input(false);
  /** A list, so that the title of the next room is a card of its own and the two can cross-fade. */
  readonly lettered = computed(() => {
    const room = this.room();
    return room ? [room] : [];
  });
}
