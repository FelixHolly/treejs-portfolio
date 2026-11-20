import { ChangeDetectionStrategy, Component } from "@angular/core";
import { DEVELOPER } from "../../../core/content/developer.content";
import { RevealDirective } from "../../../shared/reveal/reveal.directive";
import { FramedImageComponent } from "../../../shared/framed-image/framed-image.component";
import { RoomLabelComponent } from "../../../shared/room-label/room-label.component";

@Component({
  selector: "app-developer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FramedImageComponent, RevealDirective, RoomLabelComponent],
  templateUrl: "./developer.component.html",
})
export class DeveloperComponent {
  readonly developer = DEVELOPER;
}
