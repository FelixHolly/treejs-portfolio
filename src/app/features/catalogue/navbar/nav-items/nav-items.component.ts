import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { roomOf, ROOMS } from "../../../../core/place/places";
import { PlaceService } from "../../../../core/place/place.service";
import { SectionLinkDirective } from "../section-link.directive";

@Component({
  selector: "app-nav-items",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SectionLinkDirective],
  templateUrl: "./nav-items.component.html",
})
export class NavItemsComponent {
  private readonly place = inject(PlaceService);

  /** The phone menu's rows. They add the way home, which the wordmark beside the header's links already is. */
  readonly sheet = input(false, { transform: booleanAttribute });
  readonly linkClick = output<void>();

  readonly rooms = computed(() => ROOMS.filter((room) => this.sheet() || room.id !== "entrance"));
  readonly activeId = computed(() => roomOf(this.place.current()).id);
}
