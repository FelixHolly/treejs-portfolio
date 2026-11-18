import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { ROOMS } from "../../../core/place/places";

@Component({
  selector: "app-floor-plan",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./floor-plan.component.html",
  styleUrl: "./floor-plan.component.scss",
})
export class FloorPlanComponent {
  /** Id of the room the visitor is in. */
  readonly current = input.required<string>();
  readonly visit = output<string>();

  readonly rooms = ROOMS;
  readonly caption = computed(() => {
    const room = ROOMS.find((candidate) => candidate.id === this.current()) ?? ROOMS[0];
    return room.numeral ? `Room ${room.numeral} · ${room.name}` : room.name;
  });
}
