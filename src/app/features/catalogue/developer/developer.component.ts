import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DEVELOPER } from "../../../core/content/developer.content";
import { RevealDirective } from "../../../directives/reveal.directive";
import { RoomLabelComponent } from "../../../shared/room-label/room-label.component";
import { SectionPlateComponent } from "../../../shared/section-plate/section-plate.component";

@Component({
  selector: "app-developer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, RoomLabelComponent, SectionPlateComponent],
  templateUrl: "./developer.component.html",
})
export class DeveloperComponent {
  readonly developer = DEVELOPER;
}
