import { ChangeDetectionStrategy, Component, computed, inject, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { roomOf, ROOMS } from "../../../../core/place/places";
import { PlaceService } from "../../../../core/place/place.service";

@Component({
  selector: "app-nav-items",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: "./nav-items.component.html",
})
export class NavItemsComponent {
  private readonly place = inject(PlaceService);

  readonly linkClick = output<void>();
  readonly rooms = ROOMS;
  readonly activeId = computed(() => roomOf(this.place.current()).id);
}
