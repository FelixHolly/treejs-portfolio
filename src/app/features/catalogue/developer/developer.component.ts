import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DEVELOPER } from "../../../core/content/developer.content";
import { RevealDirective } from "../../../directives/reveal.directive";
import { RoomLabelComponent } from "../../../shared/room-label/room-label.component";

@Component({
  selector: "app-developer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, RoomLabelComponent],
  templateUrl: "./developer.component.html",
  styleUrl: "./developer.component.scss",
})
export class DeveloperComponent {
  readonly developer = DEVELOPER;
}
