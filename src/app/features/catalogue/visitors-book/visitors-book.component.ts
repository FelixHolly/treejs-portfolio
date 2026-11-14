import { ChangeDetectionStrategy, Component } from "@angular/core";
import { VISITOR_ENTRIES } from "../../../core/content/visitors-book.content";
import { RevealDirective } from "../../../directives/reveal.directive";
import { RoomLabelComponent } from "../../../shared/room-label/room-label.component";

@Component({
  selector: "app-visitors-book",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, RoomLabelComponent],
  templateUrl: "./visitors-book.component.html",
})
export class VisitorsBookComponent {
  readonly entries = VISITOR_ENTRIES;
}
